from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from .api.v1.cameras import register_path_in_mediamtx
from .core.db.database import local_session
from .crud.crud_cameras import crud_cameras
from .schemas.camera import CameraRead
from .admin.initialize import create_admin_interface
from .api import router
from .core.config import settings
from .core.setup import create_application, lifespan_factory

admin = create_admin_interface()


async def sync_cameras_with_mediamtx() -> None:
    """Re-register DB camera paths in MediaMTX after service restarts."""
    async with local_session() as db:
        cameras = await crud_cameras.get_multi(
            db=db,
            offset=0,
            limit=1000,
            is_deleted=False,
            schema_to_select=CameraRead,
        )

        for camera_data in cameras.get("data", []):
            camera = CameraRead(**camera_data) if isinstance(camera_data, dict) else camera_data
            await register_path_in_mediamtx(camera.stream_path, camera.rtsp_url)


@asynccontextmanager
async def lifespan_with_admin(app: FastAPI) -> AsyncGenerator[None, None]:
    """Custom lifespan that includes admin initialization."""
    # Get the default lifespan
    default_lifespan = lifespan_factory(settings)

    # Run the default lifespan initialization and our admin initialization
    async with default_lifespan(app):
        # Initialize admin interface if it exists
        if admin:
            # Initialize admin database and setup
            await admin.initialize()

        # MediaMTX dynamic paths are ephemeral. Re-register existing cameras on boot.
        await sync_cameras_with_mediamtx()

        yield


app = create_application(router=router, settings=settings,
                         lifespan=lifespan_with_admin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount admin interface if enabled
if admin:
    app.mount(settings.CRUD_ADMIN_MOUNT_PATH, admin.app)
