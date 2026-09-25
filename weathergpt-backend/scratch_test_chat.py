import asyncio
import time
from app.core.config import get_settings
from app.services.chat_service import ChatService
from app.services.weather_service import WeatherService
from app.services.forecast_service import ForecastService
from app.services.alert_service import AlertService
from app.services.llm_service import LLMService
from app.schemas.chat import ChatRequest

async def main():
    settings = get_settings()
    weather_service = WeatherService(settings)
    forecast_service = ForecastService(settings)
    alert_service = AlertService(settings)
    llm_service = LLMService(settings)
    chat_service = ChatService(
        weather_service=weather_service,
        forecast_service=forecast_service,
        alert_service=alert_service,
        llm_service=llm_service,
        settings=settings
    )
    req = ChatRequest(message="Is it safe to travel in Kanpur?", location="Kanpur")
    t0 = time.time()
    print("Calling process_chat_message...")
    resp = await chat_service.process_chat_message(req)
    t1 = time.time()
    print(f"Done in {t1-t0:.2f}s!")
    print("Reply:", resp.reply)

if __name__ == "__main__":
    asyncio.run(main())
