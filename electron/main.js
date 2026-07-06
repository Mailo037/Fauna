const { app, BrowserWindow, Menu, Tray, clipboard, dialog, ipcMain, nativeImage, protocol, screen, session, shell, Notification } = require("electron");
const { autoUpdater } = require("electron-updater");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { TextDecoder } = require("node:util");
const { spawn, spawnSync } = require("node:child_process");

const APP_PROTOCOL = "fauna-app";
const FILE_PROTOCOL = "fauna-file";
const DEFAULT_BRIDGE_PORT = 8765;
const MAX_BRIDGE_PORT = 8795;
const WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY = "faunaWorkspaceBridgeEndpoint";
const WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY = "faunaWorkspaceBridgeToken";
const WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY = "faunaWorkspaceBridgeEnabled";
const WORKSPACE_PROJECTS_STORAGE_KEY = "faunaWorkspaceProjects";
const WORKSPACE_ACCESS_POLICY_STORAGE_KEY = "faunaWorkspaceAccessPolicy";
const WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT = "chat-output";
const WORKSPACE_ACCESS_POLICY_FULL_MACHINE = "full-machine";
const REMOTE_ACCESS_ENABLED_STORAGE_KEY = "faunaRemoteAccessEnabled";
const REMOTE_ACCESS_TOKEN_STORAGE_KEY = "faunaRemoteAccessToken";
const REMOTE_ACCESS_PORT_STORAGE_KEY = "faunaRemoteAccessPort";
const CHAT_SESSIONS_STORAGE_KEY = "faunaChatSessions";
const ACTIVE_CHAT_SESSION_STORAGE_KEY = "faunaActiveChatSession";
const SKILL_LIBRARY_STORAGE_KEY = "faunaSkills";
const AI_PROVIDER_STORAGE_KEY = "faunaAiProvider";
const LOCAL_CHAT_MODEL_STORAGE_KEY = "faunaLocalChatModel";
const OPENAI_CHAT_MODEL_STORAGE_KEY = "faunaOpenAiChatModel";
const WORKSPACE_URL_FRAGMENT_CHAT = "chat";
const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_BASE_URL_CANDIDATES = Array.from(new Set([
  OLLAMA_BASE_URL,
  "http://localhost:11434"
]));
const OLLAMA_TAGS_PATH = "/api/tags";
const OLLAMA_TAGS_URL = `${OLLAMA_BASE_URL}${OLLAMA_TAGS_PATH}`;
const DEFAULT_LOCAL_CHAT_MODEL = "qwen3:8b";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
const DEFAULT_REMOTE_ACCESS_PORT = 8899;
const MAX_REMOTE_ACCESS_PORT = 8919;
const REMOTE_REQUEST_BODY_LIMIT_BYTES = 65536;
const APP_CACHE_STORAGE_KEYS = [
  "faunaOpenAiSpeechCache",
  "faunaVoicePreviewCache",
  "faunaOpenAiTranscriptionCache",
  "faunaOpenAiFileCache",
  "faunaOpenAiModelCatalog",
  "faunaOpenRouterModelCapabilities"
];
const APP_CACHE_DIRECTORIES = [
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnCache",
  "blob_storage",
  "Dictionaries",
  "Shared Dictionary",
  "Session Storage"
];
const TEMP_MEDIA_FILE_RE = /^(?:voice-recording|voice-reply|speech|tts|audio-cache|voice-cache)-/i;

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
let quickWindow = null;
let tray = null;
let bridgeProcess = null;
let remoteAccessServer = null;
let remoteAccessPort = 0;
let mainRendererReady = false;
let pendingOpenChatId = "";
let pendingQuickPrompt = "";
let pendingQuickPayload = null;
let pendingNewChat = false;
const activeOllamaPulls = new Map();
const activeNativeNotifications = new Set();
const activeTerminalSessions = new Map();
let updateState = {
  status: "idle",
  message: "Updates ready",
  canInstall: false,
  availableVersion: "",
  currentVersion: app.getVersion(),
  progress: 0
};

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

function hashProjectPath(value) {
  return crypto.createHash("sha256").update(String(value || "").toLowerCase()).digest("hex").slice(0, 16);
}

function projectNameFromPath(projectPath) {
  const base = path.basename(String(projectPath || "").replace(/[\\/]+$/, ""));
  return base || "Project";
}

function createWorkspaceProjectId(projectPath, fallback = "project") {
  return `project-${sanitizeId(projectNameFromPath(projectPath), fallback)}-${hashProjectPath(projectPath)}`;
}

function createWorkspaceWorktreeId(worktreePath, fallback = "worktree") {
  return `worktree-${sanitizeId(projectNameFromPath(worktreePath), fallback)}-${hashProjectPath(worktreePath)}`;
}

function normalizeWorkspaceWorktree(raw, projectId = "") {
  if (!raw || typeof raw !== "object") return null;
  const rawPath = String(raw.path || "").trim();
  if (!rawPath) return null;
  const resolvedPath = path.resolve(rawPath);
  return {
    id: sanitizeId(raw.id || createWorkspaceWorktreeId(resolvedPath), "worktree"),
    projectId: sanitizeId(raw.projectId || projectId, "project"),
    name: String(raw.name || raw.branch || projectNameFromPath(resolvedPath)).trim().slice(0, 80) || "Worktree",
    path: resolvedPath,
    branch: String(raw.branch || "").trim(),
    createdAt: String(raw.createdAt || ""),
    updatedAt: String(raw.updatedAt || raw.createdAt || "")
  };
}

function normalizeWorkspaceProject(raw) {
  if (!raw || typeof raw !== "object") return null;
  const rawPath = String(raw.path || "").trim();
  if (!rawPath) return null;
  const resolvedPath = path.resolve(rawPath);
  const id = sanitizeId(raw.id || createWorkspaceProjectId(resolvedPath), "project");
  const worktrees = Array.isArray(raw.worktrees)
    ? raw.worktrees.map(worktree => normalizeWorkspaceWorktree(worktree, id)).filter(Boolean)
    : [];
  return {
    id,
    name: String(raw.name || projectNameFromPath(resolvedPath)).trim().slice(0, 80) || "Project",
    path: resolvedPath,
    createdAt: String(raw.createdAt || ""),
    updatedAt: String(raw.updatedAt || raw.createdAt || ""),
    worktrees
  };
}

