"""
Comprehensive test suite for MongoDB Backend Features:
- Users & Authentication (Register, Login, Me, Preferences)
- Chat History (Log turns, Session history, Clear, Session list)
- Locations (Save, List, Delete)
- Weather History (Log telemetry, Query history, Popular cities, Clear)
"""

import pytest
import httpx


@pytest.mark.asyncio
async def test_user_registration_and_login(async_client: httpx.AsyncClient):
    # 1. Register new user
    reg_payload = {
        "email": "weatheruser@example.com",
        "username": "weatherfan",
        "password": "SecretPassword123",
        "full_name": "Weather Explorer",
        "preferences": {
            "unit": "celsius",
            "theme": "dark",
            "language": "hi",
            "default_city": "Varanasi",
        },
    }
    res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "weatheruser@example.com"
    assert data["user"]["username"] == "weatherfan"
    assert data["user"]["preferences"]["default_city"] == "Varanasi"
    token = data["access_token"]

    # 2. Duplicate registration should fail
    dup_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Login with username and password
    login_payload = {
        "email_or_username": "weatherfan",
        "password": "SecretPassword123",
    }
    login_res = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # 4. Login with wrong password should fail
    bad_login = await async_client.post("/api/v1/auth/login", json={
        "email_or_username": "weatherfan",
        "password": "WrongPassword",
    })
    assert bad_login.status_code == 401

    # 5. Fetch /me profile
    me_res = await async_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "weatherfan"

    # 6. Update user preferences
    pref_res = await async_client.put(
        "/api/v1/auth/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"unit": "fahrenheit", "default_city": "Mumbai"},
    )
    assert pref_res.status_code == 200
    updated_pref = pref_res.json()
    assert updated_pref["preferences"]["unit"] == "fahrenheit"
    assert updated_pref["preferences"]["default_city"] == "Mumbai"


@pytest.mark.asyncio
async def test_chat_history_persistence_and_management(async_client: httpx.AsyncClient):
    session_id = "test-session-101"

    # 1. Post a chat message
    chat_payload = {
        "message": "What is the temperature in Kanpur today?",
        "location": "Kanpur",
        "conversation_id": session_id,
        "language": "en",
    }
    res = await async_client.post("/api/v1/chat", json=chat_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    # 2. Retrieve session chat history
    hist_res = await async_client.get(f"/api/v1/chat/history?session_id={session_id}")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    item = hist_data["items"][0]
    assert item["session_id"] == session_id
    assert "Kanpur" in item["location"]

    # 3. Retrieve sessions list
    sess_res = await async_client.get("/api/v1/chat/sessions")
    assert sess_res.status_code == 200
    sessions_data = sess_res.json()
    assert sessions_data["total"] >= 1
    assert any(s["session_id"] == session_id for s in sessions_data["sessions"])

    # 4. Clear chat history for this session
    del_res = await async_client.delete(f"/api/v1/chat/history?session_id={session_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify history is now empty
    hist_res2 = await async_client.get(f"/api/v1/chat/history?session_id={session_id}")
    assert hist_res2.status_code == 200
    assert hist_res2.json()["total"] == 0


@pytest.mark.asyncio
async def test_saved_locations_crud(async_client: httpx.AsyncClient):
    # 1. Save a new favorite location
    loc_payload = {
        "name": "Lucknow",
        "latitude": 26.8467,
        "longitude": 80.9462,
        "state": "Uttar Pradesh",
        "country": "India",
        "tag": "Home",
    }
    save_res = await async_client.post("/api/v1/locations/saved", json=loc_payload)
    assert save_res.status_code == 201
    saved_doc = save_res.json()
    assert saved_doc["name"] == "Lucknow"
    assert saved_doc["tag"] == "Home"
    loc_id = saved_doc["id"]

    # 2. List saved locations
    list_res = await async_client.get("/api/v1/locations/saved")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(l["id"] == loc_id for l in list_data["items"])

    # 3. Delete saved location
    del_res = await async_client.delete(f"/api/v1/locations/saved/{loc_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 4. Verify deletion
    list_res2 = await async_client.get("/api/v1/locations/saved")
    assert not any(l["id"] == loc_id for l in list_res2.json()["items"])


@pytest.mark.asyncio
async def test_weather_history_and_popular_trends(async_client: httpx.AsyncClient):
    session_id = "weather-search-sess-1"

    # 1. Make weather requests for different cities
    await async_client.get(f"/api/v1/weather?city=Kanpur&session_id={session_id}")
    await async_client.get(f"/api/v1/weather?city=Kanpur&session_id={session_id}")
    await async_client.get(f"/api/v1/weather?city=Delhi&session_id={session_id}")

    # 2. Fetch weather search history
    hist_res = await async_client.get(f"/api/v1/weather/history?session_id={session_id}")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 3

    # 3. Fetch popular searched cities
    pop_res = await async_client.get("/api/v1/weather/history/popular")
    assert pop_res.status_code == 200
    pop_data = pop_res.json()
    assert len(pop_data["items"]) >= 1
    cities = [item["city"] for item in pop_data["items"]]
    assert "Kanpur" in cities

    # 4. Clear weather history
    clear_res = await async_client.delete(f"/api/v1/weather/history?session_id={session_id}")
    assert clear_res.status_code == 200
    assert clear_res.json()["success"] is True


@pytest.mark.asyncio
async def test_notifications_crud_and_unread(async_client: httpx.AsyncClient):
    # 1. Create a notification
    notif_payload = {
        "title": "Severe Rain Alert",
        "message": "Heavy monsoon showers expected across Kanpur from 3 PM to 6 PM.",
        "type": "alert",
        "severity": "high",
        "location": "Kanpur",
    }
    create_res = await async_client.post("/api/v1/notifications", json=notif_payload)
    assert create_res.status_code == 201
    created_notif = create_res.json()
    assert created_notif["title"] == "Severe Rain Alert"
    assert created_notif["is_read"] is False
    notif_id = created_notif["id"]

    # 2. Check unread count
    count_res = await async_client.get("/api/v1/notifications/unread-count")
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] >= 1

    # 3. List notifications
    list_res = await async_client.get("/api/v1/notifications")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(n["id"] == notif_id for n in list_data["items"])

    # 4. Mark single notification as read
    read_res = await async_client.put(f"/api/v1/notifications/{notif_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["success"] is True

    # 5. Mark all as read
    read_all_res = await async_client.put("/api/v1/notifications/read-all")
    assert read_all_res.status_code == 200

    # 6. Delete notification
    del_res = await async_client.delete(f"/api/v1/notifications/{notif_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

