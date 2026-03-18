#!/bin/bash
# Double-click to run the Status Tracker (frontend + auth server)

cd "$(dirname "$0")"
source ~/.nvm/nvm.sh 2>/dev/null || true

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Status Tracker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Auth server  → port 3001"
echo "  Frontend     → port 5173"
echo ""
echo "  Open: http://localhost:5173/?reservationId=123456789&webKey=FORD01"
echo "  Mock mode: check VITE_MOCK_MODE in .env.local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node server/index.js &
SERVER_PID=$!

npm run start:frontend

kill $SERVER_PID 2>/dev/null