function readWorkspaceProjectsSync() {
  try {
    const parsed = JSON.parse(storageGetSync(WORKSPACE_PROJECTS_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWorkspaceProject).filter(Boolean);
  } catch {
    return [];
  }
}

function writeWorkspaceProjectsSync(projects) {
  const normalized = (Array.isArray(projects) ? projects : [])
    .map(normalizeWorkspaceProject)
    .filter(Boolean);
  storageSetSync(WORKSPACE_PROJECTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function getWorkspaceProjectBridgeMap(projects = readWorkspaceProjectsSync()) {
  const map = {};
  for (const project of projects) {
    if (project.id && project.path) map[project.id] = project.path;
    for (const worktree of project.worktrees || []) {
      if (worktree.id && worktree.path) map[worktree.id] = worktree.path;
    }
  }
  return map;
}

function findWorkspaceProjectRoot(projects, rootId) {
  const id = sanitizeId(rootId, "");
  for (const project of projects) {
    if (project.id === id) return { project, root: project, type: "project" };
    const worktree = (project.worktrees || []).find(item => item.id === id);
    if (worktree) return { project, root: worktree, type: "worktree" };
  }
  return null;
}

async function restartBridgeAfterProjectChange() {
  if (!app.isReady?.()) return null;
  return startWorkspaceBridge();
}

async function chooseWorkspaceProjectFolders() {
  const selection = await dialog.showOpenDialog(mainWindow || undefined, {
    title: "Add project folder",
    properties: ["openDirectory", "multiSelections", "createDirectory"]
  });
  if (selection.canceled || selection.filePaths.length === 0) {
    return { cancelled: true, projects: readWorkspaceProjectsSync(), added: 0 };
  }

  const now = new Date().toISOString();
  const projects = readWorkspaceProjectsSync();
  const knownPaths = new Set(projects.map(project => path.resolve(project.path).toLowerCase()));
  let added = 0;
  for (const folder of selection.filePaths) {
    const resolvedPath = path.resolve(folder);
    if (knownPaths.has(resolvedPath.toLowerCase())) continue;
    projects.push({
      id: createWorkspaceProjectId(resolvedPath),
      name: projectNameFromPath(resolvedPath),
      path: resolvedPath,
      createdAt: now,
      updatedAt: now,
      worktrees: []
    });
    knownPaths.add(resolvedPath.toLowerCase());
    added += 1;
  }
  const normalized = writeWorkspaceProjectsSync(projects);
  await restartBridgeAfterProjectChange();
  return { cancelled: false, projects: normalized, added };
}

async function saveWorkspaceProjects(projects) {
  const normalized = writeWorkspaceProjectsSync(projects);
  await restartBridgeAfterProjectChange();
  return { ok: true, projects: normalized };
}

async function openWorkspaceProjectPath(projectPath) {
  const resolvedPath = path.resolve(String(projectPath || ""));
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return { ok: false, message: "Project folder does not exist." };
  }
  const errorMessage = await shell.openPath(resolvedPath);
  return { ok: !errorMessage, message: errorMessage || "" };
}

function canLaunchExecutable(command) {
  const probe = spawnSync(process.platform === "win32" ? "where.exe" : "which", [command], {
    encoding: "utf8",
    windowsHide: true
  });
  return probe.status === 0;
}

async function openWorkspaceProjectTerminal(projectPath) {
  const resolvedPath = path.resolve(String(projectPath || ""));
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return { ok: false, message: "Project folder does not exist." };
  }
  if (process.platform === "win32") {
    const launches = [
      { command: "wt.exe", args: ["-d", resolvedPath] },
      { command: "pwsh.exe", args: ["-NoExit", "-Command", `Set-Location -LiteralPath ${JSON.stringify(resolvedPath)}`] },
      { command: "powershell.exe", args: ["-NoExit", "-Command", `Set-Location -LiteralPath ${JSON.stringify(resolvedPath)}`] },
      { command: "cmd.exe", args: ["/k", "cd", "/d", resolvedPath] }
    ];
    for (const launcher of launches) {
      if (!canLaunchExecutable(launcher.command)) continue;
      try {
        const child = spawn(launcher.command, launcher.args, {
          cwd: resolvedPath,
          detached: true,
          stdio: "ignore",
          windowsHide: false
        });
        child.unref();
        return { ok: true, command: launcher.command };
      } catch {
        // Try the next terminal candidate.
      }
    }
    return { ok: false, message: "No terminal launcher was available." };
  }
  if (process.platform === "darwin") {
    if (!canLaunchExecutable("open")) return { ok: false, message: "No terminal launcher was available." };
    const child = spawn("open", ["-a", "Terminal", resolvedPath], { detached: true, stdio: "ignore" });
    child.unref();
    return { ok: true, command: "open" };
  }
  const candidates = ["x-terminal-emulator", "gnome-terminal", "konsole", "xfce4-terminal"];
  for (const command of candidates) {
    if (!canLaunchExecutable(command)) continue;
    try {
      const args = command === "gnome-terminal" ? ["--working-directory", resolvedPath] : [];
      const child = spawn(command, args, {
        cwd: resolvedPath,
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      return { ok: true, command };
    } catch {
      // Try the next terminal candidate.
    }
  }
  return { ok: false, message: "No terminal launcher was available." };
}

function getTerminalShellLaunch() {
  if (process.platform === "win32") {
    // The embedded terminal is pipe-backed, not a real PTY. Windows PowerShell
    // handles Clear-Host over pipes more reliably than pwsh, which can throw
    // RawUI CursorPosition errors without a console handle.
    if (canLaunchExecutable("powershell.exe")) {
      return { command: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit"], newline: "\r\n" };
    }
    if (canLaunchExecutable("pwsh.exe")) {
      return { command: "pwsh.exe", args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit"], newline: "\r\n" };
    }
    return { command: "cmd.exe", args: [], newline: "\r\n" };
  }
  const shellPath = process.env.SHELL || (process.platform === "darwin" ? "/bin/zsh" : "/bin/bash");
  return { command: shellPath, args: ["-i"], newline: "\n" };
}

function sendTerminalSessionEvent(sessionId, payload = {}) {
  const targetWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  targetWindow?.webContents?.send("fauna:terminal-data", {
    sessionId,
    ...payload
  });
}

async function startProjectTerminalSession(payload = {}) {
  const resolvedPath = path.resolve(String(payload.projectPath || ""));
  if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
    return { ok: false, message: "Project folder does not exist." };
  }
  const launch = getTerminalShellLaunch();
  if (!launch.command || !canLaunchExecutable(launch.command)) {
    return { ok: false, message: "No terminal shell was available." };
  }
  const sessionId = `terminal-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  try {
    const child = spawn(launch.command, launch.args, {
      cwd: resolvedPath,
      env: {
        ...process.env,
        TERM: process.env.TERM || "xterm-256color"
      },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    activeTerminalSessions.set(sessionId, {
      child,
      cwd: resolvedPath,
      command: launch.command,
      newline: launch.newline
    });
    child.stdout?.on("data", chunk => {
      sendTerminalSessionEvent(sessionId, { type: "stdout", data: String(chunk) });
    });
    child.stderr?.on("data", chunk => {
      sendTerminalSessionEvent(sessionId, { type: "stderr", data: String(chunk) });
    });
    child.on("error", error => {
      sendTerminalSessionEvent(sessionId, { type: "error", data: error.message || String(error) });
    });
    child.on("exit", (code, signal) => {
      activeTerminalSessions.delete(sessionId);
      sendTerminalSessionEvent(sessionId, {
        type: "exit",
        code,
        signal,
        data: `\n[terminal exited${Number.isFinite(code) ? ` with code ${code}` : signal ? ` from ${signal}` : ""}]\n`
      });
    });
    sendTerminalSessionEvent(sessionId, {
      type: "system",
      data: `Started ${launch.command} in ${resolvedPath}\n`
    });
    return {
      ok: true,
      sessionId,
      cwd: resolvedPath,
      command: launch.command,
      newline: launch.newline
    };
  } catch (error) {
    return { ok: false, message: error.message || String(error) };
  }
}

function writeProjectTerminalSession(payload = {}) {
  const sessionId = String(payload.sessionId || "");
  const session = activeTerminalSessions.get(sessionId);
  if (!session || !session.child || session.child.killed || session.child.stdin?.destroyed) {
    return { ok: false, message: "Terminal session is not running." };
  }
  const data = String(payload.data ?? "");
  if (!data) return { ok: true };
  try {
    session.child.stdin.write(data);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message || String(error) };
  }
}

function stopProjectTerminalSession(payload = {}) {
  const sessionId = String(payload.sessionId || "");
  const session = activeTerminalSessions.get(sessionId);
  if (!session) return { ok: true };
  activeTerminalSessions.delete(sessionId);
  try {
    session.child.kill();
  } catch {
    // The process may already be gone.
  }
  return { ok: true };
}

function stopAllTerminalSessions() {
  for (const sessionId of activeTerminalSessions.keys()) {
    stopProjectTerminalSession({ sessionId });
  }
}

function runGitCommand(args, cwd, timeoutMs = 30000) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(detail || `git ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return String(result.stdout || "").trim();
}

function sanitizeGitBranchName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_./-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "")
    .replace(/\/$/g, "")
    || `codex/work-${Date.now().toString(36)}`;
}

async function findAvailableWorktreePath(repoRoot, branchName) {
  const parent = path.dirname(repoRoot);
  const baseName = `${path.basename(repoRoot)}-${sanitizeId(branchName.split("/").pop() || "worktree", "worktree")}`;
  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidate = path.join(parent, `${baseName}${suffix}`);
    try {
      await fsp.access(candidate);
    } catch {
      return candidate;
    }
  }
  throw new Error("Could not find an available worktree folder name.");
}

async function createWorkspaceProjectWorktree(payload = {}) {
  const projects = readWorkspaceProjectsSync();
  const match = findWorkspaceProjectRoot(projects, payload.projectId);
  if (!match) throw new Error("Project was not found.");
  const branch = sanitizeGitBranchName(payload.branch);
  const repoRoot = runGitCommand(["rev-parse", "--show-toplevel"], match.root.path, 10000);
  const worktreePath = await findAvailableWorktreePath(repoRoot, branch);
  runGitCommand(["worktree", "add", "-b", branch, worktreePath, "HEAD"], repoRoot, 120000);

  const now = new Date().toISOString();
  const worktree = normalizeWorkspaceWorktree({
    id: createWorkspaceWorktreeId(worktreePath),
    projectId: match.project.id,
    name: branch.split("/").pop() || "Worktree",
    path: worktreePath,
    branch,
    createdAt: now,
    updatedAt: now
  }, match.project.id);
  match.project.worktrees = [
    ...(match.project.worktrees || []).filter(item => item.id !== worktree.id),
    worktree
  ];
  match.project.updatedAt = now;
  const normalized = writeWorkspaceProjectsSync(projects);
  await restartBridgeAfterProjectChange();
  return { ok: true, projects: normalized, worktree };
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

function getSkillsRoot() {
  return path.join(getUserDataRoot(), "skills");
}

function getSkillsIndexPath() {
  return path.join(getSkillsRoot(), "index.json");
}

function readSettingsSync() {
  return readJsonFileSync(getSettingsPath(), {});
}

function writeSettingsSync(settings) {
  writeJsonFileSync(getSettingsPath(), settings && typeof settings === "object" ? settings : {});
}

function parseSkillMetadata(content = "") {
  const match = String(content || "").replace(/^\uFEFF/, "").match(/^---\s*\n([\s\S]*?)\n---\s*/);
  const metadata = {};
  if (!match) return metadata;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*(.*?)\s*$/);
    if (!item) continue;
    metadata[item[1].toLowerCase()] = item[2].replace(/^["']|["']$/g, "").trim();
  }
  return metadata;
}

function inferSkillDescription(content = "") {
  const metadata = parseSkillMetadata(content);
  if (metadata.description) return metadata.description;
  const bodyLine = String(content || "")
    .replace(/^---\s*\n[\s\S]*?\n---\s*/, "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith("#"));
  return bodyLine || "Reusable assistant instructions.";
}

function normalizeSkillFolderName(value) {
  return sanitizeId(String(value || "").toLowerCase(), "skill").slice(0, 80) || "skill";
}

function normalizeDesktopSkillRecord(skill) {
  if (!skill || typeof skill !== "object") return null;
  const content = String(skill.content || skill.markdown || "").slice(0, 80_000).trim();
  if (!content) return null;
  const metadata = parseSkillMetadata(content);
  const name = normalizeSkillFolderName(skill.name || metadata.name || "skill");
  const now = new Date().toISOString();
  return {
    id: String(skill.id || `skill-${name}`),
    name,
    description: String(skill.description || metadata.description || inferSkillDescription(content)).replace(/\s+/g, " ").trim().slice(0, 320),
    content,
    enabled: skill.enabled !== false,
    source: String(skill.source || "manual"),
    installedAt: String(skill.installedAt || now),
    updatedAt: String(skill.updatedAt || now)
  };
}

function readSkillsIndexSync() {
  const index = readJsonFileSync(getSkillsIndexPath(), { skills: [] });
  return Array.isArray(index?.skills) ? index.skills : [];
}

function readSkillsFromDiskSync() {
  const root = getSkillsRoot();
  const indexed = new Map(readSkillsIndexSync().map(item => [normalizeSkillFolderName(item?.name || item?.id), item]));
  const skills = [];

  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const folderName = normalizeSkillFolderName(entry.name);
      const skillPath = path.join(root, entry.name, "SKILL.md");
      if (!fs.existsSync(skillPath)) continue;
      const content = fs.readFileSync(skillPath, "utf8");
      const metadata = indexed.get(folderName) || {};
      const normalized = normalizeDesktopSkillRecord({
        ...metadata,
        name: metadata.name || folderName,
        content
      });
      if (normalized) skills.push(normalized);
    }
  } catch {
    // Missing skill folders are handled below by the settings migration.
  }

  if (skills.length === 0) {
    const settings = readSettingsSync();
    const storedSkills = settings[SKILL_LIBRARY_STORAGE_KEY];
    let legacySkills = [];
    try {
      legacySkills = storedSkills ? JSON.parse(storedSkills) : [];
    } catch {
      legacySkills = [];
    }
    if (legacySkills.length > 0 && writeSkillsToDiskSync(legacySkills)) {
      delete settings[SKILL_LIBRARY_STORAGE_KEY];
      writeSettingsSync(settings);
      return readSkillsFromDiskSync();
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function writeSkillsToDiskSync(rawValue) {
  let parsed = [];
  try {
    parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
  } catch {
    return false;
  }
  if (!Array.isArray(parsed)) return false;

  const root = getSkillsRoot();
  ensureDirSync(root);
  const skills = parsed.map(normalizeDesktopSkillRecord).filter(Boolean);
  const keptFolders = new Set();

  for (const skill of skills) {
    const folderName = normalizeSkillFolderName(skill.name);
    const folderPath = path.join(root, folderName);
    if (!isPathInside(folderPath, root)) continue;
    ensureDirSync(folderPath);
    fs.writeFileSync(path.join(folderPath, "SKILL.md"), `${skill.content.trim()}\n`, "utf8");
    keptFolders.add(folderName);
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folderName = normalizeSkillFolderName(entry.name);
    if (keptFolders.has(folderName)) continue;
    const folderPath = path.join(root, entry.name);
    if (!isPathInside(folderPath, root)) continue;
    if (fs.existsSync(path.join(folderPath, "SKILL.md"))) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
  }

  writeJsonFileSync(getSkillsIndexPath(), {
    updatedAt: new Date().toISOString(),
    skills: skills.map(({ content, ...metadata }) => metadata)
  });
  return true;
}

function removeSkillsFromDiskSync() {
  const root = getSkillsRoot();
  if (!isPathInside(root, getUserDataRoot())) return false;
  fs.rmSync(root, { recursive: true, force: true });
  return true;
}

async function openSkillsFolder() {
  const root = getSkillsRoot();
  ensureDirSync(root);
  const error = await shell.openPath(root);
  return {
    ok: !error,
    path: root,
    error: error || ""
  };
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

function getSessionTime(session) {
  const updated = Date.parse(session?.updatedAt || "");
  const created = Date.parse(session?.createdAt || "");
  return Number.isFinite(updated) ? updated : Number.isFinite(created) ? created : 0;
}

function stripText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateLabel(value, maxLength = 64) {
  const text = stripText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}

function getSessionTitle(session) {
  const title = truncateLabel(session?.title, 64);
  if (title) return title;
  const firstUser = (session?.conversationHistory || []).find(message => message?.role === "user" && message?.content);
  return truncateLabel(firstUser?.content, 64) || "Current Session";
}

function getSessionPreview(session) {
  const history = Array.isArray(session?.conversationHistory) ? session.conversationHistory : [];
  const latest = [...history].reverse().find(message => message?.content);
  return truncateLabel(latest?.content, 96);
}

function sessionHasContent(session) {
  return Boolean(
    session?.domNodes?.length ||
    session?.conversationHistory?.length ||
    getSessionPreview(session)
  );
}

function getRecentChatSummaries(limit = 8) {
  return readChatSessionsSync()
    .filter(session => session?.id && !session.archived && sessionHasContent(session))
    .sort((a, b) => getSessionTime(b) - getSessionTime(a))
    .slice(0, limit)
    .map(session => ({
      id: sanitizeId(session.id, "chat"),
      title: getSessionTitle(session),
      preview: getSessionPreview(session),
      updatedAt: session.updatedAt || session.createdAt || ""
    }));
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
  refreshDesktopRecents();
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
  if (key === SKILL_LIBRARY_STORAGE_KEY) {
    const skills = readSkillsFromDiskSync();
    return skills.length > 0 || fs.existsSync(getSkillsIndexPath()) ? JSON.stringify(skills) : null;
  }
  const settings = readSettingsSync();
  return Object.prototype.hasOwnProperty.call(settings, key) ? String(settings[key]) : null;
}

function storageSetSync(key, value) {
  if (key === CHAT_SESSIONS_STORAGE_KEY) {
    return writeChatSessionsSync(value);
  }
  if (key === SKILL_LIBRARY_STORAGE_KEY) {
    return writeSkillsToDiskSync(value);
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
  if (key === SKILL_LIBRARY_STORAGE_KEY) {
    return removeSkillsFromDiskSync();
  }
  const settings = readSettingsSync();
  delete settings[key];
  writeSettingsSync(settings);
  return true;
}

function normalizeWorkspaceAccessPolicy(value) {
  return String(value || "").trim() === WORKSPACE_ACCESS_POLICY_FULL_MACHINE
    ? WORKSPACE_ACCESS_POLICY_FULL_MACHINE
    : WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT;
}

function getWorkspaceAccessPolicySync() {
  return normalizeWorkspaceAccessPolicy(storageGetSync(WORKSPACE_ACCESS_POLICY_STORAGE_KEY));
}

function getBridgeRootForPolicy(policy = getWorkspaceAccessPolicySync()) {
  return policy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE
    ? path.parse(getUserDataRoot()).root || getUserDataRoot()
    : getUserDataRoot();
}

function getActiveChatIdSync() {
  return sanitizeId(storageGetSync(ACTIVE_CHAT_SESSION_STORAGE_KEY), "");
}

function normalizeAiProvider(value) {
  return String(value || "").trim().toLowerCase() === "openai" ? "openai" : "local";
}

function getQuickModelStateBase() {
  const provider = normalizeAiProvider(storageGetSync(AI_PROVIDER_STORAGE_KEY));
  const localModel = String(storageGetSync(LOCAL_CHAT_MODEL_STORAGE_KEY) || DEFAULT_LOCAL_CHAT_MODEL).trim() || DEFAULT_LOCAL_CHAT_MODEL;
  const openAiModel = String(storageGetSync(OPENAI_CHAT_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_CHAT_MODEL).trim() || DEFAULT_OPENAI_CHAT_MODEL;
  return {
    provider,
    localModel,
    openAiModel,
    modelId: provider === "openai" ? openAiModel : localModel
  };
}

function normalizeOllamaTagModel(model) {
  if (typeof model === "string") return model.trim();
  if (!model || typeof model !== "object") return "";
  return String(model.name || model.model || model.id || "").trim();
}

function createTimeoutSignal(timeoutMs = 0) {
  const controller = new AbortController();
  const timeout = Number(timeoutMs);
  const timeoutId = timeout > 0
    ? setTimeout(() => controller.abort(), timeout)
    : null;
  return {
    controller,
    signal: controller.signal,
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };
}

async function fetchInstalledOllamaModelsFromBase(baseUrl, timeoutMs = 2500) {
  const timeout = createTimeoutSignal(timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${OLLAMA_TAGS_PATH}`, { method: "GET", signal: timeout.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json().catch(() => ({}));
    const models = Array.isArray(data.models)
      ? data.models.map(normalizeOllamaTagModel).filter(Boolean)
      : [];
    return { baseUrl, models };
  } finally {
    timeout.clear();
  }
}

async function fetchInstalledOllamaModelState(timeoutMs = 2500) {
  let lastError = null;
  for (const baseUrl of OLLAMA_BASE_URL_CANDIDATES) {
    try {
      return await fetchInstalledOllamaModelsFromBase(baseUrl, timeoutMs);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Ollama is not reachable.");
}

async function fetchInstalledOllamaModels(timeoutMs = 2500) {
  const state = await fetchInstalledOllamaModelState(timeoutMs);
  return state.models;
}

async function getQuickModelState() {
  const state = getQuickModelStateBase();
  try {
    const ollamaState = await fetchInstalledOllamaModelState();
    return {
      ...state,
      ollamaReachable: true,
      ollamaBaseUrl: ollamaState.baseUrl,
      installedOllamaModels: ollamaState.models
    };
  } catch {
    return {
      ...state,
      ollamaReachable: false,
      installedOllamaModels: []
    };
  }
}

async function isOllamaHttpReachable() {
  try {
    await fetchInstalledOllamaModelState(1200);
    return true;
  } catch {
    return false;
  }
}

function isOllamaProcessRunning() {
  try {
    if (process.platform === "win32") {
      const probe = spawnSync("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-Process | Where-Object { $_.ProcessName -like 'ollama*' -or $_.Path -like '*Ollama*' } | Select-Object -First 1 -ExpandProperty Id"
      ], {
        encoding: "utf8",
        timeout: 2500,
        windowsHide: true
      });
      return probe.status === 0 && Boolean(String(probe.stdout || "").trim());
    }

    const probe = spawnSync("pgrep", ["-f", "ollama"], {
      encoding: "utf8",
      timeout: 2500
    });
    return probe.status === 0 && Boolean(String(probe.stdout || "").trim());
  } catch {
    return false;
  }
}

async function getOllamaStatus() {
  try {
    const state = await fetchInstalledOllamaModelState(3500);
    return {
      ok: true,
      status: "online",
      httpReachable: true,
      processRunning: true,
      baseUrl: state.baseUrl,
      installedOllamaModels: state.models,
      message: `Ollama HTTP is reachable at ${state.baseUrl}.`
    };
  } catch (error) {
    const processRunning = isOllamaProcessRunning();
    return {
      ok: false,
      status: processRunning ? "process-running" : "offline",
      httpReachable: false,
      processRunning,
      baseUrl: "",
      installedOllamaModels: [],
      message: processRunning
        ? "Ollama is running, but the HTTP API is not reachable at 127.0.0.1:11434 or localhost:11434."
        : (error?.message || "Ollama is not reachable.")
    };
  }
}

function getOllamaExecutableCandidates() {
  if (process.platform !== "win32") return ["ollama"];
  return [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
    path.join(process.env.ProgramFiles || "", "Ollama", "ollama.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Ollama", "ollama.exe"),
    "ollama.exe",
    "ollama"
  ].filter(Boolean);
}

function findOllamaExecutable() {
  for (const candidate of getOllamaExecutableCandidates()) {
    const probe = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return "";
}

async function startOllamaHttpService() {
  const currentStatus = await getOllamaStatus();
  if (currentStatus.httpReachable) {
    return {
      ...currentStatus,
      ok: true,
      status: "running",
      message: "Ollama is already running."
    };
  }

  const executable = findOllamaExecutable();
  if (!executable) {
    return {
      ok: false,
      status: "missing",
      message: "Ollama is not installed or is not on PATH.",
      downloadUrl: "https://ollama.com/download"
    };
  }

  try {
    const child = spawn(executable, ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: error?.message || "Could not start Ollama."
    };
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const status = await getOllamaStatus();
    if (status.httpReachable) {
      return {
        ...status,
        ok: true,
        status: "started",
        message: "Ollama HTTP is running."
      };
    }
  }

  const nextStatus = await getOllamaStatus();
  return {
    ...nextStatus,
    ok: false,
    status: nextStatus.processRunning ? "process-running" : "starting",
    message: nextStatus.processRunning
      ? "Ollama is running, but its HTTP API is still not reachable. Restart Ollama or run `ollama serve` from a terminal."
      : "Ollama was started, but HTTP did not respond yet."
  };
}

function isAllowedOllamaHost(url) {
  return url.protocol === "http:"
    && String(url.port || "80") === "11434"
    && ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
}

function normalizeOllamaProxyPath(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return OLLAMA_TAGS_PATH;
  if (raw.startsWith("/")) {
    if (!raw.startsWith("/api/")) throw new Error("Only Ollama /api requests are allowed.");
    return raw;
  }

  const parsed = new URL(raw);
  if (!isAllowedOllamaHost(parsed)) {
    throw new Error("Only local Ollama requests on port 11434 are allowed.");
  }
  const requestPath = `${parsed.pathname || "/"}${parsed.search || ""}`;
  if (!requestPath.startsWith("/api/")) throw new Error("Only Ollama /api requests are allowed.");
  return requestPath;
}

function normalizeOllamaProxyHeaders(headers = {}) {
  const blocked = new Set(["host", "connection", "content-length", "origin", "referer"]);
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const name = String(key || "").trim();
    if (!name || blocked.has(name.toLowerCase())) continue;
    normalized[name] = String(value ?? "");
  }
  return normalized;
}

async function proxyOllamaRequest(payload = {}) {
  const requestPath = normalizeOllamaProxyPath(payload.url || payload.path);
  const method = String(payload.method || "GET").trim().toUpperCase();
  const headers = normalizeOllamaProxyHeaders(payload.headers);
  const bodyText = payload.bodyText === undefined || payload.bodyText === null
    ? undefined
    : String(payload.bodyText);
  const timeoutMs = Math.max(0, Math.min(Number(payload.timeoutMs) || 0, 30 * 60 * 1000));
  let lastError = null;

  for (const baseUrl of OLLAMA_BASE_URL_CANDIDATES) {
    const timeout = createTimeoutSignal(timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${requestPath}`, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : bodyText,
        signal: timeout.signal
      });
      const bodyBuffer = Buffer.from(await response.arrayBuffer());
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        bodyBase64: bodyBuffer.toString("base64"),
        baseUrl
      };
    } catch (error) {
      lastError = error;
    } finally {
      timeout.clear();
    }
  }

  throw new Error(lastError?.message || "Could not reach local Ollama HTTP.");
}

async function readOllamaPullStream(response, onLine) {
  if (!response.body) return {};
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData = {};

  const handleLine = line => {
    const trimmed = String(line || "").trim();
    if (!trimmed) return;
    const data = JSON.parse(trimmed);
    finalData = { ...finalData, ...data };
    onLine(data);
  };

  if (typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let lineEnd = buffer.indexOf("\n");
        while (lineEnd !== -1) {
          handleLine(buffer.slice(0, lineEnd).replace(/\r$/, ""));
          buffer = buffer.slice(lineEnd + 1);
          lineEnd = buffer.indexOf("\n");
        }
      }
    } finally {
      reader.releaseLock?.();
    }
  } else {
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let lineEnd = buffer.indexOf("\n");
      while (lineEnd !== -1) {
        handleLine(buffer.slice(0, lineEnd).replace(/\r$/, ""));
        buffer = buffer.slice(lineEnd + 1);
        lineEnd = buffer.indexOf("\n");
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) handleLine(buffer.trim());
  return finalData;
}

async function pullOllamaModelWithProgress(event, payload = {}) {
  const modelId = String(payload.modelId || payload.name || "").trim();
  if (!modelId) throw new Error("Missing Ollama model id.");
  const requestId = String(payload.requestId || crypto.randomUUID());
  let lastError = null;

  const emitProgress = data => {
    event.sender.send("fauna:ollama-pull-progress", {
      requestId,
      modelId,
      ...data
    });
  };

  for (const baseUrl of OLLAMA_BASE_URL_CANDIDATES) {
    const timeout = createTimeoutSignal(30 * 60 * 1000);
    activeOllamaPulls.set(requestId, {
      controller: timeout.controller,
      modelId,
      baseUrl,
      startedAt: Date.now()
    });
    try {
      const response = await fetch(`${baseUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelId, stream: true }),
        signal: timeout.signal
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ollama responded with HTTP ${response.status}`);
      }
      const finalData = await readOllamaPullStream(response, emitProgress);
      if (finalData?.error) throw new Error(finalData.error);
      emitProgress({ status: "success", done: true, completed: 1, total: 1 });
      return {
        ok: true,
        requestId,
        modelId,
        baseUrl,
        ...finalData
      };
    } catch (error) {
      if (timeout.signal.aborted) {
        emitProgress({ status: "cancelled", done: true });
        throw new Error("Model download cancelled.");
      }
      lastError = error;
    } finally {
      activeOllamaPulls.delete(requestId);
      timeout.clear();
    }
  }

  throw new Error(lastError?.message || `Could not pull ${modelId}.`);
}

function cancelOllamaPull(payload = {}) {
  const requestId = String(payload.requestId || "").trim();
  if (!requestId) return { ok: false, message: "Missing Ollama pull request id." };
  const active = activeOllamaPulls.get(requestId);
  if (!active) {
    return { ok: false, requestId, message: "Ollama pull is not active." };
  }
  active.controller?.abort?.();
  activeOllamaPulls.delete(requestId);
  return {
    ok: true,
    requestId,
    modelId: active.modelId || "",
    message: "Ollama pull cancelled."
  };
}

function getDesktopInfo() {
  const settings = readSettingsSync();
  const sessions = readChatSessionsSync();
  const workspaceAccessPolicy = getWorkspaceAccessPolicySync();
  return {
    appDataPath: getUserDataRoot(),
    settingsPath: getSettingsPath(),
    chatsPath: getChatsRoot(),
    mediaPath: path.join(getChatsRoot(), "<chatId>", "media"),
    outputPath: path.join(getChatsRoot(), "<chatId>", "output"),
    skillsPath: getSkillsRoot(),
    fileRefsPath: getFileRefsPath(),
    bridgeEndpoint: storageGetSync(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY),
    bridgeRoot: getBridgeRootForPolicy(workspaceAccessPolicy),
    workspaceAccessPolicy,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    storageBackend: "AppData",
    settingsKeys: Object.keys(settings).sort(),
    chatCount: sessions.length,
    projects: readWorkspaceProjectsSync(),
    activeChatId: getActiveChatIdSync(),
    remoteAccess: getRemoteAccessInfoSync(),
    updateState
  };
}

function getRemoteAccessEnabledSync() {
  return storageGetSync(REMOTE_ACCESS_ENABLED_STORAGE_KEY) === "true";
}

function getRemoteAccessTokenSync() {
  const existing = String(storageGetSync(REMOTE_ACCESS_TOKEN_STORAGE_KEY) || "").trim();
  if (existing) return existing;
  const token = crypto.randomBytes(24).toString("base64url");
  storageSetSync(REMOTE_ACCESS_TOKEN_STORAGE_KEY, token);
  return token;
}

function getRemoteAccessPreferredPortSync() {
  const stored = Number(storageGetSync(REMOTE_ACCESS_PORT_STORAGE_KEY));
  if (Number.isInteger(stored) && stored >= 1024 && stored <= 65535) return stored;
  return DEFAULT_REMOTE_ACCESS_PORT;
}

function getLanIpv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry?.family !== "IPv4" || entry.internal || !entry.address) continue;
      addresses.push(entry.address);
    }
  }
  return Array.from(new Set(addresses)).sort();
}

