#!/usr/bin/env sh
# Start the development server after Stage 6 supplies backend/main.py.
set -eu

VENV_DIR=".venv"

if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "Local environment is missing. Run ./install.sh first." >&2
  exit 1
fi

if [ ! -f "backend/main.py" ]; then
  echo "Backend entry point is not available yet (expected backend/main.py)." >&2
  exit 1
fi

exec "$VENV_DIR/bin/python" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
