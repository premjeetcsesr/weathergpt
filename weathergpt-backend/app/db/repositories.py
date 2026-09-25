from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import ChatHistory, FavoriteLocation, SearchHistory


class HistoryRepository:
    """Repository for managing search and chat history records."""

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def log_search(
        self,
        query: str,
        location_name: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        user_id: Optional[int] = None,
    ) -> Optional[SearchHistory]:
        if not self.session:
            return None
        record = SearchHistory(
            query=query,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
            user_id=user_id,
        )
        self.session.add(record)
        return record

    async def log_chat(
        self,
        message: str,
        response: str,
        location: str,
        session_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Optional[ChatHistory]:
        if not self.session:
            return None
        record = ChatHistory(
            message=message,
            response=response,
            location=location,
            session_id=session_id,
            user_id=user_id,
        )
        self.session.add(record)
        return record

    async def get_recent_searches(self, user_id: Optional[int] = None, limit: int = 10) -> List[SearchHistory]:
        if not self.session:
            return []
        stmt = select(SearchHistory)
        if user_id is not None:
            stmt = stmt.where(SearchHistory.user_id == user_id)
        stmt = stmt.order_by(SearchHistory.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class FavoriteRepository:
    """Repository for managing user favorite locations."""

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def add_favorite(
        self,
        name: str,
        latitude: float,
        longitude: float,
        user_id: Optional[int] = None,
    ) -> Optional[FavoriteLocation]:
        if not self.session:
            return None
        record = FavoriteLocation(
            name=name,
            latitude=latitude,
            longitude=longitude,
            user_id=user_id,
        )
        self.session.add(record)
        return record

    async def get_favorites(self, user_id: Optional[int] = None) -> List[FavoriteLocation]:
        if not self.session:
            return []
        stmt = select(FavoriteLocation)
        if user_id is not None:
            stmt = stmt.where(FavoriteLocation.user_id == user_id)
        stmt = stmt.order_by(FavoriteLocation.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
