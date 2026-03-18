// ── Status Tracker API Server ────────────────────────────────────────────────
// Sits between the React frontend and the Xtime XTCON backend.
// Handles all authentication silently — the browser never sees credentials or tokens.
//
// Endpoints:
//   GET  /api/status?reservationId=123&webKey=australiaford        ← call on page load
//   GET  /api/tracker?reservationId=123&webKey=australiaford       ← full tracker data
//   GET  /api/preferences?webKey=australiaford&personId=987654
//   POST /api/preferences { webKey, personId, notificationType, enabled }
//   GET  /api/link?reservationId=123&webKey=australiaford
//   POST /api/link/from-appointment
//   GET  /api/health
//
// Xtime API path families:
//   /consumer/rest/...   — status tracker, customer preferences
//   /panama/rest/...     — appointment status, dealer operations

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const express = require('express');
const fetch   = require('node-fetch');
const { getXtToken, invalidateXtToken } = require('./tokenCache');

const app  = express();
const PORT = process.env.SERVER_PORT || 3001;
const TRACKER_BASE_URL = (process.env.TRACKER_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

app.use(express.json());

// ── Xtime status → normalized tracker status ──────────────────────────────────
// Xtime returns uppercase_underscore statuses. We normalize to snake_case keys
// that match the step bar labels in the frontend.
//
// Xtime status        Normalized       Step label
// ─────────────────── ──────────────── ─────────────
// NOT_ARRIVED         not_arrived      Not Arrived
// CHECKED_IN          arrived          Arrived
// ARRIVED             in_progress      In Progress
// WITH_ADVISOR        in_progress      In Progress
// PENDING_CUSTOMER_AUTORIZATION
//                     wash_bay         Wash Bay
// COMPLETED           vehicle_ready    Vehicle Ready

const XTIME_STATUS_MAP = {
  NOT_ARRIVED:                    'not_arrived',
  CHECKED_IN:                     'arrived',
  ARRIVED:                        'in_progress',
  WITH_ADVISOR:                   'in_progress',
  PENDING_CUSTOMER_AUTORIZATION:  'wash_bay',
  COMPLETED:                      'vehicle_ready',
};

function mapStatus(xtimeStatus) {
  if (!xtimeStatus) return 'not_arrived';
  return XTIME_STATUS_MAP[xtimeStatus] || xtimeStatus.toLowerCase();
}

// ── Core fetch helper ─────────────────────────────────────────────────────────
// Accepts the full path relative to xtHost (no prefix assumed).
// Retries once with a fresh token on 401.

async function xtFetch(webKey, fullPath, method = 'GET') {
  const { xtToken, xtHost } = await getXtToken(webKey);
  const base = xtHost.replace(/\/$/, '');

  // Inject tokenId into query string
  const separator = fullPath.includes('?') ? '&' : '?';
  const url = `${base}/${fullPath}${separator}tokenId=${xtToken}`;

  let res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 401) {
    console.log(`[auth] 401 on ${fullPath} — refreshing token for ${webKey}`);
    invalidateXtToken(webKey);
    const retry = await getXtToken(webKey);
    const retryBase = retry.xtHost.replace(/\/$/, '');
    const retryUrl = `${retryBase}/${fullPath}${separator}tokenId=${retry.xtToken}`;
    res = await fetch(retryUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return res;
}

// ── GET /api/status ───────────────────────────────────────────────────────────
// Called when the customer opens their tracker link.
// Hits the updateReservationStatus endpoint to fetch the live appointment status.
//
// Xtime endpoint:
//   GET {xtHost}/panama/rest/dealerxt/{webKey}/appointment/{reservationId}/updateReservationStatus

app.get('/api/status', async (req, res) => {
  const { reservationId, webKey } = req.query;

  if (!reservationId || !webKey) {
    return res.status(400).json({ error: 'reservationId and webKey are required' });
  }

  try {
    const upstream = await xtFetch(
      webKey,
      `panama/rest/dealerxt/${webKey}/appointment/${reservationId}/updateReservationStatus`
    );

    const data = await upstream.json();

    // Normalize the Xtime status to the tracker's internal format
    const rawStatus = data.status || data.appointmentStatus;
    const normalizedStatus = mapStatus(rawStatus);
    console.log(`[status] dealer=${webKey} reservation=${reservationId} raw=${rawStatus} → ${normalizedStatus}`);

    res.status(upstream.status).json({
      ...data,
      appointmentStatus: normalizedStatus,
      rawStatus,
    });
  } catch (err) {
    console.error('[/api/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tracker ──────────────────────────────────────────────────────────
// Returns the full tracker data (advisor, vehicle, dealer, notification flags).
//
// Xtime endpoint:
//   GET {xtHost}/consumer/rest/statustracker/appointment/{reservationId}/details

app.get('/api/tracker', async (req, res) => {
  const { reservationId, webKey, country = 'AU', language = 'en_AU' } = req.query;

  if (!reservationId || !webKey) {
    return res.status(400).json({ error: 'reservationId and webKey are required' });
  }

  try {
    const upstream = await xtFetch(
      webKey,
      `consumer/rest/statustracker/appointment/${reservationId}/details?webKey=${webKey}&country=${country}&language=${language}`
    );

    const data = await upstream.json();

    // Normalize status field — tracker endpoint may return appointmentStatus or status
    const rawStatus = data.appointmentStatus || data.status;
    const normalizedStatus = mapStatus(rawStatus);
    console.log(`[tracker] dealer=${webKey} reservation=${reservationId} raw=${rawStatus} → ${normalizedStatus}`);

    res.status(upstream.status).json({
      ...data,
      appointmentStatus: normalizedStatus,
      rawStatus,
    });
  } catch (err) {
    console.error('[/api/tracker]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/preferences ──────────────────────────────────────────────────────

app.get('/api/preferences', async (req, res) => {
  const { webKey, personId } = req.query;

  if (!webKey || !personId) {
    return res.status(400).json({ error: 'webKey and personId are required' });
  }

  try {
    const upstream = await xtFetch(
      webKey,
      `consumer/rest/customer/preferences/${webKey}/${personId}`
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/preferences GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/preferences ─────────────────────────────────────────────────────

app.post('/api/preferences', async (req, res) => {
  const { webKey, personId, notificationType, enabled } = req.body;

  if (!webKey || !personId || !notificationType || enabled === undefined) {
    return res.status(400).json({ error: 'webKey, personId, notificationType, enabled are required' });
  }

  const action = enabled ? 'enable' : 'disable';

  try {
    const upstream = await xtFetch(
      webKey,
      `consumer/rest/customer/${personId}/dealer/${webKey}/preference/${notificationType}/${action}`,
      'POST'
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/preferences POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/link ─────────────────────────────────────────────────────────────

app.get('/api/link', (req, res) => {
  const { reservationId, webKey } = req.query;

  if (!reservationId || !webKey) {
    return res.status(400).json({ error: 'reservationId and webKey are required' });
  }

  const url = `${TRACKER_BASE_URL}/?reservationId=${reservationId}&webKey=${webKey}`;
  res.json({ url, reservationId, webKey });
});

// ── POST /api/link/from-appointment ──────────────────────────────────────────
// Accepts the raw appointment create response + webKey (or appointmentUrl).
// Returns the customer-ready tracker URL.
//
// Option A — webKey explicit:
//   { success, reservationId, confKey, apptDateTime, webKey }
//
// Option B — extract webKey from URL:
//   { success, reservationId, confKey, apptDateTime, appointmentUrl }
//   appointmentUrl: "https://x9.vela.net.au/panama/rest/dealerxt/australiaford/appointment/create"

function extractWebKeyFromUrl(appointmentUrl) {
  try {
    const match = appointmentUrl.match(/\/dealerxt\/([^/]+)\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

app.post('/api/link/from-appointment', (req, res) => {
  const { success, reservationId, confKey, apptDateTime, appointmentUrl } = req.body;
  let { webKey } = req.body;

  if (!webKey && appointmentUrl) {
    webKey = extractWebKeyFromUrl(appointmentUrl);
  }

  if (!success) {
    return res.status(400).json({ error: 'Appointment was not successful — no link generated' });
  }
  if (!reservationId) {
    return res.status(400).json({ error: 'reservationId missing from appointment response' });
  }
  if (!webKey) {
    return res.status(400).json({
      error: 'webKey required — pass "webKey" directly or "appointmentUrl" containing /dealerxt/{webKey}/'
    });
  }

  const url = `${TRACKER_BASE_URL}/?reservationId=${reservationId}&webKey=${webKey}`;
  console.log(`[link] dealer=${webKey} reservation=${reservationId} → ${url}`);
  res.json({ url, reservationId, confKey, apptDateTime, webKey });
});

// ── GET /api/health ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    trackerBaseUrl: TRACKER_BASE_URL,
    loginUrl: process.env.XTIME_LOGIN_URL || 'https://login.vela.net.au/',
    credentials: process.env.XTIME_USERNAME ? 'loaded' : 'missing',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nStatus Tracker server  →  http://localhost:${PORT}`);
  console.log('Credentials:', process.env.XTIME_USERNAME ? 'loaded ✓' : 'WARNING: not set');
  console.log('Login URL:  ', process.env.XTIME_LOGIN_URL || 'https://login.vela.net.au/');
  console.log('Tracker URL:', TRACKER_BASE_URL);
  console.log('\nEndpoints:');
  console.log(`  GET  /api/status?reservationId=&webKey=       ← call on page load`);
  console.log(`  GET  /api/tracker?reservationId=&webKey=`);
  console.log(`  GET  /api/link?reservationId=&webKey=`);
  console.log(`  POST /api/link/from-appointment`);
  console.log(`  GET  /api/preferences?webKey=&personId=`);
  console.log(`  POST /api/preferences`);
  console.log(`  GET  /api/health\n`);
});
