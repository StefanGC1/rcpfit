from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .user import User
    from .template import Template
    from .completed_set import CompletedSet


class CompletedSession(SQLModel, table=True):
    __tablename__ = "completed_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    template_id: Optional[int] = Field(default=None, foreign_key="templates.id")
    started_at: datetime
    completed_at: datetime = Field(default_factory=datetime.utcnow)
    session_score: float = Field(default=0.0)  # Sum of all Epley scores

    # Relationships
    user: "User" = Relationship(back_populates="completed_sessions")
    template: Optional["Template"] = Relationship(back_populates="completed_sessions")
    completed_sets: list["CompletedSet"] = Relationship(
        back_populates="session", cascade_delete=True
    )
