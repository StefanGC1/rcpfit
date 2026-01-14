from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .user import User
    from .template import Template


class Split(SQLModel, table=True):
    __tablename__ = "splits"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    is_active: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="splits")
    templates: list["Template"] = Relationship(back_populates="split", cascade_delete=True)
