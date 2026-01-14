from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .template import Template
    from .exercise_definition import ExerciseDefinition


class TemplateExercise(SQLModel, table=True):
    __tablename__ = "template_exercises"

    id: Optional[int] = Field(default=None, primary_key=True)
    template_id: int = Field(foreign_key="templates.id", index=True)
    exercise_definition_id: int = Field(foreign_key="exercise_definitions.id", index=True)
    order: int = Field(default=0)

    # Relationships
    template: "Template" = Relationship(back_populates="template_exercises")
    exercise_definition: "ExerciseDefinition" = Relationship(back_populates="template_exercises")
