"""
Authentication and User Profile API Routes.
Provides:
- POST /api/v1/auth/register : Register a new user
- POST /api/v1/auth/login    : Authenticate and obtain JWT Bearer token
- GET  /api/v1/auth/me       : Get current authenticated user profile
- PUT  /api/v1/auth/preferences : Update user personalized preferences
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_user_repo
from app.core.security import create_access_token, validate_password_strength, verify_password
from app.db.mongo_repositories import MongoUserRepository
from app.schemas.mongo_models import (
    TokenResponse,
    UserLoginRequest,
    UserProfileResponse,
    UserPreferencesUpdateRequest,
    UserRegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Users"])


@router.post(
    "/register",
    summary="Register New User",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    description="Create a new user account with personalized preferences and return a JWT access token.",
)
async def register_user(
    request: UserRegisterRequest,
    user_repo: MongoUserRepository = Depends(get_user_repo),
) -> TokenResponse:
    # Validate password strength
    is_valid, err_msg = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    # Check if email already registered
    existing_email = await user_repo.get_by_email(request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Check if username already registered
    existing_username = await user_repo.get_by_username(request.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists.",
        )

    # Create user in MongoDB
    preferences_dict = request.preferences.model_dump() if request.preferences else None
    user_doc = await user_repo.create_user(
        email=request.email,
        username=request.username,
        plain_password=request.password,
        full_name=request.full_name,
        role=request.role or "user",
        preferences=preferences_dict,
    )

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable. Could not register user.",
        )

    user_profile = UserProfileResponse.model_validate(user_doc)
    access_token = create_access_token(
        data={
            "sub": str(user_profile.id),
            "username": user_profile.username,
            "role": user_profile.role,
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_profile,
    )


@router.post(
    "/login",
    summary="User Login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    description="Authenticate with email/username and password to receive a JWT access token.",
)
async def login_user(
    request: UserLoginRequest,
    user_repo: MongoUserRepository = Depends(get_user_repo),
) -> TokenResponse:
    user_doc = await user_repo.get_by_email_or_username(request.email_or_username)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(request.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    user_profile = UserProfileResponse.model_validate(user_doc)
    access_token = create_access_token(
        data={
            "sub": str(user_profile.id),
            "username": user_profile.username,
            "role": user_profile.role,
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_profile,
    )


@router.get(
    "/me",
    summary="Get Current User Profile",
    response_model=UserProfileResponse,
    description="Retrieve the authenticated user's profile and preferences.",
)
async def get_my_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserProfileResponse:
    return UserProfileResponse.model_validate(current_user)


@router.put(
    "/preferences",
    summary="Update User Preferences",
    response_model=UserProfileResponse,
    description="Update user temperature units (°C/°F), theme (dark/light), default city, and language.",
)
async def update_user_preferences(
    request: UserPreferencesUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_repo: MongoUserRepository = Depends(get_user_repo),
) -> UserProfileResponse:
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    updated_user = await user_repo.update_preferences(
        user_id=current_user["id"],
        preferences=update_data,
    )
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences.",
        )
    return UserProfileResponse.model_validate(updated_user)
