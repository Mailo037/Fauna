const TOKEN_KEY = "faunaRemoteToken";
const DEVICE_ID_KEY = "faunaRemoteDeviceId";
const DEVICE_NAME_KEY = "faunaRemoteDeviceName";
const DEVICE_PLATFORM_KEY = "faunaRemoteDevicePlatform";
const POLL_MS = 2600;
const AUTO_INSTALL_SETTING_KEY = "faunaAutoInstallUpdates";

const state = {
    token: "",
    chats: [],
    activeChatId: "",
    activeChat: null,
    polling: 0,
    sending: false,
    settings: [],
    update: null,
    savingSettingKey: "",
    deviceId: "",
    deviceName: "",
    devicePlatform: "mobile",
    composerLoaded: false
};

const loadingView = document.getElementById("loadingView");
const loadingStatus = document.getElementById("loadingStatus");
const pairingView = document.getElementById("pairingView");
const appView = document.getElementById("appView");
const tokenInput = document.getElementById("tokenInput");
const saveTokenButton = document.getElementById("saveTokenButton");
const pairingStatus = document.getElementById("pairingStatus");
const connectionStatus = document.getElementById("connectionStatus");
const settingsButton = document.getElementById("settingsButton");
const refreshButton = document.getElementById("refreshButton");
const disconnectButton = document.getElementById("disconnectButton");
const chatList = document.getElementById("chatList");
const newChatButton = document.getElementById("newChatButton");
const activeChatTitle = document.getElementById("activeChatTitle");
const activeChatMeta = document.getElementById("activeChatMeta");
const pinButton = document.getElementById("pinButton");
const messageList = document.getElementById("messageList");
const desktopComposerMount = document.getElementById("desktopComposerMount");
const settingsPanel = document.getElementById("settingsPanel");
const settingsStatus = document.getElementById("settingsStatus");
const updateVersionLabel = document.getElementById("updateVersionLabel");
const updateStatusBadge = document.getElementById("updateStatusBadge");
const updateStatusText = document.getElementById("updateStatusText");
const autoInstallMount = document.getElementById("autoInstallMount");
const checkUpdateButton = document.getElementById("checkUpdateButton");
const installUpdateButton = document.getElementById("installUpdateButton");
const remoteSettingsList = document.getElementById("remoteSettingsList");
let messageInput = null;
let sendButton = null;

