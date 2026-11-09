import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BROWSER_EDITION_ROOT = path.join(REPO_ROOT, 'browser-edition');
const DEMOS_DIR = path.join(REPO_ROOT, 'demos/latest');
const GALLERY_DIR = path.join(DEMOS_DIR, 'gallery');

// Dynamically import Playwright from sibling workspaces
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    const fallbackPlaywright = path.resolve(REPO_ROOT, '../sm3/node_modules/playwright/index.mjs');
    ({ chromium } = await import(fallbackPlaywright));
  } catch {
    const fallbackPlaywright2 = path.resolve(REPO_ROOT, '../robot-motion-studio/node_modules/playwright/index.mjs');
    ({ chromium } = await import(fallbackPlaywright2));
  }
}

// 1. Static HTTP Server for browser-edition
function startServer(port = 8780) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  };

  const server = http.createServer((req, res) => {
    const rawPath = req.url.split('?')[0];
    let filePath = path.join(BROWSER_EDITION_ROOT, rawPath === '/' ? 'index.html' : rawPath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[HTTP] Serving Vid Factory from ${BROWSER_EDITION_ROOT} on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

// 2. Cursor injection and interaction helpers
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.style.position = 'fixed';
    c.style.top = '0';
    c.style.left = '0';
    c.style.width = '18px';
    c.style.height = '18px';
    c.style.borderRadius = '50%';
    c.style.backgroundColor = 'rgba(14, 165, 233, 0.8)';
    c.style.border = '2px solid #ffffff';
    c.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.9)';
    c.style.pointerEvents = 'none';
    c.style.zIndex = '9999999';
    c.style.transform = 'translate(-50%, -50%)';
    c.style.transition = 'width 0.12s ease, height 0.12s ease, background-color 0.12s ease';
    document.body.appendChild(c);
    window.__setCursor = (x, y) => {
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
    };
  });
}

async function smoothMove(page, targetX, targetY, steps = 14, delayMs = 12) {
  await page.mouse.move(targetX, targetY, { steps });
  await page.evaluate(({ x, y }) => window.__setCursor?.(x, y), { x: targetX, y: targetY });
  if (delayMs > 0) await page.waitForTimeout(delayMs);
}

async function smoothClick(page, selectorOrBox, steps = 14) {
  let targetX, targetY;
  let locatorObj = null;

  if (typeof selectorOrBox === 'string') {
    locatorObj = page.locator(selectorOrBox).first();
    const box = await locatorObj.boundingBox();
    if (!box) {
      console.warn(`[WARN] Element ${selectorOrBox} not visible for click, falling back to locator.click()`);
      await locatorObj.click();
      return;
    }
    targetX = box.x + box.width / 2;
    targetY = box.y + box.height / 2;
  } else if (selectorOrBox && typeof selectorOrBox.boundingBox === 'function') {
    locatorObj = selectorOrBox;
    const box = await selectorOrBox.boundingBox();
    if (!box) {
      console.warn(`[WARN] Element handle not visible for click`);
      return;
    }
    targetX = box.x + box.width / 2;
    targetY = box.y + box.height / 2;
  } else {
    targetX = selectorOrBox.x;
    targetY = selectorOrBox.y;
  }

  await smoothMove(page, targetX, targetY, steps);
  await page.evaluate(() => {
    const c = document.getElementById('demo-cursor');
    if (c) {
      c.style.width = '13px';
      c.style.height = '13px';
      c.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
    }
  });
  await page.waitForTimeout(80);

  // Use locator.click if available for guaranteed DOM event dispatch
  if (locatorObj) {
    await locatorObj.click();
  } else {
    await page.mouse.click(targetX, targetY);
  }

  await page.evaluate(() => {
    const c = document.getElementById('demo-cursor');
    if (c) {
      c.style.width = '18px';
      c.style.height = '18px';
      c.style.backgroundColor = 'rgba(14, 165, 233, 0.8)';
    }
  });
  await page.waitForTimeout(160);
}

// 3. WebP Thumbnail Generator
async function generateWebPThumbnail(browser, sourcePngPath, outWebPPath) {
  console.log(`[Thumbnail] Generating WebP from ${sourcePngPath}...`);
  const page = await browser.newPage();
  const pngDataUrl = `data:image/png;base64,${fs.readFileSync(sourcePngPath).toString('base64')}`;

  const webpBase64 = await page.evaluate(async (dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webpData = canvas.toDataURL('image/webp', 0.88);
        resolve(webpData.split(',')[1]);
      };
      img.src = dataUrl;
    });
  }, pngDataUrl);

  fs.writeFileSync(outWebPPath, Buffer.from(webpBase64, 'base64'));
  await page.close();
  console.log(`[Thumbnail] Saved WebP (${fs.statSync(outWebPPath).size} bytes) to ${outWebPPath}`);
}

