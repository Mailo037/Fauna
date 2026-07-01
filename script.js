import { createSidebarController } from "./modules/sidebar.js";
import { createImageLightbox } from "./modules/lightbox.js";
import { createThemeController } from "./modules/theme.js";
import { createModelSwitcher } from "./modules/model-switcher.js";
import {
    safeLocalStorageGet,
    safeLocalStorageSet,
    safeLocalStorageRemove
} from "./modules/storage.js";

const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const timeGreeting = document.getElementById("timeGreeting");
const inputWrapper = document.querySelector(".input-wrapper");
const composerPanel = document.querySelector(".input-container-floating");
const clarifyingQuestionComposer = document.getElementById("clarifyingQuestionComposer");
const input = document.getElementById("prompt");
const sendButton = document.getElementById("sendButton");
const newChatBtn = document.getElementById("newChat");
const chatHistoryList = document.getElementById("chatHistoryList");
const chatTitle = document.getElementById("chatTitle");
const chatTitleInput = document.getElementById("chatTitleInput");
const chatTitleEditBtn = document.getElementById("chatTitleEditBtn");
const uploadButton = document.getElementById("uploadButton");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const tokenCounter = document.getElementById("tokenCounter");

// Tools & Sandbox Elements
const toolsBtn = document.getElementById("toolsBtn");
const toolsDropdown = document.getElementById("toolsDropdown");
const toggleSandbox = document.getElementById("toggleSandbox");
const toggleWebSearch = document.getElementById("toggleWebSearch");
const toggleGrounding = document.getElementById("toggleGrounding");
const toggleGoogleGrounding = document.getElementById("toggleGoogleGrounding");
const toggleWorkspaceBridge = document.getElementById("toggleWorkspaceBridge");
const paramTemp = document.getElementById("paramTemp");
const tempValue = document.getElementById("tempValue");
const wanEndpointInput = document.getElementById("wanEndpointInput");
const wanWorkflowInput = document.getElementById("wanWorkflowInput");
const wanStatus = document.getElementById("wanStatus");
const wanSaveBtn = document.getElementById("wanSaveBtn");
const wanTestBtn = document.getElementById("wanTestBtn");
const wanClearBtn = document.getElementById("wanClearBtn");
const openAiStatus = document.getElementById("openAiStatus");
const openAiApiKeyInput = document.getElementById("openAiApiKeyInput");
const openAiChatModelInput = document.getElementById("openAiChatModelInput");
const openAiImageModelInput = document.getElementById("openAiImageModelInput");
const openAiTranscriptionModelInput = document.getElementById("openAiTranscriptionModelInput");
const openAiVoiceInput = document.getElementById("openAiVoiceInput");
const openAiSaveBtn = document.getElementById("openAiSaveBtn");
const openAiTestBtn = document.getElementById("openAiTestBtn");
const openAiClearBtn = document.getElementById("openAiClearBtn");
const providerChoiceButtons = document.querySelectorAll("[data-ai-provider]");
const workspaceBridgeEndpointInput = document.getElementById("workspaceBridgeEndpointInput");
const workspaceBridgeTokenInput = document.getElementById("workspaceBridgeTokenInput");
const workspaceBridgeStatus = document.getElementById("workspaceBridgeStatus");
const workspaceBridgeSaveBtn = document.getElementById("workspaceBridgeSaveBtn");
const workspaceBridgeTestBtn = document.getElementById("workspaceBridgeTestBtn");
const workspaceBridgeClearBtn = document.getElementById("workspaceBridgeClearBtn");
const stopButton = document.getElementById("stopButton");
const settingsOpenBtn = document.getElementById("settingsOpenBtn");
const mobileSettingsOpenBtn = document.getElementById("mobileSettingsOpenBtn");
const settingsModal = document.getElementById("settingsModal");
const settingsCloseBtn = document.getElementById("settingsCloseBtn");
const settingsTitle = document.getElementById("settingsTitle");
const settingsNavButtons = document.querySelectorAll("[data-settings-pane]");
const settingsPanes = document.querySelectorAll("[data-settings-pane-panel]");
const themeToggle = document.getElementById("themeToggle");
const mobileThemeToggle = document.getElementById("mobileThemeToggle");
const themeLabel = document.getElementById("themeLabel");
const accentButtons = document.querySelectorAll("[data-accent-choice]");
const accentValue = document.getElementById("accentValue");
const serviceStatusLabel = document.getElementById("serviceStatusLabel");
const statusPill = document.getElementById("statusPill");
const toastRegion = document.getElementById("toastRegion");
const voiceButton = document.getElementById("voiceButton");
const voiceBtnIcon = document.getElementById("voiceBtnIcon");
const voiceOrb = document.getElementById("voiceOrb");
const voiceNameLabel = document.getElementById("voiceNameLabel");
const voiceDescLabel = document.getElementById("voiceDescLabel");
const voiceDots = document.getElementById("voiceDots");
const voiceChoiceList = document.getElementById("voiceChoiceList");
const voicePrevBtn = document.getElementById("voicePrevBtn");
const voiceNextBtn = document.getElementById("voiceNextBtn");
const voiceAgentStage = document.getElementById("voiceAgentStage");
const voiceAgentOrb = document.getElementById("voiceAgentOrb");
const voiceAgentStatus = document.getElementById("voiceAgentStatus");
const voiceChatControls = document.getElementById("voiceChatControls");
const voiceListeningLabel = document.getElementById("voiceListeningLabel");
const voiceReplyToggleBtn = document.getElementById("voiceReplyToggleBtn");
const voiceQuickSettingsBtn = document.getElementById("voiceQuickSettingsBtn");
const voiceQuickPanel = document.getElementById("voiceQuickPanel");
const voiceQuickVoiceLabel = document.getElementById("voiceQuickVoiceLabel");
const voiceQuickPersonaLabel = document.getElementById("voiceQuickPersonaLabel");
const voiceQuickChoices = document.getElementById("voiceQuickChoices");
const voicePersonalityChoices = document.getElementById("voicePersonalityChoices");
const voiceSpeedSlider = document.getElementById("voiceSpeedSlider");
const voiceSpeedValue = document.getElementById("voiceSpeedValue");
const voiceMicChoices = document.getElementById("voiceMicChoices");
const voiceStopButton = document.getElementById("voiceStopButton");

let isSandboxEnabled = true;
let isWebSearchEnabled = true;
let isGroundingEnabled = true;
let isGoogleGroundingEnabled = true;
let isWorkspaceBridgeEnabled = false;
let activeTemperature = 0.7;
const TOKEN_ESTIMATE_CHARS_PER_TOKEN = 4;
const IMAGE_ATTACHMENT_TOKEN_ESTIMATE = 768;
const GREETING_REFRESH_MS = 5 * 60 * 1000;
const CHAT_SESSIONS_STORAGE_KEY = "floraChatSessions";
const ACTIVE_CHAT_SESSION_STORAGE_KEY = "floraActiveChatSession";
const MAX_CHAT_SESSIONS = 40;
const TYPEWRITER_MIN_CHARS_PER_FRAME = 1;
const TYPEWRITER_MAX_CHARS_PER_FRAME = 7;
const TYPEWRITER_FRAME_DELAY_MS = 30;
const OPENAI_VOICE_SILENCE_THRESHOLD = 0.018;
const OPENAI_VOICE_SILENCE_HOLD_MS = 950;
const OPENAI_VOICE_MIN_RECORDING_MS = 650;
const OPENAI_VOICE_IDLE_TIMEOUT_MS = 10000;
const OPENAI_VOICE_MAX_RECORDING_MS = 45000;
const OPENAI_VOICE_MONITOR_INTERVAL_MS = 70;
const OPENAI_VOICE_RELISTEN_DELAY_MS = 450;
const TIME_GREETING_GROUPS = {
    morning: [
        "Good morning, Fauna is ready",
        "Morning, what are we building?",
        "Fresh start, models ready",
        "Morning workspace, clean slate"
    ],
    afternoon: [
        "Good afternoon, Fauna is ready",
        "Afternoon flow, models synced",
        "Ready for the next idea",
        "Local workspace, wide awake"
    ],
    evening: [
        "Good evening, Fauna is ready",
        "Evening mode, calm and ready",
        "Quiet evening, models synced",
        "Settle in, Fauna is ready"
    ],
    night: [
        "Late-night mode, Fauna is ready",
        "Night shift, models ready",
        "Still awake, still ready",
        "Midnight workspace, ready when you are"
    ]
};

// Model Switcher Elements
const modelLabel = document.getElementById("modelLabel");
const modelBtn = document.getElementById("modelBtn");
const modelDropdown = document.getElementById("modelDropdown");

let attachedFiles = [];
let sessionTotalTokens = 0; // Added Session Token Tracker
let isGenerating = false;
let shouldSpeakNextReply = false;
let isVoiceInputUpdate = false;
let preferredVoice = null;
let activeVoicePersonality = "assistant";
let activeVoiceSpeed = 1;
let isVoiceReplyEnabled = true;
let selectedVoiceMicDeviceId = "default";
let mediaRecognition = null;
let isOpenAiVoiceSessionActive = false;
let voiceMediaRecorder = null;
let voiceMediaStream = null;
let voiceRecordingChunks = [];
let voiceAudioContext = null;
let voiceAnalyser = null;
let voiceMonitorTimer = null;
let voiceMaxRecordingTimer = null;
let voiceRecordingStartedAt = 0;
let voiceLastSpeechAt = 0;
let voiceDetectedSpeech = false;
let voiceShouldSubmitRecording = false;
let openAiVoiceRearmTimer = null;
let activeSpeechAudio = null;
let activeSpeechController = null;
let isSpeechPlaybackActive = false;
let isRecording = false;
let activeRequestController = null;
const disabledButtonStates = new Map();
const sidebarController = createSidebarController();
const imageLightboxController = createImageLightbox();
let modelSwitcher = null;
let activeGreetingGroup = null;
let activeClarifyingQuestion = null;
let isChatTitleEditing = false;

function getTimeGreetingGroup(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
}

function pickRandomGreeting(group) {
    const greetings = TIME_GREETING_GROUPS[group] || TIME_GREETING_GROUPS.afternoon;
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function updateTimeGreeting({ forceRandom = false } = {}) {
    if (!timeGreeting) return;
    const group = getTimeGreetingGroup();
    if (!forceRandom && group === activeGreetingGroup) return;
    activeGreetingGroup = group;
    timeGreeting.textContent = pickRandomGreeting(group);
}

function showToast(message, type = "info") {
    if (!toastRegion) return;
    const normalizedType = ["success", "error", "warning", "info"].includes(type) ? type : "info";
    const toastDuration = normalizedType === "error" ? 5200 : 3600;
    const titles = {
        success: "Done",
        error: "Needs attention",
        warning: "Check this",
        info: "Notice"
    };
    const iconPaths = {
        success: "M20 6 9 17l-5-5",
        error: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
        warning: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
        info: "M12 16v-4m0-4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z"
    };

    const toastTemplate = document.getElementById("toastTemplate");
    const toast = toastTemplate?.content.firstElementChild?.cloneNode(true);
    if (!toast) return;

    toast.className = `toast toast-${normalizedType}`;
    toast.setAttribute("role", normalizedType === "error" ? "alert" : "status");
    toast.style.setProperty("--toast-duration", `${toastDuration}ms`);

    const iconPath = toast.querySelector(".toast-icon-path");
    const title = toast.querySelector(".toast-title");
    const messageNode = toast.querySelector(".toast-message");
    const close = toast.querySelector(".toast-close");
    iconPath?.setAttribute("d", iconPaths[normalizedType]);
    if (title) title.textContent = titles[normalizedType];
    if (messageNode) messageNode.textContent = message;

    while (toastRegion.children.length >= 4) {
        const oldestToast = toastRegion.firstElementChild;
        if (oldestToast?._floraRemoveToast) {
            oldestToast._floraRemoveToast();
        } else {
            oldestToast?.remove();
        }
    }
    toastRegion.appendChild(toast);

    let dismissTimer = null;
    let dismissStartedAt = 0;
    let remainingDismissMs = toastDuration;
    let isDismissed = false;
    let isHovering = false;
    let isDragging = false;
    const dragState = {
        pointerId: null,
        startX: 0,
        currentX: 0,
        lastX: 0,
        lastTime: 0,
        velocityX: 0
    };

    const clearDismissTimer = () => {
        if (!dismissTimer) return;
        window.clearTimeout(dismissTimer);
        dismissTimer = null;
    };

    const removeToast = () => {
        clearDismissTimer();
        isDismissed = true;
        toast.remove();
    };

    const dismiss = (direction = 0) => {
        if (isDismissed) return;
        clearDismissTimer();
        isDismissed = true;
        toast.classList.remove("paused", "dragging");
        if (direction !== 0) {
            toast.style.transform = `translateX(${direction * 120}%) rotate(${direction * 5}deg)`;
            toast.style.opacity = "0";
        } else {
            toast.style.transform = "";
            toast.style.opacity = "";
        }
        toast.classList.add("leaving");
        window.setTimeout(() => toast.remove(), 180);
    };

    toast._floraRemoveToast = removeToast;

    const scheduleDismiss = () => {
        if (isDismissed || remainingDismissMs <= 0) return dismiss();
        clearDismissTimer();
        dismissStartedAt = performance.now();
        dismissTimer = window.setTimeout(() => dismiss(), remainingDismissMs);
    };

    const pauseDismiss = () => {
        if (isDismissed) return;
        if (dismissTimer) {
            remainingDismissMs = Math.max(0, remainingDismissMs - (performance.now() - dismissStartedAt));
            clearDismissTimer();
        }
        toast.classList.add("paused");
    };

    const resumeDismiss = () => {
        if (isDismissed || isHovering || isDragging) return;
        toast.classList.remove("paused");
        scheduleDismiss();
    };

    const finishDrag = () => {
        const dismissThreshold = Math.min(140, toast.offsetWidth * 0.38);
        const shouldDismiss = Math.abs(dragState.currentX) > dismissThreshold
            || (Math.abs(dragState.velocityX) > 0.75 && Math.abs(dragState.currentX) > 38);

        isDragging = false;
        dragState.pointerId = null;
        toast.classList.remove("dragging");

        if (shouldDismiss) {
            const direction = dragState.currentX === 0
                ? Math.sign(dragState.velocityX) || 1
                : Math.sign(dragState.currentX);
            dismiss(direction);
            return;
        }

        toast.style.transform = "";
        toast.style.opacity = "";
        resumeDismiss();
    };

    toast.addEventListener("pointerenter", () => {
        isHovering = true;
        pauseDismiss();
    });

    toast.addEventListener("pointerleave", () => {
        isHovering = false;
        resumeDismiss();
    });

    toast.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || close?.contains(event.target)) return;

        isDragging = true;
        dragState.pointerId = event.pointerId;
        dragState.startX = event.clientX;
        dragState.currentX = 0;
        dragState.lastX = event.clientX;
        dragState.lastTime = performance.now();
        dragState.velocityX = 0;

        pauseDismiss();
        toast.classList.add("dragging");
        toast.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    toast.addEventListener("pointermove", (event) => {
        if (!isDragging || event.pointerId !== dragState.pointerId) return;

        const now = performance.now();
        const elapsed = Math.max(1, now - dragState.lastTime);
        dragState.currentX = event.clientX - dragState.startX;
        dragState.velocityX = (event.clientX - dragState.lastX) / elapsed;
        dragState.lastX = event.clientX;
        dragState.lastTime = now;

        const dragAmount = Math.abs(dragState.currentX);
        const opacity = Math.max(0.32, 1 - dragAmount / Math.max(240, toast.offsetWidth));
        toast.style.transform = `translateX(${dragState.currentX}px) rotate(${dragState.currentX / 48}deg)`;
        toast.style.opacity = String(opacity);
    });

    toast.addEventListener("pointerup", (event) => {
        if (!isDragging || event.pointerId !== dragState.pointerId) return;
        if (toast.hasPointerCapture(event.pointerId)) {
            toast.releasePointerCapture(event.pointerId);
        }
        finishDrag();
    });

    toast.addEventListener("pointercancel", (event) => {
        if (!isDragging || event.pointerId !== dragState.pointerId) return;
        if (toast.hasPointerCapture(event.pointerId)) {
            toast.releasePointerCapture(event.pointerId);
        }
        isDragging = false;
        dragState.pointerId = null;
        toast.classList.remove("dragging");
        toast.style.transform = "";
        toast.style.opacity = "";
        resumeDismiss();
    });

    close?.addEventListener("click", () => dismiss());
    scheduleDismiss();
}

function getFriendlyError(error, fallbackTitle = "Something went wrong") {
    const rawMessage = error?.message || String(error || fallbackTitle);
    if (error?.name === "AbortError") {
        return {
            title: "Generation stopped",
            message: "Your prompt is safe to edit and run again.",
            detail: "",
            canCheckOllama: false
        };
    }

    if (/No available model|Failed to fetch|Ollama|models? (?:is|are) loaded|localhost:11434/i.test(rawMessage)) {
        return {
            title: "Ollama is not reachable",
            message: "Start Ollama, make sure the selected model is installed, or switch Fauna to OpenAI in Settings.",
            detail: rawMessage,
            canCheckOllama: true
        };
    }

    if (/OpenAI|api\.openai\.com|API key|401|403|429|quota|rate limit|insufficient_quota|invalid_api_key/i.test(rawMessage)) {
        return {
            title: "OpenAI needs attention",
            message: "Check your API key, model names, account limits, or rate limits in Settings.",
            detail: rawMessage,
            canCheckProvider: true
        };
    }

    if (/workspace bridge|Local workspace bridge|bridge token|127\.0\.0\.1:8765/i.test(rawMessage)) {
        return {
            title: "Workspace bridge is unavailable",
            message: "Start the local bridge, save the current token in Settings, then try the workspace request again.",
            detail: rawMessage,
            canCheckOllama: false
        };
    }

    if (/ComfyUI|Wan|workflow|MediaRecorder|MP4|record/i.test(rawMessage)) {
        return {
            title: "Video service needs attention",
            message: "Check the ComfyUI endpoint, Wan workflow JSON, and browser recording support before trying again.",
            detail: rawMessage,
            canCheckOllama: false
        };
    }

    if (/image|pollinations|vision/i.test(rawMessage)) {
        return {
            title: "Image request failed",
            message: "Check the prompt, attachment type, image model, or provider connection, then try again.",
            detail: rawMessage,
            canCheckOllama: /Ollama|model|Failed to fetch/i.test(rawMessage)
        };
    }

    return {
        title: fallbackTitle,
        message: "Fauna could not complete this request.",
        detail: rawMessage,
        canCheckOllama: false
    };
}

function renderErrorCard(target, error, options = {}) {
    if (!target) return;
    const info = {
        ...getFriendlyError(error, options.title),
        ...options
    };
    const detailText = info.detail || error?.message || "";
    target.classList.add("error-bubble");
    target.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "tool-activity-bubble");
    target.removeAttribute("aria-busy");
    target.innerHTML = "";

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
    title.textContent = info.title || "Something went wrong";

    const message = document.createElement("div");
    message.className = "error-card-message";
    message.textContent = info.message || "Fauna could not complete this request.";

    body.appendChild(title);
    body.appendChild(message);

    if (detailText) {
        const actions = document.createElement("div");
        actions.className = "error-card-actions";

        const detailButton = document.createElement("button");
        detailButton.className = "error-card-action";
        detailButton.type = "button";
        detailButton.textContent = "Details";

        const copyButton = document.createElement("button");
        copyButton.className = "error-card-action";
        copyButton.type = "button";
        copyButton.textContent = "Copy";

        const detail = document.createElement("div");
        detail.className = "error-card-detail";
        detail.hidden = true;
        detail.textContent = detailText;

        detailButton.addEventListener("click", () => {
            detail.hidden = !detail.hidden;
            detailButton.textContent = detail.hidden ? "Details" : "Hide details";
        });

        copyButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(detailText);
                copyButton.textContent = "Copied";
                window.setTimeout(() => {
                    copyButton.textContent = "Copy";
                }, 1400);
            } catch (err) {
                showToast("Copy failed. Select the details manually.", "error");
            }
        });

        actions.appendChild(detailButton);
        actions.appendChild(copyButton);

        if (info.canCheckOllama) {
            const statusButton = document.createElement("button");
            statusButton.className = "error-card-action";
            statusButton.type = "button";
            statusButton.textContent = "Check Ollama";
            statusButton.addEventListener("click", () => {
                checkOllamaStatus();
                showToast("Checking local Ollama status...", "info");
            });
            actions.appendChild(statusButton);
        }

        if (info.canCheckProvider) {
            const statusButton = document.createElement("button");
            statusButton.className = "error-card-action";
            statusButton.type = "button";
            statusButton.textContent = isOpenAiProvider() ? "Check OpenAI" : "Check provider";
            statusButton.addEventListener("click", () => {
                updateActiveProviderStatus();
                showToast(isOpenAiProvider() ? "Checking OpenAI status..." : "Checking provider status...", "info");
            });
            actions.appendChild(statusButton);
        }

        body.appendChild(actions);
        body.appendChild(detail);
    }

    card.appendChild(icon);
    card.appendChild(body);
    target.appendChild(card);
}

function setServiceStatus(state, label) {
    statusPill?.setAttribute("data-status", state);
    if (serviceStatusLabel) {
        serviceStatusLabel.textContent = label;
    }
}

function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw new DOMException("Generation stopped", "AbortError");
    }
}

function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function hasMarkdownCodeFence(text) {
    return /^```/m.test(text || "");
}

function getTypewriterStepLength(textLength) {
    if (textLength > 2400) return TYPEWRITER_MAX_CHARS_PER_FRAME;
    if (textLength > 1100) return 5;
    if (textLength > 480) return 3;
    return TYPEWRITER_MIN_CHARS_PER_FRAME;
}

function renderTypewriterMarkdown(target, rawText, signal = null) {
    if (!target) return Promise.resolve();
    target.classList.remove("tool-activity-bubble", "creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    target.removeAttribute("aria-busy");
    if (prefersReducedMotion() || !rawText || signal?.aborted || hasMarkdownCodeFence(rawText)) {
        target.innerHTML = renderMarkdown(rawText || "");
        return Promise.resolve();
    }

    target.classList.add("typewriter-active");
    target.setAttribute("aria-busy", "true");

    const stepLength = getTypewriterStepLength(rawText.length);
    let cursor = 0;

    return new Promise(resolve => {
        const finish = () => {
            target.innerHTML = renderMarkdown(rawText);
            target.classList.remove("typewriter-active");
            target.removeAttribute("aria-busy");
            resolve();
        };

        const tick = () => {
            if (signal?.aborted) {
                finish();
                return;
            }

            cursor = Math.min(rawText.length, cursor + stepLength);
            target.innerHTML = renderMarkdown(rawText.slice(0, cursor));
            chat.scrollTop = chat.scrollHeight;

            if (cursor >= rawText.length) {
                finish();
                return;
            }

            window.setTimeout(() => window.requestAnimationFrame(tick), TYPEWRITER_FRAME_DELAY_MS);
        };

        window.requestAnimationFrame(tick);
    });
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getToolActivityIcon(kind = "tool") {
    const icons = {
        web: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.3 2.45 3.45 5.45 3.45 9S14.3 18.55 12 21"></path><path d="M12 3c-2.3 2.45-3.45 5.45-3.45 9S9.7 18.55 12 21"></path>',
        workspace: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"></path>',
        file: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path>',
        image: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path>',
        terminal: '<path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path>',
        tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-3-3Z"></path>'
    };
    return icons[kind] || icons.tool;
}

function renderToolActivity(container, {
    title = "Thinking about",
    variant = "rich",
    items = []
} = {}) {
    if (!container) return;
    container.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    container.classList.add("tool-activity-bubble");
    container.setAttribute("aria-busy", "true");

    if (variant === "simple") {
        container.innerHTML = `
            <div class="tool-activity-simple">
                <span>${escapeHtml(title)}</span>
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;
        return;
    }

    const rows = items.map(item => `
        <div class="tool-activity-row">
            <svg class="tool-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${getToolActivityIcon(item.kind)}</svg>
            <div class="tool-activity-row-body">
                <div class="tool-activity-label">${escapeHtml(item.label || "Tool")}</div>
                <div class="tool-activity-detail">${escapeHtml(item.detail || "")}</div>
            </div>
            ${item.meta ? `<div class="tool-activity-meta">${escapeHtml(item.meta)}</div>` : ""}
        </div>
    `).join("");

    container.innerHTML = `
        <div class="tool-activity-card">
            <div class="tool-activity-heading">
                <span class="tool-activity-dots" aria-hidden="true">
                    <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                </span>
                <span>${escapeHtml(title)}</span>
            </div>
            <div class="tool-activity-list">
                ${rows || `<div class="tool-activity-empty">Preparing tools...</div>`}
            </div>
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;
}

function normalizeCodeLanguage(lang) {
    return String(lang || "")
        .trim()
        .split(/\s+/)[0]
        .replace(/[^\w#+.-]/g, "")
        .toLowerCase();
}

function getCodeLanguageLabel(lang, fallback = "") {
    const normalized = normalizeCodeLanguage(lang || fallback);
    const labels = {
        csharp: "C#",
        cs: "C#",
        cpp: "C++",
        cplusplus: "C++",
        js: "JavaScript",
        javascript: "JavaScript",
        mjs: "JavaScript",
        jsx: "JSX",
        ts: "TypeScript",
        typescript: "TypeScript",
        tsx: "TSX",
        py: "Python",
        python: "Python",
        sh: "Shell",
        bash: "Bash",
        shell: "Shell",
        ps1: "PowerShell",
        powershell: "PowerShell",
        html: "HTML",
        htm: "HTML",
        xhtml: "HTML",
        svg: "SVG",
        css: "CSS",
        json: "JSON",
        md: "Markdown",
        markdown: "Markdown",
        sql: "SQL",
        yaml: "YAML",
        yml: "YAML"
    };
    return labels[normalized] || (normalized ? normalized.toUpperCase() : "Code");
}

function tokenSpan(kind, value) {
    return `<span class="tok-${kind}">${escapeHtml(value)}</span>`;
}

function highlightByPattern(code, pattern, classify) {
    let output = "";
    let lastIndex = 0;
    for (const match of code.matchAll(pattern)) {
        const index = match.index ?? 0;
        if (index < lastIndex) continue;
        output += escapeHtml(code.slice(lastIndex, index));
        const token = match[0];
        const kind = classify(token, index, code, match);
        output += kind ? tokenSpan(kind, token) : escapeHtml(token);
        lastIndex = index + token.length;
    }
    output += escapeHtml(code.slice(lastIndex));
    return output;
}

function highlightHtmlTag(tag) {
    if (tag.startsWith("<!--")) return tokenSpan("comment", tag);
    if (/^<!doctype/i.test(tag)) {
        return tag
            .split(/(\s+)/)
            .map((part, index) => {
                if (!part) return "";
                if (/^\s+$/.test(part)) return escapeHtml(part);
                if (index === 0) return tokenSpan("keyword", part);
                return tokenSpan("string", part);
            })
            .join("");
    }

    let output = "";
    let index = 0;
    let tagNameSeen = false;

    while (index < tag.length) {
        const char = tag[index];

        if (char === "<") {
            const next = tag[index + 1] === "/" ? "</" : "<";
            output += tokenSpan("punct", next);
            index += next.length;
            continue;
        }

        if (char === "/" && tag[index + 1] === ">") {
            output += tokenSpan("punct", "/>");
            index += 2;
            continue;
        }

        if (char === ">" || char === "=") {
            output += tokenSpan("punct", char);
            index += 1;
            continue;
        }

        if (char === "\"" || char === "'") {
            const quote = char;
            let end = index + 1;
            while (end < tag.length && tag[end] !== quote) end += 1;
            output += tokenSpan("string", tag.slice(index, Math.min(end + 1, tag.length)));
            index = Math.min(end + 1, tag.length);
            continue;
        }

        if (/[A-Za-z_:]/.test(char)) {
            let end = index + 1;
            while (end < tag.length && /[\w:.-]/.test(tag[end])) end += 1;
            const name = tag.slice(index, end);
            output += tokenSpan(tagNameSeen ? "attr" : "tag", name);
            tagNameSeen = true;
            index = end;
            continue;
        }

        output += escapeHtml(char);
        index += 1;
    }

    return output;
}

function highlightHtmlCode(code) {
    const tagPattern = /(<!--[\s\S]*?-->|<!DOCTYPE[\s\S]*?>|<\/?[A-Za-z][^>]*?>)/gi;
    let output = "";
    let lastIndex = 0;
    for (const match of code.matchAll(tagPattern)) {
        const index = match.index ?? 0;
        output += escapeHtml(code.slice(lastIndex, index));
        output += highlightHtmlTag(match[0]);
        lastIndex = index + match[0].length;
    }
    output += escapeHtml(code.slice(lastIndex));
    return output;
}

function highlightCssCode(code) {
    const pattern = /\/\*[\s\S]*?\*\/|(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1|#[\da-f]{3,8}\b|@[a-z-]+\b|--[\w-]+(?=\s*:)|\b[a-z-]+(?=\s*:)|-?\b\d*\.?\d+(?:px|rem|em|%|vh|vw|s|ms|deg)?\b|[{}()[\];:,.]/gi;
    return highlightByPattern(code, pattern, token => {
        if (token.startsWith("/*")) return "comment";
        if (/^["']/.test(token)) return "string";
        if (token.startsWith("#")) return "number";
        if (token.startsWith("@")) return "keyword";
        if (/^--/.test(token) || /^[a-z-]+$/i.test(token)) return "property";
        if (/^-?\d/.test(token)) return "number";
        return "punct";
    });
}

function highlightJavaScriptCode(code) {
    const keywords = new Set("async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null return static super switch this throw true try typeof undefined var void while with yield document window console".split(" "));
    const pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1|\b[A-Za-z_$][\w$]*\b|-?\b\d*\.?\d+\b|[{}()[\].,;:?+\-*/%=!<>|&]+/g;
    return highlightByPattern(code, pattern, (token, index, source) => {
        if (token.startsWith("//") || token.startsWith("/*")) return "comment";
        if (/^["'`]/.test(token)) return "string";
        if (keywords.has(token)) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        if (/^[A-Za-z_$]/.test(token) && /\s*\(/.test(source.slice(index + token.length, index + token.length + 3))) return "function";
        if (/^[{}()[\].,;:?+\-*/%=!<>|&]+$/.test(token)) return "punct";
        return "";
    });
}

