"""
OpenWeatherMap concrete implementation of WeatherProvider.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import httpx
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    LocationNotFoundError,
    MissingAPIKeyError,
    WeatherProviderError,
    WeatherProviderTimeoutError,
)
from app.core.logging import logger
from app.providers.base import BaseWeatherProvider, WeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider as LegacyOpenWeatherMapProvider


class OpenWeatherProvider(LegacyOpenWeatherMapProvider):
    """
    OpenWeatherProvider conforms to WeatherProvider interface
    and explicitly tracks source metadata as 'OpenWeatherMap'.
    """

    @property
    def provider_name(self) -> str:
        return "OpenWeatherMap"

    async def get_nowcast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Derive short-term (next 1-3 hours) nowcast telemetry from forecast hourly data.
        """
        try:
            forecast_raw = await self.get_forecast(city=city, lat=lat, lon=lon)
            hourly_list = forecast_raw.get("list", [])[:4]  # Next ~3-4 periods

            points = []
            max_pop = 0
            for item in hourly_list:
                dt_txt = item.get("dt_txt") or datetime.fromtimestamp(item.get("dt", 0), timezone.utc).isoformat()
                pop = int(round(item.get("pop", 0) * 100))
                max_pop = max(max_pop, pop)
                rain_obj = item.get("rain", {})
                rain_1h = rain_obj.get("1h", rain_obj.get("3h", 0.0) / 3.0 if "3h" in rain_obj else 0.0)

                points.append({
                    "timestamp": dt_txt,
                    "temperature": item.get("main", {}).get("temp"),
                    "condition": item.get("weather", [{}])[0].get("main", "Clear"),
                    "precipitation_probability": pop,
                    "rain_mm": round(rain_1h, 2),
                    "wind_speed": item.get("wind", {}).get("speed"),
                })

            return {
                "available": len(points) > 0,
                "source": "OpenWeatherMap",
                "location": {"name": city, "lat": lat, "lon": lon},
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "summary": f"Next 3 hours: Peak rain probability {max_pop}%.",
                "max_rain_probability": max_pop,
                "points": points,
            }
        except Exception as exc:
            logger.warning(f"Failed to generate OpenWeather nowcast for {city}: {exc}")
            return {
                "available": False,
                "source": "OpenWeatherMap",
                "message": "Short-term nowcast is currently unavailable for this location.",
                "location": {"name": city, "lat": lat, "lon": lon},
                "points": [],
            }

    async def get_warnings(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve meteorological alerts from OpenWeatherMap.
        """
        return await self.get_alerts(city=city, lat=lat, lon=lon)


# Backwards compatibility alias
OpenWeatherMapProvider = OpenWeatherProvider