function getRemoteAccessUrls(port = remoteAccessPort || getRemoteAccessPreferredPortSync()) {
  const cleanPort = Number(port) || DEFAULT_REMOTE_ACCESS_PORT;
  return getLanIpv4Addresses().map(address => `http://${address}:${cleanPort}`);
}

function getRemoteAccessInfoSync() {
  const enabled = getRemoteAccessEnabledSync();
  const running = Boolean(remoteAccessServer);
  const port = remoteAccessPort || getRemoteAccessPreferredPortSync();
  const lanUrls = running ? getRemoteAccessUrls(port) : [];
  return {
    enabled,
    running,
    port,
    endpoint: running ? `http://127.0.0.1:${port}` : "",
    lanUrls,
    primaryUrl: lanUrls[0] || (running ? `http://127.0.0.1:${port}` : ""),
    token: getRemoteAccessTokenSync()
  };
}

function canUseRemotePort(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

async function findAvailableRemoteAccessPort(preferredPort = DEFAULT_REMOTE_ACCESS_PORT) {
  const preferred = Math.max(1024, Math.min(65535, Number(preferredPort) || DEFAULT_REMOTE_ACCESS_PORT));
  const candidates = [];
  for (let port = preferred; port <= MAX_REMOTE_ACCESS_PORT; port += 1) candidates.push(port);
  for (let port = DEFAULT_REMOTE_ACCESS_PORT; port < preferred; port += 1) candidates.push(port);
  for (const port of candidates) {
    if (await canUseRemotePort(port)) return port;
  }
  throw new Error("No remote access port is available.");
}

function timingSafeStringEquals(left = "", right = "") {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getRemoteRequestToken(req) {
  const auth = String(req.headers.authorization || "");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const header = String(req.headers["x-fauna-remote-token"] || "").trim();
  return header || bearer;
}

function isRemoteRequestAuthorized(req) {
  const expected = getRemoteAccessTokenSync();
  const supplied = getRemoteRequestToken(req);
  return Boolean(expected && supplied && timingSafeStringEquals(supplied, expected));
}

function setRemoteCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-fauna-remote-token");
}

function sendRemoteJson(res, statusCode, payload = {}) {
  setRemoteCorsHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendRemoteText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache"
  });
  res.end(text);
}

function readRemoteJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > REMOTE_REQUEST_BODY_LIMIT_BYTES) {
        reject(new Error("Remote request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("error", reject);
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Remote request body must be JSON."));
      }
    });
  });
}

function getRemoteStaticMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function serveRemoteStaticFile(reqPath, res) {
  const pathname = reqPath === "/" || reqPath === "/mobile" ? "/mobile/" : reqPath;
  if (pathname === "/favicon.png") {
    const favicon = path.join(getAppRoot(), "favicon.png");
    if (fs.existsSync(favicon)) {
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600"
      });
      fs.createReadStream(favicon).pipe(res);
      return true;
    }
  }

  const appRoot = getAppRoot();
  let staticRoot = "";
  let relative = "";

  if (pathname.startsWith("/mobile/")) {
    staticRoot = path.join(appRoot, "mobile");
    relative = decodeURIComponent(pathname.slice("/mobile/".length)) || "index.html";
  } else if (pathname === "/styles.css") {
    staticRoot = appRoot;
    relative = "styles.css";
  } else if (pathname.startsWith("/styles/")) {
    staticRoot = path.join(appRoot, "styles");
    relative = decodeURIComponent(pathname.slice("/styles/".length));
  } else if (pathname === "/components/composer.html" || pathname === "/components/templates.html") {
    staticRoot = path.join(appRoot, "components");
    relative = path.basename(pathname);
  } else if (pathname === "/modules/model-switcher.js") {
    staticRoot = path.join(appRoot, "modules");
    relative = "model-switcher.js";
  } else {
    return false;
  }

  const target = path.resolve(staticRoot, relative);
  if (!isPathInside(target, staticRoot) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return false;

  res.writeHead(200, {
    "Content-Type": getRemoteStaticMimeType(target),
    "Cache-Control": target.endsWith(".html") ? "no-cache" : "public, max-age=600"
  });
  fs.createReadStream(target).pipe(res);
  return true;
}

