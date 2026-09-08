"""Persistence operations. This module owns all SQL used by the application."""

from __future__ import annotations

import sqlite3
from typing import Any

from .database import utc_now


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


class InvalidAssociationError(Exception):
    pass


def _record(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def _one(connection: sqlite3.Connection, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    return _record(connection.execute(query, params).fetchone())


def _must_exist(connection: sqlite3.Connection, table: str, resource_id: int) -> None:
    if _one(connection, f"SELECT id FROM {table} WHERE id = ?", (resource_id,)) is None:
        raise NotFoundError(f"{table[:-1]} {resource_id} was not found")


def list_catalog(connection: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    return [dict(row) for row in connection.execute(f"SELECT * FROM {table} ORDER BY name, id")]


def get_catalog(connection: sqlite3.Connection, table: str, resource_id: int) -> dict[str, Any]:
    record = _one(connection, f"SELECT * FROM {table} WHERE id = ?", (resource_id,))
    if record is None:
        raise NotFoundError(f"{table[:-1]} {resource_id} was not found")
    return record


def create_catalog(connection: sqlite3.Connection, table: str, name: str) -> dict[str, Any]:
    timestamp = utc_now()
    try:
        cursor = connection.execute(
            f"INSERT INTO {table} (name, created_at, updated_at) VALUES (?, ?, ?)", (name, timestamp, timestamp)
        )
    except sqlite3.IntegrityError as error:
        raise ConflictError(f"an {table[:-1]} with that name already exists") from error
    return get_catalog(connection, table, cursor.lastrowid)


def update_catalog(connection: sqlite3.Connection, table: str, resource_id: int, name: str) -> dict[str, Any]:
    _must_exist(connection, table, resource_id)
    try:
        connection.execute("UPDATE " + table + " SET name = ?, updated_at = ? WHERE id = ?", (name, utc_now(), resource_id))
    except sqlite3.IntegrityError as error:
        raise ConflictError(f"an {table[:-1]} with that name already exists") from error
    return get_catalog(connection, table, resource_id)


def delete_catalog(connection: sqlite3.Connection, table: str, resource_id: int) -> dict[str, Any]:
    record = get_catalog(connection, table, resource_id)
    connection.execute(f"DELETE FROM {table} WHERE id = ?", (resource_id,))
    return record


PROJECT_SELECT = """
SELECT p.*, a.name AS application_name, c.name AS company_name
FROM content_projects AS p
LEFT JOIN applications AS a ON a.id = p.application_id
LEFT JOIN companies AS c ON c.id = p.company_id
"""


def _project(connection: sqlite3.Connection, project_id: int) -> dict[str, Any]:
    record = _one(connection, PROJECT_SELECT + " WHERE p.id = ?", (project_id,))
    if record is None:
        raise NotFoundError(f"project {project_id} was not found")
    return record


def _validate_associations(connection: sqlite3.Connection, application_id: int | None, company_id: int | None) -> None:
    if application_id is not None:
        if _one(connection, "SELECT id FROM applications WHERE id = ?", (application_id,)) is None:
            raise InvalidAssociationError(f"application {application_id} was not found")
    if company_id is not None:
        if _one(connection, "SELECT id FROM companies WHERE id = ?", (company_id,)) is None:
            raise InvalidAssociationError(f"company {company_id} was not found")


def list_projects(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    return [dict(row) for row in connection.execute(PROJECT_SELECT + " ORDER BY p.updated_at DESC, p.id DESC")]


def project_detail(connection: sqlite3.Connection, project_id: int) -> dict[str, Any]:
    project = _project(connection, project_id)
    project["draft"] = _one(connection, "SELECT * FROM drafts WHERE content_project_id = ?", (project_id,))
    return project


def create_project(connection: sqlite3.Connection, title: str, description: str, application_id: int | None, company_id: int | None) -> dict[str, Any]:
    _validate_associations(connection, application_id, company_id)
    timestamp = utc_now()
    cursor = connection.execute(
        "INSERT INTO content_projects (title, description, application_id, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (title, description, application_id, company_id, timestamp, timestamp),
    )
    return project_detail(connection, cursor.lastrowid)


def update_project(connection: sqlite3.Connection, project_id: int, title: str, description: str, application_id: int | None, company_id: int | None) -> dict[str, Any]:
    _project(connection, project_id)
    _validate_associations(connection, application_id, company_id)
    connection.execute(
        "UPDATE content_projects SET title = ?, description = ?, application_id = ?, company_id = ?, updated_at = ? WHERE id = ?",
        (title, description, application_id, company_id, utc_now(), project_id),
    )
    return project_detail(connection, project_id)


def delete_project(connection: sqlite3.Connection, project_id: int) -> dict[str, Any]:
    project = _project(connection, project_id)
    connection.execute("DELETE FROM content_projects WHERE id = ?", (project_id,))
    return project


def upsert_draft(connection: sqlite3.Connection, project_id: int, draft_type: str, body: str) -> dict[str, Any]:
    _project(connection, project_id)
    timestamp = utc_now()
    connection.execute(
        """INSERT INTO drafts (content_project_id, draft_type, body, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(content_project_id) DO UPDATE SET
             draft_type = excluded.draft_type, body = excluded.body, updated_at = excluded.updated_at""",
        (project_id, draft_type, body, timestamp, timestamp),
    )
    draft = _one(connection, "SELECT * FROM drafts WHERE content_project_id = ?", (project_id,))
    assert draft is not None
    return draft
