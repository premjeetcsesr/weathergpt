"""
Meteorological Satellite Provider Architecture for WeatherGPT.
Interfaces with geostationary payloads (e.g. INSAT-3D, INSAT-3DR, INSAT-3DS) via IMD / MOSDAC / ISRO.
Adheres strictly to meteorological honesty rules: never fabricates satellite imagery.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.schemas.radar_satellite import ProviderState


class SatelliteProvider(ABC):
    """Abstract interface for meteorological satellite observation payloads."""

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
        """Return list of supported satellite channel products."""
        pass

    @abstractmethod
    async def get_layer(self, product: str = "visible") -> Dict[str, Any]:
        """Return layer metadata, tile URL, image URL, and spatial bounds."""
        pass

    @abstractmethod
    async def get_latest_pass(self, region: str = "IN") -> Dict[str, Any]:
        """Fetch latest satellite scan metadata and cloud brightness temperature."""
        pass

    @abstractmethod
    async def get_tile(self, product: str, zoom: int, x: int, y: int) -> Optional[bytes]:
        """Fetch satellite channel tile for map overlay."""
        pass

    @abstractmethod
    async def get_image(self, product: str = "visible") -> Optional[bytes]:
        """Fetch full-disk or sectoral satellite composite image."""
        pass


class IMDSatelliteProvider(SatelliteProvider):
    """
    Official India Meteorological Department / ISRO INSAT-3D/3DR/3DS Geostationary Provider.
    Channels include: VIS (0.65 µm), TIR1 (10.8 µm), WV (6.7 µm), and Color-Enhanced IR.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    @property
    def provider_name(self) -> str:
        return "IMD"

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.IMD_SATELLITE_ENABLED and self.settings.IMD_SATELLITE_BASE_URL)

    async def get_status(self) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "provider": "IMD",
                "satellite": "INSAT-3D",
                "status": ProviderState.NOT_CONFIGURED,
                "configured": False,
                "product": "visible",
                "message": "Authorized satellite data source is not configured.",
                "attribution": "India Meteorological Department / ISRO (INSAT-3D/3DR)",
                "timestamp": now_iso,
            }

        # Check health of configured feed
        try:
            headers = {}
            if self.settings.IMD_SATELLITE_API_KEY:
                headers["Authorization"] = f"Bearer {self.settings.IMD_SATELLITE_API_KEY}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(f"{self.settings.IMD_SATELLITE_BASE_URL}/health", headers=headers)
                status = ProviderState.ACTIVE if resp.status_code == 200 else ProviderState.UNAVAILABLE
                return {
                    "provider": "IMD",
                    "satellite": "INSAT-3D",
                    "status": status,
                    "configured": True,
                    "product": "visible",
                    "message": "Connected to operational INSAT-3D/3DR satellite imagery pipeline." if status == ProviderState.ACTIVE else "Satellite feed temporarily unreachable.",
                    "attribution": "India Meteorological Department / ISRO (INSAT-3D/3DR)",
                    "timestamp": now_iso,
                }
        except Exception as err:
            logger.warning(f"IMD Satellite health check error: {err}")
            return {
                "provider": "IMD",
                "satellite": "INSAT-3D",
                "status": ProviderState.ERROR,
                "configured": True,
                "product": "visible",
                "message": f"Provider connection error: {str(err)}",
                "attribution": "India Meteorological Department / ISRO (INSAT-3D/3DR)",
                "timestamp": now_iso,
            }

    async def get_available_products(self) -> List[Dict[str, Any]]:
        configured = self.is_configured
        return [
            {
                "product_id": "visible",
                "name": "Visible Imagery (VIS)",
                "channel": "VIS (0.65 µm)",
                "description": "High-resolution solar reflectance channel for daytime cloud geometry, fog detection, and storm convection.",
                "is_available": configured,
            },
            {
                "product_id": "infrared_tir1",
                "name": "Thermal Infrared (TIR1)",
                "channel": "TIR1 (10.8 µm)",
                "description": "24/7 day/night thermal infrared radiation measuring cloud-top temperature and deep convective towers.",
                "is_available": configured,
            },
            {
                "product_id": "water_vapour",
                "name": "Water Vapour Channel (WV)",
                "channel": "WV (6.7 µm)",
                "description": "Mid-to-upper tropospheric moisture tracking jet streams and cyclonic circulation dynamics.",
                "is_available": configured,
            },
            {
                "product_id": "cloud_motion_vectors",
                "name": "Cloud Motion Vectors (CMV)",
                "channel": "Derived",
                "description": "Derived wind vectors tracking atmospheric movement between successive scans.",
                "is_available": configured,
            },
        ]

    async def get_layer(self, product: str = "visible") -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "provider": "IMD",
                "satellite": "INSAT-3D",
                "status": ProviderState.NOT_CONFIGURED,
                "product": product,
                "timestamp": None,
                "image_url": None,
                "tile_url_template": None,
                "bounds": [[-10.0, 40.0], [50.0, 115.0]],  # Indian Ocean & South Asian sector
                "source": "IMD / ISRO",
                "attribution": "India Meteorological Department / ISRO",
                "expires_at": None,
                "frames": [],
                "message": "Authorized satellite data source is not configured.",
            }

        base_proxy = f"{self.settings.API_V1_STR}/weather/satellite"
        return {
            "provider": "IMD",
            "satellite": "INSAT-3D",
            "status": ProviderState.ACTIVE,
            "product": product,
            "timestamp": now_iso,
            "image_url": f"{base_proxy}/image?product={product}",
            "tile_url_template": f"{base_proxy}/tiles/{product}/{{z}}/{{x}}/{{y}}",
            "bounds": [[-10.0, 40.0], [50.0, 115.0]],
            "source": "IMD / ISRO",
            "attribution": "India Meteorological Department / ISRO",
            "expires_at": None,
            "frames": [],
            "message": "Live INSAT-3D satellite imagery feed active.",
        }

    async def get_latest_pass(self, region: str = "IN") -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "configured": False,
                "status": ProviderState.NOT_CONFIGURED,
                "provider": "IMD",
                "satellite": "INSAT-3D",
                "message": "INSAT-3D/3DR satellite imagery pipeline is not configured in this environment.",
                "timestamp": now_iso,
            }

        try:
            headers = {}
            if self.settings.IMD_SATELLITE_API_KEY:
                headers["Authorization"] = f"Bearer {self.settings.IMD_SATELLITE_API_KEY}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(
                    f"{self.settings.IMD_SATELLITE_BASE_URL}/latest-pass",
                    params={"region": region},
                    headers=headers,
                )
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.warning(f"Failed to query IMD satellite pass: {e}")

        return {
            "configured": True,
            "status": ProviderState.UNAVAILABLE,
            "provider": "IMD",
            "satellite": "INSAT-3D",
            "message": "Satellite pass telemetry endpoint temporarily unreachable.",
            "timestamp": now_iso,
        }

    async def get_tile(self, product: str, zoom: int, x: int, y: int) -> Optional[bytes]:
        if not self.is_configured:
            return None

        url = f"{self.settings.IMD_SATELLITE_BASE_URL}/tiles/{product}/{zoom}/{x}/{y}.png"
        headers = {}
        if self.settings.IMD_SATELLITE_API_KEY:
            headers["Authorization"] = f"Bearer {self.settings.IMD_SATELLITE_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.content
        except Exception as e:
            logger.warning(f"Error proxying satellite tile: {e}")
        return None

    async def get_image(self, product: str = "visible") -> Optional[bytes]:
        if not self.is_configured:
            return None

        url = f"{self.settings.IMD_SATELLITE_BASE_URL}/image/{product}.png"
        headers = {}
        if self.settings.IMD_SATELLITE_API_KEY:
            headers["Authorization"] = f"Bearer {self.settings.IMD_SATELLITE_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.content
        except Exception as e:
            logger.warning(f"Error proxying satellite image: {e}")
        return None


class DefaultSatelliteProvider(IMDSatelliteProvider):
    """Alias/Default wrapper for IMDSatelliteProvider."""
    pass
