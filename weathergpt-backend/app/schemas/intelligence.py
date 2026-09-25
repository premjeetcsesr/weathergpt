"""
Pydantic Schemas for Advanced Weather Intelligence, Official Warnings,
Advisories, Nowcasting, and Provider Status (SIH 2026 Step 7).
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WarningSeverity(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


class OfficialWarningItem(BaseModel):
    """Normalized Official Meteorological Warning representation."""
    alert_id: str
    event: str = Field(description="E.g. 'Heavy Rain', 'Heatwave', 'Thunderstorm'")
    severity: WarningSeverity = WarningSeverity.MODERATE
    category: str = "Weather Warning"
    headline: str
    description: str
    instruction: Optional[str] = None
    location: Dict[str, Any]
    issued_at: str
    updated_at: str
    valid_until: Optional[str] = None
    source: str = "IMD / Official Meteorological Agency"
    is_active: bool = True
    confidence: Optional[float] = None


class WarningsResponse(BaseModel):
    """Official weather warnings query response."""
    location: Dict[str, Any]
    has_active_warnings: bool
    highest_severity: Optional[str] = None
    warnings: List[OfficialWarningItem] = []
    source: str
    issued_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    message: Optional[str] = None


class SevereWeatherRisk(BaseModel):
    """Detected severe weather risk signal."""
    risk_type: str = Field(description="E.g. 'heavy_rain', 'heatwave', 'gale_wind', 'lightning'")
    severity: WarningSeverity = WarningSeverity.MODERATE
    location: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    source: str
    confidence: Optional[float] = None
    recommended_action: str
    metric_trigger: Optional[str] = None


class SevereWeatherResponse(BaseModel):
    """Severe weather risk signals response."""
    location: Dict[str, Any]
    has_severe_risks: bool
    risks: List[SevereWeatherRisk] = []
    source: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AdvisoryItem(BaseModel):
    """Weather-based safety advisory recommendation."""
    category: str = Field(description="E.g. 'Travel', 'Hydration', 'Outdoor Safety', 'Electrical'")
    severity: str = "advisory"
    headline: str
    recommendations: List[str]
    disclaimer: str = "Weather-based advisory generated from verified meteorological telemetry. Not a government order."


class AdvisoryResponse(BaseModel):
    """Actionable weather-based advisory response."""
    location: Dict[str, Any]
    advisories: List[AdvisoryItem] = []
    source: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NowcastPoint(BaseModel):
    """Short-term 0-3 hour nowcast step."""
    timestamp: str
    temperature: Optional[float] = None
    condition: str
    precipitation_probability: int
    rain_mm: float = 0.0
    wind_speed: Optional[float] = None


class NowcastResponse(BaseModel):
    """Short-term nowcast response."""
    available: bool
    source: str
    location: Dict[str, Any]
    summary: str
    max_rain_probability: int = 0
    points: List[NowcastPoint] = []
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    message: Optional[str] = None


class ProviderStatusItem(BaseModel):
    """Operational status of a weather provider."""
    provider_id: str
    name: str
    category: str
    status: str
    configured: bool
    is_primary: bool
    notes: str
    last_checked: str


class ProviderStatusResponse(BaseModel):
    """Multi-provider statuses response."""
    providers: List[ProviderStatusItem]
    active_primary: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SourceTransparencyResponse(BaseModel):
    """Transparency and provenance metadata."""
    location: Dict[str, Any]
    source: str
    data_available: bool
    updated_at: str
    valid_until: Optional[str] = None
    confidence: Optional[str] = None
    notes: str


class AdvancedWeatherResponse(BaseModel):
    """
    Unified high-fidelity meteorological intelligence payload.
    Exposes verified current weather, forecast, official warnings,
    nowcast, severe risks, advisories, and source transparency.
    """
    location: Dict[str, Any]
    source: str
    issued_at: str
    updated_at: str
    valid_until: Optional[str] = None
    confidence: Optional[str] = None
    data_available: bool = True

    # Core weather snapshots
    current: Dict[str, Any]
    forecast_summary: Optional[str] = None

    # Step 7 Advanced modules
    warnings: WarningsResponse
    nowcast: NowcastResponse
    severe_weather: SevereWeatherResponse
    advisory: AdvisoryResponse
