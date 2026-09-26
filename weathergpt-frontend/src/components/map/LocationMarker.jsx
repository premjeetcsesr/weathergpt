import React from 'react';
import L from 'leaflet';

/**
 * Creates custom styled HTML Leaflet divIcons without relying on external image assets.
 */
export function createCustomMarkerIcon(city = "Location", temp = "31°C", type = "city") {
  const isAlert = type === 'alert';
  const isUser = type === 'user';

  const badgeBg = isAlert
    ? 'bg-red-500 text-white'
    : isUser
    ? 'bg-emerald-500 text-white'
    : 'bg-brand-600 text-white';

  const html = `
    <div class="relative group cursor-pointer" style="transform: translate(-50%, -100%);">
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${badgeBg} shadow-elevated text-[11px] font-bold whitespace-nowrap border-2 border-white dark:border-slate-900">
        <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
        <span>${city}</span>
        <span class="opacity-90 font-mono">${temp}</span>
      </div>
      <div class="w-2.5 h-2.5 bg-brand-600 rotate-45 mx-auto -mt-1 border-r border-b border-white dark:border-slate-900"></div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -35]
  });
}

/**
 * Live GPS Device Location Marker (Pulsing blue beacon)
 */
export function createCurrentLocationMarkerIcon() {
  const html = `
    <div class="relative cursor-pointer" style="transform: translate(-50%, -50%);">
      <div class="absolute -inset-2.5 rounded-full bg-sky-500/40 animate-ping"></div>
      <div class="absolute -inset-1 rounded-full bg-sky-400/60 animate-pulse"></div>
      <div class="relative w-5 h-5 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 border-2 border-white shadow-xl flex items-center justify-center">
        <span class="w-2 h-2 rounded-full bg-white"></span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-current-gps-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -15]
  });
}

/**
 * Choice Location Marker (User selected on map click or search)
 */
export function createChoiceLocationMarkerIcon(label = "Selected Location") {
  const html = `
    <div class="relative group cursor-pointer" style="transform: translate(-50%, -100%);">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-2xl text-xs font-black whitespace-nowrap border-2 border-white ring-2 ring-orange-400/50 animate-bounce">
        <span>📍</span>
        <span class="max-w-[120px] truncate">${label}</span>
      </div>
      <div class="w-3 h-3 bg-red-600 rotate-45 mx-auto -mt-1.5 border-r-2 border-b-2 border-white"></div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-choice-location-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -40]
  });
}

export function createAlertMarkerIcon(alertTitle = "Alert", severity = "Severe") {
  const color = severity === 'Extreme' ? '#ef4444' : '#f97316';

  const html = `
    <div class="relative cursor-pointer" style="transform: translate(-50%, -50%);">
      <div style="background-color: ${color};" class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-glow border-2 border-white animate-ping">
      </div>
      <div style="background-color: ${color};" class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-elevated border-2 border-white absolute top-0 left-0">
        ⚠️
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-alert-leaflet-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -18]
  });
}

export function createCommunityMarkerIcon(category = "incident", icon = "📍", isVerified = true, isAlertPulse = false) {
  const bgClass = isVerified
    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 ring-2 ring-emerald-300'
    : 'bg-gradient-to-tr from-amber-600 to-orange-500 ring-2 ring-amber-300';

  const pulseRings = isAlertPulse
    ? `
      <div class="absolute -inset-3 rounded-full bg-red-500/50 animate-ping pointer-events-none"></div>
      <div class="absolute -inset-1.5 rounded-full bg-amber-400/40 animate-pulse pointer-events-none"></div>
    `
    : '';

  const html = `
    <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
      ${pulseRings}
      <div class="w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-sm shadow-elevated border-2 border-white dark:border-slate-900 transition-transform duration-200 hover:scale-110">
        <span>${icon}</span>
      </div>
      ${
        isVerified
          ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>'
          : '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 border border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold">⏳</span>'
      }
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-community-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}
