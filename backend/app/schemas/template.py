from datetime import datetime
from pydantic import BaseModel

from .exercise import ExerciseRead


class TemplateExerciseRead(BaseModel):
    """Schema for reading template exercise junction with order."""
    id: int
    exercise_definition_id: int
    order: int
    exercise: ExerciseRead | None = None

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    """Schema for creating a new template."""
    split_id: int
    name: str
    order: int = 0


class TemplateRead(BaseModel):
    """Schema for reading template data with exercises."""
    id: int
    split_id: int
    name: str
    order: int
    created_at: datetime
    exercises: list[ExerciseRead] = []

    class Config:
        from_attributes = True


class TemplateReadBasic(BaseModel):
    """Schema for reading template data without exercises (for lists)."""
    id: int
    split_id: int
    name: str
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateUpdate(BaseModel):
    """Schema for updating a template."""
    name: str | None = None
    order: int | None = None


class TemplateAddExercise(BaseModel):
    """Schema for adding an exercise to a template."""
    exercise_definition_id: int
    order: int = 0


class TemplateReorderExercises(BaseModel):
    """Schema for reordering exercises in a template."""
    exercise_orders: list[dict[str, int]]  # [{"exercise_definition_id": 1, "order": 0}, ...]