function getHashParams() {
    const raw = window.location.hash.replace(/^#/, "");
    return raw ? new URLSearchParams(raw) : new URLSearchParams();
}

function tokenFromHash() {
    return getHashParams().get("token") || "";
}

function createDeviceId() {
    return `phone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDeviceLabel(value, fallback = "Fauna Phone") {
    return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
}

function loadDeviceIdentity() {
    const params = getHashParams();
    const hashDeviceId = params.get("deviceId") || params.get("id") || "";
    const hashName = params.get("deviceName") || params.get("name") || "";
    const hashPlatform = params.get("platform") || "";
    state.deviceId = normalizeDeviceLabel(hashDeviceId || localStorage.getItem(DEVICE_ID_KEY), createDeviceId());
    state.deviceName = normalizeDeviceLabel(hashName || localStorage.getItem(DEVICE_NAME_KEY), "Fauna Phone");
    state.devicePlatform = normalizeDeviceLabel(hashPlatform || localStorage.getItem(DEVICE_PLATFORM_KEY), "mobile").toLowerCase();
    localStorage.setItem(DEVICE_ID_KEY, state.deviceId);
    localStorage.setItem(DEVICE_NAME_KEY, state.deviceName);
    localStorage.setItem(DEVICE_PLATFORM_KEY, state.devicePlatform);
}

function setStatus(text, kind = "normal") {
    if (!connectionStatus) return;
    connectionStatus.textContent = text;
    connectionStatus.dataset.kind = kind;
}

function setPairingStatus(text) {
    if (pairingStatus) pairingStatus.textContent = text || "";
}

function showLoading(text = "Loading phone sync") {
    if (loadingStatus) loadingStatus.textContent = text;
    if (loadingView) loadingView.hidden = false;
    if (pairingView) pairingView.hidden = true;
    if (appView) appView.hidden = true;
}

function showPairing() {
    window.clearInterval(state.polling);
    state.polling = 0;
    if (loadingView) loadingView.hidden = true;
    pairingView.hidden = false;
    appView.hidden = true;
    if (tokenInput) tokenInput.value = state.token || "";
}

function showApp() {
    if (loadingView) loadingView.hidden = true;
    pairingView.hidden = true;
    appView.hidden = false;
}

function storeToken(token) {
    state.token = String(token || "").trim();
    if (state.token) {
        localStorage.setItem(TOKEN_KEY, state.token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

async function loadDesktopComposer() {
    if (state.composerLoaded) return;
    if (!desktopComposerMount) throw new Error("Composer mount is missing.");
    const [templatesResponse, composerResponse] = await Promise.all([
        fetch("/components/templates.html", { cache: "no-store" }),
        fetch("/components/composer.html", { cache: "no-store" })
    ]);
    if (!templatesResponse.ok) throw new Error(`Could not load desktop templates (${templatesResponse.status}).`);
    if (!composerResponse.ok) throw new Error(`Could not load desktop composer (${composerResponse.status}).`);
    desktopComposerMount.innerHTML = `${await templatesResponse.text()}\n${await composerResponse.text()}`;
    await hydrateDesktopComposer();
    state.composerLoaded = true;
}

function setComposerStatus(message) {
    setStatus(message);
}

function closeComposerPopover(panel, button, openClass = "open") {
    if (!panel) return;
    panel.classList.remove(openClass);
    panel.hidden = true;
    if (button) button.setAttribute("aria-expanded", "false");
}

function toggleComposerPopover(panel, button, openClass = "open") {
    if (!panel) return;
    const nextOpen = panel.hidden || !panel.classList.contains(openClass);
    panel.hidden = !nextOpen;
    panel.classList.toggle(openClass, nextOpen);
    if (button) button.setAttribute("aria-expanded", String(nextOpen));
}

async function installRemoteModelSwitcher() {
    const host = document.getElementById("modelSwitcherHost");
    if (!host) return;
    try {
        const { createModelSwitcher } = await import("/modules/model-switcher.js");
        createModelSwitcher({
            host,
            models: [{ id: "desktop-model", label: "Desktop model", shortLabel: "PC model", meta: "Selected on the PC app" }],
            activeModel: "desktop-model",
            reasoningModes: [{ id: "remote", label: "Remote", shortLabel: "Remote" }],
            activeReasoning: "remote"
        });
    } catch {
        host.textContent = "";
    }
}

async function hydrateDesktopComposer() {
    await installRemoteModelSwitcher();

    messageInput = document.getElementById("prompt");
    sendButton = document.getElementById("sendButton");
    if (!messageInput || !sendButton) {
        throw new Error("Desktop composer controls are missing.");
    }

    const stopButton = document.getElementById("stopButton");
    if (stopButton) stopButton.hidden = true;

    const uploadButton = document.getElementById("uploadButton");
    const attachmentMenu = document.getElementById("attachmentMenu");
    if (attachmentMenu) attachmentMenu.hidden = true;
    attachmentMenu?.addEventListener("click", event => event.stopPropagation());
    if (uploadButton && attachmentMenu) {
        uploadButton.addEventListener("click", event => {
            event.stopPropagation();
            toggleComposerPopover(attachmentMenu, uploadButton);
        });
    }

    const toolsButton = document.getElementById("toolsBtn");
    const toolsDropdown = document.getElementById("toolsDropdown");
    if (toolsDropdown) toolsDropdown.hidden = true;
    toolsDropdown?.addEventListener("click", event => event.stopPropagation());
    if (toolsButton && toolsDropdown) {
        toolsButton.addEventListener("click", event => {
            event.stopPropagation();
            toggleComposerPopover(toolsDropdown, toolsButton);
        });
    }

    document.querySelectorAll("#attachmentUploadFile, #attachmentChooseLibrary").forEach(button => {
        button.addEventListener("click", () => setComposerStatus("Attachments are controlled by the PC app"));
    });

    document.getElementById("voiceButton")?.addEventListener("click", () => {
        setComposerStatus("Voice input runs on the PC app");
    });

    document.addEventListener("click", () => {
        closeComposerPopover(attachmentMenu, uploadButton);
        closeComposerPopover(toolsDropdown, toolsButton);
    });

    sendButton.addEventListener("click", () => void sendMessage());
    messageInput.addEventListener("input", updateComposerState);
    messageInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void sendMessage();
        }
    });

    updateComposerState();
}

async function api(path, options = {}) {
    if (!state.token) throw new Error("Missing token.");
    let response;
    try {
        response = await fetch(path, {
            ...options,
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`,
                "X-Fauna-Device-Id": state.deviceId,
                "X-Fauna-Device-Name": state.deviceName,
                "X-Fauna-Device-Platform": state.devicePlatform,
                ...(options.headers || {})
            }
        });
    } catch {
        throw new Error("Could not reach the PC. Make sure both devices are on the same Wi-Fi and Phone Sync is enabled.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
        const message = response.status === 401
            ? "Token was rejected. Copy the current token from Phone Sync again."
            : data.error || `HTTP ${response.status}`;
        if (response.status === 401) {
            storeToken("");
            showPairing();
        }
        throw new Error(message);
    }
    return data;
}

