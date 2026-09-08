/* Browser-local IndexedDB workspace owner. This Worker manages the native
 * IndexedDB database 'video-content-factory-workspace' for the browser runtime. */

const DB_NAME = "video-content-factory-workspace";
const DB_VERSION = 1;
const FORMAT_ID = "video-content-factory-workspace";
const FORMAT_VERSION = 1;
const APPLICATION_SEEDS = ["YouTube", "TikTok", "Instagram"];
const COMPANY_SEEDS = ["Acme Studio", "Northstar Media", "Pine & Peak"];
const SUPPORTED_PROVIDERS = ["Gemini", "OpenAI", "Ollama"];

let dbInstance = null;
let isRestored = false;
let pendingImport = null;
let requestChain = Promise.resolve();

class WorkerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function normalizeRequired(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new WorkerError("validation_error", `${field} must not be blank`);
  }
  return value.trim();
}

function normalizeOptional(value, field) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerError("validation_error", `${field} must be a positive integer or null`);
  }
  return value;
}

/* ==========================================================================
 * IndexedDB Promise Helpers
 * ========================================================================== */

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    let newlyCreated = false;
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      newlyCreated = true;

      // 1. applications
      if (!db.objectStoreNames.contains("applications")) {
        const appStore = db.createObjectStore("applications", { keyPath: "id", autoIncrement: true });
        appStore.createIndex("name", "name", { unique: true });
      }

      // 2. companies
      if (!db.objectStoreNames.contains("companies")) {
        const compStore = db.createObjectStore("companies", { keyPath: "id", autoIncrement: true });
        compStore.createIndex("name", "name", { unique: true });
      }

      // 3. content_projects
      if (!db.objectStoreNames.contains("content_projects")) {
        const projStore = db.createObjectStore("content_projects", { keyPath: "id", autoIncrement: true });
        projStore.createIndex("updated_at", "updated_at", { unique: false });
        projStore.createIndex("application_id", "application_id", { unique: false });
        projStore.createIndex("company_id", "company_id", { unique: false });
      }

      // 4. drafts
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "content_project_id" });
      }

      // 5. ai_settings
      if (!db.objectStoreNames.contains("ai_settings")) {
        db.createObjectStore("ai_settings", { keyPath: "provider" });
      }

      // 6. audio_tracks
      if (!db.objectStoreNames.contains("audio_tracks")) {
        const audioStore = db.createObjectStore("audio_tracks", { keyPath: "id", autoIncrement: true });
        audioStore.createIndex("content_project_id", "content_project_id", { unique: false });
      }

      // 7. workspace_meta
      if (!db.objectStoreNames.contains("workspace_meta")) {
        db.createObjectStore("workspace_meta", { keyPath: "singleton" });
      }

      // Seed initial data
      const stamp = now();
      const metaStore = tx.objectStore("workspace_meta");
      metaStore.add({ singleton: 1, format_id: FORMAT_ID, format_version: FORMAT_VERSION });

      const appStore = tx.objectStore("applications");
      for (const name of APPLICATION_SEEDS) {
        appStore.add({ name, created_at: stamp, updated_at: stamp });
      }

      const compStore = tx.objectStore("companies");
      for (const name of COMPANY_SEEDS) {
        compStore.add({ name, created_at: stamp, updated_at: stamp });
      }

      const aiStore = tx.objectStore("ai_settings");
      for (const provider of SUPPORTED_PROVIDERS) {
        aiStore.add({ provider, api_key: "", endpoint: "", is_active: 0, updated_at: stamp });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      isRestored = !newlyCreated;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new WorkerError("persistence_error", "The browser workspace database could not be opened."));
    };
  });
}

function getStore(storeName, mode = "readonly") {
  if (!dbInstance) {
    throw new WorkerError("validation_error", "Open the workspace before using it.");
  }
  const tx = dbInstance.transaction(storeName, mode);
  const store = tx.objectStore(Array.isArray(storeName) ? storeName[0] : storeName);
  return { store, tx };
}

function getStores(storeNames, mode = "readonly") {
  if (!dbInstance) {
    throw new WorkerError("validation_error", "Open the workspace before using it.");
  }
  const tx = dbInstance.transaction(storeNames, mode);
  const stores = {};
  for (const name of storeNames) {
    stores[name] = tx.objectStore(name);
  }
  return { stores, tx };
}

/* ==========================================================================
 * Catalog Operations (Applications & Companies)
 * ========================================================================== */

