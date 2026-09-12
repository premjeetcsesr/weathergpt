import re
from typing import Optional

# Common major cities for direct keyword matching
COMMON_CITIES = [
    "New Delhi", "Delhi", "Mumbai", "Bengaluru", "Bangalore", "Kanpur", "Kolkata", "Calcutta",
    "Chennai", "Madras", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh",
    "Varanasi", "Banaras", "Agra", "Bhopal", "Indore", "Patna", "Surat", "Nagpur", "Vadodara",
    "Ghaziabad", "Ludhiana", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan", "Thane",
    "Amritsar", "Allahabad", "Prayagraj", "Ranchi", "Gwalior", "Jabalpur", "Coimbatore",
    "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Dehradun", "Noida",
    "Gurgaon", "Gurugram", "London", "New York", "Tokyo", "Paris", "Dubai", "Singapore", "Sydney",
    "Toronto", "Berlin", "Rome", "Bangkok", "San Francisco", "Chicago", "Los Angeles"
]

# Hindi to English city name mapping
HINDI_CITY_MAP = {
    "कानपुर": "Kanpur",
    "दिल्ली": "Delhi",
    "नई दिल्ली": "New Delhi",
    "मुंबई": "Mumbai",
    "बेंगलुरु": "Bengaluru",
    "बैंगलोर": "Bengaluru",
    "कोलकाता": "Kolkata",
    "चेन्नई": "Chennai",
    "हैदराबाद": "Hyderabad",
    "पुणे": "Pune",
    "अहमदाबाद": "Ahmedabad",
    "जयपुर": "Jaipur",
    "लखनऊ": "Lucknow",
    "चंडीगढ़": "Chandigarh",
    "वाराणसी": "Varanasi",
    "बनारस": "Varanasi",
    "आगरा": "Agra",
    "भोपाल": "Bhopal",
    "इंदौर": "Indore",
    "पटना": "Patna",
    "सूरत": "Surat",
    "नागपुर": "Nagpur",
    "लंदन": "London",
    "न्यू यॉर्क": "New York",
    "टोक्यो": "Tokyo",
    "पेरिस": "Paris",
    "दुबई": "Dubai",
}

# Noise words to discard when extracting city candidates
NOISE_WORDS = {
    "weather", "forecast", "climate", "temperature", "temp", "rain", "rainfall", "humidity",
    "wind", "alert", "alerts", "warning", "today", "tonight", "tomorrow", "yesterday",
    "now", "currently", "please", "tell", "what", "is", "the", "in", "at", "for", "of",
    "how", "will", "it", "any", "me", "mein", "ka", "ki", "ke", "kaisa", "kaise", "kaisi", "hai",
    "batao", "bataiye", "hogi", "hoga", "kya", "aaj", "kal", "parso", "show", "get", "give",
    "आज", "कल", "परसों", "का", "की", "के", "में", "मौसम", "कैसा", "कैसी", "है", "बताओ", "बताइए", "क्या"
}


def detect_language(message: str, requested_lang: Optional[str] = None) -> str:
    """
    Detect message language as 'hi' or 'en'.
    Respects explicit requested_lang if provided.
    """
    if requested_lang:
        lang_clean = requested_lang.lower().strip()
        if lang_clean in ["hi", "hindi"]:
            return "hi"
        if lang_clean in ["en", "english"]:
            return "en"

    # Check for Devanagari Unicode block
    if re.search(r"[\u0900-\u097F]", message):
        return "hi"

    # Check for common Hindi transliterations (Hinglish)
    hinglish_markers = [
        r"\bmausam\b", r"\bbarish\b", r"\bbarsaat\b", r"\btapman\b", r"\bkaisa\b",
        r"\bkaise\b", r"\bkaisi\b", r"\baaj\b", r"\bkal\b", r"\bparso\b",
        r"\bhogi\b", r"\bhoga\b", r"\bbatao\b", r"\bbataiye\b", r"\bchetavni\b",
        r"\bchhate\b", r"\bhawa\b", r"\bgarmi\b", r"\bsardi\b", r"\bnami\b"
    ]
    msg_lower = message.lower()
    for marker in hinglish_markers:
        if re.search(marker, msg_lower):
            return "hi"

    return "en"


def extract_time_target(message: str) -> str:
    """
    Extract time requirement from message:
    'today', 'tomorrow', 'day_after_tomorrow', 'weekend', 'next_3_days', 'next_7_days'.
    """
    msg = message.lower()

    if "day after tomorrow" in msg or "parso" in msg or "परसों" in msg:
        return "day_after_tomorrow"

    if "tomorrow" in msg or "kal" in msg or "कल" in msg:
        return "tomorrow"

    if "weekend" in msg or "शनिवार" in msg or "रविवार" in msg:
        return "weekend"

    if "next 3 days" in msg or "3 days" in msg or "3 din" in msg or "तीन दिन" in msg:
        return "next_3_days"

    if any(w in msg for w in ["next 7 days", "7 days", "next week", "this week", "week", "hafta", "hafte", "हफ्ते", "सात दिन"]):
        return "next_7_days"

    return "today"


