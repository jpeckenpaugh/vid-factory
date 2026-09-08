/* Web Worker owning kokoro-js, WebAssembly / WebGPU synthesis pipeline, and model fallback audio generation. */

const SUPPORTED_VOICES = ["af_heart", "af_bella", "am_adam", "am_michael"];
const DEFAULT_SAMPLE_RATE = 24000;
let kokoroModel = null;
let isInitializing = false;
let modelFailed = false;

class TTSError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Convert 32-bit float PCM array to a 16-bit mono PCM WAV ArrayBuffer
function pcmFloatToWavBuffer(float32Samples, sampleRate = DEFAULT_SAMPLE_RATE) {
  const numSamples = float32Samples.length;
  const dataSize = numSamples * 2; // 16-bit PCM (2 bytes per sample)
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  // "RIFF"
  view.setUint32(0, 0x52494646, false);
  // File size - 8
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  view.setUint32(8, 0x57415645, false);
  // "fmt "
  view.setUint32(12, 0x666d7420, false);
  // Subchunk1Size (16 for PCM)
  view.setUint32(16, 16, true);
  // AudioFormat (1 for PCM)
  view.setUint16(20, 1, true);
  // NumChannels (1 mono)
  view.setUint16(22, 1, true);
  // SampleRate
  view.setUint32(24, sampleRate, true);
  // ByteRate (SampleRate * 1 * 2)
  view.setUint32(28, sampleRate * 2, true);
  // BlockAlign (2)
  view.setUint16(32, 2, true);
  // BitsPerSample (16)
  view.setUint16(34, 16, true);
  // "data"
  view.setUint32(36, 0x64617461, false);
  // Subchunk2Size
  view.setUint32(40, dataSize, true);

  let byteOffset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, float32Samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(byteOffset, int16, true);
    byteOffset += 2;
  }

  const duration = parseFloat((numSamples / sampleRate).toFixed(2));
  return {
    buffer,
    duration,
    sample_rate: sampleRate,
  };
}

