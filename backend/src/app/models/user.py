from uuid6 import uuid7
from datetime import UTC, datetime
import uuid as uuid_pkg

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base


class User(Base):
    __tablename__ = "user"

    email: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(
        String(50), default="security", index=True)
    name: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default=None)
    rank: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default=None)
    zone_id: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zone.uuid", ondelete="SET NULL"), nullable=True, index=True, default=None
    )
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None)
    is_deleted: Mapped[bool] = mapped_column(default=False, index=True)

    # Relationships
    escalations_assigned = relationship(
        "Escalation",
        foreign_keys="Escalation.assigned_to_uuid",
        back_populates="assigned_to"
    )
    escalations_created = relationship(
        "Escalation",
        foreign_keys="Escalation.created_by_uuid",
        back_populates="created_by"
    )

    # Helper methods for role checking
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == "admin"

    def is_security(self) -> bool:
        """Check if user is security personnel"""
        return self.role == "security"