async function main() {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
  const server = await startServer(8780);

  const tempVideoDir = path.join(DEMOS_DIR, 'temp_raw_video');
  fs.mkdirSync(tempVideoDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1, // Safe memory footprint
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();
  page.on('dialog', async d => {
    console.log('[Dialog]', d.type(), d.message());
    await d.accept();
  });

  const startTime = Date.now();

  try {
    console.log('[Playwright] Loading Vid Factory at https://jpeckenpaugh.github.io/vid-factory/ ...');
    await page.goto('https://jpeckenpaugh.github.io/vid-factory/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await injectCursor(page);

    // Initial check: Wait for workspace to open
    await page.waitForSelector('#workspace-status');
    console.log('[Playwright] Workspace opened.');

    // Mock ttsWorker synthesis in page to return instant synthetic audio blob
    await page.evaluate(() => {
      // Mock synthesize to respond immediately with a dummy wav blob
      const origPostMessage = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function(msg, transfer) {
        if (msg && msg.action === 'synthesize') {
          setTimeout(() => {
            // Generate minimal valid WAV header + 0.5s audio
            const sampleRate = 22050;
            const numSamples = sampleRate / 2;
            const buffer = new ArrayBuffer(44 + numSamples * 2);
            const view = new DataView(buffer);
            const writeString = (offset, string) => {
              for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
            };
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + numSamples * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true); // PCM
            view.setUint16(22, 1, true); // Mono
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeString(36, 'data');
            view.setUint32(40, numSamples * 2, true);
            for (let i = 0; i < numSamples; i++) {
              view.setInt16(44 + i * 2, Math.sin(i / 10) * 10000, true);
            }
            const blob = new Blob([buffer], { type: 'audio/wav' });
            if (this.onmessage) {
              this.onmessage({
                data: {
                  id: msg.id,
                  ok: true,
                  result: { audio_blob: blob, duration: 2.5 }
                }
              });
            }
          }, 200);
          return;
        }
        return origPostMessage.call(this, msg, transfer);
      };
    });

    // Scene 1: Projects Dashboard & Creating Project
    console.log('[Scene 1] Creating first project...');
    await smoothClick(page, 'button[data-action="new-project"]');
    await page.waitForSelector('#project-title');
    await page.waitForTimeout(400);

    // Type title and description
    await smoothClick(page, '#project-title');
    await page.locator('#project-title').pressSequentially('Livive Video Factory Launch Teaser', { delay: 30 });
    await smoothClick(page, '#project-description');
    await page.locator('#project-description').pressSequentially('30-second high-energy trailer showcasing browser-native TTS dialogue and AI scripts.', { delay: 20 });

    // Select application & company
    await page.locator('#project-application').selectOption({ label: 'YouTube' });
    await page.locator('#project-company').selectOption({ label: 'Acme Studio' });
    await page.waitForTimeout(300);

    // Save project
    await smoothClick(page, 'button:has-text("Create project")');
    await page.waitForSelector('h1:has-text("Livive Video Factory Launch Teaser")');
    console.log('[Playwright] Project created.');

    // Save draft text
    await smoothClick(page, '#draft-body');
    await page.locator('#draft-body').fill('Welcome to Video Content Factory! Built entirely in the browser using WebAssembly SQLite, client-side AI script formulations, and Kokoro neural speech synthesis. Zero servers required.');
    await page.waitForTimeout(300);
    await smoothClick(page, 'button:has-text("Save draft")');
    await page.waitForTimeout(500);

    // Return to Projects dashboard to capture clean gallery 01
    await smoothClick(page, 'button[data-action="back-list"]');
    await page.waitForSelector('h1:has-text("Content Projects")');
    await page.waitForTimeout(500);

    // Capture Still 01: Content Projects & Workspace Dashboard
    console.log('[Capture] Still 01: Dashboard...');
    const still01Path = path.join(GALLERY_DIR, '01-content-projects-dashboard.png');
    await page.screenshot({ path: still01Path, fullPage: false });

    // Scene 2: Platform & Sponsor Catalogs
    console.log('[Scene 2] Exploring Platform & Sponsor Catalogs...');
    await smoothClick(page, 'nav a[data-view="applications"]');
    await page.waitForSelector('h1:has-text("Applications")');
    await page.waitForTimeout(400);

    // Add a custom application
    await smoothClick(page, 'button[data-action="new-catalog"]');
    await page.waitForSelector('#catalog-name');
    await smoothClick(page, '#catalog-name');
    await page.locator('#catalog-name').pressSequentially('LinkedIn Video', { delay: 25 });
    await smoothClick(page, 'button:has-text("Add application")');
    await page.waitForTimeout(400);

    // Switch to Companies
    await smoothClick(page, 'nav a[data-view="companies"]');
    await page.waitForSelector('h1:has-text("Companies")');
    await page.waitForTimeout(400);

    // Capture Still 02: Catalog Metadata Management
    console.log('[Capture] Still 02: Catalog Metadata...');
    const still02Path = path.join(GALLERY_DIR, '02-catalog-metadata-management.png');
    await page.screenshot({ path: still02Path, fullPage: false });

    // Scene 3: AI Provider Settings & Connection Diagnostics
    console.log('[Scene 3] AI Provider Settings...');
    await smoothClick(page, 'nav a[data-view="settings"]');
    await page.waitForSelector('h1:has-text("AI Provider Settings")');
    await page.waitForTimeout(400);

    // Configure OpenAI or Gemini provider demo values
    await page.locator('#setting-provider').selectOption('Gemini');
    await page.locator('#setting-api-key').fill('AIzaSyD-DEMO_SECURE_GEMINI_API_KEY');
    await page.locator('#setting-endpoint').fill('https://generativelanguage.googleapis.com');
    if (!(await page.locator('#setting-active').isChecked())) {
      await smoothClick(page, '#setting-active');
    }
    await page.waitForTimeout(300);

    // Toggle reveal key
    await smoothClick(page, 'button[data-action="toggle-key-visibility"]');
    await page.waitForTimeout(350);
    await smoothClick(page, 'button[data-action="toggle-key-visibility"]');

    // Save Settings
    await smoothClick(page, 'button:has-text("Save Settings")');
    await page.waitForTimeout(500);

    // Capture Still 03: AI Provider Settings
    console.log('[Capture] Still 03: AI Provider Settings...');
    const still03Path = path.join(GALLERY_DIR, '03-ai-provider-settings.png');
    await page.screenshot({ path: still03Path, fullPage: false });

    // Scene 4: Project Detail & AI Script Generator
    console.log('[Scene 4] Project Detail & AI Script Generator...');
    await smoothClick(page, 'nav a[data-view="projects"]');
    await page.waitForSelector('h1:has-text("Content Projects")');
    await page.waitForTimeout(400);

    await smoothClick(page, 'a[data-action="open-project"]');
    await page.waitForSelector('h1:has-text("Livive Video Factory Launch Teaser")');
    await page.waitForTimeout(400);

    // Use AI Script Generator Prompt Box
    await smoothClick(page, '#ai-prompt');
    await page.locator('#ai-prompt').pressSequentially('Draft a punchy 30-second teaser script announcing the zero-install browser video factory with neural voice synthesis.', { delay: 18 });
    await page.waitForTimeout(400);

    // Capture Still 04: AI Script Generator
    console.log('[Capture] Still 04: Interactive AI Video Script...');
    const still04Path = path.join(GALLERY_DIR, '04-ai-script-generator.png');
    await page.screenshot({ path: still04Path, fullPage: false });

    // Scene 5: Kokoro Dialogue TTS Audio Studio
    console.log('[Scene 5] Kokoro Dialogue TTS Audio Studio...');
    await page.evaluate(() => {
      document.querySelector('.tts-controls')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(500);

    // Select Voice and Speech Speed
    await page.locator('#tts-voice').selectOption('af_heart');
    await page.waitForTimeout(250);

    // Adjust speed slider
    await page.locator('#tts-speed').fill('1.05');
    await page.evaluate(() => {
      const sp = document.getElementById('tts-speed');
      if (sp) sp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(250);

    // Trigger Synthesize Audio
    console.log('[Playwright] Triggering audio synthesis...');
    await smoothClick(page, 'button[data-action="synthesize-audio"]');

    // Wait for synthesis to complete and active audio preview to appear
    await page.waitForSelector('audio', { timeout: 15000 });
    await page.waitForTimeout(800);

    // Capture Still 05: WASM TTS Audio Studio & Waveform Preview
    console.log('[Capture] Still 05: WASM TTS Studio...');
    const still05Path = path.join(GALLERY_DIR, '05-wasm-tts-studio.png');
    await page.screenshot({ path: still05Path, fullPage: false });

    // Synthesize a second take with a male voice to show audio track history
    await page.locator('#tts-voice').selectOption('am_michael');
    await page.locator('#tts-speed').fill('0.95');
    await page.evaluate(() => {
      const sp = document.getElementById('tts-speed');
      if (sp) sp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(250);

    console.log('[Playwright] Synthesizing second take (am_michael)...');
    await smoothClick(page, 'button[data-action="synthesize-audio"]');
    await page.waitForTimeout(2000);

    // Scroll to Audio History table
    await page.evaluate(() => {
      document.querySelector('.audio-history-list')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(500);

    // Test Export Workspace action
    await smoothClick(page, 'button[data-action="export-workspace"]');
    await page.waitForTimeout(500);

    // Capture Still 06: Persisted Audio Library & Workspace Export
    console.log('[Capture] Still 06: Persisted Audio Library...');
    const still06Path = path.join(GALLERY_DIR, '06-persisted-audio-library-export.png');
    await page.screenshot({ path: still06Path, fullPage: false });

    // Final buffer to ensure total video reaches ~30.5 seconds
    const elapsed = Date.now() - startTime;
    const targetMs = 30800; // ~30.8s target
    if (elapsed < targetMs) {
      console.log(`[Playwright] Video recording at ${elapsed}ms, waiting ${targetMs - elapsed}ms for ideal ~30.5s duration...`);
      await page.waitForTimeout(targetMs - elapsed);
    }

    console.log(`[Playwright] Video recorded in ${Date.now() - startTime}ms.`);

  } catch (err) {
    console.error('[PLAYWRIGHT ERROR IN TRY]', err);
    throw err;
  } finally {
    const videoObj = page.video();
    await context.close();
    await browser.close();
    server.close();

    // Video path resolution
    const rawVideoPath = await videoObj.path();
    console.log(`[Video] Raw recording saved at: ${rawVideoPath}`);

    const finalWebM = path.join(DEMOS_DIR, 'demo.webm');
    const ffmpegMac = path.resolve(process.env.HOME, 'Library/Caches/ms-playwright/ffmpeg-1013/ffmpeg-mac');

    if (fs.existsSync(ffmpegMac)) {
      console.log(`[FFmpeg] Transcoding video with VP9 to exact 30.5s duration...`);
      await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegMac, [
          '-y',
          '-i', rawVideoPath,
          '-t', '30.5',
          '-c:v', 'libvpx-vp9',
          '-b:v', '900k',
          '-crf', '30',
          '-an',
          finalWebM,
        ], { stdio: 'inherit' });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with code ${code}`));
        });
      });
    } else {
      console.log(`[Video] Moving raw WebM to ${finalWebM}...`);
      fs.copyFileSync(rawVideoPath, finalWebM);
    }

    // Clean up temp dir
    try {
      fs.rmSync(tempVideoDir, { recursive: true, force: true });
    } catch (_) {}

    // Generate thumbnail webp from primary card poster: 01-content-projects-dashboard.png
    const sourceStill = path.join(GALLERY_DIR, '01-content-projects-dashboard.png');
    if (fs.existsSync(sourceStill)) {
      const helperBrowser = await chromium.launch({ headless: true });
      try {
        const cardThumbWebP = path.join(DEMOS_DIR, 'thumb.webp');
        await generateWebPThumbnail(helperBrowser, sourceStill, cardThumbWebP);

        // Copy thumbnail into the backend source and the public www checkout
        const rootThumb = path.resolve(REPO_ROOT, '../thumbnails/vid-factory.webp');
        const wwwThumb = path.resolve(REPO_ROOT, '../www-livive-net/thumbnails/vid-factory.webp');

        for (const tPath of [rootThumb, wwwThumb]) {
          if (fs.existsSync(path.dirname(tPath))) {
            fs.copyFileSync(cardThumbWebP, tPath);
            console.log(`[Thumbnail] Copied to ${tPath}`);
          }
        }
      } finally {
        await helperBrowser.close();
      }
    }

    console.log('[SUCCESS] All Vid Factory showcase assets captured!');
    console.log(`  - Video: ${finalWebM} (${fs.statSync(finalWebM).size} bytes)`);
    for (const f of fs.readdirSync(GALLERY_DIR).sort()) {
      const p = path.join(GALLERY_DIR, f);
      console.log(`  - Gallery: ${f} (${fs.statSync(p).size} bytes)`);
    }
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
