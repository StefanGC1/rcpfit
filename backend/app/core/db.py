from typing import AsyncGenerator
import ssl
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings

# Create SSL context for asyncpg (required for Supabase)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Async engine for the application
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for debugging
    future=True,
    connect_args={
        "ssl": ssl_context,
        "statement_cache_size": 0
    },
)

# Async session factory
async_session_maker = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
