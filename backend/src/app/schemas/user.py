
from datetime import datetime
from typing import Annotated
import uuid as uuid_pkg

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema


class UserBase(BaseModel):
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]


class User(TimestampSchema, PersistentDeletion):
    uuid: uuid_pkg.UUID
    email: EmailStr
    name: str | None = None
    hashed_password: str
    role: str = "user"
    rank: str | None = None
    zone_id: uuid_pkg.UUID | None = None
    is_superuser: bool = False


class UserRead(BaseModel):
    uuid: uuid_pkg.UUID
    email: EmailStr
    name: str | None = None
    role: str = "user"
    rank: str | None = None
    zone_id: uuid_pkg.UUID | None = None

    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == "admin"

    def is_security(self) -> bool:
        """Check if user is security personnel"""
        return self.role == "security"


class UserCreate(BaseModel):
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]
    password: Annotated[str, Field(
        pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$", examples=["Str1ngst!"])]
    name: str | None = None
    role: str = "user"
    rank: str | None = None


class UserCreateInternal(BaseModel):
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]
    name: str | None = None
    hashed_password: str
    role: str = "user"
    rank: str | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Annotated[EmailStr | None, Field(
        examples=["user.userberg@example.com"], default=None)]
    name: str | None = None
    role: str | None = None
    rank: str | None = None


class UserUpdateInternal(UserUpdate):
    updated_at: datetime


class UserDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_deleted: bool
    deleted_at: datetime


class UserRestoreDeleted(BaseModel):
    is_deleted: bool
