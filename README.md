# Service Status Tracker

A standalone web app that lets customers track their vehicle's service progress in real time. Built as a lightweight extraction from the [consumer-8](https://github.com/xtime-asia-pacific/consumer-8) platform.

![Status: Active](https://img.shields.io/badge/status-active-brightgreen)
![Stack: React + Vite](https://img.shields.io/badge/stack-React%20%2B%20Vite-blue)
![Node: 16+](https://img.shields.io/badge/node-16%2B-green)

---

## What it does

Customers receive a link (e.g. via SMS or email) with their reservation ID embedded. Opening the link shows:

- **Live service status** — 5-stage progress bar (Arrival → Inspection → Service → Final touches → Ready for pick up)
- **Service advisor** — name, phone, email with click-to-call
- **Notification preferences** — toggle SMS/email updates on or off
- **Vehicle + dealer info** — shown in the hero banner

---

## Quick start

```bash
# Double-click launcher (macOS)
open RunStatusTracker.command

# Or from terminal
cd ~/Desktop/status-tracker
source ~/.nvm/nvm.sh   # if using nvm
npm install
npm start
```

Then open:
```
http://localhost:5173/?reservationId=123456789&webKey=FORD01
```

---

## Changing the mock status

Edit **one line** in `src/mockData.js` — the browser hot-reloads instantly:

```js
appointmentStatus: 'servicing',  // ← change this
```

| Value | Steps complete | Badge |
|---|---|---|
| `'arrived'` | Step 1 | Arrival |
| `'inspecting'` | Steps 1–2, step 2 active | Inspection |
| `'servicing'` | Steps 1–3, step 3 active | Service |
| `'final inspection'` | Steps 1–4, step 4 active | Final touches |
| `'completed'` | All 5 done | Ready for pick up |

---

## Project structure

```
status-tracker/
├── index.html                  Entry HTML
├── vite.config.js              Vite config + API proxy
├── package.json
├── .env.local                  Local env vars (not committed)
├── RunStatusTracker.command    macOS double-click launcher
│
├── public/
│   └── img/
│       └── logo.png            Dealer logo
│
└── src/
    ├── main.jsx                React entry point
    ├── App.jsx                 Root component — data loading + layout
    ├── api.js                  All API calls (mock + production)
    ├── mockData.js             Mock API response data
    ├── styles.css              All styles (single file, CSS variables)
    └── components/
        ├── StepProgressBar.jsx 5-stage progress indicator
        ├── AdvisorCard.jsx     Service advisor info card
        └── NotificationToggles.jsx SMS/email preference toggles
```

---

## Environment variables

Create `.env.local` in the project root:

```env
# Enable mock mode (no backend required)
VITE_MOCK_MODE=true

# XTCON backend host (for production)
# XTCON_HOST=https://your-xtcon-host.com
```

---

## Connecting to production

See [API.md](./API.md) for the full endpoint reference.

The short version — set in `.env.local`:

```env
VITE_MOCK_MODE=false
XTCON_HOST=https://your-production-xtcon-host.com
```

URL parameters passed in the customer link:

| Param | Required | Description |
|---|---|---|
| `reservationId` | Yes | Appointment ID |
| `webKey` | Yes | Dealer identifier |
| `tokenId` | No | Auth token for protected endpoints |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | React 18 | Component model, hooks |
| Build tool | Vite 4 | Fast HMR, simple config, Node 16 compatible |
| Styling | Plain CSS + custom properties | No preprocessor, zero deps |
| State | `useState` / `useEffect` | No Redux needed for this scope |
| API | Native `fetch` | No axios dep |
| Types | None (plain JS) | Simplicity |

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

---

## Compared to consumer-8

This app does one thing — show service status. Everything else is removed:

| consumer-8 | Status Tracker standalone |
|---|---|
| Redux store + reducers | `useState` / `useEffect` |
| react-intl (i18n) | Hardcoded EN strings |
| Flow types | Plain JavaScript |
| Bootstrap + reactstrap | Pure CSS |
| XWS proxy + axios config | Direct `fetch` in `api.js` |
| 34 brand themes | CSS variables |
| 200+ components | 3 components |
| ~15,000 lines | ~400 lines |
