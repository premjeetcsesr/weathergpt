from datetime import datetime, timezone
import pytest
import httpx
from app.db.mongo_repositories import MongoAlertRepository, MongoAlertSubscriptionRepository
from app.services.alert_service import AlertService


@pytest.mark.asyncio
async def test_get_alerts_empty_and_valid_structure(async_client: httpx.AsyncClient):
    """Test standard alerts query returns valid schema with total_alerts and provider_note."""
    response = await async_client.get("/api/v1/alerts?city=Kanpur")
    assert response.status_code == 200
    data = response.json()

    assert data["location"] == "Kanpur"
    assert "alerts" in data
    assert isinstance(data["alerts"], list)
    assert data["total_alerts"] == len(data["alerts"])
    assert "provider_note" in data
    assert "No active severe government weather alerts" in (data["provider_note"] or "")


@pytest.mark.asyncio
async def test_alert_storage_and_active_retrieval(async_client: httpx.AsyncClient, mock_mongo_db):
    """Test inserting an alert document into MongoDB alerts collection and querying it via REST."""
    alert_repo = MongoAlertRepository(db=mock_mongo_db)
    now_iso = datetime.now(timezone.utc).isoformat()

    alert_doc = {
        "alert_id": "test-alert-kanpur-001",
        "location": {
            "name": "Kanpur",
            "latitude": 26.4499,
            "longitude": 80.3319,
        },
        "event": "Heavy Rain",
        "severity": "moderate",
        "urgency": "expected",
        "headline": "Heavy rain expected in Kanpur district",
        "description": "Continuous rainfall accompanied by mild thunderstorms.",
        "instruction": "Avoid low-lying waterlogged roads.",
        "source": "OpenWeatherMap",
        "source_type": "weather_api",
        "starts_at": now_iso,
        "ends_at": "2030-01-01T00:00:00Z",
        "is_active": True,
    }
    saved, is_new, is_updated = await alert_repo.save_or_update_alert(alert_doc)
    assert is_new is True
    assert saved["alert_id"] == "test-alert-kanpur-001"

    # Query via REST GET /api/v1/alerts?city=Kanpur
    response = await async_client.get("/api/v1/alerts?city=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "Kanpur"
    assert data["total_alerts"] >= 1

    matching = [a for a in data["alerts"] if a["id"] == "test-alert-kanpur-001" or a.get("alert_id") == "test-alert-kanpur-001"]
    assert len(matching) == 1
    assert matching[0]["event"] == "Heavy Rain"
    assert matching[0]["severity"] == "moderate"


@pytest.mark.asyncio
async def test_get_alert_by_id_found_and_not_found(async_client: httpx.AsyncClient, mock_mongo_db):
    """Test GET /api/v1/alerts/{alert_id} for success and 404."""
    alert_repo = MongoAlertRepository(db=mock_mongo_db)
    await alert_repo.save_or_update_alert({
        "alert_id": "specific-alert-42",
        "location": {"name": "Lucknow"},
        "event": "Hailstorm",
        "severity": "severe",
        "headline": "Isolated hail reported",
        "is_active": True,
    })

    # Found
    resp_found = await async_client.get("/api/v1/alerts/specific-alert-42")
    assert resp_found.status_code == 200
    alert_data = resp_found.json()
    assert alert_data["id"] == "specific-alert-42"
    assert alert_data["severity"] == "severe"

    # Not found
    resp_missing = await async_client.get("/api/v1/alerts/nonexistent-id-999")
    assert resp_missing.status_code == 404


@pytest.mark.asyncio
async def test_alerts_history_endpoint(async_client: httpx.AsyncClient, mock_mongo_db):
    """Test GET /api/v1/alerts/history with city and severity filtering."""
    alert_repo = MongoAlertRepository(db=mock_mongo_db)
    await alert_repo.save_or_update_alert({
        "alert_id": "hist-01",
        "location": {"name": "Varanasi"},
        "event": "Heatwave",
        "severity": "extreme",
        "received_at": "2026-06-01T10:00:00Z",
        "is_active": False,
    })

    resp = await async_client.get("/api/v1/alerts/history?city=Varanasi&severity=extreme")
    assert resp.status_code == 200
    data = resp.json()
    assert "alerts" in data
    assert data["total"] >= 1
    assert data["alerts"][0]["id"] == "hist-01"


@pytest.mark.asyncio
async def test_alert_expiration_logic(mock_mongo_db):
    """Test that expired alerts have is_active set to False."""
    alert_repo = MongoAlertRepository(db=mock_mongo_db)
    # Alert that ended in the past
    await alert_repo.save_or_update_alert({
        "alert_id": "past-alert-001",
        "location": {"name": "Kanpur"},
        "event": "Dense Fog",
        "severity": "minor",
        "starts_at": "2020-01-01T00:00:00Z",
        "ends_at": "2020-01-01T06:00:00Z",
        "is_active": True,
    })

    expired_ids = await alert_repo.expire_alerts()
    assert "past-alert-001" in expired_ids

    doc = await alert_repo.get_alert_by_id("past-alert-001")
    assert doc["is_active"] is False


@pytest.mark.asyncio
async def test_alert_update_detection(mock_mongo_db):
    """Test that meaningful field changes are correctly flagged as is_updated."""
    alert_repo = MongoAlertRepository(db=mock_mongo_db)
    base_doc = {
        "alert_id": "updatable-001",
        "location": {"name": "Agra"},
        "event": "Thunderstorm",
        "severity": "moderate",
        "headline": "Moderate rain and thunder",
        "instruction": "Stay indoors",
        "is_active": True,
    }
    _, is_new, is_up = await alert_repo.save_or_update_alert(base_doc)
    assert is_new is True
    assert is_up is False

    # Save exact same doc again
    _, is_new2, is_up2 = await alert_repo.save_or_update_alert(base_doc)
    assert is_new2 is False
    assert is_up2 is False

    # Update severity to 'severe'
    updated_doc = dict(base_doc)
    updated_doc["severity"] = "severe"
    updated_doc["headline"] = "Severe thunderstorm upgraded"
    _, is_new3, is_up3 = await alert_repo.save_or_update_alert(updated_doc)
    assert is_new3 is False
    assert is_up3 is True


@pytest.mark.asyncio
async def test_alert_subscriptions_crud(async_client: httpx.AsyncClient):
    """Test POST /api/v1/alerts/subscriptions, GET and DELETE."""
    sub_payload = {
        "location": {
            "city": "Kanpur",
            "latitude": 26.4499,
            "longitude": 80.3319,
        },
        "severity_threshold": "severe",
    }

    # Create subscription
    create_res = await async_client.post("/api/v1/alerts/subscriptions", json=sub_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    sub_id = created_data["id"]
    assert created_data["location"]["city"] == "Kanpur"
    assert created_data["severity_threshold"] == "severe"

    # List subscriptions
    list_res = await async_client.get("/api/v1/alerts/subscriptions")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(s["id"] == sub_id for s in list_data["subscriptions"])

    # Delete subscription
    del_res = await async_client.delete(f"/api/v1/alerts/subscriptions/{sub_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


@pytest.mark.asyncio
async def test_invalid_coordinates_alert_query(async_client: httpx.AsyncClient):
    """Test validation errors for out-of-range coordinates."""
    response = await async_client.get("/api/v1/alerts?latitude=999&longitude=999")
    assert response.status_code == 400
