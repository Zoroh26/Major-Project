from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


SourceMode = Literal["direct_webcam", "mediamtx"]


class MLStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_mode: SourceMode = "direct_webcam"
    device_id: int = Field(default=0, ge=0)
    stream_url: str | None = None
    model_name: str = "yolov8n.pt"
    interval_seconds: float = Field(default=2.5, gt=0.0, le=30.0)
    confidence_threshold: float = Field(default=0.25, ge=0.0, le=1.0)
    heatmap_width: int = Field(default=32, ge=8, le=128)
    heatmap_height: int = Field(default=24, ge=8, le=128)
    camera_uuid: str = "00000000-0000-0000-0000-000000000000"

    @model_validator(mode="after")
    def validate_source_config(self) -> "MLStartRequest":
        if self.source_mode == "mediamtx" and not self.stream_url:
            raise ValueError("stream_url is required when source_mode is mediamtx")
        return self


class MLFramePayload(BaseModel):
    width: int
    height: int


class MLHeatmapPayload(BaseModel):
    width: int
    height: int
    values: list[float]


class MLHotspotPayload(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    intensity: float = Field(ge=0.0, le=1.0)


class MLMetricsPayload(BaseModel):
    person_count: int = Field(ge=0)
    average_confidence: float = Field(ge=0.0, le=1.0)
    max_confidence: float = Field(ge=0.0, le=1.0)
    processing_time_ms: float = Field(ge=0.0)
    inference_fps: float = Field(ge=0.0)
    alert_triggered: bool = False


class MLResultPayload(BaseModel):
    camera_uuid: str
    timestamp: datetime
    source_mode: SourceMode
    metrics: MLMetricsPayload
    frame: MLFramePayload
    heatmap: MLHeatmapPayload
    hotspot: MLHotspotPayload


class MLSessionState(BaseModel):
    running: bool
    source_mode: SourceMode | None = None
    last_update: datetime | None = None
    message: str | None = None
    error: str | None = None


class MLLatestResponse(BaseModel):
    running: bool
    latest: MLResultPayload | None = None
    error: str | None = None
