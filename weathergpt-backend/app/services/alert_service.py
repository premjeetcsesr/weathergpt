from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.db.mongo_repositories import MongoAlertRepository
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.schemas.alerts import AlertsResponse, WeatherAlertItem


class AlertService:
    """Production service for managing meteorological warnings, real-time alerts, and persistence."""

    VALID_SEVERITIES = {"minor", "moderate", "severe", "extreme"}

    def __init__(
        self,
        provider: Optional[BaseWeatherProvider] = None,
        alert_repo: Optional[MongoAlertRepository] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.provider = provider or OpenWeatherMapProvider(settings=self.settings)
        self.alert_repo = alert_repo

    def normalize_and_validate_alert(
        self,
        raw: Dict[str, Any],
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Normalize raw provider alert and enforce validation rules."""
        alert_id = str(raw.get("alert_id") or raw.get("id") or f"alert-{city.lower()}-{int(datetime.now(timezone.utc).timestamp())}")
        severity = str(raw.get("severity", "moderate")).lower()
        if severity not in self.VALID_SEVERITIES:
            severity = "moderate"

        event = str(raw.get("event") or raw.get("title") or "Weather Advisory")
        headline = str(raw.get("headline") or event)
        description = str(raw.get("description", ""))
        instruction = str(raw.get("instruction") or raw.get("safety_recommendation") or "")
        urgency = str(raw.get("urgency", "expected")).lower()
        source = str(raw.get("source") or "OpenWeatherMap")
        starts_at = raw.get("starts_at") or raw.get("start_time")
        ends_at = raw.get("ends_at") or raw.get("end_time")

        now = datetime.now(timezone.utc).isoformat()

        return {
            "alert_id": alert_id,
            "location": {
                "name": city,
                "latitude": lat,
                "longitude": lon,
            },
            "event": event,
            "severity": severity,
            "urgency": urgency,
            "headline": headline,
            "description": description,
            "instruction": instruction,
            "source": source,
            "source_type": "weather_api",
            "starts_at": starts_at,
            "ends_at": ends_at,
            "received_at": now,
            "updated_at": now,
            "is_active": True,
        }

    async def fetch_and_process_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        Fetch from provider, normalize, compare against MongoDB, and persist.
        Returns: (new_alerts, updated_alerts, expired_alert_ids)
        """
        new_alerts: List[Dict[str, Any]] = []
        updated_alerts: List[Dict[str, Any]] = []
        expired_ids: List[str] = []

        try:
            raw_alerts = await self.provider.get_alerts(city=city, lat=lat, lon=lon)
        except Exception as exc:
            logger.error(f"Failed to fetch alerts from provider for '{city}': {exc}")
            raw_alerts = []

        if self.alert_repo:
            # Check for expired alerts
            expired_ids = await self.alert_repo.expire_alerts()

            for raw in raw_alerts:
                normalized = self.normalize_and_validate_alert(raw, city=city, lat=lat, lon=lon)
                doc, is_new, is_updated = await self.alert_repo.save_or_update_alert(normalized)
                if is_new and doc:
                    new_alerts.append(doc)
                elif is_updated and doc:
                    updated_alerts.append(doc)

        return new_alerts, updated_alerts, expired_ids

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        severity: Optional[str] = None,
        active_only: bool = True,
    ) -> AlertsResponse:
        """
        Fetch active alerts for location.
        Adheres to rule: NEVER fabricate government or IMD warnings.
        If no alerts exist, returns an empty list.
        """
        # First check DB for active alerts for this city
        db_alerts: List[Dict[str, Any]] = []
        if self.alert_repo:
            await self.alert_repo.expire_alerts()
            db_alerts = await self.alert_repo.get_active_alerts(
                city=city,
                severity=severity,
                active_only=active_only,
            )

        # If DB has no active alerts, try fetching live once to populate
        if not db_alerts:
            try:
                raw_alerts = await self.provider.get_alerts(city=city, lat=lat, lon=lon)
                if raw_alerts and self.alert_repo:
                    for raw in raw_alerts:
                        norm = self.normalize_and_validate_alert(raw, city=city, lat=lat, lon=lon)
                        doc, _, _ = await self.alert_repo.save_or_update_alert(norm)
                        if doc:
                            db_alerts.append(doc)
                elif raw_alerts:
                    for raw in raw_alerts:
                        db_alerts.append(self.normalize_and_validate_alert(raw, city=city, lat=lat, lon=lon))
            except Exception as exc:
                logger.warning(f"Live provider alert query failed for {city}: {exc}")

        alert_items: List[WeatherAlertItem] = []
        for d in db_alerts:
            try:
                item = WeatherAlertItem.model_validate(d)
                if not severity or item.severity.lower() == severity.lower():
                    alert_items.append(item)
            except Exception as e:
                logger.warning(f"Failed to validate alert doc {d}: {e}")

        note = None
        if not alert_items:
            note = f"No active severe government weather alerts currently detected for {city} by OpenWeatherMap."

        return AlertsResponse(
            location=city,
            alerts=alert_items,
            total_alerts=len(alert_items),
            provider_note=note,
        )

    async def get_alert_by_id(self, alert_id: str) -> Optional[WeatherAlertItem]:
        """Retrieve single alert detail."""
        if not self.alert_repo:
            return None
        doc = await self.alert_repo.get_alert_by_id(alert_id)
        if not doc:
            return None
        return WeatherAlertItem.model_validate(doc)

    async def get_alert_history(
        self,
        city: Optional[str] = None,
        date_from: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[WeatherAlertItem]:
        """Retrieve historical alerts."""
        if not self.alert_repo:
            return []
        docs = await self.alert_repo.get_alert_history(
            city=city,
            date_from=date_from,
            severity=severity,
            limit=limit,
            skip=skip,
        )
        items = []
        for d in docs:
            try:
                items.append(WeatherAlertItem.model_validate(d))
            except Exception:
                pass
        return items
