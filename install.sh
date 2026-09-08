#!/usr/bin/env sh
# Provision the local Python environment for this project.
set -eu

PYTHON_BIN="${PYTHON_BIN:-python3.12}"
VENV_DIR=".venv"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python 3.12 is required. Install it or set PYTHON_BIN to its executable." >&2
  exit 1
fi

"$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 12) else 1)' \
  || {
    echo "Python 3.12 is required; $PYTHON_BIN is not Python 3.12." >&2
    exit 1
  }

if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r requirements.txt

echo "Environment ready at $VENV_DIR"
