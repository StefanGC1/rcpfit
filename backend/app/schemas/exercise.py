from datetime import datetime
from pydantic import BaseModel


class ExerciseCreate(BaseModel):
    """Schema for creating a new exercise definition."""
    name: str


class ExerciseRead(BaseModel):
    """Schema for reading exercise definition data."""
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class ExerciseUpdate(BaseModel):
    """Schema for updating an exercise definition."""
    name: str
