"""
Future-ready Numerical Weather Prediction (NWP) Provider Architecture.
Interfaces with High-Resolution Numerical Models (e.g. GFS, WRF, NCMRWF Unified Model).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import Settings, get_settings


class NWPProvider(ABC):
    """
    Abstract interface for Numerical Weather Prediction (NWP) models.
    Supports GFS, WRF, and high-resolution mesoscale assimilation systems.
    """

    @property
    @abstractmethod
    def model_name(self) -> str:
        """E.g. 'GFS-0.25', 'WRF-3km', 'NCMRWF-UM'"""
        pass

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def get_forecast(self, lat: float, lon: float, hours: int = 72) -> Dict[str, Any]:
        """Model run gridded forecast data."""
        pass

    @abstractmethod
    async def get_temperature(self, lat: float, lon: float) -> Optional[float]:
        """2m Surface Temperature from model grid."""
        pass

    @abstractmethod
    async def get_precipitation(self, lat: float, lon: float) -> Optional[float]:
        """Total accumulated precipitation from model grid."""
        pass

    @abstractmethod
    async def get_wind(self, lat: float, lon: float) -> Optional[Dict[str, float]]:
        """10m U and V wind vectors."""
        pass


class DefaultNWPProvider(NWPProvider):
    """
    Standard implementation reporting transparent unconfigured status.
    Avoids claiming GFS or WRF is live until data pipelines are connected.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    @property
    def model_name(self) -> str:
        return "NWP-Future-Ready"

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.ENABLE_NWP_PROVIDER)

    async def get_forecast(self, lat: float, lon: float, hours: int = 72) -> Dict[str, Any]:
        return {
            "configured": False,
            "model": self.model_name,
            "status": "NWP provider not configured",
            "message": "Numerical Weather Prediction (GFS/WRF) integration is architecturally ready but not currently configured with live model servers.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def get_temperature(self, lat: float, lon: float) -> Optional[float]:
        return None

    async def get_precipitation(self, lat: float, lon: float) -> Optional[float]:
        return None

    async def get_wind(self, lat: float, lon: float) -> Optional[Dict[str, float]]:
        return None