function setSettingsStatus(text, kind = "normal") {
    if (!settingsStatus) return;
    settingsStatus.textContent = text || "";
    settingsStatus.dataset.kind = kind;
}

function getSetting(key) {
    return state.settings.find(setting => setting.key === key) || null;
}

function openSettingsPanel() {
    if (!settingsPanel) return;
    settingsPanel.hidden = false;
    document.body.classList.add("mobile-settings-open");
    void loadRemoteSettings();
}

function closeSettingsPanel() {
    if (!settingsPanel) return;
    settingsPanel.hidden = true;
    document.body.classList.remove("mobile-settings-open");
}

function formatUpdateStatus(status = "") {
    const clean = String(status || "idle").trim();
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Idle";
}

function renderUpdatePanel() {
    const update = state.update || {};
    const current = update.currentVersion || "";
    const available = update.availableVersion || "";
    if (updateVersionLabel) {
        updateVersionLabel.textContent = available && available !== current
            ? `Fauna ${current || "Desktop"} to ${available}`
            : `Fauna ${current || "Desktop"}`;
    }
    if (updateStatusBadge) {
        const status = String(update.status || "idle");
        updateStatusBadge.textContent = formatUpdateStatus(status);
        updateStatusBadge.dataset.state = status;
    }
    if (updateStatusText) {
        updateStatusText.textContent = update.message || "No update check yet.";
    }
    if (installUpdateButton) {
        installUpdateButton.disabled = !update.canInstall;
    }
}

function createSwitchControl(setting) {
    const label = document.createElement("label");
    label.className = "mobile-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(setting.value);
    input.disabled = state.savingSettingKey === setting.key;
    const track = document.createElement("span");
    track.className = "mobile-switch-track";
    const knob = document.createElement("span");
    knob.className = "mobile-switch-knob";
    track.appendChild(knob);
    label.append(input, track);
    input.addEventListener("change", () => {
        void saveRemoteSetting(setting.key, input.checked);
    });
    return label;
}

function createSelectControl(setting) {
    const wrap = document.createElement("div");
    wrap.className = "mobile-segment";
    wrap.setAttribute("role", "radiogroup");
    wrap.setAttribute("aria-label", setting.label || "Setting");
    (setting.options || []).forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mobile-segment-choice";
        button.textContent = option.label || option.value || "Automatic";
        button.disabled = state.savingSettingKey === setting.key;
        const active = String(setting.storageValue ?? setting.value ?? "") === String(option.value);
        button.classList.toggle("active", active);
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(active));
        button.addEventListener("click", () => {
            if (active) return;
            void saveRemoteSetting(setting.key, option.value);
        });
        wrap.appendChild(button);
    });
    return wrap;
}

function createInputControl(setting) {
    const wrap = document.createElement("div");
    wrap.className = "mobile-input-row";
    const input = document.createElement("input");
    input.className = "mobile-setting-input";
    input.type = setting.type === "number" ? "number" : "text";
    input.value = String(setting.value ?? "");
    input.disabled = state.savingSettingKey === setting.key;
    if (setting.type === "number") {
        if (setting.min !== undefined) input.min = String(setting.min);
        if (setting.max !== undefined) input.max = String(setting.max);
        if (setting.step !== undefined) input.step = String(setting.step);
    } else if (setting.maxLength) {
        input.maxLength = Number(setting.maxLength) || 240;
    }
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "small-button";
    saveButton.textContent = "Save";
    saveButton.disabled = state.savingSettingKey === setting.key;
    const save = () => void saveRemoteSetting(setting.key, input.value);
    saveButton.addEventListener("click", save);
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            save();
        }
    });
    input.addEventListener("change", save);
    wrap.append(input, saveButton);
    return wrap;
}

