import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_security_headers_present():
    """Verify standard HTTP defense-in-depth security headers are present on responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"


@pytest.mark.asyncio
async def test_correlation_id_generation_and_propagation():
    """Verify X-Request-ID is generated if missing and propagated if supplied."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Generated automatically
        res1 = await client.get("/health")
        req_id1 = res1.headers.get("X-Request-ID")
        assert req_id1 is not None
        assert len(req_id1) > 0

        # 2. Propagated from client header
        custom_id = "test-client-trace-uuid-12345"
        res2 = await client.get("/health", headers={"X-Request-ID": custom_id})
        assert res2.headers.get("X-Request-ID") == custom_id
