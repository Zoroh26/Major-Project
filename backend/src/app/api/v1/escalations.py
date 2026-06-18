"""API endpoints for escalation management"""
from typing import Annotated, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, or_
from sqlalchemy.orm import selectinload
from datetime import UTC, datetime

from ...core.db.database import async_get_db
from ...models import Escalation, EscalationStatus, EscalationPriority
from ...models.user import User
from ...api.dependencies import get_current_user
from ...schemas.escalation import (
    EscalationCreate,
    EscalationUpdate,
    EscalationResponse,
    EscalationList,
    EscalationAction,
)

router = APIRouter(prefix="/escalations", tags=["escalations"])


def _is_admin_role(role: str | None) -> bool:
    return role in ["admin", "user"]


async def _get_escalation_with_relations(db: AsyncSession, escalation_uuid: UUID) -> Escalation | None:
    """Load one escalation with relationships required by response schemas."""
    query = (
        select(Escalation)
        .options(
            selectinload(Escalation.zone),
            selectinload(Escalation.camera),
            selectinload(Escalation.assigned_to),
            selectinload(Escalation.created_by),
        )
        .where(
            and_(
                Escalation.uuid == escalation_uuid,
                Escalation.is_deleted == False,
            )
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


@router.post("", response_model=EscalationResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation(
    escalation_data: EscalationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Create a new escalation.
    Only admins can create escalations.
    """
    if not _is_admin_role(current_user["role"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create escalations"
        )

    new_escalation = Escalation(
        zone_uuid=escalation_data.zone_uuid,
        camera_uuid=escalation_data.camera_uuid,
        title=escalation_data.title,
        description=escalation_data.description,
        priority=escalation_data.priority,
        created_by_uuid=current_user["uuid"],
        status=EscalationStatus.PENDING,
    )

    db.add(new_escalation)
    await db.commit()
    return await _get_escalation_with_relations(db, new_escalation.uuid)


@router.get("", response_model=List[EscalationList])
async def list_escalations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    zone_uuid: Annotated[UUID | None, Query()] = None,
    status_filter: Annotated[EscalationStatus | None, Query()] = None,
    priority_filter: Annotated[EscalationPriority | None, Query()] = None,
):
    """
    List escalations with optional filtering.
    Returns all escalations visible to authenticated users.
    """
    query = (
        select(Escalation)
        .options(
            selectinload(Escalation.zone),
            selectinload(Escalation.camera),
            selectinload(Escalation.assigned_to),
            selectinload(Escalation.created_by),
        )
        .where(Escalation.is_deleted == False)
    )

    if zone_uuid:
        query = query.where(Escalation.zone_uuid == zone_uuid)

    if status_filter:
        query = query.where(Escalation.status == status_filter)

    if priority_filter:
        query = query.where(Escalation.priority == priority_filter)

    query = query.order_by(desc(Escalation.created_at))
    result = await db.execute(query)
    escalations = result.scalars().all()

    return escalations


@router.get("/{escalation_uuid}", response_model=EscalationResponse)
async def get_escalation_detail(
    escalation_uuid: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Get a specific escalation detail.
    Authorized users must be admin, assigned to, or in the same zone.
    """
    query = (
        select(Escalation)
        .options(
            selectinload(Escalation.zone),
            selectinload(Escalation.camera),
            selectinload(Escalation.assigned_to),
            selectinload(Escalation.created_by),
        )
        .where(
            and_(
                Escalation.uuid == escalation_uuid,
                Escalation.is_deleted == False
            )
        )
    )
    result = await db.execute(query)
    escalation = result.scalar_one_or_none()

    if not escalation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found"
        )

    # Check authorization
    if not (
        _is_admin_role(current_user["role"]) or
        escalation.assigned_to_uuid == current_user["uuid"] or
        escalation.created_by_uuid == current_user["uuid"] or
        escalation.zone_uuid == current_user["zone_id"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this escalation"
        )

    return escalation


@router.patch("/{escalation_uuid}", response_model=EscalationResponse)
async def update_escalation(
    escalation_uuid: UUID,
    escalation_data: EscalationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Update an escalation.
    Only admins can update.
    """
    if not _is_admin_role(current_user["role"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update escalations"
        )

    query = select(Escalation).where(
        and_(
            Escalation.uuid == escalation_uuid,
            Escalation.is_deleted == False
        )
    )
    result = await db.execute(query)
    escalation = result.scalar_one_or_none()

    if not escalation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found"
        )

    # Update fields
    if escalation_data.title is not None:
        escalation.title = escalation_data.title
    if escalation_data.description is not None:
        escalation.description = escalation_data.description
    if escalation_data.priority is not None:
        escalation.priority = escalation_data.priority
    if escalation_data.assigned_to_uuid is not None:
        escalation.assigned_to_uuid = escalation_data.assigned_to_uuid
        if escalation.status == EscalationStatus.PENDING:
            escalation.status = EscalationStatus.ASSIGNED
    if escalation_data.status is not None:
        escalation.status = escalation_data.status

    escalation.updated_at = datetime.now(UTC)
    db.add(escalation)
    await db.commit()
    return await _get_escalation_with_relations(db, escalation.uuid)


@router.post("/{escalation_uuid}/act", response_model=EscalationResponse)
async def act_on_escalation(
    escalation_uuid: UUID,
    action_data: EscalationAction,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Mark escalation as acted upon with action description.
    Security personnel can act on escalations assigned to them.
    """
    if current_user["role"] not in ["admin", "user", "security"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only security personnel can act on escalations"
        )

    query = select(Escalation).where(
        and_(
            Escalation.uuid == escalation_uuid,
            Escalation.is_deleted == False
        )
    )
    result = await db.execute(query)
    escalation = result.scalar_one_or_none()

    if not escalation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found"
        )

    # Check if assigned to current user or admin
    if not (_is_admin_role(current_user["role"]) or escalation.assigned_to_uuid == current_user["uuid"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this escalation"
        )

    escalation.mark_acted_upon(action_data.action_taken)
    db.add(escalation)
    await db.commit()
    return await _get_escalation_with_relations(db, escalation.uuid)


@router.post("/{escalation_uuid}/resolve", response_model=EscalationResponse)
async def resolve_escalation(
    escalation_uuid: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Mark escalation as resolved.
    Only admins and assigned personnel can resolve.
    """
    if current_user["role"] not in ["admin", "user", "security"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only security personnel can resolve escalations"
        )

    query = select(Escalation).where(
        and_(
            Escalation.uuid == escalation_uuid,
            Escalation.is_deleted == False
        )
    )
    result = await db.execute(query)
    escalation = result.scalar_one_or_none()

    if not escalation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found"
        )

    escalation.mark_resolved()
    db.add(escalation)
    await db.commit()
    return await _get_escalation_with_relations(db, escalation.uuid)


@router.post("/{escalation_uuid}/false-alarm", response_model=EscalationResponse)
async def mark_false_alarm(
    escalation_uuid: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Mark escalation as false alarm.
    Only admins and assigned personnel can mark as false alarm.
    """
    if current_user["role"] not in ["admin", "user", "security"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only security personnel can mark as false alarm"
        )

    query = select(Escalation).where(
        and_(
            Escalation.uuid == escalation_uuid,
            Escalation.is_deleted == False
        )
    )
    result = await db.execute(query)
    escalation = result.scalar_one_or_none()

    if not escalation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escalation not found"
        )

    escalation.mark_false_alarm()
    db.add(escalation)
    await db.commit()
    return await _get_escalation_with_relations(db, escalation.uuid)


@router.get("/stats/summary", response_model=dict)
async def get_escalation_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Get escalation statistics summary.
    """
    base_query = select(Escalation).where(Escalation.is_deleted == False)

    # Security personnel see only their escalations
    if not _is_admin_role(current_user["role"]):
        base_query = base_query.where(
            or_(
                Escalation.assigned_to_uuid == current_user["uuid"],
                Escalation.zone_uuid == current_user["zone_id"],
                Escalation.created_by_uuid == current_user["uuid"],
            )
        )

    result = await db.execute(base_query)
    all_escalations = result.scalars().all()

    # Calculate stats
    pending = sum(1 for e in all_escalations if e.status ==
                  EscalationStatus.PENDING)
    assigned = sum(1 for e in all_escalations if e.status ==
                   EscalationStatus.ASSIGNED)
    in_progress = sum(1 for e in all_escalations if e.status ==
                      EscalationStatus.IN_PROGRESS)
    resolved = sum(1 for e in all_escalations if e.status ==
                   EscalationStatus.RESOLVED)
    false_alarms = sum(1 for e in all_escalations if e.is_false_alarm)
    critical_count = sum(
        1 for e in all_escalations if e.priority == EscalationPriority.CRITICAL)

    return {
        "total": len(all_escalations),
        "pending": pending,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "false_alarms": false_alarms,
        "critical": critical_count,
    }
