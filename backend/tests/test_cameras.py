"""Unit tests for camera API endpoints."""

from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch
import uuid

import pytest

from src.app.api.v1.cameras import create_camera, read_cameras, read_camera, delete_camera
from src.app.core.exceptions.http_exceptions import BadRequestException, DuplicateValueException, NotFoundException
from src.app.schemas.camera import CameraCreate, CameraRead


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_camera_read(name: str = "Test Camera", location: str = "Lab", stream_path: str = "test_camera") -> CameraRead:
    return CameraRead(
        uuid=uuid.uuid4(),
        name=name,
        location=location,
        rtsp_url="rtsp://192.168.1.10:8080/video",
        stream_path=stream_path,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=None,
    )


# ---------------------------------------------------------------------------
# Create Camera
# ---------------------------------------------------------------------------

class TestCreateCamera:
    """Tests for POST /camera"""

    @pytest.mark.asyncio
    async def test_create_camera_success(self, mock_db, current_user_dict):
        """Camera is created and registered in MediaMTX successfully."""
        camera_data = CameraCreate(name="Test Camera", location="Lab", rtsp_url="rtsp://192.168.1.10:8080/video")
        camera_read = make_camera_read()

        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud, \
             patch("src.app.api.v1.cameras.register_path_in_mediamtx", new_callable=AsyncMock) as mock_reg:

            mock_crud.exists = AsyncMock(return_value=False)
            mock_reg.return_value = True
            mock_crud.create = AsyncMock(return_value=Mock(uuid=camera_read.uuid))
            mock_crud.get = AsyncMock(return_value=camera_read)

            result = await create_camera(Mock(), camera_data, current_user_dict, mock_db)

            assert result == camera_read
            mock_crud.exists.assert_called_once()
            mock_reg.assert_called_once()
            mock_crud.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_camera_duplicate(self, mock_db, current_user_dict):
        """Duplicate camera name raises DuplicateValueException."""
        camera_data = CameraCreate(name="Test Camera", location="Lab", rtsp_url="rtsp://192.168.1.10:8080/video")

        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud:
            mock_crud.exists = AsyncMock(return_value=True)

            with pytest.raises(DuplicateValueException):
                await create_camera(Mock(), camera_data, current_user_dict, mock_db)

    @pytest.mark.asyncio
    async def test_create_camera_mediamtx_failure(self, mock_db, current_user_dict):
        """MediaMTX registration failure raises BadRequestException."""
        camera_data = CameraCreate(name="Test Camera", location="Lab", rtsp_url="rtsp://192.168.1.10:8080/video")

        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud, \
             patch("src.app.api.v1.cameras.register_path_in_mediamtx", new_callable=AsyncMock) as mock_reg:

            mock_crud.exists = AsyncMock(return_value=False)
            mock_reg.return_value = False

            with pytest.raises(BadRequestException):
                await create_camera(Mock(), camera_data, current_user_dict, mock_db)


# ---------------------------------------------------------------------------
# Read Cameras (list)
# ---------------------------------------------------------------------------

class TestReadCameras:
    """Tests for GET /cameras"""

    @pytest.mark.asyncio
    async def test_read_cameras_success(self, mock_db, current_user_dict):
        """Returns paginated list of cameras."""
        mock_cameras_data = {"data": [make_camera_read().model_dump()], "count": 1}

        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud, \
             patch("src.app.api.v1.cameras.paginated_response") as mock_paged:

            mock_crud.get_multi = AsyncMock(return_value=mock_cameras_data)
            expected = {"data": mock_cameras_data["data"], "total": 1, "page": 1, "items_per_page": 10, "total_pages": 1}
            mock_paged.return_value = expected

            result = await read_cameras(Mock(), current_user_dict, mock_db, page=1, items_per_page=10)

            assert result == expected
            mock_crud.get_multi.assert_called_once()


# ---------------------------------------------------------------------------
# Read Camera (single)
# ---------------------------------------------------------------------------

class TestReadCamera:
    """Tests for GET /camera/{uuid}"""

    @pytest.mark.asyncio
    async def test_read_camera_success(self, mock_db, current_user_dict):
        """Returns camera when found."""
        camera_read = make_camera_read()

        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud:
            mock_crud.get = AsyncMock(return_value=camera_read)

            result = await read_camera(Mock(), camera_read.uuid, current_user_dict, mock_db)

            assert result == camera_read
            mock_crud.get.assert_called_once_with(
                db=mock_db, uuid=camera_read.uuid, is_deleted=False, schema_to_select=CameraRead
            )

    @pytest.mark.asyncio
    async def test_read_camera_not_found(self, mock_db, current_user_dict):
        """Raises NotFoundException when camera does not exist."""
        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(NotFoundException, match="Camera not found"):
                await read_camera(Mock(), uuid.uuid4(), current_user_dict, mock_db)


# ---------------------------------------------------------------------------
# Delete Camera
# ---------------------------------------------------------------------------

class TestDeleteCamera:
    """Tests for DELETE /camera/{uuid}"""

    @pytest.mark.asyncio
    async def test_delete_camera_success(self, mock_db, current_user_dict):
        """Soft-deletes camera and removes path from MediaMTX."""
        camera_read = make_camera_read()

        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud, \
             patch("src.app.api.v1.cameras.remove_path_from_mediamtx", new_callable=AsyncMock) as mock_rem:

            mock_crud.get = AsyncMock(return_value=camera_read)
            mock_rem.return_value = True
            mock_crud.update = AsyncMock(return_value=None)

            # Should return None (204 No Content)
            result = await delete_camera(Mock(), camera_read.uuid, current_user_dict, mock_db)

            assert result is None
            mock_rem.assert_called_once_with(camera_read.stream_path)
            mock_crud.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_camera_not_found(self, mock_db, current_user_dict):
        """Raises NotFoundException when camera does not exist."""
        with patch("src.app.api.v1.cameras.crud_cameras") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(NotFoundException, match="Camera not found"):
                await delete_camera(Mock(), uuid.uuid4(), current_user_dict, mock_db)
