import pytest
from starlette.testclient import TestClient
from app.main import app
from app.services.websocket_manager import get_websocket_manager


def test_websocket_connect_and_ping():
    """Test connecting to WebSocket and ping/pong action."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/ws/alerts") as ws:
        ws.send_json({"type": "ping"})
        data = ws.receive_json()
        assert data["type"] == "pong"


def test_websocket_subscribe_and_receive_alert():
    """Test client subscribing to a city and receiving broadcast weather alert."""
    client = TestClient(app)
    ws_manager = get_websocket_manager()

    with client.websocket_connect("/api/v1/ws/alerts") as ws:
        # Subscribe to Kanpur
        ws.send_json({
            "type": "subscribe",
            "location": {"city": "Kanpur"}
        })
        ack = ws.receive_json()
        assert ack["type"] == "subscription_confirmed"
        assert ack["location"] == "Kanpur"

        # Broadcast alert via ws_manager
        import asyncio
        alert_msg = {
            "type": "weather_alert",
            "alert": {
                "event": "Heavy Rain",
                "severity": "severe",
                "headline": "Heavy monsoon downpour",
                "location": "Kanpur",
            }
        }
        asyncio.run(ws_manager.broadcast_to_location("Kanpur", alert_msg))

        received = ws.receive_json()
        assert received["type"] == "weather_alert"
        assert received["alert"]["event"] == "Heavy Rain"
        assert received["alert"]["location"] == "Kanpur"


def test_websocket_alert_expiration_event():
    """Test receiving alert_expired event over WebSocket."""
    client = TestClient(app)
    ws_manager = get_websocket_manager()

    with client.websocket_connect("/api/v1/ws/alerts") as ws:
        import asyncio
        exp_msg = {
            "type": "alert_expired",
            "alert_id": "test-expired-001"
        }
        asyncio.run(ws_manager.broadcast(exp_msg))

        received = ws.receive_json()
        assert received["type"] == "alert_expired"
        assert received["alert_id"] == "test-expired-001"


def test_websocket_unsubscribe():
    """Test unsubscribing from a city."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/ws/alerts") as ws:
        ws.send_json({
            "type": "unsubscribe",
            "location": {"city": "Kanpur"}
        })
        ack = ws.receive_json()
        assert ack["type"] == "unsubscription_confirmed"
        assert ack["location"] == "Kanpur"
