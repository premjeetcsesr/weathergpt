from typing import Optional
from pydantic import BaseModel, Field


class LocationItem(BaseModel):
    """Geocoded location search result item."""

    name: str = Field(..., examples=["Kanpur"], description="Locality or city name")
    region: Optional[str] = Field(default=None, examples=["Uttar Pradesh"], description="State or administrative region")
    country: str = Field(..., examples=["India"], description="Country name or code")
    latitude: float = Field(..., examples=[26.4499], description="Latitude")
    longitude: float = Field(..., examples=[80.3319], description="Longitude")