async function requireCatalogRow(table, id, label = table.slice(0, -1)) {
  if (!Number.isInteger(id) || id < 1) throw new WorkerError("not_found", `${label} was not found`);
  const { store } = getStore(table, "readonly");
  const record = await reqToPromise(store.get(id));
  if (!record) throw new WorkerError("not_found", `${label} ${id} was not found`);
  return record;
}

async function catalogList(table) {
  const { store } = getStore(table, "readonly");
  const records = await reqToPromise(store.getAll());
  return records.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}

async function catalogGet(table, payload) {
  const id = payload?.id;
  return requireCatalogRow(table, id);
}

async function catalogCreate(table, payload) {
  const name = normalizeRequired(payload?.name, "name");
  const stamp = now();
  const { store, tx } = getStore(table, "readwrite");

  // Check unique index
  const nameIndex = store.index("name");
  const existing = await reqToPromise(nameIndex.get(name));
  if (existing) {
    throw new WorkerError("conflict", `An ${table.slice(0, -1)} with that name already exists.`);
  }

  const id = await reqToPromise(store.add({ name, created_at: stamp, updated_at: stamp }));
  await txDone(tx);
  return { id, name, created_at: stamp, updated_at: stamp };
}

async function catalogUpdate(table, payload) {
  const id = payload?.id;
  const existing = await requireCatalogRow(table, id);
  const name = normalizeRequired(payload?.name, "name");
  const stamp = now();

  const { store, tx } = getStore(table, "readwrite");
  const nameIndex = store.index("name");
  const duplicate = await reqToPromise(nameIndex.get(name));
  if (duplicate && duplicate.id !== id) {
    throw new WorkerError("conflict", `An ${table.slice(0, -1)} with that name already exists.`);
  }

  const updatedRecord = { ...existing, name, updated_at: stamp };
  await reqToPromise(store.put(updatedRecord));
  await txDone(tx);
  return updatedRecord;
}

async function catalogDelete(table, payload) {
  const id = payload?.id;
  const record = await requireCatalogRow(table, id);

  const { stores, tx } = getStores([table, "content_projects"], "readwrite");
  await reqToPromise(stores[table].delete(id));

  // Nullify references in content_projects
  const foreignKey = table === "applications" ? "application_id" : "company_id";
  const projIndex = stores.content_projects.index(foreignKey);
  const affectedProjects = await reqToPromise(projIndex.getAll(id));
  for (const proj of affectedProjects) {
    proj[foreignKey] = null;
    await reqToPromise(stores.content_projects.put(proj));
  }

  await txDone(tx);
  return record;
}

/* ==========================================================================
 * Project Operations
 * ========================================================================== */

async function requireProject(id) {
  if (!Number.isInteger(id) || id < 1) throw new WorkerError("not_found", `Project ${id} was not found.`);
  const { store } = getStore("content_projects", "readonly");
  const record = await reqToPromise(store.get(id));
  if (!record) throw new WorkerError("not_found", `Project ${id} was not found.`);
  return record;
}

async function projectList() {
  const { stores } = getStores(["content_projects", "applications", "companies"], "readonly");
  const [projects, applications, companies] = await Promise.all([
    reqToPromise(stores.content_projects.getAll()),
    reqToPromise(stores.applications.getAll()),
    reqToPromise(stores.companies.getAll()),
  ]);

  const appMap = new Map(applications.map((a) => [a.id, a]));
  const compMap = new Map(companies.map((c) => [c.id, c]));

  const enriched = projects.map((p) => ({
    ...p,
    application_name: p.application_id ? (appMap.get(p.application_id)?.name || null) : null,
    company_name: p.company_id ? (compMap.get(p.company_id)?.name || null) : null,
  }));

  return enriched.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id);
}

async function projectDetail(id) {
  const { stores } = getStores(["content_projects", "applications", "companies", "drafts"], "readonly");
  const proj = await reqToPromise(stores.content_projects.get(id));
  if (!proj) throw new WorkerError("not_found", `Project ${id} was not found.`);

  const [app, comp, draft] = await Promise.all([
    proj.application_id ? reqToPromise(stores.applications.get(proj.application_id)) : null,
    proj.company_id ? reqToPromise(stores.companies.get(proj.company_id)) : null,
    reqToPromise(stores.drafts.get(id)),
  ]);

  return {
    ...proj,
    application_name: app ? app.name : null,
    company_name: comp ? comp.name : null,
    draft: draft || null,
  };
}

