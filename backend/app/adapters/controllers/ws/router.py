from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.adapters.controllers.ws.connection_manager import manager as ws_manager
from jose import jwt
from app.infrastructure.config.environment import settings
import structlog

router = APIRouter()
logger = structlog.get_logger()

@router.websocket("/ws/supervisor")
async def supervisor_websocket(websocket: WebSocket, token: str = Query(...)):
    try:
        # JWT verify handshake
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        role = payload.get("role")
    except Exception:
        await websocket.close(code=4003) # Forbidden
        return

    await ws_manager.connect_supervisor(websocket, user_id)
    try:
        while True:
            # Keepalive loop
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id, "SUPERVISOR")