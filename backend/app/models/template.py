from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .split import Split
    from .template_exercise import TemplateExercise
    from .workout_draft import WorkoutDraft
    from .completed_session import CompletedSession


class Template(SQLModel, table=True):
    __tablename__ = "templates"

    id: Optional[int] = Field(default=None, primary_key=True)
    split_id: int = Field(foreign_key="splits.id", index=True)
    name: str
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    split: "Split" = Relationship(back_populates="templates")
    template_exercises: list["TemplateExercise"] = Relationship(
        back_populates="template", cascade_delete=True
    )
    workout_drafts: list["WorkoutDraft"] = Relationship(back_populates="template")
    completed_sessions: list["CompletedSession"] = Relationship(back_populates="template")
