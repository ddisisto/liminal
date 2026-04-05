"""Liminal backend — FastAPI app with WebSocket token streaming.

Run with: uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.sessions import ensure_demo_session, get_mainline
from backend.storage.database import Database

db: Database | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db
    db = Database()
    # Ensure demo content exists on startup
    ensure_demo_session(db)
    yield
    db.close()


app = FastAPI(title="Liminal", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/sessions")
async def list_sessions():
    return db.list_sessions()


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = db.get_session(session_id)
    if not session:
        return {"error": "not found"}, 404
    mainline = get_mainline(db, session_id)
    return {"session": session, "turns": mainline}


@app.websocket("/ws/{session_id}")
async def websocket_session(ws: WebSocket, session_id: str):
    """WebSocket endpoint for a session.

    On connect: sends the full mainline as buffered turns.
    Then listens for pull requests and streams the next turn's tokens.
    """
    await ws.accept()

    session = db.get_session(session_id)
    if not session:
        await ws.send_json({"type": "error", "message": "session not found"})
        await ws.close()
        return

    mainline = get_mainline(db, session_id)

    # Send session metadata
    await ws.send_json({
        "type": "session",
        "session_id": session_id,
        "title": session.get("title"),
        "total_turns": len(mainline),
    })

    # Client controls pacing: it requests turns by index.
    # We send buffered turns (all tokens at once) or stream them.
    try:
        while True:
            msg = await ws.receive_json()

            if msg.get("type") == "pull":
                turn_index = msg.get("index", 0)
                if turn_index >= len(mainline):
                    await ws.send_json({"type": "end"})
                    continue

                turn = mainline[turn_index]
                mode = msg.get("mode", "stream")

                if mode == "buffer":
                    # Send all tokens at once (for initial load)
                    await ws.send_json({
                        "type": "turn",
                        "index": turn_index,
                        "sequence_id": turn["sequence_id"],
                        "role": turn["role"],
                        "mode": "buffer",
                        "tokens": turn["tokens"],
                    })
                else:
                    # Stream tokens one at a time
                    await ws.send_json({
                        "type": "turn_start",
                        "index": turn_index,
                        "sequence_id": turn["sequence_id"],
                        "role": turn["role"],
                        "total_tokens": len(turn["tokens"]),
                    })
                    for token in turn["tokens"]:
                        await ws.send_json({
                            "type": "token",
                            "index": turn_index,
                            "sequence_id": turn["sequence_id"],
                            "position": token["position"],
                            "text": token["text"],
                            "logprob": token.get("logprob"),
                            "entropy": token.get("entropy"),
                            "surprisal": token.get("surprisal"),
                        })
                    await ws.send_json({
                        "type": "turn_end",
                        "index": turn_index,
                        "sequence_id": turn["sequence_id"],
                    })

            elif msg.get("type") == "skip":
                # Client wants to skip current streaming — acknowledged
                await ws.send_json({"type": "skipped"})

    except WebSocketDisconnect:
        pass


class ViewportEventBatch(BaseModel):
    events: list[dict[str, Any]]


@app.post("/api/viewport-events")
async def ingest_viewport_events(batch: ViewportEventBatch):
    """Receive batched viewport visibility events from the frontend."""
    if batch.events:
        db.insert_viewport_events_bulk(batch.events)
    return {"accepted": len(batch.events)}