function getRemoteMessageText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.content === "string") return part.content;
      return "";
    }).filter(Boolean).join("\n");
  }
  if (content && typeof content === "object" && typeof content.text === "string") return content.text;
  return String(content || "");
}

function cleanRemoteMessageText(value = "") {
  return String(value || "")
    .replace(/<fauna_(?:tool_call|question|chat_title|memory)>[\s\S]*?<\/fauna_(?:tool_call|question|chat_title|memory)>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeRemoteMessage(message = {}, index = 0) {
  const role = ["user", "assistant", "system", "tool"].includes(message.role) ? message.role : "assistant";
  return {
    id: String(message.id || `${role}-${index}`),
    role,
    content: cleanRemoteMessageText(getRemoteMessageText(message.content)),
    createdAt: String(message.createdAt || message.completedAt || ""),
    error: message.faunaError || null
  };
}

function compareRemoteChatSessions(a, b) {
  if (Boolean(a?.pinned) !== Boolean(b?.pinned)) return a?.pinned ? -1 : 1;
  return getSessionTime(b) - getSessionTime(a);
}

function getRemoteChatSummaries(limit = 40) {
  const max = Math.max(1, Math.min(120, Number(limit) || 40));
  const activeChatId = getActiveChatIdSync();
  return readChatSessionsSync()
    .filter(session => session?.id && !session.archived && sessionHasContent(session))
    .sort(compareRemoteChatSessions)
    .slice(0, max)
    .map(session => ({
      id: sanitizeId(session.id, "chat"),
      title: getSessionTitle(session),
      preview: getSessionPreview(session),
      updatedAt: session.updatedAt || session.createdAt || "",
      pinned: Boolean(session.pinned),
      archived: Boolean(session.archived),
      active: session.id === activeChatId
    }));
}

function readChatSessionByIdSync(chatId = "") {
  const safeId = sanitizeId(chatId, "");
  if (!safeId) return null;
  return readChatSessionsSync().find(session => sanitizeId(session?.id, "") === safeId) || null;
}

function serializeRemoteChatSession(session) {
  const history = Array.isArray(session?.conversationHistory) ? session.conversationHistory : [];
  return {
    id: sanitizeId(session?.id, "chat"),
    title: getSessionTitle(session),
    preview: getSessionPreview(session),
    createdAt: session?.createdAt || "",
    updatedAt: session?.updatedAt || session?.createdAt || "",
    pinned: Boolean(session?.pinned),
    archived: Boolean(session?.archived),
    messages: history.map(normalizeRemoteMessage).filter(message => message.content || message.error)
  };
}

function normalizeRemotePrompt(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, 12000);
}

function dispatchRemotePrompt({ chatId = "", prompt = "", newChat = false } = {}) {
  const cleanPrompt = normalizeRemotePrompt(prompt);
  if (!cleanPrompt) throw new Error("Message is empty.");

  const safeChatId = sanitizeId(chatId, "");
  const quickPayload = normalizeQuickPromptPayload({ prompt: cleanPrompt });
  if (!quickPromptPayloadHasContent(quickPayload)) throw new Error("Message is empty.");

  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingOpenChatId = safeChatId || pendingOpenChatId;
    pendingQuickPayload = quickPayload;
    pendingQuickPrompt = "";
    pendingNewChat = Boolean(newChat || pendingNewChat);
    createWindow({ chatId: safeChatId });
    return { delivered: false };
  }

  if (mainWindow.webContents.isLoading() || !mainRendererReady) {
    pendingOpenChatId = safeChatId || pendingOpenChatId;
    pendingQuickPayload = quickPayload;
    pendingQuickPrompt = "";
    pendingNewChat = Boolean(newChat || pendingNewChat);
    return { delivered: false };
  }

  if (newChat) sendToRenderer("fauna:new-chat", {});
  if (safeChatId) sendToRenderer("fauna:open-chat", { chatId: safeChatId });
  sendToRenderer("fauna:quick-prompt", quickPayload);
  return { delivered: true };
}

function setRemoteChatPinned(chatId = "", pinned = false) {
  const safeId = sanitizeId(chatId, "");
  const sessions = readChatSessionsSync();
  const session = sessions.find(item => sanitizeId(item?.id, "") === safeId);
  if (!session) throw new Error("Chat was not found.");
  if (session.archived) throw new Error("Archived chats cannot be pinned from mobile.");
  session.pinned = Boolean(pinned);
  session.updatedAt = new Date().toISOString();
  writeJsonFileSync(getChatFilePath(safeId), { ...session, id: safeId });
  refreshDesktopRecents();
  sendToRenderer("fauna:remote-chat-pinned", {
    chatId: safeId,
    pinned: session.pinned,
    updatedAt: session.updatedAt
  });
  return serializeRemoteChatSession(session);
}

async function handleRemoteApiRequest(req, res, requestUrl) {
  if (!isRemoteRequestAuthorized(req)) {
    sendRemoteJson(res, 401, { ok: false, error: "Unauthorized remote token" });
    return;
  }

  const parts = requestUrl.pathname.split("/").filter(Boolean);
  const method = String(req.method || "GET").toUpperCase();

  if (method === "GET" && requestUrl.pathname === "/api/health") {
    sendRemoteJson(res, 200, { ok: true, info: getRemoteAccessInfoSync(), app: "Fauna" });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/info") {
    sendRemoteJson(res, 200, { ok: true, info: getDesktopInfo() });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/chats") {
    sendRemoteJson(res, 200, {
      ok: true,
      chats: getRemoteChatSummaries(requestUrl.searchParams.get("limit")),
      activeChatId: getActiveChatIdSync()
    });
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/messages") {
    const body = await readRemoteJsonBody(req);
    const result = dispatchRemotePrompt({
      chatId: body.chatId,
      prompt: body.message || body.prompt,
      newChat: Boolean(body.newChat)
    });
    sendRemoteJson(res, 202, { ok: true, accepted: true, ...result });
    return;
  }

  if (parts[0] === "api" && parts[1] === "chats" && parts[2]) {
    const chatId = sanitizeId(parts[2], "");
    const session = readChatSessionByIdSync(chatId);
    if (!session) {
      sendRemoteJson(res, 404, { ok: false, error: "Chat was not found." });
      return;
    }

    if (method === "GET" && parts.length === 3) {
      sendRemoteJson(res, 200, { ok: true, chat: serializeRemoteChatSession(session) });
      return;
    }

    if (method === "POST" && parts[3] === "send") {
      if (session.archived) {
        sendRemoteJson(res, 409, { ok: false, error: "Archived chats are read-only." });
        return;
      }
      const body = await readRemoteJsonBody(req);
      const result = dispatchRemotePrompt({
        chatId,
        prompt: body.message || body.prompt,
        newChat: false
      });
      sendRemoteJson(res, 202, { ok: true, accepted: true, chatId, ...result });
      return;
    }

    if (method === "POST" && parts[3] === "pin") {
      const body = await readRemoteJsonBody(req);
      const chat = setRemoteChatPinned(chatId, body.pinned);
      sendRemoteJson(res, 200, { ok: true, chat });
      return;
    }
  }

  sendRemoteJson(res, 404, { ok: false, error: "Unknown remote endpoint." });
}

async function handleRemoteAccessRequest(req, res) {
  setRemoteCorsHeaders(res);
  if (String(req.method || "").toUpperCase() === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (requestUrl.pathname.startsWith("/api/")) {
      await handleRemoteApiRequest(req, res, requestUrl);
      return;
    }
    if (await serveRemoteStaticFile(requestUrl.pathname, res)) return;
    sendRemoteText(res, 404, "Not found");
  } catch (error) {
    if (!res.headersSent) {
      sendRemoteJson(res, 500, { ok: false, error: error?.message || "Remote access failed." });
    } else {
      res.end();
    }
  }
}

async function startRemoteAccessServer() {
  if (remoteAccessServer) return getRemoteAccessInfoSync();
  const port = await findAvailableRemoteAccessPort(getRemoteAccessPreferredPortSync());
  getRemoteAccessTokenSync();

  const server = http.createServer((req, res) => {
    void handleRemoteAccessRequest(req, res);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", resolve);
  });

  remoteAccessServer = server;
  remoteAccessPort = port;
  storageSetSync(REMOTE_ACCESS_PORT_STORAGE_KEY, String(port));
  console.log(`Fauna remote access listening on 0.0.0.0:${port}`);
  return getRemoteAccessInfoSync();
}

