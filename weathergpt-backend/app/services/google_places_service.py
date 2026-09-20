from typing import Any, Dict, List, Optional

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import MissingAPIKeyError, WeatherProviderError


class GooglePlacesService:
    """Server-side proxy for Google Places nearby search."""

    base_url = "https://places.googleapis.com/v1/places:searchNearby"

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    async def nearby_search(
        self,
        latitude: float,
        longitude: float,
        place_type: str,
        radius: int = 5000,
    ) -> List[Dict[str, Any]]:
        api_key = self.settings.GOOGLE_PLACES_API_KEY
        if not api_key:
            raise MissingAPIKeyError(provider="Google Places")

        google_place_type = "shopping_mall" if place_type == "shop" else place_type
        payload = {
            "includedTypes": [google_place_type],
            "maxResultCount": 20,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": float(radius),
                }
            },
        }
        headers = {
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,"
                "places.location,places.rating,places.userRatingCount,"
                "places.currentOpeningHours.openNow,places.types"
            ),
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.HTTP_TIMEOUT_SECONDS) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
                response.raise_for_status()
                payload = response.json()
        except httpx.TimeoutException as exc:
            raise WeatherProviderError("Google Places request timed out.") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise WeatherProviderError("Google Places request failed.") from exc

        return [
            {
                "id": item.get("id"),
                "name": item.get("displayName", {}).get("text"),
                "address": item.get("formattedAddress"),
                "latitude": item.get("location", {}).get("latitude"),
                "longitude": item.get("location", {}).get("longitude"),
                "rating": item.get("rating"),
                "user_ratings_total": item.get("userRatingCount"),
                "open_now": item.get("currentOpeningHours", {}).get("openNow"),
                "types": item.get("types", []),
            }
            for item in payload.get("places", [])
        ]