function createSettingControl(setting) {
    if (setting.type === "boolean") return createSwitchControl(setting);
    if (setting.type === "select") return createSelectControl(setting);
    return createInputControl(setting);
}

function createSettingRow(setting) {
    const row = document.createElement("article");
    row.className = "mobile-setting-row";
    row.dataset.settingKey = setting.key || "";

    const copy = document.createElement("div");
    copy.className = "mobile-setting-copy";
    const title = document.createElement("strong");
    title.textContent = setting.label || setting.key || "Setting";
    const desc = document.createElement("span");
    desc.textContent = setting.description || "";
    copy.append(title, desc);

    row.append(copy, createSettingControl(setting));
    return row;
}

function renderRemoteSettingsList() {
    renderUpdatePanel();

    const autoSetting = getSetting(AUTO_INSTALL_SETTING_KEY);
    if (autoInstallMount) {
        autoInstallMount.replaceChildren();
        if (autoSetting) autoInstallMount.appendChild(createSettingRow(autoSetting));
    }

    if (!remoteSettingsList) return;
    remoteSettingsList.replaceChildren();
    const visibleSettings = state.settings.filter(setting => setting.key !== AUTO_INSTALL_SETTING_KEY);
    if (visibleSettings.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No desktop settings available.";
        remoteSettingsList.appendChild(empty);
        return;
    }

    const sections = new Map();
    visibleSettings.forEach(setting => {
        const section = setting.section || "Settings";
        if (!sections.has(section)) sections.set(section, []);
        sections.get(section).push(setting);
    });

    sections.forEach((settings, section) => {
        const group = document.createElement("section");
        group.className = "mobile-settings-group";
        const heading = document.createElement("h3");
        heading.textContent = section;
        group.appendChild(heading);
        settings.forEach(setting => group.appendChild(createSettingRow(setting)));
        remoteSettingsList.appendChild(group);
    });
}

async function loadRemoteSettings() {
    try {
        setSettingsStatus("Syncing");
        const data = await api("/api/settings");
        state.settings = Array.isArray(data.settings) ? data.settings : [];
        state.update = data.update || state.update;
        renderRemoteSettingsList();
        setSettingsStatus("Synced");
    } catch (error) {
        setSettingsStatus(error.message, "error");
    }
}

async function saveRemoteSetting(key, value) {
    if (!key || state.savingSettingKey) return;
    state.savingSettingKey = key;
    renderRemoteSettingsList();
    try {
        setSettingsStatus("Saving");
        const data = await api("/api/settings", {
            method: "POST",
            body: JSON.stringify({ key, value })
        });
        state.settings = Array.isArray(data.settings) ? data.settings : state.settings;
        state.update = data.update || state.update;
        renderRemoteSettingsList();
        setSettingsStatus("Saved");
    } catch (error) {
        setSettingsStatus(error.message, "error");
        await loadRemoteSettings();
    } finally {
        state.savingSettingKey = "";
        renderRemoteSettingsList();
    }
}

async function checkForUpdates() {
    if (checkUpdateButton) checkUpdateButton.disabled = true;
    try {
        setSettingsStatus("Checking");
        const data = await api("/api/updates/check", { method: "POST", body: "{}" });
        state.update = data.update || state.update;
        renderRemoteSettingsList();
        setSettingsStatus("Checked");
    } catch (error) {
        setSettingsStatus(error.message, "error");
    } finally {
        if (checkUpdateButton) checkUpdateButton.disabled = false;
    }
}

async function installUpdate() {
    if (installUpdateButton) installUpdateButton.disabled = true;
    try {
        setSettingsStatus("Installing");
        const data = await api("/api/updates/install", { method: "POST", body: "{}" });
        state.update = data.update || state.update;
        renderRemoteSettingsList();
        setSettingsStatus("Install started");
    } catch (error) {
        setSettingsStatus(error.message, "error");
    } finally {
        renderRemoteSettingsList();
    }
}