function highlightJsonCode(code) {
    const pattern = /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|[{}\[\],:]/gi;
    return highlightByPattern(code, pattern, (token, index, source) => {
        if (token.startsWith("\"")) {
            const next = source.slice(index + token.length).match(/^\s*:/);
            return next ? "attr" : "string";
        }
        if (/^(true|false|null)$/i.test(token)) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        return "punct";
    });
}

function highlightPythonCode(code) {
    const keywords = new Set("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self".split(" "));
    const pattern = /#[^\n]*|("""[\s\S]*?"""|'''[\s\S]*?'''|(["'])(?:\\[\s\S]|(?!\2)[^\\])*\2)|\b[A-Za-z_]\w*\b|-?\b\d*\.?\d+\b|[{}()[\].,;:?+\-*/%=!<>|&]+/g;
    return highlightByPattern(code, pattern, (token, index, source) => {
        if (token.startsWith("#")) return "comment";
        if (/^["']/.test(token)) return "string";
        if (keywords.has(token)) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        if (/^[A-Za-z_]/.test(token) && /\s*\(/.test(source.slice(index + token.length, index + token.length + 3))) return "function";
        if (/^[{}()[\].,;:?+\-*/%=!<>|&]+$/.test(token)) return "punct";
        return "";
    });
}

function highlightShellCode(code) {
    const keywords = new Set("if then else elif fi for while do done case esac function in select until return exit cd echo set export sudo pwsh powershell param foreach where-object select-object get-childitem".split(" "));
    const pattern = /#[^\n]*|(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1|\$[\w:]+|\b[A-Za-z][\w-]*\b|--?[\w-]+|-?\b\d*\.?\d+\b|[{}()[\].,;:?+\-*/%=!<>|&]+/gi;
    return highlightByPattern(code, pattern, token => {
        if (token.startsWith("#")) return "comment";
        if (/^["']/.test(token)) return "string";
        if (token.startsWith("$")) return "variable";
        if (token.startsWith("-")) return "attr";
        if (keywords.has(token.toLowerCase())) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        if (/^[{}()[\].,;:?+\-*/%=!<>|&]+$/.test(token)) return "punct";
        return "";
    });
}

function inferHighlightLanguage(lang, code) {
    const normalized = normalizeCodeLanguage(lang);
    if (normalized) return normalized;
    if (/^\s*</.test(code)) return "html";
    if (/^\s*(?:[{[]|"(?:\\.|[^"\\])*"\s*:)/.test(code)) return "json";
    if (/^\s*(?:@|\.|#|:root|body\b|html\b|[a-z-]+\s*:)/i.test(code)) return "css";
    return "";
}

function highlightCode(code, lang) {
    const normalized = inferHighlightLanguage(lang, code);
    if (["html", "htm", "xhtml", "svg"].includes(normalized)) return highlightHtmlCode(code);
    if (normalized === "css") return highlightCssCode(code);
    if (["js", "javascript", "mjs", "jsx", "ts", "typescript", "tsx"].includes(normalized)) return highlightJavaScriptCode(code);
    if (normalized === "json") return highlightJsonCode(code);
    if (["py", "python"].includes(normalized)) return highlightPythonCode(code);
    if (["sh", "bash", "shell", "ps1", "powershell"].includes(normalized)) return highlightShellCode(code);
    return escapeHtml(code);
}

function renderCreationDotField(columns = 13, rows = 11) {
    const centerColumn = (columns - 1) / 2;
    const centerRow = (rows - 1) / 2;
    return Array.from({ length: columns * rows }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const normalizedDistance = Math.min(
            1,
            Math.hypot((column - centerColumn) / centerColumn, (row - centerRow) / centerRow)
        );
        const alpha = Math.max(0.16, 0.76 - normalizedDistance * 0.52).toFixed(2);
        const scale = Math.max(0.46, 1.18 - normalizedDistance * 0.5).toFixed(2);
        const restScale = Math.max(0.34, Number(scale) * 0.72).toFixed(2);
        const peakScale = Math.min(1.7, Number(scale) * 1.34).toFixed(2);
        const restAlpha = Math.max(0.1, Number(alpha) * 0.58).toFixed(2);
        const peakAlpha = Math.min(1, Number(alpha) + 0.24).toFixed(2);
        const delay = ((column * 0.055) + (row * 0.08)).toFixed(3);
        return `<span class="creation-field-dot" style="--dot-alpha:${alpha};--dot-rest-alpha:${restAlpha};--dot-peak-alpha:${peakAlpha};--dot-rest-scale:${restScale};--dot-peak-scale:${peakScale};--dot-delay:${delay}s"></span>`;
    }).join("");
}

function renderCreationProgress(container, {
    kind = "image",
    title = "Creating",
    prompt = "",
    status = "Preparing request",
    steps = []
} = {}) {
    if (!container) return;
    const iconPath = kind === "video"
        ? '<rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3"></path>'
        : '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path>';
    const safePrompt = prompt.length > 92 ? `${prompt.slice(0, 89).trim()}...` : prompt;
    const stepItems = steps.map((step, index) => `
        <span class="creation-step${index === 0 ? " active" : ""}" data-step-index="${index}">
            <span class="creation-step-dot" aria-hidden="true"></span>
            ${escapeHtml(step)}
        </span>
    `).join("");

    container.classList.remove("tool-activity-bubble", "error-bubble");
    container.classList.add("creation-progress-bubble");
    container.setAttribute("aria-busy", "true");
    container.classList.toggle("creation-progress-bubble-image", kind === "image");

    if (kind === "image") {
        container.innerHTML = `
            <div class="creation-progress-card creation-progress-card-image" data-progress-kind="${kind}">
                <div class="creation-progress-image-head">
                    <div>
                        <div class="creation-progress-title">${escapeHtml(title)}</div>
                        <div class="creation-progress-status" data-creation-status>${escapeHtml(status)}</div>
                    </div>
                </div>
                <div class="creation-field-stage" aria-hidden="true">
                    <div class="creation-field-glow"></div>
                    <div class="creation-field-sweep"></div>
                    <div class="creation-dot-field">${renderCreationDotField()}</div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="creation-progress-card" data-progress-kind="${kind}">
            <div class="creation-orbit" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
            </div>
            <div class="creation-progress-body">
                <div class="creation-progress-title">${escapeHtml(title)}</div>
                <div class="creation-progress-status" data-creation-status>${escapeHtml(status)}</div>
                ${safePrompt ? `<div class="creation-progress-prompt">${escapeHtml(safePrompt)}</div>` : ""}
                ${stepItems ? `<div class="creation-steps">${stepItems}</div>` : ""}
            </div>
        </div>
    `;
}

function updateCreationProgress(container, status, activeStepIndex = null) {
    if (!container) return;
    const statusNode = container.querySelector("[data-creation-status]");
    if (statusNode) statusNode.textContent = status;

    if (activeStepIndex === null) return;
    container.querySelectorAll(".creation-step").forEach((step, index) => {
        step.classList.toggle("active", index === activeStepIndex);
        step.classList.toggle("done", index < activeStepIndex);
    });
}

// Helper: Estimate tokens for draft UI before Ollama returns exact usage.
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(String(text).length / TOKEN_ESTIMATE_CHARS_PER_TOKEN);
}

function normalizeTokenCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return null;
    return Math.round(count);
}

function estimateMessageTokens(message) {
    if (!message) return 0;
    const contentTokens = estimateTokens(message.content || "");
    const imageTokens = Array.isArray(message.images)
        ? message.images.length * IMAGE_ATTACHMENT_TOKEN_ESTIMATE
        : 0;
    return contentTokens + imageTokens;
}

function estimateMessagesTokens(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
}

function estimateAttachmentTokens(files) {
    if (!Array.isArray(files)) return 0;
    return files.reduce((total, file) => {
        if (file.type.startsWith("image/")) {
            return total + IMAGE_ATTACHMENT_TOKEN_ESTIMATE;
        }
        return total + Math.ceil(file.size / TOKEN_ESTIMATE_CHARS_PER_TOKEN);
    }, 0);
}

function estimateComposerTokens() {
    return estimateTokens(input?.value || "") + estimateAttachmentTokens(attachedFiles);
}

function getOllamaTokenUsage(data, messages, responseText) {
    const promptTokens = normalizeTokenCount(data?.prompt_eval_count);
    const responseTokens = normalizeTokenCount(data?.eval_count);
    const openAiInputTokens = normalizeTokenCount(data?.usage?.input_tokens);
    const openAiOutputTokens = normalizeTokenCount(data?.usage?.output_tokens);

    if (openAiInputTokens !== null || openAiOutputTokens !== null) {
        return (openAiInputTokens || 0) + (openAiOutputTokens || 0);
    }

    if (promptTokens !== null || responseTokens !== null) {
        return (promptTokens || 0) + (responseTokens || 0);
    }
    return estimateMessagesTokens(messages) + estimateTokens(responseText || "");
}

function addSessionTokens(count) {
    const normalized = normalizeTokenCount(count);
    if (!normalized) {
        updateTokenDisplay();
        return 0;
    }
    sessionTotalTokens += normalized;
    updateTokenDisplay();
    return normalized;
}

function updateTokenDisplay() {
    if (tokenCounter) {
        const draftTokens = isGenerating ? 0 : estimateComposerTokens();
        const parts = [`${sessionTotalTokens.toLocaleString()} Session Tokens`];
        if (isGenerating) {
            parts.push("Busy");
        } else if (draftTokens > 0) {
            parts.push(`${draftTokens.toLocaleString()} Prompt`);
        }
        tokenCounter.textContent = parts.join(" · ");
        const tokenSummary = draftTokens > 0
            ? `Session tokens: ${sessionTotalTokens.toLocaleString()}. Current prompt estimate: ${draftTokens.toLocaleString()}.`
            : `Session tokens: ${sessionTotalTokens.toLocaleString()}.`;
        tokenCounter.dataset.tooltip = tokenSummary;
        tokenCounter.setAttribute("aria-label", tokenSummary);
    }
}

// ===== MODEL SWITCHER LOGIC =====
const OLLAMA_URL = "http://localhost:11434/api/chat";
const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const BING_SEARCH_URL = "https://www.bing.com/search";
const DUCKDUCKGO_SEARCH_URL = "https://duckduckgo.com/";
const IMAGE_GEN_BASE_URL = "https://image.pollinations.ai/prompt/";
const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
const AI_PROVIDER_LOCAL = "local";
const AI_PROVIDER_OPENAI = "openai";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1.5";
const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_OPENAI_SPEECH_MODEL = "gpt-4o-mini-tts";
const DEFAULT_OPENAI_VOICE = "alloy";
const OPENAI_VISION_FILE_PURPOSE = "vision";
const OPENAI_VOICE_OPTIONS = [
    { id: "alloy", name: "Alloy", description: "Balanced and clear", swatch: "voice-swatch-alloy" },
    { id: "ash", name: "Ash", description: "Calm and steady", swatch: "voice-swatch-ash" },
    { id: "ballad", name: "Ballad", description: "Warm and expressive", swatch: "voice-swatch-ballad" },
    { id: "coral", name: "Coral", description: "Bright and conversational", swatch: "voice-swatch-coral" },
    { id: "echo", name: "Echo", description: "Crisp and direct", swatch: "voice-swatch-echo" },
    { id: "fable", name: "Fable", description: "Soft and narrative", swatch: "voice-swatch-fable" },
    { id: "onyx", name: "Onyx", description: "Deep and grounded", swatch: "voice-swatch-onyx" },
    { id: "nova", name: "Nova", description: "Light and energetic", swatch: "voice-swatch-nova" },
    { id: "sage", name: "Sage", description: "Measured and relaxed", swatch: "voice-swatch-sage" },
    { id: "shimmer", name: "Shimmer", description: "Airy and upbeat", swatch: "voice-swatch-shimmer" },
    { id: "verse", name: "Verse", description: "Smooth and polished", swatch: "voice-swatch-verse" },
    { id: "marin", name: "Marin", description: "Gentle and natural", swatch: "voice-swatch-marin" },
    { id: "cedar", name: "Cedar", description: "Low and composed", swatch: "voice-swatch-cedar" }
];
const VOICE_QUICK_OPTIONS = [
    { id: "alloy", label: "Ara", description: "Upbeat Female" },
    { id: "shimmer", label: "Eve", description: "Soothing Female" },
    { id: "onyx", label: "Leo", description: "British Male" },
    { id: "echo", label: "Rex", description: "Calm Male" },
    { id: "sage", label: "Sal", description: "Smooth Male" },
    { id: "fable", label: "Gork", description: "Lazy Male" }
];
const VOICE_PERSONALITY_OPTIONS = [
    { id: "assistant", label: "Assistant", icon: "atom" },
    { id: "therapist", label: "\"Therapist\"", icon: "couch" },
    { id: "storyteller", label: "Storyteller", icon: "book" },
    { id: "kids-story", label: "Kids Story Time", icon: "spark" },
    { id: "kids-trivia", label: "Kids Trivia Game", icon: "trophy" },
    { id: "meditation", label: "Meditation", icon: "rings" },
    { id: "grok-doc", label: "Grok \"Doc\"", icon: "stethoscope" },
    { id: "motivation", label: "Motivation", icon: "flame" },
    { id: "argumentative", label: "Argumentative", icon: "bolt" }
];
const DEFAULT_WAN_VIDEO_BASE_URL = "http://localhost:8188";
const DEFAULT_WORKSPACE_BRIDGE_URL = "http://127.0.0.1:8765";
const AI_PROVIDER_STORAGE_KEY = "floraAiProvider";
const OPENAI_API_KEY_STORAGE_KEY = "floraOpenAiApiKey";
const OPENAI_CHAT_MODEL_STORAGE_KEY = "floraOpenAiChatModel";
const OPENAI_IMAGE_MODEL_STORAGE_KEY = "floraOpenAiImageModel";
const OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY = "floraOpenAiTranscriptionModel";
const OPENAI_SPEECH_MODEL_STORAGE_KEY = "floraOpenAiSpeechModel";
const OPENAI_VOICE_STORAGE_KEY = "floraOpenAiVoice";
const VOICE_PERSONALITY_STORAGE_KEY = "floraVoicePersonality";
const VOICE_SPEED_STORAGE_KEY = "floraVoiceSpeed";
const VOICE_REPLY_ENABLED_STORAGE_KEY = "floraVoiceReplyEnabled";
const VOICE_MIC_DEVICE_STORAGE_KEY = "floraVoiceMicDevice";
const WAN_VIDEO_ENDPOINT_STORAGE_KEY = "floraWanEndpoint";
const WAN_VIDEO_WORKFLOW_STORAGE_KEY = "floraWanWorkflow";
const WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY = "floraWorkspaceBridgeEndpoint";
const WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY = "floraWorkspaceBridgeToken";
const WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY = "floraWorkspaceBridgeEnabled";
const THEME_STORAGE_KEY = "floraTheme";
const ACCENT_STORAGE_KEY = "floraAccent";
const LOCAL_TOOL_CALL_RE = /<flora_tool_call>\s*([\s\S]*?)\s*<\/flora_tool_call>/i;
const LOCAL_TOOL_RESULT_MAX_CHARS = 14000;
const LOCAL_TOOL_SYSTEM_PROMPT = `You can use Fauna local workspace tools when the user asks about local files, this project, or terminal commands. To request a tool, respond with exactly one XML block and no other text: <flora_tool_call>{"tool":"workspace_tree","path":".","depth":2}</flora_tool_call>, <flora_tool_call>{"tool":"read_file","path":"script.js"}</flora_tool_call>, or <flora_tool_call>{"tool":"run_command","command":"git status --short","cwd":".","timeout":20}</flora_tool_call>. Commands run only inside the configured workspace and may be blocked by bridge safety rules. After Fauna returns a tool result, answer the user normally.`;
const CLARIFYING_QUESTION_RE = /<flora_question>\s*([\s\S]*?)\s*<\/flora_question>/i;
const CLARIFYING_QUESTION_SYSTEM_PROMPT = `When you need user input before continuing, ask the question in your normal response and append one hidden JSON block at the end using this exact format: <flora_question>{"questions":[{"question":"What should I know?","options":["Option A","Option B"],"allowCustom":true,"placeholder":"Type your answer..."}]}</flora_question>. Use 1-3 concise questions. Each question may include 2-5 short options. Do not mention the XML block to the user. If you can answer well without more information, do not use this block.`;
const CODE_BLOCK_SYSTEM_PROMPT = `When you include a fenced code block, always add the best language identifier after the opening fence, such as \`\`\`python, \`\`\`javascript, \`\`\`html, \`\`\`css, \`\`\`json, \`\`\`bash, or \`\`\`powershell.`;
const IMAGE_EDIT_MODEL = "moondream";
const IMAGE_EDIT_SYSTEM_PROMPT = `You create concise image editing prompts. Describe the attached image only as needed, preserve its main subject, composition, and style, then apply the user's requested change. Return one polished prompt only.`;
const MODEL_ROUTES = {
    chat: "llama2",
    reasoning: "qwen3:8b",
    imageGeneration: "qwen3:8b",
    videoGeneration: "qwen3:8b",
    imageAnalysis: "moondream",
    code: "qwen3-coder:30b"
};
const FALLBACK_MODEL = MODEL_ROUTES.reasoning;
const availableModels = ["llama2", "qwen3:8b", "qwen3-coder:30b", "moondream"];
let OLLAMA_MODEL = MODEL_ROUTES.chat;
let activeAiProvider = normalizeAiProvider(safeLocalStorageGet(AI_PROVIDER_STORAGE_KEY));
isWorkspaceBridgeEnabled = safeLocalStorageGet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY) === "true";
activeVoicePersonality = safeLocalStorageGet(VOICE_PERSONALITY_STORAGE_KEY) || "assistant";
activeVoiceSpeed = normalizeStoredVoiceSpeed(safeLocalStorageGet(VOICE_SPEED_STORAGE_KEY));
isVoiceReplyEnabled = safeLocalStorageGet(VOICE_REPLY_ENABLED_STORAGE_KEY) !== "false";
selectedVoiceMicDeviceId = safeLocalStorageGet(VOICE_MIC_DEVICE_STORAGE_KEY) || "default";
let conversationHistory = [];
let chatSessions = [];
let activeSessionId = null;

function createSessionId() {
    return window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeAiProvider(provider) {
    return provider === AI_PROVIDER_OPENAI ? AI_PROVIDER_OPENAI : AI_PROVIDER_LOCAL;
}

function isOpenAiProvider() {
    return activeAiProvider === AI_PROVIDER_OPENAI;
}

function setActiveAiProvider(provider, { persist = true, refreshStatus = true } = {}) {
    const wasOpenAiProvider = isOpenAiProvider();
    activeAiProvider = normalizeAiProvider(provider);
    if (persist) {
        safeLocalStorageSet(AI_PROVIDER_STORAGE_KEY, activeAiProvider);
    }
    if (wasOpenAiProvider && !isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        stopOpenAiVoiceSession({ silent: true });
    }
    updateProviderSettingsUi();
    updateModelSwitcherForProvider();
    if (refreshStatus) {
        updateActiveProviderStatus();
    }
}

function getOpenAiApiKey() {
    return (safeLocalStorageGet(OPENAI_API_KEY_STORAGE_KEY) || "").trim();
}

function getOpenAiChatModel() {
    return (safeLocalStorageGet(OPENAI_CHAT_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_CHAT_MODEL).trim();
}

function getOpenAiImageModel() {
    return (safeLocalStorageGet(OPENAI_IMAGE_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_IMAGE_MODEL).trim();
}

function getOpenAiTranscriptionModel() {
    return (safeLocalStorageGet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_TRANSCRIPTION_MODEL).trim();
}

function getOpenAiSpeechModel() {
    return (safeLocalStorageGet(OPENAI_SPEECH_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_SPEECH_MODEL).trim();
}

function getOpenAiVoice() {
    const saved = (safeLocalStorageGet(OPENAI_VOICE_STORAGE_KEY) || DEFAULT_OPENAI_VOICE).trim().toLowerCase();
    return OPENAI_VOICE_OPTIONS.some(option => option.id === saved) ? saved : DEFAULT_OPENAI_VOICE;
}

function requireOpenAiApiKey() {
    const key = getOpenAiApiKey();
    if (!key) {
        throw new Error("OpenAI API key is not configured. Add it in Settings > AI Provider.");
    }
    return key;
}

function getOpenAiVoiceOption(voice = getOpenAiVoice()) {
    return OPENAI_VOICE_OPTIONS.find(option => option.id === voice) || OPENAI_VOICE_OPTIONS[0];
}

function setOpenAiVoice(voice, { persist = true } = {}) {
    const option = getOpenAiVoiceOption(String(voice || "").trim().toLowerCase());
    if (persist) {
        safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, option.id);
    }
    if (openAiVoiceInput) openAiVoiceInput.value = option.id;
    updateVoicePickerUi(option.id);
    updateVoiceQuickUi();
}

function normalizeStoredVoiceSpeed(value) {
    const speed = Number(value);
    if (!Number.isFinite(speed)) return 1;
    return Math.min(1.3, Math.max(0.7, Math.round(speed * 10) / 10));
}

function getQuickVoiceOption(voice = getOpenAiVoice()) {
    const quickOption = VOICE_QUICK_OPTIONS.find(option => option.id === voice);
    if (quickOption) return quickOption;
    const fullOption = getOpenAiVoiceOption(voice);
    return {
        id: fullOption.id,
        label: fullOption.name,
        description: fullOption.description
    };
}

function getVoicePersonalityOption(personality = activeVoicePersonality) {
    return VOICE_PERSONALITY_OPTIONS.find(option => option.id === personality) || VOICE_PERSONALITY_OPTIONS[0];
}

function getVoicePersonalityIcon(icon = "atom") {
    const icons = {
        atom: `<path d="M12 12h.01"></path><ellipse cx="12" cy="12" rx="8" ry="3.8"></ellipse><ellipse cx="12" cy="12" rx="8" ry="3.8" transform="rotate(60 12 12)"></ellipse><ellipse cx="12" cy="12" rx="8" ry="3.8" transform="rotate(120 12 12)"></ellipse>`,
        couch: `<path d="M5 11V8a3 3 0 0 1 6 0v3"></path><path d="M13 11V8a3 3 0 0 1 6 0v3"></path><path d="M4 13h16v5H4z"></path><path d="M4 18v2"></path><path d="M20 18v2"></path>`,
        book: `<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"></path><path d="M4 5.5v16"></path><path d="M8 7h8"></path>`,
        spark: `<path d="m12 3 1.6 5 5.4 1-4 3.5 1.2 5.5L12 15.2 7.8 18 9 12.5 5 9l5.4-1Z"></path>`,
        trophy: `<path d="M8 4h8v5a4 4 0 0 1-8 0Z"></path><path d="M8 6H5a2 2 0 0 0 2 4h1"></path><path d="M16 6h3a2 2 0 0 1-2 4h-1"></path><path d="M12 13v5"></path><path d="M9 21h6"></path>`,
        rings: `<path d="M12 8a4 4 0 1 1-4 4"></path><path d="M16 12a4 4 0 1 1-4-4"></path><path d="M7 19c2.8 1.8 7.2 1.8 10 0"></path>`,
        stethoscope: `<path d="M6 4v5a4 4 0 0 0 8 0V4"></path><path d="M14 9v3a4 4 0 0 0 8 0v-1"></path><path d="M5 4h2"></path><path d="M13 4h2"></path><circle cx="21" cy="10" r="1"></circle>`,
        flame: `<path d="M12 22c4 0 7-2.5 7-6.5 0-3-2-5.1-4.2-7.1-.5 2-1.8 3-3.1 3.6.3-3-1.2-5.6-4-8C7.5 8.5 5 11 5 15.5 5 19.5 8 22 12 22Z"></path>`,
        bolt: `<path d="m13 2-8 12h6l-1 8 8-12h-6Z"></path>`
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon] || icons.atom}</svg>`;
}

function setVoicePersonality(personality, { persist = true } = {}) {
    activeVoicePersonality = getVoicePersonalityOption(personality).id;
    if (persist) safeLocalStorageSet(VOICE_PERSONALITY_STORAGE_KEY, activeVoicePersonality);
    updateVoiceQuickUi();
}

function setVoiceSpeed(speed, { persist = true } = {}) {
    activeVoiceSpeed = normalizeStoredVoiceSpeed(speed);
    if (persist) safeLocalStorageSet(VOICE_SPEED_STORAGE_KEY, String(activeVoiceSpeed));
    updateVoiceQuickUi();
}

function setVoiceReplyEnabled(enabled, { persist = true } = {}) {
    isVoiceReplyEnabled = Boolean(enabled);
    if (persist) safeLocalStorageSet(VOICE_REPLY_ENABLED_STORAGE_KEY, isVoiceReplyEnabled ? "true" : "false");
    updateVoiceQuickUi();
}

function setSelectedVoiceMic(deviceId, { persist = true } = {}) {
    selectedVoiceMicDeviceId = deviceId || "default";
    if (persist) safeLocalStorageSet(VOICE_MIC_DEVICE_STORAGE_KEY, selectedVoiceMicDeviceId);
    updateVoiceMicChoiceSelection();
}

function getSelectedVoiceMicConstraints() {
    if (!selectedVoiceMicDeviceId || selectedVoiceMicDeviceId === "default") return true;
    return { deviceId: { exact: selectedVoiceMicDeviceId } };
}

function getVoiceModeInstruction() {
    const personality = getVoicePersonalityOption();
    return `\n\n[Voice chat settings]\nRespond for spoken playback. Keep the answer concise and conversational. Personality: ${personality.label}.`;
}

function cloneConversationHistory(history, { includeImages = true } = {}) {
    if (!Array.isArray(history)) return [];
    return history
        .filter(message => message && typeof message === "object")
        .map(message => {
            const cloned = {
                role: message.role || "assistant",
                content: message.content || ""
            };
            if (includeImages && Array.isArray(message.images) && message.images.length > 0) {
                cloned.images = [...message.images];
            }
            if (includeImages && Array.isArray(message.openAiImageFileIds) && message.openAiImageFileIds.length > 0) {
                cloned.openAiImageFileIds = [...message.openAiImageFileIds];
            }
            return cloned;
        });
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

function createChatSession(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: createSessionId(),
        title: "Current Session",
        createdAt: now,
        updatedAt: now,
        pinned: false,
        archived: false,
        manualTitle: false,
        chatHtml: "",
        conversationHistory: [],
        sessionTotalTokens: 0,
        ...overrides
    };
}

function normalizeStoredChatSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const now = new Date().toISOString();
    return createChatSession({
        id: String(raw.id || createSessionId()),
        title: cleanSessionTitle(raw.title || "Current Session"),
        createdAt: raw.createdAt || raw.updatedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || now,
        pinned: Boolean(raw.pinned),
        archived: Boolean(raw.archived),
        manualTitle: Boolean(raw.manualTitle),
        chatHtml: typeof raw.chatHtml === "string" ? raw.chatHtml : "",
        conversationHistory: cloneConversationHistory(raw.conversationHistory, { includeImages: false }),
        sessionTotalTokens: normalizeTokenCount(raw.sessionTotalTokens) || 0
    });
}

function readStoredChatSessions() {
    const raw = safeLocalStorageGet(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeStoredChatSession).filter(Boolean);
    } catch (err) {
        console.warn("Could not parse saved Fauna chats:", err);
        return [];
    }
}

function getActiveSession() {
    return chatSessions.find(session => session.id === activeSessionId) || null;
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
    return Boolean(chat?.children.length || conversationHistory.length);
}

function deriveSessionTitle(session = getActiveSession()) {
    const firstUserMessage = (session?.conversationHistory || conversationHistory)
        .find(message => message.role === "user" && message.content);
    const firstUserBubble = chat?.querySelector(".user-node .bubble")?.textContent;
    return cleanSessionTitle(firstUserMessage?.content || firstUserBubble || session?.title || "Current Session");
}

function updateActiveChatTitle() {
    const session = getActiveSession();
    const title = session?.title || "Current Session";
    if (chatTitle) chatTitle.textContent = title;
    if (chatTitleInput && !isChatTitleEditing) chatTitleInput.value = title;
    document.title = title === "Current Session" ? "Fauna" : `${title} - Fauna`;
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

function serializeChatSession(session) {
    return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        pinned: Boolean(session.pinned),
        archived: Boolean(session.archived),
        manualTitle: Boolean(session.manualTitle),
        chatHtml: session.chatHtml || "",
        conversationHistory: cloneConversationHistory(session.conversationHistory, { includeImages: false }),
        sessionTotalTokens: normalizeTokenCount(session.sessionTotalTokens) || 0
    };
}

function trimChatSessions() {
    if (chatSessions.length <= MAX_CHAT_SESSIONS) return;
    const removable = [...chatSessions]
        .filter(session => session.id !== activeSessionId)
        .sort((a, b) => {
            if (a.archived !== b.archived) return a.archived ? -1 : 1;
            if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });

    while (chatSessions.length > MAX_CHAT_SESSIONS && removable.length > 0) {
        const sessionToRemove = removable.shift();
        chatSessions = chatSessions.filter(session => session.id !== sessionToRemove.id);
    }
}

function persistChatSessions() {
    trimChatSessions();
    safeLocalStorageSet(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions.map(serializeChatSession)));
    if (activeSessionId) {
        safeLocalStorageSet(ACTIVE_CHAT_SESSION_STORAGE_KEY, activeSessionId);
    }
}

function saveCurrentSession({ render = true } = {}) {
    let session = getActiveSession();
    if (!session) {
        session = createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
    }

    session.chatHtml = chat?.innerHTML || "";
    session.domNodes = chat ? Array.from(chat.childNodes) : [];
    session.conversationHistory = cloneConversationHistory(conversationHistory);
    session.sessionTotalTokens = sessionTotalTokens;
    if (!session.manualTitle) {
        session.title = deriveSessionTitle(session);
    }
    session.updatedAt = new Date().toISOString();

    persistChatSessions();
    updateActiveChatTitle();
    if (render) renderChatHistory();
    return session;
}

function compareChatSessions(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

function createChatSessionRow(session) {
    const row = document.createElement("div");
    row.className = "chat-session-row";
    row.classList.toggle("active", session.id === activeSessionId);
    row.classList.toggle("pinned", session.pinned);
    row.classList.toggle("archived", session.archived);

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "history-item chat-session-main";
    mainButton.setAttribute("aria-label", session.title);
    mainButton.setAttribute("aria-current", session.id === activeSessionId ? "page" : "false");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = session.title;
    mainButton.append(dot, label);
    mainButton.addEventListener("click", () => activateChatSession(session.id));

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
        () => deleteChatSession(session.id)
    );

    menuButton.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = !menuWrap.classList.contains("open");
        closeChatSessionMenus(menuWrap);
        menuWrap.classList.toggle("open", willOpen);
        row.classList.toggle("menu-open", willOpen);
        menuButton.setAttribute("aria-expanded", String(willOpen));
        menu.hidden = !willOpen;
    });

    menu.append(pinButton, archiveButton, deleteButton);
    menuWrap.append(menuButton, menu);
    row.append(mainButton, menuWrap);
    return row;
}

function appendChatSessionGroup(label, sessions) {
    if (!chatHistoryList || sessions.length === 0) return;
    if (label) {
        const groupLabel = document.createElement("div");
        groupLabel.className = "history-label history-subsection-label";
        groupLabel.textContent = label;
        chatHistoryList.appendChild(groupLabel);
    }
    sessions.forEach(session => chatHistoryList.appendChild(createChatSessionRow(session)));
}

function renderChatHistory() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = "";
    const visibleSessions = chatSessions.filter(session => !session.archived).sort(compareChatSessions);
    const archivedSessions = chatSessions.filter(session => session.archived).sort(compareChatSessions);
    appendChatSessionGroup("", visibleSessions);
    appendChatSessionGroup("Archived", archivedSessions);
}

function clearComposerDraft() {
    if (input) {
        input.value = "";
        input.style.height = "auto";
    }
    if (previewContainer) previewContainer.innerHTML = "";
    attachedFiles = [];
}

function rehydrateRenderedChat(container) {
    if (!container) return;
    window.requestAnimationFrame(() => {
        container.querySelectorAll(".code-combined-preview").forEach(bar => bar.remove());
        container.querySelectorAll(".code-block-wrapper").forEach(wrapper => {
            delete wrapper.dataset.codeEnhanced;
            delete wrapper.dataset.previewEnhanced;
        });
        setupCodeSandbox(container);
    });
}

function restoreChatSessionToView(session) {
    if (!session) return;
    conversationHistory = cloneConversationHistory(session.conversationHistory);
    sessionTotalTokens = normalizeTokenCount(session.sessionTotalTokens) || 0;
    clearComposerDraft();

    if (chat) {
        if (session.domNodes?.length) {
            chat.replaceChildren(...session.domNodes);
        } else {
            chat.innerHTML = session.chatHtml || "";
        }
        chat.style.display = activeChatHasContent() ? "block" : "none";
        chat.scrollTop = chat.scrollHeight;
        rehydrateRenderedChat(chat);
    }
    if (welcome) welcome.style.display = activeChatHasContent() ? "none" : "flex";

    updateTokenDisplay();
    updateActiveChatTitle();
}

function activateChatSession(sessionId, { captureCurrent = true, closeSidebar = true } = {}) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    clearClarifyingQuestionComposer();
    closeChatSessionMenus();
    if (captureCurrent && activeSessionId && activeSessionId !== sessionId) {
        saveCurrentSession({ render: false });
    }
    activeSessionId = sessionId;
    restoreChatSessionToView(session);
    persistChatSessions();
    renderChatHistory();
    if (closeSidebar) sidebarController.close();
}

function createAndActivateEmptySession() {
    const session = createChatSession();
    chatSessions.unshift(session);
    activeSessionId = session.id;
    restoreChatSessionToView(session);
    persistChatSessions();
    renderChatHistory();
    return session;
}

function startNewChatSession({ notify = true } = {}) {
    clearClarifyingQuestionComposer();
    const currentSession = saveCurrentSession({ render: false });
    if (currentSession && !chatSessionHasContent(currentSession) && !currentSession.archived) {
        currentSession.title = "Current Session";
        currentSession.manualTitle = false;
        currentSession.chatHtml = "";
        currentSession.domNodes = [];
        currentSession.conversationHistory = [];
        currentSession.sessionTotalTokens = 0;
        currentSession.updatedAt = new Date().toISOString();
        activeSessionId = currentSession.id;
        restoreChatSessionToView(currentSession);
        persistChatSessions();
        renderChatHistory();
        sidebarController.close();
        return;
    }

    createAndActivateEmptySession();
    sidebarController.close();
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
            createAndActivateEmptySession();
        }
    } else {
        persistChatSessions();
        renderChatHistory();
    }

    showToast(session.archived ? "Chat archived." : "Chat restored.", "success");
}

function deleteChatSession(sessionId) {
    const wasActive = sessionId === activeSessionId;
    chatSessions = chatSessions.filter(session => session.id !== sessionId);

    if (chatSessions.length === 0) {
        createAndActivateEmptySession();
    } else if (wasActive) {
        const nextId = getNextVisibleSessionId(sessionId) || chatSessions.sort(compareChatSessions)[0]?.id;
        activateChatSession(nextId, { captureCurrent: false, closeSidebar: false });
    } else {
        persistChatSessions();
        renderChatHistory();
    }

    showToast("Chat deleted.", "info");
}

function initializeChatSessions() {
    chatSessions = readStoredChatSessions();
    const storedActiveId = safeLocalStorageGet(ACTIVE_CHAT_SESSION_STORAGE_KEY);

    if (chatSessions.length === 0) {
        createAndActivateEmptySession();
        return;
    }

    const preferredSession =
        chatSessions.find(session => session.id === storedActiveId && !session.archived) ||
        chatSessions.find(session => !session.archived) ||
        chatSessions[0];
    activeSessionId = preferredSession.id;
    restoreChatSessionToView(preferredSession);
    persistChatSessions();
    renderChatHistory();
}

createThemeController({
    themeToggle,
    mobileThemeToggle,
    themeLabel,
    accentButtons,
    accentValue,
    storageKey: THEME_STORAGE_KEY,
    accentStorageKey: ACCENT_STORAGE_KEY
}).init();
stopButton?.addEventListener("click", cancelActiveGeneration);
updateTimeGreeting({ forceRandom: true });
window.setInterval(() => updateTimeGreeting(), GREETING_REFRESH_MS);

document.querySelectorAll(".suggestion-card[data-prompt]").forEach(card => {
    card.addEventListener("click", () => {
        if (isGenerating) return;
        input.value = card.dataset.prompt || "";
        input.dispatchEvent(new Event("input"));
        input.focus();
    });
});

async function checkOllamaStatus() {
    setServiceStatus("checking", "Checking Ollama");
    try {
        const res = await fetch("http://localhost:11434/api/tags", { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        const modelCount = Array.isArray(data.models) ? data.models.length : null;
        setServiceStatus("online", modelCount === null ? "Ollama connected" : `Ollama connected · ${modelCount} models`);
    } catch (err) {
        setServiceStatus("offline", "Ollama offline");
    }
}

async function checkOpenAiStatus() {
    if (!getOpenAiApiKey()) {
        setServiceStatus("offline", "OpenAI key needed");
        setOpenAiSettingsStatus("Key needed", "missing");
        return;
    }

    setServiceStatus("checking", "Checking OpenAI");
    setOpenAiSettingsStatus("Testing...", "missing");

    try {
        const res = await openAiFetch("/models", { method: "GET" });
        if (!res.ok) throw new Error(`OpenAI responded with HTTP ${res.status}`);
        setServiceStatus("online", "OpenAI connected");
        setOpenAiSettingsStatus("Ready", "configured");
    } catch (err) {
        setServiceStatus("offline", "OpenAI offline");
        setOpenAiSettingsStatus("Offline", "missing");
        throw err;
    }
}

function updateActiveProviderStatus() {
    if (isOpenAiProvider()) {
        checkOpenAiStatus().catch(() => {});
        return;
    }
    checkOllamaStatus();
}

statusPill?.addEventListener("click", () => {
    updateActiveProviderStatus();
    showToast(isOpenAiProvider() ? "Checking OpenAI status..." : "Checking local Ollama status...", "info");
});

function updateModelSwitcherForProvider() {
    if (isOpenAiProvider()) {
        modelSwitcher?.setActive(getOpenAiChatModel());
        return;
    }
    modelSwitcher?.setActive(OLLAMA_MODEL);
}

function setActiveModel(model, { switchToLocal = true } = {}) {
    OLLAMA_MODEL = model;
    if (switchToLocal) {
        setActiveAiProvider(AI_PROVIDER_LOCAL);
        return;
    }
    updateModelSwitcherForProvider();
}

function chooseModelForRequest(text, currentFiles, imagePrompt, videoPrompt = null) {
    const hasImages = getImageFiles(currentFiles).length > 0;

    if (videoPrompt !== null) return MODEL_ROUTES.videoGeneration;
    if (imagePrompt !== null) return MODEL_ROUTES.imageGeneration;
    if (hasImages) return MODEL_ROUTES.imageAnalysis;
    if (isCodeRequest(text, currentFiles)) return MODEL_ROUTES.code;
    if (isHighThinkingRequest(text)) return MODEL_ROUTES.reasoning;
    return MODEL_ROUTES.chat;
}

async function sendOllamaChat(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null) {
    const triedModels = [];
    const modelsToTry = Array.from(new Set([preferredModel, FALLBACK_MODEL].filter(Boolean)));
    let lastError = null;

    for (const model of modelsToTry) {
        triedModels.push(model);

        try {
            const res = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal,
                body: JSON.stringify({
                    model,
                    messages,
                    options,
                    stream: false
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (!data?.message?.content) {
                    throw new Error(`${model} returned an empty response`);
                }
                setActiveModel(model);
                return data;
            }

            const bodyText = await res.text().catch(() => "");
            lastError = new Error(`${model} responded with ${res.status}${bodyText ? `: ${bodyText.slice(0, 140)}` : ""}`);
        } catch (err) {
            if (err.name === "AbortError") throw err;
            lastError = err;
        }
    }

    throw new Error(`No available model responded. Tried: ${triedModels.join(", ")}${lastError ? `. Last error: ${lastError.message}` : ""}`);
}

async function openAiFetch(path, { method = "POST", headers = {}, body = null, signal = null } = {}) {
    const key = requireOpenAiApiKey();
    return fetch(`${OPENAI_API_BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${key}`,
            ...headers
        },
        body,
        signal
    });
}

async function openAiJsonFetch(path, payload, { signal = null, method = "POST" } = {}) {
    const res = await openAiFetch(path, {
        method,
        signal,
        headers: { "Content-Type": "application/json" },
        body: payload === undefined ? null : JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return data;
}

async function uploadOpenAiVisionImage(file, signal = null) {
    const formData = new FormData();
    formData.append("purpose", OPENAI_VISION_FILE_PURPOSE);
    formData.append("file", file, file.name || "image.png");

    const res = await openAiFetch("/files", {
        method: "POST",
        body: formData,
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    if (!data?.id) {
        throw new Error("OpenAI did not return a file id for the image.");
    }
    return data.id;
}

function formatOpenAiApiError(data, status) {
    const message = data?.error?.message || data?.message || `OpenAI responded with HTTP ${status}`;
    const code = data?.error?.code || data?.error?.type;
    return `OpenAI error${status ? ` ${status}` : ""}: ${message}${code ? ` (${code})` : ""}`;
}

function buildOpenAiContentParts(message) {
    const parts = [];
    const text = String(message?.content || "").trim();
    if (text) {
        parts.push({ type: "input_text", text });
    }

    const openAiImageFileIds = Array.isArray(message?.openAiImageFileIds) ? message.openAiImageFileIds : [];
    openAiImageFileIds.forEach(fileId => {
        if (fileId) parts.push({ type: "input_image", file_id: fileId });
    });

    return parts.length ? parts : [{ type: "input_text", text: "" }];
}

function prepareOpenAiResponseInput(messages) {
    const instructions = [];
    const inputItems = [];

    cloneConversationHistory(messages).forEach(message => {
        const role = message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user";
        if (role === "system") {
            if (message.content) instructions.push(message.content);
            return;
        }

        const hasImages = Array.isArray(message.openAiImageFileIds) && message.openAiImageFileIds.length > 0;
        inputItems.push({
            role,
            content: role === "user" && hasImages ? buildOpenAiContentParts(message) : String(message.content || "")
        });
    });

    return {
        instructions: instructions.join("\n\n"),
        input: inputItems
    };
}

function extractOpenAiResponseText(data) {
    if (typeof data?.output_text === "string" && data.output_text.trim()) {
        return data.output_text.trim();
    }

    const chunks = [];
    (data?.output || []).forEach(item => {
        (item?.content || []).forEach(part => {
            if (typeof part?.text === "string") chunks.push(part.text);
            if (typeof part?.refusal === "string") chunks.push(part.refusal);
        });
    });

    return chunks.join("\n").trim();
}

async function sendOpenAiResponse(messages, options = {}, signal = null) {
    const prepared = prepareOpenAiResponseInput(messages);
    const payload = {
        model: getOpenAiChatModel(),
        input: prepared.input
    };

    if (prepared.instructions) payload.instructions = prepared.instructions;
    if (Number.isFinite(options.temperature)) payload.temperature = options.temperature;

    const data = await openAiJsonFetch("/responses", payload, { signal });
    const content = extractOpenAiResponseText(data);
    if (!content) {
        throw new Error("OpenAI returned an empty response.");
    }

    return {
        ...data,
        message: {
            role: "assistant",
            content
        }
    };
}

async function sendProviderChat(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null) {
    if (isOpenAiProvider()) {
        return sendOpenAiResponse(messages, options, signal);
    }
    return sendOllamaChat(messages, options, preferredModel, signal);
}

function shouldSearchWeb(text) {
    if (!isWebSearchEnabled || !text) return false;
    if (/^\/(?:search|web)\b/i.test(text)) return true;
    return /\b(link|links|url|website|source|sources|search|look up|lookup|online|internet|web|latest|current|today|news|recent|price|where can i|find me|provide me information|useful links|usefull links|skakel|soek|nuutste|vandag)\b/i.test(text);
}

function buildSearchQuery(text) {
    const cleaned = text
        .replace(/^\/(?:search|web)\s+/i, "")
        .replace(/\b(can you|please|pls|give me|provide me|find me|look up|search for|search|online|internet|web|links?|urls?|useful|usefull|information|info)\b/gi, " ")
        .replace(/\b(a|an|the)\s+(link|url)\s+(to|for)\b/gi, " ")
        .replace(/\b(link|url)\s+(to|for)\b/gi, " ")
        .replace(/\b(to|for)\b\s*$/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);

    return cleaned || text.replace(/^\/(?:search|web)\s+/i, "").trim().slice(0, 180);
}

function getSearchEngineSources(query) {
    return [
        {
            title: `Google results for "${query}"`,
            url: `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(query)}`,
            snippet: "Open this link to compare the live Google results page for the same query."
        },
        {
            title: `Bing results for "${query}"`,
            url: `${BING_SEARCH_URL}?q=${encodeURIComponent(query)}`,
            snippet: "Open this link to compare Bing results for the same query."
        },
        {
            title: `DuckDuckGo results for "${query}"`,
            url: `${DUCKDUCKGO_SEARCH_URL}?q=${encodeURIComponent(query)}`,
            snippet: "Open this link to compare DuckDuckGo results for the same query."
        }
    ];
}

async function searchWithWikipedia(query) {
    const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        format: "json",
        origin: "*"
    });
    const res = await fetch(`${WIKIPEDIA_SEARCH_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("Wikipedia search failed");
    const data = await res.json();

    return (data?.query?.search || []).slice(0, 5).map(item => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
        snippet: item.snippet?.replace(/<[^>]+>/g, "") || ""
    }));
}

async function getWebContextForPrompt(text) {
    const query = buildSearchQuery(text);
    const wikiResults = await searchWithWikipedia(query).catch(() => []);

    const seenUrls = new Set();
    const searchEngineSources = isGoogleGroundingEnabled
        ? getSearchEngineSources(query)
        : [];
    const results = [...searchEngineSources, ...wikiResults]
        .filter(result => {
            if (!result.url || seenUrls.has(result.url)) return false;
            seenUrls.add(result.url);
            return true;
        })
        .slice(0, 8);

    if (results.length === 0) {
        return { context: "", sources: [], query, resultCount: 0 };
    }

    const sourceLines = results.map((result, index) => {
        const snippet = result.snippet ? `\n   Summary: ${result.snippet}` : "";
        return `${index + 1}. ${result.title}\n   URL: ${result.url}${snippet}`;
    }).join("\n");

    const groundingInstruction = isGroundingEnabled
        ? "Ground the answer in these online results. Cite links from this list for factual claims based on web results, and say when the results are insufficient."
        : "Use these online results as optional background. You may include useful links from this list, but you do not need to strictly ground every factual claim in them.";

    return {
        context: `\n\n--- Web Search Context ---\nSearch query: ${query}\n${groundingInstruction}\n${sourceLines}\n--- End Web Search Context ---`,
        sources: results,
        query,
        resultCount: results.length
    };
}

function getWorkspaceBridgeBaseUrl() {
    return (safeLocalStorageGet(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY) || DEFAULT_WORKSPACE_BRIDGE_URL).trim().replace(/\/+$/, "");
}

function getWorkspaceBridgeToken() {
    return (safeLocalStorageGet(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY) || "").trim();
}

function hasWorkspaceBridgeAccess() {
    return Boolean(isWorkspaceBridgeEnabled && getWorkspaceBridgeBaseUrl() && getWorkspaceBridgeToken());
}

function getWorkspaceBridgeHeaders(includeJson = false) {
    const headers = {};
    const token = getWorkspaceBridgeToken();
    if (includeJson) headers["Content-Type"] = "application/json";
    if (token) headers["X-Flora-Bridge-Token"] = token;
    return headers;
}

async function requestWorkspaceBridge(path, options = {}) {
    const baseUrl = getWorkspaceBridgeBaseUrl();
    const res = await fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers: getWorkspaceBridgeHeaders(Boolean(options.body)),
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
        throw new Error(data.error || `Workspace bridge responded with HTTP ${res.status}`);
    }
    return data;
}

function trimLocalToolText(value, maxLength = LOCAL_TOOL_RESULT_MAX_CHARS) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n[Output truncated to ${maxLength.toLocaleString()} characters]`;
}

function formatWorkspaceTreeResult(result) {
    const lines = (result.entries || []).map(entry => {
        const kind = entry.type === "directory" ? "[dir]" : "[file]";
        const size = typeof entry.size === "number" ? ` (${entry.size.toLocaleString()} bytes)` : "";
        return `${kind} ${entry.path}${size}`;
    });
    const truncated = result.truncated ? "\n[Tree truncated by bridge limit]" : "";
    return `Workspace tree for ${result.path || "."}:\n${lines.join("\n") || "[No entries]"}${truncated}`;
}

function formatWorkspaceFileResult(result) {
    const truncated = result.truncated ? "\n[File truncated by bridge limit]" : "";
    return `File: ${result.path} (${Number(result.size || 0).toLocaleString()} bytes)\n${trimLocalToolText(result.content)}${truncated}`;
}

function formatWorkspaceCommandResult(result) {
    const stdout = trimLocalToolText(result.stdout || "[No stdout]");
    const stderr = result.stderr ? `\nStderr:\n${trimLocalToolText(result.stderr)}` : "";
    const timedOut = result.timedOut ? "\n[Command timed out]" : "";
    const truncated = result.truncated ? "\n[Output truncated by bridge limit]" : "";
    return `Command: ${result.command}\nCwd: ${result.cwd || "."}\nExit code: ${result.exitCode ?? "timeout"}\nDuration: ${result.durationMs ?? 0}ms\nStdout:\n${stdout}${stderr}${timedOut}${truncated}`;
}

function shouldUseWorkspaceBridge(text) {
    if (!isWorkspaceBridgeEnabled || !text) return false;
    if (/^\/(?:tree|files|read|run|cmd|shell|terminal|ps)\b/i.test(text)) return true;
    return /\b(local directory|local workspace|workspace files|project files|repo files|repository files|file tree|directory tree|list files|read file|open file|show file|inspect file|terminal command|shell command|powershell|command output|run tests?|execute command)\b/i.test(text);
}

function shouldListWorkspace(text) {
    return /^\/(?:tree|files)\b/i.test(text)
        || /\b(local directory|local workspace|workspace files|project files|repo files|repository files|file tree|directory tree|list files|show files)\b/i.test(text);
}

function extractDirectWorkspaceCommand(text) {
    const slash = text.match(/^\/(?:run|cmd|shell|terminal|ps)\s+([\s\S]+)$/i);
    if (slash) return slash[1].trim();

    const inline = text.match(/\b(?:run|execute)\s+`([^`]+)`/i);
    if (inline) return inline[1].trim();

    const colon = text.match(/\b(?:run|execute)\s+(?:this\s+)?(?:terminal\s+|shell\s+|powershell\s+|cmd\s+)?command\s*[:\-]\s*([^\n]+)/i);
    if (colon) return colon[1].trim();

    const common = text.match(/^\s*(?:run|execute)\s+((?:npm|pnpm|yarn|python|py|node|git|dir|ls|pytest|ruff|uv|cargo|go|dotnet)\b[^\n]*)/i);
    return common ? common[1].trim() : "";
}

function extractDirectReadPaths(text) {
    const paths = new Set();
    const slash = text.match(/^\/read\s+([\s\S]+)$/i);
    if (slash) paths.add(slash[1].trim());

    if (/\b(?:read|open|show|inspect)\b/i.test(text)) {
        const backtickMatches = text.matchAll(/`([^`\n]+)`/g);
        for (const match of backtickMatches) {
            const candidate = match[1].trim();
            if (candidate && /[./\\]/.test(candidate)) paths.add(candidate);
        }

        const pathMatches = text.matchAll(/\b(?:read|open|show|inspect)\s+(?:the\s+)?(?:file\s+)?([A-Za-z0-9_.\-\\/]+(?:\.[A-Za-z0-9]+)?)/gi);
        for (const match of pathMatches) {
            const candidate = match[1].trim();
            if (candidate && !/^(file|files|directory|workspace|project)$/i.test(candidate)) paths.add(candidate);
        }
    }

    return [...paths].slice(0, 5);
}

async function listWorkspaceTree(path = ".", depth = 2, signal = null) {
    const params = new URLSearchParams({
        path: path || ".",
        depth: String(Math.max(0, Math.min(5, Number(depth) || 2))),
        limit: "220"
    });
    return requestWorkspaceBridge(`/tree?${params.toString()}`, { signal });
}

async function readWorkspaceFile(path, signal = null) {
    const params = new URLSearchParams({
        path,
        maxBytes: "80000"
    });
    return requestWorkspaceBridge(`/read?${params.toString()}`, { signal });
}

async function runWorkspaceCommand(command, cwd = ".", timeout = 20, signal = null) {
    return requestWorkspaceBridge("/exec", {
        method: "POST",
        body: {
            command,
            cwd: cwd || ".",
            timeout: Math.max(1, Math.min(60, Number(timeout) || 20))
        },
        signal
    });
}

async function getWorkspaceContextForPrompt(text, signal = null) {
    if (!shouldUseWorkspaceBridge(text)) return "";

    if (!hasWorkspaceBridgeAccess()) {
        return "\n\n--- Local Workspace Bridge Context ---\nThe user requested local workspace access, but the bridge is not configured or enabled. Tell them to start `py -3 local-bridge.py --root . --port 8765`, then save the printed URL/token in Settings > Local Workspace Bridge.\n--- End Local Workspace Bridge Context ---";
    }

    const chunks = [];
    const command = extractDirectWorkspaceCommand(text);
    const readPaths = extractDirectReadPaths(text);

    if (shouldListWorkspace(text) || (!command && readPaths.length === 0)) {
        const tree = await listWorkspaceTree(".", 2, signal);
        chunks.push(formatWorkspaceTreeResult(tree));
    }

    for (const path of readPaths) {
        const file = await readWorkspaceFile(path, signal);
        chunks.push(formatWorkspaceFileResult(file));
    }

    if (command) {
        const result = await runWorkspaceCommand(command, ".", 30, signal);
        chunks.push(formatWorkspaceCommandResult(result));
    }

    return `\n\n--- Local Workspace Bridge Context ---\n${chunks.join("\n\n") || "No local tool output was produced."}\n--- End Local Workspace Bridge Context ---`;
}

function parseLocalToolCall(content) {
    const match = String(content || "").match(LOCAL_TOOL_CALL_RE);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[1]);
        if (!parsed || typeof parsed !== "object") return null;
        if (!["workspace_tree", "read_file", "run_command"].includes(parsed.tool)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function stripLocalToolCall(content) {
    return String(content || "").replace(LOCAL_TOOL_CALL_RE, "").trim();
}

function getLocalToolProgressLabel(toolCall) {
    if (toolCall?.tool === "run_command") return "Running local terminal command...";
    if (toolCall?.tool === "read_file") return "Reading local file...";
    return "Inspecting local workspace...";
}

function getLocalToolActivityKind(toolCall) {
    if (toolCall?.tool === "run_command") return "terminal";
    if (toolCall?.tool === "read_file") return "file";
    return "workspace";
}

function getLocalToolActivityDetail(toolCall) {
    if (toolCall?.tool === "run_command") return toolCall.command || "Local command";
    if (toolCall?.tool === "read_file") return toolCall.path || "Local file";
    return toolCall?.path || ".";
}

async function executeLocalToolCall(toolCall, signal = null) {
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("Local workspace bridge is not configured or enabled.");
    }
    if (toolCall.tool === "workspace_tree") {
        return formatWorkspaceTreeResult(await listWorkspaceTree(toolCall.path || ".", toolCall.depth || 2, signal));
    }
    if (toolCall.tool === "read_file") {
        if (!toolCall.path) throw new Error("read_file requires a path.");
        return formatWorkspaceFileResult(await readWorkspaceFile(toolCall.path, signal));
    }
    if (toolCall.tool === "run_command") {
        if (!toolCall.command) throw new Error("run_command requires a command.");
        return formatWorkspaceCommandResult(await runWorkspaceCommand(toolCall.command, toolCall.cwd || ".", toolCall.timeout || 20, signal));
    }
    throw new Error("Unknown local tool.");
}

function formatLocalToolResultForModel(toolCall, resultText) {
    return `[Local workspace tool result]\nTool: ${toolCall.tool}\n${trimLocalToolText(resultText)}\n\nUse this result to answer the user's original request. If the tool failed or was insufficient, say what is missing.`;
}

function buildAssistantSystemPrompt(allowLocalTools = false) {
    return [
        CODE_BLOCK_SYSTEM_PROMPT,
        CLARIFYING_QUESTION_SYSTEM_PROMPT,
        allowLocalTools ? LOCAL_TOOL_SYSTEM_PROMPT : ""
    ].filter(Boolean).join("\n\n");
}

function parseClarifyingQuestionRequest(content) {
    const match = String(content || "").match(CLARIFYING_QUESTION_RE);
    if (!match) return null;

    try {
        const payload = JSON.parse(match[1]);
        return normalizeClarifyingQuestionPayload(payload);
    } catch (err) {
        console.warn("Could not parse Fauna question request:", err);
        return null;
    }
}

function stripClarifyingQuestionRequest(content) {
    return String(content || "").replace(CLARIFYING_QUESTION_RE, "").trim();
}

function normalizeQuestionOption(option) {
    if (typeof option === "string") {
        const text = option.trim();
        return text ? { label: text, value: text } : null;
    }
    if (!option || typeof option !== "object") return null;
    const label = String(option.label || option.text || option.value || "").trim();
    const value = String(option.value || label).trim();
    return label && value ? { label, value } : null;
}

function normalizeClarifyingQuestionPayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    const rawQuestions = Array.isArray(payload.questions) && payload.questions.length > 0
        ? payload.questions
        : [{
            question: payload.question || payload.prompt || payload.title,
            options: payload.options,
            allowCustom: payload.allowCustom,
            placeholder: payload.placeholder
        }];

    const questions = rawQuestions
        .map((item, index) => {
            const source = typeof item === "string" ? { question: item } : item || {};
            const question = String(source.question || source.prompt || source.title || "").trim();
            if (!question) return null;
            const options = Array.isArray(source.options)
                ? source.options.map(normalizeQuestionOption).filter(Boolean).slice(0, 5)
                : [];
            return {
                id: source.id || `question-${index + 1}`,
                question,
                options,
                allowCustom: source.allowCustom !== false,
                placeholder: String(source.placeholder || "Type your answer...").trim()
            };
        })
        .filter(Boolean)
        .slice(0, 3);

    if (questions.length === 0) return null;
    return {
            title: String(payload.title || "Fauna needs one detail").trim(),
        questions
    };
}

function getCurrentClarifyingAnswer() {
    if (!activeClarifyingQuestion) return null;
    return activeClarifyingQuestion.answers[activeClarifyingQuestion.index] || null;
}

function setClarifyingAnswer(answer) {
    if (!activeClarifyingQuestion) return;
    activeClarifyingQuestion.answers[activeClarifyingQuestion.index] = answer;
}

function clearClarifyingQuestionComposer({ focusInput = false } = {}) {
    activeClarifyingQuestion = null;
    if (clarifyingQuestionComposer) {
        clarifyingQuestionComposer.hidden = true;
        clarifyingQuestionComposer.innerHTML = "";
    }
    if (composerPanel) composerPanel.hidden = false;
    inputWrapper?.classList.remove("asking-question");
    if (focusInput) {
        window.setTimeout(() => input?.focus(), 0);
    }
}

function showClarifyingQuestionComposer(request) {
    if (!clarifyingQuestionComposer || !request?.questions?.length) return;
    activeClarifyingQuestion = {
        ...request,
        index: 0,
        answers: new Array(request.questions.length).fill(null)
    };
    if (composerPanel) composerPanel.hidden = true;
    clarifyingQuestionComposer.hidden = false;
    inputWrapper?.classList.add("asking-question");
    renderClarifyingQuestionStep();
}

function createQuestionIconButton(label, path, disabled = false) {
    const button = document.createElement("button");
    button.className = "clarifying-question-icon-btn";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    return button;
}

function renderClarifyingQuestionStep() {
    if (!clarifyingQuestionComposer || !activeClarifyingQuestion) return;

    const state = activeClarifyingQuestion;
    const question = state.questions[state.index];
    const answer = getCurrentClarifyingAnswer();
    clarifyingQuestionComposer.innerHTML = "";

    const card = document.createElement("div");
    card.className = "clarifying-question-card";

    const header = document.createElement("div");
    header.className = "clarifying-question-header";

    const nav = document.createElement("div");
    nav.className = "clarifying-question-nav";

    const previousButton = createQuestionIconButton("Previous question", `<path d="m15 18-6-6 6-6"></path>`, state.index === 0);
    previousButton.addEventListener("click", () => {
        commitClarifyingAnswerFromInputs(false);
        state.index = Math.max(0, state.index - 1);
        renderClarifyingQuestionStep();
    });

    const counter = document.createElement("span");
    counter.className = "clarifying-question-counter";
    counter.textContent = `${state.index + 1} of ${state.questions.length}`;

    const nextButton = createQuestionIconButton("Next question", `<path d="m9 18 6-6-6-6"></path>`, state.index >= state.questions.length - 1);
    nextButton.addEventListener("click", () => {
        if (!commitClarifyingAnswerFromInputs(true)) return;
        state.index = Math.min(state.questions.length - 1, state.index + 1);
        renderClarifyingQuestionStep();
    });

    nav.append(previousButton, counter, nextButton);

    const closeButton = createQuestionIconButton("Dismiss question", `<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>`);
    closeButton.classList.add("clarifying-question-close");
    closeButton.addEventListener("click", () => {
        clearClarifyingQuestionComposer({ focusInput: true });
        showToast("Question dismissed. You can keep typing normally.", "info");
    });

    header.append(nav, closeButton);

    const title = document.createElement("h2");
    title.className = "clarifying-question-title";
    title.textContent = question.question;

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "clarifying-question-options";

    question.options.forEach(option => {
        const optionButton = document.createElement("button");
        optionButton.className = "clarifying-question-option";
        optionButton.type = "button";
        optionButton.setAttribute("aria-pressed", answer?.type === "option" && answer.value === option.value ? "true" : "false");
        if (answer?.type === "option" && answer.value === option.value) {
            optionButton.classList.add("selected");
        }

        const marker = document.createElement("span");
        marker.className = "clarifying-question-option-marker";
        marker.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "clarifying-question-option-label";
        label.textContent = option.label;

        optionButton.append(marker, label);
        optionButton.addEventListener("click", () => {
            setClarifyingAnswer({
                type: "option",
                question: question.question,
                label: option.label,
                value: option.value
            });
            renderClarifyingQuestionStep();
        });

        optionsWrap.appendChild(optionButton);
    });

    const answerRow = document.createElement("div");
    answerRow.className = "clarifying-question-answer-row";

    const pencil = document.createElement("span");
    pencil.className = "clarifying-question-pencil";
    pencil.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path></svg>`;

    const customInput = document.createElement("textarea");
    customInput.className = "clarifying-question-input";
    customInput.rows = 1;
    customInput.placeholder = question.placeholder;
    customInput.setAttribute("aria-label", "Type your answer");
    customInput.disabled = !question.allowCustom;
    if (answer?.type === "custom") {
        customInput.value = answer.value;
    }
    customInput.addEventListener("input", () => {
        customInput.style.height = "auto";
        customInput.style.height = `${customInput.scrollHeight}px`;
        const value = customInput.value.trim();
        if (value) {
            setClarifyingAnswer({
                type: "custom",
                question: question.question,
                label: value,
                value
            });
        } else if (getCurrentClarifyingAnswer()?.type === "custom") {
            setClarifyingAnswer(null);
        }
        renderClarifyingSubmitState();
        clarifyingQuestionComposer.querySelectorAll(".clarifying-question-option").forEach(button => {
            button.classList.remove("selected");
            button.setAttribute("aria-pressed", "false");
        });
    });

    const submitButton = document.createElement("button");
    submitButton.className = "clarifying-question-submit";
    submitButton.type = "button";
    submitButton.setAttribute("aria-label", state.index === state.questions.length - 1 ? "Submit answer" : "Continue to next question");
    submitButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"></path><path d="m13 6 6 6-6 6"></path></svg>`;
    submitButton.addEventListener("click", () => {
        if (!commitClarifyingAnswerFromInputs(true)) return;
        if (state.index < state.questions.length - 1) {
            state.index += 1;
            renderClarifyingQuestionStep();
            return;
        }
        submitClarifyingAnswers();
    });

    answerRow.append(pencil, customInput, submitButton);
    card.append(header, title);
    if (question.options.length > 0) card.appendChild(optionsWrap);
    card.appendChild(answerRow);
    clarifyingQuestionComposer.appendChild(card);

    renderClarifyingSubmitState();
    window.setTimeout(() => {
        const focusTarget = question.options.length > 0
            ? clarifyingQuestionComposer.querySelector(".clarifying-question-option")
            : customInput;
        focusTarget?.focus();
    }, 0);
}

function renderClarifyingSubmitState() {
    const submitButton = clarifyingQuestionComposer?.querySelector(".clarifying-question-submit");
    if (!submitButton) return;
    submitButton.disabled = !getCurrentClarifyingAnswer()?.value;
}

function commitClarifyingAnswerFromInputs(showWarning) {
    if (!activeClarifyingQuestion || !clarifyingQuestionComposer) return false;
    const current = getCurrentClarifyingAnswer();
    const customValue = clarifyingQuestionComposer.querySelector(".clarifying-question-input")?.value?.trim() || "";
    if (customValue) {
        const question = activeClarifyingQuestion.questions[activeClarifyingQuestion.index];
        setClarifyingAnswer({
            type: "custom",
            question: question.question,
            label: customValue,
            value: customValue
        });
        return true;
    }
    if (current?.value) return true;
    if (showWarning) showToast("Choose an option or type an answer first.", "warning");
    return false;
}

function buildClarifyingAnswerPayload(state) {
    const lines = state.questions.map((question, index) => {
        const answer = state.answers[index]?.value || "";
        return `Question: ${question.question}\nAnswer: ${answer}`;
    });
    return `[Answer to Fauna's clarifying question]\n${lines.join("\n\n")}\n\nContinue the original task using this answer.`;
}

function buildClarifyingAnswerDisplay(state) {
    if (state.questions.length === 1) {
        return state.answers[0]?.value || "";
    }
    return state.answers
        .map(answer => answer?.value)
        .filter(Boolean)
        .join("\n");
}

async function submitClarifyingAnswers() {
    if (!activeClarifyingQuestion || isGenerating) return;
    const state = activeClarifyingQuestion;
    const payload = buildClarifyingAnswerPayload(state);
    const displayText = buildClarifyingAnswerDisplay(state);

    clearClarifyingQuestionComposer();
    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    setGeneratingBusy(true);
    let aiBubble = null;

    try {
        welcome.style.display = "none";
        chat.style.display = "block";
        addRenderNode(displayText, "user");
        conversationHistory.push({ role: "user", content: payload });

        aiBubble = addRenderNode("__thinking__", "output");
        const data = await sendOllamaChatWithLocalTools(
            conversationHistory,
            { temperature: parseFloat(activeTemperature) },
            OLLAMA_MODEL,
            generationSignal,
            aiBubble
        );
        const tokenUsage = getOllamaTokenUsage(data, conversationHistory, data.message.content);
        const assistantMessage = getAssistantMessageForConversation(data);
        conversationHistory.push(assistantMessage);
        addSessionTokens(tokenUsage);
        await renderAssistantResponse(data, aiBubble, [], generationSignal);
        chat.scrollTop = chat.scrollHeight;
    } catch (err) {
        if (!aiBubble) aiBubble = addRenderNode("__thinking__", "output");
        renderErrorCard(aiBubble, err);
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
    }
}

function getAssistantMessageForConversation(data) {
    const rawContent = data?.message?.content || "";
    const questionRequest = parseClarifyingQuestionRequest(rawContent);
    const content = stripClarifyingQuestionRequest(rawContent) || (questionRequest ? "I need a little more detail before I continue." : rawContent);
    return {
        ...(data?.message || { role: "assistant" }),
        role: data?.message?.role || "assistant",
        content
    };
}

async function renderAssistantResponse(data, aiBubble, webSources = [], signal = null, speakThisReply = false) {
    const rawContent = data?.message?.content || "";
    const questionRequest = parseClarifyingQuestionRequest(rawContent);
    const assistantMessage = getAssistantMessageForConversation(data);
    await renderTypewriterMarkdown(aiBubble, assistantMessage.content, signal);
    setupCodeSandbox(aiBubble);
    setupCopyFeature(aiBubble.parentElement, assistantMessage.content);
    renderWebSources(aiBubble.parentElement, webSources);
    const shouldPlayVoiceReply = speakThisReply
        && isVoiceReplyEnabled
        && (!isOpenAiProvider() || isOpenAiVoiceSessionActive);
    if (shouldPlayVoiceReply) {
        speakReply(assistantMessage.content);
    } else if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        scheduleOpenAiVoiceRearm();
    }
    if (questionRequest) {
        showClarifyingQuestionComposer(questionRequest);
    }
    return assistantMessage;
}

async function sendOllamaChatWithLocalTools(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, progressTarget = null) {
    const allowLocalTools = hasWorkspaceBridgeAccess();
    const workingMessages = [
        { role: "system", content: buildAssistantSystemPrompt(allowLocalTools) },
        ...cloneConversationHistory(messages)
    ];
    let lastData = null;

    for (let step = 0; step < 3; step += 1) {
        const data = await sendProviderChat(workingMessages, options, preferredModel, signal);
        lastData = data;
        const toolCall = parseLocalToolCall(data.message?.content);
        if (!toolCall) {
            return data;
        }

        if (progressTarget) {
            renderToolActivity(progressTarget, {
                title: getLocalToolProgressLabel(toolCall),
                variant: "simple",
                items: [{
                    kind: getLocalToolActivityKind(toolCall),
                    label: "Local workspace",
                    detail: getLocalToolActivityDetail(toolCall)
                }]
            });
        }

        let resultText = "";
        try {
            resultText = await executeLocalToolCall(toolCall, signal);
        } catch (err) {
            resultText = `Tool failed: ${err.message}`;
        }

        workingMessages.push({ role: "assistant", content: data.message.content });
        workingMessages.push({ role: "user", content: formatLocalToolResultForModel(toolCall, resultText) });
    }

    if (lastData?.message) {
        lastData.message.content = stripLocalToolCall(lastData.message.content)
            || "I reached the local tool limit before forming a final answer. Try asking for a smaller file or one command at a time.";
    }
    return lastData;
}

modelSwitcher = createModelSwitcher({
    button: modelBtn,
    dropdown: modelDropdown,
    label: modelLabel,
    models: availableModels,
    activeModel: OLLAMA_MODEL,
    onSelect: setActiveModel
});
updateModelSwitcherForProvider();

initializeChatSessions();

chatTitleEditBtn?.addEventListener("click", event => {
    event.preventDefault();
    if (isChatTitleEditing) {
        commitChatTitleEdit();
    } else {
        setChatTitleEditing(true);
    }
});

chatTitleInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        commitChatTitleEdit();
    } else if (event.key === "Escape") {
        event.preventDefault();
        cancelChatTitleEdit();
        chatTitleEditBtn?.focus();
    }
});

chatTitleInput?.addEventListener("blur", () => {
    window.setTimeout(() => {
        if (document.activeElement !== chatTitleEditBtn) {
            commitChatTitleEdit();
        }
    }, 0);
});

document.addEventListener("click", event => {
    if (!event.target.closest(".chat-session-menu-wrap")) {
        closeChatSessionMenus();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeChatSessionMenus();
    }
});

chat.addEventListener("click", (e) => {
    const copyButton = e.target.closest(".copy-action-btn");
    if (copyButton && !copyButton._floraCopyAttached && copyButton.dataset.copyText) {
        handleCopyButton(copyButton, copyButton.dataset.copyText);
        return;
    }

    const img = e.target.closest(".bubble-img");
    if (img?.src) imageLightboxController.open(img.src);
});

// ===== FILE HANDLING =====
fileInput.setAttribute("accept", "image/*,.pdf,.txt,.md,.js,.py,.json,.csv");

fileInput.onchange = (e) => {
    if (isGenerating) return;
    Array.from(e.target.files).forEach(file => {
        if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) return;
        attachedFiles.push(file);
        renderPreviewPill(file);
    });
    fileInput.value = "";
    updateTokenDisplay();
};

