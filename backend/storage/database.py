"""SQLite storage layer for Liminal.

Single-file database, WAL mode, raw SQL. No ORM.
"""

from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path
from typing import Any

SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "schema" / "init.sql"
DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "liminal.db"


def new_id() -> str:
    return str(uuid.uuid4())


class Database:
    def __init__(self, path: Path = DEFAULT_DB_PATH):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.conn = sqlite3.connect(str(path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        sql = SCHEMA_PATH.read_text()
        self.conn.executescript(sql)

    def close(self) -> None:
        self.conn.close()

    # -- Sessions --

    def create_session(self, title: str | None = None, metadata: str | None = None) -> str:
        sid = new_id()
        self.conn.execute(
            "INSERT INTO sessions (id, title, metadata) VALUES (?, ?, ?)",
            (sid, title, metadata),
        )
        self.conn.commit()
        return sid

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
        return dict(row) if row else None

    def list_sessions(self) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM sessions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    # -- Sequences --

    def create_sequence(
        self,
        session_id: str,
        role: str,
        status: str = "active",
        parent_sequence_id: str | None = None,
        fork_position: int | None = None,
    ) -> str:
        seq_id = new_id()
        self.conn.execute(
            """INSERT INTO sequences (id, session_id, parent_sequence_id, fork_position, role, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (seq_id, session_id, parent_sequence_id, fork_position, role, status),
        )
        self.conn.commit()
        return seq_id

    def get_sequence(self, sequence_id: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT * FROM sequences WHERE id = ?", (sequence_id,)
        ).fetchone()
        return dict(row) if row else None

    def get_session_sequences(
        self, session_id: str, statuses: tuple[str, ...] = ("active", "kept")
    ) -> list[dict[str, Any]]:
        placeholders = ",".join("?" for _ in statuses)
        rows = self.conn.execute(
            f"""SELECT * FROM sequences
                WHERE session_id = ? AND status IN ({placeholders})
                ORDER BY created_at""",
            (session_id, *statuses),
        ).fetchall()
        return [dict(r) for r in rows]

    def update_sequence_status(self, sequence_id: str, status: str) -> None:
        self.conn.execute(
            "UPDATE sequences SET status = ? WHERE id = ?", (status, sequence_id)
        )
        self.conn.commit()

    # -- Tokens --

    def insert_token(
        self,
        sequence_id: str,
        position: int,
        text: str,
        logprob: float | None = None,
        entropy: float | None = None,
        surprisal: float | None = None,
        top_k: str | None = None,
    ) -> None:
        self.conn.execute(
            """INSERT INTO tokens (sequence_id, position, text, logprob, entropy, surprisal, top_k)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (sequence_id, position, text, logprob, entropy, surprisal, top_k),
        )
        self.conn.commit()

    def insert_tokens_bulk(
        self, sequence_id: str, tokens: list[dict[str, Any]]
    ) -> None:
        """Bulk insert tokens for a sequence. Each dict needs: position, text.
        Optional: logprob, entropy, surprisal, top_k."""
        self.conn.executemany(
            """INSERT INTO tokens (sequence_id, position, text, logprob, entropy, surprisal, top_k)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [
                (
                    sequence_id,
                    t["position"],
                    t["text"],
                    t.get("logprob"),
                    t.get("entropy"),
                    t.get("surprisal"),
                    t.get("top_k"),
                )
                for t in tokens
            ],
        )
        self.conn.commit()

    def get_sequence_tokens(self, sequence_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM tokens WHERE sequence_id = ? ORDER BY position",
            (sequence_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    # -- Viewport events --

    def insert_viewport_event(
        self,
        session_id: str,
        sequence_id: str,
        visible_from: str,
        visible_to: str,
        duration_ms: int,
        confidence: str = "active",
    ) -> None:
        self.conn.execute(
            """INSERT INTO viewport_events
               (session_id, sequence_id, visible_from, visible_to, duration_ms, confidence)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session_id, sequence_id, visible_from, visible_to, duration_ms, confidence),
        )
        self.conn.commit()

    def insert_viewport_events_bulk(self, events: list[dict[str, Any]]) -> None:
        self.conn.executemany(
            """INSERT INTO viewport_events
               (session_id, sequence_id, visible_from, visible_to, duration_ms, confidence)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [
                (
                    e["session_id"],
                    e["sequence_id"],
                    e["visible_from"],
                    e["visible_to"],
                    e["duration_ms"],
                    e.get("confidence", "active"),
                )
                for e in events
            ],
        )
        self.conn.commit()

    def get_sequence_viewport_time(self, sequence_id: str) -> int:
        """Total viewport time in ms for a sequence (active confidence only)."""
        row = self.conn.execute(
            """SELECT COALESCE(SUM(duration_ms), 0) as total
               FROM viewport_events
               WHERE sequence_id = ? AND confidence = 'active'""",
            (sequence_id,),
        ).fetchone()
        return row["total"]
