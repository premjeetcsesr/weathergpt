from fastapi import APIRouter
from app.api.routes import (
    advanced_weather,
    alerts,
    auth,
    chat,
    climate,
    forecast,
    locations,
    notifications,
    radar_satellite,
    settings,
    weather,
    websocket,
    community_reports,
    nearby_places,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(settings.router)
api_router.include_router(weather.router)
api_router.include_router(radar_satellite.router)
api_router.include_router(advanced_weather.router)
api_router.include_router(forecast.router)
api_router.include_router(alerts.router)
api_router.include_router(climate.router)
api_router.include_router(locations.router)
api_router.include_router(chat.router)
api_router.include_router(notifications.router)
api_router.include_router(websocket.router)
api_router.include_router(community_reports.router)
api_router.include_router(nearby_places.router)



