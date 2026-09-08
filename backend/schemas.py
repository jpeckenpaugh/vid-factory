"""Public API request and response models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CatalogWrite(APIModel):
    name: str

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class ProjectWrite(APIModel):
    title: str
    description: str = ""
    application_id: int | None = None
    company_id: int | None = None

    @field_validator("title")
    @classmethod
    def nonblank_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class DraftWrite(APIModel):
    draft_type: Literal["script", "prompt"]
    body: str

    @field_validator("body")
    @classmethod
    def nonblank_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("body must not be blank")
        return value
