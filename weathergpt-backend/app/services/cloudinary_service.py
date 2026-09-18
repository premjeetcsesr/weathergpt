"""
Cloudinary Image Storage Service for WeatherGPT Community Reports.
Handles secure upload, validation, transformations, and deletion of user weather observation photos.
"""

import asyncio
import os
from typing import Any, Dict, Optional, Tuple
import cloudinary
import cloudinary.uploader
import cloudinary.api

from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import logger

ALLOWED_MIME_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
}

MAGIC_BYTES = {
    "jpeg": b"\xff\xd8\xff",
    "png": b"\x89PNG\r\n\x1a\n",
    "webp_riff": b"RIFF",
    "webp_type": b"WEBP",
}


class CloudinaryService:
    """Service providing secure image upload and management via Cloudinary."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._configured = False
        self._configure()

    def _configure(self) -> None:
        """Initialize Cloudinary SDK credentials from application settings."""
        # Prefer explicit credentials so the SDK always receives cloud_name.
        # Some SDK versions retain only the URL and leave cloud_name unset.
        cloud_name = (self.settings.CLOUDINARY_CLOUD_NAME or "").strip()
        api_key = (self.settings.CLOUDINARY_API_KEY or "").strip()
        api_secret = (self.settings.CLOUDINARY_API_SECRET or "").strip()

        if cloud_name and api_key and api_secret:
            try:
                cloudinary.config(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret,
                    secure=True,
                )
                self._configured = True
                logger.info(f"Cloudinary configured for cloud '{cloud_name}'.")
                return
            except Exception as exc:
                logger.warning(f"Failed to configure Cloudinary with explicit keys: {exc}")

        # Fall back to CLOUDINARY_URL when explicit credentials are incomplete.
        cloudinary_url = (self.settings.CLOUDINARY_URL or "").strip()
        if cloudinary_url:
            try:
                cloudinary.config(cloudinary_url=cloudinary_url, secure=True)
                self._configured = True
                logger.info("Cloudinary configured via CLOUDINARY_URL.")
            except Exception as exc:
                logger.warning(f"Failed to configure Cloudinary via CLOUDINARY_URL: {exc}")
        else:
            logger.info("Cloudinary credentials not configured. Image uploads will run in degraded/mock mode.")

    @property
    def is_configured(self) -> bool:
        """Check if Cloudinary has valid credentials configured."""
        return self._configured

    def validate_image_file(self, filename: str, content_type: str, file_bytes: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validate image file format, MIME type, size, and header magic bytes.
        Prevents executable files, oversized payloads, and spoofed extensions.
        """
        max_size = getattr(self.settings, "COMMUNITY_REPORT_MAX_IMAGE_SIZE", 5 * 1024 * 1024)
        if len(file_bytes) > max_size:
            max_mb = max_size / (1024 * 1024)
            return False, f"Image size exceeds the maximum limit of {max_mb:.0f} MB."

        if len(file_bytes) < 16:
            return False, "Uploaded image file is empty or corrupted."

        # MIME type check
        norm_mime = content_type.lower().strip() if content_type else ""
        if norm_mime not in ALLOWED_MIME_TYPES:
            return False, "Unsupported image format. Allowed formats are JPG, PNG, and WEBP."

        # Extension check
        ext = os.path.splitext(filename.lower())[1]
        if ext not in ALLOWED_MIME_TYPES[norm_mime]:
            return False, f"File extension '{ext}' does not match MIME type '{norm_mime}'."

        # Magic bytes check
        if norm_mime == "image/jpeg":
            if not file_bytes.startswith(MAGIC_BYTES["jpeg"]):
                return False, "File content is not a valid JPEG image."
        elif norm_mime == "image/png":
            if not file_bytes.startswith(MAGIC_BYTES["png"]):
                return False, "File content is not a valid PNG image."
        elif norm_mime == "image/webp":
            if not (file_bytes.startswith(MAGIC_BYTES["webp_riff"]) and file_bytes[8:12] == MAGIC_BYTES["webp_type"]):
                return False, "File content is not a valid WEBP image."

        return True, None

    async def upload_image(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Upload image buffer to Cloudinary with automatic optimization transformations.
        Runs synchronous Cloudinary SDK call in thread pool.
        """
        if not self._configured:
            raise AppException(
                message="Image storage service is not configured on the server.",
                status_code=503,
            )

        folder = getattr(self.settings, "CLOUDINARY_FOLDER", "weathergpt/community_reports")

        def _do_upload():
            return cloudinary.uploader.upload(
                file_bytes,
                folder=folder,
                resource_type="image",
                transformation=[
                    {"width": 1600, "height": 1600, "crop": "limit"},
                    {"quality": "auto:good", "fetch_format": "auto"},
                ],
                use_filename=False,
                unique_filename=True,
                overwrite=False,
            )

        try:
            result = await asyncio.to_thread(_do_upload)
            return {
                "url": result.get("secure_url") or result.get("url"),
                "public_id": result.get("public_id"),
                "format": result.get("format"),
                "bytes": result.get("bytes"),
                "width": result.get("width"),
                "height": result.get("height"),
            }
        except Exception as exc:
            logger.error(f"Cloudinary upload error: {exc}")
            raise AppException(
                message="Failed to upload image to cloud storage. Please try again.",
                status_code=502,
            )

    async def delete_image(self, public_id: str) -> bool:
        """Delete an image asset from Cloudinary by its public ID."""
        if not self._configured or not public_id:
            return False

        def _do_delete():
            return cloudinary.uploader.destroy(public_id, resource_type="image")

        try:
            result = await asyncio.to_thread(_do_delete)
            return result.get("result") in ["ok", "not found"]
        except Exception as exc:
            logger.warning(f"Cloudinary deletion error for '{public_id}': {exc}")
            return False
