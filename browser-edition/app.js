(() => {
  const app = document.querySelector('#app');
  const notice = document.querySelector('#notice');
  const workspaceStatus = document.querySelector('#workspace-status');
  const fileInput = document.querySelector('#import-file');
  const state = {
    view: 'projects', selected: null, kind: null, record: null,
    applications: [], companies: [], ready: false, pendingImport: null,
    settings: [], audioTracks: [], activeAudioTrack: null
  };
  const labels = { applications: 'Application', companies: 'Company', projects: 'Content Project', settings: 'Settings' };
  
  // Database Worker & RPC
  const worker = new Worker('db-worker.js');
  const pendingRequests = new Map();

  // TTS Worker & RPC
  const ttsWorker = new Worker('tts-worker.js');
  const pendingTtsRequests = new Map();
  let ttsProgressCallback = null;
  let currentAudioObjectUrl = null;

  const escape = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  
  const rpc = (operation, payload) => new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, operation, payload });
  });

  worker.onmessage = ({ data }) => {
    const request = pendingRequests.get(data?.id); if (!request) return;
    pendingRequests.delete(data.id);
    if (data.ok) request.resolve(data.result);
    else request.reject(Object.assign(new Error(data.error?.message || 'The workspace request failed.'), { code: data.error?.code }));
  };

  worker.onerror = () => {
    for (const request of pendingRequests.values()) request.reject(new Error('The browser workspace stopped responding. Refresh and try again.'));
    pendingRequests.clear();
  };

  const ttsRpc = (action, payload, transferables = []) => new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingTtsRequests.set(id, { resolve, reject });
    ttsWorker.postMessage({ id, action, payload }, transferables);
  });

  ttsWorker.onmessage = ({ data }) => {
    if (data?.action === 'progress') {
      if (typeof ttsProgressCallback === 'function') ttsProgressCallback(data.payload);
      return;
    }
    const request = pendingTtsRequests.get(data?.id); if (!request) return;
    pendingTtsRequests.delete(data.id);
    if (data.ok) request.resolve(data.result);
    else request.reject(Object.assign(new Error(data.error?.message || 'TTS operation failed.'), { code: data.error?.code }));
  };

  ttsWorker.onerror = () => {
    for (const request of pendingTtsRequests.values()) request.reject(new Error('TTS Worker stopped responding.'));
    pendingTtsRequests.clear();
  };

  const showNotice = (message, kind = 'success') => {
    notice.innerHTML = `<div class="alert alert-${kind} alert-dismissible fade show" role="alert">${escape(message)}<button type="button" class="btn-close" data-dismiss-notice aria-label="Close"></button></div>`;
  };

  const showImportReady = (validated) => {
    notice.innerHTML = `<div class="alert alert-info alert-dismissible fade show" role="alert">Backup validated: ${validated.applications} applications, ${validated.companies} companies, and ${validated.projects} projects.<button class="btn btn-sm btn-success ms-2" data-action="confirm-import">Import this backup</button><button type="button" class="btn-close" data-dismiss-notice aria-label="Close"></button></div>`;
  };

  const setNav = () => document.querySelectorAll('[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === state.view));
  const optionList = (items, selectedId, placeholder) => `<option value="">${placeholder}</option>${items.map(item => `<option value="${item.id}" ${Number(selectedId) === item.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}`;
  
  async function loadCatalogs() { [state.applications, state.companies] = await Promise.all([rpc('applications.list'), rpc('companies.list')]); }
  async function loadSettings(includeKey = false) { state.settings = await rpc('ai_settings.get', { include_key: includeKey }); }

  // Component renderers
  function catalogForm(kind, record = {}) {
    const verb = record.id ? 'Save changes' : `Add ${labels[kind].toLowerCase()}`;
    return `<form data-form="catalog" data-kind="${kind}" data-id="${record.id || ''}" class="card shadow-sm mb-4"><div class="card-body"><h1 class="h5 mb-3">${record.id ? `Edit ${labels[kind]}` : `New ${labels[kind]}`}</h1><label class="form-label" for="catalog-name">Name</label><input id="catalog-name" class="form-control" name="name" value="${escape(record.name)}" required autofocus><div class="d-flex gap-2 mt-3"><button class="btn btn-primary">${verb}</button>${record.id ? '<button class="btn btn-outline-secondary" type="button" data-action="back-list">Cancel</button>' : ''}</div></div></form>`;
  }

  function catalogList(kind, records) {
    const singular = labels[kind];
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><h1 class="h2 mb-1">${kind[0].toUpperCase() + kind.slice(1)}</h1><p class="text-body-secondary mb-0">Reference records available to content projects.</p></div><button class="btn btn-primary" data-action="new-catalog" data-kind="${kind}">Add ${singular}</button></div>${records.length ? `<div class="list-group shadow-sm">${records.map(record => `<div class="list-group-item d-flex justify-content-between align-items-center gap-3"><div><a href="#" class="fw-semibold link-body-emphasis" data-action="open-catalog" data-kind="${kind}" data-id="${record.id}">${escape(record.name)}</a><div class="small text-body-secondary">Updated ${escape(record.updated_at)}</div></div><div class="btn-group"><button class="btn btn-sm btn-outline-secondary" data-action="edit-catalog" data-kind="${kind}" data-id="${record.id}">Edit</button><button class="btn btn-sm btn-outline-danger" data-action="delete-catalog" data-kind="${kind}" data-id="${record.id}">Delete</button></div></div>`).join('')}</div>` : `<div class="empty-state bg-white rounded p-5 text-center"><p class="mb-0">No ${kind} yet. Add one to get started.</p></div>`}`;
  }

  function catalogDetail(kind, record) {
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><button class="btn btn-link p-0 mb-2" data-action="back-list">← Back to ${kind}</button><h1 class="h2 mb-0">${escape(record.name)}</h1></div><div class="btn-group"><button class="btn btn-outline-secondary" data-action="edit-catalog" data-kind="${kind}" data-id="${record.id}">Edit</button><button class="btn btn-outline-danger" data-action="delete-catalog" data-kind="${kind}" data-id="${record.id}">Delete</button></div></div><dl class="row card shadow-sm p-3"><dt class="col-sm-3">Created</dt><dd class="col-sm-9">${escape(record.created_at)}</dd><dt class="col-sm-3">Last updated</dt><dd class="col-sm-9 mb-0">${escape(record.updated_at)}</dd></dl>`;
  }

  function projectForm(project = {}) {
    return `<form data-form="project" data-id="${project.id || ''}" class="card shadow-sm mb-4"><div class="card-body"><h1 class="h5 mb-3">${project.id ? 'Edit content project' : 'New content project'}</h1><div class="mb-3"><label class="form-label" for="project-title">Title</label><input id="project-title" class="form-control" name="title" value="${escape(project.title)}" required autofocus></div><div class="mb-3"><label class="form-label" for="project-description">Description <span class="text-body-secondary">(optional)</span></label><textarea id="project-description" class="form-control" name="description" rows="3">${escape(project.description)}</textarea></div><div class="row"><div class="col-md-6 mb-3"><label class="form-label" for="project-application">Application <span class="text-body-secondary">(optional)</span></label><select id="project-application" class="form-select" name="application_id">${optionList(state.applications, project.application_id, 'No application')}</select></div><div class="col-md-6 mb-3"><label class="form-label" for="project-company">Company <span class="text-body-secondary">(optional)</span></label><select id="project-company" class="form-select" name="company_id">${optionList(state.companies, project.company_id, 'No company')}</select></div></div><div class="d-flex gap-2"><button class="btn btn-primary">${project.id ? 'Save changes' : 'Create project'}</button><button class="btn btn-outline-secondary" type="button" data-action="back-list">Cancel</button></div></div></form>`;
  }

  function projectList(records) {
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><h1 class="h2 mb-1">Content Projects</h1><p class="text-body-secondary mb-0">Capture ideas and retain one draft script or prompt per project.</p></div><button class="btn btn-primary" data-action="new-project">Add project</button></div>${records.length ? `<div class="row g-3">${records.map(project => `<div class="col-md-6"><article class="card record-card shadow-sm h-100"><div class="card-body d-flex flex-column"><h2 class="h5"><a class="link-body-emphasis" href="#" data-action="open-project" data-id="${project.id}">${escape(project.title)}</a></h2>${project.description ? `<p class="text-body-secondary">${escape(project.description)}</p>` : ''}<p class="small mb-3">${project.application_name ? `<span class="badge text-bg-light border me-1">${escape(project.application_name)}</span>` : ''}${project.company_name ? `<span class="badge text-bg-light border">${escape(project.company_name)}</span>` : ''}</p><div class="mt-auto d-flex justify-content-between align-items-center"><span class="small text-body-secondary">${project.draft ? 'Draft saved' : 'No draft yet'}</span><button class="btn btn-sm btn-outline-primary" data-action="open-project" data-id="${project.id}">Open</button></div></div></article></div>`).join('')}</div>` : `<div class="empty-state bg-white rounded p-5 text-center"><p class="mb-3">No content projects yet.</p><button class="btn btn-primary" data-action="new-project">Create your first project</button></div>`}`;
  }

  // Settings View
  function settingsView() {
    const providers = ['Gemini', 'OpenAI', 'Ollama'];
    const activeSetting = state.settings.find(s => s.is_active) || state.settings[0] || { provider: 'Gemini', api_key: '', endpoint: '', is_active: true };

    return `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h2 mb-1">AI Provider Settings</h1>
          <p class="text-body-secondary mb-0">Configure client-side AI credentials and custom service endpoints.</p>
        </div>
      </div>
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <form data-form="settings">
            <div class="mb-3">
              <label class="form-label" for="setting-provider">AI Provider</label>
              <select id="setting-provider" class="form-select" name="provider">
                ${providers.map(p => {
                  const match = state.settings.find(s => s.provider === p);
                  const activeBadge = match?.is_active ? ' (Active)' : '';
                  return `<option value="${p}" ${match?.provider === activeSetting.provider ? 'selected' : ''}>${p}${activeBadge}</option>`;
                }).join('')}
              </select>
            </div>
            
            <div class="mb-3" id="api-key-group">
              <label class="form-label" for="setting-api-key">API Key</label>
              <div class="input-group">
                <input id="setting-api-key" type="password" class="form-control" name="api_key" placeholder="Enter API Key" value="${escape(activeSetting.api_key || '')}">
                <button class="btn btn-outline-secondary" type="button" data-action="toggle-key-visibility">Reveal</button>
              </div>
              <div class="form-text text-muted">Stored securely in local browser database only. Never sent to backend servers.</div>
            </div>

            <div class="mb-3">
              <label class="form-label" for="setting-endpoint">Custom Endpoint URL <span class="text-body-secondary">(optional for Gemini/OpenAI, required for Ollama)</span></label>
              <input id="setting-endpoint" class="form-control" name="endpoint" placeholder="e.g. http://localhost:11434" value="${escape(activeSetting.endpoint || '')}">
            </div>

            <div class="form-check mb-4">
              <input id="setting-active" class="form-check-input" type="checkbox" name="is_active" ${activeSetting.is_active ? 'checked' : ''}>
              <label class="form-check-label" for="setting-active">Set as active AI provider</label>
            </div>

            <div id="connection-status" class="mb-3"></div>

            <div class="d-flex gap-2">
              <button type="submit" class="btn btn-primary">Save Settings</button>
              <button type="button" class="btn btn-outline-secondary" data-action="test-connection">Test Connection</button>
            </div>
          </form>
        </div>
      </div>
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h5 mb-3">Configured Providers</h2>
          <div class="table-responsive">
            <table class="table align-middle">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>API Key</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${state.settings.length ? state.settings.map(s => `
                  <tr>
                    <td class="fw-semibold">${escape(s.provider)}</td>
                    <td><code>${s.api_key ? '••••••••' : '<none>'}</code></td>
                    <td>${escape(s.endpoint || 'Default')}</td>
                    <td>${s.is_active ? '<span class="badge text-bg-success">Active</span>' : '<span class="badge text-bg-secondary">Inactive</span>'}</td>
                    <td class="small text-body-secondary">${escape(s.updated_at)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" class="text-center text-muted">No provider settings saved yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Project Detail with AI Script Generator & TTS Audio Studio
  function projectDetail(project) {
    const draft = project.draft || {};
    const activeTrack = state.activeAudioTrack;
    const voiceNames = { af_heart: 'Female Heart', af_bella: 'Female Bella', am_adam: 'Male Adam', am_michael: 'Male Michael' };

    return `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button class="btn btn-link p-0 mb-2" data-action="back-list">← Back to projects</button>
          <h1 class="h2 mb-0">${escape(project.title)}</h1>
        </div>
        <div class="btn-group">
          <button class="btn btn-outline-secondary" data-action="edit-project" data-id="${project.id}">Edit</button>
          <button class="btn btn-outline-danger" data-action="delete-project" data-id="${project.id}">Delete</button>
        </div>
      </div>

      <section class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h5">Project details</h2>
          <p>${escape(project.description || 'No description provided.')}</p>
          <dl class="row mb-0">
            <dt class="col-sm-3">Application</dt>
            <dd class="col-sm-9">${escape(project.application_name || 'None')}</dd>
            <dt class="col-sm-3">Company</dt>
            <dd class="col-sm-9 mb-0">${escape(project.company_name || 'None')}</dd>
          </dl>
        </div>
      </section>

      <!-- Script & Prompt Draft Section -->
      <section class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Draft ${project.draft ? `<span class="badge text-bg-secondary text-uppercase">${escape(draft.draft_type)}</span>` : ''}</h2>
          </div>

          ${project.draft ? `<p class="draft-body border rounded bg-body-tertiary p-3">${escape(draft.body)}</p>` : '<p class="text-body-secondary">No draft saved yet.</p>'}

          <!-- AI Script Generator Panel -->
          <div class="card border-primary-subtle bg-light-subtle p-3 mb-4 rounded ai-generator-box">
            <h3 class="h6 fw-bold text-primary mb-2">✨ AI Script Generator</h3>
            <p class="small text-body-secondary mb-3">Generate video script content using client-side AI providers.</p>
            <div class="mb-3">
              <label class="form-label small fw-semibold" for="ai-prompt">Topic / Prompt Instructions</label>
              <textarea id="ai-prompt" class="form-control form-control-sm" rows="3" placeholder="e.g. Write a 30-second promotional script about launching our new browser app..."></textarea>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-primary" data-action="generate-script" data-project-id="${project.id}">Generate Script with AI</button>
              <span id="ai-generator-status" class="small text-muted"></span>
            </div>
          </div>

          <form data-form="draft" data-id="${project.id}">
            <div class="mb-3">
              <label class="form-label" for="draft-type">Draft type</label>
              <select id="draft-type" class="form-select" name="draft_type">
                <option value="script" ${draft.draft_type === 'script' || !draft.draft_type ? 'selected' : ''}>Script</option>
                <option value="prompt" ${draft.draft_type === 'prompt' ? 'selected' : ''}>Prompt</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label" for="draft-body">Draft text</label>
              <textarea id="draft-body" class="form-control" name="body" rows="6" required>${escape(draft.body || '')}</textarea>
            </div>
            <button class="btn btn-primary">${project.draft ? 'Save draft changes' : 'Save draft'}</button>
          </form>
        </div>
      </section>

      <!-- TTS Dialogue Audio Studio Section -->
      <section class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h5 mb-3">🎙️ Dialogue Text-to-Speech (TTS) Studio</h2>
          <p class="text-body-secondary small mb-3">Synthesize dialogue audio tracks directly in browser using Kokoro WebAssembly TTS.</p>

          <div class="tts-controls p-3 mb-4">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold" for="tts-voice">Voice Selection</label>
                <select id="tts-voice" class="form-select form-select-sm">
                  <option value="af_heart">af_heart (Female Heart)</option>
                  <option value="af_bella">af_bella (Female Bella)</option>
                  <option value="am_adam">am_adam (Male Adam)</option>
                  <option value="am_michael">am_michael (Male Michael)</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold d-flex justify-content-between" for="tts-speed">
                  <span>Speech Speed</span>
                  <span id="speed-val" class="speed-readout">1.00x</span>
                </label>
                <input id="tts-speed" type="range" class="form-range" min="0.75" max="1.25" step="0.05" value="1.00" oninput="document.getElementById('speed-val').textContent = parseFloat(this.value).toFixed(2) + 'x'">
              </div>
            </div>

            <div class="mt-3 d-flex align-items-center gap-3">
              <button class="btn btn-sm btn-success" data-action="synthesize-audio" data-project-id="${project.id}">Synthesize Audio</button>
              <div id="tts-progress-container" class="flex-grow-1" style="display: none;">
                <div class="progress" style="height: 12px;">
                  <div id="tts-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 0%;"></div>
                </div>
                <span id="tts-progress-text" class="small text-muted">Initializing...</span>
              </div>
            </div>
          </div>

          <!-- HTML5 Active Audio Preview Player -->
          <div class="card audio-preview-card p-3 mb-4">
            <h3 class="h6 fw-bold mb-2">Active Audio Preview</h3>
            ${activeTrack ? `
              <div class="mb-2">
                <span class="badge text-bg-primary me-1">${escape(voiceNames[activeTrack.voice_id] || activeTrack.voice_id)}</span>
                <span class="badge text-bg-secondary me-1">${activeTrack.speed.toFixed(2)}x Speed</span>
                <span class="badge text-bg-info text-white me-1">${activeTrack.duration}s</span>
                <span class="small text-muted ms-2">Synthesized ${escape(activeTrack.created_at)}</span>
              </div>
              <audio id="audio-player" class="w-100 mb-2" controls src="${currentAudioObjectUrl || ''}"></audio>
              <div class="small text-body-secondary italic border-top pt-2">Snapshot script: "${escape(activeTrack.script_snapshot.slice(0, 100))}${activeTrack.script_snapshot.length > 100 ? '...' : ''}"</div>
            ` : '<p class="text-muted mb-0 small">No audio track synthesized yet. Click "Synthesize Audio" above to create one.</p>'}
          </div>

          <!-- Historical Audio Tracks List -->
          <div>
            <h3 class="h6 fw-bold mb-3">Synthesized Audio History (${state.audioTracks.length})</h3>
            ${state.audioTracks.length ? `
              <div class="list-group shadow-sm">
                ${state.audioTracks.map(track => `
                  <div class="list-group-item audio-history-item d-flex justify-content-between align-items-center gap-3">
                    <div>
                      <div class="fw-semibold small">
                        ${escape(voiceNames[track.voice_id] || track.voice_id)} &bull; ${track.speed.toFixed(2)}x speed &bull; ${track.duration}s
                        ${activeTrack && activeTrack.id === track.id ? '<span class="badge text-bg-success ms-2">Active Preview</span>' : ''}
                      </div>
                      <div class="small text-body-secondary">"${escape(track.script_snapshot.slice(0, 70))}${track.script_snapshot.length > 70 ? '...' : ''}" &bull; ${escape(track.created_at)}</div>
                    </div>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-outline-primary" data-action="load-audio-track" data-id="${track.id}">Play</button>
                      <button class="btn btn-sm btn-outline-danger" data-action="delete-audio-track" data-id="${track.id}" data-project-id="${project.id}">Delete</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-muted small">No previous audio tracks recorded.</p>'}
          </div>
        </div>
      </section>
    `;
  }

  // Client-Side AI Script Generator Handler
  async function generateAiScript(projectId) {
    const promptText = document.querySelector('#ai-prompt')?.value?.trim();
    const statusEl = document.querySelector('#ai-generator-status');
    
    if (!promptText) {
      showNotice('Please enter a prompt topic for AI script generation.', 'warning');
      return;
    }

    // Retrieve full settings with API keys
    const settings = await rpc('ai_settings.get', { include_key: true });
    const active = settings.find(s => s.is_active);

    if (!active || (!active.api_key && active.provider !== 'Ollama')) {
      showNotice('Active AI Provider is not configured or missing API key. Please configure Settings first.', 'danger');
      go('settings');
      return;
    }

    // Check if draft already exists
    const draftText = document.querySelector('#draft-body')?.value?.trim();
    if (draftText && !confirm('Replace existing draft content with generated AI script?')) {
      return;
    }

    try {
      if (statusEl) statusEl.textContent = `Calling ${active.provider} API...`;
      
      let generatedText = '';
      if (active.provider === 'Gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(active.api_key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Gemini API returned status ${res.status}`);
        }
        const data = await res.json();
        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (active.provider === 'OpenAI') {
        const endpoint = (active.endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const res = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${active.api_key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: promptText }]
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `OpenAI API returned status ${res.status}`);
        }
        const data = await res.json();
        generatedText = data.choices?.[0]?.message?.content || '';
      } else if (active.provider === 'Ollama') {
        const endpoint = (active.endpoint || 'http://localhost:11434').replace(/\/+$/, '');
        const res = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3', prompt: promptText, stream: false })
        });
        if (!res.ok) {
          throw new Error(`Ollama service at ${endpoint} returned status ${res.status}`);
        }
        const data = await res.json();
        generatedText = data.response || '';
      }

      if (!generatedText) throw new Error('AI provider returned empty script response.');

      // Upsert draft into workspace
      await rpc('drafts.upsert', { project_id: Number(projectId), draft_type: 'script', body: generatedText });
      showNotice('AI script generated and saved to draft!');
      go('project-detail', { selected: projectId });

    } catch (error) {
      if (statusEl) statusEl.textContent = '';
      showNotice(`AI Script Generation failed: ${error.message}`, 'danger');
    }
  }

  // Client-Side Connection Testing
  async function testConnection() {
    const provider = document.querySelector('#setting-provider')?.value;
    const apiKey = document.querySelector('#setting-api-key')?.value?.trim();
    const endpoint = document.querySelector('#setting-endpoint')?.value?.trim();
    const statusBox = document.querySelector('#connection-status');

    if (statusBox) statusBox.innerHTML = '<div class="spinner-border spinner-border-sm text-primary me-2"></div><span class="small">Testing connection...</span>';

    try {
      if (provider === 'Gemini') {
        if (!apiKey) throw new Error('API Key is required for Gemini.');
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        if (!res.ok) throw new Error(`Gemini validation failed (${res.status})`);
      } else if (provider === 'OpenAI') {
        if (!apiKey) throw new Error('API Key is required for OpenAI.');
        const baseUrl = (endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!res.ok) throw new Error(`OpenAI validation failed (${res.status})`);
      } else if (provider === 'Ollama') {
        const baseUrl = (endpoint || 'http://localhost:11434').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/api/tags`);
        if (!res.ok) throw new Error(`Ollama endpoint unreachable (${res.status})`);
      }
      if (statusBox) statusBox.innerHTML = `<div class="alert alert-success py-2 small mb-0">✓ Connection test successful for ${escape(provider)}!</div>`;
    } catch (error) {
      if (statusBox) statusBox.innerHTML = `<div class="alert alert-danger py-2 small mb-0">✗ Connection failed: ${escape(error.message)}</div>`;
    }
  }

  // Synthesis Action Handler
  async function synthesizeAudio(projectId) {
    const draftText = document.querySelector('#draft-body')?.value?.trim();
    if (!draftText) {
      showNotice('Please save or enter a draft script text before synthesizing audio.', 'warning');
      return;
    }

    const voiceId = document.querySelector('#tts-voice')?.value || 'af_heart';
    const speed = parseFloat(document.querySelector('#tts-speed')?.value || '1.0');

    const progressContainer = document.querySelector('#tts-progress-container');
    const progressBar = document.querySelector('#tts-progress-bar');
    const progressText = document.querySelector('#tts-progress-text');

    if (progressContainer) progressContainer.style.display = 'block';

    ttsProgressCallback = ({ status, progress, text }) => {
      if (progressBar) progressBar.style.width = `${Math.round((progress || 0) * 100)}%`;
      if (progressText) progressText.textContent = text || 'Processing...';
    };

    try {
      // Step 1: Synthesize via ttsWorker
      const ttsResult = await ttsRpc('synthesize', { text: draftText, voice_id: voiceId, speed });
      
      // Step 2: Persist audio track in SQLite via db-worker
      const savedTrack = await rpc('audio_tracks.save', {
        content_project_id: Number(projectId),
        voice_id: voiceId,
        speed: speed,
        script_snapshot: draftText,
        duration: ttsResult.duration,
        audio_blob: ttsResult.audio_blob
      });

      showNotice('Audio synthesis complete and saved to workspace!');
      await loadProjectAudioTracks(projectId, savedTrack.id);
      render();
    } catch (error) {
      showNotice(`Audio Synthesis failed: ${error.message}`, 'danger');
    } finally {
      if (progressContainer) progressContainer.style.display = 'none';
      ttsProgressCallback = null;
    }
  }

  async function loadProjectAudioTracks(projectId, autoActiveTrackId = null) {
    state.audioTracks = await rpc('audio_tracks.list', { content_project_id: Number(projectId) });
    const targetTrackId = autoActiveTrackId || (state.activeAudioTrack && state.audioTracks.some(t => t.id === state.activeAudioTrack.id) ? state.activeAudioTrack.id : state.audioTracks[0]?.id);
    if (targetTrackId) {
      await loadActiveAudioTrack(targetTrackId);
    } else {
      if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
      currentAudioObjectUrl = null;
      state.activeAudioTrack = null;
    }
  }

  async function loadActiveAudioTrack(trackId) {
    const fullTrack = await rpc('audio_tracks.get', { id: Number(trackId) });
    state.activeAudioTrack = fullTrack;

    if (currentAudioObjectUrl) {
      URL.revokeObjectURL(currentAudioObjectUrl);
      currentAudioObjectUrl = null;
    }
    
    let blobBytes = fullTrack.audio_blob;
    if (blobBytes instanceof Blob) {
      currentAudioObjectUrl = URL.createObjectURL(blobBytes);
    } else {
      if (Array.isArray(blobBytes)) blobBytes = new Uint8Array(blobBytes);
      else if (blobBytes instanceof ArrayBuffer) blobBytes = new Uint8Array(blobBytes);
      const blob = new Blob([blobBytes], { type: 'audio/wav' });
      currentAudioObjectUrl = URL.createObjectURL(blob);
    }
  }

  // Render Dispatcher
  async function render() {
    setNav();
    app.innerHTML = '<div class="text-body-secondary">Loading…</div>';
    try {
      if (state.view === 'settings') {
        await loadSettings(false);
        return void (app.innerHTML = settingsView());
      }
      if (state.view === 'catalog-form') return void (app.innerHTML = catalogForm(state.kind, state.record || {}));
      if (state.view === 'project-form') { await loadCatalogs(); return void (app.innerHTML = projectForm(state.record || {})); }
      if (state.view === 'catalog-detail') { state.record = await rpc(`${state.kind}.get`, { id: Number(state.selected) }); return void (app.innerHTML = catalogDetail(state.kind, state.record)); }
      if (state.view === 'project-detail') {
        state.record = await rpc('projects.get', { id: Number(state.selected) });
        await loadProjectAudioTracks(state.selected);
        return void (app.innerHTML = projectDetail(state.record));
      }
      if (state.view === 'projects') {
        const projects = await rpc('projects.list');
        const details = await Promise.all(projects.map(project => rpc('projects.get', { id: project.id })));
        return void (app.innerHTML = projectList(details));
      }
      app.innerHTML = catalogList(state.view, await rpc(`${state.view}.list`));
    } catch (error) { app.innerHTML = `<div class="alert alert-danger">${escape(error.message)}</div>`; }
  }

  function go(view, options = {}) {
    if (view !== 'project-detail' && currentAudioObjectUrl) {
      URL.revokeObjectURL(currentAudioObjectUrl);
      currentAudioObjectUrl = null;
      state.activeAudioTrack = null;
    }
    Object.assign(state, { view, selected: null, record: null, kind: null }, options);
    render();
  }

  async function refreshAfterWorkspaceReplacement(message) {
    if (currentAudioObjectUrl) {
      URL.revokeObjectURL(currentAudioObjectUrl);
      currentAudioObjectUrl = null;
    }
    state.activeAudioTrack = null;
    state.audioTracks = [];
    state.pendingImport = null;
    fileInput.value = '';
    showNotice(message);
    go('projects');
  }

  // Global Event Listeners
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-action], [data-view], [data-dismiss-notice]'); if (!target) return;
    
    // Allow default form submit & file inputs
    if (target.tagName !== 'A' && target.tagName !== 'BUTTON' && !target.dataset.action && !target.dataset.view && !target.dataset.dismissNotice) return;
    
    event.preventDefault();

    if (target.dataset.dismissNotice !== undefined) return void (notice.innerHTML = '');
    if (target.dataset.view) return go(target.dataset.view);
    
    const { action, id, kind, projectId } = target.dataset;
    try {
      if (action === 'back-list') return go(['project-form', 'project-detail'].includes(state.view) ? 'projects' : state.kind);
      if (action === 'new-catalog') return go('catalog-form', { kind });
      if (action === 'open-catalog') return go('catalog-detail', { kind, selected: id });
      if (action === 'edit-catalog') return go('catalog-form', { kind, record: await rpc(`${kind}.get`, { id: Number(id) }) });
      if (action === 'delete-catalog') { if (!confirm(`Delete this ${labels[kind].toLowerCase()}? Linked projects will retain no association.`)) return; await rpc(`${kind}.delete`, { id: Number(id) }); showNotice(`${labels[kind]} deleted.`); return go(kind); }
      if (action === 'new-project') return go('project-form');
      if (action === 'open-project') return go('project-detail', { selected: id });
      if (action === 'edit-project') return go('project-form', { record: await rpc('projects.get', { id: Number(id) }) });
      if (action === 'delete-project') {
        if (!confirm('Delete this content project and its draft?')) return;
        if (currentAudioObjectUrl) {
          URL.revokeObjectURL(currentAudioObjectUrl);
          currentAudioObjectUrl = null;
        }
        state.activeAudioTrack = null;
        state.audioTracks = [];
        await rpc('projects.delete', { id: Number(id) });
        showNotice('Content project deleted.');
        return go('projects');
      }
      
      // Enhancement Actions
      if (action === 'toggle-key-visibility') {
        const input = document.querySelector('#setting-api-key');
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
          target.textContent = input.type === 'password' ? 'Reveal' : 'Hide';
        }
        return;
      }
      if (action === 'test-connection') return testConnection();
      if (action === 'generate-script') return generateAiScript(projectId);
      if (action === 'synthesize-audio') return synthesizeAudio(projectId);
      if (action === 'load-audio-track') {
        await loadActiveAudioTrack(id);
        render();
        return;
      }
      if (action === 'delete-audio-track') {
        if (!confirm('Delete this synthesized audio track?')) return;
        if (state.activeAudioTrack && state.activeAudioTrack.id === Number(id)) {
          if (currentAudioObjectUrl) {
            URL.revokeObjectURL(currentAudioObjectUrl);
            currentAudioObjectUrl = null;
          }
          state.activeAudioTrack = null;
        }
        await rpc('audio_tracks.delete', { id: Number(id) });
        showNotice('Audio track deleted.');
        await loadProjectAudioTracks(projectId);
        render();
        return;
      }

      // Workspace Actions
      if (action === 'export-workspace') {
        const backup = await rpc('workspace.export');
        let blobData = backup.bytes;
        if (!blobData && backup.json) {
          blobData = typeof backup.json === 'string' ? backup.json : JSON.stringify(backup.json, null, 2);
        } else if (!blobData) {
          blobData = JSON.stringify(backup, null, 2);
        }
        const blob = new Blob([blobData], { type: 'application/json' });
        const filename = backup.filename || 'video-content-factory-workspace-v1.json';
        const url = URL.createObjectURL(blob);
        const link = Object.assign(document.createElement('a'), { href: url, download: filename });
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        showNotice('Workspace backup downloaded.');
        return;
      }
      if (action === 'confirm-import') { if (!state.pendingImport || !confirm('Replace the current browser workspace with this validated backup?')) return; await rpc('workspace.import.commit', { token: state.pendingImport.token }); return refreshAfterWorkspaceReplacement('Workspace imported.'); }
      if (action === 'reset-workspace') { if (!confirm('Restore sample data? This permanently replaces the current browser workspace.')) return; await rpc('workspace.reset', { confirmed: true }); return refreshAfterWorkspaceReplacement('Sample data restored.'); }
    } catch (error) { showNotice(error.message, 'danger'); }
  });

  // Dynamic Provider Selection update in Settings Form
  document.addEventListener('change', async event => {
    if (event.target.id === 'setting-provider') {
      const provider = event.target.value;
      const match = state.settings.find(s => s.provider === provider) || { provider, api_key: '', endpoint: '', is_active: false };
      const apiKeyInput = document.querySelector('#setting-api-key');
      const endpointInput = document.querySelector('#setting-endpoint');
      const activeCheck = document.querySelector('#setting-active');
      if (apiKeyInput) apiKeyInput.value = match.api_key || '';
      if (endpointInput) endpointInput.value = match.endpoint || '';
      if (activeCheck) activeCheck.checked = match.is_active || false;
    }
  });

  document.addEventListener('submit', async event => {
    const form = event.target; if (!form.matches('[data-form]')) return; event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      if (form.dataset.form === 'catalog') { const kind = form.dataset.kind; const id = form.dataset.id; await rpc(`${kind}.${id ? 'update' : 'create'}`, { ...(id ? { id: Number(id) } : {}), name: values.name }); showNotice(`${labels[kind]} ${id ? 'updated' : 'created'}.`); return go(kind); }
      if (form.dataset.form === 'project') { const id = form.dataset.id; const payload = { title: values.title, description: values.description, application_id: values.application_id ? Number(values.application_id) : null, company_id: values.company_id ? Number(values.company_id) : null }; const project = await rpc(`projects.${id ? 'update' : 'create'}`, { ...(id ? { id: Number(id) } : {}), ...payload }); showNotice(`Content project ${id ? 'updated' : 'created'}.`); return go('project-detail', { selected: project.id }); }
      if (form.dataset.form === 'settings') {
        const provider = values.provider;
        const apiKey = values.api_key;
        const endpoint = values.endpoint;
        const isActive = form.querySelector('[name="is_active"]')?.checked || false;
        await rpc('ai_settings.save', { provider, api_key: apiKey, endpoint, is_active: isActive });
        showNotice(`Settings saved for ${provider}.`);
        return go('settings');
      }
      const draft = await rpc('drafts.upsert', { project_id: Number(form.dataset.id), draft_type: values.draft_type, body: values.body }); showNotice(`${draft.draft_type === 'script' ? 'Script' : 'Prompt'} draft saved.`); go('project-detail', { selected: form.dataset.id });
    } catch (error) { showNotice(error.message, 'danger'); }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const validated = await rpc('workspace.import.validate', { bytes: new Uint8Array(arrayBuffer) });
      state.pendingImport = validated;
      showImportReady(validated);
    } catch (error) { state.pendingImport = null; showNotice(error.message, 'danger'); }
  });

  async function start() {
    try {
      const opened = await rpc('workspace.open');
      state.ready = true;
      workspaceStatus.textContent = opened.restored ? 'Browser workspace opened.' : 'New browser workspace created with sample data.';
      const initial = location.hash.slice(1);
      if (['projects', 'applications', 'companies', 'settings'].includes(initial)) state.view = initial;
      render();
      ttsRpc('init').catch(err => {
        console.warn('TTS init background notice:', err);
      });
    } catch (error) {
      workspaceStatus.textContent = 'Browser workspace unavailable.';
      app.innerHTML = `<div class="alert alert-danger">${escape(error.message)}</div>`;
    }
  }

  start();
})();
