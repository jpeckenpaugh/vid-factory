"""SQLite connection, schema, and deterministic seed-data setup."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "data" / "vid_factory.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_projects (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY,
  content_project_id INTEGER NOT NULL UNIQUE
    REFERENCES content_projects(id) ON DELETE CASCADE,
  draft_type TEXT NOT NULL CHECK (draft_type IN ('script', 'prompt')),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_projects_application_id
  ON content_projects(application_id);
CREATE INDEX IF NOT EXISTS idx_content_projects_company_id
  ON content_projects(company_id);
"""

# Backend-authored defaults; names are intentionally not part of the public API.
APPLICATION_SEEDS = ("YouTube", "TikTok", "Instagram")
COMPANY_SEEDS = ("Acme Studio", "Northstar Media", "Pine & Peak")


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect() as connection:
        connection.executescript(SCHEMA)
        timestamp = utc_now()
        connection.executemany(
            "INSERT OR IGNORE INTO applications (name, created_at, updated_at) VALUES (?, ?, ?)",
            [(name, timestamp, timestamp) for name in APPLICATION_SEEDS],
        )
        connection.executemany(
            "INSERT OR IGNORE INTO companies (name, created_at, updated_at) VALUES (?, ?, ?)",
            [(name, timestamp, timestamp) for name in COMPANY_SEEDS],
        )


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    database = connect()
    try:
        yield database
        database.commit()
    except Exception:
        database.rollback()
        raise
    finally:
        database.close()
