"""Pydantic schemas for Escalation model"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum as PyEnum


class EscalationStatus(str, PyEnum):
    """Status of an escalation"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"
    CANCELLED = "cancelled"


class EscalationPriority(str, PyEnum):
    """Priority level of escalation"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationBase(BaseModel):
    """Base escalation schema"""
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    priority: EscalationPriority = EscalationPriority.MEDIUM
    zone_uuid: UUID
    camera_uuid: Optional[UUID] = None


class EscalationCreate(EscalationBase):
    """Schema for creating escalation"""
    pass


class EscalationUpdate(BaseModel):
    """Schema for updating escalation"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    priority: Optional[EscalationPriority] = None
    assigned_to_uuid: Optional[UUID] = None
    status: Optional[EscalationStatus] = None


class EscalationAction(BaseModel):
    """Schema for taking action on escalation"""
    action_taken: str = Field(..., min_length=1)


class EscalationResolve(BaseModel):
    """Schema for resolving escalation"""
    pass


class EscalationFalseAlarm(BaseModel):
    """Schema for marking as false alarm"""
    pass


class UserMinimal(BaseModel):
    """Minimal user information"""
    uuid: UUID
    name: Optional[str] = None
    email: str
    role: str

    class Config:
        from_attributes = True


class EscalationResponse(EscalationBase):
    """Response schema for escalation"""
    uuid: UUID
    assigned_to_uuid: Optional[UUID] = None
    created_by_uuid: UUID
    zone_name: Optional[str] = None
    camera_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    status: EscalationStatus
    priority: EscalationPriority
    action_taken: Optional[str] = None
    is_acted_upon: bool
    is_false_alarm: bool
    acted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EscalationList(BaseModel):
    """List response for escalations"""
    uuid: UUID
    title: str
    priority: EscalationPriority
    status: EscalationStatus
    zone_uuid: UUID
    assigned_to_uuid: Optional[UUID] = None
    created_by_uuid: UUID
    is_acted_upon: bool
    is_false_alarm: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    zone_name: Optional[str] = None
    camera_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None

    # Minimal user info
    assigned_to: Optional[UserMinimal] = None
    created_by: Optional[UserMinimal] = None

    class Config:
        from_attributes = True
