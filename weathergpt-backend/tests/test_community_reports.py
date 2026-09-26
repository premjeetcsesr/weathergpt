"""
Tests for Community Weather Reports Feature.
Validates report creation, photo validation, GeoJSON coordinates, nearby queries,
moderation workflows, rate limiting, and source segregation.
"""

import io
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token


@pytest.fixture
def normal_user_headers():
    token = create_access_token(
        data={"sub": "user_12345", "username": "kanpur_citizen", "role": "user"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user_headers():
    token = create_access_token(
        data={"sub": "admin_99999", "username": "chief_moderator", "role": "admin"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_categories(async_client: AsyncClient):
    """Verify endpoint returns all predefined categories with icons."""
    resp = await async_client.get("/api/v1/community-reports/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 12
    ids = [c["id"] for c in data]
    assert "waterlogging" in ids
    assert "hailstorm" in ids
    assert "storm" in ids
    assert "fallen_tree" in ids
    assert "road_blocked" in ids


@pytest.mark.asyncio
async def test_create_report_authenticated_success(async_client: AsyncClient, normal_user_headers):
    """Verify normal authenticated user can submit a community weather report."""
    form_data = {
        "category": "waterlogging",
        "description": "Heavy water accumulation near Civil Lines crossing.",
        "latitude": "26.4499",
        "longitude": "80.3319",
        "location_name": "Civil Lines, Kanpur",
    }
    resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["category"] == "waterlogging"
    assert body["category_name"] == "Waterlogging"
    assert body["status"] in ("PENDING", "VERIFIED")
    assert body["source"] == "COMMUNITY"
    assert body["location"]["latitude"] == 26.4499
    assert body["location"]["longitude"] == 80.3319
    assert body["user_display"] == "Community Member"
    # Never expose raw user ID or email publicly
    assert "email" not in body
    assert "user_id" not in body


@pytest.mark.asyncio
async def test_create_report_unauthorized(async_client: AsyncClient):
    """Verify unauthenticated user cannot submit report (401)."""
    form_data = {
        "category": "storm",
        "description": "Strong winds blowing dust.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    resp = await async_client.post("/api/v1/community-reports", data=form_data)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_report_invalid_category(async_client: AsyncClient, normal_user_headers):
    """Verify invalid category is rejected with 422."""
    form_data = {
        "category": "alien_invasion",
        "description": "Strange lights in the sky.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_report_invalid_coordinates(async_client: AsyncClient, normal_user_headers):
    """Verify invalid coordinates are rejected with 422."""
    form_data = {
        "category": "hailstorm",
        "description": "Large hailstones damaging car windshields.",
        "latitude": "105.0",  # Out of range > 90
        "longitude": "80.3319",
    }
    resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_report_with_valid_image(async_client: AsyncClient, normal_user_headers):
    """Verify submitting a report with a valid JPEG image file."""
    # Valid JPEG magic bytes
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 100
    files = {
        "photo": ("tree_fallen.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")
    }
    form_data = {
        "category": "fallen_tree",
        "description": "Banyan tree branch fell on the electric wires.",
        "latitude": "26.4499",
        "longitude": "80.3319",
        "location_name": "Mall Road, Kanpur",
    }
    resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        files=files,
        headers=normal_user_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["category"] == "fallen_tree"


@pytest.mark.asyncio
async def test_create_report_invalid_image_type(async_client: AsyncClient, normal_user_headers):
    """Verify non-image or executable file is rejected."""
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    files = {
        "photo": ("malicious.exe", io.BytesIO(fake_exe), "application/x-msdownload")
    }
    form_data = {
        "category": "road_blocked",
        "description": "Main highway barricaded due to mudslide.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        files=files,
        headers=normal_user_headers,
    )
    assert resp.status_code == 400
    assert "Unsupported image format" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_submission_protection(async_client: AsyncClient, normal_user_headers):
    """Verify duplicate submission within 2 minutes is rejected with 400."""
    form_data = {
        "category": "lightning",
        "description": "Repeated ground strikes near substation.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    # First submission
    resp1 = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    assert resp1.status_code == 201

    # Immediate duplicate submission
    resp2 = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    assert resp2.status_code == 400
    assert "Duplicate report detected" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_moderation_flow_and_rbac(
    async_client: AsyncClient, normal_user_headers, admin_user_headers
):
    """Verify moderation: normal users cannot verify reports (403), admins can verify or reject."""
    # 1. Create report as normal user
    form_data = {
        "category": "heavy_rain",
        "description": "Torrential downpour causing visibility drop under 100m.",
        "latitude": "28.6139",
        "longitude": "77.2090",
        "location_name": "Connaught Place, Delhi",
    }
    create_resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    assert create_resp.status_code == 201
    report_id = create_resp.json()["id"]

    # 2. Normal user tries to moderate (verify) their own report -> 403 Forbidden
    mod_payload = {"status": "VERIFIED"}
    user_mod_resp = await async_client.patch(
        f"/api/v1/community-reports/{report_id}",
        json=mod_payload,
        headers=normal_user_headers,
    )
    assert user_mod_resp.status_code == 403

    # 3. Admin moderates report -> 200 OK
    admin_mod_resp = await async_client.patch(
        f"/api/v1/community-reports/{report_id}",
        json=mod_payload,
        headers=admin_user_headers,
    )
    assert admin_mod_resp.status_code == 200
    updated = admin_mod_resp.json()
    assert updated["status"] == "VERIFIED"
    assert updated["is_verified"] is True
    assert updated["verified_at"] is not None

    # 4. Now that it is verified, it appears in public list
    public_list = await async_client.get("/api/v1/community-reports")
    assert public_list.status_code == 200
    report_ids = [r["id"] for r in public_list.json()["items"]]
    assert report_id in report_ids


@pytest.mark.asyncio
async def test_admin_rejection_with_reason(
    async_client: AsyncClient, normal_user_headers, admin_user_headers
):
    """Verify admin can reject report with reason and owner can see reason in my-reports."""
    # 1. Create report
    form_data = {
        "category": "extreme_heat",
        "description": "Thermometer showing 55C in shade.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    create_resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    report_id = create_resp.json()["id"]

    # 2. Admin rejects report with reason
    reject_payload = {
        "status": "REJECTED",
        "rejection_reason": "Thermometer reading appears uncalibrated and exceeds meteorological record.",
    }
    rej_resp = await async_client.patch(
        f"/api/v1/community-reports/{report_id}",
        json=reject_payload,
        headers=admin_user_headers,
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "REJECTED"

    # 3. User checks my-reports and sees rejection reason
    my_resp = await async_client.get(
        "/api/v1/community-reports/my-reports",
        headers=normal_user_headers,
    )
    assert my_resp.status_code == 200
    my_reports = my_resp.json()
    rej_item = next((r for r in my_reports if r["id"] == report_id), None)
    assert rej_item is not None
    assert rej_item["status"] == "REJECTED"
    assert "uncalibrated" in rej_item["rejection_reason"]


@pytest.mark.asyncio
async def test_nearby_geospatial_query(
    async_client: AsyncClient, normal_user_headers, admin_user_headers
):
    """Verify querying reports within radius_km."""
    # 1. Submit Kanpur report
    form_data = {
        "category": "road_blocked",
        "description": "Fallen transmission line blocking GT Road.",
        "latitude": "26.4499",
        "longitude": "80.3319",
        "location_name": "GT Road, Kanpur",
    }
    r = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    report_id = r.json()["id"]

    # Verify report by admin
    await async_client.patch(
        f"/api/v1/community-reports/{report_id}",
        json={"status": "VERIFIED"},
        headers=admin_user_headers,
    )

    # Query nearby Kanpur (within 10 km)
    nearby_resp = await async_client.get(
        "/api/v1/community-reports/nearby",
        params={"latitude": 26.4500, "longitude": 80.3320, "radius_km": 10},
    )
    assert nearby_resp.status_code == 200
    items = nearby_resp.json()
    assert any(item["id"] == report_id for item in items)

    # Query far away (Mumbai coordinates) -> should NOT contain Kanpur report
    mumbai_resp = await async_client.get(
        "/api/v1/community-reports/nearby",
        params={"latitude": 19.0760, "longitude": 72.8777, "radius_km": 20},
    )
    assert mumbai_resp.status_code == 200
    mumbai_items = mumbai_resp.json()
    assert not any(item["id"] == report_id for item in mumbai_items)


@pytest.mark.asyncio
async def test_delete_report_permissions(
    async_client: AsyncClient, normal_user_headers, admin_user_headers
):
    """Verify owner can delete PENDING report; other normal users cannot."""
    # Create report as user A
    form_data = {
        "category": "high_wind",
        "description": "Roof tin sheets rattling in strong gusts.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    create_resp = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    report_id = create_resp.json()["id"]

    # User B tries to delete User A's report -> 403 Forbidden
    other_token = create_access_token(
        data={"sub": "user_other_888", "username": "other_user", "role": "user"}
    )
    other_headers = {"Authorization": f"Bearer {other_token}"}
    del_resp = await async_client.delete(
        f"/api/v1/community-reports/{report_id}",
        headers=other_headers,
    )
    assert del_resp.status_code == 403

    # User A deletes their own pending report -> 200 OK
    del_owner_resp = await async_client.delete(
        f"/api/v1/community-reports/{report_id}",
        headers=normal_user_headers,
    )
    assert del_owner_resp.status_code == 200


@pytest.mark.asyncio
async def test_official_warning_segregation(async_client: AsyncClient, normal_user_headers, admin_user_headers):
    """Verify Community Reports explicitly declare source=COMMUNITY and never claim to be official IMD warnings."""
    form_data = {
        "category": "storm",
        "description": "Severe squall passed through southern bypass.",
        "latitude": "26.4499",
        "longitude": "80.3319",
    }
    r = await async_client.post(
        "/api/v1/community-reports",
        data=form_data,
        headers=normal_user_headers,
    )
    report_id = r.json()["id"]

    # Verify report by admin
    await async_client.patch(
        f"/api/v1/community-reports/{report_id}",
        json={"status": "VERIFIED"},
        headers=admin_user_headers,
    )

    get_resp = await async_client.get(f"/api/v1/community-reports/{report_id}")
    assert get_resp.status_code == 200
    report = get_resp.json()
    assert report["source"] == "COMMUNITY"
    assert "IMD" not in report.get("source", "")
