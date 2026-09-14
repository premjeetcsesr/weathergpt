import pytest
import httpx
from app.db.mongo_repositories import MongoChatHistoryRepository


@pytest.mark.asyncio
async def test_multilingual_chat_hindi_query(async_client: httpx.AsyncClient):
    """
    POST /api/v1/chat in Hindi returns grounded response with reply, language 'hi',
    source 'weather_context', and ISO timestamp.
    """
    payload = {
        "message": "कानपुर में आज मौसम कैसा रहेगा?",
        "location": "Kanpur",
        "language": "hi",
        "weather_context": {
            "temperature": 32.0,
            "condition": "Partly Cloudy",
            "humidity": 65,
            "rain_probability": 20,
            "wind_speed": 12.0,
        },
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["language"] == "hi"
    assert "reply" in data
    assert len(data["reply"]) > 0
    # Harmonized reply & message
    assert data["reply"] == data["message"]
    assert data["source"] == "weather_context"
    assert "timestamp" in data

    # Verify numbers from telemetry are preserved in reply
    assert "32" in data["reply"]


@pytest.mark.asyncio
async def test_chat_voice_input_mode_and_history(async_client: httpx.AsyncClient, mock_mongo_db):
    """
    Verify chat with input_mode='voice' logs input_mode into MongoDB chat_history.
    """
    chat_repo = MongoChatHistoryRepository(db=mock_mongo_db)
    session_id = "test-voice-session-42"

    payload = {
        "message": "Is it going to rain in Kanpur?",
        "location": "Kanpur",
        "conversation_id": session_id,
        "input_mode": "voice",
        "weather_context": {
            "temperature": 28.0,
            "condition": "Rain",
            "rain_probability": 85,
        },
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] is not None

    # Inspect MongoDB chat_history collection
    history = await chat_repo.get_session_history(session_id=session_id)
    assert len(history) >= 1
    latest_turn = history[-1]
    assert latest_turn["session_id"] == session_id
    assert latest_turn.get("input_mode") == "voice"
    assert latest_turn.get("language") in ["en", "hi"]


@pytest.mark.asyncio
async def test_chat_auto_language_detection(async_client: httpx.AsyncClient):
    """
    Verify that omitting explicit language still detects Hindi from Devanagari text.
    """
    payload = {
        "message": "वाराणसी में तापमान कितना है?",
        "location": "Varanasi",
        "weather_context": {
            "temperature": 34.0,
            "condition": "Sunny",
            "humidity": 45,
            "rain_probability": 5,
        },
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert "34" in data["reply"]
