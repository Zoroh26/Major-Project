from datetime import datetime
from typing import Annotated
import uuid as uuid_pkg

from pydantic import BaseModel, ConfigDict, Field, computed_field


class CameraBase(BaseModel):
    name: Annotated[str, Field(
        min_length=1, max_length=100, examples=["Office Camera"])]
    location: Annotated[str, Field(
        min_length=1, max_length=200, examples=["Main Lobby"])]
    rtsp_url: Annotated[str, Field(
        examples=["rtsp://192.168.1.100:8080/video"])]


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str | None, Field(
        min_length=1, max_length=100, default=None)]
    location: Annotated[str | None, Field(
        min_length=1, max_length=200, default=None)]


class CameraRead(BaseModel):
    uuid: uuid_pkg.UUID
    name: str
    location: str
    rtsp_url: str
    stream_path: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime | None = None

    @computed_field
    @property
    def hls_url(self) -> str:
        """Generate the HLS playback URL for this camera"""
        return f"http://localhost:8888/{self.stream_path}/index.m3u8"

    @computed_field
    @property
    def webrtc_url(self) -> str:
        """Generate the WebRTC playback URL for this camera"""
        return f"ws://localhost:8889/{self.stream_path}"


class CameraCreateInternal(CameraBase):
    stream_path: str


class CameraUpdateInternal(CameraUpdate):
    updated_at: datetime


class CameraDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_deleted: bool
    deleted_at: datetime
