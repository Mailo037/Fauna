// Original feature chunk: Capabilities catalog for skills, servers, and api connectors.
const CAPABILITY_SKILL_CONTENT_MAX_CHARS = 80_000;
const CAPABILITY_DESCRIPTION_MAX_CHARS = 320;
const CAPABILITY_TOOL_RESULT_MAX_CHARS = 16_000;
const CAPABILITY_API_BODY_MAX_CHARS = 14_000;
const CAPABILITY_MCP_ARGUMENT_MAX_CHARS = 12_000;
const MCP_TRANSPORT_STDIO = "stdio";
const MCP_TRANSPORT_STREAMABLE_HTTP = "streamable_http";
const MCP_TRANSPORT_LEGACY_SSE = "legacy_sse";
const CAPABILITY_API_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const CAPABILITY_SKILL_PRESETS = [
    {
        name: "skill-creator",
        description: "Create or improve assistant skills from a chat request.",
        content: `---
name: skill-creator
description: Create or improve assistant skills when the user asks to make a skill, update a skill, turn a workflow into reusable instructions, or install a new chat skill.
---
Use this skill when the user wants a reusable skill.

Ask only for missing essentials: skill name, what should trigger it, and any project-specific rules. Write concise frontmatter with name and description, then a focused body with the actual workflow. Keep the skill self-contained, avoid broad documentation, and include examples only when they prevent ambiguity.

If Fauna can install skills in this chat, call the install_skill tool with the finished skill content. Otherwise provide the skill file content and tell the user to paste it into Capabilities > Skills.`
    },
    {
        name: "connect-server",
        description: "Help connect a model context server from command, json, toml, or url details.",
        content: `---
name: connect-server
description: Help connect model context servers when the user asks to add, configure, import, debug, or use an mcp server, Claude server config, Codex server config, stdio command, sse endpoint, or streamable http endpoint.
---
Use this skill when the user wants server tools connected to Fauna.

Identify the transport: stdio command, streamable http url, or legacy sse url. Collect the server name, command and arguments or url, working directory, headers, and environment variables. Keep secrets out of normal prose when possible.

If enough details are present, call save_server with the normalized configuration. If details are missing, ask for the smallest missing piece. For pasted Claude json, Codex toml, or codex mcp add commands, convert them into one server entry. After saving, suggest discovering tools before calling them.`
    },
    {
        name: "connect-api",
        description: "Help connect a focused http api connector for chat tool calls.",
        content: `---
name: connect-api
description: Help connect api connectors when the user asks to add, configure, import, debug, or call an http api from chat.
---
Use this skill when the user wants Fauna to call an api.

Collect the connector name, base url, default path, method, headers, query parameters, body shape, auth requirements, and whether localhost or private-network access is needed. Prefer a narrow connector that does one job clearly.

If enough details are present, call save_api_connector with the normalized configuration. If details are missing, ask for the smallest missing piece. Warn before storing secrets and keep the connector description specific enough for the model to know when to use it.`
    },
    {
        name: "repo-review",
        description: "Review repository changes for regressions, risk, and missing tests.",
        content: `---
name: repo-review
description: Review repository changes for regressions, risk, and missing tests.
---
Use this skill when the user asks for a code review, risk check, or regression hunt.

Focus on concrete findings first. Cite file paths and line numbers where possible. Prioritize correctness, security, data loss, broken user flows, and missing verification. Keep summaries short and secondary to findings.`
    },
    {
        name: "browser-debug",
        description: "Debug visible UI or browser runtime issues with screenshots and console evidence.",
        content: `---
name: browser-debug
description: Debug visible UI or browser runtime issues with screenshots and console evidence.
---
Use this skill when a web app has a visible layout issue, console error, failed request, or broken interaction.

Reproduce the issue in a fresh page when possible. Separate browser noise from the app error. Prefer exact console messages, failing selectors, request status codes, and screenshots over assumptions.`
    },
    {
        name: "plan-and-ship",
        description: "Break down a multi-step implementation and carry it through validation.",
        content: `---
name: plan-and-ship
description: Break down a multi-step implementation and carry it through validation.
---
Use this skill for larger product or engineering changes with several files or phases.

State the short plan, make scoped edits, verify the important paths, and report what changed. Avoid unrelated refactors unless they are necessary for the requested outcome.`
    }
];

let activeCapabilitiesTab = "skills";
let activeMcpTransport = MCP_TRANSPORT_STDIO;
let activeApiMethod = "GET";

function getCapabilityElement(id) {
    return document.getElementById(id);
}

function getDesktopSkillsApi() {
    const desktopApi = typeof getFaunaDesktopApi === "function" ? getFaunaDesktopApi() : globalThis.faunaDesktop;
    return desktopApi?.skills || null;
}

function getCapabilitySkillIconSvg() {
    return '<path d="M12 3 5 7v10l7 4 7-4V7Z"></path><path d="M5 7l7 4 7-4"></path><path d="M12 11v10"></path>';
}

function formatSkillDisplayName(value = "") {
    return String(value || "skill")
        .trim()
        .replace(/^[$@]/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b([a-z])/g, char => char.toUpperCase())
        .slice(0, 80) || "Skill";
}

function getSkillMentionRecord(nameOrId = "") {
    return findInstalledSkill(nameOrId);
}

function renderSkillMentionChip(skill) {
    if (!skill) return "";
    return `<span class="fauna-skill-mention" data-skill-name="${escapeHtml(skill.name)}"><span class="fauna-skill-mention-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">${getCapabilitySkillIconSvg()}</svg></span><span class="fauna-skill-mention-name">${escapeHtml(formatSkillDisplayName(skill.name))}</span></span>`;
}

function renderPlainTextWithSkillMentionChips(text = "") {
    if (typeof getSkillMentionRecord !== "function" || typeof renderSkillMentionChip !== "function") {
        return escapeHtml(text);
    }
    const source = String(text || "");
    let output = "";
    let lastIndex = 0;
    const mentionPattern = /(^|[\s([{])([$@])([A-Za-z0-9][A-Za-z0-9_.-]{1,80})\b/g;
    for (const match of source.matchAll(mentionPattern)) {
        const matchIndex = match.index || 0;
        const prefix = match[1] || "";
        const token = match[3] || "";
        const skill = getSkillMentionRecord(token);
        if (!skill) continue;
        const mentionStart = matchIndex + prefix.length;
        output += escapeHtml(source.slice(lastIndex, mentionStart));
        output += renderSkillMentionChip(skill);
        lastIndex = mentionStart + match[2].length + token.length;
    }
    output += escapeHtml(source.slice(lastIndex));
    return output;
}

function getComposerSkillMatches(query = "", limit = 14) {
    const needle = String(query || "").trim().replace(/^[$@]/, "").toLowerCase();
    return readInstalledSkills()
        .filter(skill => skill.enabled)
        .map((skill, index) => {
            const name = skill.name.toLowerCase();
            const displayName = formatSkillDisplayName(skill.name).toLowerCase();
            const description = String(skill.description || "").toLowerCase();
            let score = Number.POSITIVE_INFINITY;
            if (!needle) score = index + 20;
            else if (name === needle || displayName === needle) score = 0;
            else if (name.startsWith(needle) || displayName.startsWith(needle)) score = 1;
            else if (name.includes(needle) || displayName.includes(needle)) score = 2;
            else if (description.includes(needle)) score = 3;
            return { skill, index, score };
        })
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .slice(0, limit)
        .map(item => item.skill);
}

function createCapabilityId(prefix, seed = "") {
    const cleanSeed = String(seed || prefix || "capability")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 54);
    const suffix = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID().slice(0, 8)
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return `${prefix}-${cleanSeed || "item"}-${suffix}`;
}

function normalizeCapabilityName(value, fallback = "capability") {
    const name = String(value || "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^A-Za-z0-9_.-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    return name || fallback;
}

function truncateCapabilityText(value, maxLength = CAPABILITY_DESCRIPTION_MAX_CHARS) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function readCapabilityArray(storageKey) {
    const raw = safeLocalStorageGet(storageKey);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === "object") : [];
    } catch (err) {
        console.warn(`Could not parse ${storageKey}:`, err);
        return [];
    }
}

function writeCapabilityArray(storageKey, items) {
    safeLocalStorageSet(storageKey, JSON.stringify(Array.isArray(items) ? items : []));
}

function readInstalledSkills() {
    return readCapabilityArray(SKILL_LIBRARY_STORAGE_KEY).map(normalizeSkillRecord).filter(Boolean);
}

function writeInstalledSkills(skills) {
    writeCapabilityArray(SKILL_LIBRARY_STORAGE_KEY, skills.map(normalizeSkillRecord).filter(Boolean));
}

function readMcpServers() {
    return readCapabilityArray(MCP_SERVERS_STORAGE_KEY).map(normalizeMcpServerRecord).filter(Boolean);
}

function writeMcpServers(servers) {
    writeCapabilityArray(MCP_SERVERS_STORAGE_KEY, servers.map(normalizeMcpServerRecord).filter(Boolean));
}

function readApiConnectors() {
    return readCapabilityArray(API_CONNECTORS_STORAGE_KEY).map(normalizeApiConnectorRecord).filter(Boolean);
}

function writeApiConnectors(connectors) {
    writeCapabilityArray(API_CONNECTORS_STORAGE_KEY, connectors.map(normalizeApiConnectorRecord).filter(Boolean));
}

function ensureBasicSkillsSeeded() {
    if (safeLocalStorageGet(CAPABILITY_BASIC_SKILLS_SEEDED_STORAGE_KEY) === "1") return;
    const basicNames = new Set(["skill-creator", "connect-server", "connect-api"]);
    const skills = readInstalledSkills();
    const existingNames = new Set(skills.map(skill => skill.name.toLowerCase()));
    const additions = CAPABILITY_SKILL_PRESETS
        .filter(preset => basicNames.has(preset.name) && !existingNames.has(preset.name))
        .map(preset => normalizeSkillRecord({ ...preset, source: "basic", enabled: true }))
        .filter(Boolean);
    if (additions.length) writeInstalledSkills([...skills, ...additions]);
    safeLocalStorageSet(CAPABILITY_BASIC_SKILLS_SEEDED_STORAGE_KEY, "1");
}

function setCapabilitiesStatus(message = "Ready", state = "info") {
    const status = getCapabilityElement("capabilitiesStatus");
    if (!status) return;
    status.textContent = message;
    const badgeState = state === "success" ? "configured" : state === "error" || state === "warning" ? "missing" : "";
    if (badgeState) status.dataset.state = badgeState;
    else delete status.dataset.state;
}

function parseCapabilityJsonObject(value, label = "json") {
    const text = String(value || "").trim();
    if (!text) return {};
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        throw new Error(`${label} must be valid json: ${err.message}`);
    }
}