if (uploadButton) {
    uploadButton.onclick = () => {
        if (isGenerating) return;
        fileInput.click();
    };
}

document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", e => {
    e.preventDefault();
    if (isGenerating) return;
    Array.from(e.dataTransfer.files).forEach(file => {
        if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) return;
        attachedFiles.push(file);
        renderPreviewPill(file);
    });
    updateTokenDisplay();
});

input.addEventListener("paste", e => {
    if (isGenerating) return;
    let addedImage = false;
    Array.from(e.clipboardData.items).forEach(item => {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) return;
            const ext = item.type.split("/")[1] || "png";
            const named = new File([file], "pasted-image." + ext, { type: item.type });
            attachedFiles.push(named);
            renderPreviewPill(named);
            addedImage = true;
        }
    });
    if (addedImage) updateTokenDisplay();
});

function getAttachmentKindLabel(file) {
    if (file.type?.startsWith("image/")) {
        return (file.type.split("/")[1] || "image").toUpperCase();
    }
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
    return (extension || file.type || "file").toUpperCase();
}

function isCodeLikeAttachment(file) {
    return /\.(html?|css|js|mjs|ts|tsx|jsx|json|md|py|ps1|sh)$/i.test(file.name);
}

function renderPreviewPill(file) {
    const isImage = file.type.startsWith("image/");
    const pill = document.createElement("div");
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
    } else if (isCodeLikeAttachment(file)) {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>`;
    } else {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`;
    }

    let meta = null;
    if (!isImage) {
        meta = document.createElement("span");
        meta.className = "preview-file-meta";

        const nameSpan = document.createElement("span");
        nameSpan.className = "preview-file-name";
        nameSpan.textContent = file.name;

        const kindSpan = document.createElement("span");
        kindSpan.className = "preview-file-type";
        kindSpan.textContent = getAttachmentKindLabel(file);

        meta.append(nameSpan, kindSpan);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "remove-preview";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", `Remove ${file.name}`);
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    closeBtn.onclick = () => {
        attachedFiles = attachedFiles.filter(f => f !== file);
        pill.remove();
        updateTokenDisplay();
    };
    pill.append(icon);
    if (meta) pill.append(meta);
    pill.append(closeBtn);
    previewContainer.appendChild(pill);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getImageFiles(files) {
    return files.filter(file => file.type.startsWith("image/"));
}

function setGeneratingBusy(busy) {
    isGenerating = busy;

    document.querySelectorAll("button, input, textarea, select").forEach(control => {
        if (
            control === stopButton
            || control === settingsOpenBtn
            || control === mobileSettingsOpenBtn
            || control === settingsCloseBtn
            || control === themeToggle
            || control === mobileThemeToggle
            || control === voiceStopButton
            || control === voiceQuickSettingsBtn
            || control === voiceReplyToggleBtn
            || control.closest?.("#voiceQuickPanel")
            || control.matches?.("[data-accent-choice]")
        ) {
            control.disabled = false;
            return;
        }
        if (busy) {
            if (!disabledButtonStates.has(control)) {
                disabledButtonStates.set(control, control.disabled);
            }
            control.disabled = true;
        } else {
            control.disabled = disabledButtonStates.get(control) || false;
        }
    });

    if (!busy) {
        disabledButtonStates.clear();
    }

    if (stopButton) {
        stopButton.hidden = !busy;
        stopButton.disabled = false;
    }
    if (sendButton) {
        sendButton.hidden = busy;
        sendButton.setAttribute("aria-busy", busy ? "true" : "false");
    }
}

function cancelActiveGeneration() {
    if (!activeRequestController) return;
    activeRequestController.abort();
    showToast("Generation stopped.", "info");
}

// ===== PROCESSING PIPELINE =====
sendButton.onclick = processWorkspaceEntry;
input.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!isGenerating) processWorkspaceEntry();
    }
});
input.addEventListener("input", () => {
    if (!isVoiceInputUpdate) {
        shouldSpeakNextReply = false;
    }
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    updateTokenDisplay();
});

