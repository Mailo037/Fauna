const { app, BrowserWindow, ipcMain, protocol, shell } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const net = require("node:net");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn, spawnSync } = require("node:child_process");

const APP_PROTOCOL = "fauna-app";
const FILE_PROTOCOL = "fauna-file";
const DEFAULT_BRIDGE_PORT = 8765;
const MAX_BRIDGE_PORT = 8795;
const WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY = "faunaWorkspaceBridgeEndpoint";
const WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY = "faunaWorkspaceBridgeToken";
const WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY = "faunaWorkspaceBridgeEnabled";
const CHAT_SESSIONS_STORAGE_KEY = "faunaChatSessions";

app.setName("Fauna");
app.setAppUserModelId("ai.fauna.desktop");

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  },
  {
    scheme: FILE_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let mainWindow = null;
let bridgeProcess = null;

function getAppRoot() {
  return path.resolve(__dirname, "..");
}

function getUserDataRoot() {
  return app.getPath("userData");
}

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function sanitizeId(value, fallback = "item") {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
  return clean || fallback;
}

function readJsonFileSync(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFileSync(filePath, value) {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getSettingsPath() {
  return path.join(getUserDataRoot(), "settings.json");
}

function readSettingsSync() {
  return readJsonFileSync(getSettingsPath(), {});
}

function writeSettingsSync(settings) {
  writeJsonFileSync(getSettingsPath(), settings && typeof settings === "object" ? settings : {});
}

function getChatsRoot() {
  return path.join(getUserDataRoot(), "chats");
}

function getChatDirectory(sessionId) {
  return path.join(getChatsRoot(), sanitizeId(sessionId, "chat"));
}

function getChatIndexPath() {
  return path.join(getChatsRoot(), "index.json");
}

function getChatFilePath(sessionId) {
  return path.join(getChatDirectory(sessionId), "chat.json");
}

function readChatSessionsSync() {
  const chatsRoot = getChatsRoot();
  const index = readJsonFileSync(getChatIndexPath(), { order: [] });
  const orderedIds = Array.isArray(index.order) ? index.order.map(id => String(id || "")) : [];
  const seen = new Set();
  const sessions = [];

  for (const id of orderedIds) {
    const safeId = sanitizeId(id, "");
    if (!safeId || seen.has(safeId)) continue;
    const session = readJsonFileSync(getChatFilePath(safeId), null);
    if (session && typeof session === "object") {
      seen.add(safeId);
      sessions.push(session);
    }
  }

  try {
    for (const entry of fs.readdirSync(chatsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || seen.has(entry.name)) continue;
      const session = readJsonFileSync(path.join(chatsRoot, entry.name, "chat.json"), null);
      if (session && typeof session === "object") {
        seen.add(entry.name);
        sessions.push(session);
      }
    }
  } catch {
    // No chat directory yet.
  }

  return sessions;
}

function writeChatSessionsSync(rawValue) {
  let sessions = [];
  try {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    sessions = Array.isArray(parsed) ? parsed : [];
  } catch {
    return false;
  }

  ensureDirSync(getChatsRoot());
  const order = [];
  for (const session of sessions) {
    if (!session || typeof session !== "object") continue;
    const id = sanitizeId(session.id, `chat-${Date.now()}`);
    order.push(id);
    writeJsonFileSync(getChatFilePath(id), { ...session, id });
  }
  removeStaleChatSessionFiles(new Set(order));
  writeJsonFileSync(getChatIndexPath(), {
    order,
    updatedAt: new Date().toISOString()
  });
  return true;
}

function removeStaleChatSessionFiles(keptIds) {
  try {
    for (const entry of fs.readdirSync(getChatsRoot(), { withFileTypes: true })) {
      if (!entry.isDirectory() || keptIds.has(entry.name)) continue;
      const chatFile = path.join(getChatsRoot(), entry.name, "chat.json");
      if (fs.existsSync(chatFile)) fs.rmSync(chatFile, { force: true });
    }
  } catch {
    // Chat storage is best-effort; media folders can remain for Library references.
  }
}

function storageGetSync(key) {
  if (key === CHAT_SESSIONS_STORAGE_KEY) {
    const sessions = readChatSessionsSync();
    return sessions.length > 0 ? JSON.stringify(sessions) : null;
  }
  const settings = readSettingsSync();
  return Object.prototype.hasOwnProperty.call(settings, key) ? String(settings[key]) : null;
}

function storageSetSync(key, value) {
  if (key === CHAT_SESSIONS_STORAGE_KEY) {
    return writeChatSessionsSync(value);
  }
  const settings = readSettingsSync();
  settings[key] = String(value ?? "");
  writeSettingsSync(settings);
  return true;
}

function storageRemoveSync(key) {
  if (key === CHAT_SESSIONS_STORAGE_KEY) {
    writeChatSessionsSync("[]");
    return true;
  }
  const settings = readSettingsSync();
  delete settings[key];
  writeSettingsSync(settings);
  return true;
}

function getFileRefsPath() {
  return path.join(getUserDataRoot(), "file-refs.json");
}

function readFileRefsSync() {
  return readJsonFileSync(getFileRefsPath(), {});
}

function writeFileRefsSync(refs) {
  writeJsonFileSync(getFileRefsPath(), refs && typeof refs === "object" ? refs : {});
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8"
  };
  return types[ext] || "application/octet-stream";
}

function appDataUrlForPath(filePath) {
  const relative = path.relative(getUserDataRoot(), filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "";
  return `${FILE_PROTOCOL}://appdata/${relative.split(path.sep).map(encodeURIComponent).join("/")}`;
}

function selectedFileUrlForPath(filePath) {
  const rawPath = String(filePath || "").trim();
  if (!rawPath) return "";
  const absolutePath = path.resolve(rawPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return "";
  const id = crypto.createHash("sha256").update(absolutePath).digest("hex").slice(0, 24);
  const refs = readFileRefsSync();
  refs[id] = {
    path: absolutePath,
    name: path.basename(absolutePath),
    updatedAt: new Date().toISOString()
  };
  writeFileRefsSync(refs);
  return `${FILE_PROTOCOL}://selected/${id}/${encodeURIComponent(path.basename(absolutePath))}`;
}

function responseForFile(filePath) {
  return fsp.readFile(filePath).then(data => new Response(data, {
    headers: {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": "no-store"
    }
  }));
}

async function handleAppProtocol(request) {
  const appRoot = getAppRoot();
  const url = new URL(request.url);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const target = path.resolve(appRoot, `.${requestedPath}`);
  if (!isPathInside(target, appRoot)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    return await responseForFile(target);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function handleFileProtocol(request) {
  const url = new URL(request.url);
  let target = "";

  if (url.host === "appdata") {
    const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    target = path.resolve(getUserDataRoot(), relativePath);
    if (!isPathInside(target, getUserDataRoot())) {
      return new Response("Not found", { status: 404 });
    }
  } else if (url.host === "selected") {
    const [id] = url.pathname.split("/").filter(Boolean);
    const ref = readFileRefsSync()[id];
    target = ref?.path ? path.resolve(ref.path) : "";
  }

  if (!target) return new Response("Not found", { status: 404 });
  try {
    return await responseForFile(target);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function inferExtension(mimeType, fallback = "bin") {
  const clean = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav"
  };
  return map[clean] || fallback;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?;base64,([\s\S]+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64")
  };
}

async function readMediaPayload(payload) {
  if (payload?.dataBase64) {
    return {
      buffer: Buffer.from(String(payload.dataBase64), "base64"),
      mimeType: payload.mimeType || "application/octet-stream"
    };
  }

  const sourceUrl = String(payload?.sourceUrl || "").trim();
  const parsedData = parseDataUrl(sourceUrl);
  if (parsedData) return parsedData;
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new Error("Only http, https, data, and renderer-supplied blob media can be saved.");
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Media download failed with HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get("content-type") || payload?.mimeType || "application/octet-stream"
  };
}

async function saveGeneratedMedia(payload = {}) {
  const chatId = sanitizeId(payload.chatId || "unassigned-chat", "unassigned-chat");
  const kind = sanitizeId(payload.kind || "media", "media");
  const { buffer, mimeType } = await readMediaPayload(payload);
  const requestedExtension = String(payload.extension || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const extension = requestedExtension || inferExtension(mimeType, kind === "image" ? "png" : "bin");
  const mediaDir = path.join(getChatDirectory(chatId), "media");
  ensureDirSync(mediaDir);
  const fileName = `${kind}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const filePath = path.join(mediaDir, fileName);
  await fsp.writeFile(filePath, buffer);
  return {
    ok: true,
    path: filePath,
    url: appDataUrlForPath(filePath),
    mimeType,
    size: buffer.length
  };
}

function canUsePort(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(start = DEFAULT_BRIDGE_PORT, end = MAX_BRIDGE_PORT) {
  for (let port = start; port <= end; port += 1) {
    if (await canUsePort(port)) return port;
  }
  throw new Error("No local bridge port is available.");
}

function findPythonLauncher() {
  const candidates = process.platform === "win32"
    ? [
      { command: "py", args: ["-3"] },
      { command: "python", args: [] },
      { command: "python3", args: [] }
    ]
    : [
      { command: "python3", args: [] },
      { command: "python", args: [] }
    ];

  for (const candidate of candidates) {
    const probe = spawnSync(candidate.command, [...candidate.args, "--version"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

async function ensureBridgeScriptCopy() {
  const source = path.join(getAppRoot(), "local-bridge.py");
  const target = path.join(getUserDataRoot(), "bridge", "local-bridge.py");
  ensureDirSync(path.dirname(target));
  const bridgeSource = await fsp.readFile(source);
  await fsp.writeFile(target, bridgeSource);
  return target;
}

async function startWorkspaceBridge() {
  const launcher = findPythonLauncher();
  if (!launcher) {
    console.warn("Fauna desktop could not find Python, so the workspace bridge was not started.");
    return null;
  }

  const token = storageGetSync(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY) || crypto.randomBytes(24).toString("base64url");
  const port = await findAvailablePort();
  const endpoint = `http://127.0.0.1:${port}`;
  storageSetSync(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY, endpoint);
  storageSetSync(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY, token);
  storageSetSync(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "true");

  const scriptPath = await ensureBridgeScriptCopy();
  const bridgeRoot = getUserDataRoot();
  const child = spawn(launcher.command, [
    ...launcher.args,
    scriptPath,
    "--root",
    bridgeRoot,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--token",
    token
  ], {
    cwd: bridgeRoot,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.on("data", chunk => console.log(`[fauna-bridge] ${String(chunk).trim()}`));
  child.stderr?.on("data", chunk => console.warn(`[fauna-bridge] ${String(chunk).trim()}`));
  child.on("exit", code => {
    if (!app.isQuitting) console.warn(`Fauna bridge exited with code ${code}`);
  });
  bridgeProcess = child;
  return { endpoint, token, root: bridgeRoot };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 940,
    minHeight: 680,
    backgroundColor: "#0f172a",
    title: "Fauna",
    icon: path.join(getAppRoot(), "favicon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.loadURL(`${APP_PROTOCOL}://app/index.html`);
}

function registerIpc() {
  ipcMain.on("fauna:storage-get", (event, key) => {
    event.returnValue = storageGetSync(String(key || ""));
  });
  ipcMain.on("fauna:storage-set", (event, key, value) => {
    event.returnValue = storageSetSync(String(key || ""), value);
  });
  ipcMain.on("fauna:storage-remove", (event, key) => {
    event.returnValue = storageRemoveSync(String(key || ""));
  });
  ipcMain.on("fauna:file-url", (event, filePath) => {
    event.returnValue = selectedFileUrlForPath(filePath);
  });
  ipcMain.handle("fauna:save-generated-media", (_event, payload) => saveGeneratedMedia(payload));
  ipcMain.handle("fauna:desktop-info", () => ({
    appDataPath: getUserDataRoot(),
    chatsPath: getChatsRoot(),
    bridgeEndpoint: storageGetSync(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY),
    bridgeRoot: getUserDataRoot()
  }));
}

app.whenReady().then(async () => {
  ensureDirSync(getUserDataRoot());
  protocol.handle(APP_PROTOCOL, handleAppProtocol);
  protocol.handle(FILE_PROTOCOL, handleFileProtocol);
  registerIpc();
  try {
    await startWorkspaceBridge();
  } catch (error) {
    console.warn("Fauna desktop could not start the workspace bridge:", error);
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
