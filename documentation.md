# WeatherGPT — Technical Documentation & Architecture Specification

---

## 1. TITLE PAGE

```text
========================================================================================
                                    WeatherGPT
   "Conversational AI for Weather Forecasting, Alerts, and Climate Information"
========================================================================================

Smart India Hackathon 2026 (SIH 2026)
Problem Statement ID : SIH26068
Ministry             : Ministry of Earth Sciences (MoES)
Department           : India Meteorological Department (IMD)
Theme                : Disaster Management
Category             : Software (Web / Conversational AI / Geospatial)
Target Audience      : Citizens, Farmers, Disaster Management Authorities, Researchers
Project Repository   : https://github.com/premjeetcsesr/weathergpt
Documentation Version: 1.0.0 (SIH-2026 Production Specification)
Date                 : September 2026
========================================================================================
```

---

## 2. EXECUTIVE SUMMARY

**WeatherGPT** is an enterprise-grade conversational weather intelligence platform engineered to bridge the gap between complex meteorological data streams and end-user decision-making. Developed for the Smart India Hackathon 2026 under the Ministry of Earth Sciences (MoES) and the India Meteorological Department (IMD), WeatherGPT transforms raw, multi-format meteorological observations, forecasts, radar layers, and disaster warnings into clear, actionable, natural-language insights accessible via conversational text, multilingual interfaces, interactive geospatial maps, and voice channels.

### Core Value Proposition & Problem Solved
Meteorological information in India is generated through high-precision networks (Automatic Weather Stations, Doppler Weather Radars, INSAT satellites, and Numerical Weather Prediction models). However, end users—ranging from smallholder farmers needing pesticide-spray advisories to district disaster officers tracking cyclone trajectories—face fragmented portals, technical jargon, and static PDF bulletins. WeatherGPT provides a unified conversational interface that resolves intent, extracts spatial-temporal entities, retrieves verified meteorological facts, and formats them into grounded, non-hallucinatory explanations.

### Architectural Cornerstone: Verified Truth First
The foundational principle of WeatherGPT is:
> **"Verified meteorological data is the single source of truth. The Large Language Model (LLM) must never extrapolate, predict, or invent atmospheric measurements or official disaster alerts."**

All numerical telemetry (temperature, precipitation, wind speed, pressure, AQI) and severe warnings are ingested from verified meteorological engines and passed into structured prompt contexts. If an LLM API key is unavailable or external AI services experience downtime, WeatherGPT gracefully falls back to deterministic Natural Language Generation (NLG) engines to ensure 100% service continuity during disaster scenarios.

### Technology Summary
- **Frontend**: React 18, Vite 6, Tailwind CSS 3.4, React Leaflet (OpenStreetMap tile layers), Recharts 2.15, Lucide Icons.
- **Backend**: Python 3.13 / FastAPI 0.115, Uvicorn, Pydantic v2 Settings & Schemas, HTTPX async client, Motor (Async MongoDB).
- **AI / Natural Language Engine**: OpenAI-compatible LLM abstraction layer with strict anti-hallucination grounding, system prompts, regex/lexical entity extraction, and deterministic rule-based NLG fallbacks.
- **Data & Providers**: Multi-provider abstraction (`BaseWeatherProvider`, `OpenWeatherMapProvider`, `IMDProvider` architecture stub, `RadarProvider`, `SatelliteProvider`, `NWPProvider`).
- **Real-Time Communication**: WebSocket connection manager with isolated topic subscriptions for live disaster alert broadcasting.
- **Database**: MongoDB 7.0 (collections: `users`, `chat_history`, `locations`, `weather_history`, `alerts`, `alert_subscriptions`, `notification_history`, `climate_history`, `official_warnings`, `weather_advisories`, `provider_status`).
- **Security & Infrastructure**: JWT authentication (HS256) with bcrypt hashing, Role-Based Access Control (RBAC), Server-Side Request Forgery (SSRF) proxy whitelist, in-memory rate limiting, OWASP security headers, Docker & Docker Compose containerization, and reverse-proxy routing via Nginx.

---

## 3. PROBLEM STATEMENT (SIH26068)

### SIH Problem Context
India's diverse climatological zones—ranging from arid northwestern deserts and high-altitude Himalayan terrain to tropical coastal belts—experience frequent extreme weather events including flash floods, heatwaves, cyclones, and severe thunderstorms. The India Meteorological Department (IMD) and MoES generate world-class forecast and observation data; however, dissemination challenges limit real-world impact.

```
+-----------------------------------------------------------------------------------+
|                        THE FRAGMENTATION BOTTLENECK                               |
+-----------------------------------------------------------------------------------+
|  [ AWS / ARG Networks ]  [ Doppler Radar Feeds ]  [ INSAT Imagery ]  [ NWP WRF ]  |
|           |                       |                      |                |       |
|           +-----------------------+----------------------+----------------+       |
|                                   |                                               |
|                    Static Tables / PDFs / Separate Portals                        |
|                                   |                                               |
|           +-----------------------+----------------------+----------------+       |
|           |                       |                      |                |       |
|    "Will it rain in        "Should I spray         "Is there an      "How did 5yr |
|    Kanpur tomorrow?"       my mustard crop?"      active warning?"   rain change?"|
|           |                       |                      |                |       |
|      [ Citizen ]              [ Farmer ]          [ Disaster NDRF ] [ Researcher ]|
+-----------------------------------------------------------------------------------+
```

### Key Structural Challenges in Existing Dissemination
1. **Fragmentation of Portals**: Users must navigate distinct web pages for city forecasts, district nowcasts, cyclone bulletins, radar reflectivity, and air quality indexes.
2. **Technical Jargon**: Meteorological terms such as *convective instability*, *sub-synoptic scale convergence*, and *hectopascals* are incomprehensible to ordinary citizens and rural agrarian workers.
3. **Language & Modality Barriers**: Significant portions of rural agricultural workers require voice and regional Indic language interaction rather than text-heavy English web dashboards.
4. **Lack of Contextual Decision Support**: A forecast stating "45mm rainfall in 3 hours" fails to state whether field drainage ditches should be opened, pesticide spraying should be postponed, or urban underpasses should be barricaded.

### Persona-Specific Query Scenarios
- **Citizen**: *"Will it rain in Kanpur tomorrow evening during my commute?"*
- **Farmer**: *"I need to spray pesticide on my crop in Meerut. Is heavy rain expected within the next 24 hours?"*
- **Disaster Management Officer**: *"Show active red or orange meteorological warnings across Coastal Odisha districts."*
- **Researcher / Urban Planner**: *"What is the 30-day temperature trend and rainfall anomaly in Varanasi compared to historical baseline?"*

---

## 4. EXISTING SYSTEM & CURRENT CHALLENGES

The Government of India and the India Meteorological Department operate robust, high-precision forecasting infrastructures including the National Data Centre, Doppler Weather Radar networks, INSAT-3D/3DR/3DS geostationary satellites, and high-performance computing clusters executing Numerical Weather Prediction (NWP) models (GFS, NCUM, WRF).

> **Crucial Positioning**: WeatherGPT does not replace IMD or existing government meteorological pipelines. It serves as an **intelligent conversational and accessibility layer** built on top of verified meteorological data sources to maximize public reach, comprehension, and actionable disaster preparedness.

```
+--------------------------+------------------------------------+------------------------------------+
| Parameter / Dimension    | Traditional Weather Portals / Apps | WeatherGPT Platform                |
+--------------------------+------------------------------------+------------------------------------+
| Interaction Paradigm     | Static dashboard, manual dropdowns | Conversational AI + Visual Panels  |
| Query Flexibility        | Fixed city lookup forms            | Natural language, voice, multi-turn|
| Warning Visibility       | Buried in PDF bulletins / tables   | Prioritized alerts, WebSocket push |
| Decision Support         | Raw metrics only (°C, mm, hPa)     | Actionable sector safety advisories|
| Language Accessibility   | Primarily English / formal Hindi   | Multilingual & Hindi/Hinglish ready|
| Data Provenance          | Opaque or generic labels           | Strict source transparency badges  |
| Radar & Satellite        | Disjointed specialist viewports    | Integrated Leaflet overlay proxy   |
+--------------------------+------------------------------------+------------------------------------+
```

---

## 5. PROPOSED SOLUTION

WeatherGPT is designed as a modular, full-stack, AI-augmented meteorological platform with the following core pillars:

```
+------------------------------------------------------------------------------------------+
|                                WEATHERGPT ARCHITECTURE OVERVIEW                          |
+------------------------------------------------------------------------------------------+
|  [ User Interface ] : React 18 + Vite + Tailwind + Leaflet + Voice (Web Speech API)      |
|                                         |  (HTTP REST / WebSocket)                       |
|  [ Security / Gateway ] : Nginx Reverse Proxy -> FastAPI Gateway (JWT / RBAC / RateLimit)|
|                                         |                                                |
|  [ Intelligence Engine ] : Location Resolution -> Intent / Entity Extractor -> LLM / NLG |
|                                         |                                                |
|  [ Data Provider Layer ] : Provider Factory -> [ OpenWeatherMap / IMD Adapter / Radar ]  |
|                                         |                                                |
|  [ Storage & Persistence ] : MongoDB 7.0 (Telemetry, Sessions, Subscriptions, Warnings)   |
+------------------------------------------------------------------------------------------+
```

### Status Key
- ✅ **IMPLEMENTED**: Active in code, verified with automated test suite and live endpoints.
- 🟡 **CONFIGURED / INACTIVE**: Architecture, environment keys, and service plumbing present; awaiting live production credentials or official network authorization.
- 🔵 **ARCHITECTURE READY**: Interfaces, provider stubs, and normalization contracts fully defined.
- 🟠 **PLANNED**: On the engineering roadmap for future development phases.
- ❌ **NOT IMPLEMENTED**: Excluded from current release scope.

### Feature Capability Matrix

```
+-----------------------------------+----------------------------------------------------+--------------------------+
| Feature Area                      | Technical Implementation Summary                   | Status                   |
+-----------------------------------+----------------------------------------------------+--------------------------+
| Current Weather Telemetry         | Full atmospheric observation with AQI calculation  | ✅ IMPLEMENTED           |
| 5-Day / 3-Hour Forecast           | Aggregated daily and hourly forecast sequences     | ✅ IMPLEMENTED           |
| Grounded AI Assistant             | LLM engine grounded strictly in verified context   | ✅ IMPLEMENTED           |
| Deterministic NLG Fallback        | Rule-based NLG responses when LLM key is absent    | ✅ IMPLEMENTED           |
| Short-Term Nowcast (0-3h)         | Trend-based precipitation and convective shifts    | ✅ IMPLEMENTED           |
| Official Warnings Engine          | Severity-ranked warning ingestion & deduplication  | ✅ IMPLEMENTED           |
| Severe Risk Signals               | Empirical risk formulas (heatwaves, storms, gales) | ✅ IMPLEMENTED           |
| Actionable Safety Advisories      | Practical, everyday precaution generation          | ✅ IMPLEMENTED           |
| Climate Analytics & Anomalies     | Z-score anomalies, regression slopes, comparisons  | ✅ IMPLEMENTED           |
| Real-Time WebSocket Alerts        | Live push broadcasting with topic subscriptions    | ✅ IMPLEMENTED           |
| In-Memory Cache (TTL)             | 300s TTL cache minimizing external API roundtrips  | ✅ IMPLEMENTED           |
| MongoDB Async Persistence         | Motor driver handling 13 collections & indexes     | ✅ IMPLEMENTED           |
| JWT Authentication & RBAC         | Token lifecycle, Bcrypt hashing, USER/ADMIN roles  | ✅ IMPLEMENTED           |
| Saved Locations Geospatial        | 2dsphere MongoDB indexed favorite locations        | ✅ IMPLEMENTED           |
| Voice Input & Speech Output       | Browser Web Speech STT & TTS integration           | ✅ IMPLEMENTED           |
| Multilingual (Hindi / English)    | Devanagari / Latin script detection & templates    | ✅ IMPLEMENTED           |
| SSRF-Protected Tile Proxy         | Doppler radar & satellite tile server-side proxy   | ✅ IMPLEMENTED           |
| OpenWeatherMap Provider           | Live production fallback weather & geocoding feed  | ✅ IMPLEMENTED           |
| IMD API Provider Adapter          | Official IMD schema adapter and endpoint contracts | 🟡 CONFIGURED / INACTIVE |
| Live Doppler Radar Stream (DWR)   | Layer metadata ready; live Indian radar feed       | 🔵 ARCHITECTURE READY    |
| Live Satellite (INSAT-3D/3DR/3DS) | Channel schema ready; live MOSDAC/IMD feed         | 🔵 ARCHITECTURE READY    |
| Numerical Weather Prediction (NWP)| GFS / WRF raw GRIB2 parser integration             | 🟠 PLANNED               |
| Bhashini Indic Voice Pipeline     | Deep National Language Translation Mission hooks   | 🟠 PLANNED               |
+-----------------------------------+----------------------------------------------------+--------------------------+
```

