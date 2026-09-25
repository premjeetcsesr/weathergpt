from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator


class AlertLocation(BaseModel):
    """Geographic location object for alerts and subscriptions."""

    name: str = Field(..., examples=["Kanpur"], description="City or district name")
    latitude: Optional[float] = Field(default=None, examples=[26.4499], description="Latitude coordinate")
    longitude: Optional[float] = Field(default=None, examples=[80.3319], description="Longitude coordinate")


class WeatherAlertItem(BaseModel):
    """Structured weather alert item adhering to Step 4 model & backward compatibility."""

    id: str = Field(..., examples=["alert-kanpur-001"], description="Unique alert identifier")
    alert_id: Optional[str] = Field(default=None, description="Provider alert identifier")
    event: str = Field(default="Weather Advisory", examples=["Heavy Rain"], description="Alert event headline")
    title: Optional[str] = Field(default=None, description="Title alias for compatibility")
    severity: str = Field(default="moderate", examples=["moderate"], description="Severity: minor, moderate, severe, extreme")
    category: Optional[str] = Field(default="General", description="Category: Rain, Thunderstorm, Flood, Cyclone, Heatwave, General")
    urgency: Optional[str] = Field(default="expected", examples=["expected"], description="Urgency: immediate, expected, future, past")
    headline: Optional[str] = Field(default=None, examples=["Heavy rain expected"], description="Brief summary")
    description: Optional[str] = Field(default="", description="Detailed meteorological warning information")
    instruction: Optional[str] = Field(default=None, description="Public safety instructions and recommendations")
    safety_recommendation: Optional[str] = Field(default=None, description="Safety recommendation alias")
    source: str = Field(default="OpenWeatherMap", examples=["OpenWeatherMap"], description="Alert issuing authority or provider")
    source_type: Optional[str] = Field(default="weather_api", description="Source type identifier")
    location: Union[str, AlertLocation, Dict[str, Any]] = Field(default="Kanpur", description="Target city or location object")
    starts_at: Optional[str] = Field(default=None, description="ISO timestamp of onset")
    ends_at: Optional[str] = Field(default=None, description="ISO timestamp of expiration")
    start_time: Optional[str] = Field(default=None, description="Compatibility alias for starts_at")
    end_time: Optional[str] = Field(default=None, description="Compatibility alias for ends_at")
    certainty: Optional[str] = Field(default="Likely", description="Certainty level")
    received_at: Optional[str] = Field(default=None, description="Timestamp when system received alert")
    updated_at: Optional[str] = Field(default=None, description="Timestamp of last alert update")
    is_active: bool = Field(default=True, description="Whether alert is currently active")

    @model_validator(mode="before")
    @classmethod
    def harmonize_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = dict(data)
        # ID synchronization - prioritize provider alert_id if present
        if d.get("alert_id"):
            d["id"] = str(d["alert_id"])
        elif d.get("id"):
            d["alert_id"] = str(d["id"])

        # Event & Title synchronization
        if "event" not in d and "title" in d:
            d["event"] = d["title"]
        elif "title" not in d and "event" in d:
            d["title"] = d["event"]

        # Instruction & Safety recommendation synchronization
        if "instruction" not in d and "safety_recommendation" in d:
            d["instruction"] = d["safety_recommendation"]
        elif "safety_recommendation" not in d and "instruction" in d:
            d["safety_recommendation"] = d["instruction"]

        # Timing synchronization
        if "starts_at" not in d and "start_time" in d:
            d["starts_at"] = d["start_time"]
        elif "start_time" not in d and "starts_at" in d:
            d["start_time"] = d["starts_at"]

        if "ends_at" not in d and "end_time" in d:
            d["ends_at"] = d["end_time"]
        elif "end_time" not in d and "ends_at" in d:
            d["end_time"] = d["ends_at"]

        # Severity lowercase normalization
        if "severity" in d and isinstance(d["severity"], str):
            d["severity"] = d["severity"].lower()

        return d


class AlertsResponse(BaseModel):
    """Active alerts response payload."""

    location: str = Field(..., examples=["Kanpur"], description="Requested location")
    alerts: List[WeatherAlertItem] = Field(default_factory=list, description="List of active weather alerts")
    total_alerts: int = Field(default=0, examples=[0], description="Total count of active alerts")
    provider_note: Optional[str] = Field(
        default=None,
        description="Note regarding provider alert availability or authority verification"
    )

    @model_validator(mode="before")
    @classmethod
    def calculate_totals(cls, data: Any) -> Any:
        if isinstance(data, dict):
            alerts = data.get("alerts", [])
            if "total_alerts" not in data:
                data["total_alerts"] = len(alerts)
        return data


class AlertHistoryResponse(BaseModel):
    """Historical alerts query response."""

    alerts: List[WeatherAlertItem] = Field(default_factory=list, description="Historical alert records")
    total: int = Field(default=0, description="Total count of historical alerts")


class AlertSubscriptionLocationInput(BaseModel):
    """Location parameters for alert subscription."""

    city: str = Field(..., min_length=2, examples=["Kanpur"], description="City to monitor")
    latitude: Optional[float] = Field(default=None, examples=[26.4499], description="Latitude coordinate")
    longitude: Optional[float] = Field(default=None, examples=[80.3319], description="Longitude coordinate")


class AlertSubscriptionCreate(BaseModel):
    """Payload to create a location alert subscription."""

    location: AlertSubscriptionLocationInput
    severity_threshold: str = Field(default="moderate", examples=["moderate"], description="minor, moderate, severe, extreme")


class AlertSubscriptionResponse(BaseModel):
    """Alert subscription detail response."""

    id: str = Field(..., examples=["sub_001"])
    user_id: Optional[str] = Field(default=None)
    location: Dict[str, Any]
    severity_threshold: str = Field(default="moderate")
    enabled: bool = Field(default=True)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AlertSubscriptionListResponse(BaseModel):
    """List of alert subscriptions."""

    subscriptions: List[AlertSubscriptionResponse] = Field(default_factory=list)
    total: int = Field(default=0)
