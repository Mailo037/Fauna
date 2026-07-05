// Original script.js lines 7163-8910.
function executeMemoryToolCall(toolCall) {
    if (!isMemoryEnabled) {
        throw new Error("Memory beta is not enabled.");
    }

    if (toolCall.tool === "read_memories") {
        const query = String(toolCall.query || toolCall.text || "").trim();
        return formatMemoryToolEntries(findMemoryEntries(query), query);
    }

    if (toolCall.tool === "save_memory") {
        const text = normalizeMemoryText(toolCall.text || toolCall.memory || toolCall.content || toolCall.value);
        if (!text) throw new Error("save_memory requires text.");
        const result = addMemoryEntry(text, "assistant");
        return result.created
            ? `Memory saved: ${result.entry.text}`
            : `Memory already existed and was refreshed: ${result.entry.text}`;
    }

    if (toolCall.tool === "delete_memory") {
        const target = String(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "").trim();
        if (!target) throw new Error("delete_memory requires a target.");
        const removed = removeMemoryEntry(target);
        return removed
            ? `Memory deleted: ${removed.text}`
            : `No memory matched "${target}".`;
    }

    throw new Error("Unknown memory tool.");
}

function cleanSessionTitle(value, maxLength = 44) {
    const normalized = String(value || "")
        .split(/\n\n--- Attached File Content:/i)[0]
        .replace(/\n+\[Voice chat settings\][\s\S]*$/i, "")
        .replace(/^\[(?:image|video)[^\]]*\]\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!normalized) return "Current Session";
    return normalized.length > maxLength ? `${normalized.slice(0, Math.max(1, maxLength - 3)).trim()}...` : normalized;
}

function parseChatTitleRequest(content) {
    const match = String(content || "").match(CHAT_TITLE_RE);
    if (!match) return "";

    const rawTitle = String(match[1] || "").trim();
    if (!rawTitle) return "";

    try {
        const payload = JSON.parse(rawTitle);
        return cleanSessionTitle(payload?.title || payload?.chatTitle || payload?.name || "", CHAT_TITLE_MAX_LENGTH);
    } catch {
        return cleanSessionTitle(rawTitle, CHAT_TITLE_MAX_LENGTH);
    }
}

function stripChatTitleRequest(content) {
    return String(content || "").replace(CHAT_TITLE_RE, "").trim();
}

function hashWorkspaceProjectValue(value) {
    let hash = 0;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
}

function slugWorkspaceProjectValue(value, fallback = "project") {
    const clean = String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_.-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
    return clean || fallback;
}

function getWorkspaceProjectPathName(projectPath = "") {
    return String(projectPath || "").split(/[\\/]/).filter(Boolean).pop() || "Project";
}

function createWorkspaceProjectId(projectPath = "", fallbackName = "project") {
    const name = slugWorkspaceProjectValue(getWorkspaceProjectPathName(projectPath) || fallbackName);
    return `project-${name}-${hashWorkspaceProjectValue(String(projectPath || fallbackName).toLowerCase())}`;
}

function createWorkspaceWorktreeId(projectPath = "", fallbackName = "worktree") {
    const name = slugWorkspaceProjectValue(getWorkspaceProjectPathName(projectPath) || fallbackName, "worktree");
    return `worktree-${name}-${hashWorkspaceProjectValue(String(projectPath || fallbackName).toLowerCase())}`;
}

function createEmptyProjectContext() {
    return {
        projectId: "",
        rootId: ""
    };
}

function hasProjectContext(context = createEmptyProjectContext()) {
    return Boolean(String(context?.rootId || context?.projectId || "").trim());
}

function normalizeChatWorkspaceMode(value, context = createEmptyProjectContext()) {
    const clean = String(value || "").trim().toLowerCase();
    if (clean === "project" || clean === "normal") return clean;
    return hasProjectContext(context) ? "project" : "normal";
}

function normalizeStoredSessionProjectContext(raw) {
    if (!raw || typeof raw !== "object") return createEmptyProjectContext();
    const projectId = String(raw.projectId || "").trim();
    const rootId = String(raw.rootId || raw.worktreeId || projectId || "").trim();
    return {
        projectId,
        rootId
    };
}

function normalizeWorkspaceProjectWorktree(raw, projectId = "") {
    if (!raw || typeof raw !== "object") return null;
    const path = String(raw.path || "").trim();
    if (!path) return null;
    const name = cleanSessionTitle(raw.name || raw.branch || getWorkspaceProjectPathName(path), 48);
    const id = String(raw.id || createWorkspaceWorktreeId(path, name)).trim();
    return {
        id,
        projectId: String(raw.projectId || projectId || "").trim(),
        name,
        path,
        branch: String(raw.branch || "").trim(),
        createdAt: String(raw.createdAt || ""),
        updatedAt: String(raw.updatedAt || raw.createdAt || "")
    };
}

function normalizeProjectInstructions(value = "") {
    return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, 6000);
}

function normalizeWorkspaceProject(raw) {
    if (!raw || typeof raw !== "object") return null;
    const path = String(raw.path || "").trim();
    if (!path) return null;
    const name = cleanSessionTitle(raw.name || getWorkspaceProjectPathName(path), 48);
    const id = String(raw.id || createWorkspaceProjectId(path, name)).trim();
    const worktrees = Array.isArray(raw.worktrees)
        ? raw.worktrees.map(worktree => normalizeWorkspaceProjectWorktree(worktree, id)).filter(Boolean)
        : [];
    return {
        id,
        name,
        path,
        instructions: normalizeProjectInstructions(raw.instructions),
        createdAt: String(raw.createdAt || ""),
        updatedAt: String(raw.updatedAt || raw.createdAt || ""),
        worktrees
    };
}

const PROJECT_SORT_OPTIONS = [
    { id: "updated", label: "Recent", tooltip: "Sort projects: recent first" },
    { id: "name", label: "Name", tooltip: "Sort projects: name" },
    { id: "path", label: "Path", tooltip: "Sort projects: path" }
];

const AGENT_TASK_MODES = [
    {
        id: "ask",
        label: "Ask",
        description: "Answer and inspect only when useful.",
        prompt: "Task mode: Ask. Answer directly. Use local tools only when the user asks for project, file, command, or verification work."
    },
    {
        id: "plan",
        label: "Plan",
        description: "Inspect first, then propose a plan.",
        prompt: "Task mode: Plan. Inspect relevant files when helpful, then give a concise plan before making edits. Do not write files unless the user asks you to continue."
    },
    {
        id: "build",
        label: "Build",
        description: "Read, edit, and run project checks.",
        prompt: "Task mode: Build. You may read, create, edit, and run commands inside the selected project or worktree to complete the user's request. Prefer focused changes and verify them when practical."
    },
    {
        id: "review",
        label: "Review",
        description: "Find risks without changing files.",
        prompt: "Task mode: Review. Use a code-review stance. Prioritize bugs, regressions, security risks, and missing tests. Do not edit files unless the user explicitly asks for fixes."
    }
];

function normalizeProjectSortMode(value) {
    const clean = String(value || "").trim().toLowerCase();
    return PROJECT_SORT_OPTIONS.some(option => option.id === clean) ? clean : "updated";
}

function normalizeAgentTaskMode(value) {
    const clean = String(value || "").trim().toLowerCase();
    return AGENT_TASK_MODES.some(option => option.id === clean) ? clean : "build";
}

function getAgentTaskModeOption(mode = activeAgentTaskMode) {
    return AGENT_TASK_MODES.find(option => option.id === mode) || AGENT_TASK_MODES[2];
}

const PROJECT_AGENT_TAB_DEFINITIONS = [
    {
        id: "menu",
        label: "Fauna",
        paneId: "projectMenuPane",
        tabId: "projectPanelMenuTab",
        closeable: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18"></path><path d="M12 3a14 14 0 0 0 0 18"></path></svg>`
    },
    {
        id: "files",
        label: "Files",
        paneId: "projectFilesPane",
        tabId: "projectFilesTab",
        closeable: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path></svg>`
    },
    {
        id: "terminal",
        label: "Terminal",
        paneId: "projectTerminalPane",
        tabId: "projectTerminalTab",
        closeable: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 8 4 4-4 4"></path><path d="M13 16h4"></path><rect x="3" y="4" width="18" height="16" rx="2"></rect></svg>`
    },
    {
        id: "activity",
        label: "Inspect",
        paneId: "projectActivityPane",
        tabId: "projectActivityTab",
        closeable: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path><path d="M8 12h8"></path><path d="M8 16h5"></path></svg>`
    },
    {
        id: "chat",
        label: "Side chat",
        paneId: "projectPageChatPane",
        tabId: "projectPageChatTab",
        closeable: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"></path><path d="M8 10h8"></path><path d="M8 14h5"></path></svg>`
    }
];
const PROJECT_AGENT_TAB_DEFINITION_BY_ID = new Map(PROJECT_AGENT_TAB_DEFINITIONS.map(definition => [definition.id, definition]));
const PROJECT_AGENT_DUPLICABLE_TABS = new Set(["files", "terminal", "chat"]);
let projectAgentTabInstanceCounter = 0;

function getProjectAgentTabType(value) {
    const clean = String(value || "").trim().toLowerCase();
    const type = clean.split(":")[0];
    return PROJECT_AGENT_TAB_DEFINITION_BY_ID.has(type) ? type : "";
}

function normalizeProjectAgentTab(value) {
    const type = getProjectAgentTabType(value);
    if (type) return type;
    return "menu";
}

function normalizeProjectAgentTabKey(value) {
    const text = String(value || "").trim().toLowerCase();
    const type = getProjectAgentTabType(text);
    if (!type) return "";
    if (type === "menu") return "menu";
    const suffix = text.startsWith(`${type}:`)
        ? text.slice(type.length + 1).replace(/[^a-z0-9_-]/g, "").slice(0, 40)
        : "";
    return suffix ? `${type}:${suffix}` : type;
}

function createProjectAgentTabKey(tab) {
    const type = normalizeProjectAgentTab(tab);
    if (type === "menu") return "menu";
    projectAgentTabInstanceCounter += 1;
    return `${type}:${Date.now().toString(36)}-${projectAgentTabInstanceCounter.toString(36)}`;
}

function getProjectAgentTabDomId(tabKey, definition = getProjectAgentTabDefinition(tabKey)) {
    const key = normalizeProjectAgentTabKey(tabKey);
    if (!key || key === definition.id) return definition.tabId;
    return `${definition.tabId}-${key.replace(/[^a-z0-9_-]/gi, "-")}`;
}

function getProjectAgentTabDefinition(tab) {
    return PROJECT_AGENT_TAB_DEFINITION_BY_ID.get(normalizeProjectAgentTab(tab)) || PROJECT_AGENT_TAB_DEFINITIONS[0];
}

function getProjectAgentTabLabel(definition = {}, tabKey = definition.id) {
    const key = normalizeProjectAgentTabKey(tabKey);
    const fileState = definition.id === "files" ? projectFileStates.get(key) : null;
    let label = definition.id === "files" && fileState?.file?.name
        ? fileState.file.name
        : (definition.label || "Tab");
    const sameTypeTabs = activeProjectAgentTabs.filter(tab => normalizeProjectAgentTab(tab) === definition.id);
    if (definition.id !== "menu" && sameTypeTabs.length > 1) {
        const index = sameTypeTabs.indexOf(key);
        if (index >= 0) label = `${label} ${index + 1}`;
    }
    return label;
}

function getVisibleProjectAgentTabs() {
    return normalizeProjectAgentTabs(activeProjectAgentTabs).filter(tab => normalizeProjectAgentTab(tab) !== "menu");
}

function normalizeProjectAgentTabs(raw) {
    let values = [];
    if (Array.isArray(raw)) {
        values = raw;
    } else {
        const text = String(raw || "").trim();
        if (text) {
            try {
                const parsed = JSON.parse(text);
                values = Array.isArray(parsed) ? parsed : [];
            } catch {
                values = text.split(",");
            }
        }
    }
    const tabs = [];
    values.forEach(value => {
        const key = normalizeProjectAgentTabKey(value);
        if (!key || tabs.includes(key)) return;
        if (key === "menu" && tabs.includes("menu")) return;
        tabs.push(key);
    });
    if (!tabs.includes("menu")) tabs.unshift("menu");
    return tabs;
}

function normalizeProjectExplorerPath(path = ".") {
    const clean = String(path || ".").replace(/\\/g, "/").replace(/^\/+/, "").trim();
    if (!clean || clean === ".") return ".";
    const parts = [];
    clean.split("/").forEach(part => {
        const segment = part.trim();
        if (!segment || segment === ".") return;
        if (segment === "..") {
            parts.pop();
            return;
        }
        parts.push(segment);
    });
    return parts.join("/") || ".";
}

function createEmptyWorkspacePanelState() {
    return {
        activeTab: "menu",
        tabs: ["menu"],
        explorerPath: ".",
        expandedPaths: [],
        fileStates: [],
        sideChatStates: [],
        terminalStates: []
    };
}

function normalizeProjectFileStateFile(file = null) {
    if (!file || typeof file !== "object") return null;
    const path = normalizeProjectExplorerPath(file.path || "");
    if (!path || path === ".") return null;
    return {
        path,
        name: String(file.name || getProjectFileDisplayName(path)),
        content: String(file.content || "").slice(0, 160000),
        size: Number(file.size || 0) || 0,
        truncated: Boolean(file.truncated)
    };
}

function normalizeWorkspacePanelStateEntryKey(value = "", type = "files") {
    const key = normalizeProjectAgentTabKey(value);
    return normalizeProjectAgentTab(key) === type ? key : "";
}

function normalizeStoredWorkspacePanelState(raw) {
    if (!raw || typeof raw !== "object") return createEmptyWorkspacePanelState();
    const tabs = normalizeProjectAgentTabs(raw.tabs);
    const activeTab = normalizeProjectAgentTabKey(raw.activeTab);
    return {
        activeTab: activeTab && tabs.includes(activeTab) ? activeTab : (tabs[0] || "menu"),
        tabs,
        explorerPath: normalizeProjectExplorerPath(raw.explorerPath || "."),
        expandedPaths: Array.isArray(raw.expandedPaths)
            ? raw.expandedPaths.map(path => normalizeProjectExplorerPath(path)).filter(path => path && path !== ".")
            : [],
        fileStates: Array.isArray(raw.fileStates)
            ? raw.fileStates.map(item => {
                const tabKey = normalizeWorkspacePanelStateEntryKey(item?.tabKey, "files");
                const file = normalizeProjectFileStateFile(item?.file);
                return tabKey ? {
                    tabKey,
                    rootId: String(item?.rootId || ""),
                    file
                } : null;
            }).filter(Boolean)
            : [],
        sideChatStates: Array.isArray(raw.sideChatStates)
            ? raw.sideChatStates.map(item => {
                const tabKey = normalizeWorkspacePanelStateEntryKey(item?.tabKey, "chat");
                const history = Array.isArray(item?.history)
                    ? item.history.map(message => ({
                        role: message?.role === "user" ? "user" : "assistant",
                        content: String(message?.content || "").slice(0, 24000),
                        createdAt: String(message?.createdAt || "")
                    })).filter(message => message.content).slice(-24)
                    : [];
                return tabKey ? {
                    tabKey,
                    rootId: String(item?.rootId || ""),
                    history
                } : null;
            }).filter(Boolean)
            : [],
        terminalStates: Array.isArray(raw.terminalStates)
            ? raw.terminalStates.map(item => {
                const tabKey = normalizeWorkspacePanelStateEntryKey(item?.tabKey, "terminal");
                const lines = Array.isArray(item?.lines)
                    ? item.lines.map(line => String(line || "")).slice(-260)
                    : [];
                return tabKey ? {
                    tabKey,
                    rootId: String(item?.rootId || ""),
                    lines,
                    buffer: String(item?.buffer || "").slice(-120000),
                    draft: String(item?.draft || "").slice(-4000)
                } : null;
            }).filter(Boolean)
            : []
    };
}

function normalizeProjectExplorerExpandedPaths(raw) {
    let values = [];
    if (Array.isArray(raw)) {
        values = raw;
    } else if (raw) {
        try {
            const parsed = JSON.parse(raw);
            values = Array.isArray(parsed) ? parsed : [];
        } catch {
            values = [];
        }
    }
    return new Set(values
        .map(value => normalizeProjectExplorerPath(value))
        .filter(value => value && value !== "."));
}

const PROJECT_AGENT_DEFAULT_WIDTH = 320;
const PROJECT_AGENT_MIN_WIDTH = 268;
const PROJECT_AGENT_MAX_WIDTH = 520;
const PROJECT_CHAT_PREVIEW_LIMIT = 5;
const PROJECT_CHAT_LIST_STATE_STORAGE_KEY = "faunaProjectChatListState";

function normalizeProjectAgentWidth(value) {
    const width = Number(value);
    if (!Number.isFinite(width)) return PROJECT_AGENT_DEFAULT_WIDTH;
    return Math.min(PROJECT_AGENT_MAX_WIDTH, Math.max(PROJECT_AGENT_MIN_WIDTH, Math.round(width)));
}

function normalizeProjectChatListState(raw) {
    let parsed = {};
    if (raw && typeof raw === "object") {
        parsed = raw;
    } else if (raw) {
        try {
            parsed = JSON.parse(String(raw));
        } catch {
            parsed = {};
        }
    }
    return {
        collapsed: new Set(Array.isArray(parsed.collapsed) ? parsed.collapsed.map(value => String(value || "").trim()).filter(Boolean) : []),
        expanded: new Set(Array.isArray(parsed.expanded) ? parsed.expanded.map(value => String(value || "").trim()).filter(Boolean) : [])
    };
}

let activeProjectSortMode = normalizeProjectSortMode(safeLocalStorageGet(WORKSPACE_PROJECT_SORT_STORAGE_KEY));
let activeAgentTaskMode = normalizeAgentTaskMode(safeLocalStorageGet(AGENT_TASK_MODE_STORAGE_KEY));
let activeProjectAgentTab = normalizeProjectAgentTabKey(safeLocalStorageGet(PROJECT_AGENT_TAB_STORAGE_KEY)) || "menu";
let activeProjectAgentTabs = normalizeProjectAgentTabs(safeLocalStorageGet(PROJECT_AGENT_TABS_STORAGE_KEY));
if (!activeProjectAgentTabs.includes(activeProjectAgentTab)) activeProjectAgentTab = activeProjectAgentTabs[0] || "menu";
let activeProjectExplorerPath = ".";
let activeProjectExplorerExpandedPaths = normalizeProjectExplorerExpandedPaths(safeLocalStorageGet(PROJECT_EXPLORER_EXPANDED_PATHS_STORAGE_KEY));
let activeProjectFile = null;
let activeProjectFileExtendedView = safeLocalStorageGet(PROJECT_FILE_EXTENDED_VIEW_STORAGE_KEY) !== "false";
let activeProjectFileLineWrap = safeLocalStorageGet(PROJECT_FILE_LINE_WRAP_STORAGE_KEY) === "true";
let activeProjectAgentWidth = normalizeProjectAgentWidth(safeLocalStorageGet(PROJECT_AGENT_WIDTH_STORAGE_KEY));
const storedProjectAgentCollapsed = safeLocalStorageGet(PROJECT_AGENT_COLLAPSED_STORAGE_KEY);
let isProjectAgentCollapsed = storedProjectAgentCollapsed ? storedProjectAgentCollapsed === "true" : true;
let isProjectAgentMaximized = safeLocalStorageGet(PROJECT_AGENT_MAXIMIZED_STORAGE_KEY) === "true";
let projectTerminalDataUnsubscribe = null;
let projectChatListState = normalizeProjectChatListState(safeLocalStorageGet(PROJECT_CHAT_LIST_STATE_STORAGE_KEY));
let projectExplorerRootId = "";
let currentProjectExplorerResult = { entries: [], truncated: false };
let projectExplorerLoadingPath = "";
let agentActivityEvents = [];
let pendingProjectChatRootId = "";
let projectPageChatRootId = "";
let projectPageChatHistory = [];
const projectPageChatStates = new Map();
let projectPageChatAbortController = null;
const projectFileStates = new Map();
const projectTerminalStates = new Map();
let activeProjectGitInfo = null;
let activeProjectGitInfoRootId = "";
let activeProjectGitRequestId = 0;
let composerBranchMenu = null;
let composerBranchSearchInput = null;
let composerBranchSearchQuery = "";

function getProjectSortOption(mode = activeProjectSortMode) {
    return PROJECT_SORT_OPTIONS.find(option => option.id === mode) || PROJECT_SORT_OPTIONS[0];
}

function getProjectTimestamp(item) {
    const value = Date.parse(item?.updatedAt || item?.createdAt || "");
    return Number.isFinite(value) ? value : 0;
}

function compareProjectRoots(a, b) {
    if (activeProjectSortMode === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })
            || String(a.path || "").localeCompare(String(b.path || ""), undefined, { sensitivity: "base" });
    }
    if (activeProjectSortMode === "path") {
        return String(a.path || "").localeCompare(String(b.path || ""), undefined, { sensitivity: "base" })
            || String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    }
    return getProjectTimestamp(b) - getProjectTimestamp(a)
        || String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
}

function getSortedWorkspaceProjects() {
    return [...workspaceProjects]
        .sort(compareProjectRoots)
        .map(project => ({
            ...project,
            worktrees: [...project.worktrees].sort(compareProjectRoots)
        }));
}

function updateProjectSortButton() {
    if (!projectSortBtn) return;
    const option = getProjectSortOption();
    projectSortBtn.dataset.tooltip = option.tooltip;
    projectSortBtn.setAttribute("aria-label", option.tooltip);
}

function closeProjectSortMenu() {
    if (!projectSortMenu || !projectSortBtn) return;
    projectSortMenu.hidden = true;
    projectSortBtn.setAttribute("aria-expanded", "false");
    projectSortBtn.closest(".project-sort-wrap")?.classList.remove("open");
}

function renderProjectSortMenu() {
    if (!projectSortMenu) return;
    projectSortMenu.replaceChildren();
    PROJECT_SORT_OPTIONS.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-session-menu-item project-sort-menu-item";
        button.setAttribute("role", "menuitemradio");
        button.setAttribute("aria-checked", String(option.id === activeProjectSortMode));
        button.innerHTML = `
            <svg class="project-sort-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m5 12 4 4L19 6"></path>
            </svg>
            <span></span>
        `;
        button.querySelector("span").textContent = option.label;
        button.addEventListener("click", event => {
            event.stopPropagation();
            activeProjectSortMode = option.id;
            safeLocalStorageSet(WORKSPACE_PROJECT_SORT_STORAGE_KEY, activeProjectSortMode);
            closeProjectSortMenu();
            updateProjectSortButton();
            renderProjectList();
            renderComposerProjectPicker();
        });
        projectSortMenu.appendChild(button);
    });
}

function toggleProjectSortMenu() {
    if (!projectSortMenu || !projectSortBtn) return;
    const willOpen = projectSortMenu.hidden;
    if (willOpen) {
        renderProjectSortMenu();
        closeProjectMenus();
        projectSortMenu.hidden = false;
        projectSortBtn.closest(".project-sort-wrap")?.classList.add("open");
    } else {
        closeProjectSortMenu();
    }
    projectSortBtn.setAttribute("aria-expanded", String(willOpen));
}

function readStoredWorkspaceProjects() {
    const raw = safeLocalStorageGet(WORKSPACE_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeWorkspaceProject).filter(Boolean);
    } catch (err) {
        console.warn("Could not parse saved Fauna projects:", err);
        return [];
    }
}

function syncWorkspaceProjects(projects = []) {
    workspaceProjects = (Array.isArray(projects) ? projects : [])
        .map(normalizeWorkspaceProject)
        .filter(Boolean);
    safeLocalStorageSet(WORKSPACE_PROJECTS_STORAGE_KEY, JSON.stringify(workspaceProjects));
    renderProjectList();
    renderComposerProjectPicker();
    updateProjectAgentPanel();
    updateActiveChatTitle();
}

function persistWorkspaceProjects({ syncDesktop = true } = {}) {
    safeLocalStorageSet(WORKSPACE_PROJECTS_STORAGE_KEY, JSON.stringify(workspaceProjects));
    if (syncDesktop && isFaunaDesktopApp()) {
        void getFaunaDesktopApi()?.projects?.save?.(workspaceProjects)
            .then(result => {
                if (Array.isArray(result?.projects)) syncWorkspaceProjects(result.projects);
            })
            .catch(err => showToast(`Project save failed: ${err.message}`, "error"));
    }
}

function getWorkspaceProjectById(projectId = "") {
    return workspaceProjects.find(project => project.id === projectId) || null;
}

function getWorkspaceProjectRootById(rootId = "") {
    const id = String(rootId || "").trim();
    if (!id) return null;
    for (const project of workspaceProjects) {
        if (project.id === id) {
            return {
                id: project.id,
                projectId: project.id,
                name: project.name,
                path: project.path,
                branch: "",
                type: "project",
                project
            };
        }
        const worktree = project.worktrees.find(item => item.id === id);
        if (worktree) {
            return {
                ...worktree,
                projectId: project.id,
                type: "worktree",
                project
            };
        }
    }
    return null;
}

function getPendingProjectChatRoot() {
    return pendingProjectChatRootId ? getWorkspaceProjectRootById(pendingProjectChatRootId) : null;
}

function setPendingProjectChatRoot(root = null) {
    pendingProjectChatRootId = root?.id || "";
}

function clearPendingProjectChatRoot() {
    pendingProjectChatRootId = "";
}

function getSessionProjectRoot(session = undefined) {
    const targetSession = session === undefined ? getActiveSession() : session;
    if (!targetSession && session === undefined) return getPendingProjectChatRoot();
    const context = normalizeStoredSessionProjectContext(targetSession?.projectContext);
    return getWorkspaceProjectRootById(context.rootId || context.projectId);
}

function getSessionWorkspaceMode(session = undefined) {
    const targetSession = session === undefined ? getActiveSession() : session;
    if (!targetSession && session === undefined && getPendingProjectChatRoot()) return "project";
    return normalizeChatWorkspaceMode(targetSession?.workspaceMode, targetSession?.projectContext);
}

function createProjectContextForRoot(root) {
    return root?.id
        ? { projectId: root.projectId || root.id, rootId: root.id }
        : createEmptyProjectContext();
}

function isProjectChatSession(session = getActiveSession()) {
    return getSessionWorkspaceMode(session) === "project";
}

function getWorkspaceProjectRootForSession(sessionId = activeSessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (cleanSessionId) return getSessionProjectRoot(getChatSessionById(cleanSessionId));
    return getSessionProjectRoot();
}

function getWorkspaceProjectRootForSignal(signal = null) {
    const sessionId = typeof getGenerationSessionIdForSignal === "function"
        ? getGenerationSessionIdForSignal(signal)
        : "";
    return getWorkspaceProjectRootForSession(sessionId || activeSessionId);
}

function getActiveWorkspaceProjectBridgeScope(signal = null) {
    const root = getWorkspaceProjectRootForSignal(signal);
    return root?.id ? `project:${root.id}` : "";
}

function getActiveWorkspaceProjectSystemPrompt(sessionId = activeSessionId) {
    const root = getWorkspaceProjectRootForSession(sessionId);
    if (!root) return "";
    const branch = root.type === "worktree" && root.branch ? ` Branch: ${root.branch}.` : "";
    const instructions = getProjectInstructionsForRoot(root);
    return [
        `Active project: ${root.name}. Root path: ${root.path}.${branch} Local file tools and terminal commands are scoped to this selected ${root.type === "worktree" ? "worktree" : "project folder"}. Use relative paths from the project root by default. Create, edit, read, search, and run commands inside this root unless the user explicitly chooses another project. If the user asks for a local system terminal task, such as checking processes or closing a specific app, use terminal commands when the current desktop access policy allows it; prefer targeted, graceful commands and do not close unrelated apps unless explicitly requested.`,
        instructions ? `Persistent project instructions:\n${instructions}` : ""
    ].filter(Boolean).join("\n\n");
}

function buildAgentTaskModeSystemPrompt() {
    return getAgentTaskModeOption().prompt;
}

function getProjectInstructionsForRoot(root = getSessionProjectRoot()) {
    if (!root) return "";
    const project = root.project || getWorkspaceProjectById(root.projectId || root.id);
    return normalizeProjectInstructions(project?.instructions);
}

function getActiveProjectLabel() {
    return getSessionProjectRoot()?.name || "No project";
}

function getActiveProjectGitInfo(root = getSessionProjectRoot()) {
    return root && activeProjectGitInfoRootId === root.id ? activeProjectGitInfo : null;
}

function normalizeProjectGitInfo(info = {}, root = getSessionProjectRoot()) {
    const dirtyCount = Number(info.dirtyCount);
    return {
        rootId: root?.id || "",
        isRepo: info.isRepo === true,
        unavailable: info.unavailable === true,
        branch: String(info.branch || "").trim(),
        detached: info.detached === true,
        head: String(info.head || "").trim(),
        upstream: String(info.upstream || "").trim(),
        ahead: Number.isFinite(Number(info.ahead)) ? Number(info.ahead) : 0,
        behind: Number.isFinite(Number(info.behind)) ? Number(info.behind) : 0,
        dirtyCount: Number.isFinite(dirtyCount) ? dirtyCount : 0,
        error: String(info.error || "").trim(),
        branches: Array.isArray(info.branches)
            ? info.branches
                .map(branch => ({
                    name: String(branch?.name || "").trim(),
                    type: String(branch?.type || "local").trim() === "remote" ? "remote" : "local",
                    current: branch?.current === true,
                    upstream: String(branch?.upstream || "").trim()
                }))
                .filter(branch => branch.name)
            : []
    };
}

function setActiveProjectGitInfo(root, info = {}) {
    activeProjectGitInfoRootId = root?.id || "";
    activeProjectGitInfo = root ? normalizeProjectGitInfo(info, root) : null;
    return activeProjectGitInfo;
}

function formatGitDirtyText(count = 0) {
    const value = Math.max(0, Number(count) || 0);
    if (!value) return "clean";
    return `${value} changed`;
}

function formatGitUncommittedText(count = 0) {
    const value = Math.max(0, Number(count) || 0);
    if (!value) return "Clean working tree";
    return `Uncommitted: ${value} ${value === 1 ? "file" : "files"}`;
}

function getGitBranchDisplayLabel(info = null) {
    if (!info?.isRepo) return "";
    if (info.branch) return info.branch;
    if (info.detached) return info.head ? `detached ${info.head}` : "Detached HEAD";
    return "Git repo";
}

function getComposerBranchTooltip(root = getSessionProjectRoot(), info = getActiveProjectGitInfo(root)) {
    if (!root) return "Choose a project first";
    if (!hasWorkspaceBridgeAccess()) return "Connect the Local Workspace Bridge to read Git branches";
    if (!info) return "Checking Git connection";
    if (info.unavailable) return info.error ? `Git unavailable: ${info.error}` : "Git unavailable";
    if (!info.isRepo) return "No .git repository found for this project";
    const branchLabel = getGitBranchDisplayLabel(info);
    const sync = [
        info.upstream ? `upstream ${info.upstream}` : "",
        info.ahead ? `${info.ahead} ahead` : "",
        info.behind ? `${info.behind} behind` : ""
    ].filter(Boolean).join(", ");
    return [`Git connected: ${branchLabel}`, formatGitDirtyText(info.dirtyCount), sync].filter(Boolean).join(" / ");
}

function getComposerBranchLabel(root = getSessionProjectRoot()) {
    if (!root) return "No branch";
    if (!hasWorkspaceBridgeAccess()) return "Git offline";
    const info = getActiveProjectGitInfo(root);
    if (!info) return root.branch || "Checking Git";
    if (info.unavailable) return "Git unavailable";
    if (!info.isRepo) return "No Git repo";
    return getGitBranchDisplayLabel(info);
}

function updateComposerProjectContextBar() {
    const root = getSessionProjectRoot();
    const gitInfo = getActiveProjectGitInfo(root);
    if (composerLocalWorkBtn) {
        const localActive = Boolean(root || isWorkspaceBridgeEnabled);
        composerLocalWorkBtn.classList.toggle("active", localActive);
        composerLocalWorkBtn.setAttribute("aria-pressed", String(localActive));
        composerLocalWorkBtn.dataset.tooltip = localActive
            ? "Local workspace access is on"
            : "Turn on local workspace access";
    }
    if (composerBranchBtn) {
        composerBranchBtn.disabled = !root;
        composerBranchBtn.classList.toggle("active", Boolean(root && gitInfo?.isRepo));
        composerBranchBtn.dataset.gitState = !root
            ? "none"
            : !hasWorkspaceBridgeAccess()
                ? "offline"
                : !gitInfo
                    ? "loading"
                    : gitInfo.unavailable
                        ? "unavailable"
                        : gitInfo.isRepo
                            ? "connected"
                            : "missing";
        composerBranchBtn.dataset.tooltip = getComposerBranchTooltip(root, gitInfo);
        composerBranchBtn.setAttribute("aria-label", getComposerBranchTooltip(root, gitInfo));
    }
    if (composerBranchLabel) composerBranchLabel.textContent = getComposerBranchLabel(root);
}

function getComposerBranchMenu() {
    if (composerBranchMenu) return composerBranchMenu;
    composerBranchMenu = document.createElement("div");
    composerBranchMenu.id = "composerBranchMenu";
    composerBranchMenu.className = "composer-branch-menu";
    composerBranchMenu.setAttribute("role", "dialog");
    composerBranchMenu.setAttribute("aria-label", "Git branches");
    composerBranchMenu.hidden = true;
    composerBranchMenu.addEventListener("click", event => event.stopPropagation());
    document.body.appendChild(composerBranchMenu);
    return composerBranchMenu;
}

function closeComposerBranchMenu() {
    if (!composerBranchMenu || !composerBranchBtn) return;
    composerBranchMenu.hidden = true;
    composerBranchBtn.setAttribute("aria-expanded", "false");
}

function positionComposerBranchMenu() {
    if (!composerBranchMenu || !composerBranchBtn || composerBranchMenu.hidden) return;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight || 0;
    const viewportMargin = 10;
    const anchorRect = composerBranchBtn.getBoundingClientRect();
    const maxAvailableWidth = Math.max(236, viewportWidth - (viewportMargin * 2));
    const menuWidth = Math.min(340, maxAvailableWidth);
    const maxMenuHeight = Math.max(220, Math.min(430, viewportHeight - (viewportMargin * 2)));

    composerBranchMenu.style.position = "fixed";
    composerBranchMenu.style.width = `${menuWidth}px`;
    composerBranchMenu.style.maxHeight = `${maxMenuHeight}px`;
    composerBranchMenu.style.right = "auto";
    composerBranchMenu.style.bottom = "auto";
    composerBranchMenu.style.left = `${Math.min(Math.max(viewportMargin, anchorRect.left), viewportWidth - menuWidth - viewportMargin)}px`;
    composerBranchMenu.style.top = "0px";

    const measuredHeight = Math.min(composerBranchMenu.getBoundingClientRect().height || maxMenuHeight, maxMenuHeight);
    const preferredTop = anchorRect.top - measuredHeight - 9;
    const fallbackTop = anchorRect.bottom + 9;
    const top = preferredTop >= viewportMargin
        ? preferredTop
        : Math.min(fallbackTop, viewportHeight - measuredHeight - viewportMargin);

    composerBranchMenu.style.top = `${Math.min(Math.max(viewportMargin, top), viewportHeight - measuredHeight - viewportMargin)}px`;
}