// Generate articulated dialogue speech audio WAV buffer using formant frequency synthesis & speech prosody
function generateSyntheticWav(text, voiceId, speed = 1.0, sampleRate = DEFAULT_SAMPLE_RATE) {
  const voicePitches = {
    af_heart: 220,
    af_bella: 260,
    am_adam: 130,
    am_michael: 150,
  };
  const basePitch = voicePitches[voiceId] || 200;
  const isFemale = voiceId.startsWith("af_");

  const vowelFormants = {
    a: [700, 1200, 2600],
    e: [500, 1800, 2500],
    i: [300, 2200, 3000],
    o: [400, 800, 2400],
    u: [320, 800, 2200],
  };
  if (isFemale) {
    for (const v in vowelFormants) {
      vowelFormants[v] = vowelFormants[v].map((f) => Math.round(f * 1.15));
    }
  }

  const rawText = text.trim() || "Hello world";
  const words = rawText.split(/\s+/);

  const segments = [];
  let isQuestion = rawText.endsWith("?");

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const rawWord = words[wIdx];
    const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
    const hasComma = rawWord.includes(",");
    const hasPeriod = rawWord.includes(".") || rawWord.includes("!") || rawWord.includes("?");

    if (!word) {
      segments.push({ type: "pause", duration: 0.1 });
      continue;
    }

    const chars = word.split("");
    let currentSyllable = [];

    for (let cIdx = 0; cIdx < chars.length; cIdx++) {
      const char = chars[cIdx];
      currentSyllable.push(char);

      const isVowel = "aeiouy".includes(char);
      const isNextVowel = cIdx < chars.length - 1 && "aeiouy".includes(chars[cIdx + 1]);

      if (isVowel || (!isNextVowel && currentSyllable.length >= 3) || cIdx === chars.length - 1) {
        segments.push({
          type: "speech",
          wordIndex: wIdx,
          totalWords: words.length,
          chars: currentSyllable.join(""),
          hasVowel: currentSyllable.some((c) => "aeiouy".includes(c)),
          vowelChar: currentSyllable.find((c) => "aeiouy".includes(c)) || "a",
          hasFricative: currentSyllable.some((c) => "sfxzthkpcsh".includes(c)),
        });
        currentSyllable = [];
      }
    }

    const pauseDur = hasPeriod ? 0.25 : hasComma ? 0.15 : 0.08;
    segments.push({ type: "pause", duration: pauseDur });
  }

  const baseSyllableDuration = 0.14 / speed;
  let totalDuration = 0;
  for (const seg of segments) {
    if (seg.type === "pause") {
      seg.duration = seg.duration / speed;
    } else {
      seg.duration = Math.max(0.08, (seg.chars.length * 0.045 + baseSyllableDuration) / speed);
    }
    seg.startTime = totalDuration;
    totalDuration += seg.duration;
  }

  if (totalDuration < 0.8) {
    totalDuration = 0.8;
  }

  const numSamples = Math.floor(sampleRate * totalDuration);
  const floatSamples = new Float32Array(numSamples);

  let segIdx = 0;
  let phaseAcc = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    while (segIdx < segments.length - 1 && t >= segments[segIdx].startTime + segments[segIdx].duration) {
      segIdx++;
    }
    const seg = segments[segIdx];

    if (!seg || seg.type === "pause" || t >= segments[segments.length - 1].startTime + segments[segments.length - 1].duration) {
      floatSamples[i] = 0;
      continue;
    }

    const segT = (t - seg.startTime) / seg.duration;

    const wordProgress = seg.wordIndex / Math.max(1, seg.totalWords - 1);
    let intonation = 1.0 - wordProgress * 0.12;

    if (isQuestion && wordProgress > 0.7) {
      intonation += (wordProgress - 0.7) * 0.4;
    }

    const stressArc = Math.sin(Math.PI * segT) * 0.06;
    const currentF0 = basePitch * (intonation + stressArc);

    phaseAcc += currentF0 / sampleRate;
    if (phaseAcc >= 1.0) phaseAcc -= 1.0;

    let glottalSource = 0;
    if (seg.hasVowel) {
      if (phaseAcc < 0.6) {
        glottalSource = 0.5 * (1 - Math.cos((Math.PI * phaseAcc) / 0.6));
      } else {
        glottalSource = Math.cos((Math.PI * (phaseAcc - 0.6)) / 0.8);
      }
    } else {
      glottalSource = Math.sin(2 * Math.PI * phaseAcc);
    }

    const formants = vowelFormants[seg.vowelChar] || vowelFormants["a"];
    const [f1, f2, f3] = formants;

    const formantResonance =
      Math.sin(2 * Math.PI * f1 * t) * 0.5 +
      Math.sin(2 * Math.PI * f2 * t) * 0.3 +
      Math.sin(2 * Math.PI * f3 * t) * 0.15;

    let fricativeNoise = 0;
    if (seg.hasFricative && (segT < 0.25 || segT > 0.75)) {
      const rawNoise = Math.random() * 2 - 1;
      fricativeNoise = rawNoise * 0.35;
    }

    let sample = glottalSource * formantResonance * 0.7 + fricativeNoise;

    let envelope = 1.0;
    if (segT < 0.15) {
      envelope = segT / 0.15;
    } else if (segT > 0.8) {
      envelope = (1.0 - segT) / 0.2;
    }

    if (t < 0.03) envelope *= t / 0.03;
    else if (t > totalDuration - 0.03) envelope *= Math.max(0, (totalDuration - t) / 0.03);

    floatSamples[i] = Math.max(-1, Math.min(1, sample * envelope * 0.5));
  }

  return pcmFloatToWavBuffer(floatSamples, sampleRate);
}

function postProgress(status, progress, text) {
  self.postMessage({
    action: "progress",
    payload: { status, progress, text },
  });
}