function projectPayload(payload) {
  return {
    title: normalizeRequired(payload?.title, "title"),
    description: typeof payload?.description === "string" ? payload.description.trim() : "",
    application_id: normalizeOptional(payload?.application_id, "application_id"),
    company_id: normalizeOptional(payload?.company_id, "company_id"),
  };
}

async function validateAssociations(applicationId, companyId, appStore, compStore) {
  if (applicationId !== null) {
    const app = await reqToPromise(appStore.get(applicationId));
    if (!app) throw new WorkerError("validation_error", `Application ${applicationId} was not found.`);
  }
  if (companyId !== null) {
    const comp = await reqToPromise(compStore.get(companyId));
    if (!comp) throw new WorkerError("validation_error", `Company ${companyId} was not found.`);
  }
}

async function projectCreate(payload) {
  const input = projectPayload(payload);
  const stamp = now();

  const { stores, tx } = getStores(["content_projects", "applications", "companies"], "readwrite");
  await validateAssociations(input.application_id, input.company_id, stores.applications, stores.companies);

  const newProj = {
    title: input.title,
    description: input.description,
    application_id: input.application_id,
    company_id: input.company_id,
    created_at: stamp,
    updated_at: stamp,
  };

  const id = await reqToPromise(stores.content_projects.add(newProj));
  await txDone(tx);
  return projectDetail(id);
}

async function projectUpdate(payload) {
  const id = payload?.id;
  const existing = await requireProject(id);
  const input = projectPayload(payload);

  const { stores, tx } = getStores(["content_projects", "applications", "companies"], "readwrite");
  await validateAssociations(input.application_id, input.company_id, stores.applications, stores.companies);

  const updatedProj = {
    ...existing,
    title: input.title,
    description: input.description,
    application_id: input.application_id,
    company_id: input.company_id,
    updated_at: now(),
  };

  await reqToPromise(stores.content_projects.put(updatedProj));
  await txDone(tx);
  return projectDetail(id);
}

async function projectDelete(payload) {
  const id = payload?.id;
  const { stores, tx } = getStores(["content_projects", "applications", "companies", "drafts", "audio_tracks"], "readwrite");

  const proj = await reqToPromise(stores.content_projects.get(id));
  if (!proj) throw new WorkerError("not_found", `Project ${id} was not found.`);

  const [app, comp] = await Promise.all([
    proj.application_id ? reqToPromise(stores.applications.get(proj.application_id)) : null,
    proj.company_id ? reqToPromise(stores.companies.get(proj.company_id)) : null,
  ]);

  // Delete project
  await reqToPromise(stores.content_projects.delete(id));

  // Cascading delete: drafts
  await reqToPromise(stores.drafts.delete(id));

  // Cascading delete: audio_tracks
  const audioIndex = stores.audio_tracks.index("content_project_id");
  const tracks = await reqToPromise(audioIndex.getAll(id));
  for (const track of tracks) {
    await reqToPromise(stores.audio_tracks.delete(track.id));
  }

  await txDone(tx);

  return {
    ...proj,
    application_name: app ? app.name : null,
    company_name: comp ? comp.name : null,
  };
}

/* ==========================================================================
 * Draft Operations
 * ========================================================================== */

async function upsertDraft(payload) {
  const projectId = payload?.project_id;
  await requireProject(projectId);

  const draftType = payload?.draft_type;
  if (draftType !== "script" && draftType !== "prompt") {
    throw new WorkerError("validation_error", "draft_type must be script or prompt");
  }
  const body = normalizeRequired(payload?.body, "body");
  const stamp = now();

  const { store, tx } = getStore("drafts", "readwrite");
  const existing = await reqToPromise(store.get(projectId));

  const draftRecord = {
    content_project_id: projectId,
    draft_type: draftType,
    body: body,
    created_at: existing ? existing.created_at : stamp,
    updated_at: stamp,
  };

  await reqToPromise(store.put(draftRecord));
  await txDone(tx);
  return draftRecord;
}

/* ==========================================================================
 * AI Settings Operations
 * ========================================================================== */

async function aiSettingsGet(includeKey = false) {
  const { store } = getStore("ai_settings", "readonly");
  const records = await reqToPromise(store.getAll());
  const sorted = records.sort((a, b) => a.provider.localeCompare(b.provider));
  return sorted.map((row) => ({
    provider: row.provider,
    api_key: includeKey ? row.api_key : (row.api_key ? "••••••••" : ""),
    endpoint: row.endpoint || "",
    is_active: Boolean(row.is_active),
    updated_at: row.updated_at,
  }));
}