function getSortedGitBranches(info = null) {
    return [...(info?.branches || [])].sort((a, b) => {
        if (a.current !== b.current) return a.current ? -1 : 1;
        if (a.type !== b.type) return a.type === "local" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

function getFilteredGitBranches(info = null, query = "") {
    const cleanQuery = String(query || "").trim().toLowerCase();
    const branches = getSortedGitBranches(info);
    if (!cleanQuery) return branches;
    return branches.filter(branch => branch.name.toLowerCase().includes(cleanQuery));
}

function createComposerBranchMessage(message, state = "muted") {
    const node = document.createElement("div");
    node.className = `composer-branch-message composer-branch-message-${state}`;
    node.textContent = message;
    return node;
}

function getComposerBranchOptionMeta(branch = {}, info = null) {
    if (branch.current) return formatGitUncommittedText(info?.dirtyCount || 0);
    if (branch.type === "remote") return "Remote branch";
    if (branch.upstream) return `Tracks ${branch.upstream}`;
    return "Local branch";
}

function createComposerBranchOption(branch = {}, info = null) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `composer-branch-option${branch.current ? " active" : ""}`;
    button.setAttribute("aria-current", branch.current ? "true" : "false");
    button.innerHTML = `
        <span class="composer-branch-option-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3v6a6 6 0 0 0 6 6h2"></path>
                <path d="M18 21v-6a6 6 0 0 0-6-6h-2"></path>
                <circle cx="6" cy="3" r="2"></circle>
                <circle cx="18" cy="21" r="2"></circle>
            </svg>
        </span>
        <span class="composer-branch-option-copy">
            <span class="composer-branch-option-label"></span>
            <span class="composer-branch-option-meta"></span>
        </span>
        <span class="composer-branch-option-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>
        </span>
    `;
    button.querySelector(".composer-branch-option-label").textContent = branch.name;
    button.querySelector(".composer-branch-option-meta").textContent = getComposerBranchOptionMeta(branch, info);
    button.addEventListener("click", () => {
        if (branch.current) {
            closeComposerBranchMenu();
            return;
        }
        void checkoutComposerBranch(branch);
    });
    return button;
}

function canCreateGitBranchFromQuery(query = "", info = null) {
    const clean = String(query || "").trim();
    if (!clean || clean.length > 120 || clean.startsWith("-") || /[\s~^:?*[\\\r\n]/.test(clean) || clean.endsWith("/") || clean.includes("..")) {
        return false;
    }
    return !(info?.branches || []).some(branch => branch.name === clean || branch.name.endsWith(`/${clean}`));
}

function renderComposerBranchList() {
    const menu = getComposerBranchMenu();
    const list = menu.querySelector(".composer-branch-list");
    const footer = menu.querySelector(".composer-branch-footer");
    if (!list || !footer) return;
    const root = getSessionProjectRoot();
    const info = getActiveProjectGitInfo(root);
    const query = composerBranchSearchQuery;
    list.replaceChildren();
    footer.replaceChildren();

    if (!root) {
        list.appendChild(createComposerBranchMessage("Choose a project first.", "muted"));
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        list.appendChild(createComposerBranchMessage("Connect the Local Workspace Bridge to inspect Git.", "warning"));
        return;
    }
    if (!info) {
        list.appendChild(createComposerBranchMessage("Checking Git connection...", "muted"));
        return;
    }
    if (info.unavailable) {
        list.appendChild(createComposerBranchMessage(info.error || "Git is unavailable for this project.", "warning"));
        return;
    }
    if (!info.isRepo) {
        list.appendChild(createComposerBranchMessage("No .git repository found for this project.", "warning"));
        return;
    }

    const branches = getFilteredGitBranches(info, query);
    if (!branches.length) {
        list.appendChild(createComposerBranchMessage(query ? "No matching branches." : "No branches found.", "muted"));
    } else {
        branches.forEach(branch => list.appendChild(createComposerBranchOption(branch, info)));
    }

    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "composer-branch-create";
    createButton.disabled = Boolean(query) && !canCreateGitBranchFromQuery(query, info);
    createButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3v5a4 4 0 0 0 4 4h4"></path>
            <path d="M18 21v-5a4 4 0 0 0-4-4h-4"></path>
            <path d="M12 5v6"></path>
            <path d="M9 8h6"></path>
        </svg>
        <span></span>
    `;
    createButton.querySelector("span").textContent = query
        ? `Create "${query}" and check out`
        : "Create new branch and check out...";
    createButton.addEventListener("click", () => {
        if (query && canCreateGitBranchFromQuery(query, info)) {
            void createComposerBranch(query);
            return;
        }
        openCreateGitBranchDialog(query);
    });
    footer.appendChild(createButton);
}

function renderComposerBranchMenu() {
    const menu = getComposerBranchMenu();
    const root = getSessionProjectRoot();
    const info = getActiveProjectGitInfo(root);
    menu.dataset.gitState = !root
        ? "none"
        : !hasWorkspaceBridgeAccess()
            ? "offline"
            : !info
                ? "loading"
                : info.unavailable
                    ? "unavailable"
                    : info.isRepo
                        ? "connected"
                        : "missing";
    menu.replaceChildren();

    const header = document.createElement("div");
    header.className = "composer-branch-header";
    header.innerHTML = `
        <span class="composer-branch-title">Branches</span>
        <span class="composer-branch-status"></span>
    `;
    header.querySelector(".composer-branch-status").textContent = getComposerBranchTooltip(root, info);

    const search = document.createElement("label");
    search.className = "composer-branch-search";
    search.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m16.5 16.5 4 4"></path>
        </svg>
        <input type="search" autocomplete="off" spellcheck="false" placeholder="Search branches" aria-label="Search branches">
    `;
    composerBranchSearchInput = search.querySelector("input");
    composerBranchSearchInput.value = composerBranchSearchQuery;
    composerBranchSearchInput.addEventListener("input", () => {
        composerBranchSearchQuery = composerBranchSearchInput.value;
        renderComposerBranchList();
    });

    const list = document.createElement("div");
    list.className = "composer-branch-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Repository branches");
    const footer = document.createElement("div");
    footer.className = "composer-branch-footer";

    menu.append(header, search, list, footer);
    renderComposerBranchList();
}

function openComposerBranchMenu({ focusSearch = false } = {}) {
    const root = getSessionProjectRoot();
    if (!root) {
        showToast("Select a project first.", "warning");
        return;
    }
    closeComposerProjectMenu();
    closeNewChatProjectMenu();
    closeProjectMenus();
    closeProjectSortMenu();
    getComposerBranchMenu();
    renderComposerBranchMenu();
    composerBranchMenu.hidden = false;
    composerBranchBtn?.setAttribute("aria-expanded", "true");
    positionComposerBranchMenu();
    if (focusSearch) {
        window.requestAnimationFrame(() => {
            composerBranchSearchInput?.focus?.();
            composerBranchSearchInput?.select?.();
            positionComposerBranchMenu();
        });
    } else {
        window.requestAnimationFrame(positionComposerBranchMenu);
    }
    if (hasWorkspaceBridgeAccess() && (!getActiveProjectGitInfo(root) || getActiveProjectGitInfo(root)?.unavailable)) {
        void refreshProjectBranchSummary(root, { silent: true }).then(() => {
            if (!composerBranchMenu?.hidden) {
                renderComposerBranchMenu();
                positionComposerBranchMenu();
                if (focusSearch) composerBranchSearchInput?.focus?.();
            }
        });
    }
}

function toggleComposerBranchMenu({ focusSearch = false } = {}) {
    const menu = getComposerBranchMenu();
    if (menu.hidden) {
        openComposerBranchMenu({ focusSearch });
        return;
    }
    closeComposerBranchMenu();
}

async function checkoutComposerBranch(branch = {}) {
    const root = getSessionProjectRoot();
    if (!root || !branch.name) return;
    const menu = getComposerBranchMenu();
    menu.dataset.busy = "true";
    try {
        const result = await checkoutProjectGitBranch(
            root,
            branch.name,
            { remote: branch.type === "remote" },
            null
        );
        updateProjectGitUi(root, result);
        renderComposerBranchMenu();
        closeComposerBranchMenu();
        showToast(`Checked out ${getComposerBranchLabel(root)}.`, "success");
    } catch (err) {
        showToast(`Could not check out branch: ${err.message}`, "error");
    } finally {
        menu.dataset.busy = "false";
    }
}

async function createComposerBranch(branchName = "") {
    const root = getSessionProjectRoot();
    const branch = String(branchName || "").trim();
    if (!root || !branch) return;
    const menu = getComposerBranchMenu();
    menu.dataset.busy = "true";
    try {
        const result = await checkoutProjectGitBranch(
            root,
            branch,
            { create: true },
            null
        );
        composerBranchSearchQuery = "";
        updateProjectGitUi(root, result);
        renderComposerBranchMenu();
        closeComposerBranchMenu();
        showToast(`Created and checked out ${branch}.`, "success");
    } catch (err) {
        showToast(`Could not create branch: ${err.message}`, "error");
    } finally {
        menu.dataset.busy = "false";
    }
}

function openCreateGitBranchDialog(defaultBranch = "") {
    const root = getSessionProjectRoot();
    if (!root) return;
    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "approval-dialog project-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "projectGitBranchTitle");
    const titleNode = document.createElement("h2");
    titleNode.id = "projectGitBranchTitle";
    titleNode.textContent = "Create branch";
    const inputLabel = document.createElement("label");
    inputLabel.className = "chat-rename-field";
    inputLabel.innerHTML = '<span>Branch name</span>';
    const branchInput = document.createElement("input");
    branchInput.className = "settings-input chat-rename-input";
    branchInput.type = "text";
    branchInput.value = defaultBranch || getDefaultWorktreeBranch(root.project || root).replace(/^codex\//, "");
    inputLabel.appendChild(branchInput);
    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "provider-btn provider-btn-secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    const createButton = document.createElement("button");
    createButton.className = "provider-btn provider-btn-primary";
    createButton.type = "button";
    createButton.textContent = "Create";
    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const create = () => {
        const branch = String(branchInput.value || "").trim();
        if (!canCreateGitBranchFromQuery(branch, getActiveProjectGitInfo(root))) {
            showToast("Enter a valid new branch name.", "warning");
            return;
        }
        close();
        void createComposerBranch(branch);
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" && document.activeElement === branchInput) create();
    };
    cancelButton.addEventListener("click", close);
    createButton.addEventListener("click", create);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    actions.append(cancelButton, createButton);
    dialog.append(titleNode, inputLabel, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => {
        branchInput.focus();
        branchInput.select();
    }, 0);
}

function enableWorkspaceBridgeForProject() {
    if (isWorkspaceBridgeEnabled) return;
    isWorkspaceBridgeEnabled = true;
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "true");
    if (toggleWorkspaceBridge) toggleWorkspaceBridge.checked = true;
    updateWorkspaceBridgeSettingsUi?.();
    updateComposerProjectContextBar();
}

function ensureProjectAssignableSession() {
    let session = getActiveSession();
    if (session) return session;
    session = createChatSessionForCurrentDraft();
    session.composerDraft = captureComposerDraft();
    chatSessions.unshift(session);
    activeSessionId = session.id;
    clearPendingProjectChatRoot();
    updateActiveChatTitle();
    updateWorkspaceUrlFragment?.({ replace: true });
    return session;
}

function setActiveChatProject(rootId = "", { notify = true } = {}) {
    const cleanRootId = String(rootId || "").trim();
    let session = getActiveSession();
    const root = getWorkspaceProjectRootById(cleanRootId);

    if (!session && root) {
        const draft = captureComposerDraft();
        if (composerDraftHasContent(draft)) {
            session = createChatSessionForCurrentDraft({
                workspaceMode: "project",
                projectContext: createProjectContextForRoot(root),
                composerDraft: draft
            });
            chatSessions.unshift(session);
            activeSessionId = session.id;
            clearPendingProjectChatRoot();
            restoreComposerDraft(draft);
            setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl: false });
            enableWorkspaceBridgeForProject();
            persistChatSessions();
            renderChatHistory();
            renderProjectList();
            renderComposerProjectPicker();
            updateProjectAgentPanel();
            updateActiveChatTitle();
            updateWorkspaceUrlFragment?.({ replace: true });
            void refreshProjectExplorer({ silent: true, refreshBranch: true });
            sidebarController.close();
            focusComposerInput({ force: true });
            if (notify) showToast(`${root.name} selected for this chat.`, "success");
            return;
        }
        startNewChatSession({
            notify: false,
            workspaceMode: "project",
            projectRootId: root.id
        });
        if (notify) showToast(`${root.name} project chat ready.`, "success");
        return;
    }
    if (!session) return;

    const currentMode = getSessionWorkspaceMode(session);
    if (currentMode === "normal" && root) {
        showToast("Normal chats cannot be moved into a project. Start a project chat from New chat or the project list.", "warning");
        renderComposerProjectPicker();
        return;
    }
    if (currentMode === "project" && !root) {
        showToast("Project chats stay attached to a project. Start a normal chat instead.", "warning");
        renderComposerProjectPicker();
        return;
    }

    session.projectContext = root ? createProjectContextForRoot(root) : createEmptyProjectContext();
    session.workspaceMode = root ? "project" : "normal";
    session.updatedAt = new Date().toISOString();
    if (root) enableWorkspaceBridgeForProject();
    persistChatSessions();
    renderChatHistory();
    renderProjectList();
    renderComposerProjectPicker();
    updateProjectAgentPanel();
    updateActiveChatTitle();
    if (root) void refreshProjectExplorer({ silent: true, refreshBranch: true });
    if (notify) showToast(root ? `${root.name} selected for this chat.` : "Project cleared for this chat.", root ? "success" : "info");
}

function renderAgentTaskModeMenu() {
    if (!agentTaskModeMenu) return;
    agentTaskModeMenu.replaceChildren();
    AGENT_TASK_MODES.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "agent-task-mode-option";
        button.setAttribute("role", "menuitemradio");
        button.setAttribute("aria-checked", String(option.id === activeAgentTaskMode));
        button.innerHTML = `
            <span class="agent-task-mode-option-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>
            </span>
            <span class="agent-task-mode-option-copy">
                <span class="agent-task-mode-option-label"></span>
                <span class="agent-task-mode-option-desc"></span>
            </span>
        `;
        button.querySelector(".agent-task-mode-option-label").textContent = option.label;
        button.querySelector(".agent-task-mode-option-desc").textContent = option.description;
        button.addEventListener("click", event => {
            event.stopPropagation();
            setAgentTaskMode(option.id);
            closeAgentTaskModeMenu();
        });
        agentTaskModeMenu.appendChild(button);
    });
}

function updateAgentTaskModeUi() {
    const option = getAgentTaskModeOption();
    if (agentTaskModeLabel) agentTaskModeLabel.textContent = option.label;
    if (agentTaskModeBtn) {
        agentTaskModeBtn.dataset.mode = option.id;
        agentTaskModeBtn.dataset.tooltip = `Task mode: ${option.label}`;
        agentTaskModeBtn.setAttribute("aria-label", `Task mode: ${option.label}`);
    }
    renderAgentTaskModeMenu();
}

function setAgentTaskMode(mode, { notify = true } = {}) {
    activeAgentTaskMode = normalizeAgentTaskMode(mode);
    safeLocalStorageSet(AGENT_TASK_MODE_STORAGE_KEY, activeAgentTaskMode);
    updateAgentTaskModeUi();
    if (notify) showToast(`Task mode set to ${getAgentTaskModeOption().label}.`, "success");
}

function closeAgentTaskModeMenu() {
    if (!agentTaskModeMenu || !agentTaskModeBtn) return;
    agentTaskModeMenu.hidden = true;
    agentTaskModeBtn.setAttribute("aria-expanded", "false");
}

function toggleAgentTaskModeMenu() {
    if (!agentTaskModeMenu || !agentTaskModeBtn) return;
    const willOpen = agentTaskModeMenu.hidden;
    if (willOpen) {
        renderAgentTaskModeMenu();
        agentTaskModeMenu.hidden = false;
    } else {
        agentTaskModeMenu.hidden = true;
    }
    agentTaskModeBtn.setAttribute("aria-expanded", String(willOpen));
}

function persistProjectAgentTabs() {
    safeLocalStorageSet(PROJECT_AGENT_TABS_STORAGE_KEY, JSON.stringify(activeProjectAgentTabs));
}

function closeProjectPanelTabMenu() {
    if (!projectPanelTabMenu || !projectPanelAddTabBtn) return;
    projectPanelTabMenu.hidden = true;
    projectPanelAddTabBtn.setAttribute("aria-expanded", "false");
}

function toggleProjectPanelTabMenu() {
    if (!projectPanelTabMenu || !projectPanelAddTabBtn) return;
    const willOpen = projectPanelTabMenu.hidden;
    projectPanelTabMenu.hidden = !willOpen;
    projectPanelAddTabBtn.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) {
        window.requestAnimationFrame(() => {
            projectPanelTabMenu.querySelector("button")?.focus?.();
        });
    }
}

function getProjectAgentPane(tab) {
    switch (normalizeProjectAgentTab(tab)) {
        case "files":
            return projectFilesPane;
        case "terminal":
            return projectTerminalPane;
        case "activity":
            return projectActivityPane;
        case "chat":
            return projectPageChatPane;
        default:
            return projectMenuPane;
    }
}

function ensureProjectAgentTabOpen(tab, { persist = true, forceNew = false } = {}) {
    const tabType = normalizeProjectAgentTab(tab);
    const existingKey = normalizeProjectAgentTabKey(tab);
    const hasTypeOpen = activeProjectAgentTabs.some(openTab => normalizeProjectAgentTab(openTab) === tabType);
    const tabId = forceNew && hasTypeOpen && PROJECT_AGENT_DUPLICABLE_TABS.has(tabType)
        ? createProjectAgentTabKey(tabType)
        : (existingKey || tabType);
    activeProjectAgentTabs = normalizeProjectAgentTabs(activeProjectAgentTabs);
    if (!activeProjectAgentTabs.includes(tabId)) {
        activeProjectAgentTabs.push(tabId);
        if (persist) persistProjectAgentTabs();
    }
    return tabId;
}

function clearProjectAgentTabDragMarkers() {
    projectAgentTabs?.querySelectorAll(".drag-over-left, .drag-over-right, .dragging").forEach(tab => {
        tab.classList.remove("drag-over-left", "drag-over-right", "dragging");
    });
}

function moveProjectAgentTab(sourceTab, targetTab, { after = false } = {}) {
    const source = normalizeProjectAgentTabKey(sourceTab);
    const target = normalizeProjectAgentTabKey(targetTab);
    if (source === target || !activeProjectAgentTabs.includes(source) || !activeProjectAgentTabs.includes(target)) return;
    const reordered = activeProjectAgentTabs.filter(tab => tab !== source);
    const targetIndex = reordered.indexOf(target);
    reordered.splice(targetIndex + (after ? 1 : 0), 0, source);
    activeProjectAgentTabs = normalizeProjectAgentTabs(reordered);
    persistProjectAgentTabs();
    renderProjectAgentTabs();
}

function closeProjectAgentTab(tab) {
    const tabId = normalizeProjectAgentTabKey(tab);
    const definition = getProjectAgentTabDefinition(tabId);
    if (!definition.closeable || !activeProjectAgentTabs.includes(tabId)) return;
    const closingIndex = activeProjectAgentTabs.indexOf(tabId);
    activeProjectAgentTabs = activeProjectAgentTabs.filter(openTab => openTab !== tabId);
    const tabType = normalizeProjectAgentTab(tabId);
    if (tabType === "chat") {
        projectPageChatStates.delete(tabId);
    } else if (tabType === "files") {
        projectFileStates.delete(tabId);
    } else if (tabType === "terminal") {
        void stopProjectTerminalSession(tabId);
        projectTerminalStates.delete(tabId);
    }
    if (!activeProjectAgentTabs.length) activeProjectAgentTabs = ["menu"];
    persistProjectAgentTabs();
    if (activeProjectAgentTab === tabId) {
        const nextIndex = Math.min(closingIndex, activeProjectAgentTabs.length - 1);
        activeProjectAgentTab = activeProjectAgentTabs[Math.max(0, nextIndex)] || "menu";
    }
    setProjectAgentTab(activeProjectAgentTab);
}

function focusAdjacentProjectAgentTab(currentTab, direction) {
    if (!projectAgentTabs) return;
    const tabs = Array.from(projectAgentTabs.querySelectorAll("[data-project-agent-tab]"));
    const current = tabs.findIndex(tab => tab.dataset.projectAgentTab === currentTab);
    if (current === -1 || tabs.length < 2) return;
    const next = (current + direction + tabs.length) % tabs.length;
    tabs[next]?.focus?.();
}

function createProjectAgentTabNode(tabKey) {
    const definition = getProjectAgentTabDefinition(tabKey);
    const active = activeProjectAgentTab === tabKey;
    const displayLabel = getProjectAgentTabLabel(definition, tabKey);
    const tab = document.createElement("div");
    tab.id = getProjectAgentTabDomId(tabKey, definition);
    tab.className = `project-agent-tab${active ? " active" : ""}${definition.closeable ? " project-agent-tab-closeable" : ""}`;
    tab.dataset.projectAgentTab = tabKey;
    tab.dataset.projectAgentTabType = definition.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(active));
    tab.setAttribute("aria-controls", definition.paneId);
    tab.setAttribute("aria-label", `${displayLabel} tab`);
    tab.setAttribute("tabindex", active ? "0" : "-1");
    tab.draggable = getVisibleProjectAgentTabs().length > 1;
    tab.innerHTML = "";
    const main = document.createElement("span");
    main.className = "project-agent-tab-main";
    main.innerHTML = `
        <span class="project-agent-tab-icon" aria-hidden="true">${definition.icon}</span>
        <span class="project-agent-tab-label"></span>
    `;
    tab.appendChild(main);
    const label = tab.querySelector(".project-agent-tab-label");
    if (label) label.textContent = displayLabel;
    if (definition.closeable) {
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "project-agent-tab-close";
        closeButton.setAttribute("aria-label", `Close ${displayLabel} tab`);
        closeButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
        closeButton.addEventListener("click", event => {
            event.stopPropagation();
            closeProjectAgentTab(tabKey);
        });
        tab.appendChild(closeButton);
    }
    tab.addEventListener("click", event => {
        if (event.target.closest(".project-agent-tab-close")) return;
        openProjectWorkspacePanel(tabKey, { refresh: definition.id === "files" });
    });
    tab.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProjectWorkspacePanel(tabKey, { refresh: definition.id === "files" });
            return;
        }
        if ((event.key === "Backspace" || event.key === "Delete") && definition.closeable) {
            event.preventDefault();
            closeProjectAgentTab(tabKey);
            return;
        }
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            focusAdjacentProjectAgentTab(tabKey, -1);
            return;
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            focusAdjacentProjectAgentTab(tabKey, 1);
        }
    });
    tab.addEventListener("dragstart", event => {
        if (getVisibleProjectAgentTabs().length < 2 || !event.dataTransfer) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", tabKey);
        window.requestAnimationFrame(() => tab.classList.add("dragging"));
    });
    tab.addEventListener("dragover", event => {
        if (getVisibleProjectAgentTabs().length < 2) return;
        event.preventDefault();
        clearProjectAgentTabDragMarkers();
        const rect = tab.getBoundingClientRect();
        const after = event.clientX > rect.left + (rect.width / 2);
        tab.classList.add(after ? "drag-over-right" : "drag-over-left");
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    tab.addEventListener("dragleave", event => {
        if (event.relatedTarget && tab.contains(event.relatedTarget)) return;
        tab.classList.remove("drag-over-left", "drag-over-right");
    });
    tab.addEventListener("dragend", clearProjectAgentTabDragMarkers);
    tab.addEventListener("drop", event => {
        event.preventDefault();
        const sourceTab = event.dataTransfer?.getData("text/plain");
        const rect = tab.getBoundingClientRect();
        moveProjectAgentTab(sourceTab, tabKey, { after: event.clientX > rect.left + (rect.width / 2) });
        clearProjectAgentTabDragMarkers();
    });
    return tab;
}

function renderProjectAgentTabs() {
    if (!projectAgentTabs) return;
    activeProjectAgentTabs = normalizeProjectAgentTabs(activeProjectAgentTabs);
    if (!activeProjectAgentTabs.includes(activeProjectAgentTab)) {
        activeProjectAgentTab = activeProjectAgentTabs[0] || "menu";
    }
    projectAgentTabs.replaceChildren(...getVisibleProjectAgentTabs().map(createProjectAgentTabNode));
}

function setProjectAgentTab(tab, { persist = true, open = true, closeMenu = true, forceNew = false } = {}) {
    const tabKey = open
        ? ensureProjectAgentTabOpen(tab, { persist, forceNew })
        : (normalizeProjectAgentTabKey(tab) || "menu");
    activeProjectAgentTab = activeProjectAgentTabs.includes(tabKey) ? tabKey : (activeProjectAgentTabs[0] || "menu");
    if (persist) safeLocalStorageSet(PROJECT_AGENT_TAB_STORAGE_KEY, activeProjectAgentTab);
    if (closeMenu) closeProjectPanelTabMenu();
    renderProjectAgentTabs();
    const activeTabType = normalizeProjectAgentTab(activeProjectAgentTab);
    PROJECT_AGENT_TAB_DEFINITIONS.forEach(definition => {
        const pane = getProjectAgentPane(definition.id);
        if (pane) pane.hidden = definition.id !== activeTabType;
    });
    if (activeTabType === "files") {
        syncProjectFileStateForActiveTab({ render: false });
        renderProjectFileViewer();
    } else if (activeTabType === "chat") {
        ensureProjectPageChatRoot();
    } else if (activeTabType === "terminal") {
        void ensureProjectTerminalSession();
    }
    if (persist) persistActiveWorkspacePanelState();
}

function getActiveProjectBridgeOptions() {
    const root = getSessionProjectRoot();
    return root?.id ? { scope: `project:${root.id}` } : null;
}

function getProjectGitBridgeOptions(root = getSessionProjectRoot(), { pathOnly = false } = {}) {
    const path = String(root?.path || "").trim();
    if (pathOnly) return path ? { path } : {};
    const options = {};
    if (root?.id) options.scope = `project:${root.id}`;
    if (path) options.path = path;
    return options;
}

function shouldRetryGitWithProjectPath(error, root = getSessionProjectRoot()) {
    return Boolean(
        root?.path
        && /Project scope is not registered with this bridge/i.test(error?.message || String(error || ""))
    );
}

async function getProjectGitInfoFromBridge(root = getSessionProjectRoot(), signal = null) {
    try {
        return await getWorkspaceGitInfo(signal, getProjectGitBridgeOptions(root));
    } catch (err) {
        if (!shouldRetryGitWithProjectPath(err, root)) throw err;
        return getWorkspaceGitInfo(signal, getProjectGitBridgeOptions(root, { pathOnly: true }));
    }
}

async function checkoutProjectGitBranch(root, branch, options = {}, signal = null) {
    try {
        return await checkoutWorkspaceGitBranch(branch, options, signal, getProjectGitBridgeOptions(root));
    } catch (err) {
        if (!shouldRetryGitWithProjectPath(err, root)) throw err;
        return checkoutWorkspaceGitBranch(branch, options, signal, getProjectGitBridgeOptions(root, { pathOnly: true }));
    }
}

function getProjectParentPath(path = ".") {
    const clean = normalizeProjectExplorerPath(path);
    if (clean === ".") return ".";
    const parts = clean.split("/").filter(Boolean);
    parts.pop();
    return parts.join("/") || ".";
}

function renderProjectExplorerMessage(message, state = "muted") {
    if (!projectExplorerList) return;
    const node = document.createElement("div");
    node.className = `project-explorer-message project-explorer-message-${state}`;
    node.textContent = message;
    projectExplorerList.replaceChildren(node);
}

function applyProjectAgentWidth() {
    document.documentElement.style.setProperty("--project-agent-width", `${activeProjectAgentWidth}px`);
}

function setProjectAgentWidth(width, { persist = true } = {}) {
    activeProjectAgentWidth = normalizeProjectAgentWidth(width);
    applyProjectAgentWidth();
    if (persist) {
        safeLocalStorageSet(PROJECT_AGENT_WIDTH_STORAGE_KEY, String(activeProjectAgentWidth));
    }
}

function updateProjectAgentDockState(root = getSessionProjectRoot()) {
    const hasProject = Boolean(root);
    const isOpen = !isProjectAgentCollapsed;
    applyProjectAgentWidth();
    if (projectAgentPanel) projectAgentPanel.hidden = !isOpen;
    if (projectAgentExpandBtn) {
        projectAgentExpandBtn.hidden = isOpen;
        projectAgentExpandBtn.setAttribute("aria-expanded", String(isOpen));
    }
    projectAgentCollapseBtn?.setAttribute("aria-expanded", String(isOpen));
    windowWorkspacePanelToggleBtn?.setAttribute("aria-expanded", String(isOpen));
    if (windowWorkspacePanelToggleBtn) {
        windowWorkspacePanelToggleBtn.setAttribute("aria-label", isOpen ? "Close workspace panel" : "Open workspace menu");
        windowWorkspacePanelToggleBtn.dataset.tooltip = isOpen ? "Close workspace panel" : "Open workspace menu";
    }
    if (windowWorkspacePanelMaximizeBtn) {
        windowWorkspacePanelMaximizeBtn.hidden = !isOpen;
        windowWorkspacePanelMaximizeBtn.setAttribute("aria-pressed", String(isOpen && isProjectAgentMaximized));
        windowWorkspacePanelMaximizeBtn.setAttribute("aria-label", isProjectAgentMaximized ? "Restore workspace panel" : "Maximize workspace panel");
        windowWorkspacePanelMaximizeBtn.dataset.tooltip = isProjectAgentMaximized ? "Restore workspace panel" : "Maximize workspace panel";
    }
    document.body?.classList.toggle("project-agent-open", isOpen);
    document.body?.classList.toggle("project-agent-collapsed", !isOpen);
    document.body?.classList.toggle("project-agent-maximized", isOpen && isProjectAgentMaximized);
}

function setProjectAgentCollapsed(collapsed, { persist = true, refresh = false } = {}) {
    isProjectAgentCollapsed = Boolean(collapsed);
    if (persist) {
        safeLocalStorageSet(PROJECT_AGENT_COLLAPSED_STORAGE_KEY, isProjectAgentCollapsed ? "true" : "false");
    }
    updateProjectAgentPanel();
    if (!isProjectAgentCollapsed && refresh) {
        void refreshProjectExplorer({ silent: true, refreshBranch: true });
    }
}

function setProjectAgentMaximized(maximized, { persist = true } = {}) {
    isProjectAgentMaximized = Boolean(maximized);
    if (persist) {
        safeLocalStorageSet(PROJECT_AGENT_MAXIMIZED_STORAGE_KEY, isProjectAgentMaximized ? "true" : "false");
    }
    updateProjectAgentDockState();
}

function openProjectWorkspacePanel(tab = "menu", { refresh = false, forceNew = false } = {}) {
    setProjectAgentTab(tab, { forceNew });
    const tabType = normalizeProjectAgentTab(activeProjectAgentTab);
    setProjectAgentCollapsed(false, { refresh: refresh || tabType === "files" });
    if (tabType === "terminal") {
        window.requestAnimationFrame(focusProjectTerminalInput);
    }
}

async function openProjectTerminalFromPanel() {
    const root = getSessionProjectRoot();
    if (!root) {
        showToast("Select a project first.", "warning");
        return;
    }
    const desktopApi = getFaunaDesktopApi();
    if (!desktopApi?.projects?.openTerminal) {
        showToast("Opening a real terminal is available in the desktop app.", "warning");
        return;
    }
    const activityId = recordAgentActivity({
        kind: "terminal",
        label: "Open terminal",
        detail: root.path,
        status: "running"
    });
    try {
        const result = await desktopApi.projects.openTerminal(root.path);
        if (result?.ok === false) throw new Error(result.message || "Terminal could not be opened.");
        updateAgentActivityEvent(activityId, {
            status: "done",
            detail: result?.command ? `${result.command} in ${root.path}` : root.path
        });
        showToast(`Terminal opened in ${root.name}.`, "success");
    } catch (err) {
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Could not open terminal: ${err.message}`, "error");
    }
}

function toggleProjectWorkspacePanel() {
    if (isProjectAgentCollapsed) {
        openProjectWorkspacePanel("menu");
        return;
    }
    setProjectAgentCollapsed(true);
}

function handleWorkspacePanelAction(action = "") {
    closeProjectPanelTabMenu();
    switch (action) {
        case "files":
            openProjectWorkspacePanel("files", { refresh: true, forceNew: true });
            return;
        case "terminal":
            openProjectWorkspacePanel("terminal", { forceNew: true });
            window.requestAnimationFrame(focusProjectTerminalInput);
            return;
        case "inspect":
            openProjectWorkspacePanel("activity");
            void openProjectDiffReview();
            return;
        case "browser":
            openProjectWorkspacePanel("menu");
            return;
        case "page-chat":
            openProjectWorkspacePanel("chat", { forceNew: true });
            window.requestAnimationFrame(() => projectPageChatInput?.focus?.());
            return;
        default:
            openProjectWorkspacePanel("menu");
    }
}

function startProjectAgentResize(event) {
    if (!projectAgentResizeHandle || event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = activeProjectAgentWidth;
    document.body?.classList.add("project-agent-resizing");
    projectAgentResizeHandle.setPointerCapture?.(event.pointerId);

    const onPointerMove = moveEvent => {
        moveEvent.preventDefault();
        setProjectAgentWidth(startWidth + (startX - moveEvent.clientX), { persist: false });
    };
    const onPointerUp = () => {
        document.body?.classList.remove("project-agent-resizing");
        safeLocalStorageSet(PROJECT_AGENT_WIDTH_STORAGE_KEY, String(activeProjectAgentWidth));
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerUp, { once: true });
}

function updateProjectAgentPanel() {
    const root = getSessionProjectRoot();
    updateProjectAgentDockState(root);
    setProjectAgentTab(activeProjectAgentTab, { persist: false, closeMenu: false });
    if (projectAgentTitle) projectAgentTitle.textContent = root?.name || "Workspace";
    renderProjectFileViewer();
    if (projectBranchSummary) {
        projectBranchSummary.textContent = root
            ? `${root.type === "worktree" ? "Worktree" : "Project"}: ${root.name}`
            : "No project selected";
    }
    if (!root) {
        setActiveProjectGitInfo(null);
        updateComposerProjectContextBar();
        projectExplorerRootId = "";
        currentProjectExplorerResult = { entries: [], truncated: false };
        activeProjectExplorerExpandedPaths = new Set();
        activeProjectFile = null;
        renderProjectFileViewer();
        if (projectExplorerPath) projectExplorerPath.textContent = ".";
        if (projectExplorerFilterInput) projectExplorerFilterInput.value = "";
        renderProjectExplorerMessage("Select a project to browse files.", "muted");
        ensureProjectPageChatRoot();
        return;
    }
    if (projectExplorerRootId !== root.id) {
        projectExplorerRootId = root.id;
        activeProjectExplorerPath = ".";
        currentProjectExplorerResult = { entries: [], truncated: false };
        activeProjectExplorerExpandedPaths = new Set();
        persistProjectExplorerExpandedPaths();
        activeProjectFile = null;
        renderProjectFileViewer();
        if (projectExplorerFilterInput) projectExplorerFilterInput.value = "";
        safeLocalStorageSet(PROJECT_EXPLORER_PATH_STORAGE_KEY, activeProjectExplorerPath);
    }
    if (projectExplorerPath) projectExplorerPath.textContent = activeProjectExplorerPath;
    ensureProjectPageChatRoot();
    renderAgentActivityList();
    if (hasWorkspaceBridgeAccess() && activeProjectGitInfoRootId !== root.id) {
        void refreshProjectBranchSummary(root);
    } else if (activeProjectGitInfoRootId === root.id && activeProjectGitInfo) {
        updateProjectGitUi(root, activeProjectGitInfo);
    } else {
        updateComposerProjectContextBar();
    }
}

function recordAgentActivity(activity = {}) {
    const now = new Date();
    const item = {
        id: `activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        kind: String(activity.kind || "tool"),
        label: String(activity.label || "Agent activity"),
        detail: String(activity.detail || activity.input || ""),
        input: String(activity.input || ""),
        status: String(activity.status || "done"),
        project: getActiveProjectLabel(),
        createdAt: now.toISOString()
    };
    agentActivityEvents = [item, ...agentActivityEvents].slice(0, 36);
    renderAgentActivityList();
    return item.id;
}

function updateAgentActivityEvent(activityId, updates = {}) {
    const id = String(activityId || "");
    if (!id) return;
    const item = agentActivityEvents.find(event => event.id === id);
    if (!item) return;
    Object.assign(item, {
        ...updates,
        updatedAt: new Date().toISOString()
    });
    renderAgentActivityList();
}

function renderAgentActivityList() {
    if (!agentActivityList) return;
    agentActivityList.replaceChildren();
    if (!agentActivityEvents.length) {
        const empty = document.createElement("div");
        empty.className = "agent-activity-empty";
        empty.textContent = "Tool calls and project actions appear here.";
        agentActivityList.appendChild(empty);
        return;
    }
    agentActivityEvents.forEach(event => {
        const row = document.createElement("div");
        row.className = "agent-activity-row";
        row.dataset.status = event.status || "done";
        row.innerHTML = `
            <span class="agent-activity-dot" aria-hidden="true"></span>
            <span class="agent-activity-copy">
                <span class="agent-activity-title"></span>
                <span class="agent-activity-detail"></span>
            </span>
            <span class="agent-activity-status"></span>
        `;
        row.querySelector(".agent-activity-title").textContent = event.label;
        row.querySelector(".agent-activity-detail").textContent = [event.project, event.detail || event.input].filter(Boolean).join(" / ");
        row.querySelector(".agent-activity-status").textContent = event.status || "Done";
        agentActivityList.appendChild(row);
    });
}

function formatProjectFileSize(size) {
    if (typeof size !== "number" || !Number.isFinite(size)) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
    return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function getProjectEntryName(entry = {}) {
    return String(entry.name || entry.path || "")
        .split(/[\\/]/)
        .filter(Boolean)
        .pop() || "";
}

function getProjectFileExtension(entry = {}) {
    const name = getProjectEntryName(entry);
    if (!name || !name.includes(".") || name.startsWith(".") && name.indexOf(".", 1) === -1) return "";
    return name.split(".").pop().toLowerCase();
}

function getProjectFileKind(entry = {}, { parent = false } = {}) {
    if (parent) return "parent";
    if (entry.type === "directory") return "folder";

    const name = getProjectEntryName(entry).toLowerCase();
    const extension = getProjectFileExtension(entry);
    if (name === ".gitignore" || name === ".gitattributes" || name === ".gitmodules") return "git";
    if (name === "license" || name.startsWith("license.")) return "license";
    if (name === "package.json" || name === "package-lock.json" || name === "pnpm-lock.yaml" || name === "yarn.lock") return "package";
    if (["md", "mdx"].includes(extension)) return "markdown";
    if (["js", "mjs", "cjs"].includes(extension)) return "javascript";
    if (["ts", "tsx"].includes(extension)) return "typescript";
    if (extension === "jsx") return "react";
    if (extension === "css") return "css";
    if (["html", "htm"].includes(extension)) return "html";
    if (extension === "json") return "json";
    if (["py", "pyw"].includes(extension)) return "python";
    if (["png", "jpg", "jpeg", "gif", "webp", "avif", "ico"].includes(extension)) return "image";
    if (extension === "svg") return "svg";
    if (["mp4", "webm", "mov", "mkv"].includes(extension)) return "video";
    if (["mp3", "wav", "ogg", "flac"].includes(extension)) return "audio";
    if (["sh", "bash", "zsh", "ps1", "bat", "cmd"].includes(extension)) return "terminal";
    if (["yml", "yaml", "toml", "ini", "env"].includes(extension) || name.startsWith(".env")) return "config";
    if (["txt", "csv", "log"].includes(extension)) return "text";
    return "file";
}

function getProjectFileIconMarkup(kind = "file", extension = "") {
    const labels = {
        config: "cfg",
        css: "css",
        file: extension ? extension.slice(0, 3).toLowerCase() : "file",
        html: "#",
        javascript: "js",
        json: "{}",
        license: "txt",
        markdown: "M",
        package: "{}",
        react: "jsx",
        svg: "svg",
        terminal: "$",
        text: "txt",
        typescript: "ts"
    };
    const svgIcons = {
        audio: '<path d="M9 18V6l10-2v12"></path><circle cx="7" cy="18" r="3"></circle><circle cx="17" cy="16" r="3"></circle>',
        folder: '<path d="m9 18 6-6-6-6"></path>',
        git: '<path d="M12 3 3 12l9 9 9-9-9-9Z"></path><path d="M9 9h6v6"></path><path d="M15 9 9 15"></path>',
        image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"></rect><circle cx="8.5" cy="10" r="1.6"></circle><path d="m20 15-4-4-7 8"></path>',
        parent: '<path d="m6 15 6-6 6 6"></path>',
        python: '<path d="M12 3h3.5A3.5 3.5 0 0 1 19 6.5V10h-7"></path><path d="M12 21H8.5A3.5 3.5 0 0 1 5 17.5V14h7"></path><path d="M9 7h.01"></path><path d="M15 17h.01"></path>',
        video: '<rect x="3.5" y="6" width="12.5" height="12" rx="2.3"></rect><path d="m16 10 4-2.5v9L16 14"></path>'
    };
    if (svgIcons[kind]) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgIcons[kind]}</svg>`;
    }
    const label = labels[kind] || labels.file;
    return `<span class="project-explorer-row-icon-label">${label}</span>`;
}

function getProjectFileDisplayName(path = "") {
    return String(path || "")
        .split(/[\\/]/)
        .filter(Boolean)
        .pop() || "Open file";
}

function isProjectMarkdownFile(path = "") {
    return /\.(md|mdx|markdown)$/i.test(String(path || ""));
}

function getActiveProjectFileKey(tabKey = activeProjectAgentTab) {
    const key = normalizeProjectAgentTabKey(tabKey);
    if (normalizeProjectAgentTab(key) === "files") return key;
    return activeProjectAgentTabs.find(tab => normalizeProjectAgentTab(tab) === "files") || "files";
}

function createProjectFileState(rootId = "") {
    return {
        rootId,
        file: null
    };
}

function getProjectFileState(tabKey = activeProjectAgentTab, root = getSessionProjectRoot()) {
    const key = getActiveProjectFileKey(tabKey);
    const rootId = root?.id || "";
    let state = projectFileStates.get(key);
    if (!state || state.rootId !== rootId) {
        state = createProjectFileState(rootId);
        projectFileStates.set(key, state);
    }
    return state;
}

function syncProjectFileStateForActiveTab({ render = false } = {}) {
    activeProjectFile = getProjectFileState().file;
    if (render) renderProjectFileViewer();
    return activeProjectFile;
}

function setActiveProjectFileForCurrentTab(file = null) {
    const state = getProjectFileState();
    state.file = normalizeProjectFileStateFile(file);
    activeProjectFile = state.file;
    return activeProjectFile;
}

function getProjectFileLanguage(path = "") {
    const name = getProjectFileDisplayName(path).toLowerCase();
    const extension = name.includes(".") ? name.split(".").pop() : "";
    const aliases = {
        bat: "batch",
        cjs: "javascript",
        cmd: "batch",
        htm: "html",
        js: "javascript",
        jsx: "jsx",
        markdown: "markdown",
        md: "markdown",
        mdx: "markdown",
        mjs: "javascript",
        ps1: "powershell",
        py: "python",
        sh: "bash",
        ts: "typescript",
        tsx: "tsx",
        yml: "yaml"
    };
    return normalizeCodeLanguage(aliases[extension] || extension || "text");
}

function parseProjectMarkdownFrontmatter(content = "") {
    const text = String(content || "");
    if (!text.startsWith("---")) return { metadata: [], body: text };
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) return { metadata: [], body: text };
    const metadata = match[1]
        .split(/\r?\n/)
        .map(line => line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.+?)\s*$/))
        .filter(Boolean)
        .map(matchLine => ({
            key: matchLine[1],
            value: matchLine[2].replace(/^["']|["']$/g, "")
        }))
        .filter(item => item.value && item.value.length <= 180)
        .slice(0, 8);
    return { metadata, body: match[2] || "" };
}

function closeProjectFileMoreMenu() {
    if (!projectFileMoreMenu || !projectFileMoreBtn) return;
    projectFileMoreMenu.hidden = true;
    projectFileMoreBtn.setAttribute("aria-expanded", "false");
}

function renderProjectFileMenuState() {
    if (projectFileToggleExtendedBtn) {
        const label = activeProjectFileExtendedView ? "Disable extended view" : "Enable extended view";
        projectFileToggleExtendedBtn.querySelector("span:last-child").textContent = label;
    }
    if (projectFileToggleWrapBtn) {
        const label = activeProjectFileLineWrap ? "Disable line wrap" : "Enable line wrap";
        projectFileToggleWrapBtn.querySelector("span:last-child").textContent = label;
    }
}

function toggleProjectFileMoreMenu() {
    if (!projectFileMoreMenu || !projectFileMoreBtn) return;
    const willOpen = projectFileMoreMenu.hidden;
    renderProjectFileMenuState();
    projectFileMoreMenu.hidden = !willOpen;
    projectFileMoreBtn.setAttribute("aria-expanded", String(willOpen));
}

async function copyProjectFileText(value = "", button = null) {
    if (!value) {
        showToast("Nothing to copy.", "info");
        return;
    }
    if (typeof handleCopyButton === "function" && button) {
        await handleCopyButton(button, value);
        return;
    }
    try {
        await writeTextToClipboard(value);
        showToast("Copied.", "success");
    } catch {
        showToast("Copy failed. Select the text manually.", "error");
    }
}

function clearProjectLineCommentPanels() {
    projectFileCode?.querySelectorAll(".project-file-line-comment").forEach(panel => panel.remove());
    projectFileCode?.querySelectorAll(".project-file-code-line.comment-open").forEach(row => {
        row.classList.remove("comment-open");
    });
}

function openProjectLineComment(lineRow, lineNumber, lineText = "") {
    if (!lineRow || !projectFileCode) return;
    clearProjectLineCommentPanels();
    lineRow.classList.add("comment-open");
    const panel = document.createElement("div");
    panel.className = "project-file-line-comment";
    panel.innerHTML = `
        <div class="project-file-line-comment-head">
            <span class="project-file-line-comment-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"></path><path d="M8 10h8"></path></svg>
            </span>
            <strong>Local comment</strong>
            <span>Comment on line ${lineNumber}</span>
        </div>
        <textarea class="project-file-line-comment-input" rows="2" placeholder="Request a change" aria-label="Comment text"></textarea>
        <div class="project-file-line-comment-actions">
            <button class="project-file-comment-cancel" type="button">Cancel</button>
            <button class="project-file-comment-submit" type="button">Comment</button>
        </div>
    `;
    const textarea = panel.querySelector("textarea");
    panel.querySelector(".project-file-comment-cancel")?.addEventListener("click", clearProjectLineCommentPanels);
    panel.querySelector(".project-file-comment-submit")?.addEventListener("click", () => {
        const comment = textarea?.value.trim() || "";
        if (!comment) {
            textarea?.focus();
            return;
        }
        const fileRef = activeProjectFile?.path ? `\`${activeProjectFile.path}:${lineNumber}\`` : `line ${lineNumber}`;
        const note = `${fileRef}: ${comment}`;
        const targetInput = projectPageChatInput || input;
        if (targetInput) {
            targetInput.value = [targetInput.value.trim(), note].filter(Boolean).join("\n");
            targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        showToast("Comment added to the workspace chat.", "success");
        clearProjectLineCommentPanels();
    });
    lineRow.after(panel);
    window.requestAnimationFrame(() => textarea?.focus());
}