function splitCapabilityCommandLine(value = "") {
    const text = String(value || "").trim();
    if (!text) return [];
    const parts = [];
    let current = "";
    let quote = "";
    let escaped = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === "\\") {
            escaped = true;
            continue;
        }
        if (quote) {
            if (char === quote) {
                quote = "";
            } else {
                current += char;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (/\s/.test(char)) {
            if (current) {
                parts.push(current);
                current = "";
            }
            continue;
        }
        current += char;
    }
    if (current) parts.push(current);
    return parts;
}

function parseSkillFrontmatter(content = "") {
    const text = String(content || "").replace(/^\uFEFF/, "");
    const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*/);
    const metadata = {};
    if (!match) return metadata;
    match[1].split(/\r?\n/).forEach(line => {
        const itemMatch = line.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*(.*?)\s*$/);
        if (!itemMatch) return;
        metadata[itemMatch[1].toLowerCase()] = itemMatch[2].replace(/^["']|["']$/g, "").trim();
    });
    return metadata;
}

function inferSkillDescription(content = "") {
    const metadata = parseSkillFrontmatter(content);
    if (metadata.description) return truncateCapabilityText(metadata.description);
    const lines = String(content || "")
        .replace(/^---\s*\n[\s\S]*?\n---\s*/, "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const firstBodyLine = lines.find(line => !line.startsWith("#")) || "";
    return truncateCapabilityText(firstBodyLine || "Reusable assistant instructions.");
}

function normalizeSkillRecord(skill) {
    if (!skill || typeof skill !== "object") return null;
    const content = String(skill.content || skill.markdown || "").slice(0, CAPABILITY_SKILL_CONTENT_MAX_CHARS).trim();
    if (!content) return null;
    const metadata = parseSkillFrontmatter(content);
    const name = normalizeCapabilityName(skill.name || metadata.name || metadata.title || "skill", "skill");
    const now = new Date().toISOString();
    return {
        id: String(skill.id || createCapabilityId("skill", name)),
        name,
        description: truncateCapabilityText(skill.description || metadata.description || inferSkillDescription(content)),
        content,
        enabled: skill.enabled !== false,
        source: String(skill.source || "manual"),
        installedAt: String(skill.installedAt || now),
        updatedAt: String(skill.updatedAt || now)
    };
}

function upsertSkillRecord(skill, { notify = true } = {}) {
    const normalized = normalizeSkillRecord(skill);
    if (!normalized) throw new Error("Skill content is required.");
    const skills = readInstalledSkills();
    const existingIndex = skills.findIndex(item => item.id === normalized.id || item.name.toLowerCase() === normalized.name.toLowerCase());
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
        skills[existingIndex] = {
            ...skills[existingIndex],
            ...normalized,
            id: skills[existingIndex].id,
            installedAt: skills[existingIndex].installedAt,
            updatedAt: now
        };
    } else {
        skills.push({ ...normalized, installedAt: now, updatedAt: now });
    }
    writeInstalledSkills(skills);
    if (notify) showToast(`Skill ${normalized.name} installed.`, "success");
    renderCapabilitiesView();
    return normalized;
}

function getEnabledSkills() {
    return readInstalledSkills().filter(skill => skill.enabled);
}

function findInstalledSkill(nameOrId = "") {
    const target = String(nameOrId || "").trim().replace(/^\$/, "").toLowerCase();
    if (!target) return null;
    return readInstalledSkills().find(skill => (
        skill.id.toLowerCase() === target
        || skill.name.toLowerCase() === target
        || skill.name.toLowerCase().replace(/-/g, "_") === target
    )) || null;
}

function normalizeMcpTransport(value = "") {
    const clean = String(value || "").trim().toLowerCase().replace(/-/g, "_");
    if (clean === "http" || clean === "streamable" || clean === "streamable_http") return MCP_TRANSPORT_STREAMABLE_HTTP;
    if (clean === "sse" || clean === "http_sse" || clean === "legacy_sse") return MCP_TRANSPORT_LEGACY_SSE;
    return MCP_TRANSPORT_STDIO;
}

function normalizeStringArray(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item ?? "").trim()).filter(Boolean);
    }
    return splitCapabilityCommandLine(value);
}

function normalizeMcpToolRecord(tool) {
    if (typeof tool === "string") {
        const name = tool.trim();
        return name ? { name, description: "" } : null;
    }
    if (!tool || typeof tool !== "object") return null;
    const name = String(tool.name || tool.tool || "").trim();
    if (!name) return null;
    return {
        name,
        description: truncateCapabilityText(tool.description || tool.title || "", 240),
        inputSchema: tool.inputSchema || tool.schema || tool.parameters || null
    };
}

function normalizeMcpServerRecord(server) {
    if (!server || typeof server !== "object") return null;
    const transport = normalizeMcpTransport(server.transport || (server.url ? MCP_TRANSPORT_STREAMABLE_HTTP : MCP_TRANSPORT_STDIO));
    const name = normalizeCapabilityName(server.name || server.id || "mcp-server", "mcp-server");
    const args = normalizeStringArray(server.args || server.arguments || "");
    const env = server.env && typeof server.env === "object" && !Array.isArray(server.env) ? server.env : {};
    const headers = server.headers && typeof server.headers === "object" && !Array.isArray(server.headers)
        ? server.headers
        : server.httpHeaders && typeof server.httpHeaders === "object" && !Array.isArray(server.httpHeaders)
            ? server.httpHeaders
            : {};
    const now = new Date().toISOString();
    return {
        id: String(server.id || createCapabilityId("mcp", name)),
        name,
        description: truncateCapabilityText(server.description || ""),
        transport,
        command: String(server.command || "").trim(),
        args,
        url: String(server.url || "").trim(),
        cwd: String(server.cwd || ".").trim() || ".",
        env,
        headers,
        enabled: server.enabled !== false,
        tools: Array.isArray(server.tools) ? server.tools.map(normalizeMcpToolRecord).filter(Boolean) : [],
        instructions: String(server.instructions || "").trim(),
        discoveredAt: String(server.discoveredAt || ""),
        createdAt: String(server.createdAt || now),
        updatedAt: String(server.updatedAt || now)
    };
}

