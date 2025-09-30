from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import Dict, Set, Optional
import json

app = FastAPI(title="Close Relay", version="0.1.0")

sessions: Dict[str, Set[WebSocket]] = {}
link_request_connections: Dict[str, WebSocket] = {}  # ephemeral_id -> websocket

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

@app.websocket("/link-requests/{ephemeral_id}")
async def link_requests_endpoint(ws: WebSocket, ephemeral_id: str):
    await ws.accept()
    link_request_connections[ephemeral_id] = ws
    
    try:
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                
                if msg.get("type") == "send_link_request":
                    # Forward link request to recipient
                    request = msg.get("request", {})
                    to_id = request.get("to_ephemeral_id")
                    from_id = request.get("from_ephemeral_id")
                    
                    if to_id in link_request_connections:
                        recipient_ws = link_request_connections[to_id]
                        await recipient_ws.send_text(json.dumps({
                            "type": "link_request",
                            "request": request
                        }))
                    else:
                        pass
                
                elif msg.get("type") == "respond_to_request":
                    # Notify the original sender that their request was accepted
                    to_id = msg.get("to_ephemeral_id")
                    accepted = msg.get("accepted", False)
                    session_id = msg.get("session_id")
                    
                    if accepted and to_id in link_request_connections:
                        sender_ws = link_request_connections[to_id]
                        await sender_ws.send_text(json.dumps({
                            "type": "request_accepted",
                            "session_id": session_id
                        }))
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        if ephemeral_id in link_request_connections:
            del link_request_connections[ephemeral_id]
            

