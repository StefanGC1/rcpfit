from datetime import datetime
from pydantic import BaseModel, Field


class SetData(BaseModel):
    """Schema for a single set within an exercise."""
    reps: int | None = None
    weight: float | None = None
    completed: bool = False


class ExerciseData(BaseModel):
    """Schema for an exercise within a workout session."""
    definition_id: int
    name: str
    sets: list[SetData] = Field(default_factory=list)
    is_done: bool = False


class SessionData(BaseModel):
    """Schema for the entire workout session data stored in JSONB."""
    exercises: list[ExerciseData] = Field(default_factory=list)


class WorkoutStartRequest(BaseModel):
    """Schema for starting a new workout."""
    template_id: int | None = None


class WorkoutDraftRead(BaseModel):
    """Schema for reading a workout draft."""
    id: int
    template_id: int | None
    session_data: SessionData
    started_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkoutDraftUpdate(BaseModel):
    """Schema for updating a workout draft's session data."""
    session_data: SessionData


class AddExerciseRequest(BaseModel):
    """Schema for adding an ad-hoc exercise to the current draft."""
    exercise_definition_id: int


class CompletedSetRead(BaseModel):
    """Schema for reading a completed set."""
    id: int
    exercise_definition_id: int
    set_number: int
    reps: int
    weight: float
    epley_score: float

    class Config:
        from_attributes = True


class CompletedSessionRead(BaseModel):
    """Schema for reading a completed session."""
    id: int
    template_id: int | None
    started_at: datetime
    completed_at: datetime
    session_score: float
    completed_sets: list[CompletedSetRead] = []

    class Config:
        from_attributes = True


class CompletedSessionBasic(BaseModel):
    """Schema for reading a completed session without sets (for lists)."""
    id: int
    template_id: int | None
    template_name: str | None = None
    started_at: datetime
    completed_at: datetime
    session_score: float

    class Config:
        from_attributes = True
