"""
Pydantic v2 schemas and models for Community Weather Reports.
Citizen-generated crowd observations with Cloudinary image storage and GeoJSON indexing.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReportCategory(str, Enum):
    WATERLOGGING = "waterlogging"
    HAILSTORM = "hailstorm"
    STORM = "storm"
    FALLEN_TREE = "fallen_tree"
    ROAD_BLOCKED = "road_blocked"
    HEAVY_RAIN = "heavy_rain"
    LIGHTNING = "lightning"
    POOR_VISIBILITY = "poor_visibility"
    EXTREME_HEAT = "extreme_heat"
    HIGH_WIND = "high_wind"
    OTHER_WEATHER_INCIDENT = "other_weather_incident"
    OTHER = "other"


CATEGORY_METADATA = {
    ReportCategory.WATERLOGGING: {"name": "Waterlogging", "icon": "🌊", "color": "blue"},
    ReportCategory.HAILSTORM: {"name": "Hailstorm", "icon": "🧊", "color": "cyan"},
    ReportCategory.STORM: {"name": "Storm", "icon": "🌪️", "color": "indigo"},
    ReportCategory.FALLEN_TREE: {"name": "Fallen Tree", "icon": "🌳", "color": "emerald"},
    ReportCategory.ROAD_BLOCKED: {"name": "Road Blocked", "icon": "🚧", "color": "amber"},
    ReportCategory.HEAVY_RAIN: {"name": "Heavy Rain", "icon": "🌧️", "color": "sky"},
    ReportCategory.LIGHTNING: {"name": "Lightning", "icon": "⚡", "color": "yellow"},
    ReportCategory.POOR_VISIBILITY: {"name": "Poor Visibility", "icon": "🌫️", "color": "slate"},
    ReportCategory.EXTREME_HEAT: {"name": "Extreme Heat", "icon": "🔥", "color": "orange"},
    ReportCategory.HIGH_WIND: {"name": "High Wind", "icon": "💨", "color": "teal"},
    ReportCategory.OTHER_WEATHER_INCIDENT: {"name": "Other Weather Incident", "icon": "🌳", "color": "purple"},
    ReportCategory.OTHER: {"name": "Other", "icon": "📍", "color": "gray"},
}


class ReportStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class GeoPoint(BaseModel):
    """MongoDB 2dsphere GeoJSON Point model: [longitude, latitude]."""
    type: str = "Point"
    coordinates: List[float] = Field(..., min_length=2, max_length=2, description="[longitude, latitude]")


class LatLonLocation(BaseModel):
    """Human-friendly client latitude and longitude model."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")


class CommunityReportCreateRequest(BaseModel):
    """Payload for submitting a community weather report."""
    category: ReportCategory = Field(..., description="Report category identifier")
    description: str = Field(..., min_length=5, max_length=1000, description="Detailed ground-truth incident description")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS Latitude (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS Longitude (-180 to 180)")
    location_name: Optional[str] = Field(default=None, max_length=200, description="City, district, or landmark name")

    @field_validator("description")
    @classmethod
    def strip_and_validate_description(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 5:
            raise ValueError("Description must contain at least 5 non-whitespace characters.")
        return cleaned


class CommunityReportModerationRequest(BaseModel):
    """Payload for moderator verification or rejection."""
    status: ReportStatus = Field(..., description="New moderation status: VERIFIED or REJECTED")
    rejection_reason: Optional[str] = Field(default=None, max_length=500, description="Optional reason if rejected")


class CommunityReportResponse(BaseModel):
    """Publicly normalized Community Weather Report response."""
    id: str = Field(..., description="Unique report ID")
    category: str = Field(..., description="Category key")
    category_name: str = Field(..., description="Category human name")
    category_icon: str = Field(..., description="Category icon emoji")
    description: str = Field(..., description="Incident description")
    location: LatLonLocation = Field(..., description="GPS coordinates")
    location_name: Optional[str] = Field(default=None, description="Reported place name")
    image_url: Optional[str] = Field(default=None, description="Cloudinary-hosted photo URL")
    status: str = Field(..., description="Moderation status: PENDING, VERIFIED, or REJECTED")
    reported_at: datetime = Field(..., description="Server timestamp of report creation")
    source: str = Field(default="COMMUNITY", description="Always COMMUNITY. Never official IMD warning.")
    verified_at: Optional[datetime] = Field(default=None, description="Timestamp of moderation verification")
    rejection_reason: Optional[str] = Field(default=None, description="Rejection reason if report was rejected")
    user_display: str = Field(default="Community Member", description="Privacy-safe display handle without personal info")
    is_verified: bool = Field(default=False, description="True if report has been approved by a moderator")
    distance_km: Optional[float] = Field(default=None, description="Calculated distance in km when queried via nearby API")

    model_config = ConfigDict(from_attributes=True)


class CommunityReportListResponse(BaseModel):
    """Paginated list of community reports."""
    items: List[CommunityReportResponse]
    total: int
    page: int
    page_size: int


class CategoryInfo(BaseModel):
    """Category definition item for frontend category selectors."""
    id: str
    name: str
    icon: str
    color: str
