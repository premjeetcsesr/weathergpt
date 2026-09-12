from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import get_settings
from app.core.logging import logger
from app.db.models import Base

settings = get_settings()

engine: Optional[AsyncEngine] = None
AsyncSessionLocal: Optional[async_sessionmaker[AsyncSession]] = None

if settings.DATABASE_URL and settings.DATABASE_URL.strip():
    try:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            future=True,
            pool_pre_ping=True,
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        logger.info("PostgreSQL database engine initialized.")
    except Exception as exc:
        logger.warning(f"Could not initialize database engine with URL '{settings.DATABASE_URL}': {exc}")
        engine = None
        AsyncSessionLocal = None
else:
    logger.info("DATABASE_URL is not set. Running in decoupled database-free mode.")


async def init_db() -> None:
    """Create database tables if engine is configured."""
    if engine is not None:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables verified/created successfully.")
        except Exception as exc:
            logger.warning(f"Could not connect to database on startup: {exc}")


async def get_db() -> AsyncGenerator[Optional[AsyncSession], None]:
    """Dependency to provide an async database session when available."""
    if AsyncSessionLocal is None:
        yield None
        return

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
