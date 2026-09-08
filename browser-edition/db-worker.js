/* Browser-local SQLite workspace owner. This Worker is the only code that
 * loads sql.js, opens OPFS, or constructs SQL for the browser runtime. */
importScripts("vendor/sql.js/sql-wasm.js");

const WORKSPACE_FILE = "video-content-factory-workspace.sqlite";
const FORMAT_ID = "video-content-factory-workspace";
const FORMAT_VERSION = 1;
const APPLICATION_SEEDS = ["YouTube", "TikTok", "Instagram"];
const COMPANY_SEEDS = ["Acme Studio", "Northstar Media", "Pine & Peak"];
const REQUIRED_TABLES = ["applications", "companies", "content_projects", "drafts", "workspace_meta", "ai_settings", "audio_tracks"];
const REQUIRED_INDEXES = ["idx_content_projects_application_id", "idx_content_projects_company_id", "idx_audio_tracks_content_project_id"];
const SUPPORTED_PROVIDERS = ["Gemini", "OpenAI", "Ollama"];


let SQL;
let db;
let persistedBytes;
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

function rows(statement, params = []) {
  const result = db.exec(statement, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((valueRow) => Object.fromEntries(columns.map((column, i) => [column, valueRow[i]])));
}

function one(statement, params = []) {
  return rows(statement, params)[0] || null;
}

function requireRow(table, id, label = table.slice(0, -1)) {
  if (!Number.isInteger(id) || id < 1) throw new WorkerError("not_found", `${label} was not found`);
  const record = one(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!record) throw new WorkerError("not_found", `${label} ${id} was not found`);
  return record;
}

function transaction(action) {
  db.run("BEGIN");
  try {
    const result = action();
    db.run("COMMIT");
    return result;
  } catch (error) {
    try { db.run("ROLLBACK"); } catch (_) { /* transaction was not opened */ }
    throw error;
  }
}

function createSchema(target) {
  target.run("PRAGMA foreign_keys = ON");
  target.run(`CREATE TABLE applications (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`);
  target.run(`CREATE TABLE companies (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`);
  target.run(`CREATE TABLE content_projects (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`);
  target.run(`CREATE TABLE drafts (
    id INTEGER PRIMARY KEY, content_project_id INTEGER NOT NULL UNIQUE
      REFERENCES content_projects(id) ON DELETE CASCADE,
    draft_type TEXT NOT NULL CHECK (draft_type IN ('script', 'prompt')),
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`);
  target.run(`CREATE TABLE workspace_meta (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    format_id TEXT NOT NULL CHECK (format_id = '${FORMAT_ID}'),
    format_version INTEGER NOT NULL CHECK (format_version = ${FORMAT_VERSION})
  );`);
  target.run(`CREATE TABLE ai_settings (
    provider TEXT PRIMARY KEY CHECK (provider IN ('Gemini', 'OpenAI', 'Ollama')),
    api_key TEXT NOT NULL DEFAULT '',
    endpoint TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
    updated_at TEXT NOT NULL
  );`);
  target.run(`CREATE TABLE audio_tracks (
    id INTEGER PRIMARY KEY,
    content_project_id INTEGER NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
    voice_id TEXT NOT NULL CHECK (length(trim(voice_id)) > 0),
    speed REAL NOT NULL CHECK (speed >= 0.75 AND speed <= 1.25),
    script_snapshot TEXT NOT NULL CHECK (length(trim(script_snapshot)) > 0),
    duration REAL NOT NULL CHECK (duration >= 0.0),
    audio_blob BLOB NOT NULL,
    created_at TEXT NOT NULL
  );`);
  target.run("CREATE INDEX idx_content_projects_application_id ON content_projects(application_id)");
  target.run("CREATE INDEX idx_content_projects_company_id ON content_projects(company_id)");
  target.run("CREATE INDEX idx_audio_tracks_content_project_id ON audio_tracks(content_project_id)");
  target.run("INSERT INTO workspace_meta (singleton, format_id, format_version) VALUES (1, ?, ?)", [FORMAT_ID, FORMAT_VERSION]);
  const stamp = now();
  for (const name of APPLICATION_SEEDS) target.run("INSERT INTO applications (name, created_at, updated_at) VALUES (?, ?, ?)", [name, stamp, stamp]);
  for (const name of COMPANY_SEEDS) target.run("INSERT INTO companies (name, created_at, updated_at) VALUES (?, ?, ?)", [name, stamp, stamp]);
}

function freshDatabase() {
  const target = new SQL.Database();
  createSchema(target);
  return target;
}

async function workspaceHandle() {
  const root = await self.navigator.storage.getDirectory();
  return root.getFileHandle(WORKSPACE_FILE, { create: true });
}

async function writeWorkspace(bytes) {
  const handle = await workspaceHandle();
  const writable = await handle.createWritable();
  try {
    await writable.write(bytes);
    await writable.close();
  } catch (error) {
    try { await writable.abort(); } catch (_) { /* best effort */ }
    throw error;
  }
}

async function loadPersistedBytes() {
  const root = await self.navigator.storage.getDirectory();
  try {
    const handle = await root.getFileHandle(WORKSPACE_FILE);
    return new Uint8Array(await (await handle.getFile()).arrayBuffer());
  } catch (error) {
    if (error && error.name === "NotFoundError") return null;
    throw error;
  }
}

function validateDatabase(candidate) {
  const query = (sql, params = []) => {
    const result = candidate.exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row) => Object.fromEntries(columns.map((column, i) => [column, row[i]])));
  };
  const integrity = query("PRAGMA integrity_check");
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") throw new WorkerError("invalid_import", "The selected workspace failed its integrity check.");
  if (query("PRAGMA foreign_key_check").length) throw new WorkerError("invalid_import", "The selected workspace has invalid record relationships.");
  const names = new Set(query("SELECT name FROM sqlite_master WHERE type = 'table'").map((row) => row.name));
  if (REQUIRED_TABLES.some((name) => !names.has(name))) throw new WorkerError("invalid_import", "The selected file is not a complete Video Content Factory workspace.");
  const indexes = new Set(query("SELECT name FROM sqlite_master WHERE type = 'index'").map((row) => row.name));
  if (REQUIRED_INDEXES.some((name) => !indexes.has(name))) throw new WorkerError("invalid_import", "The selected workspace has an incompatible schema.");
  const expectedColumns = {
    applications: ["id", "name", "created_at", "updated_at"], companies: ["id", "name", "created_at", "updated_at"],
    content_projects: ["id", "title", "description", "application_id", "company_id", "created_at", "updated_at"],
    drafts: ["id", "content_project_id", "draft_type", "body", "created_at", "updated_at"], workspace_meta: ["singleton", "format_id", "format_version"],
    ai_settings: ["provider", "api_key", "endpoint", "is_active", "updated_at"],
    audio_tracks: ["id", "content_project_id", "voice_id", "speed", "script_snapshot", "duration", "audio_blob", "created_at"],
  };
  for (const [table, columns] of Object.entries(expectedColumns)) {
    const actual = query(`PRAGMA table_info(${table})`).map((row) => row.name);
    if (columns.some((column) => !actual.includes(column))) throw new WorkerError("invalid_import", "The selected workspace has incompatible table columns.");
  }
  const definitions = Object.fromEntries(query("SELECT name, sql FROM sqlite_master WHERE type = 'table'").map((row) => [row.name, (row.sql || "").replace(/\s+/g, " ").toUpperCase()]));
  const requiredDefinitionParts = {
    applications: ["NAME TEXT NOT NULL UNIQUE", "CHECK (LENGTH(TRIM(NAME)) > 0)"],
    companies: ["NAME TEXT NOT NULL UNIQUE", "CHECK (LENGTH(TRIM(NAME)) > 0)"],
    content_projects: ["TITLE TEXT NOT NULL", "ON DELETE SET NULL"],
    drafts: ["CONTENT_PROJECT_ID INTEGER NOT NULL UNIQUE", "ON DELETE CASCADE", "DRAFT_TYPE IN ('SCRIPT', 'PROMPT')", "LENGTH(TRIM(BODY)) > 0"],
    ai_settings: ["PROVIDER IN ('GEMINI', 'OPENAI', 'OLLAMA')", "IS_ACTIVE IN (0, 1)"],
    audio_tracks: ["CONTENT_PROJECT_ID INTEGER NOT NULL", "ON DELETE CASCADE", "SPEED >= 0.75", "SPEED <= 1.25", "DURATION >= 0.0"],
  };
  for (const [table, parts] of Object.entries(requiredDefinitionParts)) {
    if (parts.some((part) => !definitions[table]?.includes(part))) throw new WorkerError("invalid_import", "The selected workspace is missing required data constraints.");
  }
  const meta = query("SELECT singleton, format_id, format_version FROM workspace_meta");
  if (meta.length !== 1 || meta[0].singleton !== 1 || meta[0].format_id !== FORMAT_ID || meta[0].format_version !== FORMAT_VERSION) {
    throw new WorkerError("invalid_import", "The selected workspace format is not supported.");
  }
  if (query("SELECT id FROM drafts WHERE draft_type NOT IN ('script', 'prompt') OR length(trim(body)) = 0").length) {
    throw new WorkerError("invalid_import", "The selected workspace contains invalid drafts.");
  }
}

