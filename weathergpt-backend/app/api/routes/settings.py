from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, status
from app.api.deps import get_current_user_optional, get_user_repo
from app.db.mongo_repositories import MongoUserRepository
from app.schemas.settings import LanguagePreferenceRequest, LanguagePreferenceResponse
from app.services.language_service import LanguageService

router = APIRouter(prefix="/settings", tags=["User Settings"])


@router.get(
    "/language",
    summary="Get Language Preference",
    response_model=LanguagePreferenceResponse,
    status_code=status.HTTP_200_OK,
    description="Retrieve current user language preference or default fallback ('en').",
)
async def get_language_preference(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_repo: MongoUserRepository = Depends(get_user_repo),
) -> LanguagePreferenceResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    current_lang = "en"
    if user_id:
        current_lang = await user_repo.get_language_preference(user_id)

    return LanguagePreferenceResponse(
        success=True,
        language=current_lang,
        status="ok",
        speech_locale=LanguageService.get_speech_locale(current_lang),
        supported_languages=LanguageService.get_supported_languages(),
    )


@router.post(
    "/language",
    summary="Update Language Preference",
    response_model=LanguagePreferenceResponse,
    status_code=status.HTTP_200_OK,
    description="Update user language preference ('en' or 'hi') in MongoDB.",
)
async def update_language_preference(
    request: LanguagePreferenceRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    user_repo: MongoUserRepository = Depends(get_user_repo),
) -> LanguagePreferenceResponse:
    lang = request.language
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    if user_id:
        await user_repo.update_language_preference(user_id, lang)

    return LanguagePreferenceResponse(
        success=True,
        language=lang,
        status="updated",
        speech_locale=LanguageService.get_speech_locale(lang),
        supported_languages=LanguageService.get_supported_languages(),
        message=f"Language preference updated to {lang}.",
    )