function stopRemoteAccessServer() {
  const server = remoteAccessServer;
  remoteAccessServer = null;
  remoteAccessPort = 0;
  if (!server) return Promise.resolve(getRemoteAccessInfoSync());
  return new Promise(resolve => {
    server.close(() => resolve(getRemoteAccessInfoSync()));
  });
}

async function startRemoteAccessServerIfEnabled() {
  if (!getRemoteAccessEnabledSync()) return getRemoteAccessInfoSync();
  return startRemoteAccessServer();
}

async function setRemoteAccessEnabled(enabled) {
  storageSetSync(REMOTE_ACCESS_ENABLED_STORAGE_KEY, enabled ? "true" : "false");
  if (enabled) return startRemoteAccessServer();
  return stopRemoteAccessServer();
}

function rotateRemoteAccessToken() {
  storageSetSync(REMOTE_ACCESS_TOKEN_STORAGE_KEY, crypto.randomBytes(24).toString("base64url"));
  return getRemoteAccessInfoSync();
}

async function removePathInsideUserData(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!isPathInside(resolved, getUserDataRoot())) {
    throw new Error(`Refusing to remove path outside AppData: ${resolved}`);
  }
  try {
    await fsp.rm(resolved, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100
    });
    return true;
  } catch (error) {
    console.warn("Could not remove AppData path:", resolved, error);
    return false;
  }
}

async function removeKnownCacheDirectories() {
  let removed = 0;
  let failed = 0;
  for (const name of APP_CACHE_DIRECTORIES) {
    const target = path.join(getUserDataRoot(), name);
    if (!fs.existsSync(target)) continue;
    if (await removePathInsideUserData(target)) removed += 1;
    else failed += 1;
  }
  return { removed, failed };
}

function clearSettingsCacheKeys() {
  const settings = readSettingsSync();
  let removed = 0;
  for (const key of APP_CACHE_STORAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      delete settings[key];
      removed += 1;
    }
  }
  writeSettingsSync(settings);
  return removed;
}

async function removeTemporaryChatMediaFiles() {
  let removed = 0;
  let failed = 0;
  const chatsRoot = getChatsRoot();
  if (!fs.existsSync(chatsRoot)) return { removed, failed };

  const chatDirs = await fsp.readdir(chatsRoot, { withFileTypes: true }).catch(() => []);
  for (const chatDir of chatDirs) {
    if (!chatDir.isDirectory()) continue;
    const mediaDir = path.join(chatsRoot, chatDir.name, "media");
    const mediaEntries = await fsp.readdir(mediaDir, { withFileTypes: true }).catch(() => []);
    for (const mediaEntry of mediaEntries) {
      if (!mediaEntry.isFile() || !TEMP_MEDIA_FILE_RE.test(mediaEntry.name)) continue;
      const target = path.join(mediaDir, mediaEntry.name);
      if (await removePathInsideUserData(target)) removed += 1;
      else failed += 1;
    }
  }
  return { removed, failed };
}

function stripVoiceRecordingsFromStoredChats() {
  let updated = 0;
  const chatsRoot = getChatsRoot();
  if (!fs.existsSync(chatsRoot)) return updated;

  const chatDirs = fs.readdirSync(chatsRoot, { withFileTypes: true });
  for (const chatDir of chatDirs) {
    if (!chatDir.isDirectory()) continue;
    const chatFile = path.join(chatsRoot, chatDir.name, "chat.json");
    const session = readJsonFileSync(chatFile, null);
    if (!session || typeof session !== "object") continue;

    let changed = false;
    if (Array.isArray(session.conversationHistory)) {
      session.conversationHistory.forEach(message => {
        if (message?.voiceRecording) {
          delete message.voiceRecording;
          changed = true;
        }
      });
    }
    if (typeof session.chatHtml === "string" && /voice-recording-player/.test(session.chatHtml)) {
      session.chatHtml = removeVoiceRecordingPlayersFromHtml(session.chatHtml);
      changed = true;
    }
    if (!changed) continue;
    writeJsonFileSync(chatFile, session);
    updated += 1;
  }
  return updated;
}

function removeVoiceRecordingPlayersFromHtml(html = "") {
  let output = String(html || "");
  let markerIndex = output.search(/\bvoice-recording-player\b/i);
  while (markerIndex >= 0) {
    const start = output.lastIndexOf("<div", markerIndex);
    if (start < 0) break;

    const tagRe = /<\/?div\b[^>]*>/gi;
    tagRe.lastIndex = start;
    let depth = 0;
    let end = -1;
    let match;
    while ((match = tagRe.exec(output))) {
      if (match[0][1] === "/") {
        depth -= 1;
        if (depth === 0) {
          end = tagRe.lastIndex;
          break;
        }
      } else {
        depth += 1;
      }
    }
    if (end < 0) break;
    output = `${output.slice(0, start)}${output.slice(end)}`;
    markerIndex = output.search(/\bvoice-recording-player\b/i);
  }
  return output;
}

async function clearAppCacheData() {
  const removedSettingsKeys = clearSettingsCacheKeys();
  const media = await removeTemporaryChatMediaFiles();
  const cacheDirs = await removeKnownCacheDirectories();
  const updatedChats = stripVoiceRecordingsFromStoredChats();
  refreshDesktopRecents();
  return {
    ok: true,
    removedSettingsKeys,
    removedTemporaryFiles: media.removed,
    failedTemporaryFiles: media.failed,
    removedCacheDirectories: cacheDirs.removed,
    failedCacheDirectories: cacheDirs.failed,
    updatedChats
  };
}

