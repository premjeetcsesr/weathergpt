from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_chat_repo, get_chat_service, get_current_user_optional
from app.db.database import get_db
from app.db.mongo_repositories import MongoChatHistoryRepository
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.mongo_models import (
    ChatHistoryItem,
    ChatHistoryListResponse,
    ChatSessionListResponse,
    ChatSessionSummary,
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["AI Assistant & Chat History"])


@router.post(
    "",
    summary="AI Weather Assistant Chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    description=(
        "Conversational weather intelligence endpoint grounded strictly in verified real-time telemetry. "
        "Understands user intents (rain, temperature, humidity, wind, alerts, multi-day forecasts) "
        "in English and Hindi, resolves locations, queries weather providers, and produces natural conversational responses. "
        "Automatically persists conversational turns into MongoDB chat_history."
    ),
)
async def chat_weather_assistant(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    chat_repo: MongoChatHistoryRepository = Depends(get_chat_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Optional[AsyncSession] = Depends(get_db),
) -> ChatResponse:
    """
    Process multi-turn conversational weather questions with intent extraction,
    strict anti-hallucination grounding, deterministic fallbacks, and MongoDB storage.
    """
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    return await chat_service.process_chat_message(
        request=request,
        db=db,
        user_id=user_id,
        chat_repo=chat_repo,
    )


@router.get(
    "/history",
    summary="Get Chat History",
    response_model=ChatHistoryListResponse,
    description="Fetch conversational turns from MongoDB for a given session ID or authenticated user.",
)
async def get_chat_history(
    session_id: Optional[str] = Query(default=None, description="Conversation session ID"),
    limit: int = Query(default=50, ge=1, le=100, description="Max history items"),
    skip: int = Query(default=0, ge=0, description="Offset"),
    chat_repo: MongoChatHistoryRepository = Depends(get_chat_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> ChatHistoryListResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    docs = await chat_repo.get_session_history(
        session_id=session_id,
        user_id=user_id,
        limit=limit,
        skip=skip,
    )
    items = [ChatHistoryItem.model_validate(d) for d in docs]
    return ChatHistoryListResponse(
        items=items,
        total=len(items),
        session_id=session_id,
    )


@router.get(
    "/sessions",
    summary="Get Conversation Sessions",
    response_model=ChatSessionListResponse,
    description="List active and recent conversation session IDs and their latest message summary.",
)
async def get_chat_sessions(
    limit: int = Query(default=20, ge=1, le=50),
    chat_repo: MongoChatHistoryRepository = Depends(get_chat_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> ChatSessionListResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    sessions_data = await chat_repo.get_user_sessions(user_id=user_id, limit=limit)
    summaries = [ChatSessionSummary.model_validate(s) for s in sessions_data]
    return ChatSessionListResponse(
        sessions=summaries,
        total=len(summaries),
    )


@router.delete(
    "/history",
    summary="Clear Chat History",
    status_code=status.HTTP_200_OK,
    description="Clear conversational history for a specific session ID or the entire user account.",
)
async def clear_chat_history(
    session_id: Optional[str] = Query(default=None, description="Session ID to clear"),
    chat_repo: MongoChatHistoryRepository = Depends(get_chat_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None

    if session_id:
        deleted = await chat_repo.delete_session_history(session_id=session_id, user_id=user_id)
        return {"success": True, "message": f"Cleared {deleted} chat messages for session '{session_id}'."}
    elif user_id:
        deleted = await chat_repo.clear_user_history(user_id=user_id)
        return {"success": True, "message": f"Cleared all {deleted} chat messages for user."}
    else:
        return {"success": False, "message": "Specify session_id or authenticate to clear history."}

