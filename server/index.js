// ── Status Tracker API Server ────────────────────────────────────────────────
// Sits between the React frontend and the Xtime XTCON backend.
// Handles all authentication silently — the browser never sees credentials or tokens.
//
// Endpoints:
//   GET  /api/tracker?reservationId=123&webKey=FORD01&country=AU&language=en_AU
//   GET  /api/preferences?webKey=FORD01&personId=987654
//   POST /api/preferences { webKey, personId, notificationType, enabled }

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const express = require('express');
const fetch   = require('node-fetch');
const { getXtToken, invalidateXtToken } = require('./tokenCache');

const app  = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(express.json());

// ── Helper ───────────────────────────────────────────────────────────────────

async function xtconFetch(xtHost, path, options = {}) {
  const url = `${xtHost.replace(/\/$/, '')}/consumer/${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res;
}

// ── GET /api/tracker ─────────────────────────────────────────────────────────

app.get('/api/tracker', async (req, res) => {
  const { reservationId, webKey, country = 'AU', language = 'en_AU' } = req.query;

  if (!reservationId || !webKey) {
    return res.status(400).json({ error: 'reservationId and webKey are required' });
  }

  try {
    const { xtToken, xtHost } = await getXtToken(webKey);

    const upstream = await xtconFetch(
      xtHost,
      `rest/statustracker/appointment/${reservationId}/details?webKey=${webKey}&country=${country}&language=${language}&tokenId=${xtToken}`
    );

    // If XTCON returns 401, our xtToken has expired — invalidate and retry once
    if (upstream.status === 401) {
      invalidateXtToken(webKey);
      const retry = await getXtToken(webKey);
      const retryUpstream = await xtconFetch(
        retry.xtHost,
        `rest/statustracker/appointment/${reservationId}/details?webKey=${webKey}&country=${country}&language=${language}&tokenId=${retry.xtToken}`
      );
      const data = await retryUpstream.json();
      return res.status(retryUpstream.status).json(data);
    }

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
    const { xtToken, xtHost } = await getXtToken(webKey);

    const upstream = await xtconFetch(
      xtHost,
      `rest/customer/preferences/${webKey}/${personId}?tokenId=${xtToken}`
    );

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
    const { xtToken, xtHost } = await getXtToken(webKey);

    const upstream = await xtconFetch(
      xtHost,
      `rest/customer/${personId}/dealer/${webKey}/preference/${notificationType}/${action}?tokenId=${xtToken}`,
      { method: 'POST' }
    );

    const data = await upstream.json();
    res.status(upstream.status).json(data);

  } catch (err) {
    console.error('[/api/preferences POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nStatus Tracker server running on http://localhost:${PORT}`);
  console.log('Mode:', process.env.XTIME_USERNAME ? 'LIVE (Xtime credentials loaded)' : 'WARNING: No credentials set');
  console.log('Login URL:', process.env.XTIME_LOGIN_URL || 'https://login.vela.net.au/ (default)');
  console.log('\nEndpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/tracker?reservationId=&webKey=`);
  console.log(`  GET  http://localhost:${PORT}/api/preferences?webKey=&personId=`);
  console.log(`  POST http://localhost:${PORT}/api/preferences`);
  console.log(`  GET  http://localhost:${PORT}/api/health\n`);
});