function renderProjectFileCode(content = "", path = activeProjectFile?.path || "") {
    if (!projectFileCode) return;
    clearProjectLineCommentPanels();
    projectFileCode.replaceChildren();
    const language = getProjectFileLanguage(path);
    const lines = String(content || "").split(/\r?\n/);
    if (!lines.length) lines.push("");
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const row = document.createElement("div");
        row.className = "project-file-code-line";
        row.dataset.line = String(lineNumber);
        const addButton = document.createElement("button");
        addButton.className = "project-file-line-add";
        addButton.type = "button";
        addButton.setAttribute("aria-label", `Comment on line ${lineNumber}`);
        addButton.textContent = "+";
        addButton.addEventListener("click", event => {
            event.stopPropagation();
            openProjectLineComment(row, lineNumber, line);
        });
        const number = document.createElement("span");
        number.className = "project-file-line-number";
        number.textContent = String(lineNumber);
        const code = document.createElement("code");
        code.className = "project-file-line-text";
        code.dataset.language = language;
        code.innerHTML = typeof highlightCode === "function"
            ? highlightCode(line || " ", language)
            : escapeHtml(line || " ");
        row.append(addButton, number, code);
        projectFileCode.appendChild(row);
    });
}

function renderProjectFileExtended(content = "") {
    if (!projectFileRendered) return;
    const { metadata, body } = parseProjectMarkdownFrontmatter(content);
    const metadataHtml = metadata.length
        ? `<section class="project-file-metadata"><strong>Metadata</strong>${metadata.map(item => `<div><code>${escapeHtml(item.key)}</code><span>${escapeHtml(item.value)}</span></div>`).join("")}</section>`
        : "";
    const bodyHtml = typeof renderMarkdown === "function"
        ? renderMarkdown(body || content)
        : `<pre>${escapeHtml(body || content)}</pre>`;
    projectFileRendered.innerHTML = `${metadataHtml}<div class="project-file-rendered-body">${bodyHtml}</div>`;
}

function renderProjectFileViewer() {
    if (normalizeProjectAgentTab(activeProjectAgentTab) === "files") {
        syncProjectFileStateForActiveTab({ render: false });
    }
    const root = getSessionProjectRoot();
    if (projectFileBreadcrumbRoot) projectFileBreadcrumbRoot.textContent = root?.name || "Workspace";
    if (projectFileBreadcrumbName) projectFileBreadcrumbName.textContent = activeProjectFile?.name || "Open file";
    if (projectFileMoreBtn) projectFileMoreBtn.disabled = !activeProjectFile;
    if (projectFileRevealBtn) projectFileRevealBtn.disabled = !projectExplorerList;
    renderProjectFileMenuState();
    renderProjectAgentTabs();

    if (!projectFileEmptyState || !projectFileViewer || !projectFileRendered || !projectFileCode) return;
    const hasFile = Boolean(activeProjectFile?.path);
    projectFileEmptyState.hidden = hasFile;
    projectFileViewer.hidden = !hasFile;
    projectFileViewer.classList.toggle("line-wrap", activeProjectFileLineWrap);
    projectFileViewer.classList.toggle("extended-view", hasFile && activeProjectFileExtendedView && isProjectMarkdownFile(activeProjectFile.path));
    projectFileViewer.classList.toggle("source-view", hasFile && (!activeProjectFileExtendedView || !isProjectMarkdownFile(activeProjectFile.path)));
    if (!hasFile) {
        projectFileRendered.replaceChildren();
        projectFileCode.replaceChildren();
        return;
    }

    const content = String(activeProjectFile.content || "");
    const showRendered = activeProjectFileExtendedView && isProjectMarkdownFile(activeProjectFile.path);
    projectFileRendered.hidden = !showRendered;
    projectFileCode.hidden = showRendered;
    if (showRendered) {
        renderProjectFileExtended(content);
    } else {
        renderProjectFileCode(content, activeProjectFile.path);
    }
}

function getProjectExplorerEntryDepth(entryPath = "") {
    const base = normalizeProjectExplorerPath(activeProjectExplorerPath);
    const clean = normalizeProjectExplorerPath(entryPath);
    const relative = base !== "." && clean.startsWith(`${base}/`)
        ? clean.slice(base.length + 1)
        : clean;
    return Math.max(0, relative.split("/").filter(Boolean).length - 1);
}

function getProjectExplorerFilterText() {
    return String(projectExplorerFilterInput?.value || "").trim().toLowerCase();
}

function matchesProjectExplorerFilter(entry = {}, filterText = "") {
    if (!filterText) return true;
    return [entry.name, entry.path, entry.type]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(filterText));
}

function persistProjectExplorerExpandedPaths() {
    safeLocalStorageSet(PROJECT_EXPLORER_EXPANDED_PATHS_STORAGE_KEY, JSON.stringify([...activeProjectExplorerExpandedPaths]));
}

function isProjectExplorerDirectoryExpanded(path = "") {
    return activeProjectExplorerExpandedPaths.has(normalizeProjectExplorerPath(path));
}

function setProjectExplorerDirectoryExpanded(path = "", expanded = false, { persist = true } = {}) {
    const cleanPath = normalizeProjectExplorerPath(path);
    if (!cleanPath || cleanPath === ".") return;
    if (expanded) {
        activeProjectExplorerExpandedPaths.add(cleanPath);
    } else {
        activeProjectExplorerExpandedPaths.delete(cleanPath);
    }
    if (persist) persistProjectExplorerExpandedPaths();
    persistActiveWorkspacePanelState();
}

function expandProjectExplorerAncestors(path = "", { persist = true } = {}) {
    let parentPath = getProjectParentPath(path);
    while (parentPath && parentPath !== ".") {
        activeProjectExplorerExpandedPaths.add(parentPath);
        parentPath = getProjectParentPath(parentPath);
    }
    if (persist) persistProjectExplorerExpandedPaths();
}

function compareProjectExplorerEntryOrder(a = {}, b = {}) {
    const aDirectory = a.type === "directory";
    const bDirectory = b.type === "directory";
    if (aDirectory !== bDirectory) return aDirectory ? -1 : 1;
    return String(a.name || a.path || "").localeCompare(String(b.name || b.path || ""), undefined, {
        sensitivity: "base",
        numeric: true
    });
}

function getProjectExplorerChildEntries(entries = [], parentPath = ".") {
    const cleanParent = normalizeProjectExplorerPath(parentPath);
    return entries
        .filter(entry => {
            const cleanPath = normalizeProjectExplorerPath(entry.path || ".");
            if (!cleanPath || cleanPath === "." || cleanPath === cleanParent) return false;
            return getProjectParentPath(cleanPath) === cleanParent;
        })
        .sort(compareProjectExplorerEntryOrder);
}

function projectExplorerHasLoadedChildren(path = "", entries = currentProjectExplorerResult.entries || []) {
    return getProjectExplorerChildEntries(entries, path).length > 0;
}

function getProjectExplorerFilterSets(entries = [], filterText = "") {
    const visiblePaths = new Set();
    const autoExpandedPaths = new Set();
    if (!filterText) return { visiblePaths, autoExpandedPaths };
    entries.forEach(entry => {
        if (!matchesProjectExplorerFilter(entry, filterText)) return;
        let cleanPath = normalizeProjectExplorerPath(entry.path || ".");
        while (cleanPath && cleanPath !== ".") {
            visiblePaths.add(cleanPath);
            const parentPath = getProjectParentPath(cleanPath);
            if (parentPath && parentPath !== ".") {
                visiblePaths.add(parentPath);
                autoExpandedPaths.add(parentPath);
            }
            cleanPath = parentPath;
        }
    });
    return { visiblePaths, autoExpandedPaths };
}

function mergeProjectExplorerEntries(entries = []) {
    const currentEntries = Array.isArray(currentProjectExplorerResult.entries) ? currentProjectExplorerResult.entries : [];
    const byPath = new Map(currentEntries.map(entry => [normalizeProjectExplorerPath(entry.path || "."), entry]));
    entries.forEach(entry => {
        const cleanPath = normalizeProjectExplorerPath(entry.path || ".");
        if (cleanPath && cleanPath !== ".") byPath.set(cleanPath, entry);
    });
    currentProjectExplorerResult = {
        ...currentProjectExplorerResult,
        entries: [...byPath.values()]
    };
}

function appendProjectExplorerRows(parentPath, depth, options = {}) {
    const {
        entries = [],
        filterText = "",
        visiblePaths = new Set(),
        autoExpandedPaths = new Set()
    } = options;
    const children = getProjectExplorerChildEntries(entries, parentPath);
    children.forEach(entry => {
        const cleanPath = normalizeProjectExplorerPath(entry.path || ".");
        if (filterText && !visiblePaths.has(cleanPath)) return;
        const isDirectory = entry.type === "directory";
        const hasChildren = projectExplorerHasLoadedChildren(cleanPath, entries);
        const expanded = isDirectory && (autoExpandedPaths.has(cleanPath) || isProjectExplorerDirectoryExpanded(cleanPath));
        projectExplorerList.appendChild(createProjectExplorerRow(entry, {
            depth,
            expanded,
            hasChildren
        }));
        if (isDirectory && expanded) {
            if (projectExplorerLoadingPath === cleanPath && !hasChildren) {
                const loading = document.createElement("div");
                loading.className = "project-explorer-message project-explorer-message-muted project-explorer-loading-row";
                loading.style.setProperty("--project-entry-indent", `${(depth + 1) * 18}px`);
                loading.textContent = "Loading folder...";
                projectExplorerList.appendChild(loading);
            }
            appendProjectExplorerRows(cleanPath, depth + 1, options);
        }
    });
}

function renderProjectExplorerCurrentEntries() {
    if (!projectExplorerList) return;
    const result = currentProjectExplorerResult || {};
    const entries = Array.isArray(result.entries) ? result.entries : [];
    const filterText = getProjectExplorerFilterText();
    if (projectExplorerPath) projectExplorerPath.textContent = activeProjectExplorerPath;
    projectExplorerList.replaceChildren();
    const filterSets = getProjectExplorerFilterSets(entries, filterText);
    appendProjectExplorerRows(activeProjectExplorerPath, 0, {
        entries,
        filterText,
        visiblePaths: filterSets.visiblePaths,
        autoExpandedPaths: filterSets.autoExpandedPaths
    });
    if (!projectExplorerList.children.length) {
        const message = filterText
            ? "No matching files."
            : (result.truncated ? "Tree was truncated." : "No files found.");
        const empty = document.createElement("div");
        empty.className = "project-explorer-message project-explorer-message-muted";
        empty.textContent = message;
        projectExplorerList.appendChild(empty);
    }
    if (result.truncated) {
        const truncated = document.createElement("div");
        truncated.className = "project-explorer-message project-explorer-message-warning";
        truncated.textContent = "Showing a limited file list.";
        projectExplorerList.appendChild(truncated);
    }
}

function renderProjectExplorerEntries(result = {}) {
    currentProjectExplorerResult = {
        ...result,
        entries: Array.isArray(result.entries) ? result.entries : []
    };
    renderProjectExplorerCurrentEntries();
}

async function toggleProjectExplorerDirectory(entry = {}) {
    const cleanPath = normalizeProjectExplorerPath(entry.path || ".");
    if (!cleanPath || cleanPath === ".") return;
    const nextExpanded = !isProjectExplorerDirectoryExpanded(cleanPath);
    setProjectExplorerDirectoryExpanded(cleanPath, nextExpanded);
    renderProjectExplorerCurrentEntries();
    if (!nextExpanded || projectExplorerHasLoadedChildren(cleanPath)) return;
    if (!hasWorkspaceBridgeAccess()) return;
    projectExplorerLoadingPath = cleanPath;
    renderProjectExplorerCurrentEntries();
    try {
        const result = await listWorkspaceTree(cleanPath, 1, null, 160, getActiveProjectBridgeOptions());
        mergeProjectExplorerEntries(result.entries || []);
    } catch (err) {
        showToast(`Could not expand folder: ${err.message}`, "error");
    } finally {
        projectExplorerLoadingPath = "";
        renderProjectExplorerCurrentEntries();
    }
}

function createProjectExplorerRow(entry = {}, { parent = false, depth = 0, expanded = false, hasChildren = false } = {}) {
    const isDirectory = entry.type === "directory";
    const extension = getProjectFileExtension(entry);
    const fileKind = getProjectFileKind(entry, { parent });
    const button = document.createElement("button");
    button.type = "button";
    button.className = `project-explorer-row${isDirectory ? " project-explorer-row-dir" : " project-explorer-row-file"}`;
    button.dataset.fileKind = fileKind;
    button.dataset.depth = String(depth);
    button.dataset.path = normalizeProjectExplorerPath(entry.path || ".");
    if (expanded) button.dataset.expanded = "true";
    if (entry.ignored) button.dataset.gitIgnored = "true";
    if (isDirectory) {
        button.setAttribute("aria-expanded", String(expanded));
        button.dataset.hasChildren = String(hasChildren);
    }
    if (!isDirectory && normalizeProjectExplorerPath(entry.path || "") === activeProjectFile?.path) {
        button.classList.add("active");
        button.setAttribute("aria-current", "true");
    }
    button.style.setProperty("--project-entry-indent", `${Math.max(0, depth) * 18}px`);
    button.innerHTML = `
        <span class="project-explorer-row-icon" aria-hidden="true">${getProjectFileIconMarkup(fileKind, extension)}</span>
        <span class="project-explorer-row-name"></span>
        <span class="project-explorer-row-meta"></span>
    `;
    button.querySelector(".project-explorer-row-name").textContent = parent ? "Parent folder" : (entry.name || entry.path || "Untitled");
    button.querySelector(".project-explorer-row-meta").textContent = isDirectory ? "Folder" : formatProjectFileSize(entry.size);
    button.setAttribute("aria-label", `${parent ? "Go to parent folder" : isDirectory ? (expanded ? "Collapse folder" : "Expand folder") : "Open file"} ${entry.name || entry.path || ""}${entry.ignored ? " (Git ignored)" : ""}`.trim());
    button.addEventListener("click", () => {
        if (isDirectory) {
            void toggleProjectExplorerDirectory(entry);
        } else {
            void openProjectFilePreview(entry.path || "");
        }
    });
    return button;
}

function updateProjectGitUi(root = getSessionProjectRoot(), info = null) {
    const gitInfo = root ? setActiveProjectGitInfo(root, info || {}) : setActiveProjectGitInfo(null);
    if (projectBranchSummary) {
        projectBranchSummary.textContent = !root
            ? "No project selected"
            : gitInfo?.unavailable
                ? "Git unavailable"
                : !gitInfo?.isRepo
                    ? "No Git repository"
                    : `${getGitBranchDisplayLabel(gitInfo)} / ${formatGitDirtyText(gitInfo.dirtyCount)}`;
    }
    updateComposerProjectContextBar();
    if (composerBranchMenu && !composerBranchMenu.hidden) {
        renderComposerBranchMenu();
        positionComposerBranchMenu();
    }
    return gitInfo;
}

async function refreshProjectBranchSummary(root = getSessionProjectRoot(), { silent = true } = {}) {
    if (!root || !projectBranchSummary) return null;
    if (!hasWorkspaceBridgeAccess()) {
        updateProjectGitUi(root, { unavailable: true, error: "Local Workspace Bridge is not connected." });
        return null;
    }
    const requestId = activeProjectGitRequestId + 1;
    activeProjectGitRequestId = requestId;
    try {
        const result = await getProjectGitInfoFromBridge(root);
        if (requestId !== activeProjectGitRequestId || getSessionProjectRoot()?.id !== root.id) return null;
        return updateProjectGitUi(root, result);
    } catch (err) {
        if (requestId !== activeProjectGitRequestId || getSessionProjectRoot()?.id !== root.id) return null;
        updateProjectGitUi(root, { unavailable: true, error: err.message });
        if (!silent) showToast(`Could not inspect Git: ${err.message}`, "error");
        return null;
    }
}

async function refreshProjectExplorer({ path = activeProjectExplorerPath, silent = false, refreshBranch = false } = {}) {
    const root = getSessionProjectRoot();
    if (!root) {
        updateProjectAgentPanel();
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        currentProjectExplorerResult = { entries: [], truncated: false };
        renderProjectExplorerMessage("Connect the Local Workspace Bridge to browse project files.", "warning");
        return;
    }
    activeProjectExplorerPath = normalizeProjectExplorerPath(path);
    safeLocalStorageSet(PROJECT_EXPLORER_PATH_STORAGE_KEY, activeProjectExplorerPath);
    persistActiveWorkspacePanelState();
    if (projectExplorerPath) projectExplorerPath.textContent = activeProjectExplorerPath;
    currentProjectExplorerResult = { entries: [], truncated: false };
    renderProjectExplorerMessage("Loading files...", "muted");
    const activityId = silent ? "" : recordAgentActivity({
        kind: "files",
        label: "List files",
        detail: activeProjectExplorerPath,
        status: "running"
    });
    try {
        const result = await listWorkspaceTree(activeProjectExplorerPath, 2, null, 320, getActiveProjectBridgeOptions());
        renderProjectExplorerEntries(result);
        if (activityId) updateAgentActivityEvent(activityId, { status: "done" });
        if (refreshBranch) void refreshProjectBranchSummary(root);
    } catch (err) {
        currentProjectExplorerResult = { entries: [], truncated: false };
        renderProjectExplorerMessage(err.message || "Could not list project files.", "warning");
        if (activityId) updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        if (!silent) showToast(`Could not browse project: ${err.message}`, "error");
    }
}

function openProjectContentDialog({
    title = "Project file",
    subtitle = "",
    content = "",
    primaryLabel = "",
    onPrimary = null
} = {}) {
    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "approval-dialog project-content-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "projectContentDialogTitle");
    const titleNode = document.createElement("h2");
    titleNode.id = "projectContentDialogTitle";
    titleNode.textContent = title;
    const subtitleNode = document.createElement("p");
    subtitleNode.className = "project-content-subtitle";
    subtitleNode.textContent = subtitle;
    const pre = document.createElement("pre");
    pre.className = "project-content-preview";
    pre.textContent = content || "[No content]";
    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const closeButton = document.createElement("button");
    closeButton.className = "provider-btn provider-btn-secondary";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
    };
    closeButton.addEventListener("click", close);
    if (primaryLabel && typeof onPrimary === "function") {
        const primaryButton = document.createElement("button");
        primaryButton.className = "provider-btn provider-btn-primary";
        primaryButton.type = "button";
        primaryButton.textContent = primaryLabel;
        primaryButton.addEventListener("click", () => {
            onPrimary();
            close();
        });
        actions.append(closeButton, primaryButton);
    } else {
        actions.appendChild(closeButton);
    }
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    dialog.append(titleNode);
    if (subtitle) dialog.appendChild(subtitleNode);
    dialog.append(pre, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => closeButton.focus(), 0);
}

async function openProjectFilePreview(path = "") {
    const cleanPath = normalizeProjectExplorerPath(path);
    if (!cleanPath || cleanPath === ".") return;
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Connect the Local Workspace Bridge first.", "warning");
        return;
    }
    const activityId = recordAgentActivity({
        kind: "file",
        label: "Read file",
        detail: cleanPath,
        status: "running"
    });
    try {
        const result = await readWorkspaceFile(cleanPath, null, getActiveProjectBridgeOptions());
        updateAgentActivityEvent(activityId, { status: "done" });
        const nextFile = {
            path: normalizeProjectExplorerPath(result.path || cleanPath),
            name: getProjectFileDisplayName(result.path || cleanPath),
            content: result.content || "",
            size: Number(result.size || 0),
            truncated: Boolean(result.truncated)
        };
        setActiveProjectFileForCurrentTab(nextFile);
        expandProjectExplorerAncestors(activeProjectFile.path);
        openProjectWorkspacePanel("files", { refresh: false });
        renderProjectExplorerCurrentEntries();
        renderProjectFileViewer();
        persistActiveWorkspacePanelState();
    } catch (err) {
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Could not read file: ${err.message}`, "error");
    }
}

function getProjectCommandStatus(result = {}) {
    if (result.timedOut) return "Timed out";
    return Number(result.exitCode || 0) === 0 ? "Passed" : "Failed";
}

function getProjectCommandSignalLine(result = {}) {
    const text = String(result.stderr || result.stdout || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);
    return text || "No command output.";
}

function formatProjectCommandOutput(result = {}) {
    const status = getProjectCommandStatus(result);
    const stdout = trimLocalToolText ? trimLocalToolText(result.stdout || "") : String(result.stdout || "");
    const stderr = trimLocalToolText ? trimLocalToolText(result.stderr || "") : String(result.stderr || "");
    const exitCode = Number(result.exitCode ?? 0);
    const needsStatus = result.timedOut || exitCode !== 0 || result.signal;
    const output = [stdout, stderr].filter(Boolean).join("\n");
    return [
        output || "(no output)",
        needsStatus ? `[${status} / exit ${result.exitCode ?? "timeout"} / ${getProjectCommandSignalLine(result)}]` : ""
    ].filter(Boolean).join("\n");
}

function getProjectTerminalPrompt() {
    const root = getSessionProjectRoot();
    const rootLabel = (root?.name || "workspace").replace(/\s+/g, "-");
    const pathLabel = activeProjectExplorerPath && activeProjectExplorerPath !== "." ? ` ${activeProjectExplorerPath}` : "";
    return `PS ${rootLabel}${pathLabel}>`;
}

function isProjectTerminalClearCommand(value = "") {
    const command = String(value || "").trim().toLowerCase();
    return command === "cls" || command === "clear" || command === "clear-host";
}

function getProjectTerminalApi() {
    const projectsApi = getFaunaDesktopApi()?.projects;
    if (
        typeof projectsApi?.startTerminalSession === "function"
        && typeof projectsApi?.writeTerminalSession === "function"
        && typeof projectsApi?.onTerminalData === "function"
    ) {
        return projectsApi;
    }
    return null;
}

function getActiveProjectTerminalKey(tabKey = activeProjectAgentTab) {
    const key = normalizeProjectAgentTabKey(tabKey);
    if (normalizeProjectAgentTab(key) === "terminal") return key;
    return activeProjectAgentTabs.find(tab => normalizeProjectAgentTab(tab) === "terminal") || "terminal";
}

function createProjectTerminalState(rootId = "") {
    return {
        rootId,
        lines: [],
        sessionId: "",
        sessionRootId: "",
        newline: "\n",
        starting: false,
        buffer: "",
        draft: ""
    };
}

function getExistingProjectTerminalState(tabKey = activeProjectAgentTab) {
    return projectTerminalStates.get(getActiveProjectTerminalKey(tabKey)) || null;
}

function getProjectTerminalState(tabKey = activeProjectAgentTab, root = getSessionProjectRoot()) {
    const key = getActiveProjectTerminalKey(tabKey);
    const rootId = root?.id || "";
    let state = projectTerminalStates.get(key);
    if (!state || state.rootId !== rootId) {
        const oldSessionId = state?.sessionId || "";
        if (oldSessionId) {
            try {
                void getProjectTerminalApi()?.stopTerminalSession?.({ sessionId: oldSessionId });
            } catch {
                // The shell may already have exited.
            }
        }
        state = createProjectTerminalState(rootId);
        projectTerminalStates.set(key, state);
    }
    return state;
}

function findProjectTerminalStateBySessionId(sessionId = "") {
    const cleanSessionId = String(sessionId || "");
    if (!cleanSessionId) return null;
    for (const state of projectTerminalStates.values()) {
        if (state?.sessionId === cleanSessionId) return state;
    }
    return null;
}

function isActiveProjectTerminalState(state) {
    return Boolean(state && getExistingProjectTerminalState(activeProjectAgentTab) === state);
}

function appendProjectTerminalStateText(state, text = "") {
    if (!state) return;
    state.buffer = `${state.buffer || ""}${String(text || "")}`.slice(-120000);
}

const ANSI_TERMINAL_FG_CLASSES = [
    "ansi-fg-black",
    "ansi-fg-red",
    "ansi-fg-green",
    "ansi-fg-yellow",
    "ansi-fg-blue",
    "ansi-fg-magenta",
    "ansi-fg-cyan",
    "ansi-fg-white",
    "ansi-fg-bright-black",
    "ansi-fg-bright-red",
    "ansi-fg-bright-green",
    "ansi-fg-bright-yellow",
    "ansi-fg-bright-blue",
    "ansi-fg-bright-magenta",
    "ansi-fg-bright-cyan",
    "ansi-fg-bright-white"
];

function getAnsiTerminalClassName(codes = []) {
    const classes = new Set();
    codes.forEach(code => {
        if (code === 1) classes.add("ansi-bold");
        if (code === 2) classes.add("ansi-dim");
        if (code >= 30 && code <= 37) classes.add(ANSI_TERMINAL_FG_CLASSES[code - 30]);
        if (code >= 90 && code <= 97) classes.add(ANSI_TERMINAL_FG_CLASSES[code - 90 + 8]);
    });
    return [...classes].join(" ");
}

function formatAnsiTerminalOutput(value = "") {
    const text = String(value || "");
    const matcher = /\x1b\[([0-9;]*)m/g;
    let match = null;
    let index = 0;
    let activeCodes = [];
    let html = "";
    const appendText = chunk => {
        if (!chunk) return;
        const className = getAnsiTerminalClassName(activeCodes);
        html += className
            ? `<span class="${className}">${escapeHtml(chunk)}</span>`
            : escapeHtml(chunk);
    };
    while ((match = matcher.exec(text))) {
        appendText(text.slice(index, match.index));
        const codes = (match[1] || "0")
            .split(";")
            .filter(valuePart => valuePart !== "")
            .map(valuePart => Number(valuePart) || 0);
        codes.forEach(code => {
            if (code === 0) {
                activeCodes = [];
            } else if (code === 22) {
                activeCodes = activeCodes.filter(activeCode => activeCode !== 1 && activeCode !== 2);
            } else if (code === 39) {
                activeCodes = activeCodes.filter(activeCode => !(activeCode >= 30 && activeCode <= 37) && !(activeCode >= 90 && activeCode <= 97));
            } else if (code === 1 || code === 2 || (code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
                if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
                    activeCodes = activeCodes.filter(activeCode => !(activeCode >= 30 && activeCode <= 37) && !(activeCode >= 90 && activeCode <= 97));
                }
                if (!activeCodes.includes(code)) activeCodes.push(code);
            }
        });
        index = matcher.lastIndex;
    }
    appendText(text.slice(index));
    return html;
}

function getProjectTerminalCursorHtml() {
    return '<span class="project-terminal-cursor" aria-hidden="true"></span>';
}

function renderProjectTerminalOutput(text = "") {
    if (!projectCommandOutput) return;
    projectCommandOutput.hidden = false;
    const outputHtml = formatAnsiTerminalOutput(text) || escapeHtml(`${getProjectTerminalPrompt()} `);
    projectCommandOutput.innerHTML = `${outputHtml}${getProjectTerminalCursorHtml()}`;
    projectCommandOutput.scrollTop = projectCommandOutput.scrollHeight;
}

function ensureProjectTerminalDataListener(api = getProjectTerminalApi()) {
    if (projectTerminalDataUnsubscribe || !api) return;
    projectTerminalDataUnsubscribe = api.onTerminalData(payload => {
        const state = findProjectTerminalStateBySessionId(payload?.sessionId);
        if (!state) return;
        if (payload.data) appendProjectTerminalStateText(state, payload.data);
        if (payload.type === "exit" || payload.type === "error") {
            state.sessionId = "";
            state.sessionRootId = "";
            state.starting = false;
            state.draft = "";
        }
        if (isActiveProjectTerminalState(state)) {
            renderProjectTerminal({ includeDraft: true });
        }
    });
}

async function stopProjectTerminalSession(tabKey = activeProjectAgentTab) {
    const state = getExistingProjectTerminalState(tabKey);
    if (!state?.sessionId) return;
    const sessionId = state.sessionId;
    state.sessionId = "";
    state.sessionRootId = "";
    state.draft = "";
    state.starting = false;
    try {
        await getProjectTerminalApi()?.stopTerminalSession?.({ sessionId });
    } catch {
        // The shell may already have exited.
    }
}

async function ensureProjectTerminalSession() {
    const root = getSessionProjectRoot();
    const api = getProjectTerminalApi();
    const state = getProjectTerminalState(activeProjectAgentTab, root);
    if (!root || !api) {
        renderProjectTerminal();
        return;
    }
    ensureProjectTerminalDataListener(api);
    if (state.sessionId && state.sessionRootId === root.id) {
        renderProjectTerminal();
        return;
    }
    await stopProjectTerminalSession(activeProjectAgentTab);
    state.sessionRootId = root.id;
    state.starting = true;
    state.buffer = `Starting terminal in ${root.path}...\n`;
    state.draft = "";
    renderProjectTerminal({ includeDraft: false });
    try {
        const result = await api.startTerminalSession({ projectPath: root.path });
        if (result?.ok === false) throw new Error(result.message || "Terminal could not be started.");
        state.sessionId = String(result.sessionId || "");
        state.sessionRootId = root.id;
        state.newline = String(result.newline || "\n");
        state.starting = false;
        state.buffer = `Started ${result.command || "terminal"} in ${root.path}\n`;
        if (isActiveProjectTerminalState(state)) renderProjectTerminal();
    } catch (err) {
        state.sessionId = "";
        state.sessionRootId = "";
        state.starting = false;
        state.draft = "";
        state.buffer = `Could not start terminal session: ${err.message}\n\n${getProjectTerminalPrompt()} `;
        if (isActiveProjectTerminalState(state)) renderProjectTerminal({ includeDraft: false });
        showToast(`Could not start terminal: ${err.message}`, "error");
    }
}

function renderProjectTerminal({ includeDraft = true } = {}) {
    const state = getProjectTerminalState();
    if (!projectCommandOutput) return;
    if (state.sessionId || state.starting || state.buffer) {
        const draft = includeDraft && state.draft ? state.draft : "";
        if (state.buffer) {
            renderProjectTerminalOutput(`${state.buffer}${draft}`);
        } else if (state.starting) {
            renderProjectTerminalOutput("Starting terminal...");
        } else {
            renderProjectTerminalOutput(`${getProjectTerminalPrompt()} ${draft}`);
        }
        return;
    }
    state.lines = state.lines.slice(-260);
    const lines = state.lines.slice();
    if (includeDraft) {
        lines.push(`${getProjectTerminalPrompt()} ${state.draft || ""}`);
    }
    renderProjectTerminalOutput(lines.join("\n") || `${getProjectTerminalPrompt()} `);
}

function focusProjectTerminalInput() {
    const state = getProjectTerminalState();
    if (getProjectTerminalApi()) {
        if (document.activeElement !== projectCommandOutput) projectCommandOutput?.focus?.();
        void ensureProjectTerminalSession();
        return;
    }
    if (projectCommandInput) projectCommandInput.value = state.draft || "";
    projectCommandInput?.focus?.();
    renderProjectTerminal();
}

function handleProjectTerminalKeydown(event) {
    const terminalApi = getProjectTerminalApi();
    const state = getProjectTerminalState();
    if (terminalApi) {
        if (!state.sessionId) {
            event.preventDefault();
            void ensureProjectTerminalSession();
            return;
        }
        if (event.ctrlKey && event.key.toLowerCase() === "c") {
            event.preventDefault();
            state.draft = "";
            void terminalApi.writeTerminalSession({ sessionId: state.sessionId, data: "\x03" });
            renderProjectTerminal();
            return;
        }
        if (event.metaKey || event.altKey || (event.ctrlKey && event.key.toLowerCase() !== "v")) return;
        if (event.key === "Enter") {
            event.preventDefault();
            if (isProjectTerminalClearCommand(state.draft)) {
                state.buffer = "";
                state.lines = [];
                state.draft = "";
                renderProjectTerminal();
                return;
            }
            const data = `${state.draft}${state.newline || "\n"}`;
            state.draft = "";
            void terminalApi.writeTerminalSession({ sessionId: state.sessionId, data });
            renderProjectTerminal();
            return;
        }
        if (event.key === "Backspace") {
            event.preventDefault();
            state.draft = state.draft.slice(0, -1);
            renderProjectTerminal();
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            state.draft += "    ";
            renderProjectTerminal();
            return;
        }
        if (event.key.length === 1) {
            event.preventDefault();
            state.draft += event.key;
            renderProjectTerminal();
        }
        return;
    }
    if (!projectCommandInput || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Enter") {
        event.preventDefault();
        void runProjectCommandFromPanel();
        return;
    }
    if (event.key === "Backspace") {
        event.preventDefault();
        state.draft = state.draft.slice(0, -1);
        projectCommandInput.value = state.draft;
        focusProjectTerminalInput();
        return;
    }
    if (event.key.length === 1) {
        event.preventDefault();
        state.draft += event.key;
        projectCommandInput.value = state.draft;
        focusProjectTerminalInput();
    }
}

function handleProjectTerminalPaste(event) {
    const text = event.clipboardData?.getData("text") || "";
    if (!text) return;
    const api = getProjectTerminalApi();
    const state = getProjectTerminalState();
    event.preventDefault();
    state.draft += text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (!api && projectCommandInput) projectCommandInput.value = state.draft;
    renderProjectTerminal();
}

async function runProjectCommandFromPanel() {
    const state = getProjectTerminalState();
    const command = String(state.draft || projectCommandInput?.value || "").trim();
    if (isProjectTerminalClearCommand(command)) {
        state.lines = [];
        state.buffer = "";
        state.draft = "";
        if (projectCommandInput) projectCommandInput.value = "";
        renderProjectTerminal();
        return;
    }
    if (!command) {
        showToast("Enter a command first.", "warning");
        return;
    }
    if (!getSessionProjectRoot()) {
        showToast("Select a project first.", "warning");
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Connect the Local Workspace Bridge first.", "warning");
        return;
    }
    const activityId = recordAgentActivity({
        kind: "terminal",
        label: "Run command",
        detail: command,
        status: "running"
    });
    if (projectCommandRunBtn) projectCommandRunBtn.disabled = true;
    const runningIndex = state.lines.push(`${getProjectTerminalPrompt()} ${command}`, "Running...") - 1;
    state.draft = "";
    if (projectCommandInput) projectCommandInput.value = "";
    renderProjectTerminal({ includeDraft: false });
    try {
        const result = await runWorkspaceCommand(command, activeProjectExplorerPath || ".", 60, null, getActiveProjectBridgeOptions());
        const output = formatProjectCommandOutput(result);
        state.lines[runningIndex] = output;
        renderProjectTerminal();
        updateAgentActivityEvent(activityId, {
            status: Number(result.exitCode || 0) === 0 && !result.timedOut ? "done" : "failed",
            detail: `${command} / ${getProjectCommandStatus(result)}`
        });
        void refreshProjectBranchSummary();
    } catch (err) {
        state.lines[runningIndex] = `Command failed: ${err.message}`;
        renderProjectTerminal();
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Command failed: ${err.message}`, "error");
    } finally {
        if (projectCommandRunBtn) projectCommandRunBtn.disabled = false;
        persistActiveWorkspacePanelState();
    }
}