function upsertMcpServerRecord(server, { notify = true } = {}) {
    const normalized = normalizeMcpServerRecord(server);
    if (!normalized) throw new Error("Server configuration is required.");
    if (normalized.transport === MCP_TRANSPORT_STDIO && !normalized.command) {
        throw new Error("stdio servers need a command.");
    }
    if (normalized.transport !== MCP_TRANSPORT_STDIO && !normalized.url) {
        throw new Error("http servers need a url.");
    }
    const servers = readMcpServers();
    const existingIndex = servers.findIndex(item => item.id === normalized.id || item.name.toLowerCase() === normalized.name.toLowerCase());
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
        servers[existingIndex] = {
            ...servers[existingIndex],
            ...normalized,
            id: servers[existingIndex].id,
            createdAt: servers[existingIndex].createdAt,
            updatedAt: now
        };
    } else {
        servers.push({ ...normalized, createdAt: now, updatedAt: now });
    }
    writeMcpServers(servers);
    if (notify) showToast(`Server ${normalized.name} saved.`, "success");
    renderCapabilitiesView();
    return normalized;
}

function findMcpServer(nameOrId = "") {
    const target = String(nameOrId || "").trim().toLowerCase();
    if (!target) return null;
    return readMcpServers().find(server => (
        server.id.toLowerCase() === target
        || server.name.toLowerCase() === target
    )) || null;
}

function getEnabledMcpServers() {
    return readMcpServers().filter(server => server.enabled);
}

function normalizeApiMethod(value = "") {
    const method = String(value || "").trim().toUpperCase();
    return CAPABILITY_API_METHODS.has(method) ? method : "GET";
}

function normalizeApiConnectorRecord(connector) {
    if (!connector || typeof connector !== "object") return null;
    const name = normalizeCapabilityName(connector.name || connector.id || "api", "api");
    const now = new Date().toISOString();
    const headers = connector.headers && typeof connector.headers === "object" && !Array.isArray(connector.headers)
        ? connector.headers
        : {};
    return {
        id: String(connector.id || createCapabilityId("api", name)),
        name,
        description: truncateCapabilityText(connector.description || "Generic http api connector."),
        baseUrl: String(connector.baseUrl || connector.url || "").trim().replace(/\/+$/, ""),
        method: normalizeApiMethod(connector.method),
        path: String(connector.path || "").trim() || "/",
        headers,
        allowLocalNetwork: Boolean(connector.allowLocalNetwork || connector.allowLocal || connector.local),
        enabled: connector.enabled !== false,
        createdAt: String(connector.createdAt || now),
        updatedAt: String(connector.updatedAt || now)
    };
}

function upsertApiConnectorRecord(connector, { notify = true } = {}) {
    const normalized = normalizeApiConnectorRecord(connector);
    if (!normalized) throw new Error("Api connector configuration is required.");
    if (!normalized.baseUrl) throw new Error("Api connector needs a base url.");
    const connectors = readApiConnectors();
    const existingIndex = connectors.findIndex(item => item.id === normalized.id || item.name.toLowerCase() === normalized.name.toLowerCase());
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
        connectors[existingIndex] = {
            ...connectors[existingIndex],
            ...normalized,
            id: connectors[existingIndex].id,
            createdAt: connectors[existingIndex].createdAt,
            updatedAt: now
        };
    } else {
        connectors.push({ ...normalized, createdAt: now, updatedAt: now });
    }
    writeApiConnectors(connectors);
    if (notify) showToast(`Api connector ${normalized.name} saved.`, "success");
    renderCapabilitiesView();
    return normalized;
}

function findApiConnector(nameOrId = "") {
    const target = String(nameOrId || "").trim().toLowerCase();
    if (!target) return null;
    return readApiConnectors().find(connector => (
        connector.id.toLowerCase() === target
        || connector.name.toLowerCase() === target
    )) || null;
}

function getEnabledApiConnectors() {
    return readApiConnectors().filter(connector => connector.enabled);
}

function setCapabilityTab(tabName = "skills") {
    activeCapabilitiesTab = ["skills", "mcp", "apis", "import"].includes(tabName) ? tabName : "skills";
    document.querySelectorAll("[data-capability-tab]").forEach(button => {
        const active = button.dataset.capabilityTab === activeCapabilitiesTab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-capability-pane]").forEach(pane => {
        const active = pane.dataset.capabilityPane === activeCapabilitiesTab;
        pane.classList.toggle("active", active);
        pane.hidden = !active;
    });
    if (typeof scheduleAnimatedSegmentIndicators === "function") {
        scheduleAnimatedSegmentIndicators();
    }
}

function renderCapabilityEmpty(message) {
    const empty = document.createElement("div");
    empty.className = "capability-empty";
    empty.textContent = message;
    return empty;
}

function renderSkillPresets() {
    const list = getCapabilityElement("skillPresetList");
    if (!list) return;
    list.replaceChildren(...CAPABILITY_SKILL_PRESETS.map(preset => {
        const card = document.createElement("article");
        card.className = "settings-control-card settings-control-card-stacked capability-preset";
        card.innerHTML = `
            <div class="setting-info">
                <div class="capability-item-title-row">
                    <span class="setting-title capability-item-title">${escapeHtml(preset.name)}</span>
                    <span class="settings-status-badge capability-pill">Preset</span>
                </div>
                <span class="setting-desc">${escapeHtml(preset.description)}</span>
            </div>
        `;
        const actions = document.createElement("div");
        actions.className = "provider-actions capability-item-actions";
        const install = document.createElement("button");
        install.className = "provider-btn provider-btn-secondary settings-inline-btn capability-mini-btn";
        install.type = "button";
        install.textContent = "Install";
        install.addEventListener("click", () => {
            upsertSkillRecord({ ...preset, source: "preset", enabled: true });
        });
        const preview = document.createElement("button");
        preview.className = "provider-btn provider-btn-ghost settings-inline-btn capability-mini-btn";
        preview.type = "button";
        preview.textContent = "Preview";
        preview.addEventListener("click", () => {
            const nameInput = getCapabilityElement("skillInstallName");
            const contentInput = getCapabilityElement("skillInstallContent");
            if (nameInput) nameInput.value = preset.name;
            if (contentInput) contentInput.value = preset.content;
            setCapabilitiesStatus(`Loaded ${preset.name} into the installer.`, "info");
        });
        actions.append(install, preview);
        card.appendChild(actions);
        return card;
    }));
}

function renderInstalledSkills() {
    const list = getCapabilityElement("installedSkillList");
    if (!list) return;
    const skills = readInstalledSkills();
    const enabledCount = skills.filter(skill => skill.enabled).length;
    const summary = getCapabilityElement("skillsEnabledSummary");
    if (summary) summary.textContent = `${enabledCount} enabled`;
    const openFolderButton = getCapabilityElement("openSkillsFolderBtn");
    if (openFolderButton) openFolderButton.hidden = !getDesktopSkillsApi()?.openFolder;
    if (!skills.length) {
        list.replaceChildren(renderCapabilityEmpty("No skills installed yet."));
        return;
    }
    list.replaceChildren(...skills.map(skill => {
        const item = document.createElement("article");
        item.className = "settings-control-card capability-item";
        item.innerHTML = `
            <div class="capability-item-main">
                <div class="capability-item-title-row">
                    <span class="setting-title capability-item-title">${escapeHtml(skill.name)}</span>
                    <span class="settings-status-badge capability-pill ${skill.enabled ? "enabled" : "disabled"}" data-state="${skill.enabled ? "configured" : "missing"}">${skill.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <span class="setting-desc capability-item-description">${escapeHtml(skill.description)}</span>
                <span class="capability-item-meta">Use <code>$${escapeHtml(skill.name)}</code> or let Fauna match the description.</span>
            </div>
        `;
        const actions = document.createElement("div");
        actions.className = "provider-actions capability-item-actions";
        const toggle = document.createElement("button");
        toggle.className = "provider-btn provider-btn-secondary settings-inline-btn capability-mini-btn";
        toggle.type = "button";
        toggle.textContent = skill.enabled ? "Disable" : "Enable";
        toggle.addEventListener("click", () => {
            const next = readInstalledSkills().map(item => item.id === skill.id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item);
            writeInstalledSkills(next);
            renderCapabilitiesView();
        });
        const edit = document.createElement("button");
        edit.className = "provider-btn provider-btn-ghost settings-inline-btn capability-mini-btn";
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            const nameInput = getCapabilityElement("skillInstallName");
            const contentInput = getCapabilityElement("skillInstallContent");
            if (nameInput) nameInput.value = skill.name;
            if (contentInput) contentInput.value = skill.content;
            setCapabilitiesStatus(`Loaded ${skill.name} for editing.`, "info");
            setCapabilityTab("skills");
        });
        const remove = document.createElement("button");
        remove.className = "provider-btn provider-btn-danger settings-inline-btn capability-mini-btn danger";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            writeInstalledSkills(readInstalledSkills().filter(item => item.id !== skill.id));
            showToast(`Skill ${skill.name} removed.`, "info");
            renderCapabilitiesView();
        });
        actions.append(toggle, edit, remove);
        item.appendChild(actions);
        return item;
    }));
}

