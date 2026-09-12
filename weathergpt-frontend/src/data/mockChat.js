export const suggestedPrompts = [
  "Will it rain in Kanpur tomorrow?",
  "How is the weather this weekend in Mumbai?",
  "Is it safe to travel to New Delhi today?",
  "Give me farming advice for current soil conditions.",
  "Any severe weather alerts active right now?",
  "Compare weather between Bengaluru and Chennai."
];

export const initialMessages = [
  {
    id: "welcome-1",
    sender: "ai",
    timestamp: "Just now",
    text: "Hello! I am **WeatherGPT**, your AI Weather Intelligence Assistant. You can ask me anything about hyperlocal forecasts, rainfall probabilities, travel safety scores, agricultural weather advisories, and active meteorological alerts across India and globally.",
    weatherCard: null,
    alertCard: null,
    followUps: [
      "Will it rain in Kanpur tomorrow?",
      "How is the weather this weekend in Mumbai?",
      "Give me farming advice for crops."
    ]
  }
];

export function generateAIResponse(userText, activeCity = "Kanpur", activeWeatherData = null) {
  const query = userText.toLowerCase();

  // 1. Rain in Kanpur / Tomorrow Rain
  if (query.includes("rain") && (query.includes("kanpur") || activeCity.toLowerCase() === "kanpur")) {
    return {
      text: `### 🌧️ Rain Forecast for Kanpur (Tomorrow & Next 48 Hours)

Based on real-time atmospheric moisture convergence and Doppler radar simulation for **Kanpur, Uttar Pradesh**:

- **Precipitation Probability**: **85%** starting tomorrow afternoon around **03:30 PM IST**.
- **Expected Intensity**: Moderate to heavy convective downpours (**65–85 mm**).
- **Peak Storm Window**: **03:30 PM – 07:30 PM IST**.
- **Wind Gusts**: Gusty easterly squalls reaching **35–45 km/h** with frequent cloud-to-ground lightning.

> **WeatherGPT Recommendation**: If you have outdoor travel along the GT Road, warehouse loading, or crop harvesting planned, schedule them **before 02:30 PM** to avoid waterlogging.`,
      weatherCard: {
        city: "Kanpur, India",
        temp: "30°C (Max) / 23°C (Min)",
        condition: "Heavy Thunderstorms",
        pop: "85%",
        humidity: "88%",
        wind: "38 km/h ESE",
        timeWindow: "Tomorrow 03:30 PM onwards"
      },
      alertCard: {
        title: "Severe Thunderstorm Warning - Kanpur",
        severity: "Severe",
        action: "Secure outdoor items and avoid open ground or lone trees during lightning."
      },
      followUps: [
        "Will it rain on Saturday in Kanpur?",
        "What farming precautions should I take in Kanpur?",
        "Show me the 7-day forecast for Kanpur"
      ]
    };
  }

  // 2. Weekend weather / Mumbai
  if (query.includes("weekend") || (query.includes("mumbai") && (query.includes("weather") || query.includes("rain")))) {
    return {
      text: `### 🌊 Weekend Weather Outlook for Mumbai & Konkan Coast

Here is the weekend meteorological projection for **Mumbai, Maharashtra**:

- **Saturday, Sep 13**: High of **31°C**, Low of **26°C**. Passing monsoon showers with brief sunny breaks (**65% rain probability**).
- **Sunday, Sep 14**: High of **32°C**, Low of **26°C**. Light scattered drizzle with pleasant onshore Arabian Sea breezes (**40% rain probability**).
- **High Tide Timing**: 4.12m tide at **02:15 PM**; low-lying drainage will be slowed during peak tide.

> **Travel Tip**: Marine Drive and Bandra Bandstand will have invigorating sea breezes, but please maintain safe distance from wave splash zones during high tide.`,
      weatherCard: {
        city: "Mumbai, India",
        temp: "29°C",
        condition: "Monsoon Showers & High Tide",
        pop: "65%",
        humidity: "88%",
        wind: "24 km/h WSW",
        timeWindow: "This Weekend (Sat - Sun)"
      },
      alertCard: {
        title: "High Tide Advisory - Mumbai Coastal Zones",
        severity: "Severe",
        action: "Avoid waterlogged subways at Milan and Andheri during heavy rain spells."
      },
      followUps: [
        "What is the high tide time tomorrow in Mumbai?",
        "Is it safe to travel to Pune by expressway?",
        "Check Bengaluru weekend weather"
      ]
    };
  }

  // 3. Travel Safety
  if (query.includes("travel") || query.includes("safe") || query.includes("trip")) {
    return {
      text: `### 🚗 AI Travel & Road Condition Intelligence

Here is the transit risk assessment for your query:

- **Delhi NCR Corridor**: **Travel Score: 7.5/10 (Safe)**. Dry pavement, but atmospheric haze reduces visibility to 4.2 km in early mornings.
- **Kanpur – Lucknow Highway**: **Travel Score: 5.5/10 (Caution)**. Heavy afternoon squalls tomorrow may cause hydroplaning and localized waterlogging near toll plazas.
- **Mumbai – Pune Expressway**: **Travel Score: 6.0/10 (Moderate Caution)**. Ghat sections experiencing intermittent cloud mist and slippery roads. Keep headlights on low beam.

> **Precaution**: Ensure vehicle wipers, tire treads, and defoggers are fully inspected before intercity journeys during active monsoon spells.`,
      weatherCard: {
        city: "Regional Transit Assessment",
        temp: "31°C Average",
        condition: "Variable by Route",
        pop: "Moderate Risk",
        humidity: "High",
        wind: "20-35 km/h gusts",
        timeWindow: "Next 24 Hours"
      },
      alertCard: null,
      followUps: [
        "Check flights weather delay risk",
        "Will rainfall affect train schedules?",
        "What is the best departure window?"
      ]
    };
  }

  // 4. Farming / Agriculture
  if (query.includes("farm") || query.includes("crop") || query.includes("agriculture") || query.includes("kisan")) {
    return {
      text: `### 🌾 WeatherGPT Smart Agricultural Advisory

Here is the customized agrometeorological guidance:

1. **Paddy & Kharif Crops**:
   - **Soil Moisture**: Moisture levels are currently near field capacity (75–85%).
   - **Recommendation**: Ensure field bunds and drainage outlets are cleared to prevent deep water submergence during upcoming heavy rain episodes.
2. **Pesticide & Fertilizer Spraying**:
   - **Caution**: **Do NOT apply foliar sprays or chemical fertilizers** within 24 hours of anticipated rains, as precipitation will cause chemical wash-off and economic loss.
3. **Livestock & Grain Storage**:
   - Store harvested grain in elevated, waterproof silos with adequate ventilation to prevent fungal mold formation. Keep cattle sheltered away from metallic structures during thunderstorm activity.`,
      weatherCard: {
        city: `${activeCity} Agro-Zone`,
        temp: "Soil Temp: 26°C",
        condition: "Field Capacity: High Moisture",
        pop: "Rain Alert Active",
        humidity: "78%",
        wind: "Adequate for Pollination",
        timeWindow: "Current Season"
      },
      alertCard: null,
      followUps: [
        "What is the 7-day rainfall outlook for farming?",
        "When is the next dry window for pesticide spray?",
        "Is there a hail warning for crops?"
      ]
    };
  }

  // 5. Active Alerts
  if (query.includes("alert") || query.includes("warning") || query.includes("severe") || query.includes("cyclone")) {
    return {
      text: `### ⚠️ Active Severe Weather Alerts Summary

WeatherGPT is monitoring **3 significant meteorological advisories**:

1. **🔴 Extreme Warning (Bay of Bengal / Kolkata)**: Deep depression intensifying into a cyclone with gale winds reaching 70–80 km/h and marine storm surges.
2. **🟠 Severe Warning (Kanpur & Central UP)**: Convective thunderstorm warning with heavy localized precipitation (65–90mm) and intense lightning activity.
3. **🟠 Severe Warning (Mumbai Coast)**: Astronomical high tide (4.12m) with urban drainage restrictions and localized ponding.

> All emergency responders, local municipal bodies, and citizens in affected zones are advised to monitor radar updates continuously.`,
      weatherCard: null,
      alertCard: {
        title: "Active Multi-State Severe Weather Network",
        severity: "Extreme",
        action: "Check the Alerts page for real-time safety instructions and zone maps."
      },
      followUps: [
        "Show details for Kolkata cyclone track",
        "How long will Kanpur thunderstorm last?",
        "Switch to Weather Map to see live alert zones"
      ]
    };
  }

  // 6. Generic / Active City Intelligent Query
  const cityInfo = activeWeatherData ? activeWeatherData.location.city : activeCity;
  const currentTemp = activeWeatherData ? activeWeatherData.current.temp : "31";
  const condition = activeWeatherData ? activeWeatherData.current.condition : "Partly Cloudy";
  const rainProb = activeWeatherData ? activeWeatherData.hourly[0]?.pop || "25" : "25";
  const humidityVal = activeWeatherData ? activeWeatherData.current.humidity : "75";
  const windVal = activeWeatherData ? activeWeatherData.current.wind_speed : "16";

  return {
    text: `### 🌤️ Weather Intelligence for ${cityInfo}

Here is the current analysis and short-term atmospheric modeling for **${cityInfo}**:

- **Current Temperature**: **${currentTemp}°C** (Feels like **${Number(currentTemp) + 5}°C**)
- **Condition**: ${condition}
- **Rain Probability**: **${rainProb}%** over the next 3–6 hours
- **Humidity & Wind**: **${humidityVal}%** relative humidity with wind speeds of **${windVal} km/h**
- **Air Quality**: ${activeWeatherData?.current.air_quality.label || "Moderate"} (AQI ${activeWeatherData?.current.air_quality.aqi || 112})

> **WeatherGPT Insight**: Atmospheric stability indicates mild variance throughout the day. Outdoor activities can proceed with standard weather awareness.`,
    weatherCard: {
      city: `${cityInfo}`,
      temp: `${currentTemp}°C`,
      condition: condition,
      pop: `${rainProb}%`,
      humidity: `${humidityVal}%`,
      wind: `${windVal} km/h`,
      timeWindow: "Live Telemetry"
    },
    alertCard: activeWeatherData?.current.air_quality.aqi > 150 ? {
      title: "Elevated AQI Alert",
      severity: "Moderate",
      action: "Air quality index is elevated. Sensitive groups should wear protective masks."
    } : null,
    followUps: [
      `Will it rain in ${cityInfo} tomorrow?`,
      `Show 7-day forecast for ${cityInfo}`,
      `Is it safe to travel around ${cityInfo}?`
    ]
  };
}
