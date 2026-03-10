
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
    hashed_password: str
    role: str = "user"
    zone: str | None = None
    is_superuser: bool = False


class UserRead(BaseModel):
    uuid: uuid_pkg.UUID
    email: EmailStr
    role: str = "user"
    zone: str | None = None


class UserCreate(BaseModel):
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]
    password: Annotated[str, Field(
        pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$", examples=["Str1ngst!"])]
    role: str = "user"
    zone: str | None = None


class UserCreateInternal(BaseModel):
    email: Annotated[EmailStr, Field(examples=["user.userson@example.com"])]
    hashed_password: str
    role: str = "user"
    zone: str | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Annotated[EmailStr | None, Field(
        examples=["user.userberg@example.com"], default=None)]
    role: str | None = None
    zone: str | None = None


class UserUpdateInternal(UserUpdate):
    updated_at: datetime


class UserDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_deleted: bool
    deleted_at: datetime


class UserRestoreDeleted(BaseModel):
    is_deleted: bool
