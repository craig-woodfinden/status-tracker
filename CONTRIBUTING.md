# Contributing

## Development setup

```bash
cd ~/Desktop/status-tracker
source ~/.nvm/nvm.sh   # Node 16 via nvm
npm install
npm start
# Open http://localhost:5173/?reservationId=123456789&webKey=FORD01
```

## Previewing status stages

Change `appointmentStatus` in `src/mockData.js` — the browser hot-reloads on save.

Valid values: `arrived` | `inspecting` | `servicing` | `final inspection` | `completed`

## Adding a new component

1. Create `src/components/YourComponent.jsx`
2. Style it in `src/styles.css` using the existing CSS variables (see `:root` block)
3. Import it into `src/App.jsx`

No build step needed during development — Vite handles everything.

## Updating styles

All styles live in `src/styles.css`. Design tokens are CSS variables at the top of the file:

```css
:root {
  --navy:   #0a1f44;
  --blue:   #1565c0;
  --green:  #2e7d32;
  --amber:  #f57c00;
  /* ... */
}
```

## Updating mock data

Edit `src/mockData.js`. The shape mirrors the real XTCON API response — see `API.md`.

## Connecting to a real backend

1. In `.env.local`, set `VITE_MOCK_MODE=false`
2. Set `XTCON_HOST=https://your-xtcon-host.com`
3. Restart the dev server

All API logic is in `src/api.js` — update endpoint paths there if your backend differs.

## Building for production

```bash
npm run build
# Output: dist/
```

The `dist/` folder is a static site — deploy to any web server or CDN.
Configure the server to rewrite all routes to `index.html` if using client-side routing.
