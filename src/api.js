// ── API client ───────────────────────────────────────────────────────────────
// The frontend calls our own Express server (/api/*).
// All Xtime authentication happens server-side — credentials and tokens
// are never sent to or stored in the browser.
//
// Mock mode: set VITE_MOCK_MODE=true in .env.local — no network calls at all.

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

import { mockTrackerData, mockPreferences } from './mockData';

async function apiFetch(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`);
  return res.json();
}

// GET /api/status?reservationId=&webKey=
// Fetches live appointment status — call this first when the page loads.
// Hits: {xtHost}/panama/rest/dealerxt/{webKey}/appointment/{reservationId}/updateReservationStatus
export async function getStatus({ reservationId, webKey }) {
  if (MOCK_MODE) return null; // mock mode gets status from tracker data
  return apiFetch(`/api/status?reservationId=${reservationId}&webKey=${webKey}`);
}

// GET /api/tracker?reservationId=&webKey=&country=&language=
export async function getTrackerData({ reservationId, webKey, country = 'AU', language = 'en_AU' }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => resolve(mockTrackerData), 400));
  }
  return apiFetch(`/api/tracker?reservationId=${reservationId}&webKey=${webKey}&country=${country}&language=${language}`);
}

// GET /api/preferences?webKey=&personId=
export async function getPreferences({ webKey, personId }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => resolve(mockPreferences), 200));
  }
  return apiFetch(`/api/preferences?webKey=${webKey}&personId=${personId}`);
}

// POST /api/preferences  { webKey, personId, notificationType, enabled }
export async function updatePreference({ personId, webKey, notificationType, enabled }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 200));
  }
  const res = await fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webKey, personId, notificationType, enabled }),
  });
  if (!res.ok) throw new Error(`Preference update failed (${res.status})`);
  return res.json();
}
