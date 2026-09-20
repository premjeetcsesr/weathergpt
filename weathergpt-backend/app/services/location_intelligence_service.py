"""
Location Intelligence & Query Geospatial Resolution Service.
Resolves natural-language location queries, districts, coordinates,
and maps them to appropriate weather provider and station queries.
"""

from typing import Any, Dict, List, Optional, Tuple
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.core.exceptions import LocationNotFoundError
from app.db.mongo_repositories import MongoLocationRepository
from app.providers.base import WeatherProvider
from app.utils.intent_parser import extract_location


class LocationIntelligenceService:
    """
    Resolves locations from user queries, geocodes cities and districts,
    and caches geographic coordinates for downstream intelligence pipelines.
    """

    def __init__(
        self,
        provider: WeatherProvider,
        location_repo: Optional[MongoLocationRepository] = None,
        settings: Optional[Settings] = None,
    ):
        self.provider = provider
        self.location_repo = location_repo
        self.settings = settings or get_settings()

    async def resolve_location(
        self,
        query: str,
        explicit_city: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Multi-tier location resolution:
        1. Explicit lat/lon
        2. User saved favorites
        3. Geocoding via provider
        4. Natural language extraction from query
        """
        # Tier 1: Explicit Coordinates
        if lat is not None and lon is not None:
            reverse_info = await self.provider.reverse_geocode(lat, lon)
            resolved_name = (reverse_info.get("city") or reverse_info.get("name")) if reverse_info else f"{lat:.2f},{lon:.2f}"
            return {
                "name": resolved_name,
                "latitude": lat,
                "longitude": lon,
                "resolved_via": "coordinates",
            }

        # Tier 2: Extract city from text if not explicitly provided
        target_name = (explicit_city or extract_location(query) or "").strip()
        if not target_name:
            raise LocationNotFoundError(location="No location provided")
        key = target_name.lower()

        # Tier 3: Check Saved User Locations
        if user_id and self.location_repo:
            try:
                saved = await self.location_repo.get_saved_locations(user_id=user_id)
                for item in saved:
                    if item.get("name", "").lower() == key:
                        coords = item.get("coordinates", {})
                        return {
                            "name": item["name"],
                            "latitude": coords.get("lat"),
                            "longitude": coords.get("lon"),
                            "resolved_via": "saved_favorite",
                        }
            except Exception as e:
                logger.debug(f"Saved location lookup failed: {e}")

        # Tier 4: Geocode via Provider
        try:
            results = await self.provider.search_locations(target_name, limit=1)
            if results:
                best = results[0]
                return {
                    "name": best.get("name") or target_name,
                    "district": best.get("state"),
                    "state": best.get("state"),
                    "country": best.get("country", "IN"),
                    "latitude": best.get("lat"),
                    "longitude": best.get("lon"),
                    "resolved_via": "geocoding_api",
                }
        except Exception as exc:
            logger.warning(f"Geocoding failed for '{target_name}': {exc}")

        raise LocationNotFoundError(location=target_name)
