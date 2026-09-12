from fastapi import APIRouter
from app.api.routes import alerts, chat, forecast, locations, weather

api_router = APIRouter()

api_router.include_router(weather.router)
api_router.include_router(forecast.router)
api_router.include_router(alerts.router)
api_router.include_router(locations.router)
api_router.include_router(chat.router)