async function processWorkspaceEntry() {
    if (isGenerating) return;

    const textValue = input.value.trim();
    if (!textValue && attachedFiles.length === 0) return;
    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    const speakThisReply = shouldSpeakNextReply && textValue.length > 0;
    const videoPrompt = getVideoCommandPrompt(textValue);
    const imagePrompt = getImageCommandPrompt(textValue) ?? getNaturalImageGenerationPrompt(textValue, attachedFiles);
    shouldSpeakNextReply = false;

    setGeneratingBusy(true);
    if (isOpenAiProvider() && isOpenAiVoiceSessionActive && speakThisReply) {
        setVoiceSessionStatus("Thinking", 0.34);
    }

    try {
        welcome.style.display = "none";
        chat.style.display = "block";

        const currentFiles = [...attachedFiles];
        input.value = "";
        input.style.height = "auto";
        previewContainer.innerHTML = "";
        attachedFiles = [];
        updateTokenDisplay();

        const routedModel = chooseModelForRequest(textValue, currentFiles, imagePrompt, videoPrompt);
        if (isOpenAiProvider()) {
            updateModelSwitcherForProvider();
        } else {
            setActiveModel(routedModel, { switchToLocal: false });
        }

        addRenderNode(textValue, "user", currentFiles);

        if (videoPrompt !== null) {
            await processVideoGeneration(videoPrompt, currentFiles, generationSignal);
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        if (imagePrompt !== null) {
            await processImageGeneration(imagePrompt, currentFiles, generationSignal);
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        if (isImageEditRequest(textValue, currentFiles)) {
            await processImageEdit(textValue, currentFiles, generationSignal);
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        let messageContent = speakThisReply ? `${textValue}${getVoiceModeInstruction()}` : textValue;
        let base64Images = [];
        let openAiImageFileIds = [];
        const aiBubble = addRenderNode("__thinking__", "output");
        let webSources = [];
        const openAiUploadItems = [];

        for (const file of currentFiles) {
            if (file.type.startsWith("image/")) {
                try {
                    if (isOpenAiProvider()) {
                        const uploadItem = {
                            kind: "image",
                            label: "OpenAI image upload",
                            detail: file.name || "image",
                            meta: "Uploading"
                        };
                        openAiUploadItems.push(uploadItem);
                        renderToolActivity(aiBubble, {
                            title: "Thinking about",
                            items: openAiUploadItems
                        });
                        openAiImageFileIds.push(await uploadOpenAiVisionImage(file, generationSignal));
                        uploadItem.meta = "Uploaded";
                        renderToolActivity(aiBubble, {
                            title: "Thinking about",
                            items: openAiUploadItems
                        });
                    } else {
                        const b64 = await fileToBase64(file);
                        base64Images.push(b64);
                    }
                } catch (err) {
                    console.error("Image loading fail:", err);
                    if (isOpenAiProvider()) {
                        renderErrorCard(aiBubble, err, {
                            title: err.name === "AbortError" ? "Image upload stopped" : "Image upload failed",
                            message: err.name === "AbortError"
                                ? "Your prompt is safe to edit and run again."
                                : "Fauna could not upload the image to OpenAI. Check the API key, file type, and file size."
                        });
                        return;
                    }
                    messageContent += `\n\n[Image attachment could not be prepared: ${file.name || "image"} (${err.message})]`;
                }
            } else {
                try {
                    const textContent = await file.text();
                    messageContent += `\n\n--- Attached File Content: ${file.name} ---\n${textContent}\n-----------------------`;
                } catch (err) {
                    messageContent += `\n\n[Error reading file context item: ${file.name}]`;
                }
            }
        }

        const hasImageAttachments = base64Images.length > 0 || openAiImageFileIds.length > 0;

        if (!hasImageAttachments && shouldSearchWeb(textValue)) {
            const webSearchQuery = buildSearchQuery(textValue);
            renderToolActivity(aiBubble, {
                title: "Thinking about",
                items: [{
                    kind: "web",
                    label: "Web search",
                    detail: webSearchQuery,
                    meta: "Searching"
                }]
            });
            try {
                const webResult = await getWebContextForPrompt(textValue);
                renderToolActivity(aiBubble, {
                    title: "Thinking about",
                    items: [{
                        kind: "web",
                        label: "Web search",
                        detail: webResult.query || webSearchQuery,
                        meta: `${webResult.resultCount ?? webResult.sources.length} results`
                    }]
                });
                if (webResult.context) {
                    messageContent += webResult.context;
                    webSources = webResult.sources;
                }
            } catch (err) {
                messageContent += `\n\n[Web search was requested, but the browser could not fetch online results: ${err.message}]`;
            }
        }

        if (!hasImageAttachments && shouldUseWorkspaceBridge(textValue)) {
            renderToolActivity(aiBubble, {
                title: "Inspecting local workspace...",
                variant: "simple"
            });
            try {
                messageContent += await getWorkspaceContextForPrompt(textValue, generationSignal);
            } catch (err) {
                messageContent += `\n\n[Local workspace bridge was requested, but the app could not access it: ${err.message}]`;
            }
        }

        const userMessageObject = { role: "user", content: messageContent };
        if (base64Images.length > 0) {
            userMessageObject.images = base64Images;
        }
        if (openAiImageFileIds.length > 0) {
            userMessageObject.openAiImageFileIds = openAiImageFileIds;
        }
        conversationHistory.push(userMessageObject);

        try {
            const data = await sendOllamaChatWithLocalTools(
                conversationHistory,
                { temperature: parseFloat(activeTemperature) },
                OLLAMA_MODEL,
                generationSignal,
                aiBubble
            );
            const tokenUsage = getOllamaTokenUsage(data, conversationHistory, data.message.content);
            const assistantMessage = getAssistantMessageForConversation(data);
            conversationHistory.push(assistantMessage);

            addSessionTokens(tokenUsage);
            await renderAssistantResponse(data, aiBubble, webSources, generationSignal, speakThisReply);

        } catch (e) {
            renderErrorCard(aiBubble, e);
        }

        chat.scrollTop = chat.scrollHeight;
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            scheduleOpenAiVoiceRearm();
        }
    }
}

function getImageCommandPrompt(text) {
    const match = text.match(/^\/(?:image|img|imagine)(?:\s+([\s\S]+))?$/i);
    if (!match) return null;
    return (match[1] || "").trim();
}

function getVideoCommandPrompt(text) {
    const match = text.match(/^\/(?:video|vid|clip)(?:\s+([\s\S]+))?$/i);
    if (!match) return null;
    return (match[1] || "").trim();
}

function getNaturalImageGenerationPrompt(text, currentFiles) {
    if (!text || getImageFiles(currentFiles).length > 0) return null;

    const match = text.match(/^(?:please\s+)?(?:create|generate|draw|make|design|imagine)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|poster)\s+(?:of|showing|with|for)?\s*([\s\S]+)$/i);
    if (!match) return null;

    return match[1]?.trim() || text.trim();
}

function isImageEditRequest(text, currentFiles) {
    if (!text || getImageFiles(currentFiles).length === 0) return false;
    return /\b(change|edit|modify|replace|remove|add|make|turn|transform|swap|fix|adjust|enhance|alter|recolor|background|kleur|verander|wysig|maak|verwyder|voeg|agtergrond)\b/i.test(text);
}

function isCodeRequest(text, currentFiles) {
    const hasCodeFiles = currentFiles.some(file => /\.(html|css|js|ts|jsx|tsx|py|json|md|java|cs|cpp|c|go|rs|php|rb|sql|sh|ps1)$/i.test(file.name));
    if (hasCodeFiles) return true;

    return /\b(code|coding|program|script|function|component|debug|fix bug|error|refactor|html|css|javascript|typescript|python|react|node|api|database|sql|terminal|powershell)\b/i.test(text);
}

function isHighThinkingRequest(text) {
    return /\b(analyze|analyse|reason|think deeply|compare|evaluate|strategy|plan|architecture|design decision|pros and cons|trade[- ]?offs|explain why|solve|complex|advanced|proof|math|logic|research|ontleed|vergelyk|strategie|beplan|argitektuur|ingewikkeld)\b/i.test(text);
}

function isSensitiveImagePrompt(text) {
    return /\b(18\+|adult|nsfw|nude|nudity|naked|explicit|erotic|sex|sexual|porn|lingerie|fetish|topless|sensual|seductive|suggestive|bikini|swimsuit|underwear)\b/i.test(text);
}

async function processImageGeneration(prompt, currentFiles, signal = null) {
    if (!prompt) {
        const errorBubble = addRenderNode("__thinking__", "output");
        renderErrorCard(errorBubble, new Error("Type what to generate after the command, for example: /image cat wearing sunglasses"), {
            title: "Image prompt missing",
            message: "Add a short description after /image."
        });
        return;
    }

    throwIfAborted(signal);

    if (getImageFiles(currentFiles).length > 0) {
        await processImageEdit(prompt, currentFiles, signal);
        return;
    }

    if (currentFiles.length > 0) {
        const noteBubble = addRenderNode("Image generation uses the text prompt only. Non-image attachments were shown above but not sent to the image generator.", "output");
        noteBubble.style.color = "#f59e0b";
    }

    addSessionTokens(estimateTokens(prompt));

    conversationHistory.push({ role: "user", content: `[Image prompt] ${prompt}` });

    const aiBubble = addRenderNode("__thinking__", "output");
    const useOpenAi = isOpenAiProvider();
    const imageUrl = useOpenAi ? null : buildImageGenerationUrl(prompt);
    renderCreationProgress(aiBubble, {
        kind: "image",
        title: "Creating image",
        prompt,
        status: "Composing the image request",
        steps: ["Prompt", "Render", "Preview"]
    });
    chat.scrollTop = chat.scrollHeight;

    try {
        updateCreationProgress(aiBubble, "Rendering image", 1);
        const generatedImageUrl = useOpenAi ? await generateOpenAiImage(prompt, signal) : imageUrl;
        await preloadImage(generatedImageUrl, signal);
        updateCreationProgress(aiBubble, "Preparing preview", 2);
        renderGeneratedImage(aiBubble, prompt, generatedImageUrl, "Generated image", isSensitiveImagePrompt(prompt));
        conversationHistory.push({
            role: "assistant",
            content: `Generated image for: ${prompt}\n\n![Generated image](${generatedImageUrl})`
        });
        setupCopyFeature(aiBubble.parentElement, generatedImageUrl);
    } catch (e) {
        renderErrorCard(aiBubble, e, {
            title: e.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: e.name === "AbortError"
                ? "Your prompt is safe to edit and run again."
                : isOpenAiProvider()
            ? "Fauna could not create the image through OpenAI. Check the key, image model, and account limits."
            : "Fauna could not create the image. Check your connection and try again."
        });
    }
}

async function processImageEdit(requestText, currentFiles, signal = null) {
    if (!requestText) {
        const errorBubble = addRenderNode("__thinking__", "output");
        renderErrorCard(errorBubble, new Error("Tell me what to change in the attached image."), {
            title: "Edit instruction missing",
            message: "Describe the change you want Fauna to make to the attached image."
        });
        return;
    }

    const imageFiles = getImageFiles(currentFiles);
    if (imageFiles.length === 0) {
        await processImageGeneration(requestText, currentFiles, signal);
        return;
    }

    const aiBubble = addRenderNode("__thinking__", "output");
    renderCreationProgress(aiBubble, {
        kind: "image",
        title: "Editing image",
        prompt: requestText,
        status: "Reading attached image",
        steps: ["Analyze", "Prompt", "Render"]
    });
    chat.scrollTop = chat.scrollHeight;

    try {
        throwIfAborted(signal);

        if (isOpenAiProvider()) {
            updateCreationProgress(aiBubble, "Sending image edit", 1);
            const imageUrl = await editOpenAiImage(requestText, imageFiles, signal);
            updateCreationProgress(aiBubble, "Preparing preview", 2);
            await preloadImage(imageUrl, signal);
            renderGeneratedImage(aiBubble, requestText, imageUrl, "Generated edit", isSensitiveImagePrompt(requestText));

            conversationHistory.push({
                role: "user",
                content: `[Image edit request] ${requestText}`
            });
            conversationHistory.push({
                role: "assistant",
                content: `Generated image edit for: ${requestText}\n\n![Generated edit](${imageUrl})`
            });
            setupCopyFeature(aiBubble.parentElement, imageUrl);
            return;
        }

        updateCreationProgress(aiBubble, "Writing edit prompt", 1);
        const editPrompt = await buildImageEditPrompt(requestText, imageFiles, signal);
        const imageUrl = buildImageGenerationUrl(editPrompt);

        updateCreationProgress(aiBubble, "Rendering edited image", 2);
        await preloadImage(imageUrl, signal);
        renderGeneratedImage(aiBubble, editPrompt, imageUrl, "Generated edit", isSensitiveImagePrompt(`${requestText} ${editPrompt}`));

        conversationHistory.push({
            role: "user",
            content: `[Image edit request] ${requestText}`
        });
        conversationHistory.push({
            role: "assistant",
            content: `Generated image edit for: ${editPrompt}\n\n![Generated edit](${imageUrl})`
        });
        setupCopyFeature(aiBubble.parentElement, imageUrl);
    } catch (e) {
        renderErrorCard(aiBubble, e, {
            title: e.name === "AbortError" ? "Image edit stopped" : "Image edit failed",
            message: e.name === "AbortError"
                ? "Your edit request is safe to adjust and run again."
                : isOpenAiProvider()
            ? "Fauna could not edit the image through OpenAI. Check the key, image model, and attached image."
            : `Fauna could not prepare the edit. Make sure Ollama is running and "${IMAGE_EDIT_MODEL}" is installed.`
        });
    }
}

async function buildImageEditPrompt(requestText, imageFiles, signal = null) {
    const base64Images = [];

    for (const file of imageFiles.slice(0, 3)) {
        base64Images.push(await fileToBase64(file));
    }

    const editMessages = [
        {
            role: "system",
            content: IMAGE_EDIT_SYSTEM_PROMPT
        },
        {
            role: "user",
            content: `Requested image change: ${requestText}`,
            images: base64Images
        }
    ];
    const data = await sendOllamaChat(
        editMessages,
        { temperature: 0.35 },
        IMAGE_EDIT_MODEL,
        signal
    );
    const prompt = data?.message?.content?.trim();
    if (!prompt) throw new Error("No edit prompt returned");

    addSessionTokens(getOllamaTokenUsage(data, editMessages, prompt));

    return prompt.replace(/^["']|["']$/g, "");
}

async function processVideoGeneration(prompt, currentFiles, signal = null) {
    if (!prompt) {
        const errorBubble = addRenderNode("__thinking__", "output");
        renderErrorCard(errorBubble, new Error("Type what to generate after the command, for example: /video neon forest flythrough"), {
            title: "Video prompt missing",
            message: "Add a short scene description after /video."
        });
        return;
    }

    if (currentFiles.length > 0) {
        const noteBubble = addRenderNode("Video generation uses the text prompt only. Attachments were shown above but not sent to the clip generator.", "output");
        noteBubble.style.color = "#f59e0b";
    }

    addSessionTokens(estimateTokens(prompt));

    conversationHistory.push({ role: "user", content: `[Video prompt, 10 seconds] ${prompt}` });

    const aiBubble = addRenderNode("__thinking__", "output");
    renderCreationProgress(aiBubble, {
        kind: "video",
        title: "Creating video",
        prompt,
        status: "Preparing video workflow",
        steps: ["Workflow", "Render", "Encode"]
    });

    try {
        throwIfAborted(signal);
        updateCreationProgress(aiBubble, "Rendering video frames", 1);
        const videoResult = await generateWanVideo(prompt, signal);

        updateCreationProgress(aiBubble, "Encoding clip", 2);
        renderGeneratedVideo(aiBubble, prompt, videoResult.url, videoResult.extension, videoResult.label);
        conversationHistory.push({
            role: "assistant",
            content: `Generated Wan video clip for: ${prompt}\n\n${videoResult.url}`
        });
        setupCopyFeature(aiBubble.parentElement, videoResult.url);
    } catch (e) {
        if (e.name === "AbortError") {
            renderErrorCard(aiBubble, e, {
                title: "Video generation stopped",
                message: "Your video prompt is safe to edit and run again."
            });
            return;
        }
        try {
            const fallbackNote = `${e.message}. Falling back to Fauna's local animated clip generator.`;
            renderCreationProgress(aiBubble, {
                kind: "video",
                title: "Creating fallback clip",
                prompt,
                status: "Generating a cinematic still",
                steps: ["Still", "Motion", "Encode"]
            });
            const imageUrl = buildImageGenerationUrl(`${prompt}, cinematic still frame, high detail, wide shot`);
            updateCreationProgress(aiBubble, "Loading source frame", 0);
            const sourceImage = await loadImageElement(imageUrl, signal);
            updateCreationProgress(aiBubble, "Animating camera motion", 1);
            const videoResult = await createTenSecondClip(sourceImage, prompt, signal);

            updateCreationProgress(aiBubble, "Finalizing clip", 2);
            renderGeneratedVideo(aiBubble, prompt, videoResult.url, videoResult.extension, "Fallback animated clip");
            conversationHistory.push({
                role: "assistant",
                content: `Wan was unavailable, so Fauna generated a fallback 10 second animated clip for: ${prompt}\n\n${videoResult.url}`
            });
            setupCopyFeature(aiBubble.parentElement, videoResult.url);
        } catch (fallbackError) {
            renderErrorCard(aiBubble, fallbackError, {
                title: fallbackError.name === "AbortError" ? "Video generation stopped" : "Video generation failed",
                message: fallbackError.name === "AbortError"
                    ? "Your video prompt is safe to edit and run again."
                    : "Fauna could not complete the Wan request or the local fallback clip."
            });
        }
    }
}

function getOpenAiImageUrlFromData(data) {
    const first = data?.data?.[0];
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
    if (first?.url) return first.url;
    throw new Error("OpenAI did not return an image.");
}

async function generateOpenAiImage(prompt, signal = null) {
    const data = await openAiJsonFetch("/images/generations", {
        model: getOpenAiImageModel(),
        prompt,
        size: "1024x1024",
        n: 1
    }, { signal });
    return getOpenAiImageUrlFromData(data);
}

async function editOpenAiImage(prompt, imageFiles, signal = null) {
    if (!imageFiles.length) throw new Error("Attach an image before requesting an OpenAI edit.");

    const formData = new FormData();
    formData.append("model", getOpenAiImageModel());
    formData.append("prompt", prompt);
    formData.append("size", "1024x1024");
    formData.append("image", imageFiles[0], imageFiles[0].name || "image.png");

    const res = await openAiFetch("/images/edits", {
        method: "POST",
        body: formData,
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return getOpenAiImageUrlFromData(data);
}

function buildImageGenerationUrl(prompt) {
    const seed = Math.floor(Math.random() * 1000000000);
    const params = new URLSearchParams({
        width: "1024",
        height: "1024",
        model: "flux",
        nologo: "true",
        private: "true",
        seed: String(seed)
    });

    return `${IMAGE_GEN_BASE_URL}${encodeURIComponent(prompt)}?${params.toString()}`;
}

function getWanWorkflowTemplate() {
    const workflow = window.FLORA_WAN_WORKFLOW || safeLocalStorageGet(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
    if (!workflow) {
        throw new Error(`No Wan workflow configured. Add a ComfyUI API workflow to localStorage key "${WAN_VIDEO_WORKFLOW_STORAGE_KEY}"`);
    }

    try {
        return typeof workflow === "string" ? JSON.parse(workflow) : structuredClone(workflow);
    } catch (err) {
        throw new Error(`Wan workflow JSON is invalid: ${err.message}`);
    }
}

function getWanVideoBaseUrl() {
    const saved = safeLocalStorageGet(WAN_VIDEO_ENDPOINT_STORAGE_KEY);
    return (saved || DEFAULT_WAN_VIDEO_BASE_URL).replace(/\/+$/, "");
}

function applyWanWorkflowPlaceholders(value, prompt, seed) {
    if (typeof value === "string") {
        return value
            .replaceAll("{{PROMPT}}", prompt)
            .replaceAll("{{NEGATIVE_PROMPT}}", "low quality, blurry, distorted, watermark, text")
            .replaceAll("{{SEED}}", String(seed))
            .replaceAll("{{DURATION}}", "10")
            .replaceAll("{{FPS}}", "16");
    }

    if (Array.isArray(value)) {
        return value.map(item => applyWanWorkflowPlaceholders(item, prompt, seed));
    }

    if (value && typeof value === "object") {
        Object.keys(value).forEach(key => {
            value[key] = applyWanWorkflowPlaceholders(value[key], prompt, seed);
        });
    }

    return value;
}

function prepareWanWorkflow(prompt) {
    const seed = Math.floor(Math.random() * 1000000000);
    const workflow = getWanWorkflowTemplate();
    return applyWanWorkflowPlaceholders(workflow, prompt, seed);
}

async function generateWanVideo(prompt, signal = null) {
    const workflow = prepareWanWorkflow(prompt);
    const baseUrl = getWanVideoBaseUrl();
    const queueRes = await fetch(`${baseUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({ prompt: workflow })
    });

    if (!queueRes.ok) {
        throw new Error(`ComfyUI rejected the Wan workflow (${queueRes.status})`);
    }

    const queued = await queueRes.json();
    if (!queued.prompt_id) {
        throw new Error("ComfyUI did not return a prompt id");
    }

    const outputs = await waitForComfyHistory(queued.prompt_id, baseUrl, signal);
    const videoFile = findComfyVideoOutput(outputs);
    if (!videoFile) {
        throw new Error("Wan finished, but no video file was found in ComfyUI output");
    }

    return {
        url: buildComfyViewUrl(videoFile, baseUrl),
        extension: getFileExtension(videoFile.filename) || "mp4",
        label: "Wan generated video"
    };
}

async function waitForComfyHistory(promptId, baseUrl, signal = null) {
    const startedAt = Date.now();
    const timeoutMs = 12 * 60 * 1000;

    while (Date.now() - startedAt < timeoutMs) {
        throwIfAborted(signal);
        const res = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`, { signal });
        if (res.ok) {
            const history = await res.json();
            const result = history[promptId];
            if (result?.outputs) return result.outputs;
        }

        await sleep(2500, signal);
    }

    throw new Error("Wan generation timed out");
}

function findComfyVideoOutput(outputs) {
    const videoExtensions = /\.(mp4|webm|mov|mkv)$/i;

    for (const output of Object.values(outputs)) {
        const candidates = [
            ...(output.videos || []),
            ...(output.gifs || []),
            ...(output.images || [])
        ];
        const match = candidates.find(file => videoExtensions.test(file.filename || ""));
        if (match) return match;
    }

    return null;
}

function buildComfyViewUrl(file, baseUrl = getWanVideoBaseUrl()) {
    const params = new URLSearchParams({
        filename: file.filename,
        type: file.type || "output",
        subfolder: file.subfolder || ""
    });

    return `${baseUrl}/view?${params.toString()}`;
}

function getFileExtension(filename) {
    return filename?.split(".").pop()?.toLowerCase();
}

function sleep(ms, signal = null) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Generation stopped", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Generation stopped", "AbortError"));
        }, { once: true });
    });
}

