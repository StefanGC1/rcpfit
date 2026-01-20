from datetime import datetime
from pydantic import BaseModel


class SessionAnalytics(BaseModel):
    """Schema for session analytics data (for charts/lists)."""
    id: int
    template_id: int | None
    template_name: str | None
    started_at: datetime
    completed_at: datetime
    session_score: float

    class Config:
        from_attributes = True


class SetAnalytics(BaseModel):
    """Schema for a single set within exercise history."""
    set_number: int
    reps: int
    weight: float
    epley_score: float

    class Config:
        from_attributes = True


class ExerciseSessionHistory(BaseModel):
    """Schema for exercise history on a specific session date."""
    session_id: int
    date: datetime
    total_score: float
    sets: list[SetAnalytics]

    class Config:
        from_attributes = True


class ExerciseSummary(BaseModel):
    """Schema for exercise summary statistics."""
    exercise_id: int
    exercise_name: str
    total_sessions: int
    total_sets: int
    total_volume: float  # Sum of (weight * reps) across all sets
    best_set_weight: float
    best_set_reps: int
    best_set_epley_score: float
    average_session_score: float
    last_performed: datetime | None

    class Config:
        from_attributes = True


class SessionSetDetail(BaseModel):
    """Schema for a completed set with exercise name."""
    id: int
    exercise_definition_id: int
    exercise_name: str
    set_number: int
    reps: int
    weight: float
    epley_score: float

    class Config:
        from_attributes = True


class SessionDetail(BaseModel):
    """Schema for a completed session with full set details."""
    id: int
    template_id: int | None
    template_name: str | None
    started_at: datetime
    completed_at: datetime
    session_score: float
    sets: list[SessionSetDetail]

    class Config:
        from_attributes = True
