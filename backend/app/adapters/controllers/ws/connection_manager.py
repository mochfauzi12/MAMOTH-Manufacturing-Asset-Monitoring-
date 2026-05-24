from typing import Dict, Set
from fastapi import WebSocket
import json
import structlog

logger = structlog.get_logger()

class ConnectionManager:
    def __init__(self):
        self.supervisor_connections: Dict[str, Set[WebSocket]] = {}
        self.technician_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_supervisor(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.supervisor_connections.setdefault(user_id, set()).add(websocket)
        logger.info("Supervisor WS connected", user_id=user_id)

    async def connect_technician(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.technician_connections.setdefault(user_id, set()).add(websocket)
        logger.info("Technician WS connected", user_id=user_id)

    def disconnect(self, websocket: WebSocket, user_id: str, role: str):
        pool = self.supervisor_connections if role == "SUPERVISOR" else self.technician_connections
        if user_id in pool:
            pool[user_id].discard(websocket)
            if not pool[user_id]:
                del pool[user_id]
        logger.info("WS disconnected", user_id=user_id, role=role)

    async def broadcast_to_supervisors(self, message: dict):
        dead = []
        for user_id, connections in self.supervisor_connections.items():
            for ws in list(connections):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append((user_id, ws))
        
        for user_id, ws in dead:
            self.supervisor_connections.get(user_id, set()).discard(ws)

    async def send_to_technician(self, technician_user_id: str, message: dict):
        for ws in list(self.technician_connections.get(technician_user_id, set())):
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()