function getActiveProjectPageChatKey(tabKey = activeProjectAgentTab) {
    const key = normalizeProjectAgentTabKey(tabKey);
    return normalizeProjectAgentTab(key) === "chat" ? key : "chat";
}

function renderProjectPageChatHistory(root = getSessionProjectRoot(), history = projectPageChatHistory) {
    if (!projectPageChatLog) return;
    if (!Array.isArray(history) || history.length === 0) {
        const empty = document.createElement("div");
        empty.className = "project-page-chat-empty";
        empty.textContent = root
            ? `Ask about ${root.name}. The AI can use this project's files and terminal tools.`
            : "Select a project chat first to use workspace side chat.";
        projectPageChatLog.replaceChildren(empty);
        return;
    }
    projectPageChatLog.replaceChildren();
    history.forEach(message => {
        appendProjectPageChatMessage(message?.role || "assistant", message?.content || "");
    });
}

function syncProjectPageChatStateForActiveTab({ render = true } = {}) {
    const root = getSessionProjectRoot();
    const rootId = root?.id || "";
    const tabKey = getActiveProjectPageChatKey();
    let state = projectPageChatStates.get(tabKey);
    if (!state || state.rootId !== rootId) {
        state = { rootId, history: [] };
        projectPageChatStates.set(tabKey, state);
    }
    projectPageChatRootId = rootId;
    projectPageChatHistory = state.history;
    if (render) renderProjectPageChatHistory(root, projectPageChatHistory);
    return root;
}

function resetProjectPageChat(root = getSessionProjectRoot()) {
    const tabKey = getActiveProjectPageChatKey();
    projectPageChatRootId = root?.id || "";
    projectPageChatHistory = [];
    projectPageChatStates.set(tabKey, { rootId: projectPageChatRootId, history: projectPageChatHistory });
    if (!projectPageChatLog) return;
    const empty = document.createElement("div");
    empty.className = "project-page-chat-empty";
    empty.textContent = root
        ? `Ask about ${root.name}. The AI can use this project's files and terminal tools.`
        : "Select a project chat first to use workspace side chat.";
    projectPageChatLog.replaceChildren(empty);
}

function ensureProjectPageChatRoot() {
    const root = getSessionProjectRoot();
    const rootId = root?.id || "";
    const tabKey = getActiveProjectPageChatKey();
    const state = projectPageChatStates.get(tabKey);
    if (!state || state.rootId !== rootId || state.history !== projectPageChatHistory) {
        syncProjectPageChatStateForActiveTab();
    }
    return root;
}

function appendProjectPageChatMessage(role, content = "") {
    if (!projectPageChatLog) return null;
    projectPageChatLog.querySelector(".project-page-chat-empty")?.remove();
    const message = document.createElement("div");
    message.className = `project-page-chat-message project-page-chat-message-${role}`;
    const label = document.createElement("div");
    label.className = "project-page-chat-role";
    label.textContent = role === "user" ? "You" : role === "assistant" ? "Fauna" : "System";
    const body = document.createElement("div");
    body.className = "project-page-chat-body";
    if (role === "assistant" && typeof renderMarkdown === "function") {
        body.innerHTML = renderMarkdown(content || "");
    } else {
        body.textContent = content || "";
    }
    message.append(label, body);
    projectPageChatLog.appendChild(message);
    projectPageChatLog.scrollTop = projectPageChatLog.scrollHeight;
    return body;
}

function isDuplicateProjectPageChatAttachment(file) {
    const incomingPath = String(file?.__faunaDesktopFilePath || "").trim();
    return projectPageChatAttachedFiles.some(existing => (
        incomingPath && incomingPath === String(existing.__faunaDesktopFilePath || "").trim()
    ) || (
        existing.name === file.name
        && existing.size === file.size
        && existing.type === file.type
    ));
}

function renderProjectPageChatPreviewPill(file) {
    if (!projectPageChatPreviewContainer) return;
    const isImage = file.type?.startsWith("image/");
    const pill = document.createElement("div");
    pill.className = `preview-pill ${isImage ? "preview-image-tile" : "preview-file-pill"}`;

    const icon = document.createElement("span");
    icon.className = "preview-file-icon";
    icon.setAttribute("aria-hidden", "true");

    if (isImage) {
        const img = document.createElement("img");
        const desktopPreview = getDesktopFilePreviewSource(file);
        const objectUrl = desktopPreview || URL.createObjectURL(file);
        img.src = objectUrl;
        img.className = "preview-file-thumb";
        img.onload = () => {
            if (!desktopPreview) URL.revokeObjectURL(objectUrl);
        };
        icon.appendChild(img);
    } else if (isCodeLikeAttachment(file)) {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>`;
    } else {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`;
    }

    const meta = document.createElement("span");
    meta.className = "preview-file-meta";
    const nameSpan = document.createElement("span");
    nameSpan.className = "preview-file-name";
    nameSpan.textContent = file.name;
    const kindSpan = document.createElement("span");
    kindSpan.className = "preview-file-type";
    kindSpan.textContent = getAttachmentKindLabel(file);
    meta.append(nameSpan, kindSpan);

    const closeBtn = document.createElement("button");
    closeBtn.className = "remove-preview";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", `Remove ${file.name}`);
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    closeBtn.onclick = () => {
        projectPageChatAttachedFiles = projectPageChatAttachedFiles.filter(item => item !== file);
        pill.remove();
    };

    pill.append(icon, meta, closeBtn);
    projectPageChatPreviewContainer.appendChild(pill);
}

function addProjectPageChatAttachedFile(file, { notify = true } = {}) {
    if (!(file instanceof File)) return false;
    prepareDesktopFileReference(file);
    const unsupportedReason = getUnsupportedAttachmentReason(file);
    if (unsupportedReason) {
        if (notify) showUnsupportedAttachmentToast([{ file, reason: unsupportedReason }]);
        return false;
    }
    if (isDuplicateProjectPageChatAttachment(file)) return false;
    projectPageChatAttachedFiles.push(file);
    renderProjectPageChatPreviewPill(file);
    return true;
}

function addProjectPageChatAttachedFiles(files) {
    let added = 0;
    const rejected = [];
    Array.from(files || []).forEach(file => {
        const unsupportedReason = getUnsupportedAttachmentReason(file);
        if (unsupportedReason) {
            rejected.push({ file, reason: unsupportedReason });
            return;
        }
        if (addProjectPageChatAttachedFile(file, { notify: false })) added += 1;
    });
    showUnsupportedAttachmentToast(rejected);
    return added;
}

function clearProjectPageChatAttachments() {
    projectPageChatAttachedFiles = [];
    if (projectPageChatPreviewContainer) projectPageChatPreviewContainer.innerHTML = "";
    if (projectPageChatFileInput) projectPageChatFileInput.value = "";
}

function setProjectPageChatAttachmentMenuOpen(open, { focusMenu = false } = {}) {
    if (!projectPageChatAttachmentMenu || !projectPageChatUploadButton) return;
    if (open && !canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    const isOpen = Boolean(open);
    projectPageChatAttachmentMenu.hidden = !isOpen;
    projectPageChatUploadButton.setAttribute("aria-expanded", String(isOpen));
    projectPageChatUploadButton.classList.toggle("active", isOpen);
    if (isOpen) {
        projectPageChatToolsDropdown?.classList.remove("open");
        toolsDropdown?.classList.remove("open");
        if (typeof closeAttachmentMenu === "function") closeAttachmentMenu();
        if (focusMenu) {
            window.setTimeout(() => projectPageChatAttachmentMenu.querySelector(".attachment-menu-item")?.focus({ preventScroll: true }), 0);
        }
    }
}

function closeProjectPageChatAttachmentMenu() {
    setProjectPageChatAttachmentMenuOpen(false);
}

function toggleProjectPageChatAttachmentMenu() {
    setProjectPageChatAttachmentMenuOpen(projectPageChatAttachmentMenu?.hidden !== false, { focusMenu: true });
}

async function buildProjectPageChatAttachmentMessageContent(prompt, files = [], signal = null) {
    let content = String(prompt || "").trim();
    const images = [];
    const openAiImageFileIds = [];

    for (const file of files) {
        const unsupportedReason = getUnsupportedAttachmentReason(file);
        if (unsupportedReason) throw new Error(unsupportedReason);
        if (file.type?.startsWith("image/")) {
            if (isOpenAiProvider()) {
                const preparedImage = await prepareOpenAiVisionImage(file, signal);
                openAiImageFileIds.push(preparedImage.fileId);
            } else {
                images.push(await fileToBase64(file));
            }
            continue;
        }

        try {
            const textContent = await file.text();
            content += `\n\n--- Attached File Content: ${file.name} ---\n${textContent}\n-----------------------`;
        } catch {
            content += `\n\n[Error reading file context item: ${file.name}]`;
        }
    }

    return { content: content || `[${files.length} attachment${files.length === 1 ? "" : "s"}]`, images, openAiImageFileIds };
}

function setProjectPageChatBusy(busy) {
    if (projectPageChatSendBtn) {
        const isBusy = Boolean(busy);
        const idleState = projectPageChatSendBtn.querySelector("[data-send-state='idle']");
        const loadingState = projectPageChatSendBtn.querySelector("[data-send-state='loading']");
        projectPageChatSendBtn.disabled = isBusy;
        projectPageChatSendBtn.setAttribute("aria-busy", String(isBusy));
        if (idleState) idleState.hidden = isBusy;
        if (loadingState) loadingState.hidden = !isBusy;
    }
    if (projectPageChatInput) projectPageChatInput.disabled = Boolean(busy);
    if (projectPageChatStopBtn) projectPageChatStopBtn.hidden = !busy;
}

async function sendProjectPageChatMessage() {
    const prompt = String(projectPageChatInput?.value || "").trim();
    const files = [...projectPageChatAttachedFiles];
    if (!prompt && files.length === 0) return;
    const root = syncProjectPageChatStateForActiveTab({ render: false });
    if (!root) {
        showToast("Start or select a project chat first.", "warning");
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Connect the Local Workspace Bridge first.", "warning");
        return;
    }
    if (!canUseComposerTools()) {
        showToast(`${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`, "warning");
        return;
    }

    const controller = new AbortController();
    projectPageChatAbortController = controller;
    let attachmentPayload;
    try {
        attachmentPayload = await buildProjectPageChatAttachmentMessageContent(prompt, files, controller.signal);
    } catch (err) {
        projectPageChatAbortController = null;
        showToast(`Attachment failed: ${err.message}`, "error");
        return;
    }

    const visiblePrompt = [
        prompt,
        files.length > 0 ? `Attached: ${files.map(file => file.name || "file").join(", ")}` : ""
    ].filter(Boolean).join("\n\n");

    const userMessage = {
        role: "user",
        content: attachmentPayload.content,
        createdAt: new Date().toISOString()
    };
    if (attachmentPayload.images.length > 0) userMessage.images = attachmentPayload.images;
    if (attachmentPayload.openAiImageFileIds.length > 0) userMessage.openAiImageFileIds = attachmentPayload.openAiImageFileIds;
    projectPageChatHistory.push(userMessage);
    appendProjectPageChatMessage("user", visiblePrompt || userMessage.content);
    if (projectPageChatInput) {
        projectPageChatInput.value = "";
        projectPageChatInput.style.height = "";
    }
    clearProjectPageChatAttachments();

    const assistantBody = appendProjectPageChatMessage("assistant", "Thinking...");
    setProjectPageChatBusy(true);
    const routedModel = chooseModelForRequest(prompt, files, null, null);
    const activityId = recordAgentActivity({
        kind: "chat",
        label: "Side chat",
        detail: prompt,
        status: "running"
    });

    try {
        const data = await sendOllamaChatWithLocalTools(
            projectPageChatHistory,
            {
                ...getActiveChatRequestOptions(),
                sessionId: activeSessionId
            },
            routedModel,
            controller.signal,
            assistantBody,
            {
                enabled: true,
                preserveActiveModel: shouldPreserveActiveLocalModelForRoute(routedModel)
            }
        );
        const assistantMessage = getAssistantMessageForConversation(data, routedModel);
        projectPageChatHistory.push(assistantMessage);
        if (!data.__faunaAlreadyRendered) {
            assistantBody.innerHTML = typeof renderMarkdown === "function"
                ? renderMarkdown(assistantMessage.content || "")
                : "";
            if (!assistantBody.innerHTML) assistantBody.textContent = assistantMessage.content || "";
        }
        if (typeof setupCodeSandbox === "function") setupCodeSandbox(assistantBody);
        updateAgentActivityEvent(activityId, { status: "done", detail: prompt });
    } catch (err) {
        assistantBody.textContent = `Side chat failed: ${err.message}`;
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Side chat failed: ${err.message}`, "error");
    } finally {
        projectPageChatAbortController = null;
        setProjectPageChatBusy(false);
        projectPageChatInput?.focus?.();
        projectPageChatLog.scrollTop = projectPageChatLog.scrollHeight;
        persistActiveWorkspacePanelState();
    }
}

function captureWorkspacePanelState() {
    if (normalizeProjectAgentTab(activeProjectAgentTab) === "files") {
        setActiveProjectFileForCurrentTab(activeProjectFile);
    }
    if (normalizeProjectAgentTab(activeProjectAgentTab) === "chat") {
        const chatKey = getActiveProjectPageChatKey();
        projectPageChatStates.set(chatKey, {
            rootId: projectPageChatRootId,
            history: Array.isArray(projectPageChatHistory) ? projectPageChatHistory : []
        });
    }
    const fileStates = [...projectFileStates.entries()].map(([tabKey, state]) => ({
        tabKey,
        rootId: state?.rootId || "",
        file: normalizeProjectFileStateFile(state?.file)
    }));
    const sideChatStates = [...projectPageChatStates.entries()].map(([tabKey, state]) => ({
        tabKey,
        rootId: state?.rootId || "",
        history: Array.isArray(state?.history) ? state.history : []
    }));
    const terminalStates = [...projectTerminalStates.entries()].map(([tabKey, state]) => ({
        tabKey,
        rootId: state?.rootId || "",
        lines: Array.isArray(state?.lines) ? state.lines : [],
        buffer: state?.buffer || "",
        draft: state?.draft || ""
    }));
    return normalizeStoredWorkspacePanelState({
        activeTab: activeProjectAgentTab,
        tabs: activeProjectAgentTabs,
        explorerPath: activeProjectExplorerPath,
        expandedPaths: [...activeProjectExplorerExpandedPaths],
        fileStates,
        sideChatStates,
        terminalStates
    });
}

function restoreWorkspacePanelState(raw = null) {
    const state = normalizeStoredWorkspacePanelState(raw);
    activeProjectAgentTabs = normalizeProjectAgentTabs(state.tabs);
    activeProjectAgentTab = activeProjectAgentTabs.includes(state.activeTab)
        ? state.activeTab
        : (activeProjectAgentTabs[0] || "menu");
    activeProjectExplorerPath = state.explorerPath || ".";
    activeProjectExplorerExpandedPaths = new Set(state.expandedPaths || []);

    projectFileStates.clear();
    state.fileStates.forEach(item => {
        projectFileStates.set(item.tabKey, {
            rootId: item.rootId || "",
            file: normalizeProjectFileStateFile(item.file)
        });
    });

    projectPageChatStates.clear();
    state.sideChatStates.forEach(item => {
        projectPageChatStates.set(item.tabKey, {
            rootId: item.rootId || "",
            history: Array.isArray(item.history) ? item.history : []
        });
    });

    projectTerminalStates.forEach((_state, tabKey) => {
        void stopProjectTerminalSession(tabKey);
    });
    projectTerminalStates.clear();
    state.terminalStates.forEach(item => {
        const terminalState = createProjectTerminalState(item.rootId || "");
        terminalState.lines = Array.isArray(item.lines) ? item.lines : [];
        terminalState.buffer = item.buffer || "";
        terminalState.draft = item.draft || "";
        projectTerminalStates.set(item.tabKey, terminalState);
    });

    projectPageChatRootId = "";
    projectPageChatHistory = [];
    activeProjectFile = null;
    if (normalizeProjectAgentTab(activeProjectAgentTab) === "files") {
        syncProjectFileStateForActiveTab({ render: false });
    }
    if (normalizeProjectAgentTab(activeProjectAgentTab) === "chat") {
        syncProjectPageChatStateForActiveTab({ render: false });
    }
}

function persistActiveWorkspacePanelState() {
    const session = getActiveSession();
    if (!session) return null;
    session.workspacePanelState = captureWorkspacePanelState();
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    return session.workspacePanelState;
}

async function openProjectDiffReview() {
    if (!getSessionProjectRoot()) {
        showToast("Select a project first.", "warning");
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Connect the Local Workspace Bridge first.", "warning");
        return;
    }
    const activityId = recordAgentActivity({
        kind: "diff",
        label: "Review changes",
        detail: "git diff",
        status: "running"
    });
    try {
        const bridgeOptions = getActiveProjectBridgeOptions();
        const stat = await runWorkspaceCommand("git diff --stat -- .", ".", 20, null, bridgeOptions);
        const diff = await runWorkspaceCommand("git diff -- .", ".", 20, null, bridgeOptions);
        const statText = String(stat.stdout || stat.stderr || "").trim();
        const diffText = String(diff.stdout || diff.stderr || "").trim();
        const content = [
            statText || "No diff stat output.",
            diffText ? `\n${diffText}` : "\nNo working tree changes."
        ].join("\n");
        updateAgentActivityEvent(activityId, { status: "done" });
        openProjectContentDialog({
            title: "Review changes",
            subtitle: "Current project working tree diff",
            content
        });
    } catch (err) {
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Could not review diff: ${err.message}`, "error");
    }
}

function openProjectInstructionsDialog(root = getSessionProjectRoot()) {
    const project = root?.project || getWorkspaceProjectById(root?.projectId || root?.id);
    if (!project) {
        showToast("Select a project first.", "warning");
        return;
    }
    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "approval-dialog project-dialog project-instructions-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "projectInstructionsTitle");
    const titleNode = document.createElement("h2");
    titleNode.id = "projectInstructionsTitle";
    titleNode.textContent = "Project instructions";
    const message = document.createElement("p");
    message.textContent = `Saved instructions for ${project.name}. Fauna includes them whenever this project or one of its worktrees is selected.`;
    const label = document.createElement("label");
    label.className = "chat-rename-field project-instructions-field";
    const labelText = document.createElement("span");
    labelText.textContent = "Instructions";
    const textarea = document.createElement("textarea");
    textarea.className = "settings-input project-instructions-textarea";
    textarea.rows = 10;
    textarea.maxLength = 6000;
    textarea.value = project.instructions || "";
    label.append(labelText, textarea);
    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "provider-btn provider-btn-secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    const saveButton = document.createElement("button");
    saveButton.className = "provider-btn provider-btn-primary";
    saveButton.type = "button";
    saveButton.textContent = "Save";
    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const save = () => {
        project.instructions = normalizeProjectInstructions(textarea.value);
        project.updatedAt = new Date().toISOString();
        persistWorkspaceProjects();
        showToast(project.instructions ? "Project instructions saved." : "Project instructions cleared.", project.instructions ? "success" : "info");
        close();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") save();
    };
    cancelButton.addEventListener("click", close);
    saveButton.addEventListener("click", save);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    actions.append(cancelButton, saveButton);
    dialog.append(titleNode, message, label, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => textarea.focus(), 0);
}

function shouldRequireWorkspaceWriteApproval() {
    return activeAgentTaskMode !== "build";
}

function createSimpleWorkspaceDiff(path = "file", before = "", after = "") {
    if (before === after) return "No content changes.";
    const beforeLines = String(before || "").split(/\r?\n/);
    const afterLines = String(after || "").split(/\r?\n/);
    let start = 0;
    while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
        start += 1;
    }
    let beforeEnd = beforeLines.length - 1;
    let afterEnd = afterLines.length - 1;
    while (beforeEnd >= start && afterEnd >= start && beforeLines[beforeEnd] === afterLines[afterEnd]) {
        beforeEnd -= 1;
        afterEnd -= 1;
    }
    const contextStart = Math.max(0, start - 3);
    const contextEndBefore = Math.min(beforeLines.length - 1, beforeEnd + 3);
    const contextEndAfter = Math.min(afterLines.length - 1, afterEnd + 3);
    const lines = [`--- ${path}`, `+++ ${path}`];
    for (let index = contextStart; index < start; index += 1) {
        lines.push(` ${beforeLines[index] || ""}`);
    }
    for (let index = start; index <= beforeEnd; index += 1) {
        lines.push(`-${beforeLines[index] || ""}`);
    }
    for (let index = start; index <= afterEnd; index += 1) {
        lines.push(`+${afterLines[index] || ""}`);
    }
    const trailingStart = Math.max(start, beforeEnd + 1, afterEnd + 1);
    const trailingCount = Math.max(contextEndBefore, contextEndAfter) - trailingStart + 1;
    for (let offset = 0; offset < trailingCount; offset += 1) {
        const value = beforeLines[trailingStart + offset] ?? afterLines[trailingStart + offset] ?? "";
        lines.push(` ${value}`);
    }
    return lines.join("\n");
}

function showWorkspaceDiffApprovalDialog({ path = "", mode = "write", diff = "" } = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "approval-modal";
        overlay.setAttribute("role", "presentation");
        const dialog = document.createElement("section");
        dialog.className = "approval-dialog project-content-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "workspaceDiffApprovalTitle");
        const titleNode = document.createElement("h2");
        titleNode.id = "workspaceDiffApprovalTitle";
        titleNode.textContent = "Review file change";
        const message = document.createElement("p");
        message.className = "project-content-subtitle";
        message.textContent = `${mode === "append_file" ? "Append to" : "Write"} ${path}`;
        const pre = document.createElement("pre");
        pre.className = "project-content-preview project-diff-preview";
        pre.textContent = diff || "[No diff preview]";
        const actions = document.createElement("div");
        actions.className = "approval-actions";
        const cancelButton = document.createElement("button");
        cancelButton.className = "provider-btn provider-btn-secondary";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        const applyButton = document.createElement("button");
        applyButton.className = "provider-btn provider-btn-primary";
        applyButton.type = "button";
        applyButton.textContent = "Apply change";
        const close = approved => {
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve(approved);
        };
        const onKeyDown = event => {
            if (event.key === "Escape") close(false);
        };
        cancelButton.addEventListener("click", () => close(false));
        applyButton.addEventListener("click", () => close(true));
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close(false);
        });
        document.addEventListener("keydown", onKeyDown);
        actions.append(cancelButton, applyButton);
        dialog.append(titleNode, message, pre, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        window.setTimeout(() => applyButton.focus(), 0);
    });
}

async function confirmWorkspaceWriteWithDiff(toolCall, signal = null, bridgeOptions = {}) {
    if (!shouldRequireWorkspaceWriteApproval()) return true;
    const path = String(toolCall?.path || "").trim();
    if (!path) return true;
    const nextContent = String(toolCall.content ?? toolCall.text ?? toolCall.body ?? "");
    let previousContent = "";
    try {
        const previous = await readWorkspaceFile(path, signal, bridgeOptions);
        previousContent = String(previous.content || "");
    } catch (err) {
        previousContent = "";
    }
    const after = toolCall.tool === "append_file" ? `${previousContent}${nextContent}` : nextContent;
    const approved = await showWorkspaceDiffApprovalDialog({
        path,
        mode: toolCall.tool,
        diff: createSimpleWorkspaceDiff(path, previousContent, after)
    });
    if (!approved) throw new Error("File change canceled in diff review.");
    return true;
}

function createProjectMenuItem(action, label, iconMarkup, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chat-session-menu-item project-menu-item project-menu-item-${action}`;
    button.setAttribute("role", "menuitem");
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconMarkup}</svg>
        <span></span>
    `;
    button.querySelector("span").textContent = label;
    button.addEventListener("click", event => {
        event.stopPropagation();
        closeProjectMenus();
        onSelect();
    });
    return button;
}

function resetAnchoredSidebarMenu(menu) {
    if (!menu) return;
    menu.classList.remove("sidebar-floating-menu", "sidebar-floating-menu-up");
    menu.style.removeProperty("left");
    menu.style.removeProperty("top");
    menu.style.removeProperty("right");
    menu.style.removeProperty("bottom");
}

function mountAnchoredSidebarMenu(menu, menuWrap) {
    if (!menu) return;
    if (menuWrap) {
        menu._faunaAnchorWrap = menuWrap;
        menuWrap._faunaAnchoredMenu = menu;
    }
    if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
    }
}

function hideAnchoredSidebarMenu(menu) {
    if (!menu) return;
    menu.hidden = true;
    resetAnchoredSidebarMenu(menu);
    const menuWrap = menu._faunaAnchorWrap;
    if (menuWrap && menu.parentElement !== menuWrap) {
        menuWrap.appendChild(menu);
    }
}

function positionAnchoredSidebarMenu(menu, trigger) {
    if (!menu || !trigger || menu.hidden) return;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const gap = 8;
    const triggerGap = 6;

    menu.classList.add("sidebar-floating-menu");
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.classList.remove("sidebar-floating-menu-up");

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const listBoundary = trigger.closest(".project-list, .chat-history-list, .archived-chat-list");
    const sectionBoundary = trigger.closest(".projects-section, .history");
    const listRect = listBoundary?.getBoundingClientRect?.();
    const sectionRect = sectionBoundary?.getBoundingClientRect?.();
    const boundaryTop = listRect ? Math.max(gap, listRect.top + 4) : gap;
    const boundaryBottom = Math.min(
        viewportHeight - gap,
        listRect ? listRect.bottom - 4 : viewportHeight - gap,
        sectionRect ? sectionRect.bottom - 4 : viewportHeight - gap
    );
    const maxLeft = Math.max(gap, viewportWidth - menuRect.width - gap);
    const left = Math.min(maxLeft, Math.max(gap, triggerRect.right - menuRect.width));
    let top = triggerRect.bottom + triggerGap;
    let flipped = false;

    if (top + menuRect.height > boundaryBottom) {
        top = Math.max(gap, triggerRect.top - menuRect.height - triggerGap);
        flipped = true;
    }
    if (top < boundaryTop && boundaryBottom - boundaryTop >= menuRect.height) {
        top = boundaryTop;
    }
    if (top + menuRect.height > viewportHeight - gap) {
        top = Math.max(gap, viewportHeight - menuRect.height - gap);
    }
    if (top + menuRect.height > boundaryBottom) {
        top = Math.max(gap, boundaryBottom - menuRect.height);
    }

    menu.classList.toggle("sidebar-floating-menu-up", flipped);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
}

function closeProjectMenus(except = null) {
    document.querySelectorAll(".project-menu-wrap.open").forEach(menuWrap => {
        if (except && menuWrap === except) return;
        menuWrap.classList.remove("open");
        const trigger = menuWrap.querySelector(".project-menu-trigger");
        const menu = menuWrap._faunaAnchoredMenu || menuWrap.querySelector(".project-menu");
        trigger?.setAttribute("aria-expanded", "false");
        hideAnchoredSidebarMenu(menu);
    });
}

function getProjectChatSessions(rootId = "", { includeArchived = false } = {}) {
    const cleanRootId = String(rootId || "").trim();
    if (!cleanRootId) return [];
    return chatSessions
        .filter(session => (includeArchived || !session.archived) && getSessionProjectRoot(session)?.id === cleanRootId)
        .sort(compareChatSessions);
}

function activateOrCreateProjectChat(rootId = "") {
    const root = getWorkspaceProjectRootById(rootId);
    if (!root) return;
    const existingSession = getProjectChatSessions(root.id)[0];
    if (existingSession) {
        activateChatSession(existingSession.id);
        return;
    }
    startNewChatSession({
        workspaceMode: "project",
        projectRootId: root.id
    });
}

function persistProjectChatListState() {
    safeLocalStorageSet(PROJECT_CHAT_LIST_STATE_STORAGE_KEY, JSON.stringify({
        collapsed: [...projectChatListState.collapsed],
        expanded: [...projectChatListState.expanded]
    }));
}

function isProjectChatListCollapsed(rootId = "") {
    return projectChatListState.collapsed.has(String(rootId || ""));
}

function isProjectChatListExpanded(rootId = "") {
    return projectChatListState.expanded.has(String(rootId || ""));
}

function setProjectChatListCollapsed(rootId = "", collapsed = false) {
    const cleanRootId = String(rootId || "").trim();
    if (!cleanRootId) return;
    if (collapsed) {
        projectChatListState.collapsed.add(cleanRootId);
    } else {
        projectChatListState.collapsed.delete(cleanRootId);
    }
    persistProjectChatListState();
    renderProjectList();
}

function setProjectChatListExpanded(rootId = "", expanded = false) {
    const cleanRootId = String(rootId || "").trim();
    if (!cleanRootId) return;
    if (expanded) {
        projectChatListState.expanded.add(cleanRootId);
    } else {
        projectChatListState.expanded.delete(cleanRootId);
    }
    persistProjectChatListState();
    renderProjectList();
}

function renderProjectRow(root, { nested = false, chatCount = 0 } = {}) {
    const activeRoot = getSessionProjectRoot();
    const hasProjectChats = chatCount > 0;
    const chatsCollapsed = isProjectChatListCollapsed(root.id);
    const row = document.createElement("div");
    row.className = `project-row${nested ? " project-row-worktree" : ""}`;
    row.classList.toggle("active", activeRoot?.id === root.id);
    row.classList.toggle("project-row-chats-collapsed", chatsCollapsed);

    const collapseButton = document.createElement("button");
    collapseButton.type = "button";
    collapseButton.className = "project-row-collapse-btn";
    collapseButton.disabled = !hasProjectChats;
    collapseButton.setAttribute("aria-label", hasProjectChats
        ? `${chatsCollapsed ? "Expand" : "Collapse"} chats for ${root.name}`
        : `No chats for ${root.name}`);
    collapseButton.setAttribute("aria-expanded", String(hasProjectChats && !chatsCollapsed));
    collapseButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>';
    collapseButton.addEventListener("click", event => {
        event.stopPropagation();
        if (!hasProjectChats) return;
        setProjectChatListCollapsed(root.id, !chatsCollapsed);
    });

    const projectIcon = document.createElement("span");
    projectIcon.className = "project-row-icon";
    projectIcon.setAttribute("aria-hidden", "true");
    projectIcon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            ${root.type === "worktree"
                ? '<path d="M6 3v5a4 4 0 0 0 4 4h4"></path><path d="M18 21v-5a4 4 0 0 0-4-4h-4"></path><circle cx="6" cy="3" r="2"></circle><circle cx="18" cy="21" r="2"></circle><circle cx="18" cy="12" r="2"></circle>'
                : '<path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path>'}
        </svg>
    `;

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "project-main-btn";
    mainButton.setAttribute("aria-current", activeRoot?.id === root.id ? "page" : "false");
    mainButton.innerHTML = `
        <span class="project-row-copy">
            <span class="project-row-name"></span>
            <span class="project-row-path"></span>
        </span>
    `;
    mainButton.querySelector(".project-row-name").textContent = root.name;
    mainButton.querySelector(".project-row-path").textContent = root.type === "worktree" && root.branch ? root.branch : root.path;
    mainButton.addEventListener("click", () => activateOrCreateProjectChat(root.id));

    const menuWrap = document.createElement("div");
    menuWrap.className = "project-menu-wrap";
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "project-menu-trigger";
    menuButton.setAttribute("aria-label", `Options for ${root.name}`);
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="19" cy="12" r="1.7"></circle></svg>';

    const menu = document.createElement("div");
    menu.className = "chat-session-menu project-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.append(
        createProjectMenuItem("open", "Open in Explorer", '<path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path><path d="m14 12 4-4"></path><path d="M15 8h3v3"></path>', () => openWorkspaceProjectPath(root)),
        createProjectMenuItem("worktree", "Create worktree", '<path d="M6 3v5a4 4 0 0 0 4 4h4"></path><path d="M18 21v-5a4 4 0 0 0-4-4h-4"></path><path d="M12 5v6"></path><path d="M9 8h6"></path>', () => openCreateWorktreeDialog(root.project)),
        createProjectMenuItem("rename", "Rename project", '<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path>', () => openProjectRenameDialog(root)),
        createProjectMenuItem("remove", root.type === "worktree" ? "Remove worktree" : "Remove project", '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path>', () => removeWorkspaceProjectRoot(root))
    );
    if (root.type === "worktree") {
        menu.querySelector(".project-menu-item-worktree")?.remove();
    }

    menuButton.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = !menuWrap.classList.contains("open");
        closeProjectMenus(menuWrap);
        menuWrap.classList.toggle("open", willOpen);
        menuButton.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
            mountAnchoredSidebarMenu(menu, menuWrap);
            menu.hidden = false;
            positionAnchoredSidebarMenu(menu, menuButton);
        } else {
            hideAnchoredSidebarMenu(menu);
        }
    });

    menuWrap.append(menuButton, menu);
    row.append(projectIcon, mainButton, collapseButton, menuWrap);
    return row;
}

function appendProjectChatRows(container, root, { sessions = getProjectChatSessions(root.id) } = {}) {
    if (isProjectChatListCollapsed(root.id)) return;
    const isExpanded = isProjectChatListExpanded(root.id);
    if (!sessions.length) {
        const empty = document.createElement("div");
        empty.className = "project-chat-empty";
        empty.textContent = "No Chats";
        container.appendChild(empty);
        return;
    }
    const visibleSessions = isExpanded ? sessions : sessions.slice(0, PROJECT_CHAT_PREVIEW_LIMIT);
    visibleSessions.forEach(session => {
        container.appendChild(createChatSessionRow(session, {
            variant: "project-chat-session-row",
            hideProjectBadge: true
        }));
    });
    if (sessions.length <= PROJECT_CHAT_PREVIEW_LIMIT) return;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "project-chat-list-toggle";
    toggle.textContent = isExpanded ? "Show less" : "Load more";
    toggle.setAttribute("aria-expanded", String(isExpanded));
    toggle.addEventListener("click", () => {
        setProjectChatListExpanded(root.id, !isExpanded);
    });
    container.appendChild(toggle);
}

function renderProjectList() {
    if (!projectList) return;
    projectList.replaceChildren();
    updateProjectSortButton();
    const activeRoot = getSessionProjectRoot();
    getSortedWorkspaceProjects().forEach(project => {
        const projectRoot = {
            id: project.id,
            projectId: project.id,
            name: project.name,
            path: project.path,
            branch: "",
            type: "project",
            project
        };
        const projectChatSessions = getProjectChatSessions(projectRoot.id);
        projectList.appendChild(renderProjectRow(projectRoot, { chatCount: projectChatSessions.length }));
        appendProjectChatRows(projectList, projectRoot, { sessions: projectChatSessions });
        project.worktrees.forEach(worktree => {
            const worktreeRoot = {
                ...worktree,
                projectId: project.id,
                type: "worktree",
                project
            };
            const worktreeChatSessions = getProjectChatSessions(worktreeRoot.id);
            projectList.appendChild(renderProjectRow(worktreeRoot, { nested: true, chatCount: worktreeChatSessions.length }));
            appendProjectChatRows(projectList, worktreeRoot, { sessions: worktreeChatSessions });
        });
    });
    if (workspaceProjects.length === 0) {
        const empty = document.createElement("div");
        empty.className = "project-empty-state";
        empty.innerHTML = `
            <svg class="project-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path>
                <path d="M12 10v6"></path>
                <path d="M9 13h6"></path>
            </svg>
            <span>No project folders yet</span>
        `;
        projectList.appendChild(empty);
    }
    projectList.dataset.hasActiveProject = activeRoot ? "true" : "false";
}

function renderComposerProjectPicker() {
    if (composerProjectLabel) composerProjectLabel.textContent = getActiveProjectLabel();
    const activeSession = getActiveSession();
    const activeMode = getSessionWorkspaceMode(activeSession);
    const isNormalLocked = Boolean(activeSession && activeMode === "normal");
    const isProjectLocked = activeMode === "project";
    if (composerProjectBtn) {
        const activeRoot = getSessionProjectRoot();
        composerProjectBtn.classList.toggle("active", Boolean(activeRoot));
        composerProjectBtn.dataset.tooltip = activeRoot
            ? `Project: ${activeRoot.path}`
            : "Normal chat";
    }
    updateComposerProjectContextBar();
    if (!composerProjectMenu) return;
    composerProjectMenu.replaceChildren();

    const header = document.createElement("div");
    header.className = "composer-project-menu-header";
    header.textContent = "Project";
    composerProjectMenu.appendChild(header);

    const createOption = ({ id = "", label, meta = "", type = "project", disabled = false }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "composer-project-option";
        button.classList.toggle("active", (getSessionProjectRoot()?.id || "") === id);
        button.disabled = disabled;
        button.innerHTML = `
            <span class="composer-project-option-icon" aria-hidden="true"></span>
            <span class="composer-project-option-copy"><span class="composer-project-option-label"></span><span class="composer-project-option-meta"></span></span>
        `;
        button.querySelector(".composer-project-option-icon").innerHTML = type === "none"
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path></svg>'
            : type === "worktree"
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v5a4 4 0 0 0 4 4h4"></path><path d="M18 21v-5a4 4 0 0 0-4-4h-4"></path><circle cx="6" cy="3" r="2"></circle><circle cx="18" cy="21" r="2"></circle><circle cx="18" cy="12" r="2"></circle></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path></svg>';
        button.querySelector(".composer-project-option-label").textContent = label;
        button.querySelector(".composer-project-option-meta").textContent = meta;
        button.addEventListener("click", () => {
            if (disabled) return;
            closeComposerProjectMenu();
            setActiveChatProject(id);
        });
        composerProjectMenu.appendChild(button);
    };

    createOption({
        id: "",
        label: "No project",
        meta: isProjectLocked ? "Project chats stay attached" : "Normal chat",
        type: "none",
        disabled: isProjectLocked
    });
    if (isNormalLocked) {
        const lockNote = document.createElement("div");
        lockNote.className = "composer-project-lock-note";
        lockNote.textContent = "Normal chats cannot be moved into projects. Use New chat to choose a project.";
        composerProjectMenu.appendChild(lockNote);
    }
    getSortedWorkspaceProjects().forEach(project => {
        createOption({ id: project.id, label: project.name, meta: project.path, type: "project", disabled: isNormalLocked });
        project.worktrees.forEach(worktree => {
            createOption({ id: worktree.id, label: worktree.name, meta: worktree.branch || worktree.path, type: "worktree", disabled: isNormalLocked });
        });
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "composer-project-add";
    addButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path>
            <path d="M12 10v6"></path>
            <path d="M9 13h6"></path>
        </svg>
        <span>Add project folder</span>
    `;
    addButton.addEventListener("click", () => {
        closeComposerProjectMenu();
        void chooseWorkspaceProjectFolders();
    });
    composerProjectMenu.appendChild(addButton);
}