---

## 6. PROJECT OBJECTIVES

1. **Simplify Access**: Provide single-entry access to fragmented meteorological datasets through conversational AI.
2. **Natural Language Processing**: Allow citizens to query weather conditions using natural, unconstrained phrasing.
3. **Data Verification**: Enforce that all atmospheric data originates from verified meteorological services without LLM fabrication.
4. **Hyperlocal Intelligence**: Provide district- and coordinates-level resolution across Indian states.
5. **Disaster Risk Reduction**: Automatically prioritize severe weather warnings (Cyclone, Heavy Rain, Heatwave, Gale Wind).
6. **Bilingual & Multilingual Accessibility**: Support seamless English, Hindi, and Hinglish interactions.
7. **Voice Modality**: Enable hands-free voice input and speech synthesis for users with varying literacy levels.
8. **Empirical Climate Insights**: Provide historical trends, regression slopes, and Z-score anomaly calculations.
9. **Actionable Decision Support**: Deliver pragmatic, sector-specific safety guidelines.
10. **Provenance Transparency**: Explicitly display the data source, update timestamp, and confidence score on every response.
11. **Strict Hallucination Prevention**: Constrain LLMs to fact-grounded system prompts and enforce deterministic NLG fallbacks.
12. **High Availability & Scalability**: Deploy async FastAPI microservices capable of horizontal scaling with containerization.

---

## 7. TARGET AUDIENCE & DOMAIN USE CASES

```
+------------------------------------+----------------------------------------------------------------------------------------+
| Target Stakeholder                 | Primary Interaction & Value Realization                                                |
+------------------------------------+----------------------------------------------------------------------------------------+
| General Citizens                   | Commute planning, outdoor event safety, severe storm warnings, AQI health precautions. |
| Farmers & Agronomists              | Sowing, irrigation schedules, pesticide spraying safety, frost/heatwave warnings.      |
| Disaster Management (NDMA / SDMA)  | Rapid spatial alert audits, district-level warning tracking, cyclone preparedness.     |
| Researchers & Climate Analysts     | Historical precipitation trends, temperature anomalies, statistical comparison graphs.|
| Urban Local Bodies & Municipalities| Water-logging alerts, localized heavy rainfall nowcasts, heat-action plan activations.  |
| Coastal & Marine Stakeholders      | Gale wind alerts, sea-state warnings, coastal squall advisories.                       |
| Students & Educators               | Interactive exploration of meteorological phenomena, humidity curves, and pressure.   |
+------------------------------------+----------------------------------------------------------------------------------------+
```

---

## 8. KEY FEATURES SPECIFICATION

```
+-------------------------+-------------------------------------------------------+------------------------------------------+-----------------------+----------------------------+
| Feature Name            | Detailed Description                                  | Primary User Benefit                     | Implementation Status | Technology / API           |
+-------------------------+-------------------------------------------------------+------------------------------------------+-----------------------+----------------------------+
| Current Weather         | Real-time temperature, wind, humidity, pressure, AQI  | Immediate atmospheric awareness          | ✅ IMPLEMENTED        | FastAPI / OpenWeather / IMD|
| 5-Day Forecast          | 3-hour interval and daily aggregated projections      | Medium-term activity planning            | ✅ IMPLEMENTED        | OpenWeather Forecast API   |
| Conversational AI Chat  | Multi-turn conversational assistant grounded in facts | Natural language query resolution        | ✅ IMPLEMENTED        | OpenAI GPT / Rule Engine   |
| Grounded NLG Fallback   | Deterministic weather synthesis without LLM API key   | 100% offline & disaster uptime guarantee | ✅ IMPLEMENTED        | Python NLG Generator       |
| Severe Risk Engine      | Empirical formulas evaluating heatwaves, storms, rain | Proactive emergency risk detection       | ✅ IMPLEMENTED        | Domain Math Services       |
| Official Warnings       | Severity-ranked government warning ingestion          | Transparent disaster notification        | ✅ IMPLEMENTED        | Warning Normalization Core |
| Short-Term Nowcast      | 0-3 hour high-frequency precipitation trends          | Immediate thunderstorm alerts            | ✅ IMPLEMENTED        | Nowcast Logic Engine       |
| Actionable Advisories   | Practical hydration, clothing, and travel safety rules| Contextual human decision support        | ✅ IMPLEMENTED        | Advisory Generator         |
| Climate Analytics       | Time-series, Z-score anomalies, regression slopes     | Long-term climate trend evaluation       | ✅ IMPLEMENTED        | Recharts / Math Engine     |
| Geospatial Map View     | Leaflet interactive layers for temperature & clouds   | Visual geographic context                | ✅ IMPLEMENTED        | React-Leaflet / OSM Tiles  |
| Doppler Radar Proxy     | SSRF-protected proxy for DWR composite reflectivity   | Precipitation tracking                   | 🔵 ARCHITECTURE READY | RadarProvider / Proxy Gate |
| Satellite Layer Proxy   | SSRF-protected proxy for INSAT-3D multispectral feeds | Cloud motion & cyclone tracking          | 🔵 ARCHITECTURE READY | SatelliteProvider / Proxy  |
| Location Search         | Forward geocoding with Indian district normalization  | Fast city & coordinate lookup            | ✅ IMPLEMENTED        | OpenWeather Geocoding API  |
| Saved Locations         | Geospatial 2dsphere MongoDB bookmarks (Home/Work)     | 1-click personalized dashboard           | ✅ IMPLEMENTED        | MongoDB / Motor            |
| Search History          | Telemetry logs of popular & historical searches       | Fast telemetry audit & trends            | ✅ IMPLEMENTED        | MongoDB `weather_history`  |
| WebSocket Alert Stream  | Real-time push broadcast for subscribed locations     | Zero-latency emergency notifications     | ✅ IMPLEMENTED        | FastAPI WebSocket Manager  |
| Multilingual Engine     | Auto-detection of Hindi / English / Hinglish text     | Linguistic accessibility across India    | ✅ IMPLEMENTED        | Custom Language Classifier |
| Voice Input / Output    | Web Speech Recognition & SpeechSynthesis interfaces   | Hands-free voice accessibility           | ✅ IMPLEMENTED        | Browser Web Speech API     |
| JWT Authentication      | Secure user registration, login, and RBAC             | Profile isolation & administrative tools | ✅ IMPLEMENTED        | PyJWT / Passlib Bcrypt     |
| Source Attribution      | Explicit metadata showing provider, time, confidence  | Prevents misinformation & builds trust   | ✅ IMPLEMENTED        | Transparency Schemas       |
| Multi-Provider Factory  | Dynamic fallback between IMD, OpenWeather, and Mock   | High resilience against API outages      | ✅ IMPLEMENTED        | Provider Factory Pattern   |
+-------------------------+-------------------------------------------------------+------------------------------------------+-----------------------+----------------------------+
```

---

## 9. SYSTEM ARCHITECTURE

WeatherGPT follows a multi-tier, decoupled microservice architecture optimized for low-latency queries, factual data grounding, and resilient fallback handling.

```
+---------------------------------------------------------------------------------------------------------+
|                                        WEATHERGPT SYSTEM ARCHITECTURE                                   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                                  CLIENT LAYER (React 18 + Vite)                                 |   |
|   |  - Dashboard View (Telemetry, AQI, Hourly/Daily Forecast)   - AI Conversational Assistant View  |   |
|   |  - Interactive Weather Map (Leaflet / Radar / Satellite)    - Climate Analytics (Recharts)      |   |
|   |  - Real-Time Alerts & Notification Bell                     - User Settings & Auth Modal        |   |
|   |  - Web Speech API (Voice STT / TTS)                         - Language Selector (EN / HI)       |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                  |   ^                                                  |
|                              HTTP REST / JSON    |   |  WebSocket Push (/api/v1/ws/alerts)              |
|                                                  v   |                                                  |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                                  EDGE PROXY LAYER (Nginx Ingress)                               |   |
|   |  - Port 80/443 Routing   - Security Headers   - Static Asset Caching   - WebSocket Upgrade Pass |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                  |                                                      |
|                                                  v                                                      |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                               BACKEND GATEWAY (FastAPI / Python 3.13)                           |   |
|   |  +-------------------------------------------------------------------------------------------+  |   |
|   |  | Middleware Pipeline: SecurityHeaders -> CorrelationID -> RateLimiter -> CORS -> Logger    |  |   |
|   |  +-------------------------------------------------------------------------------------------+  |   |
|   |                                              |                                                  |   |
|   |  +---------------------+  +----------------------+  +--------------------+  +----------------+  |   |
|   |  | Auth & RBAC         |  | Location Resolver    |  | Alert Monitor      |  | WS Manager     |  |   |
|   |  | (JWT / Bcrypt)      |  | (Geocoding / Cache)  |  | (Background Poller)|  | (Client Pools) |  |   |
|   |  +---------------------+  +----------------------+  +--------------------+  +----------------+  |   |
|   |                                              |                                                  |   |
|   |  +-------------------------------------------------------------------------------------------+  |   |
|   |  | Service Layer: WeatherService | ForecastService | WarningService | NowcastService             |  |   |
|   |  |                SevereWeatherService | AdvisoryService | ClimateService | LLMService       |  |   |
|   |  +-------------------------------------------------------------------------------------------+  |   |
|   |                                              |                                                  |   |
|   |  +-------------------------------------------------------------------------------------------+  |   |
|   |  | Provider Abstraction: ProviderFactory -> [ OpenWeatherMapProvider | IMDProvider ]         |  |   |
|   |  |                       RadarProvider (Proxy) | SatelliteProvider (Proxy) | NWPProvider     |  |   |
|   |  +-------------------------------------------------------------------------------------------+  |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                |                                    |                                   |
|                                v                                    v                                   |
|   +------------------------------------------+    +-------------------------------------------------+   |
|   |         DATABASE LAYER (MongoDB 7.0)     |    |           EXTERNAL METEOROLOGICAL SERVICES      |   |
|   |  - users              - chat_history     |    |  - OpenWeatherMap API (Current, Forecast, Geo)  |   |
|   |  - locations          - weather_history  |    |  - India Meteorological Department (IMD API)   |   |
|   |  - alerts             - subscriptions    |    |  - OpenAI API (GPT-4o-mini / Grounded Chat)    |   |
|   |  - notifications      - climate_history  |    |  - Doppler Radar & INSAT Satellite Tile Servers |   |
|   +------------------------------------------+    +-------------------------------------------------+   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 10. DETAILED DATA FLOWS

### Flow A: Current Weather Query (`"What is the weather in Kanpur?"`)
1. **User Action**: User types or speaks query into the interface.
2. **Frontend Dispatch**: Client executes `GET /api/v1/weather?city=Kanpur`.
3. **Backend Middleware**: Request receives `X-Request-ID`, checks in-memory rate limits, and validates query parameters.
4. **Cache Check**: `WeatherService` checks the in-memory cache for `current_weather:Kanpur`. If valid cache exists (< 300s), returns cached payload immediately.
5. **Geocoding & Provider Fetch**: Cache miss triggers forward geocoding to resolve `(26.4499°N, 80.3319°E)`. `ProviderFactory` calls `OpenWeatherMapProvider.get_current_weather()`.
6. **Normalization**: Raw API response is normalized into Pydantic schema `WeatherResponse` (calculating AQI, wind direction string, dew point, and UV index).
7. **Telemetry Persistence**: Weather query is asynchronously recorded in MongoDB collection `weather_history`.
8. **UI Rendering**: Dashboard displays temperature cards, condition icons, AQI gauge, and source attribution badge.

### Flow B: Forecast Query (`"Will it rain tomorrow in Jaipur?"`)
```
User Query: "Will it rain tomorrow in Jaipur?"
  │
  ├──> GET /api/v1/forecast?city=Jaipur
  │      │
  │      ├──> Geocoding Service -> Jaipur (26.9124° N, 75.7873° E)
  │      ├──> Provider Factory -> Fetch 5-Day / 3-Hour Forecast Data
  │      └──> Forecast Service -> Aggregate 3-hour slices into daily buckets
  │             - Extract: Tomorrow's Max/Min Temp, Condition, Precipitation Probability (POP %)
  │
  └──> Return JSON Payload -> UI displays daily summary card & hourly rain trajectory chart
