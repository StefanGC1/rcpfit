from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import DbSession, CurrentUser
from app.models import ExerciseDefinition
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate

router = APIRouter()


@router.get("", response_model=list[ExerciseRead])
async def list_exercises(current_user: CurrentUser, session: DbSession) -> list[ExerciseRead]:
    """
    List all exercise definitions for the current user.
    """
    result = await session.execute(
        select(ExerciseDefinition)
        .where(ExerciseDefinition.user_id == current_user.id)
        .order_by(ExerciseDefinition.name)
    )
    exercises = result.scalars().all()
    return [ExerciseRead.model_validate(e) for e in exercises]


@router.post("", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    exercise_data: ExerciseCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> ExerciseRead:
    """
    Create a new exercise definition for the current user.
    """
    # Check for duplicate name
    result = await session.execute(
        select(ExerciseDefinition).where(
            ExerciseDefinition.user_id == current_user.id,
            ExerciseDefinition.name == exercise_data.name,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise with this name already exists",
        )
    
    # Create exercise
    new_exercise = ExerciseDefinition(
        user_id=current_user.id,
        name=exercise_data.name,
    )
    session.add(new_exercise)
    await session.flush()
    await session.refresh(new_exercise)
    
    return ExerciseRead.model_validate(new_exercise)


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(
    exercise_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> ExerciseRead:
    """
    Get a specific exercise definition by ID.
    """
    result = await session.execute(
        select(ExerciseDefinition).where(
            ExerciseDefinition.id == exercise_id,
            ExerciseDefinition.user_id == current_user.id,
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    return ExerciseRead.model_validate(exercise)


@router.put("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> ExerciseRead:
    """
    Update (rename) an exercise definition.
    """
    result = await session.execute(
        select(ExerciseDefinition).where(
            ExerciseDefinition.id == exercise_id,
            ExerciseDefinition.user_id == current_user.id,
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    # Check for duplicate name (if renaming)
    if exercise_data.name != exercise.name:
        result = await session.execute(
            select(ExerciseDefinition).where(
                ExerciseDefinition.user_id == current_user.id,
                ExerciseDefinition.name == exercise_data.name,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exercise with this name already exists",
            )
    
    exercise.name = exercise_data.name
    await session.flush()
    await session.refresh(exercise)
    
    return ExerciseRead.model_validate(exercise)


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    """
    Delete an exercise definition.
    Note: This will fail if the exercise has completed sets (foreign key constraint).
    Consider soft delete in production.
    """
    result = await session.execute(
        select(ExerciseDefinition).where(
            ExerciseDefinition.id == exercise_id,
            ExerciseDefinition.user_id == current_user.id,
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    await session.delete(exercise)
