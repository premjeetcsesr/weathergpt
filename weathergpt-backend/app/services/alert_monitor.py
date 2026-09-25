import asyncio
from typing import List, Optional, Set
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.db.mongo_repositories import MongoAlertSubscriptionRepository
from app.services.alert_service import AlertService
from app.services.notification_service import NotificationService


class AlertMonitor:
    """
    Background asynchronous monitor service.
    Periodically polls the weather provider for alerts on subscribed locations,
    detects changes, updates MongoDB, and dispatches real-time WebSocket notifications.
    """

    def __init__(
        self,
        alert_service: AlertService,
        subscription_repo: Optional[MongoAlertSubscriptionRepository] = None,
        notification_service: Optional[NotificationService] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.alert_service = alert_service
        self.subscription_repo = subscription_repo
        self.notification_service = notification_service
        self.interval = self.settings.ALERT_CHECK_INTERVAL_SECONDS or 300

        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def get_monitored_locations(self) -> List[str]:
        """Gather all unique active cities that need alert polling."""
        cities: Set[str] = {"Kanpur"}  # Default reference city
        if self.subscription_repo:
            subs = await self.subscription_repo.get_subscriptions()
            for sub in subs:
                loc = sub.get("location", {})
                city = loc.get("city") or loc.get("name")
                if city and city.strip():
                    cities.add(city.strip())
        return list(cities)

    async def check_alerts_cycle(self) -> None:
        """Perform a single pass of checking and dispatching alerts."""
        locations = await self.get_monitored_locations()
        logger.debug(f"AlertMonitor cycle executing for locations: {locations}")

        for city in locations:
            try:
                new_alerts, updated_alerts, expired_ids = await self.alert_service.fetch_and_process_alerts(city=city)

                # 1. Process New Alerts
                for alert in new_alerts:
                    subscribers = []
                    if self.subscription_repo:
                        subscribers = await self.subscription_repo.get_subscribers_for_location(
                            city=city,
                            severity=alert.get("severity")
                        )
                    if self.notification_service:
                        await self.notification_service.notify_weather_alert(
                            alert=alert,
                            subscribers=subscribers,
                            is_update=False
                        )

                # 2. Process Updated Alerts
                for alert in updated_alerts:
                    subscribers = []
                    if self.subscription_repo:
                        subscribers = await self.subscription_repo.get_subscribers_for_location(
                            city=city,
                            severity=alert.get("severity")
                        )
                    if self.notification_service:
                        await self.notification_service.notify_weather_alert(
                            alert=alert,
                            subscribers=subscribers,
                            is_update=True
                        )

                # 3. Process Expired Alerts
                if expired_ids and self.notification_service:
                    for exp_id in expired_ids:
                        await self.notification_service.notify_alert_expired(exp_id)

            except Exception as exc:
                logger.error(f"Error during alert monitoring pass for '{city}': {exc}")

    async def _run_loop(self) -> None:
        """Internal asynchronous loop for periodic polling."""
        logger.info(f"AlertMonitor started. Polling every {self.interval} seconds.")
        while self._running:
            try:
                await self.check_alerts_cycle()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Unexpected error in AlertMonitor loop: {exc}")

            # Sleep using asyncio.sleep with small checks so shutdown is instant
            for _ in range(self.interval):
                if not self._running:
                    break
                await asyncio.sleep(1)

        logger.info("AlertMonitor loop terminated.")

    def start(self) -> None:
        """Start the background monitor task."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        """Stop the background monitor gracefully."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        logger.info("AlertMonitor background task stopped.")
