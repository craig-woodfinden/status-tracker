// ── API client ───────────────────────────────────────────────────────────────
//
// Production:  calls your backend via /api proxy (see vite.config.js)
//              Original XTCON endpoint:
//                GET /rest/statustracker/appointment/{reservationId}/details
//                  ?webKey=FORD01&country=AU&language=en_AU&tokenId=<token>
//
// Mock mode:   set VITE_MOCK_MODE=true in .env.local — no network calls
//
// To swap in a different backend, just update BASE_URL and the fetch calls below.

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
const BASE_URL = '/api';

// ── Mock data ────────────────────────────────────────────────────────────────
import { mockTrackerData, mockPreferences } from './mockData';

// ── Fetch wrapper ────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ── Status Tracker ───────────────────────────────────────────────────────────
// GET /rest/statustracker/appointment/{reservationId}/details
// Query params: webKey, country, language, tokenId
export async function getTrackerData({ reservationId, webKey, country = 'AU', language = 'en_AU', tokenId }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => resolve(mockTrackerData), 400));
  }
  return apiFetch(
    `/rest/statustracker/appointment/${reservationId}/details`,
    { method: 'GET', headers: tokenId ? { Authorization: `Bearer ${tokenId}` } : {} },
  ).then(data => {
    // attach query context back (some consumers need webKey)
    return { ...data, _webKey: webKey };
  });
}

// ── Notification preferences ─────────────────────────────────────────────────
// GET /rest/customer/preferences/{webKey}/{personId}
export async function getPreferences({ webKey, personId }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => resolve(mockPreferences), 200));
  }
  return apiFetch(`/rest/customer/preferences/${webKey}/${personId}`);
}

// POST /rest/customer/{personId}/dealer/{webKey}/preference/{notificationType}/{action}
// notificationType: 'email' | 'text'   action: 'enable' | 'disable'
export async function updatePreference({ personId, webKey, notificationType, enabled }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 200));
  }
  const action = enabled ? 'enable' : 'disable';
  return apiFetch(
    `/rest/customer/${personId}/dealer/${webKey}/preference/${notificationType}/${action}`,
    { method: 'POST' }
  );
}
