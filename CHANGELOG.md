# Changelog

All notable changes to this project are documented here.

---

## [1.0.0] — 2026-03-18

### Added
- Initial standalone extraction from consumer-8
- 5-stage service progress bar (Arrival → Inspection → Service → Final touches → Ready for pick up)
- Dark navy hero banner with vehicle label, status badge, and reservation ref number
- Service advisor card with avatar initial, click-to-call phone, email
- SMS/email notification preference toggles (wired to XTCON preference API)
- Mock mode — full UI preview with no backend dependency (`VITE_MOCK_MODE=true`)
- Production API integration — direct `fetch` calls to XTCON endpoints (see `API.md`)
- Vite 4 dev server with `/api` proxy to XTCON backend
- `RunStatusTracker.command` macOS double-click launcher
- `API.md` — full production endpoint reference with request/response shapes
