from pydantic import BaseModel, Field
from typing import Optional, List


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate between -90 and 90")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate between -180 and 180")


class MapLocation(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None

    latitude: float
    longitude: float


class NearbyReport(BaseModel):
    id: str
    category: str
    description: Optional[str] = None

    latitude: float
    longitude: float

    image_url: Optional[str] = None
    status: str = "VERIFIED"
    reported_at: Optional[str] = None

    distance_km: Optional[float] = None


class MapResponse(BaseModel):
    center: Coordinates
    reports: List[NearbyReport]
