from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models import Split, Template, TemplateExercise
from app.schemas.split import SplitCreate, SplitRead, SplitReadBasic, SplitUpdate
from app.schemas.template import TemplateRead
from app.schemas.exercise import ExerciseRead

router = APIRouter()


@router.get("", response_model=list[SplitReadBasic])
async def list_splits(current_user: CurrentUser, session: DbSession) -> list[SplitReadBasic]:
    """
    List all splits for the current user.
    """
    result = await session.execute(
        select(Split)
        .where(Split.user_id == current_user.id)
        .order_by(Split.created_at.desc())
    )
    splits = result.scalars().all()
    return [SplitReadBasic.model_validate(s) for s in splits]


@router.post("", response_model=SplitReadBasic, status_code=status.HTTP_201_CREATED)
async def create_split(
    split_data: SplitCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> SplitReadBasic:
    """
    Create a new split for the current user.
    """
    new_split = Split(
        user_id=current_user.id,
        name=split_data.name,
        is_active=False,
    )
    session.add(new_split)
    await session.flush()
    await session.refresh(new_split)
    
    return SplitReadBasic.model_validate(new_split)


@router.get("/{split_id}", response_model=SplitRead)
async def get_split(
    split_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> SplitRead:
    """
    Get a specific split with its templates and their exercises.
    """
    result = await session.execute(
        select(Split)
        .options(
            selectinload(Split.templates).selectinload(
                Template.template_exercises
            ).selectinload(
                TemplateExercise.exercise_definition
            )
        )
        .where(Split.id == split_id, Split.user_id == current_user.id)
    )
    split = result.scalar_one_or_none()
    
    if not split:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Split not found",
        )
    
    # Build response with templates and their exercises
    templates = []
    for t in sorted(split.templates, key=lambda x: x.order):
        exercises = [
            ExerciseRead(
                id=te.exercise_definition.id,
                name=te.exercise_definition.name,
                created_at=te.exercise_definition.created_at,
            )
            for te in sorted(t.template_exercises, key=lambda x: x.order)
        ]
        templates.append(
            TemplateRead(
                id=t.id,
                split_id=t.split_id,
                name=t.name,
                order=t.order,
                created_at=t.created_at,
                exercises=exercises,
            )
        )
    
    return SplitRead(
        id=split.id,
        name=split.name,
        is_active=split.is_active,
        created_at=split.created_at,
        templates=templates,
    )


@router.put("/{split_id}", response_model=SplitReadBasic)
async def update_split(
    split_id: int,
    split_data: SplitUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> SplitReadBasic:
    """
    Update a split (name and/or active status).
    Setting is_active=True will deactivate all other splits.
    """
    result = await session.execute(
        select(Split).where(Split.id == split_id, Split.user_id == current_user.id)
    )
    split = result.scalar_one_or_none()
    
    if not split:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Split not found",
        )
    
    # Update fields if provided
    if split_data.name is not None:
        split.name = split_data.name
    
    if split_data.is_active is not None:
        if split_data.is_active:
            # Deactivate all other splits for this user
            result = await session.execute(
                select(Split).where(
                    Split.user_id == current_user.id,
                    Split.id != split_id,
                    Split.is_active == True,
                )
            )
            for other_split in result.scalars().all():
                other_split.is_active = False
        
        split.is_active = split_data.is_active
    
    await session.flush()
    await session.refresh(split)
    
    return SplitReadBasic.model_validate(split)


@router.delete("/{split_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_split(
    split_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    """
    Delete a split and all its templates (cascades).
    """
    result = await session.execute(
        select(Split).where(Split.id == split_id, Split.user_id == current_user.id)
    )
    split = result.scalar_one_or_none()
    
    if not split:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Split not found",
        )
    
    await session.delete(split)
