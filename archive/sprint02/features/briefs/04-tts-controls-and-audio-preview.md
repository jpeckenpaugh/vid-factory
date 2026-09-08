# Feature Brief: TTS Parameter Controls and Audio Preview

## Purpose

Provide intuitive UI controls for selecting dialogue TTS voices and playback speed parameters, coupled with an inline HTML5 audio preview player for synthesized tracks.

## Expected Behavior

1. Within the project TTS Audio panel, the user is presented with TTS parameter controls:
   - Voice Selection dropdown featuring pre-configured Kokoro voices (e.g., `af_heart`, `af_bella`, `am_adam`, `am_michael`).
   - Speed Adjustment slider/input bounded between $0.75\times$ and $1.25\times$ (defaulting to $1.0\times$).
2. The user adjusts preferred voice and speed parameters prior to synthesis.
3. Once audio is synthesized (per Feature 03), an inline HTML5 audio preview player is updated with the generated audio track.
4. The user can play, pause, seek, adjust volume, and view duration/waveform controls directly within the browser UI.
5. Parameter changes prompt the user to re-synthesize audio to preview the updated voice or speed configuration.

## Inputs / Outputs

- **Inputs:**
  - Selected Voice ID choice.
  - Selected Speed multiplier value ($0.75\times$ to $1.25\times$).
  - Generated audio binary stream/URL for the HTML5 preview player.
- **Outputs:**
  - Active TTS configuration parameters saved with project context.
  - Interactive HTML5 audio preview playback.

## User-Visible Behavior

- Voice dropdown showing voice names and tone characteristics.
- Speed slider/number control with real-time numeric readout (e.g., `1.1x`).
- Integrated inline HTML5 audio player widget featuring play/pause controls, progress bar, time display, and download/delete options.
- Visual badge/indicator showing current voice and speed used to generate the active preview track.

## Constraints

- Speed adjustment must strictly respect the range constraint ($0.75\times$ to $1.25\times$).
- HTML5 preview player must play audio natively without relying on external media server streams.
- Preserves baseline project view layout and responsive design.

## Basic Acceptance Expectations

- User can select from available Kokoro voice options.
- User can adjust playback speed slider within $0.75\times$–$1.25\times$.
- Synthesized audio loads into the inline preview player and plays back correctly upon user click.
- Active synthesis metadata (voice name, speed) is accurately displayed alongside the preview player.
