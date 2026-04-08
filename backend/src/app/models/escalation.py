"""Escalation model for tracking incident escalations"""
from uuid6 import uuid7
from datetime import UTC, datetime
import uuid as uuid_pkg
from enum import Enum as PyEnum

from sqlalchemy import DateTime, String, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base


class EscalationStatus(str, PyEnum):
    """Status of an escalation"""
    PENDING = "pending"              # Waiting for assignment/response
    ASSIGNED = "assigned"            # Assigned to security personnel
    IN_PROGRESS = "in_progress"      # Being handled
    RESOLVED = "resolved"            # Successfully resolved
    FALSE_ALARM = "false_alarm"      # Marked as false alarm
    CANCELLED = "cancelled"          # Cancelled/withdrawn


class EscalationPriority(str, PyEnum):
    """Priority level of escalation"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Escalation(Base):
    __tablename__ = "escalation"

    # Required fields (no defaults) come first
    zone_uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zone.uuid", ondelete="CASCADE"), index=True
    )

    created_by_uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.uuid", ondelete="RESTRICT"), index=True
    )

    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str] = mapped_column(Text)

    # Fields with defaults or nullable
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default_factory=uuid7, unique=True
    )

    # Security personnel assignment
    assigned_to_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.uuid", ondelete="SET NULL"), nullable=True, index=True, default=None
    )

    priority: Mapped[EscalationPriority] = mapped_column(
        String(20), default=EscalationPriority.MEDIUM, index=True
    )
    status: Mapped[EscalationStatus] = mapped_column(
        String(20), default=EscalationStatus.PENDING, index=True
    )

    # Action tracking
    action_taken: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None)
    is_acted_upon: Mapped[bool] = mapped_column(default=False, index=True)
    is_false_alarm: Mapped[bool] = mapped_column(default=False, index=True)
    acted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None)

    # Camera reference (optional)
    camera_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("camera.uuid", ondelete="SET NULL"), nullable=True, index=True, default=None
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC), index=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True, default=None
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    is_deleted: Mapped[bool] = mapped_column(default=False, index=True)

    # Relationships
    zone = relationship("Zone", back_populates="escalations")
    assigned_to = relationship("User", foreign_keys=[
                               assigned_to_uuid], back_populates="escalations_assigned")
    created_by = relationship("User", foreign_keys=[
                              created_by_uuid], back_populates="escalations_created")
    camera = relationship("Camera", back_populates="escalations")

    # Indexes for common queries
    __table_args__ = (
        Index("ix_escalation_zone_status", "zone_uuid", "status"),
        Index("ix_escalation_assigned_status", "assigned_to_uuid", "status"),
        Index("ix_escalation_created_at_zone", "created_at", "zone_uuid"),
    )

    def mark_acted_upon(self, action_text: str) -> None:
        """Mark escalation as acted upon"""
        self.is_acted_upon = True
        self.action_taken = action_text
        self.acted_at = datetime.now(UTC)
        self.status = EscalationStatus.IN_PROGRESS
        self.updated_at = datetime.now(UTC)

    def mark_resolved(self) -> None:
        """Mark escalation as resolved"""
        self.status = EscalationStatus.RESOLVED
        self.resolved_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def mark_false_alarm(self) -> None:
        """Mark escalation as false alarm"""
        self.is_false_alarm = True
        self.status = EscalationStatus.FALSE_ALARM
        self.resolved_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)
