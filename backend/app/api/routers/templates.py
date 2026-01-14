from fastapi import APIRouter, HTTPException, status, Query
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models import Template, Split, TemplateExercise, ExerciseDefinition
from app.schemas.template import (
    TemplateCreate,
    TemplateRead,
    TemplateReadBasic,
    TemplateUpdate,
    TemplateAddExercise,
    TemplateReorderExercises,
)
from app.schemas.exercise import ExerciseRead

router = APIRouter()


@router.get("", response_model=list[TemplateReadBasic])
async def list_templates(
    current_user: CurrentUser,
    session: DbSession,
    split_id: int | None = Query(default=None, description="Filter by split ID"),
) -> list[TemplateReadBasic]:
    """
    List all templates for the current user, optionally filtered by split_id.
    """
    query = (
        select(Template)
        .join(Split)
        .where(Split.user_id == current_user.id)
        .order_by(Template.order)
    )
    
    if split_id is not None:
        query = query.where(Template.split_id == split_id)
    
    result = await session.execute(query)
    templates = result.scalars().all()
    return [TemplateReadBasic.model_validate(t) for t in templates]


@router.post("", response_model=TemplateReadBasic, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> TemplateReadBasic:
    """
    Create a new template within a split.
    """
    # Verify split belongs to user
    result = await session.execute(
        select(Split).where(
            Split.id == template_data.split_id,
            Split.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Split not found",
        )
    
    new_template = Template(
        split_id=template_data.split_id,
        name=template_data.name,
        order=template_data.order,
    )
    session.add(new_template)
    await session.flush()
    await session.refresh(new_template)
    
    return TemplateReadBasic.model_validate(new_template)


@router.get("/{template_id}", response_model=TemplateRead)
async def get_template(
    template_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> TemplateRead:
    """
    Get a specific template with its exercises.
    """
    result = await session.execute(
        select(Template)
        .options(
            selectinload(Template.template_exercises).selectinload(
                TemplateExercise.exercise_definition
            )
        )
        .join(Split)
        .where(Template.id == template_id, Split.user_id == current_user.id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Build exercises list from junction table
    exercises = [
        ExerciseRead(
            id=te.exercise_definition.id,
            name=te.exercise_definition.name,
            created_at=te.exercise_definition.created_at,
        )
        for te in sorted(template.template_exercises, key=lambda x: x.order)
    ]
    
    return TemplateRead(
        id=template.id,
        split_id=template.split_id,
        name=template.name,
        order=template.order,
        created_at=template.created_at,
        exercises=exercises,
    )


@router.put("/{template_id}", response_model=TemplateReadBasic)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> TemplateReadBasic:
    """
    Update a template (name and/or order).
    """
    result = await session.execute(
        select(Template)
        .join(Split)
        .where(Template.id == template_id, Split.user_id == current_user.id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    if template_data.name is not None:
        template.name = template_data.name
    if template_data.order is not None:
        template.order = template_data.order
    
    await session.flush()
    await session.refresh(template)
    
    return TemplateReadBasic.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    """
    Delete a template and its exercise associations.
    """
    result = await session.execute(
        select(Template)
        .join(Split)
        .where(Template.id == template_id, Split.user_id == current_user.id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    await session.delete(template)


@router.post("/{template_id}/exercises", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def add_exercise_to_template(
    template_id: int,
    exercise_data: TemplateAddExercise,
    current_user: CurrentUser,
    session: DbSession,
) -> TemplateRead:
    """
    Add an exercise to a template.
    """
    # Verify template belongs to user
    result = await session.execute(
        select(Template)
        .join(Split)
        .where(Template.id == template_id, Split.user_id == current_user.id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Verify exercise belongs to user
    result = await session.execute(
        select(ExerciseDefinition).where(
            ExerciseDefinition.id == exercise_data.exercise_definition_id,
            ExerciseDefinition.user_id == current_user.id,
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    # Check if exercise already in template
    result = await session.execute(
        select(TemplateExercise).where(
            TemplateExercise.template_id == template_id,
            TemplateExercise.exercise_definition_id == exercise_data.exercise_definition_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise already in template",
        )
    
    # Add exercise to template
    template_exercise = TemplateExercise(
        template_id=template_id,
        exercise_definition_id=exercise_data.exercise_definition_id,
        order=exercise_data.order,
    )
    session.add(template_exercise)
    await session.flush()
    
    # Return updated template
    return await get_template(template_id, current_user, session)


@router.delete("/{template_id}/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_from_template(
    template_id: int,
    exercise_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    """
    Remove an exercise from a template.
    """
    # Verify template belongs to user
    result = await session.execute(
        select(Template)
        .join(Split)
        .where(Template.id == template_id, Split.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Find and delete the junction
    result = await session.execute(
        select(TemplateExercise).where(
            TemplateExercise.template_id == template_id,
            TemplateExercise.exercise_definition_id == exercise_id,
        )
    )
    template_exercise = result.scalar_one_or_none()
    
    if not template_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not in template",
        )
    
    await session.delete(template_exercise)


@router.put("/{template_id}/exercises/reorder", response_model=TemplateRead)
async def reorder_template_exercises(
    template_id: int,
    reorder_data: TemplateReorderExercises,
    current_user: CurrentUser,
    session: DbSession,
) -> TemplateRead:
    """
    Reorder exercises within a template.
    Expects a list of {exercise_definition_id, order} objects.
    """
    # Verify template belongs to user
    result = await session.execute(
        select(Template)
        .join(Split)
        .where(Template.id == template_id, Split.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Update orders
    for item in reorder_data.exercise_orders:
        result = await session.execute(
            select(TemplateExercise).where(
                TemplateExercise.template_id == template_id,
                TemplateExercise.exercise_definition_id == item["exercise_definition_id"],
            )
        )
        template_exercise = result.scalar_one_or_none()
        if template_exercise:
            template_exercise.order = item["order"]
    
    await session.flush()
    
    # Return updated template
    return await get_template(template_id, current_user, session)