async function aiSettingsSave(payload) {
  const provider = payload?.provider;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new WorkerError("validation_error", `Provider must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`);
  }
  const apiKey = typeof payload?.api_key === "string" ? payload.api_key.trim() : "";
  const endpoint = typeof payload?.endpoint === "string" ? payload.endpoint.trim() : "";
  const isActive = payload?.is_active === 1 || payload?.is_active === true ? 1 : 0;
  const stamp = now();

  const { store, tx } = getStore("ai_settings", "readwrite");
  const allSettings = await reqToPromise(store.getAll());

  if (isActive === 1) {
    for (const setting of allSettings) {
      if (setting.is_active) {
        setting.is_active = 0;
        await reqToPromise(store.put(setting));
      }
    }
  }

  const updated = {
    provider,
    api_key: apiKey,
    endpoint,
    is_active: isActive,
    updated_at: stamp,
  };

  await reqToPromise(store.put(updated));
  await txDone(tx);
  return aiSettingsGet(false);
}

/* ==========================================================================
 * Audio Tracks Operations
 * ========================================================================== */

async function audioTracksSave(payload) {
  const projectId = payload?.content_project_id;
  await requireProject(projectId);

  const voiceId = normalizeRequired(payload?.voice_id, "voice_id");
  const speed = typeof payload?.speed === "number" ? payload.speed : parseFloat(payload?.speed);
  if (isNaN(speed) || speed < 0.75 || speed > 1.25) {
    throw new WorkerError("validation_error", "speed must be between 0.75 and 1.25");
  }
  const scriptSnapshot = normalizeRequired(payload?.script_snapshot, "script_snapshot");
  const duration = typeof payload?.duration === "number" ? payload.duration : parseFloat(payload?.duration);
  if (isNaN(duration) || duration < 0) {
    throw new WorkerError("validation_error", "duration must be a non-negative number");
  }

  let audioBytes = payload?.audio_blob;
  if (audioBytes instanceof ArrayBuffer) {
    audioBytes = new Uint8Array(audioBytes);
  } else if (!(audioBytes instanceof Uint8Array) && !(audioBytes instanceof Blob)) {
    if (Array.isArray(audioBytes)) {
      audioBytes = new Uint8Array(audioBytes);
    } else {
      throw new WorkerError("validation_error", "audio_blob must be binary data");
    }
  }

  const stamp = now();
  const { store, tx } = getStore("audio_tracks", "readwrite");

  const trackRecord = {
    content_project_id: projectId,
    voice_id: voiceId,
    speed,
    script_snapshot: scriptSnapshot,
    duration,
    audio_blob: audioBytes,
    created_at: stamp,
  };

  const id = await reqToPromise(store.add(trackRecord));
  await txDone(tx);

  return {
    id,
    content_project_id: projectId,
    voice_id: voiceId,
    speed,
    script_snapshot: scriptSnapshot,
    duration,
    created_at: stamp,
  };
}

async function audioTracksList(projectId) {
  if (projectId) await requireProject(projectId);

  const { store } = getStore("audio_tracks", "readonly");
  let records;
  if (projectId) {
    const index = store.index("content_project_id");
    records = await reqToPromise(index.getAll(projectId));
  } else {
    records = await reqToPromise(store.getAll());
  }

  const summaries = records.map((t) => ({
    id: t.id,
    content_project_id: t.content_project_id,
    voice_id: t.voice_id,
    speed: t.speed,
    script_snapshot: t.script_snapshot,
    duration: t.duration,
    created_at: t.created_at,
  }));

  return summaries.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
}

async function audioTracksGet(id) {
  if (!Number.isInteger(id) || id < 1) throw new WorkerError("not_found", "Audio track was not found");
  const { store } = getStore("audio_tracks", "readonly");
  const record = await reqToPromise(store.get(id));
  if (!record) throw new WorkerError("not_found", `Audio track ${id} was not found`);
  return record;
}

async function audioTracksDelete(id) {
  if (!Number.isInteger(id) || id < 1) throw new WorkerError("not_found", "Audio track was not found");
  const { store, tx } = getStore("audio_tracks", "readwrite");
  const record = await reqToPromise(store.get(id));
  if (!record) throw new WorkerError("not_found", `Audio track ${id} was not found`);

  await reqToPromise(store.delete(id));
  await txDone(tx);

  return {
    id: record.id,
    content_project_id: record.content_project_id,
    voice_id: record.voice_id,
    speed: record.speed,
    script_snapshot: record.script_snapshot,
    duration: record.duration,
    created_at: record.created_at,
  };
}

