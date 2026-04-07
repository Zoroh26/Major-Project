from uuid6 import uuid7
from datetime import UTC, datetime
import uuid as uuid_pkg

from sqlalchemy import Boolean, DateTime, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class Zone(Base):
    __tablename__ = "zone"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500), default=None, nullable=True)
    alert_threshold: Mapped[float] = mapped_column(Float, default=0.85)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default_factory=uuid7, unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

