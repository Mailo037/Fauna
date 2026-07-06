const TOKEN_KEY = "faunaRemoteToken";
const POLL_MS = 2600;

const state = {
    token: "",
    chats: [],
    activeChatId: "",
    activeChat: null,
    polling: 0,
    sending: false
};

const pairingView = document.getElementById("pairingView");
const appView = document.getElementById("appView");
const tokenInput = document.getElementById("tokenInput");
const saveTokenButton = document.getElementById("saveTokenButton");
const pairingStatus = document.getElementById("pairingStatus");
const connectionStatus = document.getElementById("connectionStatus");
const refreshButton = document.getElementById("refreshButton");
const disconnectButton = document.getElementById("disconnectButton");
const chatList = document.getElementById("chatList");
const newChatButton = document.getElementById("newChatButton");
const activeChatTitle = document.getElementById("activeChatTitle");
const activeChatMeta = document.getElementById("activeChatMeta");
const pinButton = document.getElementById("pinButton");
const messageList = document.getElementById("messageList");
const desktopComposerMount = document.getElementById("desktopComposerMount");
let messageInput = null;
let sendButton = null;

function tokenFromHash() {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return "";
    const params = new URLSearchParams(raw);
    return params.get("token") || "";
}

function setStatus(text, kind = "normal") {
    if (!connectionStatus) return;
    connectionStatus.textContent = text;
    connectionStatus.dataset.kind = kind;
}

function setPairingStatus(text) {
    if (pairingStatus) pairingStatus.textContent = text || "";
}

function showPairing() {
    window.clearInterval(state.polling);
    state.polling = 0;
    pairingView.hidden = false;
    appView.hidden = true;
    if (tokenInput) tokenInput.value = state.token || "";
}

function showApp() {
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
    if (!desktopComposerMount) throw new Error("Composer mount is missing.");
    const [templatesResponse, composerResponse] = await Promise.all([
        fetch("/components/templates.html", { cache: "no-store" }),
        fetch("/components/composer.html", { cache: "no-store" })
    ]);
    if (!templatesResponse.ok) throw new Error(`Could not load desktop templates (${templatesResponse.status}).`);
    if (!composerResponse.ok) throw new Error(`Could not load desktop composer (${composerResponse.status}).`);
    desktopComposerMount.innerHTML = `${await templatesResponse.text()}\n${await composerResponse.text()}`;
    await hydrateDesktopComposer();
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
    const response = await fetch(path, {
        ...options,
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${state.token}`,
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
        const message = data.error || `HTTP ${response.status}`;
        if (response.status === 401) {
            storeToken("");
            showPairing();
        }
        throw new Error(message);
    }
    return data;
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
        await api("/api/health");
        showApp();
        await refresh();
        startPolling();
        setPairingStatus("");
    } catch (error) {
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
    try {
        await loadDesktopComposer();
    } catch (error) {
        setStatus(error.message || "Composer could not load", "error");
        showPairing();
        return;
    }

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
    refreshButton.addEventListener("click", () => void refresh());
    disconnectButton.addEventListener("click", disconnect);
    newChatButton.addEventListener("click", startNewChat);
    pinButton.addEventListener("click", () => void togglePin());

    updateComposerState();
    if (!state.token) {
        showPairing();
        return;
    }
    showApp();
    void refresh();
    startPolling();
}

void boot();
