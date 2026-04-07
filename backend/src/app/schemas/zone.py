from datetime import datetime
import uuid as uuid_pkg

from pydantic import BaseModel, Field


class ZoneBase(BaseModel):
    name: str = Field(min_length=1, max_length=100, examples=["Zone A - North Entrance"])
    description: str | None = Field(default=None, max_length=500)
    alert_threshold: float = Field(default=0.85, ge=0.0, le=1.0)


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    alert_threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class ZoneRead(BaseModel):
    uuid: uuid_pkg.UUID
    name: str
    description: str | None = None
    alert_threshold: float
    created_at: datetime
    updated_at: datetime | None = None


class ZoneCreateInternal(ZoneBase):
    pass


class ZoneUpdateInternal(ZoneUpdate):
    updated_at: datetime


class ZoneDelete(BaseModel):
    is_deleted: bool


# --- Assignment schemas ---

class AssignCameraRequest(BaseModel):
    camera_uuid: uuid_pkg.UUID


class AssignGuardRequest(BaseModel):
    user_uuid: uuid_pkg.UUID


class CameraZoneRead(BaseModel):
    """Minimal camera info returned inside a zone detail"""
    uuid: uuid_pkg.UUID
    name: str
    location: str
    stream_path: str
    is_active: bool


class GuardZoneRead(BaseModel):
    """Minimal guard info returned inside a zone detail"""
    uuid: uuid_pkg.UUID
    email: str
    name: str | None = None
    role: str
    rank: str | None = None


class ZoneDetailRead(ZoneRead):
    cameras: list[CameraZoneRead] = []
    guards: list[GuardZoneRead] = []