function getProjectPickerIconMarkup(type = "project") {
    if (type === "none") {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path></svg>';
    }
    if (type === "worktree") {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v5a4 4 0 0 0 4 4h4"></path><path d="M18 21v-5a4 4 0 0 0-4-4h-4"></path><circle cx="6" cy="3" r="2"></circle><circle cx="18" cy="21" r="2"></circle><circle cx="18" cy="12" r="2"></circle></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path></svg>';
}

function createNewChatProjectOption({ id = "", label, meta = "", type = "project", branch = "" }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `new-chat-project-option composer-project-option${type === "worktree" ? " new-chat-project-option-worktree" : ""}`;
    button.innerHTML = `
        <span class="composer-project-option-icon" aria-hidden="true"></span>
        <span class="composer-project-option-copy">
            <span class="composer-project-option-label"></span>
            <span class="composer-project-option-meta"></span>
        </span>
        ${branch ? '<span class="new-chat-project-branch"></span>' : ""}
    `;
    button.querySelector(".composer-project-option-icon").innerHTML = getProjectPickerIconMarkup(type);
    button.querySelector(".composer-project-option-label").textContent = label;
    button.querySelector(".composer-project-option-meta").textContent = meta;
    const branchBadge = button.querySelector(".new-chat-project-branch");
    if (branchBadge) branchBadge.textContent = branch;
    button.addEventListener("click", () => {
        closeNewChatProjectMenu();
        if (id) {
            startNewChatSession({
                workspaceMode: "project",
                projectRootId: id
            });
            return;
        }
        startNewChatSession({ notify: true });
    });
    return button;
}

function renderNewChatProjectPicker() {
    if (!newChatProjectMenu) return;
    newChatProjectMenu.replaceChildren();

    const header = document.createElement("div");
    header.className = "new-chat-project-header";
    header.innerHTML = `
        <span>Start new chat</span>
        <small>Choose where Fauna should work.</small>
    `;
    newChatProjectMenu.appendChild(header);

    newChatProjectMenu.appendChild(createNewChatProjectOption({
        id: "",
        label: "No project",
        meta: "Normal chat",
        type: "none"
    }));

    const projects = getSortedWorkspaceProjects();
    if (projects.length) {
        const sectionLabel = document.createElement("div");
        sectionLabel.className = "new-chat-project-section-label";
        sectionLabel.textContent = "Projects";
        newChatProjectMenu.appendChild(sectionLabel);
    }

    projects.forEach(project => {
        newChatProjectMenu.appendChild(createNewChatProjectOption({
            id: project.id,
            label: project.name,
            meta: project.path,
            type: "project"
        }));
        project.worktrees.forEach(worktree => {
            newChatProjectMenu.appendChild(createNewChatProjectOption({
                id: worktree.id,
                label: worktree.name,
                meta: worktree.path,
                type: "worktree",
                branch: worktree.branch || "worktree"
            }));
        });
    });

    if (!projects.length) {
        const empty = document.createElement("div");
        empty.className = "new-chat-project-empty";
        empty.textContent = "No project folders yet.";
        newChatProjectMenu.appendChild(empty);
    }

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "new-chat-project-add composer-project-add";
    addButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path>
            <path d="M12 10v6"></path>
            <path d="M9 13h6"></path>
        </svg>
        <span>Add project folder</span>
    `;
    addButton.addEventListener("click", () => {
        closeNewChatProjectMenu();
        void chooseWorkspaceProjectFolders();
    });
    newChatProjectMenu.appendChild(addButton);
}

function closeNewChatProjectMenu() {
    if (!newChatProjectMenu || !newChatBtn) return;
    newChatProjectMenu.hidden = true;
    newChatBtn.setAttribute("aria-expanded", "false");
}

function toggleNewChatProjectMenu() {
    if (!newChatProjectMenu || !newChatBtn) return;
    const willOpen = newChatProjectMenu.hidden;
    if (willOpen) {
        closeComposerProjectMenu();
        closeProjectMenus();
        closeProjectSortMenu();
        renderNewChatProjectPicker();
        newChatProjectMenu.hidden = false;
        const firstOption = newChatProjectMenu.querySelector("button");
        window.requestAnimationFrame(() => firstOption?.focus?.());
    } else {
        newChatProjectMenu.hidden = true;
    }
    newChatBtn.setAttribute("aria-expanded", String(willOpen));
}

function closeComposerProjectMenu() {
    if (!composerProjectMenu || !composerProjectBtn) return;
    composerProjectMenu.hidden = true;
    composerProjectBtn.setAttribute("aria-expanded", "false");
    newChatBtn?.setAttribute("aria-expanded", "false");
}

function ensureComposerProjectMenuPortal() {
    if (!composerProjectMenu || composerProjectMenu.parentElement === document.body) return;
    document.body.appendChild(composerProjectMenu);
}

function positionComposerProjectMenu() {
    if (!composerProjectMenu || !composerProjectBtn || composerProjectMenu.hidden) return;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight || 0;
    const viewportMargin = 10;
    const anchorRect = composerProjectBtn.getBoundingClientRect();
    const maxAvailableWidth = Math.max(220, viewportWidth - (viewportMargin * 2));
    const menuWidth = Math.min(330, maxAvailableWidth);
    const maxMenuHeight = Math.max(180, Math.min(360, viewportHeight - (viewportMargin * 2)));

    composerProjectMenu.style.position = "fixed";
    composerProjectMenu.style.width = `${menuWidth}px`;
    composerProjectMenu.style.maxHeight = `${maxMenuHeight}px`;
    composerProjectMenu.style.right = "auto";
    composerProjectMenu.style.bottom = "auto";
    composerProjectMenu.style.left = `${Math.min(Math.max(viewportMargin, anchorRect.left), viewportWidth - menuWidth - viewportMargin)}px`;
    composerProjectMenu.style.top = "0px";

    const measuredHeight = Math.min(composerProjectMenu.getBoundingClientRect().height || maxMenuHeight, maxMenuHeight);
    const preferredTop = anchorRect.top - measuredHeight - 9;
    const fallbackTop = anchorRect.bottom + 9;
    const top = preferredTop >= viewportMargin
        ? preferredTop
        : Math.min(fallbackTop, viewportHeight - measuredHeight - viewportMargin);

    composerProjectMenu.style.top = `${Math.min(Math.max(viewportMargin, top), viewportHeight - measuredHeight - viewportMargin)}px`;
}

function openComposerProjectMenu({ focusFirst = false } = {}) {
    if (!composerProjectMenu || !composerProjectBtn) return;
    closeComposerBranchMenu();
    ensureComposerProjectMenuPortal();
    renderComposerProjectPicker();
    composerProjectMenu.hidden = false;
    positionComposerProjectMenu();
    composerProjectBtn.setAttribute("aria-expanded", "true");
    newChatBtn?.setAttribute("aria-expanded", "true");
    if (focusFirst) {
        const firstOption = composerProjectMenu.querySelector("button:not(:disabled)");
        window.requestAnimationFrame(() => {
            positionComposerProjectMenu();
            firstOption?.focus?.();
        });
    } else {
        window.requestAnimationFrame(positionComposerProjectMenu);
    }
}

function toggleComposerProjectMenu({ focusFirst = false } = {}) {
    if (!composerProjectMenu || !composerProjectBtn) return;
    if (composerProjectMenu.hidden) {
        openComposerProjectMenu({ focusFirst });
        return;
    }
    closeComposerProjectMenu();
}

function startNewChatComposerProjectPicker() {
    if (activeSessionId) {
        const currentSession = saveCurrentSession({ render: false, updateUrl: false });
        if (currentSession && !chatSessionHasContent(currentSession) && !currentSession.archived) {
            chatSessions = chatSessions.filter(session => session.id !== currentSession.id);
        }
    }
    restoreEmptyChatDraft({ updateUrl: false });
    setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl: true, urlMode: "replace" });
    sidebarController.close();
    closeNewChatProjectMenu();
    openComposerProjectMenu({ focusFirst: true });
    focusComposerInput({ force: true });
}

async function chooseWorkspaceProjectFolders() {
    const api = getFaunaDesktopApi()?.projects;
    if (!api?.chooseFolders) {
        showToast("Project folders can be selected in the desktop app.", "warning");
        return;
    }
    try {
        const result = await api.chooseFolders();
        if (result?.cancelled) return;
        syncWorkspaceProjects(result?.projects || []);
        showToast(result?.added > 0 ? `${result.added} project ${result.added === 1 ? "folder" : "folders"} added.` : "Project list updated.", "success");
    } catch (err) {
        showToast(`Could not add project folder: ${err.message}`, "error");
    }
}

async function openWorkspaceProjectPath(root) {
    const api = getFaunaDesktopApi()?.projects;
    if (!api?.openPath) {
        showToast("Opening project folders is available in the desktop app.", "warning");
        return;
    }
    try {
        const result = await api.openPath(root?.path || "");
        if (result?.ok === false) throw new Error(result.message || "Explorer could not open the folder.");
    } catch (err) {
        showToast(`Could not open project: ${err.message}`, "error");
    }
}

function openProjectRenameDialog(root) {
    if (!root) return;
    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "approval-dialog project-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "projectRenameTitle");
    const titleNode = document.createElement("h2");
    titleNode.id = "projectRenameTitle";
    titleNode.textContent = "Rename project";
    const inputLabel = document.createElement("label");
    inputLabel.className = "chat-rename-field";
    inputLabel.innerHTML = '<span>Project name</span>';
    const nameInput = document.createElement("input");
    nameInput.className = "settings-input chat-rename-input";
    nameInput.type = "text";
    nameInput.maxLength = 48;
    nameInput.value = root.name;
    inputLabel.appendChild(nameInput);
    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "provider-btn provider-btn-secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    const saveButton = document.createElement("button");
    saveButton.className = "provider-btn provider-btn-primary";
    saveButton.type = "button";
    saveButton.textContent = "Save";
    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const save = () => {
        const name = cleanSessionTitle(nameInput.value || root.name, 48);
        const project = getWorkspaceProjectById(root.projectId || root.id);
        if (!project) return close();
        if (root.type === "worktree") {
            const worktree = project.worktrees.find(item => item.id === root.id);
            if (worktree) worktree.name = name;
        } else {
            project.name = name;
        }
        project.updatedAt = new Date().toISOString();
        persistWorkspaceProjects();
        renderProjectList();
        renderComposerProjectPicker();
        updateActiveChatTitle();
        showToast("Project name updated.", "success");
        close();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" && document.activeElement === nameInput) save();
    };
    cancelButton.addEventListener("click", close);
    saveButton.addEventListener("click", save);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    actions.append(cancelButton, saveButton);
    dialog.append(titleNode, inputLabel, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => {
        nameInput.focus();
        nameInput.select();
    }, 0);
}

function getDefaultWorktreeBranch(project) {
    const base = slugWorkspaceProjectValue(project?.name || "worktree", "worktree").toLowerCase();
    return `codex/${base}-${Date.now().toString(36)}`;
}

function openCreateWorktreeDialog(project) {
    if (!project) return;
    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "approval-dialog project-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "projectWorktreeTitle");
    const titleNode = document.createElement("h2");
    titleNode.id = "projectWorktreeTitle";
    titleNode.textContent = "Create worktree";
    const message = document.createElement("p");
    message.textContent = `Fauna will create a sibling worktree for ${project.name}.`;
    const inputLabel = document.createElement("label");
    inputLabel.className = "chat-rename-field";
    inputLabel.innerHTML = '<span>Branch name</span>';
    const branchInput = document.createElement("input");
    branchInput.className = "settings-input chat-rename-input";
    branchInput.type = "text";
    branchInput.value = getDefaultWorktreeBranch(project);
    inputLabel.appendChild(branchInput);
    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "provider-btn provider-btn-secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    const createButton = document.createElement("button");
    createButton.className = "provider-btn provider-btn-primary";
    createButton.type = "button";
    createButton.textContent = "Create";
    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const create = async () => {
        const branch = String(branchInput.value || "").trim();
        if (!branch) {
            showToast("Add a branch name first.", "warning");
            return;
        }
        const api = getFaunaDesktopApi()?.projects;
        if (!api?.createWorktree) {
            showToast("Worktree creation is available in the desktop app.", "warning");
            return;
        }
        createButton.disabled = true;
        try {
            const result = await api.createWorktree({ projectId: project.id, branch });
            syncWorkspaceProjects(result?.projects || []);
            if (result?.worktree?.id) setActiveChatProject(result.worktree.id, { notify: false });
            showToast("Worktree created and selected.", "success");
            close();
        } catch (err) {
            createButton.disabled = false;
            showToast(`Could not create worktree: ${err.message}`, "error");
        }
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" && document.activeElement === branchInput) void create();
    };
    cancelButton.addEventListener("click", close);
    createButton.addEventListener("click", () => { void create(); });
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    actions.append(cancelButton, createButton);
    dialog.append(titleNode, message, inputLabel, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => {
        branchInput.focus();
        branchInput.select();
    }, 0);
}

function removeWorkspaceProjectRoot(root) {
    if (!root) return;
    if (root.type === "worktree") {
        const project = getWorkspaceProjectById(root.projectId);
        if (project) project.worktrees = project.worktrees.filter(worktree => worktree.id !== root.id);
    } else {
        workspaceProjects = workspaceProjects.filter(project => project.id !== root.id);
    }
    chatSessions.forEach(session => {
        const context = normalizeStoredSessionProjectContext(session.projectContext);
        const removed = root.type === "worktree"
            ? context.rootId === root.id
            : context.projectId === root.id;
        if (removed) session.projectContext = createEmptyProjectContext();
    });
    persistWorkspaceProjects();
    persistChatSessions();
    renderProjectList();
    renderComposerProjectPicker();
    updateProjectAgentPanel();
    updateActiveChatTitle();
    showToast(root.type === "worktree" ? "Worktree removed from Fauna." : "Project removed from Fauna.", "info");
}

let isProjectListCollapsed = safeLocalStorageGet("faunaProjectListCollapsed") === "true";

function setProjectListCollapsed(collapsed, { persist = true } = {}) {
    isProjectListCollapsed = Boolean(collapsed);
    projectList?.toggleAttribute("hidden", isProjectListCollapsed);
    projectListToggle?.setAttribute("aria-expanded", String(!isProjectListCollapsed));
    if (projectListToggle) {
        projectListToggle.dataset.tooltip = isProjectListCollapsed ? "Expand projects" : "Collapse projects";
    }
    if (persist) safeLocalStorageSet("faunaProjectListCollapsed", isProjectListCollapsed ? "true" : "false");
}

projectListToggle?.addEventListener("click", () => {
    setProjectListCollapsed(!isProjectListCollapsed);
});
projectSortBtn?.addEventListener("click", event => {
    event.stopPropagation();
    toggleProjectSortMenu();
});
addProjectFolderBtn?.addEventListener("click", () => {
    void chooseWorkspaceProjectFolders();
});
agentTaskModeBtn?.addEventListener("click", event => {
    event.stopPropagation();
    toggleAgentTaskModeMenu();
});
composerProjectBtn?.addEventListener("click", event => {
    event.stopPropagation();
    closeComposerBranchMenu();
    toggleComposerProjectMenu();
});
composerLocalWorkBtn?.addEventListener("click", event => {
    event.stopPropagation();
    isWorkspaceBridgeEnabled = !isWorkspaceBridgeEnabled;
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, isWorkspaceBridgeEnabled ? "true" : "false");
    if (toggleWorkspaceBridge) toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;
    updateWorkspaceBridgeSettingsUi?.();
    updateProviderSettingsUi?.();
    updateComposerProjectContextBar();
    if (isWorkspaceBridgeEnabled && getSessionProjectRoot()) void refreshProjectBranchSummary(getSessionProjectRoot());
    showToast(isWorkspaceBridgeEnabled ? "Local workspace access enabled." : "Local workspace access disabled.", isWorkspaceBridgeEnabled ? "success" : "info");
});
composerBranchBtn?.addEventListener("click", event => {
    event.stopPropagation();
    toggleComposerBranchMenu({ focusSearch: true });
});
windowWorkspacePanelToggleBtn?.addEventListener("click", event => {
    event.stopPropagation();
    toggleProjectWorkspacePanel();
});
windowWorkspacePanelMaximizeBtn?.addEventListener("click", event => {
    event.stopPropagation();
    if (isProjectAgentCollapsed) openProjectWorkspacePanel("menu");
    setProjectAgentMaximized(!isProjectAgentMaximized);
});
projectPanelMenuTab?.addEventListener("click", () => openProjectWorkspacePanel("menu"));
projectPanelAddTabBtn?.addEventListener("click", event => {
    event.stopPropagation();
    toggleProjectPanelTabMenu();
});
projectFilesTab?.addEventListener("click", () => openProjectWorkspacePanel("files", { refresh: true }));
projectActivityTab?.addEventListener("click", () => openProjectWorkspacePanel("activity"));
projectPageChatTab?.addEventListener("click", () => openProjectWorkspacePanel("chat"));
workspaceMenuButtons.forEach(button => {
    button.addEventListener("click", () => handleWorkspacePanelAction(button.dataset.workspacePanelAction));
});
projectAgentCollapseBtn?.addEventListener("click", () => {
    setProjectAgentCollapsed(true);
});
projectAgentExpandBtn?.addEventListener("click", () => {
    openProjectWorkspacePanel("menu");
});
projectAgentResizeHandle?.addEventListener("pointerdown", startProjectAgentResize);
projectAgentResizeHandle?.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    setProjectAgentWidth(activeProjectAgentWidth + (direction * 24));
});
projectExplorerFilterInput?.addEventListener("input", renderProjectExplorerCurrentEntries);
projectExplorerRefreshBtn?.addEventListener("click", () => {
    void refreshProjectExplorer({ refreshBranch: true });
});
projectFileMoreBtn?.addEventListener("click", event => {
    event.stopPropagation();
    toggleProjectFileMoreMenu();
});
projectFileRevealBtn?.addEventListener("click", () => {
    if (activeProjectFile?.path) {
        expandProjectExplorerAncestors(activeProjectFile.path);
        renderProjectExplorerCurrentEntries();
        projectExplorerList?.querySelector(`[data-path="${CSS.escape(activeProjectFile.path)}"]`)?.focus?.();
        return;
    }
    projectExplorerFilterInput?.focus?.();
});
projectFileCopyPathBtn?.addEventListener("click", () => {
    void copyProjectFileText(activeProjectFile?.path || "", projectFileCopyPathBtn);
    closeProjectFileMoreMenu();
});
projectFileCopyContentBtn?.addEventListener("click", () => {
    void copyProjectFileText(activeProjectFile?.content || "", projectFileCopyContentBtn);
    closeProjectFileMoreMenu();
});
projectFileToggleExtendedBtn?.addEventListener("click", () => {
    activeProjectFileExtendedView = !activeProjectFileExtendedView;
    safeLocalStorageSet(PROJECT_FILE_EXTENDED_VIEW_STORAGE_KEY, activeProjectFileExtendedView ? "true" : "false");
    closeProjectFileMoreMenu();
    renderProjectFileViewer();
});
projectFileToggleWrapBtn?.addEventListener("click", () => {
    activeProjectFileLineWrap = !activeProjectFileLineWrap;
    safeLocalStorageSet(PROJECT_FILE_LINE_WRAP_STORAGE_KEY, activeProjectFileLineWrap ? "true" : "false");
    closeProjectFileMoreMenu();
    renderProjectFileViewer();
});
projectInstructionsBtn?.addEventListener("click", () => openProjectInstructionsDialog());
projectDiffReviewBtn?.addEventListener("click", () => {
    void openProjectDiffReview();
});
projectWorktreeActionBtn?.addEventListener("click", () => {
    const root = getSessionProjectRoot();
    const project = root?.project || getWorkspaceProjectById(root?.projectId || root?.id);
    if (!project) {
        showToast("Select a project first.", "warning");
        return;
    }
    openCreateWorktreeDialog(project);
});
projectCommandRunBtn?.addEventListener("click", () => {
    void runProjectCommandFromPanel();
});
projectCommandOutput?.addEventListener("click", focusProjectTerminalInput);
projectCommandOutput?.addEventListener("focus", focusProjectTerminalInput);
projectCommandOutput?.addEventListener("keydown", handleProjectTerminalKeydown);
projectCommandOutput?.addEventListener("paste", handleProjectTerminalPaste);
projectCommandInput?.addEventListener("input", () => {
    const state = getProjectTerminalState();
    state.draft = projectCommandInput.value || "";
    renderProjectTerminal();
});
projectCommandInput?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void runProjectCommandFromPanel();
});

function syncProjectPageChatToolToggles() {
    if (projectPageChatToggleSandbox) projectPageChatToggleSandbox.checked = Boolean(isSandboxEnabled);
    if (projectPageChatToggleGoogleGrounding) projectPageChatToggleGoogleGrounding.checked = Boolean(isGoogleGroundingEnabled);
    if (projectPageChatToggleApproxLocation) projectPageChatToggleApproxLocation.checked = Boolean(isApproxLocationEnabled);
    if (projectPageChatToggleWorkspaceBridge) projectPageChatToggleWorkspaceBridge.checked = Boolean(isWorkspaceBridgeEnabled);
}

function setProjectPageChatToolsOpen(open) {
    if (!projectPageChatToolsDropdown || !projectPageChatToolsBtn) return;
    const archived = typeof isActiveChatArchived === "function" && isActiveChatArchived();
    if (open && (isGenerating || archived || !canUseComposerTools())) {
        projectPageChatToolsDropdown.classList.remove("open");
        if (archived) {
            showToast("Archived chats are read-only.", "warning");
        } else if (!isGenerating && !canUseComposerTools()) {
            showToast(`${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`, "warning");
        }
        return;
    }
    projectPageChatToolsDropdown.classList.toggle("open", Boolean(open));
    if (open) {
        toolsDropdown?.classList.remove("open");
        if (typeof closeAttachmentMenu === "function") closeAttachmentMenu();
        closeProjectPageChatAttachmentMenu();
    }
}

projectPageChatUploadButton?.addEventListener("click", event => {
    event.stopPropagation();
    if (isGenerating) return;
    toggleProjectPageChatAttachmentMenu();
});
projectPageChatUploadButton?.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isGenerating) setProjectPageChatAttachmentMenuOpen(true, { focusMenu: true });
    }
});
projectPageChatAttachmentMenu?.addEventListener("click", event => event.stopPropagation());
projectPageChatAttachmentMenu?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeProjectPageChatAttachmentMenu();
        projectPageChatUploadButton?.focus({ preventScroll: true });
        return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(projectPageChatAttachmentMenu.querySelectorAll(".attachment-menu-item"));
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    const nextIndex = event.key === "ArrowDown"
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
});
projectPageChatAttachmentUploadFileButton?.addEventListener("click", () => {
    if (isGenerating || !canUseComposerAttachments()) {
        if (!isGenerating) showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    closeProjectPageChatAttachmentMenu();
    projectPageChatFileInput?.click();
});
projectPageChatAttachmentChooseLibraryButton?.addEventListener("click", () => {
    if (isGenerating || !canUseComposerAttachments()) {
        if (!isGenerating) showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    openLibraryPickerModal({ attachmentTarget: "projectPageChat" });
});
projectPageChatFileInput?.addEventListener("change", event => {
    if (isGenerating) return;
    if (!canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        projectPageChatFileInput.value = "";
        return;
    }
    addProjectPageChatAttachedFiles(event.target.files);
    projectPageChatFileInput.value = "";
});
projectPageChatToolsBtn?.addEventListener("click", event => {
    event.stopPropagation();
    setProjectPageChatToolsOpen(!projectPageChatToolsDropdown?.classList.contains("open"));
});
projectPageChatToolsDropdown?.addEventListener("click", event => event.stopPropagation());
projectPageChatToggleSandbox?.addEventListener("change", event => {
    isSandboxEnabled = event.target.checked;
    if (toggleSandbox) toggleSandbox.checked = isSandboxEnabled;
    syncProjectPageChatToolToggles();
});
projectPageChatToggleGoogleGrounding?.addEventListener("change", event => {
    isGoogleGroundingEnabled = event.target.checked;
    if (toggleGoogleGrounding) toggleGoogleGrounding.checked = isGoogleGroundingEnabled;
    syncProjectPageChatToolToggles();
});
projectPageChatToggleApproxLocation?.addEventListener("change", event => {
    isApproxLocationEnabled = event.target.checked;
    if (toggleApproxLocation) toggleApproxLocation.checked = isApproxLocationEnabled;
    if (typeof updatePotatoSettingsUi === "function") updatePotatoSettingsUi();
    syncProjectPageChatToolToggles();
});
projectPageChatToggleWorkspaceBridge?.addEventListener("change", event => {
    isWorkspaceBridgeEnabled = event.target.checked;
    if (toggleWorkspaceBridge) toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, isWorkspaceBridgeEnabled ? "true" : "false");
    if (typeof updateWorkspaceBridgeSettingsUi === "function") updateWorkspaceBridgeSettingsUi();
    if (typeof updateProviderSettingsUi === "function") updateProviderSettingsUi();
    syncProjectPageChatToolToggles();
});
projectPageChatVoiceButton?.addEventListener("click", () => {
    voiceButton?.click();
});
projectPageChatVoiceStopButton?.addEventListener("click", () => {
    voiceStopButton?.click();
});
projectPageChatStopBtn?.addEventListener("click", () => {
    projectPageChatAbortController?.abort();
});
syncProjectPageChatToolToggles();

projectPageChatSendBtn?.addEventListener("click", () => {
    void sendProjectPageChatMessage();
});
projectPageChatInput?.addEventListener("input", () => {
    projectPageChatInput.style.height = "auto";
    projectPageChatInput.style.height = `${projectPageChatInput.scrollHeight}px`;
});
projectPageChatInput?.addEventListener("keydown", event => {
    if (!isKeyboardShortcutEvent(event, "sendPrompt")) return;
    event.preventDefault();
    void sendProjectPageChatMessage();
});
document.addEventListener("click", event => {
    if (!event.target?.closest?.("#projectPageChatToolsBtn") && !event.target?.closest?.("#projectPageChatToolsDropdown")) projectPageChatToolsDropdown?.classList.remove("open");
    if (!event.target?.closest?.("#projectPageChatAttachmentMenu") && !event.target?.closest?.("#projectPageChatUploadButton")) closeProjectPageChatAttachmentMenu();
    if (!event.target?.closest?.(".agent-task-mode-wrap")) closeAgentTaskModeMenu();
    if (!event.target?.closest?.(".composer-project-wrap")) closeComposerProjectMenu();
    if (!event.target?.closest?.(".composer-branch-menu") && !event.target?.closest?.("#composerBranchBtn")) closeComposerBranchMenu();
    if (!event.target?.closest?.(".new-chat-picker-wrap")) closeNewChatProjectMenu();
    if (!event.target?.closest?.(".project-menu-wrap")) closeProjectMenus();
    if (!event.target?.closest?.(".project-sort-wrap")) closeProjectSortMenu();
    if (!event.target?.closest?.(".project-agent-tabbar")) closeProjectPanelTabMenu();
    if (!event.target?.closest?.(".project-file-header-actions")) closeProjectFileMoreMenu();
});
window.addEventListener("resize", positionComposerProjectMenu);
window.addEventListener("scroll", positionComposerProjectMenu, true);
window.addEventListener("resize", positionComposerBranchMenu);
window.addEventListener("scroll", positionComposerBranchMenu, true);
window.addEventListener("resize", () => {
    closeProjectMenus();
    closeChatSessionMenus();
});
projectList?.addEventListener("scroll", () => {
    closeProjectMenus();
    closeChatSessionMenus();
}, { passive: true });
chatHistoryList?.addEventListener("scroll", closeChatSessionMenus, { passive: true });
archivedChatList?.addEventListener("scroll", closeChatSessionMenus, { passive: true });
document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeAgentTaskModeMenu();
    closeComposerProjectMenu();
    closeComposerBranchMenu();
    closeNewChatProjectMenu();
    closeProjectMenus();
    closeChatSessionMenus();
    closeProjectSortMenu();
    closeProjectPanelTabMenu();
    closeProjectFileMoreMenu();
    clearProjectLineCommentPanels();
});
setProjectAgentWidth(activeProjectAgentWidth, { persist: false });
setProjectListCollapsed(isProjectListCollapsed, { persist: false });
updateProjectSortButton();
updateAgentTaskModeUi();
updateProjectAgentPanel();
renderAgentActivityList();

function shouldRequestAssistantChatTitle(messages = conversationHistory, sessionId = activeSessionId) {
    const hasAssistantReply = (Array.isArray(messages) ? messages : [])
        .some(message => message?.role === "assistant");
    if (hasAssistantReply) return false;

    const session = sessionId ? getChatSessionById(sessionId) : getActiveSession();
    return !(session?.manualTitle || session?.assistantTitle);
}

function applyAssistantChatTitle(content, sessionId = activeSessionId) {
    const title = parseChatTitleRequest(content);
    if (!title || title === "Current Session") return false;

    let session = sessionId ? getChatSessionById(sessionId) : getActiveSession();
    if (!session && (!sessionId || sessionId === activeSessionId) && activeChatHasContent()) {
        session = createChatSessionForCurrentDraft();
        chatSessions.unshift(session);
        activeSessionId = session.id;
        clearPendingProjectChatRoot();
        updateWorkspaceUrlFragment({ replace: true });
    }
    if (!session || session.manualTitle) return false;
    if (session.assistantTitle && session.title === title) return true;

    session.title = title;
    session.assistantTitle = true;
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    if (session.id === activeSessionId) updateActiveChatTitle();
    renderChatHistory();
    return true;
}

function createChatSession(overrides = {}) {
    const now = new Date().toISOString();
    const session = {
        id: createSessionId(),
        title: "Current Session",
        createdAt: now,
        updatedAt: now,
        pinned: false,
        archived: false,
        manualTitle: false,
        assistantTitle: false,
        chatHtml: "",
        conversationHistory: [],
        composerDraft: createEmptyComposerDraft(),
        projectContext: createEmptyProjectContext(),
        workspacePanelState: createEmptyWorkspacePanelState(),
        workspaceMode: "normal",
        sessionTotalTokens: 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER,
        ...overrides
    };
    session.projectContext = normalizeStoredSessionProjectContext(session.projectContext);
    session.workspacePanelState = normalizeStoredWorkspacePanelState(session.workspacePanelState);
    session.workspaceMode = normalizeChatWorkspaceMode(session.workspaceMode, session.projectContext);
    return session;
}

function createChatSessionForCurrentDraft(overrides = {}) {
    const pendingRoot = getPendingProjectChatRoot();
    const pendingOverrides = pendingRoot
        ? {
            workspaceMode: "project",
            projectContext: createProjectContextForRoot(pendingRoot)
        }
        : {};
    return createChatSession({
        ...pendingOverrides,
        ...overrides
    });
}

function createEmptyComposerDraft() {
    return {
        text: "",
        attachments: [],
        updatedAt: ""
    };
}

function normalizeStoredComposerDraft(raw) {
    if (!raw || typeof raw !== "object") return createEmptyComposerDraft();
    return {
        text: String(raw.text || ""),
        attachments: Array.isArray(raw.attachments)
            ? raw.attachments.map(normalizeStoredComposerDraftAttachment).filter(Boolean)
            : [],
        updatedAt: String(raw.updatedAt || "")
    };
}

function normalizeStoredComposerDraftAttachment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const path = String(raw.path || raw.filePath || "").trim();
    const sourceSrc = String(raw.sourceSrc || raw.src || "").trim();
    const pathName = typeof getFileNameFromPath === "function" ? getFileNameFromPath(path) : path.split(/[\\/]/).filter(Boolean).pop();
    const name = String(raw.name || pathName || "attachment").trim();
    if (!path && !sourceSrc && !raw.liveOnly) return null;
    return {
        name,
        type: String(raw.type || (typeof inferAttachmentMimeType === "function" ? inferAttachmentMimeType(name) : "") || "application/octet-stream"),
        size: Number(raw.size || 0) || 0,
        lastModified: Number(raw.lastModified || 0) || 0,
        path,
        sourceSrc,
        librarySourceKey: String(raw.librarySourceKey || ""),
        librarySourceId: String(raw.librarySourceId || "")
    };
}

function composerDraftHasContent(draft) {
    if (!draft) return false;
    return Boolean(
        String(draft.text || "").trim()
        || (Array.isArray(draft.attachments) && draft.attachments.length > 0)
        || (Array.isArray(draft.liveFiles) && draft.liveFiles.length > 0)
    );
}

function normalizeStoredChatSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const now = new Date().toISOString();
    const conversationHistory = cloneConversationHistory(raw.conversationHistory, { includeImages: false });
    const historyTokenTotal = sumHistoryTokenUsage(conversationHistory);
    const trustedStoredTotal = raw.sessionTokenSource === TOKEN_USAGE_SOURCE_PROVIDER
        ? normalizeTokenCount(raw.sessionTotalTokens)
        : null;
    return createChatSession({
        id: String(raw.id || createSessionId()),
        title: cleanSessionTitle(raw.title || "Current Session"),
        createdAt: raw.createdAt || raw.updatedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || now,
        pinned: Boolean(raw.pinned),
        archived: Boolean(raw.archived),
        manualTitle: Boolean(raw.manualTitle),
        assistantTitle: Boolean(raw.assistantTitle),
        chatHtml: sanitizeChatHtmlMediaSources(typeof raw.chatHtml === "string" ? raw.chatHtml : ""),
        conversationHistory,
        composerDraft: normalizeStoredComposerDraft(raw.composerDraft),
        projectContext: normalizeStoredSessionProjectContext(raw.projectContext),
        workspacePanelState: normalizeStoredWorkspacePanelState(raw.workspacePanelState),
        workspaceMode: normalizeChatWorkspaceMode(raw.workspaceMode, normalizeStoredSessionProjectContext(raw.projectContext)),
        sessionTotalTokens: Math.max(historyTokenTotal, trustedStoredTotal || 0),
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER
    });
}

function readStoredChatSessions() {
    const raw = safeLocalStorageGet(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeStoredChatSession)
            .filter(session => session && chatSessionHasContent(session));
    } catch (err) {
        console.warn("Could not parse saved Fauna chats:", err);
        return [];
    }
}

function getActiveSession() {
    return chatSessions.find(session => session.id === activeSessionId) || null;
}

function getChatSessionById(sessionId) {
    return chatSessions.find(session => session.id === sessionId) || null;
}

function isActiveChatArchived() {
    return Boolean(getActiveSession()?.archived);
}

function isChatSessionVisible(sessionId) {
    return Boolean(
        sessionId
        && activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND
        && activeSessionId === sessionId
    );
}

function chatSessionHasContent(session) {
    if (!session) return false;
    return Boolean(
        session.chatHtml?.trim() ||
        session.domNodes?.length ||
        session.conversationHistory?.length
    );
}

function activeChatHasContent() {
    return Boolean(chat?.children.length || conversationHistory.length || getCurrentComposerDraftHasContent());
}

function activeChatHasPersistableContent() {
    return Boolean(chat?.children.length || conversationHistory.length);
}

let promptTimelineElement = null;

function getPromptTimelineDate(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? null : date;
}

function trimPromptTimelineText(value = "", maxLength = PROMPT_TIMELINE_PROMPT_PREVIEW_CHARS) {
    const text = String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...` : text;
}

function cleanPromptTimelineText(content = "", maxLength = PROMPT_TIMELINE_PROMPT_PREVIEW_CHARS) {
    let text = String(content || "");
    if (typeof stripAssistantControlBlocks === "function") {
        text = stripAssistantControlBlocks(text);
    }
    text = text
        .split(/\n\n--- Attached File Content:/i)[0]
        .replace(/\n+\[Voice chat settings\][\s\S]*$/i, "")
        .replace(/\n+--- Web Search Context ---[\s\S]*?--- End Web Search Context ---/gi, "")
        .replace(/\n+--- Local Workspace Bridge Context ---[\s\S]*?--- End Local Workspace Bridge Context ---/gi, "")
        .replace(/\n+--- Approx Location Weather Context ---[\s\S]*?--- End Approx Location Weather Context ---/gi, "")
        .replace(/\n+--- Image Analysis Context[^\n]*---[\s\S]*?--- End Image Analysis Context ---/gi, "")
        .replace(/\n+\[Local workspace bridge was requested[\s\S]*$/i, "");
    return trimPromptTimelineText(text, maxLength);
}

function getAssistantTurnDurationMs(messageIndex, history = conversationHistory) {
    const index = Number(messageIndex);
    if (!Number.isInteger(index) || index < 0 || !Array.isArray(history)) return null;
    const assistant = history[index];
    if (!assistant || assistant.role !== "assistant") return null;
    const completedAt = getPromptTimelineDate(assistant.createdAt);
    if (!completedAt) return null;

    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const message = history[cursor];
        if (message?.role !== "user") continue;
        const startedAt = getPromptTimelineDate(message.createdAt);
        if (!startedAt) return null;
        const duration = completedAt.getTime() - startedAt.getTime();
        return duration >= 0 ? duration : null;
    }
    return null;
}

function formatTurnDurationLabel(durationMs) {
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration < 0) return "";
    if (duration < 1000) return "<1s";
    return formatDuration(duration);
}

function collectPromptTimelineTurns(history = conversationHistory) {
    const source = Array.isArray(history) ? history : [];
    const turns = [];
    let currentTurn = null;

    source.forEach((message, index) => {
        if (message?.role === "user") {
            if (currentTurn) turns.push(currentTurn);
            currentTurn = {
                userIndex: index,
                assistantIndex: null,
                prompt: cleanPromptTimelineText(message.content),
                response: "",
                startedAt: message.createdAt || ""
            };
            return;
        }

        if (message?.role === "assistant" && currentTurn && currentTurn.assistantIndex === null) {
            currentTurn.assistantIndex = index;
            currentTurn.response = cleanPromptTimelineText(message.content, PROMPT_TIMELINE_RESPONSE_PREVIEW_CHARS);
            currentTurn.completedAt = message.createdAt || "";
            currentTurn.durationMs = getAssistantTurnDurationMs(index, source);
        }
    });

    if (currentTurn) turns.push(currentTurn);
    return turns.filter(turn => turn.prompt);
}

function getPromptTimelineToolLabels(assistantIndex) {
    if (!chat || !Number.isInteger(assistantIndex)) return [];
    const messageNode = chat.querySelector(`.message-node.output-node[data-history-index="${assistantIndex}"]`);
    if (!messageNode) return [];
    const labels = [];
    messageNode.querySelectorAll(".tool-activity-row:not(.tool-activity-row-preview):not(.tool-activity-row-done)").forEach(row => {
        const label = row.querySelector(".tool-activity-label")?.textContent?.trim();
        if (label && !labels.includes(label)) labels.push(label);
    });
    return labels.slice(0, 3);
}

function ensurePromptTimelineElement() {
    if (promptTimelineElement?.isConnected) return promptTimelineElement;
    const mainContent = document.querySelector(".main-content");
    if (!mainContent) return null;

    promptTimelineElement = document.createElement("nav");
    promptTimelineElement.id = "promptTimeline";
    promptTimelineElement.className = "prompt-timeline";
    promptTimelineElement.setAttribute("aria-label", "Prompt timeline");
    promptTimelineElement.hidden = true;
    promptTimelineElement.addEventListener("click", event => {
        const item = event.target.closest("[data-prompt-timeline-index]");
        if (!item) return;
        scrollToPromptTimelineTurn(Number(item.dataset.promptTimelineIndex));
    });
    mainContent.appendChild(promptTimelineElement);
    return promptTimelineElement;
}

function renderPromptTimeline(history = conversationHistory) {
    const timeline = ensurePromptTimelineElement();
    if (!timeline) return;
    const turns = collectPromptTimelineTurns(history);
    const shouldShow = activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND
        && turns.length >= PROMPT_TIMELINE_MIN_PROMPTS
        && activeChatHasContent();

    timeline.hidden = !shouldShow;
    document.body?.classList.toggle("prompt-timeline-visible", shouldShow);
    if (!shouldShow) {
        timeline.replaceChildren();
        return;
    }

    const visibleTurns = turns.slice(-PROMPT_TIMELINE_MAX_ITEMS);
    const latestAssistantIndex = [...visibleTurns].reverse().find(turn => turn.assistantIndex !== null)?.assistantIndex;
    const track = document.createElement("div");
    track.className = "prompt-timeline-track";

    visibleTurns.forEach((turn, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "prompt-timeline-item";
        button.dataset.promptTimelineIndex = String(turn.userIndex);
        button.style.setProperty("--timeline-bar-scale", String(0.46 + ((index % 5) * 0.12)));
        if (turn.assistantIndex === latestAssistantIndex) {
            button.classList.add("active");
            button.setAttribute("aria-current", "step");
        }
        button.setAttribute("aria-label", `Jump to prompt: ${turn.prompt}`);

        const bar = document.createElement("span");
        bar.className = "prompt-timeline-bar";
        bar.setAttribute("aria-hidden", "true");

        const card = document.createElement("span");
        card.className = "prompt-timeline-card";
        const title = document.createElement("strong");
        title.textContent = turn.prompt;
        const response = document.createElement("span");
        response.className = "prompt-timeline-response";
        response.textContent = turn.response || "Waiting for the next response.";
        card.append(title, response);

        const metaParts = [];
        const duration = formatTurnDurationLabel(turn.durationMs);
        if (duration) metaParts.push(`Worked ${duration}`);
        const toolLabels = getPromptTimelineToolLabels(turn.assistantIndex);
        if (toolLabels.length > 0) metaParts.push(...toolLabels);
        if (metaParts.length > 0) {
            const meta = document.createElement("span");
            meta.className = "prompt-timeline-meta";
            meta.textContent = metaParts.join("  /  ");
            card.appendChild(meta);
        }

        button.append(bar, card);
        track.appendChild(button);
    });

    timeline.replaceChildren(track);
}

function ensurePromptTimelineTurnRendered(userIndex) {
    if (!chat || !Number.isInteger(userIndex)) return null;
    let node = chat.querySelector(`.message-node.user-node[data-history-index="${userIndex}"]`);
    if (node) return node;
    if (!Array.isArray(conversationHistory) || userIndex < 0 || userIndex >= conversationHistory.length) return null;

    renderChatHistoryWindow(conversationHistory, {
        start: Math.max(0, userIndex - 2),
        end: Math.min(conversationHistory.length, userIndex + 8),
        replace: true,
        sessionId: activeSessionId
    });
    node = chat.querySelector(`.message-node.user-node[data-history-index="${userIndex}"]`);
    return node;
}

function scrollToPromptTimelineTurn(userIndex) {
    const node = ensurePromptTimelineTurnRendered(userIndex);
    if (!node) return;
    document.querySelectorAll(".prompt-timeline-item.active").forEach(item => item.classList.remove("active"));
    document.querySelector(`.prompt-timeline-item[data-prompt-timeline-index="${userIndex}"]`)?.classList.add("active");
    node.classList.add("timeline-highlight");
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => node.classList.remove("timeline-highlight"), 1200);
}

