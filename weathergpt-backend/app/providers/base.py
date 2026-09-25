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

    async def get_warnings(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Fetch official meteorological warnings for location."""
        return await self.get_alerts(city=city, lat=lat, lon=lon)

    async def get_nowcast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch short-term nowcast telemetry (0-3 hours). Default indicates unavailable."""
        return {
            "available": False,
            "message": "Short-term nowcast is currently unavailable for this location from the configured provider.",
            "source": self.provider_name,
            "location": {"name": city, "lat": lat, "lon": lon},
            "points": []
        }

    async def get_rainfall(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch detailed rainfall observation and probability telemetry."""
        return {
            "available": False,
            "source": self.provider_name,
            "location": {"name": city, "lat": lat, "lon": lon},
            "pop": 0,
            "rainfall_1h_mm": 0.0
        }

    async def get_severe_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Fetch detected severe weather risk signals."""
        return []

    @abstractmethod
    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search and geocode locations by textual query."""
        pass

    @abstractmethod
    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Resolve city/location metadata from latitude and longitude coordinates."""
        pass

    @property
    def provider_name(self) -> str:
        """Identifier name for this provider."""
        return self.__class__.__name__


# Convenient alias for Section 2 specification
WeatherProvider = BaseWeatherProvider
