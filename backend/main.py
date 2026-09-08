"""FastAPI entry point and HTTP error mapping."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Callable

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import repositories
from .database import connection, initialize_database
from .schemas import CatalogWrite, DraftWrite, ProjectWrite


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Video Content Factory API", lifespan=lifespan)
FRONTEND_PATH = Path(__file__).parent.parent / "frontend"
if FRONTEND_PATH.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_PATH), name="static")


def _call(operation: Callable[..., Any], *args: Any) -> Any:
    try:
        with connection() as database:
            return operation(database, *args)
    except repositories.NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except repositories.ConflictError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except repositories.InvalidAssociationError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error


def _catalog_routes(prefix: str, table: str) -> None:
    @app.get(prefix)
    def list_resources() -> list[dict[str, Any]]:
        return _call(repositories.list_catalog, table)

    @app.post(prefix, status_code=status.HTTP_201_CREATED)
    def create_resource(payload: CatalogWrite) -> dict[str, Any]:
        return _call(repositories.create_catalog, table, payload.name)

    @app.get(prefix + "/{resource_id}")
    def get_resource(resource_id: int) -> dict[str, Any]:
        return _call(repositories.get_catalog, table, resource_id)

    @app.put(prefix + "/{resource_id}")
    def update_resource(resource_id: int, payload: CatalogWrite) -> dict[str, Any]:
        return _call(repositories.update_catalog, table, resource_id, payload.name)

    @app.delete(prefix + "/{resource_id}")
    def delete_resource(resource_id: int) -> dict[str, Any]:
        return _call(repositories.delete_catalog, table, resource_id)


_catalog_routes("/api/applications", "applications")
_catalog_routes("/api/companies", "companies")


@app.get("/api/projects")
def list_projects() -> list[dict[str, Any]]:
    return _call(repositories.list_projects)


@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectWrite) -> dict[str, Any]:
    return _call(repositories.create_project, payload.title, payload.description, payload.application_id, payload.company_id)


@app.get("/api/projects/{project_id}")
def get_project(project_id: int) -> dict[str, Any]:
    return _call(repositories.project_detail, project_id)


@app.put("/api/projects/{project_id}")
def update_project(project_id: int, payload: ProjectWrite) -> dict[str, Any]:
    return _call(repositories.update_project, project_id, payload.title, payload.description, payload.application_id, payload.company_id)


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int) -> dict[str, Any]:
    return _call(repositories.delete_project, project_id)


@app.put("/api/projects/{project_id}/draft")
def save_draft(project_id: int, payload: DraftWrite) -> dict[str, Any]:
    return _call(repositories.upsert_draft, project_id, payload.draft_type, payload.body)


@app.get("/", include_in_schema=False)
def frontend() -> Response:
    index = FRONTEND_PATH / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="frontend is not available yet")
