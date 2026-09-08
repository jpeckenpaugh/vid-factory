# Feature Brief: Client-Side Text-to-Speech Synthesis

## Purpose

Synthesize spoken dialogue audio tracks directly in the browser from project draft scripts using `kokoro-js` running in WebAssembly / WebGPU, operating entirely standalone without a backend speech generation server.

## Expected Behavior

1. The user triggers TTS audio synthesis from a project draft script.
2. The client checks for cached `kokoro-js` model weights in local browser storage (IndexedDB/OPFS).
3. If model weights are missing or incomplete, the client fetches required model assets and displays clear download/initialization progress.
4. The client executes speech inference in-browser using WebAssembly or WebGPU workers via `kokoro-js`.
5. Upon completion, the synthesized PCM/WAV/MP3 audio blob is generated client-side.
6. The synthesized audio track is attached to the content project alongside its synthesis metadata (selected voice ID, speech rate/speed, and script text snapshot).

## Inputs / Outputs

- **Inputs:**
  - Script text content from the project draft.
  - Selected TTS Voice ID (e.g., `af_heart`, `af_bella`, `am_adam`, `am_michael`).
  - Target Speed factor (e.g., $1.0\times$).
- **Outputs:**
  - Synthesized audio binary blob (WAV/MP3).
  - Attached audio track object linked to the project record with metadata (voice_id, speed, script_snapshot, duration).

## User-Visible Behavior

- A "Synthesize Audio" action button in the project draft/audio studio view.
- Real-time progress bar/status indicator during model initialization/download and audio processing.
- Notification upon successful audio synthesis completion.
- Clear error handling if browser WebGPU/WASM capabilities are unavailable or if memory limits are exceeded.

## Constraints

- Audio synthesis must run entirely client-side using `kokoro-js` (WASM/WebGPU); zero backend server audio generation routes are used.
- Model loading must display explicit progress indicators and cache weights locally so subsequent runs do not re-download models.
- Baseline application performance must remain responsive during execution (synthesis offloaded to Web Worker).

## Basic Acceptance Expectations

- User can trigger TTS synthesis from a valid draft script text.
- First-time synthesis displays model loading progress and caches weights in browser storage.
- Audio synthesis generates a valid audio track playable in browser.
- Synthesized audio track is attached to the content project record with synthesis metadata.