function hasTurnToolActivity(parentBubbleBlock) {
    return Boolean(parentBubbleBlock?.querySelector?.(".tool-activity-card"));
}

function appendTurnDurationAction(actions, messageIndex, parentBubbleBlock = null) {
    if (!actions) return null;
    actions.querySelector(".turn-duration-pill")?.remove();
    const durationMs = getAssistantTurnDurationMs(messageIndex);
    const durationLabel = formatTurnDurationLabel(durationMs);
    if (!durationLabel) return null;

    const hasTools = hasTurnToolActivity(parentBubbleBlock || actions.closest(".bubble-block"));
    const node = document.createElement(hasTools ? "button" : "span");
    node.className = `turn-duration-pill${hasTools ? "" : " turn-duration-static"}`;
    node.textContent = `Worked ${durationLabel}`;
    if (hasTools) {
        node.type = "button";
        node.dataset.turnDurationToggle = "true";
        node.dataset.tooltip = "Show tool activity";
        node.setAttribute("aria-label", `Show tool activity for this response. Worked ${durationLabel}.`);
        node.setAttribute("aria-expanded", "false");
    } else {
        node.setAttribute("aria-label", `Response worked ${durationLabel}.`);
    }

    const time = actions.querySelector(".message-action-time");
    if (time) {
        actions.insertBefore(node, time);
    } else {
        actions.appendChild(node);
    }
    return node;
}

function setToolActivityCardCollapsed(card, collapsed) {
    if (!card) return;
    const isCollapsed = Boolean(collapsed);
    const toggle = card.querySelector("[data-tool-activity-toggle]");
    const list = card.querySelector(".tool-activity-list");
    toggle?.setAttribute("aria-expanded", String(!isCollapsed));
    card.classList.toggle("collapsed", isCollapsed);
    card.classList.toggle("expanded", !isCollapsed);
    card.classList.toggle("turn-activity-expanded", !isCollapsed);
    card.classList.add("turn-activity-animating");
    if (list) list.hidden = isCollapsed;
    window.setTimeout(() => card.classList.remove("turn-activity-animating"), 260);
}

function setToolActivityBubbleCollapsed(bubble, collapsed) {
    if (!bubble) return;
    const state = bubble._faunaToolActivityState;
    if (state) {
        state.collapsed = Boolean(collapsed);
    }
    bubble.querySelectorAll(".tool-activity-card").forEach(card => setToolActivityCardCollapsed(card, collapsed));
}

function toggleTurnToolActivityDetails(control) {
    const messageNode = control?.closest?.(".message-node.output-node");
    if (!messageNode) return;
    const cards = Array.from(messageNode.querySelectorAll(".tool-activity-card"));
    if (cards.length === 0) return;
    const shouldExpand = !cards.some(card => card.classList.contains("expanded") && !card.querySelector(".tool-activity-list")?.hidden);
    const bubbles = Array.from(messageNode.querySelectorAll(".tool-activity-bubble"));
    if (bubbles.length > 0) {
        bubbles.forEach(bubble => setToolActivityBubbleCollapsed(bubble, !shouldExpand));
    } else {
        cards.forEach(card => setToolActivityCardCollapsed(card, !shouldExpand));
    }
    control.setAttribute("aria-expanded", String(shouldExpand));
    control.dataset.tooltip = shouldExpand ? "Hide tool activity" : "Show tool activity";
    control.setAttribute("aria-label", shouldExpand ? "Hide tool activity for this response." : "Show tool activity for this response.");
    messageNode.classList.toggle("turn-tools-expanded", shouldExpand);
}

function getHistoryIndexFromChatNode(node) {
    const value = Number(node?.dataset?.historyIndex);
    return Number.isInteger(value) && value >= 0 ? value : null;
}

function ensureChatRenderHeightCacheSession(sessionId = activeSessionId) {
    const normalized = sessionId || "";
    if (chatRenderHeightCacheSessionId === normalized) return;
    chatRenderHeightCache.clear();
    chatRenderHeightCacheSessionId = normalized;
    chatRenderAverageMessageHeight = CHAT_RENDER_WINDOW_ESTIMATED_MESSAGE_HEIGHT_PX;
}

function getRenderedChatNodeOuterHeight(node) {
    if (!(node instanceof HTMLElement)) return 0;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    return Math.max(0, rect.height + marginTop + marginBottom);
}

function cacheRenderedChatNodeHeight(node, sessionId = activeSessionId) {
    ensureChatRenderHeightCacheSession(sessionId);
    const index = getHistoryIndexFromChatNode(node);
    if (index === null) return 0;
    const height = getRenderedChatNodeOuterHeight(node);
    if (height <= 0) return 0;
    chatRenderHeightCache.set(index, height);
    return height;
}

function measureRenderedChatMessageHeights(sessionId = activeSessionId) {
    if (!chat) return;
    ensureChatRenderHeightCacheSession(sessionId);
    const heights = [];
    chat.querySelectorAll(".message-node[data-history-index]").forEach(node => {
        const height = cacheRenderedChatNodeHeight(node, sessionId);
        if (height > 0) heights.push(height);
    });
    if (heights.length > 0) {
        const average = heights.reduce((total, height) => total + height, 0) / heights.length;
        chatRenderAverageMessageHeight = Math.min(420, Math.max(72, average));
    }
}

function getEstimatedChatSegmentHeight(start, end, sessionId = activeSessionId) {
    ensureChatRenderHeightCacheSession(sessionId);
    const safeStart = Math.max(0, Number(start) || 0);
    const safeEnd = Math.max(safeStart, Number(end) || 0);
    let height = 0;
    for (let index = safeStart; index < safeEnd; index += 1) {
        height += chatRenderHeightCache.get(index) || chatRenderAverageMessageHeight;
    }
    return Math.round(height);
}

function getChatWindowSpacer(kind) {
    if (!chat) return null;
    const normalized = kind === "bottom" ? "bottom" : "top";
    let spacer = chat.querySelector(`.chat-window-spacer[data-chat-window-spacer="${normalized}"]`);
    if (!spacer) {
        spacer = document.createElement("div");
        spacer.className = `chat-window-spacer chat-window-spacer-${normalized}`;
        spacer.dataset.chatWindowSpacer = normalized;
        spacer.setAttribute("aria-hidden", "true");
        spacer.hidden = true;
    }
    return spacer;
}

function getTopChatWindowSpacer() {
    return getChatWindowSpacer("top");
}

function getBottomChatWindowSpacer() {
    return getChatWindowSpacer("bottom");
}

function ensureChatWindowSpacers() {
    if (!chat) return { top: null, bottom: null };
    const top = getTopChatWindowSpacer();
    const bottom = getBottomChatWindowSpacer();
    if (top && top.parentElement !== chat) {
        chat.insertBefore(top, chat.firstChild);
    } else if (top && chat.firstChild !== top) {
        chat.insertBefore(top, chat.firstChild);
    }
    if (bottom && bottom.parentElement !== chat) {
        chat.appendChild(bottom);
    } else if (bottom && chat.lastChild !== bottom) {
        chat.appendChild(bottom);
    }
    return { top, bottom };
}

function removeChatWindowSpacers() {
    chat?.querySelectorAll(".chat-window-spacer").forEach(spacer => spacer.remove());
}

function setChatWindowSpacerHeight(spacer, height, count) {
    if (!(spacer instanceof HTMLElement)) return;
    const safeCount = Math.max(0, Number(count) || 0);
    const safeHeight = Math.max(0, Math.round(Number(height) || 0));
    spacer.dataset.messageCount = String(safeCount);
    if (safeCount <= 0 || safeHeight <= 0) {
        spacer.style.height = "0px";
        spacer.hidden = true;
        spacer.remove();
        return;
    }
    spacer.style.height = `${safeHeight}px`;
    spacer.hidden = false;
}

function updateChatWindowSpacers(history = conversationHistory, sessionId = activeSessionId) {
    if (!chat) return;
    const source = Array.isArray(history) ? history : [];
    const total = source.length;
    const isWindowed = Boolean(
        total > 0
        && chatRenderWindowSessionId === (sessionId || "")
        && chatRenderWindowEnd > 0
        && (chatRenderWindowStart > 0 || chatRenderWindowEnd < total)
    );
    chat.classList.toggle("chat-windowed", isWindowed);
    if (!isWindowed) {
        removeChatWindowSpacers();
        return;
    }

    const { top, bottom } = ensureChatWindowSpacers();
    measureRenderedChatMessageHeights(sessionId);
    const bottomCount = Math.max(0, total - chatRenderWindowEnd);
    setChatWindowSpacerHeight(top, 0, 0);
    setChatWindowSpacerHeight(bottom, getEstimatedChatSegmentHeight(chatRenderWindowEnd, total, sessionId), bottomCount);
}

function getFirstRenderedChatMessageNode() {
    return chat?.querySelector(".message-node[data-history-index]") || null;
}

function getLastRenderedChatMessageNode() {
    const nodes = chat ? Array.from(chat.querySelectorAll(".message-node[data-history-index]")) : [];
    return nodes[nodes.length - 1] || null;
}

function updateChatRenderWindowState(start = 0, end = 0, sessionId = activeSessionId, history = conversationHistory) {
    const normalizedSessionId = sessionId || "";
    ensureChatRenderHeightCacheSession(normalizedSessionId);
    chatRenderWindowStart = Math.max(0, Number(start) || 0);
    chatRenderWindowEnd = Math.max(chatRenderWindowStart, Number(end) || 0);
    chatRenderWindowSessionId = normalizedSessionId;
    if (!chat) return;
    chat.dataset.renderWindowStart = String(chatRenderWindowStart);
    chat.dataset.renderWindowEnd = String(chatRenderWindowEnd);
    updateChatWindowSpacers(history, normalizedSessionId);
}

function resetChatRenderWindowState(sessionId = activeSessionId) {
    updateChatRenderWindowState(0, 0, sessionId);
    if (chat) {
        delete chat.dataset.renderWindowStart;
        delete chat.dataset.renderWindowEnd;
        chat.classList.remove("chat-windowed");
        removeChatWindowSpacers();
    }
}

function isChatDomFullyRendered(history = conversationHistory) {
    const total = Array.isArray(history) ? history.length : 0;
    if (total <= 0) return Boolean(chat);
    if (chatRenderWindowSessionId !== activeSessionId || chatRenderWindowEnd <= 0) return true;
    return chatRenderWindowStart <= 0 && chatRenderWindowEnd >= total;
}

function extendChatRenderWindowToHistory(history = conversationHistory) {
    const total = Array.isArray(history) ? history.length : 0;
    if (!total || chatRenderWindowSessionId !== activeSessionId || chatRenderWindowEnd <= 0) return;
    updateChatRenderWindowState(chatRenderWindowStart, Math.max(chatRenderWindowEnd, total), activeSessionId, history);
    scheduleChatRenderWindowPrune();
}

function shouldRenderVisibleGenerationHistory(history = [], sessionId = activeSessionId) {
    if (!chat || !Array.isArray(history) || history.length === 0) return false;
    if (chatRenderWindowSessionId !== sessionId || chatRenderWindowEnd <= 0) return true;
    const latestIndex = history.length - 1;
    return !chat.querySelector(`.message-node[data-history-index="${latestIndex}"]`);
}

