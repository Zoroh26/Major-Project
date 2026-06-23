import asyncio
import concurrent.futures

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.responses import Response

from ...core.config import EnvironmentOption, settings
from ...ml.service import ml_inference_service
from ...schemas.ml import MLLatestResponse, MLSessionState, MLStartRequest

router = APIRouter(tags=["ml-dev"], prefix="/dev")

# Thread pool for blocking cv2 snapshot calls
_snapshot_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=2, thread_name_prefix="cv2-snapshot"
)


def _grab_jpeg(stream_url: str, quality: int = 80) -> bytes:
    """
    Open the RTSP stream, read a single frame, encode as JPEG, and close.
    Raises RuntimeError if the stream can't be opened or no frame arrives.
    """
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open stream: {stream_url}")
    try:
        # Try a few reads — first frames after connect may be empty
        frame: np.ndarray | None = None
        for _ in range(10):
            ok, f = cap.read()
            if ok and f is not None:
                frame = f
                break
        if frame is None:
            raise RuntimeError("Stream opened but returned no frames")
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not ok:
            raise RuntimeError("JPEG encoding failed")
        return buf.tobytes()
    finally:
        cap.release()



def _guard_local_environment() -> None:
    if settings.ENVIRONMENT != EnvironmentOption.LOCAL:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post("/start", response_model=MLSessionState)
async def start_ml_session(payload: MLStartRequest) -> MLSessionState:
    _guard_local_environment()

    try:
        return await ml_inference_service.start(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to start ML session: {exc}",
        ) from exc


@router.post("/stop", response_model=MLSessionState)
async def stop_ml_session() -> MLSessionState:
    _guard_local_environment()
    return await ml_inference_service.stop()


@router.get("/status", response_model=MLSessionState)
async def get_ml_status() -> MLSessionState:
    _guard_local_environment()
    return await ml_inference_service.get_status()


@router.get("/latest", response_model=MLLatestResponse)
async def get_ml_latest() -> MLLatestResponse:
    _guard_local_environment()
    return await ml_inference_service.get_latest()


@router.websocket("/stream")
async def ml_stream(websocket: WebSocket) -> None:
    if settings.ENVIRONMENT != EnvironmentOption.LOCAL:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    last_sent_timestamp: str | None = None

    try:
        while True:
            latest_response = await ml_inference_service.get_latest()
            if latest_response.latest is not None:
                payload = latest_response.latest.model_dump(mode="json")
                timestamp = str(payload.get("timestamp"))
                if timestamp != last_sent_timestamp:
                    await websocket.send_json(payload)
                    last_sent_timestamp = timestamp

            await asyncio.sleep(0.3)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close(code=1011)


@router.get("/snapshot")
async def get_stream_snapshot(
    stream_url: str = Query(..., description="Full RTSP URL to capture a frame from"),
    quality: int = Query(default=80, ge=10, le=100),
) -> Response:
    """
    Capture a single JPEG frame from the given RTSP stream server-side.

    The frontend calls this instead of doing canvas capture (which requires
    CORS headers on the HLS/WebRTC server).  Returns image/jpeg bytes.
    """
    _guard_local_environment()

    loop = asyncio.get_running_loop()
    try:
        jpeg_bytes: bytes = await loop.run_in_executor(
            _snapshot_executor,
            lambda: _grab_jpeg(stream_url, quality),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return Response(content=jpeg_bytes, media_type="image/jpeg")
