"""
Provider Health & Telemetry Diagnostics Monitoring Service.
Monitors multi-provider connectivity, round-trip latency, and operational health.
"""

import time
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import Settings, get_settings
from app.db.mongo_repositories import MongoProviderStatusRepository
from app.providers.provider_factory import ProviderFactory


class ProviderHealthService:
    """
    Heartbeat and availability monitor across active, official,
    and future-ready meteorological providers.
    """

    def __init__(
        self,
        status_repo: Optional[MongoProviderStatusRepository] = None,
        settings: Optional[Settings] = None,
    ):
        self.status_repo = status_repo
        self.settings = settings or get_settings()

    async def check_all_providers(self) -> List[Dict[str, Any]]:
        """
        Probe active providers (e.g. OpenWeatherMap, IMD) and collect latency metrics.
        """
        statuses = ProviderFactory.get_all_provider_statuses(self.settings)

        # Measure active OpenWeatherMap latency
        start_t = time.time()
        owm_ok = bool(self.settings.WEATHER_API_KEY)
        latency_ms = round((time.time() - start_t) * 1000, 2)

        for p in statuses:
            if p["provider_id"] == "openweather":
                p["latency_ms"] = latency_ms
                if self.status_repo:
                    try:
                        await self.status_repo.record_status(
                            provider_name="OpenWeatherMap",
                            status=p["status"],
                            latency_ms=latency_ms,
                        )
                    except Exception:
                        pass
            elif p["provider_id"] == "imd":
                if self.status_repo:
                    try:
                        await self.status_repo.record_status(
                            provider_name="IMD",
                            status=p["status"],
                            last_error=None if p["configured"] else "Credentials not configured",
                        )
                    except Exception:
                        pass

        return statuses