```

### Flow C: Official Warning Query (`"Is there any warning in my district?"`)
1. Client requests `GET /api/v1/weather/warnings?city=Puri`.
2. `WarningService` searches active database records in `official_warnings` and queries provider warning endpoints.
3. Warnings are sorted by severity: `EXTREME > SEVERE > MODERATE > MINOR`.
4. If active warnings exist, returns structured warning with color code (Red/Orange/Yellow), issued timestamp, validity window, and government authority attribution.
5. If no warning exists, returns: `"No active official meteorological warnings currently reported for Puri district."`

### Flow D: Short-Term Nowcast Query (`"Will there be a thunderstorm in the next 3 hours?"`)
1. Client calls `GET /api/v1/weather/nowcast?city=Lucknow`.
2. `NowcastService` inspects immediate 0–3 hour atmospheric indicators (convective cloud cover, humidity > 80%, rapid pressure drops, near-term rain probability).
3. Generates 3 sequential 1-hour nowcast slices with trend summary and risk status.

### Flow E: AI Conversational Query (`"What should I do if heavy rain is expected?"`)
1. User submits conversational message via `POST /api/v1/chat`.
2. `ChatService` extracts location (defaults to session city if omitted) and language (English/Hindi).
3. System fetches real-time verified weather telemetry and active warnings for the target city.
4. **Context Construction**: Formats verified facts into a structured system prompt.
5. **LLM Invocation**: Calls OpenAI API with strict instructions: *"Rely ONLY on provided weather facts. Do not invent temperatures or warnings."*
6. **Persistence**: User query and AI response are written to MongoDB `chat_history`.
7. **Response Delivery**: Returns structured `ChatResponse` containing answer, source metadata, and confidence score.

### Flow F: Voice Interaction Pipeline
```
[ User Speaks (Hindi/English) ]
       │
       ▼ (Microphone Stream)
[ Web SpeechRecognition API (Browser Engine) ]
       │
       ▼ (Transcribed Text)
[ POST /api/v1/chat (Payload: { message: text, language: "auto", voice_enabled: true }) ]
       │
       ▼
[ Intent Extraction + Verified Data Context Retrieval + LLM Execution ]
       │
       ▼ (Response Text)
[ Web SpeechSynthesis API (Browser Audio Output) ]
       │
       ▼
[ Spoken Voice Audio to User ]
```

---

## 11. AI & LLM ARCHITECTURE

WeatherGPT utilizes an **information-grounded Retrieval-Augmented Generation (RAG)** architecture specifically tuned for structured meteorological data.

```
+-----------------------------------------------------------------------------------------------+
|                                GROUNDED AI CONVERSATION PIPELINE                              |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|   1. USER INPUT                                                                               |
|      "Can I dry my wheat harvest outside in Varanasi today?"                                  |
|                                                                                               |
|   2. INTENT & ENTITY EXTRACTION                                                               |
|      - Intent: Agricultural / Drying Activity Safety                                          |
|      - Entity Location: Varanasi (25.3176° N, 82.9739° E)                                     |
|      - Entity Time: Today / Next 12 Hours                                                     |
|      - Language: English (auto-detected)                                                      |
|                                                                                               |
|   3. VERIFIED DATA CONTEXT BUILDER (MANDATORY GATEWAY)                                        |
|      +-------------------------------------------------------------------------------------+  |
|      | Real-Time Weather : Temp: 34°C, Humidity: 82%, Condition: Thunderstorm              |  |
|      | 3-Hour Forecast   : 70% rain probability between 2:00 PM - 5:00 PM                  |  |
|      | Official Warning  : Yellow Alert - Isolated Thunderstorms & Lightning               |  |
|      | Data Source       : Verified OpenWeatherMap Telemetry / IMD Protocol Feed            |  |
|      +-------------------------------------------------------------------------------------+  |
|                                                                                               |
|   4. STRICT SYSTEM PROMPT INJECTION                                                           |
|      "You are WeatherGPT, an official weather intelligence assistant.                         |
|       Answer the user query strictly using the supplied meteorological facts above.           |
|       Under no circumstance should you invent or assume different weather conditions.        |
|       Provide clear, practical safety advice based solely on these numbers."                  |
|                                                                                               |
|   5. LLM SYNTHESIS / DETERMINISTIC NLG ENGINE                                                 |
|      "In Varanasi today, drying wheat outdoors is NOT recommended. Current conditions show    |
|       humid weather (82%) with a 70% chance of thunderstorms this afternoon and an active    |
|       Yellow Alert for lightning. Keep your harvest covered in a dry, ventilated area."       |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
```

---

## 12. ANTI-HALLUCINATION DESIGN

Hallucination in meteorological systems poses severe real-world dangers (e.g., falsely assuring safety before a flash flood or fabricating non-existent cyclone warnings). WeatherGPT implements a 10-point anti-hallucination defense architecture:

```
[ Incoming User Query ]
          │
          ▼
┌─────────────────────────────────────────┐
│ 1. Mandatory Telemetry Fetch Gate       │ ──> (Rejects pure generative guessing)
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ 2. Structured JSON Context Construction │ ──> (Injects verified facts, timestamps, units)
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ 3. Negative Constraint System Prompt    │ ──> ("Do not extrapolate unlisted metrics")
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ 4. Deterministic NLG Safety Switch      │ ──> (If LLM fails or is missing, uses template NLG)
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ 5. Provenance & Confidence Stamp        │ ──> (Outputs source provider & timestamp metadata)
└─────────────────────────────────────────┘
          │
          ▼
[ Verified, Safe User Output ]
```

### Core Anti-Hallucination Principles
1. **Fact Retrieval Prior to Generation**: LLM synthesis is never invoked without preceding API telemetry retrieval.
2. **Explicit Data Boundaries**: Missing telemetry is marked as `"Data unavailable"` rather than generated.
3. **No Synthetic Disaster Warnings**: Official warnings are only rendered if confirmed by authoritative databases; the LLM is barred from generating emergency declarations.
4. **Deterministic Fallback**: If OpenAI connectivity is lost or `LLM_API_KEY` is omitted, the platform uses pre-compiled deterministic Python formatting functions.
5. **Confidence Transparency**: Responses include explicit confidence ratings (`"High (Grounded in Verified Telemetry)"`).

---

## 13. EXTERNAL APIS & DATA SOURCES INVENTORY

```
+--------------------------+------------------------------+---------------------------------------+-----------------------+-------------------------+
| Provider / Service       | Operational Purpose          | Endpoint / Integration Route          | Authentication Method | Implementation Status   |
+--------------------------+------------------------------+---------------------------------------+-----------------------+-------------------------+
| OpenWeatherMap Current   | Real-time weather telemetry  | `GET /data/2.5/weather`               | API Key (`appid`)     | ✅ IMPLEMENTED (Active)  |
| OpenWeatherMap Forecast  | 5-day / 3-hour forecasts     | `GET /data/2.5/forecast`              | API Key (`appid`)     | ✅ IMPLEMENTED (Active)  |
| OpenWeatherMap Geocoding | City name to coordinates     | `GET /geo/1.0/direct`                 | API Key (`appid`)     | ✅ IMPLEMENTED (Active)  |
| OpenWeatherMap Alerts    | External active alerts       | `GET /data/2.5/onecall` (Optional)    | API Key (`appid`)     | ✅ IMPLEMENTED (Active)  |
| OpenAI API               | Conversational AI synthesis  | `POST https://api.openai.com/v1/...`  | Bearer Token (Header) | ✅ IMPLEMENTED (Active)  |
| OpenStreetMap (OSM)      | Map base layer tiles         | `https://{s}.tile.openstreetmap.org`  | Open / Public         | ✅ IMPLEMENTED (Active)  |
| Web Speech API (STT/TTS) | Voice transcription & speech | Native Browser Web Speech Engine      | Browser Permissions   | ✅ IMPLEMENTED (Active)  |
| IMD Official APIs        | National weather observations| Architecture adapter configured       | MoES / IMD API Key    | 🟡 CONFIGURED / INACTIVE|
| Doppler Radar (DWR) Feed | Live Indian radar mosaics    | Server-side secure tile proxy ready   | Authorized Gov Gateway| 🔵 ARCHITECTURE READY   |
| INSAT-3D / 3DR Satellite | Multispectral satellite feeds| Server-side secure tile proxy ready   | MOSDAC / ISRO Gateway | 🔵 ARCHITECTURE READY   |
| NWP Models (GFS / WRF)   | Raw gridded numerical forecast| Parser architecture ready             | Open Data / S3 FTP    | 🟠 PLANNED              |
| Bhashini Translation API | Indic NLP & Voice pipeline   | National Language Mission hooks       | Bhashini API Key      | 🟠 PLANNED              |
+--------------------------+------------------------------+---------------------------------------+-----------------------+-------------------------+
```

---

## 14. IMD INTEGRATION ARCHITECTURE

WeatherGPT includes a dedicated, schema-compliant `IMDProvider` module designed to ingest official India Meteorological Department feeds when authorized credentials are provided.

```
+-----------------------------------+---------------------------------------------------+------------------------------------------+--------------------------+
| IMD Service Module                | Operational Function                              | WeatherGPT Backend Target Module         | Implementation Status    |
+-----------------------------------+---------------------------------------------------+------------------------------------------+--------------------------+
| City Weather Forecast             | 7-day official city bulletins                     | `app/providers/imd_provider.py`          | 🟡 CONFIGURED / INACTIVE |
| District-Level Nowcast (0-3h)     | High-frequency severe weather nowcasts            | `app/services/nowcast_service.py`        | 🟡 CONFIGURED / INACTIVE |
| District Warning Bulletins        | Color-coded warnings (Red/Orange/Yellow/Green)    | `app/services/warning_service.py`        | 🟡 CONFIGURED / INACTIVE |
| Automatic Weather Station (AWS)   | High-density automated surface observations       | `app/providers/imd_provider.py`          | 🔵 ARCHITECTURE READY    |
| Doppler Weather Radar (DWR) Mosaics| 10cm / 3cm reflectivity and radial velocity maps | `app/providers/radar_provider.py`        | 🔵 ARCHITECTURE READY    |
| INSAT-3D/3DR Satellite Feeds      | Visible, Thermal Infrared, Water Vapor imagery    | `app/providers/satellite_provider.py`    | 🔵 ARCHITECTURE READY    |
| Cyclone Bulletins & Storm Tracks  | Cyclone track predictions & cone of uncertainty   | `app/services/severe_weather_service.py` | 🔵 ARCHITECTURE READY    |
| Agromet Advisory Services (AAS)   | District agricultural weather bulletins           | `app/services/advisory_service.py`       | 🔵 ARCHITECTURE READY    |
+-----------------------------------+---------------------------------------------------+------------------------------------------+--------------------------+
```

---

## 15. WEATHER PROVIDER ARCHITECTURE

To ensure high fault-tolerance, WeatherGPT implements the **Provider Factory Pattern**. The application interacts with an abstract interface (`BaseWeatherProvider`), allowing dynamic provider switching and automated fallbacks.

```
                  ┌────────────────────────────────┐
                  │      BaseWeatherProvider       │
                  │   (Abstract Base Class - ABC)  │
                  └────────────────────────────────┘
                                  ▲
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│OpenWeatherMapProvider│ │     IMDProvider      │ │    MockTestProvider  │
│(Active Fallback Feed)│ │ (Configured Adapter) │ │ (Unit / E2E Testing) │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

