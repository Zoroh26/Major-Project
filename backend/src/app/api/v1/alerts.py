import asyncio
import json
import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from starlette.status import HTTP_403_FORBIDDEN

from ...core.security import verify_token, TokenType
from ...core.db.database import local_session
from ...crud.crud_users import crud_users

router = APIRouter(tags=["alerts"])
logger = logging.getLogger(__name__)

# Basic connection manager for websockets
class ConnectionManager:
    def __init__(self):
        # zone -> list of websockets
        self.active_connections: Dict[str, list[WebSocket]] = {
            "top-left": [],
            "top-right": [],
            "bottom-left": [],
            "bottom-right": [],
        }

    async def connect(self, websocket: WebSocket, zone: str):
        await websocket.accept()
        if zone in self.active_connections:
            self.active_connections[zone].append(websocket)

    def disconnect(self, websocket: WebSocket, zone: str):
        if zone in self.active_connections:
            if websocket in self.active_connections[zone]:
                self.active_connections[zone].remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_zone(self, message: Dict[str, Any], zone: str):
        if zone in self.active_connections:
            for connection in self.active_connections[zone]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to websocket: {e}")

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket for receiving alerts. Token is passed as query param.
    """
    try:
        async with local_session() as session:
            payload = await verify_token(token, TokenType.ACCESS, session)
            if not payload:
                await websocket.close(code=1008)
                return
                
            uuid_str = payload.username_or_email
            
            from sqlalchemy import select
            from ...models.user import User
            
            result = await session.execute(select(User).filter_by(uuid=uuid_str))
            user = result.scalar_one_or_none()

            # fallback to email if it was an email
            if not user and "@" in uuid_str:
                result = await session.execute(select(User).filter_by(email=uuid_str))
                user = result.scalar_one_or_none()

            if not user or not user.zone:
                logger.warning("User not found or user has no zone.")
                await websocket.close(code=1008)
                return
            zone = user.zone

        await manager.connect(websocket, zone)
        try:
            while True:
                data = await websocket.receive_text()
                # Here we could process ack messages from guards if we wanted
        except WebSocketDisconnect:
            manager.disconnect(websocket, zone)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1008)

from pydantic import BaseModel

class DispatchPayload(BaseModel):
    zone: str
    message: str

@router.post("/dispatch")
async def dispatch_alert(payload: DispatchPayload):
    """
    Admin endpoint to trigger a dispatch alert for a specific zone.
    In a real app, you would add Admin dependency here.
    """
    zones = ["top-left", "top-right", "bottom-left", "bottom-right"]
    if payload.zone not in zones:
        raise HTTPException(status_code=400, detail="Invalid zone")

    message_data = {
        "type": "alert",
        "zone": payload.zone,
        "message": payload.message,
        "status": "active"
    }

    await manager.broadcast_to_zone(message_data, payload.zone)
    return {"status": "success", "message": f"Alert dispatched to {payload.zone}"}

