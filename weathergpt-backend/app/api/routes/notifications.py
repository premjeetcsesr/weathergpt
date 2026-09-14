"""
Weather Alerts & User Notifications API Routes.
Provides:
- GET  /api/v1/notifications : Get user & broadcast weather notifications
- GET  /api/v1/notifications/unread-count : Get count of unread notifications
- POST /api/v1/notifications : Dispatch/Create new weather notification
- PUT  /api/v1/notifications/{id}/read : Mark single notification as read
- PUT  /api/v1/notifications/read-all : Mark all notifications as read
- DELETE /api/v1/notifications/{id} : Delete notification
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_user_optional, get_notification_repo
from app.db.mongo_repositories import MongoNotificationRepository
from app.schemas.mongo_models import (
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["Weather Notifications"])


@router.get(
    "",
    summary="Get Notifications",
    response_model=NotificationListResponse,
    description="Fetch real-time weather notifications, disaster warnings, and alerts for the user from MongoDB.",
)
async def get_notifications(
    unread_only: bool = Query(default=False, description="Filter only unread notifications"),
    limit: int = Query(default=30, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    notification_repo: MongoNotificationRepository = Depends(get_notification_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> NotificationListResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    docs = await notification_repo.get_user_notifications(
        user_id=user_id,
        unread_only=unread_only,
        limit=limit,
        skip=skip,
    )
    unread_count = await notification_repo.get_unread_count(user_id=user_id)
    items = [NotificationResponse.model_validate(d) for d in docs]
    return NotificationListResponse(
        items=items,
        total=len(items),
        unread_count=unread_count,
    )


@router.get(
    "/unread-count",
    summary="Get Unread Notification Count",
    response_model=UnreadCountResponse,
    description="Get the total count of unread weather notifications for badge display.",
)
async def get_unread_count(
    notification_repo: MongoNotificationRepository = Depends(get_notification_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> UnreadCountResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    count = await notification_repo.get_unread_count(user_id=user_id)
    return UnreadCountResponse(unread_count=count)


@router.post(
    "",
    summary="Create Weather Notification",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    description="Create a weather alert, warning, or advisory notification in MongoDB.",
)
async def create_notification(
    request: NotificationCreate,
    notification_repo: MongoNotificationRepository = Depends(get_notification_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> NotificationResponse:
    target_user_id = request.user_id
    if not target_user_id and current_user and "id" in current_user:
        target_user_id = str(current_user["id"])

    doc = await notification_repo.create_notification(
        title=request.title,
        message=request.message,
        type=request.type,
        severity=request.severity,
        location=request.location,
        user_id=target_user_id,
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification.",
        )
    return NotificationResponse.model_validate(doc)


@router.put(
    "/{notification_id}/read",
    summary="Mark Notification as Read",
    status_code=status.HTTP_200_OK,
    description="Mark a specific notification as read in MongoDB.",
)
async def mark_notification_read(
    notification_id: str,
    notification_repo: MongoNotificationRepository = Depends(get_notification_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    success = await notification_repo.mark_as_read(
        notification_id=notification_id,
        user_id=user_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found.",
        )
    return {"success": True, "message": "Notification marked as read."}


@router.put(
    "/read-all",
    summary="Mark All Notifications as Read",
    status_code=status.HTTP_200_OK,
    description="Mark all unread notifications as read for the active user.",
)
async def mark_all_notifications_read(
    notification_repo: MongoNotificationRepository = Depends(get_notification_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    count = await notification_repo.mark_all_read(user_id=user_id)
    return {"success": True, "message": f"Marked {count} notifications as read."}


@router.delete(
    "/{notification_id}",
    summary="Delete Notification",
    status_code=status.HTTP_200_OK,
    description="Delete a notification from MongoDB.",
)
async def delete_notification(
    notification_id: str,
    notification_repo: MongoNotificationRepository = Depends(get_notification_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    deleted = await notification_repo.delete_notification(
        notification_id=notification_id,
        user_id=user_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found.",
        )
    return {"success": True, "message": "Notification deleted successfully."}