### Key Provider Capabilities
- **Normalization**: Translates vendor-specific JSON fields into unified Pydantic domain models (`WeatherResponse`, `ForecastResponse`).
- **Resilience & Timeout Handling**: Async HTTP requests executed with a strict 10.0-second timeout.
- **Circuit-Breaker Fallback**: If the primary provider fails or returns a 5xx error, the factory automatically routes requests to secondary providers or serves cached observations.
- **Provider Health Diagnostics**: Real-time status tracker accessible via `GET /api/v1/weather/providers`.

---

## 16. DOPPLER RADAR ARCHITECTURE

Doppler Weather Radars (DWR) provide critical observation of precipitation intensity, thunderstorm cell movements, and cyclonic vortices.

```
[ Leaflet Client (Map View) ]
              │
              ▼ (Requests tile: /api/v1/weather/radar/tiles/{product}/{z}/{x}/{y})
[ Nginx Reverse Proxy ]
              │
              ▼
[ FastAPI Server-Side Tile Proxy (`proxy_radar_tile`) ]
              │
              ├──> 1. Host Validation (SSRF Defense: Whitelist check)
              ├──> 2. Status Check: Is Radar Live / Configured?
              │         ├─ NO  ──> Returns 1x1 Transparent PNG with Header `X-Provider-Status: NOT_CONFIGURED`
              │         └─ YES ──> Fetches binary tile from upstream radar server
              │
              └──> 3. Response Caching (HTTP `Cache-Control: public, max-age=600`)
```

- **Current Status**: 🔵 **ARCHITECTURE READY**. The proxy pipeline, product catalog (`reflectivity`, `precipitation_intensity`, `precipitation_accumulation`), layer metadata endpoint (`GET /api/v1/weather/radar/layer`), and SSRF security whitelists are fully implemented and verified via automated tests (`test_radar_satellite.py`). Live authorized radar data feeds will activate upon deployment of government radar access keys.

---

## 17. SATELLITE ARCHITECTURE

Geostationary meteorological satellites (INSAT-3D, INSAT-3DR, INSAT-3DS) provide continental cloud imagery, thermal radiance profiles, and atmospheric water vapor distribution.

- **Endpoints Implemented**:
  - `GET /api/v1/weather/satellite/status`
  - `GET /api/v1/weather/satellite/products` (`visible`, `infrared_tir1`, `water_vapour`, `cloud_motion_vectors`)
  - `GET /api/v1/weather/satellite/layer` (Returns Leaflet bounds, opacity, and tile URLs)
  - `GET /api/v1/weather/satellite/tiles/{product}/{z}/{x}/{y}` (Secure tile proxy)
  - `GET /api/v1/weather/satellite/image` (Full-mosaic composite frame proxy)
- **Current Status**: 🔵 **ARCHITECTURE READY**. Fully tested via `test_radar_satellite.py`.

---

## 18. NWP / NUMERICAL WEATHER PREDICTION ARCHITECTURE

Numerical Weather Prediction (NWP) executes mathematical simulations of atmospheric physics on supercomputing clusters (e.g., Global Forecast System - GFS, Weather Research and Forecasting - WRF, NCUM).

- **Future Architecture Design**:
  - GRIB2 binary data ingestion workers using `xarray` and `cfgrib`.
  - Regional downscaling pipeline for high-resolution 1km x 1km localized terrain forecasting.
  - Ensemble probability curves for cyclone track uncertainty cones.
- **Current Status**: 🟠 **PLANNED** for Phase 3 development.

---

## 19. ALERT AND WARNING ENGINE

The WeatherGPT Alert Engine ingests, classifies, deduplicates, and broadcasts severe weather hazards across Indian districts.

```
+-----------------------------------------------------------------------------------------------+
|                                      WARNING SEVERITY HIERARCHY                               |
+-----------------------------------------------------------------------------------------------+
|  Severity Level  | Warning Color | Definition & Criteria                                      |
+-----------------------------------------------------------------------------------------------+
|  EXTREME         | RED           | Severe Cyclone, Extreme Rain (>204.4mm), Severe Heatwave    |
|  SEVERE          | ORANGE        | Very Heavy Rain (115.6–204.4mm), Severe Thunderstorm, Gale|
|  MODERATE        | YELLOW        | Heavy Rain (64.5–115.5mm), Thunderstorm with Lightning     |
|  MINOR           | GREEN         | Normal Weather / No Hazardous Conditions Expected          |
+-----------------------------------------------------------------------------------------------+
```

### Warning Lifecycle & Deduplication
1. **Ingestion & Ranking**: Ingested warnings are assigned a numerical rank (`EXTREME=4, SEVERE=3, MODERATE=2, MINOR=1`).
2. **Deduplication**: Hash-based deduplication (`alert_id` index in MongoDB `alerts` and `official_warnings`) ensures duplicate notifications are never dispatched.
3. **Expiration Watcher**: `AlertMonitor` periodically audits active records; expired warnings have `is_active` set to `False` and trigger an `ALERT_EXPIRED` event over WebSockets.

---

## 20. REAL-TIME WEBSOCKET ARCHITECTURE

For instant hazard dissemination, WeatherGPT provides a dedicated full-duplex WebSocket channel at `ws://localhost:8000/api/v1/ws/alerts`.

```
[ Frontend Client (React) ]
             │
             ├──> Connects to: /api/v1/ws/alerts?token=JWT_TOKEN (or user_id)
             │
[ WebSocket Connection Manager (FastAPI) ]
             │
             ├──> Authenticates Token / Registers Client into Connection Pool
             ├──> Client sends: {"type": "subscribe", "locations": ["Kanpur", "Mumbai"]}
             │
             ▼
[ Background Alert Monitor Worker ]
             │
             ├──> Polls active warnings every 300 seconds
             ├──> Detects new or updated hazard in "Kanpur"
             │
             ▼
[ WebSocket Broadcast Dispatcher ]
             │
             └──> Pushes JSON payload strictly to clients subscribed to "Kanpur":
                  {
                    "type": "NEW_ALERT",
                    "data": { "alert_id": "ALT-101", "severity": "SEVERE", "title": "Heavy Rain Alert" }
                  }
```

- **Connection Resilience**: Supports heartbeat `ping`/`pong` messages, automatic reconnection with exponential backoff, and connection quota enforcement (`MAX_WS_CONNECTIONS = 100`).

---

## 21. CLIMATE ANALYTICS

The Climate Analytics module processes longitudinal meteorological records to identify climatic anomalies, temperature trends, and precipitation shifts.

```
+------------------------------------+----------------------------------------------------------------------------------------+
| Climate Analytics Metric           | Computational Formula / Methodology                                                    |
+------------------------------------+----------------------------------------------------------------------------------------+
| Linear Trend Slope                 | $m = \frac{N \sum(xy) - \sum x \sum y}{N \sum(x^2) - (\sum x)^2}$ (°C / Day or Month)  |
| Baseline Z-Score Anomaly           | $Z = \frac{X_i - \mu}{\sigma}$ (Detects standard deviations from 30-day baseline)       |
| Anomaly Classification             | Normal: $|Z| < 1.0$ \| Moderate: $1.0 \le |Z| < 2.0$ \| Significant: $|Z| \ge 2.0$     |
| Equivalent Period Comparison       | Compares current period against immediately preceding identical time window            |
| Grounded Natural Language Insights | Formats calculated statistical metrics into non-hallucinatory explanatory summaries    |
+------------------------------------+----------------------------------------------------------------------------------------+
```

---

## 22. MULTILINGUAL SUPPORT

Linguistic accessibility is paramount for nationwide adoption across India's multilingual population.

```
[ Input Message ] ──> [ Language Detection Engine (`LanguageService`) ]
                             │
                             ├─ Contains Devanagari Characters (Unicode 0x0900-0x097F) ──> `hi` (Hindi)
                             ├─ Romanized Hindi Keywords ("kaisa", "hogi", "baarish")  ──> `hi` (Hinglish)
                             └─ Default Character Set                                  ──> `en` (English)
```

- **Numerical Preservation**: Temperature values, precipitation percentages, and warning severity codes remain invariant across translations to prevent distortion of factual weather metrics.
- **Language Settings**: Endpoints `GET /api/v1/settings/languages` and `POST /api/v1/settings/language` allow users to select preferred languages.

---

## 23. VOICE ARCHITECTURE

WeatherGPT incorporates bidirectional voice communication using the browser-native **Web Speech API** (`webkitSpeechRecognition` / `SpeechRecognition` and `window.speechSynthesis`).

```
  [ User Speaks ]
        │
        ▼
  [ Speech-to-Text (STT) ]  --> Browser Web Speech Recognition
        │
        ▼
  [ Transcribed Text ]      --> Dispatched to POST /api/v1/chat
        │
        ▼
  [ WeatherGPT Engine ]     --> Fact Grounding + Response Generation
        │
        ▼
  [ Response Text ]
        │
        ▼
  [ Text-to-Speech (TTS) ]  --> Browser SpeechSynthesis (Selected Hindi / Indian English Voice)
        │
        ▼
  [ Audio Output to User ]
```

- **Privacy Compliance**: Audio processing is executed locally within the client browser session; no raw audio recordings are stored on backend servers.

---

## 24. FRONTEND ARCHITECTURE

The frontend is built using **React 18** and **Vite 6** styled with **Tailwind CSS 3.4**, emphasizing responsive UI, dark/light themes, and glassmorphism styling.

```
weathergpt-frontend/src/
├── App.jsx                       # Master Router, Toast notifications, Theme provider
├── main.jsx                      # React DOM root mounting
├── index.css                     # Tailwind design system, gradients, custom animations
├── components/
│   ├── layout/                   # Navbar, Sidebar, Footer, Header
│   ├── dashboard/                # WeatherMetricsGrid, HourlyForecast, DailyForecast, AQICard
│   ├── chat/                     # ChatWindow, MessageList, ChatInput, QuickPrompts
│   ├── map/                      # WeatherMap, LayerControls, RadarOverlay, SatelliteOverlay
│   ├── alerts/                   # AlertBanner, AlertCard, AlertSubscribeModal
│   ├── climate/                  # ClimateSummaryCards, TemperatureChart, RainfallChart, AnomalyTable
│   ├── auth/                     # LoginModal, RegisterModal, UserProfileDrawer
│   ├── common/                   # LoadingSpinner, ErrorBoundary, SourceBadge, Modal
│   ├── LanguageSelector.jsx      # Language dropdown switcher
│   ├── VoiceInput.jsx            # Microphone speech recognition button
│   └── VoiceOutput.jsx           # Text-to-speech speaker button
├── context/
│   ├── AuthContext.jsx           # JWT token state, login, logout, user profile
│   ├── WeatherContext.jsx        # Current weather, active city, unit toggle (°C/°F)
│   ├── AlertContext.jsx          # WebSocket alert stream, unread notification count
│   └── LanguageContext.jsx       # Selected language code and string dictionary
├── pages/
│   ├── Dashboard.jsx             # Main meteorological dashboard
│   ├── Assistant.jsx             # Dedicated AI conversational interface
│   ├── WeatherMapPage.jsx        # Fullscreen interactive geospatial map
│   ├── Alerts.jsx                # Active disaster warnings, history, and subscriptions
│   ├── ClimateAnalytics.jsx      # Historical graphs, anomalies, and period comparison
│   └── Settings.jsx              # User preferences, saved locations, API diagnostics
└── services/
    ├── api.js                    # Axios / Fetch client with JWT interceptor
    └── websocket.js              # WebSocket client with auto-reconnection
```

