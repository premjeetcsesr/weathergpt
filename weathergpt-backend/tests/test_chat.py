import pytest
import httpx
from unittest.mock import AsyncMock, patch

from app.api.deps import get_llm_service
from app.core.config import Settings
from app.main import app
from app.services.llm_service import LLMService


@pytest.mark.asyncio
async def test_1_basic_weather_question(async_client: httpx.AsyncClient):
    """Test 1: Basic weather question."""
    payload = {
        "message": "What is the weather in Kanpur today?",
        "location": "Kanpur",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert len(data["message"]) > 0
    assert data["location"] == "Kanpur"
    assert data["intent"] in ["current_weather", "location_weather", "general_weather"]
    assert data["weather_context_used"] is True
    assert "temperature" in data["data"]


@pytest.mark.asyncio
async def test_2_forecast_question(async_client: httpx.AsyncClient):
    """Test 2: Forecast question."""
    payload = {
        "message": "What is the forecast for Kanpur tomorrow?",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["location"] == "Kanpur"
    assert data["intent"] == "forecast"
    assert data["weather_context_used"] is True
    assert "forecast_summary" in data["data"] or "temperature" in data["data"]


@pytest.mark.asyncio
async def test_3_rain_question(async_client: httpx.AsyncClient):
    """Test 3: Rain question."""
    payload = {
        "message": "Will it rain tomorrow in Kanpur?",
        "location": "Kanpur",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["intent"] == "rainfall"
    assert "rain" in data["message"].lower() or "precipitation" in data["message"].lower()
    assert "rain_probability" in data["data"]


@pytest.mark.asyncio
async def test_4_missing_location_asks_user(async_client: httpx.AsyncClient):
    """Test 4: Missing location asks user for city."""
    payload = {
        "message": "What is the temperature right now?",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["intent"] == "missing_location"
    assert data["location"] is None
    assert data["weather_context_used"] is False
    assert "city" in data["message"].lower() or "location" in data["message"].lower()


@pytest.mark.asyncio
async def test_5_invalid_empty_message(async_client: httpx.AsyncClient):
    """Test 5: Empty message rejected with 422."""
    payload = {
        "message": "   ",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_6_llm_api_key_missing_fallback(async_client: httpx.AsyncClient):
    """Test 6: LLM API key missing triggers safe deterministic NLG fallback."""
    no_key_settings = Settings(LLM_API_KEY="")
    app.dependency_overrides[get_llm_service] = lambda: LLMService(settings=no_key_settings)

    payload = {
        "message": "How humid is it in Kanpur?",
        "location": "Kanpur",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["ai_generated"] is False
    assert data["weather_context_used"] is True
    assert "humidity" in data["message"].lower() or "78%" in data["message"]


@pytest.mark.asyncio
async def test_7_llm_failure_fallback(async_client: httpx.AsyncClient):
    """Test 7: LLM API error or timeout gracefully falls back to deterministic NLG."""
    faulty_client = AsyncMock()
    faulty_client.is_closed = False
    faulty_client.post.side_effect = httpx.ConnectError("Failed to connect to LLM provider")

    llm_service = LLMService(settings=Settings(LLM_API_KEY="sk-test-fake"), client=faulty_client)
    app.dependency_overrides[get_llm_service] = lambda: llm_service

    payload = {
        "message": "What is the wind speed in Kanpur?",
        "location": "Kanpur",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["ai_generated"] is False
    assert "wind" in data["message"].lower()


@pytest.mark.asyncio
async def test_8_weather_provider_failure(async_client: httpx.AsyncClient):
    """Test 8: Weather provider failure for nonexistent location returns graceful error message."""
    payload = {
        "message": "How is the weather in NonExistentCity12345?",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is False
    assert data["weather_context_used"] is False
    assert "unable to fetch" in data["message"].lower() or "nonexistentcity12345" in data["message"].lower()


@pytest.mark.asyncio
async def test_9_hindi_question(async_client: httpx.AsyncClient):
    """Test 9: Hindi query detection and Hindi response formatting."""
    no_key_settings = Settings(LLM_API_KEY="")
    app.dependency_overrides[get_llm_service] = lambda: LLMService(settings=no_key_settings)

    payload = {
        "message": "आज कानपुर का मौसम कैसा है?",
    }
    response = await async_client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["language"] == "hi"
    assert data["location"] == "Kanpur"
    assert "मौसम" in data["message"] or "कानपुर" in data["message"] or "तापमान" in data["message"]


@pytest.mark.asyncio
async def test_10_conversation_context(async_client: httpx.AsyncClient):
    """Test 10: Multi-turn conversation context maintains location."""
    conv_id = "test-session-conv-101"

    # Turn 1: Establish location
    turn1_payload = {
        "message": "What is the weather in Delhi?",
        "conversation_id": conv_id,
    }
    turn1_res = await async_client.post("/api/v1/chat", json=turn1_payload)
    assert turn1_res.status_code == 200
    assert turn1_res.json()["location"] == "Delhi"

    # Turn 2: Follow-up without repeating city
    turn2_payload = {
        "message": "What about tomorrow?",
        "conversation_id": conv_id,
    }
    turn2_res = await async_client.post("/api/v1/chat", json=turn2_payload)
    assert turn2_res.status_code == 200
    turn2_data = turn2_res.json()

    assert turn2_data["success"] is True
    assert turn2_data["location"] == "Delhi"
    assert turn2_data["intent"] == "forecast"