/* ==========================================================================
 * Workspace Export / Import / Reset Operations
 * ========================================================================== */

async function workspaceReset(payload) {
  if (payload?.confirmed !== true) {
    throw new WorkerError("validation_error", "Confirm sample-data restoration before replacing the workspace.");
  }

  const storeNames = ["applications", "companies", "content_projects", "drafts", "ai_settings", "audio_tracks", "workspace_meta"];
  const { stores, tx } = getStores(storeNames, "readwrite");

  for (const name of storeNames) {
    await reqToPromise(stores[name].clear());
  }

  const stamp = now();
  await reqToPromise(stores.workspace_meta.add({ singleton: 1, format_id: FORMAT_ID, format_version: FORMAT_VERSION }));

  for (const name of APPLICATION_SEEDS) {
    await reqToPromise(stores.applications.add({ name, created_at: stamp, updated_at: stamp }));
  }

  for (const name of COMPANY_SEEDS) {
    await reqToPromise(stores.companies.add({ name, created_at: stamp, updated_at: stamp }));
  }

  for (const provider of SUPPORTED_PROVIDERS) {
    await reqToPromise(stores.ai_settings.add({ provider, api_key: "", endpoint: "", is_active: 0, updated_at: stamp }));
  }

  await txDone(tx);
  pendingImport = null;
  return { reset: true };
}

