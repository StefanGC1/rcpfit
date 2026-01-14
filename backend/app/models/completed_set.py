from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .completed_session import CompletedSession
    from .exercise_definition import ExerciseDefinition


class CompletedSet(SQLModel, table=True):
    """
    Permanent record of each set performed.
    Epley score formula: weight * (1 + reps/30)
    """
    __tablename__ = "completed_sets"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="completed_sessions.id", index=True)
    exercise_definition_id: int = Field(foreign_key="exercise_definitions.id", index=True)
    set_number: int
    reps: int
    weight: float
    epley_score: float  # Calculated: weight * (1 + reps/30)

    # Relationships
    session: "CompletedSession" = Relationship(back_populates="completed_sets")
    exercise_definition: "ExerciseDefinition" = Relationship(back_populates="completed_sets")