---

## 25. BACKEND ARCHITECTURE

The backend is built on **Python 3.13** and **FastAPI 0.115**, following clean architectural layering:

```
weathergpt-backend/
├── app/
│   ├── main.py                   # FastAPI app instance, middleware stack, lifespan events
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings (Environment configuration)
│   │   ├── logging.py            # Structured request logger with execution timings
│   │   ├── security.py           # JWT creation, Bcrypt password hashing, token validation
│   │   ├── middleware.py         # SecurityHeaders, CorrelationID, RateLimiter
│   │   └── exceptions.py         # Custom domain exception classes
│   ├── api/
│   │   ├── deps.py               # Dependency injection (DB, Services, Auth user/admin)
│   │   ├── router.py             # Root API v1 router aggregator
│   │   └── routes/               # Route controllers (13 modular route files)
│   ├── schemas/                  # Pydantic v2 data contracts and validation models
│   ├── services/                 # Business logic and domain service implementations
│   ├── providers/                # External weather provider drivers (ABC, OpenWeather, IMD)
│   ├── db/                       # Database connections and repositories (Motor MongoDB)
│   └── utils/                    # Unit conversion, geocoding validators, math helpers
├── tests/                        # 25 test modules containing 96 automated test cases
├── requirements.txt              # Production Python package dependencies
├── pytest.ini                    # Pytest configuration settings
└── Dockerfile                    # Containerization build specification
```

---

## 26. COMPLETE API SPECIFICATION

All endpoints are prefixed with `/api/v1` (except root and health probes).

### 1. Root & Health Probes
- `GET /` : Returns API name, version, and environment metadata.
- `GET /health` : Returns system health status (`"healthy"`).
- `GET /health/ready` : Readiness probe verifying MongoDB and provider connectivity.
- `GET /health/live` : Liveness probe for Kubernetes / container orchestration.

### 2. Authentication & User Management
- `POST /api/v1/auth/register` : Create new user account.
- `POST /api/v1/auth/login` : Authenticate user credentials and return JWT bearer token.
- `GET /api/v1/auth/me` : Retrieve profile of currently authenticated user.
- `PUT /api/v1/auth/preferences` : Update user unit (`celsius`/`fahrenheit`), language, and theme.

### 3. Core Weather & Forecasts
- `GET /api/v1/weather?city={city}&lat={lat}&lon={lon}&units={units}` : Get normalized current weather telemetry.
- `GET /api/v1/forecast?city={city}&days=5` : Get 5-day daily and 3-hour interval forecast.
- `GET /api/v1/weather/history` : Get user's past weather inquiries.
- `GET /api/v1/weather/history/popular` : Retrieve top trending searched cities.
- `DELETE /api/v1/weather/history` : Clear weather search history.

### 4. Advanced Weather Intelligence & Warnings
- `GET /api/v1/weather/advanced?city={city}` : Unified bundle (Current + Forecast + Warnings + Nowcast + Severe Risks + Advisories).
- `GET /api/v1/weather/nowcast?city={city}` : 0 to 3 hour short-term nowcast.
- `GET /api/v1/weather/warnings?city={city}` : Official ranked meteorological warnings.
- `GET /api/v1/weather/severe?city={city}` : Empirical severe weather risk evaluation.
- `GET /api/v1/weather/advisory?city={city}` : Actionable safety and outdoor precautions.
- `GET /api/v1/weather/source?city={city}` : Source provenance, data timestamp, and confidence rating.
- `GET /api/v1/weather/providers` : Real-time status of all configured meteorological providers.
- `POST /api/v1/weather/admin/diagnostics` : Trigger deep provider diagnostic scan (Admin role required).

### 5. Radar & Satellite Imagery Proxy
- `GET /api/v1/weather/radar/status` : Doppler radar operational status.
- `GET /api/v1/weather/radar/products` : List available Doppler radar products.
- `GET /api/v1/weather/radar/layer` : Leaflet radar layer definition, bounds, and tile template.
- `GET /api/v1/weather/radar/tiles/{product}/{z}/{x}/{y}` : SSRF-protected Doppler radar tile proxy.
- `GET /api/v1/weather/radar/image` : Composite Doppler radar mosaic image proxy.
- `GET /api/v1/weather/satellite/status` : INSAT satellite feed operational status.
- `GET /api/v1/weather/satellite/products` : List available satellite multispectral channels.
- `GET /api/v1/weather/satellite/layer` : Leaflet satellite layer definition and bounds.
- `GET /api/v1/weather/satellite/tiles/{product}/{z}/{x}/{y}` : SSRF-protected INSAT satellite tile proxy.
- `GET /api/v1/weather/satellite/image` : Full-disk / sectoral satellite image proxy.

### 6. Climate Analytics
- `GET /api/v1/climate/summary?city={city}&range_key=last_30_days` : Historical summary metrics.
- `GET /api/v1/climate/temperature?city={city}` : Daily temperature series and linear regression slope.
- `GET /api/v1/climate/rainfall?city={city}` : Daily rainfall, cumulative totals, and rainy days.
- `GET /api/v1/climate/humidity?city={city}` : Daily relative humidity series.
- `GET /api/v1/climate/anomalies?city={city}` : Statistical Z-score climate anomalies.
- `GET /api/v1/climate/comparison?city={city}` : Compares current time window with preceding historical period.
- `POST /api/v1/climate/insights` : Generates grounded natural-language explanations of climate metrics.

### 7. Locations & Geocoding
- `GET /api/v1/locations/search?q={query}&limit=5` : Forward geocoding city lookup.
- `GET /api/v1/locations/saved` : Retrieve user's bookmarked locations.
- `POST /api/v1/locations/saved` : Bookmark new favorite location.
- `DELETE /api/v1/locations/saved/{location_id}` : Delete location bookmark.

### 8. Conversational AI Assistant
- `POST /api/v1/chat` : Process conversational query with grounded weather context.
- `GET /api/v1/chat/history?session_id={session_id}` : Fetch multi-turn conversation messages.
- `GET /api/v1/chat/sessions` : List distinct chat sessions.
- `DELETE /api/v1/chat/history?session_id={session_id}` : Clear chat session history.

### 9. Disaster Alerts & Notifications
- `GET /api/v1/alerts?city={city}` : Query active disaster alerts.
- `GET /api/v1/alerts/active` : List all active alerts nationwide.
- `GET /api/v1/alerts/history` : Audit past resolved alerts.
- `GET /api/v1/alerts/subscriptions` : List user's alert notification subscriptions.
- `POST /api/v1/alerts/subscriptions` : Subscribe to district-level alert notifications.
- `DELETE /api/v1/alerts/subscriptions/{subscription_id}` : Unsubscribe from district alerts.
- `GET /api/v1/alerts/{alert_id}` : Get detailed information for a specific alert.
- `GET /api/v1/notifications` : List in-app user notifications.
- `GET /api/v1/notifications/unread-count` : Get count of unread alert notifications.
- `PATCH /api/v1/notifications/{notification_id}/read` : Mark single notification as read.
- `POST /api/v1/notifications/mark-all-read` : Mark all user notifications as read.
- `DELETE /api/v1/notifications/{notification_id}` : Delete notification record.

### 10. Language Settings & WebSockets
- `GET /api/v1/settings/languages` : List supported application languages.
- `GET /api/v1/settings/language` : Get active user language preference.
- `POST /api/v1/settings/language` : Update active user language preference.
- `WebSocket /api/v1/ws/alerts` : Full-duplex real-time disaster warning push stream.

---

## 27. DATABASE DESIGN (MONGODB)

WeatherGPT utilizes MongoDB 7.0 (managed asynchronously via Motor) across 13 optimized collections:

```
+--------------------------+----------------------------------------------------+---------------------------------------------------------------+
| Collection Name          | Primary Functional Purpose                         | Key Configured Database Indexes                               |
+--------------------------+----------------------------------------------------+---------------------------------------------------------------+
| `users`                  | User credentials, roles, preferences               | `email` (unique), `username` (unique), `created_at`           |
| `chat_history`           | Multi-turn conversation messages                   | `session_id`, `user_id`, `created_at` (descending)            |
| `locations`              | Bookmarked favorite locations                      | `user_id`, `coordinates` (2dsphere geospatial), `name`       |
| `weather_history`        | Ingestion audit & search telemetry logs            | `city`, `user_id`, `session_id`, `created_at`                 |
| `notifications`          | In-app user notifications                          | `user_id`, `is_read`, `created_at`                            |
| `alerts`                 | Real-time ingested disaster alerts                 | `alert_id` (unique), `is_active`, `location.name`, `severity` |
| `alert_subscriptions`    | User geographic alert subscriptions                | `user_id`, `location.city`, `enabled`                         |
| `notification_history`   | Push notification deduplication records            | `(alert_id, user_id, type)` (compound), `sent_at`             |
| `climate_history`        | Long-term historical climate observations          | `(location.name, date)` (unique), `(lat, lon, date)`          |
| `official_warnings`      | Authoritative government warning records           | `alert_id` (unique), `location.name`, `severity`, `issued_at` |
| `weather_forecasts`      | Cached daily & hourly forecast documents           | `location.name`, `forecast_time`, `source`                    |
| `weather_advisories`     | Generated safety & sector advisories               | `location.name`, `risk_type`, `severity`, `created_at`        |
| `provider_status`        | Continuous provider uptime & latency health logs   | `provider_name`, `last_checked`                               |
+--------------------------+----------------------------------------------------+---------------------------------------------------------------+
```

---

## 28. AUTHENTICATION & AUTHORIZATION

- **Token Standard**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Password Security**: Passwords hashed using `bcrypt` with automated salt generation.
- **Token Lifespan**: Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` (Default: 1440 minutes / 24 hours).
- **Role-Based Access Control (RBAC)**:
  - `USER`: Standard access to weather telemetry, forecasts, AI chat, bookmarks, and subscriptions.
  - `ADMIN`: Full user privileges plus access to `POST /api/v1/weather/admin/diagnostics` and system telemetry audits.

---

## 29. SECURITY ARCHITECTURE

```
+------------------------------------+----------------------------------------------------------------------------------------+
| Security Dimension                 | Technical Implementation & Enforcement Strategy                                        |
+------------------------------------+----------------------------------------------------------------------------------------+
| Secret Management                  | `.env` file configuration; no hardcoded API keys; `.gitignore` blocks secret leakage.  |
| SSRF Defense                       | Strict whitelist check (`ALLOWED_TILE_PROXY_HOSTS`) on radar/satellite proxy routes.   |
| In-Memory Rate Limiting            | Middleware limits: Login (5/min), Register (5/min), Chat (30/min), Weather (60/min).   |
| OWASP Security Headers             | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1`.     |
| Request Traceability               | Automated `X-Request-ID` correlation ID generation and propagation across logs.        |
| Input Validation                   | Strict Pydantic v2 type enforcement on all HTTP payloads and URL parameters.           |
| Cross-Origin Resource Sharing      | Strict origin whitelist (`settings.CORS_ORIGINS`) prevents unauthorized web clients.  |
| AI Prompt Injection Defense        | System prompts strictly separate user input from control instructions.                 |
+------------------------------------+----------------------------------------------------------------------------------------+
```

---

## 30. PERFORMANCE & SCALABILITY