async function initializeTTS() {
  if (kokoroModel) return true;
  if (isInitializing) return false;
  isInitializing = true;

  try {
    postProgress("loading_model", 0.1, "Checking Kokoro TTS engine...");
    postProgress("loading_model", 0.3, "Loading kokoro-js WebAssembly engine...");

    let KokoroTTS;
    try {
      const module = await import("https://cdn.jsdelivr.net/npm/kokoro-js");
      KokoroTTS = module.KokoroTTS || module.default?.KokoroTTS;
    } catch (importErr) {
      if (typeof self.KokoroTTS !== "undefined") {
        KokoroTTS = self.KokoroTTS;
      } else {
        throw importErr;
      }
    }

    if (!KokoroTTS) {
      throw new Error("KokoroTTS module unavailable.");
    }

    postProgress("loading_model", 0.5, "Initializing WebAssembly speech model weights...");
    kokoroModel = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
      dtype: "q8",
      device: "wasm",
      progress_callback: (progress) => {
        if (progress?.status === "progress" && progress.total) {
          const ratio = 0.5 + (progress.loaded / progress.total) * 0.4;
          postProgress("loading_model", parseFloat(ratio.toFixed(2)), `Loading model weights: ${progress.file || ''}`);
        }
      }
    });

    postProgress("loading_model", 1.0, "TTS Engine Ready.");
    return true;
  } catch (error) {
    modelFailed = true;
    kokoroModel = null;
    postProgress("loading_model", 1.0, "Using synthetic offline speech generator fallback.");
    return false;
  } finally {
    isInitializing = false;
  }
}

// Split long script text into natural sentence/clause chunks under token limit
function splitTextIntoChunks(text, maxChars = 240) {
  const cleaned = text.trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const paragraphs = cleaned.split(/\n+/);
  const chunks = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (trimmedPara.length <= maxChars) {
      chunks.push(trimmedPara);
      continue;
    }

    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
    const sentences = trimmedPara.match(sentenceRegex) || [trimmedPara];
    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if ((currentChunk + " " + trimmedSentence).trim().length <= maxChars) {
        currentChunk = (currentChunk + " " + trimmedSentence).trim();
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }

        if (trimmedSentence.length > maxChars) {
          const clauseRegex = /[^,;:—]+[,;:—]+(?:\s+|$)|[^,;:—]+$/g;
          const clauses = trimmedSentence.match(clauseRegex) || [trimmedSentence];

          for (const clause of clauses) {
            const trimmedClause = clause.trim();
            if (!trimmedClause) continue;

            if ((currentChunk + " " + trimmedClause).trim().length <= maxChars) {
              currentChunk = (currentChunk + " " + trimmedClause).trim();
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
              }

              if (trimmedClause.length > maxChars) {
                const words = trimmedClause.split(/\s+/);
                for (const word of words) {
                  if ((currentChunk + " " + word).trim().length <= maxChars) {
                    currentChunk = (currentChunk + " " + word).trim();
                  } else {
                    if (currentChunk) chunks.push(currentChunk);
                    currentChunk = word;
                  }
                }
              } else {
                currentChunk = trimmedClause;
              }
            }
          }
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }

  return chunks.filter((c) => c.length > 0);
}

// Concatenate multiple Float32Array audio segments with optional silence pause between them
function concatenateFloat32Arrays(arrays, pauseSamples = 0) {
  if (arrays.length === 0) return new Float32Array(0);
  if (arrays.length === 1 && pauseSamples === 0) return arrays[0];

  let totalLength = 0;
  for (let i = 0; i < arrays.length; i++) {
    totalLength += arrays[i].length;
    if (i < arrays.length - 1) {
      totalLength += pauseSamples;
    }
  }

  const result = new Float32Array(totalLength);
  let offset = 0;

  for (let i = 0; i < arrays.length; i++) {
    result.set(arrays[i], offset);
    offset += arrays[i].length;
    if (i < arrays.length - 1 && pauseSamples > 0) {
      offset += pauseSamples;
    }
  }

  return result;
}

