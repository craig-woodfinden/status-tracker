// ── Status Tracker API Server ────────────────────────────────────────────────
// Sits between the React frontend and the Xtime XTCON backend.
// Handles all authentication silently — the browser never sees credentials or tokens.
//
// Endpoints:
//   GET  /api/tracker?reservationId=123&webKey=australiaford
//   GET  /api/preferences?webKey=australiaford&personId=987654
//   POST /api/preferences { webKey, personId, notificationType, enabled }
//   GET  /api/link?reservationId=123&webKey=australiaford
//   POST /api/link/from-appointment  (accepts raw appointment create response body)
//   GET  /api/health

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const express = require('express');
const fetch   = require('node-fetch');
const { getXtToken, invalidateXtToken } = require('./tokenCache');

const app  = express();
const PORT = process.env.SERVER_PORT || 3001;

// Base URL of the deployed tracker frontend — used when generating customer links
// Set TRACKER_BASE_URL in .env.local for production (e.g. https://tracker.yourdomain.com)
const TRACKER_BASE_URL = (process.env.TRACKER_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

app.use(express.json());

// ── Helper: call XTCON with a given path, auto-retry once on 401 ─────────────

async function xtconGet(webKey, path, country = 'AU', language = 'en_AU') {
  const { xtToken, xtHost } = await getXtToken(webKey);
  const url = `${xtHost.replace(/\/$/, '')}/consumer/${path}`;

  let res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });

  if (res.status === 401) {
    invalidateXtToken(webKey);
    const retry = await getXtToken(webKey);
    const retryUrl = `${retry.xtHost.replace(/\/$/, '')}/consumer/${path.replace(xtToken, retry.xtToken)}`;
    res = await fetch(retryUrl, { headers: { 'Content-Type': 'application/json' } });
  }

  return res;
}

async function xtconPost(webKey, path) {
  const { xtToken, xtHost } = await getXtToken(webKey);
  const url = `${xtHost.replace(/\/$/, '')}/consumer/${path}`;
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
}

// ── GET /api/tracker ─────────────────────────────────────────────────────────

app.get('/api/tracker', async (req, res) => {
  const { reservationId, webKey, country = 'AU', language = 'en_AU' } = req.query;

  if (!reservationId || !webKey) {
    return res.status(400).json({ error: 'reservationId and webKey are required' });
  }

  try {
    const { xtToken, xtHost } = await getXtToken(webKey);
    const upstream = await xtconGet(
      webKey,
      `rest/statustracker/appointment/${reservationId}/details?webKey=${webKey}&country=${country}&language=${language}&tokenId=${xtToken}`
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/tracker]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/preferences ─────────────────────────────────────────────────────

app.get('/api/preferences', async (req, res) => {
  const { webKey, personId } = req.query;

  if (!webKey || !personId) {
    return res.status(400).json({ error: 'webKey and personId are required' });
  }

  try {
    const { xtToken } = await getXtToken(webKey);
    const upstream = await xtconGet(webKey, `rest/customer/preferences/${webKey}/${personId}?tokenId=${xtToken}`);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/preferences GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/preferences ────────────────────────────────────────────────────

app.post('/api/preferences', async (req, res) => {
  const { webKey, personId, notificationType, enabled } = req.body;

  if (!webKey || !personId || !notificationType || enabled === undefined) {
    return res.status(400).json({ error: 'webKey, personId, notificationType, enabled are required' });
  }

  const action = enabled ? 'enable' : 'disable';

  try {
    const { xtToken } = await getXtToken(webKey);
    const upstream = await xtconPost(
      webKey,
      `rest/customer/${personId}/dealer/${webKey}/preference/${notificationType}/${action}?tokenId=${xtToken}`
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/preferences POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/link ─────────────────────────────────────────────────────────────
// Generate the customer-facing tracker URL from a reservationId + webKey.
//
// Example:
//   GET /api/link?reservationId=69542875560&webKey=australiaford
//   → { url: "https://tracker.yourdomain.com/?reservationId=69542875560&webKey=australiaford" }

app.get('/api/link', (req, res) => {
  const { reservationId, webKey } = req.query;

  if (!reservationId || !webKey) {
    return res.status(400).json({ error: 'reservationId and webKey are required' });
  }

  const url = `${TRACKER_BASE_URL}/?reservationId=${reservationId}&webKey=${webKey}`;
  res.json({ url, reservationId, webKey });
});

// ── POST /api/link/from-appointment ──────────────────────────────────────────
// Accepts the raw response body from the Xtime appointment create API and
// returns the ready-to-send customer tracker URL.
//
// Appointment create response shape (from x9.vela.net.au):
//   { success: true, reservationId: 69542875560, confKey: "X09OBV47Z6", apptDateTime: "...", ... }
//
// Call this immediately after appointment creation — pass the full response body
// along with the webKey for the dealer.
//
// Example:
//   POST /api/link/from-appointment
//   { "success": true, "reservationId": 69542875560, "confKey": "X09OBV47Z6", "webKey": "australiaford" }
//
//   → {
//       url: "https://tracker.yourdomain.com/?reservationId=69542875560&webKey=australiaford",
//       reservationId: 69542875560,
//       confKey: "X09OBV47Z6",
//       apptDateTime: "2026-03-18 12:30:00"
//     }

app.post('/api/link/from-appointment', (req, res) => {
  const { success, reservationId, confKey, apptDateTime, webKey } = req.body;

  if (!success) {
    return res.status(400).json({ error: 'Appointment was not successful — no link generated' });
  }

  if (!reservationId) {
    return res.status(400).json({ error: 'reservationId missing from appointment response' });
  }

  if (!webKey) {
    return res.status(400).json({ error: 'webKey is required (e.g. "australiaford")' });
  }

  const url = `${TRACKER_BASE_URL}/?reservationId=${reservationId}&webKey=${webKey}`;

  console.log(`[link] Generated tracker link for reservation ${reservationId}: ${url}`);

  res.json({
    url,
    reservationId,
    confKey,
    apptDateTime,
    webKey,
  });
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
  console.log(`\nStatus Tracker server running on http://localhost:${PORT}`);
  console.log('Credentials:', process.env.XTIME_USERNAME ? 'loaded ✓' : 'WARNING: not set (mock mode only)');
  console.log('Login URL:  ', process.env.XTIME_LOGIN_URL || 'https://login.vela.net.au/ (default)');
  console.log('Tracker URL:', TRACKER_BASE_URL);
  console.log('\nEndpoints:');
  console.log(`  GET  /api/tracker?reservationId=&webKey=`);
  console.log(`  GET  /api/link?reservationId=&webKey=`);
  console.log(`  POST /api/link/from-appointment`);
  console.log(`  GET  /api/preferences?webKey=&personId=`);
  console.log(`  POST /api/preferences`);
  console.log(`  GET  /api/health\n`);
});
