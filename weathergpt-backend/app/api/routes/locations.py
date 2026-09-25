from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_user_optional, get_geocoding_service, get_location_repo
from app.db.mongo_repositories import MongoLocationRepository
from app.schemas.location import LocationItem
from app.schemas.mongo_models import (
    SavedLocationCreate,
    SavedLocationListResponse,
    SavedLocationResponse,
)
from app.services.geocoding_service import GeocodingService
from app.utils.validators import validate_city_name

router = APIRouter(prefix="/locations", tags=["Locations & Saved Places"])


@router.get(
    "/search",
    summary="Search Locations Autocomplete",
    response_model=List[LocationItem],
    description="Search global cities and geographical places matching query text.",
)
async def search_locations(
    q: Optional[str] = Query(default=None, description="Search query string"),
    limit: int = Query(default=5, ge=1, le=10, description="Max result count"),
    geocoding_service: GeocodingService = Depends(get_geocoding_service),
) -> List[LocationItem]:
    if not q or not q.strip():
        return []
    cleaned_query = validate_city_name(q)
    return await geocoding_service.search_locations(query=cleaned_query, limit=limit)


@router.post(
    "/saved",
    summary="Save / Favorite Location",
    response_model=SavedLocationResponse,
    status_code=status.HTTP_201_CREATED,
    description="Save a location bookmark/favorite with geospatial coordinates and tags (Home, Work, Vacation) into MongoDB.",
)
async def add_saved_location(
    request: SavedLocationCreate,
    location_repo: MongoLocationRepository = Depends(get_location_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> SavedLocationResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    doc = await location_repo.add_saved_location(
        name=request.name,
        latitude=request.latitude,
        longitude=request.longitude,
        state=request.state,
        country=request.country,
        tag=request.tag or "Favorite",
        user_id=user_id,
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save location into database.",
        )
    return SavedLocationResponse.model_validate(doc)


@router.get(
    "/saved",
    summary="Get Saved Locations",
    response_model=SavedLocationListResponse,
    description="Retrieve all bookmarked favorite locations for the user from MongoDB.",
)
async def get_saved_locations(
    limit: int = Query(default=50, ge=1, le=100),
    location_repo: MongoLocationRepository = Depends(get_location_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> SavedLocationListResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    docs = await location_repo.get_saved_locations(user_id=user_id, limit=limit)
    items = [SavedLocationResponse.model_validate(d) for d in docs]
    return SavedLocationListResponse(items=items, total=len(items))


@router.delete(
    "/saved/{location_id}",
    summary="Delete Saved Location",
    status_code=status.HTTP_200_OK,
    description="Remove a bookmarked location from MongoDB.",
)
async def delete_saved_location(
    location_id: str,
    location_repo: MongoLocationRepository = Depends(get_location_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    deleted = await location_repo.delete_saved_location(location_id=location_id, user_id=user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved location '{location_id}' not found.",
        )
    return {"success": True, "message": f"Saved location '{location_id}' removed successfully."}

