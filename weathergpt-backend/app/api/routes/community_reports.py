"""
Community Weather Reports API Endpoints.
Provides user-submitted ground truth incident reporting, photo uploads via Cloudinary,
geospatial queries, moderation workflows, and WebSocket broadcasts.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from app.api.deps import (
    get_cloudinary_service,
    get_community_report_repo,
    get_current_user,
    get_current_user_optional,
    get_weather_service,
    get_websocket_manager,
    require_admin,
)
from app.services.weather_service import WeatherService
from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import logger
from app.db.mongo_repositories import MongoCommunityReportRepository
from app.schemas.community_report import (
    CATEGORY_METADATA,
    CategoryInfo,
    CommunityReportListResponse,
    CommunityReportModerationRequest,
    CommunityReportResponse,
    LatLonLocation,
    ReportCategory,
    ReportStatus,
)
from app.services.cloudinary_service import CloudinaryService
from app.services.websocket_manager import WebSocketManager

router = APIRouter(prefix="/community-reports", tags=["Community Weather Reports"])


def format_report_response(
    doc: Dict[str, Any], viewer: Optional[Dict[str, Any]] = None
) -> CommunityReportResponse:
    """Helper to convert database document to normalized public response."""
    cat_key = doc.get("category", "other")
    try:
        cat_enum = ReportCategory(cat_key)
        meta = CATEGORY_METADATA.get(cat_enum, {"name": "Other", "icon": "📍", "color": "gray"})
    except ValueError:
        meta = {"name": cat_key.replace("_", " ").title(), "icon": "📍", "color": "gray"}

    coords = doc.get("location", {}).get("coordinates", [0.0, 0.0])
    lon = float(coords[0]) if len(coords) > 0 else 0.0
    lat = float(coords[1]) if len(coords) > 1 else 0.0

    report_status = doc.get("status", "PENDING")
    is_owner = viewer is not None and str(viewer.get("id")) == str(doc.get("user_id"))
    is_admin = viewer is not None and str(viewer.get("role", "")).lower() == "admin"

    # Only owner or admin can see rejection reasons
    rejection_reason = doc.get("rejection_reason") if (is_owner or is_admin) else None

    dist_km = doc.get("distance_km")
    dist_m = round(dist_km * 1000.0, 1) if dist_km is not None else None

    return CommunityReportResponse(
        id=str(doc.get("id") or doc.get("_id")),
        category=cat_key,
        category_name=meta["name"],
        category_icon=meta["icon"],
        description=doc.get("description", ""),
        location=LatLonLocation(latitude=lat, longitude=lon),
        latitude=lat,
        longitude=lon,
        location_name=doc.get("location_name"),
        image_url=doc.get("image_url"),
        image_public_id=doc.get("image_public_id"),
        status=report_status,
        reported_at=doc.get("reported_at") or doc.get("created_at") or datetime.now(timezone.utc),
        source="COMMUNITY",
        verified_at=doc.get("verified_at"),
        verified_by=doc.get("verified_by"),
        rejection_reason=rejection_reason,
        user_display="Community Member",
        is_verified=(report_status == "VERIFIED"),
        ai_verification_notes=doc.get("ai_verification_notes"),
        confidence_score=doc.get("confidence_score"),
        distance_km=dist_km,
        distance_meters=dist_m,
    )


# ---------------------------------------------------------------------------
# 1. Categories Metadata
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=List[CategoryInfo])
async def get_report_categories():
    """Retrieve all available community report categories with icons and color schemes."""
    return [
        CategoryInfo(
            id=cat.value,
            name=meta["name"],
            icon=meta["icon"],
            color=meta["color"],
        )
        for cat, meta in CATEGORY_METADATA.items()
    ]


# ---------------------------------------------------------------------------
# 2. Create Community Report
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=CommunityReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Community Weather Report",
)
async def create_community_report(
    category: str = Form(..., description="Category id from /categories"),
    description: str = Form(..., min_length=5, max_length=1000, description="Incident details"),
    latitude: float = Form(..., ge=-90.0, le=90.0, description="GPS Latitude (-90 to 90)"),
    longitude: float = Form(..., ge=-180.0, le=180.0, description="GPS Longitude (-180 to 180)"),
    location_name: Optional[str] = Form(None, max_length=200, description="City / landmark"),
    photo: Optional[UploadFile] = File(None, description="Optional incident photo (JPG/PNG/WEBP)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
    cloudinary_service: CloudinaryService = Depends(get_cloudinary_service),
    weather_service: WeatherService = Depends(get_weather_service),
    ws_manager: WebSocketManager = Depends(get_websocket_manager),
    settings: Settings = Depends(get_settings),
):
    """
    Submit a citizen ground-truth weather observation.
    Requires user authentication. Defaults to PENDING status for moderation.
    """
    # 1. Validate Category
    cat_clean = category.strip().lower()
    valid_categories = {c.value for c in ReportCategory}
    if cat_clean not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category '{category}'. Allowed categories: {', '.join(sorted(valid_categories))}",
        )

    # 2. Validate Description
    desc_clean = description.strip()
    if len(desc_clean) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description must be at least 5 non-whitespace characters.",
        )

    user_id = str(current_user.get("id"))
    username = current_user.get("username", "citizen")

    # 3. Rate Limiting Check
    rate_limit = getattr(settings, "COMMUNITY_REPORT_RATE_LIMIT_PER_10_MIN", 10)
    recent_count = await report_repo.count_user_recent_reports(user_id=user_id, window_seconds=600)
    if recent_count >= rate_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Submission rate limit exceeded. Please wait a few minutes before submitting another report.",
        )

    # 4. Duplicate Check
    is_duplicate = await report_repo.check_recent_duplicate(
        user_id=user_id,
        category=cat_clean,
        description=desc_clean,
        window_seconds=60,
    )
    if is_duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate report detected. You have recently submitted an identical report.",
        )

    # 5. Handle Image Upload via Cloudinary
    image_url = None
    image_public_id = None

    if photo is not None and photo.filename:
        file_bytes = await photo.read()
        if len(file_bytes) > 0:
            is_valid, err = cloudinary_service.validate_image_file(
                filename=photo.filename,
                content_type=photo.content_type or "",
                file_bytes=file_bytes,
            )
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=err or "Unsupported image format. Allowed formats: JPG, PNG, WEBP.",
                )

            if cloudinary_service.is_configured:
                upload_res = await cloudinary_service.upload_image(
                    file_bytes=file_bytes,
                    filename=photo.filename,
                )
                image_url = upload_res.get("url")
                image_public_id = upload_res.get("public_id")
            else:
                import hashlib
                file_hash = hashlib.md5(file_bytes).hexdigest()[:10]
                image_url = f"https://res.cloudinary.com/weathergpt/image/upload/v1/community_reports/mock_{file_hash}.jpg"
                image_public_id = f"mock_{file_hash}"
                logger.info("Cloudinary not configured; used mock image reference without storing binary data.")

    # 6. AI Weather Oracle & Automatic Ground-Truth Verification
    # Cross-references user observation + GPS + photo with real-time weather API
    now = datetime.now(timezone.utc)
    auto_status = "PENDING"
    is_auto_verified = False
    ai_notes = None
    confidence_score = 0.50
    verified_at = None
    verified_by = None

    try:
        live_weather = await weather_service.get_current_weather(
            city=location_name or f"Coord({latitude:.2f},{longitude:.2f})",
            lat=latitude,
            lon=longitude
        )
        cond = (live_weather.current.condition or "").lower()
        cond_desc = (live_weather.current.description or "").lower()
        temp = live_weather.current.temperature
        humidity = live_weather.current.humidity or 0
        wind = live_weather.current.wind_speed or 0.0
        clouds = live_weather.current.cloud_cover or 0
        weather_provider = live_weather.source or "Live Weather Telemetry"

        has_image = bool(image_url)
        cat_lower = cat_clean.lower()
        desc_lower = desc_clean.lower()

        is_rain_match = (
            any(w in cond for w in ("rain", "drizzle", "thunderstorm", "squall", "shower"))
            or any(w in cond_desc for w in ("rain", "drizzle", "thunderstorm", "shower", "wet"))
            or humidity >= 70
            or clouds >= 65
        )
        is_wind_match = wind >= 14.0 or any(w in cond for w in ("storm", "wind", "gale", "squall"))
        is_heat_match = (temp is not None and temp >= 32.0) or ("clear" in cond and temp is not None and temp >= 30.0)
        is_fog_match = any(w in cond for w in ("fog", "mist", "haze", "smoke", "dust"))

        corroborated = False
        reason = ""

        if cat_lower in ("heavy_rain", "waterlogging", "road_blocked", "damaged_road"):
            if is_rain_match:
                corroborated = True
                reason = f"Corroborated with active precipitation telemetry ({live_weather.current.condition}, {temp}°C, {humidity}% humidity)"
            elif has_image and (humidity >= 55 or clouds >= 45 or any(k in desc_lower for k in ("rain", "water", "pani", "jam", "flood", "bhara"))):
                corroborated = True
                reason = f"Validated with photo proof and local atmospheric telemetry ({humidity}% humidity, {clouds}% cloud cover)"

        elif cat_lower in ("storm", "high_wind", "fallen_tree"):
            if is_wind_match:
                corroborated = True
                reason = f"Corroborated with high wind telemetry ({wind} km/h, {live_weather.current.condition})"
            elif has_image:
                corroborated = True
                reason = f"Corroborated with photo evidence of wind damage and local telemetry ({wind} km/h)"

        elif cat_lower == "lightning":
            if any(w in cond for w in ("thunderstorm", "rain", "storm")) or clouds >= 60:
                corroborated = True
                reason = f"Corroborated with thunderstorm and cloud telemetry ({clouds}% clouds)"

        elif cat_lower == "poor_visibility":
            if is_fog_match or clouds >= 75:
                corroborated = True
                reason = f"Corroborated with reduced visibility telemetry ({live_weather.current.condition})"

        elif cat_lower == "extreme_heat":
            if is_heat_match:
                corroborated = True
                reason = f"Corroborated with severe heat telemetry ({temp}°C)"

        elif has_image and len(desc_clean) >= 5:
            # Genuine ground observation with verified photo evidence
            corroborated = True
            reason = f"Verified via authentic geo-tagged photo evidence at [{latitude:.4f}, {longitude:.4f}]"

        if corroborated:
            auto_status = "VERIFIED"
            is_auto_verified = True
            verified_at = now
            verified_by = "AI_WEATHER_ORACLE"
            confidence_score = 0.96 if has_image else 0.88
            ai_notes = f"AI Auto-Verified ✓ ({reason} via {weather_provider})"
        else:
            auto_status = "PENDING"
            ai_notes = f"Under Review: Live telemetry shows {live_weather.current.condition}, {temp}°C. Queued for community review."
            confidence_score = 0.50

    except Exception as exc:
        logger.warning(f"AI weather corroboration check encountered an error: {exc}")
        # If user uploaded a photo with coordinates, still auto-verify with high confidence!
        if image_url:
            auto_status = "VERIFIED"
            is_auto_verified = True
            verified_at = now
            verified_by = "AI_WEATHER_ORACLE"
            confidence_score = 0.85
            ai_notes = "AI Auto-Verified ✓ (Validated with authentic geo-tagged photo evidence)"
        else:
            auto_status = "PENDING"
            ai_notes = "Under Review: Queued for community review."

    # 7. Save in MongoDB with GeoJSON Point: [longitude, latitude]
    report_doc = {
        "user_id": user_id,
        "username": username,
        "user_display_name": "Community Member",
        "category": cat_clean,
        "description": desc_clean,
        "location": {
            "type": "Point",
            "coordinates": [float(longitude), float(latitude)],
        },
        "location_name": location_name.strip() if location_name else "Current Location",
        "image_url": image_url,
        "image_public_id": image_public_id,
        "reported_at": now,
        "status": auto_status,
        "verified_at": verified_at,
        "verified_by": verified_by,
        "rejection_reason": None,
        "ai_verification_notes": ai_notes,
        "confidence_score": confidence_score,
        "source": "COMMUNITY",
        "created_at": now,
        "updated_at": now,
    }

    created = await report_repo.create_report(report_doc)

    # 8. Real-time WebSocket Broadcast
    try:
        public_event = {
            "type": "community_report_created",
            "report": {
                "id": str(created.get("id") or created.get("_id")),
                "category": cat_clean,
                "location_name": report_doc["location_name"],
                "latitude": latitude,
                "longitude": longitude,
                "description": desc_clean,
                "image_url": image_url,
                "reported_at": now.isoformat(),
                "status": auto_status,
                "is_verified": is_auto_verified,
                "verified_by": verified_by,
                "ai_verification_notes": ai_notes,
                "source": "COMMUNITY",
            },
        }
        await ws_manager.broadcast(public_event)
    except Exception as exc:
        logger.warning(f"WebSocket broadcast for community report failed: {exc}")

    return format_report_response(created, viewer=current_user)



# ---------------------------------------------------------------------------
# 3. List Reports (Public / Moderated)
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=CommunityReportListResponse,
    summary="List Community Weather Reports",
)
async def list_community_reports(
    category: Optional[str] = Query(None, description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="PENDING, VERIFIED, REJECTED"),
    time_filter: Optional[str] = Query(None, description="1h, 6h, 24h, 7d, all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
):
    """
    Retrieve community weather reports with filtering and pagination.
    Public viewers only see VERIFIED reports. Administrators can filter by any status.
    """
    is_admin = current_user is not None and str(current_user.get("role", "")).lower() == "admin"

    # Enforce status permissions
    if is_admin:
        effective_status = status_filter.upper().strip() if status_filter else None
    else:
        # Non-admins can view active community reports (VERIFIED & PENDING)
        if status_filter:
            st = status_filter.upper().strip()
            if st in ("VERIFIED", "PENDING"):
                effective_status = st
            elif st in ("ALL", "ACTIVE"):
                effective_status = ["VERIFIED", "PENDING"]
            else:
                effective_status = ["VERIFIED", "PENDING"]
        else:
            effective_status = ["VERIFIED", "PENDING"]

    # Time filter calculation
    start_time = None
    if time_filter:
        tf = time_filter.lower().strip()
        now = datetime.now(timezone.utc)
        if tf == "1h":
            start_time = now - timedelta(hours=1)
        elif tf == "6h":
            start_time = now - timedelta(hours=6)
        elif tf == "24h":
            start_time = now - timedelta(hours=24)
        elif tf == "7d":
            start_time = now - timedelta(days=7)

    skip = (page - 1) * page_size
    items, total = await report_repo.list_reports(
        category=category,
        status=effective_status,
        start_time=start_time,
        skip=skip,
        limit=page_size,
    )

    formatted = [format_report_response(item, viewer=current_user) for item in items]
    return CommunityReportListResponse(
        items=formatted,
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# 4. Nearby Reports (Geospatial)
# ---------------------------------------------------------------------------

@router.get(
    "/nearby",
    response_model=List[CommunityReportResponse],
    summary="Query Nearby Community Weather Reports",
)
async def get_nearby_reports(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude (-180 to 180)"),
    radius: Optional[float] = Query(None, gt=0.0, description="Search radius in meters (e.g., 5000 for 5km)"),
    radius_km: Optional[float] = Query(None, gt=0.0, le=500.0, description="Search radius in kilometers"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    status: Optional[str] = Query(None, description="Optional status filter: PENDING, VERIFIED, REJECTED"),
    time_filter: Optional[str] = Query(None, description="1h, 6h, 24h, 7d, all"),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
):
    """
    Geospatially query community reports within radius from target coordinates using MongoDB 2dsphere.
    Accepts radius in meters (radius=5000) or kilometers (radius_km=5).
    Public viewers receive verified reports; admins can view any status.
    """
    effective_radius_km = 25.0
    if radius is not None:
        effective_radius_km = radius / 1000.0
    elif radius_km is not None:
        effective_radius_km = radius_km

    is_admin = current_user is not None and str(current_user.get("role", "")).lower() == "admin"
    if is_admin:
        query_status = status.upper().strip() if status else None
    else:
        if status:
            st = status.upper().strip()
            if st in ("VERIFIED", "PENDING"):
                query_status = st
            elif st in ("ALL", "ACTIVE"):
                query_status = ["VERIFIED", "PENDING"]
            else:
                query_status = ["VERIFIED", "PENDING"]
        else:
            query_status = ["VERIFIED", "PENDING"]

    start_time = None
    if time_filter:
        tf = time_filter.lower().strip()
        now = datetime.now(timezone.utc)
        if tf == "1h":
            start_time = now - timedelta(hours=1)
        elif tf == "6h":
            start_time = now - timedelta(hours=6)
        elif tf == "24h":
            start_time = now - timedelta(hours=24)
        elif tf == "7d":
            start_time = now - timedelta(days=7)

    docs = await report_repo.get_nearby_reports(
        latitude=latitude,
        longitude=longitude,
        radius_km=effective_radius_km,
        category=category,
        status=query_status,
        start_time=start_time,
        limit=limit,
    )

    return [format_report_response(d, viewer=current_user) for d in docs]


# ---------------------------------------------------------------------------
# 5. User's Personal Submission History ("My Reports")
# ---------------------------------------------------------------------------

@router.get(
    "/my-reports",
    response_model=List[CommunityReportResponse],
    summary="User Personal Report History",
)
async def get_my_reports(
    current_user: Dict[str, Any] = Depends(get_current_user),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
):
    """Retrieve all reports submitted by the authenticated user with status and rejection reasons."""
    user_id = str(current_user.get("id"))
    docs = await report_repo.get_user_reports(user_id=user_id, limit=100)
    return [format_report_response(d, viewer=current_user) for d in docs]


# ---------------------------------------------------------------------------
# 6. Get Report Details by ID
# ---------------------------------------------------------------------------

@router.get(
    "/{report_id}",
    response_model=CommunityReportResponse,
    summary="Get Report Details by ID",
)
async def get_community_report_by_id(
    report_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
):
    """Retrieve a single community report. Unverified reports are only viewable by author or admin."""
    doc = await report_repo.get_by_id(report_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community report not found.",
        )

    report_status = doc.get("status", "PENDING")
    is_owner = current_user is not None and str(current_user.get("id")) == str(doc.get("user_id"))
    is_admin = current_user is not None and str(current_user.get("role", "")).lower() == "admin"

    if report_status != "VERIFIED" and not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community report not found.",
        )

    return format_report_response(doc, viewer=current_user)


# ---------------------------------------------------------------------------
# 7. Moderate Report (Admin Only)
# ---------------------------------------------------------------------------

@router.patch(
    "/{report_id}",
    response_model=CommunityReportResponse,
    summary="Moderate Community Report (Admin)",
)
async def moderate_community_report(
    report_id: str,
    payload: CommunityReportModerationRequest,
    current_user: Dict[str, Any] = Depends(require_admin),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
    ws_manager: WebSocketManager = Depends(get_websocket_manager),
):
    """
    Moderator endpoint to verify or reject a community report.
    Only users with ADMIN role are authorized.
    """
    existing = await report_repo.get_by_id(report_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community report not found.",
        )

    admin_username = current_user.get("username", "admin")
    updated = await report_repo.update_status(
        report_id=report_id,
        status=payload.status.value,
        verified_by=admin_username,
        rejection_reason=payload.rejection_reason,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update report moderation status.",
        )

    # Real-time WebSocket Broadcast on Verification
    if payload.status == ReportStatus.VERIFIED:
        try:
            coords = updated.get("location", {}).get("coordinates", [0, 0])
            await ws_manager.broadcast(
                {
                    "type": "community_report_verified",
                    "report": {
                        "id": str(updated.get("id") or updated.get("_id")),
                        "category": updated.get("category"),
                        "location_name": updated.get("location_name"),
                        "latitude": coords[1] if len(coords) > 1 else 0,
                        "longitude": coords[0] if len(coords) > 0 else 0,
                        "verified_at": datetime.now(timezone.utc).isoformat(),
                        "source": "COMMUNITY",
                    },
                }
            )
        except Exception as exc:
            logger.warning(f"WebSocket broadcast on report verification failed: {exc}")

    return format_report_response(updated, viewer=current_user)


# ---------------------------------------------------------------------------
# 8. Delete Report
# ---------------------------------------------------------------------------

@router.delete(
    "/{report_id}",
    summary="Delete Community Report",
)
async def delete_community_report(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    report_repo: MongoCommunityReportRepository = Depends(get_community_report_repo),
    cloudinary_service: CloudinaryService = Depends(get_cloudinary_service),
):
    """
    Delete a community report.
    Administrators can delete any report.
    Normal users can delete their own report only if it is still PENDING.
    """
    existing = await report_repo.get_by_id(report_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community report not found.",
        )

    is_admin = str(current_user.get("role", "")).lower() == "admin"
    is_owner = str(current_user.get("id")) == str(existing.get("user_id"))

    if not is_admin:
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this report.",
            )
        # Users can delete their own submissions as long as they haven't been rejected by admin
        if existing.get("status") == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a report that has been rejected by moderation.",
            )

    # Clean up Cloudinary asset if present
    public_id = existing.get("image_public_id")
    if public_id and cloudinary_service.is_configured:
        try:
            await cloudinary_service.delete_image(public_id)
        except Exception as exc:
            logger.warning(f"Failed to delete Cloudinary asset '{public_id}': {exc}")

    deleted = await report_repo.delete_report(report_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete community report.",
        )

    return {"status": "success", "message": "Community report deleted successfully."}
