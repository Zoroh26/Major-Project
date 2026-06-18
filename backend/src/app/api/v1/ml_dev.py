import asyncio

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from ...core.config import EnvironmentOption, settings
from ...ml.service import ml_inference_service
from ...schemas.ml import MLLatestResponse, MLSessionState, MLStartRequest

router = APIRouter(tags=["ml-dev"], prefix="/dev")


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
