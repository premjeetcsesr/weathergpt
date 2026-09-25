# WeatherGPT Backend API

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Pydantic v2](https://img.shields.io/badge/Pydantic-v2-E92063.svg?logo=pydantic)](https://docs.pydantic.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**WeatherGPT Backend** is a modular, high-performance **FastAPI** service powering the conversational weather intelligence platform. It provides normalized real-time weather telemetry, hourly/daily forecasts, location geocoding, active disaster alerts, and a grounded AI assistant API.

---

## 🌟 Architecture & Highlights

- **Provider Abstraction**: Decoupled weather provider interface (`BaseWeatherProvider`) with an asynchronous **OpenWeatherMap** integration.
- **Data Normalization**: Translates raw provider responses into standardized domain schemas (`WeatherResponse`, `ForecastResponse`) with unit converters and AQI categorization.
- **Hallucination-Proof AI Assistant**: Provider-agnostic LLM interface with system-prompt constraints grounded strictly in real-time verified weather facts, plus a deterministic NLG fallback if an LLM key is absent.
- **MongoDB Async Integration (Motor)**: Native async MongoDB layer powering **Users & Auth (JWT + Bcrypt)**, **Chat History & Multi-turn Sessions**, **Saved / Favorite Locations (Geospatial 2dsphere)**, and **Weather Search & Telemetry History**.
- **In-Memory Caching**: Configurable TTL cache for current weather to minimize external API roundtrips.
- **Structured Observability**: Request-level logging with execution duration, endpoint sanitization, and unified error handling.

---

## 📁 Repository Structure

```
weathergpt-backend/
├── app/
│   ├── main.py                     # FastAPI application entrypoint, CORS, exception handlers
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings for env variables
│   │   ├── logging.py              # Structured logging configuration
│   │   ├── security.py             # Input sanitization and security helpers
│   │   └── exceptions.py           # Custom domain exception definitions
│   ├── api/
│   │   ├── deps.py                 # Dependency injection providers
│   │   ├── router.py               # Central API v1 router
│   │   └── routes/
│   │       ├── health.py           # GET / and GET /health
│   │       ├── weather.py          # GET /api/v1/weather
│   │       ├── forecast.py         # GET /api/v1/forecast
│   │       ├── alerts.py           # GET /api/v1/alerts
│   │       ├── locations.py        # GET /api/v1/locations/search
│   │       └── chat.py             # POST /api/v1/chat
│   ├── schemas/
│   │   ├── weather.py              # Weather telemetry schemas
│   │   ├── forecast.py             # Hourly & daily forecast schemas
│   │   ├── alerts.py               # Weather alert schemas
│   │   ├── location.py             # Geocoding schemas
│   │   ├── chat.py                 # AI assistant schemas
│   │   └── error.py                # Standard error response schemas
│   ├── services/
│   │   ├── weather_service.py      # Weather normalization and TTL cache
│   │   ├── forecast_service.py     # 5-day/3h forecast processing
│   │   ├── alert_service.py        # Alert handling and provider validation
│   │   ├── geocoding_service.py    # Forward & reverse geocoding lookups
│   │   └── llm_service.py          # Grounded AI conversation engine
│   ├── providers/
│   │   ├── base.py                 # Abstract base weather provider
│   │   └── weather_provider.py     # OpenWeatherMap implementation
│   ├── db/
│   │   ├── database.py             # Async database session factory
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   └── repositories.py         # History and favorites repositories
│   └── utils/
│       ├── units.py                # Unit math, compass directions, dew points
│       └── validators.py           # Coordinate & query sanitizers
├── tests/
│   ├── conftest.py                 # Pytest fixtures and mock weather provider
│   ├── test_health.py              # Health check tests
│   ├── test_weather.py             # Current weather tests
│   ├── test_forecast.py            # Forecast tests
│   ├── test_locations.py           # Geocoding tests
│   ├── test_alerts.py              # Alerts tests
│   └── test_chat.py                # AI chat tests
├── .env.example
├── .gitignore
├── requirements.txt
├── pytest.ini
├── Dockerfile
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Python 3.11+**
- (Optional) **Docker**
- (Optional) **PostgreSQL**

### 2. Environment Setup

Clone the repository and create a virtual environment:

```bash
cd weathergpt-backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux / macOS:
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Configure your `.env` variables:

```env
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5
GEOCODING_API_BASE_URL=https://api.openweathermap.org/geo/1.0

# Optional PostgreSQL database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/weathergpt

# Optional OpenAI / LLM API Key (Safe fallback used if left blank)
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1

# CORS allowed origins
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
```

### 3. Run the Development Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Server will be running at: `http://localhost:8000`

Interactive OpenAPI Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)  
Interactive ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📡 API Endpoints

### 1. Root & Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and version metadata |
| `GET` | `/health` | System health check probe |

### 2. Current Weather

```http
GET /api/v1/weather?city=Kanpur
GET /api/v1/weather?lat=26.4499&lon=80.3319
```

