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
