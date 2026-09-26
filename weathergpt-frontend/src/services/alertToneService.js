/**
 * WeatherGPT Emergency Siren & Mobile Alert Notification Service
 * Integrates project alert audio (/sounds/alert-tone.mp3 & /sounds/alert-toon.mp3)
 * with Web Audio API EAS fallback, user mute controls, and mobile Web Push/Notifications.
 */

const SOUND_PATHS = [
  '/sounds/alert-tone.mp3',
  '/sounds/alert-toon.mp3'
];

let globalAudioInstance = null;
let webAudioCtx = null;
let webAudioOscillators = [];
let lastPlayedAlertKey = null;
let lastPlayTimestamp = 0;

/**
 * Check if alert sound is muted by user preference
 */
export function isSoundMuted() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('weathergpt_alert_sound_muted') === 'true';
}

/**
 * Toggle sound mute state
 */
export function setSoundMuted(muted) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('weathergpt_alert_sound_muted', muted ? 'true' : 'false');
  if (muted) {
    stopAlertSiren();
  }
  window.dispatchEvent(new CustomEvent('weathergpt-alert-sound-mute-changed', { detail: { muted } }));
}

/**
 * Check if Web Notifications are supported in current browser
 */
export function isPushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission
 */
export function getPushPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Check if mobile/browser push notifications are enabled by user
 */
export function isPushEnabled() {
  if (typeof window === 'undefined') return false;
  const pref = localStorage.getItem('weathergpt_mobile_push_enabled');
  return pref !== 'false' && getPushPermission() === 'granted';
}

/**
 * Set mobile/browser push notification preference
 */
export async function setPushEnabled(enabled) {
  if (typeof window === 'undefined') return false;
  if (enabled) {
    if (isPushSupported() && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        localStorage.setItem('weathergpt_mobile_push_enabled', 'false');
        return false;
      }
    }
    localStorage.setItem('weathergpt_mobile_push_enabled', 'true');
    window.dispatchEvent(new CustomEvent('weathergpt-push-pref-changed', { detail: { enabled: true } }));
    return true;
  } else {
    localStorage.setItem('weathergpt_mobile_push_enabled', 'false');
    window.dispatchEvent(new CustomEvent('weathergpt-push-pref-changed', { detail: { enabled: false } }));
    return false;
  }
}

/**
 * Synthesizes an emergency dual-frequency siren tone (853 Hz + 960 Hz EAS standard)
 * as high-fidelity fallback if audio file cannot be loaded or is blocked.
 */
function playSynthesizedEASSiren() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    if (!webAudioCtx || webAudioCtx.state === 'closed') {
      webAudioCtx = new AudioContext();
    }
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume();
    }

    // Stop any existing synthesized sound
    stopSynthesizedEASSiren();

    const now = webAudioCtx.currentTime;
    const gainNode = webAudioCtx.createGain();
    gainNode.gain.setValueAtTime(0.18, now);

    // EAS standard dual tones: 853 Hz and 960 Hz
    const osc1 = webAudioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(853, now);

    const osc2 = webAudioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(960, now);

    // Pulse modulation
    const lfo = webAudioCtx.createOscillator();
    const lfoGain = webAudioCtx.createGain();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(2, now); // 2Hz pulse siren
    lfoGain.gain.setValueAtTime(0.08, now);

    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(webAudioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    webAudioOscillators = [osc1, osc2, lfo];

    // Auto stop after 4.5 seconds to avoid annoyance
    setTimeout(() => {
      stopSynthesizedEASSiren();
    }, 4500);
  } catch (err) {
    console.debug('Synthesized siren fallback notice:', err);
  }
}

function stopSynthesizedEASSiren() {
  if (webAudioOscillators && webAudioOscillators.length > 0) {
    webAudioOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    webAudioOscillators = [];
  }
}

/**
 * Play the official Emergency Siren Tone (Alert-toon)
 * @param {boolean} force - If true, bypasses mute check (used by "Test Siren Tone")
 */
export async function playAlertSiren(force = false) {
  if (!force && isSoundMuted()) {
    console.debug('Emergency siren muted by user setting.');
    return;
  }

  // Prevent back-to-back overlapping audio spam within 2 seconds
  const now = Date.now();
  if (!force && now - lastPlayTimestamp < 2000) {
    return;
  }
  lastPlayTimestamp = now;

  try {
    if (globalAudioInstance) {
      globalAudioInstance.pause();
      globalAudioInstance.currentTime = 0;
    }

    const audioUrl = SOUND_PATHS[0];
    globalAudioInstance = new Audio(audioUrl);
    globalAudioInstance.volume = 0.85;

    const playPromise = globalAudioInstance.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio element play interrupted or blocked by browser policy, using EAS synth tone:', err);
        playSynthesizedEASSiren();
      });
    }
  } catch (err) {
    console.warn('Audio initialization failed, playing synthesized EAS siren:', err);
    playSynthesizedEASSiren();
  }
}

/**
 * Stop any running alert siren
 */
export function stopAlertSiren() {
  try {
    if (globalAudioInstance) {
      globalAudioInstance.pause();
      globalAudioInstance.currentTime = 0;
    }
  } catch {}
  stopSynthesizedEASSiren();
}

/**
 * Send native push notification to mobile phone / browser with emergency vibration
 */
export function sendMobilePushNotification({ title, body, icon, tag, data }) {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }
  if (localStorage.getItem('weathergpt_mobile_push_enabled') === 'false') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body: body || 'Severe meteorological alert issued for your monitored area.',
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `weathergpt-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 450], // Standard mobile emergency vibration cadence
      data: data || { url: window.location.origin + '/dashboard' }
    });

    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (this.data && this.data.url) {
        window.location.href = this.data.url;
      }
      this.close();
    };

    return true;
  } catch (err) {
    console.warn('Mobile browser push notification failed:', err);
    return false;
  }
}

/**
 * Trigger comprehensive emergency alert:
 * - Plays siren audio (if unmuted)
 * - Sends mobile phone notification with vibration
 * - Dispatches window event
 *
 * @param {object} options
 * @param {string} options.title - Alert title
 * @param {string} options.body - Alert description
 * @param {string} options.alertId - Unique key to guarantee it alerts once ("alert ay ak bar")
 * @param {boolean} options.force - Force audio even if muted
 * @param {boolean} options.isReport - Whether triggered by a community incident report
 */
export function triggerSevereWeatherAlert({
  title = 'Severe Meteorological Alert',
  body = 'Heavy rainfall & severe weather conditions detected in your area.',
  alertId = null,
  force = false,
  isReport = false,
  data = null
}) {
  const alertKey = alertId || `${title}-${body}`.slice(0, 40);

  // Guarantee single alert per event key ("alert ay ak bar")
  if (!force && lastPlayedAlertKey === alertKey) {
    return;
  }
  lastPlayedAlertKey = alertKey;

  // 1. Play siren tone
  playAlertSiren(force);

  // 2. Send Mobile Phone Push Notification with vibration
  sendMobilePushNotification({
    title: isReport ? `🚨 Citizen Incident Report: ${title}` : `⚠️ ${title}`,
    body,
    tag: `alert-${alertKey}`,
    data: data || { url: window.location.origin + (isReport ? '/community-reports' : '/dashboard') }
  });

  // 3. Dispatch global event for UI badges
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('weathergpt-emergency-alert-fired', {
        detail: { title, body, alertId: alertKey, isReport, timestamp: Date.now() }
      })
    );
  }
}
