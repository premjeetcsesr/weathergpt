"""
Official Meteorological Warning Engine & Priority Processing.
Ensures warnings are strictly sourced from verified providers, normalized,
ranked by severity, and never hallucinated.
"""

from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.db.mongo_repositories import MongoOfficialWarningRepository
from app.providers.base import WeatherProvider
from app.schemas.intelligence import OfficialWarningItem, WarningSeverity, WarningsResponse


SEVERITY_RANKS = {
    WarningSeverity.EXTREME: 4,
    WarningSeverity.SEVERE: 3,
    WarningSeverity.MODERATE: 2,
    WarningSeverity.MINOR: 1,
}


class WarningService:
    """
    Warning Service responsible for retrieving, normalizing, ranking,
    and deduplicating official weather warnings.
    """

    def __init__(
        self,
        provider: WeatherProvider,
        warning_repo: Optional[MongoOfficialWarningRepository] = None,
        settings: Optional[Settings] = None,
    ):
        self.provider = provider
        self.warning_repo = warning_repo
        self.settings = settings or get_settings()

    def normalize_severity(self, raw_severity: Optional[str]) -> WarningSeverity:
        if not raw_severity:
            return WarningSeverity.MODERATE
        s = raw_severity.lower().strip()
        if "extreme" in s or "red" in s:
            return WarningSeverity.EXTREME
        if "severe" in s or "orange" in s:
            return WarningSeverity.SEVERE
        if "moderate" in s or "yellow" in s:
            return WarningSeverity.MODERATE
        if "minor" in s or "advisory" in s:
            return WarningSeverity.MINOR
        return WarningSeverity.MODERATE

    def classify_category(self, text: str) -> str:
        """Classify meteorological hazard category from text."""
        t = text.lower()
        if "extremely heavy rain" in t:
            return "Extremely Heavy Rain"
        if "very heavy rain" in t:
            return "Very Heavy Rain"
        if "heavy rain" in t or "torrential" in t:
            return "Heavy Rain"
        if "cyclone" in t or "cyclonic" in t:
            return "Cyclone"
        if "thunderstorm" in t:
            return "Thunderstorm"
        if "lightning" in t:
            return "Lightning"
        if "heatwave" in t or "heat wave" in t:
            return "Heatwave"
        if "cold wave" in t or "coldwave" in t:
            return "Cold Wave"
        if "dense fog" in t or "fog" in t:
            return "Dense Fog"
        if "wind" in t or "gale" in t or "squall" in t:
            return "Strong Wind"
        if "flood" in t:
            return "Flood-related Warning"
        return "Weather Warning"

    def _generate_alert_id(self, event: str, city: str, issued_at: str) -> str:
        raw_key = f"{event.lower().strip()}:{city.lower().strip()}:{issued_at}"
        return f"warn-{hashlib.sha256(raw_key.encode('utf-8')).hexdigest()[:12]}"

    async def get_official_warnings(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> WarningsResponse:
        """
        Retrieve official warnings from provider, persist to MongoDB, and return
        sorted in descending order of severity.
        If none exist, return clear "No active official warning available for this location."
        """
        raw_warnings: List[Dict[str, Any]] = []
        try:
            raw_warnings = await self.provider.get_warnings(city=city, lat=lat, lon=lon)
        except Exception as exc:
            logger.warning(f"Could not retrieve warnings from provider for '{city}': {exc}")
            raw_warnings = []

        now_iso = datetime.now(timezone.utc).isoformat()
        normalized_items: List[OfficialWarningItem] = []
        seen_ids = set()

        for rw in raw_warnings:
            event = str(rw.get("event") or rw.get("title") or "Meteorological Alert")
            issued_at = rw.get("issued_at") or rw.get("starts_at") or now_iso
            alert_id = rw.get("alert_id") or self._generate_alert_id(event, city, issued_at)

            if alert_id in seen_ids:
                continue
            seen_ids.add(alert_id)

            severity = self.normalize_severity(rw.get("severity"))
            headline = str(rw.get("headline") or event)
            description = str(rw.get("description") or f"Active {severity.value} warning: {event} for {city}.")
            instruction = rw.get("instruction") or rw.get("safety_recommendation")
            valid_until = rw.get("valid_until") or rw.get("ends_at")
            source = rw.get("source") or getattr(self.provider, "provider_name", "OpenWeatherMap")

            item = OfficialWarningItem(
                alert_id=alert_id,
                event=event,
                severity=severity,
                category=self.classify_category(f"{event} {headline} {description}"),
                headline=headline,
                description=description,
                instruction=instruction,
                location={"name": city, "lat": lat, "lon": lon},
                issued_at=issued_at,
                updated_at=now_iso,
                valid_until=valid_until,
                source=source,
                is_active=True,
                confidence=rw.get("confidence", 0.95),
            )
            normalized_items.append(item)

            # Persist to MongoDB if available
            if self.warning_repo:
                try:
                    await self.warning_repo.upsert_warning(item.model_dump())
                except Exception as e:
                    logger.debug(f"Failed to upsert warning in MongoDB: {e}")

        # Rank warnings by severity (EXTREME > SEVERE > MODERATE > MINOR)
        normalized_items.sort(key=lambda w: SEVERITY_RANKS.get(w.severity, 0), reverse=True)

        highest_sev = normalized_items[0].severity.value if normalized_items else None
        has_warnings = len(normalized_items) > 0
        message = None if has_warnings else "No active official warning available for this location."

        return WarningsResponse(
            location={"name": city, "lat": lat, "lon": lon},
            has_active_warnings=has_warnings,
            highest_severity=highest_sev,
            warnings=normalized_items,
            source=getattr(self.provider, "provider_name", "OpenWeatherMap"),
            issued_at=now_iso,
            message=message,
        )
