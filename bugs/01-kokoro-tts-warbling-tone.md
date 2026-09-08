# Bug Report: Kokoro TTS Produces Warbling Tones Instead of Human Speech Dialogue

- **Date:** 2026-09-08
- **Reporter:** Human User
- **Status:** Analyzed

## Symptom

When generating TTS audio for a project script in `browser-edition/`, the audio playback produces a synthetic pitch-modulated warbling sine wave tone rather than human speech dialogue. Synthesis completes almost instantaneously.

## Environment

- Runtime: `browser-edition/` static Web application
- Files: `browser-edition/tts-worker.js`, `browser-edition/app.js`

## Steps to Reproduce

1. Open `browser-edition/` in browser.
2. Select or create a Content Project with script draft text.
3. Select a voice (e.g. `af_heart`) and click "Generate Audio".
4. Play the generated audio track in the embedded player.
5. Observe that the audio is a warbling tone and finishes almost instantly without any speech or dialogue.

## Root Cause Analysis

Investigation of `browser-edition/tts-worker.js` revealed three distinct factors contributing to this bug:

1. **Dummy Initialization of Model Engine:**
   - In [browser-edition/tts-worker.js:L103-L122](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L103-L122), `initializeTTS()` emits progress notifications but does not load `kokoro-js`, ONNX runtime, or any speech synthesis engine. It hardcodes `kokoroModel = { ready: true }` at [L113](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L113) without instantiating speech model weights.

2. **Hardcoded Fallback Call in Speech Synthesis Protocol:**
   - In [browser-edition/tts-worker.js:L124-L158](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L124-L158), `synthesizeSpeech()` unconditionally invokes `generateSyntheticWav(text, voiceId, speed)` at [L149](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L149) rather than attempting actual neural speech synthesis or browser speech synthesis engine pipeline.

3. **Pitch-Modulated Sine Wave Math in `generateSyntheticWav`:**
   - In [browser-edition/tts-worker.js:L16-L94](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L16-L94), the audio generator synthesizes raw PCM audio samples by evaluating a 3 Hz pitch modulation LFO (`const phraseMod = Math.sin(2 * Math.PI * 3 * t);` at [L71](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L71)) to modulate pitch frequency (`currentPitch = basePitch + phraseMod * 20;` at [L72](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L72)) and generating a harmonic sine wave (`wave = Math.sin(2 * Math.PI * currentPitch * t) + ...` at [L75](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L75)).
   - This mathematical formula produces a warbling sine wave tone rather than human speech dialogue.

## Proposed Fix

1. **Implement Speech Model Engine Loading and Inference:**
   - Update `initializeTTS()` in [browser-edition/tts-worker.js:L103-L122](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L103-L122) to load and initialize `kokoro-js` / WebAssembly speech synthesis engine model weights.
   - Update `synthesizeSpeech()` in [browser-edition/tts-worker.js:L124-L158](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L124-L158) to process input script text using the speech synthesis engine model and generate actual dialogue waveform audio buffers.

2. **Refactor Fallback Audio Generator:**
   - Modify `generateSyntheticWav()` in [browser-edition/tts-worker.js:L16-L94](file:///Users/jarad/git/vid-factory/browser-edition/tts-worker.js#L16-L94) or update synthesis flow so that speech synthesis outputs actual dialogue audio rather than pitch-modulated warbling sine waves.

3. **Files to be Changed:**
   - `browser-edition/tts-worker.js`

