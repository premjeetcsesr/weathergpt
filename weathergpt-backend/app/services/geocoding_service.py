from typing import List, Optional
from app.core.config import Settings, get_settings
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.schemas.location import LocationItem


class GeocodingService:
    """Service to handle forward and reverse geocoding lookups."""

    def __init__(
        self,
        provider: Optional[BaseWeatherProvider] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.provider = provider or OpenWeatherMapProvider(settings=self.settings)

    async def search_locations(self, query: str, limit: int = 5) -> List[LocationItem]:
        """Search locations matching textual query string."""
        raw_list = await self.provider.search_locations(query=query, limit=limit)
        results: List[LocationItem] = []

        for item in raw_list:
            results.append(
                LocationItem(
                    name=item.get("name", query),
                    region=item.get("state"),
                    country=item.get("country", "Global"),
                    latitude=float(item.get("lat", 0.0)),
                    longitude=float(item.get("lon", 0.0)),
                )
            )

        return results

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[LocationItem]:
        """Resolve city name and metadata from latitude and longitude."""
        item = await self.provider.reverse_geocode(lat=lat, lon=lon)
        if not item:
            return None
        return LocationItem(
            name=item.get("name", "Unknown"),
            region=item.get("state"),
            country=item.get("country", "Global"),
            latitude=lat,
            longitude=lon,
        )