function renderContextCompactionDivider(message, { beforeNode = null, index = null } = {}) {
    if (!chat) return null;
    const node = document.createElement("div");
    node.className = "message-node context-compaction-node";
    if (Number.isInteger(index) && index >= 0) {
        node.dataset.historyIndex = String(index);
    }
    if (message?.createdAt) {
        node.dataset.createdAt = String(message.createdAt);
    }

    const divider = document.createElement("div");
    divider.className = "context-compaction-divider";
    divider.setAttribute("role", "note");
    divider.setAttribute("aria-label", "Context automatically compacted");
    divider.dataset.tooltip = "Older chat context was summarized and carried forward.";

    const lineBefore = document.createElement("span");
    lineBefore.className = "context-compaction-line";
    lineBefore.setAttribute("aria-hidden", "true");

    const content = document.createElement("span");
    content.className = "context-compaction-content";

    const icon = document.createElement("span");
    icon.className = "context-compaction-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h10"></path>
            <path d="M4 12h16"></path>
            <path d="M4 17h8"></path>
            <path d="m16 15 2 2 3-4"></path>
        </svg>
    `;

    const label = document.createElement("span");
    label.textContent = "Context automatically compacted";
    content.append(icon, label);

    const lineAfter = document.createElement("span");
    lineAfter.className = "context-compaction-line";
    lineAfter.setAttribute("aria-hidden", "true");

    divider.append(lineBefore, content, lineAfter);
    node.appendChild(divider);

    if (beforeNode instanceof Node && beforeNode.parentElement === chat) {
        chat.insertBefore(node, beforeNode);
    } else {
        chat.appendChild(node);
    }
    return node;
}

function getGeneratedMediaVisibleContent(content = "", mediaItems = []) {
    let text = String(content || "");
    if (typeof stripAssistantControlBlocks === "function") {
        text = stripAssistantControlBlocks(text);
    }
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
        return text.trim();
    }
    text = text
        .replace(/(?:^|\n{2,})Generated image(?: edit)? for:[\s\S]*?\n\n\[Generated image preview is visible in the chat\. Image data is omitted from model context\.\]/gi, "\n\n")
        .replace(/(?:^|\n{2,})(?:Generated Wan video clip for:|Wan was unavailable, so Fauna generated a fallback 10 second animated clip for:)[\s\S]*?\n\n\S+/gi, "\n\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    return text;
}

function renderGeneratedMediaItemsIntoBubble(bubble, mediaItems = [], visibleContent = "") {
    const items = typeof normalizeGeneratedMediaItems === "function"
        ? normalizeGeneratedMediaItems(mediaItems)
        : [];
    if (!bubble || items.length === 0) return null;

    let targetBubble = bubble;
    if (visibleContent) {
        renderAssistantContentHtml(bubble, renderMarkdown(visibleContent), { final: true, busy: false });
        targetBubble = createSiblingBubble(bubble) || bubble;
    } else {
        bubble.innerHTML = "";
    }

    let lastBubble = targetBubble;
    items.forEach((item, index) => {
        const mediaBubble = index === 0 ? targetBubble : (createSiblingBubble(lastBubble) || lastBubble);
        if (item.type === "video" && typeof renderGeneratedVideo === "function") {
            renderGeneratedVideo(mediaBubble, item.prompt, item.src, item.extension || "mp4", item.label || "Generated video");
        } else if (item.type === "image" && typeof renderGeneratedImage === "function") {
            renderGeneratedImage(mediaBubble, item.prompt, item.src, item.label || "Generated image", item.sensitive);
        } else {
            renderAssistantContentHtml(mediaBubble, renderMarkdown(item.src), { final: true, busy: false });
        }
        lastBubble = mediaBubble;
    });
    return lastBubble;
}

function getAssistantCopyTextForHistoryMessage(message, visibleContent, rawContent, mediaItems = []) {
    const items = typeof normalizeGeneratedMediaItems === "function"
        ? normalizeGeneratedMediaItems(mediaItems)
        : [];
    const firstMedia = items[0];
    if (firstMedia?.src && typeof getGeneratedMediaCopyText === "function") {
        return getGeneratedMediaCopyText(firstMedia.src, visibleContent || rawContent);
    }
    return visibleContent || String(message?.content || rawContent || "");
}

function renderHistoryMessageIntoChat(history, index, { beforeNode = null } = {}) {
    if (!chat || !Array.isArray(history)) return null;
    const message = history[index];
    if (isContextCompactionMessage(message)) {
        return renderContextCompactionDivider(message, { beforeNode, index });
    }
    const role = message?.role === "user" ? "user" : "output";
    const rawContent = String(message?.content || "").trim();
    const activityItems = role === "output" && typeof normalizeToolActivityItems === "function"
        ? normalizeToolActivityItems(message?.faunaToolActivity || [])
        : [];
    const errorInfo = role === "output" && typeof normalizeErrorHistoryMetadata === "function"
        ? normalizeErrorHistoryMetadata(message?.faunaError || message?.errorInfo || null)
        : null;
    const generatedMediaItems = role === "output" && typeof normalizeGeneratedMediaItems === "function"
        ? normalizeGeneratedMediaItems(message?.faunaGeneratedMedia || message?.generatedMedia || [])
        : [];
    if (!rawContent && !errorInfo && activityItems.length === 0 && generatedMediaItems.length === 0) return null;

    const toolRequest = parseFaunaToolCall(rawContent);
    const visibleContent = role === "output"
        ? getGeneratedMediaVisibleContent(rawContent, generatedMediaItems) || (toolRequest ? getAssistantToolPlaceholder(toolRequest) : "")
        : rawContent;
    const bubble = addRenderNode(visibleContent, role, [], {
        historyIndex: index,
        createdAt: message.createdAt,
        voiceRecording: message.voiceRecording,
        beforeNode,
        forceScroll: false,
        skipScroll: true
    });
    if (!bubble) return null;

    if (role === "output") {
        if (errorInfo) {
            renderErrorCard(bubble, new Error(errorInfo.detail || errorInfo.message), {
                ...errorInfo,
                persist: false
            });
        } else if (activityItems.length > 0) {
            renderToolActivity(bubble, {
                title: getToolActivitySummary(activityItems, "Tool activity"),
                items: activityItems,
                status: "done",
                collapsed: true,
                responseHtml: visibleContent ? renderMarkdown(visibleContent) : ""
            });
            if (generatedMediaItems.length > 0) {
                renderGeneratedMediaItemsIntoBubble(createSiblingBubble(bubble) || bubble, generatedMediaItems);
            }
        } else if (generatedMediaItems.length > 0) {
            renderGeneratedMediaItemsIntoBubble(bubble, generatedMediaItems, visibleContent);
        } else {
            renderAssistantContentHtml(bubble, renderMarkdown(visibleContent), { final: true, busy: false });
        }
        setupAssistantActions(bubble.parentElement, getAssistantCopyTextForHistoryMessage(message, visibleContent, rawContent, generatedMediaItems), {
            messageIndex: index,
            canRegenerate: true,
            canFork: true,
            canSpeak: true,
            speakText: visibleContent,
            completedAt: message.createdAt
        });
    }
    return bubble.closest(".message-node");
}

function renderChatHistoryWindow(history = conversationHistory, {
    start = 0,
    end = history?.length || 0,
    replace = true,
    beforeNode = null,
    sessionId = activeSessionId
} = {}) {
    if (!chat) return { start: 0, end: 0 };
    const source = Array.isArray(history) ? history : [];
    const safeEnd = Math.min(source.length, Math.max(0, Number(end) || 0));
    const safeStart = Math.min(safeEnd, Math.max(0, Number(start) || 0));
    const shouldWindow = safeStart > 0 || safeEnd < source.length;

    if (replace) {
        chat.replaceChildren();
        if (shouldWindow) ensureChatWindowSpacers();
    }
    const anchor = beforeNode instanceof Node && beforeNode.parentElement === chat
        ? beforeNode
        : shouldWindow
            ? getBottomChatWindowSpacer()
            : null;
    for (let index = safeStart; index < safeEnd; index += 1) {
        renderHistoryMessageIntoChat(source, index, { beforeNode: anchor });
    }

    if (replace) {
        updateChatRenderWindowState(safeStart, safeEnd, sessionId, source);
    } else {
        measureRenderedChatMessageHeights(sessionId);
    }
    rehydrateRenderedChat(chat);
    return { start: safeStart, end: safeEnd };
}

function scheduleChatHistoryBackfillIfNeeded() {
    if (!chat || chatRenderWindowStart <= 0 || isChatInitialRenderSettling) return;
    if (chatRenderWindowEnd - chatRenderWindowStart >= CHAT_RENDER_WINDOW_TARGET_COUNT) return;
    window.requestAnimationFrame(() => {
        if (!chat || chatRenderWindowStart <= 0 || isChatInitialRenderSettling) return;
        if (chatRenderWindowEnd - chatRenderWindowStart >= CHAT_RENDER_WINDOW_TARGET_COUNT) return;
        if (chat.scrollHeight <= chat.clientHeight + CHAT_HISTORY_PRELOAD_SCROLL_PX) {
            loadOlderChatMessagesIfNeeded({ force: true });
        }
    });
}

function renderInitialChatHistoryWindow(history = conversationHistory, sessionId = activeSessionId) {
    if (!chat) return;
    isChatInitialRenderSettling = true;
    hasChatUserScrolledSinceRender = false;
    const source = Array.isArray(history) ? history : [];
    const end = source.length;
    const start = Math.max(0, end - CHAT_INITIAL_RENDER_COUNT);
    renderChatHistoryWindow(source, {
        start,
        end,
        replace: true,
        sessionId
    });
    if (end > start) {
        scrollChatToBottom({ force: true, behavior: "auto" });
        window.requestAnimationFrame(() => {
            updateChatWindowSpacers(source, sessionId);
            scrollChatToBottom({ force: true, behavior: "auto" });
            window.requestAnimationFrame(() => {
                updateChatWindowSpacers(source, sessionId);
                scrollChatToBottom({ force: true, behavior: "auto" });
                isChatInitialRenderSettling = false;
            });
        });
    } else {
        isChatInitialRenderSettling = false;
    }
}

function shouldLoadOlderChatMessages(force = false) {
    if (force) return true;
    const firstNode = getFirstRenderedChatMessageNode();
    if (!firstNode || !chat) return chat?.scrollTop <= CHAT_HISTORY_PRELOAD_SCROLL_PX;
    const chatRect = chat.getBoundingClientRect();
    const firstRect = firstNode.getBoundingClientRect();
    const boundaryOffset = firstRect.top - chatRect.top;
    return (
        boundaryOffset >= -CHAT_HISTORY_PRELOAD_SCROLL_PX
        && boundaryOffset <= chat.clientHeight + CHAT_HISTORY_PRELOAD_SCROLL_PX
    );
}

function loadOlderChatMessagesIfNeeded({ force = false } = {}) {
    if (!chat || isChatInitialRenderSettling || isChatHistoryPrepending || isChatHistoryAppending || isChatHistoryPruning) return;
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) return;
    if (!force && !hasChatUserScrolledSinceRender) return;
    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) return;
    if (chatRenderWindowSessionId !== activeSessionId || chatRenderWindowStart <= 0) return;
    if (!shouldLoadOlderChatMessages(force)) return;

    isChatHistoryPrepending = true;
    const previousScrollHeight = chat.scrollHeight;
    const previousScrollTop = chat.scrollTop;
    const beforeNode = getFirstRenderedChatMessageNode() || getBottomChatWindowSpacer();
    const nextStart = Math.max(0, chatRenderWindowStart - CHAT_HISTORY_RENDER_BATCH_SIZE);
    const currentEnd = chatRenderWindowEnd;

    renderChatHistoryWindow(conversationHistory, {
        start: nextStart,
        end: chatRenderWindowStart,
        replace: false,
        beforeNode,
        sessionId: activeSessionId
    });
    updateChatRenderWindowState(nextStart, currentEnd, activeSessionId, conversationHistory);

    window.requestAnimationFrame(() => {
        updateChatWindowSpacers(conversationHistory, activeSessionId);
        const heightDelta = chat.scrollHeight - previousScrollHeight;
        chat.scrollTop = Math.max(0, previousScrollTop + heightDelta);
        isChatPinnedToBottom = false;
        isChatHistoryPrepending = false;
        scheduleChatHistoryBackfillIfNeeded();
        pruneRenderedChatWindow({ prefer: "bottom" });
    });
}

function shouldLoadNewerChatMessages(force = false) {
    if (force) return true;
    const lastNode = getLastRenderedChatMessageNode();
    if (!lastNode || !chat) return false;
    const chatRect = chat.getBoundingClientRect();
    const lastRect = lastNode.getBoundingClientRect();
    return lastRect.bottom - chatRect.bottom <= CHAT_HISTORY_PRELOAD_SCROLL_PX;
}

function loadNewerChatMessagesIfNeeded({ force = false } = {}) {
    if (!chat || isChatInitialRenderSettling || isChatHistoryAppending || isChatHistoryPrepending || isChatHistoryPruning) return;
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) return;
    if (!force && !hasChatUserScrolledSinceRender) return;
    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) return;
    if (chatRenderWindowSessionId !== activeSessionId || chatRenderWindowEnd <= 0) return;
    if (chatRenderWindowEnd >= conversationHistory.length) return;
    if (!shouldLoadNewerChatMessages(force)) return;

    isChatHistoryAppending = true;
    const wasPinnedToBottom = isChatNearBottom();
    const nextEnd = Math.min(conversationHistory.length, chatRenderWindowEnd + CHAT_HISTORY_RENDER_BATCH_SIZE);
    const currentStart = chatRenderWindowStart;
    const beforeNode = getBottomChatWindowSpacer();

    renderChatHistoryWindow(conversationHistory, {
        start: chatRenderWindowEnd,
        end: nextEnd,
        replace: false,
        beforeNode,
        sessionId: activeSessionId
    });
    updateChatRenderWindowState(currentStart, nextEnd, activeSessionId, conversationHistory);

    window.requestAnimationFrame(() => {
        updateChatWindowSpacers(conversationHistory, activeSessionId);
        if (wasPinnedToBottom) {
            scrollChatToBottom({ force: true, behavior: "auto" });
        }
        isChatHistoryAppending = false;
        pruneRenderedChatWindow({ prefer: "top" });
    });
}

function getAutoChatPrunePreference() {
    const total = Array.isArray(conversationHistory) ? conversationHistory.length : 0;
    if (chatRenderWindowStart <= 0 && chatRenderWindowEnd < total) return "bottom";
    if (chatRenderWindowStart > 0 && chatRenderWindowEnd >= total) return "top";
    if (!chat) return "top";
    return chat.scrollTop + (chat.clientHeight / 2) > chat.scrollHeight / 2 ? "top" : "bottom";
}

function canPruneTopChatRange(nextStart, force = false) {
    if (force || !chat) return true;
    const keepNode = chat.querySelector(`.message-node[data-history-index="${nextStart}"]`);
    if (!keepNode) return true;
    const chatRect = chat.getBoundingClientRect();
    const keepRect = keepNode.getBoundingClientRect();
    return keepRect.top - chatRect.top < -CHAT_RENDER_WINDOW_VISIBLE_BUFFER_PX;
}

function canPruneBottomChatRange(nextEnd, force = false) {
    if (force || !chat) return true;
    const firstRemovedNode = chat.querySelector(`.message-node[data-history-index="${nextEnd}"]`);
    if (!firstRemovedNode) return true;
    const chatRect = chat.getBoundingClientRect();
    const removedRect = firstRemovedNode.getBoundingClientRect();
    return removedRect.top - chatRect.bottom > CHAT_RENDER_WINDOW_VISIBLE_BUFFER_PX;
}

function removeRenderedChatRange(start, end) {
    if (!chat) return;
    const safeEnd = Math.max(start, end);
    for (let index = start; index < safeEnd; index += 1) {
        const node = chat.querySelector(`.message-node[data-history-index="${index}"]`);
        if (node) {
            cacheRenderedChatNodeHeight(node, activeSessionId);
            node.remove();
        }
    }
}

function pruneRenderedChatWindow({ prefer = "auto", force = false } = {}) {
    if (!chat || isChatInitialRenderSettling || isChatHistoryPrepending || isChatHistoryAppending || isChatHistoryPruning) return;
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) return;
    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) return;
    if (chatRenderWindowSessionId !== activeSessionId || chatRenderWindowEnd <= 0) return;

    const renderedCount = chatRenderWindowEnd - chatRenderWindowStart;
    if (renderedCount <= CHAT_RENDER_WINDOW_MAX_COUNT) return;

    const direction = prefer === "top" || prefer === "bottom" ? prefer : getAutoChatPrunePreference();
    const trimCount = Math.max(0, renderedCount - CHAT_RENDER_WINDOW_TARGET_COUNT);
    if (trimCount <= 0) return;

    isChatHistoryPruning = true;
    measureRenderedChatMessageHeights(activeSessionId);
    const previousScrollHeight = chat.scrollHeight;
    const previousScrollTop = chat.scrollTop;

    if (direction === "bottom") {
        const nextEnd = Math.max(chatRenderWindowStart + CHAT_RENDER_WINDOW_TARGET_COUNT, chatRenderWindowEnd - trimCount);
        if (nextEnd >= chatRenderWindowEnd || !canPruneBottomChatRange(nextEnd, force)) {
            isChatHistoryPruning = false;
            return;
        }
        removeRenderedChatRange(nextEnd, chatRenderWindowEnd);
        updateChatRenderWindowState(chatRenderWindowStart, nextEnd, activeSessionId, conversationHistory);
        window.requestAnimationFrame(() => {
            updateChatWindowSpacers(conversationHistory, activeSessionId);
            chat.scrollTop = previousScrollTop;
            isChatHistoryPruning = false;
        });
        return;
    }

    const nextStart = Math.min(chatRenderWindowEnd - CHAT_RENDER_WINDOW_TARGET_COUNT, chatRenderWindowStart + trimCount);
    if (nextStart <= chatRenderWindowStart || !canPruneTopChatRange(nextStart, force)) {
        isChatHistoryPruning = false;
        return;
    }
    removeRenderedChatRange(chatRenderWindowStart, nextStart);
    updateChatRenderWindowState(nextStart, chatRenderWindowEnd, activeSessionId, conversationHistory);
    window.requestAnimationFrame(() => {
        updateChatWindowSpacers(conversationHistory, activeSessionId);
        const heightDelta = chat.scrollHeight - previousScrollHeight;
        chat.scrollTop = Math.max(0, previousScrollTop + heightDelta);
        isChatPinnedToBottom = isChatNearBottom();
        isChatHistoryPruning = false;
    });
}

function scheduleChatRenderWindowPrune() {
    if (chatRenderWindowPruneFrame || !chat) return;
    chatRenderWindowPruneFrame = window.requestAnimationFrame(() => {
        chatRenderWindowPruneFrame = 0;
        pruneRenderedChatWindow();
    });
}

function serializeComposerDraftAttachment(file) {
    if (!(file instanceof File)) return null;
    const desktopPath = String(file.__faunaDesktopFilePath || "").trim();
    const desktopPreview = String(file.__faunaDesktopPreviewSrc || "").trim();
    const persistentSrc = String(file.__faunaPersistentPreviewSrc || file.__faunaLibrarySourceSrc || desktopPreview || "").trim();
    const sourceSrc = desktopPath
        ? ""
        : /^(?:https?:|data:|fauna-app:|fauna-file:|file:)/i.test(persistentSrc)
            ? persistentSrc
            : "";

    return {
        name: file.name || "attachment",
        type: file.type || (typeof inferAttachmentMimeType === "function" ? inferAttachmentMimeType(file.name) : "") || "application/octet-stream",
        size: Number(file.size || 0) || 0,
        lastModified: Number(file.lastModified || 0) || 0,
        path: desktopPath,
        sourceSrc,
        librarySourceKey: String(file.__faunaLibrarySourceKey || ""),
        librarySourceId: String(file.__faunaLibrarySourceId || ""),
        liveOnly: !desktopPath && !sourceSrc
    };
}

function captureComposerDraft() {
    const files = Array.from(attachedFiles || []).filter(file => file instanceof File);
    const attachments = files.map(serializeComposerDraftAttachment).filter(Boolean);
    return {
        text: input?.value || "",
        attachments,
        liveFiles: files,
        updatedAt: new Date().toISOString()
    };
}

function serializeComposerDraftForStorage(draft = createEmptyComposerDraft()) {
    const normalized = normalizeStoredComposerDraft(draft);
    const attachments = Array.isArray(normalized.attachments)
        ? normalized.attachments.filter(attachment => !attachment.liveOnly && (attachment.path || attachment.sourceSrc))
        : [];
    return {
        text: normalized.text,
        attachments,
        updatedAt: normalized.updatedAt || ""
    };
}

function getCurrentComposerDraftHasContent() {
    if (String(input?.value || "").trim()) return true;
    return Array.isArray(attachedFiles) && attachedFiles.length > 0;
}

function setComposerTextValue(text = "") {
    if (!input) return;
    input.value = String(text || "");
    input.style.height = "auto";
    if (input.value) input.style.height = `${input.scrollHeight}px`;
}

function clearSessionComposerDraft(sessionId, { persist = false, render = false } = {}) {
    const session = getChatSessionById(sessionId);
    if (!session) return;
    session.composerDraft = createEmptyComposerDraft();
    if (persist) persistChatSessions();
    if (render) renderChatHistory();
}

function persistActiveComposerDraft({ render = false, updateUrl = true } = {}) {
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) return null;
    const draft = captureComposerDraft();
    let session = getActiveSession();
    let shouldRender = render;
    if (!session) {
        return null;
    }

    const hasStoredChatContent = Boolean(
        session.chatHtml?.trim()
        || session.domNodes?.length
        || session.conversationHistory?.length
    );
    if (!composerDraftHasContent(draft) && !hasStoredChatContent) {
        chatSessions = chatSessions.filter(item => item.id !== session.id);
        if (activeSessionId === session.id) activeSessionId = null;
        persistChatSessions();
        updateActiveChatTitle();
        if (updateUrl) updateWorkspaceUrlFragment({ replace: true });
        renderChatHistory();
        return null;
    }

    session.composerDraft = draft;
    if (!session.manualTitle && !session.assistantTitle && !session.conversationHistory?.length) {
        const previousTitle = session.title;
        session.title = deriveSessionTitle(session);
        if (session.title !== previousTitle) {
            shouldRender = true;
            updateActiveChatTitle();
        }
    }
    session.updatedAt = draft.updatedAt || new Date().toISOString();
    persistChatSessions();
    if (shouldRender) renderChatHistory();
    return session;
}

function scheduleComposerDraftSave({ immediate = false, render = false } = {}) {
    if (isRestoringComposerDraft) return;
    if (composerDraftSaveTimer) {
        window.clearTimeout(composerDraftSaveTimer);
        composerDraftSaveTimer = null;
    }
    if (immediate) {
        persistActiveComposerDraft({ render });
        return;
    }
    composerDraftSaveTimer = window.setTimeout(() => {
        composerDraftSaveTimer = null;
        persistActiveComposerDraft({ render });
    }, COMPOSER_DRAFT_SAVE_DEBOUNCE_MS);
}

function getHtmlForSessionNodes(nodes = []) {
    const host = document.createElement("div");
    nodes.forEach(node => {
        if (node instanceof Node) host.appendChild(node.cloneNode(true));
    });
    return sanitizeChatHtmlMediaSources(host.innerHTML || "");
}

function snapshotVisibleChatIntoSession(session, {
    history = conversationHistory,
    tokenTotal = sessionTotalTokens
} = {}) {
    if (!session) return null;
    const hasFullRenderedDom = isChatDomFullyRendered(history);
    const visibleChatHtml = sanitizeChatHtmlMediaSources(chat?.innerHTML || "");
    if (hasFullRenderedDom) {
        session.chatHtml = visibleChatHtml;
        session.domNodes = chat ? Array.from(chat.childNodes) : [];
    } else {
        session.domNodes = [];
    }
    session.conversationHistory = cloneConversationHistory(history);
    session.composerDraft = captureComposerDraft();
    session.workspacePanelState = captureWorkspacePanelState();
    session.sessionTotalTokens = tokenTotal;
    session.sessionTokenSource = TOKEN_USAGE_SOURCE_PROVIDER;
    if (!session.manualTitle && !session.assistantTitle) {
        session.title = deriveSessionTitle(session);
    }
    session.updatedAt = new Date().toISOString();
    syncUsageToolEventsFromSession(session, { html: hasFullRenderedDom ? session.chatHtml : visibleChatHtml || session.chatHtml });
    return session;
}

function updateStoredSessionFromGeneration(sessionId, {
    history = [],
    tokenTotal = 0,
    render = true
} = {}) {
    const session = getChatSessionById(sessionId);
    if (!session) return null;

    if (isChatSessionVisible(sessionId)) {
        conversationHistory = cloneConversationHistory(history);
        sessionTotalTokens = tokenTotal;
        const keepLiveGenerationDom = typeof isSessionGenerating === "function"
            && isSessionGenerating(sessionId)
            && typeof findVisibleGenerationBubble === "function"
            && Boolean(findVisibleGenerationBubble());
        if (keepLiveGenerationDom) {
            extendChatRenderWindowToHistory(conversationHistory);
        } else if (shouldRenderVisibleGenerationHistory(conversationHistory, sessionId)) {
            renderInitialChatHistoryWindow(conversationHistory, sessionId);
        } else {
            extendChatRenderWindowToHistory(conversationHistory);
        }
        ensureVisibleGenerationProgress?.(sessionId);
        snapshotVisibleChatIntoSession(session, { history, tokenTotal });
        updateTokenDisplay();
        updateActiveChatTitle();
    } else {
        session.conversationHistory = cloneConversationHistory(history);
        session.sessionTotalTokens = tokenTotal;
        session.sessionTokenSource = TOKEN_USAGE_SOURCE_PROVIDER;
        if (Array.isArray(session.domNodes) && session.domNodes.length > 0) {
            session.chatHtml = getHtmlForSessionNodes(session.domNodes);
        }
        if (!session.manualTitle && !session.assistantTitle) {
            session.title = deriveSessionTitle(session);
        }
        session.updatedAt = new Date().toISOString();
        syncUsageToolEventsFromSession(session, { html: session.chatHtml });
    }

    persistChatSessions();
    if (render) renderChatHistory();
    refreshUsageSettingsPaneIfVisible();
    refreshLibraryViewIfActive();
    renderPromptTimeline(history);
    return session;
}

function ensureWritableActiveChatSession() {
    const active = getActiveSession();
    if (active?.archived) {
        showToast("Archived chats are read-only. Restore the chat before writing.", "warning");
        return null;
    }
    if (active) return active;

    const session = createChatSessionForCurrentDraft();
    chatSessions.unshift(session);
    activeSessionId = session.id;
    clearPendingProjectChatRoot();
    persistChatSessions();
    renderChatHistory();
    updateActiveChatTitle();
    if (activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
        updateWorkspaceUrlFragment({ replace: true });
    }
    return session;
}

function deriveSessionTitle(session = getActiveSession()) {
    const firstUserMessage = (session?.conversationHistory || conversationHistory)
        .find(message => message.role === "user" && message.content);
    const draftText = session?.composerDraft?.text || (session?.id === activeSessionId ? input?.value : "");
    const firstUserBubble = chat?.querySelector(".user-node .bubble")?.textContent;
    return cleanSessionTitle(firstUserMessage?.content || firstUserBubble || draftText || session?.title || "Current Session");
}

function updateActiveChatTitle() {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        if (chatTitle) chatTitle.textContent = "Library";
        if (chatTitleInput && !isChatTitleEditing) chatTitleInput.value = "Library";
        document.title = "Library - Fauna";
        updateWindowBarLocation();
        return;
    }
    const session = getActiveSession();
    const title = session?.title || "Current Session";
    if (chatTitle) chatTitle.textContent = title;
    if (chatTitleInput && !isChatTitleEditing) chatTitleInput.value = title;
    document.title = title === "Current Session" ? "Fauna" : `${title} - Fauna`;
    updateWindowBarLocation();
}

function setChatTitleEditing(editing) {
    if (!chatTitle || !chatTitleInput || !chatTitleEditBtn) return;
    isChatTitleEditing = editing;
    chatTitle.hidden = editing;
    chatTitleInput.hidden = !editing;
    chatTitleEditBtn.classList.toggle("editing", editing);
    chatTitleEditBtn.setAttribute("aria-label", editing ? "Save chat name" : "Rename chat");

    if (editing) {
        chatTitleInput.value = getActiveSession()?.title || "Current Session";
        window.setTimeout(() => {
            chatTitleInput.focus();
            chatTitleInput.select();
        }, 0);
    }
}

function commitChatTitleEdit() {
    if (!isChatTitleEditing || !chatTitleInput) return;
    const session = getActiveSession();
    if (!session) {
        setChatTitleEditing(false);
        return;
    }

    const nextTitle = cleanSessionTitle(chatTitleInput.value, 80);
    session.title = nextTitle;
    session.manualTitle = true;
    session.assistantTitle = false;
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    updateActiveChatTitle();
    renderChatHistory();
    setChatTitleEditing(false);
    showToast("Chat name updated.", "success");
}

function cancelChatTitleEdit() {
    if (!isChatTitleEditing) return;
    if (chatTitleInput) chatTitleInput.value = getActiveSession()?.title || "Current Session";
    setChatTitleEditing(false);
}

function limitSerializedHistory(history, limit = 0) {
    if (!Number.isFinite(limit) || limit <= 0 || history.length <= limit) return history;
    return history.slice(-limit);
}

function serializeChatSession(session, options = {}) {
    const includeHtml = options.includeHtml !== false;
    const historyLimit = Number(options.historyLimit) || 0;
    const conversation = limitSerializedHistory(
        cloneConversationHistory(session.conversationHistory, { includeImages: false }),
        historyLimit
    );

    return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        pinned: Boolean(session.pinned),
        archived: Boolean(session.archived),
        manualTitle: Boolean(session.manualTitle),
        assistantTitle: Boolean(session.assistantTitle),
        chatHtml: includeHtml ? sanitizeChatHtmlMediaSources(session.chatHtml || "") : "",
        conversationHistory: conversation,
        composerDraft: serializeComposerDraftForStorage(session.composerDraft),
        projectContext: normalizeStoredSessionProjectContext(session.projectContext),
        workspacePanelState: normalizeStoredWorkspacePanelState(session.workspacePanelState),
        workspaceMode: normalizeChatWorkspaceMode(session.workspaceMode, session.projectContext),
        sessionTotalTokens: normalizeTokenCount(session.sessionTotalTokens) || 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function trimChatSessions() {
    const maxStoredSessions = getMaxStoredChatSessions();
    if (chatSessions.length <= maxStoredSessions) return;
    const removedSessions = [];
    const removable = [...chatSessions]
        .filter(session => session.id !== activeSessionId)
        .sort((a, b) => {
            if (a.archived !== b.archived) return a.archived ? -1 : 1;
            if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });

    while (chatSessions.length > maxStoredSessions && removable.length > 0) {
        const sessionToRemove = removable.shift();
        removedSessions.push(sessionToRemove);
        chatSessions = chatSessions.filter(session => session.id !== sessionToRemove.id);
    }
    if (removedSessions.length > 0) archiveLibraryItemsFromSessions(removedSessions);
}

function serializeChatSessionsForStorage(profile) {
    return chatSessions.map(session => {
        const isActive = session.id === activeSessionId;
        if (profile === CHAT_STORAGE_PROFILE_ACTIVE_HTML) {
            return serializeChatSession(session, {
                includeHtml: isActive,
                historyLimit: isActive ? 0 : 48
            });
        }
        if (profile === CHAT_STORAGE_PROFILE_HISTORY_ONLY) {
            return serializeChatSession(session, {
                includeHtml: false,
                historyLimit: isActive ? 96 : 40
            });
        }
        if (profile === CHAT_STORAGE_PROFILE_MINIMAL) {
            return serializeChatSession(session, {
                includeHtml: false,
                historyLimit: isActive ? 40 : 12
            });
        }
        return serializeChatSession(session);
    });
}

function getChatStorageProfilesToTry() {
    const profiles = [
        CHAT_STORAGE_PROFILE_FULL,
        CHAT_STORAGE_PROFILE_ACTIVE_HTML,
        CHAT_STORAGE_PROFILE_HISTORY_ONLY,
        CHAT_STORAGE_PROFILE_MINIMAL
    ];
    const startIndex = Math.max(0, profiles.indexOf(getPreferredChatStorageProfile()));
    return profiles.slice(startIndex);
}

function persistChatSessions() {
    trimChatSessions();
    let saved = false;
    for (const profile of getChatStorageProfilesToTry()) {
        const payload = JSON.stringify(serializeChatSessionsForStorage(profile));
        if (safeLocalStorageSet(CHAT_SESSIONS_STORAGE_KEY, payload, { silent: true })) {
            chatStorageProfile = profile;
            saved = true;
            break;
        }
    }

    if (!saved) {
        const storageLabel = isFaunaDesktopApp() ? "AppData storage" : "browser storage";
        console.warn(`Could not save Fauna chat history: ${storageLabel} was unavailable.`);
        if (!hasShownChatStorageWarning) {
            showToast(`Chat history is too large to save locally. Delete or archive older chats to free ${storageLabel}.`, "warning");
            hasShownChatStorageWarning = true;
        }
    } else if (chatStorageProfile !== CHAT_STORAGE_PROFILE_FULL && !hasShownChatStorageWarning) {
        showToast(`${isFaunaDesktopApp() ? "AppData storage" : "Browser storage"} is nearly full, so Fauna saved a lighter chat history snapshot.`, "warning");
        hasShownChatStorageWarning = true;
    }

    if (activeSessionId) {
        safeLocalStorageSet(ACTIVE_CHAT_SESSION_STORAGE_KEY, activeSessionId);
    } else {
        safeLocalStorageRemove(ACTIVE_CHAT_SESSION_STORAGE_KEY);
    }
    return saved;
}

function saveCurrentSession({ render = true, updateUrl = true } = {}) {
    let session = getActiveSession();
    let createdActiveSession = false;
    if (!session) {
        if (!activeChatHasPersistableContent()) {
            if (render) renderChatHistory();
            return null;
        }
        session = createChatSessionForCurrentDraft();
        chatSessions.unshift(session);
        activeSessionId = session.id;
        clearPendingProjectChatRoot();
        createdActiveSession = true;
    }

    snapshotVisibleChatIntoSession(session);

    persistChatSessions();
    updateActiveChatTitle();
    if (render) renderChatHistory();
    refreshUsageSettingsPaneIfVisible();
    refreshLibraryViewIfActive();
    if (createdActiveSession && updateUrl && activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
        updateWorkspaceUrlFragment({ replace: true });
    }
    return session;
}

function compareChatSessions(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function updateArchivedMenuOverflow() {
    archivedHistorySection?.classList.toggle(
        "archived-menu-open",
        Boolean(archivedHistorySection.querySelector(".chat-session-menu-wrap.open"))
    );
}

function closeChatSessionMenus(except = null) {
    document.querySelectorAll(".chat-session-menu-wrap.open").forEach(menuWrap => {
        if (except && menuWrap === except) return;
        menuWrap.classList.remove("open");
        menuWrap.closest(".chat-session-row")?.classList.remove("menu-open");
        const trigger = menuWrap.querySelector(".chat-session-menu-trigger");
        const menu = menuWrap._faunaAnchoredMenu || menuWrap.querySelector(".chat-session-menu");
        trigger?.setAttribute("aria-expanded", "false");
        hideAnchoredSidebarMenu(menu);
    });
    updateArchivedMenuOverflow();
}

function createSessionMenuItem(action, label, iconMarkup, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chat-session-menu-item chat-session-menu-item-${action}`;
    button.setAttribute("role", "menuitem");
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconMarkup}</svg>
        <span></span>
    `;
    button.querySelector("span").textContent = label;
    button.addEventListener("click", event => {
        event.stopPropagation();
        closeChatSessionMenus();
        onSelect();
    });
    return button;
}

function formatChatInfoDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function createChatInfoRow(label, value) {
    const row = document.createElement("div");
    row.className = "chat-info-row";
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.textContent = String(value || "None");
    row.append(labelNode, valueNode);
    return row;
}

function getChatInfoStats(session) {
    const history = Array.isArray(session?.conversationHistory) ? session.conversationHistory : [];
    const draft = session?.composerDraft || createEmptyComposerDraft();
    return {
        messages: history.length,
        userMessages: history.filter(message => message?.role === "user").length,
        assistantMessages: history.filter(message => message?.role === "assistant").length,
        tokens: normalizeTokenCount(session?.sessionTotalTokens) || 0,
        draftText: String(draft.text || "").trim().length,
        draftAttachments: (Array.isArray(draft.attachments) ? draft.attachments.length : 0)
            || (Array.isArray(draft.liveFiles) ? draft.liveFiles.length : 0)
    };
}

function openChatRenameDialog(sessionId) {
    const session = getChatSessionById(sessionId);
    if (!session) return;
    setChatTitleEditing(false);

    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "approval-dialog chat-rename-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "chatRenameDialogTitle");

    const titleNode = document.createElement("h2");
    titleNode.id = "chatRenameDialogTitle";
    titleNode.textContent = "Rename chat";

    const inputLabel = document.createElement("label");
    inputLabel.className = "chat-rename-field";
    const inputLabelText = document.createElement("span");
    inputLabelText.textContent = "Chat name";
    const nameInput = document.createElement("input");
    nameInput.className = "settings-input chat-rename-input";
    nameInput.type = "text";
    nameInput.maxLength = 80;
    nameInput.value = session.title || "Current Session";
    nameInput.setAttribute("aria-label", "Chat name");
    inputLabel.append(inputLabelText, nameInput);

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "provider-btn provider-btn-secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    const saveButton = document.createElement("button");
    saveButton.className = "provider-btn provider-btn-primary";
    saveButton.type = "button";
    saveButton.textContent = "Save";

    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const save = () => {
        const nextTitle = cleanSessionTitle(nameInput.value, 80);
        session.title = nextTitle;
        session.manualTitle = true;
        session.assistantTitle = false;
        session.updatedAt = new Date().toISOString();
        persistChatSessions();
        if (session.id === activeSessionId) updateActiveChatTitle();
        renderChatHistory();
        showToast("Chat name updated.", "success");
        close();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" && document.activeElement === nameInput) {
            event.preventDefault();
            save();
        }
    };

    cancelButton.addEventListener("click", close);
    saveButton.addEventListener("click", save);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(cancelButton, saveButton);
    dialog.append(titleNode, inputLabel, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => {
        nameInput.focus();
        nameInput.select();
    }, 0);
}

function openChatInfoDialog(sessionId) {
    let session = getChatSessionById(sessionId);
    if (!session) return;
    if (session.id === activeSessionId) {
        session = saveCurrentSession({ render: false, updateUrl: false }) || session;
    }
    const stats = getChatInfoStats(session);
    const status = [
        session.pinned ? "Pinned" : "",
        session.archived ? "Archived" : "Active",
        typeof isSessionGenerating === "function" && isSessionGenerating(session.id) ? "Generating" : ""
    ].filter(Boolean).join(" / ");

    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "approval-dialog chat-info-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "chatInfoDialogTitle");

    const titleNode = document.createElement("h2");
    titleNode.id = "chatInfoDialogTitle";
    titleNode.textContent = "Chat info";

    const subtitle = document.createElement("p");
    subtitle.className = "chat-info-title";
    subtitle.textContent = session.title || "Current Session";

    const grid = document.createElement("div");
    grid.className = "chat-info-grid";
    grid.append(
        createChatInfoRow("Status", status),
        createChatInfoRow("Created", formatChatInfoDate(session.createdAt)),
        createChatInfoRow("Updated", formatChatInfoDate(session.updatedAt)),
        createChatInfoRow("Messages", `${stats.messages} (${stats.userMessages} user, ${stats.assistantMessages} AI)`),
        createChatInfoRow("Session tokens", stats.tokens.toLocaleString()),
        createChatInfoRow("Composer draft", stats.draftText || stats.draftAttachments ? `${stats.draftText} chars, ${stats.draftAttachments} attachments` : "None"),
        createChatInfoRow("Chat ID", session.id)
    );

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const closeButton = document.createElement("button");
    closeButton.className = "provider-btn provider-btn-secondary";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    const renameButton = document.createElement("button");
    renameButton.className = "provider-btn provider-btn-primary";
    renameButton.type = "button";
    renameButton.textContent = "Rename";

    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
    };
    closeButton.addEventListener("click", close);
    renameButton.addEventListener("click", () => {
        close();
        openChatRenameDialog(session.id);
    });
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(closeButton, renameButton);
    dialog.append(titleNode, subtitle, grid, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => closeButton.focus(), 0);
}

function createChatSessionRow(session, { variant = "", hideProjectBadge = false } = {}) {
    const generating = typeof isSessionGenerating === "function" && isSessionGenerating(session.id) === true;
    const generationComplete = typeof hasUnreadGenerationCompletion === "function" && hasUnreadGenerationCompletion(session.id) === true;
    const sessionProjectRoot = getSessionProjectRoot(session);
    const row = document.createElement("div");
    row.className = "chat-session-row";
    if (variant) row.classList.add(variant);
    row.classList.toggle("active", session.id === activeSessionId);
    row.classList.toggle("pinned", session.pinned);
    row.classList.toggle("archived", session.archived);
    row.classList.toggle("generating", generating);
    row.classList.toggle("generation-complete", generationComplete);
    row.classList.toggle("menu-drop-up", session.archived);
    row.setAttribute("aria-busy", String(generating));

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "history-item chat-session-main";
    mainButton.setAttribute("aria-label", generating
        ? `${session.title} is generating`
        : generationComplete
            ? `${session.title} has a completed reply`
            : session.title);
    mainButton.setAttribute("aria-current", session.id === activeSessionId ? "page" : "false");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = session.title;
    mainButton.append(dot, label);
    if (sessionProjectRoot && !hideProjectBadge) {
        const projectBadge = document.createElement("span");
        projectBadge.className = "chat-project-badge";
        projectBadge.dataset.tooltip = sessionProjectRoot.name;
        projectBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path></svg>';
        mainButton.appendChild(projectBadge);
    }
    mainButton.addEventListener("click", () => activateChatSession(session.id));

    const activitySpinner = document.createElement("span");
    activitySpinner.className = "chat-session-generating-spinner";
    activitySpinner.setAttribute("aria-hidden", "true");

    const completionDot = document.createElement("span");
    completionDot.className = "chat-session-complete-dot";
    completionDot.setAttribute("aria-hidden", "true");

    const menuWrap = document.createElement("div");
    menuWrap.className = "chat-session-menu-wrap";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "chat-session-menu-trigger";
    menuButton.setAttribute("aria-label", `Options for ${session.title}`);
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.7"></circle>
            <circle cx="12" cy="12" r="1.7"></circle>
            <circle cx="19" cy="12" r="1.7"></circle>
        </svg>
    `;

    const menu = document.createElement("div");
    menu.className = "chat-session-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    const renameButton = createSessionMenuItem(
        "rename",
        "Rename chat",
        '<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path>',
        () => openChatRenameDialog(session.id)
    );

    const infoButton = createSessionMenuItem(
        "info",
        "Chat info",
        '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>',
        () => openChatInfoDialog(session.id)
    );

    const pinButton = createSessionMenuItem(
        "pin",
        session.pinned ? "Unpin chat" : "Pin chat",
        '<path d="M12 17v5"></path><path d="m5 14 4-4V4h6v6l4 4Z"></path>',
        () => toggleChatSessionPinned(session.id)
    );

    const archiveButton = createSessionMenuItem(
        "archive",
        session.archived ? "Restore chat" : "Archive chat",
        '<path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path><path d="M3 8l2-5h14l2 5"></path><path d="M10 12h4"></path>',
        () => toggleChatSessionArchived(session.id)
    );

    const deleteButton = createSessionMenuItem(
        "delete",
        "Delete chat",
        '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>',
        () => { void deleteChatSession(session.id); }
    );

    menuButton.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = !menuWrap.classList.contains("open");
        closeChatSessionMenus(menuWrap);
        menuWrap.classList.toggle("open", willOpen);
        row.classList.toggle("menu-open", willOpen);
        menuButton.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
            mountAnchoredSidebarMenu(menu, menuWrap);
            menu.hidden = false;
            positionAnchoredSidebarMenu(menu, menuButton);
        } else {
            hideAnchoredSidebarMenu(menu);
        }
        updateArchivedMenuOverflow();
    });

    menu.append(renameButton, infoButton);
    if (!session.archived) {
        menu.append(pinButton);
    }
    menu.append(archiveButton, deleteButton);
    menuWrap.append(menuButton, menu);
    row.append(mainButton, activitySpinner, completionDot, menuWrap);
    return row;
}

function appendChatSessionGroup(container, label, sessions) {
    if (!container || sessions.length === 0) return;
    if (label) {
        const groupLabel = document.createElement("div");
        groupLabel.className = "history-label history-subsection-label";
        groupLabel.textContent = label;
        container.appendChild(groupLabel);
    }
    sessions.forEach(session => container.appendChild(createChatSessionRow(session)));
}

function renderChatHistory() {
    if (!chatHistoryList && !archivedChatList) return;
    if (chatHistoryList) chatHistoryList.innerHTML = "";
    if (archivedChatList) archivedChatList.innerHTML = "";
    const visibleSessions = chatSessions
        .filter(session => !session.archived && getSessionWorkspaceMode(session) !== "project")
        .sort(compareChatSessions);
    const archivedSessions = chatSessions.filter(session => session.archived).sort(compareChatSessions);
    appendChatSessionGroup(chatHistoryList, "", visibleSessions);
    if (archivedHistorySection) {
        archivedHistorySection.hidden = archivedSessions.length === 0;
        archivedHistorySection.setAttribute("aria-hidden", String(archivedSessions.length === 0));
    }
    appendChatSessionGroup(archivedChatList || chatHistoryList, archivedChatList ? "" : "Archived", archivedSessions);
    setArchivedChatHistoryCollapsed(isArchivedChatHistoryCollapsed, { persist: false });
    renderProjectList();
}

function setChatHistoryCollapsed(collapsed, { persist = true } = {}) {
    isChatHistoryCollapsed = Boolean(collapsed);
    chatHistorySection?.classList.toggle("chat-history-collapsed", isChatHistoryCollapsed);
    if (chatHistoryList) chatHistoryList.hidden = isChatHistoryCollapsed;
    if (chatHistoryToggle) {
        chatHistoryToggle.setAttribute("aria-expanded", String(!isChatHistoryCollapsed));
        chatHistoryToggle.setAttribute("aria-label", isChatHistoryCollapsed ? "Expand chats" : "Collapse chats");
        chatHistoryToggle.dataset.tooltip = isChatHistoryCollapsed ? "Expand chats" : "Collapse chats";
    }
    if (persist) {
        safeLocalStorageSet(CHAT_HISTORY_COLLAPSED_STORAGE_KEY, isChatHistoryCollapsed ? "true" : "false");
    }
}

function setArchivedChatHistoryCollapsed(collapsed, { persist = true } = {}) {
    isArchivedChatHistoryCollapsed = Boolean(collapsed);
    archivedHistorySection?.classList.toggle("chat-history-collapsed", isArchivedChatHistoryCollapsed);
    if (archivedChatList) archivedChatList.hidden = isArchivedChatHistoryCollapsed;
    if (archivedChatToggle) {
        archivedChatToggle.setAttribute("aria-expanded", String(!isArchivedChatHistoryCollapsed));
        archivedChatToggle.setAttribute("aria-label", isArchivedChatHistoryCollapsed ? "Expand archived chats" : "Collapse archived chats");
        archivedChatToggle.dataset.tooltip = isArchivedChatHistoryCollapsed ? "Expand archived" : "Collapse archived";
    }
    if (persist) {
        safeLocalStorageSet(ARCHIVED_CHAT_HISTORY_COLLAPSED_STORAGE_KEY, isArchivedChatHistoryCollapsed ? "true" : "false");
    }
}

function clearComposerDraft() {
    composerDraftRestoreToken += 1;
    if (input) {
        input.value = "";
        input.style.height = "auto";
    }
    if (previewContainer) previewContainer.innerHTML = "";
    attachedFiles = [];
    scheduleComposerSafeAreaUpdate();
}

function focusComposerInput({ force = false } = {}) {
    if (!input || input.disabled || input.readOnly) return;
    window.setTimeout(() => {
        if (!input || input.disabled || input.readOnly) return;
        const active = document.activeElement;
        const canFocus = force || !active || active === document.body || active === document.documentElement;
        if (!canFocus) return;
        try {
            input.focus({ preventScroll: true });
        } catch {
            input.focus();
        }
    }, 0);
}

function rehydrateAssistantActions(container) {
    if (!container) return;

    container.querySelectorAll(".assistant-action-btn").forEach(button => {
        button.disabled = false;
    });

    container.querySelectorAll(".output-node .bubble-block").forEach(block => {
        const messageNode = block.closest(".message-node.output-node");
        const messageIndex = normalizeHistoryIndex(messageNode?.dataset.historyIndex);
        const message = messageIndex !== null ? conversationHistory[messageIndex] : null;
        const timestamp = message?.createdAt || messageNode?.dataset.createdAt;
        const existingActions = block.querySelector(".assistant-message-actions:not(.user-message-actions)");
        if (existingActions) {
            appendTurnDurationAction(existingActions, messageIndex, block);
            appendMessageActionTime(existingActions, timestamp, "Response completed at");
            if (messageNode && timestamp) messageNode.dataset.createdAt = String(timestamp);
            return;
        }

        const legacyCopyButton = block.querySelector(".copy-action-btn");
        if (!legacyCopyButton?.dataset.copyText) return;

        setupAssistantActions(block, legacyCopyButton.dataset.copyText, {
            messageIndex,
            canRegenerate: messageIndex !== null,
            canFork: messageIndex !== null,
            completedAt: timestamp
        });
    });
}

function rehydrateUserPromptActions(container) {
    if (!container) return;

    container.querySelectorAll(".user-node .bubble-block").forEach(block => {
        const messageNode = block.closest(".message-node.user-node");
        const messageIndex = normalizeHistoryIndex(messageNode?.dataset.historyIndex);
        const message = messageIndex !== null ? conversationHistory[messageIndex] : null;
        const timestamp = message?.createdAt || messageNode?.dataset.createdAt;
        const existingActions = block.querySelector(".user-message-actions");
        if (existingActions) {
            prependMessageActionTime(existingActions, timestamp, "Prompt sent at");
            if (messageNode && timestamp) messageNode.dataset.createdAt = String(timestamp);
            return;
        }

        const bubble = block.querySelector(".bubble");
        const promptText = bubble?.textContent || "";
        if (!promptText) return;

        setupUserPromptActions(block, promptText, {
            sentAt: timestamp
        });
    });
}

function rehydrateRenderedChat(container) {
    if (!container) return;
    window.requestAnimationFrame(() => {
        rehydrateAssistantActions(container);
        rehydrateUserPromptActions(container);
        container.querySelectorAll(".assistant-tts-player").forEach(upgradeAssistantTtsPlayer);
        container.querySelectorAll(".web-sources").forEach(upgradeWebSourcesPanel);
        container.querySelectorAll(".code-combined-preview").forEach(bar => bar.remove());
        container.querySelectorAll(".code-block-wrapper").forEach(wrapper => {
            delete wrapper.dataset.codeEnhanced;
            delete wrapper.dataset.previewEnhanced;
        });
        setupCodeSandbox(container);
        renderPromptTimeline();
    });
}

function renderChatFromConversationHistoryFallback(history = conversationHistory) {
    if (!chat) return;
    const source = Array.isArray(history) ? history : [];
    renderChatHistoryWindow(source, {
        start: 0,
        end: source.length,
        replace: true,
        sessionId: activeSessionId
    });
}

async function createComposerDraftFileFromAttachment(attachment = {}) {
    if (attachment.liveFile instanceof File) return attachment.liveFile;

    if (attachment.path && typeof createDesktopAttachmentFile === "function") {
        return createDesktopAttachmentFile(attachment);
    }

    const sourceSrc = String(attachment.sourceSrc || "").trim();
    if (!sourceSrc || !/^(?:https?:|data:|fauna-app:|fauna-file:|file:)/i.test(sourceSrc)) return null;

    const response = await fetch(sourceSrc);
    if (!response.ok) throw new Error(`Could not restore ${attachment.name || "attachment"} (${response.status})`);
    const blob = await response.blob();
    const name = attachment.name || "attachment";
    const type = attachment.type || blob.type || (typeof inferAttachmentMimeType === "function" ? inferAttachmentMimeType(name) : "") || "application/octet-stream";
    const file = new File([blob], name, {
        type,
        lastModified: Number(attachment.lastModified || Date.now())
    });
    setFilePersistentPreviewSource?.(file, sourceSrc);
    if (attachment.librarySourceKey || attachment.librarySourceId) {
        defineHiddenFileValue?.(file, "__faunaLibrarySourceKey", attachment.librarySourceKey || "");
        defineHiddenFileValue?.(file, "__faunaLibrarySourceId", attachment.librarySourceId || "");
        defineHiddenFileValue?.(file, "__faunaLibrarySourceSrc", sourceSrc);
    }
    return file;
}

async function restoreComposerDraftAttachments(draft, restoreToken) {
    const serializedAttachments = Array.isArray(draft?.attachments) ? draft.attachments : [];
    const liveFiles = Array.isArray(draft?.liveFiles) ? draft.liveFiles.filter(file => file instanceof File) : [];
    const restoredFiles = [...liveFiles];

    for (const attachment of serializedAttachments) {
        try {
            const file = await createComposerDraftFileFromAttachment(attachment);
            if (file) restoredFiles.push(file);
        } catch (err) {
            console.warn("Could not restore composer draft attachment:", err);
        }
    }

    if (restoreToken !== composerDraftRestoreToken) return;
    attachedFiles = [];
    if (previewContainer) previewContainer.innerHTML = "";
    restoredFiles.forEach(file => {
        if (!isDuplicateAttachment(file)) {
            attachedFiles.push(file);
            renderPreviewPill(file);
        }
    });
    updateTokenDisplay();
    scheduleComposerSafeAreaUpdate();
}

function restoreComposerDraft(draft = createEmptyComposerDraft()) {
    const restoreToken = ++composerDraftRestoreToken;
    isRestoringComposerDraft = true;
    try {
        setComposerTextValue(draft?.text || "");
        attachedFiles = [];
        if (previewContainer) previewContainer.innerHTML = "";
        updateTokenDisplay();
        scheduleComposerSafeAreaUpdate();
    } finally {
        isRestoringComposerDraft = false;
    }
    void restoreComposerDraftAttachments(draft, restoreToken);
}

function restoreChatSessionToView(session, { closeWorkbench = true } = {}) {
    if (!session) return;
    clearPendingProjectChatRoot();
    if (closeWorkbench) closeCodeWorkbench();
    conversationHistory = cloneConversationHistory(session.conversationHistory);
    sessionTotalTokens = Math.max(sumHistoryTokenUsage(conversationHistory), normalizeTokenCount(session.sessionTotalTokens) || 0);
    clearComposerDraft();
    restoreComposerDraft(session.composerDraft);
    restoreWorkspacePanelState(session.workspacePanelState);

    if (chat) {
        const shouldRestoreLiveGenerationDom = typeof isSessionGenerating === "function"
            && isSessionGenerating(session.id)
            && Array.isArray(session.domNodes)
            && session.domNodes.length > 0;
        if (shouldRestoreLiveGenerationDom) {
            resetChatRenderWindowState(session.id);
            chat.replaceChildren(...session.domNodes);
        } else if (conversationHistory.length > 0) {
            renderInitialChatHistoryWindow(conversationHistory, session.id);
        } else if (session.domNodes?.length) {
            resetChatRenderWindowState(session.id);
            chat.replaceChildren(...session.domNodes);
        } else if (session.chatHtml?.trim()) {
            resetChatRenderWindowState(session.id);
            chat.innerHTML = sanitizeChatHtmlMediaSources(session.chatHtml || "");
        } else {
            resetChatRenderWindowState(session.id);
            chat.replaceChildren();
        }
        chat.style.display = activeChatHasContent() ? "block" : "none";
        scrollChatToBottom({ force: true });
        rehydrateRenderedChat(chat);
        applyActiveVoiceOrbTheme();
    }
    if (welcome) welcome.style.display = activeChatHasContent() ? "none" : "flex";
    ensureVisibleGenerationProgress?.(session.id);
    updateComposerChatContentLayoutState();

    updateTokenDisplay();
    updateActiveChatTitle();
    renderProjectList();
    renderComposerProjectPicker();
    updateProjectAgentPanel();
    updateGenerationUi?.({ renderHistory: false });
    renderPromptTimeline();
}

