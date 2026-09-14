"""
Short-Term Nowcasting Service (0 to 3 Hours).
Interfaces with provider nowcasting telemetry without LLM fabrication.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.providers.base import WeatherProvider
from app.schemas.intelligence import NowcastPoint, NowcastResponse


class NowcastService:
    """
    Nowcasting service for short-term convective hazards, precipitation probability,
    and rapid atmospheric shifts.
    """

    def __init__(self, provider: WeatherProvider, settings: Optional[Settings] = None):
        self.provider = provider
        self.settings = settings or get_settings()

    async def get_nowcast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> NowcastResponse:
        """
        Query provider for 0-3 hour nowcast telemetry.
        Never hallucinate nowcast values when provider cannot provide them.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            raw = await self.provider.get_nowcast(city=city, lat=lat, lon=lon)
            if raw.get("available") and raw.get("points"):
                points = [NowcastPoint.model_validate(p) for p in raw["points"]]
                max_pop = raw.get("max_rain_probability", max((p.precipitation_probability for p in points), default=0))
                return NowcastResponse(
                    available=True,
                    source=raw.get("source", getattr(self.provider, "provider_name", "OpenWeatherMap")),
                    location={"name": city, "lat": lat, "lon": lon},
                    summary=raw.get("summary", f"Short-term nowcast: Peak rain probability {max_pop}% over the next 3 hours."),
                    max_rain_probability=max_pop,
                    points=points,
                    generated_at=now_iso,
                )
        except Exception as exc:
            logger.warning(f"Nowcast retrieval failed for '{city}': {exc}")

        # Return explicit unavailable state
        return NowcastResponse(
            available=False,
            source=getattr(self.provider, "provider_name", "OpenWeatherMap"),
            location={"name": city, "lat": lat, "lon": lon},
            summary="Short-term nowcast is currently unavailable for this location.",
            max_rain_probability=0,
            points=[],
            generated_at=now_iso,
            message="Short-term nowcast is currently unavailable for this location.",
        )
