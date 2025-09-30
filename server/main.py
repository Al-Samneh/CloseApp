from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import Dict, Set

app = FastAPI(title="Close Relay", version="0.1.0")

sessions: Dict[str, Set[WebSocket]] = {}

@app.get("/health")
async def health():
    return {"ok": True}

@app.websocket("/ws/{session_id}")
async def ws_endpoint(ws: WebSocket, session_id: str):
    await ws.accept()
    if session_id not in sessions:
        sessions[session_id] = set()
    sessions[session_id].add(ws)
    try:
        while True:
            msg = await ws.receive_text()
            for peer in list(sessions.get(session_id, set())):
                if peer is ws:
                    continue
                try:
                    await peer.send_text(msg)
                except WebSocketDisconnect:
                    sessions[session_id].discard(peer)
    except WebSocketDisconnect:
        sessions[session_id].discard(ws)

