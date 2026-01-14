from datetime import datetime
from typing import TYPE_CHECKING, Optional, Any
from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB

if TYPE_CHECKING:
    from .user import User
    from .template import Template


class WorkoutDraft(SQLModel, table=True):
    """
    Stores the in-progress workout session as a JSONB blob.
    
    session_data schema:
    {
        "exercises": [
            {
                "definition_id": int,
                "name": str,
                "sets": [
                    {"reps": int | null, "weight": float | null, "completed": bool}
                ],
                "is_done": bool
            }
        ]
    }
    """
    __tablename__ = "workout_drafts"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)  # One draft per user
    template_id: Optional[int] = Field(default=None, foreign_key="templates.id")
    session_data: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="workout_draft")
    template: Optional["Template"] = Relationship(back_populates="workout_drafts")
