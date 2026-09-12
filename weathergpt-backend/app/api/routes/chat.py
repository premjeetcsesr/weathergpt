from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_chat_service
from app.db.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["AI Assistant"])


@router.post(
    "",
    summary="AI Weather Assistant Chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    description=(
        "Conversational weather intelligence endpoint grounded strictly in verified real-time telemetry. "
        "Understands user intents (rain, temperature, humidity, wind, alerts, multi-day forecasts) "
        "in English and Hindi, resolves locations, queries weather providers, and produces natural conversational responses."
    ),
)
async def chat_weather_assistant(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    db: Optional[AsyncSession] = Depends(get_db),
) -> ChatResponse:
    """
    Process multi-turn conversational weather questions with intent extraction,
    strict anti-hallucination grounding, and deterministic fallbacks.
    """
    return await chat_service.process_chat_message(request=request, db=db)