function updateMcpTransportUi() {
    document.querySelectorAll("[data-mcp-transport]").forEach(button => {
        const active = button.dataset.mcpTransport === activeMcpTransport;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    const isStdio = activeMcpTransport === MCP_TRANSPORT_STDIO;
    document.querySelectorAll(".capability-stdio-field").forEach(field => { field.hidden = !isStdio; });
    document.querySelectorAll(".capability-http-field").forEach(field => { field.hidden = isStdio; });
}

function renderMcpServers() {
    const list = getCapabilityElement("mcpServerList");
    if (!list) return;
    const servers = readMcpServers();
    const enabledCount = servers.filter(server => server.enabled).length;
    const summary = getCapabilityElement("mcpEnabledSummary");
    if (summary) summary.textContent = `${enabledCount} enabled`;
    if (!servers.length) {
        list.replaceChildren(renderCapabilityEmpty("No servers configured yet."));
        return;
    }
    list.replaceChildren(...servers.map(server => {
        const item = document.createElement("article");
        item.className = "settings-control-card capability-item";
        const transportLabel = server.transport === MCP_TRANSPORT_STDIO ? "stdio" : server.transport === MCP_TRANSPORT_LEGACY_SSE ? "sse" : "http";
        const toolMarkup = server.tools.length
            ? `<div class="capability-item-tools">${server.tools.slice(0, 8).map(tool => `<span class="settings-status-badge capability-pill">${escapeHtml(tool.name)}</span>`).join("")}${server.tools.length > 8 ? `<span class="settings-status-badge capability-pill">+${server.tools.length - 8}</span>` : ""}</div>`
            : "";
        item.innerHTML = `
            <div class="capability-item-main">
                <div class="capability-item-title-row">
                    <span class="setting-title capability-item-title">${escapeHtml(server.name)}</span>
                    <span class="settings-status-badge capability-pill">${escapeHtml(transportLabel)}</span>
                    <span class="settings-status-badge capability-pill ${server.enabled ? "enabled" : "disabled"}" data-state="${server.enabled ? "configured" : "missing"}">${server.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <span class="setting-desc capability-item-description">${escapeHtml(server.description || "Server")}</span>
                <span class="capability-item-meta">${escapeHtml(server.transport === MCP_TRANSPORT_STDIO ? [server.command, ...server.args].join(" ") : server.url)}</span>
                ${toolMarkup}
            </div>
        `;
        const actions = document.createElement("div");
        actions.className = "provider-actions capability-item-actions";
        const discover = document.createElement("button");
        discover.className = "provider-btn provider-btn-secondary settings-inline-btn capability-mini-btn";
        discover.type = "button";
        discover.textContent = "Discover";
        discover.addEventListener("click", () => {
            void discoverMcpServer(server.id);
        });
        const toggle = document.createElement("button");
        toggle.className = "provider-btn provider-btn-secondary settings-inline-btn capability-mini-btn";
        toggle.type = "button";
        toggle.textContent = server.enabled ? "Disable" : "Enable";
        toggle.addEventListener("click", () => {
            writeMcpServers(readMcpServers().map(item => item.id === server.id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item));
            renderCapabilitiesView();
        });
        const edit = document.createElement("button");
        edit.className = "provider-btn provider-btn-ghost settings-inline-btn capability-mini-btn";
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            fillMcpForm(server);
            setCapabilityTab("mcp");
        });
        const remove = document.createElement("button");
        remove.className = "provider-btn provider-btn-danger settings-inline-btn capability-mini-btn danger";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            writeMcpServers(readMcpServers().filter(item => item.id !== server.id));
            showToast(`Server ${server.name} removed.`, "info");
            renderCapabilitiesView();
        });
        actions.append(discover, toggle, edit, remove);
        item.appendChild(actions);
        return item;
    }));
}

function renderApiConnectors() {
    const list = getCapabilityElement("apiConnectorList");
    if (!list) return;
    const connectors = readApiConnectors();
    const enabledCount = connectors.filter(connector => connector.enabled).length;
    const summary = getCapabilityElement("apisEnabledSummary");
    if (summary) summary.textContent = `${enabledCount} enabled`;
    if (!connectors.length) {
        list.replaceChildren(renderCapabilityEmpty("No api connectors configured yet."));
        return;
    }
    list.replaceChildren(...connectors.map(connector => {
        const item = document.createElement("article");
        item.className = "settings-control-card capability-item";
        item.innerHTML = `
            <div class="capability-item-main">
                <div class="capability-item-title-row">
                    <span class="setting-title capability-item-title">${escapeHtml(connector.name)}</span>
                    <span class="settings-status-badge capability-pill">${escapeHtml(String(connector.method || "").toLowerCase())}</span>
                    <span class="settings-status-badge capability-pill ${connector.enabled ? "enabled" : "disabled"}" data-state="${connector.enabled ? "configured" : "missing"}">${connector.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <span class="setting-desc capability-item-description">${escapeHtml(connector.description)}</span>
                <span class="capability-item-meta">${escapeHtml(`${connector.baseUrl}${connector.path || ""}`)}</span>
            </div>
        `;
        const actions = document.createElement("div");
        actions.className = "provider-actions capability-item-actions";
        const toggle = document.createElement("button");
        toggle.className = "provider-btn provider-btn-secondary settings-inline-btn capability-mini-btn";
        toggle.type = "button";
        toggle.textContent = connector.enabled ? "Disable" : "Enable";
        toggle.addEventListener("click", () => {
            writeApiConnectors(readApiConnectors().map(item => item.id === connector.id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item));
            renderCapabilitiesView();
        });
        const edit = document.createElement("button");
        edit.className = "provider-btn provider-btn-ghost settings-inline-btn capability-mini-btn";
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            fillApiForm(connector);
            setCapabilityTab("apis");
        });
        const remove = document.createElement("button");
        remove.className = "provider-btn provider-btn-danger settings-inline-btn capability-mini-btn danger";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            writeApiConnectors(readApiConnectors().filter(item => item.id !== connector.id));
            showToast(`Api connector ${connector.name} removed.`, "info");
            renderCapabilitiesView();
        });
        actions.append(toggle, edit, remove);
        item.appendChild(actions);
        return item;
    }));
}

function updateCapabilitiesStats() {
    const skills = readInstalledSkills();
    const mcps = readMcpServers();
    const apis = readApiConnectors();
    const skillCount = getCapabilityElement("capabilitiesSkillCount");
    const mcpCount = getCapabilityElement("capabilitiesMcpCount");
    const apiCount = getCapabilityElement("capabilitiesApiCount");
    if (skillCount) skillCount.textContent = String(skills.length);
    if (mcpCount) mcpCount.textContent = String(mcps.length);
    if (apiCount) apiCount.textContent = String(apis.length);
}

function renderCapabilitiesView() {
    if (!capabilitiesView) return;
    updateCapabilitiesStats();
    renderSkillPresets();
    renderInstalledSkills();
    updateMcpTransportUi();
    renderMcpServers();
    renderApiConnectors();
    if (typeof scheduleAnimatedSegmentIndicators === "function") {
        scheduleAnimatedSegmentIndicators();
    }
}