async function resetAppData(payload = {}) {
  if (payload.confirmFiles !== true || payload.confirmChats !== true) {
    throw new Error("Reset requires confirmation for files/artifacts and chats.");
  }

  await clearAppCacheData();
  await removePathInsideUserData(getSettingsPath());
  await removePathInsideUserData(getFileRefsPath());
  await removePathInsideUserData(getChatsRoot());
  refreshDesktopRecents();
  return {
    ok: true,
    reset: true
  };
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
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg"
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

function stopWorkspaceBridge() {
  const child = bridgeProcess;
  bridgeProcess = null;
  if (!child || child.killed) return Promise.resolve();

  return new Promise(resolve => {
    const timeout = setTimeout(resolve, 2500);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function startWorkspaceBridge() {
  if (bridgeProcess && !bridgeProcess.killed) {
    await stopWorkspaceBridge();
  }

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
  const accessPolicy = getWorkspaceAccessPolicySync();
  const bridgeRoot = getBridgeRootForPolicy(accessPolicy);
  const projectBridgeMap = getWorkspaceProjectBridgeMap();
  const bridgeArgs = [
    ...launcher.args,
    scriptPath,
    "--root",
    bridgeRoot,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--token",
    token,
    "--access-policy",
    accessPolicy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE ? "machine" : "workspace",
    "--projects-json",
    JSON.stringify(projectBridgeMap)
  ];
  if (accessPolicy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE) {
    bridgeArgs.push("--allow-dangerous");
  }

  const child = spawn(launcher.command, bridgeArgs, {
    cwd: bridgeRoot,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.on("data", chunk => console.log(`[fauna-bridge] ${String(chunk).trim()}`));
  child.stderr?.on("data", chunk => console.warn(`[fauna-bridge] ${String(chunk).trim()}`));
  child.on("exit", code => {
    if (!app.isQuitting && bridgeProcess === child) console.warn(`Fauna bridge exited with code ${code}`);
  });
  bridgeProcess = child;
  return { endpoint, token, root: bridgeRoot, accessPolicy };
}

function isMainWindowWebContents(webContents) {
  return Boolean(mainWindow && webContents && webContents.id === mainWindow.webContents.id);
}

function configureMediaPermissions() {
  const allowedPermissions = new Set([
    "media",
    "microphone",
    "camera",
    "audioCapture",
    "videoCapture",
    "display-capture",
    "notifications"
  ]);

  const isAllowed = (webContents, permission) => (
    allowedPermissions.has(permission) && isMainWindowWebContents(webContents)
  );

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(isAllowed(webContents, permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => (
    isAllowed(webContents, permission)
  ));
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function getNavigationState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { canGoBack: false, canGoForward: false };
  }
  return {
    canGoBack: mainWindow.webContents.canGoBack(),
    canGoForward: mainWindow.webContents.canGoForward()
  };
}

function sendNavigationState() {
  sendToRenderer("fauna:navigation-changed", getNavigationState());
}

function sendWindowState() {
  sendToRenderer("fauna:window-state-changed", {
    isMaximized: Boolean(mainWindow?.isMaximized())
  });
}

function normalizeUpdateInfo(info = {}) {
  return {
    version: String(info.version || ""),
    releaseName: String(info.releaseName || ""),
    releaseDate: String(info.releaseDate || ""),
    releaseNotes: Array.isArray(info.releaseNotes) ? info.releaseNotes : info.releaseNotes || ""
  };
}

function setUpdateState(patch = {}) {
  updateState = {
    ...updateState,
    ...patch,
    currentVersion: app.getVersion(),
    updatedAt: new Date().toISOString()
  };
  sendToRenderer("fauna:update-status", updateState);
  return updateState;
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({
      status: "checking",
      message: "Checking for updates...",
      canInstall: false,
      progress: 0
    });
  });

  autoUpdater.on("update-available", info => {
    const normalizedInfo = normalizeUpdateInfo(info);
    setUpdateState({
      status: "available",
      message: normalizedInfo.version ? `Version ${normalizedInfo.version} is available` : "Update available",
      canInstall: true,
      availableVersion: normalizedInfo.version,
      info: normalizedInfo,
      progress: 0
    });
  });

  autoUpdater.on("update-not-available", info => {
    setUpdateState({
      status: "current",
      message: "Fauna is up to date",
      canInstall: false,
      availableVersion: normalizeUpdateInfo(info).version || "",
      progress: 0
    });
  });

  autoUpdater.on("download-progress", progress => {
    setUpdateState({
      status: "downloading",
      message: `Downloading update ${Math.round(progress.percent || 0)}%`,
      canInstall: false,
      progress: Math.max(0, Math.min(100, Number(progress.percent) || 0))
    });
  });

  autoUpdater.on("update-downloaded", info => {
    const normalizedInfo = normalizeUpdateInfo(info);
    setUpdateState({
      status: "downloaded",
      message: "Update ready to install",
      canInstall: true,
      availableVersion: normalizedInfo.version || updateState.availableVersion,
      info: normalizedInfo,
      progress: 100
    });
  });

  autoUpdater.on("error", error => {
    setUpdateState({
      status: "error",
      message: error?.message || "Update check failed",
      canInstall: false
    });
  });
}

async function checkForDesktopUpdate() {
  if (!app.isPackaged) {
    return setUpdateState({
      status: "dev",
      message: "Update checks run in packaged builds",
      canInstall: false,
      progress: 0
    });
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateState({
      status: "error",
      message: error?.message || "Update check failed",
      canInstall: false
    });
  }
  return updateState;
}

async function installDesktopUpdate() {
  if (updateState.status === "downloaded") {
    autoUpdater.quitAndInstall(false, true);
    return setUpdateState({
      status: "installing",
      message: "Installing update...",
      canInstall: false
    });
  }

  if (updateState.status === "available") {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      setUpdateState({
        status: "error",
        message: error?.message || "Update download failed",
        canInstall: false
      });
    }
  }
  return updateState;
}

function getAppIconPath() {
  const icoPath = path.join(getAppRoot(), "build", "icon.ico");
  if (fs.existsSync(icoPath)) return icoPath;
  return path.join(getAppRoot(), "favicon.png");
}

function getJumpListIconPath() {
  return app.isPackaged ? process.execPath : getAppIconPath();
}

function getTrayImage() {
  const iconPath = getAppIconPath();
  const image = nativeImage.createFromPath(iconPath);
  if (!image.isEmpty()) return image.resize({ width: 16, height: 16 });
  return nativeImage.createFromPath(path.join(getAppRoot(), "favicon.png")).resize({ width: 16, height: 16 });
}

function getNotificationPermissionInfo() {
  const supported = typeof Notification?.isSupported === "function" ? Notification.isSupported() : Boolean(Notification);
  return {
    supported,
    permission: supported ? "granted" : "unsupported"
  };
}

function normalizeNotificationPayload(payload = {}) {
  const normalized = payload && typeof payload === "object" ? payload : {};
  const title = String(normalized.title || "Fauna").trim().slice(0, 120) || "Fauna";
  const body = String(normalized.body || "").trim().slice(0, 500);
  const tag = String(normalized.tag || "").trim().slice(0, 160);
  const sessionId = String(normalized.sessionId || "").trim().slice(0, 160);
  return {
    title,
    body,
    tag,
    sessionId,
    silent: normalized.silent !== false
  };
}

function showNativeNotification(payload = {}) {
  const permission = getNotificationPermissionInfo();
  if (!permission.supported) {
    return { ok: false, ...permission, message: "Native notifications are not supported on this system." };
  }

  const normalized = normalizeNotificationPayload(payload);
  const notification = new Notification({
    title: normalized.title,
    body: normalized.body,
    silent: normalized.silent,
    icon: getAppIconPath()
  });

  activeNativeNotifications.add(notification);
  notification.once("close", () => activeNativeNotifications.delete(notification));
  notification.once("failed", () => activeNativeNotifications.delete(notification));
  notification.on("click", () => {
    showMainWindow();
    sendToRenderer("fauna:notification-clicked", {
      tag: normalized.tag,
      sessionId: normalized.sessionId
    });
  });
  notification.show();
  return { ok: true, ...permission };
}

function getChatIdFromArgv(argv = []) {
  for (const arg of argv) {
    const match = String(arg || "").match(/^--open-chat=(.+)$/);
    if (match) return sanitizeId(decodeURIComponent(match[1]), "");
  }
  return "";
}

function hasArg(argv = [], name) {
  return argv.some(arg => String(arg || "") === name);
}

function getMainWindowUrl(chatId = "") {
  const hash = chatId ? `#${WORKSPACE_URL_FRAGMENT_CHAT}=${encodeURIComponent(chatId)}` : "";
  return `${APP_PROTOCOL}://app/index.html${hash}`;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function flushPendingRendererActions() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (pendingNewChat) {
    sendToRenderer("fauna:new-chat", {});
    pendingNewChat = false;
  }
  if (pendingOpenChatId) {
    sendToRenderer("fauna:open-chat", { chatId: pendingOpenChatId });
    pendingOpenChatId = "";
  }
  if (pendingQuickPrompt) {
    sendToRenderer("fauna:quick-prompt", { prompt: pendingQuickPrompt });
    pendingQuickPrompt = "";
  }
  if (pendingQuickPayload) {
    sendToRenderer("fauna:quick-prompt", pendingQuickPayload);
    pendingQuickPayload = null;
  }
}

function normalizeQuickPromptPayload(payload) {
  const raw = payload && typeof payload === "object"
    ? payload
    : { prompt: String(payload || "") };
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(attachment => ({
      path: String(attachment?.path || attachment?.filePath || "").trim(),
      name: String(attachment?.name || "").trim(),
      type: String(attachment?.type || "").trim()
    })).filter(attachment => attachment.path)
    : [];
  return {
    prompt: String(raw.prompt || "").trim(),
    provider: normalizeAiProvider(raw.provider),
    modelId: String(raw.modelId || "").trim(),
    attachments
  };
}

function quickPromptPayloadHasContent(payload) {
  return Boolean(payload?.prompt || payload?.attachments?.length);
}

function openMainWindow({ chatId = "", prompt = "", quickPayload = null, newChat = false } = {}) {
  const safeChatId = sanitizeId(chatId, "");
  const nextPrompt = String(prompt || "").trim();
  const nextQuickPayload = quickPayload
    ? normalizeQuickPromptPayload(quickPayload)
    : nextPrompt ? normalizeQuickPromptPayload({ prompt: nextPrompt }) : null;
  pendingOpenChatId = safeChatId || pendingOpenChatId;
  pendingQuickPrompt = nextPrompt || pendingQuickPrompt;
  if (quickPromptPayloadHasContent(nextQuickPayload)) {
    pendingQuickPayload = nextQuickPayload;
    pendingQuickPrompt = "";
  }
  pendingNewChat = Boolean(newChat || pendingNewChat);

  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow({ chatId: safeChatId });
    return;
  }

  showMainWindow();
  if (mainWindow.webContents.isLoading() || !mainRendererReady) return;
  flushPendingRendererActions();
}

function closeQuickWindow() {
  quickWindow?.hide();
}

function positionQuickWindow() {
  if (!quickWindow) return;
  const size = quickWindow.getBounds();
  const trayBounds = tray?.getBounds?.();
  const display = trayBounds?.width
    ? screen.getDisplayMatching(trayBounds)
    : screen.getPrimaryDisplay();
  const workArea = display.workArea;

  let x = Math.round(workArea.x + workArea.width - size.width - 18);
  let y = Math.round(workArea.y + workArea.height - size.height - 18);

  if (trayBounds?.width) {
    x = Math.round(trayBounds.x + (trayBounds.width / 2) - (size.width / 2));
    y = Math.round(trayBounds.y - size.height - 10);
  }

  x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - size.width - 8));
  y = Math.max(workArea.y + 8, Math.min(y, workArea.y + workArea.height - size.height - 8));
  quickWindow.setBounds({ x, y, width: size.width, height: size.height });
}