function formatRelativeTime(value) {
    const time = Date.parse(value || "");
    if (!Number.isFinite(time)) return "";
    const diff = Math.max(0, Date.now() - time);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

function formatChatMeta(chat) {
    const count = Array.isArray(chat?.messages) ? chat.messages.length : 0;
    const time = formatRelativeTime(chat?.updatedAt);
    return [count ? `${count} messages` : "No messages", time].filter(Boolean).join(" / ");
}

function createPinnedIcon() {
    const icon = document.createElement("span");
    icon.className = "pin-glyph";
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path></svg>`;
    return icon;
}

function renderChatList() {
    chatList.replaceChildren();
    if (state.chats.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No chats yet.";
        chatList.appendChild(empty);
        return;
    }

    state.chats.forEach(chat => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "chat-row";
        row.classList.toggle("active", chat.id === state.activeChatId);

        const copy = document.createElement("div");
        const title = document.createElement("div");
        title.className = "chat-row-title";
        title.textContent = chat.title || "Current Session";
        const preview = document.createElement("div");
        preview.className = "chat-row-preview";
        preview.textContent = chat.preview || "No preview";
        const time = document.createElement("div");
        time.className = "chat-row-time";
        time.textContent = formatRelativeTime(chat.updatedAt);
        copy.append(title, preview, time);

        row.appendChild(copy);
        if (chat.pinned) row.appendChild(createPinnedIcon());
        row.addEventListener("click", () => {
            state.activeChatId = chat.id;
            renderChatList();
            void loadChat(chat.id);
        });
        chatList.appendChild(row);
    });
}

function renderMessages() {
    messageList.replaceChildren();
    const chat = state.activeChat;
    activeChatTitle.textContent = chat?.title || (state.activeChatId ? "Current Session" : "New chat");
    activeChatMeta.textContent = formatChatMeta(chat);
    pinButton.disabled = !chat?.id || Boolean(chat?.archived);
    pinButton.classList.toggle("active", Boolean(chat?.pinned));
    pinButton.setAttribute("aria-label", chat?.pinned ? "Unpin chat" : "Pin chat");

    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    if (messages.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = state.activeChatId ? "No messages in this chat." : "Start a new chat from your phone.";
        messageList.appendChild(empty);
        return;
    }

    messages.forEach(message => {
        const bubble = document.createElement("article");
        bubble.className = `message ${message.role || "assistant"}`;
        if (message.error) bubble.classList.add("error");
        bubble.textContent = message.content || (message.error?.message || "Empty message");
        messageList.appendChild(bubble);
    });
    messageList.scrollTop = messageList.scrollHeight;
}

async function loadChats({ keepSelection = true } = {}) {
    const data = await api("/api/chats?limit=80");
    state.chats = Array.isArray(data.chats) ? data.chats : [];
    if (!keepSelection || !state.activeChatId) {
        state.activeChatId = data.activeChatId || state.chats[0]?.id || "";
    }
    if (state.activeChatId && !state.chats.some(chat => chat.id === state.activeChatId)) {
        state.activeChatId = state.chats[0]?.id || "";
    }
    renderChatList();
    if (state.activeChatId) {
        await loadChat(state.activeChatId);
    } else {
        state.activeChat = null;
        renderMessages();
    }
}

async function loadChat(chatId) {
    if (!chatId) return;
    const data = await api(`/api/chats/${encodeURIComponent(chatId)}`);
    state.activeChat = data.chat || null;
    renderMessages();
}

async function refresh() {
    try {
        setStatus("Syncing");
        await loadChats({ keepSelection: true });
        setStatus("Connected");
    } catch (error) {
        setStatus(error.message, "error");
        if (!state.token) showPairing();
    }
}

function startPolling() {
    window.clearInterval(state.polling);
    state.polling = window.setInterval(() => {
        void refresh();
    }, POLL_MS);
}

function updateComposerState() {
    if (!messageInput || !sendButton) return;
    const hasText = Boolean(messageInput.value.trim());
    sendButton.disabled = state.sending || !hasText;
    sendButton.setAttribute("aria-busy", String(state.sending));
    const idleState = sendButton.querySelector("[data-send-state='idle']");
    const loadingState = sendButton.querySelector("[data-send-state='loading']");
    if (idleState) idleState.hidden = state.sending;
    if (loadingState) loadingState.hidden = !state.sending;
    messageInput.style.height = "auto";
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
}

async function sendMessage() {
    if (!messageInput || !sendButton) return;
    const text = messageInput.value.trim();
    if (!text || state.sending) return;
    state.sending = true;
    updateComposerState();
    try {
        const targetChatId = state.activeChatId;
        messageInput.value = "";
        updateComposerState();
        setStatus("Sending");
        if (targetChatId) {
            await api(`/api/chats/${encodeURIComponent(targetChatId)}/send`, {
                method: "POST",
                body: JSON.stringify({ message: text })
            });
        } else {
            await api("/api/messages", {
                method: "POST",
                body: JSON.stringify({ message: text, newChat: true })
            });
        }
        window.setTimeout(() => void loadChats({ keepSelection: false }), 650);
        setStatus("Sent to PC");
    } catch (error) {
        setStatus(error.message, "error");
        messageInput.value = text;
    } finally {
        state.sending = false;
        updateComposerState();
    }
}

async function togglePin() {
    const chat = state.activeChat;
    if (!chat?.id) return;
    try {
        const data = await api(`/api/chats/${encodeURIComponent(chat.id)}/pin`, {
            method: "POST",
            body: JSON.stringify({ pinned: !chat.pinned })
        });
        state.activeChat = data.chat || { ...chat, pinned: !chat.pinned };
        const summary = state.chats.find(item => item.id === chat.id);
        if (summary) summary.pinned = Boolean(state.activeChat.pinned);
        renderChatList();
        renderMessages();
        setStatus(state.activeChat.pinned ? "Pinned" : "Unpinned");
    } catch (error) {
        setStatus(error.message, "error");
    }
}

async function connectWithToken() {
    const token = tokenInput.value.trim();
    if (!token) {
        setPairingStatus("Token required.");
        return;
    }
    storeToken(token);
    saveTokenButton.disabled = true;
    setPairingStatus("Checking token...");
    try {
        showLoading("Connecting to your PC");
        await api("/api/health");
        showLoading("Loading desktop composer");
        await loadDesktopComposer();
        showApp();
        await refresh();
        startPolling();
        setPairingStatus("");
    } catch (error) {
        showPairing();
        setPairingStatus(error.message);
    } finally {
        saveTokenButton.disabled = false;
    }
}

function disconnect() {
    storeToken("");
    state.chats = [];
    state.activeChat = null;
    state.activeChatId = "";
    showPairing();
    setPairingStatus("Disconnected.");
}

function startNewChat() {
    state.activeChatId = "";
    state.activeChat = null;
    renderChatList();
    renderMessages();
    messageInput?.focus();
}

async function boot() {
    loadDeviceIdentity();
    const hashToken = tokenFromHash();
    if (hashToken) {
        storeToken(hashToken);
        history.replaceState(null, "", `${location.pathname}${location.search}`);
    } else {
        storeToken(localStorage.getItem(TOKEN_KEY) || "");
    }

    saveTokenButton.addEventListener("click", () => void connectWithToken());
    tokenInput.addEventListener("keydown", event => {
        if (event.key === "Enter") void connectWithToken();
    });
    settingsButton.addEventListener("click", openSettingsPanel);
    settingsPanel?.addEventListener("click", event => {
        if (event.target.closest("[data-mobile-settings-close]")) closeSettingsPanel();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && settingsPanel && !settingsPanel.hidden) closeSettingsPanel();
    });
    checkUpdateButton?.addEventListener("click", () => void checkForUpdates());
    installUpdateButton?.addEventListener("click", () => void installUpdate());
    refreshButton.addEventListener("click", () => void refresh());
    disconnectButton.addEventListener("click", disconnect);
    newChatButton.addEventListener("click", startNewChat);
    pinButton.addEventListener("click", () => void togglePin());

    if (!state.token) {
        showPairing();
        return;
    }

    try {
        showLoading("Connecting to your PC");
        await api("/api/health");
        showLoading("Loading desktop composer");
        await loadDesktopComposer();
        updateComposerState();
        showApp();
        await refresh();
        startPolling();
    } catch (error) {
        showPairing();
        setPairingStatus(error.message || "Could not load phone sync.");
    }
}

void boot();
