const TOKEN_KEY = "faunaRemoteToken";
const DEVICE_ID_KEY = "faunaRemoteDeviceId";
const DEVICE_NAME_KEY = "faunaRemoteDeviceName";
const DEVICE_PLATFORM_KEY = "faunaRemoteDevicePlatform";
const POLL_MS = 2600;
const AUTO_INSTALL_SETTING_KEY = "faunaAutoInstallUpdates";
const REMOTE_AI_PROVIDER_SETTING_KEY = "faunaAiProvider";
const REMOTE_LOCAL_MODEL_SETTING_KEY = "faunaLocalChatModel";
const REMOTE_OPENAI_MODEL_SETTING_KEY = "faunaOpenAiChatModel";
const MAX_MOBILE_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_MOBILE_ATTACHMENT_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_MOBILE_ATTACHMENTS = 8;

const state = {
    token: "",
    chats: [],
    activeChatId: "",
    activeChat: null,
    polling: 0,
    sending: false,
    isComposingNewChat: false,
    settings: [],
    update: null,
    savingSettingKey: "",
    deviceId: "",
    deviceName: "",
    devicePlatform: "mobile",
    connectionName: "",
    composerLoaded: false,
    activeSettingsPane: "general",
    chatListSignature: "",
    activeChatSummarySignature: "",
    activeChatRenderSignature: "",
    messageScrollIdleTimer: 0,
    isUserScrollingMessages: false,
    attachments: [],
    libraryAttachments: [],
    libraryPickerItems: [],
    libraryPickerSelectedKeys: new Set(),
    modelState: null,
    modelSwitcher: null
};

const loadingView = document.getElementById("loadingView");
const loadingStatus = document.getElementById("loadingStatus");
const pairingView = document.getElementById("pairingView");
const appView = document.getElementById("appView");
const tokenInput = document.getElementById("tokenInput");
const saveTokenButton = document.getElementById("saveTokenButton");
const pairingStatus = document.getElementById("pairingStatus");
const connectionStatus = document.getElementById("connectionStatus");
const pcSwitcherButton = document.getElementById("pcSwitcherButton");
const activePcName = document.getElementById("activePcName");
const settingsButton = document.getElementById("settingsButton");
const refreshButton = document.getElementById("refreshButton");
const disconnectButton = document.getElementById("disconnectButton");
const chatSidebarButton = document.getElementById("chatSidebarButton");
const chatSidebar = document.getElementById("chatSidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarCloseButton = document.getElementById("sidebarCloseButton");
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
const mobileSettingsTitle = document.getElementById("mobileSettingsTitle");
const mobileSettingsSearchInput = document.getElementById("mobileSettingsSearchInput");
const mobileSettingsSearchClear = document.getElementById("mobileSettingsSearchClear");
const mobileSettingsSearchEmpty = document.getElementById("mobileSettingsSearchEmpty");
const mobileSettingsNavButtons = Array.from(document.querySelectorAll("[data-mobile-settings-pane]"));
const mobileSettingsPanes = Array.from(document.querySelectorAll("[data-mobile-settings-panel]"));
const mobileSettingsLists = new Map(Array.from(document.querySelectorAll("[data-mobile-settings-list]"))
    .map(list => [list.dataset.mobileSettingsList || "general", list]));
const disconnectPhoneButton = document.getElementById("disconnectPhoneButton");
const phoneDeviceName = document.getElementById("phoneDeviceName");
const phoneDeviceMeta = document.getElementById("phoneDeviceMeta");
const phoneActivePcName = document.getElementById("phoneActivePcName");
const phoneActivePcUrl = document.getElementById("phoneActivePcUrl");
const managePcConnectionsButton = document.getElementById("managePcConnectionsButton");
const mobileSettingsExportButton = document.getElementById("mobileSettingsExportButton");
const mobileSettingsImportButton = document.getElementById("mobileSettingsImportButton");
const mobileSettingsImportInput = document.getElementById("mobileSettingsImportInput");
let messageInput = null;
let sendButton = null;
let composerFileInput = null;
let composerPreviewContainer = null;
let mobileToolActivityIdCounter = 0;
let sidebarGesture = null;
let chatLongPressTimer = 0;
let chatLongPressSuppressClick = false;
let activeMobileChatMenu = null;
let mobileLibraryPicker = null;
let mobileLibraryPickerList = null;
let mobileLibraryPickerEmpty = null;
let mobileLibraryPickerAttach = null;
let mobileLibraryPickerSearch = null;

const SETTINGS_PANE_ORDER = [
    "general",
    "shortcuts",
    "notifications",
    "voice",
    "provider",
    "task-models",
    "usage",
    "potato",
    "services",
    "phone",
    "info",
    "personalization"
];

const SETTINGS_PANE_TITLES = {
    general: "General",
    shortcuts: "Shortcuts",
    notifications: "Notifications",
    voice: "Voice",
    provider: "AI Provider",
    "task-models": "Task Models",
    usage: "Usage",
    potato: "Potato PC",
    services: "Local Services",
    phone: "Phone Sync",
    info: "Info",
    personalization: "Personalization"
};

function getHashParams() {
    const raw = window.location.hash.replace(/^#/, "");
    return raw ? new URLSearchParams(raw) : new URLSearchParams();
}

function tokenFromHash() {
    return getHashParams().get("token") || "";
}

function isNativeAndroidShell() {
    return new URLSearchParams(window.location.search).get("native") === "android";
}

function getActivePcDisplayName() {
    return normalizeDeviceLabel(state.connectionName, window.location.hostname || "Fauna PC");
}

function getActivePcUrl() {
    return /^https?:$/i.test(window.location.protocol) ? window.location.origin : "";
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
    state.connectionName = normalizeDeviceLabel(params.get("connectionName") || params.get("pcName"), window.location.hostname || "Fauna PC");
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
    updateActivePcUi();
    updateMobileChatModeClass();
}

function updateActivePcUi() {
    const name = getActivePcDisplayName();
    const url = getActivePcUrl();
    if (activePcName) activePcName.textContent = name;
    if (phoneActivePcName) phoneActivePcName.textContent = name;
    if (phoneActivePcUrl) phoneActivePcUrl.textContent = url || "Current Phone URL";
    if (pcSwitcherButton) pcSwitcherButton.dataset.native = String(isNativeAndroidShell());
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

function normalizeSettingBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const clean = String(value ?? "").trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(clean)) return true;
    if (["false", "0", "no", "off", ""].includes(clean)) return false;
    return Boolean(value);
}

function formatFileSize(bytes = 0) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
    return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function getAttachmentKindLabel(file) {
    const type = String(file?.type || "");
    if (type.startsWith("image/")) return "Image";
    if (/pdf/i.test(type) || /\.pdf$/i.test(file?.name || "")) return "PDF";
    if (/json|javascript|text|markdown|csv/i.test(type) || /\.(txt|md|js|mjs|ts|tsx|jsx|json|csv|py|html?|css)$/i.test(file?.name || "")) return "File";
    return "Attachment";
}

function isDuplicateMobileAttachment(file) {
    return state.attachments.some(item =>
        item.name === file.name
        && item.size === file.size
        && item.lastModified === file.lastModified
    );
}

function renderMobileAttachmentPreviews() {
    if (!composerPreviewContainer) return;
    composerPreviewContainer.replaceChildren();
    state.attachments.forEach(file => {
        const pill = document.createElement("div");
        const isImage = String(file.type || "").startsWith("image/");
        pill.className = `preview-pill ${isImage ? "preview-image-tile" : "preview-file-pill"}`;

        const icon = document.createElement("span");
        icon.className = "preview-file-icon";
        icon.setAttribute("aria-hidden", "true");
        if (isImage) {
            const img = document.createElement("img");
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            img.className = "preview-file-thumb";
            img.onload = () => URL.revokeObjectURL(objectUrl);
            icon.appendChild(img);
        } else {
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`;
        }

        const meta = document.createElement("span");
        meta.className = "preview-file-meta";
        const name = document.createElement("span");
        name.className = "preview-file-name";
        name.textContent = file.name || "attachment";
        const kind = document.createElement("span");
        kind.className = "preview-file-type";
        kind.textContent = `${getAttachmentKindLabel(file)} / ${formatFileSize(file.size)}`;
        meta.append(name, kind);

        const remove = document.createElement("button");
        remove.className = "remove-preview";
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${file.name || "attachment"}`);
        remove.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
        remove.addEventListener("click", () => {
            state.attachments = state.attachments.filter(item => item !== file);
            renderMobileAttachmentPreviews();
            updateComposerState();
        });

        pill.append(icon, meta, remove);
        composerPreviewContainer.appendChild(pill);
    });
    state.libraryAttachments.forEach(item => {
        const pill = document.createElement("div");
        pill.className = "preview-pill preview-file-pill mobile-library-preview-pill";

        const icon = document.createElement("span");
        icon.className = "preview-file-icon";
        icon.setAttribute("aria-hidden", "true");
        if (item.thumbnail) {
            const img = document.createElement("img");
            img.src = item.thumbnail;
            img.className = "preview-file-thumb";
            icon.appendChild(img);
        } else {
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`;
        }

        const meta = document.createElement("span");
        meta.className = "preview-file-meta";
        const title = document.createElement("span");
        title.className = "preview-file-name";
        title.textContent = item.title || "Library item";
        const type = document.createElement("span");
        type.className = "preview-file-type";
        type.textContent = item.meta || item.type || "Fauna Library";
        meta.append(title, type);

        const remove = document.createElement("button");
        remove.className = "remove-preview";
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${item.title || "Library item"}`);
        remove.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
        remove.addEventListener("click", () => {
            state.libraryAttachments = state.libraryAttachments.filter(entry => entry.key !== item.key);
            renderMobileAttachmentPreviews();
            updateComposerState();
        });

        pill.append(icon, meta, remove);
        composerPreviewContainer.appendChild(pill);
    });
}

function addMobileAttachments(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const accepted = [];
    const currentSize = state.attachments.reduce((total, item) => total + (Number(item.size) || 0), 0);
    for (const file of files) {
        if (!(file instanceof File)) continue;
        if (state.attachments.length + accepted.length >= MAX_MOBILE_ATTACHMENTS) {
            setComposerStatus(`Maximum ${MAX_MOBILE_ATTACHMENTS} attachments.`);
            break;
        }
        if (file.size > MAX_MOBILE_ATTACHMENT_BYTES) {
            setComposerStatus(`${file.name || "Attachment"} is larger than ${formatFileSize(MAX_MOBILE_ATTACHMENT_BYTES)}.`);
            continue;
        }
        const acceptedSize = accepted.reduce((total, item) => total + (Number(item.size) || 0), 0);
        if (currentSize + acceptedSize + file.size > MAX_MOBILE_ATTACHMENT_TOTAL_BYTES) {
            setComposerStatus(`Attachments can be up to ${formatFileSize(MAX_MOBILE_ATTACHMENT_TOTAL_BYTES)} total.`);
            break;
        }
        if (isDuplicateMobileAttachment(file) || accepted.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) continue;
        accepted.push(file);
    }
    if (accepted.length === 0) return;
    state.attachments = [...state.attachments, ...accepted];
    renderMobileAttachmentPreviews();
    updateComposerState();
    setComposerStatus(`${accepted.length} attachment${accepted.length === 1 ? "" : "s"} ready`);
}

function clearMobileAttachments() {
    state.attachments = [];
    state.libraryAttachments = [];
    renderMobileAttachmentPreviews();
    updateComposerState();
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Could not read attachment."));
        reader.readAsDataURL(file);
    });
}

