from typing import List, Optional
from pydantic import BaseModel, Field


class WeatherAlertItem(BaseModel):
    """Structured weather alert item."""

    id: str = Field(..., examples=["alert-kanpur-001"], description="Unique alert identifier")
    title: str = Field(..., examples=["Severe Thunderstorm Watch"], description="Alert headline/title")
    severity: str = Field(..., examples=["Severe"], description="Severity tier: Information, Moderate, Severe, Extreme")
    category: str = Field(..., examples=["Thunderstorm"], description="Disaster category (Rain, Thunderstorm, Flood, Cyclone, Heatwave, General)")
    location: str = Field(..., examples=["Kanpur"], description="Target city or administrative zone")
    headline: str = Field(..., examples=["Isolated intense convective thunderstorm cells developing."], description="Brief alert summary")
    description: str = Field(..., examples=["Atmospheric instability triggering rapid localized storm cells with high wind gusts."], description="Full alert details")
    start_time: Optional[str] = Field(default=None, examples=["2026-09-11T16:00:00Z"], description="ISO 8601 start timestamp")
    end_time: Optional[str] = Field(default=None, examples=["2026-09-11T22:00:00Z"], description="ISO 8601 expiry timestamp")
    urgency: Optional[str] = Field(default="Expected", examples=["Immediate"], description="Urgency: Immediate, Expected, Future, Past")
    certainty: Optional[str] = Field(default="Likely", examples=["Observed"], description="Certainty: Observed, Likely, Possible, Unlikely")
    safety_recommendation: Optional[str] = Field(default=None, examples=["Seek shelter indoors; avoid open fields and water bodies."], description="Protective action advice")
    source: str = Field(default="official_meteorological_authority", examples=["IMD / OpenWeather"], description="Issuing agency or meteorological authority")


class AlertsResponse(BaseModel):
    """Active alerts response payload."""

    location: str = Field(..., examples=["Kanpur"], description="Requested location")
    alerts: List[WeatherAlertItem] = Field(default_factory=list, description="List of active weather alerts")
    total_alerts: int = Field(default=0, examples=[0], description="Total count of active alerts")
    provider_note: Optional[str] = Field(
        default=None,
        description="Note regarding provider alert availability or authority verification"
    )
