# WeatherGPT - AI-Powered Conversational Weather Intelligence Platform

WeatherGPT is a modern, production-quality frontend for an AI-powered conversational weather intelligence platform built using **React.js**, **Vite**, **Tailwind CSS**, **Leaflet / React-Leaflet**, **Lucide React**, and **Recharts**.

---

## ✨ Features

- **Dashboard**:
  - Live search with instant autocomplete for global and Indian cities.
  - "Use My Location" browser GPS geolocation with reverse coordinate lookup.
  - Comprehensive telemetry: Temperature, Feels Like, Humidity, Wind speed & direction compass, Pressure, Visibility, UV Index, Sunrise/Sunset, and Air Quality (AQI) with health recommendations.
  - Horizontally scrollable 24-hour forecast with precipitation probability indicators.
  - 7-Day outlook with min/max visual temperature range bars.
  - Active severe weather alert banners with emergency safety guidance.
  - Proactive **WeatherGPT Daily Intelligence** insight card with agricultural advice and travel scores.
- **AI Weather Assistant**:
  - ChatGPT-style interactive conversational interface.
  - Supports rich AI responses with embedded telemetry cards, alert cards, and suggested follow-ups.
  - Voice simulation input (Microphone button) and location tagger.
  - Contextual prompt recommendations (e.g. *"Will it rain in Kanpur tomorrow?"*, *"Give me farming advice"*).
- **Interactive Weather Map**:
  - React-Leaflet map with custom HTML divIcon markers (no missing assets/404s).
  - Dynamic pan and zoom transitions on city selection.
  - Layer toggles for **Precipitation Radar**, **Temperature Heatmap**, **Wind Velocity**, and **Active Disaster Alerts**.
  - Interactive weather inspection popups on all markers.
- **Weather Alerts Center**:
  - Filter by disaster category: *Rain*, *Thunderstorm*, *Flood*, *Cyclone*, *Heatwave*.
  - Visual threat matrix across *Information*, *Moderate*, *Severe*, and *Extreme* severities.
  - Actionable safety checklists, affected zones, and native sharing.
- **Climate Analytics**:
  - Modular Recharts visualizers for temperature deviations vs 30-year normal.
  - Monthly precipitation distribution (mm) and 10-year decadal anomaly charts.
- **Localization & Settings**:
  - Multi-language support: **English**, **हिन्दी (Hindi)**, **বাংলা (Bengali)**, **தமிழ் (Tamil)**, **తెలుగు (Telugu)**, **मराठी (Marathi)**, **ગુજરાતી (Gujarati)**, **ಕನ್ನಡ (Kannada)**, and **ਪੰਜਾਬੀ (Punjabi)**.
  - Seamless unit toggle (°C ↔ °F, km/h ↔ mph).
  - Dark Mode, Light Mode, and System Theme preferences with `localStorage` persistence.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (with custom animations, glassmorphism, and dark mode classes)
- **Map & GIS**: Leaflet & React-Leaflet
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router DOM (v6)

---

## 📁 Project Structure

```
weathergpt/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context/
    │   ├── WeatherContext.jsx      # Location, active telemetry, units & state
    │   ├── LanguageContext.jsx     # English & Indian language translation engine
    │   └── ThemeContext.jsx        # Dark / Light / System theme engine
    ├── services/
    │   ├── apiConfig.js            # FastAPI endpoint definitions & mock toggle
    │   ├── weatherApi.js           # Weather, forecast, alerts & climate API services
    │   └── chatApi.js              # AI assistant conversation & prompt services
    ├── data/
    │   ├── mockWeather.js          # Detailed datasets for Indian & global cities
    │   ├── mockAlerts.js           # Multi-severity disaster alerts
    │   ├── mockChat.js             # Conversational AI knowledge & rich cards
    │   ├── mockClimate.js          # Historical climate patterns & anomaly records
    │   └── translations.js         # Comprehensive multi-language dictionaries
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.jsx          # Brand logo, units toggle, language & theme
    │   │   ├── Sidebar.jsx         # Desktop navigation with alert badges
    │   │   └── MobileNav.jsx       # Bottom navigation bar
    │   ├── common/
    │   │   ├── SearchBar.jsx       # Autocomplete search with geolocation
    │   │   ├── Loading.jsx         # Spinners and skeleton loaders
    │   │   ├── ErrorMessage.jsx    # Error state and retry handler
    │   │   └── Badge.jsx           # Severity & category tags
    │   ├── dashboard/
    │   │   ├── CurrentWeather.jsx  # Hero weather telemetry card
    │   │   ├── HourlyForecast.jsx  # Horizontally scrollable 24h timeline
    │   │   ├── DailyForecast.jsx   # 7-day outlook with temperature bars
    │   │   ├── WeatherAlert.jsx    # Dashboard alert banner
    │   │   └── AIInsight.jsx       # Daily intelligence & Ask WeatherGPT CTA
    │   ├── chat/
    │   │   ├── ChatWindow.jsx      # Conversation thread container
    │   │   ├── ChatMessage.jsx     # Message bubbles with rich weather cards
    │   │   └── ChatInput.jsx       # Speech simulation, location tag & pills
    │   ├── map/
    │   │   ├── WeatherMap.jsx      # React-Leaflet interactive map
    │   │   ├── LocationMarker.jsx  # Custom SVG pins & pulse animations
    │   │   └── WeatherLayers.jsx   # Radar, temperature & wind layer toggles
    │   ├── alerts/
    │   │   └── AlertCard.jsx       # Detailed alert card with safety guidelines
    │   └── climate/
    │       └── ClimateChart.jsx    # Recharts modular visualizers
    └── pages/
        ├── Dashboard.jsx
        ├── Assistant.jsx
        ├── WeatherMapPage.jsx
        ├── Alerts.jsx
        ├── Climate.jsx
        └── Settings.jsx
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```

---

## 🔌 Connecting to a FastAPI Backend

The frontend is architected with clear service boundaries in `src/services/`.

To connect your FastAPI backend:

1. Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_USE_MOCK_DATA=false
   ```
2. Ensure your FastAPI backend implements the following endpoints:
   - `GET /api/v1/weather?location={location}` - Current weather telemetry
   - `GET /api/v1/forecast?location={location}` - Hourly and 7-day forecasts
   - `GET /api/v1/alerts?location={location}&category={category}` - Active alerts
   - `POST /api/v1/chat` - AI weather conversation payload:
     ```json
     {
       "message": "Will it rain in Kanpur tomorrow?",
       "location": "Kanpur",
       "weather_context": {}
     }
     ```
   - `GET /api/v1/climate?location={location}` - Climate trend data
   - `GET /api/v1/locations/search?query={query}` - Autocomplete search

---

## 📄 License
MIT License