function preloadImage(src, signal = null) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Generation stopped", "AbortError"));
            return;
        }
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        signal?.addEventListener("abort", () => {
            img.src = "";
            reject(new DOMException("Generation stopped", "AbortError"));
        }, { once: true });
        img.src = src;
    });
}

function loadImageElement(src, signal = null) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Generation stopped", "AbortError"));
            return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        signal?.addEventListener("abort", () => {
            img.src = "";
            reject(new DOMException("Generation stopped", "AbortError"));
        }, { once: true });
        img.src = src;
    });
}

function getSupportedVideoMimeType() {
    const types = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=h264",
        "video/mp4"
    ];

    return types.find(type => MediaRecorder.isTypeSupported(type)) || "";
}

function createTenSecondClip(sourceImage, prompt, signal = null) {
    if (!window.MediaRecorder) {
        return Promise.reject(new Error("MediaRecorder is not supported"));
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);
    const mimeType = getSupportedVideoMimeType();
    if (!mimeType) {
        return Promise.reject(new Error("MP4 recording is not supported in this browser"));
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    const durationMs = 10000;
    const startedAt = performance.now();
    let failed = false;
    const motionProfile = getVideoMotionProfile(prompt);
    const particles = createVideoParticles(prompt, 90, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Generation stopped", "AbortError"));
            return;
        }
        recorder.ondataavailable = event => {
            if (event.data.size > 0) chunks.push(event.data);
        };

        recorder.onerror = event => reject(event.error || new Error("Recording failed"));
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            resolve({
                url: URL.createObjectURL(blob),
                extension: "mp4"
            });
        };

        signal?.addEventListener("abort", () => {
            failed = true;
            try {
                if (recorder.state !== "inactive") recorder.stop();
            } catch (err) {
                reject(err);
            }
            reject(new DOMException("Generation stopped", "AbortError"));
        }, { once: true });

        function drawFrame(now) {
            const progress = Math.min((now - startedAt) / durationMs, 1);
            const eased = progress * progress * (3 - 2 * progress);
            const time = (now - startedAt) / 1000;
            const camera = getVideoCameraState(motionProfile, eased, time);

            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            try {
                drawImageLayer(ctx, sourceImage, canvas, camera.backgroundScale, camera.backgroundX, camera.backgroundY, 0.42);
                drawImageLayer(ctx, sourceImage, canvas, camera.mainScale, camera.mainX, camera.mainY, 1);
            } catch (e) {
                failed = true;
                if (recorder.state === "recording") recorder.stop();
                reject(new Error("The generated image could not be recorded by this browser"));
                return;
            }

            drawVideoAtmosphere(ctx, canvas, motionProfile, particles, progress, time);

            if (!failed && progress < 1 && recorder.state === "recording") {
                requestAnimationFrame(drawFrame);
            } else if (!failed && recorder.state === "recording") {
                recorder.stop();
            }
        }

        recorder.start();
        requestAnimationFrame(drawFrame);
    });
}

function getVideoMotionProfile(prompt) {
    const text = prompt.toLowerCase();

    if (/\b(fly|flythrough|drone|aerial|speed|race|tunnel|city)\b/.test(text)) return "flythrough";
    if (/\b(storm|rain|lightning|thunder|snow|blizzard)\b/.test(text)) return "storm";
    if (/\b(ocean|sea|water|river|lake|wave|underwater)\b/.test(text)) return "water";
    if (/\b(neon|cyberpunk|club|night|laser|glow)\b/.test(text)) return "neon";
    if (/\b(fire|lava|volcano|explosion|ember|burning)\b/.test(text)) return "fire";
    if (/\b(space|galaxy|planet|stars|cosmic|nebula)\b/.test(text)) return "space";
    return "cinematic";
}

function getVideoCameraState(profile, eased, time) {
    const drift = Math.sin(time * 0.9) * 18;
    const bob = Math.cos(time * 0.65) * 12;
    const states = {
        flythrough: {
            backgroundScale: 1.22 + eased * 0.18,
            mainScale: 1.08 + eased * 0.26,
            mainX: -80 + eased * 160,
            mainY: bob,
            backgroundX: 60 - eased * 120,
            backgroundY: -bob
        },
        storm: {
            backgroundScale: 1.2,
            mainScale: 1.13 + Math.sin(time * 1.7) * 0.015,
            mainX: drift * 0.7,
            mainY: bob * 0.7,
            backgroundX: -drift,
            backgroundY: bob
        },
        water: {
            backgroundScale: 1.18 + Math.sin(time * 0.45) * 0.02,
            mainScale: 1.1 + eased * 0.08,
            mainX: Math.sin(time * 0.55) * 36,
            mainY: Math.sin(time * 1.1) * 18,
            backgroundX: Math.cos(time * 0.4) * 45,
            backgroundY: Math.sin(time * 0.35) * 20
        },
        neon: {
            backgroundScale: 1.24,
            mainScale: 1.12 + eased * 0.12,
            mainX: Math.sin(time * 1.6) * 26,
            mainY: Math.cos(time * 1.2) * 16,
            backgroundX: Math.sin(time * 0.8) * -60,
            backgroundY: 0
        },
        fire: {
            backgroundScale: 1.18,
            mainScale: 1.11 + Math.sin(time * 2.4) * 0.018,
            mainX: drift * 0.35,
            mainY: -eased * 44 + bob * 0.3,
            backgroundX: -drift * 0.5,
            backgroundY: eased * 32
        },
        space: {
            backgroundScale: 1.16 + eased * 0.12,
            mainScale: 1.06 + eased * 0.16,
            mainX: Math.sin(time * 0.28) * 60,
            mainY: Math.cos(time * 0.24) * 34,
            backgroundX: -Math.sin(time * 0.2) * 90,
            backgroundY: -Math.cos(time * 0.18) * 50
        },
        cinematic: {
            backgroundScale: 1.2 + eased * 0.06,
            mainScale: 1.08 + eased * 0.12,
            mainX: drift,
            mainY: bob,
            backgroundX: -drift * 1.2,
            backgroundY: -bob
        }
    };

    return states[profile] || states.cinematic;
}

