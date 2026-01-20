from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, CurrentUser
from app.models import CompletedSession, CompletedSet, ExerciseDefinition, Template
from app.schemas.analytics import (
    SessionAnalytics,
    ExerciseSessionHistory,
    ExerciseSummary,
    SetAnalytics,
)

router = APIRouter()


@router.get("/sessions", response_model=list[SessionAnalytics])
async def get_sessions_analytics(
    current_user: CurrentUser,
    session: DbSession,
    template_id: int | None = Query(
        default=None,
        description="Filter by template ID for per-template progression tracking",
    ),
) -> list[SessionAnalytics]:
    """
    Get all completed sessions for analytics.
    
    Optionally filter by template_id to see progression for a specific workout type
    (e.g., "Push Day A" score over time).
    """
    # Build query with optional template filter
    query = (
        select(CompletedSession)
        .options(selectinload(CompletedSession.template))
        .where(CompletedSession.user_id == current_user.id)
    )
    
    if template_id is not None:
        query = query.where(CompletedSession.template_id == template_id)
    
    query = query.order_by(CompletedSession.completed_at.desc())
    
    result = await session.execute(query)
    sessions = result.scalars().all()
    
    return [
        SessionAnalytics(
            id=s.id,
            template_id=s.template_id,
            template_name=s.template.name if s.template else None,
            started_at=s.started_at,
            completed_at=s.completed_at,
            session_score=s.session_score,
        )
        for s in sessions
    ]


@router.get("/exercise/{exercise_id}/history", response_model=list[ExerciseSessionHistory])
async def get_exercise_history(
    exercise_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> list[ExerciseSessionHistory]:
    """
    Get the performance history for a specific exercise.
    
    Returns all sessions where this exercise was performed, with the sets
    and total score for that exercise in each session.
    """
    # Verify exercise belongs to user
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
    
    # Get all completed sets for this exercise, joined with their sessions
    result = await session.execute(
        select(CompletedSet)
        .options(selectinload(CompletedSet.session))
        .where(CompletedSet.exercise_definition_id == exercise_id)
        .order_by(CompletedSet.session_id, CompletedSet.set_number)
    )
    sets = result.scalars().all()
    
    # Group sets by session
    sessions_map: dict[int, dict] = {}
    for s in sets:
        session_id = s.session_id
        if session_id not in sessions_map:
            sessions_map[session_id] = {
                "session_id": session_id,
                "date": s.session.completed_at,
                "total_score": 0.0,
                "sets": [],
            }
        
        sessions_map[session_id]["total_score"] += s.epley_score
        sessions_map[session_id]["sets"].append(
            SetAnalytics(
                set_number=s.set_number,
                reps=s.reps,
                weight=s.weight,
                epley_score=s.epley_score,
            )
        )
    
    # Convert to list and sort by date (oldest first for chart display)
    history = sorted(
        [
            ExerciseSessionHistory(
                session_id=data["session_id"],
                date=data["date"],
                total_score=data["total_score"],
                sets=data["sets"],
            )
            for data in sessions_map.values()
        ],
        key=lambda x: x.date,
    )
    
    return history


@router.get("/exercise/{exercise_id}/summary", response_model=ExerciseSummary)
async def get_exercise_summary(
    exercise_id: int,
    current_user: CurrentUser,
    session: DbSession,
) -> ExerciseSummary:
    """
    Get summary statistics for a specific exercise.
    
    Returns best set, average score, total volume, etc.
    """
    # Verify exercise belongs to user
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
    
    # Get all completed sets for this exercise
    result = await session.execute(
        select(CompletedSet)
        .options(selectinload(CompletedSet.session))
        .where(CompletedSet.exercise_definition_id == exercise_id)
    )
    sets = result.scalars().all()
    
    # If no sets, return empty summary
    if not sets:
        return ExerciseSummary(
            exercise_id=exercise.id,
            exercise_name=exercise.name,
            total_sessions=0,
            total_sets=0,
            total_volume=0.0,
            best_set_weight=0.0,
            best_set_reps=0,
            best_set_epley_score=0.0,
            average_session_score=0.0,
            last_performed=None,
        )
    
    # Calculate statistics
    total_sets = len(sets)
    session_ids = set()
    total_volume = 0.0
    best_set = sets[0]
    last_performed = sets[0].session.completed_at
    
    # Group scores by session for average calculation
    session_scores: dict[int, float] = {}
    
    for s in sets:
        session_ids.add(s.session_id)
        total_volume += s.weight * s.reps
        
        # Track best set by Epley score
        if s.epley_score > best_set.epley_score:
            best_set = s
        
        # Track last performed
        if s.session.completed_at > last_performed:
            last_performed = s.session.completed_at
        
        # Sum scores per session
        if s.session_id not in session_scores:
            session_scores[s.session_id] = 0.0
        session_scores[s.session_id] += s.epley_score
    
    total_sessions = len(session_ids)
    average_session_score = sum(session_scores.values()) / total_sessions if total_sessions > 0 else 0.0
    
    return ExerciseSummary(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        total_sessions=total_sessions,
        total_sets=total_sets,
        total_volume=total_volume,
        best_set_weight=best_set.weight,
        best_set_reps=best_set.reps,
        best_set_epley_score=best_set.epley_score,
        average_session_score=average_session_score,
        last_performed=last_performed,
    )