**Response Example:**
```json
{
  "location": {
    "city": "Kanpur",
    "country": "India",
    "latitude": 26.4499,
    "longitude": 80.3319,
    "elevation": "126 m",
    "timezone": "UTC+5.5"
  },
  "current": {
    "temperature": 31.0,
    "feels_like": 33.0,
    "temp_min": 24.0,
    "temp_max": 33.0,
    "condition": "Partly Cloudy",
    "condition_code": "partly_cloudy",
    "description": "Humid conditions with convective clouds.",
    "icon": "cloud-sun",
    "humidity": 78,
    "wind_speed": 16.0,
    "wind_direction": "ESE",
    "pressure": 1008,
    "visibility": 6.5,
    "uv_index": 8.0,
    "dew_point": 24.0,
    "cloud_cover": 65,
    "sunrise": "05:48 AM",
    "sunset": "06:22 PM",
    "air_quality": {
      "aqi": 112,
      "pm2_5": 42.1,
      "pm10": 95.4,
      "label": "Moderate",
      "color": "text-amber-500",
      "advice": "Sensitive individuals should wear a mask outdoors."
    }
  },
  "units": "metric",
  "source": "openweathermap"
}
```

### 3. Forecast

```http
GET /api/v1/forecast?city=Kanpur
```

**Response Example:**
```json
{
  "location": "Kanpur",
  "latitude": 26.4499,
  "longitude": 80.3319,
  "hourly": [
    {
      "time": "Now",
      "temperature": 31.0,
      "condition": "Partly Cloudy",
      "icon": "cloud-sun",
      "pop": 20,
      "wind_speed": 16.0,
      "humidity": 78
    }
  ],
  "daily": [
    {
      "day": "Today",
      "date": "Sep 12",
      "temp_min": 24.0,
      "temp_max": 33.0,
      "condition": "Thunderstorm",
      "icon": "cloud-lightning",
      "pop": 65,
      "summary": "Thunderstorm with temperatures between 24°C and 33°C."
    }
  ],
  "units": "metric",
  "source": "openweathermap"
}
```

### 4. Location Search

```http
GET /api/v1/locations/search?q=Kanpur&limit=5
```

**Response Example:**
```json
[
  {
    "name": "Kanpur",
    "region": "Uttar Pradesh",
    "country": "IN",
    "latitude": 26.4499,
    "longitude": 80.3319
  }
]
```

### 5. Weather Alerts

```http
GET /api/v1/alerts?city=Kanpur
```

**Response Example:**
```json
{
  "location": "Kanpur",
  "alerts": [],
  "total_alerts": 0,
  "provider_note": "No active severe government weather alerts currently detected for this zone by OpenWeatherMap."
}
```

### 6. AI Weather Assistant & Chat History
- `POST /api/v1/chat` : Process conversational message & automatically persist to MongoDB `chat_history`.
- `GET /api/v1/chat/history?session_id=...` : Fetch conversation history by session or user.
- `GET /api/v1/chat/sessions` : Fetch distinct conversation sessions with last message & time.
- `DELETE /api/v1/chat/history?session_id=...` : Clear conversation history.

### 7. User Authentication & Preferences (MongoDB)
- `POST /api/v1/auth/register` : Register a new user with password hashing (Bcrypt) & personalized preferences.
- `POST /api/v1/auth/login` : Login with username/email & password to obtain JWT Bearer token.
- `GET /api/v1/auth/me` : Retrieve authenticated user profile.
- `PUT /api/v1/auth/preferences` : Update user preferences (°C/°F, dark/light theme, language, default city).

### 8. Saved & Favorite Locations (MongoDB Geospatial)
- `POST /api/v1/locations/saved` : Save a favorite location with coordinates, tags (Home, Work, Travel).
- `GET /api/v1/locations/saved` : Retrieve user's bookmarked locations.
- `DELETE /api/v1/locations/saved/{location_id}` : Delete saved location bookmark.

### 9. Weather Search & Telemetry History (MongoDB)
- `GET /api/v1/weather/history` : Fetch past weather inquiries with full telemetry metrics.
- `GET /api/v1/weather/history/popular` : Retrieve top trending & most frequently searched cities.
- `DELETE /api/v1/weather/history` : Clear search telemetry logs.

---

## 🧪 Testing

Run the comprehensive pytest test suite:

```bash
pytest -v
```

All 24 automated test cases verify health probes, weather normalization, forecast aggregation, location geocoding, error boundaries, AI chat grounding, user authentication (JWT + Bcrypt), MongoDB chat history, saved locations CRUD, and weather telemetry analytics.

---

## 🐳 Docker Deployment

Build and run using Docker:

```bash
# Build image
docker build -t weathergpt-backend .

# Run container
docker run -d -p 8000:8000 --env-file .env --name weathergpt-api weathergpt-backend
```

Check logs and health:

```bash
docker logs -f weathergpt-api
curl http://localhost:8000/health
```

---

## 📄 License

MIT License © 2026 WeatherGPT Team.