function drawImageLayer(ctx, sourceImage, canvas, scale, offsetX, offsetY, opacity) {
    const drawWidth = canvas.width * scale;
    const drawHeight = canvas.height * scale;

    ctx.save();
    ctx.globalAlpha = opacity;
    if (opacity < 1) ctx.filter = "blur(16px) saturate(1.2)";
    ctx.drawImage(
        sourceImage,
        (canvas.width - drawWidth) / 2 + offsetX,
        (canvas.height - drawHeight) / 2 + offsetY,
        drawWidth,
        drawHeight
    );
    ctx.restore();
}

function createVideoParticles(prompt, count, width, height) {
    const profile = getVideoMotionProfile(prompt);
    return Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: profile === "space" ? Math.random() * 2.2 + 0.5 : Math.random() * 4 + 1,
        speed: Math.random() * 0.8 + 0.25,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.45 + 0.1,
        hue: Math.random()
    }));
}

function drawVideoAtmosphere(ctx, canvas, profile, particles, progress, time) {
    const flash = profile === "storm" && Math.sin(time * 8) > 0.94 ? 0.24 : 0;
    const vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.1,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.72
    );

    vignette.addColorStop(0, `rgba(255,255,255,${flash})`);
    vignette.addColorStop(0.55, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colorWash = {
        neon: "rgba(0, 180, 255, 0.16)",
        fire: "rgba(255, 110, 20, 0.18)",
        water: "rgba(20, 150, 190, 0.14)",
        storm: "rgba(140, 170, 210, 0.16)",
        space: "rgba(90, 70, 180, 0.18)",
        flythrough: "rgba(255, 255, 255, 0.08)",
        cinematic: "rgba(255, 220, 160, 0.08)"
    }[profile] || "rgba(255,255,255,0.08)";

    ctx.fillStyle = colorWash;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        let x = particle.x;
        let y = particle.y;

        if (profile === "storm") {
            x = (particle.x + time * 420 * particle.speed) % canvas.width;
            y = (particle.y + time * 760 * particle.speed) % canvas.height;
            ctx.strokeStyle = `rgba(210, 230, 255, ${particle.alpha})`;
            ctx.lineWidth = particle.size * 0.45;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 18, y + 38);
            ctx.stroke();
            return;
        }

        if (profile === "fire") {
            y = canvas.height - ((canvas.height - particle.y + time * 140 * particle.speed) % canvas.height);
            x = particle.x + Math.sin(time * 2 + particle.phase) * 24;
            ctx.fillStyle = `rgba(255, ${120 + particle.hue * 90}, 35, ${particle.alpha})`;
        } else if (profile === "space") {
            x = (particle.x + Math.sin(time * 0.2 + particle.phase) * 18) % canvas.width;
            y = (particle.y + time * 22 * particle.speed) % canvas.height;
            ctx.fillStyle = `rgba(235, 240, 255, ${particle.alpha + 0.2})`;
        } else if (profile === "neon") {
            x = (particle.x + Math.sin(time * 1.8 + particle.phase) * 70) % canvas.width;
            y = (particle.y + time * 70 * particle.speed) % canvas.height;
            ctx.fillStyle = particle.hue > 0.5 ? `rgba(0, 220, 255, ${particle.alpha})` : `rgba(255, 55, 190, ${particle.alpha})`;
        } else {
            x = (particle.x + Math.sin(time + particle.phase) * 28) % canvas.width;
            y = (particle.y + time * 38 * particle.speed) % canvas.height;
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha * 0.6})`;
        }

        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = `rgba(255,255,255,${0.025 + Math.sin(time * 16) * 0.01})`;
    for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1);
    }

    ctx.fillStyle = `rgba(0,0,0,${0.1 * progress})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderGeneratedImage(container, prompt, imageUrl, label = "Generated image", isSensitive = false) {
    container.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "tool-activity-bubble");
    container.removeAttribute("aria-busy");
    container.innerHTML = "";

    const imageWrap = document.createElement("div");
    imageWrap.className = "generated-image-card";
    if (isSensitive) {
        imageWrap.classList.add("sensitive-image-card");
    }

    const img = document.createElement("img");
    img.className = "bubble-img generated-image";
    img.src = imageUrl;
    img.alt = prompt;

    const caption = document.createElement("div");
    caption.className = "generated-image-caption";
    caption.textContent = `${label}: ${prompt}`;

    imageWrap.appendChild(img);

    if (isSensitive) {
        const overlay = document.createElement("div");
        overlay.className = "sensitive-image-overlay";

        const warning = document.createElement("div");
        warning.className = "sensitive-image-warning";
        warning.textContent = "Potential 18+ image";

        const revealBtn = document.createElement("button");
        revealBtn.className = "sensitive-image-reveal";
        revealBtn.type = "button";
        revealBtn.textContent = "Show image";
        revealBtn.onclick = (e) => {
            e.stopPropagation();
            imageWrap.classList.add("sensitive-image-revealed");
        };

        overlay.appendChild(warning);
        overlay.appendChild(revealBtn);
        imageWrap.appendChild(overlay);
    }

    imageWrap.appendChild(caption);
    container.appendChild(imageWrap);
}

function renderGeneratedVideo(container, prompt, videoUrl, extension = "mp4", label = "Generated 10 second clip") {
    container.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "tool-activity-bubble");
    container.removeAttribute("aria-busy");
    container.innerHTML = "";

    const videoWrap = document.createElement("div");
    videoWrap.className = "generated-video-card";

    const video = document.createElement("video");
    video.className = "generated-video";
    video.src = videoUrl;
    video.controls = true;
    video.loop = true;
    video.playsInline = true;

    const caption = document.createElement("div");
    caption.className = "generated-image-caption";
    caption.textContent = `${label}: ${prompt}`;

    const download = document.createElement("a");
    download.className = "generated-video-download";
    download.href = videoUrl;
    download.download = `fauna-clip.${extension}`;
    download.textContent = "Download clip";

    videoWrap.appendChild(video);
    videoWrap.appendChild(caption);
    videoWrap.appendChild(download);
    container.appendChild(videoWrap);
}

function addRenderNode(text, type, fileArray = []) {
    const node = document.createElement("div");
    node.className = `message-node ${type}-node`;

    const avatar = document.createElement("div");
    avatar.className = "avatar-wrapper";
    if (type === "user") {
        avatar.textContent = "U";
    } else {
        avatar.innerHTML = `<svg class="flora-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.09 6.26L20.82 9.18l-5.09 3.7L17.82 20 12 16.27 6.18 20l1.09-7.12-5.09-3.7 6.73-.92L12 2z"/></svg>`;
        avatar.setAttribute("aria-label", "Fauna");
    }
    node.appendChild(avatar);

    const block = document.createElement("div");
    block.className = "bubble-block";

    const bubble = document.createElement("div");
    bubble.className = "bubble markdown";
    if (text === "__thinking__") {
        bubble.innerHTML = `
            <div class="skeleton-block" role="status" aria-label="Fauna is thinking">
                <div class="skeleton-header">
                    <span class="skeleton-orb" aria-hidden="true"></span>
                    <span class="thinking-label">
                        Thinking
                        <span class="thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>
                    </span>
                </div>
                <div class="skeleton-paragraph">
                    <div class="skeleton-line skeleton-line-wide"></div>
                    <div class="skeleton-line skeleton-line-full"></div>
                    <div class="skeleton-line skeleton-line-mid"></div>
                </div>
            </div>`;
    } else {
        bubble.textContent = text;
    }

    let attachContainer = null;
    if (fileArray.length > 0) {
        attachContainer = document.createElement("div");
        attachContainer.className = "bubble-attachments";
        fileArray.forEach(file => {
            if (file.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.className = "bubble-img";
                img.src = URL.createObjectURL(file);
                attachContainer.appendChild(img);
            } else {
                const badge = document.createElement("div");
                badge.className = "bubble-file-badge";
                const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                icon.setAttribute("width", "12");
                icon.setAttribute("height", "12");
                icon.setAttribute("viewBox", "0 0 24 24");
                icon.setAttribute("fill", "none");
                icon.setAttribute("stroke", "currentColor");
                icon.setAttribute("stroke-width", "2");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z");
                icon.appendChild(path);
                const label = document.createElement("span");
                label.textContent = file.name;
                badge.appendChild(icon);
                badge.appendChild(label);
                attachContainer.appendChild(badge);
            }
        });
    }

    if (attachContainer && type === "user") {
        block.appendChild(attachContainer);
    } else if (attachContainer) {
        bubble.appendChild(attachContainer);
    }

    block.appendChild(bubble);

    if (type === "output" && text !== "__thinking__") {
        setupCopyFeature(block, text);
    }

    node.appendChild(block);
    chat.appendChild(node);
    chat.scrollTop = chat.scrollHeight;
    return bubble;
}

async function handleCopyButton(copyBtn, rawTextToCopy) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(rawTextToCopy);
        } else {
            const temp = document.createElement("textarea");
            temp.value = rawTextToCopy;
            temp.setAttribute("readonly", "");
            temp.style.position = "fixed";
            temp.style.opacity = "0";
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
        }
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 1800);
        showToast("Copied.", "success");
    } catch (err) {
        showToast("Copy failed. Select the text manually.", "error");
    }
}

function setupCopyFeature(parentBubbleBlock, rawTextToCopy) {
    const existing = parentBubbleBlock.querySelector(".copy-action-btn");
    if (existing) existing.remove();

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-action-btn";
    copyBtn.setAttribute("aria-label", "Copy output content");
    copyBtn.dataset.copyText = rawTextToCopy;
    copyBtn._floraCopyAttached = true;
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, rawTextToCopy));
    parentBubbleBlock.appendChild(copyBtn);
}

