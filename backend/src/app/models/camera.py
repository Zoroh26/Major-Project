from uuid6 import uuid7
from datetime import UTC, datetime
import uuid as uuid_pkg

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class Camera(Base):
    __tablename__ = "camera"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    rtsp_url: Mapped[str] = mapped_column(String(500), nullable=False)
    stream_path: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True)

    zone_id: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zone.uuid", ondelete="SET NULL"), nullable=True, index=True, default=None
    )
