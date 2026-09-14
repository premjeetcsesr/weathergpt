import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import get_settings
from app.main import app

settings = get_settings()


@pytest.mark.asyncio
async def test_rate_limiting_enforcement_on_login():
    """Verify rate limiter triggers HTTP 429 when threshold is exceeded."""
    limit = settings.RATE_LIMIT_LOGIN_PER_MINUTE
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Exceed rate limit for login endpoint with a mock IP
        test_ip = "192.168.100.50"
        headers = {"X-Forwarded-For": test_ip}

        responses = []
        for _ in range(limit + 2):
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email_or_username": "testuser", "password": "wrongpassword123"},
                headers=headers,
            )
            responses.append(resp)

        # The (limit + 1)th request must be HTTP 429
        last_resp = responses[-1]
        assert last_resp.status_code == 429
        assert "Retry-After" in last_resp.headers
        data = last_resp.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