async function restoreLastPersisted() {
  if (!persistedBytes) return;
  db?.close();
  db = new SQL.Database(persistedBytes);
  db.run("PRAGMA foreign_keys = ON");
}

async function persistMutation(result) {
  const bytes = db.export();
  try {
    await writeWorkspace(bytes);
    persistedBytes = bytes;
    return result;
  } catch (error) {
    await restoreLastPersisted();
    throw new WorkerError("persistence_error", "Your change could not be saved to the browser workspace.");
  }
}

function catalogOperation(table, verb, payload) {
  const id = payload?.id;
  if (verb === "list") return rows(`SELECT * FROM ${table} ORDER BY name, id`);
  if (verb === "get") return requireRow(table, id);
  if (verb === "delete") {
    const record = requireRow(table, id);
    db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return record;
  }
  const name = normalizeRequired(payload?.name, "name");
  if (verb === "create") {
    const stamp = now();
    try { db.run(`INSERT INTO ${table} (name, created_at, updated_at) VALUES (?, ?, ?)`, [name, stamp, stamp]); }
    catch (error) { if (/UNIQUE/.test(error.message)) throw new WorkerError("conflict", `An ${table.slice(0, -1)} with that name already exists.`); throw error; }
    return one(`SELECT * FROM ${table} WHERE id = last_insert_rowid()`);
  }
  requireRow(table, id);
  if (verb === "update") {
    try { db.run(`UPDATE ${table} SET name = ?, updated_at = ? WHERE id = ?`, [name, now(), id]); }
    catch (error) { if (/UNIQUE/.test(error.message)) throw new WorkerError("conflict", `An ${table.slice(0, -1)} with that name already exists.`); throw error; }
    return requireRow(table, id);
  }
  throw new WorkerError("validation_error", "Unknown catalog operation.");
}

