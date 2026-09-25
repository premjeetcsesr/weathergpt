"""
Doppler Weather Radar (DWR) Provider Architecture for WeatherGPT.
Interfaces with official S-band and C-band Doppler Radar telemetry (e.g. IMD Radar Network).
Adheres strictly to meteorological honesty rules: never fabricates radar imagery.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.schemas.radar_satellite import ProviderState


class RadarProvider(ABC):
    """Abstract interface for Doppler Radar imagery and reflectivity products."""

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Return operational status and metadata."""
        pass

    @abstractmethod
    async def get_available_products(self) -> List[Dict[str, Any]]:
        """Return list of supported radar products."""
        pass

    @abstractmethod
    async def get_layer(self, product: str = "reflectivity") -> Dict[str, Any]:
        """Return layer metadata, tile URL or image URL for map rendering."""
        pass

    @abstractmethod
    async def get_reflectivity(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch point-based reflectivity value in dBZ for given coordinates."""
        pass

    @abstractmethod
    async def get_tile(self, product: str, z: int, x: int, y: int) -> Optional[bytes]:
        """Fetch composite radar tile byte stream."""
        pass

    @abstractmethod
    async def get_image(self, product: str = "reflectivity") -> Optional[bytes]:
        """Fetch composite radar image frame byte stream."""
        pass


class IMDRadarProvider(RadarProvider):
    """
    Official India Meteorological Department (IMD) Doppler Weather Radar Provider.
    Interfaces with national DWR network (Delhi, Mumbai, Kolkata, Chennai, Lucknow, etc.).
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    @property
    def provider_name(self) -> str:
        return "IMD"

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.IMD_RADAR_ENABLED and self.settings.IMD_RADAR_BASE_URL)

    async def get_status(self) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "provider": "IMD",
                "status": ProviderState.NOT_CONFIGURED,
                "configured": False,
                "product": "reflectivity",
                "message": "Authorized radar data source is not configured.",
                "attribution": "India Meteorological Department (DWR Network)",
                "timestamp": now_iso,
            }

        # Probe health of configured radar endpoint
        try:
            headers = {}
            if self.settings.IMD_RADAR_API_KEY:
                headers["Authorization"] = f"Bearer {self.settings.IMD_RADAR_API_KEY}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(f"{self.settings.IMD_RADAR_BASE_URL}/health", headers=headers)
                status = ProviderState.ACTIVE if resp.status_code == 200 else ProviderState.UNAVAILABLE
                return {
                    "provider": "IMD",
                    "status": status,
                    "configured": True,
                    "product": "reflectivity",
                    "message": "Connected to operational IMD Doppler Weather Radar feed." if status == ProviderState.ACTIVE else "Radar feed temporarily unreachable.",
                    "attribution": "India Meteorological Department (DWR Network)",
                    "timestamp": now_iso,
                }
        except Exception as err:
            logger.warning(f"IMD Radar health check failed: {err}")
            return {
                "provider": "IMD",
                "status": ProviderState.ERROR,
                "configured": True,
                "product": "reflectivity",
                "message": f"Provider connection error: {str(err)}",
                "attribution": "India Meteorological Department (DWR Network)",
                "timestamp": now_iso,
            }

    async def get_available_products(self) -> List[Dict[str, Any]]:
        configured = self.is_configured
        return [
            {
                "product_id": "reflectivity",
                "name": "Radar Reflectivity (MAXZ)",
                "unit": "dBZ",
                "description": "Standard composite reflectivity measuring hydrometeor density, convective cells, and storm cores (0-70 dBZ).",
                "is_available": configured,
            },
            {
                "product_id": "precipitation_intensity",
                "name": "Surface Precipitation Intensity (PAC)",
                "unit": "mm/hr",
                "description": "Z-R relation derived instantaneous surface rainfall rate.",
                "is_available": configured,
            },
            {
                "product_id": "precipitation_accumulation",
                "name": "Precipitation Accumulation (24h)",
                "unit": "mm",
                "description": "24-hour cumulative hydrological rainfall accumulation.",
                "is_available": configured,
            },
        ]

    async def get_layer(self, product: str = "reflectivity") -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "provider": "IMD",
                "status": ProviderState.NOT_CONFIGURED,
                "product": product,
                "timestamp": None,
                "image_url": None,
                "tile_url_template": None,
                "bounds": [[6.0, 68.0], [38.0, 98.0]],  # Subcontinental bounding box
                "attribution": "India Meteorological Department (DWR Network)",
                "source": "IMD",
                "expires_at": None,
                "frames": [],
                "message": "Authorized radar data source is not configured.",
            }

        # If configured, provide the secure backend proxy URLs
        base_proxy = f"{self.settings.API_V1_STR}/weather/radar"
        return {
            "provider": "IMD",
            "status": ProviderState.ACTIVE,
            "product": product,
            "timestamp": now_iso,
            "image_url": f"{base_proxy}/image?product={product}",
            "tile_url_template": f"{base_proxy}/tiles/{product}/{{z}}/{{x}}/{{y}}",
            "bounds": [[6.0, 68.0], [38.0, 98.0]],
            "attribution": "India Meteorological Department (DWR Network)",
            "source": "IMD",
            "expires_at": None,
            "frames": [],
            "message": "Live Doppler Radar feed active.",
        }

    async def get_reflectivity(self, lat: float, lon: float) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "configured": False,
                "status": ProviderState.NOT_CONFIGURED,
                "provider": "IMD",
                "message": "Doppler Weather Radar (DWR) reflectivity pipeline is not configured in this environment.",
                "timestamp": now_iso,
                "dbz": None,
            }

        # Real feed query
        try:
            headers = {}
            if self.settings.IMD_RADAR_API_KEY:
                headers["Authorization"] = f"Bearer {self.settings.IMD_RADAR_API_KEY}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(
                    f"{self.settings.IMD_RADAR_BASE_URL}/reflectivity",
                    params={"lat": lat, "lon": lon},
                    headers=headers,
                )
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.warning(f"Failed to query IMD radar reflectivity: {e}")

        return {
            "configured": True,
            "status": ProviderState.UNAVAILABLE,
            "provider": "IMD",
            "message": "Radar reflectivity endpoint temporarily unreachable.",
            "timestamp": now_iso,
            "dbz": None,
        }

    async def get_tile(self, product: str, z: int, x: int, y: int) -> Optional[bytes]:
        if not self.is_configured:
            return None

        url = f"{self.settings.IMD_RADAR_BASE_URL}/tiles/{product}/{z}/{x}/{y}.png"
        headers = {}
        if self.settings.IMD_RADAR_API_KEY:
            headers["Authorization"] = f"Bearer {self.settings.IMD_RADAR_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.content
        except Exception as e:
            logger.warning(f"Error proxying radar tile: {e}")
        return None

    async def get_image(self, product: str = "reflectivity") -> Optional[bytes]:
        if not self.is_configured:
            return None

        url = f"{self.settings.IMD_RADAR_BASE_URL}/image/{product}.png"
        headers = {}
        if self.settings.IMD_RADAR_API_KEY:
            headers["Authorization"] = f"Bearer {self.settings.IMD_RADAR_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.content
        except Exception as e:
            logger.warning(f"Error proxying radar image: {e}")
        return None


class DefaultRadarProvider(IMDRadarProvider):
    """Alias/Default wrapper for IMDRadarProvider."""
    pass
