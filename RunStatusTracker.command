#!/bin/bash
# Double-click to run the Status Tracker dev server

cd "$(dirname "$0")"
source ~/.nvm/nvm.sh 2>/dev/null || true

# Install deps if needed
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "Starting Status Tracker..."
echo "Open: http://localhost:5173/?reservationId=123456789&webKey=FORD01"
echo ""
npm start
