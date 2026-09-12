from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseWeatherProvider(ABC):
    """Abstract interface for weather data providers."""

    @abstractmethod
    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch current weather raw telemetry from provider."""
        pass

    @abstractmethod
    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch forecast data from provider."""
        pass

    @abstractmethod
    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Fetch active meteorological warnings/alerts for location."""
        pass

    @abstractmethod
    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search and geocode locations by textual query."""
        pass

    @abstractmethod
    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Resolve city/location metadata from latitude and longitude coordinates."""
        pass