function validateAssociations(applicationId, companyId) {
  if (applicationId !== null && !one("SELECT id FROM applications WHERE id = ?", [applicationId])) throw new WorkerError("validation_error", `Application ${applicationId} was not found.`);
  if (companyId !== null && !one("SELECT id FROM companies WHERE id = ?", [companyId])) throw new WorkerError("validation_error", `Company ${companyId} was not found.`);
}

const PROJECT_SELECT = `SELECT p.*, a.name AS application_name, c.name AS company_name FROM content_projects p
  LEFT JOIN applications a ON a.id = p.application_id LEFT JOIN companies c ON c.id = p.company_id`;
function project(id) {
  const record = one(`${PROJECT_SELECT} WHERE p.id = ?`, [id]);
  if (!record) throw new WorkerError("not_found", `Project ${id} was not found.`);
  return record;
}
function projectDetail(id) {
  const record = project(id);
  record.draft = one("SELECT * FROM drafts WHERE content_project_id = ?", [id]);
  return record;
}
function projectPayload(payload) {
  return {
    title: normalizeRequired(payload?.title, "title"), description: typeof payload?.description === "string" ? payload.description.trim() : "",
    application_id: normalizeOptional(payload?.application_id, "application_id"), company_id: normalizeOptional(payload?.company_id, "company_id"),
  };
}
function projectOperation(verb, payload) {
  const id = payload?.id;
  if (verb === "list") return rows(`${PROJECT_SELECT} ORDER BY p.updated_at DESC, p.id DESC`);
  if (verb === "get") return projectDetail(id);
  if (verb === "delete") { const record = project(id); db.run("DELETE FROM content_projects WHERE id = ?", [id]); return record; }
  const input = projectPayload(payload);
  validateAssociations(input.application_id, input.company_id);
  if (verb === "create") {
    const stamp = now();
    db.run("INSERT INTO content_projects (title, description, application_id, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [input.title, input.description, input.application_id, input.company_id, stamp, stamp]);
    return projectDetail(one("SELECT last_insert_rowid() AS id").id);
  }
  project(id);
  if (verb === "update") {
    db.run("UPDATE content_projects SET title = ?, description = ?, application_id = ?, company_id = ?, updated_at = ? WHERE id = ?", [input.title, input.description, input.application_id, input.company_id, now(), id]);
    return projectDetail(id);
  }
  throw new WorkerError("validation_error", "Unknown project operation.");
}

function upsertDraft(payload) {
  const projectId = payload?.project_id;
  project(projectId);
  const draftType = payload?.draft_type;
  if (draftType !== "script" && draftType !== "prompt") throw new WorkerError("validation_error", "draft_type must be script or prompt");
  const body = normalizeRequired(payload?.body, "body");
  const stamp = now();
  db.run(`INSERT INTO drafts (content_project_id, draft_type, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(content_project_id) DO UPDATE SET draft_type = excluded.draft_type, body = excluded.body, updated_at = excluded.updated_at`, [projectId, draftType, body, stamp, stamp]);
  return one("SELECT * FROM drafts WHERE content_project_id = ?", [projectId]);
}

function aiSettingsGet(includeKey = false) {
  const records = rows("SELECT provider, api_key, endpoint, is_active, updated_at FROM ai_settings ORDER BY provider");
  return records.map((row) => ({
    provider: row.provider,
    api_key: includeKey ? row.api_key : (row.api_key ? "••••••••" : ""),
    endpoint: row.endpoint,
    is_active: Boolean(row.is_active),
    updated_at: row.updated_at,
  }));
}

function aiSettingsSave(payload) {
  const provider = payload?.provider;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new WorkerError("validation_error", `Provider must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`);
  }
  const apiKey = typeof payload?.api_key === "string" ? payload.api_key.trim() : "";
  const endpoint = typeof payload?.endpoint === "string" ? payload.endpoint.trim() : "";
  const isActive = payload?.is_active === 1 || payload?.is_active === true ? 1 : 0;
  const stamp = now();

  if (isActive === 1) {
    db.run("UPDATE ai_settings SET is_active = 0");
  }

  db.run(`INSERT INTO ai_settings (provider, api_key, endpoint, is_active, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET api_key = excluded.api_key, endpoint = excluded.endpoint, is_active = excluded.is_active, updated_at = excluded.updated_at`,
    [provider, apiKey, endpoint, isActive, stamp]
  );
  return aiSettingsGet(false);
}

