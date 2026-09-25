from typing import Any, Dict, Optional, Tuple
import httpx
from app.core.config import Settings, get_settings
from app.core.logging import logger


class LLMService:
    """
    Production-style AI weather intelligence service.
    Interfaces with OpenAI-compatible LLM endpoints using asynchronous HTTP.
    Strictly grounded in verified backend weather data with deterministic fallbacks.
    """

    def __init__(self, settings: Optional[Settings] = None, client: Optional[httpx.AsyncClient] = None):
        self.settings = settings or get_settings()
        self._client = client
        self.timeout = 15.0

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None and not self._client.is_closed:
            return self._client
        return httpx.AsyncClient(timeout=self.timeout)

    def _generate_fallback_response(
        self,
        user_message: str,
        location: str,
        weather_context: Dict[str, Any],
        intent: str = "general_weather",
        language: str = "en",
        time_target: str = "today"
    ) -> str:
        """
        Deterministic, safe, grounded natural language weather response generator.
        Derived strictly from verified telemetry when LLM is unconfigured or unavailable.
        Supports both English and Hindi.
        """
        temp = weather_context.get("temperature", "--")
        feels_like = weather_context.get("feels_like", temp)
        condition = weather_context.get("condition", "Clear")
        rain_prob = weather_context.get("rain_probability", 0)
        humidity = weather_context.get("humidity", 50)
        wind_speed = weather_context.get("wind_speed", 10)
        aqi_label = weather_context.get("air_quality_label", "Moderate")
        sunrise = weather_context.get("sunrise", "06:00 AM")
        sunset = weather_context.get("sunset", "06:30 PM")
        alerts_list = weather_context.get("alerts", [])

        # Format time period label
        time_label_en = "today"
        time_label_hi = "आज"
        if time_target == "tomorrow":
            time_label_en = "tomorrow"
            time_label_hi = "कल"
        elif time_target == "day_after_tomorrow":
            time_label_en = "day after tomorrow"
            time_label_hi = "परसों"
        elif time_target in ["next_3_days", "next_7_days", "weekend"]:
            time_label_en = "over the upcoming forecast period"
            time_label_hi = "आने वाले दिनों में"

        # ---------------- HINDI FALLBACK ----------------
        if language == "hi":
            if intent == "weather_alert":
                if alerts_list:
                    alert_count = len(alerts_list)
                    return f"{location} के लिए {alert_count} मौसम अलर्ट सक्रिय हैं। कृपया आधिकारिक दिशा-निर्देशों का पालन करें।"
                return f"{location} के लिए वर्तमान में कोई सक्रिय आधिकारिक मौसम चेतावनी (Official Warning) उपलब्ध नहीं है।"

            if intent == "rainfall":
                if rain_prob >= 60:
                    return f"उपलब्ध पूर्वानुमान के अनुसार {time_label_hi} {location} में बारिश की {rain_prob}% संभावना (Probability) है। छाता साथ रखना उचित रहेगा।"
                elif rain_prob >= 30:
                    return f"पूर्वानुमान के आधार पर {time_label_hi} {location} में हल्की वर्षा की {rain_prob}% संभावना है। वर्तमान स्थिति: {condition}।"
                else:
                    return f"उपलब्ध पूर्वानुमान के अनुसार {time_label_hi} {location} में बारिश की संभावना केवल {rain_prob}% है। मौसम मुख्यतः {condition} रहने का अनुमान है।"

            if intent == "temperature":
                return f"{location} में {time_label_hi} तापमान लगभग {temp}°C (महसूस: {feels_like}°C) रहने का अनुमान है।"

            if intent == "humidity":
                return f"{location} में वर्तमान में नमी (Humidity) का स्तर {humidity}% दर्ज किया गया है।"

            if intent == "wind":
                return f"{location} में हवा की गति लगभग {wind_speed} km/h दर्ज की गई है।"

            if intent == "sunrise_sunset":
                return f"{location} में सूर्योदय का समय {sunrise} और सूर्यास्त का समय {sunset} है।"

            if intent == "forecast":
                forecast_summary = weather_context.get("forecast_summary")
                if forecast_summary:
                    return f"{location} का {time_label_hi} पूर्वानुमान: {forecast_summary}"
                return f"{location} में {time_label_hi} तापमान {temp}°C और स्थिति {condition} रहने की संभावना है (बारिश की संभावना: {rain_prob}%)।"

            # Default General Weather in Hindi
            return f"{location} में {time_label_hi} मौसम {condition} है। तापमान {temp}°C (महसूस: {feels_like}°C), नमी {humidity}%, और बारिश की संभावना {rain_prob}% है।"

        # ---------------- ENGLISH FALLBACK ----------------
        if intent == "weather_alert":
            if alerts_list:
                return f"There are {len(alerts_list)} active weather warning(s) reported for {location}. Please follow verified safety advisories."
            return f"No active official warning available for {location} from the verified meteorological source."

        if intent == "rainfall":
            if rain_prob >= 60:
                return f"According to the available forecast, there is a {rain_prob}% probability of precipitation in {location} {time_label_en}. Carrying an umbrella is advisable."
            elif rain_prob >= 30:
                return f"There is a {rain_prob}% probability of precipitation according to the available forecast for {location} {time_label_en}."
            else:
                return f"Precipitation probability is low at {rain_prob}% in {location} {time_label_en}. The forecast indicates primarily {condition.lower()} conditions."

        if intent == "temperature":
            return f"The temperature in {location} {time_label_en} is {temp}°C (feels like {feels_like}°C) with {humidity}% humidity."

        if intent == "humidity":
            return f"The current relative humidity in {location} is {humidity}%."

        if intent == "wind":
            return f"The wind speed in {location} is currently {wind_speed} km/h."

        if intent == "sunrise_sunset":
            return f"In {location}, sunrise is at {sunrise} and sunset is at {sunset}."

        if intent == "forecast":
            forecast_summary = weather_context.get("forecast_summary")
            if forecast_summary:
                return f"Forecast for {location} ({time_label_en}): {forecast_summary}"
            return f"Forecast for {location} ({time_label_en}): Expected temperature around {temp}°C with {condition.lower()} skies and a {rain_prob}% precipitation probability."

        # Default General Weather in English
        return (
            f"In {location}, current weather {time_label_en} is {condition.lower()} with a temperature of {temp}°C "
            f"(feels like {feels_like}°C), {humidity}% humidity, {wind_speed} km/h wind speed, and a {rain_prob}% precipitation probability."
        )

    def _build_system_prompt(self, location: str, weather_context: Dict[str, Any], language: str = "en") -> str:
        """
        Construct a strict, anti-hallucination system prompt providing verified context (SIH Step 7).
        """
        alerts = weather_context.get("alerts", [])
        alerts_text = "None" if not alerts else f"{len(alerts)} active warning(s): " + "; ".join(str(a) for a in alerts[:2])

        forecast_details = weather_context.get("forecast_summary", "Not requested or standard 24h/7d telemetry.")
        source_name = weather_context.get("source", "Verified Meteorological Provider")

        # Detect language and give appropriate instruction
        lang_map = {
            "hi": "HINDI (हिन्दी). Use clean Devanagari script.",
            "bn": "BENGALI (বাংলা). Use clean Bengali script.",
            "mr": "MARATHI (मराठी). Use clean Devanagari script.",
            "ta": "TAMIL (தமிழ்). Use clean Tamil script.",
            "te": "TELUGU (తెలుగు). Use clean Telugu script.",
            "gu": "GUJARATI (ગુજરાતી). Use clean Gujarati script.",
            "kn": "KANNADA (ಕನ್ನಡ). Use clean Kannada script.",
            "ml": "MALAYALAM (മലയാളം). Use clean Malayalam script.",
            "pa": "PUNJABI (ਪੰਜਾਬੀ). Use clean Gurmukhi script.",
            "ur": "URDU (اردو). Use clean Urdu/Nastaliq script.",
            "fr": "FRENCH (Français). Use clean, accurate French phrasing.",
            "de": "GERMAN (Deutsch). Use clean, accurate German phrasing.",
            "es": "SPANISH (Español). Use clean, accurate Spanish phrasing.",
            "ar": "ARABIC (العربية). Use clean Arabic script.",
            "zh": "CHINESE (中文). Use clear Simplified Chinese characters.",
            "ja": "JAPANESE (日本語). Use natural Japanese phrasing.",
            "ko": "KOREAN (한국어). Use natural Korean phrasing.",
            "ru": "RUSSIAN (Русский). Use clean Cyrillic script.",
            "pt": "PORTUGUESE (Português). Use natural Portuguese phrasing.",
            "it": "ITALIAN (Italiano). Use clean, natural Italian phrasing.",
        }
        if language in lang_map:
            lang_instruction = f"Respond naturally and fluently in {lang_map[language]} Keep numerical values (temperatures, percentages, wind speed) exact."
        elif language and language != "en":
            # Unknown/unsupported language — still try to respond in it
            lang_instruction = f"The user's preferred language code is '{language}'. Respond naturally and fluently in that language. Keep numerical values exact."
        else:
            lang_instruction = "Respond naturally, concisely, and helpfully in ENGLISH."

        return (
            "You are WeatherGPT, a weather information assistant.\n\n"
            "You must answer only from the verified meteorological context provided by the backend.\n\n"
            "Never invent:\n"
            "- temperature\n"
            "- rainfall\n"
            "- forecasts\n"
            "- warnings\n"
            "- government advisories\n"
            "- weather events\n"
            "- historical measurements\n\n"
            "The meteorological data source is the source of truth.\n"
            "Clearly distinguish:\n"
            "- observation (measured current telemetry)\n"
            "- forecast (probabilistic future projection)\n"
            "- official warning (issued government bulletins)\n"
            "- advisory (safety recommendations)\n"
            "- uncertainty (use probabilistic language like '70% probability of precipitation' rather than absolute guarantees)\n\n"
            "If data is unavailable, say so.\n"
            "If an official warning is present, prioritize it.\n"
            "Mention the relevant location and forecast period.\n"
            "Use simple language.\n"
            "Do not present probabilistic forecasts as guaranteed outcomes.\n"
            f"{lang_instruction}\n"
            "NEVER alter numerical values or units when responding in Hindi. Keep temperatures (e.g. 30°C), percentages (e.g. 70%), and wind speeds (e.g. 15 km/h) exact.\n\n"
            f"--- VERIFIED METEOROLOGICAL TELEMETRY FOR {location.upper()} (SOURCE: {source_name}) ---\n"
            f"- Temperature: {weather_context.get('temperature', 'N/A')}°C\n"
            f"- Feels Like: {weather_context.get('feels_like', 'N/A')}°C\n"
            f"- Condition: {weather_context.get('condition', 'N/A')}\n"
            f"- Rain Probability: {weather_context.get('rain_probability', 0)}%\n"
            f"- Humidity: {weather_context.get('humidity', 'N/A')}%\n"
            f"- Wind Speed: {weather_context.get('wind_speed', 'N/A')} km/h\n"
            f"- Air Quality: {weather_context.get('air_quality_label', 'N/A')}\n"
            f"- Active Official Warnings: {alerts_text}\n"
            f"- Forecast Summary: {forecast_details}\n"
            "------------------------------------------------"
        )

    async def generate_weather_response(
        self,
        user_message: str,
        location: str,
        weather_context: Dict[str, Any],
        intent: str = "general_weather",
        language: str = "en",
        time_target: str = "today"
    ) -> Tuple[str, bool]:
        """
        Generate contextual AI response using configured LLM API (OpenAI/compatible)
        or fallback deterministic generator.
        Returns a tuple: (response_text, ai_generated_bool).
        """
        api_key = self.settings.LLM_API_KEY

        # If LLM API key is not configured, safely return grounded deterministic response
        if not api_key or not api_key.strip():
            logger.info("LLM_API_KEY not configured. Generating deterministic verified telemetry response.")
            response_text = self._generate_fallback_response(
                user_message=user_message,
                location=location,
                weather_context=weather_context,
                intent=intent,
                language=language,
                time_target=time_target
            )
            return response_text, False

        system_prompt = self._build_system_prompt(location, weather_context, language=language)

        payload = {
            "model": self.settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.3,
            "max_tokens": 350,
        }

        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }

        client = await self._get_client()
        url = f"{self.settings.LLM_BASE_URL.rstrip('/')}/chat/completions"

        try:
            logger.info(f"Sending LLM request for location='{location}', intent='{intent}', lang='{language}'")
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices and choices[0].get("message", {}).get("content"):
                    return choices[0]["message"]["content"].strip(), True
            else:
                logger.warning(f"LLM API returned status {response.status_code}: {response.text}")
        except httpx.TimeoutException:
            logger.warning(f"LLM request timed out after {self.timeout}s.")
        except Exception as exc:
            logger.warning(f"Failed to communicate with LLM API: {exc}")

        # Fallback to verified telemetry
        logger.info("Falling back to deterministic grounded response after LLM unavailability.")
        fallback_text = self._generate_fallback_response(
            user_message=user_message,
            location=location,
            weather_context=weather_context,
            intent=intent,
            language=language,
            time_target=time_target
        )
        return fallback_text, False

    async def generate_climate_insights(
        self,
        location: str,
        period: str,
        metrics: Dict[str, Any],
        language: str = "en",
    ) -> Tuple[str, bool]:
        """
        Convert verified calculated climate metrics into natural-language explanations.
        Never invent climate data.
        Returns a tuple: (insight_text, ai_generated_bool).
        """
        api_key = self.settings.LLM_API_KEY

        # Grounded deterministic fallback explanation
        avg_t = metrics.get("avg_temperature", "N/A")
        t_delta = metrics.get("temperature_change")
        t_delta_str = (
            f" ({'+' if t_delta and t_delta > 0 else ''}{t_delta}°C vs previous period)"
            if t_delta is not None
            else ""
        )
        tot_rain = metrics.get("total_rainfall", "N/A")
        rain_delta = metrics.get("rainfall_change")
        rain_delta_str = (
            f" ({'+' if rain_delta and rain_delta > 0 else ''}{rain_delta}% change)"
            if rain_delta is not None
            else ""
        )
        rainy_days = metrics.get("rainy_days", 0)

        if language == "hi":
            fallback_text = (
                f"{location} के लिए {period} के दौरान औसत तापमान {avg_t}°C{t_delta_str} दर्ज किया गया। "
                f"कुल वर्षा {tot_rain} mm रही (कुल वर्षा वाले दिन: {rainy_days}){rain_delta_str}। "
                "यह विश्लेषण उपलब्ध मौसम संबंधी अवलोकनों और ऐतिहासिक आधार रेखा पर आधारित है।"
            )
        else:
            fallback_text = (
                f"During {period} in {location}, the average observed temperature was {avg_t}°C{t_delta_str}. "
                f"Total cumulative rainfall reached {tot_rain} mm across {rainy_days} rainy day(s){rain_delta_str}. "
                "These insights are derived strictly from available observational records and verified meteorological baselines."
            )

        if not api_key or not api_key.strip():
            return fallback_text, False

        system_prompt = (
            "You are WeatherGPT Climate Intelligence Engine.\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Ground your answer STRICTLY AND ONLY in the verified calculated climate metrics provided in the prompt.\n"
            "2. NEVER invent or hallucinate temperatures, rainfall amounts, or historical records.\n"
            "3. Clearly mention the analyzed time period and location.\n"
            "4. Do NOT claim official climate attribution unless explicitly stated in the metrics.\n"
            "5. Use cautious, objective phrasing such as 'observed anomaly', 'deviation from available baseline', 'based on available observational data'.\n"
            f"6. {'Respond naturally and fluently in HINDI (हिन्दी).' if language == 'hi' else 'Respond clearly and concisely in ENGLISH.'}\n"
            "7. Keep numerical values exact. Keep response between 2 and 4 sentences."
        )

        user_content = (
            f"Generate a clear climate insight summary for:\n"
            f"- Location: {location}\n"
            f"- Period: {period}\n"
            f"- Verified Calculated Metrics: {metrics}\n"
        )

        payload = {
            "model": self.settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
            "max_tokens": 250,
        }

        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }

        try:
            client = await self._get_client()
            url = f"{self.settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices and choices[0].get("message", {}).get("content"):
                    return choices[0]["message"]["content"].strip(), True
        except Exception as exc:
            logger.warning(f"Failed to generate LLM climate insight: {exc}")

        return fallback_text, False