async function synthesizeSpeech(payload) {
  const text = payload?.text?.trim();
  if (!text) {
    throw new TTSError("validation_error", "Script text must not be blank.");
  }

  const voiceId = payload?.voice_id;
  if (!SUPPORTED_VOICES.includes(voiceId)) {
    throw new TTSError("unsupported_voice", `Voice ID '${voiceId}' is not supported. Choose from: ${SUPPORTED_VOICES.join(", ")}`);
  }

  const speed = typeof payload?.speed === "number" ? payload.speed : parseFloat(payload?.speed || 1.0);
  if (isNaN(speed) || speed < 0.75 || speed > 1.25) {
    throw new TTSError("validation_error", "Speed must be between 0.75 and 1.25.");
  }

  postProgress("synthesizing", 0.15, "Processing script text & phonemes...");

  if (!kokoroModel && !modelFailed) {
    await initializeTTS();
  }

  if (kokoroModel && typeof kokoroModel.generate === "function") {
    try {
      const chunks = splitTextIntoChunks(text, 240);
      const chunkAudioArrays = [];
      let sRate = DEFAULT_SAMPLE_RATE;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const progressRatio = 0.2 + 0.65 * (i / chunks.length);
        const chunkMsg = chunks.length > 1
          ? `Synthesizing part ${i + 1} of ${chunks.length} with Kokoro TTS model...`
          : "Synthesizing dialogue audio with Kokoro TTS model...";
        postProgress("synthesizing", parseFloat(progressRatio.toFixed(2)), chunkMsg);

        const audioResult = await kokoroModel.generate(chunk, { voice: voiceId, speed });

        let floatSamples = null;
        if (audioResult?.audio instanceof Float32Array) {
          floatSamples = audioResult.audio;
          sRate = audioResult.sampling_rate || DEFAULT_SAMPLE_RATE;
        } else if (audioResult instanceof Float32Array) {
          floatSamples = audioResult;
        }

        if (floatSamples && floatSamples.length > 0) {
          chunkAudioArrays.push(floatSamples);
        }
      }

      if (chunkAudioArrays.length > 0) {
        postProgress("synthesizing", 0.9, "Encoding complete audio buffer...");
        // 0.06s natural silence between sentence chunks
        const pauseSamples = chunks.length > 1 ? Math.floor(0.06 * sRate) : 0;
        const combinedFloatSamples = concatenateFloat32Arrays(chunkAudioArrays, pauseSamples);
        const wavRes = pcmFloatToWavBuffer(combinedFloatSamples, sRate);

        postProgress("synthesizing", 1.0, "Audio synthesis complete.");
        return {
          audio_blob: wavRes.buffer,
          duration: wavRes.duration,
          sample_rate: wavRes.sample_rate,
        };
      }
    } catch (err) {
      console.warn("Kokoro model inference failed, falling back to speech generator:", err);
    }
  }

  postProgress("synthesizing", 0.65, "Synthesizing dialogue audio waveform...");
  const result = generateSyntheticWav(text, voiceId, speed);
  postProgress("synthesizing", 1.0, "Audio synthesis complete.");

  return {
    audio_blob: result.buffer,
    duration: result.duration,
    sample_rate: result.sample_rate,
  };
}

self.onmessage = async (event) => {
  const { id, action, operation, payload } = event.data || {};
  const op = action || operation;

  try {
    if (op === "init") {
      await initializeTTS();
      self.postMessage({ id, ok: true, result: { initialized: true, voices: SUPPORTED_VOICES } });
      return;
    }

    if (op === "synthesize") {
      const result = await synthesizeSpeech(payload);
      // Transfer audio_blob ArrayBuffer for efficiency
      self.postMessage({ id, ok: true, result }, [result.audio_blob]);
      return;
    }

    throw new TTSError("validation_error", `Unknown action: ${op}`);
  } catch (error) {
    const code = error instanceof TTSError ? error.code : "wasm_error";
    const message = error.message || "TTS synthesis failed.";
    self.postMessage({ id, ok: false, error: { code, message } });
  }
};