function clearSkillDraft() {
    const nameInput = getCapabilityElement("skillInstallName");
    const contentInput = getCapabilityElement("skillInstallContent");
    if (nameInput) nameInput.value = "";
    if (contentInput) contentInput.value = "";
}

async function openDesktopSkillsFolder() {
    const api = getDesktopSkillsApi();
    if (!api?.openFolder) {
        setCapabilitiesStatus("Skills are stored in browser storage on web.", "info");
        return;
    }
    try {
        const result = await api.openFolder();
        if (!result?.ok) throw new Error(result?.error || "Could not open skills folder.");
        setCapabilitiesStatus("Opened skills folder.", "success");
    } catch (err) {
        setCapabilitiesStatus(err.message, "error");
        showToast(err.message, "error");
    }
}

function fillMcpForm(server) {
    activeMcpTransport = normalizeMcpTransport(server.transport);
    updateMcpTransportUi();
    const pairs = [
        ["mcpNameInput", server.name],
        ["mcpCommandInput", server.command],
        ["mcpArgsInput", (server.args || []).join(" ")],
        ["mcpUrlInput", server.url],
        ["mcpCwdInput", server.cwd || "."],
        ["mcpEnvInput", JSON.stringify(server.env || {}, null, 2)],
        ["mcpHeadersInput", JSON.stringify(server.headers || {}, null, 2)]
    ];
    pairs.forEach(([id, value]) => {
        const element = getCapabilityElement(id);
        if (element) element.value = value || "";
    });
    setCapabilitiesStatus(`Loaded ${server.name} for editing.`, "info");
}

function clearMcpForm() {
    ["mcpNameInput", "mcpCommandInput", "mcpArgsInput", "mcpUrlInput", "mcpCwdInput", "mcpEnvInput", "mcpHeadersInput"].forEach(id => {
        const element = getCapabilityElement(id);
        if (element) element.value = id === "mcpCwdInput" ? "." : "";
    });
}

function fillApiForm(connector) {
    activeApiMethod = normalizeApiMethod(connector.method);
    updateApiMethodUi();
    const pairs = [
        ["apiNameInput", connector.name],
        ["apiDescriptionInput", connector.description],
        ["apiBaseUrlInput", connector.baseUrl],
        ["apiPathInput", connector.path || "/"],
        ["apiHeadersInput", JSON.stringify(connector.headers || {}, null, 2)]
    ];
    pairs.forEach(([id, value]) => {
        const element = getCapabilityElement(id);
        if (element) element.value = value || "";
    });
    const localToggle = getCapabilityElement("apiLocalNetworkToggle");
    if (localToggle) localToggle.checked = Boolean(connector.allowLocalNetwork);
    setCapabilitiesStatus(`Loaded ${connector.name} for editing.`, "info");
}

function clearApiDraft() {
    ["apiNameInput", "apiDescriptionInput", "apiBaseUrlInput", "apiPathInput", "apiHeadersInput"].forEach(id => {
        const element = getCapabilityElement(id);
        if (element) element.value = id === "apiPathInput" ? "/" : "";
    });
    const localToggle = getCapabilityElement("apiLocalNetworkToggle");
    if (localToggle) localToggle.checked = false;
}

