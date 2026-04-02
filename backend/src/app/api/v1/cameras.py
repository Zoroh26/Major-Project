from typing import Annotated, Any, cast
import uuid as uuid_pkg
import httpx
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import (
    BadRequestException,
    DuplicateValueException,
    NotFoundException,
)
from ...crud.crud_cameras import crud_cameras
from ...schemas.camera import (
    CameraCreate,
    CameraCreateInternal,
    CameraRead,
    CameraUpdate,
    CameraUpdateInternal,
    CameraDelete,
)

router = APIRouter(tags=["cameras"])

# MediaMTX API configuration
MEDIAMTX_API_URL = "http://mediamtx:9997/v3"


async def register_path_in_mediamtx(stream_path: str, rtsp_url: str) -> bool:
    """Register a new stream path in MediaMTX using FFmpeg as source.

    FFmpeg is used instead of MediaMTX's native RTSP client because some cameras
    return malformed RTSP headers (e.g. bracketed Content-Base) that MediaMTX rejects
    but FFmpeg tolerates. FFmpeg pulls from the camera and re-publishes to MediaMTX's
    own RTSP endpoint, which then serves HLS/WebRTC to viewers.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # -an drops audio — camera's audio timestamps are non-monotonic which
            # corrupts HLS segments and causes hls.js to stall the video.
            # -use_wallclock_as_timestamps + -fflags +genpts replace broken camera DTS.
            # Output is normalized to 15fps with a keyframe every 2s to smooth phone-camera
            # jitter and reduce browser decode pressure.
            ffmpeg_cmd = (
                f"ffmpeg -hide_banner -nostdin -rtsp_transport tcp "
                f"-use_wallclock_as_timestamps 1 -fflags +genpts "
                f"-i '{rtsp_url}' "
                f"-vf fps=15,format=yuv420p "
                f"-c:v libx264 -preset ultrafast -tune zerolatency -g 30 "
                f"-profile:v baseline -level 3.0 -pix_fmt yuv420p "
                f"-b:v 1200k -maxrate 1200k -bufsize 2400k "
                f"-an "
                f"-f rtsp rtsp://mediamtx:8554/{stream_path}"
            )
            payload = {
                "runOnDemand": ffmpeg_cmd,
                "runOnDemandRestart": True,
                "runOnDemandStartTimeout": "60s",
                "runOnDemandCloseAfter": "30s",
            }
            response = await client.post(
                f"{MEDIAMTX_API_URL}/config/paths/add/{stream_path}",
                json=payload,
                timeout=10.0,
            )
            response_text = response.text if hasattr(response, 'text') else str(response.content)
            
            # 200/201 = success, 400 = path already exists (also acceptable)
            if response.status_code in [200, 201, 400]:
                print(f"Camera path '{stream_path}' registered with MediaMTX")
                return True
            
            print(f"MediaMTX registration failed: {response.status_code} {response_text}")
            return False
    except Exception as e:
        print(f"Error registering path in MediaMTX: {e}")
        import traceback
        traceback.print_exc()
        return False


async def remove_path_from_mediamtx(stream_path: str) -> bool:
    """Remove a stream path from MediaMTX"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{MEDIAMTX_API_URL}/config/paths/delete/{stream_path}",
                timeout=5.0,
            )
            return response.status_code in [200, 204, 404]
    except Exception as e:
        print(f"Error removing path from MediaMTX: {e}")
        return False


def generate_stream_path(camera_name: str) -> str:
    """Generate a URL-safe stream path from camera name"""
    return camera_name.lower().replace(" ", "_").replace("-", "_")


@router.post("/camera", response_model=CameraRead, status_code=201)
async def create_camera(
    request: Request,
    camera: CameraCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CameraRead:
    """Create a new camera and register it in MediaMTX"""
    # Generate stream path from camera name
    stream_path = generate_stream_path(camera.name)

    # Check if stream path already exists
    existing = await crud_cameras.exists(db=db, stream_path=stream_path, is_deleted=False)
    if existing:
        raise DuplicateValueException(
            f"Camera with name '{camera.name}' already exists")

    # Register the path in MediaMTX
    registered = await register_path_in_mediamtx(stream_path, camera.rtsp_url)
    if not registered:
        raise BadRequestException(
            "Failed to register camera stream in MediaMTX. Check RTSP URL and try again."
        )

    # Create camera in database
    camera_internal = CameraCreateInternal(
        name=camera.name, location=camera.location, rtsp_url=camera.rtsp_url, stream_path=stream_path
    )
    created_camera = await crud_cameras.create(db=db, object=camera_internal)

    # Fetch and return the created camera
    camera_read = await crud_cameras.get(
        db=db, uuid=created_camera.uuid, schema_to_select=CameraRead
    )
    if camera_read is None:
        raise NotFoundException("Created camera not found")

    return cast(CameraRead, camera_read)


@router.get("/cameras", response_model=PaginatedListResponse[CameraRead])
async def read_cameras(
    request: Request,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    page: int = 1,
    items_per_page: int = 10,
) -> dict:
    """Get all cameras with pagination"""
    cameras_data = await crud_cameras.get_multi(
        db=db,
        offset=compute_offset(page, items_per_page),
        limit=items_per_page,
        is_deleted=False,
        schema_to_select=CameraRead,
    )

    response: dict[str, Any] = paginated_response(
        crud_data=cameras_data, page=page, items_per_page=items_per_page
    )
    return response


@router.get("/camera/{camera_uuid}", response_model=CameraRead)
async def read_camera(
    request: Request,
    camera_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CameraRead:
    """Get a specific camera by UUID"""
    db_camera = await crud_cameras.get(
        db=db, uuid=camera_uuid, is_deleted=False, schema_to_select=CameraRead
    )
    if db_camera is None:
        raise NotFoundException("Camera not found")

    return cast(CameraRead, db_camera)


@router.patch("/camera/{camera_uuid}", response_model=CameraRead)
async def update_camera(
    request: Request,
    camera_uuid: uuid_pkg.UUID,
    values: CameraUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CameraRead:
    """Update a camera's name and location"""
    db_camera = await crud_cameras.get(db=db, uuid=camera_uuid, is_deleted=False)
    if db_camera is None:
        raise NotFoundException("Camera not found")

    # Prepare update data
    update_data = CameraUpdateInternal(
        name=values.name,
        location=values.location,
        updated_at=datetime.now(UTC),
    )

    await crud_cameras.update(db=db, object=update_data, uuid=camera_uuid)

    # Fetch and return updated camera
    updated_camera = await crud_cameras.get(
        db=db, uuid=camera_uuid, schema_to_select=CameraRead
    )
    if updated_camera is None:
        raise NotFoundException("Camera not found after update")

    return cast(CameraRead, updated_camera)


@router.delete("/camera/{camera_uuid}", status_code=204)
async def delete_camera(
    request: Request,
    camera_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Delete a camera (soft delete) and remove from MediaMTX"""
    db_camera = await crud_cameras.get(db=db, uuid=camera_uuid, is_deleted=False)
    if db_camera is None:
        raise NotFoundException("Camera not found")

    # Get stream path before deleting
    stream_path = (
        db_camera["stream_path"] if isinstance(
            db_camera, dict) else db_camera.stream_path
    )

    # Remove from MediaMTX
    await remove_path_from_mediamtx(stream_path)

    # Soft delete from database and free up the stream_path name
    delete_data = CameraDelete(
        is_deleted=True, 
        deleted_at=datetime.now(UTC),
        stream_path=f"deleted_{camera_uuid}_{stream_path}"
    )
    await crud_cameras.update(db=db, object=delete_data, uuid=camera_uuid)