- **Async Non-Blocking Core**: Built on Python `asyncio` and FastAPI, handling concurrent HTTP and WebSocket connections efficiently.
- **In-Memory Caching**: 300-second TTL cache for weather telemetry eliminates redundant external API calls.
- **Geospatial & Compound Indexing**: MongoDB collections indexed for sub-millisecond query lookups.
- **Horizontal Scalability**: Stateless backend design allows horizontal scaling behind Nginx load balancers.

---

## 31. ERROR HANDLING & RESILIENCE

WeatherGPT enforces graceful degradation across all failure scenarios:

```
+--------------------------+---------------------------------------------------+---------------------------------------------------+
| Failure Condition        | System Detection & Internal Behavior              | User Experience / Frontend Presentation           |
+--------------------------+---------------------------------------------------+---------------------------------------------------+
| External Weather 5xx/Down| HTTP timeout / exception caught in ProviderFactory| Falls back to cached data or secondary provider.  |
| OpenAI LLM Service Down  | HTTP 429/5xx caught in `LLMService`               | Triggers deterministic NLG rule engine instantly. |
| MongoDB Unavailable      | Handled via optional connection fallback          | Read-only operations proceed; warns user on write.|
| WebSocket Disconnect     | Client detects socket closure                     | Exponential backoff reconnects automatically.     |
| Invalid City Name        | Geocoding returns 0 matching results              | Returns structured HTTP 404 with helpful message. |
+--------------------------+---------------------------------------------------+---------------------------------------------------+
```

---

## 32. DEPLOYMENT ARCHITECTURE

WeatherGPT is containerized using **Docker** and orchestrated with **Docker Compose**:

```
[ Host Port 80 / 443 ]
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ container: weathergpt-proxy (Nginx 1.25 Alpine)        │
│  - /api/v1  ──> Routes to Backend Container (Port 8000)│
│  - /ws      ──> Upgrades to WebSocket                  │
│  - /        ──> Serves Compiled Vite React Assets      │
└────────────────────────────────────────────────────────┘
         │
         ├────────────────────────────────────────┐
         ▼                                        ▼
┌────────────────────────────────┐       ┌────────────────────────────────┐
│ container: weathergpt-backend  │       │ container: weathergpt-frontend │
│ (Python 3.13 FastAPI Service)  │       │ (Static Nginx / React Build)   │
└────────────────────────────────┘       └────────────────────────────────┘
         │
         ▼ (Isolated Docker Bridge: weathergpt-internal)
┌────────────────────────────────┐
│ container: weathergpt-mongodb  │
│ (MongoDB 7.0 Engine & Storage) │
└────────────────────────────────┘
```

---

## 33. TESTING & VERIFICATION

The codebase contains a comprehensive automated test suite executed via `pytest`.

```
============================= test session starts =============================
platform win32 -- Python 3.13.2, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\Asus\Desktop\mini-projctct-kit\weathergpt\weathergpt-backend
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.15.1, asyncio-1.4.0
collected 96 items

tests\test_advanced_weather_endpoints.py .......                         [  7%]
tests\test_advisory.py ..                                                [  9%]
tests\test_alerts.py ........                                            [ 17%]
tests\test_auth_roles.py ..                                              [ 19%]
tests\test_chat.py ..........                                            [ 30%]
tests\test_climate.py .........                                          [ 39%]
tests\test_forecast.py .                                                 [ 40%]
tests\test_health.py ..                                                  [ 42%]
tests\test_health_readiness.py ..                                        [ 44%]
tests\test_imd_provider.py ...                                           [ 47%]
tests\test_language.py ........                                          [ 56%]
tests\test_locations.py ..                                               [ 58%]
tests\test_mongo.py .....                                                [ 63%]
tests\test_multilingual_chat.py ...                                      [ 66%]
tests\test_notification_service.py ...                                   [ 69%]
tests\test_nowcast.py ..                                                 [ 71%]
tests\test_provider_factory.py ...                                       [ 75%]
tests\test_radar_satellite.py .........                                  [ 84%]
tests\test_rate_limiter.py .                                             [ 85%]
tests\test_security_headers.py ..                                        [ 87%]
tests\test_severe_weather.py ..                                          [ 89%]
tests\test_warning_service.py ..                                         [ 91%]
tests\test_weather.py ....                                               [ 95%]
tests\test_websocket.py ....                                             [100%]

======================= 96 passed, 4 warnings in 42.21s =======================
```

---

## 34. CURRENT IMPLEMENTATION STATUS MATRIX

```
+------------------------------------+-----------------------+---------------------------------------+---------------------------------------------------------+
| Module / Capability                | Status                | Evidence File / Location              | Technical Notes                                         |
+------------------------------------+-----------------------+---------------------------------------+---------------------------------------------------------+
| Current Weather Telemetry          | ✅ IMPLEMENTED        | `app/api/routes/weather.py`           | Live OpenWeatherMap integration with normalized schema  |
| 5-Day Forecast Aggregation         | ✅ IMPLEMENTED        | `app/api/routes/forecast.py`          | Daily & 3-hour forecast processing                      |
| Grounded AI Assistant (LLM)        | ✅ IMPLEMENTED        | `app/services/llm_service.py`         | OpenAI GPT-4o-mini integration with fact grounding      |
| Deterministic NLG Fallback         | ✅ IMPLEMENTED        | `app/services/llm_service.py`         | Rule-based NLG responses when LLM key is omitted        |
| Short-Term Nowcast (0-3h)          | ✅ IMPLEMENTED        | `app/services/nowcast_service.py`     | Trend-based convective and precipitation nowcasting     |
| Official Warnings Engine           | ✅ IMPLEMENTED        | `app/services/warning_service.py`     | Severity ranking, color-coding, and deduplication       |
| Severe Weather Risk Signals        | ✅ IMPLEMENTED        | `app/services/severe_weather_service.py`| Heatwave, heavy rain, and storm risk algorithms       |
| Actionable Safety Advisories       | ✅ IMPLEMENTED        | `app/services/advisory_service.py`    | Sector-specific safety recommendations                  |
| Climate Analytics & Anomalies      | ✅ IMPLEMENTED        | `app/services/climate_service.py`     | Z-score anomalies, regression slopes, period comparison |
| Real-Time WebSocket Alerts         | ✅ IMPLEMENTED        | `app/services/websocket_manager.py`   | Topic-based push notification server                    |
| Motor MongoDB Async Persistence    | ✅ IMPLEMENTED        | `app/db/mongodb.py`                   | 13 collections with verified geospatial/unique indexes  |
| JWT Authentication & RBAC          | ✅ IMPLEMENTED        | `app/api/routes/auth.py`              | USER / ADMIN roles with bcrypt password hashing         |
| Saved Locations (2dsphere)         | ✅ IMPLEMENTED        | `app/api/routes/locations.py`         | Geospatial favorite location bookmarks                  |
| Voice Input & Speech Synthesis     | ✅ IMPLEMENTED        | `src/components/VoiceInput.jsx`       | Browser-native Web Speech STT and TTS                   |
| Multilingual Engine (Hindi/English)| ✅ IMPLEMENTED        | `app/services/language_service.py`    | Automatic Devanagari / Latin script detection           |
| SSRF-Protected Proxy Gateway       | ✅ IMPLEMENTED        | `app/api/routes/radar_satellite.py`   | Secure tile proxy with strict hostname whitelist        |
| Docker & Docker Compose            | ✅ IMPLEMENTED        | `docker-compose.yml`                  | 4-service production containerization stack              |
| Automated Test Suite (96 Tests)    | ✅ IMPLEMENTED        | `tests/`                              | 100% passing test suite across all subsystems           |
| Official IMD API Adapter           | 🟡 CONFIGURED/INACTIVE| `app/providers/imd_provider.py`       | Adapter code ready; awaiting government API credentials |
| Doppler Weather Radar (DWR) Feed   | 🔵 ARCHITECTURE READY | `app/providers/radar_provider.py`     | Proxy and layers ready; awaiting authorized radar stream|
| INSAT-3D Satellite Telemetry       | 🔵 ARCHITECTURE READY | `app/providers/satellite_provider.py` | Multispectral layer ready; awaiting MOSDAC live stream   |
| Numerical Weather Prediction (NWP) | 🟠 PLANNED             | `app/providers/nwp_provider.py`       | GRIB2 parser and WRF downscaling roadmap                |
| Bhashini Indic Language Platform   | 🟠 PLANNED             | `app/services/language_service.py`    | Scheduled for national language expansion               |
+------------------------------------+-----------------------+---------------------------------------+---------------------------------------------------------+
```

---

## 35. CURRENT LIMITATIONS

1. **Official IMD Production Credentials**: Direct live IMD API ingestion requires authorized MoES credentials; the platform currently operates with OpenWeatherMap as its active primary provider while the IMD adapter is configured and ready.
2. **Live Doppler Radar & Satellite Feeds**: Radar and INSAT layer proxies return empty/transparent tiles when upstream government feeds are unconfigured, ensuring no mock data is misrepresented as official.
3. **Historical Climate Depth**: Long-term historical trends depend on records accumulated in MongoDB or external provider availability.
4. **Voice Browser Compatibility**: Voice input relies on browser Web Speech API support (Chrome, Edge, Safari).

---

## 36. FUTURE ROADMAP

- **Phase 1 (Completed)**: MVP with real-time weather, 5-day forecasts, grounded AI assistant, MongoDB persistence, and Docker containerization.
- **Phase 2 (Completed)**: Advanced meteorological intelligence (Nowcasting, Official Warnings, Severe Risks, Climate Analytics, WebSockets, SSRF Tile Proxies, Multilingual, Voice).
- **Phase 3 (Next Phase)**: Official IMD API credential provisioning, live Doppler radar mosaic feeds, and INSAT-3D satellite imagery integration.
- **Phase 4**: Ingestion of raw GRIB2 Numerical Weather Prediction (WRF/GFS) model runs for 1km localized downscaling.
- **Phase 5**: Full Bhashini integration supporting all 22 scheduled Indian languages with voice-in/voice-out mobile apps.

---

## 37. INNOVATION & NOVELTY

1. **Grounded Meteorological AI**: Combines LLMs with strict factual grounding, ensuring zero hallucination of atmospheric metrics.
2. **Deterministic Fallback Safety Net**: Retains 100% conversational intelligence during AI API downtime via pre-compiled rule-based NLG engines.
3. **Unified Disaster Dissemination**: Merges numerical observations, color-coded warnings, nowcasts, and radar overlays into a single conversational viewport.
4. **Dual Modality Access**: Eliminates literacy barriers through bidirectional voice interaction in Hindi and English.
5. **Zero-Trust Source Attribution**: Every response includes an unalterable provenance stamp indicating data source, issue time, and confidence.

---

## 38. DIFFERENTIATION MATRIX

```
+------------------------------------+------------------------------------+------------------------------------+
| Evaluation Parameter               | Standard Commercial Weather Apps   | WeatherGPT Platform                |
+------------------------------------+------------------------------------+------------------------------------+
| Interaction Interface              | Static dashboards and tables       | Natural language conversational AI |
| Natural Language Understanding     | None / Keyword search only         | Multi-turn conversational context  |
| Disaster Warning Prioritization    | Low / Hidden in sub-menus          | Top priority banners + WS Push     |
| Actionable Decision Support        | Generic metric displays only       | Sector-specific safety advisories  |
| Source Provenance Transparency     | Often opaque                       | Explicit provider & timestamp stamp|
| Linguistic Inclusivity             | Fixed system language              | Auto-detection of Hindi / English  |
| Voice Interaction Capability       | Rare / Unidirectional              | Full bidirectional voice dialogue  |
| Hallucination Defense              | Not applicable (No LLM)            | Fact-grounded prompt boundaries    |
+------------------------------------+------------------------------------+------------------------------------+
```

---

## 39. USE CASE SCENARIOS

### Scenario 1: Smallholder Farmer in Uttar Pradesh
- **User Query**: *"Should I spray insecticide on my paddy field in Kanpur today?"*
- **Processing**: Resolves Kanpur coordinates -> Retrieves current humidity (85%) and 3-hour rain probability (75%) -> Advisory engine generates warning.
- **Output**: *"Insecticide spraying in Kanpur is NOT advised today. There is a 75% probability of thunderstorms this afternoon, which will wash away chemical applications. Reschedule for Friday when clear skies are expected."*

