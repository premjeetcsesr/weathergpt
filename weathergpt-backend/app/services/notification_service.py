import hashlib
import json
from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.db.mongo_repositories import MongoNotificationHistoryRepository
from app.services.websocket_manager import WebSocketManager, get_websocket_manager


class NotificationService:
    """Service to handle notification dispatch, WebSocket broadcasting, and duplicate suppression."""

    def __init__(
        self,
        ws_manager: Optional[WebSocketManager] = None,
        history_repo: Optional[MongoNotificationHistoryRepository] = None,
    ):
        self.ws_manager = ws_manager or get_websocket_manager()
        self.history_repo = history_repo

    def _generate_alert_hash(self, alert: Dict[str, Any]) -> str:
        """Create a deterministic hash of meaningful alert content to detect real changes."""
        payload = {
            "severity": str(alert.get("severity", "")).lower(),
            "headline": str(alert.get("headline", "")).strip(),
            "description": str(alert.get("description", "")).strip(),
            "instruction": str(alert.get("instruction", "")).strip(),
            "ends_at": str(alert.get("ends_at", "")),
        }
        encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.md5(encoded).hexdigest()

    async def notify_weather_alert(
        self,
        alert: Dict[str, Any],
        subscribers: Optional[List[Dict[str, Any]]] = None,
        is_update: bool = False,
    ) -> int:
        """
        Dispatches weather alert notifications via WebSocket while preventing duplicate deliveries.
        Checks notification_history using (alert_id + user_id + notification_type).
        """
        alert_id = str(alert.get("alert_id") or alert.get("id") or "")
        if not alert_id:
            logger.warning("Attempted to dispatch notification for alert without an ID.")
            return 0

        # Resolve location name
        loc = alert.get("location")
        city_name = loc.get("name") if isinstance(loc, dict) else str(loc or "Kanpur")

        content_hash = self._generate_alert_hash(alert)
        notification_type = "weather_alert_update" if is_update else "weather_alert"

        # Prepare formatted WebSocket alert message
        ws_payload = {
            "type": "weather_alert",
            "alert": {
                "id": alert_id,
                "alert_id": alert_id,
                "event": alert.get("event", "Weather Advisory"),
                "severity": alert.get("severity", "moderate"),
                "urgency": alert.get("urgency", "expected"),
                "headline": alert.get("headline", f"{alert.get('event', 'Weather Alert')} in {city_name}"),
                "description": alert.get("description", ""),
                "instruction": alert.get("instruction", ""),
                "location": city_name,
                "starts_at": alert.get("starts_at"),
                "ends_at": alert.get("ends_at"),
                "source": alert.get("source", "OpenWeatherMap"),
                "updated_at": alert.get("updated_at"),
                "is_active": True,
            },
        }

        # If specific subscribers exist, check duplicate rules per user
        sent_count = 0
        if subscribers and len(subscribers) > 0:
            for sub in subscribers:
                user_id = sub.get("user_id")

                if self.history_repo:
                    # Check duplicate prevention
                    already_sent = await self.history_repo.has_notification_been_sent(
                        alert_id=alert_id,
                        user_id=user_id,
                        notification_type=notification_type,
                        content_hash=content_hash,
                    )
                    if already_sent:
                        logger.debug(f"Skipping duplicate notification for alert '{alert_id}' and user '{user_id}'.")
                        continue

                # Broadcast to location
                if self.ws_manager:
                    await self.ws_manager.broadcast_to_location(city=city_name, message=ws_payload)

                if self.history_repo:
                    await self.history_repo.record_notification(
                        alert_id=alert_id,
                        user_id=user_id,
                        notification_type=notification_type,
                        channel="websocket",
                        status="sent",
                        content_hash=content_hash,
                    )
                sent_count += 1
        else:
            # Broadcast to location or all connected clients
            if self.history_repo:
                already_sent = await self.history_repo.has_notification_been_sent(
                    alert_id=alert_id,
                    user_id=None,
                    notification_type=notification_type,
                    content_hash=content_hash,
                )
                if already_sent:
                    logger.debug(f"Skipping duplicate global notification for alert '{alert_id}'.")
                    return 0

            if self.ws_manager:
                sent_count = await self.ws_manager.broadcast_to_location(city=city_name, message=ws_payload)

            if self.history_repo:
                await self.history_repo.record_notification(
                    alert_id=alert_id,
                    user_id=None,
                    notification_type=notification_type,
                    channel="websocket",
                    status="sent",
                    content_hash=content_hash,
                )

        return sent_count

    async def notify_alert_expired(self, alert_id: str) -> None:
        """Broadcasts expiration of an alert to active WebSocket clients."""
        if not alert_id:
            return

        payload = {
            "type": "alert_expired",
            "alert_id": alert_id,
        }

        if self.ws_manager:
            await self.ws_manager.broadcast(payload)
            logger.info(f"Broadcasted expiration for alert '{alert_id}'.")

    # Extension interfaces for future notification channels
    async def send_push_notification(self, user_id: str, title: str, body: str) -> None:
        """Placeholder interface for future Firebase Cloud Messaging."""
        pass

    async def send_email_notification(self, user_email: str, subject: str, body: str) -> None:
        """Placeholder interface for future Email dispatch."""
        pass
