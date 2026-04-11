from __future__ import annotations

import asyncio
import concurrent.futures
from datetime import UTC, datetime
from time import perf_counter

from ..schemas.ml import (
    MLFramePayload,
    MLHeatmapPayload,
    MLHotspotPayload,
    MLLatestResponse,
    MLMetricsPayload,
    MLResultPayload,
    MLSessionState,
    MLStartRequest,
)
from .inference import YoloPersonDetector
from .postprocess import build_heatmap
from .source import OpenCVFrameSource

# Single-threaded pool keeps YOLO inference sequential and off the event loop.
_yolo_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=1, thread_name_prefix="yolo"
)


class MLInferenceService:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._latest: MLResultPayload | None = None
        self._status = MLSessionState(running=False)

    async def start(self, config: MLStartRequest) -> MLSessionState:
        async with self._lock:
            if self._task is not None and not self._task.done():
                return MLSessionState(
                    running=True,
                    source_mode=self._status.source_mode,
                    last_update=self._status.last_update,
                    message="ML session is already running",
                    error=self._status.error,
                )

            self._status = MLSessionState(
                running=True,
                source_mode=config.source_mode,
                message="ML inference session started",
                error=None,
            )
            self._stop_event = asyncio.Event()
            self._task = asyncio.create_task(self._run_loop(config))
            return self._status

    async def stop(self) -> MLSessionState:
        task: asyncio.Task[None] | None
        stop_event: asyncio.Event | None

        async with self._lock:
            task = self._task
            stop_event = self._stop_event
            if task is None:
                self._status = MLSessionState(running=False, message="No active ML session")
                return self._status

            if stop_event is not None:
                stop_event.set()

        if task is not None:
            try:
                await asyncio.wait_for(task, timeout=5.0)
            except TimeoutError:
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)

        async with self._lock:
            self._task = None
            self._stop_event = None
            self._status = MLSessionState(
                running=False,
                source_mode=self._status.source_mode,
                last_update=self._status.last_update,
                message="ML inference session stopped",
                error=self._status.error,
            )
            return self._status

    async def get_status(self) -> MLSessionState:
        async with self._lock:
            running = self._task is not None and not self._task.done()
            return MLSessionState(
                running=running,
                source_mode=self._status.source_mode,
                last_update=self._status.last_update,
                message=self._status.message,
                error=self._status.error,
            )

    async def get_latest(self) -> MLLatestResponse:
        status = await self.get_status()
        async with self._lock:
            latest = self._latest
        return MLLatestResponse(running=status.running, latest=latest, error=status.error)

    async def _set_latest(self, payload: MLResultPayload) -> None:
        async with self._lock:
            self._latest = payload
            self._status.last_update = payload.timestamp
            self._status.error = None

    async def _set_error(self, message: str) -> None:
        async with self._lock:
            self._status.error = message
            self._status.running = False

    async def _run_loop(self, config: MLStartRequest) -> None:
        loop = asyncio.get_running_loop()
        source = OpenCVFrameSource(
            source_mode=config.source_mode,
            device_id=config.device_id,
            stream_url=config.stream_url,
        )

        try:
            # Both the model load and the RTSP connect are blocking; run them
            # in the executor so the event loop stays responsive.
            detector = await loop.run_in_executor(
                _yolo_executor,
                lambda: YoloPersonDetector(
                    model_name=config.model_name,
                    confidence_threshold=config.confidence_threshold,
                ),
            )
            await loop.run_in_executor(_yolo_executor, source.open)

            while self._stop_event is not None and not self._stop_event.is_set():
                loop_started = perf_counter()
                frame = source.read_frame()

                if frame is None:
                    await asyncio.sleep(0.1)
                    continue

                frame_height = int(frame.shape[0])
                frame_width = int(frame.shape[1])

                # Run blocking YOLO inference off the event loop.
                boxes, confidence_values = await loop.run_in_executor(
                    _yolo_executor, detector.detect_people, frame
                )
                person_count = len(boxes)

                average_confidence = (
                    round(sum(confidence_values) / len(confidence_values), 4)
                    if confidence_values
                    else 0.0
                )
                max_confidence = round(max(confidence_values), 4) if confidence_values else 0.0

                heatmap_values, hotspot = build_heatmap(
                    boxes=boxes,
                    frame_width=frame_width,
                    frame_height=frame_height,
                    grid_width=config.heatmap_width,
                    grid_height=config.heatmap_height,
                )

                processing_time_ms = round((perf_counter() - loop_started) * 1000, 2)
                inference_fps = round(1000.0 / processing_time_ms, 2) if processing_time_ms > 0 else 0.0

                payload = MLResultPayload(
                    camera_uuid=config.camera_uuid,
                    timestamp=datetime.now(UTC),
                    source_mode=config.source_mode,
                    metrics=MLMetricsPayload(
                        person_count=person_count,
                        average_confidence=average_confidence,
                        max_confidence=max_confidence,
                        processing_time_ms=processing_time_ms,
                        inference_fps=inference_fps,
                        alert_triggered=False,
                    ),
                    frame=MLFramePayload(width=frame_width, height=frame_height),
                    heatmap=MLHeatmapPayload(
                        width=config.heatmap_width,
                        height=config.heatmap_height,
                        values=heatmap_values,
                    ),
                    hotspot=MLHotspotPayload(
                        x=hotspot[0],
                        y=hotspot[1],
                        intensity=hotspot[2],
                    ),
                )

                await self._set_latest(payload)

                elapsed = perf_counter() - loop_started
                remaining = config.interval_seconds - elapsed
                if remaining > 0:
                    try:
                        if self._stop_event is not None:
                            await asyncio.wait_for(self._stop_event.wait(), timeout=remaining)
                    except TimeoutError:
                        pass

        except Exception as exc:
            await self._set_error(str(exc))
        finally:
            source.close()
            async with self._lock:
                self._task = None
                self._stop_event = None
                self._status.running = False
                if self._status.message is None:
                    self._status.message = "ML inference loop exited"


ml_inference_service = MLInferenceService()
