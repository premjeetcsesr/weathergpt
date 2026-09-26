from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import math

from app.schemas.map import Coordinates, MapLocation
from app.services.map_service import map_service
from app.db.database import get_database

router = APIRouter(
    prefix="/map",
    tags=["Map"]
)


def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two lat/lon coordinates."""
    r = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


@router.get("/reverse-geocode")
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude coordinate"),
):
    """
    Convert selected map coordinates into an area/location name via OSM Nominatim.
    """
    try:
        result = await map_service.reverse_geocode(
            latitude=lat,
            longitude=lon
        )

        return {
            "success": True,
            "location": result
        }
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to resolve selected location: {str(exc)}"
        )


@router.get("/location")
async def get_selected_location(
    lat: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude coordinate"),
):
    """
    Get normalized location information for selected coordinates.
    """
    try:
        location = await map_service.reverse_geocode(
            latitude=lat,
            longitude=lon
        )

        return {
            "success": True,
            "location": location
        }
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Location service temporarily unavailable: {str(exc)}"
        )


@router.get("/community-reports/nearby")
async def nearby_community_reports(
    lat: float = Query(..., ge=-90, le=90, description="Center latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Center longitude"),
    radius_km: float = Query(10.0, ge=0.1, le=100.0, description="Search radius in kilometers"),
    category: Optional[str] = Query(None, description="Filter by report category"),
    db: Optional[AsyncIOMotorDatabase] = Depends(get_database),
):
    """
    Get verified community weather reports around selected location using MongoDB 2dsphere $near.
    """
    if db is None:
        return {
            "success": True,
            "center": {
                "latitude": lat,
                "longitude": lon
            },
            "radius_km": radius_km,
            "count": 0,
            "reports": []
        }

    query: Dict[str, Any] = {
        "status": {"$in": ["VERIFIED", "PENDING"]},
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "$maxDistance": int(radius_km * 1000)
            }
        }
    }


    if category:
        query["category"] = category

    reports: List[Dict[str, Any]] = []

    try:
        cursor = db.community_reports.find(query).limit(200)

        async for report in cursor:
            coords = report.get("location", {}).get("coordinates", [None, None])
            rep_lon = coords[0]
            rep_lat = coords[1]

            distance_km = None
            if rep_lat is not None and rep_lon is not None:
                distance_km = round(calculate_haversine_km(lat, lon, rep_lat, rep_lon), 2)

            reported_at = report.get("reported_at")
            if reported_at and hasattr(reported_at, "isoformat"):
                reported_at_str = reported_at.isoformat()
            elif reported_at:
                reported_at_str = str(reported_at)
            else:
                reported_at_str = None

            reports.append({
                "id": str(report.get("_id", "")),
                "category": report.get("category", "other"),
                "description": report.get("description"),
                "longitude": rep_lon,
                "latitude": rep_lat,
                "image_url": report.get("image_url"),
                "status": report.get("status", "VERIFIED"),
                "reported_at": reported_at_str,
                "distance_km": distance_km
            })
    except Exception as exc:
        # Fallback query if 2dsphere index is still building or other geospatial error occurs
        try:
            fallback_cursor = db.community_reports.find(
                {"status": "VERIFIED", **({"category": category} if category else {})}
            ).limit(200)
            async for report in fallback_cursor:
                coords = report.get("location", {}).get("coordinates", [None, None])
                rep_lon = coords[0]
                rep_lat = coords[1]
                if rep_lat is not None and rep_lon is not None:
                    dist = calculate_haversine_km(lat, lon, rep_lat, rep_lon)
                    if dist <= radius_km:
                        reported_at = report.get("reported_at")
                        reported_at_str = reported_at.isoformat() if hasattr(reported_at, "isoformat") else str(reported_at) if reported_at else None
                        reports.append({
                            "id": str(report.get("_id", "")),
                            "category": report.get("category", "other"),
                            "description": report.get("description"),
                            "longitude": rep_lon,
                            "latitude": rep_lat,
                            "image_url": report.get("image_url"),
                            "status": report.get("status", "VERIFIED"),
                            "reported_at": reported_at_str,
                            "distance_km": round(dist, 2)
                        })
        except Exception:
            pass

    return {
        "success": True,
        "center": {
            "latitude": lat,
            "longitude": lon
        },
        "radius_km": radius_km,
        "count": len(reports),
        "reports": reports
    }