async function serializeMobileAttachments(files = []) {
    const attachments = [];
    for (const file of files) {
        attachments.push({
            name: file.name || "attachment",
            type: file.type || "application/octet-stream",
            size: file.size || 0,
            lastModified: file.lastModified || Date.now(),
            dataUrl: await fileToDataUrl(file)
        });
    }
    return attachments;
}

function ensureMobileLibraryPicker() {
    if (mobileLibraryPicker) return mobileLibraryPicker;
    mobileLibraryPicker = document.createElement("section");
    mobileLibraryPicker.className = "mobile-library-picker";
    mobileLibraryPicker.hidden = true;
    mobileLibraryPicker.setAttribute("aria-hidden", "true");
    mobileLibraryPicker.innerHTML = `
        <div class="mobile-library-backdrop" data-mobile-library-close></div>
        <div class="mobile-library-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileLibraryTitle">
            <header class="mobile-library-header">
                <div>
                    <p>Fauna Library</p>
                    <h2 id="mobileLibraryTitle">Choose from Library</h2>
                </div>
                <button class="icon-button" type="button" aria-label="Close Library" data-mobile-library-close>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
            </header>
            <label class="mobile-library-search-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                <input id="mobileLibrarySearch" type="search" placeholder="Search Library" autocomplete="off">
            </label>
            <div id="mobileLibraryList" class="mobile-library-list" role="listbox" aria-label="Fauna Library"></div>
            <p id="mobileLibraryEmpty" class="mobile-library-empty" hidden>No Library items found.</p>
            <footer class="mobile-library-footer">
                <button class="small-button" type="button" data-mobile-library-close>Cancel</button>
                <button id="mobileLibraryAttach" class="primary-button" type="button" disabled>Attach selected</button>
            </footer>
        </div>
    `;
    document.body.appendChild(mobileLibraryPicker);
    mobileLibraryPickerList = mobileLibraryPicker.querySelector("#mobileLibraryList");
    mobileLibraryPickerEmpty = mobileLibraryPicker.querySelector("#mobileLibraryEmpty");
    mobileLibraryPickerAttach = mobileLibraryPicker.querySelector("#mobileLibraryAttach");
    mobileLibraryPickerSearch = mobileLibraryPicker.querySelector("#mobileLibrarySearch");

    mobileLibraryPicker.addEventListener("click", event => {
        if (event.target.closest("[data-mobile-library-close]")) closeMobileLibraryPicker();
        const itemButton = event.target.closest("[data-mobile-library-key]");
        if (itemButton) {
            const key = itemButton.dataset.mobileLibraryKey || "";
            if (state.libraryPickerSelectedKeys.has(key)) {
                state.libraryPickerSelectedKeys.delete(key);
            } else {
                state.libraryPickerSelectedKeys.add(key);
            }
            renderMobileLibraryPicker();
        }
    });
    mobileLibraryPickerSearch?.addEventListener("input", renderMobileLibraryPicker);
    mobileLibraryPickerAttach?.addEventListener("click", attachSelectedMobileLibraryItems);
    return mobileLibraryPicker;
}

function closeMobileLibraryPicker() {
    if (!mobileLibraryPicker) return;
    mobileLibraryPicker.hidden = true;
    mobileLibraryPicker.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-library-open");
    state.libraryPickerSelectedKeys = new Set();
}

function renderMobileLibraryPicker() {
    if (!mobileLibraryPickerList || !mobileLibraryPickerEmpty) return;
    const query = String(mobileLibraryPickerSearch?.value || "").trim().toLowerCase();
    const selectedExisting = new Set(state.libraryAttachments.map(item => item.key));
    const items = state.libraryPickerItems.filter(item => {
        if (selectedExisting.has(item.key)) return false;
        if (!query) return true;
        return [item.title, item.detail, item.meta, item.type, item.sessionTitle].some(value => String(value || "").toLowerCase().includes(query));
    });

    mobileLibraryPickerList.replaceChildren();
    items.forEach(item => {
        const selected = state.libraryPickerSelectedKeys.has(item.key);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mobile-library-item";
        button.dataset.mobileLibraryKey = item.key;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(selected));

        const preview = document.createElement("span");
        preview.className = "mobile-library-preview";
        preview.setAttribute("aria-hidden", "true");
        if (item.thumbnail) {
            const img = document.createElement("img");
            img.src = item.thumbnail;
            img.alt = "";
            preview.appendChild(img);
        } else {
            preview.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"></path></svg>`;
        }

        const body = document.createElement("span");
        body.className = "mobile-library-item-body";
        const title = document.createElement("strong");
        title.textContent = item.title || "Library item";
        const detail = document.createElement("span");
        detail.textContent = item.detail || item.sessionTitle || item.meta || "Fauna Library";
        const meta = document.createElement("small");
        meta.textContent = item.meta || item.type || "";
        body.append(title, detail, meta);

        const check = document.createElement("span");
        check.className = "mobile-library-check";
        check.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`;
        button.append(preview, body, check);
        mobileLibraryPickerList.appendChild(button);
    });
    mobileLibraryPickerEmpty.hidden = items.length > 0;
    if (mobileLibraryPickerAttach) {
        const count = state.libraryPickerSelectedKeys.size;
        mobileLibraryPickerAttach.disabled = count === 0;
        mobileLibraryPickerAttach.textContent = count > 0 ? `Attach ${count}` : "Attach selected";
    }
}

async function openMobileLibraryPicker() {
    ensureMobileLibraryPicker();
    closeComposerPopover(document.getElementById("attachmentMenu"), document.getElementById("uploadButton"));
    try {
        setComposerStatus("Loading Fauna Library");
        const data = await api("/api/library?limit=160");
        state.libraryPickerItems = Array.isArray(data.items) ? data.items : [];
        state.libraryPickerSelectedKeys = new Set();
        if (mobileLibraryPickerSearch) mobileLibraryPickerSearch.value = "";
        mobileLibraryPicker.hidden = false;
        mobileLibraryPicker.setAttribute("aria-hidden", "false");
        document.body.classList.add("mobile-library-open");
        renderMobileLibraryPicker();
        window.setTimeout(() => mobileLibraryPickerSearch?.focus?.({ preventScroll: true }), 0);
        setComposerStatus(state.libraryPickerItems.length ? "Library loaded" : "Library is empty");
    } catch (error) {
        setComposerStatus(error.message || "Could not load Fauna Library");
    }
}

function attachSelectedMobileLibraryItems() {
    const selected = state.libraryPickerItems.filter(item => state.libraryPickerSelectedKeys.has(item.key));
    if (selected.length === 0) return;
    const existing = new Set(state.libraryAttachments.map(item => item.key));
    const accepted = selected.filter(item => item.key && !existing.has(item.key)).slice(0, MAX_MOBILE_ATTACHMENTS - state.attachments.length - state.libraryAttachments.length);
    if (accepted.length === 0) {
        closeMobileLibraryPicker();
        setComposerStatus("Selected Library items are already attached.");
        return;
    }
    state.libraryAttachments = [...state.libraryAttachments, ...accepted];
    renderMobileAttachmentPreviews();
    updateComposerState();
    closeMobileLibraryPicker();
    setComposerStatus(`${accepted.length} Library item${accepted.length === 1 ? "" : "s"} attached`);
}

function formatRemoteModelSize(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let amount = bytes;
    let unitIndex = 0;
    while (amount >= 1024 && unitIndex < units.length - 1) {
        amount /= 1024;
        unitIndex += 1;
    }
    return `${amount >= 10 || unitIndex === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[unitIndex]}`;
}

function getRemoteModelShortLabel(modelId = "") {
    const id = String(modelId || "").trim();
    const short = id.split("/").pop() || id;
    return short.length > 26 ? `${short.slice(0, 23)}...` : short;
}

function remoteOllamaModelIdsMatch(left = "", right = "") {
    const normalize = value => String(value || "").trim().replace(/:latest$/i, "");
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function getRemoteComposerModelOptions(modelState = {}) {
    const allRecords = Array.isArray(modelState.installedOllamaModelRecords)
        ? modelState.installedOllamaModelRecords
        : (Array.isArray(modelState.installedOllamaModels)
            ? modelState.installedOllamaModels.map(id => ({ id, name: id }))
            : []);
    const records = allRecords.filter(record => record?.chatCapable !== false);
    const localModels = records.map(record => {
        const id = String(record?.id || record?.name || "").trim();
        const source = record?.source === "huggingface" || /^hf\.co\//i.test(id) ? "Hugging Face" : "Ollama";
        const meta = [source, record?.parameterSize, record?.quantization, formatRemoteModelSize(record?.size)]
            .map(value => String(value || "").trim())
            .filter(Boolean)
            .join(" · ");
        return {
            id,
            label: id,
            shortLabel: getRemoteModelShortLabel(id),
            meta: meta || source,
            state: "installed",
            provider: "local"
        };
    }).filter(model => model.id);

    const localModel = String(modelState.localModel || "").trim();
    const matchingActiveLocalModel = localModels.find(model => remoteOllamaModelIdsMatch(model.id, localModel));
    if (modelState.provider === "local" && matchingActiveLocalModel) {
        matchingActiveLocalModel.id = localModel;
        matchingActiveLocalModel.shortLabel = getRemoteModelShortLabel(localModel);
    }
    if (modelState.provider === "local" && localModel && !matchingActiveLocalModel) {
        const activeRuntimeRecord = allRecords.find(record => remoteOllamaModelIdsMatch(record?.id || record?.name, localModel));
        const isUnavailable = activeRuntimeRecord?.chatCapable === false;
        localModels.unshift({
            id: localModel,
            label: localModel,
            shortLabel: getRemoteModelShortLabel(localModel),
            meta: `${/^hf\.co\//i.test(localModel) ? "Hugging Face" : "Ollama"} · ${isUnavailable ? "No chat" : "Missing on PC"}`,
            state: isUnavailable ? "unavailable" : "missing",
            provider: "local"
        });
    }

    const openAiModel = String(modelState.openAiModel || "").trim();
    if (openAiModel && !localModels.some(model => model.id === openAiModel)) {
        localModels.push({
            id: openAiModel,
            label: openAiModel,
            shortLabel: getRemoteModelShortLabel(openAiModel),
            meta: "OpenAI · Connected PC",
            state: "installed",
            provider: "openai"
        });
    }

    const activeModel = String(modelState.modelId || "").trim();
    return localModels.sort((left, right) => Number(right.id === activeModel) - Number(left.id === activeModel));
}

function syncRemoteModelSwitcherFromSettings() {
    if (!state.modelSwitcher || !state.settings.length) return;
    const provider = String(getSetting(REMOTE_AI_PROVIDER_SETTING_KEY)?.value || state.modelState?.provider || "local");
    const settingKey = provider === "openai" ? REMOTE_OPENAI_MODEL_SETTING_KEY : REMOTE_LOCAL_MODEL_SETTING_KEY;
    const modelId = String(getSetting(settingKey)?.value || state.modelState?.modelId || "").trim();
    if (!modelId) return;
    state.modelState = { ...(state.modelState || {}), provider, modelId };
    state.modelSwitcher.setActive(modelId);
}

