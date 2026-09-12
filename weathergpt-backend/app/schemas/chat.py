from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, field_validator


class WeatherContextSchema(BaseModel):
    """Contextual weather metrics supplied to or returned by the AI assistant."""

    temperature: Optional[float] = Field(default=None, examples=[30.0], description="Current or forecast temperature")
    feels_like: Optional[float] = Field(default=None, examples=[33.0], description="Apparent temperature")
    condition: Optional[str] = Field(default=None, examples=["Partly Cloudy"], description="Weather condition")
    rain_probability: Optional[int] = Field(default=None, examples=[70], description="Rain chance (0-100%)")
    humidity: Optional[int] = Field(default=None, examples=[78], description="Humidity percentage")
    wind_speed: Optional[float] = Field(default=None, examples=[16.0], description="Wind speed in km/h")
    uv_index: Optional[float] = Field(default=None, examples=[8.0], description="UV index")
    air_quality_label: Optional[str] = Field(default=None, examples=["Moderate"], description="AQI label")


class ChatRequest(BaseModel):
    """User conversation request payload for WeatherGPT AI assistant."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        examples=["Will it rain tomorrow in Kanpur?"],
        description="User question, query, or instruction"
    )
    location: Optional[str] = Field(
        default=None,
        examples=["Kanpur"],
        description="Target city or location for contextual grounding (optional if mentioned in message)"
    )
    language: Optional[str] = Field(
        default=None,
        examples=["en", "hi"],
        description="Desired language code ('en' or 'hi'). Auto-detected if omitted."
    )
    conversation_id: Optional[str] = Field(
        default=None,
        examples=["sess-12345"],
        description="Optional conversation identifier for multi-turn conversational context"
    )
    units: Optional[str] = Field(
        default="metric",
        examples=["metric", "imperial"],
        description="Measurement units (metric or imperial)"
    )
    weather_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional pre-existing telemetry context for frontend client-side state passing"
    )

    @field_validator("message")
    @classmethod
    def validate_message_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message cannot be empty or whitespace only.")
        return v.strip()


class ChatResponse(BaseModel):
    """Context-grounded assistant response payload."""

    success: bool = Field(default=True, description="Whether the request was processed successfully")
    message: str = Field(..., examples=["There is a 40% chance of light rain tomorrow in Kanpur."], description="Conversational AI or fallback response")
    intent: Optional[str] = Field(default=None, examples=["rainfall", "forecast"], description="Detected user intent")
    location: Optional[str] = Field(default=None, examples=["Kanpur"], description="Resolved location used for weather telemetry")
    language: Optional[str] = Field(default="en", examples=["en", "hi"], description="Language code of the response")
    weather_context_used: bool = Field(default=True, description="Indicates if verified backend weather context was utilized")
    ai_generated: bool = Field(default=True, description="Indicates if the response was generated via LLM (True) or deterministic fallback (False)")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Structured weather metrics for frontend UI rendering")
    weather_context: Optional[Dict[str, Any]] = Field(default=None, description="Weather facts used for grounding the response (backwards compatibility)")
    source: str = Field(default="weathergpt_ai", examples=["weathergpt_ai"], description="Response generation mechanism")
