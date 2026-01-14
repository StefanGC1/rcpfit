from datetime import datetime
from pydantic import BaseModel

from .template import TemplateRead


class SplitCreate(BaseModel):
    """Schema for creating a new split."""
    name: str


class SplitRead(BaseModel):
    """Schema for reading split data with templates."""
    id: int
    name: str
    is_active: bool
    created_at: datetime
    templates: list["TemplateRead"] = []

    class Config:
        from_attributes = True


class SplitReadBasic(BaseModel):
    """Schema for reading split data without templates (for lists)."""
    id: int
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SplitUpdate(BaseModel):
    """Schema for updating a split."""
    name: str | None = None
    is_active: bool | None = None
