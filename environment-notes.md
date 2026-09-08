# Environment Notes

## Baseline

- **Runtime:** Python 3.12.
- **Web/API stack:** FastAPI 0.115.12, served locally with Uvicorn 0.34.0.
- **Database:** SQLite through Python's standard-library `sqlite3` module; no
  database server or additional driver is required.
- **Frontend:** Bootstrap is used without a Node.js build toolchain. The
  frontend stage may load Bootstrap as a static asset or from its documented
  CDN.

## Setup and Run

From the repository root on a POSIX-compatible shell:

1. Ensure `python3.12` is available on `PATH` (or set `PYTHON_BIN` to a Python
   3.12 executable).
2. Run `./install.sh` to create `.venv` and install the pinned dependencies.
3. After the backend stage creates `backend/main.py`, run `./run.sh`.

The development server binds to `http://127.0.0.1:8000` and runs
`backend.main:app` with reload enabled.

## Browser-Native Runtime

The browser-native Video Content Factory in `poc-browser/` is independently
served as static files. It does not use the FastAPI process, its API, or its
SQLite database. From the repository root, run:

```sh
python3 poc-browser/serve.py --port 8012
```

Open `http://127.0.0.1:8012` in a current Chromium-compatible browser.
`localhost` provides the secure local context required by OPFS browser storage.
The POC vendors the pinned `sql.js` 1.13.0 JavaScript and WebAssembly runtime
under `poc-browser/vendor/sql.js/`; no Node.js toolchain, package installation,
or runtime CDN access is required.

## Caveats

- `run.sh` intentionally cannot start until Stage 6 supplies the agreed backend
  entry point at `backend/main.py`.
- SQLite database files, virtual environments, caches, and temporary logs are
  local-only and ignored by Git.
- The scripts are written for POSIX shells. On Windows, use WSL or an
  equivalent POSIX-compatible shell.
- `install.sh` and `run.sh` remain the legacy FastAPI fallback contract. They
  intentionally do not provision or start the standalone browser POC.