### Scenario 2: District Disaster Management Authority (DDMA)
- **User Query**: *"Show all active severe weather warnings across Coastal Odisha."*
- **Processing**: Queries `official_warnings` collection for Odisha coastal districts -> Sorts by severity level.
- **Output**: Returns prioritized list highlighting Orange Warning for Heavy Rainfall in Puri and Jagatsinghpur with valid timestamps and recommended safety actions.

---

## 40. SAMPLE CONVERSATIONS

### English Conversation
> **User**: "Is it going to rain in New Delhi tomorrow afternoon?"  
> **WeatherGPT**: "Yes. In New Delhi tomorrow afternoon (2:00 PM – 5:00 PM), there is a 65% probability of moderate rain with convective cloud cover. Temperatures will reach a high of 32°C. Keep an umbrella handy."  
> *(Source: OpenWeatherMap | Confidence: High | Updated: Just now)*

### Hindi Conversation
> **User**: "क्या आज शाम कानपुर में आंधी या बारिश होगी?"  
> **WeatherGPT**: "हाँ, कानपुर में आज शाम 4:00 बजे से 7:00 बजे के बीच 70% बारिश और गरज के साथ छींटे पड़ने की संभावना है। Yellow Alert जारी है। यदि आवश्यक हो तभी बाहर निकलें।"  
> *(स्रोत: Verified Telemetry | अद्यतन समय: अभी)*

---

## 41. DISASTER MANAGEMENT VALUE & IMPACT

WeatherGPT directly supports the **National Disaster Management Authority (NDMA)** and state emergency operation centers by:
- Accelerating public awareness of IMD color-coded warnings (Red/Orange/Yellow).
- Delivering clear, plain-language guidance on severe weather hazards.
- Providing zero-latency WebSocket push alerts to subscribed populations.
- *Disclaimer*: WeatherGPT acts as an information dissemination platform and does not replace statutory civil emergency orders.

---

## 42. FEASIBILITY ANALYSIS

- **Technical Feasibility**: Built entirely on proven, production-grade open-source technologies (FastAPI, React, MongoDB, Docker).
- **Economic Feasibility**: Utilizes open-source stacks with low-cost inference (`gpt-4o-mini`) and free deterministic fallbacks.
- **Operational Feasibility**: Containerized deployment with automated health checks ensures straightforward maintenance.

---

## 43. VIABILITY & SUSTAINABILITY

WeatherGPT is designed for institutional adoption by government ministries (MoES, IMD, NDMA, State SDMAs) and educational bodies, providing an accessible public interface for national meteorological infrastructure.

---

## 44. SOCIAL IMPACT

- **Agrarian Resilience**: Protects crop yields through actionable micro-advisories.
- **Inclusive Accessibility**: Breaks literacy and language barriers via Hindi voice interfaces.
- **Public Safety**: Reduces severe weather casualties through instant hazard notifications.

---

## 45. RISK MATRIX & MITIGATION

```
+--------------------------+----------+-------------------------------------------------------------------------------+
| Risk Description         | Severity | Engineered Mitigation Strategy                                                |
+--------------------------+----------+-------------------------------------------------------------------------------+
| AI Hallucination         | HIGH     | Mandatory telemetry context injection; LLM constrained to verified facts.    |
| External API Outage      | MEDIUM   | In-memory TTL caching; multi-provider fallback; deterministic NLG engine.     |
| Unauthorized Tile Proxy  | HIGH     | SSRF whitelist restriction (`ALLOWED_TILE_PROXY_HOSTS`).                       |
| High Query Concurrency   | MEDIUM   | Async FastAPI architecture with in-memory endpoint rate limiting.            |
| Sensitive Key Exposure   | HIGH     | All API keys secured on backend; zero secrets exposed to client bundles.      |
+--------------------------+----------+-------------------------------------------------------------------------------+
```

---

## 46. COST CONSIDERATIONS

- **Compute & Hosting**: Low-cost VPS (Ubuntu, 2 vCPU, 4GB RAM) easily supports Docker Compose deployment.
- **LLM Inference**: `gpt-4o-mini` operates at fractions of a cent per query; deterministic fallback incurs zero inference cost.
- **Database**: MongoDB Community Edition deployed on-premises incurs no software licensing fees.

---

## 47. PROJECT STRUCTURE

```
weathergpt/
├── docker-compose.yml              # Multi-container orchestration definition
├── DEPLOYMENT.md                   # Production deployment & DR guide
├── PRODUCTION_CHECKLIST.md         # Production readiness checklist
├── documentation.md                # Comprehensive technical documentation
├── nginx/
│   └── nginx.conf                  # Edge reverse proxy configuration
├── weathergpt-backend/             # FastAPI backend microservice
│   ├── app/                        # Application source code
│   ├── tests/                      # Automated test suite (96 tests)
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Backend container build file
└── weathergpt-frontend/            # React + Vite frontend application
    ├── src/                        # React source code & components
    ├── package.json                # Node dependencies
    ├── tailwind.config.js          # Tailwind CSS design tokens
    └── Dockerfile                  # Frontend container build file
```

---

## 48. ENVIRONMENT CONFIGURATION

### Backend (`weathergpt-backend/.env`)
```env
# Application
PROJECT_NAME=WeatherGPT API
VERSION=1.0.0
ENVIRONMENT=development
DEBUG=True

# External Weather Provider
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5
GEOCODING_API_BASE_URL=https://api.openweathermap.org/geo/1.0

# Official IMD Provider (Optional / Future)
IMD_API_BASE_URL=
IMD_API_KEY=
ENABLE_IMD_PROVIDER=True

# Doppler Radar & Satellite
IMD_RADAR_ENABLED=False
IMD_SATELLITE_ENABLED=False

# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=weathergpt

# Authentication & Security
JWT_SECRET_KEY=your_secure_random_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM (OpenAI)
LLM_API_KEY=your_openai_api_key
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1

# CORS
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

### Frontend (`weathergpt-frontend/.env`)
```env
VITE_API_BASE_URL=/api/v1
VITE_WS_BASE_URL=/api/v1
```

---

## 49. LOCAL DEVELOPMENT SETUP

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- MongoDB 6.0+ (or Docker)

### Step 1: Clone Repository
```bash
git clone https://github.com/premjeetcsesr/weathergpt.git
cd weathergpt
```

### Step 2: Backend Setup
```bash
cd weathergpt-backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# Start backend server:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Frontend Setup
```bash
cd ../weathergpt-frontend
npm install
npm run dev
```

- Access Frontend: `http://localhost:5173`
- Access Backend Swagger UI: `http://localhost:8000/docs`

---

## 50. PRODUCTION DEPLOYMENT

### Docker Compose Deployment
```bash
# In the root repository directory:
docker compose build
docker compose up -d

# Verify running services:
docker compose ps
docker compose logs -f
```

---

## 51. DATA SOURCE ATTRIBUTION

WeatherGPT upholds strict attribution standards:
- **Verified Meteorological Provider**: Clear source badge displayed on all UI panels (`"Source: OpenWeatherMap / IMD"`).
- **Update Timestamp**: Exact observation timestamp displayed on every telemetry card.
- **Integrity Guarantee**: Third-party fallback data is never falsely labeled as official IMD data.

---

## 52. GOVERNMENT DATA POLICY COMPLIANCE

WeatherGPT adheres to responsible AI and open government data principles:
- No fabricated government orders or disaster declarations.
- Official IMD attribution protocols respected.
- Secure, rate-limited proxy access to all external resources.

---

## 53. VIVA & JUDGE EVALUATION Q&A (30 QUESTIONS)

1. **Q: Why WeatherGPT when weather apps already exist?**  
   *A*: Traditional apps show static numerical dashboards that require user interpretation. WeatherGPT provides natural language conversational intelligence, sector-specific safety advisories, voice accessibility, and prioritized disaster warnings.
2. **Q: Why not just use ChatGPT directly?**  
   *A*: Standard LLMs lack real-time meteorological telemetry and hallucinate weather conditions. WeatherGPT retrieves verified observation facts first, using the LLM solely for grounded contextual synthesis.
3. **Q: Does your AI model predict the weather?**  
   *A*: No. Weather forecasting requires complex physical fluid dynamics executed on supercomputers (NWP). WeatherGPT acts as an intelligent conversational and accessibility layer over verified meteorological data.
4. **Q: What is the single source of truth?**  
   *A*: Verified meteorological observation and forecast feeds from authorized providers (IMD / OpenWeatherMap).
5. **Q: What happens if the OpenAI API goes down or API key is missing?**  
   *A*: The system automatically switches to its deterministic rule-based NLG engine to generate accurate summaries without interruption.
6. **Q: What happens if external weather APIs fail?**  
   *A*: The platform serves cached observations (300s TTL) or activates fallback provider adapters.
7. **Q: How do you prevent hallucination in disaster warnings?**  
   *A*: Official warnings are retrieved exclusively from database records or authorized APIs. The LLM is barred from generating hazard alerts.
8. **Q: Why use FastAPI for the backend?**  
   *A*: FastAPI provides native asynchronous concurrency, high performance, automatic Pydantic validation, and seamless WebSocket support.
9. **Q: Why choose MongoDB over relational databases?**  
   *A*: MongoDB provides flexible schema modeling for nested meteorological payloads, native 2dsphere geospatial indexing, and high-throughput async writes.
10. **Q: How does the real-time WebSocket architecture work?**  
    *A*: Clients subscribe to specific locations. When the background `AlertMonitor` detects an active warning, it pushes targeted notifications exclusively to subscribed connections.
11. **Q: How is multilingual support implemented?**  
    *A*: `LanguageService` detects Devanagari and Hinglish scripts and formats responses accordingly while preserving numerical facts.
12. **Q: How does voice interaction work?**  
    *A*: Uses the browser-native Web Speech API for local STT transcription and TTS audio playback without storing voice recordings.
13. **Q: What is your SSRF defense on radar and satellite endpoints?**  
    *A*: The backend proxy verifies target hosts against `ALLOWED_TILE_PROXY_HOSTS` before forwarding any requests.
14. **Q: How do you handle password security?**  
    *A*: Passwords are encrypted using `bcrypt` with unique salts before storage.
15. **Q: What roles exist in your RBAC system?**  
    *A*: `USER` (standard features) and `ADMIN` (system diagnostics and operational audits).
16. **Q: How are short-term nowcasts calculated?**  
    *A*: `NowcastService` evaluates 0–3 hour precipitation probabilities, convective cloud covers, and barometric shifts.
17. **Q: How are climate anomalies computed?**  
    *A*: Uses historical baseline Z-scores ($Z = \frac{X - \mu}{\sigma}$) to classify deviations as Normal, Moderate, or Significant.
18. **Q: How do farmers benefit from WeatherGPT?**  
    *A*: Farmers receive plain-language advisories on crop spraying, sowing, irrigation, and frost protection in Hindi or English.
19. **Q: Is Doppler radar live in the demo?**  
    *A*: The Doppler radar layer architecture and secure proxy are fully implemented; live feeds will stream once government radar credentials are provided.
20. **Q: How does the in-memory cache operate?**  
    *A*: Frequently queried cities are cached for 300 seconds, reducing external API roundtrips and operational costs.
21. **Q: What rate limiting is applied?**  
    *A*: In-memory middleware limits authentication attempts (5/min), chat messages (30/min), and weather queries (60/min).
