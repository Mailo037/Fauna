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

function normalizeProjectAgentTab(value) {
    const clean = String(value || "").trim().toLowerCase();
    if (clean === "files" || clean === "activity" || clean === "chat") return clean;
    return "menu";
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

const PROJECT_AGENT_DEFAULT_WIDTH = 320;
const PROJECT_AGENT_MIN_WIDTH = 268;
const PROJECT_AGENT_MAX_WIDTH = 520;

function normalizeProjectAgentWidth(value) {
    const width = Number(value);
    if (!Number.isFinite(width)) return PROJECT_AGENT_DEFAULT_WIDTH;
    return Math.min(PROJECT_AGENT_MAX_WIDTH, Math.max(PROJECT_AGENT_MIN_WIDTH, Math.round(width)));
}

let activeProjectSortMode = normalizeProjectSortMode(safeLocalStorageGet(WORKSPACE_PROJECT_SORT_STORAGE_KEY));
let activeAgentTaskMode = normalizeAgentTaskMode(safeLocalStorageGet(AGENT_TASK_MODE_STORAGE_KEY));
let activeProjectAgentTab = normalizeProjectAgentTab(safeLocalStorageGet(PROJECT_AGENT_TAB_STORAGE_KEY));
let activeProjectExplorerPath = normalizeProjectExplorerPath(safeLocalStorageGet(PROJECT_EXPLORER_PATH_STORAGE_KEY));
let activeProjectAgentWidth = normalizeProjectAgentWidth(safeLocalStorageGet(PROJECT_AGENT_WIDTH_STORAGE_KEY));
const storedProjectAgentCollapsed = safeLocalStorageGet(PROJECT_AGENT_COLLAPSED_STORAGE_KEY);
let isProjectAgentCollapsed = storedProjectAgentCollapsed ? storedProjectAgentCollapsed === "true" : true;
let isProjectAgentMaximized = safeLocalStorageGet(PROJECT_AGENT_MAXIMIZED_STORAGE_KEY) === "true";
let projectExplorerRootId = "";
let currentProjectExplorerResult = { entries: [], truncated: false };
let agentActivityEvents = [];
let projectPageChatRootId = "";
let projectPageChatHistory = [];

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

function getSessionProjectRoot(session = getActiveSession()) {
    const context = normalizeStoredSessionProjectContext(session?.projectContext);
    return getWorkspaceProjectRootById(context.rootId || context.projectId);
}

function getSessionWorkspaceMode(session = getActiveSession()) {
    return normalizeChatWorkspaceMode(session?.workspaceMode, session?.projectContext);
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
    const session = sessionId ? getChatSessionById(sessionId) : getActiveSession();
    return getSessionProjectRoot(session);
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
        `Active project: ${root.name}. Root path: ${root.path}.${branch} Local file tools and terminal commands are scoped to this selected ${root.type === "worktree" ? "worktree" : "project folder"}. Use relative paths from the project root by default. Create, edit, read, search, and run commands inside this root unless the user explicitly chooses another project.`,
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

function getComposerBranchLabel(root = getSessionProjectRoot()) {
    if (!root) return "No branch";
    if (root.branch) return root.branch;
    const summaryBranch = String(projectBranchSummary?.textContent || "").split("/")[0]?.trim();
    return summaryBranch && !/no project selected|git status unavailable/i.test(summaryBranch)
        ? summaryBranch
        : "main";
}

function updateComposerProjectContextBar() {
    const root = getSessionProjectRoot();
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
        composerBranchBtn.classList.toggle("active", Boolean(root));
        composerBranchBtn.dataset.tooltip = root
            ? "Change project or worktree"
            : "Choose a project first";
    }
    if (composerBranchLabel) composerBranchLabel.textContent = getComposerBranchLabel(root);
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
    session = createChatSession();
    session.composerDraft = captureComposerDraft();
    chatSessions.unshift(session);
    activeSessionId = session.id;
    updateActiveChatTitle();
    updateWorkspaceUrlFragment?.({ replace: true });
    return session;
}

function setActiveChatProject(rootId = "", { notify = true } = {}) {
    const cleanRootId = String(rootId || "").trim();
    let session = getActiveSession();
    const root = getWorkspaceProjectRootById(cleanRootId);

    if (!session && root) {
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

function setProjectAgentTab(tab, { persist = true } = {}) {
    activeProjectAgentTab = normalizeProjectAgentTab(tab);
    if (persist) safeLocalStorageSet(PROJECT_AGENT_TAB_STORAGE_KEY, activeProjectAgentTab);
    const menuActive = activeProjectAgentTab === "menu";
    const filesActive = activeProjectAgentTab === "files";
    const activityActive = activeProjectAgentTab === "activity";
    const chatActive = activeProjectAgentTab === "chat";
    projectPanelMenuTab?.classList.toggle("active", menuActive);
    projectFilesTab?.classList.toggle("active", filesActive);
    projectActivityTab?.classList.toggle("active", activityActive);
    projectPageChatTab?.classList.toggle("active", chatActive);
    projectPanelMenuTab?.setAttribute("aria-selected", String(menuActive));
    projectFilesTab?.setAttribute("aria-selected", String(filesActive));
    projectActivityTab?.setAttribute("aria-selected", String(activityActive));
    projectPageChatTab?.setAttribute("aria-selected", String(chatActive));
    if (projectMenuPane) projectMenuPane.hidden = !menuActive;
    if (projectFilesPane) projectFilesPane.hidden = !filesActive;
    if (projectActivityPane) projectActivityPane.hidden = !activityActive;
    if (projectPageChatPane) projectPageChatPane.hidden = !chatActive;
}

function getActiveProjectBridgeOptions() {
    const root = getSessionProjectRoot();
    return root?.id ? { scope: `project:${root.id}` } : null;
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
        projectAgentExpandBtn.hidden = true;
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

function openProjectWorkspacePanel(tab = "menu", { refresh = false } = {}) {
    setProjectAgentTab(tab);
    setProjectAgentCollapsed(false, { refresh: refresh || tab === "files" });
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
    switch (action) {
        case "files":
            openProjectWorkspacePanel("files", { refresh: true });
            return;
        case "terminal":
            void openProjectTerminalFromPanel();
            return;
        case "inspect":
            openProjectWorkspacePanel("activity");
            void openProjectDiffReview();
            return;
        case "browser":
            showToast("Browser panel is not connected yet.", "info");
            return;
        case "page-chat":
            openProjectWorkspacePanel("chat");
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
    setProjectAgentTab(activeProjectAgentTab, { persist: false });
    if (projectAgentTitle) projectAgentTitle.textContent = root?.name || "Workspace";
    if (projectBranchSummary) {
        projectBranchSummary.textContent = root
            ? `${root.type === "worktree" ? "Worktree" : "Project"}: ${root.name}`
            : "No project selected";
    }
    if (!root) {
        projectExplorerRootId = "";
        currentProjectExplorerResult = { entries: [], truncated: false };
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
        if (projectExplorerFilterInput) projectExplorerFilterInput.value = "";
        safeLocalStorageSet(PROJECT_EXPLORER_PATH_STORAGE_KEY, activeProjectExplorerPath);
    }
    if (projectExplorerPath) projectExplorerPath.textContent = activeProjectExplorerPath;
    ensureProjectPageChatRoot();
    renderAgentActivityList();
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

function getProjectExplorerFilterText() {
    return String(projectExplorerFilterInput?.value || "").trim().toLowerCase();
}

function matchesProjectExplorerFilter(entry = {}, filterText = "") {
    if (!filterText) return true;
    return [entry.name, entry.path, entry.type]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(filterText));
}

function renderProjectExplorerCurrentEntries() {
    if (!projectExplorerList) return;
    const result = currentProjectExplorerResult || {};
    const entries = Array.isArray(result.entries) ? result.entries : [];
    const filterText = getProjectExplorerFilterText();
    const visibleEntries = filterText
        ? entries.filter(entry => matchesProjectExplorerFilter(entry, filterText))
        : entries;
    if (projectExplorerPath) projectExplorerPath.textContent = activeProjectExplorerPath;
    if (projectExplorerUpBtn) projectExplorerUpBtn.disabled = activeProjectExplorerPath === ".";
    projectExplorerList.replaceChildren();
    if (activeProjectExplorerPath !== ".") {
        const up = createProjectExplorerRow({
            name: "..",
            path: getProjectParentPath(activeProjectExplorerPath),
            type: "directory"
        }, { parent: true });
        projectExplorerList.appendChild(up);
    }
    visibleEntries.forEach(entry => projectExplorerList.appendChild(createProjectExplorerRow(entry)));
    if (!visibleEntries.length) {
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

function createProjectExplorerRow(entry = {}, { parent = false } = {}) {
    const isDirectory = entry.type === "directory";
    const button = document.createElement("button");
    button.type = "button";
    button.className = `project-explorer-row${isDirectory ? " project-explorer-row-dir" : " project-explorer-row-file"}`;
    button.innerHTML = `
        <svg class="project-explorer-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            ${isDirectory
                ? '<path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path>'
                : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path>'}
        </svg>
        <span class="project-explorer-row-name"></span>
        <span class="project-explorer-row-meta"></span>
    `;
    button.querySelector(".project-explorer-row-name").textContent = parent ? "Parent folder" : (entry.name || entry.path || "Untitled");
    button.querySelector(".project-explorer-row-meta").textContent = isDirectory ? "Folder" : formatProjectFileSize(entry.size);
    button.addEventListener("click", () => {
        if (isDirectory) {
            void refreshProjectExplorer({ path: entry.path || "." });
        } else {
            void openProjectFilePreview(entry.path || "");
        }
    });
    return button;
}

async function refreshProjectBranchSummary(root = getSessionProjectRoot()) {
    if (!root || !projectBranchSummary || !hasWorkspaceBridgeAccess()) return;
    try {
        const bridgeOptions = getActiveProjectBridgeOptions();
        const branchResult = await runWorkspaceCommand("git branch --show-current", ".", 10, null, bridgeOptions);
        const statusResult = await runWorkspaceCommand("git status --short", ".", 10, null, bridgeOptions);
        const branch = String(branchResult.stdout || "").trim() || root.branch || "detached";
        const dirtyLines = String(statusResult.stdout || "").trim().split(/\r?\n/).filter(Boolean).length;
        projectBranchSummary.textContent = `${branch} / ${dirtyLines ? `${dirtyLines} changed` : "clean"}`;
        updateComposerProjectContextBar();
    } catch (err) {
        projectBranchSummary.textContent = `${root.name} / git status unavailable`;
        updateComposerProjectContextBar();
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
        const result = await listWorkspaceTree(activeProjectExplorerPath, 0, null, 160, getActiveProjectBridgeOptions());
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
        openProjectContentDialog({
            title: result.path || cleanPath,
            subtitle: `${Number(result.size || 0).toLocaleString()} bytes${result.truncated ? " / truncated" : ""}`,
            content: result.content || "",
            primaryLabel: "Add path",
            onPrimary: () => {
                if (!input) return;
                const insertion = `\`${result.path || cleanPath}\``;
                input.value = [input.value.trim(), insertion].filter(Boolean).join(" ");
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.focus();
            }
        });
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
    return [
        `${status}: ${result.command || ""}`,
        `Exit code: ${result.exitCode ?? "timeout"} / Duration: ${result.durationMs ?? 0}ms`,
        `Signal: ${getProjectCommandSignalLine(result)}`,
        stdout ? `\nStdout:\n${stdout}` : "",
        stderr ? `\nStderr:\n${stderr}` : ""
    ].filter(Boolean).join("\n");
}

async function runProjectCommandFromPanel() {
    const command = String(projectCommandInput?.value || "").trim();
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
    if (projectCommandOutput) {
        projectCommandOutput.hidden = false;
        projectCommandOutput.textContent = `Running: ${command}`;
    }
    try {
        const result = await runWorkspaceCommand(command, activeProjectExplorerPath || ".", 60, null, getActiveProjectBridgeOptions());
        const output = formatProjectCommandOutput(result);
        if (projectCommandOutput) projectCommandOutput.textContent = output;
        updateAgentActivityEvent(activityId, {
            status: Number(result.exitCode || 0) === 0 && !result.timedOut ? "done" : "failed",
            detail: `${command} / ${getProjectCommandStatus(result)}`
        });
        void refreshProjectBranchSummary();
    } catch (err) {
        if (projectCommandOutput) projectCommandOutput.textContent = `Command failed: ${err.message}`;
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Command failed: ${err.message}`, "error");
    } finally {
        if (projectCommandRunBtn) projectCommandRunBtn.disabled = false;
    }
}

function resetProjectPageChat(root = getSessionProjectRoot()) {
    projectPageChatRootId = root?.id || "";
    projectPageChatHistory = [];
    if (!projectPageChatLog) return;
    const empty = document.createElement("div");
    empty.className = "project-page-chat-empty";
    empty.textContent = root
        ? `Ask about ${root.name}. The AI can use this project's files and terminal tools.`
        : "Select a project chat first to use workspace page chat.";
    projectPageChatLog.replaceChildren(empty);
}

function ensureProjectPageChatRoot() {
    const root = getSessionProjectRoot();
    const rootId = root?.id || "";
    if (rootId !== projectPageChatRootId) {
        resetProjectPageChat(root);
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

function setProjectPageChatBusy(busy) {
    if (projectPageChatSendBtn) projectPageChatSendBtn.disabled = Boolean(busy);
    if (projectPageChatInput) projectPageChatInput.disabled = Boolean(busy);
}

async function sendProjectPageChatMessage() {
    const prompt = String(projectPageChatInput?.value || "").trim();
    if (!prompt) return;
    const root = ensureProjectPageChatRoot();
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

    const userMessage = {
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString()
    };
    projectPageChatHistory.push(userMessage);
    appendProjectPageChatMessage("user", prompt);
    if (projectPageChatInput) {
        projectPageChatInput.value = "";
        projectPageChatInput.style.height = "";
    }

    const assistantBody = appendProjectPageChatMessage("assistant", "Thinking...");
    const controller = new AbortController();
    setProjectPageChatBusy(true);
    const routedModel = chooseModelForRequest(prompt, [], null, null);
    const activityId = recordAgentActivity({
        kind: "chat",
        label: "Page chat",
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
        assistantBody.textContent = `Page chat failed: ${err.message}`;
        updateAgentActivityEvent(activityId, { status: "failed", detail: err.message });
        showToast(`Page chat failed: ${err.message}`, "error");
    } finally {
        setProjectPageChatBusy(false);
        projectPageChatInput?.focus?.();
        projectPageChatLog.scrollTop = projectPageChatLog.scrollHeight;
    }
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

function closeProjectMenus(except = null) {
    document.querySelectorAll(".project-menu-wrap.open").forEach(menuWrap => {
        if (except && menuWrap === except) return;
        menuWrap.classList.remove("open");
        const trigger = menuWrap.querySelector(".project-menu-trigger");
        const menu = menuWrap.querySelector(".project-menu");
        trigger?.setAttribute("aria-expanded", "false");
        if (menu) menu.hidden = true;
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

function renderProjectRow(root, { nested = false } = {}) {
    const activeRoot = getSessionProjectRoot();
    const row = document.createElement("div");
    row.className = `project-row${nested ? " project-row-worktree" : ""}`;
    row.classList.toggle("active", activeRoot?.id === root.id);

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "project-main-btn";
    mainButton.setAttribute("aria-current", activeRoot?.id === root.id ? "page" : "false");
    mainButton.innerHTML = `
        <svg class="project-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            ${root.type === "worktree"
                ? '<path d="M6 3v5a4 4 0 0 0 4 4h4"></path><path d="M18 21v-5a4 4 0 0 0-4-4h-4"></path><circle cx="6" cy="3" r="2"></circle><circle cx="18" cy="21" r="2"></circle><circle cx="18" cy="12" r="2"></circle>'
                : '<path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path>'}
        </svg>
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
        menu.hidden = !willOpen;
    });

    menuWrap.append(menuButton, menu);
    row.append(mainButton, menuWrap);
    return row;
}

function appendProjectChatRows(container, root) {
    getProjectChatSessions(root.id).forEach(session => {
        container.appendChild(createChatSessionRow(session, {
            variant: "project-chat-session-row",
            hideProjectBadge: true
        }));
    });
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
        projectList.appendChild(renderProjectRow(projectRoot));
        appendProjectChatRows(projectList, projectRoot);
        project.worktrees.forEach(worktree => {
            const worktreeRoot = {
                ...worktree,
                projectId: project.id,
                type: "worktree",
                project
            };
            projectList.appendChild(renderProjectRow(worktreeRoot, { nested: true }));
            appendProjectChatRows(projectList, worktreeRoot);
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
    showToast(isWorkspaceBridgeEnabled ? "Local workspace access enabled." : "Local workspace access disabled.", isWorkspaceBridgeEnabled ? "success" : "info");
});
composerBranchBtn?.addEventListener("click", event => {
    event.stopPropagation();
    openComposerProjectMenu({ focusFirst: true });
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
projectPanelAddTabBtn?.addEventListener("click", () => openProjectWorkspacePanel("menu"));
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
projectExplorerUpBtn?.addEventListener("click", () => {
    void refreshProjectExplorer({ path: getProjectParentPath(activeProjectExplorerPath) });
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
projectCommandInput?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void runProjectCommandFromPanel();
});
projectPageChatSendBtn?.addEventListener("click", () => {
    void sendProjectPageChatMessage();
});
projectPageChatInput?.addEventListener("input", () => {
    projectPageChatInput.style.height = "auto";
    projectPageChatInput.style.height = `${Math.min(118, projectPageChatInput.scrollHeight)}px`;
});
projectPageChatInput?.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendProjectPageChatMessage();
});
document.addEventListener("click", event => {
    if (!event.target?.closest?.(".agent-task-mode-wrap")) closeAgentTaskModeMenu();
    if (!event.target?.closest?.(".composer-project-wrap")) closeComposerProjectMenu();
    if (!event.target?.closest?.(".new-chat-picker-wrap")) closeNewChatProjectMenu();
    if (!event.target?.closest?.(".project-menu-wrap")) closeProjectMenus();
    if (!event.target?.closest?.(".project-sort-wrap")) closeProjectSortMenu();
});
window.addEventListener("resize", positionComposerProjectMenu);
window.addEventListener("scroll", positionComposerProjectMenu, true);
document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeAgentTaskModeMenu();
    closeComposerProjectMenu();
    closeNewChatProjectMenu();
    closeProjectMenus();
    closeProjectSortMenu();
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
        session = createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
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
        workspaceMode: "normal",
        sessionTotalTokens: 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER,
        ...overrides
    };
    session.projectContext = normalizeStoredSessionProjectContext(session.projectContext);
    session.workspaceMode = normalizeChatWorkspaceMode(session.workspaceMode, session.projectContext);
    return session;
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
    session.chatHtml = sanitizeChatHtmlMediaSources(chat?.innerHTML || "");
    session.domNodes = chat ? Array.from(chat.childNodes) : [];
    session.conversationHistory = cloneConversationHistory(history);
    session.composerDraft = captureComposerDraft();
    session.sessionTotalTokens = tokenTotal;
    session.sessionTokenSource = TOKEN_USAGE_SOURCE_PROVIDER;
    if (!session.manualTitle && !session.assistantTitle) {
        session.title = deriveSessionTitle(session);
    }
    session.updatedAt = new Date().toISOString();
    syncUsageToolEventsFromSession(session, { html: session.chatHtml });
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
    return session;
}

function ensureWritableActiveChatSession() {
    const active = getActiveSession();
    if (active?.archived) {
        showToast("Archived chats are read-only. Restore the chat before writing.", "warning");
        return null;
    }
    if (active) return active;

    const session = createChatSession();
    chatSessions.unshift(session);
    activeSessionId = session.id;
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
        workspaceMode: normalizeChatWorkspaceMode(session.workspaceMode, session.projectContext),
        sessionTotalTokens: normalizeTokenCount(session.sessionTotalTokens) || 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function trimChatSessions() {
    if (chatSessions.length <= MAX_CHAT_SESSIONS) return;
    const removedSessions = [];
    const removable = [...chatSessions]
        .filter(session => session.id !== activeSessionId)
        .sort((a, b) => {
            if (a.archived !== b.archived) return a.archived ? -1 : 1;
            if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });

    while (chatSessions.length > MAX_CHAT_SESSIONS && removable.length > 0) {
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
    const startIndex = Math.max(0, profiles.indexOf(chatStorageProfile));
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
        session = createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
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
        const menu = menuWrap.querySelector(".chat-session-menu");
        trigger?.setAttribute("aria-expanded", "false");
        if (menu) menu.hidden = true;
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
        menu.hidden = !willOpen;
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
    });
}

function renderChatFromConversationHistoryFallback(history = conversationHistory) {
    if (!chat) return;
    chat.replaceChildren();
    history.forEach((message, index) => {
        const role = message?.role === "user" ? "user" : "output";
        const rawContent = String(message?.content || "").trim();
        if (!rawContent) return;

        const toolRequest = parseFaunaToolCall(rawContent);
        const visibleContent = role === "output"
            ? stripAssistantControlBlocks(rawContent) || (toolRequest ? getAssistantToolPlaceholder(toolRequest) : rawContent)
            : rawContent;
        const bubble = addRenderNode(visibleContent, role, [], {
            historyIndex: index,
            createdAt: message.createdAt,
            voiceRecording: message.voiceRecording,
            forceScroll: false
        });

        if (role === "output") {
            renderAssistantContentHtml(bubble, renderMarkdown(visibleContent), { final: true, busy: false });
            setupAssistantActions(bubble.parentElement, visibleContent, {
                messageIndex: index,
                canRegenerate: true,
                canFork: true,
                canSpeak: true,
                speakText: visibleContent
            });
        }
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
    if (closeWorkbench) closeCodeWorkbench();
    conversationHistory = cloneConversationHistory(session.conversationHistory);
    sessionTotalTokens = Math.max(sumHistoryTokenUsage(conversationHistory), normalizeTokenCount(session.sessionTotalTokens) || 0);
    clearComposerDraft();
    restoreComposerDraft(session.composerDraft);

    if (chat) {
        if (session.domNodes?.length) {
            chat.replaceChildren(...session.domNodes);
        } else if (session.chatHtml?.trim()) {
            chat.innerHTML = sanitizeChatHtmlMediaSources(session.chatHtml || "");
        } else if (conversationHistory.length > 0) {
            renderChatFromConversationHistoryFallback(conversationHistory);
        } else {
            chat.replaceChildren();
        }
        chat.style.display = activeChatHasContent() ? "block" : "none";
        scrollChatToBottom({ force: true });
        rehydrateRenderedChat(chat);
        applyActiveVoiceOrbTheme();
    }
    if (welcome) welcome.style.display = activeChatHasContent() ? "none" : "flex";

    updateTokenDisplay();
    updateActiveChatTitle();
    renderProjectList();
    renderComposerProjectPicker();
    updateGenerationUi?.({ renderHistory: false });
}

function restoreEmptyChatDraft({ render = true, persist = true, updateUrl = true } = {}) {
    closeCodeWorkbench();
    clearClarifyingQuestionComposer();
    activeSessionId = null;
    conversationHistory = [];
    sessionTotalTokens = 0;
    clearComposerDraft();
    setChatTitleEditing(false);

    if (chat) {
        chat.replaceChildren();
        chat.style.display = "none";
    }
    if (welcome) welcome.style.display = "flex";

    updateTokenDisplay();
    updateActiveChatTitle();
    renderProjectList();
    renderComposerProjectPicker();
    updateGenerationUi?.({ renderHistory: false });
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
        const session = createChatSession({
            workspaceMode: "project",
            projectContext: createProjectContextForRoot(projectRoot)
        });
        chatSessions.unshift(session);
        activeSessionId = session.id;
        restoreChatSessionToView(session);
        setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl, urlMode });
        enableWorkspaceBridgeForProject();
        persistChatSessions();
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
    const extension = getMimeExtension(file.type, titleExt || type).toUpperCase();
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
    renderLibraryPicker();
}

function setLibraryPickerSortOrder(sortOrder) {
    libraryPickerSortOrder = sortOrder === "oldest" ? "oldest" : LIBRARY_PICKER_SORT_NEWEST;
    libraryPickerSortButtons.forEach(button => {
        const active = button.dataset.libraryPickerSort === libraryPickerSortOrder;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
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

