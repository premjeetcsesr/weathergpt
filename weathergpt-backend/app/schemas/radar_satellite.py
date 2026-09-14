"""
Normalized Pydantic schemas for Radar & Satellite Provider Architecture.
Conforms to SIH 2026 meteorological data integrity and provenance standards.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProviderState(str, Enum):
    """Normalized provider operational states."""
    ACTIVE = "ACTIVE"
    CONFIGURED = "CONFIGURED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    UNAVAILABLE = "UNAVAILABLE"
    ERROR = "ERROR"
    LOADING = "LOADING"


# ---------------------------------------------------------------------------
# Doppler Weather Radar (DWR) Schemas
# ---------------------------------------------------------------------------

class RadarProduct(BaseModel):
    product_id: str = Field(..., description="Unique product identifier (e.g. 'reflectivity')")
    name: str = Field(..., description="Human-readable product name")
    unit: str = Field(default="dBZ", description="Measurement unit (e.g. 'dBZ', 'mm/hr')")
    description: str = Field(default="", description="Product description")
    is_available: bool = Field(default=False, description="Whether currently active from provider")


class RadarStatusResponse(BaseModel):
    provider: str = Field(default="IMD", description="Radar issuing authority or provider")
    status: ProviderState = Field(..., description="Operational status: ACTIVE, CONFIGURED, NOT_CONFIGURED, UNAVAILABLE, ERROR")
    configured: bool = Field(default=False, description="Whether valid provider credentials are set")
    product: str = Field(default="reflectivity", description="Primary radar product")
    message: str = Field(default="", description="Descriptive status or diagnostic message")
    attribution: str = Field(default="India Meteorological Department (DWR Network)", description="Official provider attribution")
    timestamp: str = Field(..., description="Timestamp of status evaluation (ISO 8601)")


class RadarProductListResponse(BaseModel):
    provider: str = Field(default="IMD")
    status: ProviderState = Field(...)
    products: List[RadarProduct] = Field(default_factory=list)


class RadarAnimationFrame(BaseModel):
    timestamp: str = Field(..., description="Frame timestamp (ISO 8601)")
    time_label: str = Field(..., description="Human readable timestamp e.g. '10:15 IST'")
    image_url: Optional[str] = None
    tile_url_template: Optional[str] = None


class RadarLayerResponse(BaseModel):
    provider: str = Field(default="IMD", description="Radar data provider")
    status: ProviderState = Field(..., description="Current layer status")
    product: str = Field(default="reflectivity", description="Selected radar product")
    timestamp: Optional[str] = Field(default=None, description="Timestamp of latest scan")
    image_url: Optional[str] = Field(default=None, description="Raster composite image URL if available")
    tile_url_template: Optional[str] = Field(default=None, description="Slippy tile template URL if available")
    bounds: Optional[List[List[float]]] = Field(default=None, description="Geographic bounding box [[south, west], [north, east]]")
    attribution: str = Field(default="India Meteorological Department (DWR Network)", description="Data provenance attribution")
    source: str = Field(default="IMD", description="Underlying provider")
    expires_at: Optional[str] = Field(default=None, description="Cache expiration timestamp")
    frames: List[RadarAnimationFrame] = Field(default_factory=list, description="Animation frames for Doppler loop")
    message: Optional[str] = Field(default=None, description="Advisory or fallback explanation message")


# ---------------------------------------------------------------------------
# Meteorological Satellite (INSAT-3D / 3DR / 3DS) Schemas
# ---------------------------------------------------------------------------

class SatelliteProduct(BaseModel):
    product_id: str = Field(..., description="Product channel (e.g. 'visible', 'infrared_tir1', 'water_vapour')")
    name: str = Field(..., description="Product channel name")
    channel: str = Field(..., description="Spectral band/channel code e.g. 'VIS', 'TIR1', 'WV'")
    description: str = Field(default="", description="Meteorological analysis utility")
    is_available: bool = Field(default=False)


class SatelliteStatusResponse(BaseModel):
    provider: str = Field(default="IMD")
    satellite: str = Field(default="INSAT-3D")
    status: ProviderState = Field(...)
    configured: bool = Field(default=False)
    product: str = Field(default="visible")
    message: str = Field(default="")
    attribution: str = Field(default="India Meteorological Department / ISRO (INSAT-3D/3DR)")
    timestamp: str = Field(...)


class SatelliteProductListResponse(BaseModel):
    provider: str = Field(default="IMD")
    satellite: str = Field(default="INSAT-3D")
    status: ProviderState = Field(...)
    products: List[SatelliteProduct] = Field(default_factory=list)


class SatelliteAnimationFrame(BaseModel):
    timestamp: str = Field(..., description="Pass timestamp (ISO 8601)")
    time_label: str = Field(..., description="Formatted pass time e.g. '12:00 UTC'")
    image_url: Optional[str] = None
    tile_url_template: Optional[str] = None


class SatelliteLayerResponse(BaseModel):
    provider: str = Field(default="IMD")
    satellite: str = Field(default="INSAT-3D")
    status: ProviderState = Field(...)
    product: str = Field(default="visible")
    timestamp: Optional[str] = None
    image_url: Optional[str] = None
    tile_url_template: Optional[str] = None
    bounds: Optional[List[List[float]]] = None
    source: str = Field(default="IMD / ISRO")
    attribution: str = Field(default="India Meteorological Department / ISRO")
    expires_at: Optional[str] = None
    frames: List[SatelliteAnimationFrame] = Field(default_factory=list)
    message: Optional[str] = None