22. **Q: What security headers are configured?**  
    *A*: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1`, and strict CORS origin whitelisting.
23. **Q: How many automated tests exist in the codebase?**  
    *A*: 96 automated tests covering unit logic, route controllers, auth, WebSockets, and error boundaries with 100% pass rate.
24. **Q: How do you support low-literacy users?**  
    *A*: Through voice input/output, intuitive color-coded warning banners, and graphical icons.
25. **Q: What is the purpose of correlation IDs?**  
    *A*: `X-Request-ID` headers trace requests across frontend calls, proxy logs, and backend exceptions.
26. **Q: Can users save multiple locations?**  
    *A*: Yes. MongoDB `locations` collection stores bookmarked locations with custom labels (Home, Work, Farm).
27. **Q: How does the platform handle air quality (AQI)?**  
    *A*: Ingests PM2.5/PM10 metrics, categorizes health risk levels, and provides actionable outdoor precautions.
28. **Q: What makes this project SIH-ready?**  
    *A*: Complete full-stack implementation, passing test suite, Docker deployment, strict anti-hallucination design, and disaster management focus.
29. **Q: How is source transparency maintained?**  
    *A*: Every API response and UI card explicitly displays the provider source and update timestamp.
30. **Q: What is the primary future enhancement?**  
    *A*: Integrating live IMD API keys and Bhashini voice translation pipelines across all Indian languages.

---

## 54. ONE-MINUTE PITCH (ELEVATOR PITCH)

> "Respected judges, meteorological data in India is world-class, but it remains fragmented across portals, PDFs, and technical tables that ordinary citizens and farmers struggle to interpret. **WeatherGPT** solves this by providing a conversational weather intelligence platform. By combining verified meteorological observations with grounded AI, WeatherGPT answers natural queries like *'Should I spray my crop today?'* or *'Will it rain during my commute?'* in English and Hindi, through both text and voice. Crucially, our architecture guarantees **zero AI hallucination**—the LLM is strictly grounded in verified meteorological facts, with a deterministic fallback if AI services fail. With 96 passing automated tests, full Docker containerization, real-time WebSocket alerts, and Doppler radar architecture, WeatherGPT delivers accessible, actionable weather intelligence for disaster risk reduction."

---

## 55. TWO-MINUTE PITCH (PRESENTATION OVERVIEW)

> "Good morning, judges. Under SIH Problem Statement SIH26068, we present **WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information**, developed for the Ministry of Earth Sciences and IMD.
>
> India faces extreme weather hazards ranging from urban flash floods to agrarian heatwaves. While IMD generates precise data, the average citizen and rural farmer face high friction accessing actionable insights. WeatherGPT bridges this last-mile gap through an intelligent conversational layer.
>
> **Our Core Architecture:**
> 1. **Verified Truth First**: The LLM is never allowed to invent weather metrics. It operates strictly on real-time data fetched from verified providers.
> 2. **Deterministic Fallback**: If an LLM API key is absent or cloud AI services experience downtime during emergencies, our pre-compiled rule engine instantly generates structured natural-language summaries.
> 3. **Comprehensive Intelligence**: Provides real-time weather telemetry, 5-day forecasts, 0-3h nowcasts, official color-coded warnings, severe risk evaluations, and statistical climate analytics.
> 4. **Inclusivity & Accessibility**: Native bilingual support (Hindi/English) with hands-free browser voice recognition and text-to-speech.
> 5. **Real-Time Push Alerts**: WebSockets stream instant disaster notifications to subscribed citizens.
>
> The system is fully containerized with Docker and verified by 96 automated tests. WeatherGPT makes weather intelligence conversational, reliable, and actionable."

---

## 56. FIVE-MINUTE TECHNICAL DEEP-DIVE

> "Respected technical evaluators, let us walk through the engineering architecture of WeatherGPT.
>
> **1. Layered Microservice Topology**:
> The frontend is built on React 18 and Vite 6, using Tailwind CSS and React Leaflet. The backend is powered by Python 3.13 and FastAPI, fronted by an Nginx reverse proxy. Storage is handled by MongoDB 7.0 via the asynchronous Motor driver across 13 indexed collections.
>
> **2. Provider Abstraction & Data Ingestion**:
> We implement the Provider Factory pattern through `BaseWeatherProvider`. The active implementation integrates OpenWeatherMap APIs with normalized domain schemas, while the `IMDProvider` adapter is configured and ready for official government API keys. All telemetry undergoes strict Pydantic v2 validation.
>
> **3. Anti-Hallucination AI Pipeline**:
> When a user submits a query, our `LocationIntelligenceService` resolves spatial entities, retrieves real-time weather data and active warnings, and injects them into a structured prompt. The OpenAI model is constrained to the provided facts. If the LLM call fails, the `LLMService` falls back to deterministic rule-based Natural Language Generation.
>
> **4. Real-Time Alert Engine & WebSockets**:
> The `AlertMonitor` background worker checks active warnings in MongoDB. When a hazard is detected, our `WebSocketManager` pushes structured alert events exclusively to subscribed clients.
>
> **5. Security & SSRF Defense**:
> We enforce JWT authentication (HS256) with bcrypt password hashing, in-memory rate limiting on authentication and weather routes, and strict hostname whitelisting (`ALLOWED_TILE_PROXY_HOSTS`) on radar and satellite tile proxies.
>
> **6. Verification & Testing**:
> The entire backend is validated by 96 automated pytest test cases with 100% pass rate. WeatherGPT is production-ready, containerized, and secure."

---

## 57. SIH PRESENTATION SLIDES OUTLINE

```
Slide 1: Title & Team (WeatherGPT - SIH26068 - MoES / IMD)
Slide 2: The Problem (Information Fragmentation, Jargon, Accessibility Barriers)
Slide 3: Proposed Solution (Conversational Intelligence Grounded in Verified Data)
Slide 4: System Architecture (React -> Nginx -> FastAPI -> Multi-Provider -> MongoDB)
Slide 5: Anti-Hallucination Design (Facts First + Deterministic Fallback Engine)
Slide 6: Key Features (Current, Forecast, Nowcast, Warnings, Climate, Voice)
Slide 7: Geospatial & Radar Architecture (Leaflet Maps + SSRF-Protected Proxy)
Slide 8: Real-Time WebSocket Disaster Alert Pipeline
Slide 9: Target Users & Social Impact (Farmers, Citizens, Disaster Authorities)
Slide 10: Implementation Status & 96 Passed Tests
Slide 11: Future Roadmap (Official IMD Keys, GFS/WRF Models, Bhashini)
Slide 12: Conclusion & Q&A
```

---

## 58. GITHUB README SPECIFICATION

```markdown
# WeatherGPT 🌦️
> **Conversational AI for Weather Forecasting, Alerts, and Climate Information**  
> *Smart India Hackathon 2026 — Problem Statement ID: SIH26068*  
> *Ministry of Earth Sciences (MoES) | India Meteorological Department (IMD)*

## 🌟 Highlights
- **Fact-Grounded AI**: LLM synthesis strictly constrained to verified meteorological observations.
- **Deterministic NLG Fallback**: 100% uptime guarantee even without external AI keys.
- **Unified Intelligence**: Real-time telemetry, 5-day forecasts, 0-3h nowcasts, and official color-coded warnings.
- **Voice & Multilingual**: Bidirectional voice input/output in Hindi and English.
- **Real-Time Alerts**: WebSocket push broadcasting for live disaster warnings.
- **Production Stack**: React 18, FastAPI, MongoDB 7.0, Docker Compose, Nginx.
- **Verified Quality**: 96 passing automated tests.

## 🚀 Quickstart
```bash
# Clone & run with Docker Compose:
git clone https://github.com/premjeetcsesr/weathergpt.git
cd weathergpt
docker compose up -d
```
Frontend: `http://localhost` | API Docs: `http://localhost:8000/docs`
```

---

## 59. TECHNICAL GLOSSARY

- **AWS (Automatic Weather Station)**: Automated meteorological sensor station measuring surface atmospheric telemetry.
- **DWR (Doppler Weather Radar)**: Radar system utilizing the Doppler effect to measure precipitation intensity and wind velocity.
- **GFS (Global Forecast System)**: Global numerical weather prediction computer model run by NOAA.
- **INSAT**: Indian National Satellite System providing geostationary meteorological imagery (INSAT-3D/3DR/3DS).
- **LLM (Large Language Model)**: Neural network trained on natural language, used in WeatherGPT for grounded contextual synthesis.
- **NLG (Natural Language Generation)**: Algorithmic synthesis of natural language text from structured numerical data.
- **Nowcast**: Short-range weather forecast covering the immediate 0 to 3 hour window.
- **NWP (Numerical Weather Prediction)**: Mathematical atmospheric simulation executing on supercomputers.
- **RAG (Retrieval-Augmented Generation)**: Architecture pattern retrieving verified data facts prior to LLM synthesis.
- **SSRF (Server-Side Request Forgery)**: Security vulnerability mitigated in WeatherGPT via strict proxy whitelists.
- **WRF (Weather Research and Forecasting)**: Mesoscale numerical weather prediction model used for localized atmospheric simulation.
- **Z-Score Anomaly**: Statistical metric measuring the standard deviation of an observation from historical baseline mean.

---

## 60. TRUTH & VERIFICATION SUMMARY

To maintain total integrity and academic transparency for SIH 2026 judges, the current operational state of all platform components is summarized below:

```
+---------------------------------------------------------------------------------------------------------+
|                                    TRUTH & VERIFICATION STATUS REPORT                                   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  [ LIVE & FULLY IMPLEMENTED (Verified by 96 Passing Tests) ]                                            |
|  ✔ Current Weather Telemetry & AQI (OpenWeatherMap Provider)                                            |
|  ✔ 5-Day / 3-Hour Forecast Aggregation                                                                  |
|  ✔ Grounded AI Conversational Assistant (OpenAI GPT-4o-mini Integration)                                 |
|  ✔ Deterministic Rule-Based NLG Fallback (Active when LLM key is absent)                                |
|  ✔ Short-Term Nowcasting (0-3 Hour precipitation & atmospheric shift engine)                             |
|  ✔ Official Warnings Normalization (Severity ranking: Extreme > Severe > Moderate > Minor)              |
|  ✔ Empirical Severe Weather Risk Formulas (Heatwaves, heavy rain, gale wind)                           |
|  ✔ Actionable Safety Advisories (Hydration, agriculture, outdoor precautions)                           |
|  ✔ Statistical Climate Analytics (Z-score anomalies, linear regression slopes, period comparison)       |
|  ✔ Real-Time WebSocket Disaster Alert Push Server (`/api/v1/ws/alerts`)                                 |
|  ✔ Motor Async MongoDB Persistence (13 collections with geospatial & compound indexes)                  |
|  ✔ JWT Authentication (HS256) with Bcrypt Password Hashing & RBAC (USER / ADMIN)                       |
|  ✔ Geospatial Saved Locations (`2dsphere` indexed bookmarks)                                            |
|  ✔ Bidirectional Voice Interaction (Browser Web Speech Recognition & SpeechSynthesis)                  |
|  ✔ Multilingual Support (Automatic Hindi / English script & keyword detection)                          |
|  ✔ SSRF-Protected Radar & Satellite Proxy Gateway (Strict hostname whitelist)                           |
|  ✔ Docker Compose 4-Service Stack (Nginx + React + FastAPI + MongoDB)                                  |
|                                                                                                         |
|  [ CONFIGURED / ARCHITECTURE READY (Awaiting Official Government Access Credentials) ]                  |
|  🟡 Official IMD API Adapter (`app/providers/imd_provider.py` - Ingestion code ready)                   |
|  🔵 Live Doppler Weather Radar Feed (Proxy & layer endpoints ready; returns empty tiles when unconfigured|
|  🔵 Live INSAT Satellite Feed (Multispectral layer pipeline ready; awaiting MOSDAC live stream)         |
|                                                                                                         |
|  [ FUTURE ENGINEERING ROADMAP ]                                                                         |
|  🟠 Ingestion of raw GRIB2 Numerical Weather Prediction (WRF / GFS) model files                         |
|  🟠 Integration with Digital India Bhashini API for all 22 scheduled Indian languages                   |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

---
*WeatherGPT — Smart India Hackathon 2026 (SIH26068) Technical Documentation Specification*