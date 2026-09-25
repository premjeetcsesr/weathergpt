import datetime
import math
from typing import Optional


def ms_to_kmh(speed_ms: Optional[float]) -> float:
    """Convert speed from meters per second (m/s) to kilometers per hour (km/h)."""
    if speed_ms is None:
        return 0.0
    return round(speed_ms * 3.6, 1)


def kmh_to_mph(speed_kmh: Optional[float]) -> float:
    """Convert speed from km/h to miles per hour (mph)."""
    if speed_kmh is None:
        return 0.0
    return round(speed_kmh * 0.621371, 1)


def celsius_to_fahrenheit(temp_c: Optional[float]) -> float:
    """Convert temperature from Celsius to Fahrenheit."""
    if temp_c is None:
        return 0.0
    return round((temp_c * 9 / 5) + 32, 1)


def degrees_to_compass(degrees: Optional[int]) -> str:
    """Convert meteorological wind direction in degrees (0-360) to 16-point compass label."""
    if degrees is None:
        return "N"
    directions = [
        "N", "NNE", "NE", "ENE",
        "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW"
    ]
    idx = int((degrees % 360) / 22.5 + 0.5) % 16
    return directions[idx]


def calculate_dew_point(temp_c: float, humidity_percent: int) -> float:
    """
    Calculate approximate dew point temperature (°C) using Magnus-Tetens formula.
    """
    if humidity_percent <= 0:
        return round(temp_c, 1)
    a = 17.27
    b = 237.7
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(max(humidity_percent, 1) / 100.0)
    dew_point = (b * alpha) / (a - alpha)
    return round(dew_point, 1)


def format_unix_time(timestamp: Optional[int], tz_offset_seconds: int = 0) -> str:
    """Format a UNIX timestamp with timezone offset into 'HH:MM AM/PM' string."""
    if not timestamp:
        return "--:--"
    tz = datetime.timezone(datetime.timedelta(seconds=tz_offset_seconds))
    dt = datetime.datetime.fromtimestamp(timestamp, tz=tz)
    return dt.strftime("%I:%M %p").lstrip("0")


def map_owm_icon(icon_code: Optional[str] = None, condition: str = "Clear") -> str:
    """Map OpenWeatherMap icon code or condition string to WeatherGPT standard Lucide icon key."""
    if not icon_code:
        cond = condition.lower()
        if "thunder" in cond or "lightning" in cond:
            return "cloud-lightning"
        if "drizzle" in cond:
            return "cloud-drizzle"
        if "rain" in cond or "shower" in cond:
            return "cloud-rain"
        if "snow" in cond:
            return "cloud-snow"
        if "fog" in cond or "mist" in cond or "haze" in cond:
            return "cloud-fog"
        if "cloud" in cond:
            return "cloud-sun"
        if "clear" in cond or "sun" in cond:
            return "sun"
        return "cloud-sun"

    code = icon_code.lower().strip()
    if code.startswith("01"):
        return "moon" if code.endswith("n") else "sun"
    if code.startswith("02"):
        return "moon" if code.endswith("n") else "cloud-sun"
    if code.startswith("03") or code.startswith("04"):
        return "cloud"
    if code.startswith("09"):
        return "cloud-drizzle"
    if code.startswith("10"):
        return "cloud-rain"
    if code.startswith("11"):
        return "cloud-lightning"
    if code.startswith("13"):
        return "cloud-snow"
    if code.startswith("50"):
        return "cloud-fog"

    return "cloud-sun"
