import pytest
from httpx import ASGITransport, AsyncClient
from app.core.security import create_access_token, validate_password_strength
from app.main import app


def test_password_strength_validation():
    """Verify password policy rejects weak or trivial passwords."""
    # Too short
    ok, err = validate_password_strength("short1")
    assert not ok
    assert "at least 8 characters" in err

    # Only letters
    ok, err = validate_password_strength("alllettersonly")
    assert not ok
    assert "number or symbol" in err

    # Valid password
    ok, err = validate_password_strength("SecurePass123")
    assert ok
    assert err is None


@pytest.mark.asyncio
async def test_role_based_access_control():
    """Verify regular users cannot access admin endpoints while admins can."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Normal user token
        user_token = create_access_token(
            data={"sub": "user_id_123", "username": "normaluser", "role": "user"}
        )
        user_resp = await client.post(
            "/api/v1/weather/admin/diagnostics",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Should be forbidden (403)
        assert user_resp.status_code == 403
        assert "Forbidden" in user_resp.json()["detail"]

        # 2. Admin user token
        admin_token = create_access_token(
            data={"sub": "admin_id_456", "username": "adminuser", "role": "admin"}
        )
        admin_resp = await client.post(
            "/api/v1/weather/admin/diagnostics",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Should succeed (200)
        assert admin_resp.status_code == 200
        data = admin_resp.json()
        assert data["status"] == "success"
        assert data["role"] == "admin"