function createQuickWindow() {
  if (quickWindow && !quickWindow.isDestroyed()) return quickWindow;
  quickWindow = new BrowserWindow({
    width: 470,
    height: 640,
    minWidth: 360,
    minHeight: 520,
    maxWidth: 560,
    maxHeight: 760,
    frame: false,
    show: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: "#111214",
    title: "Fauna",
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  quickWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  quickWindow.on("blur", () => {
    if (!quickWindow?.webContents.isDevToolsOpened()) quickWindow?.hide();
  });
  quickWindow.on("closed", () => {
    quickWindow = null;
  });
  quickWindow.loadURL(`${APP_PROTOCOL}://app/desktop-quick.html`);
  return quickWindow;
}

function toggleQuickWindow() {
  const window = createQuickWindow();
  if (window.isVisible()) {
    window.hide();
    return;
  }
  positionQuickWindow();
  window.show();
  window.focus();
  window.webContents.send("fauna:recent-chats-changed", getRecentChatSummaries());
}

function buildRecentChatMenuItems(limit = 5) {
  const chats = getRecentChatSummaries(limit);
  if (chats.length === 0) {
    return [{ label: "No recent chats", enabled: false }];
  }
  return chats.map(chat => ({
    label: chat.title,
    sublabel: chat.preview || "Open chat",
    click: () => openMainWindow({ chatId: chat.id })
  }));
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Fauna", click: () => openMainWindow() },
    { label: "New chat", click: () => openMainWindow({ newChat: true }) },
    { type: "separator" },
    { label: "Recent chats", enabled: false },
    ...buildRecentChatMenuItems(5),
    { type: "separator" },
    { label: "Check for updates", click: () => void checkForDesktopUpdate() },
    {
      label: "Quit Fauna",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
}

function createTray() {
  if (tray) return tray;
  tray = new Tray(getTrayImage());
  tray.setToolTip("Fauna");
  tray.on("click", toggleQuickWindow);
  tray.on("double-click", () => openMainWindow());
  updateTrayMenu();
  return tray;
}

function updateJumpList() {
  if (process.platform !== "win32") return;
  const recentChats = getRecentChatSummaries(10).map(chat => ({
    type: "task",
    title: chat.title,
    description: chat.preview || "Open recent Fauna chat",
    program: process.execPath,
    args: `--open-chat=${encodeURIComponent(chat.id)}`,
    iconPath: getJumpListIconPath(),
    iconIndex: 0
  }));

  const categories = [
    {
      type: "tasks",
      items: [
        {
          type: "task",
          title: "Open Fauna",
          description: "Open the Fauna desktop app",
          program: process.execPath,
          args: "--open-fauna",
          iconPath: getJumpListIconPath(),
          iconIndex: 0
        },
        {
          type: "task",
          title: "New chat",
          description: "Start a new Fauna chat",
          program: process.execPath,
          args: "--new-chat",
          iconPath: getJumpListIconPath(),
          iconIndex: 0
        }
      ]
    }
  ];

  if (recentChats.length > 0) {
    categories.unshift({
      type: "custom",
      name: "Recent chats",
      items: recentChats
    });
  }

  try {
    app.setJumpList(categories);
  } catch (error) {
    console.warn("Could not update Fauna jump list:", error);
  }
}

function refreshDesktopRecents() {
  if (!app.isReady?.()) return;
  updateTrayMenu();
  updateJumpList();
  quickWindow?.webContents.send("fauna:recent-chats-changed", getRecentChatSummaries());
}

function handleLaunchArgs(argv = []) {
  if (hasArg(argv, "--quit-fauna")) {
    app.isQuitting = true;
    app.quit();
    return;
  }
  if (hasArg(argv, "--new-chat")) {
    openMainWindow({ newChat: true });
    return;
  }
  const chatId = getChatIdFromArgv(argv);
  if (chatId) {
    openMainWindow({ chatId });
    return;
  }
  openMainWindow();
}

function createWindow({ chatId = "" } = {}) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 940,
    minHeight: 680,
    frame: false,
    autoHideMenuBar: true,
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

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("close", event => {
    if (app.isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });
  mainWindow.on("maximize", sendWindowState);
  mainWindow.on("unmaximize", sendWindowState);
  mainWindow.on("restore", sendWindowState);
  mainWindow.on("enter-full-screen", sendWindowState);
  mainWindow.on("leave-full-screen", sendWindowState);
  mainWindow.webContents.on("did-navigate", sendNavigationState);
  mainWindow.webContents.on("did-navigate-in-page", sendNavigationState);
  mainWindow.webContents.on("did-finish-load", () => {
    mainRendererReady = false;
    sendNavigationState();
    sendWindowState();
    sendToRenderer("fauna:update-status", updateState);
  });

  mainWindow.loadURL(getMainWindowUrl(chatId || pendingOpenChatId));
}

function registerIpc() {
  ipcMain.on("fauna:storage-get", (event, key) => {
    event.returnValue = storageGetSync(String(key || ""));
  });
  ipcMain.on("fauna:storage-set", (event, key, value) => {
    event.returnValue = storageSetSync(String(key || ""), value);
  });
  ipcMain.on("fauna:storage-remove", (event, key) => {
    const ok = storageRemoveSync(String(key || ""));
    refreshDesktopRecents();
    event.returnValue = ok;
  });
  ipcMain.on("fauna:file-url", (event, filePath) => {
    event.returnValue = selectedFileUrlForPath(filePath);
  });
  ipcMain.handle("fauna:clipboard-write-text", (_event, value) => {
    clipboard.writeText(String(value ?? ""));
    return { ok: true };
  });
  ipcMain.handle("fauna:notifications-permission", () => getNotificationPermissionInfo());
  ipcMain.handle("fauna:notifications-request", () => getNotificationPermissionInfo());
  ipcMain.handle("fauna:notifications-show", (_event, payload) => showNativeNotification(payload));
  ipcMain.handle("fauna:save-generated-media", (_event, payload) => saveGeneratedMedia(payload));
  ipcMain.handle("fauna:desktop-info", () => getDesktopInfo());
  ipcMain.handle("fauna:skills-list", () => ({
    ok: true,
    path: getSkillsRoot(),
    skills: readSkillsFromDiskSync()
  }));
  ipcMain.handle("fauna:skills-save", (_event, skill) => {
    const existing = readSkillsFromDiskSync();
    const normalized = normalizeDesktopSkillRecord(skill);
    if (!normalized) throw new Error("Skill content is required.");
    const next = existing.filter(item => item.id !== normalized.id && item.name.toLowerCase() !== normalized.name.toLowerCase());
    next.push(normalized);
    return {
      ok: writeSkillsToDiskSync(next),
      path: path.join(getSkillsRoot(), normalizeSkillFolderName(normalized.name), "SKILL.md"),
      skill: normalized
    };
  });
  ipcMain.handle("fauna:skills-delete", (_event, nameOrId) => {
    const target = String(nameOrId || "").trim().toLowerCase();
    const next = readSkillsFromDiskSync().filter(skill => skill.id.toLowerCase() !== target && skill.name.toLowerCase() !== target);
    return { ok: writeSkillsToDiskSync(next), skills: next };
  });
  ipcMain.handle("fauna:skills-open-folder", () => openSkillsFolder());
  ipcMain.handle("fauna:projects-choose-folders", () => chooseWorkspaceProjectFolders());
  ipcMain.handle("fauna:projects-save", (_event, projects) => saveWorkspaceProjects(projects));
  ipcMain.handle("fauna:projects-open-path", (_event, projectPath) => openWorkspaceProjectPath(projectPath));
  ipcMain.handle("fauna:projects-open-terminal", (_event, projectPath) => openWorkspaceProjectTerminal(projectPath));
  ipcMain.handle("fauna:terminal-start", (_event, payload) => startProjectTerminalSession(payload));
  ipcMain.handle("fauna:terminal-write", (_event, payload) => writeProjectTerminalSession(payload));
  ipcMain.handle("fauna:terminal-stop", (_event, payload) => stopProjectTerminalSession(payload));
  ipcMain.handle("fauna:projects-create-worktree", (_event, payload) => createWorkspaceProjectWorktree(payload));
  ipcMain.handle("fauna:ollama-status", () => getOllamaStatus());
  ipcMain.handle("fauna:ollama-fetch", (_event, payload) => proxyOllamaRequest(payload));
  ipcMain.handle("fauna:ollama-pull", (event, payload) => pullOllamaModelWithProgress(event, payload));
  ipcMain.handle("fauna:ollama-pull-cancel", (_event, payload) => cancelOllamaPull(payload));
  ipcMain.handle("fauna:start-ollama", () => startOllamaHttpService());
  ipcMain.handle("fauna:workspace-bridge-ensure", async () => {
    await startWorkspaceBridge();
    return getDesktopInfo();
  });
  ipcMain.handle("fauna:set-workspace-access-policy", async (_event, policy) => {
    storageSetSync(WORKSPACE_ACCESS_POLICY_STORAGE_KEY, normalizeWorkspaceAccessPolicy(policy));
    await startWorkspaceBridge();
    return getDesktopInfo();
  });
  ipcMain.handle("fauna:remote-access-set-enabled", async (_event, enabled) => {
    await setRemoteAccessEnabled(Boolean(enabled));
    return getDesktopInfo();
  });
  ipcMain.handle("fauna:remote-access-rotate-token", () => {
    rotateRemoteAccessToken();
    return getDesktopInfo();
  });
  ipcMain.handle("fauna:clear-app-cache", () => clearAppCacheData());
  ipcMain.handle("fauna:reset-app-data", (_event, payload) => resetAppData(payload));
  ipcMain.handle("fauna:window-minimize", () => {
    mainWindow?.minimize();
    return { ok: true };
  });
  ipcMain.handle("fauna:window-toggle-maximize", () => {
    if (!mainWindow) return { ok: false, isMaximized: false };
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    sendWindowState();
    return { ok: true, isMaximized: mainWindow.isMaximized() };
  });
  ipcMain.handle("fauna:window-close", () => {
    mainWindow?.close();
    return { ok: true };
  });
  ipcMain.handle("fauna:window-state", () => ({
    isMaximized: Boolean(mainWindow?.isMaximized())
  }));
  ipcMain.handle("fauna:navigation-state", () => getNavigationState());
  ipcMain.handle("fauna:navigation-back", () => {
    if (mainWindow?.webContents.canGoBack()) mainWindow.webContents.goBack();
    return getNavigationState();
  });
  ipcMain.handle("fauna:navigation-forward", () => {
    if (mainWindow?.webContents.canGoForward()) mainWindow.webContents.goForward();
    return getNavigationState();
  });
  ipcMain.handle("fauna:update-state", () => updateState);
  ipcMain.handle("fauna:update-check", () => checkForDesktopUpdate());
  ipcMain.handle("fauna:update-install", () => installDesktopUpdate());
  ipcMain.handle("fauna:main-renderer-ready", () => {
    mainRendererReady = true;
    flushPendingRendererActions();
    return { ok: true };
  });
  ipcMain.handle("fauna:recent-chats", (_event, limit = 8) => getRecentChatSummaries(Number(limit) || 8));
  ipcMain.handle("fauna:quick-model-state", () => getQuickModelState());
  ipcMain.handle("fauna:quick-open-main", () => {
    closeQuickWindow();
    openMainWindow({ chatId: getActiveChatIdSync() });
    return { ok: true };
  });
  ipcMain.handle("fauna:quick-open-chat", (_event, chatId) => {
    closeQuickWindow();
    openMainWindow({ chatId: String(chatId || "") });
    return { ok: true };
  });
  ipcMain.handle("fauna:quick-new-chat", () => {
    closeQuickWindow();
    openMainWindow({ newChat: true });
    return { ok: true };
  });
  ipcMain.handle("fauna:quick-send-prompt", (_event, payload) => {
    closeQuickWindow();
    openMainWindow({
      chatId: getActiveChatIdSync(),
      quickPayload: normalizeQuickPromptPayload(payload)
    });
    return { ok: true };
  });
  ipcMain.handle("fauna:quick-close", () => {
    closeQuickWindow();
    return { ok: true };
  });
}

pendingOpenChatId = getChatIdFromArgv(process.argv);
pendingNewChat = hasArg(process.argv, "--new-chat");

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    handleLaunchArgs(argv);
  });

  app.whenReady().then(async () => {
    ensureDirSync(getUserDataRoot());
    protocol.handle(APP_PROTOCOL, handleAppProtocol);
    protocol.handle(FILE_PROTOCOL, handleFileProtocol);
    configureMediaPermissions();
    configureAutoUpdater();
    registerIpc();
    try {
      await startWorkspaceBridge();
    } catch (error) {
      console.warn("Fauna desktop could not start the workspace bridge:", error);
    }
    try {
      await startRemoteAccessServerIfEnabled();
    } catch (error) {
      console.warn("Fauna desktop could not start remote access:", error);
    }
    createTray();
    updateJumpList();
    createWindow({ chatId: pendingOpenChatId });
    setTimeout(() => {
      void checkForDesktopUpdate();
    }, 4000);

    app.on("activate", () => {
      openMainWindow();
    });
  });
}

app.on("before-quit", () => {
  app.isQuitting = true;
  stopAllTerminalSessions();
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
  }
  if (remoteAccessServer) {
    remoteAccessServer.close();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !tray) app.quit();
});
