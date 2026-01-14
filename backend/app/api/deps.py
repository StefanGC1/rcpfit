from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.security import decode_access_token
from app.models import User

# OAuth2 scheme for bearer token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    """
    Dependency that extracts and validates the current user from the JWT token.
    Raises 401 if token is invalid or user doesn't exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode the token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    # Extract user_id from token
    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Fetch user from database
    result = await session.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


# Type alias for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_session)]
