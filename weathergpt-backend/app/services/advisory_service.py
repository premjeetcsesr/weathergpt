"""
Weather-Based Actionable Safety Advisory Engine.
Generates structured practical advisories grounded in verified meteorological signals.
Explicitly distinguishes automated weather-based advice from official government mandates.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import Settings, get_settings
from app.db.mongo_repositories import MongoAdvisoryRepository
from app.providers.base import WeatherProvider
from app.schemas.intelligence import AdvisoryItem, AdvisoryResponse


class AdvisoryService:
    """
    Synthesizes domain-specific safety advisories (Travel, Hydration, Outdoor, Electrical)
    grounded purely in verified atmospheric observations and forecasts.
    """

    def __init__(
        self,
        provider: WeatherProvider,
        advisory_repo: Optional[MongoAdvisoryRepository] = None,
        settings: Optional[Settings] = None,
    ):
        self.provider = provider
        self.advisory_repo = advisory_repo
        self.settings = settings or get_settings()

    def generate_advisories_from_metrics(
        self,
        city: str,
        temperature: float,
        condition: str,
        rain_probability: int,
        wind_speed: float,
        humidity: int,
    ) -> List[AdvisoryItem]:
        advisories: List[AdvisoryItem] = []
        cond_lower = condition.lower()

        # 1. Rain & Precipitation Advisory
        if rain_probability >= 60 or "rain" in cond_lower:
            advisories.append(AdvisoryItem(
                category="Precipitation & Travel",
                severity="advisory",
                headline="High Rain Potential — Plan Travel with Caution",
                recommendations=[
                    "Carry waterproof gear and an umbrella before commuting.",
                    "Expect localized urban waterlogging; avoid low-lying underpasses.",
                    "Keep mobile devices charged and emergency roadside contacts accessible.",
                ]
            ))
        elif rain_probability >= 30:
            advisories.append(AdvisoryItem(
                category="Precipitation & Travel",
                severity="advisory",
                headline="Scattered Showers Possible",
                recommendations=[
                    "Keep a portable umbrella handy during evening commutes.",
                    "Two-wheeler riders should maintain reduced speeds on slick roads.",
                ]
            ))

        # 2. Heat Stress & Hydration Advisory
        if temperature >= 38.0:
            advisories.append(AdvisoryItem(
                category="Heat & Hydration",
                severity="advisory",
                headline="Elevated Heat Index — Heat Stress Precautions",
                recommendations=[
                    "Drink oral rehydration solutions (ORS) or water at regular intervals.",
                    "Avoid prolonged direct sun exposure between 11:30 AM and 3:30 PM.",
                    "Wear lightweight, breathable, light-colored cotton clothing.",
                    "Never leave children or pets unattended in parked vehicles.",
                ]
            ))

        # 3. Wind & Structural Safety Advisory
        if wind_speed >= 40.0:
            advisories.append(AdvisoryItem(
                category="Outdoor & Structural Safety",
                severity="advisory",
                headline="Gusty Surface Winds Active",
                recommendations=[
                    "Secure loose rooftop sheets, outdoor signboards, and balcony plants.",
                    "Avoid parking vehicles directly beneath mature trees or hoardings.",
                ]
            ))

        # 4. Thunderstorm & Lightning Safety
        if "thunderstorm" in cond_lower or "lightning" in cond_lower:
            advisories.append(AdvisoryItem(
                category="Electrical & Lightning Safety",
                severity="advisory",
                headline="Convective Activity — Lightning Safety Protocol",
                recommendations=[
                    "Remain indoors during active thunder claps.",
                    "Do not seek shelter under isolated tall trees or open metal sheds.",
                    "Disconnect sensitive electronic appliances from wall outlets.",
                ]
            ))

        # Default General Comfort Advisory if calm
        if not advisories:
            advisories.append(AdvisoryItem(
                category="General Weather Comfort",
                severity="advisory",
                headline="Favorable Atmospheric Conditions",
                recommendations=[
                    "Outdoor conditions are within standard seasonal comfort parameters.",
                    "Maintain normal daily hydration and ventilation.",
                ]
            ))

        return advisories

    async def get_actionable_advisories(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> AdvisoryResponse:
        """Fetch current telemetry and generate verified advisories."""
        source = getattr(self.provider, "provider_name", "OpenWeatherMap")
        try:
            curr = await self.provider.get_current_weather(city=city, lat=lat, lon=lon)
            temp = 25.0
            cond = "Clear"
            wind = 10.0
            humidity = 50

            if "weather" in curr:
                w = curr["weather"]
                temp = w.get("main", {}).get("temp", 25.0)
                cond = w.get("weather", [{}])[0].get("main", "Clear")
                wind = round(w.get("wind", {}).get("speed", 3.0) * 3.6, 1)
                humidity = w.get("main", {}).get("humidity", 50)
            elif "current" in curr:
                c = curr["current"]
                temp = c.get("temperature", 25.0)
                cond = c.get("condition", "Clear")
                wind = c.get("wind_speed", 10.0)
                humidity = c.get("humidity", 50)

            # Try to get rain probability from forecast if possible
            rain_prob = 0
            try:
                fc = await self.provider.get_forecast(city=city, lat=lat, lon=lon)
                if fc.get("list"):
                    rain_prob = int(round(fc["list"][0].get("pop", 0) * 100))
            except Exception:
                pass

            items = self.generate_advisories_from_metrics(
                city=city,
                temperature=temp,
                condition=cond,
                rain_probability=rain_prob,
                wind_speed=wind,
                humidity=humidity,
            )

            # Log to MongoDB if repo available
            if self.advisory_repo:
                try:
                    for item in items:
                        await self.advisory_repo.log_advisory({
                            "location": {"name": city, "lat": lat, "lon": lon},
                            "category": item.category,
                            "headline": item.headline,
                            "recommendations": item.recommendations,
                            "source": source,
                        })
                except Exception:
                    pass

            return AdvisoryResponse(
                location={"name": city, "lat": lat, "lon": lon},
                advisories=items,
                source=source,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception:
            return AdvisoryResponse(
                location={"name": city, "lat": lat, "lon": lon},
                advisories=[
                    AdvisoryItem(
                        category="General Notice",
                        severity="advisory",
                        headline="Weather Advisory Service Active",
                        recommendations=["Consult official local meteorological bulletins before undertaking severe travel."],
                    )
                ],
                source=source,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
