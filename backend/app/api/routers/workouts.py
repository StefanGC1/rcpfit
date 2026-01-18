from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models import (
    WorkoutDraft,
    Template,
    TemplateExercise,
    ExerciseDefinition,
    CompletedSession,
    CompletedSet,
)
from app.schemas.workout import (
    WorkoutStartRequest,
    WorkoutDraftRead,
    WorkoutDraftUpdate,
    AddExerciseRequest,
    CompletedSessionRead,
    CompletedSetRead,
    SessionData,
    ExerciseData,
    SetData,
)

router = APIRouter()


@router.post("/start", response_model=WorkoutDraftRead, status_code=status.HTTP_201_CREATED)
async def start_workout(
    request: WorkoutStartRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> WorkoutDraftRead:
    """
    Start a new workout session.
    
    If template_id is provided, copies exercises from the template into session_data.
    Only one draft per user is allowed - if one exists, return it (handles race conditions).
    """
    # Check if user already has a draft
    result = await session.execute(
        select(WorkoutDraft).where(WorkoutDraft.user_id == current_user.id)
    )
    existing_draft = result.scalar_one_or_none()
    
    # If a draft already exists, return it instead of erroring
    # This handles race conditions from concurrent requests gracefully
    if existing_draft:
        return WorkoutDraftRead(
            id=existing_draft.id,
            template_id=existing_draft.template_id,
            session_data=SessionData.model_validate(existing_draft.session_data),
            started_at=existing_draft.started_at,
            updated_at=existing_draft.updated_at,
        )
    
    # Initialize session data
    exercises_data: list[ExerciseData] = []
    
    # If template_id provided, copy exercises from template
    if request.template_id is not None:
        # Verify template exists and belongs to user (via split)
        result = await session.execute(
            select(Template)
            .options(
                selectinload(Template.template_exercises).selectinload(
                    TemplateExercise.exercise_definition
                )
            )
            .join(Template.split)
            .where(
                Template.id == request.template_id,
                Template.split.has(user_id=current_user.id),
            )
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found",
            )
        
        # Copy exercises from template in order
        for te in sorted(template.template_exercises, key=lambda x: x.order):
            exercise_data = ExerciseData(
                definition_id=te.exercise_definition.id,
                name=te.exercise_definition.name,
                sets=[SetData()],  # Start with one empty set
                is_done=False,
            )
            exercises_data.append(exercise_data)
    
    # Create the draft
    session_data = SessionData(exercises=exercises_data)
    now = datetime.utcnow()
    
    new_draft = WorkoutDraft(
        user_id=current_user.id,
        template_id=request.template_id,
        session_data=session_data.model_dump(),
        started_at=now,
        updated_at=now,
    )
    
    session.add(new_draft)
    await session.flush()
    await session.refresh(new_draft)
    
    return WorkoutDraftRead(
        id=new_draft.id,
        template_id=new_draft.template_id,
        session_data=SessionData.model_validate(new_draft.session_data),
        started_at=new_draft.started_at,
        updated_at=new_draft.updated_at,
    )


@router.get("/draft", response_model=WorkoutDraftRead)
async def get_draft(
    current_user: CurrentUser,
    session: DbSession,
) -> WorkoutDraftRead:
    """
    Get the current user's active workout draft.
    Returns 404 if no draft exists.
    """
    result = await session.execute(
        select(WorkoutDraft).where(WorkoutDraft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout draft",
        )
    
    return WorkoutDraftRead(
        id=draft.id,
        template_id=draft.template_id,
        session_data=SessionData.model_validate(draft.session_data),
        started_at=draft.started_at,
        updated_at=draft.updated_at,
    )


@router.put("/draft", response_model=WorkoutDraftRead)
async def update_draft(
    draft_data: WorkoutDraftUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> WorkoutDraftRead:
    """
    Update the current user's workout draft session data.
    This is called to persist set data (reps, weight, completed status).
    """
    result = await session.execute(
        select(WorkoutDraft).where(WorkoutDraft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout draft",
        )
    
    # Update session data and timestamp
    draft.session_data = draft_data.session_data.model_dump()
    draft.updated_at = datetime.utcnow()
    
    await session.flush()
    await session.refresh(draft)
    
    return WorkoutDraftRead(
        id=draft.id,
        template_id=draft.template_id,
        session_data=SessionData.model_validate(draft.session_data),
        started_at=draft.started_at,
        updated_at=draft.updated_at,
    )


@router.post("/draft/add-exercise", response_model=WorkoutDraftRead)
async def add_exercise_to_draft(
    request: AddExerciseRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> WorkoutDraftRead:
    """
    Add an ad-hoc exercise to the current workout draft.
    The exercise is appended to the end of the exercises list.
    """
    # Get the draft
    result = await session.execute(
        select(WorkoutDraft).where(WorkoutDraft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout draft",
        )
    
    # Verify exercise belongs to user
    result = await session.execute(
        select(ExerciseDefinition).where(
            ExerciseDefinition.id == request.exercise_definition_id,
            ExerciseDefinition.user_id == current_user.id,
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    # Parse current session data
    session_data = SessionData.model_validate(draft.session_data)
    
    # Check if exercise already exists in the draft
    for ex in session_data.exercises:
        if ex.definition_id == exercise.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exercise already in workout",
            )
    
    # Add the new exercise
    new_exercise = ExerciseData(
        definition_id=exercise.id,
        name=exercise.name,
        sets=[SetData()],  # Start with one empty set
        is_done=False,
    )
    session_data.exercises.append(new_exercise)
    
    # Update draft
    draft.session_data = session_data.model_dump()
    draft.updated_at = datetime.utcnow()
    
    await session.flush()
    await session.refresh(draft)
    
    return WorkoutDraftRead(
        id=draft.id,
        template_id=draft.template_id,
        session_data=SessionData.model_validate(draft.session_data),
        started_at=draft.started_at,
        updated_at=draft.updated_at,
    )


@router.post("/finish", response_model=CompletedSessionRead)
async def finish_workout(
    current_user: CurrentUser,
    session: DbSession,
) -> CompletedSessionRead:
    """
    Finalize the current workout.
    
    This will:
    1. Read the draft's session_data
    2. Calculate Epley score for each valid set: weight * (1 + reps/30)
    3. Sum all set scores to get session_score
    4. Insert CompletedSession row
    5. Insert CompletedSet rows for each valid set (reps > 0, weight > 0)
    6. Delete the WorkoutDraft row
    
    Returns the completed session.
    """
    # Get the draft
    result = await session.execute(
        select(WorkoutDraft).where(WorkoutDraft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout draft",
        )
    
    # Parse session data
    session_data = SessionData.model_validate(draft.session_data)
    
    # Collect all valid sets and calculate scores
    completed_sets_data: list[dict] = []
    total_session_score = 0.0
    
    for exercise in session_data.exercises:
        set_number = 0
        for set_data in exercise.sets:
            # Only count valid sets (with reps > 0 and weight > 0)
            if (
                set_data.reps is not None
                and set_data.weight is not None
                and set_data.reps > 0
                and set_data.weight > 0
            ):
                set_number += 1
                # Calculate Epley score: weight * (1 + reps/30)
                epley_score = set_data.weight * (1 + set_data.reps / 30)
                total_session_score += epley_score
                
                completed_sets_data.append({
                    "exercise_definition_id": exercise.definition_id,
                    "set_number": set_number,
                    "reps": set_data.reps,
                    "weight": set_data.weight,
                    "epley_score": epley_score,
                })
    
    # Create completed session
    completed_session = CompletedSession(
        user_id=current_user.id,
        template_id=draft.template_id,
        started_at=draft.started_at,
        completed_at=datetime.utcnow(),
        session_score=total_session_score,
    )
    
    session.add(completed_session)
    await session.flush()
    await session.refresh(completed_session)
    
    # Create completed sets
    completed_sets: list[CompletedSet] = []
    for set_info in completed_sets_data:
        completed_set = CompletedSet(
            session_id=completed_session.id,
            exercise_definition_id=set_info["exercise_definition_id"],
            set_number=set_info["set_number"],
            reps=set_info["reps"],
            weight=set_info["weight"],
            epley_score=set_info["epley_score"],
        )
        session.add(completed_set)
        completed_sets.append(completed_set)
    
    # Delete the draft
    await session.delete(draft)
    
    await session.flush()
    
    # Build response
    completed_sets_read = [
        CompletedSetRead(
            id=cs.id if cs.id else 0,  # ID will be assigned after flush
            exercise_definition_id=cs.exercise_definition_id,
            set_number=cs.set_number,
            reps=cs.reps,
            weight=cs.weight,
            epley_score=cs.epley_score,
        )
        for cs in completed_sets
    ]
    
    # Refresh to get IDs
    for cs in completed_sets:
        await session.refresh(cs)
    
    completed_sets_read = [
        CompletedSetRead(
            id=cs.id,
            exercise_definition_id=cs.exercise_definition_id,
            set_number=cs.set_number,
            reps=cs.reps,
            weight=cs.weight,
            epley_score=cs.epley_score,
        )
        for cs in completed_sets
    ]
    
    return CompletedSessionRead(
        id=completed_session.id,
        template_id=completed_session.template_id,
        started_at=completed_session.started_at,
        completed_at=completed_session.completed_at,
        session_score=completed_session.session_score,
        completed_sets=completed_sets_read,
    )


@router.delete("/draft", status_code=status.HTTP_204_NO_CONTENT)
async def discard_draft(
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    """
    Discard the current workout draft without saving.
    """
    result = await session.execute(
        select(WorkoutDraft).where(WorkoutDraft.user_id == current_user.id)
    )
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout draft",
        )
    
    await session.delete(draft)
