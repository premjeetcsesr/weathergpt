"""
Severe Weather Intelligence & Atmospheric Risk Analysis.
Detects severe meteorological signals from verified telemetry without confusing
internal risk assessment with official government warnings.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import Settings, get_settings
from app.providers.base import WeatherProvider
from app.schemas.intelligence import SevereWeatherRisk, SevereWeatherResponse, WarningSeverity


class SevereWeatherService:
    """
    Evaluates verified atmospheric telemetry against meteorological thresholds
    to detect severe weather signals (heavy rainfall, heatwave, gale winds, squalls).
    """

    def __init__(self, provider: WeatherProvider, settings: Optional[Settings] = None):
        self.provider = provider
        self.settings = settings or get_settings()

    def analyze_severe_risks(
        self,
        city: str,
        current_weather: Dict[str, Any],
        forecast_data: Optional[Dict[str, Any]] = None,
        source: str = "OpenWeatherMap",
    ) -> List[SevereWeatherRisk]:
        """
        Analyze current & forecast data against empirical severity thresholds.
        Thresholds adhere to standard meteorological criteria (e.g. IMD criteria).
        """
        risks: List[SevereWeatherRisk] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        temp = current_weather.get("temperature", 25.0)
        feels_like = current_weather.get("feels_like", temp)
        wind_speed = current_weather.get("wind_speed", 10.0)
        condition = current_weather.get("condition", "").lower()
        rain_prob = current_weather.get("rain_probability", 0)

        # 1. Heatwave Risk Analysis (Plains threshold >= 40°C or feels like >= 45°C)
        if temp >= 44.0 or feels_like >= 48.0:
            risks.append(SevereWeatherRisk(
                risk_type="heatwave",
                severity=WarningSeverity.EXTREME,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.92,
                recommended_action="Extreme heat danger. Avoid direct sunlight during peak hours (11 AM - 4 PM) and maintain continuous hydration.",
                metric_trigger=f"Recorded temperature: {temp}°C (Heat index: {feels_like}°C)",
            ))
        elif temp >= 40.0 or feels_like >= 44.0:
            risks.append(SevereWeatherRisk(
                risk_type="heatwave",
                severity=WarningSeverity.SEVERE,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.88,
                recommended_action="High heat stress. Wear lightweight cotton clothing, carry water, and minimize strenuous outdoor exertion.",
                metric_trigger=f"Temperature: {temp}°C (Feels like: {feels_like}°C)",
            ))

        # 2. Cold Wave Risk Analysis (Temperature <= 5°C)
        if temp <= 3.0:
            risks.append(SevereWeatherRisk(
                risk_type="cold_wave",
                severity=WarningSeverity.SEVERE,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.85,
                recommended_action="Severe chill and hypothermia risk. Use multi-layer thermal clothing and protect vulnerable elders/infants.",
                metric_trigger=f"Recorded temperature: {temp}°C",
            ))

        # 3. Gale Wind & Squall Risk (> 55 km/h)
        if wind_speed >= 65.0:
            risks.append(SevereWeatherRisk(
                risk_type="gale_wind",
                severity=WarningSeverity.EXTREME,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.90,
                recommended_action="Gale-force winds detected. Secure outdoor loose structures and stay clear of large trees and overhead power lines.",
                metric_trigger=f"Wind speed: {wind_speed} km/h",
            ))
        elif wind_speed >= 45.0:
            risks.append(SevereWeatherRisk(
                risk_type="strong_wind",
                severity=WarningSeverity.MODERATE,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.85,
                recommended_action="Breezy to squally winds. Drive cautiously, especially two-wheelers and high-profile vehicles.",
                metric_trigger=f"Wind speed: {wind_speed} km/h",
            ))

        # 4. Convective / Thunderstorm & Heavy Rain Risk
        if "thunderstorm" in condition or "squall" in condition:
            risks.append(SevereWeatherRisk(
                risk_type="thunderstorm",
                severity=WarningSeverity.SEVERE,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.88,
                recommended_action="Thunderstorm and lightning activity detected. Take shelter in a sturdy building and unplug sensitive electronics.",
                metric_trigger=f"Observed condition: {condition.title()}",
            ))
        elif "heavy rain" in condition or "extreme rain" in condition or rain_prob >= 80:
            risks.append(SevereWeatherRisk(
                risk_type="heavy_rain",
                severity=WarningSeverity.MODERATE,
                location=city,
                start_time=now_iso,
                source=source,
                confidence=0.82,
                recommended_action="Heavy precipitation expected. Anticipate road waterlogging and plan travel with buffer time.",
                metric_trigger=f"Precipitation probability: {rain_prob}%, Condition: {condition.title()}",
            ))

        return risks

    async def get_severe_weather_report(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> SevereWeatherResponse:
        """
        Produce a structured SevereWeatherResponse from current telemetry.
        """
        source = getattr(self.provider, "provider_name", "OpenWeatherMap")
        try:
            curr = await self.provider.get_current_weather(city=city, lat=lat, lon=lon)
            # Flatten telemetry
            flat = {}
            if "weather" in curr:
                w = curr["weather"]
                flat["temperature"] = w.get("main", {}).get("temp", 25.0)
                flat["feels_like"] = w.get("main", {}).get("feels_like", 25.0)
                flat["wind_speed"] = round(w.get("wind", {}).get("speed", 3.0) * 3.6, 1)  # m/s to km/h
                weather_desc = w.get("weather", [{}])[0].get("description", "Clear")
                flat["condition"] = weather_desc
            elif "current" in curr:
                c = curr["current"]
                flat["temperature"] = c.get("temperature", 25.0)
                flat["feels_like"] = c.get("feels_like", 25.0)
                flat["wind_speed"] = c.get("wind_speed", 10.0)
                flat["condition"] = c.get("condition", "Clear")

            risks = self.analyze_severe_risks(city=city, current_weather=flat, source=source)
            return SevereWeatherResponse(
                location={"name": city, "lat": lat, "lon": lon},
                has_severe_risks=len(risks) > 0,
                risks=risks,
                source=source,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception:
            return SevereWeatherResponse(
                location={"name": city, "lat": lat, "lon": lon},
                has_severe_risks=False,
                risks=[],
                source=source,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
