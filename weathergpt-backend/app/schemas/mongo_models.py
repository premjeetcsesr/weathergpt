"""
Pydantic v2 schemas and models for MongoDB Collections:
- Users & Authentication
- Chat History & Sessions
- Saved / Favorite Locations
- Weather Search & Telemetry History
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# 1. User & Authentication Schemas
# ---------------------------------------------------------------------------

class UserPreferences(BaseModel):
    """User profile personalization preferences."""
    unit: str = Field(default="celsius", description="'celsius' or 'fahrenheit'")
    theme: str = Field(default="dark", description="'dark' or 'light'")
    language: str = Field(default="en", description="'en' or 'hi'")
    default_city: str = Field(default="Kanpur", description="Default city for weather briefing")

    model_config = ConfigDict(from_attributes=True)


class UserRegisterRequest(BaseModel):
    """Registration payload."""
    email: EmailStr = Field(..., description="Unique email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=6, max_length=100, description="Plaintext password")
    full_name: Optional[str] = Field(default=None, max_length=100)
    role: str = Field(default="user", description="'user' or 'admin'")
    preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences)


class UserLoginRequest(BaseModel):
    """Login payload."""
    email_or_username: str = Field(..., description="User email or username")
    password: str = Field(..., description="Plaintext password")


class UserProfileResponse(BaseModel):
    """Public user profile."""
    id: str = Field(..., description="MongoDB Object ID as string")
    email: str
    username: str
    full_name: Optional[str] = None
    role: str = Field(default="user", description="'user' or 'admin'")
    is_active: bool = True
    preferences: UserPreferences
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """JWT Token authentication response."""
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class UserPreferencesUpdateRequest(BaseModel):
    """Update user preferences."""
    unit: Optional[str] = Field(default=None, pattern="^(celsius|fahrenheit)$")
    theme: Optional[str] = Field(default=None, pattern="^(dark|light)$")
    language: Optional[str] = Field(default=None, pattern="^(en|hi)$")
    default_city: Optional[str] = Field(default=None, min_length=1, max_length=100)


# ---------------------------------------------------------------------------
# 2. Chat History Schemas
# ---------------------------------------------------------------------------

class ChatHistoryItem(BaseModel):
    """Single conversational turn log."""
    id: str = Field(..., description="Document ID")
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    message: str
    response: str
    location: str
    intent: Optional[str] = None
    language: Optional[str] = "en"
    weather_context: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


class ChatHistoryListResponse(BaseModel):
    """List of chat interaction logs."""
    items: List[ChatHistoryItem]
    total: int
    session_id: Optional[str] = None


class ChatSessionSummary(BaseModel):
    """Summary of a user conversation session."""
    session_id: str
    message_count: int
    last_message: str
    last_location: str
    last_updated: datetime


class ChatSessionListResponse(BaseModel):
    """List of conversation sessions."""
    sessions: List[ChatSessionSummary]
    total: int


# ---------------------------------------------------------------------------
# 3. Saved / Favorite Location Schemas
# ---------------------------------------------------------------------------

class SavedLocationCreate(BaseModel):
    """Create a saved or favorite location."""
    name: str = Field(..., min_length=1, max_length=150, description="City / Place name")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    state: Optional[str] = None
    country: Optional[str] = "India"
    tag: Optional[str] = Field(default="Favorite", description="Tag (e.g. Home, Work, Vacation, Favorite)")


class SavedLocationResponse(BaseModel):
    """Saved location document representation."""
    id: str = Field(..., description="Document ID")
    user_id: Optional[str] = None
    name: str
    latitude: float
    longitude: float
    state: Optional[str] = None
    country: Optional[str] = None
    tag: Optional[str] = "Favorite"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavedLocationListResponse(BaseModel):
    """List of saved locations."""
    items: List[SavedLocationResponse]
    total: int


# ---------------------------------------------------------------------------
# 4. Weather Search & Telemetry History Schemas
# ---------------------------------------------------------------------------

class WeatherHistoryRecord(BaseModel):
    """Historical weather inquiry log."""
    id: str = Field(..., description="Document ID")
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    query: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    temperature: Optional[float] = None
    feels_like: Optional[float] = None
    condition: Optional[str] = None
    humidity: Optional[int] = None
    wind_speed: Optional[float] = None
    source: Optional[str] = "openweathermap"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WeatherHistoryListResponse(BaseModel):
    """List of weather query history records."""
    items: List[WeatherHistoryRecord]
    total: int


class PopularCityItem(BaseModel):
    """Aggregated popular searched city metric."""
    city: str
    search_count: int
    last_searched: datetime


class PopularLocationResponse(BaseModel):
    """List of popular / trending weather search cities."""
    items: List[PopularCityItem]


# ---------------------------------------------------------------------------
# 5. Notification Schemas
# ---------------------------------------------------------------------------

class NotificationCreate(BaseModel):
    """Create a new notification payload."""
    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    message: str = Field(..., min_length=1, max_length=1000, description="Detailed notification message")
    type: str = Field(default="alert", description="'alert' | 'warning' | 'info' | 'forecast' | 'system'")
    severity: str = Field(default="medium", description="'critical' | 'high' | 'medium' | 'low'")
    location: Optional[str] = Field(default=None, max_length=100)
    user_id: Optional[str] = None


class NotificationResponse(BaseModel):
    """Notification document presentation."""
    id: str = Field(..., description="Document ID")
    user_id: Optional[str] = None
    title: str
    message: str
    type: str = "alert"
    severity: str = "medium"
    location: Optional[str] = None
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """List of user and broadcast notifications."""
    items: List[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Unread notifications count response."""
    unread_count: int