function updateApiMethodUi() {
    document.querySelectorAll("[data-api-method]").forEach(button => {
        const active = button.dataset.apiMethod === activeApiMethod;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function installSkillFromForm() {
    const nameInput = getCapabilityElement("skillInstallName");
    const contentInput = getCapabilityElement("skillInstallContent");
    const content = String(contentInput?.value || "").trim();
    if (!content) {
        setCapabilitiesStatus("Paste a skill file before installing.", "warning");
        return;
    }
    try {
        const metadata = parseSkillFrontmatter(content);
        const skill = upsertSkillRecord({
            name: nameInput?.value || metadata.name || "",
            description: metadata.description || inferSkillDescription(content),
            content,
            source: "manual",
            enabled: true
        });
        setCapabilitiesStatus(`Installed skill ${skill.name}.`, "success");
    } catch (err) {
        setCapabilitiesStatus(err.message, "error");
        showToast(err.message, "error");
    }
}

function saveMcpServerFromForm() {
    try {
        const server = upsertMcpServerRecord({
            name: getCapabilityElement("mcpNameInput")?.value,
            transport: activeMcpTransport,
            command: getCapabilityElement("mcpCommandInput")?.value,
            args: getCapabilityElement("mcpArgsInput")?.value,
            url: getCapabilityElement("mcpUrlInput")?.value,
            cwd: getCapabilityElement("mcpCwdInput")?.value || ".",
            env: parseCapabilityJsonObject(getCapabilityElement("mcpEnvInput")?.value, "Environment json"),
            headers: parseCapabilityJsonObject(getCapabilityElement("mcpHeadersInput")?.value, "Headers json"),
            enabled: true
        });
        setCapabilitiesStatus(`Saved server ${server.name}.`, "success");
    } catch (err) {
        setCapabilitiesStatus(err.message, "error");
        showToast(err.message, "error");
    }
}

function saveApiConnectorFromForm() {
    try {
        const connector = upsertApiConnectorRecord({
            name: getCapabilityElement("apiNameInput")?.value,
            description: getCapabilityElement("apiDescriptionInput")?.value,
            baseUrl: getCapabilityElement("apiBaseUrlInput")?.value,
            method: activeApiMethod,
            path: getCapabilityElement("apiPathInput")?.value || "/",
            headers: parseCapabilityJsonObject(getCapabilityElement("apiHeadersInput")?.value, "Headers json"),
            allowLocalNetwork: Boolean(getCapabilityElement("apiLocalNetworkToggle")?.checked),
            enabled: true
        });
        setCapabilitiesStatus(`Saved api connector ${connector.name}.`, "success");
    } catch (err) {
        setCapabilitiesStatus(err.message, "error");
        showToast(err.message, "error");
    }
}

function normalizeImportedMcpServer(name, server = {}) {
    const headers = server.http_headers || server.httpHeaders || server.headers || {};
    return normalizeMcpServerRecord({
        name,
        description: server.description || "",
        transport: server.transport || (server.url ? MCP_TRANSPORT_STREAMABLE_HTTP : MCP_TRANSPORT_STDIO),
        command: server.command || "",
        args: server.args || [],
        url: server.url || "",
        cwd: server.cwd || ".",
        env: server.env || {},
        headers,
        enabled: server.enabled !== false
    });
}

function importMcpServersFromJson(parsed) {
    const servers = parsed.mcpServers || parsed.mcp_servers || parsed.servers || {};
    if (!servers || typeof servers !== "object" || Array.isArray(servers)) return 0;
    let count = 0;
    Object.entries(servers).forEach(([name, server]) => {
        const normalized = normalizeImportedMcpServer(name, server || {});
        if (!normalized) return;
        upsertMcpServerRecord(normalized, { notify: false });
        count += 1;
    });
    return count;
}

function importApiConnectorsFromJson(parsed) {
    const connectors = parsed.apiConnectors || parsed.api_connectors || parsed.apis || parsed.api || {};
    if (!connectors || typeof connectors !== "object") return 0;
    const entries = Array.isArray(connectors)
        ? connectors.map(connector => [connector?.name || connector?.id || "api", connector])
        : Object.entries(connectors);
    let count = 0;
    entries.forEach(([name, connector]) => {
        if (!connector || typeof connector !== "object") return;
        const normalized = normalizeApiConnectorRecord({
            ...connector,
            name: connector.name || name,
            baseUrl: connector.baseUrl || connector.base_url || connector.url,
            allowLocalNetwork: connector.allowLocalNetwork || connector.allow_local_network || connector.local
        });
        if (!normalized) return;
        upsertApiConnectorRecord(normalized, { notify: false });
        count += 1;
    });
    return count;
}

function parseTomlValue(rawValue = "") {
    const value = String(rawValue || "").trim().replace(/,$/, "");
    if (/^".*"$|^'.*'$/.test(value)) return value.slice(1, -1);
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^\[.*\]$/.test(value)) {
        try {
            return JSON.parse(value.replace(/'/g, '"'));
        } catch {
            return splitCapabilityCommandLine(value.slice(1, -1).replace(/,/g, " "));
        }
    }
    if (/^\{.*\}$/.test(value)) {
        try {
            return JSON.parse(value.replace(/([A-Za-z0-9_.-]+)\s*=/g, '"$1":').replace(/'/g, '"'));
        } catch {
            return {};
        }
    }
    return value;
}

function importMcpServersFromToml(text = "") {
    const servers = {};
    let currentName = "";
    String(text || "").split(/\r?\n/).forEach(line => {
        const trimmed = line.replace(/#.*/, "").trim();
        if (!trimmed) return;
        const sectionMatch = trimmed.match(/^\[mcp_servers\.([^\]]+)\]$/i);
        if (sectionMatch) {
            currentName = sectionMatch[1].replace(/^["']|["']$/g, "").trim();
            servers[currentName] = servers[currentName] || {};
            return;
        }
        if (!currentName) return;
        const kv = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
        if (!kv) return;
        const key = kv[1];
        const value = parseTomlValue(kv[2]);
        if (key === "http_headers") servers[currentName].headers = value;
        else servers[currentName][key] = value;
    });
    let count = 0;
    Object.entries(servers).forEach(([name, server]) => {
        const normalized = normalizeImportedMcpServer(name, server);
        if (!normalized) return;
        upsertMcpServerRecord(normalized, { notify: false });
        count += 1;
    });
    return count;
}

function importMcpServerFromCodexCommand(text = "") {
    const tokens = splitCapabilityCommandLine(text);
    const addIndex = tokens.findIndex((token, index) => token === "add" && tokens[index - 1] === "mcp");
    if (addIndex < 0) return 0;
    const name = tokens[addIndex + 1];
    if (!name) return 0;
    const separatorIndex = tokens.indexOf("--", addIndex + 2);
    const beforeCommand = separatorIndex >= 0 ? tokens.slice(addIndex + 2, separatorIndex) : tokens.slice(addIndex + 2);
    const commandTokens = separatorIndex >= 0 ? tokens.slice(separatorIndex + 1) : [];
    const env = {};
    for (let index = 0; index < beforeCommand.length; index += 1) {
        if (beforeCommand[index] === "--env" || beforeCommand[index] === "-e") {
            const pair = beforeCommand[index + 1] || "";
            const eqIndex = pair.indexOf("=");
            if (eqIndex > 0) env[pair.slice(0, eqIndex)] = pair.slice(eqIndex + 1);
            index += 1;
        }
    }
    if (!commandTokens.length) return 0;
    upsertMcpServerRecord({
        name,
        transport: MCP_TRANSPORT_STDIO,
        command: commandTokens[0],
        args: commandTokens.slice(1),
        env,
        cwd: ".",
        enabled: true
    }, { notify: false });
    return 1;
}

function importCapabilitiesFromText() {
    const textElement = getCapabilityElement("capabilityImportText");
    const text = String(textElement?.value || "").trim();
    if (!text) {
        setCapabilitiesStatus("Paste a configuration before importing.", "warning");
        return;
    }
    try {
        let imported = 0;
        if (text.startsWith("{")) {
            const parsed = JSON.parse(text);
            imported += importMcpServersFromJson(parsed);
            imported += importApiConnectorsFromJson(parsed);
        }
        if (!imported && /\[mcp_servers\./i.test(text)) {
            imported += importMcpServersFromToml(text);
        }
        if (!imported && /\bcodex\s+mcp\s+add\b/i.test(text)) {
            imported += importMcpServerFromCodexCommand(text);
        }
        if (!imported && (/^---\s*\n/.test(text) || /^#\s+/m.test(text))) {
            upsertSkillRecord({ content: text, source: "import", enabled: true }, { notify: false });
            imported += 1;
        }
        if (!imported) throw new Error("No supported server or skill configuration was found.");
        setCapabilitiesStatus(`Imported ${imported} ${imported === 1 ? "capability" : "capabilities"}.`, "success");
        showToast("Capabilities imported.", "success");
        renderCapabilitiesView();
    } catch (err) {
        setCapabilitiesStatus(err.message, "error");
        showToast(err.message, "error");
    }
}

function getBridgeSafeMcpServer(server) {
    return {
        name: server.name,
        transport: server.transport,
        command: server.command,
        args: server.args || [],
        url: server.url,
        cwd: server.cwd || ".",
        env: server.env || {},
        headers: server.headers || {}
    };
}

async function parseMcpJsonRpcResponse(response, requestId) {
    const contentType = response.headers.get("Content-Type") || "";
    const text = await response.text();
    if (contentType.includes("text/event-stream")) {
        const events = text.split(/\r?\n\r?\n/);
        for (const event of events) {
            const data = event.split(/\r?\n/)
                .filter(line => line.startsWith("data:"))
                .map(line => line.slice(5).trim())
                .join("\n")
                .trim();
            if (!data) continue;
            const parsed = JSON.parse(data);
            if (parsed?.id === requestId || requestId === null) return parsed;
        }
        throw new Error("Server sse response did not include the requested json-rpc result.");
    }
    const parsed = JSON.parse(text || "{}");
    if (Array.isArray(parsed)) return parsed.find(item => item?.id === requestId) || parsed[0] || {};
    return parsed;
}

async function directMcpJsonRpc(server, method, params = {}, signal = null, sessionId = "") {
    const requestId = Date.now();
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-11-25",
        ...(server.headers || {})
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;
    const response = await fetch(server.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
        signal
    });
    if (!response.ok) throw new Error(`Server http request failed with ${response.status}.`);
    return {
        response: await parseMcpJsonRpcResponse(response, requestId),
        sessionId: response.headers.get("Mcp-Session-Id") || sessionId
    };
}

async function directMcpSessionCall(server, method, params = {}, signal = null) {
    const initialized = await directMcpJsonRpc(server, "initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "Fauna", version: FAUNA_APP_VERSION }
    }, signal);
    try {
        await fetch(server.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "MCP-Protocol-Version": "2025-11-25",
                ...(initialized.sessionId ? { "Mcp-Session-Id": initialized.sessionId } : {}),
                ...(server.headers || {})
            },
            body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }),
            signal
        });
    } catch {
        // Some stateless servers do not require the initialized notification.
    }
    return directMcpJsonRpc(server, method, params, signal, initialized.sessionId);
}

async function discoverMcpServer(serverIdOrName) {
    const server = findMcpServer(serverIdOrName);
    if (!server) {
        setCapabilitiesStatus("Server not found.", "error");
        return null;
    }
    setCapabilitiesStatus(`Discovering ${server.name}...`, "info");
    try {
        let result;
        if (hasWorkspaceBridgeAccess()) {
            result = await requestWorkspaceBridge(MCP_DISCOVER_BRIDGE_PATH, {
                method: "POST",
                body: {
                    server: getBridgeSafeMcpServer(server),
                    scope: getWorkspaceToolBridgeOptions().scope || ""
                }
            });
        } else if (server.transport !== MCP_TRANSPORT_STDIO && server.url) {
            const direct = await directMcpSessionCall(server, "tools/list", {});
            result = { ok: true, ...(direct.response.result || {}) };
        } else {
            throw new Error("stdio discovery needs the local workspace bridge.");
        }
        const tools = Array.isArray(result.tools) ? result.tools.map(normalizeMcpToolRecord).filter(Boolean) : [];
        const instructions = String(result.instructions || result.serverInfo?.instructions || "").trim();
        writeMcpServers(readMcpServers().map(item => item.id === server.id ? {
            ...item,
            tools,
            instructions,
            discoveredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } : item));
        setCapabilitiesStatus(`Discovered ${tools.length} ${tools.length === 1 ? "tool" : "tools"} for ${server.name}.`, "success");
        showToast(`Discovered ${server.name}.`, "success");
        renderCapabilitiesView();
        return tools;
    } catch (err) {
        setCapabilitiesStatus(`Discovery failed: ${err.message}`, "error");
        showToast(`Server discovery failed: ${err.message}`, "error");
        return null;
    }
}

async function discoverAllMcpServers() {
    const servers = readMcpServers();
    if (!servers.length) {
        setCapabilitiesStatus("Add a server first.", "warning");
        return;
    }
    for (const server of servers) {
        await discoverMcpServer(server.id);
    }
}

function buildApiUrl(connector, path = "", query = null) {
    const base = String(connector.baseUrl || "").replace(/\/+$/, "");
    const rawPath = String(path || connector.path || "/").trim();
    const joinedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const url = new URL(`${base}${joinedPath}`);
    if (query && typeof query === "object" && !Array.isArray(query)) {
        Object.entries(query).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (Array.isArray(value)) {
                value.forEach(item => url.searchParams.append(key, String(item)));
            } else {
                url.searchParams.set(key, String(value));
            }
        });
    }
    return url.toString();
}

async function directApiConnectorCall(connector, toolCall, signal = null) {
    const method = normalizeApiMethod(toolCall.method || connector.method);
    const headers = {
        ...(connector.headers || {}),
        ...(toolCall.headers && typeof toolCall.headers === "object" && !Array.isArray(toolCall.headers) ? toolCall.headers : {})
    };
    const hasBody = !["GET", "DELETE"].includes(method) && toolCall.body !== undefined;
    if (hasBody && !Object.keys(headers).some(key => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
    }
    const response = await fetch(buildApiUrl(connector, toolCall.path, toolCall.query), {
        method,
        headers,
        body: hasBody ? (typeof toolCall.body === "string" ? toolCall.body : JSON.stringify(toolCall.body)) : undefined,
        signal
    });
    const text = await response.text();
    return {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("Content-Type") || "",
        body: text.slice(0, CAPABILITY_API_BODY_MAX_CHARS),
        truncated: text.length > CAPABILITY_API_BODY_MAX_CHARS
    };
}

function formatCapabilityJson(value, maxLength = CAPABILITY_TOOL_RESULT_MAX_CHARS) {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return trimLocalToolText(text, maxLength);
}

async function executeSkillCapabilityToolCall(toolCall) {
    const skillName = toolCall.name || toolCall.skill || toolCall.skillName || toolCall.id;
    const skill = findInstalledSkill(skillName);
    if (!skill) throw new Error(`Skill not found: ${skillName || "(missing name)"}`);
    if (!skill.enabled) throw new Error(`Skill ${skill.name} is disabled.`);
    return {
        text: [
            `Skill loaded: ${skill.name}`,
            skill.description ? `Description: ${skill.description}` : "",
            "",
            "--- Skill file ---",
            skill.content,
            "--- End skill file ---",
            "",
            "Follow these instructions for the user's current request, then continue with the next useful tool call or answer normally."
        ].filter(Boolean).join("\n")
    };
}

async function executeInstallSkillCapabilityToolCall(toolCall) {
    const providedContent = String(toolCall.content || toolCall.markdown || toolCall.skill || "").trim();
    const name = normalizeCapabilityName(toolCall.name || toolCall.skillName || "custom-skill", "custom-skill");
    const description = truncateCapabilityText(toolCall.description || toolCall.summary || "Reusable assistant instructions.");
    const body = String(toolCall.instructions || toolCall.body || toolCall.workflow || "").trim();
    const content = providedContent || [
        "---",
        `name: ${name}`,
        `description: ${description}`,
        "---",
        body || "Use this skill when the request matches the description. Follow the user's constraints, keep work scoped, and verify important results."
    ].join("\n");
    const skill = upsertSkillRecord({
        name,
        description,
        content,
        source: "chat",
        enabled: true
    });
    return {
        text: [
            `Skill installed: ${skill.name}`,
            `Description: ${skill.description}`,
            "It is now available from Capabilities > Skills and can be triggered by name or description."
        ].join("\n")
    };
}

async function executeSaveServerCapabilityToolCall(toolCall) {
    const server = upsertMcpServerRecord({
        name: toolCall.server || toolCall.serverName || toolCall.name,
        description: toolCall.description || "",
        transport: toolCall.transport || (toolCall.url ? MCP_TRANSPORT_STREAMABLE_HTTP : MCP_TRANSPORT_STDIO),
        command: toolCall.command || toolCall.cmd || "",
        args: toolCall.args || toolCall.commandArgs || toolCall.command_args || [],
        url: toolCall.url || toolCall.endpoint || "",
        cwd: toolCall.cwd || toolCall.workingDirectory || ".",
        env: toolCall.env || toolCall.environment || {},
        headers: toolCall.headers || {},
        enabled: toolCall.enabled !== false
    });
    return {
        text: [
            `Server saved: ${server.name}`,
            `Transport: ${server.transport}`,
            "Run tool discovery before calling server tools."
        ].join("\n")
    };
}

async function executeSaveApiConnectorCapabilityToolCall(toolCall) {
    const connector = upsertApiConnectorRecord({
        name: toolCall.api || toolCall.connector || toolCall.name,
        description: toolCall.description || "",
        baseUrl: toolCall.baseUrl || toolCall.base_url || toolCall.url,
        method: toolCall.method || "GET",
        path: toolCall.path || "/",
        headers: toolCall.headers || {},
        allowLocalNetwork: Boolean(toolCall.allowLocalNetwork || toolCall.allow_local_network || toolCall.local),
        enabled: toolCall.enabled !== false
    });
    return {
        text: [
            `Api connector saved: ${connector.name}`,
            `Default call: ${connector.method.toLowerCase()} ${connector.baseUrl}${connector.path || ""}`,
            "Use api_call when this connector directly helps the user request."
        ].join("\n")
    };
}

async function executeMcpCapabilityToolCall(toolCall, signal = null) {
    const serverName = toolCall.server || toolCall.serverName || toolCall.mcp || toolCall.name;
    const toolName = toolCall.toolName || toolCall.mcpTool || toolCall.function || toolCall.action;
    if (!serverName) throw new Error("mcp_call requires a server name.");
    if (!toolName) throw new Error("mcp_call requires a toolName.");
    const server = findMcpServer(serverName);
    if (!server) throw new Error(`Server not found: ${serverName}`);
    if (!server.enabled) throw new Error(`Server ${server.name} is disabled.`);
    const args = toolCall.arguments && typeof toolCall.arguments === "object" && !Array.isArray(toolCall.arguments)
        ? toolCall.arguments
        : toolCall.input && typeof toolCall.input === "object" && !Array.isArray(toolCall.input)
            ? toolCall.input
            : {};
    let result;
    if (hasWorkspaceBridgeAccess()) {
        result = await requestWorkspaceBridge(MCP_CALL_BRIDGE_PATH, {
            method: "POST",
            signal,
            body: {
                server: getBridgeSafeMcpServer(server),
                tool: toolName,
                arguments: args,
                scope: getWorkspaceToolBridgeOptions(signal).scope || ""
            }
        });
    } else if (server.transport !== MCP_TRANSPORT_STDIO && server.url) {
        const direct = await directMcpSessionCall(server, "tools/call", { name: toolName, arguments: args }, signal);
        result = { ok: true, result: direct.response.result };
    } else {
        throw new Error("stdio calls need the local workspace bridge.");
    }
    return {
        text: [
            `Server result from ${server.name}.${toolName}`,
            formatCapabilityJson(result.result || result.content || result, CAPABILITY_TOOL_RESULT_MAX_CHARS)
        ].join("\n")
    };
}

async function executeApiCapabilityToolCall(toolCall, signal = null) {
    const apiName = toolCall.api || toolCall.connector || toolCall.name;
    if (!apiName) throw new Error("api_call requires an api connector name.");
    const connector = findApiConnector(apiName);
    if (!connector) throw new Error(`Api connector not found: ${apiName}`);
    if (!connector.enabled) throw new Error(`Api connector ${connector.name} is disabled.`);
    let result;
    if (hasWorkspaceBridgeAccess()) {
        result = await requestWorkspaceBridge(API_CALL_BRIDGE_PATH, {
            method: "POST",
            signal,
            body: {
                connector,
                path: toolCall.path || connector.path,
                method: toolCall.method || connector.method,
                query: toolCall.query || {},
                body: toolCall.body,
                headers: toolCall.headers || {}
            }
        });
    } else if (!connector.allowLocalNetwork) {
        result = await directApiConnectorCall(connector, toolCall, signal);
    } else {
        throw new Error("Local or private-network api calls need the local workspace bridge.");
    }
    return {
        text: [
            `Api result from ${connector.name}`,
            `Status: ${result.status || result.statusCode || "ok"}`,
            result.contentType ? `Content-Type: ${result.contentType}` : "",
            result.truncated ? "Body was truncated." : "",
            "",
            typeof result.body === "string" ? trimLocalToolText(result.body, CAPABILITY_TOOL_RESULT_MAX_CHARS) : formatCapabilityJson(result.body || result, CAPABILITY_TOOL_RESULT_MAX_CHARS)
        ].filter(Boolean).join("\n")
    };
}

function isCapabilityToolName(toolName) {
    return CAPABILITY_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

async function executeCapabilityToolCall(toolCall, signal = null) {
    const tool = normalizeFaunaToolName(toolCall?.tool || toolCall?.name);
    if (tool === "use_skill") return executeSkillCapabilityToolCall(toolCall);
    if (tool === "install_skill") return executeInstallSkillCapabilityToolCall(toolCall);
    if (tool === "save_server") return executeSaveServerCapabilityToolCall(toolCall);
    if (tool === "save_api_connector") return executeSaveApiConnectorCapabilityToolCall(toolCall);
    if (tool === "mcp_call") return executeMcpCapabilityToolCall(toolCall, signal);
    if (tool === "api_call") return executeApiCapabilityToolCall(toolCall, signal);
    throw new Error("Unknown capability tool.");
}

function getCapabilitiesNativeToolDefinitions() {
    const tools = [
        {
            name: "install_skill",
            description: "Create or update an installed skill from a complete skill file or concise skill instructions.",
            parameters: createFaunaToolParameterSchema({
                name: { type: "string", description: "Skill name in lowercase hyphen-case." },
                description: { type: "string", description: "When this skill should be used." },
                content: { type: "string", description: "Complete skill file content with frontmatter. Optional if instructions are provided." },
                instructions: { type: "string", description: "Skill body instructions when content is not supplied." }
            }, ["name", "description"])
        },
        {
            name: "save_server",
            description: "Save a model context server configuration for later tool discovery and calls.",
            parameters: createFaunaToolParameterSchema({
                name: { type: "string", description: "Server name." },
                description: { type: "string", description: "What this server is useful for." },
                transport: { type: "string", description: "stdio, streamable_http, or legacy_sse." },
                command: { type: "string", description: "stdio command, such as npx or python." },
                args: { type: "array", items: { type: "string" }, description: "stdio command arguments." },
                url: { type: "string", description: "Server endpoint for http or sse transports." },
                cwd: { type: "string", description: "Working directory for stdio servers." },
                env: { type: "object", description: "Environment variables." },
                headers: { type: "object", description: "Request headers for http or sse servers." }
            }, ["name", "transport"])
        },
        {
            name: "save_api_connector",
            description: "Save a focused http api connector for later api_call tool use.",
            parameters: createFaunaToolParameterSchema({
                name: { type: "string", description: "Connector name." },
                description: { type: "string", description: "What this connector is useful for." },
                baseUrl: { type: "string", description: "Base url for the api." },
                method: { type: "string", description: "Default http method." },
                path: { type: "string", description: "Default path." },
                headers: { type: "object", description: "Default request headers." },
                allowLocalNetwork: { type: "boolean", description: "True for localhost or private-network targets." }
            }, ["name", "baseUrl"])
        }
    ];
    if (getEnabledSkills().length > 0) {
        tools.push({
            name: "use_skill",
            description: "Load the full instructions for an installed skill by name before applying it.",
            parameters: createFaunaToolParameterSchema({
                name: { type: "string", description: "Installed skill name, such as repo-review." },
                reason: { type: "string", description: "Short reason this skill is relevant." }
            }, ["name"])
        });
    }
    if (getEnabledMcpServers().length > 0) {
        tools.push({
            name: "mcp_call",
            description: "Call a tool exposed by an enabled server.",
            parameters: createFaunaToolParameterSchema({
                server: { type: "string", description: "Configured server name." },
                toolName: { type: "string", description: "Server tool name to call." },
                arguments: { type: "object", description: "json arguments for the server tool." }
            }, ["server", "toolName"])
        });
    }
    if (getEnabledApiConnectors().length > 0) {
        tools.push({
            name: "api_call",
            description: "Call an enabled api connector with optional path, query, headers, and body.",
            parameters: createFaunaToolParameterSchema({
                api: { type: "string", description: "Configured api connector name." },
                path: { type: "string", description: "Optional path relative to the connector base url." },
                method: { type: "string", description: "http method: get, post, put, patch, or delete." },
                query: { type: "object", description: "Query string parameters." },
                headers: { type: "object", description: "Additional per-call headers." },
                body: { description: "json or text body for methods that support a request body." }
            }, ["api"])
        });
    }
    return tools;
}

function buildCapabilitiesSystemPrompt() {
    const skills = getEnabledSkills();
    const servers = getEnabledMcpServers();
    const apis = getEnabledApiConnectors();
    if (!skills.length && !servers.length && !apis.length) return "";

    const parts = [
        "Fauna capabilities are enabled. Use installed skills, model context servers, and api connectors only when they directly help the user's request. Request them with hidden Fauna tool calls and no normal prose until the tool result is returned. If the user asks to create a reusable skill, call install_skill with the finished skill. If the user asks to connect a server or api and provides enough details, call save_server or save_api_connector."
    ];

    if (skills.length) {
        parts.push([
            "Skills use progressive disclosure like Codex and Claude. The list below is only metadata. If the user explicitly mentions a skill with $name or the request matches a description, call use_skill first, then follow the returned skill file.",
            ...skills.map(skill => `- ${skill.name}: ${skill.description}`)
        ].join("\n"));
    }

    if (servers.length) {
        parts.push([
            "Model context servers expose external tools through Fauna. Prefer discovered tool names. Call one server tool at a time with <fauna_tool_call>{\"tool\":\"mcp_call\",\"server\":\"server-name\",\"toolName\":\"tool-name\",\"arguments\":{}}</fauna_tool_call>.",
            ...servers.map(server => {
                const tools = server.tools.length
                    ? server.tools.map(tool => `${tool.name}${tool.description ? ` (${tool.description})` : ""}`).join(", ")
                    : "No tools discovered yet";
                return `- ${server.name} [${server.transport}]: ${tools}`;
            })
        ].join("\n"));
    }

    if (apis.length) {
        parts.push([
            "Api connectors are focused http capabilities. Use <fauna_tool_call>{\"tool\":\"api_call\",\"api\":\"connector-name\",\"path\":\"/path\",\"method\":\"get\",\"query\":{},\"body\":{}}</fauna_tool_call> and answer from the returned status/body.",
            ...apis.map(api => `- ${api.name} [${String(api.method || "").toLowerCase()} ${api.path || "/"}]: ${api.description}`)
        ].join("\n"));
    }

    return parts.join("\n\n");
}

function initializeCapabilitiesView() {
    ensureBasicSkillsSeeded();
    document.querySelectorAll("[data-capability-tab]").forEach(button => {
        button.addEventListener("click", () => setCapabilityTab(button.dataset.capabilityTab));
    });
    document.querySelectorAll("[data-mcp-transport]").forEach(button => {
        button.addEventListener("click", () => {
            activeMcpTransport = normalizeMcpTransport(button.dataset.mcpTransport);
            updateMcpTransportUi();
        });
    });
    document.querySelectorAll("[data-api-method]").forEach(button => {
        button.addEventListener("click", () => {
            activeApiMethod = normalizeApiMethod(button.dataset.apiMethod);
            updateApiMethodUi();
        });
    });
    getCapabilityElement("installSkillBtn")?.addEventListener("click", installSkillFromForm);
    getCapabilityElement("clearSkillDraftBtn")?.addEventListener("click", clearSkillDraft);
    getCapabilityElement("openSkillsFolderBtn")?.addEventListener("click", () => {
        void openDesktopSkillsFolder();
    });
    getCapabilityElement("mcpAddBtn")?.addEventListener("click", saveMcpServerFromForm);
    getCapabilityElement("mcpDiscoverAllBtn")?.addEventListener("click", () => void discoverAllMcpServers());
    getCapabilityElement("apiAddBtn")?.addEventListener("click", saveApiConnectorFromForm);
    getCapabilityElement("clearApiDraftBtn")?.addEventListener("click", clearApiDraft);
    getCapabilityElement("capabilityImportBtn")?.addEventListener("click", importCapabilitiesFromText);
    getCapabilityElement("capabilityImportClearBtn")?.addEventListener("click", () => {
        const text = getCapabilityElement("capabilityImportText");
        if (text) text.value = "";
    });
    updateMcpTransportUi();
    updateApiMethodUi();
    renderCapabilitiesView();
}

initializeCapabilitiesView();
