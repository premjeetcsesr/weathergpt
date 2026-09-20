from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query

from app.services.google_places_service import GooglePlacesService

router = APIRouter(prefix="/places", tags=["Nearby Places"])


def get_google_places_service() -> GooglePlacesService:
    return GooglePlacesService()


@router.get(
    "/nearby",
    summary="Find Nearby Essential Services",
    response_model=List[Dict[str, Any]],
)
async def get_nearby_places(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    category: str = Query("hospital", pattern="^(hospital|pharmacy|emergency_room)$"),
    radius: int = Query(5000, ge=100, le=50000),
    places_service: GooglePlacesService = Depends(get_google_places_service),
) -> List[Dict[str, Any]]:
    return await places_service.nearby_search(
        latitude=lat,
        longitude=lon,
        place_type=category,
        radius=radius,
    )
