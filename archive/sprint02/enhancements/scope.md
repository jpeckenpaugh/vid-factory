# Sprint 02 Scope — Client-Side AI & Dialogue TTS

This sprint integrates client-side AI script generation and browser-native dialogue Text-to-Speech (TTS) into the standalone browser application (`browser-edition/`). All generated assets and configurations persist in the local browser workspace without requiring a backend server.

## Agreed scope

- **a. Feature — Workspace Settings & AI Provider Credentials.** Add a workspace Settings interface allowing users to select their AI provider (e.g., Gemini, OpenAI, Ollama), enter their API key, and configure optional custom endpoints.
- **b. Feature — AI Script Generator.** Add an AI Script Generator control to the draft editor that generates formatted video scripts from user prompts (e.g., explaining technical topics) and populates project drafts.
- **c. Feature — Client-Side Text-to-Speech Synthesis.** Integrate client-side Text-to-Speech synthesis using `kokoro-js` running in WebAssembly / WebGPU without requiring a backend server.
- **d. Feature — TTS Parameter Controls & Audio Preview.** Provide a clean TTS parameter UI including voice selection (e.g., `af_heart`, `af_bella`, `am_adam`, `am_michael`), speed adjustment ($0.75\times$–$1.25\times$), and inline HTML5 audio preview playback.
- **e. Constraint — Local Workspace Audio & Config Persistence.** Persist generated audio tracks and AI configurations into the local browser workspace (SQLite in Web Worker / OPFS storage) so audio tracks survive page refreshes and workspace exports.
- **f. Constraint — Preserve Baseline Workflows & Fallback Backend.** Preserve existing catalog/project CRUD workflows and keep the fallback FastAPI backend (`backend/`, `frontend/`) intact.
- **g. Boundary — Deferred Capabilities.** Defer cloud rendering pipelines, server-side audio processing, multi-speaker voice timeline sync, voice fine-tuning, and cloud synchronization.

## Acceptance boundary

Users can configure AI provider credentials, generate video scripts via prompts, synthesize dialogue audio tracks using Kokoro-js with selectable voices/speeds, play generated audio inline, and persist audio tracks across browser sessions and workspace exports.
