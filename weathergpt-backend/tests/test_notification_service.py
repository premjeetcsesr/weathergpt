import pytest
from mongomock_motor import AsyncMongoMockClient
from app.db.mongo_repositories import MongoNotificationHistoryRepository
from app.services.notification_service import NotificationService
from app.services.websocket_manager import WebSocketManager


@pytest.mark.asyncio
async def test_notification_service_dispatch_and_history():
    """Test dispatching an alert notification and verifying MongoDB history entry."""
    client = AsyncMongoMockClient()
    db = client["test_notifs"]
    history_repo = MongoNotificationHistoryRepository(db=db)
    ws_manager = WebSocketManager()
    notif_svc = NotificationService(ws_manager=ws_manager, history_repo=history_repo)

    alert_data = {
        "alert_id": "alert-test-100",
        "location": {"name": "Kanpur"},
        "event": "Flash Flood Watch",
        "severity": "severe",
        "headline": "Water levels rising",
        "description": "High water levels in Ganges basin",
        "instruction": "Avoid low-lying areas",
        "updated_at": "2026-09-12T10:00:00Z",
    }

    subscribers = [{"user_id": "user-abc-1"}]
    sent_count = await notif_svc.notify_weather_alert(alert_data, subscribers=subscribers, is_update=False)
    assert sent_count == 1

    # Verify history recorded
    records = await history_repo.get_history(user_id="user-abc-1")
    assert len(records) == 1
    assert records[0]["alert_id"] == "alert-test-100"
    assert records[0]["channel"] == "websocket"
    assert records[0]["status"] == "sent"


@pytest.mark.asyncio
async def test_duplicate_notification_prevention():
    """Test that duplicate notifications are not sent repeatedly."""
    client = AsyncMongoMockClient()
    db = client["test_notifs"]
    history_repo = MongoNotificationHistoryRepository(db=db)
    ws_manager = WebSocketManager()
    notif_svc = NotificationService(ws_manager=ws_manager, history_repo=history_repo)

    alert_data = {
        "alert_id": "alert-dupe-test",
        "location": {"name": "Kanpur"},
        "event": "High Winds",
        "severity": "moderate",
        "headline": "Wind gusts up to 50 km/h",
    }
    subscribers = [{"user_id": "user-dupe-1"}]

    # First dispatch should succeed
    count1 = await notif_svc.notify_weather_alert(alert_data, subscribers=subscribers, is_update=False)
    assert count1 == 1

    # Second dispatch with exact same data should be prevented
    count2 = await notif_svc.notify_weather_alert(alert_data, subscribers=subscribers, is_update=False)
    assert count2 == 0


@pytest.mark.asyncio
async def test_updated_alert_meaningful_change_notification():
    """Test that an update with meaningful changes is allowed through."""
    client = AsyncMongoMockClient()
    db = client["test_notifs"]
    history_repo = MongoNotificationHistoryRepository(db=db)
    ws_manager = WebSocketManager()
    notif_svc = NotificationService(ws_manager=ws_manager, history_repo=history_repo)

    alert_data = {
        "alert_id": "alert-upgrade-001",
        "location": {"name": "Kanpur"},
        "event": "Thunderstorm",
        "severity": "moderate",
        "headline": "Moderate thunderstorm",
    }
    subscribers = [{"user_id": "user-up-1"}]

    # Initial alert
    await notif_svc.notify_weather_alert(alert_data, subscribers=subscribers, is_update=False)

    # Upgrade severity to severe
    upgraded_alert = dict(alert_data)
    upgraded_alert["severity"] = "severe"
    upgraded_alert["headline"] = "Severe thunderstorm with hail"

    count = await notif_svc.notify_weather_alert(upgraded_alert, subscribers=subscribers, is_update=True)
    assert count == 1
