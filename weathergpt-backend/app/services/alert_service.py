from typing import List, Optional
from app.core.config import Settings, get_settings
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.schemas.alerts import AlertsResponse, WeatherAlertItem


class AlertService:
    """Service to handle meteorological emergency warnings and alerts."""

    def __init__(
        self,
        provider: Optional[BaseWeatherProvider] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.provider = provider or OpenWeatherMapProvider(settings=self.settings)

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> AlertsResponse:
        """
        Fetch active alerts for location.
        Standard OpenWeatherMap 2.5 returns an empty list without fabricating government warnings.
        """
        raw_alerts = await self.provider.get_alerts(city=city, lat=lat, lon=lon)

        alert_items: List[WeatherAlertItem] = []
        for raw in raw_alerts:
            alert_items.append(
                WeatherAlertItem(
                    id=str(raw.get("id", "alert-001")),
                    title=str(raw.get("title", "Weather Advisory")),
                    severity=str(raw.get("severity", "Information")),
                    category=str(raw.get("category", "General")),
                    location=city,
                    headline=str(raw.get("headline", "")),
                    description=str(raw.get("description", "")),
                    start_time=raw.get("start_time"),
                    end_time=raw.get("end_time"),
                    urgency=raw.get("urgency", "Expected"),
                    certainty=raw.get("certainty", "Likely"),
                    safety_recommendation=raw.get("safety_recommendation"),
                    source=str(raw.get("source", "Meteorological Authority")),
                )
            )

        note = (
            "No active severe government weather alerts currently detected for this zone by OpenWeatherMap."
            if not alert_items
            else None
        )

        return AlertsResponse(
            location=city,
            alerts=alert_items,
            total_alerts=len(alert_items),
            provider_note=note,
        )
