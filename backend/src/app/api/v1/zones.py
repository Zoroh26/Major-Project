from typing import Annotated, Any, cast
import uuid as uuid_pkg
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import (
    BadRequestException,
    DuplicateValueException,
    NotFoundException,
)
from ...crud.crud_zones import crud_zones
from ...crud.crud_cameras import crud_cameras
from ...crud.crud_users import crud_users
from ...models.camera import Camera
from ...models.user import User
from ...models.zone import Zone
from ...schemas.user import UserRead
from ...schemas.zone import (
    ZoneCreate,
    ZoneCreateInternal,
    ZoneRead,
    ZoneUpdate,
    ZoneUpdateInternal,
    ZoneDelete,
    ZoneDetailRead,
    CameraZoneRead,
    GuardZoneRead,
    AssignCameraRequest,
    AssignGuardRequest,
)

router = APIRouter(tags=["zones"])


# --- CRUD ---

@router.post("/zone", response_model=ZoneRead, status_code=201)
async def create_zone(
    request: Request,
    zone: ZoneCreate,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ZoneRead:
    """Create a new zone"""
    existing = await crud_zones.exists(db=db, name=zone.name, is_deleted=False)
    if existing:
        raise DuplicateValueException(f"Zone with name '{zone.name}' already exists")

    zone_internal = ZoneCreateInternal(**zone.model_dump())
    created = await crud_zones.create(db=db, object=zone_internal)

    zone_read = await crud_zones.get(db=db, uuid=created.uuid, schema_to_select=ZoneRead)
    if zone_read is None:
        raise NotFoundException("Created zone not found")
    return cast(ZoneRead, zone_read)


@router.get("/zones", response_model=PaginatedListResponse[ZoneRead])
async def read_zones(
    request: Request,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    page: int = 1,
    items_per_page: int = 20,
) -> dict:
    """List all zones"""
    zones_data = await crud_zones.get_multi(
        db=db,
        offset=compute_offset(page, items_per_page),
        limit=items_per_page,
        is_deleted=False,
        schema_to_select=ZoneRead,
    )
    response: dict[str, Any] = paginated_response(
        crud_data=zones_data, page=page, items_per_page=items_per_page
    )
    return response


@router.get("/zone/{zone_uuid}", response_model=ZoneDetailRead)
async def read_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ZoneDetailRead:
    """Get a single zone with its assigned cameras and guards"""
    db_zone = await crud_zones.get(db=db, uuid=zone_uuid, is_deleted=False, schema_to_select=ZoneRead)
    if db_zone is None:
        raise NotFoundException("Zone not found")

    # Fetch cameras assigned to this zone
    cameras_result = await db.execute(
        select(Camera).where(Camera.zone_id == zone_uuid, Camera.is_deleted == False)
    )
    cameras = cameras_result.scalars().all()

    # Fetch guards assigned to this zone
    guards_result = await db.execute(
        select(User).where(User.zone_id == zone_uuid, User.is_deleted == False)
    )
    guards = guards_result.scalars().all()

    zone_dict = dict(db_zone) if isinstance(db_zone, dict) else db_zone.model_dump()
    return ZoneDetailRead(
        **zone_dict,
        cameras=[CameraZoneRead(
            uuid=c.uuid, name=c.name, location=c.location,
            stream_path=c.stream_path, is_active=c.is_active
        ) for c in cameras],
        guards=[GuardZoneRead(
            uuid=g.uuid, email=g.email, name=g.name,
            role=g.role, rank=g.rank
        ) for g in guards],
    )


@router.patch("/zone/{zone_uuid}", response_model=ZoneRead)
async def update_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    values: ZoneUpdate,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ZoneRead:
    db_zone = await crud_zones.get(db=db, uuid=zone_uuid, is_deleted=False)
    if db_zone is None:
        raise NotFoundException("Zone not found")

    update_data = ZoneUpdateInternal(**values.model_dump(exclude_unset=True), updated_at=datetime.now(UTC))
    await crud_zones.update(db=db, object=update_data, uuid=zone_uuid)

    updated = await crud_zones.get(db=db, uuid=zone_uuid, schema_to_select=ZoneRead)
    if updated is None:
        raise NotFoundException("Zone not found after update")
    return cast(ZoneRead, updated)


@router.delete("/zone/{zone_uuid}", status_code=204)
async def delete_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    db_zone = await crud_zones.get(db=db, uuid=zone_uuid, is_deleted=False)
    if db_zone is None:
        raise NotFoundException("Zone not found")

    # Unlink cameras and guards before deleting
    await db.execute(update(Camera).where(Camera.zone_id == zone_uuid).values(zone_id=None))
    await db.execute(update(User).where(User.zone_id == zone_uuid).values(zone_id=None))
    await db.commit()

    await crud_zones.update(db=db, object=ZoneDelete(is_deleted=True), uuid=zone_uuid)


# --- Camera ↔ Zone Assignment ---

@router.post("/zone/{zone_uuid}/assign-camera", response_model=ZoneDetailRead, status_code=200)
async def assign_camera_to_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    body: AssignCameraRequest,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ZoneDetailRead:
    """Bind a camera to a zone (many cameras per zone allowed)"""
    db_zone = await crud_zones.get(db=db, uuid=zone_uuid, is_deleted=False)
    if db_zone is None:
        raise NotFoundException("Zone not found")

    camera_result = await db.execute(
        select(Camera).where(Camera.uuid == body.camera_uuid, Camera.is_deleted == False)
    )
    camera = camera_result.scalar_one_or_none()
    if camera is None:
        raise NotFoundException("Camera not found")

    camera.zone_id = zone_uuid
    await db.commit()

    return await read_zone(request, zone_uuid, current_user, db)


@router.delete("/zone/{zone_uuid}/unassign-camera/{camera_uuid}", status_code=204)
async def unassign_camera_from_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    camera_uuid: uuid_pkg.UUID,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Remove a camera from a zone"""
    camera_result = await db.execute(
        select(Camera).where(Camera.uuid == camera_uuid, Camera.zone_id == zone_uuid, Camera.is_deleted == False)
    )
    camera = camera_result.scalar_one_or_none()
    if camera is None:
        raise NotFoundException("Camera not found in this zone")

    camera.zone_id = None
    await db.commit()


# --- Guard ↔ Zone Assignment ---

@router.post("/zone/{zone_uuid}/assign-guard", response_model=ZoneDetailRead, status_code=200)
async def assign_guard_to_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    body: AssignGuardRequest,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ZoneDetailRead:
    """Assign a security guard to a zone (one zone per guard enforced)"""
    db_zone = await crud_zones.get(db=db, uuid=zone_uuid, is_deleted=False)
    if db_zone is None:
        raise NotFoundException("Zone not found")

    guard_result = await db.execute(
        select(User).where(User.uuid == body.user_uuid, User.is_deleted == False)
    )
    guard = guard_result.scalar_one_or_none()
    if guard is None:
        raise NotFoundException("User not found")

    if guard.role != "security":
        raise BadRequestException("Only users with role 'security' can be assigned to zones")

    # One guard → one zone: override previous assignment silently
    guard.zone_id = zone_uuid
    await db.commit()

    return await read_zone(request, zone_uuid, current_user, db)


@router.delete("/zone/{zone_uuid}/unassign-guard/{user_uuid}", status_code=204)
async def unassign_guard_from_zone(
    request: Request,
    zone_uuid: uuid_pkg.UUID,
    user_uuid: uuid_pkg.UUID,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Remove a guard from a zone"""
    guard_result = await db.execute(
        select(User).where(User.uuid == user_uuid, User.zone_id == zone_uuid, User.is_deleted == False)
    )
    guard = guard_result.scalar_one_or_none()
    if guard is None:
        raise NotFoundException("Guard not found in this zone")

    guard.zone_id = None
    await db.commit()