def detect_intent(message: str) -> str:
    """
    Detect user intent among:
    - rainfall
    - temperature
    - humidity
    - wind
    - weather_alert
    - sunrise_sunset
    - forecast
    - current_weather
    - location_weather
    - general_weather
    """
    msg = message.lower()

    # 1. Weather Alert / Warnings
    if any(w in msg for w in ["alert", "warning", "warnings", "advisory", "danger", "khatra", "chetavni", "चेतावनी", "अलर्ट"]):
        return "weather_alert"

    # 2. Rainfall & Precipitation
    if any(w in msg for w in [
        "rain", "raining", "rainfall", "rainy", "shower", "showers", "drizzle", "umbrella",
        "monsoon", "thunderstorm", "barish", "barsaat", "chhate", "छाता", "बारिश", "बरसात"
    ]):
        return "rainfall"

    # 3. Temperature / Heat / Cold
    if any(w in msg for w in [
        "temperature", "temp", "hot", "cold", "warm", "chilly", "freezing", "heat",
        "tapman", "garmi", "sardi", "thand", "तापमान", "गर्मी", "सर्दी", "ठंड"
    ]):
        return "temperature"

    # 4. Humidity / Moisture
    if any(w in msg for w in ["humidity", "humid", "moisture", "nami", "adraata", "उमस", "नमी"]):
        return "humidity"

    # 5. Wind / Gale / Storm
    if any(w in msg for w in ["wind", "windy", "breeze", "gust", "storm", "gale", "hawa", "हवा", "आंधी"]):
        return "wind"

    # 6. Sunrise & Sunset / Sun
    if any(w in msg for w in ["sunrise", "sunset", "dawn", "dusk", "sun up", "sun down", "suraj", "dhoop", "सूर्योदय", "सूर्यास्त", "धूप"]):
        return "sunrise_sunset"

    # 7. Forecast / Multi-day predictions
    time_target = extract_time_target(msg)
    if time_target in ["tomorrow", "day_after_tomorrow", "weekend", "next_3_days", "next_7_days"] or any(
        w in msg for w in ["forecast", "future", "outlook", "upcoming", "aane wale", "भविष्यवाणी", "पूर्वानुमान"]
    ):
        return "forecast"

    # 8. Location-specific weather query
    if any(w in msg for w in ["weather in", "weather for", "weather at", "weather of", "ka mausam", "me mausam", "का मौसम", "में मौसम"]):
        return "location_weather"

    # 9. Current Weather
    if any(w in msg for w in ["weather", "climate", "condition", "sky", "outside", "today", "now", "mausam", "मौसम"]):
        return "current_weather"

    return "general_weather"


def extract_location(message: str, fallback_location: Optional[str] = None) -> Optional[str]:
    """
    Extract city or location name from user message in English or Hindi.
    Falls back to fallback_location if supplied and no city is detected.
    Returns None if no location is determinable.
    """
    if not message or not message.strip():
        return fallback_location.strip() if fallback_location and fallback_location.strip() else None

    # Strip trailing punctuation for cleaner matching
    text = re.sub(r"[?!.,;]+$", "", message.strip())
    text_lower = text.lower()

    # 1. Check Hindi City Map directly
    for hindi_name, en_name in HINDI_CITY_MAP.items():
        if hindi_name in text:
            return en_name

    # 2. Exact match against known major cities list (case-insensitive)
    for city in COMMON_CITIES:
        pattern = r"\b" + re.escape(city.lower()) + r"\b"
        if re.search(pattern, text_lower):
            return city

    # 3. Hindi postposition patterns: 'कानपुर का मौसम', 'दिल्ली में', 'कानपुर में'
    hindi_patterns = [
        r"([A-Za-z0-9\u0900-\u097F\s]+?)\s+(?:का|के|की|में|पर)\s+(?:मौसम|बारिश|तापमान|पूर्वानुमान)",
        r"([A-Za-z0-9\u0900-\u097F\s]+?)\s+(?:me|mein|ka|ke|ki|par)\s+(?:mausam|barish|tapman|barsaat|weather)",
    ]
    for pat in hindi_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            words = [w for w in candidate.split() if w.lower() not in NOISE_WORDS and w not in NOISE_WORDS]
            if words:
                cleaned_cand = " ".join(words)
                if cleaned_cand in HINDI_CITY_MAP:
                    return HINDI_CITY_MAP[cleaned_cand]
                if len(cleaned_cand) >= 2:
                    return cleaned_cand.title() if cleaned_cand.isascii() else cleaned_cand

    # 4. English preposition patterns: 'in Kanpur', 'for Delhi', 'at Mumbai', 'in NonExistentCity12345'
    prep_patterns = [
        r"\b(?:in|at|for|around|of|near)\s+([A-Za-z0-9\u0900-\u097F\s\-]+?)(?:\s+(?:today|tomorrow|tonight|yesterday|this|next|now|please|right now|\?|\.|$)|[?!.,;]|$)",
        r"\bweather\s+(?:in|for|at|of)?\s*([A-Za-z0-9\u0900-\u097F\s\-]+?)(?:\s+(?:today|tomorrow|tonight|now|\?|\.|$)|[?!.,;]|$)",
        r"^([A-Za-z0-9\u0900-\u097F\s\-]+?)\s+(?:weather|forecast|climate|temperature|temp)\b",
    ]

    for pat in prep_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            words = [w for w in candidate.split() if w.lower() not in NOISE_WORDS and w not in NOISE_WORDS]
            if words:
                cleaned_cand = " ".join(words)
                if cleaned_cand in HINDI_CITY_MAP:
                    return HINDI_CITY_MAP[cleaned_cand]
                if len(cleaned_cand) >= 2:
                    return cleaned_cand.title() if cleaned_cand.isascii() else cleaned_cand

    # If fallback is provided, use it
    if fallback_location and fallback_location.strip():
        return fallback_location.strip()

    return None
