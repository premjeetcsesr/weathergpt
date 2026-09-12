from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_geocoding_service
from app.schemas.location import LocationItem
from app.services.geocoding_service import GeocodingService
from app.utils.validators import validate_city_name

router = APIRouter(prefix="/locations", tags=["Locations"])


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
