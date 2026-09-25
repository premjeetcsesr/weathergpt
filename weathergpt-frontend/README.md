# WeatherGPT — Conversational AI for Weather Forecasting, Alerts, and Climate Information 🚀

[![CI/CD Pipeline](https://github.com/premjeetcsesr/weathergpt/actions/workflows/ci.yml/badge.svg)](https://github.com/premjeetcsesr/weathergpt/actions/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/tests-87%2F87%20passing-brightgreen)](https://github.com/premjeetcsesr/weathergpt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Smart India Hackathon (SIH 2026)**  
**Problem Statement**: SIH26068 – *WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information*

---

## 🌟 Executive Summary

**WeatherGPT** is a production-grade, multi-provider weather intelligence platform that marries empirical meteorological data with conversational AI. Designed under strict anti-hallucination protocols, WeatherGPT treats external meteorological sensor networks, radar arrays, and government forecast models as the **exclusive source of ground truth**, using AI purely for natural language synthesis, multilingual translation, and domain-specific safety advisories.

---

## 🏗️ Architecture & Technology Stack

```
                                  +-----------------------+
                                  |   Nginx Ingress Proxy | (Port 80 / 443 SSL)
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   | (Static Assets / SPA)                               | (REST / WebSocket / Health)
                   v                                                     v
        +----------------------+                              +----------------------+
        |  React.js / Vite UI  |                              |   FastAPI Backend    | (Port 8000)
        |  (Tailwind CSS, GIS) |                              +----------+-----------+
        +----------------------+                                         |
                                         +-------------------------------+-------------------------------+
                                         |                               |                               |
                                         v                               v                               v
                              +--------------------+          +--------------------+          +--------------------+
                              |  MongoDB Database  |          | Weather Providers  |          |      AI / LLM      |
                              |  (Users, Alerts,   |          | - OpenWeatherMap   |          | (OpenAI GPT with   |
                              |  Climate History)  |          | - Official IMD     |          | Grounded Context)  |
                              +--------------------+          | - NWP / Radar / Sat|          +--------------------+
                                                              +--------------------+
```

### Stack Components:
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Leaflet / React-Leaflet, Lucide React.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Motor / PyMongo, HTTPX.
- **Database**: MongoDB (indexes for geospatial queries, user sessions, warnings, and time-series climate).
- **Authentication**: Stateless JWT (`HS256`), bcrypt password hashing (12 rounds), Role-Based Access Control (`USER`, `ADMIN`).
- **Real-Time**: WebSocket connection manager with topic-based pub/sub, heartbeat, and cross-user isolation.
- **Containerization**: Docker multi-stage builds, Docker Compose, Nginx reverse proxy, non-root execution.

---

## 🛡️ Security & Enterprise Hardening (Step 8)

1. **Zero Frontend Secrets**:
   - The React client contains **no API keys** (OpenAI, OpenWeatherMap, or IMD).
   - Weather map tiles are proxied securely server-side through `/api/v1/weather/tiles/{layer}/{z}/{x}/{y}`.
2. **Role-Based Access Control (RBAC)**:
   - User roles (`USER`, `ADMIN`).
   - Administrative endpoints (`/api/v1/weather/admin/diagnostics`) require the `ADMIN` role and return HTTP 403 Forbidden to normal users.
3. **API Rate Limiting**:
   - In-memory sliding-window token bucket protecting sensitive routes:
     - `/auth/login`: 5 requests / min
     - `/auth/register`: 5 requests / min
     - `/chat`: 30 requests / min
     - `/weather`: 60 requests / min
4. **Security Headers**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforced in production).
5. **Correlation & Traceability**:
   - Every request is tagged with an `X-Request-ID` header.
   - Structured backend logging prefixes log lines with `[X-Request-ID]`.
6. **Observability & Health Probes**:
   - `GET /health`: Fast liveness check.
   - `GET /health/ready`: Deep readiness probe checking MongoDB connection and weather provider reachability.

---

## 🚀 Quick Start & Local Execution

### 1. Backend Setup
```bash
cd weathergpt-backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI with Uvicorn:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Swagger Documentation: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/health`
- Readiness Probe: `http://localhost:8000/health/ready`

### 2. Frontend Setup
```bash
cd weathergpt-frontend
npm install
npm run dev
```
- UI Dashboard: `http://localhost:5173`

---

## 🐳 Production Deployment with Docker Compose

To deploy WeatherGPT with network isolation, persistent MongoDB volume, and an Nginx reverse proxy:

```bash
# 1. Clone repo
git clone https://github.com/premjeetcsesr/weathergpt.git
cd weathergpt

# 2. Build and start services
docker compose build
docker compose up -d

# 3. Verify services
docker compose ps
curl http://localhost/health
```

---

## 🧪 Automated Testing

WeatherGPT includes a comprehensive automated test suite with **87 passing tests** covering authentication, RBAC, nowcasting, advisories, severe weather risk, climate analytics, multilingual translation, rate limiting, and security headers.

```bash
cd weathergpt-backend
.venv\Scripts\pytest -v tests/
```

```bash
cd weathergpt-frontend
npm run build
```

---

## 📂 Repository Structure

```
weathergpt/
├── .github/workflows/ci.yml       # Continuous Integration Pipeline
├── docker-compose.yml             # Production multi-container orchestration
├── nginx/                         # Nginx edge reverse proxy configuration
├── PRODUCTION_CHECKLIST.md        # Comprehensive production audit checklist
├── DEPLOYMENT.md                  # Deployment options, backup, & DR guide
├── weathergpt-backend/            # Python / FastAPI Backend
│   ├── app/
│   │   ├── api/                   # REST API routes and dependencies (RBAC)
│   │   ├── core/                  # Config, security, logging, middlewares
│   │   ├── db/                    # MongoDB motor client and repositories
│   │   ├── providers/             # OpenWeather, IMD, NWP, Radar, Sat interfaces
│   │   ├── schemas/               # Pydantic v2 validation models
│   │   └── services/              # Business intelligence, nowcast, alerts
│   ├── Dockerfile                 # Multi-stage production container
│   ├── requirements.txt           # Production dependencies
│   └── tests/                     # 87 automated pytest integration tests
└── weathergpt-frontend/           # React.js / Vite SPA Frontend
    ├── src/
    │   ├── components/            # Dashboard, Map, Climate, Alerts, Voice UI
    │   ├── context/               # Auth, Weather, Language contexts
    │   ├── pages/                 # Dashboard, Assistant, Climate, Alerts
    │   └── services/              # API clients (Zero frontend secrets)
    ├── Dockerfile                 # Multi-stage Node build -> Nginx Alpine
    ├── nginx.conf                 # Frontend container SPA routing configuration
    └── package.json               # Frontend dependencies & build scripts
```

---

## 📄 License & Attribution

Developed for **Smart India Hackathon (SIH 2026)** – Problem Statement **SIH26068**.  
Licensed under the [MIT License](LICENSE).