async function selectRemoteComposerModel(modelId, option = {}) {
    const previousModel = String(state.modelState?.modelId || "").trim();
    const provider = option.provider === "openai" ? "openai" : "local";
    const modelSettingKey = provider === "openai" ? REMOTE_OPENAI_MODEL_SETTING_KEY : REMOTE_LOCAL_MODEL_SETTING_KEY;
    try {
        setStatus(`Switching to ${getRemoteModelShortLabel(modelId)}`);
        const data = await api("/api/settings", {
            method: "POST",
            body: JSON.stringify({
                settings: {
                    [REMOTE_AI_PROVIDER_SETTING_KEY]: provider,
                    [modelSettingKey]: modelId
                }
            })
        });
        state.settings = Array.isArray(data.settings) ? data.settings : state.settings;
        state.modelState = {
            ...(state.modelState || {}),
            provider,
            modelId,
            ...(provider === "openai" ? { openAiModel: modelId } : { localModel: modelId })
        };
        state.modelSwitcher?.setActive(modelId);
        setStatus(`Using ${getRemoteModelShortLabel(modelId)} on PC`);
    } catch (error) {
        if (previousModel) state.modelSwitcher?.setActive(previousModel);
        setStatus(error.message || "Could not switch the PC model", "error");
    }
}

async function refreshRemoteModelSwitcher() {
    const modelState = await api("/api/models");
    state.modelState = modelState;
    const models = getRemoteComposerModelOptions(modelState);
    state.modelSwitcher?.setModels(models, modelState.modelId);
    return modelState;
}

async function installRemoteModelSwitcher() {
    const host = document.getElementById("modelSwitcherHost");
    if (!host) return;
    try {
        const [{ createModelSwitcher }, modelState] = await Promise.all([
            import("/modules/model-switcher.js"),
            api("/api/models")
        ]);
        state.modelState = modelState;
        state.modelSwitcher = createModelSwitcher({
            host,
            models: getRemoteComposerModelOptions(modelState),
            activeModel: modelState.modelId,
            onSelect: (modelId, option) => void selectRemoteComposerModel(modelId, option),
            idPrefix: "mobile"
        });
    } catch {
        host.textContent = "PC model";
    }
}