function restoreEmptyChatDraft({ render = true, persist = true, updateUrl = true } = {}) {
    closeCodeWorkbench();
    clearClarifyingQuestionComposer();
    clearPendingProjectChatRoot();
    activeSessionId = null;
    conversationHistory = [];
    sessionTotalTokens = 0;
    clearComposerDraft();
    setChatTitleEditing(false);
    restoreWorkspacePanelState(createEmptyWorkspacePanelState());

    if (chat) {
        resetChatRenderWindowState(null);
        chat.replaceChildren();
        chat.style.display = "none";
    }
    if (welcome) welcome.style.display = "flex";
    updateComposerChatContentLayoutState();

    updateTokenDisplay();
    updateActiveChatTitle();
    renderProjectList();
    renderComposerProjectPicker();
    updateProjectAgentPanel();
    updateGenerationUi?.({ renderHistory: false });
    renderPromptTimeline();
    if (persist) persistChatSessions();
    if (render) renderChatHistory();
    if (updateUrl && activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
        updateWorkspaceUrlFragment({ replace: true });
    }
}

function activateChatSession(sessionId, { captureCurrent = true, closeSidebar = true, updateUrl = true, urlMode = "push" } = {}) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    const isSwitchingSessions = activeSessionId !== sessionId;
    clearClarifyingQuestionComposer();
    closeChatSessionMenus();
    if (captureCurrent && activeSessionId && activeSessionId !== sessionId) {
        saveCurrentSession({ render: false, updateUrl: false });
    }
    activeSessionId = sessionId;
    if (typeof clearUnreadGenerationCompletion === "function") {
        clearUnreadGenerationCompletion(sessionId, { renderHistory: false });
    }
    restoreChatSessionToView(session, { closeWorkbench: isSwitchingSessions });
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) {
        setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { closeSidebar: false, updateUrl: false });
    }
    ensureVisibleGenerationProgress?.(sessionId);
    persistChatSessions();
    renderChatHistory();
    updateGenerationUi?.({ renderHistory: false });
    if (closeSidebar) sidebarController.close();
    if (updateUrl) updateWorkspaceUrlFragment({ replace: urlMode === "replace" });
}

function startNewChatSession({ notify = true, updateUrl = true, urlMode = "push", workspaceMode = "normal", projectRootId = "" } = {}) {
    const projectRoot = workspaceMode === "project" ? getWorkspaceProjectRootById(projectRootId) : null;
    if (workspaceMode === "project" && !projectRoot) {
        showToast("Select a project first.", "warning");
        return;
    }

    if (activeSessionId) {
        const currentSession = saveCurrentSession({ render: false, updateUrl: false });
        if (currentSession && !chatSessionHasContent(currentSession) && !currentSession.archived) {
            chatSessions = chatSessions.filter(session => session.id !== currentSession.id);
        }
    }

    if (projectRoot) {
        restoreEmptyChatDraft({ updateUrl: false });
        setPendingProjectChatRoot(projectRoot);
        setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl, urlMode });
        enableWorkspaceBridgeForProject();
        renderChatHistory();
        renderProjectList();
        renderComposerProjectPicker();
        updateProjectAgentPanel();
        void refreshProjectExplorer({ silent: true, refreshBranch: true });
        sidebarController.close();
        focusComposerInput({ force: true });
        if (notify) showToast(`${projectRoot.name} project chat ready.`, "info");
        return;
    }

    restoreEmptyChatDraft({ updateUrl: false });
    setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl, urlMode });
    sidebarController.close();
    focusComposerInput({ force: true });
    if (notify) showToast("New chat ready.", "info");
}

function getNextVisibleSessionId(excludeId) {
    return chatSessions
        .filter(session => session.id !== excludeId && !session.archived)
        .sort(compareChatSessions)[0]?.id || null;
}

function toggleChatSessionPinned(sessionId) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    if (session.archived) {
        showToast("Archived chats cannot be pinned. Restore the chat first.", "warning");
        return;
    }
    if (session.id === activeSessionId) saveCurrentSession({ render: false });
    session.pinned = !session.pinned;
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    renderChatHistory();
    showToast(session.pinned ? "Chat pinned." : "Chat unpinned.", "success");
}

function toggleChatSessionArchived(sessionId) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    if (session.id === activeSessionId) saveCurrentSession({ render: false });
    session.archived = !session.archived;
    session.updatedAt = new Date().toISOString();

    if (session.archived && session.id === activeSessionId) {
        const nextId = getNextVisibleSessionId(session.id);
        if (nextId) {
            activateChatSession(nextId, { captureCurrent: false, closeSidebar: false });
        } else {
            restoreEmptyChatDraft();
        }
    } else {
        persistChatSessions();
        renderChatHistory();
    }

    showToast(session.archived ? "Chat archived." : "Chat restored.", "success");
}

async function deleteChatSession(sessionId) {
    const wasActive = sessionId === activeSessionId;
    const sessionToDelete = chatSessions.find(session => session.id === sessionId);
    if (!sessionToDelete) return;

    let libraryArchiveResult = { count: 0, saved: true };
    let mediaDeleteSaved = true;
    let openAiCleanupResult = { attempted: 0, deleted: 0, failed: 0 };

    if (wasActive) {
        sessionToDelete.chatHtml = sanitizeChatHtmlMediaSources(chat?.innerHTML || sessionToDelete.chatHtml || "");
        sessionToDelete.domNodes = chat ? Array.from(chat.childNodes) : sessionToDelete.domNodes;
        sessionToDelete.conversationHistory = cloneConversationHistory(conversationHistory);
        sessionToDelete.sessionTotalTokens = sessionTotalTokens;
    }

    syncUsageToolEventsFromSession(sessionToDelete, {
        html: sanitizeChatHtmlMediaSources(wasActive ? (chat?.innerHTML || sessionToDelete.chatHtml) : sessionToDelete.chatHtml)
    });

    const mediaDeleteKeys = collectLibraryMediaDeleteKeysFromSession(sessionToDelete);
    const approval = await showDeleteChatDialog(sessionToDelete, mediaDeleteKeys.size);
    if (!approval.approved) return;

    if (approval.deleteMedia) {
        openAiCleanupResult = await deleteOpenAiFilesForLibraryKeys(mediaDeleteKeys);
        mediaDeleteKeys.forEach(key => deletedLibraryItemKeys.add(key));
        persistedLibraryItems = persistedLibraryItems.filter(item => !mediaDeleteKeys.has(getLibraryItemPersistentKey(item)));
        mediaDeleteSaved = persistDeletedLibraryItemKeys() && persistStoredLibraryItems();
    } else {
        mediaDeleteKeys.clear();
    }

    libraryArchiveResult = archiveLibraryItemsFromSessions([sessionToDelete], { excludeKeys: mediaDeleteKeys });
    chatSessions = chatSessions.filter(session => session.id !== sessionId);

    if (chatSessions.length === 0) {
        restoreEmptyChatDraft();
    } else if (wasActive) {
        const nextId = getNextVisibleSessionId(sessionId) || chatSessions.sort(compareChatSessions)[0]?.id;
        activateChatSession(nextId, { captureCurrent: false, closeSidebar: false });
    } else {
        persistChatSessions();
        renderChatHistory();
    }

    const librarySaved = libraryArchiveResult.saved !== false && mediaDeleteSaved !== false && openAiCleanupResult.failed === 0;
    const cleanupMessage = getOpenAiCacheCleanupMessage(openAiCleanupResult);
    showToast(librarySaved
        ? (approval.deleteMedia ? "Chat deleted. Media removed from Library." : "Chat deleted.")
        : `Chat deleted, but Library changes could not be fully saved.${cleanupMessage}`, librarySaved ? "info" : "warning");
    refreshUsageSettingsPaneIfVisible();
    refreshLibraryViewIfActive();
}

function setWorkspaceNavState(view) {
    workspaceNavButtons.forEach(button => {
        const active = button.dataset.workspaceView === view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });
}

function setLibraryHeaderSummary(items = []) {
    if (!librarySummary && !tokenCounter) return;
    const imageCount = items.filter(item => item.type === "image").length;
    const videoCount = items.filter(item => item.type === "video").length;
    const codeCount = items.filter(item => item.type === "code").length;
    const itemLabel = `${items.length.toLocaleString()} ${items.length === 1 ? "item" : "items"}`;
    const summary = `${itemLabel} · ${imageCount} images · ${videoCount} videos · ${codeCount} code`;
    if (librarySummary) librarySummary.textContent = summary;
    if (tokenCounter && activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        tokenCounter.textContent = summary;
        tokenCounter.dataset.tooltip = "Library items from chats and uploads.";
        tokenCounter.setAttribute("aria-label", summary);
    }
}

function getLibraryStatMarkup(label, value) {
    return `<span class="library-stat"><strong>${value.toLocaleString()}</strong><span>${label}</span></span>`;
}

function renderLibraryStats(items = []) {
    if (!libraryStats) return;
    const counts = {
        Images: items.filter(item => item.type === "image").length,
        Videos: items.filter(item => item.type === "video").length,
        Code: items.filter(item => item.type === "code").length
    };
    libraryStats.innerHTML = Object.entries(counts)
        .map(([label, value]) => getLibraryStatMarkup(label, value))
        .join("");
}

function formatLibraryUploadSize(size) {
    const bytes = Number(size || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function getLibraryUploadLanguage(file) {
    const fileName = String(file?.name || "");
    const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
    const aliases = {
        htm: "html",
        mjs: "js",
        jsx: "js",
        tsx: "ts",
        md: "markdown",
        py: "python",
        ps1: "powershell",
        sh: "shell",
        txt: "text"
    };
    return normalizeCodeLanguage(aliases[extension] || extension || file?.type || "text");
}

function isLibraryUploadCodeFile(file) {
    if (!(file instanceof File)) return false;
    return file.type.startsWith("text/") ||
        ["application/json", "application/javascript"].includes(file.type) ||
        isCodeLikeAttachment(file);
}

function getLibraryUploadType(file) {
    if (!(file instanceof File)) return "";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (isLibraryUploadCodeFile(file)) return "code";
    return "";
}

async function createUploadedLibraryItem(file, index = 0) {
    const type = getLibraryUploadType(file);
    if (!type) return null;

    const now = new Date().toISOString();
    const title = file.name || (type === "image" ? "Uploaded image" : type === "video" ? "Uploaded video" : "Uploaded code");
    const sizeLabel = formatLibraryUploadSize(file.size);
    const titleExt = String(title).includes(".") ? String(title).split(".").pop() : "";
    const extension = getMimeExtension(file.type, titleExt || type).toLowerCase();
    const base = {
        type,
        origin: "upload",
        title,
        sessionTitle: "Manual upload",
        sessionId: "manual-library-upload",
        createdAt: now,
        updatedAt: now,
        storedAt: now,
        persisted: true
    };

    if (type === "image" || type === "video") {
        const desktopRef = prepareDesktopFileReference(file);
        if (desktopRef.url) {
            return {
                ...base,
                id: getLibraryItemId(`upload-${type}`, { id: "manual-library-upload" }, `${title}:${file.size}:${file.lastModified}:${desktopRef.path || desktopRef.url}`, index),
                detail: [type === "image" ? "Uploaded image" : "Uploaded video", extension, sizeLabel].filter(Boolean).join(" · "),
                src: desktopRef.url,
                filePath: desktopRef.path,
                alt: title
            };
        }
        const dataBase64 = await blobToBase64(file);
        const mimeType = file.type || (type === "image" ? "image/png" : "video/mp4");
        const src = `data:${mimeType};base64,${dataBase64}`;
        return {
            ...base,
            id: getLibraryItemId(`upload-${type}`, { id: "manual-library-upload" }, `${title}:${file.size}:${file.lastModified}:${src.slice(0, 4096)}`, index),
            detail: [type === "image" ? "Uploaded image" : "Uploaded video", extension, sizeLabel].filter(Boolean).join(" · "),
            src,
            alt: title
        };
    }

    const code = await file.text();
    if (!code.trim()) return null;
    const lang = getLibraryUploadLanguage(file);
    const kind = getCodeBlockKind(lang, code) || lang || "text";
    return {
        ...base,
        id: getLibraryItemId("upload-code", { id: "manual-library-upload" }, `${title}:${file.size}:${file.lastModified}:${code.slice(0, 4096)}`, index),
        detail: getCodeLibraryMeta(lang, kind, code),
        code,
        lang,
        kind,
        fileName: title
    };
}

async function addUploadedFilesToLibrary(files) {
    const fileList = Array.from(files || []).filter(file => file instanceof File);
    if (fileList.length === 0) return;

    if (libraryUploadButton) {
        libraryUploadButton.disabled = true;
        libraryUploadButton.setAttribute("aria-busy", "true");
    }

    const existingKeys = new Set(collectLibraryItems().map(getLibraryItemPersistentKey));
    const additions = [];
    let skipped = 0;

    for (const [index, file] of fileList.entries()) {
        try {
            const normalized = normalizeStoredLibraryItem(await createUploadedLibraryItem(file, index));
            const key = getLibraryItemPersistentKey(normalized);
            if (!normalized || !key || existingKeys.has(key)) {
                skipped += 1;
                continue;
            }
            deletedLibraryItemKeys.delete(key);
            existingKeys.add(key);
            additions.push(normalized);
        } catch (err) {
            console.warn("Could not upload file to Library:", err);
            skipped += 1;
        }
    }

    if (additions.length > 0) {
        persistedLibraryItems = [...additions, ...persistedLibraryItems];
    }

    const deletedSaved = persistDeletedLibraryItemKeys();
    const storedSaved = additions.length > 0 ? persistStoredLibraryItems() : true;
    renderLibraryView();
    if (libraryPickerModal && !libraryPickerModal.hidden) renderLibraryPicker();

    if (libraryUploadButton) {
        libraryUploadButton.disabled = false;
        libraryUploadButton.setAttribute("aria-busy", "false");
    }

    if (additions.length > 0) {
        const suffix = skipped > 0 ? ` ${skipped} skipped.` : "";
        showToast(
            storedSaved && deletedSaved
                ? `Uploaded ${additions.length.toLocaleString()} ${additions.length === 1 ? "item" : "items"} to Library.${suffix}`
                : `Uploaded ${additions.length.toLocaleString()} ${additions.length === 1 ? "item" : "items"}, but saving may fail after reload.${suffix}`,
            storedSaved && deletedSaved ? "success" : "warning"
        );
    } else {
        showToast(skipped > 0 ? "No supported new files were uploaded." : "No files selected.", "info");
    }
}

function setLibraryFilter(filter) {
    activeLibraryFilter = ["all", "images", "videos", "code"].includes(filter) ? filter : LIBRARY_FILTER_ALL;
    libraryFilterButtons.forEach(button => {
        const active = button.dataset.libraryFilter === activeLibraryFilter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    scheduleAnimatedSegmentIndicators();
    renderLibraryView();
}

function normalizeLibraryLayout(layout) {
    return layout === LIBRARY_LAYOUT_LIST ? LIBRARY_LAYOUT_LIST : LIBRARY_LAYOUT_GRID;
}

function updateLibraryLayoutControls() {
    libraryLayoutButtons.forEach(button => {
        const active = normalizeLibraryLayout(button.dataset.libraryLayout) === activeLibraryLayout;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function applyLibraryLayoutToGrid() {
    if (!libraryGrid) return;
    const isList = activeLibraryLayout === LIBRARY_LAYOUT_LIST;
    delete libraryGrid.dataset.libraryLayout;
    libraryGrid.dataset.libraryCurrentLayout = activeLibraryLayout;
    libraryGrid.classList.toggle("library-layout-grid", !isList);
    libraryGrid.classList.toggle("library-layout-list", isList);
}

function setLibraryLayout(layout, { persist = true } = {}) {
    activeLibraryLayout = normalizeLibraryLayout(layout);
    if (persist) safeLocalStorageSet(LIBRARY_LAYOUT_STORAGE_KEY, activeLibraryLayout);
    updateLibraryLayoutControls();
    applyLibraryLayoutToGrid();
    scheduleAnimatedSegmentIndicators();
}

function getLibraryItemFilterType(item) {
    if (item.type === "image") return "images";
    if (item.type === "video") return "videos";
    return "code";
}

function getLibraryItemPersistentKey(item) {
    const id = String(item?.id || "").trim();
    if (id) return `id:${id}`;
    if (item?.type === "code") {
        return `code:${item.sessionId || ""}:${item.lang || ""}:${item.code || ""}`;
    }
    return `${item?.type || "item"}:${item?.origin || ""}:${item?.sessionId || ""}:${item?.src || ""}`;
}

function getLibraryItemByPersistentKey(sourceKey) {
    const value = String(sourceKey || "").trim();
    if (!value) return null;
    return persistedLibraryItems.find(item => (
        getLibraryItemPersistentKey(item) === value ||
        String(item?.id || "") === value ||
        `id:${item?.id || ""}` === value
    )) || null;
}

function getRestorableLibraryMediaSource(sourceKey, mediaType = "image") {
    const item = getLibraryItemByPersistentKey(sourceKey);
    const src = String(item?.src || "").trim();
    if (!src || /^blob:/i.test(src)) return "";
    if (isDesktopFileMediaSource(src)) return src;
    if (mediaType === "image") return /^(?:data:image\/|https?:)/i.test(src) ? src : "";
    if (mediaType === "video") return /^(?:data:video\/|https?:)/i.test(src) ? src : "";
    if (mediaType === "audio") return /^(?:data:audio\/|https?:)/i.test(src) ? src : "";
    return /^(?:data:(?:image|video|audio)\/|https?:)/i.test(src) ? src : "";
}

function getElementMediaType(element) {
    const tagName = String(element?.tagName || "").toLowerCase();
    if (tagName === "source") {
        const parentTag = String(element.parentElement?.tagName || "").toLowerCase();
        if (["picture", "img"].includes(parentTag)) return "image";
        if (["video", "audio"].includes(parentTag)) return parentTag;
    }
    if (["img", "image"].includes(tagName)) return "image";
    if (["video", "audio"].includes(tagName)) return tagName;
    return "media";
}

function sanitizeChatHtmlMediaSources(html = "") {
    const markup = String(html || "");
    if (!markup || !/blob:/i.test(markup)) return markup;

    const template = document.createElement("template");
    template.innerHTML = markup;
    template.content.querySelectorAll("img, video, audio, source").forEach(element => {
        const src = String(element.getAttribute("src") || "").trim();
        const srcset = String(element.getAttribute("srcset") || "").trim();
        if (!/^blob:/i.test(src) && !/blob:/i.test(srcset)) return;

        const mediaType = getElementMediaType(element);
        const sourceKey = element.dataset.faunaLibrarySourceKey ||
            element.closest("[data-fauna-library-source-key]")?.dataset.faunaLibrarySourceKey ||
            "";
        const restoredSrc = getRestorableLibraryMediaSource(sourceKey, mediaType);
        element.removeAttribute("srcset");

        if (restoredSrc) {
            element.setAttribute("src", restoredSrc);
            return;
        }

        element.dataset.faunaMissingBlob = "true";
        if (mediaType === "image") {
            element.setAttribute("src", TRANSPARENT_PIXEL_DATA_URL);
            if (!element.getAttribute("alt")) element.setAttribute("alt", "Image unavailable after reload");
        } else {
            element.removeAttribute("src");
        }
    });
    return template.innerHTML;
}

function isPersistableLibraryMediaSrc(src) {
    const value = String(src || "").trim();
    if (!value) return false;
    if (value.includes("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")) return false;
    return /^(?:https?:|data:(?:image|video|audio)\/)/i.test(value) || isDesktopFileMediaSource(value);
}

function normalizeStoredLibraryItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = ["image", "video", "code"].includes(raw.type) ? raw.type : "";
    if (!type) return null;

    const sessionId = String(raw.sessionId || "").trim();
    const sourceValue = raw.src || raw.code || raw.fileName || raw.title || "";
    const fallbackId = getLibraryItemId(`stored-${type}`, { id: sessionId || "library" }, sourceValue, 0);
    const now = new Date().toISOString();
    const base = {
        id: String(raw.id || fallbackId),
        type,
        origin: String(raw.origin || (type === "image" ? "assistant" : "assistant")),
        title: String(raw.title || (type === "code" ? "Code" : type === "video" ? "Generated video" : "Image")),
        detail: String(raw.detail || ""),
        sessionTitle: String(raw.sessionTitle || "Deleted chat"),
        sessionId,
        createdAt: raw.createdAt || raw.updatedAt || raw.storedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || raw.storedAt || now,
        storedAt: raw.storedAt || now,
        persisted: true
    };

    if (type === "code") {
        const code = String(raw.code || "");
        if (!code.trim()) return null;
        const lang = normalizeCodeLanguage(raw.lang || raw.kind || "");
        const kind = getCodeBlockKind(lang, code) || raw.kind || lang || "text";
        return {
            ...base,
            code,
            lang,
            kind,
            fileName: String(raw.fileName || raw.title || getCodeDownloadName(lang, kind, "fauna-artifact"))
        };
    }

    const src = String(raw.src || "").trim();
    if (!isPersistableLibraryMediaSrc(src)) return null;
    return {
        ...base,
        src,
        filePath: String(raw.filePath || ""),
        fileName: String(raw.fileName || ""),
        alt: String(raw.alt || raw.detail || raw.title || base.title)
    };
}

function readStoredLibraryItems() {
    const raw = safeLocalStorageGet(LIBRARY_ITEMS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeStoredLibraryItem)
            .filter(item => {
                const key = getLibraryItemPersistentKey(item);
                if (!item || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse saved Fauna Library items:", err);
        return [];
    }
}

function persistStoredLibraryItems() {
    if (persistedLibraryItems.length === 0) {
        return safeLocalStorageRemove(LIBRARY_ITEMS_STORAGE_KEY);
    }
    return safeLocalStorageSet(LIBRARY_ITEMS_STORAGE_KEY, JSON.stringify(persistedLibraryItems));
}

function readDeletedLibraryItemKeys() {
    const raw = safeLocalStorageGet(LIBRARY_DELETED_ITEMS_STORAGE_KEY);
    if (!raw) return new Set();
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.map(value => String(value || "").trim()).filter(Boolean));
    } catch (err) {
        console.warn("Could not parse deleted Fauna Library items:", err);
        return new Set();
    }
}

function persistDeletedLibraryItemKeys() {
    if (deletedLibraryItemKeys.size === 0) {
        return safeLocalStorageRemove(LIBRARY_DELETED_ITEMS_STORAGE_KEY);
    }
    return safeLocalStorageSet(
        LIBRARY_DELETED_ITEMS_STORAGE_KEY,
        JSON.stringify(Array.from(deletedLibraryItemKeys))
    );
}

function isLibraryItemDeleted(item) {
    return deletedLibraryItemKeys.has(getLibraryItemPersistentKey(item));
}

function getOpenAiCacheCleanupMessage(result) {
    if (!result || result.attempted === 0) return "";
    if (result.failed > 0) {
        return ` OpenAI storage cleanup failed for ${result.failed.toLocaleString()} ${result.failed === 1 ? "file" : "files"}.`;
    }
    return "";
}

async function deleteOpenAiFilesForLibraryKeys(keys, signal = null) {
    const keySet = keys instanceof Set
        ? new Set(Array.from(keys).map(value => String(value || "").trim()).filter(Boolean))
        : new Set(Array.from(keys || []).map(value => String(value || "").trim()).filter(Boolean));
    if (keySet.size === 0) return { attempted: 0, deleted: 0, failed: 0 };

    openAiFileCache = readStoredOpenAiFileCache();
    if (openAiFileCache.length === 0) return { attempted: 0, deleted: 0, failed: 0 };

    const remainingLibraryKeys = new Set(
        collectLibraryItems()
            .map(getLibraryItemPersistentKey)
            .filter(key => key && !keySet.has(key))
    );
    const nextCache = [];
    const now = new Date().toISOString();
    const result = { attempted: 0, deleted: 0, failed: 0 };

    for (const entry of openAiFileCache) {
        const libraryKeys = Array.isArray(entry.libraryKeys) ? entry.libraryKeys : [];
        const matchesDeletedLibrary = libraryKeys.some(key => keySet.has(key));
        if (!matchesDeletedLibrary) {
            nextCache.push(entry);
            continue;
        }

        const keptLibraryKeys = libraryKeys.filter(key => !keySet.has(key));
        const stillUsedByLibrary = keptLibraryKeys.some(key => remainingLibraryKeys.has(key));
        if (stillUsedByLibrary) {
            nextCache.push({
                ...entry,
                libraryKeys: keptLibraryKeys,
                updatedAt: now
            });
            continue;
        }

        result.attempted += 1;
        try {
            await deleteOpenAiStoredFile(entry.fileId, signal);
            result.deleted += 1;
        } catch (err) {
            result.failed += 1;
            console.warn("Could not delete OpenAI file for removed Library item:", err);
            nextCache.push({
                ...entry,
                libraryKeys: keptLibraryKeys,
                pendingDelete: true,
                pendingDeleteAt: now,
                pendingDeleteReason: err.message || "OpenAI storage cleanup failed",
                updatedAt: now
            });
        }
    }

    openAiFileCache = nextCache;
    persistOpenAiFileCache();
    return result;
}

function archiveLibraryItemsFromSessions(sessions = [], { excludeKeys = new Set() } = {}) {
    const sessionList = Array.isArray(sessions) ? sessions.filter(Boolean) : [];
    if (sessionList.length === 0) return { count: 0, saved: true };

    const skippedKeys = excludeKeys instanceof Set ? excludeKeys : new Set(excludeKeys || []);
    const existingKeys = new Set(persistedLibraryItems.map(getLibraryItemPersistentKey));
    const additions = [];
    sessionList.forEach(session => {
        collectLibraryItemsFromSession(session).forEach(item => {
            const stored = normalizeStoredLibraryItem({
                ...item,
                sessionTitle: item.sessionTitle || getLibrarySessionTitle(session),
                sessionId: item.sessionId || session.id,
                storedAt: new Date().toISOString()
            });
            const key = getLibraryItemPersistentKey(stored);
            if (!stored || skippedKeys.has(key) || deletedLibraryItemKeys.has(key) || existingKeys.has(key)) return;
            existingKeys.add(key);
            additions.push(stored);
        });
    });

    if (additions.length === 0) return { count: 0, saved: true };
    persistedLibraryItems = [...additions, ...persistedLibraryItems];
    return { count: additions.length, saved: persistStoredLibraryItems() };
}

function getFilteredLibraryItems(items) {
    if (activeLibraryFilter === LIBRARY_FILTER_ALL) return items;
    return items.filter(item => getLibraryItemFilterType(item) === activeLibraryFilter);
}

function getSessionLibraryRoot(session) {
    const root = document.createElement("div");
    if (Array.isArray(session?.domNodes) && session.domNodes.length > 0) {
        root.append(...session.domNodes.map(node => node.cloneNode(true)));
        return root;
    }
    root.innerHTML = sanitizeChatHtmlMediaSources(session?.chatHtml || "");
    return root;
}

function getLibrarySessionTitle(session) {
    return cleanSessionTitle(session?.title || "Current Session", 56);
}

function getMessageNodeText(node) {
    return String(node?.querySelector(".bubble")?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
}

function getGeneratedMediaCaption(element) {
    return String(
        element.closest(".generated-image-card, .generated-video-card")
            ?.querySelector(".generated-image-caption, .generated-video-caption")
            ?.textContent || ""
    ).replace(/\s+/g, " ").trim();
}

function getLibraryPromptFromGeneratedCaption(caption, fallback = "") {
    const value = String(caption || fallback || "").trim();
    const split = value.match(/^[^:]{1,48}:\s*([\s\S]+)$/);
    return (split?.[1] || value).trim();
}

function isUsableLibraryMediaSrc(src, session = null) {
    const value = String(src || "").trim();
    if (!value) return false;
    if (value.includes("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")) return false;
    if (/^blob:/i.test(value) && !(Array.isArray(session?.domNodes) && session.domNodes.length > 0)) return false;
    return /^(?:https?:|blob:|data:(?:image|video|audio)\/)/i.test(value) || isDesktopFileMediaSource(value);
}

function getLibraryItemId(prefix, session, value, index) {
    const source = `${session?.id || "session"}:${value || ""}:${index}`;
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    return `${prefix}-${Math.abs(hash).toString(36)}-${index}`;
}

function getUserImageAttachmentName(img) {
    const wrapper = img?.closest?.(".bubble-image-attachment");
    const label = wrapper?.querySelector?.(".bubble-image-name")?.textContent || "";
    const alt = img?.getAttribute?.("alt") || "";
    const value = String(label || alt || "").replace(/\s+/g, " ").trim();
    if (!value || /^(?:image|image attachment|user image)$/i.test(value)) return "";
    return value;
}

function collectLibraryImagesFromSession(session, root, seen) {
    const items = [];
    const sessionTitle = getLibrarySessionTitle(session);

    root.querySelectorAll(".user-node .bubble-attachments img, .user-node img.bubble-img").forEach((img, index) => {
        if (img.dataset.faunaLibraryAttachment === "true" || img.dataset.faunaLibrarySourceKey) return;
        const src = img.getAttribute("src") || img.src || "";
        const key = `image:user:${session.id}:${src}`;
        if (!isUsableLibraryMediaSrc(src, session) || seen.has(key)) return;
        seen.add(key);
        const prompt = getMessageNodeText(img.closest(".message-node"));
        const fileName = getUserImageAttachmentName(img);
        items.push({
            id: getLibraryItemId("user-image", session, src, index),
            type: "image",
            origin: "user",
            title: fileName || "User image",
            detail: prompt || "Image attachment",
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            src,
            fileName,
            alt: fileName || img.getAttribute("alt") || prompt || "User image"
        });
    });

    root.querySelectorAll(".output-node img.generated-image, .output-node .generated-image-card img").forEach((img, index) => {
        const src = img.getAttribute("src") || img.src || "";
        const key = `image:generated:${session.id}:${src}`;
        if (!isUsableLibraryMediaSrc(src, session) || seen.has(key)) return;
        seen.add(key);
        const caption = getGeneratedMediaCaption(img);
        const prompt = getLibraryPromptFromGeneratedCaption(caption, img.getAttribute("alt") || "");
        items.push({
            id: getLibraryItemId("generated-image", session, src, index),
            type: "image",
            origin: "assistant",
            title: caption?.split(":")[0] || "Generated image",
            detail: prompt || "Generated image",
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            src,
            alt: img.getAttribute("alt") || prompt || "Generated image"
        });
    });

    return items;
}

function collectLibraryVideosFromSession(session, root, seen) {
    const items = [];
    const sessionTitle = getLibrarySessionTitle(session);
    root.querySelectorAll(".output-node video.generated-video, .output-node .generated-video-card video").forEach((video, index) => {
        const src = video.getAttribute("src") || video.currentSrc || video.src || "";
        const key = `video:${session.id}:${src}`;
        if (!isUsableLibraryMediaSrc(src, session) || seen.has(key)) return;
        seen.add(key);
        const caption = getGeneratedMediaCaption(video);
        items.push({
            id: getLibraryItemId("video", session, src, index),
            type: "video",
            origin: "assistant",
            title: caption?.split(":")[0] || "Generated video",
            detail: getLibraryPromptFromGeneratedCaption(caption, "Generated video"),
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            src
        });
    });
    return items;
}

function getCodeElementLanguage(codeElement) {
    let lang = "";
    codeElement?.classList?.forEach(className => {
        if (className.startsWith("lang-")) lang = className.replace("lang-", "");
    });
    return normalizeCodeLanguage(lang);
}

function collectLibraryCodeFromSession(session, root, seen) {
    const items = [];
    const sessionTitle = getLibrarySessionTitle(session);
    root.querySelectorAll(".output-node pre code").forEach((codeElement, index) => {
        const code = getRawCodeFromCodeElement(codeElement).trim();
        if (!code) return;
        const lang = getCodeElementLanguage(codeElement);
        const kind = getCodeBlockKind(lang, code);
        const wrapper = codeElement.closest(".code-block-wrapper");
        const explicitName = wrapper?.dataset?.codeFileName || "";
        const title = explicitName || getCodeDownloadName(lang, kind, "fauna-artifact");
        const key = `code:${session.id}:${lang}:${code}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
            id: getLibraryItemId("code", session, `${lang}:${code.slice(0, 160)}`, index),
            type: "code",
            origin: "assistant",
            title,
            detail: getCodeLibraryMeta(lang, kind, code),
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            code,
            lang,
            kind,
            fileName: title
        });
    });
    return items;
}

function getCodeLibraryMeta(lang, kind, code) {
    const label = getCodeLanguageLabel(lang, kind) || "Code";
    const lines = String(code || "").split("\n").length;
    return `${label} · ${lines.toLocaleString()} ${lines === 1 ? "line" : "lines"}`;
}

function collectLibraryItemsFromSession(session, seen = new Set()) {
    if (!chatSessionHasContent(session)) return [];
    const root = getSessionLibraryRoot(session);
    return [
        ...collectLibraryImagesFromSession(session, root, seen),
        ...collectLibraryVideosFromSession(session, root, seen),
        ...collectLibraryCodeFromSession(session, root, seen)
    ];
}

function collectLibraryMediaDeleteKeysFromSession(session) {
    const keys = new Set();
    if (!chatSessionHasContent(session)) return keys;

    const root = getSessionLibraryRoot(session);
    const seen = new Set();
    [
        ...collectLibraryImagesFromSession(session, root, seen),
        ...collectLibraryVideosFromSession(session, root, seen)
    ].forEach(item => {
        const key = getLibraryItemPersistentKey(item);
        if (key) keys.add(key);
    });

    return keys;
}

function collectLibraryItems() {
    const liveSeen = new Set();
    const liveItems = chatSessions
        .filter(chatSessionHasContent)
        .sort(compareChatSessions)
        .flatMap(session => collectLibraryItemsFromSession(session, liveSeen));
    const merged = [];
    const mergedKeys = new Set();
    [...liveItems, ...persistedLibraryItems].forEach(item => {
        const key = getLibraryItemPersistentKey(item);
        if (!item || deletedLibraryItemKeys.has(key) || mergedKeys.has(key)) return;
        mergedKeys.add(key);
        merged.push(item);
    });
    return merged;
}

function getLibraryItemCreatedTime(item) {
    const value = Date.parse(item?.createdAt || item?.updatedAt || "");
    return Number.isFinite(value) ? value : 0;
}

function formatLibraryItemDate(item) {
    const timestamp = getLibraryItemCreatedTime(item);
    if (!timestamp) return "Unknown date";
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(timestamp));
    } catch {
        return new Date(timestamp).toLocaleString();
    }
}

function getLibraryItemKindLabel(item) {
    if (item?.type === "image") {
        if (item.origin === "upload") return "Uploaded image";
        return item.origin === "user" ? "User image" : "Generated image";
    }
    if (item?.type === "video") return item.origin === "upload" ? "Uploaded video" : "Video";
    return item?.origin === "upload" ? "Uploaded code" : "Code";
}

function getLibraryPickerSearchText(item) {
    return [
        item.title,
        item.detail,
        item.sessionTitle,
        item.fileName,
        item.lang,
        item.type,
        item.origin,
        formatLibraryItemDate(item)
    ].filter(Boolean).join(" ").toLowerCase();
}

function getLibraryPickerItems() {
    const query = libraryPickerQuery.trim().toLowerCase();
    return collectLibraryItems()
        .filter(item => {
            if (libraryPickerTypeFilter !== LIBRARY_PICKER_TYPE_ALL && getLibraryItemFilterType(item) !== libraryPickerTypeFilter) {
                return false;
            }
            if (!query) return true;
            return getLibraryPickerSearchText(item).includes(query);
        })
        .sort((a, b) => {
            const diff = getLibraryItemCreatedTime(a) - getLibraryItemCreatedTime(b);
            return libraryPickerSortOrder === "oldest" ? diff : -diff;
        });
}

function setLibraryPickerTypeFilter(type) {
    libraryPickerTypeFilter = ["all", "images", "videos", "code"].includes(type) ? type : LIBRARY_PICKER_TYPE_ALL;
    libraryPickerTypeButtons.forEach(button => {
        const active = button.dataset.libraryPickerType === libraryPickerTypeFilter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    scheduleAnimatedSegmentIndicators();
    renderLibraryPicker();
}

function setLibraryPickerSortOrder(sortOrder) {
    libraryPickerSortOrder = sortOrder === "oldest" ? "oldest" : LIBRARY_PICKER_SORT_NEWEST;
    libraryPickerSortButtons.forEach(button => {
        const active = button.dataset.libraryPickerSort === libraryPickerSortOrder;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    scheduleAnimatedSegmentIndicators();
    renderLibraryPicker();
}

function updateLibraryPickerSelectionUi() {
    const selectedCount = libraryPickerSelectedIds.size;
    if (libraryPickerSelectionCount) {
        libraryPickerSelectionCount.textContent = `${selectedCount} selected`;
    }
    if (libraryPickerAttach) {
        libraryPickerAttach.disabled = selectedCount === 0;
        libraryPickerAttach.textContent = selectedCount > 0
            ? `Attach ${selectedCount}`
            : "Attach selected";
    }
    libraryPickerGrid?.querySelectorAll("[data-library-picker-item-id]").forEach(button => {
        const selected = libraryPickerSelectedIds.has(button.dataset.libraryPickerItemId);
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

function toggleLibraryPickerSelection(itemId) {
    if (!itemId) return;
    if (libraryPickerSelectedIds.has(itemId)) {
        libraryPickerSelectedIds.delete(itemId);
    } else {
        libraryPickerSelectedIds.add(itemId);
    }
    updateLibraryPickerSelectionUi();
}

function createLibraryPickerPreview(item) {
    const preview = document.createElement("span");
    preview.className = `library-picker-preview library-picker-preview-${item.type}`;

    if (item.type === "image") {
        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.alt || item.title || "Library image";
        img.loading = "lazy";
        img.decoding = "async";
        preview.appendChild(img);
        return preview;
    }

    if (item.type === "video") {
        preview.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7Z"></path></svg>
        `;
        return preview;
    }

    const code = document.createElement("code");
    code.textContent = String(item.code || "").split("\n").slice(0, 5).join("\n");
    preview.appendChild(code);
    return preview;
}

