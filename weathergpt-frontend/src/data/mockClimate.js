export const mockClimateData = {
  // Monthly historical normal vs 2025/2026 actuals
  monthlyTrends: [
    { month: "Jan", historicalAvgTemp: 15.2, currentTemp: 16.4, historicalRainfall: 18.5, actualRainfall: 12.2, anomaly: +1.2 },
    { month: "Feb", historicalAvgTemp: 18.8, currentTemp: 20.1, historicalRainfall: 16.0, actualRainfall: 22.4, anomaly: +1.3 },
    { month: "Mar", historicalAvgTemp: 24.5, currentTemp: 26.8, historicalRainfall: 11.2, actualRainfall: 8.0, anomaly: +2.3 },
    { month: "Apr", historicalAvgTemp: 31.0, currentTemp: 33.2, historicalRainfall: 8.4, actualRainfall: 14.5, anomaly: +2.2 },
    { month: "May", historicalAvgTemp: 34.6, currentTemp: 36.5, historicalRainfall: 28.0, actualRainfall: 35.8, anomaly: +1.9 },
    { month: "Jun", historicalAvgTemp: 33.8, currentTemp: 34.4, historicalRainfall: 120.5, actualRainfall: 145.0, anomaly: +0.6 },
    { month: "Jul", historicalAvgTemp: 29.8, currentTemp: 30.5, historicalRainfall: 280.0, actualRainfall: 312.4, anomaly: +0.7 },
    { month: "Aug", historicalAvgTemp: 29.0, currentTemp: 29.6, historicalRainfall: 265.2, actualRainfall: 298.0, anomaly: +0.6 },
    { month: "Sep", historicalAvgTemp: 28.5, currentTemp: 29.8, historicalRainfall: 175.4, actualRainfall: 210.6, anomaly: +1.3 },
    { month: "Oct", historicalAvgTemp: 25.8, currentTemp: 26.9, historicalRainfall: 32.0, actualRainfall: 40.2, anomaly: +1.1 },
    { month: "Nov", historicalAvgTemp: 20.4, currentTemp: 21.6, historicalRainfall: 6.8, actualRainfall: 4.1, anomaly: +1.2 },
    { month: "Dec", historicalAvgTemp: 16.1, currentTemp: 17.0, historicalRainfall: 8.2, actualRainfall: 7.0, anomaly: +0.9 }
  ],

  // 10-year historical climate anomaly trends
  yearlyAnomalies: [
    { year: "2016", tempAnomaly: +0.94, rainfallDeviationPct: -4.2, extremeHeatDays: 22 },
    { year: "2017", tempAnomaly: +0.88, rainfallDeviationPct: -2.1, extremeHeatDays: 18 },
    { year: "2018", tempAnomaly: +0.82, rainfallDeviationPct: -1.5, extremeHeatDays: 19 },
    { year: "2019", tempAnomaly: +0.98, rainfallDeviationPct: +9.4, extremeHeatDays: 28 },
    { year: "2020", tempAnomaly: +0.76, rainfallDeviationPct: +8.8, extremeHeatDays: 16 },
    { year: "2021", tempAnomaly: +0.84, rainfallDeviationPct: +1.2, extremeHeatDays: 20 },
    { year: "2022", tempAnomaly: +1.15, rainfallDeviationPct: +6.5, extremeHeatDays: 32 },
    { year: "2023", tempAnomaly: +1.38, rainfallDeviationPct: +7.8, extremeHeatDays: 36 },
    { year: "2024", tempAnomaly: +1.45, rainfallDeviationPct: +11.2, extremeHeatDays: 41 },
    { year: "2025", tempAnomaly: +1.52, rainfallDeviationPct: +13.5, extremeHeatDays: 44 },
    { year: "2026 (YTD)", tempAnomaly: +1.48, rainfallDeviationPct: +12.0, extremeHeatDays: 29 }
  ],

  // Summary Metrics
  summaryStats: {
    meanAnnualTempRise: "+1.48°C",
    monsoonSurgeIndex: "+12.8%",
    extremeWeatherEventsRecorded: 18,
    drySpellsTrend: "-8 Days",
    groundwaterRechargeIndex: "Moderate (+4.5%)",
    hottestRecordedDay: "47.2°C (May 28)",
    heaviestSingleDayRain: "168.4 mm (Aug 14)"
  }
};
