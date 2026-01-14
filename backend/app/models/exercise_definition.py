from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint

if TYPE_CHECKING:
    from .user import User
    from .template_exercise import TemplateExercise
    from .completed_set import CompletedSet


class ExerciseDefinition(SQLModel, table=True):
    __tablename__ = "exercise_definitions"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_exercise_name"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="exercise_definitions")
    template_exercises: list["TemplateExercise"] = Relationship(back_populates="exercise_definition")
    completed_sets: list["CompletedSet"] = Relationship(back_populates="exercise_definition")
