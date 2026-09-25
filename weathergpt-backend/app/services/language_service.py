import re
from typing import Any, Dict, List, Optional


class LanguageService:
    """
    Multilingual intelligence service for WeatherGPT.
    Provides language detection with confidence scoring, speech recognition/synthesis
    locale resolution, and extensible support for Indian languages.
    """

    # Fully supported in current phase
    PRIMARY_LANGUAGES: Dict[str, Dict[str, str]] = {
        "en": {
            "name": "English",
            "native": "English",
            "locale": "en-IN",
            "script": "Latin",
        },
        "hi": {
            "name": "Hindi",
            "native": "हिन्दी",
            "locale": "hi-IN",
            "script": "Devanagari",
        },
    }

    # Architecturally planned Indian languages
    FUTURE_LANGUAGES: Dict[str, Dict[str, str]] = {
        "bn": {"name": "Bengali", "native": "বাংলা", "locale": "bn-IN", "script": "Bengali"},
        "mr": {"name": "Marathi", "native": "मराठी", "locale": "mr-IN", "script": "Devanagari"},
        "ta": {"name": "Tamil", "native": "தமிழ்", "locale": "ta-IN", "script": "Tamil"},
        "te": {"name": "Telugu", "native": "తెలుగు", "locale": "te-IN", "script": "Telugu"},
        "gu": {"name": "Gujarati", "native": "ગુજરાતી", "locale": "gu-IN", "script": "Gujarati"},
        "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "locale": "kn-IN", "script": "Kannada"},
        "ml": {"name": "Malayalam", "native": "മലയാളം", "locale": "ml-IN", "script": "Malayalam"},
        "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "locale": "pa-IN", "script": "Gurmukhi"},
    }

    # Common Hinglish transliteration keywords
    HINGLISH_KEYWORDS = [
        r"\bmausam\b", r"\bbarish\b", r"\bbarsaat\b", r"\btapman\b", r"\bkaisa\b",
        r"\bkaise\b", r"\bkaisi\b", r"\baaj\b", r"\bkal\b", r"\bparso\b",
        r"\bhogi\b", r"\bhoga\b", r"\bbatao\b", r"\bbataiye\b", r"\bchetavni\b",
        r"\bchhate\b", r"\bhawa\b", r"\bgarmi\b", r"\bsardi\b", r"\bnami\b",
        r"\bpaani\b", r"\btoofan\b", r"\bghanta\b"
    ]

    @classmethod
    def get_supported_languages(cls) -> List[Dict[str, str]]:
        """Return list of supported languages."""
        return [
            {"code": code, "name": meta["name"], "native": meta["native"], "locale": meta["locale"]}
            for code, meta in cls.PRIMARY_LANGUAGES.items()
        ]

    @classmethod
    def is_supported(cls, language_code: str) -> bool:
        """Check if language code is in supported primary languages."""
        if not language_code:
            return False
        return language_code.lower().strip() in cls.PRIMARY_LANGUAGES

    @classmethod
    def normalize_code(cls, lang: Optional[str]) -> str:
        """Normalize language name or code to two-letter code."""
        if not lang:
            return "en"
        clean = lang.lower().strip()
        if clean in ["hi", "hindi"]:
            return "hi"
        if clean in ["en", "english"]:
            return "en"
        return "en"

    @classmethod
    def detect_language(cls, text: str, user_preference: Optional[str] = None) -> Dict[str, Any]:
        """
        Detect message language as English or Hindi with a confidence score.
        Adheres to Section 2 specification:
        Example output:
        {
            "language": "hi",
            "confidence": 0.98
        }
        """
        if not text or not text.strip():
            fallback = cls.normalize_code(user_preference)
            return {"language": fallback, "confidence": 0.50}

        # 1. Check for Devanagari script (Unicode range: \u0900-\u097F)
        devanagari_chars = len(re.findall(r"[\u0900-\u097F]", text))
        total_letters = len(re.findall(r"[\w]", text))

        if devanagari_chars > 0:
            ratio = devanagari_chars / max(total_letters, 1)
            confidence = min(0.99, max(0.90, round(0.90 + (ratio * 0.09), 2)))
            return {"language": "hi", "confidence": confidence}

        # 2. Check for Hinglish transliterations
        text_lower = text.lower()
        hinglish_matches = sum(1 for pattern in cls.HINGLISH_KEYWORDS if re.search(pattern, text_lower))
        if hinglish_matches > 0:
            confidence = min(0.92, round(0.75 + (hinglish_matches * 0.08), 2))
            return {"language": "hi", "confidence": confidence}

        # 3. Check for standard English Latin alphabet
        latin_chars = len(re.findall(r"[a-zA-Z]", text))
        if latin_chars > 0:
            return {"language": "en", "confidence": 0.95}

        # 4. If uncertain, fallback to user's selected preference
        fallback_lang = cls.normalize_code(user_preference)
        return {"language": fallback_lang, "confidence": 0.60}

    @classmethod
    def get_speech_locale(cls, language_code: str) -> str:
        """Resolve speech recognition / TTS locale code (e.g. 'hi-IN', 'en-IN')."""
        clean = cls.normalize_code(language_code)
        meta = cls.PRIMARY_LANGUAGES.get(clean)
        return meta["locale"] if meta else "en-IN"


# Global singleton helper
language_service = LanguageService()


def get_language_service() -> LanguageService:
    """Dependency provider for LanguageService."""
    return language_service