async function hydrateDesktopComposer() {
    await installRemoteModelSwitcher();

    messageInput = document.getElementById("prompt");
    sendButton = document.getElementById("sendButton");
    composerFileInput = document.getElementById("fileInput");
    composerPreviewContainer = document.getElementById("previewContainer");
    if (!messageInput || !sendButton) {
        throw new Error("Desktop composer controls are missing.");
    }
    if (composerFileInput) {
        composerFileInput.multiple = true;
        composerFileInput.setAttribute("accept", "image/*,.pdf,.txt,.md,.js,.py,.json,.csv");
        composerFileInput.addEventListener("change", event => {
            addMobileAttachments(event.target.files);
            composerFileInput.value = "";
        });
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

    document.getElementById("attachmentUploadFile")?.addEventListener("click", () => {
        closeComposerPopover(attachmentMenu, uploadButton);
        composerFileInput?.click();
    });
    document.getElementById("attachmentChooseLibrary")?.addEventListener("click", () => {
        closeComposerPopover(attachmentMenu, uploadButton);
        void openMobileLibraryPicker();
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
        throw new Error("Could not reach the PC. Check the LAN connection or secure HTTPS tunnel and confirm Phone Sync is enabled.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
        const message = response.status === 401
            ? "Token was rejected. Copy the current token from Phone Sync again."
            : data.error || `HTTP ${response.status}`;
        if (response.status === 401) {
            storeToken("");
            if (isNativeAndroidShell()) openConnectionManager();
            else showPairing();
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

function getSettingsPaneTitle(pane = state.activeSettingsPane) {
    return SETTINGS_PANE_TITLES[pane] || "Settings";
}

function setMobileSettingsPane(pane = "general") {
    state.activeSettingsPane = pane;
    mobileSettingsNavButtons.forEach(button => {
        const active = button.dataset.mobileSettingsPane === pane;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    mobileSettingsPanes.forEach(panel => {
        const active = panel.dataset.mobileSettingsPanel === pane;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
    });
    if (mobileSettingsTitle) mobileSettingsTitle.textContent = getSettingsPaneTitle(pane);
    filterMobileSettings();
}

function updatePhoneSettingsPanel() {
    updateActivePcUi();
    if (phoneDeviceName) phoneDeviceName.textContent = state.deviceName || "Fauna Phone";
    if (phoneDeviceMeta) {
        phoneDeviceMeta.textContent = [
            state.devicePlatform || "mobile",
            state.deviceId ? `ID ${state.deviceId}` : ""
        ].filter(Boolean).join(" / ");
    }
}

function updateMobileChatModeClass() {
    const existingChat = Boolean(state.activeChatId && !state.isComposingNewChat);
    document.body.classList.toggle("mobile-existing-chat", existingChat);
    document.body.classList.toggle("mobile-new-chat", !existingChat);
    document.querySelector(".app-view .input-wrapper")?.classList.toggle("has-chat-content", existingChat);
}

function openSettingsPanel() {
    if (!settingsPanel) return;
    closeMobileChatMenu();
    settingsPanel.hidden = false;
    settingsPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-settings-open");
    document.body.classList.add("settings-modal-open");
    updatePhoneSettingsPanel();
    void loadRemoteSettings();
}

function closeSettingsPanel() {
    if (!settingsPanel) return;
    settingsPanel.hidden = true;
    settingsPanel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-settings-open");
    document.body.classList.remove("settings-modal-open");
}

function isCompactLayout() {
    return window.matchMedia("(max-width: 760px)").matches;
}

function setChatSidebarOpen(open) {
    const nextOpen = Boolean(open);
    document.body.classList.toggle("chat-sidebar-open", nextOpen);
    if (chatSidebarButton) chatSidebarButton.setAttribute("aria-expanded", String(nextOpen));
    if (chatSidebar) chatSidebar.setAttribute("aria-hidden", String(!nextOpen && isCompactLayout()));
    if (sidebarBackdrop) sidebarBackdrop.hidden = !nextOpen;
}

function openChatSidebar() {
    setChatSidebarOpen(true);
}

function closeChatSidebar() {
    closeMobileChatMenu();
    setChatSidebarOpen(false);
}

function closeChatSidebarOnCompact() {
    if (isCompactLayout()) closeChatSidebar();
}

function setupChatSidebarGestures() {
    const edgeWidth = 96;
    const threshold = 46;

    const startTracking = event => {
        if (settingsPanel && !settingsPanel.hidden) return;
        if (!appView || appView.hidden) return;
        const touch = event.touches?.[0];
        if (!touch) return;
        const sidebarOpen = document.body.classList.contains("chat-sidebar-open");
        const edgeStart = touch.clientX <= edgeWidth;
        if (!sidebarOpen && !edgeStart) return;
        sidebarGesture = {
            startX: touch.clientX,
            startY: touch.clientY,
            sidebarOpen
        };
    };

    const resolveTracking = touch => {
        if (!sidebarGesture) return;
        if (!touch) {
            sidebarGesture = null;
            return;
        }
        const deltaX = touch.clientX - sidebarGesture.startX;
        const deltaY = touch.clientY - sidebarGesture.startY;
        const horizontal = Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
        if (horizontal && deltaX > 0 && !sidebarGesture.sidebarOpen) openChatSidebar();
        if (horizontal && deltaX < 0 && sidebarGesture.sidebarOpen) closeChatSidebar();
        if (horizontal) sidebarGesture = null;
    };

    const moveTracking = event => {
        resolveTracking(event.touches?.[0]);
    };

    const finishTracking = event => {
        resolveTracking(event.changedTouches?.[0]);
        sidebarGesture = null;
    };

    document.addEventListener("touchstart", startTracking, { passive: true });
    document.addEventListener("touchmove", moveTracking, { passive: true });
    document.addEventListener("touchend", finishTracking, { passive: true });
    window.addEventListener("resize", () => {
        if (!isCompactLayout()) closeChatSidebar();
        if (chatSidebar) chatSidebar.setAttribute("aria-hidden", String(isCompactLayout() && !document.body.classList.contains("chat-sidebar-open")));
    });
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

function getSettingsSearchQuery() {
    return String(mobileSettingsSearchInput?.value || "").trim().toLowerCase();
}

function filterMobileSettings() {
    const query = getSettingsSearchQuery();
    if (mobileSettingsSearchClear) mobileSettingsSearchClear.hidden = !query;
    if (!settingsPanel) return;
    settingsPanel.classList.toggle("settings-search-active", Boolean(query));

    const rows = Array.from(settingsPanel.querySelectorAll(".mobile-setting-row"));
    let matchCount = 0;
    rows.forEach(row => {
        const text = String(row.dataset.searchText || row.textContent || "").toLowerCase();
        const match = !query || text.includes(query);
        row.hidden = !match;
        row.classList.toggle("settings-search-highlight", Boolean(query && match));
        if (match) matchCount += 1;
    });

    Array.from(settingsPanel.querySelectorAll(".mobile-settings-group")).forEach(group => {
        const hasVisibleRow = Array.from(group.querySelectorAll(".mobile-setting-row")).some(row => !row.hidden);
        group.hidden = query ? !hasVisibleRow : false;
        group.classList.toggle("settings-search-highlight", Boolean(query && hasVisibleRow));
    });

    Array.from(settingsPanel.querySelectorAll(".mobile-settings-empty-card")).forEach(card => {
        card.hidden = Boolean(query);
    });

    mobileSettingsNavButtons.forEach(button => {
        const pane = button.dataset.mobileSettingsPane || "";
        const panel = mobileSettingsPanes.find(item => item.dataset.mobileSettingsPanel === pane);
        const hasMatch = Boolean(query) && Boolean(panel?.querySelector(".mobile-setting-row:not([hidden])"));
        button.classList.toggle("settings-search-tab-match", hasMatch);
    });

    if (mobileSettingsSearchEmpty) {
        mobileSettingsSearchEmpty.hidden = !query || matchCount > 0;
    }
}

function createSwitchControl(setting) {
    const label = document.createElement("label");
    label.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = normalizeSettingBoolean(setting.storageValue ?? setting.value);
    input.disabled = state.savingSettingKey === setting.key;
    const track = document.createElement("span");
    track.className = "toggle-slider";
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
    row.className = "settings-control-card mobile-setting-row";
    row.dataset.settingKey = setting.key || "";
    row.dataset.searchText = [
        setting.section,
        setting.label,
        setting.description,
        setting.key
    ].filter(Boolean).join(" ");

    const copy = document.createElement("div");
    copy.className = "setting-info mobile-setting-copy";
    const title = document.createElement("strong");
    title.className = "setting-title";
    title.textContent = setting.label || setting.key || "Setting";
    const desc = document.createElement("span");
    desc.className = "setting-desc";
    desc.textContent = setting.description || "";
    copy.append(title, desc);

    row.append(copy, createSettingControl(setting));
    return row;
}

function getMobileSettingPane(setting = {}) {
    const pane = String(setting.pane || "").trim();
    if (SETTINGS_PANE_TITLES[pane]) return pane;
    const section = String(setting.section || "").trim().toLowerCase();
    const paneBySection = {
        appearance: "general",
        updates: "info",
        notifications: "notifications",
        voice: "voice",
        provider: "provider",
        response: "provider",
        agent: "task-models",
        "local workspace": "services",
        "local services": "services",
        media: "services",
        performance: "potato",
        personalization: "personalization"
    };
    return paneBySection[section] || "general";
}

function clearMobileSettingsLists() {
    mobileSettingsLists.forEach(list => list.replaceChildren());
}

function createSettingsEmptyCard(pane) {
    const card = document.createElement("section");
    card.className = "settings-control-card settings-control-card-stacked mobile-settings-empty-card";
    const copy = document.createElement("div");
    copy.className = "setting-info";
    const title = document.createElement("span");
    title.className = "setting-title";
    title.textContent = `${getSettingsPaneTitle(pane)} controls are desktop-only`;
    const desc = document.createElement("span");
    desc.className = "setting-desc";
    desc.textContent = "Open the desktop app for controls that need local UI, files, or charts.";
    copy.append(title, desc);
    card.appendChild(copy);
    return card;
}

function appendSettingsGroupsForPane(pane, settings = []) {
    const list = mobileSettingsLists.get(pane);
    if (!list) return;
    if (settings.length === 0) {
        return;
    }

    const sections = new Map();
    settings.forEach(setting => {
        const section = setting.section || getSettingsPaneTitle(pane);
        if (!sections.has(section)) sections.set(section, []);
        sections.get(section).push(setting);
    });

    sections.forEach((sectionSettings, section) => {
        const group = document.createElement("section");
        group.className = "settings-panel-section mobile-settings-group";
        if (list.childElementCount === 0) group.classList.add("settings-panel-section-first");
        const heading = document.createElement("p");
        heading.className = "provider-section-label";
        heading.textContent = section;
        const stack = document.createElement("div");
        stack.className = "settings-control-stack";
        sectionSettings.forEach(setting => stack.appendChild(createSettingRow(setting)));
        group.append(heading, stack);
        list.appendChild(group);
    });
}

function renderRemoteSettingsList() {
    renderUpdatePanel();

    const autoSetting = getSetting(AUTO_INSTALL_SETTING_KEY);
    if (autoInstallMount) {
        autoInstallMount.replaceChildren();
        if (autoSetting) autoInstallMount.appendChild(createSettingRow(autoSetting));
    }

    clearMobileSettingsLists();
    const visibleSettings = state.settings.filter(setting => setting.key !== AUTO_INSTALL_SETTING_KEY);
    const settingsByPane = new Map(SETTINGS_PANE_ORDER.map(pane => [pane, []]));
    visibleSettings.forEach(setting => {
        const pane = getMobileSettingPane(setting);
        if (!settingsByPane.has(pane)) settingsByPane.set(pane, []);
        settingsByPane.get(pane).push(setting);
    });

    SETTINGS_PANE_ORDER.forEach(pane => {
        const settings = settingsByPane.get(pane) || [];
        appendSettingsGroupsForPane(pane, settings);
        const hasNativePane = pane === "phone" || pane === "info";
        const hasContent = settings.length > 0 || hasNativePane;
        mobileSettingsNavButtons
            .filter(button => button.dataset.mobileSettingsPane === pane)
            .forEach(button => {
                button.hidden = !hasContent;
            });
    });
    if (mobileSettingsNavButtons.find(button => button.dataset.mobileSettingsPane === state.activeSettingsPane)?.hidden) {
        setMobileSettingsPane("general");
    }
    filterMobileSettings();
}

async function loadRemoteSettings() {
    try {
        setSettingsStatus("Syncing");
        const data = await api("/api/settings");
        state.settings = Array.isArray(data.settings) ? data.settings : [];
        state.update = data.update || state.update;
        syncRemoteModelSwitcherFromSettings();
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

async function renameMobileChat(chatId, title) {
    const cleanTitle = String(title || "").replace(/\s+/g, " ").trim();
    if (!chatId || !cleanTitle) {
        setStatus("Chat name is empty.", "error");
        return;
    }
    try {
        setStatus("Renaming");
        const data = await api(`/api/chats/${encodeURIComponent(chatId)}`, {
            method: "PATCH",
            body: JSON.stringify({ title: cleanTitle })
        });
        if (data.chat && state.activeChat?.id === chatId) state.activeChat = data.chat;
        await loadChats({ keepSelection: true, forceActiveChat: state.activeChatId === chatId });
        setStatus("Renamed");
    } catch (error) {
        setStatus(error.message, "error");
    }
}

async function setMobileChatPinned(chatId, pinned) {
    if (!chatId) return;
    try {
        setStatus(pinned ? "Pinning" : "Unpinning");
        const data = await api(`/api/chats/${encodeURIComponent(chatId)}/pin`, {
            method: "POST",
            body: JSON.stringify({ pinned })
        });
        if (data.chat && state.activeChat?.id === chatId) state.activeChat = data.chat;
        await loadChats({ keepSelection: true, forceActiveChat: state.activeChatId === chatId });
        setStatus(pinned ? "Pinned" : "Unpinned");
    } catch (error) {
        setStatus(error.message, "error");
    }
}

async function setMobileChatArchived(chatId, archived) {
    if (!chatId) return;
    try {
        setStatus(archived ? "Archiving" : "Restoring");
        const data = await api(`/api/chats/${encodeURIComponent(chatId)}/archive`, {
            method: "POST",
            body: JSON.stringify({ archived })
        });
        if (archived && state.activeChatId === chatId) {
            state.activeChatId = data.activeChatId || "";
            state.activeChat = null;
        }
        await loadChats({ keepSelection: true, forceActiveChat: true, scrollActiveChat: "bottom" });
        setStatus(archived ? "Archived" : "Restored");
    } catch (error) {
        setStatus(error.message, "error");
    }
}

async function deleteMobileChat(chatId) {
    if (!chatId) return;
    try {
        setStatus("Deleting");
        const data = await api(`/api/chats/${encodeURIComponent(chatId)}`, {
            method: "DELETE"
        });
        state.chats = Array.isArray(data.chats) ? data.chats : state.chats.filter(chat => chat.id !== chatId);
        if (state.activeChatId === chatId) {
            state.activeChatId = data.activeChatId || state.chats[0]?.id || "";
            state.activeChat = null;
        }
        await loadChats({ keepSelection: true, forceActiveChat: true, scrollActiveChat: "bottom" });
        setStatus("Deleted");
    } catch (error) {
        setStatus(error.message, "error");
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

function getChatListSignature(chats = []) {
    return JSON.stringify((Array.isArray(chats) ? chats : []).map(chat => [
        chat?.id || "",
        chat?.title || "",
        chat?.preview || "",
        chat?.updatedAt || "",
        Boolean(chat?.pinned),
        Boolean(chat?.archived),
        Boolean(chat?.active)
    ]));
}

function getChatSummarySignature(chat = null) {
    if (!chat) return "";
    return JSON.stringify([
        chat.id || "",
        chat.title || "",
        chat.preview || "",
        chat.updatedAt || "",
        Boolean(chat.pinned),
        Boolean(chat.archived),
        Boolean(chat.active)
    ]);
}

function getMessageRenderSignature(message = {}) {
    const toolItems = Array.isArray(message.toolActivity || message.faunaToolActivity)
        ? (message.toolActivity || message.faunaToolActivity)
        : [];
    return [
        message.id || "",
        message.historyIndex ?? "",
        message.role || "",
        message.createdAt || "",
        getMobileMessageText(message),
        typeof message.error === "string" ? message.error : (message.error?.message || ""),
        toolItems.length,
        toolItems.map(item => [
            item?.id || "",
            item?.kind || "",
            item?.label || "",
            item?.detail || "",
            item?.meta || "",
            item?.query || "",
            item?.error || "",
            Array.isArray(item?.sources) ? item.sources.length : 0
        ].join("\u001f")).join("\u001e")
    ].join("\u001d");
}

function getChatRenderSignature(chat = null) {
    if (!chat) return "";
    const messages = Array.isArray(chat.messages) ? chat.messages : [];
    return JSON.stringify([
        chat.id || "",
        chat.title || "",
        chat.updatedAt || "",
        Boolean(chat.pinned),
        Boolean(chat.archived),
        messages.map(getMessageRenderSignature)
    ]);
}

function isMessageListNearBottom(threshold = 96) {
    if (!messageList) return true;
    return messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight <= threshold;
}

function markMessageListScrollIntent() {
    state.isUserScrollingMessages = true;
    window.clearTimeout(state.messageScrollIdleTimer);
    state.messageScrollIdleTimer = window.setTimeout(() => {
        state.isUserScrollingMessages = false;
    }, 900);
}

function createPinnedIcon() {
    const icon = document.createElement("span");
    icon.className = "pin-glyph";
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path></svg>`;
    return icon;
}

function closeMobileChatMenu() {
    if (activeMobileChatMenu) {
        activeMobileChatMenu.remove();
        activeMobileChatMenu = null;
    }
    document.querySelectorAll(".chat-row.menu-open").forEach(row => row.classList.remove("menu-open"));
}

function createMobileMenuItem(action, label, iconMarkup, onSelect) {
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
        closeMobileChatMenu();
        void onSelect();
    });
    return button;
}

function positionMobileChatMenu(menu, anchor) {
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const gap = 8;
    menu.style.left = "0px";
    menu.style.top = "0px";
    const menuRect = menu.getBoundingClientRect();
    const left = Math.max(gap, Math.min(viewportWidth - menuRect.width - gap, rect.right - menuRect.width));
    let top = rect.bottom + 6;
    if (top + menuRect.height > viewportHeight - gap) top = Math.max(gap, rect.top - menuRect.height - 6);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
}

function openMobileChatMenu(chat, anchor) {
    if (!chat?.id || !anchor) return;
    closeMobileChatMenu();
    anchor.classList.add("menu-open");
    const menu = document.createElement("div");
    menu.className = "chat-session-menu mobile-chat-context-menu";
    menu.setAttribute("role", "menu");
    menu.append(
        createMobileMenuItem("info", "Chat info", '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>', () => openMobileChatInfo(chat.id)),
        createMobileMenuItem("rename", "Rename chat", '<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path>', () => openMobileRenameDialog(chat)),
        createMobileMenuItem("pin", chat.pinned ? "Unpin chat" : "Pin chat", '<path d="M12 17v5"></path><path d="m5 14 4-4V4h6v6l4 4Z"></path>', () => setMobileChatPinned(chat.id, !chat.pinned)),
        createMobileMenuItem("archive", chat.archived ? "Restore chat" : "Archive chat", '<path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path><path d="M3 8l2-5h14l2 5"></path><path d="M10 12h4"></path>', () => setMobileChatArchived(chat.id, !chat.archived)),
        createMobileMenuItem("delete", "Delete chat", '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>', () => openMobileDeleteDialog(chat))
    );
    document.body.appendChild(menu);
    activeMobileChatMenu = menu;
    positionMobileChatMenu(menu, anchor);
    window.setTimeout(() => menu.querySelector("button")?.focus({ preventScroll: true }), 0);
}

function setupChatRowLongPress(row, chat, onActivate) {
    const clearPress = () => {
        window.clearTimeout(chatLongPressTimer);
        chatLongPressTimer = 0;
    };
    row.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        clearPress();
        const startX = event.clientX;
        const startY = event.clientY;
        chatLongPressTimer = window.setTimeout(() => {
            chatLongPressSuppressClick = true;
            openMobileChatMenu(chat, row);
            if (navigator.vibrate) navigator.vibrate(10);
        }, 520);
        const cancelIfMoved = moveEvent => {
            if (Math.abs(moveEvent.clientX - startX) > 10 || Math.abs(moveEvent.clientY - startY) > 10) {
                clearPress();
                row.removeEventListener("pointermove", cancelIfMoved);
            }
        };
        row.addEventListener("pointermove", cancelIfMoved);
        row.addEventListener("pointerup", () => row.removeEventListener("pointermove", cancelIfMoved), { once: true });
        row.addEventListener("pointercancel", () => row.removeEventListener("pointermove", cancelIfMoved), { once: true });
    });
    row.addEventListener("pointerup", clearPress);
    row.addEventListener("pointerleave", clearPress);
    row.addEventListener("pointercancel", clearPress);
    row.addEventListener("contextmenu", event => {
        event.preventDefault();
        chatLongPressSuppressClick = true;
        openMobileChatMenu(chat, row);
    });
    row.addEventListener("click", event => {
        if (chatLongPressSuppressClick) {
            event.preventDefault();
            chatLongPressSuppressClick = false;
            return;
        }
        closeMobileChatMenu();
        onActivate();
    });
}

function closeMobileDialog(dialog) {
    dialog?.remove();
}

function createMobileDialog(titleText) {
    const overlay = document.createElement("div");
    overlay.className = "mobile-dialog-backdrop";
    overlay.setAttribute("role", "presentation");
    const dialog = document.createElement("section");
    dialog.className = "mobile-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const title = document.createElement("h2");
    title.textContent = titleText;
    dialog.appendChild(title);
    overlay.appendChild(dialog);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeMobileDialog(overlay);
    });
    document.body.appendChild(overlay);
    return { overlay, dialog };
}

function createMobileDialogActions(...buttons) {
    const actions = document.createElement("div");
    actions.className = "mobile-dialog-actions";
    actions.append(...buttons);
    return actions;
}

function createDialogButton(label, kind = "secondary") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kind === "primary" ? "primary-button" : "small-button";
    if (kind === "danger") button.classList.add("mobile-settings-danger");
    button.textContent = label;
    return button;
}

function formatInfoDate(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function createInfoRow(label, value) {
    const row = document.createElement("div");
    row.className = "mobile-chat-info-row";
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("strong");
    val.textContent = String(value || "None");
    row.append(key, val);
    return row;
}

async function openMobileChatInfo(chatId) {
    try {
        const data = await api(`/api/chats/${encodeURIComponent(chatId)}`);
        const chat = data.chat || {};
        const messages = Array.isArray(chat.messages) ? chat.messages : [];
        const { overlay, dialog } = createMobileDialog("Chat info");
        const subtitle = document.createElement("p");
        subtitle.className = "mobile-dialog-subtitle";
        subtitle.textContent = chat.title || "Current Session";
        const grid = document.createElement("div");
        grid.className = "mobile-chat-info-grid";
        grid.append(
            createInfoRow("Status", [chat.pinned ? "Pinned" : "", chat.archived ? "Archived" : "Active"].filter(Boolean).join(" / ")),
            createInfoRow("Created", formatInfoDate(chat.createdAt)),
            createInfoRow("Updated", formatInfoDate(chat.updatedAt)),
            createInfoRow("Messages", messages.length),
            createInfoRow("User messages", messages.filter(message => message.role === "user").length),
            createInfoRow("AI messages", messages.filter(message => message.role === "assistant").length),
            createInfoRow("Chat ID", chat.id || chatId)
        );
        const closeButton = createDialogButton("Close");
        closeButton.addEventListener("click", () => closeMobileDialog(overlay));
        dialog.append(subtitle, grid, createMobileDialogActions(closeButton));
        window.setTimeout(() => closeButton.focus({ preventScroll: true }), 0);
    } catch (error) {
        setStatus(error.message, "error");
    }
}

function openMobileRenameDialog(chat) {
    const { overlay, dialog } = createMobileDialog("Rename chat");
    const label = document.createElement("label");
    label.className = "mobile-dialog-field";
    const labelText = document.createElement("span");
    labelText.textContent = "Chat name";
    const input = document.createElement("input");
    input.className = "mobile-setting-input";
    input.type = "text";
    input.maxLength = 80;
    input.value = chat.title || "Current Session";
    label.append(labelText, input);
    const cancelButton = createDialogButton("Cancel");
    const saveButton = createDialogButton("Save", "primary");
    cancelButton.addEventListener("click", () => closeMobileDialog(overlay));
    saveButton.addEventListener("click", async () => {
        await renameMobileChat(chat.id, input.value);
        closeMobileDialog(overlay);
    });
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            saveButton.click();
        }
    });
    dialog.append(label, createMobileDialogActions(cancelButton, saveButton));
    window.setTimeout(() => {
        input.focus({ preventScroll: true });
        input.select();
    }, 0);
}

function openMobileDeleteDialog(chat) {
    const { overlay, dialog } = createMobileDialog("Delete chat");
    const copy = document.createElement("p");
    copy.className = "mobile-dialog-subtitle";
    copy.textContent = `Delete "${chat.title || "Current Session"}" from the desktop chat history.`;
    const cancelButton = createDialogButton("Cancel");
    const deleteButton = createDialogButton("Delete", "danger");
    cancelButton.addEventListener("click", () => closeMobileDialog(overlay));
    deleteButton.addEventListener("click", async () => {
        await deleteMobileChat(chat.id);
        closeMobileDialog(overlay);
    });
    dialog.append(copy, createMobileDialogActions(cancelButton, deleteButton));
}

function normalizeHistoryIndex(value) {
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 ? index : null;
}

function getMessageHistoryIndex(message, fallbackIndex) {
    return normalizeHistoryIndex(message?.historyIndex) ?? normalizeHistoryIndex(fallbackIndex);
}

function getMobileMessageText(message = {}) {
    const errorText = getMobileErrorText(message);
    return String(message.content || errorText || "").trim();
}

function getMobileErrorText(message = {}) {
    const info = getMobileErrorInfo(message);
    return info?.message || info?.detail || "";
}

function getMobileErrorInfo(message = {}) {
    const rawError = message?.faunaError || message?.error;
    if (!rawError) return null;
    if (typeof rawError === "string") {
        const detail = rawError.trim();
        return {
            title: "Something went wrong",
            message: detail || "Fauna could not complete this request.",
            detail: detail || ""
        };
    }
    if (typeof rawError !== "object") return null;

    const title = String(rawError.title || rawError.errorTitle || "").trim();
    const messageText = String(rawError.message || rawError.error || rawError.summary || "").trim();
    const detail = String(rawError.detail || rawError.message || rawError.error || "").trim();
    const fallback = String(rawError.toString?.() || "").trim();
    return {
        title: title || "Something went wrong",
        message: messageText || detail || (fallback && fallback !== "[object Object]" ? fallback : "Fauna could not complete this request."),
        detail: detail || messageText || fallback || ""
    };
}

function renderMobileErrorCard(target, errorInfo = {}) {
    if (!target) return;

    const messageText = String(errorInfo.message || "Fauna could not complete this request.").trim();
    const detailText = String(errorInfo.detail || messageText || "").trim();
    const titleText = String(errorInfo.title || "Something went wrong").trim() || "Something went wrong";

    target.classList.add("error-bubble");
    target.classList.remove("tool-activity-bubble", "plain-output", "creation-progress-bubble");
    target.innerHTML = "";
    target.parentElement?.querySelector(".assistant-message-actions")?.remove();

    const card = document.createElement("div");
    card.className = "error-card";
    card.setAttribute("role", "alert");

    const icon = document.createElement("div");
    icon.className = "error-card-icon";
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01"></path><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path></svg>`;

    const body = document.createElement("div");
    body.className = "error-card-body";

    const title = document.createElement("div");
    title.className = "error-card-title";
    title.textContent = titleText;

    const message = document.createElement("div");
    message.className = "error-card-message";
    message.textContent = messageText;

    const actions = document.createElement("div");
    actions.className = "error-card-actions";
    let detail = null;

    if (detailText) {
        const detailButton = document.createElement("button");
        detailButton.className = "error-card-action";
        detailButton.type = "button";
        detailButton.textContent = "Details";

        const copyButton = document.createElement("button");
        copyButton.className = "error-card-action";
        copyButton.type = "button";
        copyButton.textContent = "Copy";

        detail = document.createElement("div");
        detail.className = "error-card-detail";
        detail.hidden = true;
        detail.textContent = detailText;

        detailButton.addEventListener("click", () => {
            detail.hidden = !detail.hidden;
            detailButton.textContent = detail.hidden ? "Details" : "Hide details";
        });

        copyButton.addEventListener("click", async () => {
            try {
                await writeTextToClipboard(detailText);
                copyButton.textContent = "Copied";
                window.setTimeout(() => {
                    copyButton.textContent = "Copy";
                }, 1400);
            } catch (error) {
                setStatus("Copy failed. Select the details manually.", "error");
            }
        });

        actions.appendChild(detailButton);
        actions.appendChild(copyButton);
    }

    if (actions.childElementCount > 0) body.appendChild(actions);
    if (detail) body.appendChild(detail);

    card.appendChild(icon);
    card.appendChild(body);
    target.appendChild(card);
}

function getAssistantActionIcon(action) {
    const icons = {
        copy: '<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
        regenerate: '<path d="M21 12a9 9 0 0 1-15.5 6.2"></path><path d="M3 12A9 9 0 0 1 18.5 5.8"></path><path d="M21 3v6h-6"></path><path d="M3 21v-6h6"></path>',
        fork: '<circle cx="6" cy="5" r="3"></circle><circle cx="18" cy="19" r="3"></circle><circle cx="6" cy="19" r="3"></circle><path d="M6 8v8"></path><path d="M8.5 6.5C13.4 8 16.2 11.2 18 16"></path>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[action] || icons.copy}</svg>`;
}

function createAssistantActionButton(action, label, tooltip) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `assistant-action-btn assistant-action-${action}`;
    button.dataset.assistantAction = action;
    button.dataset.tooltip = tooltip || label;
    button.setAttribute("aria-label", tooltip || label);
    button.innerHTML = getAssistantActionIcon(action);
    return button;
}

function formatMessageActionTime(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createMessageActionTime(value, label) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return null;
    const time = document.createElement("time");
    time.className = "message-action-time";
    time.dateTime = date.toISOString();
    time.textContent = formatMessageActionTime(date);
    time.setAttribute("aria-label", `${label} ${date.toLocaleString()}`);
    return time;
}

async function writeTextToClipboard(value = "") {
    const text = String(value || "");
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("Copy failed.");
}

function validatePortableSettingsBackup(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The file is not a Fauna settings backup.");
    if (value.schema !== "fauna-portable-settings" || Number(value.version) !== 1) throw new Error("This Fauna settings backup format is not supported.");
    if (!value.settings || typeof value.settings !== "object" || Array.isArray(value.settings)) throw new Error("The backup does not contain a settings map.");
    const settingCount = Object.keys(value.settings).length;
    if (!settingCount) throw new Error("The backup does not contain portable settings.");
    return { backup: value, settingCount };
}

function downloadPortableSettingsBackup(json) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Fauna-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function openPortableSettingsExportDialog() {
    if (mobileSettingsExportButton) mobileSettingsExportButton.disabled = true;
    try {
        setSettingsStatus("Preparing portable settings");
        const data = await api("/api/settings/portable");
        const { backup, settingCount } = validatePortableSettingsBackup(data.backup);
        const json = `${JSON.stringify(backup, null, 2)}\n`;
        const { overlay, dialog } = createMobileDialog("Export PC settings");
        const copy = document.createElement("p");
        copy.className = "mobile-dialog-subtitle";
        copy.textContent = `${settingCount} portable settings. Chats, API keys, tokens, paths, and local endpoints are excluded.`;
        const area = document.createElement("textarea");
        area.className = "mobile-backup-textarea";
        area.readOnly = true;
        area.value = json;
        area.setAttribute("aria-label", "Portable Fauna settings JSON");
        const closeButton = createDialogButton("Close");
        const copyButton = createDialogButton("Copy JSON", "primary");
        closeButton.addEventListener("click", () => closeMobileDialog(overlay));
        copyButton.addEventListener("click", async () => {
            try {
                await writeTextToClipboard(json);
                copyButton.textContent = "Copied";
                setSettingsStatus("Settings backup copied", "success");
            } catch (error) {
                setSettingsStatus(error.message, "error");
            }
        });
        const buttons = [closeButton];
        if (!isNativeAndroidShell()) {
            const downloadButton = createDialogButton("Download");
            downloadButton.addEventListener("click", () => downloadPortableSettingsBackup(json));
            buttons.push(downloadButton);
        }
        buttons.push(copyButton);
        dialog.append(copy, area, createMobileDialogActions(...buttons));
        setSettingsStatus("Portable settings ready", "success");
    } catch (error) {
        setSettingsStatus(error.message, "error");
    } finally {
        if (mobileSettingsExportButton) mobileSettingsExportButton.disabled = false;
    }
}

function openPortableSettingsImportConfirmation(value, sourceName = "selected backup") {
    let normalized;
    try {
        normalized = validatePortableSettingsBackup(value);
    } catch (error) {
        setSettingsStatus(error.message, "error");
        return;
    }
    const { overlay, dialog } = createMobileDialog("Import PC settings");
    const copy = document.createElement("p");
    copy.className = "mobile-dialog-subtitle";
    copy.textContent = `Apply ${normalized.settingCount} compatible settings from ${sourceName}. Current portable values on this PC will be replaced.`;
    const privacy = document.createElement("p");
    privacy.className = "mobile-dialog-subtitle mobile-dialog-note";
    privacy.textContent = "The import cannot add chats, API keys, Phone Sync tokens, workspace paths, or local endpoints.";
    const cancelButton = createDialogButton("Cancel");
    const importButton = createDialogButton("Import", "primary");
    cancelButton.addEventListener("click", () => closeMobileDialog(overlay));
    importButton.addEventListener("click", async () => {
        importButton.disabled = true;
        try {
            const data = await api("/api/settings/portable", {
                method: "POST",
                body: JSON.stringify({ backup: normalized.backup })
            });
            closeMobileDialog(overlay);
            await loadRemoteSettings();
            setSettingsStatus(`${data.imported || normalized.settingCount} settings imported`, "success");
        } catch (error) {
            importButton.disabled = false;
            setSettingsStatus(error.message, "error");
        }
    });
    dialog.append(copy, privacy, createMobileDialogActions(cancelButton, importButton));
}

async function importPortableSettingsFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
        setSettingsStatus("The settings backup must be smaller than 1 MB.", "error");
        return;
    }
    try {
        const value = JSON.parse(await file.text());
        openPortableSettingsImportConfirmation(value, file.name || "selected backup");
    } catch (error) {
        setSettingsStatus(error instanceof SyntaxError ? "The selected file is not valid JSON." : error.message, "error");
    }
}

function createMobileMessageActions(message, historyIndex, textToCopy) {
    const role = message.role === "user" ? "user" : "assistant";
    const canAssistantActions = message.role === "assistant";
    const actions = document.createElement("div");
    actions.className = role === "user" ? "assistant-message-actions user-message-actions" : "assistant-message-actions";
    if (historyIndex !== null) actions.dataset.messageIndex = String(historyIndex);

    const time = createMessageActionTime(message.createdAt, role === "user" ? "Prompt sent at" : "Response completed at");
    if (role === "user" && time) actions.appendChild(time);

    const copyButton = createAssistantActionButton("copy", role === "user" ? "Copy prompt" : "Copy", role === "user" ? "Copy prompt" : "Copy response");
    copyButton.dataset.copyText = textToCopy || "";
    actions.appendChild(copyButton);

    if (canAssistantActions && historyIndex !== null) {
        actions.appendChild(createAssistantActionButton("regenerate", "Regenerate", "Regenerate response"));
        actions.appendChild(createAssistantActionButton("fork", "Fork", "Fork chat here"));
    }

    if (role !== "user" && time) actions.appendChild(time);
    return actions;
}

function renderMobilePlainText(container, text) {
    container.textContent = text || "Empty message";
}

function createDesktopMessageNode(message = {}, fallbackIndex = 0) {
    const role = message.role === "user" ? "user" : "output";
    const text = getMobileMessageText(message);
    const historyIndex = getMessageHistoryIndex(message, fallbackIndex);
    const errorInfo = getMobileErrorInfo(message);
    const node = document.createElement("div");
    node.className = `message-node ${role}-node`;
    if (historyIndex !== null) node.dataset.historyIndex = String(historyIndex);
    if (message.createdAt) node.dataset.createdAt = String(message.createdAt);

    const avatar = document.createElement("div");
    avatar.className = "avatar-wrapper";
    if (role === "user") {
        avatar.textContent = "U";
    } else {
        avatar.innerHTML = `<svg class="fauna-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.09 6.26L20.82 9.18l-5.09 3.7L17.82 20 12 16.27 6.18 20l1.09-7.12-5.09-3.7 6.73-.92L12 2z"/></svg>`;
        avatar.setAttribute("aria-label", "Fauna");
    }

    const block = document.createElement("div");
    block.className = "bubble-block";

    const bubble = document.createElement("div");
    bubble.className = "bubble markdown";
    if (role === "output") bubble.classList.add("plain-output");
    if (message.error || message.faunaError) bubble.classList.add("error");

    const toolItems = normalizeMobileToolActivityItems(message.toolActivity || message.faunaToolActivity || []);
    const shouldRenderErrorCard = role === "output" && Boolean(errorInfo);
    if (shouldRenderErrorCard) {
        renderMobileErrorCard(bubble, errorInfo);
    } else if (toolItems.length > 0) {
        bubble.classList.add("tool-activity-bubble");
        bubble.appendChild(createMobileToolActivityElement(toolItems));
        if (text) {
            const response = document.createElement("div");
            response.className = "tool-activity-response";
            renderMobilePlainText(response, text);
            bubble.appendChild(response);
        }
    } else {
        renderMobilePlainText(bubble, text);
    }

    block.appendChild(bubble);
    if (!shouldRenderErrorCard && (text || toolItems.length > 0)) {
        block.appendChild(createMobileMessageActions(message, historyIndex, text));
    }
    node.append(avatar, block);
    return node;
}

async function handleMobileMessageAction(event) {
    const button = event.target.closest("[data-assistant-action]");
    if (!button || !messageList?.contains(button)) return;
    const action = button.dataset.assistantAction || "";
    const actionRow = button.closest(".assistant-message-actions");
    const node = button.closest(".message-node");
    const messageIndex = normalizeHistoryIndex(actionRow?.dataset.messageIndex || node?.dataset.historyIndex);

    if (action === "copy") {
        try {
            await writeTextToClipboard(button.dataset.copyText || "");
            button.classList.add("copied");
            window.setTimeout(() => button.classList.remove("copied"), 1300);
            setStatus("Copied");
        } catch (error) {
            setStatus(error.message || "Copy failed", "error");
        }
        return;
    }

    if (!state.activeChatId || messageIndex === null) return;

    try {
        button.classList.add("loading");
        button.disabled = true;
        if (action === "fork") {
            setStatus("Forking");
            const data = await api(`/api/chats/${encodeURIComponent(state.activeChatId)}/fork`, {
                method: "POST",
                body: JSON.stringify({ messageIndex })
            });
            state.activeChatId = data.chat?.id || state.activeChatId;
            state.isComposingNewChat = false;
            await loadChats({ keepSelection: true, forceActiveChat: true, scrollActiveChat: "bottom" });
            setStatus("Forked");
        } else if (action === "regenerate") {
            setStatus("Regenerating");
            await api(`/api/chats/${encodeURIComponent(state.activeChatId)}/regenerate`, {
                method: "POST",
                body: JSON.stringify({ messageIndex })
            });
            window.setTimeout(() => void loadChats({ keepSelection: true, forceActiveChat: true, scrollActiveChat: "bottom" }), 650);
            setStatus("Regenerating on PC");
        }
    } catch (error) {
        setStatus(error.message, "error");
    } finally {
        button.classList.remove("loading");
        button.disabled = false;
    }
}

function normalizeMobileToolActivityItems(items = []) {
    return (Array.isArray(items) ? items : [])
        .map((item, index) => ({
            id: String(item?.id || `mobile-tool-${index}`).trim(),
            kind: String(item?.kind || "tool").trim().toLowerCase() || "tool",
            label: String(item?.label || item?.detail || item?.tool || "Tool").trim(),
            tool: String(item?.tool || item?.toolName || "").trim(),
            detail: String(item?.detail || "").trim(),
            meta: String(item?.meta || item?.status || "").trim(),
            input: String(item?.input || item?.prompt || "").trim(),
            settings: String(item?.settings || "").trim(),
            query: String(item?.query || "").trim(),
            resultCount: Number.isFinite(Number(item?.resultCount)) ? Number(item.resultCount) : null,
            error: String(item?.error || "").trim(),
            sources: Array.isArray(item?.sources)
                ? item.sources.slice(0, 6).map(source => ({
                    title: String(source?.title || source?.url || "Result").trim(),
                    url: String(source?.url || "").trim(),
                    snippet: String(source?.snippet || "").replace(/\s+/g, " ").trim()
                })).filter(source => source.title || source.url || source.snippet)
                : []
        }))
        .filter(item => item.label || item.tool || item.detail || item.input || item.query || item.sources.length || item.error);
}

function getToolActivityCountLabel(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function lowerFirst(value) {
    const text = String(value || "");
    return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
}

function getMobileToolActivitySummary(items = [], fallbackTitle = "Tool activity") {
    const counts = {
        terminal: 0,
        file: 0,
        workspace: 0,
        web: 0,
        image: 0,
        location: 0,
        timer: 0,
        memory: 0,
        thinking: 0,
        tool: 0
    };

    items.forEach(item => {
        if (counts[item.kind] !== undefined) counts[item.kind] += 1;
        else counts.tool += 1;
    });

    const parts = [];
    if (counts.terminal) parts.push(`Ran ${getToolActivityCountLabel(counts.terminal, "command")}`);
    if (counts.file) parts.push(`Viewed ${getToolActivityCountLabel(counts.file, "file")}`);
    if (counts.workspace) parts.push(`Inspected ${getToolActivityCountLabel(counts.workspace, "workspace item")}`);
    if (counts.web) parts.push(`Searched ${getToolActivityCountLabel(counts.web, "source")}`);
    if (counts.image) parts.push(`Used ${getToolActivityCountLabel(counts.image, "image tool")}`);
    if (counts.location) parts.push(`Checked ${getToolActivityCountLabel(counts.location, "location")}`);
    if (counts.timer) parts.push(`Waited on ${getToolActivityCountLabel(counts.timer, "timer")}`);
    if (counts.memory) parts.push(`Checked ${getToolActivityCountLabel(counts.memory, "memory", "memories")}`);
    if (counts.tool) parts.push(`Used ${getToolActivityCountLabel(counts.tool, "tool")}`);

    if (!parts.length && counts.thinking) return "Thinking through next steps";
    if (!parts.length) return fallbackTitle;
    return parts.map((part, index) => index === 0 ? part : lowerFirst(part)).join(", ");
}

function formatMobileToolName(value, fallback = "Tool call") {
    const text = String(value || fallback || "Tool call")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "Tool call";
    return text.replace(/\b[a-z]/g, match => match.toUpperCase());
}

function getMobileToolActivityTag(item) {
    const tags = {
        terminal: "Script",
        file: "File",
        workspace: "Workspace",
        web: "Web",
        image: "Image",
        location: "Location",
        timer: "Timer",
        memory: "Memory",
        thinking: "Thinking"
    };
    return tags[item.kind] || formatMobileToolName(item.tool || item.label, "Tool");
}

function getMobileToolActivityTitle(item) {
    if (item.kind === "web") return item.label || item.query || "Searched the web";
    if (item.kind === "thinking") return item.input || item.detail || item.label || "Thinking through next steps";
    return item.detail || item.label || formatMobileToolName(item.tool);
}

function getMobileToolIconPath(kind) {
    const paths = {
        terminal: `<path d="m5 7 5 5-5 5"></path><path d="M12 19h7"></path>`,
        file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path>`,
        workspace: `<path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path>`,
        web: `<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a15 15 0 0 1 0 18"></path><path d="M12 3a15 15 0 0 0 0 18"></path>`,
        image: `<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path>`,
        timer: `<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2"></path><path d="M9 2h6"></path>`,
        memory: `<path d="M6 4h12v16H6z"></path><path d="M9 8h6"></path><path d="M9 12h6"></path><path d="M9 16h4"></path>`,
        thinking: `<path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3Z"></path><path d="M9 22h6"></path>`,
        done: `<path d="M20 6 9 17l-5-5"></path>`
    };
    return paths[kind] || `<path d="M12 3v18"></path><path d="M3 12h18"></path>`;
}

function createMobileToolIcon(kind) {
    const wrap = document.createElement("span");
    wrap.className = "tool-activity-icon-wrap";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `<svg class="tool-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${getMobileToolIconPath(kind)}</svg>`;
    return wrap;
}

function appendToolDetailField(parent, label, value, { code = false } = {}) {
    const clean = String(value || "").trim();
    if (!clean) return;
    const field = document.createElement("div");
    field.className = "tool-activity-detail-field";
    const fieldLabel = document.createElement("span");
    fieldLabel.className = "tool-activity-detail-label";
    fieldLabel.textContent = label;
    const fieldValue = document.createElement(code ? "code" : "span");
    fieldValue.className = code ? "tool-activity-query" : "tool-activity-detail-value";
    fieldValue.textContent = clean;
    field.append(fieldLabel, fieldValue);
    parent.appendChild(field);
}

function createMobileToolDetails(item) {
    const details = document.createElement("div");
    details.className = "tool-activity-details";
    appendToolDetailField(details, "Tool", formatMobileToolName(item.tool, getMobileToolActivityTag(item)));
    appendToolDetailField(details, "Status", item.meta);
    appendToolDetailField(details, "Input", item.input || (item.kind !== "web" ? item.query : ""), {
        code: ["terminal", "file", "workspace"].includes(item.kind)
    });
    appendToolDetailField(details, "Settings", item.settings);
    if (item.kind !== "web") {
        appendToolDetailField(details, "Detail", item.detail, {
            code: ["terminal", "file", "workspace"].includes(item.kind)
        });
    } else {
        appendToolDetailField(details, "Query", item.query || item.detail, { code: true });
    }
    if (item.resultCount !== null) appendToolDetailField(details, "Count", `${item.resultCount} result${item.resultCount === 1 ? "" : "s"}`);
    appendToolDetailField(details, "Error", item.error);

    if (item.kind === "web" && item.sources.length > 0) {
        const field = document.createElement("div");
        field.className = "tool-activity-detail-field";
        const label = document.createElement("span");
        label.className = "tool-activity-detail-label";
        label.textContent = "Returned";
        const list = document.createElement("ol");
        list.className = "tool-activity-results";
        item.sources.forEach((source, index) => {
            const row = document.createElement("li");
            row.className = "tool-activity-result";
            const head = document.createElement("div");
            head.className = "tool-activity-result-head";
            const badge = document.createElement("span");
            badge.className = "tool-activity-result-index";
            badge.textContent = String(index + 1);
            const copy = document.createElement("div");
            copy.className = "tool-activity-result-copy";
            const title = source.url ? document.createElement("a") : document.createElement("span");
            title.className = "tool-activity-result-title";
            title.textContent = source.title || source.url || `Result ${index + 1}`;
            if (source.url) {
                title.href = source.url;
                title.target = "_blank";
                title.rel = "noopener noreferrer";
            }
            copy.appendChild(title);
            head.append(badge, copy);
            row.appendChild(head);
            if (source.snippet) {
                const snippet = document.createElement("p");
                snippet.className = "tool-activity-result-snippet";
                snippet.textContent = source.snippet;
                row.appendChild(snippet);
            }
            list.appendChild(row);
        });
        field.append(label, list);
        details.appendChild(field);
    }

    if (!details.children.length) {
        const empty = document.createElement("p");
        empty.className = "tool-activity-detail-empty";
        empty.textContent = "No additional tool details were returned.";
        details.appendChild(empty);
    }
    return details;
}

function createMobileToolActivityElement(rawItems = []) {
    const items = normalizeMobileToolActivityItems(rawItems);
    const wrapper = document.createElement("div");
    wrapper.className = "mobile-tool-activity";
    if (items.length === 0) return wrapper;

    const panelId = `mobile-tool-activity-panel-${++mobileToolActivityIdCounter}`;
    const card = document.createElement("div");
    card.className = "tool-activity-card collapsed done";

    const toggle = document.createElement("button");
    toggle.className = "tool-activity-toggle";
    toggle.type = "button";
    toggle.dataset.toolActivityToggle = "";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", panelId);
    toggle.innerHTML = `<svg class="tool-activity-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>`;
    const summary = document.createElement("span");
    summary.textContent = getMobileToolActivitySummary(items, "Tool activity");
    toggle.appendChild(summary);

    const list = document.createElement("div");
    list.id = panelId;
    list.className = `tool-activity-list ${items.length > 1 ? "has-multiple" : "has-single"}`;
    list.hidden = true;

    items.forEach((item, index) => {
        const itemId = `${panelId}-item-${index}`;
        const detailsId = `${itemId}-details`;
        const rowWrap = document.createElement("div");
        rowWrap.className = "tool-activity-row-wrap";
        rowWrap.dataset.toolActivityItemId = itemId;

        const row = document.createElement("button");
        row.className = "tool-activity-row";
        row.type = "button";
        row.dataset.toolActivityRowToggle = "";
        row.dataset.toolActivityItemId = itemId;
        row.dataset.toolKind = item.kind;
        row.dataset.toolName = item.tool;
        row.setAttribute("aria-expanded", "false");
        row.setAttribute("aria-controls", detailsId);
        row.setAttribute("aria-label", `Show details for ${getMobileToolActivityTitle(item)}`);

        const body = document.createElement("span");
        body.className = "tool-activity-row-body";
        const label = document.createElement("span");
        label.className = "tool-activity-label";
        label.textContent = getMobileToolActivityTitle(item);
        const badges = document.createElement("span");
        badges.className = "tool-activity-badges";
        const tag = document.createElement("span");
        tag.className = "tool-activity-tag";
        tag.textContent = getMobileToolActivityTag(item);
        badges.appendChild(tag);
        if (item.meta) {
            const meta = document.createElement("span");
            meta.className = "tool-activity-meta";
            meta.textContent = item.meta;
            badges.appendChild(meta);
        }
        body.append(label, badges);

        const chevron = document.createElement("span");
        chevron.className = "tool-activity-row-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"></path></svg>`;

        const details = createMobileToolDetails(item);
        details.id = detailsId;
        details.classList.add("tool-activity-detail-panel");
        details.hidden = true;

        row.append(createMobileToolIcon(item.kind), body, chevron);
        rowWrap.append(row, details);
        list.appendChild(rowWrap);
    });

    const done = document.createElement("div");
    done.className = "tool-activity-row tool-activity-row-done";
    const doneBody = document.createElement("div");
    doneBody.className = "tool-activity-row-body";
    const doneLabel = document.createElement("div");
    doneLabel.className = "tool-activity-label";
    doneLabel.textContent = "Done";
    doneBody.appendChild(doneLabel);
    done.append(createMobileToolIcon("done"), doneBody);
    list.appendChild(done);

    card.append(toggle, list);
    card.addEventListener("click", event => {
        const toggleButton = event.target.closest("[data-tool-activity-toggle]");
        if (toggleButton) {
            const expanded = toggleButton.getAttribute("aria-expanded") === "true";
            toggleButton.setAttribute("aria-expanded", String(!expanded));
            list.hidden = expanded;
            card.classList.toggle("collapsed", expanded);
            card.classList.toggle("expanded", !expanded);
            return;
        }
        const rowButton = event.target.closest("[data-tool-activity-row-toggle]");
        if (!rowButton) return;
        const controls = rowButton.getAttribute("aria-controls");
        const details = controls ? document.getElementById(controls) : null;
        const expanded = rowButton.getAttribute("aria-expanded") === "true";
        rowButton.setAttribute("aria-expanded", String(!expanded));
        rowButton.closest(".tool-activity-row-wrap")?.classList.toggle("expanded", !expanded);
        if (details) details.hidden = expanded;
    });

    wrapper.appendChild(card);
    return wrapper;
}

function renderChatList() {
    chatList.replaceChildren();
    if (state.isComposingNewChat) {
        const draftRow = document.createElement("button");
        draftRow.type = "button";
        draftRow.className = "chat-row active draft";
        const copy = document.createElement("div");
        const title = document.createElement("div");
        title.className = "chat-row-title";
        title.textContent = "New chat";
        const preview = document.createElement("div");
        preview.className = "chat-row-preview";
        preview.textContent = "Draft on phone";
        const time = document.createElement("div");
        time.className = "chat-row-time";
        time.textContent = "now";
        copy.append(title, preview, time);
        draftRow.appendChild(copy);
        draftRow.addEventListener("click", () => {
            state.activeChatId = "";
            state.activeChat = null;
            state.isComposingNewChat = true;
            renderChatList();
            renderMessages({ forceScrollBottom: true });
            closeChatSidebarOnCompact();
            messageInput?.focus();
        });
        chatList.appendChild(draftRow);
    }

    if (state.chats.length === 0) {
        if (state.isComposingNewChat) return;
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
        setupChatRowLongPress(row, chat, () => {
            state.activeChatId = chat.id;
            state.isComposingNewChat = false;
            updateMobileChatModeClass();
            renderChatList();
            closeChatSidebarOnCompact();
            void loadChat(chat.id, { force: true, scroll: "bottom" });
        });
        chatList.appendChild(row);
    });
}

function renderMessages({ forceScrollBottom = false, preserveScroll = false } = {}) {
    updateMobileChatModeClass();
    const previousScrollTop = messageList.scrollTop;
    const previousScrollHeight = messageList.scrollHeight;
    const wasNearBottom = isMessageListNearBottom();
    const hadRenderedMessages = Boolean(messageList.childElementCount);

    messageList.replaceChildren();
    const chat = state.activeChat;
    state.activeChatRenderSignature = getChatRenderSignature(chat);
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

    messages.forEach((message, index) => {
        messageList.appendChild(createDesktopMessageNode(message, index));
    });

    const shouldStickToBottom = forceScrollBottom
        || (!preserveScroll && !state.isUserScrollingMessages && (!hadRenderedMessages || wasNearBottom));
    if (shouldStickToBottom) {
        messageList.scrollTop = messageList.scrollHeight;
    } else {
        const heightDelta = messageList.scrollHeight - previousScrollHeight;
        messageList.scrollTop = Math.max(0, previousScrollTop + heightDelta);
    }
}

async function loadChats({ keepSelection = true, forceActiveChat = false, scrollActiveChat = "preserve" } = {}) {
    const data = await api("/api/chats?limit=80");
    const previousActiveChatId = state.activeChatId;
    state.chats = Array.isArray(data.chats) ? data.chats : [];
    const nextChatListSignature = getChatListSignature(state.chats);
    const chatListChanged = nextChatListSignature !== state.chatListSignature;
    state.chatListSignature = nextChatListSignature;
    if (state.isComposingNewChat && keepSelection && !state.activeChatId) {
        state.activeChat = null;
        updateMobileChatModeClass();
        if (chatListChanged) renderChatList();
        renderMessages({ forceScrollBottom: true });
        return;
    }
    if (!keepSelection || (!state.activeChatId && !state.isComposingNewChat)) {
        state.activeChatId = data.activeChatId || state.chats[0]?.id || "";
    }
    if (state.activeChatId && !state.chats.some(chat => chat.id === state.activeChatId)) {
        state.activeChatId = state.chats[0]?.id || "";
    }
    const activeChanged = previousActiveChatId !== state.activeChatId;
    if (chatListChanged || activeChanged) renderChatList();
    if (state.activeChatId) {
        const activeSummary = state.chats.find(chat => chat.id === state.activeChatId) || null;
        const nextSummarySignature = getChatSummarySignature(activeSummary);
        const shouldLoadActive = forceActiveChat
            || activeChanged
            || !state.activeChat
            || state.activeChat.id !== state.activeChatId
            || nextSummarySignature !== state.activeChatSummarySignature;
        state.activeChatSummarySignature = nextSummarySignature;
        if (shouldLoadActive) {
            await loadChat(state.activeChatId, {
                force: forceActiveChat || activeChanged,
                scroll: activeChanged ? "bottom" : scrollActiveChat
            });
        }
    } else {
        state.activeChat = null;
        state.activeChatSummarySignature = "";
        updateMobileChatModeClass();
        renderMessages({ forceScrollBottom: true });
    }
}

async function loadChat(chatId, { force = false, scroll = "preserve" } = {}) {
    if (!chatId) return;
    state.isComposingNewChat = false;
    const data = await api(`/api/chats/${encodeURIComponent(chatId)}`);
    const nextChat = data.chat || null;
    const nextSignature = getChatRenderSignature(nextChat);
    if (!force && nextSignature === state.activeChatRenderSignature) return;
    state.activeChat = nextChat;
    renderMessages({
        forceScrollBottom: scroll === "bottom",
        preserveScroll: scroll !== "bottom"
    });
}

async function refresh({ silent = false, models = false } = {}) {
    try {
        if (!silent) setStatus("Syncing");
        await Promise.all([
            loadChats({ keepSelection: true }),
            ...(models ? [refreshRemoteModelSwitcher()] : [])
        ]);
        if (!silent) setStatus("Connected");
    } catch (error) {
        setStatus(error.message, "error");
        if (!state.token) showPairing();
    }
}

function startPolling() {
    window.clearInterval(state.polling);
    state.polling = window.setInterval(() => {
        void refresh({ silent: true });
    }, POLL_MS);
}

function updateComposerState() {
    if (!messageInput || !sendButton) return;
    const hasText = Boolean(messageInput.value.trim());
    const hasAttachments = state.attachments.length > 0 || state.libraryAttachments.length > 0;
    sendButton.disabled = state.sending || (!hasText && !hasAttachments);
    sendButton.setAttribute("aria-busy", String(state.sending));
    const idleState = sendButton.querySelector("[data-send-state='idle']");
    const loadingState = sendButton.querySelector("[data-send-state='loading']");
    if (idleState) idleState.hidden = state.sending;
    if (loadingState) loadingState.hidden = !state.sending;
    messageInput.style.height = "auto";
    if (!hasText) {
        messageInput.style.height = "";
    } else {
        const maxPromptHeight = isCompactLayout() ? 76 : 92;
        messageInput.style.height = `${Math.min(messageInput.scrollHeight, maxPromptHeight)}px`;
    }
}

async function sendMessage() {
    if (!messageInput || !sendButton) return;
    const text = messageInput.value.trim();
    const files = [...state.attachments];
    const libraryItems = [...state.libraryAttachments];
    if ((!text && files.length === 0 && libraryItems.length === 0) || state.sending) return;
    state.sending = true;
    updateComposerState();
    try {
        const targetChatId = state.activeChatId;
        setStatus(files.length ? "Preparing attachments" : "Sending");
        const attachments = await serializeMobileAttachments(files);
        messageInput.value = "";
        clearMobileAttachments();
        updateComposerState();
        setStatus("Sending");
        if (targetChatId) {
            await api(`/api/chats/${encodeURIComponent(targetChatId)}/send`, {
                method: "POST",
                body: JSON.stringify({ message: text, attachments, libraryItems })
            });
        } else {
            await api("/api/messages", {
                method: "POST",
                body: JSON.stringify({ message: text, attachments, libraryItems, newChat: true })
            });
        }
        state.isComposingNewChat = false;
        window.setTimeout(() => void loadChats({ keepSelection: false, forceActiveChat: true, scrollActiveChat: "bottom" }), 650);
        setStatus("Sent to PC");
    } catch (error) {
        setStatus(error.message, "error");
        messageInput.value = text;
        state.attachments = files;
        state.libraryAttachments = libraryItems;
        renderMobileAttachmentPreviews();
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
        renderMessages({ forceScrollBottom: false });
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
    if (isNativeAndroidShell()) {
        openConnectionManager();
        return;
    }
    storeToken("");
    state.chats = [];
    state.activeChat = null;
    state.activeChatId = "";
    state.isComposingNewChat = false;
    clearMobileAttachments();
    showPairing();
    setPairingStatus("Disconnected.");
}

function openConnectionManager() {
    window.clearInterval(state.polling);
    state.polling = 0;
    closeSettingsPanel();
    if (isNativeAndroidShell()) {
        window.location.href = "fauna://connections";
        return;
    }
    disconnect();
}

function startNewChat() {
    state.activeChatId = "";
    state.activeChat = null;
    state.isComposingNewChat = true;
    clearMobileAttachments();
    updateMobileChatModeClass();
    renderChatList();
    renderMessages({ forceScrollBottom: true });
    closeChatSidebarOnCompact();
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
        if (event.target.closest("[data-mobile-settings-clear]") && mobileSettingsSearchInput) {
            mobileSettingsSearchInput.value = "";
            filterMobileSettings();
            mobileSettingsSearchInput.focus();
        }
    });
    document.addEventListener("click", event => {
        if (!activeMobileChatMenu) return;
        if (event.target.closest(".mobile-chat-context-menu") || event.target.closest(".chat-row.menu-open")) return;
        closeMobileChatMenu();
    });
    mobileSettingsNavButtons.forEach(button => {
        button.addEventListener("click", () => {
            setMobileSettingsPane(button.dataset.mobileSettingsPane || "general");
        });
    });
    mobileSettingsSearchInput?.addEventListener("input", () => {
        filterMobileSettings();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && settingsPanel && !settingsPanel.hidden) closeSettingsPanel();
        if (event.key === "Escape") closeMobileChatMenu();
    });
    checkUpdateButton?.addEventListener("click", () => void checkForUpdates());
    installUpdateButton?.addEventListener("click", () => void installUpdate());
    refreshButton.addEventListener("click", () => void refresh({ models: true }));
    disconnectButton.addEventListener("click", disconnect);
    disconnectPhoneButton?.addEventListener("click", disconnect);
    pcSwitcherButton?.addEventListener("click", openConnectionManager);
    managePcConnectionsButton?.addEventListener("click", openConnectionManager);
    mobileSettingsExportButton?.addEventListener("click", () => void openPortableSettingsExportDialog());
    mobileSettingsImportButton?.addEventListener("click", () => mobileSettingsImportInput?.click());
    mobileSettingsImportInput?.addEventListener("change", event => {
        const [file] = Array.from(event.target.files || []);
        event.target.value = "";
        void importPortableSettingsFile(file);
    });
    chatSidebarButton?.addEventListener("click", () => {
        setChatSidebarOpen(!document.body.classList.contains("chat-sidebar-open"));
    });
    sidebarBackdrop?.addEventListener("click", closeChatSidebar);
    sidebarCloseButton?.addEventListener("click", closeChatSidebar);
    newChatButton.addEventListener("click", startNewChat);
    pinButton.addEventListener("click", () => void togglePin());
    messageList?.addEventListener("click", event => void handleMobileMessageAction(event));
    messageList?.addEventListener("scroll", markMessageListScrollIntent, { passive: true });
    messageList?.addEventListener("touchstart", markMessageListScrollIntent, { passive: true });
    messageList?.addEventListener("touchmove", markMessageListScrollIntent, { passive: true });
    messageList?.addEventListener("wheel", markMessageListScrollIntent, { passive: true });
    setupChatSidebarGestures();
    closeChatSidebar();

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