function getSourceHost(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function renderWebSources(parentBubbleBlock, sources) {
    if (!parentBubbleBlock || !sources || sources.length === 0) return;

    const validSources = sources.filter(source => source && source.url);
    if (validSources.length === 0) return;

    const existingSources = parentBubbleBlock.querySelector(".web-sources");
    if (existingSources) existingSources.remove();

    const panel = document.createElement("div");
    panel.className = "web-sources";

    const title = document.createElement("div");
    title.className = "web-sources-title";
    title.textContent = validSources.length === 1 ? "Source" : "Sources";
    panel.appendChild(title);

    validSources.forEach((source, index) => {
        const host = getSourceHost(source.url);
        const label = source.title || host || source.url;
        const link = document.createElement("a");
        link.className = "web-source-pill";
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Open source ${index + 1}: ${label}`);

        const indexBadge = document.createElement("span");
        indexBadge.className = "web-source-index";
        indexBadge.textContent = String(index + 1);
        link.appendChild(indexBadge);

        const labelText = document.createElement("span");
        labelText.className = "web-source-label";
        labelText.textContent = label;
        link.appendChild(labelText);

        if (host) {
            const domainText = document.createElement("span");
            domainText.className = "web-source-domain";
            domainText.textContent = host;
            link.appendChild(domainText);
        }

        const externalIcon = document.createElement("span");
        externalIcon.className = "web-source-external";
        externalIcon.setAttribute("aria-hidden", "true");
        externalIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/><path d="M5 5h7v2H7v10h10v-5h2v7H5V5z"/></svg>`;
        link.appendChild(externalIcon);

        panel.appendChild(link);
    });

    parentBubbleBlock.appendChild(panel);
}

// ===== MARKDOWN ENGINE =====
function renderMarkdown(md) {
    const escape = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const lines = md.split("\n");
    let html = "", inCode = false, codeLang = "", codeBuffer = "", inUL = false, inOL = false;

    const closeList = () => {
        if (inUL) { html += "</ul>"; inUL = false; }
        if (inOL) { html += "</ol>"; inOL = false; }
    };

    const inlineFormat = str => {
        let safe = escape(str);
        safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
        safe = safe.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
        safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
        return safe;
    };

    const renderCodeBlock = () => {
        const lang = normalizeCodeLanguage(codeLang);
        const label = getCodeLanguageLabel(lang);
        const className = lang ? `lang-${escape(lang)}` : "";
        const rawCode = codeBuffer.replace(/\n$/,"");
        return `<div class="code-block-wrapper markdown-code-block"><div class="code-block-header"><span class="code-lang-label">${escape(label)}</span></div><pre><code class="${className}">${highlightCode(rawCode, lang)}</code></pre></div>`;
    };

    for (const raw of lines) {
        const fence = raw.match(/^```\s*([^\s`]*)?.*$/);
        if (fence) {
            if (!inCode) {
                closeList();
                inCode = true;
                codeLang = normalizeCodeLanguage(fence[1]);
                codeBuffer = "";
            } else {
                html += renderCodeBlock();
                inCode = false;
            }
            continue;
        }
        if (inCode) {
            codeBuffer += raw + "\n";
            continue;
        }

        const h = raw.match(/^(#{1,6})\s+(.*)/);
        if (h) {
            closeList();
            html += "<h" + h[1].length + ">" + inlineFormat(h[2]) + "</h" + h[1].length + ">";
            continue;
        }

        const ul = raw.match(/^[\*\-\+]\s+(.*)/);
        if (ul) {
            if (!inUL) { closeList(); html += "<ul>"; inUL = true; }
            html += "<li>" + inlineFormat(ul[1]) + "</li>";
            continue;
        }

        const ol = raw.match(/^\d+\.\s+(.*)/);
        if (ol) {
            if (!inOL) { closeList(); html += "<ol>"; inOL = true; }
            html += "<li>" + inlineFormat(ol[1]) + "</li>";
            continue;
        }

        if (raw.trim() === "") {
            closeList();
            continue;
        }

        closeList();
        html += "<p>" + inlineFormat(raw) + "</p>";
    }
    closeList();
    if (inCode) {
        html += renderCodeBlock();
    }
    return html;
}

// ===== SECURE CODE SANDBOX SYSTEM =====
const PREVIEW_HTML_LANGS = new Set(["html", "htm", "xhtml", "svg"]);
const PREVIEW_JS_LANGS = new Set(["js", "javascript", "mjs", "jsx", "ts", "typescript"]);
const PREVIEW_CSS_LANGS = new Set(["css"]);
const PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";
const CODE_DOWNLOAD_EXTENSIONS = {
    html: "html",
    htm: "html",
    xhtml: "html",
    svg: "svg",
    css: "css",
    js: "js",
    javascript: "js",
    mjs: "mjs",
    jsx: "jsx",
    ts: "ts",
    typescript: "ts",
    tsx: "tsx",
    json: "json",
    py: "py",
    python: "py",
    sh: "sh",
    bash: "sh",
    shell: "sh",
    ps1: "ps1",
    powershell: "ps1",
    md: "md",
    markdown: "md",
    sql: "sql",
    yaml: "yaml",
    yml: "yml"
};
let activeCodeWorkbench = null;

function looksLikeHtml(code) {
    return /^\s*<(!DOCTYPE|html|head|body|div|section|main|article|button|form|canvas|svg|style|script|p|h[1-6]|ul|ol|table|nav|header|footer|input|label|select|textarea|iframe)/i.test(code);
}

function looksLikeCss(code) {
    return /^\s*([.#@\[a-z*][\w-]*\s*\{|@media|@keyframes|:root|body\s*\{|html\s*\{)/i.test(code);
}

function looksLikeJs(code) {
    return /^\s*(\/\/|\/\*|function\s|const\s|let\s|var\s|class\s|document\.|window\.|console\.|import\s|export\s|=>)/.test(code);
}

function getCodeBlockKind(lang, code) {
    const normalized = (lang || "").toLowerCase().trim();
    if (PREVIEW_HTML_LANGS.has(normalized)) return "html";
    if (PREVIEW_JS_LANGS.has(normalized)) return "js";
    if (PREVIEW_CSS_LANGS.has(normalized)) return "css";
    if (!normalized) {
        if (looksLikeHtml(code)) return "html";
        if (looksLikeCss(code)) return "css";
        if (looksLikeJs(code)) return "js";
    }
    return null;
}

function injectCssAndJs(html, css, js) {
    let result = html;
    if (css.trim()) {
        const styleTag = `<style>\n${css}\n</style>`;
        if (/<\/head>/i.test(result)) {
            result = result.replace(/<\/head>/i, `${styleTag}\n</head>`);
        } else if (/<html[\s>]/i.test(result)) {
            result = result.replace(/<html([^>]*)>/i, `<html$1><head>${styleTag}</head>`);
        } else {
            result = styleTag + result;
        }
    }
    if (js.trim()) {
        const scriptTag = `<script>\n${js}\n<\/script>`;
        if (/<\/body>/i.test(result)) {
            result = result.replace(/<\/body>/i, `${scriptTag}\n</body>`);
        } else {
            result += scriptTag;
        }
    }
    return result;
}

function wrapAsPreviewDocument(html, css = "", js = "") {
    const trimmed = html.trim();
    const isFullDoc = /^\s*<!DOCTYPE/i.test(trimmed) || /^\s*<html[\s>]/i.test(trimmed);

    if (isFullDoc) {
        return injectCssAndJs(trimmed, css, js);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
${css}
</style>
</head>
<body>
${trimmed}
<script>${js}<\/script>
</body>
</html>`;
}

function buildCssPreviewDocument(css) {
    return wrapAsPreviewDocument(
        `<div class="preview-root">
            <p>Sample text</p>
            <button type="button">Button</button>
            <div class="box">Preview box</div>
            <input type="text" placeholder="Input field" />
        </div>`,
        css
    );
}

function buildCombinedPreviewDocument(blocks) {
    let html = "";
    let css = "";
    let js = "";

    blocks.forEach(({ kind, code }) => {
        if (kind === "html") html += (html ? "\n" : "") + code;
        else if (kind === "css") css += (css ? "\n" : "") + code;
        else if (kind === "js") js += (js ? "\n" : "") + code;
    });

    if (!html.trim()) {
        html = '<div id="app"></div>';
    }

    return wrapAsPreviewDocument(html, css, js);
}

function getPreviewDocumentForBlock(kind, code) {
    if (kind === "html") return wrapAsPreviewDocument(code);
    if (kind === "css") return buildCssPreviewDocument(code);
    if (kind === "js") return wrapAsPreviewDocument('<div id="app"></div>', "", code);
    return "";
}

function getPreviewTitleFromDocument(documentHtml, fallback = "Code Preview") {
    const titleMatch = String(documentHtml || "").match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch?.[1]?.trim() || fallback;
}

function getCodeDownloadExtension(lang, kind) {
    const normalized = normalizeCodeLanguage(lang || kind);
    return CODE_DOWNLOAD_EXTENSIONS[normalized] || CODE_DOWNLOAD_EXTENSIONS[kind] || "txt";
}

    function getCodeDownloadName(lang, kind, prefix = "fauna-code") {
    return `${prefix}.${getCodeDownloadExtension(lang, kind)}`;
}

function downloadTextFile(text, filename, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCodeActionIcon(name) {
    const icons = {
        preview: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`,
        copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>`,
        console: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path></svg>`,
        refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4"></path><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path></svg>`,
        close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`
    };
    return icons[name] || icons.preview;
}

function getWorkbenchCopyText(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) return "";
    if (blocks.length === 1) return blocks[0].code || "";
    return blocks
        .map(block => `/* ${getCodeLanguageLabel(block.lang, block.kind)} */\n${block.code || ""}`)
        .join("\n\n");
}

function renderWorkbenchCode(codeHost, blocks) {
    if (!codeHost) return;
    codeHost.innerHTML = "";
    blocks.forEach((block, index) => {
        const section = document.createElement("section");
        section.className = "code-workbench-code-section";

        if (blocks.length > 1) {
            const label = document.createElement("div");
            label.className = "code-workbench-code-label";
            label.textContent = getCodeLanguageLabel(block.lang, block.kind);
            section.appendChild(label);
        }

        const pre = document.createElement("pre");
        const codeElement = document.createElement("code");
        const lang = normalizeCodeLanguage(block.lang || block.kind);
        if (lang) codeElement.className = `lang-${lang}`;
        codeElement.innerHTML = highlightCode(block.code || "", lang);
        pre.appendChild(codeElement);
        section.appendChild(pre);
        codeHost.appendChild(section);

        if (index < blocks.length - 1) {
            const divider = document.createElement("div");
            divider.className = "code-workbench-code-divider";
            codeHost.appendChild(divider);
        }
    });
}

function ensureCodeWorkbench() {
    let overlay = document.getElementById("codeWorkbenchOverlay");
    if (overlay?._floraElements) return overlay._floraElements;

    overlay = document.createElement("div");
    overlay.id = "codeWorkbenchOverlay";
    overlay.className = "code-workbench-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="code-workbench" role="region" aria-labelledby="codeWorkbenchTitle">
            <header class="code-workbench-toolbar">
                <div class="code-workbench-title-group">
                    <div id="codeWorkbenchTitle" class="code-workbench-title">Code Preview</div>
                    <div class="code-workbench-subtitle">Sandboxed preview</div>
                </div>
                <div class="code-workbench-tabs" role="tablist" aria-label="Code preview mode">
                    <button type="button" class="code-workbench-tab" data-workbench-mode="code" role="tab" aria-selected="false">Code</button>
                    <button type="button" class="code-workbench-tab" data-workbench-mode="preview" role="tab" aria-selected="true">Preview</button>
                </div>
                <div class="code-workbench-actions">
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="copy" data-tooltip="Copy code" aria-label="Copy code">${getCodeActionIcon("copy")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="download" data-tooltip="Download code" aria-label="Download code">${getCodeActionIcon("download")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="refresh" data-tooltip="Refresh preview" aria-label="Refresh preview">${getCodeActionIcon("refresh")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="close" data-tooltip="Close" aria-label="Close preview">${getCodeActionIcon("close")}</button>
                </div>
            </header>
            <div class="code-workbench-accent" aria-hidden="true"></div>
            <div class="code-workbench-body" data-mode="preview">
                <div class="code-workbench-code" role="tabpanel"></div>
                <iframe class="code-workbench-preview" sandbox="${PREVIEW_IFRAME_SANDBOX}" aria-label="Code preview"></iframe>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);

    const elements = {
        overlay,
        title: overlay.querySelector(".code-workbench-title"),
        subtitle: overlay.querySelector(".code-workbench-subtitle"),
        body: overlay.querySelector(".code-workbench-body"),
        code: overlay.querySelector(".code-workbench-code"),
        iframe: overlay.querySelector(".code-workbench-preview"),
        tabs: Array.from(overlay.querySelectorAll("[data-workbench-mode]")),
        copyBtn: overlay.querySelector("[data-workbench-action='copy']"),
        downloadBtn: overlay.querySelector("[data-workbench-action='download']"),
        refreshBtn: overlay.querySelector("[data-workbench-action='refresh']"),
        closeBtn: overlay.querySelector("[data-workbench-action='close']")
    };

    elements.tabs.forEach(tab => {
        tab.addEventListener("click", () => setCodeWorkbenchMode(tab.dataset.workbenchMode));
    });
    elements.copyBtn?.addEventListener("click", () => {
        if (!activeCodeWorkbench) return;
        handleCopyButton(elements.copyBtn, activeCodeWorkbench.copyText);
    });
    elements.downloadBtn?.addEventListener("click", () => {
        if (!activeCodeWorkbench) return;
        downloadTextFile(activeCodeWorkbench.downloadText, activeCodeWorkbench.downloadName, activeCodeWorkbench.downloadMime);
        showToast("Download started.", "success");
    });
    elements.refreshBtn?.addEventListener("click", () => {
        if (!activeCodeWorkbench || !elements.iframe) return;
        elements.iframe.srcdoc = "";
        window.requestAnimationFrame(() => {
            elements.iframe.srcdoc = activeCodeWorkbench.documentHtml;
        });
    });
    elements.closeBtn?.addEventListener("click", closeCodeWorkbench);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeCodeWorkbench();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !overlay.hidden) closeCodeWorkbench();
    });

    overlay._floraElements = elements;
    return elements;
}

function setCodeWorkbenchMode(mode = "preview") {
    const elements = ensureCodeWorkbench();
    const nextMode = mode === "code" ? "code" : "preview";
    elements.body.dataset.mode = nextMode;
    elements.tabs.forEach(tab => {
        const isActive = tab.dataset.workbenchMode === nextMode;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });
    activeCodeWorkbench = activeCodeWorkbench ? { ...activeCodeWorkbench, mode: nextMode } : null;
}

function openCodeWorkbench({
    title = "Code Preview",
    subtitle = "Sandboxed preview",
    blocks = [],
    documentHtml = "",
    initialMode = "preview",
    copyText = "",
    downloadText = "",
            downloadName = "fauna-code.txt",
    downloadMime = "text/plain;charset=utf-8"
} = {}) {
    const elements = ensureCodeWorkbench();
    const safeBlocks = blocks.filter(block => block?.code != null);
    activeCodeWorkbench = {
        blocks: safeBlocks,
        documentHtml,
        copyText: copyText || getWorkbenchCopyText(safeBlocks),
        downloadText: downloadText || copyText || getWorkbenchCopyText(safeBlocks),
        downloadName,
        downloadMime,
        mode: initialMode
    };

    if (elements.title) elements.title.textContent = title;
    if (elements.subtitle) elements.subtitle.textContent = subtitle;
    renderWorkbenchCode(elements.code, safeBlocks);
    if (elements.iframe) elements.iframe.srcdoc = documentHtml;

    elements.overlay.hidden = false;
    elements.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("code-workbench-open");
    setCodeWorkbenchMode(initialMode);
    elements.overlay.querySelector(".code-workbench-tab.active")?.focus({ preventScroll: true });
}

function closeCodeWorkbench() {
    const elements = ensureCodeWorkbench();
    elements.overlay.hidden = true;
    elements.overlay.setAttribute("aria-hidden", "true");
    if (elements.iframe) elements.iframe.srcdoc = "";
    document.body.classList.remove("code-workbench-open");
    activeCodeWorkbench = null;
}

function createConsolePanel() {
    const panel = document.createElement("div");
    panel.className = "console-output-box";
    return panel;
}

function setActionButtonState(btn, active, activeLabel, idleLabel) {
    btn.classList.toggle("active", active);
    const label = btn.querySelector(".code-action-label");
    if (label) label.textContent = active ? activeLabel : idleLabel;
    btn.dataset.tooltip = active ? activeLabel : idleLabel;
    btn.setAttribute("aria-label", active ? activeLabel : idleLabel);
}

function createActionButton(label, icon = "preview", { compact = false } = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = compact ? "code-action-btn compact" : "code-action-btn";
    btn.setAttribute("aria-label", label);
    btn.dataset.tooltip = label;
    btn.innerHTML = `
        ${getCodeActionIcon(icon)}
        <span class="code-action-label">${label}</span>
    `;
    return btn;
}

function collectCodeBlocks(container) {
    return Array.from(container.querySelectorAll("pre code")).map(codeElement => {
        let lang = "";
        codeElement.classList.forEach(className => {
            if (className.startsWith("lang-")) {
                lang = className.replace("lang-", "");
            }
        });
        const code = codeElement.textContent;
        const kind = getCodeBlockKind(lang, code);
        return { pre: codeElement.closest("pre"), lang, code, kind };
    }).filter(block => block.pre);
}

function addCombinedPreviewBar(container, blocks) {
    if (container.querySelector(".code-combined-preview")) return;

    const bar = document.createElement("div");
    bar.className = "code-combined-preview";
    bar.innerHTML = `
        <div class="code-combined-preview-header">
            <span class="code-combined-preview-label">Preview workspace</span>
            <button type="button" class="code-combined-preview-btn">
                ${getCodeActionIcon("preview")}
                <span>Open preview</span>
            </button>
        </div>
    `;

    container.insertBefore(bar, container.firstChild);

    const toggleBtn = bar.querySelector(".code-combined-preview-btn");
    toggleBtn.onclick = () => {
        const documentHtml = buildCombinedPreviewDocument(blocks);
        openCodeWorkbench({
            title: getPreviewTitleFromDocument(documentHtml, "Combined Preview"),
            subtitle: `${blocks.length} linked code blocks`,
            blocks,
            documentHtml,
            initialMode: "preview",
            downloadText: documentHtml,
            downloadName: "fauna-preview.html",
            downloadMime: "text/html;charset=utf-8"
        });
    };
}

function wrapCodeBlock(pre, lang, code, kind, allowSandbox = true) {
    let wrapper = pre.parentElement?.classList.contains("code-block-wrapper") ? pre.parentElement : null;
    if (wrapper?.dataset.codeEnhanced === "true") return;

    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "code-block-wrapper";
        pre.parentNode.insertBefore(wrapper, pre);
    }

    let header = Array.from(wrapper.children).find(child => child.classList?.contains("code-block-header"));
    if (!header) {
        header = document.createElement("div");
        header.className = "code-block-header";
        wrapper.appendChild(header);

        const label = document.createElement("span");
        label.className = "code-lang-label";
        label.textContent = getCodeLanguageLabel(lang, kind);
        header.appendChild(label);
    }

    const existingActions = header.querySelector(".code-block-actions");
    if (existingActions) existingActions.remove();

    const actions = document.createElement("div");
    actions.className = "code-block-actions";

    let previewBtn = null;
    if (kind && allowSandbox) {
        previewBtn = createActionButton("Preview", "preview");
        actions.appendChild(previewBtn);
    }

    const copyBtn = createActionButton("Copy", "copy");
    const downloadBtn = createActionButton("Download", "download");
    actions.append(copyBtn, downloadBtn);

    let consoleBtn = null;
    if (kind === "js" && allowSandbox) {
        consoleBtn = createActionButton("Console", "console");
        actions.appendChild(consoleBtn);
    }

    header.appendChild(actions);
    if (pre.parentElement !== wrapper) wrapper.appendChild(pre);
    wrapper.dataset.codeEnhanced = "true";

    let consolePanel = null;
    if (kind === "js" && allowSandbox) {
        consolePanel = createConsolePanel();
        wrapper.appendChild(consolePanel);
    }

    let activeMode = null;

    const closeAll = () => {
        if (consolePanel) {
            consolePanel.style.display = "none";
            consolePanel.innerHTML = "";
        }
        if (consoleBtn) setActionButtonState(consoleBtn, false, "Hide console", "Console");
        activeMode = null;
    };

    copyBtn.onclick = () => handleCopyButton(copyBtn, code);
    downloadBtn.onclick = () => {
        downloadTextFile(code, getCodeDownloadName(lang, kind));
        showToast("Download started.", "success");
    };

    if (previewBtn) {
        previewBtn.onclick = () => {
            closeAll();
            const documentHtml = getPreviewDocumentForBlock(kind, code);
            const label = getCodeLanguageLabel(lang, kind);
            openCodeWorkbench({
                title: getPreviewTitleFromDocument(documentHtml, `${label} Preview`),
                subtitle: `${label} sandbox`,
                blocks: [{ pre, lang, code, kind }],
                documentHtml,
                initialMode: "preview",
                downloadText: code,
                downloadName: getCodeDownloadName(lang, kind),
                downloadMime: kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
            });
        };
    }

    if (consoleBtn && consolePanel) {
        consoleBtn.onclick = () => {
            if (activeMode === "console") {
                closeAll();
                chat.scrollTop = chat.scrollHeight;
                return;
            }

            closeAll();
            executeJsSandboxed(code, consolePanel);
            setActionButtonState(consoleBtn, true, "Hide console", "Console");
            activeMode = "console";
            chat.scrollTop = chat.scrollHeight;
        };
    }
}

function executeJsSandboxed(code, outputDiv) {
    outputDiv.innerHTML = "<div class='console-loading'>Running...</div>";
    outputDiv.style.display = "block";
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    
    const channelId = 'sandbox_' + Math.random().toString(36).substr(2, 9);
    
    const onMessage = (event) => {
        if (event.data && event.data.channelId === channelId) {
            if (event.data.type === 'log') {
                const logLine = document.createElement('div');
                logLine.className = 'console-log-line ' + event.data.level;
                logLine.textContent = event.data.args.join(' ');
                outputDiv.appendChild(logLine);
            } else if (event.data.type === 'error') {
                const logLine = document.createElement('div');
                logLine.className = 'console-log-line error';
                logLine.textContent = event.data.message;
                outputDiv.appendChild(logLine);
            } else if (event.data.type === 'done') {
                const loading = outputDiv.querySelector('.console-loading');
                if (loading) loading.remove();
                if (outputDiv.children.length === 0) {
                    outputDiv.innerHTML = "<div class='console-log-line info'>[Executed successfully with no console output]</div>";
                }
                window.removeEventListener('message', onMessage);
                iframe.remove();
            }
            chat.scrollTop = chat.scrollHeight;
        }
    };
    
    window.addEventListener('message', onMessage);
    
    const iframeHtml = `
        <!DOCTYPE html>
        <html>
        <body>
            <script>
                const channelId = "${channelId}";
                const send = (type, data) => {
                    window.parent.postMessage({ channelId, type, ...data }, '*');
                };
                
                const oldConsole = { ...console };
                const formatArg = (arg) => {
                    if (arg === null) return 'null';
                    if (arg === undefined) return 'undefined';
                    if (typeof arg === 'object') {
                        try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                    }
                    return String(arg);
                };
                
                ['log', 'info', 'warn', 'error'].forEach(level => {
                    console[level] = (...args) => {
                        send('log', { level, args: args.map(formatArg) });
                        oldConsole[level](...args);
                    };
                });
                
                window.onerror = (message, source, lineno, colno, error) => {
                    send('error', { message: message + " (Line " + lineno + ")" });
                    return true;
                };
                
                try {
                    \${code}
                } catch (err) {
                    send('error', { message: err.name + ": " + err.message });
                }
                
                setTimeout(() => send('done', {}), 50);
            <\/script>
        </body>
        </html>
    `;
    
    document.body.appendChild(iframe);
    iframe.srcdoc = iframeHtml;
}

function setupCodeSandbox(container) {
    const codeBlocks = collectCodeBlocks(container);
    const previewBlocks = isSandboxEnabled ? codeBlocks.filter(block => block.kind) : [];
    const hasMultiplePreviewBlocks = previewBlocks.length >= 2;
    const hasMixedBlocks = new Set(previewBlocks.map(block => block.kind)).size > 1;

    if (hasMultiplePreviewBlocks || hasMixedBlocks) {
        addCombinedPreviewBar(container, previewBlocks);
    }

    codeBlocks.forEach(({ pre, lang, code, kind }) => {
        wrapCodeBlock(pre, lang, code, kind, isSandboxEnabled);
    });
}

// ===== TOOLS & SETTINGS INTERACTIONS =====
if (toolsBtn && toolsDropdown) {
    toolsBtn.onclick = (e) => {
        e.stopPropagation();
        toolsDropdown.classList.toggle("open");
    };
    
    document.addEventListener("click", (e) => {
        if (!toolsBtn.contains(e.target) && !toolsDropdown.contains(e.target)) {
            toolsDropdown.classList.remove("open");
        }
    });
}

function openSettingsModal() {
    if (!settingsModal) return;
    toolsDropdown?.classList.remove("open");
    settingsModal.hidden = false;
    settingsModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("settings-modal-open");
    window.setTimeout(() => settingsCloseBtn?.focus(), 0);
}

function closeSettingsModal() {
    if (!settingsModal || settingsModal.hidden) return;
    settingsModal.hidden = true;
    settingsModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("settings-modal-open");
}

function setSettingsPane(paneName = "general") {
    const normalized = Array.from(settingsPanes).some(pane => pane.dataset.settingsPanePanel === paneName)
        ? paneName
        : "general";
    settingsNavButtons.forEach(button => {
        const isActive = button.dataset.settingsPane === normalized;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    settingsPanes.forEach(pane => {
        const isActive = pane.dataset.settingsPanePanel === normalized;
        pane.hidden = !isActive;
        pane.classList.toggle("active", isActive);
    });
    if (settingsTitle) {
        const activeButton = Array.from(settingsNavButtons).find(button => button.dataset.settingsPane === normalized);
        settingsTitle.textContent = activeButton?.textContent?.trim() || "Settings";
    }
}

[settingsOpenBtn, mobileSettingsOpenBtn].forEach(button => {
    button?.addEventListener("click", () => openSettingsModal());
});

settingsNavButtons.forEach(button => {
    button.addEventListener("click", () => setSettingsPane(button.dataset.settingsPane));
});

settingsModal?.addEventListener("click", event => {
    if (event.target.closest("[data-settings-close]")) {
        closeSettingsModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeVoiceQuickPanel();
        closeSettingsModal();
    }
});

if (toggleSandbox) {
    toggleSandbox.checked = isSandboxEnabled;
    toggleSandbox.onchange = (e) => {
        isSandboxEnabled = e.target.checked;
    };
}

if (toggleWebSearch) {
    toggleWebSearch.checked = isWebSearchEnabled;
    toggleWebSearch.onchange = (e) => {
        isWebSearchEnabled = e.target.checked;
    };
}

if (toggleGrounding) {
    toggleGrounding.checked = isGroundingEnabled;
    toggleGrounding.onchange = (e) => {
        isGroundingEnabled = e.target.checked;
    };
}

if (toggleGoogleGrounding) {
    toggleGoogleGrounding.checked = isGoogleGroundingEnabled;
    toggleGoogleGrounding.onchange = (e) => {
        isGoogleGroundingEnabled = e.target.checked;
    };
}

if (toggleWorkspaceBridge) {
    toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;
    toggleWorkspaceBridge.onchange = (e) => {
        isWorkspaceBridgeEnabled = e.target.checked;
        safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, isWorkspaceBridgeEnabled ? "true" : "false");
        updateWorkspaceBridgeSettingsUi();
    };
}

if (paramTemp && tempValue) {
    paramTemp.value = activeTemperature;
    tempValue.textContent = activeTemperature;
    
    paramTemp.oninput = (e) => {
        activeTemperature = parseFloat(e.target.value);
        tempValue.textContent = activeTemperature.toFixed(1);
    };
}

function getVoiceQuickLabel(voice = getOpenAiVoice()) {
    return getQuickVoiceOption(voice).label;
}

function updateVoiceQuickUi() {
    const quickVoice = getQuickVoiceOption();
    const personality = getVoicePersonalityOption();

    if (voiceQuickVoiceLabel) voiceQuickVoiceLabel.textContent = quickVoice.label;
    if (voiceQuickPersonaLabel) voiceQuickPersonaLabel.textContent = personality.label.replace(/"/g, "");
    if (voiceAgentOrb) {
        const option = getOpenAiVoiceOption();
        voiceAgentOrb.className = `voice-agent-orb ${option.swatch}`;
    }
    if (voiceAgentStatus && isRecording) {
        voiceAgentStatus.textContent = voiceDetectedSpeech ? "Listening" : "Waiting for your voice";
    }
    if (voiceSpeedSlider) voiceSpeedSlider.value = String(activeVoiceSpeed);
    if (voiceSpeedValue) voiceSpeedValue.textContent = `${activeVoiceSpeed.toFixed(1)}x`;
    if (voiceReplyToggleBtn) {
        voiceReplyToggleBtn.classList.toggle("active", isVoiceReplyEnabled);
        voiceReplyToggleBtn.setAttribute("aria-pressed", String(isVoiceReplyEnabled));
        voiceReplyToggleBtn.setAttribute("aria-label", isVoiceReplyEnabled ? "Voice replies on" : "Voice replies off");
        voiceReplyToggleBtn.dataset.tooltip = isVoiceReplyEnabled ? "Voice replies on" : "Voice replies off";
    }

    voiceQuickChoices?.querySelectorAll("[data-quick-voice]").forEach(button => {
        const isActive = button.dataset.quickVoice === quickVoice.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });

    voicePersonalityChoices?.querySelectorAll("[data-voice-personality]").forEach(button => {
        const isActive = button.dataset.voicePersonality === personality.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });

    updateVoiceMicChoiceSelection();
}

function renderVoiceQuickSettings() {
    if (voiceQuickChoices && voiceQuickChoices.children.length === 0) {
        VOICE_QUICK_OPTIONS.forEach(option => {
            const button = document.createElement("button");
            button.className = "voice-quick-choice";
            button.type = "button";
            button.dataset.quickVoice = option.id;
            button.setAttribute("role", "radio");
            button.setAttribute("aria-checked", "false");
            button.innerHTML = `<strong>${option.label}</strong><span>${option.description}</span>`;
            button.addEventListener("click", () => setOpenAiVoice(option.id));
            voiceQuickChoices.appendChild(button);
        });
    }

    if (voicePersonalityChoices && voicePersonalityChoices.children.length === 0) {
        VOICE_PERSONALITY_OPTIONS.forEach(option => {
            const button = document.createElement("button");
            button.className = "voice-personality-choice";
            button.type = "button";
            button.dataset.voicePersonality = option.id;
            button.setAttribute("role", "radio");
            button.setAttribute("aria-checked", "false");
            button.innerHTML = `${getVoicePersonalityIcon(option.icon)}<span>${option.label}</span>`;
            button.addEventListener("click", () => setVoicePersonality(option.id));
            voicePersonalityChoices.appendChild(button);
        });
    }

    if (voiceSpeedSlider) {
        voiceSpeedSlider.value = String(activeVoiceSpeed);
        voiceSpeedSlider.addEventListener("input", event => setVoiceSpeed(event.target.value));
    }

    voiceReplyToggleBtn?.addEventListener("click", () => {
        setVoiceReplyEnabled(!isVoiceReplyEnabled);
    });

    voiceQuickSettingsBtn?.addEventListener("click", event => {
        event.stopPropagation();
        if (voiceQuickPanel?.hidden) {
            openVoiceQuickPanel();
        } else {
            closeVoiceQuickPanel();
        }
    });

    voiceQuickPanel?.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", event => {
        if (!voiceQuickPanel || voiceQuickPanel.hidden) return;
        if (event.target.closest("#voiceQuickSettingsBtn") || event.target.closest("#voiceQuickPanel")) return;
        closeVoiceQuickPanel();
    });

    updateVoiceQuickUi();
    refreshVoiceMicChoices();
}

function openVoiceQuickPanel() {
    if (!voiceQuickPanel || !voiceQuickSettingsBtn) return;
    toolsDropdown?.classList.remove("open");
    voiceQuickPanel.hidden = false;
    voiceQuickSettingsBtn.setAttribute("aria-expanded", "true");
    refreshVoiceMicChoices();
}

function closeVoiceQuickPanel() {
    if (!voiceQuickPanel || voiceQuickPanel.hidden) return;
    voiceQuickPanel.hidden = true;
    voiceQuickSettingsBtn?.setAttribute("aria-expanded", "false");
}

function updateVoiceMicChoiceSelection() {
    voiceMicChoices?.querySelectorAll("[data-voice-mic]").forEach(button => {
        const isActive = button.dataset.voiceMic === selectedVoiceMicDeviceId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });
}

function renderVoiceMicChoices(devices = []) {
    if (!voiceMicChoices) return;
    const existingDevices = devices.filter(device => device.kind === "audioinput");
    const options = [
        { deviceId: "default", label: "Default microphone" },
        ...existingDevices
            .filter(device => device.deviceId && device.deviceId !== "default")
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Microphone ${index + 1}`
            }))
    ];

    if (!options.some(option => option.deviceId === selectedVoiceMicDeviceId)) {
        selectedVoiceMicDeviceId = "default";
        safeLocalStorageSet(VOICE_MIC_DEVICE_STORAGE_KEY, "default");
    }

    voiceMicChoices.replaceChildren(...options.map(option => {
        const button = document.createElement("button");
        button.className = "voice-mic-choice";
        button.type = "button";
        button.dataset.voiceMic = option.deviceId;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(option.deviceId === selectedVoiceMicDeviceId));
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path>
                <path d="M19 11v1a7 7 0 0 1-14 0v-1"></path>
            </svg>
            <span>${escapeHtml(option.label)}</span>
            <svg class="voice-choice-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        `;
        button.addEventListener("click", () => setSelectedVoiceMic(option.deviceId));
        return button;
    }));
    updateVoiceMicChoiceSelection();
}

async function refreshVoiceMicChoices() {
    if (!voiceMicChoices) return;
    if (!navigator.mediaDevices?.enumerateDevices) {
        renderVoiceMicChoices([]);
        return;
    }
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        renderVoiceMicChoices(devices);
    } catch (err) {
        renderVoiceMicChoices([]);
    }
}

function updateVoicePickerUi(voice = getOpenAiVoice()) {
    const option = getOpenAiVoiceOption(voice);
    if (voiceOrb) {
        voiceOrb.className = `voice-orb ${option.swatch}`;
    }
    if (voiceNameLabel) voiceNameLabel.textContent = option.name;
    if (voiceDescLabel) voiceDescLabel.textContent = option.description;
    if (voiceDots) {
        voiceDots.replaceChildren(...OPENAI_VOICE_OPTIONS.map(item => {
            const dot = document.createElement("span");
            dot.className = "voice-dot";
            dot.classList.toggle("active", item.id === option.id);
            return dot;
        }));
    }
    voiceChoiceList?.querySelectorAll("[data-openai-voice]").forEach(button => {
        const isActive = button.dataset.openaiVoice === option.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });
}

function renderVoiceChoices() {
    if (!voiceChoiceList || voiceChoiceList.children.length > 0) return;
    OPENAI_VOICE_OPTIONS.forEach(option => {
        const button = document.createElement("button");
        button.className = "voice-choice";
        button.type = "button";
        button.dataset.openaiVoice = option.id;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.innerHTML = `
            <span class="voice-choice-swatch ${option.swatch}" aria-hidden="true"></span>
            <span class="voice-choice-text">
                <strong>${option.name}</strong>
                <small>${option.description}</small>
            </span>
        `;
        button.addEventListener("click", () => setOpenAiVoice(option.id));
        voiceChoiceList.appendChild(button);
    });
    updateVoicePickerUi();
}

function cycleOpenAiVoice(direction) {
    const current = getOpenAiVoice();
    const currentIndex = Math.max(0, OPENAI_VOICE_OPTIONS.findIndex(option => option.id === current));
    const nextIndex = (currentIndex + direction + OPENAI_VOICE_OPTIONS.length) % OPENAI_VOICE_OPTIONS.length;
    setOpenAiVoice(OPENAI_VOICE_OPTIONS[nextIndex].id);
}

voicePrevBtn?.addEventListener("click", () => cycleOpenAiVoice(-1));
voiceNextBtn?.addEventListener("click", () => cycleOpenAiVoice(1));
renderVoiceChoices();
renderVoiceQuickSettings();

document.getElementById("voiceShowMoreBtn")?.addEventListener("click", () => {
    document.getElementById("voiceChoiceWrap")?.classList.add("expanded");
});
document.getElementById("voiceShowLessBtn")?.addEventListener("click", () => {
    document.getElementById("voiceChoiceWrap")?.classList.remove("expanded");
});

function setOpenAiSettingsStatus(text, state = "missing") {
    if (!openAiStatus) return;
    openAiStatus.textContent = text;
    openAiStatus.dataset.state = state;
}

function updateProviderSettingsUi() {
    const key = getOpenAiApiKey();
    providerChoiceButtons.forEach(button => {
        const isActive = button.dataset.aiProvider === activeAiProvider;
        button.setAttribute("aria-checked", String(isActive));
    });

    if (openAiApiKeyInput) openAiApiKeyInput.value = key;
    if (openAiChatModelInput) openAiChatModelInput.value = getOpenAiChatModel();
    if (openAiImageModelInput) openAiImageModelInput.value = getOpenAiImageModel();
    if (openAiTranscriptionModelInput) openAiTranscriptionModelInput.value = getOpenAiTranscriptionModel();
    setOpenAiVoice(getOpenAiVoice(), { persist: false });

    if (isOpenAiProvider()) {
        setOpenAiSettingsStatus(key ? "Active" : "Key needed", key ? "configured" : "missing");
        setServiceStatus(key ? "online" : "offline", key ? "OpenAI selected" : "OpenAI key needed");
    } else {
        setOpenAiSettingsStatus(key ? "Saved" : "Local", key ? "configured" : "missing");
        setServiceStatus("checking", "Ollama local");
    }
    updateVoiceButtonAvailability();
}

function saveOpenAiSettings() {
    const key = (openAiApiKeyInput?.value || "").trim();
    if (!key) {
        showToast("Paste an OpenAI API key before saving.", "error");
        setOpenAiSettingsStatus("Key needed", "missing");
        return false;
    }

    safeLocalStorageSet(OPENAI_API_KEY_STORAGE_KEY, key);
    safeLocalStorageSet(OPENAI_CHAT_MODEL_STORAGE_KEY, (openAiChatModelInput?.value || DEFAULT_OPENAI_CHAT_MODEL).trim() || DEFAULT_OPENAI_CHAT_MODEL);
    safeLocalStorageSet(OPENAI_IMAGE_MODEL_STORAGE_KEY, (openAiImageModelInput?.value || DEFAULT_OPENAI_IMAGE_MODEL).trim() || DEFAULT_OPENAI_IMAGE_MODEL);
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY, (openAiTranscriptionModelInput?.value || DEFAULT_OPENAI_TRANSCRIPTION_MODEL).trim() || DEFAULT_OPENAI_TRANSCRIPTION_MODEL);
    safeLocalStorageSet(OPENAI_SPEECH_MODEL_STORAGE_KEY, DEFAULT_OPENAI_SPEECH_MODEL);
    safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, (openAiVoiceInput?.value || DEFAULT_OPENAI_VOICE).trim() || DEFAULT_OPENAI_VOICE);
    setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
    updateProviderSettingsUi();
    showToast("OpenAI settings saved.", "success");
    return true;
}

providerChoiceButtons.forEach(button => {
    button.addEventListener("click", () => {
        const provider = normalizeAiProvider(button.dataset.aiProvider);
        setActiveAiProvider(provider);
        if (provider === AI_PROVIDER_OPENAI && !getOpenAiApiKey()) {
            showToast("Add an OpenAI API key to use this provider.", "warning");
        }
    });
});

openAiSaveBtn?.addEventListener("click", () => {
    saveOpenAiSettings();
});

document.getElementById("providerKeyReveal")?.addEventListener("click", function() {
    const input = document.getElementById("openAiApiKeyInput");
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    this.classList.toggle("revealed", show);
});

openAiClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(OPENAI_API_KEY_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_CHAT_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_IMAGE_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_SPEECH_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_VOICE_STORAGE_KEY);
    setActiveAiProvider(AI_PROVIDER_LOCAL);
    updateProviderSettingsUi();
    showToast("OpenAI settings cleared.", "info");
});

openAiTestBtn?.addEventListener("click", async () => {
    if (!getOpenAiApiKey()) {
        showToast("Save an OpenAI API key before testing.", "error");
        setOpenAiSettingsStatus("Key needed", "missing");
        return;
    }

    try {
        await checkOpenAiStatus();
        showToast("OpenAI API reachable.", "success");
    } catch (err) {
        showToast(`OpenAI test failed: ${err.message}`, "error");
    }
});

function updateWanSettingsUi() {
    const endpoint = getWanVideoBaseUrl();
    const workflow = safeLocalStorageGet(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
    if (wanEndpointInput) wanEndpointInput.value = endpoint;
    if (wanWorkflowInput) wanWorkflowInput.value = workflow || "";
    if (wanStatus) {
        wanStatus.textContent = workflow ? "Configured" : "Not set";
        wanStatus.dataset.state = workflow ? "configured" : "missing";
    }
}

function setWorkspaceBridgeStatus(text, state = "missing") {
    if (!workspaceBridgeStatus) return;
    workspaceBridgeStatus.textContent = text;
    workspaceBridgeStatus.dataset.state = state;
}

function updateWorkspaceBridgeSettingsUi() {
    const endpoint = getWorkspaceBridgeBaseUrl();
    const token = getWorkspaceBridgeToken();
    if (workspaceBridgeEndpointInput) workspaceBridgeEndpointInput.value = endpoint;
    if (workspaceBridgeTokenInput) workspaceBridgeTokenInput.value = token;
    if (toggleWorkspaceBridge) toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;

    if (!token) {
        setWorkspaceBridgeStatus("Token needed", "missing");
    } else if (isWorkspaceBridgeEnabled) {
        setWorkspaceBridgeStatus("Ready", "configured");
    } else {
        setWorkspaceBridgeStatus("Saved off", "missing");
    }
}

workspaceBridgeSaveBtn?.addEventListener("click", () => {
    const endpoint = (workspaceBridgeEndpointInput?.value || DEFAULT_WORKSPACE_BRIDGE_URL).trim().replace(/\/+$/, "") || DEFAULT_WORKSPACE_BRIDGE_URL;
    const token = (workspaceBridgeTokenInput?.value || "").trim();

    if (!token) {
        showToast("Paste the bridge token before saving.", "error");
        setWorkspaceBridgeStatus("Token needed", "missing");
        return;
    }

    safeLocalStorageSet(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY, endpoint);
    safeLocalStorageSet(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY, token);
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "true");
    isWorkspaceBridgeEnabled = true;
    updateWorkspaceBridgeSettingsUi();
    showToast("Workspace bridge saved and enabled.", "success");
});

workspaceBridgeClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY);
    safeLocalStorageRemove(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY);
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "false");
    isWorkspaceBridgeEnabled = false;
    updateWorkspaceBridgeSettingsUi();
    showToast("Workspace bridge cleared.", "info");
});

