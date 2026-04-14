"""Session and sequence management.

Handles session lifecycle, mainline reconstruction, and mock content seeding.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from backend.storage.database import Database

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = PROJECT_ROOT / "docs"


def get_or_create_session(db: Database, title: str | None = None) -> str:
    """Return the most recent session, or create one."""
    sessions = db.list_sessions()
    if sessions:
        return sessions[0]["id"]
    return db.create_session(title=title)


def get_mainline(db: Database, session_id: str) -> list[dict[str, Any]]:
    """Reconstruct the mainline conversation: sequences in order, with tokens.

    Returns a list of dicts with keys: sequence_id, role, tokens.
    Only root sequences (no parent) with active/kept status, ordered by created_at.
    """
    sequences = db.get_session_sequences(session_id)
    # Filter to mainline: root sequences only (branches have parent_sequence_id)
    mainline = [s for s in sequences if s["parent_sequence_id"] is None]

    result = []
    for seq in mainline:
        tokens = db.get_sequence_tokens(seq["id"])
        result.append({
            "sequence_id": seq["id"],
            "role": seq["role"],
            "status": seq["status"],
            "tokens": tokens,
        })
    return result


# -- Mock content seeding --

# Transitional prompts interspersed between doc sections (mirrors frontend/src/mock.ts)
SECTION_PROMPTS = [
    "So how does the rendering actually work?",
    "What makes the pull mechanic different?",
    "Where does this go beyond chat?",
    "What am I actually experiencing right now?",
    "What comes next?",
    "OK, go deeper. What's the core premise?",
    "What are the design principles behind this?",
    "Walk me through the layers.",
    "What about when reader and text start influencing each other?",
    "How is this built?",
    "How does the streaming protocol work?",
    "What does the storage layer look like?",
    "And the data flow?",
    "What are the hard constraints?",
    "Tell me about the oscillator analogy.",
    "How does game theory fit in?",
    "What about modelling the reader?",
    "And memetic acceleration?",
    "What are the honest unknowns?",
    "What does existing research say about attention instrumentation?",
    "What about token-level annotation tools?",
    "How should streaming overlays work?",
    "What rendering approach makes sense?",
]


def _doc_to_paragraphs(raw: str) -> list[str]:
    """Split a markdown document into paragraphs, mirroring frontend logic."""
    paragraphs = re.split(r"\n\n+", raw)
    result = []
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        # Skip the top-level title and horizontal rules
        if p.startswith("# ") and not p.startswith("## "):
            continue
        if p == "---":
            continue
        result.append(p)
    return result


def _tokenize_simple(text: str) -> list[dict[str, Any]]:
    """Split text into word-level tokens with positions. No metadata (static content)."""
    # Split on whitespace boundaries, preserving the whitespace as part of subsequent tokens
    parts = re.split(r"(?<=\S)(?=\s)|\b", text)
    tokens = []
    pos = 0
    for part in parts:
        if part:
            tokens.append({"position": pos, "text": part})
            pos += 1
    return tokens


def seed_demo_session(db: Database) -> str:
    """Create a session populated with the project docs as mock conversation.

    Returns the session ID. Mirrors the structure from frontend/src/mock.ts:
    doc paragraphs become assistant sequences, section prompts are user sequences.
    """
    session_id = db.create_session(title="Liminal — Demo")

    doc_files = [
        PROJECT_ROOT / "README.md",
        DOCS_DIR / "ai-layers.md",
        DOCS_DIR / "architecture.md",
        DOCS_DIR / "theory.md",
        DOCS_DIR / "research" / "attention-instrumentation.md",
        DOCS_DIR / "research" / "token-annotation-systems.md",
    ]

    all_paragraphs: list[str] = []
    for doc_path in doc_files:
        if doc_path.exists():
            all_paragraphs.extend(_doc_to_paragraphs(doc_path.read_text()))

    prompt_index = 0

    for para in all_paragraphs:
        # Insert a user turn before each heading
        if para.startswith("## ") and prompt_index < len(SECTION_PROMPTS):
            seq_id = db.create_sequence(session_id, role="user", status="kept")
            prompt_text = SECTION_PROMPTS[prompt_index]
            db.insert_tokens_bulk(seq_id, [{"position": 0, "text": prompt_text}])
            prompt_index += 1

        # Assistant turn: the paragraph content
        seq_id = db.create_sequence(session_id, role="assistant", status="kept")
        tokens = _tokenize_simple(para)
        if tokens:
            db.insert_tokens_bulk(seq_id, tokens)

    return session_id


def ensure_demo_session(db: Database) -> str:
    """Return the demo session ID, creating and seeding if it doesn't exist."""
    sessions = db.list_sessions()
    for s in sessions:
        if s["title"] == "Liminal — Demo":
            return s["id"]
    return seed_demo_session(db)