async function workspaceExport() {
  const storeNames = ["applications", "companies", "content_projects", "drafts", "ai_settings", "audio_tracks", "workspace_meta"];
  const { stores } = getStores(storeNames, "readonly");

  const [applications, companies, content_projects, drafts, ai_settings, audio_tracks, workspace_meta] = await Promise.all(
    storeNames.map((name) => reqToPromise(stores[name].getAll()))
  );

  const sanitizedAiSettings = ai_settings.map((s) => ({ ...s, api_key: "" }));

  const exportData = {
    format_id: FORMAT_ID,
    format_version: FORMAT_VERSION,
    workspace_meta,
    applications,
    companies,
    content_projects,
    drafts,
    ai_settings: sanitizedAiSettings,
    audio_tracks: audio_tracks.map((t) => ({
      ...t,
      audio_blob: t.audio_blob instanceof Uint8Array ? Array.from(t.audio_blob) : t.audio_blob,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const bytes = new TextEncoder().encode(jsonString);

  return {
    filename: `video-content-factory-workspace-v${FORMAT_VERSION}.json`,
    bytes,
  };
}

async function workspaceImportValidate(payload) {
  let data = null;
  let bytes = payload?.bytes;

  if (payload?.data && typeof payload.data === "object") {
    data = payload.data;
  } else if (typeof payload?.text === "string" || typeof payload?.json === "string") {
    try {
      data = JSON.parse(payload.text || payload.json);
    } catch (_) {
      throw new WorkerError("invalid_import", "The selected file is not a valid workspace JSON backup.");
    }
  } else {
    if (!(bytes instanceof Uint8Array)) {
      if (Array.isArray(bytes)) {
        bytes = new Uint8Array(bytes);
      } else if (bytes instanceof ArrayBuffer) {
        bytes = new Uint8Array(bytes);
      } else if (bytes && ArrayBuffer.isView(bytes)) {
        bytes = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      } else {
        bytes = new Uint8Array(0);
      }
    }
    if (!bytes.byteLength) throw new WorkerError("invalid_import", "Choose a non-empty workspace backup file.");

    try {
      const text = new TextDecoder().decode(bytes);
      data = JSON.parse(text);
    } catch (_) {
      throw new WorkerError("invalid_import", "The selected file is not a valid workspace JSON backup.");
    }
  }

  if (data?.format_id !== FORMAT_ID || data?.format_version !== FORMAT_VERSION) {
    throw new WorkerError("invalid_import", "The selected workspace format is not supported.");
  }

  if (!Array.isArray(data.applications) || !Array.isArray(data.companies) || !Array.isArray(data.content_projects)) {
    throw new WorkerError("invalid_import", "The selected file is missing required workspace tables.");
  }

  const token = crypto.randomUUID();
  pendingImport = { token, data };

  return {
    token,
    applications: data.applications.length,
    companies: data.companies.length,
    projects: data.content_projects.length,
    message: "Workspace is valid and ready to import.",
  };
}

async function workspaceImportCommit(payload) {
  if (!pendingImport || payload?.token !== pendingImport.token) {
    throw new WorkerError("invalid_import", "This import approval is stale or unknown. Validate the file again.");
  }

  const { data } = pendingImport;
  const storeNames = ["applications", "companies", "content_projects", "drafts", "ai_settings", "audio_tracks", "workspace_meta"];
  const { stores, tx } = getStores(storeNames, "readwrite");

  for (const name of storeNames) {
    await reqToPromise(stores[name].clear());
  }

  if (Array.isArray(data.workspace_meta) && data.workspace_meta.length) {
    for (const item of data.workspace_meta) await reqToPromise(stores.workspace_meta.add(item));
  } else {
    await reqToPromise(stores.workspace_meta.add({ singleton: 1, format_id: FORMAT_ID, format_version: FORMAT_VERSION }));
  }

  for (const item of data.applications || []) await reqToPromise(stores.applications.add(item));
  for (const item of data.companies || []) await reqToPromise(stores.companies.add(item));
  for (const item of data.content_projects || []) await reqToPromise(stores.content_projects.add(item));
  for (const item of data.drafts || []) await reqToPromise(stores.drafts.add(item));
  for (const item of data.ai_settings || []) await reqToPromise(stores.ai_settings.add(item));

  for (const item of data.audio_tracks || []) {
    let blob = item.audio_blob;
    if (Array.isArray(blob)) blob = new Uint8Array(blob);
    await reqToPromise(stores.audio_tracks.add({ ...item, audio_blob: blob }));
  }

  await txDone(tx);
  pendingImport = null;
  return { imported: true };
}

/* ==========================================================================
 * RPC Dispatcher
 * ========================================================================== */

async function openWorkspace() {
  if (dbInstance) {
    return { format_id: FORMAT_ID, format_version: FORMAT_VERSION, restored: true };
  }
  await openDatabase();
  return { format_id: FORMAT_ID, format_version: FORMAT_VERSION, restored: isRestored };
}

async function dispatch(operation, payload) {
  if (operation === "workspace.open") return openWorkspace();
  if (!dbInstance) throw new WorkerError("validation_error", "Open the workspace before using it.");

  if (operation === "workspace.export") return workspaceExport();
  if (operation === "workspace.import.validate") return workspaceImportValidate(payload);
  if (operation === "workspace.import.commit") return workspaceImportCommit(payload);
  if (operation === "workspace.reset") return workspaceReset(payload);

  // Applications & Companies
  if (operation === "applications.list") return catalogList("applications");
  if (operation === "applications.get") return catalogGet("applications", payload);
  if (operation === "applications.create") return catalogCreate("applications", payload);
  if (operation === "applications.update") return catalogUpdate("applications", payload);
  if (operation === "applications.delete") return catalogDelete("applications", payload);

  if (operation === "companies.list") return catalogList("companies");
  if (operation === "companies.get") return catalogGet("companies", payload);
  if (operation === "companies.create") return catalogCreate("companies", payload);
  if (operation === "companies.update") return catalogUpdate("companies", payload);
  if (operation === "companies.delete") return catalogDelete("companies", payload);

  // Projects
  if (operation === "projects.list") return projectList();
  if (operation === "projects.get") return projectDetail(payload?.id);
  if (operation === "projects.create") return projectCreate(payload);
  if (operation === "projects.update") return projectUpdate(payload);
  if (operation === "projects.delete") return projectDelete(payload);

  // Drafts
  if (operation === "drafts.upsert") return upsertDraft(payload);

  // AI Settings
  if (operation === "ai_settings.get") return aiSettingsGet(payload?.include_key);
  if (operation === "ai_settings.save") return aiSettingsSave(payload);

  // Audio Tracks
  if (operation === "audio_tracks.save") return audioTracksSave(payload);
  if (operation === "audio_tracks.list") return audioTracksList(payload?.content_project_id);
  if (operation === "audio_tracks.get") return audioTracksGet(payload?.id);
  if (operation === "audio_tracks.delete") return audioTracksDelete(payload?.id);

  throw new WorkerError("validation_error", "Unknown workspace operation.");
}

self.onmessage = (event) => {
  const { id, operation, payload } = event.data || {};
  requestChain = requestChain.then(async () => {
    try {
      const result = await dispatch(operation, payload);
      self.postMessage({ id, ok: true, result });
    } catch (error) {
      const safe = error instanceof WorkerError
        ? error
        : new WorkerError("persistence_error", error?.message || "The browser workspace could not complete that request.");
      self.postMessage({ id, ok: false, error: { code: safe.code, message: safe.message } });
    }
  });
};

