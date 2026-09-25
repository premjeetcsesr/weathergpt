from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class LanguagePreferenceRequest(BaseModel):
    """Payload to update language preference."""

    language: str = Field(..., examples=["hi", "en"], description="Language code ('en' or 'hi')")

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in ["en", "hi", "english", "hindi"]:
            raise ValueError(f"Language '{v}' is not currently supported. Supported languages: 'en', 'hi'.")
        return "hi" if clean in ["hi", "hindi"] else "en"


class LanguagePreferenceResponse(BaseModel):
    """Language preference response."""

    success: bool = Field(default=True)
    language: str = Field(default="en", examples=["hi"])
    status: Optional[str] = Field(default="updated")
    speech_locale: str = Field(default="en-IN", examples=["hi-IN"])
    supported_languages: List[Dict[str, str]] = Field(default_factory=list)
    message: Optional[str] = Field(default=None)

