import time
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.db.mongo_repositories import MongoChatHistoryRepository
from app.db.repositories import HistoryRepository
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.alert_service import AlertService
from app.services.forecast_service import ForecastService
from app.services.language_service import LanguageService
from app.services.llm_service import LLMService
from app.services.weather_service import WeatherService
from app.utils.intent_parser import (
    detect_intent,
    detect_language,
    extract_location,
    extract_time_target,
)


class InMemoryConversationStore:
    """
    Lightweight, thread-safe in-memory store for conversational context tracking.
    Retains recent locations and intents per conversation session ID.
    """

    def __init__(self, ttl_seconds: int = 1800):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self.ttl_seconds = ttl_seconds

    def get_session(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        if not conversation_id or conversation_id not in self._sessions:
            return None
        session = self._sessions[conversation_id]
        if time.time() - session.get("updated_at", 0) > self.ttl_seconds:
            del self._sessions[conversation_id]
            return None
        return session

    def update_session(self, conversation_id: str, location: Optional[str] = None, intent: Optional[str] = None):
        if not conversation_id:
            return
        current = self._sessions.get(conversation_id, {})
        if location:
            current["location"] = location
        if intent:
            current["last_intent"] = intent
        current["updated_at"] = time.time()
        self._sessions[conversation_id] = current


# Global singleton in-memory session store
conversation_store = InMemoryConversationStore()


class ChatService:
    """
    Orchestration layer for conversational AI weather intelligence.
    Extracts intents/locations, queries verified backend services, builds context,
    invokes LLMService, and logs conversation history to MongoDB and relational DB.
    """

    def __init__(
        self,
        weather_service: WeatherService,
        forecast_service: ForecastService,
        alert_service: AlertService,
        llm_service: LLMService,
        chat_repo: Optional[MongoChatHistoryRepository] = None,
        warning_service: Optional[Any] = None,
        advisory_service: Optional[Any] = None,
        settings: Optional[Settings] = None,
    ):
        self.weather_service = weather_service
        self.forecast_service = forecast_service
        self.alert_service = alert_service
        self.llm_service = llm_service
        self.chat_repo = chat_repo
        self.warning_service = warning_service
        self.advisory_service = advisory_service
        self.settings = settings or get_settings()

    async def process_chat_message(
        self,
        request: ChatRequest,
        db: Optional[AsyncSession] = None,
        user_id: Optional[str] = None,
        chat_repo: Optional[MongoChatHistoryRepository] = None,
    ) -> ChatResponse:
        """
        Main pipeline to process user message and return context-grounded AI weather response.
        Persists chat turn into MongoDB chat_history collection.
        """
        raw_message = request.message.strip()
        conv_id = request.conversation_id
        session_data = conversation_store.get_session(conv_id) if conv_id else None
        session_location = session_data.get("location") if session_data else None

        # 1. Parse linguistic properties & intent
        lang_detection = LanguageService.detect_language(raw_message, user_preference=request.language)
        detected_lang = lang_detection.get("language", "en")
        # The question's language takes precedence over the UI preference.
        # This keeps Devanagari and Hinglish questions in Hindi even when the
        # app language selector is still set to English.
        language = detected_lang if detected_lang in ("en", "hi") else (request.language or "en")

        intent = detect_intent(raw_message)
        time_target = extract_time_target(raw_message)

        # 2. Extract Location
        # Priority: extracted from text -> request.location -> conversation memory
        detected_loc = extract_location(raw_message, fallback_location=request.location or session_location)

        logger.info(
            f"Processing chat query: intent='{intent}', time_target='{time_target}', "
            f"lang='{language}', detected_location='{detected_loc}'"
        )

        # 3. Handle missing location
        if not detected_loc:
            prompt_msg = (
                "कृपया बताएं कि आप किस शहर या स्थान का मौसम जानना चाहते हैं।"
                if language == "hi"
                else "Please specify the city or location you would like to know the weather for."
            )
            return ChatResponse(
                success=True,
                reply=prompt_msg,
                message=prompt_msg,
                intent="missing_location",
                location=None,
                language=language,
                weather_context_used=False,
                ai_generated=False,
                data=None,
                weather_context=None,
                source="weathergpt_system",
            )

        # 4. Build verified weather telemetry context
        weather_ctx: Dict[str, Any] = dict(request.weather_context or {})
        resolved_city_name = detected_loc

        try:
            # A. Fetch current weather telemetry if not fully present
            if not weather_ctx.get("temperature") or not weather_ctx.get("condition"):
                weather_data = await self.weather_service.get_current_weather(city=detected_loc)
                resolved_city_name = weather_data.location.city

                weather_ctx.update({
                    "temperature": weather_data.current.temperature,
                    "feels_like": weather_data.current.feels_like,
                    "condition": weather_data.current.condition,
                    "humidity": weather_data.current.humidity,
                    "wind_speed": weather_data.current.wind_speed,
                    "sunrise": weather_data.current.sunrise,
                    "sunset": weather_data.current.sunset,
                    "air_quality_label": (
                        weather_data.current.air_quality.label
                        if weather_data.current.air_quality
                        else "Moderate"
                    ),
                })

            # B. Fetch forecast telemetry if relevant to question
            if time_target != "today" or intent in ["forecast", "rainfall"]:
                try:
                    forecast_data = await self.forecast_service.get_forecast(city=resolved_city_name)
                    if forecast_data.daily:
                        # Tomorrow is index 1 if available
                        target_day = forecast_data.daily[1] if (time_target == "tomorrow" and len(forecast_data.daily) > 1) else forecast_data.daily[0]
                        weather_ctx["forecast_summary"] = (
                            f"{target_day.day}: High {target_day.temp_max}°C, Low {target_day.temp_min}°C, "
                            f"{target_day.condition} with {target_day.pop}% rain probability."
                        )
                        if time_target == "tomorrow":
                            weather_ctx["temperature"] = target_day.temp_max
                            weather_ctx["condition"] = target_day.condition
                            weather_ctx["rain_probability"] = target_day.pop
                        elif "rain_probability" not in weather_ctx:
                            weather_ctx["rain_probability"] = target_day.pop
                    elif forecast_data.hourly:
                        max_pop = max((h.pop for h in forecast_data.hourly[:8]), default=0)
                        weather_ctx.setdefault("rain_probability", max_pop)
                except Exception as e:
                    logger.warning(f"Could not retrieve forecast telemetry for {resolved_city_name}: {e}")

            # C. Fetch alerts & official warnings
            msg_lower = raw_message.lower()
            if intent == "weather_alert" or "warning" in msg_lower or "alert" in msg_lower or "travel" in msg_lower or "safe" in msg_lower:
                if self.warning_service:
                    try:
                        warn_resp = await self.warning_service.get_official_warnings(city=resolved_city_name)
                        weather_ctx["alerts"] = [w.model_dump() for w in warn_resp.warnings]
                        weather_ctx["highest_warning_severity"] = warn_resp.highest_severity
                    except Exception as e:
                        logger.warning(f"Could not retrieve warnings from warning_service for {resolved_city_name}: {e}")
                elif self.alert_service:
                    try:
                        alerts_resp = await self.alert_service.get_alerts(city=resolved_city_name)
                        weather_ctx["alerts"] = alerts_resp.alerts
                    except Exception as e:
                        logger.warning(f"Could not retrieve alerts for {resolved_city_name}: {e}")
                        weather_ctx["alerts"] = []

            # D. Fetch advisories if travel or risk inquiry
            if "travel" in msg_lower or "precaution" in msg_lower or "safe" in msg_lower or "umbrella" in msg_lower:
                if self.advisory_service:
                    try:
                        adv_resp = await self.advisory_service.get_actionable_advisories(city=resolved_city_name)
                        weather_ctx["advisories"] = [a.headline for a in adv_resp.advisories]
                    except Exception as e:
                        logger.warning(f"Could not retrieve advisories for {resolved_city_name}: {e}")

        except Exception as exc:
            logger.error(f"Weather provider error retrieving telemetry for '{detected_loc}': {exc}")
            error_msg = (
                f"क्षमा करें, {detected_loc} के लिए मौसम की जानकारी प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।"
                if language == "hi"
                else f"Unable to fetch verified weather telemetry for '{detected_loc}'. Please check the city name and try again."
            )
            return ChatResponse(
                success=False,
                reply=error_msg,
                message=error_msg,
                intent=intent,
                location=detected_loc,
                language=language,
                weather_context_used=False,
                ai_generated=False,
                data=None,
                weather_context=None,
                source="weathergpt_provider_error",
            )

        # 5. Generate AI or Fallback conversational response
        ai_response_text, is_ai_generated = await self.llm_service.generate_weather_response(
            user_message=raw_message,
            location=resolved_city_name,
            weather_context=weather_ctx,
            intent=intent,
            language=language,
            time_target=time_target,
        )

        # 6. Update session tracking in-memory
        if conv_id:
            conversation_store.update_session(conv_id, location=resolved_city_name, intent=intent)

        # 7. Persist to MongoDB chat_history collection
        active_chat_repo = chat_repo or self.chat_repo
        if active_chat_repo is not None:
            try:
                await active_chat_repo.log_chat_turn(
                    message=raw_message,
                    response=ai_response_text,
                    location=resolved_city_name,
                    session_id=conv_id,
                    user_id=user_id,
                    intent=intent,
                    language=language,
                    weather_context=weather_ctx,
                    input_mode=request.input_mode or "text",
                )
                logger.debug(f"Chat turn logged to MongoDB for session '{conv_id}'")
            except Exception as e:
                logger.warning(f"MongoDB chat logging failed: {e}")

        # 8. Optional fallback SQL DB persist
        if db is not None:
            try:
                repo = HistoryRepository(db)
                await repo.log_chat(
                    message=raw_message,
                    response=ai_response_text,
                    location=resolved_city_name,
                    session_id=conv_id,
                )
            except Exception as e:
                logger.debug(f"SQL chat history database logging skipped: {e}")

        # 9. Return structured response
        return ChatResponse(
            success=True,
            reply=ai_response_text,
            message=ai_response_text,
            intent=intent,
            location=resolved_city_name,
            language=language,
            weather_context_used=True,
            ai_generated=is_ai_generated,
            data=weather_ctx,
            weather_context=weather_ctx,
            source="weather_context",
        )