workspaceBridgeTestBtn?.addEventListener("click", async () => {
    const endpoint = (workspaceBridgeEndpointInput?.value || getWorkspaceBridgeBaseUrl()).trim().replace(/\/+$/, "") || DEFAULT_WORKSPACE_BRIDGE_URL;
    const token = (workspaceBridgeTokenInput?.value || getWorkspaceBridgeToken()).trim();

    if (!token) {
        showToast("Paste the bridge token before testing.", "error");
        setWorkspaceBridgeStatus("Token needed", "missing");
        return;
    }

    setWorkspaceBridgeStatus("Testing...", "missing");

    try {
        const res = await fetch(`${endpoint}/health`, {
            method: "GET",
            headers: { "X-Flora-Bridge-Token": token }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
        setWorkspaceBridgeStatus("Reachable", "configured");
        showToast("Workspace bridge reachable.", "success");
    } catch (err) {
        setWorkspaceBridgeStatus("Offline", "missing");
        showToast(`Workspace bridge test failed: ${err.message}`, "error");
    }
});

wanSaveBtn?.addEventListener("click", () => {
    const endpoint = (wanEndpointInput?.value || DEFAULT_WAN_VIDEO_BASE_URL).trim().replace(/\/+$/, "");
    const workflowText = (wanWorkflowInput?.value || "").trim();

    if (!workflowText) {
        showToast("Paste a ComfyUI workflow JSON before saving.", "error");
        return;
    }

    try {
        JSON.parse(workflowText);
    } catch (err) {
        showToast(`Invalid workflow JSON: ${err.message}`, "error");
        return;
    }

    safeLocalStorageSet(WAN_VIDEO_ENDPOINT_STORAGE_KEY, endpoint || DEFAULT_WAN_VIDEO_BASE_URL);
    safeLocalStorageSet(WAN_VIDEO_WORKFLOW_STORAGE_KEY, workflowText);
    updateWanSettingsUi();
    showToast("Wan settings saved.", "success");
});

wanClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(WAN_VIDEO_ENDPOINT_STORAGE_KEY);
    safeLocalStorageRemove(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
    updateWanSettingsUi();
    showToast("Wan settings cleared.", "info");
});

wanTestBtn?.addEventListener("click", async () => {
    const endpoint = (wanEndpointInput?.value || DEFAULT_WAN_VIDEO_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_WAN_VIDEO_BASE_URL;
    if (wanStatus) wanStatus.textContent = "Testing...";

    try {
        const res = await fetch(`${endpoint}/system_stats`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (wanStatus) {
            wanStatus.textContent = "Reachable";
            wanStatus.dataset.state = "configured";
        }
        showToast("ComfyUI endpoint reachable.", "success");
    } catch (err) {
        if (wanStatus) {
            wanStatus.textContent = "Offline";
            wanStatus.dataset.state = "missing";
        }
        showToast(`ComfyUI test failed: ${err.message}`, "error");
    }
});

updateProviderSettingsUi();
updateActiveProviderStatus();
updateWanSettingsUi();
updateWorkspaceBridgeSettingsUi();

newChatBtn.onclick = () => startNewChatSession();

// Initialize Token Count visually
updateTokenDisplay();

// ===== VOICE INPUT =====
const MIC_ICON = `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
const STOP_ICON = `<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"></rect>`;

function setVoiceChatActive(active) {
    const enabled = Boolean(active);
    document.body?.classList.toggle("voice-chat-active", enabled);
    inputWrapper?.classList.toggle("voice-chat-active", enabled);
    composerPanel?.classList.toggle("voice-chat-active", enabled);
    if (voiceAgentStage) {
        voiceAgentStage.hidden = !enabled;
        voiceAgentStage.classList.toggle("active", enabled);
    }
    if (voiceChatControls) voiceChatControls.hidden = !enabled;
    if (voiceStopButton) voiceStopButton.hidden = !enabled;
    if (!enabled) {
        closeVoiceQuickPanel();
        setVoiceActivityLevel(0);
        if (voiceAgentStatus) voiceAgentStatus.textContent = "Listening";
    }
}

function setVoiceActivityLevel(level = 0, { detected = false } = {}) {
    const normalized = Math.min(1, Math.max(0, Number(level) || 0));
    voiceAgentStage?.style.setProperty("--voice-level", normalized.toFixed(2));
    composerPanel?.style.setProperty("--voice-level", normalized.toFixed(2));
    voiceAgentStage?.classList.toggle("picking-up-sound", detected || normalized > 0.28);
    composerPanel?.classList.toggle("picking-up-sound", detected || normalized > 0.28);
}

function setVoiceListeningText(text) {
    if (voiceAgentStatus) voiceAgentStatus.textContent = text;
    if (voiceListeningLabel) voiceListeningLabel.textContent = text;
}

function clearOpenAiVoiceRearmTimer() {
    if (!openAiVoiceRearmTimer) return;
    window.clearTimeout(openAiVoiceRearmTimer);
    openAiVoiceRearmTimer = null;
}

function setVoiceSessionStatus(text, level = 0.32) {
    setVoiceChatActive(true);
    setVoiceListeningText(text);
    setVoiceActivityLevel(level);
}

function scheduleOpenAiVoiceRearm(delay = OPENAI_VOICE_RELISTEN_DELAY_MS) {
    clearOpenAiVoiceRearmTimer();
    if (!isOpenAiVoiceSessionActive || !isOpenAiProvider()) return;

    openAiVoiceRearmTimer = window.setTimeout(async () => {
        openAiVoiceRearmTimer = null;
        if (!isOpenAiVoiceSessionActive || !isOpenAiProvider()) return;

        if (isRecording || isGenerating || activeRequestController || isSpeechPlaybackActive || activeSpeechAudio) {
            scheduleOpenAiVoiceRearm();
            return;
        }

        try {
            setVoiceSessionStatus("Listening", 0.18);
            await startOpenAiVoiceRecording({ rearm: true });
        } catch (err) {
            if (!isOpenAiVoiceSessionActive) return;
            stopOpenAiVoiceSession({ silent: true });
            showToast(`OpenAI voice failed: ${err.message}`, "error");
        }
    }, delay);
}

function stopOpenAiVoiceSession({ silent = false } = {}) {
    isOpenAiVoiceSessionActive = false;
    clearOpenAiVoiceRearmTimer();
    shouldSpeakNextReply = false;

    if (voiceMediaRecorder && voiceMediaRecorder.state !== "inactive") {
        stopOpenAiVoiceRecording({ submit: false });
    } else {
        cleanupVoiceMediaStream();
        setSpeechRecognitionState(false);
    }

    activeSpeechController?.abort();
    activeSpeechController = null;
    if (activeSpeechAudio) {
        activeSpeechAudio.pause();
        activeSpeechAudio = null;
    }
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    isSpeechPlaybackActive = false;
    setVoiceChatActive(false);
    setVoiceListeningText("Listening");
    if (!silent) showToast("Voice chat stopped.", "info");
}

function setSpeechRecognitionState(recording, { keepVoiceChatActive = isOpenAiVoiceSessionActive && isOpenAiProvider() } = {}) {
    isRecording = recording;
    if (recording) {
        setVoiceChatActive(true);
        setVoiceActivityLevel(0.18);
        setVoiceListeningText("Listening");
        voiceButton?.classList.add("recording");
        if (voiceBtnIcon) voiceBtnIcon.innerHTML = STOP_ICON;
        voiceButton?.setAttribute("aria-label", "Stop Recording");
    } else {
        const idleLabel = isOpenAiProvider() ? "OpenAI voice chat" : "Voice Input";
        if (keepVoiceChatActive) {
            setVoiceChatActive(true);
        } else {
            setVoiceChatActive(false);
        }
        voiceButton?.classList.remove("recording");
        if (voiceBtnIcon) voiceBtnIcon.innerHTML = MIC_ICON;
        if (voiceButton) {
            voiceButton.dataset.tooltip = isOpenAiProvider() ? "OpenAI voice chat" : "Voice input";
            voiceButton.setAttribute("aria-label", idleLabel);
        }
    }
}

function getBrowserSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function supportsOpenAiVoiceRecording() {
    return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function updateVoiceButtonAvailability() {
    if (!voiceButton) return;
    const canUse = isOpenAiProvider() ? supportsOpenAiVoiceRecording() : Boolean(getBrowserSpeechRecognitionConstructor());
    voiceButton.disabled = !canUse;
    if (canUse) {
        voiceButton.dataset.tooltip = isOpenAiProvider() ? "OpenAI voice chat" : "Voice input";
        voiceButton.setAttribute("aria-label", isOpenAiProvider() ? "OpenAI voice chat" : "Voice Input");
    } else {
        voiceButton.dataset.tooltip = "Voice input is not supported in this browser";
        voiceButton.setAttribute("aria-label", "Voice input is not supported in this browser");
    }
}

function stopVoiceInput({ submit = true } = {}) {
    if (voiceMediaRecorder && voiceMediaRecorder.state !== "inactive") {
        stopOpenAiVoiceRecording({ submit });
        return true;
    }
    if (mediaRecognition) {
        mediaRecognition.stop();
        return true;
    }
    return false;
}

function getPreferredAudioMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function getAudioRms(analyser) {
    const samples = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(samples);
    let sumSquares = 0;

    for (const value of samples) {
        const centered = (value - 128) / 128;
        sumSquares += centered * centered;
    }

    return Math.sqrt(sumSquares / samples.length);
}

function startOpenAiVoiceMonitor() {
    stopOpenAiVoiceMonitor();
    if (!voiceAnalyser) return;

    const monitor = () => {
        if (!voiceMediaRecorder || voiceMediaRecorder.state !== "recording" || !voiceAnalyser) return;

        const now = performance.now();
        const elapsed = now - voiceRecordingStartedAt;
        const rms = getAudioRms(voiceAnalyser);
        const visualLevel = Math.min(1, rms / (OPENAI_VOICE_SILENCE_THRESHOLD * 3.2));

        if (rms >= OPENAI_VOICE_SILENCE_THRESHOLD) {
            voiceDetectedSpeech = true;
            voiceLastSpeechAt = now;
            setVoiceListeningText("Listening");
        }
        setVoiceActivityLevel(Math.max(0.12, visualLevel), { detected: rms >= OPENAI_VOICE_SILENCE_THRESHOLD });

        const silenceAfterSpeech = voiceDetectedSpeech
            && elapsed >= OPENAI_VOICE_MIN_RECORDING_MS
            && now - voiceLastSpeechAt >= OPENAI_VOICE_SILENCE_HOLD_MS;
        const idleWithoutSpeech = !voiceDetectedSpeech && elapsed >= OPENAI_VOICE_IDLE_TIMEOUT_MS;
        const reachedMax = elapsed >= OPENAI_VOICE_MAX_RECORDING_MS;

        if (silenceAfterSpeech || reachedMax) {
            if (voiceDetectedSpeech || reachedMax) {
                setVoiceSessionStatus("Transcribing", 0.34);
            }
            stopOpenAiVoiceRecording({ submit: voiceDetectedSpeech || reachedMax });
            return;
        }

        if (idleWithoutSpeech) {
            stopOpenAiVoiceRecording({ submit: false });
            if (isOpenAiVoiceSessionActive) {
                setVoiceSessionStatus("Listening", 0.18);
            } else {
                showToast("No speech detected. Tap voice and try again.", "warning");
            }
            return;
        }

        voiceMonitorTimer = window.setTimeout(monitor, OPENAI_VOICE_MONITOR_INTERVAL_MS);
    };

    voiceMonitorTimer = window.setTimeout(monitor, OPENAI_VOICE_MONITOR_INTERVAL_MS);
}

function stopOpenAiVoiceMonitor() {
    if (voiceMonitorTimer) {
        window.clearTimeout(voiceMonitorTimer);
        voiceMonitorTimer = null;
    }
    if (voiceMaxRecordingTimer) {
        window.clearTimeout(voiceMaxRecordingTimer);
        voiceMaxRecordingTimer = null;
    }
}

function stopOpenAiVoiceRecording({ submit = true } = {}) {
    voiceShouldSubmitRecording = submit;
    stopOpenAiVoiceMonitor();
    if (voiceMediaRecorder && voiceMediaRecorder.state !== "inactive") {
        voiceMediaRecorder.stop();
    }
}

async function startOpenAiVoiceRecording({ rearm = false } = {}) {
    if (isRecording) return;

    if (!getOpenAiApiKey()) {
        stopOpenAiVoiceSession({ silent: true });
        showToast("Add an OpenAI API key before using voice chat.", "error");
        openSettingsModal();
        return;
    }

    if (!supportsOpenAiVoiceRecording()) {
        stopOpenAiVoiceSession({ silent: true });
        showToast("OpenAI voice recording is not supported in this browser.", "error");
        return;
    }

    if (isGenerating || activeRequestController || isSpeechPlaybackActive || activeSpeechAudio) {
        scheduleOpenAiVoiceRearm();
        return;
    }

    isOpenAiVoiceSessionActive = true;
    clearOpenAiVoiceRearmTimer();
    setVoiceSessionStatus("Listening", 0.18);

    const mimeType = getPreferredAudioMimeType();
    try {
        voiceMediaStream = await navigator.mediaDevices.getUserMedia({ audio: getSelectedVoiceMicConstraints() });
    } catch (err) {
        if (selectedVoiceMicDeviceId === "default") throw err;
        setSelectedVoiceMic("default");
        voiceMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    refreshVoiceMicChoices();
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (AudioContextConstructor) {
        voiceAudioContext = new AudioContextConstructor();
        if (voiceAudioContext.state === "suspended") {
            await voiceAudioContext.resume().catch(() => {});
        }
        const source = voiceAudioContext.createMediaStreamSource(voiceMediaStream);
        voiceAnalyser = voiceAudioContext.createAnalyser();
        voiceAnalyser.fftSize = 2048;
        source.connect(voiceAnalyser);
    }
    voiceRecordingChunks = [];
    voiceDetectedSpeech = false;
    voiceShouldSubmitRecording = true;
    voiceRecordingStartedAt = performance.now();
    voiceLastSpeechAt = voiceRecordingStartedAt;
    voiceMediaRecorder = new MediaRecorder(voiceMediaStream, mimeType ? { mimeType } : undefined);

    voiceMediaRecorder.ondataavailable = event => {
        if (event.data?.size > 0) {
            voiceRecordingChunks.push(event.data);
        }
    };

    voiceMediaRecorder.onstart = () => {
        setSpeechRecognitionState(true);
        startOpenAiVoiceMonitor();
        if (!rearm) showToast("Listening. Fauna will send when you pause.", "info");
    };

    voiceMediaRecorder.onstop = async () => {
        const chunks = [...voiceRecordingChunks];
        const type = voiceMediaRecorder?.mimeType || mimeType || "audio/webm";
        const shouldSubmit = voiceShouldSubmitRecording;
        voiceMediaRecorder = null;
        voiceRecordingChunks = [];
        cleanupVoiceMediaStream();
        setSpeechRecognitionState(false);

        if (!shouldSubmit || !chunks.length) {
            scheduleOpenAiVoiceRearm();
            return;
        }

        try {
            setVoiceSessionStatus("Transcribing", 0.34);
            showToast("Transcribing voice input...", "info");
            const transcript = await transcribeOpenAiAudio(new Blob(chunks, { type }));
            if (!transcript.trim()) {
                scheduleOpenAiVoiceRearm();
                return;
            }

            isVoiceInputUpdate = true;
            input.value = transcript.trim();
            input.dispatchEvent(new Event("input"));
            isVoiceInputUpdate = false;
            shouldSpeakNextReply = isVoiceReplyEnabled;
            input.focus();
            if (!isGenerating) {
                setVoiceSessionStatus("Thinking", 0.34);
                await processWorkspaceEntry();
            } else {
                scheduleOpenAiVoiceRearm();
            }
        } catch (err) {
            showToast(`OpenAI voice failed: ${err.message}`, "error");
            scheduleOpenAiVoiceRearm();
        }
    };

    voiceMediaRecorder.start();
}

function cleanupVoiceMediaStream() {
    stopOpenAiVoiceMonitor();
    voiceMediaStream?.getTracks?.().forEach(track => track.stop());
    voiceMediaStream = null;
    voiceAnalyser = null;
    if (voiceAudioContext && voiceAudioContext.state !== "closed") {
        voiceAudioContext.close().catch(() => {});
    }
    voiceAudioContext = null;
}

function startBrowserSpeechRecognition() {
    const SpeechRecognition = getBrowserSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
        showToast("Voice input is not supported in this browser.", "error");
        return;
    }

    mediaRecognition = new SpeechRecognition();
    mediaRecognition.lang = navigator.language || "en-US";
    mediaRecognition.interimResults = true;
    mediaRecognition.continuous = false;

    let finalTranscript = "";

    mediaRecognition.onstart = () => {
        setSpeechRecognitionState(true);
        setVoiceActivityLevel(0.24);
        setVoiceListeningText("Listening");
    };

    mediaRecognition.onresult = (e) => {
        let interim = "";
        finalTranscript = "";
        for (let i = 0; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalTranscript += t;
            else interim += t;
        }
        isVoiceInputUpdate = true;
        input.value = finalTranscript || interim;
        input.dispatchEvent(new Event("input"));
        isVoiceInputUpdate = false;
        setVoiceActivityLevel(finalTranscript || interim ? 0.72 : 0.22, { detected: Boolean(finalTranscript || interim) });
        setVoiceListeningText(finalTranscript || interim ? "Picking up your voice" : "Listening");
    };

    mediaRecognition.onend = () => {
        setSpeechRecognitionState(false);
        if (finalTranscript.trim()) {
            isVoiceInputUpdate = true;
            input.value = finalTranscript.trim();
            input.dispatchEvent(new Event("input"));
            isVoiceInputUpdate = false;
            shouldSpeakNextReply = isVoiceReplyEnabled;
            input.focus();
        }
        mediaRecognition = null;
    };

    mediaRecognition.onerror = (e) => {
        setSpeechRecognitionState(false);
        mediaRecognition = null;
        if (e.error !== "aborted" && e.error !== "no-speech") {
            console.warn("Speech recognition error:", e.error);
        }
    };

    mediaRecognition.start();
}

async function transcribeOpenAiAudio(blob, signal = null) {
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("model", getOpenAiTranscriptionModel());
        formData.append("file", new File([blob], `fauna-voice.${extension}`, { type: blob.type || "audio/webm" }));

    const res = await openAiFetch("/audio/transcriptions", {
        method: "POST",
        body: formData,
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return String(data.text || "").trim();
}

if (voiceButton) {
    updateVoiceButtonAvailability();
    voiceButton.onclick = async () => {
        if (isGenerating) return;

        if (isRecording && stopVoiceInput()) {
            return;
        }

        try {
            if (isOpenAiProvider()) {
                if (isOpenAiVoiceSessionActive) {
                    stopOpenAiVoiceSession();
                    return;
                }
                await startOpenAiVoiceRecording();
            } else {
                startBrowserSpeechRecognition();
            }
        } catch (err) {
            if (isOpenAiProvider()) {
                stopOpenAiVoiceSession({ silent: true });
            }
            setSpeechRecognitionState(false);
            cleanupVoiceMediaStream();
            showToast(`Voice input failed: ${err.message}`, "error");
        }
    };
}

voiceStopButton?.addEventListener("click", () => {
    if (isOpenAiProvider()) {
        stopOpenAiVoiceSession();
        return;
    }
    if (isRecording) {
        stopVoiceInput({ submit: false });
        return;
    }
    setVoiceChatActive(false);
});

function speakReply(text) {
    const spokenText = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#*_>~|-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!spokenText) {
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) scheduleOpenAiVoiceRearm();
        return;
    }

    isSpeechPlaybackActive = true;
    if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        setVoiceSessionStatus("Preparing voice", 0.34);
    }

    playSpeechReply(spokenText).catch(err => {
        if (err.name !== "AbortError") {
            showToast(`Speech failed: ${err.message}`, "error");
        }
    }).finally(() => {
        isSpeechPlaybackActive = false;
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            scheduleOpenAiVoiceRearm();
        }
    });
}

async function playSpeechReply(spokenText) {
    if (isOpenAiProvider() && getOpenAiApiKey()) {
        try {
            await speakReplyWithOpenAi(spokenText);
            return;
        } catch (err) {
            if (err.name === "AbortError") throw err;
            showToast(`OpenAI speech failed: ${err.message}`, "error");
        }
    }

    await speakReplyWithBrowserVoice(spokenText);
}

function clearActiveSpeechAudio(audio = activeSpeechAudio, audioUrl = null) {
    if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load?.();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (!audio || activeSpeechAudio === audio) activeSpeechAudio = null;
}

function waitForAudioElementToEnd(audio, signal = null) {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            signal?.removeEventListener("abort", onAbort);
        };
        const onEnded = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error("Audio playback failed."));
        };
        const onAbort = () => {
            cleanup();
            audio.pause();
            reject(new DOMException("Speech stopped", "AbortError"));
        };

        if (signal?.aborted) {
            onAbort();
            return;
        }
        audio.addEventListener("ended", onEnded, { once: true });
        audio.addEventListener("error", onError, { once: true });
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

async function playAudioElementToEnd(audio, signal = null) {
    throwIfAborted(signal);
    await audio.play();
    if (audio.ended) return;
    await waitForAudioElementToEnd(audio, signal);
}

async function speakReplyWithOpenAi(spokenText) {
    activeSpeechAudio?.pause();
    activeSpeechController?.abort();
    const speechController = new AbortController();
    activeSpeechController = speechController;
    activeSpeechAudio = null;

    try {
        if (canStreamOpenAiSpeechAudio()) {
            try {
                await streamOpenAiSpeechAudio(spokenText, speechController.signal);
                return;
            } catch (err) {
                if (err.name === "AbortError") throw err;
                console.warn("OpenAI speech streaming failed, falling back to buffered audio:", err);
            }
        }

        await playBufferedOpenAiSpeechAudio(spokenText, speechController.signal);
    } finally {
        if (activeSpeechController === speechController) activeSpeechController = null;
    }
}

async function playBufferedOpenAiSpeechAudio(spokenText, signal = null) {
    const res = await openAiSpeechFetch(spokenText, { signal });
    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    activeSpeechAudio = audio;
    try {
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            setVoiceSessionStatus("Speaking", 0.42);
        }
        await playAudioElementToEnd(audio, signal);
    } finally {
        clearActiveSpeechAudio(audio, audioUrl);
    }
}

function canStreamOpenAiSpeechAudio() {
    return Boolean(
        window.MediaSource
        && window.ReadableStream
        && MediaSource.isTypeSupported?.("audio/mpeg")
    );
}

async function streamOpenAiSpeechAudio(inputText, signal = null) {
    const res = await openAiSpeechFetch(inputText, { signal, streaming: true });
    if (!res.body) {
        await playBufferedOpenAiSpeechResponse(res, signal);
        return;
    }

    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);
    const audio = new Audio(audioUrl);
    activeSpeechAudio = audio;

    await new Promise((resolve, reject) => {
        mediaSource.addEventListener("sourceopen", resolve, { once: true });
        mediaSource.addEventListener("error", () => reject(new Error("Could not start the streaming audio player.")), { once: true });
        audio.src = audioUrl;
    });

    const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
    try {
        sourceBuffer.mode = "sequence";
    } catch {
        // Some browsers expose a readonly mode for this SourceBuffer type.
    }
    const reader = res.body.getReader();
    let hasStartedPlayback = false;

    const appendChunk = (chunk) => new Promise((resolve, reject) => {
        const onError = () => {
            cleanup();
            reject(new Error("Could not append streamed audio."));
        };
        const onUpdateEnd = () => {
            cleanup();
            resolve();
        };
        const cleanup = () => {
            sourceBuffer.removeEventListener("error", onError);
            sourceBuffer.removeEventListener("updateend", onUpdateEnd);
        };

        sourceBuffer.addEventListener("error", onError, { once: true });
        sourceBuffer.addEventListener("updateend", onUpdateEnd, { once: true });
        sourceBuffer.appendBuffer(chunk);
    });

    try {
        while (true) {
            throwIfAborted(signal);
            const { value, done } = await reader.read();
            if (done) break;
            if (!value?.byteLength) continue;

            await appendChunk(value);

            if (!hasStartedPlayback) {
                hasStartedPlayback = true;
                if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
                    setVoiceSessionStatus("Speaking", 0.42);
                }
                await audio.play();
            }
        }

        if (!hasStartedPlayback) {
            throw new Error("OpenAI returned empty speech audio.");
        }

        await endMediaSourceStream(mediaSource, sourceBuffer);
        if (!audio.ended) await waitForAudioElementToEnd(audio, signal);
    } catch (err) {
        throw err;
    } finally {
        reader.releaseLock?.();
        clearActiveSpeechAudio(audio, audioUrl);
    }
}

async function playBufferedOpenAiSpeechResponse(res, signal = null) {
    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    activeSpeechAudio = audio;
    try {
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            setVoiceSessionStatus("Speaking", 0.42);
        }
        await playAudioElementToEnd(audio, signal);
    } finally {
        clearActiveSpeechAudio(audio, audioUrl);
    }
}

function endMediaSourceStream(mediaSource, sourceBuffer) {
    if (mediaSource.readyState !== "open") return Promise.resolve();
    if (!sourceBuffer.updating) {
        mediaSource.endOfStream();
        return Promise.resolve();
    }
    return new Promise(resolve => {
        sourceBuffer.addEventListener("updateend", () => {
            if (mediaSource.readyState === "open") mediaSource.endOfStream();
            resolve();
        }, { once: true });
    });
}

async function openAiSpeechFetch(inputText, { signal = null } = {}) {
    const res = await openAiFetch("/audio/speech", {
        method: "POST",
        signal,
        headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg"
        },
        body: JSON.stringify({
            model: getOpenAiSpeechModel(),
            voice: getOpenAiVoice(),
            input: inputText,
            response_format: "mp3",
            speed: activeVoiceSpeed
        })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return res;
}

function speakReplyWithBrowserVoice(spokenText) {
    if (!("speechSynthesis" in window) || !spokenText) return Promise.resolve();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = navigator.language || "en-US";
    utterance.pitch = 1.15;
    utterance.rate = activeVoiceSpeed;

    const voice = getPreferredVoice();
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || utterance.lang;
    }

    if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        setVoiceSessionStatus("Speaking", 0.42);
    }

    return new Promise((resolve, reject) => {
        utterance.onend = () => resolve();
        utterance.onerror = event => reject(new Error(event.error || "Browser speech failed."));
        window.speechSynthesis.speak(utterance);
    });
}

function getPreferredVoice() {
    if (preferredVoice) return preferredVoice;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const language = (navigator.language || "en-US").toLowerCase();
    const baseLanguage = language.split("-")[0];
    const feminineNames = [
        "zira",
        "jenny",
        "aria",
        "samantha",
        "susan",
        "hazel",
        "heera",
        "natasha",
        "sonia",
        "female",
        "woman"
    ];

    const localVoices = voices.filter(voice => {
        const voiceLang = (voice.lang || "").toLowerCase();
        return voiceLang === language || voiceLang.startsWith(`${baseLanguage}-`);
    });
    const candidates = localVoices.length ? localVoices : voices;

    preferredVoice = candidates.find(voice => {
        const name = voice.name.toLowerCase();
        return feminineNames.some(feminineName => name.includes(feminineName));
    }) || candidates.find(voice => voice.default) || candidates[0];

    return preferredVoice;
}

if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        preferredVoice = null;
        getPreferredVoice();
    };
}