function audioTracksSave(payload) {
  const projectId = payload?.content_project_id;
  project(projectId);
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
  } else if (!(audioBytes instanceof Uint8Array)) {
    if (Array.isArray(audioBytes)) {
      audioBytes = new Uint8Array(audioBytes);
    } else {
      throw new WorkerError("validation_error", "audio_blob must be binary data");
    }
  }
  const stamp = now();
  db.run(`INSERT INTO audio_tracks (content_project_id, voice_id, speed, script_snapshot, duration, audio_blob, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [projectId, voiceId, speed, scriptSnapshot, duration, audioBytes, stamp]
  );
  const insertedId = one("SELECT last_insert_rowid() AS id").id;
  return one("SELECT id, content_project_id, voice_id, speed, script_snapshot, duration, created_at FROM audio_tracks WHERE id = ?", [insertedId]);
}

function audioTracksList(projectId) {
  if (projectId) project(projectId);
  const sql = projectId
    ? "SELECT id, content_project_id, voice_id, speed, script_snapshot, duration, created_at FROM audio_tracks WHERE content_project_id = ? ORDER BY created_at DESC"
    : "SELECT id, content_project_id, voice_id, speed, script_snapshot, duration, created_at FROM audio_tracks ORDER BY created_at DESC";
  return rows(sql, projectId ? [projectId] : []);
}

function audioTracksGet(id) {
  if (!Number.isInteger(id) || id < 1) throw new WorkerError("not_found", "Audio track was not found");
  const record = one("SELECT * FROM audio_tracks WHERE id = ?", [id]);
  if (!record) throw new WorkerError("not_found", `Audio track ${id} was not found`);
  return record;
}

function audioTracksDelete(id) {
  const record = one("SELECT id, content_project_id, voice_id, speed, script_snapshot, duration, created_at FROM audio_tracks WHERE id = ?", [id]);
  if (!record) throw new WorkerError("not_found", `Audio track ${id} was not found`);
  db.run("DELETE FROM audio_tracks WHERE id = ?", [id]);
  return record;
}

async function openWorkspace() {
  SQL ||= await initSqlJs({ locateFile: (file) => `vendor/sql.js/${file}` });
  if (db) return { format_id: FORMAT_ID, format_version: FORMAT_VERSION, restored: true };
  const bytes = await loadPersistedBytes();
  if (bytes) {
    const candidate = new SQL.Database(bytes); candidate.run("PRAGMA foreign_keys = ON");
    try { validateDatabase(candidate); } catch (error) { candidate.close(); throw new WorkerError("persistence_error", "The saved browser workspace could not be opened safely."); }
    db = candidate; persistedBytes = bytes;
    return { format_id: FORMAT_ID, format_version: FORMAT_VERSION, restored: true };
  }
  db = freshDatabase();
  await persistMutation(null);
  return { format_id: FORMAT_ID, format_version: FORMAT_VERSION, restored: false };
}

async function dispatch(operation, payload) {
  if (operation === "workspace.open") return openWorkspace();
  if (!db) throw new WorkerError("validation_error", "Open the workspace before using it.");
  if (operation === "workspace.export") {
    const activeBytes = db.export();
    const tempDb = new SQL.Database(activeBytes);
    tempDb.run("UPDATE ai_settings SET api_key = ''");
    const sanitizedBytes = tempDb.export();
    tempDb.close();
    return { filename: `video-content-factory-workspace-v${FORMAT_VERSION}.sqlite`, bytes: sanitizedBytes };
  }
  if (operation === "ai_settings.get") return aiSettingsGet(payload?.include_key);
  if (operation === "ai_settings.save") return persistMutation(transaction(() => aiSettingsSave(payload || {})));
  if (operation === "audio_tracks.save") return persistMutation(transaction(() => audioTracksSave(payload || {})));
  if (operation === "audio_tracks.list") return audioTracksList(payload?.content_project_id);
  if (operation === "audio_tracks.get") return audioTracksGet(payload?.id);
  if (operation === "audio_tracks.delete") return persistMutation(transaction(() => audioTracksDelete(payload?.id)));

  if (operation === "workspace.import.validate") {
    const bytes = payload?.bytes instanceof Uint8Array ? payload.bytes : new Uint8Array(payload?.bytes || []);
    if (!bytes.byteLength) throw new WorkerError("invalid_import", "Choose a non-empty SQLite workspace file.");
    let candidate;
    let summary;
    try {
      candidate = new SQL.Database(bytes); candidate.run("PRAGMA foreign_keys = ON"); validateDatabase(candidate);
      summary = {
        applications: candidate.exec("SELECT count(*) AS count FROM applications")[0].values[0][0],
        companies: candidate.exec("SELECT count(*) AS count FROM companies")[0].values[0][0],
        projects: candidate.exec("SELECT count(*) AS count FROM content_projects")[0].values[0][0],
      };
    }
    catch (error) { if (error instanceof WorkerError) throw error; throw new WorkerError("invalid_import", "The selected file is not a readable SQLite workspace."); }
    finally { candidate?.close(); }
    const token = crypto.randomUUID(); pendingImport = { token, bytes: new Uint8Array(bytes) };
    return { token, ...summary, message: "Workspace is valid and ready to import." };
  }
  if (operation === "workspace.import.commit") {
    if (!pendingImport || payload?.token !== pendingImport.token) throw new WorkerError("invalid_import", "This import approval is stale or unknown. Validate the file again.");
    const candidate = new SQL.Database(pendingImport.bytes); candidate.run("PRAGMA foreign_keys = ON");
    try { validateDatabase(candidate); await writeWorkspace(pendingImport.bytes); } catch (error) { candidate.close(); if (error instanceof WorkerError) throw error; throw new WorkerError("persistence_error", "The validated workspace could not be saved."); }
    db.close(); db = candidate; persistedBytes = pendingImport.bytes; pendingImport = null;
    return { imported: true };
  }
  if (operation === "workspace.reset") {
    if (payload?.confirmed !== true) throw new WorkerError("validation_error", "Confirm sample-data restoration before replacing the workspace.");
    const candidate = freshDatabase(); const bytes = candidate.export();
    try { await writeWorkspace(bytes); } catch (_) { candidate.close(); throw new WorkerError("persistence_error", "Sample data could not be saved to the browser workspace."); }
    db.close(); db = candidate; persistedBytes = bytes; pendingImport = null;
    return { reset: true };
  }
  const match = /^(applications|companies)\.(list|get|create|update|delete)$/.exec(operation);
  if (match) {
    const mutation = ["create", "update", "delete"].includes(match[2]);
    const result = mutation ? transaction(() => catalogOperation(match[1], match[2], payload || {})) : catalogOperation(match[1], match[2], payload || {});
    return mutation ? persistMutation(result) : result;
  }
  const projectMatch = /^projects\.(list|get|create|update|delete)$/.exec(operation);
  if (projectMatch) {
    const mutation = ["create", "update", "delete"].includes(projectMatch[1]);
    const result = mutation ? transaction(() => projectOperation(projectMatch[1], payload || {})) : projectOperation(projectMatch[1], payload || {});
    return mutation ? persistMutation(result) : result;
  }
  if (operation === "drafts.upsert") return persistMutation(transaction(() => upsertDraft(payload || {})));
  throw new WorkerError("validation_error", "Unknown workspace operation.");
}

self.onmessage = (event) => {
  const { id, operation, payload } = event.data || {};
  requestChain = requestChain.then(async () => {
    try {
      const result = await dispatch(operation, payload);
      self.postMessage({ id, ok: true, result });
    } catch (error) {
      const safe = error instanceof WorkerError ? error : new WorkerError("persistence_error", "The browser workspace could not complete that request.");
      self.postMessage({ id, ok: false, error: { code: safe.code, message: safe.message } });
    }
  });
};
