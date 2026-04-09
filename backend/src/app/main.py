from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from .api.v1.cameras import register_path_in_mediamtx
from .core.db.database import local_session
from .core.security import get_password_hash
from .crud.crud_cameras import crud_cameras
from .models.user import User
from .schemas.camera import CameraRead
from .admin.initialize import create_admin_interface
from .api import router
from .core.config import settings
from .core.setup import create_application, lifespan_factory

admin = create_admin_interface()
logger = logging.getLogger(__name__)


async def ensure_initial_superuser() -> None:
    """Create a bootstrap admin-equivalent user only when the user table is empty."""
    async with local_session() as db:
        try:
            existing_user = await db.scalar(select(User.uuid).limit(1))
            if existing_user:
                return

            bootstrap_admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="user",
                name=settings.ADMIN_NAME,
            )
            db.add(bootstrap_admin)
            await db.commit()
            logger.warning(
                "Bootstrap admin created: %s (change ADMIN_PASSWORD after first login)",
                settings.ADMIN_EMAIL,
            )
        except SQLAlchemyError as exc:
            await db.rollback()
            logger.warning("Skipping bootstrap admin creation: %s", exc)


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
            camera = CameraRead(
                **camera_data) if isinstance(camera_data, dict) else camera_data
            await register_path_in_mediamtx(camera.stream_path, camera.rtsp_url)


@asynccontextmanager
async def lifespan_with_admin(app: FastAPI) -> AsyncGenerator[None, None]:
    """Custom lifespan that includes admin initialization."""
    # Get the default lifespan
    default_lifespan = lifespan_factory(settings)

    # Run the default lifespan initialization and our admin initialization
    async with default_lifespan(app):
        await ensure_initial_superuser()

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
