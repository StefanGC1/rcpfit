from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from typing import Annotated

from fastapi import Depends

from app.api.deps import DbSession, CurrentUser
from app.core.security import hash_password, verify_password, create_access_token
from app.models import User
from app.schemas.auth import UserCreate, UserRead, Token

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: DbSession) -> Token:
    """
    Register a new user.
    Returns a JWT access token on success.
    """
    # Check if email already exists
    result = await session.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    hashed_pw = hash_password(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_pw)
    
    session.add(new_user)
    await session.flush()  # Get the ID without committing
    await session.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: DbSession,
) -> Token:
    """
    Authenticate user and return JWT access token.
    Uses OAuth2 password flow (username field = email).
    """
    # Find user by email
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: CurrentUser) -> UserRead:
    """
    Get current authenticated user's information.
    """
    return UserRead.model_validate(current_user)
