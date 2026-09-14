"""
Location Intelligence & Query Geospatial Resolution Service.
Resolves natural-language location queries, districts, coordinates,
and maps them to appropriate weather provider and station queries.
"""

from typing import Any, Dict, List, Optional, Tuple
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.db.mongo_repositories import MongoLocationRepository
from app.providers.base import WeatherProvider
from app.utils.intent_parser import extract_location


class LocationIntelligenceService:
    """
    Resolves locations from user queries, geocodes cities and districts,
    and caches geographic coordinates for downstream intelligence pipelines.
    """

    # Static fallback registry for key Indian observatories
    KNOWN_DISTRICTS: Dict[str, Dict[str, Any]] = {
        "kanpur": {"name": "Kanpur", "district": "Kanpur Nagar", "state": "Uttar Pradesh", "lat": 26.4499, "lon": 80.3319},
        "new delhi": {"name": "New Delhi", "district": "New Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090},
        "delhi": {"name": "Delhi", "district": "Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090},
        "mumbai": {"name": "Mumbai", "district": "Mumbai City", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
        "varanasi": {"name": "Varanasi", "district": "Varanasi", "state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739},
        "bengaluru": {"name": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
        "bangalore": {"name": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
        "chennai": {"name": "Chennai", "district": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
        "kolkata": {"name": "Kolkata", "district": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
        "lucknow": {"name": "Lucknow", "district": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
        "hyderabad": {"name": "Hyderabad", "district": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
        "pune": {"name": "Pune", "district": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
        "jaipur": {"name": "Jaipur", "district": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
        "ahmedabad": {"name": "Ahmedabad", "district": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
        "patna": {"name": "Patna", "district": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376},
    }

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
        2. Known district registry
        3. User saved favorites
        4. Geocoding via provider
        5. Natural language extraction from query
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
        target_name = (explicit_city or extract_location(query) or "Kanpur").strip()
        key = target_name.lower()

        # Tier 3: Check Known District Registry
        if key in self.KNOWN_DISTRICTS:
            meta = self.KNOWN_DISTRICTS[key]
            return {
                "name": meta["name"],
                "district": meta.get("district"),
                "state": meta.get("state"),
                "latitude": meta["lat"],
                "longitude": meta["lon"],
                "resolved_via": "district_registry",
            }

        # Tier 4: Check Saved User Locations
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

        # Tier 5: Geocode via Provider
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

        # Fallback default
        return {
            "name": target_name,
            "latitude": 26.4499,
            "longitude": 80.3319,
            "resolved_via": "default_fallback",
        }
