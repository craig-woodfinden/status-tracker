// ── Token Cache ──────────────────────────────────────────────────────────────
// Holds the JWT and per-webKey xtTokens in memory.
// Handles refresh automatically so the server re-authenticates transparently.

const fetch = require('node-fetch');

const LOGIN_URL = process.env.XTIME_LOGIN_URL || 'https://login.vela.net.au/';

let _jwt = null;          // { accessToken, refreshToken, expiresAt }
let _xtTokens = {};       // { [webKey]: { xtToken, xtHost, expiresAt } }

// JWT tokens are valid ~1 hour — refresh 5 minutes early to avoid edge cases
const JWT_TTL_MS   = 55 * 60 * 1000;
// xtTokens are short-lived one-time use tokens — treat them as single-use
const XT_TTL_MS    = 10 * 60 * 1000;

// ── Internal helpers ─────────────────────────────────────────────────────────

async function _loginFresh() {
  const username = process.env.XTIME_USERNAME;
  const password = process.env.XTIME_PASSWORD;

  if (!username || !password) {
    throw new Error('XTIME_USERNAME and XTIME_PASSWORD must be set in environment');
  }

  console.log('[auth] Logging in to Xtime...');
  const res = await fetch(`${LOGIN_URL}rest/login/jwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Login failed: ${JSON.stringify(json)}`);
  }

  _jwt = {
    accessToken:  json.data.accessToken,
    refreshToken: json.data.refreshToken,
    expiresAt:    Date.now() + JWT_TTL_MS,
  };
  console.log('[auth] JWT obtained, valid for ~55 minutes');
  return _jwt;
}

async function _refreshJwt() {
  if (!_jwt) return _loginFresh();

  console.log('[auth] Refreshing JWT...');
  const res = await fetch(`${LOGIN_URL}rest/login/jwt/refresh`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_jwt.refreshToken}`,
    },
  });

  if (!res.ok) {
    console.log('[auth] Refresh failed, falling back to full login');
    return _loginFresh();
  }

  const json = await res.json();
  _jwt = {
    accessToken:  json.accessToken,
    refreshToken: json.refreshToken,
    expiresAt:    Date.now() + JWT_TTL_MS,
  };
  console.log('[auth] JWT refreshed');
  return _jwt;
}

// ── Public: get a valid JWT accessToken ─────────────────────────────────────

async function getAccessToken() {
  if (!_jwt || Date.now() >= _jwt.expiresAt) {
    await _refreshJwt();
  }
  return _jwt.accessToken;
}

// ── Public: get a valid xtToken + xtHost for a webKey ───────────────────────

async function getXtToken(webKey) {
  const cached = _xtTokens[webKey];
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const accessToken = await getAccessToken();

  console.log(`[auth] Exchanging JWT for xtToken (webKey: ${webKey})...`);
  const res = await fetch(`${LOGIN_URL}rest/login/jwt/xtaccess/webkey/${webKey}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // If 401, the JWT may have just expired — retry once with a fresh login
  if (res.status === 401) {
    console.log('[auth] 401 on xtaccess, refreshing JWT and retrying...');
    await _loginFresh();
    return getXtToken(webKey);
  }

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`xtaccess failed for ${webKey}: ${JSON.stringify(json)}`);
  }

  const entry = {
    xtToken:   json.data.xtToken,
    xtHost:    json.data.xtHost,
    expiresAt: Date.now() + XT_TTL_MS,
  };
  _xtTokens[webKey] = entry;
  console.log(`[auth] xtToken obtained for ${webKey}, xtHost: ${entry.xtHost}`);
  return entry;
}

// ── Public: invalidate cached xtToken for a webKey (e.g. after 401) ─────────

function invalidateXtToken(webKey) {
  delete _xtTokens[webKey];
}

module.exports = { getAccessToken, getXtToken, invalidateXtToken };
