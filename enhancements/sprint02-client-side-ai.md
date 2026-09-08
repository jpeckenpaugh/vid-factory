# Sprint 02 — Client-Side AI & Dialogue TTS

## Intent

Integrate client-side AI script generation with configurable LLM providers/API keys and client-side dialogue Text-to-Speech (`kokoro-js`) into the `browser-edition/` application, persisting generated audio tracks into the local browser workspace.

## Sprint concepts

a. Add a workspace Settings interface allowing users to select their AI provider (e.g., Gemini, OpenAI, Ollama), enter their API key, and configure optional custom endpoints.

b. Add an AI Script Generator control to the draft editor that generates formatted video scripts from user prompts (e.g., explaining technical topics like Mixture of Experts) and populates project drafts.

c. Integrate client-side Text-to-Speech synthesis using `kokoro-js` running in WebAssembly / WebGPU without requiring a backend server.

d. Provide a clean TTS parameter UI including voice selection (e.g., `af_heart`, `af_bella`, `am_adam`, `am_michael`), speed adjustment ($0.75\times$–$1.25\times$), and inline HTML5 audio preview playback.

e. Persist generated audio tracks and AI configurations into the local browser workspace (SQLite in Web Worker / OPFS storage) so audio tracks survive page refreshes and workspace exports.

f. Preserve existing catalog/project CRUD workflows and keep the fallback FastAPI backend (`backend/`, `frontend/`) intact.

g. Defer cloud rendering pipelines, server-side audio processing, multi-speaker voice timeline sync, voice fine-tuning, and cloud synchronization.

## Acceptance boundary

Users can configure AI provider credentials, generate video scripts via prompts, synthesize dialogue audio tracks using Kokoro-js with selectable voices/speeds, play generated audio inline, and persist audio tracks across browser sessions and workspace exports.
