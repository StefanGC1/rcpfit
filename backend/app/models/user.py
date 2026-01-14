from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .split import Split
    from .exercise_definition import ExerciseDefinition
    from .workout_draft import WorkoutDraft
    from .completed_session import CompletedSession


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    splits: list["Split"] = Relationship(back_populates="user")
    exercise_definitions: list["ExerciseDefinition"] = Relationship(back_populates="user")
    workout_draft: Optional["WorkoutDraft"] = Relationship(back_populates="user")
    completed_sessions: list["CompletedSession"] = Relationship(back_populates="user")
