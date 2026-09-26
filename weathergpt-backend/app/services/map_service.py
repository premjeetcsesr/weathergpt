from typing import Optional, Dict, Any
import httpx
from app.core.logging import logger


class MapService:
    """
    Map Service for reverse-geocoding coordinates to human-readable locations
    and geospatial helpers.
    """

    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """
        Convert latitude/longitude into a human-readable location.
        Uses OpenStreetMap Nominatim with graceful fallback.
        """
        url = "https://nominatim.openstreetmap.org/reverse"

        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "jsonv2",
            "zoom": 18,
            "addressdetails": 1,
        }

        headers = {
            "User-Agent": "WeatherGPT/1.0 (weathergpt-osm-client)"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    url,
                    params=params,
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    address = data.get("address", {})

                    name = (
                        address.get("suburb")
                        or address.get("neighbourhood")
                        or address.get("residential")
                        or address.get("town")
                        or address.get("city")
                        or address.get("village")
                        or address.get("county")
                    )

                    city = (
                        address.get("city")
                        or address.get("town")
                        or address.get("village")
                        or address.get("municipality")
                        or address.get("county")
                    )

                    district = (
                        address.get("state_district")
                        or address.get("district")
                        or address.get("county")
                    )

                    return {
                        "name": name or city or f"Loc ({latitude:.3f}, {longitude:.3f})",
                        "display_name": data.get("display_name") or f"{latitude:.4f}, {longitude:.4f}",
                        "city": city,
                        "district": district,
                        "state": address.get("state"),
                        "country": address.get("country"),
                        "country_code": address.get("country_code"),
                        "latitude": latitude,
                        "longitude": longitude,
                    }
                else:
                    logger.warning(
                        f"Nominatim returned status {response.status_code} for lat={latitude}, lon={longitude}"
                    )
        except Exception as exc:
            logger.warning(f"Error during reverse geocoding ({latitude}, {longitude}): {exc}")

        # Fallback if Nominatim request times out or fails
        return {
            "name": f"Location ({latitude:.3f}, {longitude:.3f})",
            "display_name": f"{latitude:.4f}, {longitude:.4f}",
            "city": None,
            "district": None,
            "state": None,
            "country": None,
            "country_code": None,
            "latitude": latitude,
            "longitude": longitude,
        }


map_service = MapService()
