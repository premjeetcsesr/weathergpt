import pytest
import httpx
from app.services.language_service import LanguageService, get_language_service


def test_language_detection_hindi_devanagari():
    """Verify high-confidence detection for Devanagari script."""
    res = LanguageService.detect_language("कानपुर में आज मौसम कैसा है?")
    assert res["language"] == "hi"
    assert res["confidence"] >= 0.90


def test_language_detection_hinglish():
    """Verify detection for common Hinglish transliteration keywords."""
    res = LanguageService.detect_language("kya aaj barish hogi Kanpur mein?")
    assert res["language"] == "hi"
    assert res["confidence"] >= 0.70


def test_language_detection_english():
    """Verify detection for English text."""
    res = LanguageService.detect_language("Will it rain tomorrow in Kanpur?")
    assert res["language"] == "en"
    assert res["confidence"] >= 0.90


def test_language_detection_fallback():
    """Verify fallback to preference when ambiguous."""
    res = LanguageService.detect_language("12345 ???", user_preference="hi")
    assert res["language"] == "hi"
    assert res["confidence"] == 0.60


def test_supported_languages_list():
    """Verify primary supported languages list contains en and hi with locales."""
    supported = LanguageService.get_supported_languages()
    codes = [l["code"] for l in supported]
    assert "en" in codes
    assert "hi" in codes

    locales = {l["code"]: l["locale"] for l in supported}
    assert locales["en"] == "en-IN"
    assert locales["hi"] == "hi-IN"


@pytest.mark.asyncio
async def test_get_language_settings_default(async_client: httpx.AsyncClient):
    """GET /api/v1/settings/language returns default fallback."""
    response = await async_client.get("/api/v1/settings/language")
    assert response.status_code == 200
    data = response.json()
    assert "language" in data
    assert data["language"] in ["en", "hi"]


@pytest.mark.asyncio
async def test_post_language_settings_valid(async_client: httpx.AsyncClient):
    """POST /api/v1/settings/language updates preference to Hindi."""
    response = await async_client.post("/api/v1/settings/language", json={"language": "hi"})
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert data["status"] == "updated"


@pytest.mark.asyncio
async def test_post_language_settings_invalid(async_client: httpx.AsyncClient):
    """POST /api/v1/settings/language rejects unsupported language."""
    response = await async_client.post("/api/v1/settings/language", json={"language": "fr"})
    assert response.status_code == 422
