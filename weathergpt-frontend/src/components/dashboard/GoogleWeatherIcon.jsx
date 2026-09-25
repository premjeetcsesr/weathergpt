import React from 'react';

/**
 * Natural, alive Google Weather SVG icons with realistic animations:
 * - Rain: falling animated droplets with splash
 * - Thunderstorm / Disaster: flashing golden lightning bolt & heavy precipitation
 * - Sun: glowing warm core with rotating radiant sunbeams
 * - Wind: sweeping aerodynamic breeze ribbons
 * - Clouds: soft billowing clouds
 */
export function GoogleWeatherIcon({ condition = 'cloud-sun', className = "w-16 h-16" }) {
  const norm = (condition || '').toLowerCase();

  // Thunderstorm / lightning / Severe convective
  if (norm.includes('thunder') || norm.includes('lightning') || norm === 'cloud-lightning') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
          {/* Cloud back shadow */}
          <path
            d="M24 62 A16 16 0 0 1 36 34 A24 24 0 0 1 76 38 A18 18 0 0 1 78 62 Z"
            fill="url(#thunderCloudGradLive)"
          />
          {/* Cloud front layered highlight */}
          <path
            d="M32 58 A12 12 0 0 1 40 37 A20 20 0 0 1 72 41 A14 14 0 0 1 74 58 Z"
            fill="#5f6368"
            opacity="0.4"
          />

          {/* Animated Falling Rain Drops */}
          <g stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
            <line x1="34" y1="67" x2="29" y2="82" opacity="0.8">
              <animate attributeName="y1" values="67;72;67" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="82;87;82" dur="0.8s" repeatCount="indefinite" />
            </line>
            <line x1="46" y1="69" x2="41" y2="84" opacity="0.9">
              <animate attributeName="y1" values="69;75;69" dur="0.7s" repeatCount="indefinite" />
              <animate attributeName="y2" values="84;90;84" dur="0.7s" repeatCount="indefinite" />
            </line>
            <line x1="68" y1="68" x2="63" y2="83" opacity="0.85">
              <animate attributeName="y1" values="68;73;68" dur="0.9s" repeatCount="indefinite" />
              <animate attributeName="y2" values="83;88;83" dur="0.9s" repeatCount="indefinite" />
            </line>
          </g>

          {/* Golden Shimmering Lightning Bolt */}
          <polygon
            points="58,52 42,70 51,70 39,94 65,67 55,67 63,52"
            fill="#fbbc04"
            stroke="#ea8600"
            strokeWidth="1.2"
            strokeLinejoin="round"
          >
            <animate
              attributeName="opacity"
              values="1;0.3;1;0.9;0.2;1"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </polygon>

          <defs>
            <linearGradient id="thunderCloudGradLive" x1="20" y1="25" x2="80" y2="70" gradientUnits="userSpaceOnUse">
              <stop stopColor="#70757a" />
              <stop offset="0.6" stopColor="#3c4043" />
              <stop offset="1" stopColor="#202124" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Rain / Heavy Showers
  if (norm.includes('rain') || norm === 'cloud-rain') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
          {/* Cloud */}
          <path
            d="M26 58 A16 16 0 0 1 36 32 A24 24 0 0 1 76 36 A18 18 0 0 1 78 58 Z"
            fill="url(#rainCloudGradLive)"
          />
          {/* Rain drops falling anim */}
          <g stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round">
            <line x1="35" y1="65" x2="30" y2="80">
              <animate attributeName="y1" values="65;72;65" dur="0.75s" repeatCount="indefinite" />
              <animate attributeName="y2" values="80;87;80" dur="0.75s" repeatCount="indefinite" />
            </line>
            <line x1="47" y1="67" x2="42" y2="83">
              <animate attributeName="y1" values="67;74;67" dur="0.65s" repeatCount="indefinite" />
              <animate attributeName="y2" values="83;90;83" dur="0.65s" repeatCount="indefinite" />
            </line>
            <line x1="59" y1="65" x2="54" y2="81">
              <animate attributeName="y1" values="65;71;65" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="81;87;81" dur="0.8s" repeatCount="indefinite" />
            </line>
            <line x1="71" y1="66" x2="66" y2="80">
              <animate attributeName="y1" values="66;73;66" dur="0.7s" repeatCount="indefinite" />
              <animate attributeName="y2" values="80;87;80" dur="0.7s" repeatCount="indefinite" />
            </line>
          </g>
          <defs>
            <linearGradient id="rainCloudGradLive" x1="25" y1="25" x2="80" y2="65" gradientUnits="userSpaceOnUse">
              <stop stopColor="#bdc1c6" />
              <stop offset="1" stopColor="#494c50" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Drizzle / Light Rain
  if (norm.includes('drizzle') || norm === 'cloud-drizzle') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
          {/* Radiant sun peek */}
          <circle cx="68" cy="36" r="14" fill="#fbbc04" />
          {/* Cloud */}
          <path
            d="M24 60 A14 14 0 0 1 34 38 A22 22 0 0 1 70 42 A16 16 0 0 1 74 60 Z"
            fill="url(#drizzleCloudGradLive)"
          />
          {/* Light rain droplet streaks */}
          <g stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3">
            <line x1="38" y1="68" x2="34" y2="78">
              <animate attributeName="y1" values="68;73;68" dur="1s" repeatCount="indefinite" />
              <animate attributeName="y2" values="78;83;78" dur="1s" repeatCount="indefinite" />
            </line>
            <line x1="52" y1="68" x2="48" y2="79">
              <animate attributeName="y1" values="68;74;68" dur="0.9s" repeatCount="indefinite" />
              <animate attributeName="y2" values="79;85;79" dur="0.9s" repeatCount="indefinite" />
            </line>
            <line x1="64" y1="68" x2="60" y2="77">
              <animate attributeName="y1" values="68;73;68" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="y2" values="77;82;77" dur="1.1s" repeatCount="indefinite" />
            </line>
          </g>
          <defs>
            <linearGradient id="drizzleCloudGradLive" x1="25" y1="30" x2="75" y2="65" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e8eaed" />
              <stop offset="1" stopColor="#9aa0a6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Clear Sky / Sunny
  if (norm.includes('clear') || norm.includes('sunny') || norm === 'sun') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
          {/* Glowing rotating rays */}
          <g stroke="#f9ab00" strokeWidth="3.5" strokeLinecap="round">
            <line x1="50" y1="12" x2="50" y2="19" />
            <line x1="50" y1="81" x2="50" y2="88" />
            <line x1="12" y1="50" x2="19" y2="50" />
            <line x1="81" y1="50" x2="88" y2="50" />
            <line x1="23" y1="23" x2="28" y2="28" />
            <line x1="72" y1="72" x2="77" y2="77" />
            <line x1="23" y1="77" x2="28" y2="72" />
            <line x1="72" y1="28" x2="77" y2="23" />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="24s"
              repeatCount="indefinite"
            />
          </g>

          {/* Sun Core */}
          <circle cx="50" cy="50" r="22" fill="url(#sunGradLive)" />

          <defs>
            <linearGradient id="sunGradLive" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef08a" />
              <stop offset="0.4" stopColor="#fbbc04" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Wind
  if (norm.includes('wind')) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
          <g stroke="#2dd4bf" strokeWidth="3.5" strokeLinecap="round" fill="none">
            {/* Stream 1 */}
            <path d="M16 38 H68 A8 8 0 1 1 60 46" />
            {/* Stream 2 */}
            <path d="M24 50 H78 A10 10 0 1 0 68 40" />
            {/* Stream 3 */}
            <path d="M18 62 H56 A6 6 0 1 1 50 68" />
          </g>
        </svg>
      </div>
    );
  }

  // Night / Moon
  if (norm.includes('moon') || norm.includes('night')) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
          <path
            d="M62 26 A24 24 0 1 0 74 68 A26 26 0 0 1 62 26 Z"
            fill="url(#moonGradLive)"
          />
          {/* Twinkling ambient stars */}
          <circle cx="70" cy="30" r="2" fill="#ffd54f">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="72" r="1.5" fill="#ffd54f">
            <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <defs>
            <linearGradient id="moonGradLive" x1="30" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff8e1" />
              <stop offset="0.5" stopColor="#ffe082" />
              <stop offset="1" stopColor="#ffb300" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Clouds / Overcast / Broken
  const hasSun = norm.includes('partly') || norm.includes('scattered') || norm.includes('sun');
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
        {hasSun && (
          <circle cx="68" cy="38" r="16" fill="url(#sunCloudGradLive)" />
        )}
        <path
          d="M24 64 A16 16 0 0 1 36 38 A24 24 0 0 1 74 42 A18 18 0 0 1 76 64 Z"
          fill="url(#frontCloudGradLive)"
        />
        <defs>
          <linearGradient id="sunCloudGradLive" x1="50" y1="25" x2="85" y2="55" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fef08a" />
            <stop offset="0.6" stopColor="#fbbc04" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="frontCloudGradLive" x1="25" y1="35" x2="80" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#e8eaed" />
            <stop offset="1" stopColor="#9aa0a6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
