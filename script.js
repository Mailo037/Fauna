import { createSidebarController } from "./modules/sidebar.js";
import { createImageLightbox } from "./modules/lightbox.js";
import { createThemeController } from "./modules/theme.js";
import { createModelSwitcher } from "./modules/model-switcher.js?v=20260701-nohover-submenu";
import {
    DEFAULT_OPENAI_CHAT_MODEL_OPTIONS,
    DEFAULT_OPENAI_IMAGE_MODEL_OPTIONS,
    compactOpenRouterModels,
    createAiCapabilityRegistry,
    fetchOpenRouterModelCatalog,
    isLikelyChatModelId
} from "./modules/ai-capabilities.js?v=20260702-call-settings";
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
const slashCommandPalette = document.getElementById("slashCommandPalette");
const newChatBtn = document.getElementById("newChat");
const chatHistoryList = document.getElementById("chatHistoryList");
const chatHistorySection = document.querySelector(".history.sidebar-section");
const chatHistoryToggle = document.getElementById("chatHistoryToggle");
const archivedHistorySection = document.getElementById("archivedHistorySection");
const archivedChatToggle = document.getElementById("archivedChatToggle");
const archivedChatList = document.getElementById("archivedChatList");
const chatTitle = document.getElementById("chatTitle");
const chatTitleInput = document.getElementById("chatTitleInput");
const chatTitleEditBtn = document.getElementById("chatTitleEditBtn");
const playgroundNavButton = document.getElementById("playgroundNavButton");
const libraryNavButton = document.getElementById("libraryNavButton");
const workspaceNavButtons = document.querySelectorAll("[data-workspace-view]");
const libraryView = document.getElementById("libraryView");
const libraryGrid = document.getElementById("libraryGrid");
const libraryEmpty = document.getElementById("libraryEmpty");
const librarySummary = document.getElementById("librarySummary");
const libraryStats = document.getElementById("libraryStats");
const libraryFilterGroup = document.querySelector(".library-filter-group");
const libraryFilterButtons = document.querySelectorAll("[data-library-filter]");
const libraryLayoutGroup = document.querySelector(".library-layout-group");
const libraryLayoutButtons = document.querySelectorAll("[data-library-layout]");
const librarySelectionCount = document.getElementById("librarySelectionCount");
const librarySelectVisibleButton = document.getElementById("librarySelectVisible");
const libraryClearSelectionButton = document.getElementById("libraryClearSelection");
const libraryDeleteSelectedButton = document.getElementById("libraryDeleteSelected");
const libraryUploadButton = document.getElementById("libraryUploadButton");
const libraryUploadInput = document.getElementById("libraryUploadInput");
const uploadButton = document.getElementById("uploadButton");
const attachmentMenu = document.getElementById("attachmentMenu");
const attachmentUploadFileButton = document.getElementById("attachmentUploadFile");
const attachmentChooseLibraryButton = document.getElementById("attachmentChooseLibrary");
const libraryPickerModal = document.getElementById("libraryPickerModal");
const libraryPickerSearch = document.getElementById("libraryPickerSearch");
const libraryPickerGrid = document.getElementById("libraryPickerGrid");
const libraryPickerEmpty = document.getElementById("libraryPickerEmpty");
const libraryPickerClose = document.getElementById("libraryPickerClose");
const libraryPickerAttach = document.getElementById("libraryPickerAttach");
const libraryPickerSelectionCount = document.getElementById("libraryPickerSelectionCount");
const libraryPickerTypeButtons = document.querySelectorAll("[data-library-picker-type]");
const libraryPickerSortButtons = document.querySelectorAll("[data-library-picker-sort]");
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
const toggleApproxLocation = document.getElementById("toggleApproxLocation");
const toggleWorkspaceBridge = document.getElementById("toggleWorkspaceBridge");
const toggleMemoryBeta = document.getElementById("toggleMemoryBeta");
const memoryBetaStatus = document.getElementById("memoryBetaStatus");
const memoryCountLabel = document.getElementById("memoryCountLabel");
const memoryOpenCommandBtn = document.getElementById("memoryOpenCommandBtn");
const personaDisplayNameInput = document.getElementById("personaDisplayNameInput");
const personaCustomInstructionsInput = document.getElementById("personaCustomInstructionsInput");
const personaSaveBtn = document.getElementById("personaSaveBtn");
const personaClearBtn = document.getElementById("personaClearBtn");
const paramTemp = document.getElementById("paramTemp");
const tempValue = document.getElementById("tempValue");
const typewriterDuration = document.getElementById("typewriterDuration");
const typewriterDurationNumber = document.getElementById("typewriterDurationNumber");
const typewriterDurationValue = document.getElementById("typewriterDurationValue");
const toggleAiStreaming = document.getElementById("toggleAiStreaming");
const aiStreamingStatus = document.getElementById("aiStreamingStatus");
const temperatureStatus = document.getElementById("temperatureStatus");
const maxOutputTokensInput = document.getElementById("maxOutputTokensInput");
const topPInput = document.getElementById("topPInput");
const ollamaTopKInput = document.getElementById("ollamaTopKInput");
const aiOutputLimitsStatus = document.getElementById("aiOutputLimitsStatus");
const openAiVerbosityStatus = document.getElementById("openAiVerbosityStatus");
const openAiVerbosityButtons = document.querySelectorAll("[data-ai-verbosity]");
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
const openAiRealtimeModelInput = document.getElementById("openAiRealtimeModelInput");
const openAiChatModelSelectHost = document.getElementById("openAiChatModelSelectHost");
const openAiImageModelSelectHost = document.getElementById("openAiImageModelSelectHost");
const openAiTranscriptionModelSelectHost = document.getElementById("openAiTranscriptionModelSelectHost");
const openAiRealtimeModelSelectHost = document.getElementById("openAiRealtimeModelSelectHost");
const openAiVoiceInput = document.getElementById("openAiVoiceInput");
const openAiSaveBtn = document.getElementById("openAiSaveBtn");
const openAiTestBtn = document.getElementById("openAiTestBtn");
const openAiClearBtn = document.getElementById("openAiClearBtn");
const ollamaCatalogBtn = document.getElementById("ollamaCatalogBtn");
const openAiCatalogBtn = document.getElementById("openAiCatalogBtn");
const openAiCatalogModal = document.getElementById("openAiCatalogModal");
const openAiCatalogCloseBtn = document.getElementById("openAiCatalogCloseBtn");
const openAiCatalogTitle = document.getElementById("openAiCatalogTitle");
const openAiCatalogSearchInput = document.getElementById("openAiCatalogSearchInput");
const openAiCatalogFiltersBtn = document.getElementById("openAiCatalogFiltersBtn");
const openAiCatalogFiltersMenu = document.getElementById("openAiCatalogFiltersMenu");
const openAiCatalogClearFiltersBtn = document.getElementById("openAiCatalogClearFiltersBtn");
const openAiCatalogSortGroup = document.querySelector(".model-catalog-sort");
const openAiCatalogSortButtons = document.querySelectorAll("[data-openai-catalog-sort]");
const openAiCatalogRefreshBtn = document.getElementById("openAiCatalogRefreshBtn");
const openAiCatalogStatus = document.getElementById("openAiCatalogStatus");
const openAiCatalogList = document.getElementById("openAiCatalogList");
const openAiCatalogEmpty = document.getElementById("openAiCatalogEmpty");
const aiCachingToggle = document.getElementById("aiCachingToggle");
const aiCachingToggleLabel = document.getElementById("aiCachingToggleLabel");
const aiCachingStatus = document.getElementById("aiCachingStatus");
const providerSegment = document.querySelector(".provider-segment");
const providerChoiceButtons = document.querySelectorAll("[data-ai-provider]");
const providerConfigPanels = document.querySelectorAll("[data-provider-config]");
const localModelList = document.getElementById("localModelList");
const localModelsStatus = document.getElementById("localModelsStatus");
const localModelsRefreshBtn = document.getElementById("localModelsRefreshBtn");
const localModelsInstallBtn = document.getElementById("localModelsInstallBtn");
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
const voiceSetupNotice = document.getElementById("voiceSetupNotice");
const voicePreviewBtn = document.getElementById("voicePreviewBtn");
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
const voiceMicToggleBtn = document.getElementById("voiceListeningPill");
const voiceListeningLabel = document.getElementById("voiceListeningLabel");
const voiceReplyToggleBtn = document.getElementById("voiceReplyToggleBtn");
const voiceQuickSettingsBtn = document.getElementById("voiceQuickSettingsBtn");
const voiceQuickPanel = document.getElementById("voiceQuickPanel");
const voiceQuickVoiceLabel = document.getElementById("voiceQuickVoiceLabel");
const voiceQuickVoiceChoices = document.getElementById("voiceQuickVoiceChoices");
const voiceSpeedSlider = document.getElementById("voiceSpeedSlider");
const voiceSpeedValue = document.getElementById("voiceSpeedValue");
const voiceMicChoices = document.getElementById("voiceMicChoices");
const voiceOutputChoices = document.getElementById("voiceOutputChoices");
const voiceStopButton = document.getElementById("voiceStopButton");
const localVoiceTranscriptionInput = document.getElementById("localVoiceTranscriptionInput");
const localVoiceTranscriptionSelectHost = document.getElementById("localVoiceTranscriptionSelectHost");
const localVoiceTranscriptionEndpointInput = document.getElementById("localVoiceTranscriptionEndpointInput");
const localVoiceTranscriptionModelInput = document.getElementById("localVoiceTranscriptionModelInput");
const localVoiceReplyModelInput = document.getElementById("localVoiceReplyModelInput");
const localVoiceReplyModelSelectHost = document.getElementById("localVoiceReplyModelSelectHost");
const localVoiceReplyEndpointInput = document.getElementById("localVoiceReplyEndpointInput");

let isSandboxEnabled = true;
let isWebSearchEnabled = true;
let isGroundingEnabled = true;
let isGoogleGroundingEnabled = true;
let isApproxLocationEnabled = true;
let isWorkspaceBridgeEnabled = false;
let isMemoryEnabled = false;
let isAiStreamingEnabled = true;
let activeTemperature = 0.7;
let activeMaxOutputTokens = 0;
let activeTopP = 1;
let activeOllamaTopK = 40;
let activeOpenAiVerbosity = "medium";
let isAiCachingEnabled = false;
const TOKEN_COUNTER_DEBOUNCE_MS = 280;
const TOKEN_COUNTER_TIMEOUT_MS = 2500;
const TOKEN_USAGE_SOURCE_PROVIDER = "provider_usage";
const OPENAI_TOKENIZER_URL = "https://platform.openai.com/tokenizer";
const OPENAI_PRICING_PAGE_URL = "https://platform.openai.com/pricing";
const OPENAI_PRICING_DOCS_URL = "https://developers.openai.com/api/docs/pricing";
const OPENAI_PRICING_FETCH_TIMEOUT_MS = 10000;
const USAGE_HEATMAP_DAYS = 365;
const LARGE_CODE_FILE_CARD_MIN_LINES = 70;
const LARGE_CODE_FILE_CARD_MIN_CHARS = 2400;
const CODE_WORKBENCH_PREVIEW_DEBOUNCE_MS = 420;
const CODE_WORKBENCH_SELECTION_CONTEXT_LINES = 36;
const CODE_WORKBENCH_SELECTION_MAX_CONTEXT_CHARS = 14000;
const CODE_FILE_CARD_DIRECTIVE_RE = /^\s*<!--\s*(?:fauna|flora)-(?:file|file-card|preview-card)\s*:\s*([^>]+?)\s*-->\s*$/i;
const FILE_REFERENCE_EXTENSIONS = new Set([
    "c", "cc", "cpp", "cs", "css", "go", "h", "hpp", "html", "java", "js", "json", "jsx", "kt", "less", "mjs", "php", "ps1", "py", "rb", "rs", "scss", "sh", "sql", "svelte", "swift", "ts", "tsx", "vue", "xml", "yaml", "yml", "md"
]);
const FILE_REFERENCE_PATH_RE = /((?:[A-Za-z]:[\\/][^\s`<>"|,;]+|(?:\.{1,2}[\\/])?(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\.(?:c|cc|cpp|cs|css|go|h|hpp|html|java|js|json|jsx|kt|less|mjs|php|ps1|py|rb|rs|scss|sh|sql|svelte|swift|ts|tsx|vue|xml|ya?ml|md)))(?::(\d+))?(?:\s*\((?:line|lines?)\s+(\d+)(?:\s*[-–]\s*(\d+))?\))?/gi;
const WEBSITE_REFERENCE_URL_RE = /\bhttps?:\/\/[^\s`<>"']+/gi;
const PREVIEW_HTML_LANGS = new Set(["html", "htm", "xhtml", "svg"]);
const PREVIEW_JS_LANGS = new Set(["js", "javascript", "mjs", "jsx", "ts", "typescript"]);
const PREVIEW_CSS_LANGS = new Set(["css"]);
const TERMINAL_COMMAND_LANGS = new Set(["sh", "bash", "shell", "zsh", "fish", "ps1", "powershell", "pwsh", "cmd", "bat", "batch", "terminal", "console"]);
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
    zsh: "sh",
    fish: "fish",
    ps1: "ps1",
    powershell: "ps1",
    pwsh: "ps1",
    cmd: "cmd",
    bat: "bat",
    batch: "bat",
    terminal: "sh",
    console: "sh",
    md: "md",
    markdown: "md",
    sql: "sql",
    yaml: "yaml",
    yml: "yml"
};
const MEDIA_DATA_URL_PREFIX_RE = /^data:((?:image|video|audio)\/[a-z0-9.+-]+);base64,/i;
const MARKDOWN_MEDIA_DATA_URL_RE = /!\[([^\]]*)\]\((data:(?:image|video|audio)\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=_-]+)\)/gi;
const MEDIA_DATA_URL_RE = /data:(?:image|video|audio)\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=_-]+/gi;
const GREETING_REFRESH_MS = 5 * 60 * 1000;
const appStartedAt = new Date();
const CHAT_SESSIONS_STORAGE_KEY = "faunaChatSessions";
const ACTIVE_CHAT_SESSION_STORAGE_KEY = "faunaActiveChatSession";
const LIBRARY_ITEMS_STORAGE_KEY = "faunaLibraryItems";
const LIBRARY_DELETED_ITEMS_STORAGE_KEY = "faunaDeletedLibraryItems";
const LIBRARY_LAYOUT_STORAGE_KEY = "faunaLibraryLayout";
const USAGE_EVENTS_STORAGE_KEY = "faunaUsageEvents";
const USAGE_TOOL_EVENTS_STORAGE_KEY = "faunaUsageToolEvents";
const CHAT_HISTORY_COLLAPSED_STORAGE_KEY = "faunaChatHistoryCollapsed";
const ARCHIVED_CHAT_HISTORY_COLLAPSED_STORAGE_KEY = "faunaArchivedChatHistoryCollapsed";
const TRANSPARENT_PIXEL_DATA_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const CHAT_STORAGE_PROFILE_FULL = "full";
const CHAT_STORAGE_PROFILE_ACTIVE_HTML = "active-html";
const CHAT_STORAGE_PROFILE_HISTORY_ONLY = "history-only";
const CHAT_STORAGE_PROFILE_MINIMAL = "minimal";
const WORKSPACE_VIEW_PLAYGROUND = "playground";
const WORKSPACE_VIEW_LIBRARY = "library";
const WORKSPACE_URL_FRAGMENT_CHAT = "chat";
const WORKSPACE_URL_FRAGMENT_LIBRARY = "library";
const LIBRARY_FILTER_ALL = "all";
const LIBRARY_LAYOUT_GRID = "grid";
const LIBRARY_LAYOUT_LIST = "list";
const LIBRARY_PICKER_TYPE_ALL = "all";
const LIBRARY_PICKER_SORT_NEWEST = "newest";
const MAX_CHAT_SESSIONS = 40;
const TYPEWRITER_MIN_CHARS_PER_FRAME = 1;
const TYPEWRITER_FRAME_DELAY_MS = 30;
const TYPEWRITER_DEFAULT_DURATION_SECONDS = 6;
const TYPEWRITER_MIN_DURATION_SECONDS = 0;
const TYPEWRITER_MAX_DURATION_SECONDS = 20;
const TYPEWRITER_MAX_ANIMATION_FRAMES = 240;
const TYPEWRITER_FADE_MIN_TRAILING_CHARS = 18;
const TYPEWRITER_FADE_MAX_TRAILING_CHARS = 96;
const TYPEWRITER_DURATION_STORAGE_KEY = "faunaTypewriterDuration";
const AI_STREAMING_ENABLED_STORAGE_KEY = "faunaAiStreamingEnabled";
const AI_TEMPERATURE_STORAGE_KEY = "faunaAiTemperature";
const AI_MAX_OUTPUT_TOKENS_STORAGE_KEY = "faunaAiMaxOutputTokens";
const AI_TOP_P_STORAGE_KEY = "faunaAiTopP";
const OLLAMA_TOP_K_STORAGE_KEY = "faunaOllamaTopK";
const OPENAI_VERBOSITY_STORAGE_KEY = "faunaOpenAiVerbosity";
const STREAM_RENDER_THROTTLE_MS = 45;
const CHAT_AUTO_SCROLL_THRESHOLD = 96;
const COMPOSER_SAFE_AREA_EXTRA_PX = 36;
const COMPOSER_SAFE_AREA_DESKTOP_MIN_PX = 172;
const COMPOSER_SAFE_AREA_MOBILE_MIN_PX = 176;
const VOICE_CHAT_FOCUS_TOP_OFFSET = 12;
const VOICE_CHAT_DESKTOP_BASE_BOTTOM_PADDING = 232;
const VOICE_CHAT_MOBILE_BASE_BOTTOM_PADDING = 218;
const VOICE_QUICK_PANEL_VIEWPORT_INSET = 12;
const VOICE_QUICK_PANEL_GAP = 12;
const VOICE_QUICK_PANEL_MIN_HEIGHT = 96;
const VOICE_QUICK_PANEL_MAX_HEIGHT = 620;
const VOICE_MIC_UNMUTED_ICON = `<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path><path d="M19 11v1a7 7 0 0 1-14 0v-1"></path><path d="M12 19v3"></path>`;
const VOICE_MIC_MUTED_ICON = `<path d="M12 3a3 3 0 0 1 3 3v4"></path><path d="M9 9v3a3 3 0 0 0 4.1 2.79"></path><path d="M5 11v1a7 7 0 0 0 11.7 5.22"></path><path d="M19 11v1a6.9 6.9 0 0 1-.62 2.86"></path><path d="M12 19v3"></path><path d="M8 22h8"></path><path d="m3 3 18 18"></path>`;
const VOICE_REPLY_ON_ICON = `<path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M16 9.5a4 4 0 0 1 0 5"></path><path d="M19 7a8 8 0 0 1 0 10"></path>`;
const VOICE_REPLY_OFF_ICON = `<path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="m21 3-18 18"></path><path d="M16 9.5a4 4 0 0 1 .5 1.5"></path><path d="M19 7a8 8 0 0 1 .9 3"></path>`;
const ASSISTANT_CONTROL_PREFIX = "fauna";
const LEGACY_ASSISTANT_CONTROL_PREFIX = "flo" + "ra";
const ASSISTANT_CONTROL_TAG_SUFFIXES = ["chat_title", "tool_call", "question", "memory"];
const ASSISTANT_CONTROL_TAG_NAMES = ASSISTANT_CONTROL_TAG_SUFFIXES.flatMap(suffix => [
    `${ASSISTANT_CONTROL_PREFIX}_${suffix}`,
    `${LEGACY_ASSISTANT_CONTROL_PREFIX}_${suffix}`
]);
const ASSISTANT_CONTROL_TAG_NAMES_PATTERN = ASSISTANT_CONTROL_TAG_NAMES.join("|");
const ASSISTANT_CONTROL_BLOCKS_RE = new RegExp(`<(?:${ASSISTANT_CONTROL_TAG_NAMES_PATTERN})>\\s*[\\s\\S]*?\\s*<\\/(?:${ASSISTANT_CONTROL_TAG_NAMES_PATTERN})>`, "gi");
const ASSISTANT_CONTROL_OPEN_TO_END_RE = new RegExp(`<(?:${ASSISTANT_CONTROL_TAG_NAMES_PATTERN})>\\s*[\\s\\S]*$`, "i");

function getAssistantControlTagNames(suffix) {
    return [
        `${ASSISTANT_CONTROL_PREFIX}_${suffix}`,
        `${LEGACY_ASSISTANT_CONTROL_PREFIX}_${suffix}`
    ];
}

function createAssistantControlTagRegex(suffix, flags = "") {
    const tagNames = getAssistantControlTagNames(suffix);
    return new RegExp(`<(?:${tagNames.join("|")})>\\s*([\\s\\S]*?)\\s*<\\/(?:${tagNames.join("|")})>`, flags);
}

function createAssistantControlOpenRegex(suffix, flags = "") {
    const tagNames = getAssistantControlTagNames(suffix);
    return new RegExp(`<(?:${tagNames.join("|")})>\\s*`, flags);
}

function createAssistantControlOpenToEndRegex(suffix, flags = "") {
    const tagNames = getAssistantControlTagNames(suffix);
    return new RegExp(`<(?:${tagNames.join("|")})>\\s*[\\s\\S]*$`, flags);
}

let activeTypewriterDurationSeconds = normalizeTypewriterDurationSeconds(
    safeLocalStorageGet(TYPEWRITER_DURATION_STORAGE_KEY)
);
const OPENAI_VOICE_SILENCE_THRESHOLD = 0.018;
const OPENAI_VOICE_SILENCE_HOLD_MS = 950;
const OPENAI_VOICE_MIN_RECORDING_MS = 650;
const OPENAI_VOICE_IDLE_TIMEOUT_MS = 10000;
const OPENAI_VOICE_MAX_RECORDING_MS = 45000;
const OPENAI_VOICE_MONITOR_INTERVAL_MS = 70;
const OPENAI_VOICE_RELISTEN_DELAY_MS = 450;
const VOICE_REALTIME_SPEECH_MIN_CHARS = 24;
const VOICE_REALTIME_SPEECH_SOFT_CHARS = 72;
const VOICE_REALTIME_SPEECH_MAX_CHARS = 150;
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
const PERSONALIZED_TIME_GREETING_GROUPS = {
    morning: [
        name => `Good morning, ${name}`,
        name => `Morning, ${name}. What are we building?`,
        name => `Fresh start, ${name}`,
        name => `${name}, Fauna is ready`
    ],
    afternoon: [
        name => `Good afternoon, ${name}`,
        name => `${name}, ready for the next idea`,
        name => `Afternoon flow, ${name}`,
        name => `Local workspace ready, ${name}`
    ],
    evening: [
        name => `Good evening, ${name}`,
        name => `Evening mode, ${name}`,
        name => `Quiet evening, ${name}`,
        name => `Settle in, ${name}`
    ],
    night: [
        name => `Late-night mode, ${name}`,
        name => `Night shift, ${name}`,
        name => `Still awake, ${name}`,
        name => `Midnight workspace, ${name}`
    ]
};

// Model Switcher Elements
const modelLabel = document.getElementById("modelLabel");
const modelBtn = document.getElementById("modelBtn");
const modelDropdown = document.getElementById("modelDropdown");

let attachedFiles = [];
let sessionTotalTokens = 0;
let usageEvents = [];
let usageToolEvents = [];
let persistedLibraryItems = [];
let deletedLibraryItemKeys = new Set();
let openAiFileCache = [];
let composerTokenState = { signature: "", status: "idle", count: null, source: "", error: "" };
let composerTokenCountTimer = null;
let composerTokenCountRequestId = 0;
let activeUsageView = "daily";
let isGenerating = false;
let hasGenerationConnectionBeenMade = false;
let shouldSpeakNextReply = false;
let isVoiceInputUpdate = false;
let preferredVoice = null;
let activeVoiceSpeed = 1;
let isVoiceReplyEnabled = true;
let isVoiceMicMuted = false;
let selectedVoiceMicDeviceId = "default";
let selectedVoiceOutputDeviceId = "default";
let mediaRecognition = null;
let isOpenAiVoiceSessionActive = false;
let openAiRealtimePeerConnection = null;
let openAiRealtimeDataChannel = null;
let openAiRealtimeAudioElement = null;
let openAiRealtimeAssistantBubble = null;
let openAiRealtimeAssistantNode = null;
let openAiRealtimeUserBubble = null;
let openAiRealtimeUserNode = null;
let openAiRealtimeAssistantText = "";
let openAiRealtimeAssistantBaseText = "";
let openAiRealtimeAssistantRenderedText = "";
let openAiRealtimeUserText = "";
let openAiRealtimeUserBaseText = "";
let openAiRealtimeUserHistoryIndex = null;
let openAiRealtimeAssistantHistoryIndex = null;
let openAiRealtimePendingUserTurn = false;
let openAiRealtimeSessionConnected = false;
let openAiRealtimeVoiceOutputStarted = false;
let openAiRealtimeVoiceRestartPromise = null;
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
let activeRealtimeSpeechReply = null;
let activeAssistantTtsPlayback = null;
let activeVoicePreviewAudio = null;
let activeVoicePreviewUrl = null;
let activeVoicePreviewController = null;
let activeVoicePreviewId = "";
let hasShownVoiceOutputWarning = false;
let isSpeechPlaybackActive = false;
let isRecording = false;
let activeRequestController = null;
let activeCodeWorkbench = null;
let codeWorkbenchLoadTimer = null;
let codeWorkbenchEditTimer = null;
let codeWorkbenchLoadToken = 0;
const voiceCueLastPlayedAt = new Map();
const disabledButtonStates = new Map();
const sidebarController = createSidebarController();
const imageLightboxController = createImageLightbox();
let modelSwitcher = null;
let openAiChatModelSelect = null;
let openAiImageModelSelect = null;
let openAiTranscriptionModelSelect = null;
let openAiRealtimeModelSelect = null;
let localVoiceTranscriptionSelect = null;
let localVoiceReplyModelSelect = null;
let activeWorkspaceView = WORKSPACE_VIEW_PLAYGROUND;
let activeLibraryFilter = LIBRARY_FILTER_ALL;
let activeLibraryLayout = safeLocalStorageGet(LIBRARY_LAYOUT_STORAGE_KEY) === LIBRARY_LAYOUT_LIST
    ? LIBRARY_LAYOUT_LIST
    : LIBRARY_LAYOUT_GRID;
let selectedLibraryItemKeys = new Set();
let libraryPickerReturnFocus = null;
let libraryPickerSelectedIds = new Set();
let libraryPickerTypeFilter = LIBRARY_PICKER_TYPE_ALL;
let libraryPickerSortOrder = LIBRARY_PICKER_SORT_NEWEST;
let libraryPickerQuery = "";
let activeGreetingGroup = null;
let activeClarifyingQuestion = null;
let isChatTitleEditing = false;
let settingsReturnFocus = null;
let isChatPinnedToBottom = true;

function isChatNearBottom() {
    if (!chat) return true;
    const remainingScroll = chat.scrollHeight - chat.scrollTop - chat.clientHeight;
    return remainingScroll <= CHAT_AUTO_SCROLL_THRESHOLD;
}

function updateChatAutoScrollState() {
    isChatPinnedToBottom = isChatNearBottom();
}

function getComposerSafeAreaMinimum() {
    return window.matchMedia?.("(max-width: 768px)")?.matches
        ? COMPOSER_SAFE_AREA_MOBILE_MIN_PX
        : COMPOSER_SAFE_AREA_DESKTOP_MIN_PX;
}

function updateComposerSafeArea() {
    if (!chat || !inputWrapper) return;
    const rect = inputWrapper.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const bottomGap = Math.max(0, viewportHeight - rect.bottom);
    const safeArea = Math.ceil(rect.height + bottomGap + COMPOSER_SAFE_AREA_EXTRA_PX);
    chat.style.setProperty("--composer-safe-area", `${Math.max(getComposerSafeAreaMinimum(), safeArea)}px`);
}

function scheduleComposerSafeAreaUpdate({ scroll = false, force = false } = {}) {
    window.requestAnimationFrame(() => {
        updateComposerSafeArea();
        if (scroll) {
            scrollChatToBottom({ force, behavior: "auto" });
        }
    });
}

function scrollChatToBottom({ force = false, behavior = "auto" } = {}) {
    if (!chat) return;
    if (!force && !isChatPinnedToBottom && !isChatNearBottom()) return;

    chat.scrollTo({
        top: chat.scrollHeight,
        behavior
    });
    isChatPinnedToBottom = true;
}

function forceScrollChatToBottom({ behavior = "auto" } = {}) {
    if (!chat) return;
    scrollChatToBottom({ force: true, behavior });
}

function scrollChatNodeToTop(node, { force = false, behavior = "smooth" } = {}) {
    if (!chat || !(node instanceof Element)) return;
    if (!force && !isChatPinnedToBottom && !isChatNearBottom()) return;

    const chatRect = chat.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const top = Math.max(0, chat.scrollTop + nodeRect.top - chatRect.top - VOICE_CHAT_FOCUS_TOP_OFFSET);
    chat.scrollTo({ top, behavior });
    isChatPinnedToBottom = isChatNearBottom();
}

function getVoiceTurnFocusNode() {
    const assistantNode = openAiRealtimeAssistantNode?.parentElement === chat
        ? openAiRealtimeAssistantNode
        : chat?.querySelector?.(".message-node.voice-current-assistant-reply");
    const latestNode = assistantNode || chat?.lastElementChild || null;
    let cursor = latestNode?.previousElementSibling || null;
    while (cursor) {
        if (cursor.classList?.contains("user-node")) return cursor;
        cursor = cursor.previousElementSibling;
    }
    return latestNode;
}

function updateVoiceChatBottomPadding() {
    if (!chat || !document.body?.classList.contains("voice-chat-active")) return;
    const focusNode = getVoiceTurnFocusNode();
    if (!focusNode) {
        chat.style.removeProperty("--voice-chat-turn-padding");
        return;
    }

    const computedStyle = getComputedStyle(chat);
    const currentPadding = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const focusRect = focusNode.getBoundingClientRect();
    const chatRect = chat.getBoundingClientRect();
    const focusTop = chat.scrollTop + focusRect.top - chatRect.top;
    const targetScrollTop = Math.max(0, focusTop - VOICE_CHAT_FOCUS_TOP_OFFSET);
    const currentMaxScrollTop = Math.max(0, chat.scrollHeight - chat.clientHeight);
    const exactPadding = currentPadding + targetScrollTop - currentMaxScrollTop;
    const basePadding = window.matchMedia?.("(max-width: 768px)")?.matches
        ? VOICE_CHAT_MOBILE_BASE_BOTTOM_PADDING
        : VOICE_CHAT_DESKTOP_BASE_BOTTOM_PADDING;
    const nextPadding = Math.max(basePadding, Math.ceil(exactPadding));
    chat.style.setProperty("--voice-chat-turn-padding", `${nextPadding}px`);
}

function scrollVoiceChatToFocus({ force = false, behavior = "smooth" } = {}) {
    if (!chat) return;
    updateVoiceChatBottomPadding();
    const focusNode = getVoiceTurnFocusNode();
    if (!focusNode) return;
    scrollChatNodeToTop(focusNode, { force, behavior });
}

let segmentIndicatorFrame = 0;

function setAnimatedSegmentIndicator(group, activeElement) {
    if (!(group instanceof HTMLElement) || !(activeElement instanceof HTMLElement)) return;
    const groupRect = group.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();
    if (groupRect.width <= 0 || groupRect.height <= 0 || activeRect.width <= 0 || activeRect.height <= 0) {
        group.classList.remove("segment-indicator-ready");
        return;
    }
    group.style.setProperty("--segment-indicator-x", `${activeRect.left - groupRect.left}px`);
    group.style.setProperty("--segment-indicator-y", `${activeRect.top - groupRect.top}px`);
    group.style.setProperty("--segment-indicator-width", `${activeRect.width}px`);
    group.style.setProperty("--segment-indicator-height", `${activeRect.height}px`);
    group.classList.add("segment-indicator-ready");
}

function updateAnimatedSegmentIndicators() {
    setAnimatedSegmentIndicator(libraryFilterGroup, libraryFilterGroup?.querySelector(".library-filter.active"));
    setAnimatedSegmentIndicator(libraryLayoutGroup, libraryLayoutGroup?.querySelector(".library-layout-toggle.active"));
    setAnimatedSegmentIndicator(openAiCatalogSortGroup, openAiCatalogSortGroup?.querySelector(".model-catalog-sort-btn.active"));
    setAnimatedSegmentIndicator(providerSegment, providerSegment?.querySelector('.provider-choice[aria-checked="true"]'));
}

function scheduleAnimatedSegmentIndicators() {
    if (segmentIndicatorFrame) return;
    segmentIndicatorFrame = window.requestAnimationFrame(() => {
        segmentIndicatorFrame = 0;
        updateAnimatedSegmentIndicators();
    });
}

if ("ResizeObserver" in window) {
    const segmentResizeObserver = new ResizeObserver(() => scheduleAnimatedSegmentIndicators());
    [libraryFilterGroup, libraryLayoutGroup, openAiCatalogSortGroup, providerSegment].forEach(group => {
        if (group) segmentResizeObserver.observe(group);
    });
}

chat?.addEventListener("scroll", updateChatAutoScrollState, { passive: true });
window.addEventListener("resize", () => {
    scheduleAnimatedSegmentIndicators();
    positionVoiceQuickPanel();
    updateComposerSafeArea();
    if (!document.body?.classList.contains("voice-chat-active")) return;
    scrollVoiceChatToFocus({ behavior: "auto", force: true });
}, { passive: true });

if (inputWrapper && "ResizeObserver" in window) {
    new ResizeObserver(() => scheduleComposerSafeAreaUpdate()).observe(inputWrapper);
}

function setCurrentVoiceAssistantNode(node) {
    chat?.querySelectorAll(".message-node.voice-current-assistant-reply").forEach(currentNode => {
        if (currentNode !== node) currentNode.classList.remove("voice-current-assistant-reply");
    });
    if (!node) return;
    node.classList.add("voice-assistant-reply", "voice-current-assistant-reply");
}

function getTimeGreetingGroup(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
}

function pickRandomGreeting(group) {
    const displayName = getPersonaDisplayName();
    if (displayName) {
        const personalizedGreetings = PERSONALIZED_TIME_GREETING_GROUPS[group] || PERSONALIZED_TIME_GREETING_GROUPS.afternoon;
        return personalizedGreetings[Math.floor(Math.random() * personalizedGreetings.length)](displayName);
    }
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

    while ([...toastRegion.children].filter(child => !child.classList.contains("leaving")).length >= 4) {
        const oldestToast = [...toastRegion.children].find(child => !child.classList.contains("leaving"));
        if (oldestToast?._faunaDismissToast) {
            oldestToast._faunaDismissToast();
        } else {
            oldestToast?.classList.add("leaving");
            window.setTimeout(() => oldestToast?.remove(), 260);
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
        toast.remove();
    };

    const dismiss = (direction = 0) => {
        if (isDismissed) return;
        clearDismissTimer();
        isDismissed = true;
        toast.classList.remove("paused", "dragging");
        toast.style.setProperty("--toast-exit-x", direction !== 0 ? `${direction * 120}%` : "0px");
        toast.style.setProperty("--toast-exit-y", direction !== 0 ? "0px" : "8px");
        toast.style.setProperty("--toast-exit-rotate", direction !== 0 ? `${direction * 5}deg` : "0deg");
        toast.style.transform = "";
        toast.style.opacity = "";
        toast.classList.add("leaving");
        toast.addEventListener("animationend", removeToast, { once: true });
        window.setTimeout(removeToast, 320);
    };

    toast._faunaRemoveToast = removeToast;
    toast._faunaDismissToast = dismiss;

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

    if (/OpenAI requests need the Local Workspace Bridge|OpenAI bridge|local-bridge\.py/i.test(rawMessage)) {
        return {
            title: "OpenAI bridge needed",
            message: "Start the local bridge, save its token, and enable Local Workspace before using OpenAI.",
            detail: rawMessage,
            canCheckProvider: false
        };
    }

    if (/context_length_exceeded|context window|input exceeds/i.test(rawMessage)) {
        return {
            title: "Chat context is too large",
            message: "Fauna trimmed generated image data from chat context. If this still happens, fork from an earlier response or start a fresh chat.",
            detail: rawMessage,
            canCheckProvider: false
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
    delete target._faunaToolActivityState;
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
    title.textContent = info.title || "Something went wrong";

    const message = document.createElement("div");
    message.className = "error-card-message";
    message.textContent = info.message || "Fauna could not complete this request.";

    body.appendChild(title);
    body.appendChild(message);

    const actions = document.createElement("div");
    actions.className = "error-card-actions";
    let detail = null;

    if (typeof info.onRetry === "function") {
        const retryButton = document.createElement("button");
        retryButton.className = "error-card-action error-card-retry";
        retryButton.type = "button";
        retryButton.textContent = info.retryLabel || "Retry";
        retryButton.addEventListener("click", async () => {
            if (isGenerating) return;
            const idleText = retryButton.textContent;
            retryButton.disabled = true;
            retryButton.textContent = "Retrying...";
            try {
                await info.onRetry();
            } catch (err) {
                showToast(`Retry failed: ${err.message}`, "error");
                if (retryButton.isConnected) {
                    retryButton.disabled = false;
                    retryButton.textContent = idleText;
                }
            }
        });
        actions.appendChild(retryButton);
    }

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
    }

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

    if (actions.childElementCount > 0) {
        body.appendChild(actions);
    }
    if (detail) {
        body.appendChild(detail);
    }

    card.appendChild(icon);
    card.appendChild(body);
    target.appendChild(card);
}

function prepareBubbleForRetry(target) {
    if (!target) return;
    const block = target.parentElement;
    if (block instanceof HTMLElement) {
        block.querySelectorAll(".tool-activity-bubble, .creation-progress-bubble").forEach(bubble => {
            if (bubble !== target) bubble.remove();
        });
        block.querySelector(".assistant-message-actions")?.remove();
        block.querySelector(".web-sources")?.remove();
    }
    renderThinkingBubble(target);
}

function getAssistantHistoryIndexForBubble(target) {
    const messageNode = target?.closest?.(".message-node.output-node");
    if (!messageNode) return null;
    return normalizeHistoryIndex(
        messageNode.dataset.historyIndex
        || messageNode.querySelector(".assistant-message-actions")?.dataset.messageIndex
    );
}

function updateAssistantHistoryForBubble(target, content) {
    const messageIndex = getAssistantHistoryIndexForBubble(target);
    if (messageIndex === null || conversationHistory[messageIndex]?.role !== "assistant") return null;
    conversationHistory[messageIndex] = {
        ...conversationHistory[messageIndex],
        content,
        createdAt: new Date().toISOString()
    };
    return messageIndex;
}

async function retryAssistantGenerationFromBubble(target, {
    model = OLLAMA_MODEL,
    webSources = [],
    speakThisReply = false
} = {}) {
    if (isGenerating || !target) return;

    clearClarifyingQuestionComposer();
    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    setGeneratingBusy(true);
    prepareBubbleForRetry(target);

    try {
        const data = await sendOllamaChatWithLocalTools(
            conversationHistory,
            getActiveChatRequestOptions(),
            model,
            generationSignal,
            target,
            { enabled: true }
        );
        const tokenUsage = getProviderTokenUsage(data);
        const assistantMessage = getAssistantMessageForConversation(data, model);
        attachTokenUsage(assistantMessage, tokenUsage);
        conversationHistory.push(assistantMessage);
        const assistantIndex = conversationHistory.length - 1;

        addSessionTokens(tokenUsage, { message: assistantMessage });
        await renderAssistantResponse(data, target, webSources, generationSignal, speakThisReply, {
            messageIndex: assistantIndex,
            alreadyRendered: data.__faunaAlreadyRendered === true,
            preserveRenderedContent: data.__faunaPreserveRenderedContent === true
        });
        showToast("Generation retried.", "success");
    } catch (err) {
        renderErrorCard(target, err, {
            retryLabel: "Retry generation",
            onRetry: () => retryAssistantGenerationFromBubble(target, { model, webSources, speakThisReply })
        });
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
    }
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

function shouldUseTypewriterMotion() {
    return !prefersReducedMotion() && activeTypewriterDurationSeconds > 0;
}

function normalizeTypewriterDurationSeconds(value) {
    if (value === null || value === undefined || value === "") return TYPEWRITER_DEFAULT_DURATION_SECONDS;
    const duration = Number(value);
    if (!Number.isFinite(duration)) return TYPEWRITER_DEFAULT_DURATION_SECONDS;
    return Math.min(
        TYPEWRITER_MAX_DURATION_SECONDS,
        Math.max(TYPEWRITER_MIN_DURATION_SECONDS, Math.round(duration))
    );
}

function formatTypewriterDurationSeconds(duration) {
    return duration <= 0 ? "Instant" : `${duration}s`;
}

function updateTypewriterDurationUi() {
    const value = String(activeTypewriterDurationSeconds);
    if (typewriterDuration) typewriterDuration.value = value;
    if (typewriterDurationNumber) typewriterDurationNumber.value = value;
    if (typewriterDurationValue) {
        typewriterDurationValue.textContent = formatTypewriterDurationSeconds(activeTypewriterDurationSeconds);
    }
}

function setTypewriterDurationSeconds(duration, { persist = true } = {}) {
    activeTypewriterDurationSeconds = normalizeTypewriterDurationSeconds(duration);
    if (persist) {
        safeLocalStorageSet(TYPEWRITER_DURATION_STORAGE_KEY, String(activeTypewriterDurationSeconds));
    }
    updateTypewriterDurationUi();
}

function hasMarkdownCodeFence(text) {
    return /^```/m.test(text || "");
}

function getTypewriterTiming(textLength) {
    const durationMs = activeTypewriterDurationSeconds * 1000;
    if (!Number.isFinite(durationMs) || durationMs <= 0 || textLength <= 0) return null;

    const desiredFrameCount = Math.max(1, Math.round(durationMs / TYPEWRITER_FRAME_DELAY_MS));
    const frameCount = Math.max(1, Math.min(textLength, TYPEWRITER_MAX_ANIMATION_FRAMES, desiredFrameCount));
    return {
        stepLength: Math.max(TYPEWRITER_MIN_CHARS_PER_FRAME, Math.ceil(textLength / frameCount)),
        frameDelayMs: Math.max(0, Math.round(durationMs / frameCount))
    };
}

function getTypewriterFadeMotion(value) {
    if (!shouldUseTypewriterMotion()) return null;

    const requestedCharCount = Number(value);
    const durationRatio = Math.min(1, activeTypewriterDurationSeconds / TYPEWRITER_MAX_DURATION_SECONDS);
    const settingTailChars = TYPEWRITER_FADE_MIN_TRAILING_CHARS
        + Math.round((TYPEWRITER_FADE_MAX_TRAILING_CHARS - TYPEWRITER_FADE_MIN_TRAILING_CHARS) * durationRatio);
    const requestedTailChars = Number.isFinite(requestedCharCount) && requestedCharCount > 0
        ? Math.round(requestedCharCount)
        : TYPEWRITER_FADE_MIN_TRAILING_CHARS;
    const charCount = Math.max(
        1,
        Math.min(TYPEWRITER_FADE_MAX_TRAILING_CHARS, Math.max(requestedTailChars, settingTailChars))
    );

    return {
        charCount,
        durationMs: Math.round(460 + durationRatio * 760),
        blurPx: Math.round(6 + durationRatio * 10),
        liftPx: Math.round(6 + durationRatio * 11),
        glowAlpha: `${Math.round((0.5 + durationRatio * 0.3) * 100)}%`,
        midGlowAlpha: `${Math.round((0.3 + durationRatio * 0.22) * 100)}%`
    };
}

function applyTypewriterFadeStyle(node, motion) {
    if (!node || !motion) return;
    node.style.setProperty("--typewriter-tail-duration", `${motion.durationMs}ms`);
    node.style.setProperty("--typewriter-tail-blur", `${motion.blurPx}px`);
    node.style.setProperty("--typewriter-tail-lift", `${motion.liftPx}px`);
    node.style.setProperty("--typewriter-tail-glow-alpha", motion.glowAlpha);
    node.style.setProperty("--typewriter-tail-mid-glow-alpha", motion.midGlowAlpha);
}

function wrapTrailingTextForTypewriterFade(target, fadeChars = TYPEWRITER_FADE_MIN_TRAILING_CHARS) {
    if (!target) return;
    const motion = getTypewriterFadeMotion(fadeChars);
    if (!motion) return;
    const charCount = motion.charCount;
    const textNodes = [];
    const walker = document.createTreeWalker(
        target,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                return node.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );
    let totalLength = 0;
    let currentNode = walker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode);
        totalLength += currentNode.nodeValue.length;
        currentNode = walker.nextNode();
    }
    if (!totalLength || textNodes.length === 0) return;

    const startPosition = Math.max(0, totalLength - charCount);
    let seenLength = 0;
    let startNode = textNodes[0];
    let startOffset = 0;
    for (const node of textNodes) {
        const nextSeenLength = seenLength + node.nodeValue.length;
        if (startPosition <= nextSeenLength) {
            startNode = node;
            startOffset = Math.max(0, startPosition - seenLength);
            break;
        }
        seenLength = nextSeenLength;
    }

    const endNode = textNodes[textNodes.length - 1];
    try {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endNode.nodeValue.length);
        const fragment = range.extractContents();
        const fade = document.createElement("span");
        fade.className = "typewriter-fade-tail";
        applyTypewriterFadeStyle(fade, motion);
        fade.appendChild(fragment);
        range.insertNode(fade);
        range.detach?.();
    } catch (error) {
        console.warn("Could not apply typewriter fade segment:", error);
    }
}

function renderMarkdownWithTypewriterCaret(rawText, options = {}) {
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(rawText || "");

    const caret = document.createElement("span");
    caret.className = "typewriter-caret";
    caret.setAttribute("aria-hidden", "true");

    const textTargets = Array.from(template.content.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6"));
    const target = textTargets.reverse().find(node => node.textContent.trim() || node.children.length > 0);
    if (target) {
        wrapTrailingTextForTypewriterFade(target, options.fadeChars);
        target.appendChild(caret);
    } else {
        template.content.appendChild(caret);
    }

    return template.innerHTML;
}

function renderTypewriterMarkdown(target, rawText, signal = null, options = {}) {
    if (!target) return Promise.resolve();
    const onReveal = typeof options.onReveal === "function" ? options.onReveal : null;
    target.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    if (!target._faunaToolActivityState) {
        target.classList.remove("tool-activity-bubble");
        target.removeAttribute("aria-busy");
    }
    if (!shouldUseTypewriterMotion() || !rawText || signal?.aborted || hasMarkdownCodeFence(rawText)) {
        renderAssistantContentHtml(target, renderMarkdown(rawText || ""), { final: true, busy: false });
        if (!signal?.aborted) onReveal?.(rawText || "", { done: true });
        return Promise.resolve();
    }

    if (!target._faunaToolActivityState) {
        target.classList.add("typewriter-active");
        target.setAttribute("aria-busy", "true");
    }

    const timing = getTypewriterTiming(rawText.length);
    if (!timing) {
        renderAssistantContentHtml(target, renderMarkdown(rawText || ""), { final: true, busy: false });
        return Promise.resolve();
    }

    const { stepLength, frameDelayMs } = timing;
    let cursor = 0;

    return new Promise(resolve => {
        const finish = ({ reveal = true } = {}) => {
            renderAssistantContentHtml(target, renderMarkdown(rawText), { final: true, busy: false });
            if (reveal) onReveal?.(rawText, { done: true });
            resolve();
        };

        const tick = () => {
            if (signal?.aborted) {
                finish({ reveal: false });
                return;
            }

            cursor = Math.min(rawText.length, cursor + stepLength);
            renderAssistantContentHtml(
                target,
                renderMarkdownWithTypewriterCaret(rawText.slice(0, cursor), { fadeChars: stepLength }),
                { final: false, busy: true }
            );
            onReveal?.(rawText.slice(0, cursor), { cursor, done: cursor >= rawText.length });

            if (cursor >= rawText.length) {
                finish();
                return;
            }

            window.setTimeout(() => window.requestAnimationFrame(tick), frameDelayMs);
        };

        window.requestAnimationFrame(tick);
    });
}

function stripVisibleAssistantControlBlocks(content, { hideIncomplete = true } = {}) {
    let text = normalizeAssistantControlMarkup(content);
    ASSISTANT_CONTROL_TAG_NAMES.forEach(tag => {
        const completeBlock = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "gi");
        text = text.replace(completeBlock, "");
    });

    if (hideIncomplete) {
        const lowerText = text.toLowerCase();
        let cutAt = -1;
        ASSISTANT_CONTROL_TAG_NAMES.forEach(tag => {
            const index = lowerText.indexOf(`<${tag}`);
            if (index !== -1 && (cutAt === -1 || index < cutAt)) {
                cutAt = index;
            }
        });
        if (cutAt !== -1) {
            text = text.slice(0, cutAt);
        }
    }

    return text.trim();
}

function normalizeAssistantControlMarkup(content) {
    let text = String(content || "");
    text = text.replace(/\\([<>])/g, "$1");
    ASSISTANT_CONTROL_TAG_NAMES.forEach(tag => {
        const escapedOpen = new RegExp(`&lt;\\s*${tag}\\s*&gt;`, "gi");
        const escapedClose = new RegExp(`&lt;\\s*\\/\\s*${tag}\\s*&gt;`, "gi");
        text = text
            .replace(escapedOpen, `<${tag}>`)
            .replace(escapedClose, `</${tag}>`);
    });
    return text;
}

function createAssistantStreamRenderer(target, signal = null) {
    let rawText = "";
    let renderedText = "";
    let hasRenderedText = false;
    let renderTimer = null;
    let animationFrame = null;
    let lastRenderAt = 0;

    const clearScheduledRender = () => {
        if (renderTimer !== null) {
            window.clearTimeout(renderTimer);
            renderTimer = null;
        }
        if (animationFrame !== null) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    };

    const render = (final = false) => {
        clearScheduledRender();
        if (!target || signal?.aborted) return;
        applyAssistantChatTitle(rawText);

        const visibleText = final
            ? stripAssistantControlBlocks(rawText)
            : stripVisibleAssistantControlBlocks(rawText);

        if (!visibleText && !hasRenderedText && !final) return;

        const containsCodeFence = hasMarkdownCodeFence(visibleText);

        if (final) {
            renderAssistantContentHtml(target, renderMarkdown(visibleText), { final: true, busy: false });
        } else if (!shouldUseTypewriterMotion() || containsCodeFence) {
            renderAssistantContentHtml(
                target,
                renderMarkdown(visibleText),
                { final: false, busy: true, typewriter: false }
            );
        } else {
            const fadeChars = Math.max(1, visibleText.length - renderedText.length);
            renderAssistantContentHtml(
                target,
                renderMarkdownWithTypewriterCaret(visibleText, { fadeChars }),
                { final: false, busy: true }
            );
        }

        renderedText = visibleText;
        if (visibleText) hasRenderedText = true;
        lastRenderAt = performance.now();
    };

    const scheduleRender = () => {
        if (signal?.aborted || renderTimer !== null || animationFrame !== null) return;
        const delay = Math.max(0, STREAM_RENDER_THROTTLE_MS - (performance.now() - lastRenderAt));
        renderTimer = window.setTimeout(() => {
            renderTimer = null;
            animationFrame = window.requestAnimationFrame(() => {
                animationFrame = null;
                render(false);
            });
        }, delay);
    };

    return {
        append(delta) {
            rawText += String(delta || "");
            applyAssistantChatTitle(rawText);
            scheduleRender();
        },
        finish(finalText = rawText) {
            rawText = String(finalText || "");
            render(true);
            return renderedText;
        },
        cancel() {
            clearScheduledRender();
        },
        get hasRendered() {
            return hasRenderedText;
        },
        get rawText() {
            return rawText;
        }
    };
}

function showApprovalDialog({
    title = "Approve action",
    message = "",
    details = [],
    confirmLabel = "Approve",
    cancelLabel = "Cancel"
} = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "approval-modal";
        overlay.setAttribute("role", "presentation");

        const dialog = document.createElement("section");
        dialog.className = "approval-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "approvalDialogTitle");

        const titleNode = document.createElement("h2");
        titleNode.id = "approvalDialogTitle";
        titleNode.textContent = title;

        const messageNode = document.createElement("p");
        messageNode.textContent = message;

        const detailList = document.createElement("ul");
        detailList.className = "approval-detail-list";
        details.filter(Boolean).forEach(detail => {
            const item = document.createElement("li");
            item.textContent = detail;
            detailList.appendChild(item);
        });

        const actions = document.createElement("div");
        actions.className = "approval-actions";

        const cancelButton = document.createElement("button");
        cancelButton.className = "provider-btn provider-btn-secondary";
        cancelButton.type = "button";
        cancelButton.textContent = cancelLabel;

        const confirmButton = document.createElement("button");
        confirmButton.className = "provider-btn provider-btn-primary";
        confirmButton.type = "button";
        confirmButton.textContent = confirmLabel;

        const close = (approved) => {
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve(approved);
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") close(false);
        };

        cancelButton.addEventListener("click", () => close(false));
        confirmButton.addEventListener("click", () => close(true));
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close(false);
        });
        document.addEventListener("keydown", onKeyDown);

        actions.append(cancelButton, confirmButton);
        dialog.append(titleNode, messageNode);
        if (detailList.children.length > 0) dialog.appendChild(detailList);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        window.setTimeout(() => confirmButton.focus(), 0);
    });
}

function escapeRegExpText(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getOpenAiVoicePricingFallback(overrides = {}) {
    const selectedRealtimeModel = getOpenAiRealtimeModel();
    return {
        sourceUrl: overrides.sourceUrl || OPENAI_PRICING_DOCS_URL,
        sourceLabel: overrides.sourceLabel || "official OpenAI pricing docs",
        refreshed: overrides.refreshed === true,
        partial: overrides.partial === true,
        warning: overrides.warning || "",
        realtimeModel: OPENAI_VOICE_PRICING_FALLBACK.realtimeModel,
        selectedRealtimeModel,
        realtimeMatchedSelectedModel: selectedRealtimeModel === OPENAI_VOICE_PRICING_FALLBACK.realtimeModel,
        realtime: {
            audio: { ...OPENAI_VOICE_PRICING_FALLBACK.realtime.audio },
            text: { ...OPENAI_VOICE_PRICING_FALLBACK.realtime.text }
        },
        transcriptionModels: OPENAI_VOICE_PRICING_FALLBACK.transcriptionModels.map(model => ({ ...model }))
    };
}

function normalizeOpenAiPricingText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function formatOpenAiPricingAmount(value) {
    const amount = String(value || "").trim().replace(/^\$/, "");
    const numericAmount = Number(amount);
    if (Number.isFinite(numericAmount)) {
        return `$${numericAmount.toFixed(numericAmount > 0 && numericAmount < 0.01 ? 3 : 2)}`;
    }
    return amount ? `$${amount}` : "";
}

function formatOpenAiTokenPrice(value) {
    return value ? `${value} / 1M tokens` : "Check current pricing";
}

function decodeOpenAiPricingHtmlEntities(value) {
    const text = String(value || "");
    if (typeof document !== "undefined") {
        const decoder = document.createElement("textarea");
        decoder.innerHTML = text;
        return decoder.value;
    }
    return text
        .replace(/&quot;/g, "\"")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function formatOpenAiSerializedPriceValue(value) {
    const cleanValue = String(value || "").trim().replace(/^"|"$/g, "");
    if (!cleanValue || cleanValue === "-") return "";
    if (/^\$/.test(cleanValue)) return cleanValue;
    return formatOpenAiPricingAmount(cleanValue);
}

function parseOpenAiSerializedPricingRow(segment, rowLabel) {
    const match = new RegExp(
        `"${escapeRegExpText(rowLabel)}"\\]\\s*,\\s*\\[0,([^\\]]+)\\]\\s*,\\s*\\[0,([^\\]]+)\\]\\s*,\\s*\\[0,([^\\]]+)\\]`,
        "i"
    ).exec(segment);
    if (!match) return null;
    return {
        input: formatOpenAiSerializedPriceValue(match[1]),
        cachedInput: formatOpenAiSerializedPriceValue(match[2]),
        output: formatOpenAiSerializedPriceValue(match[3])
    };
}

function getOpenAiPricingSourceLabel(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === "platform.openai.com") return "platform.openai.com/pricing";
        if (parsed.hostname === "developers.openai.com") return "official OpenAI pricing docs";
        return parsed.hostname;
    } catch {
        return "OpenAI pricing";
    }
}

function isBlockedOpenAiPricingContent(content) {
    return /enable javascript and cookies|challenge-platform|__cf_chl|just a moment/i.test(String(content || ""));
}

function parseOpenAiRealtimePricing(content) {
    const text = normalizeOpenAiPricingText(content);
    const candidates = [
        getOpenAiRealtimeModel(),
        DEFAULT_OPENAI_REALTIME_MODEL,
        OPENAI_VOICE_PRICING_FALLBACK.realtimeModel
    ].filter((model, index, all) => model && all.indexOf(model) === index);

    for (const model of candidates) {
        const match = new RegExp(
            `\\b${escapeRegExpText(model)}\\b\\s+Audio\\s*\\$([\\d.]+)\\s*\\$([\\d.]+)\\s*\\$([\\d.]+)(?:\\s+Text\\s*\\$([\\d.]+)\\s*\\$([\\d.]+)\\s*\\$([\\d.]+))?`,
            "i"
        ).exec(text);
        if (!match) continue;

        return {
            realtimeModel: model,
            selectedRealtimeModel: getOpenAiRealtimeModel(),
            realtimeMatchedSelectedModel: model === getOpenAiRealtimeModel(),
            realtime: {
                audio: {
                    input: formatOpenAiPricingAmount(match[1]),
                    cachedInput: formatOpenAiPricingAmount(match[2]),
                    output: formatOpenAiPricingAmount(match[3])
                },
                text: {
                    input: formatOpenAiPricingAmount(match[4]),
                    cachedInput: formatOpenAiPricingAmount(match[5]),
                    output: formatOpenAiPricingAmount(match[6])
                }
            }
        };
    }

    const serializedText = decodeOpenAiPricingHtmlEntities(content);
    for (const model of candidates) {
        const modelIndex = serializedText.indexOf(`"model":[0,"${model}"]`);
        if (modelIndex < 0) continue;

        const segment = serializedText.slice(modelIndex, modelIndex + 1200);
        const audio = parseOpenAiSerializedPricingRow(segment, "Audio");
        const textRow = parseOpenAiSerializedPricingRow(segment, "Text");
        if (!audio) continue;

        return {
            realtimeModel: model,
            selectedRealtimeModel: getOpenAiRealtimeModel(),
            realtimeMatchedSelectedModel: model === getOpenAiRealtimeModel(),
            realtime: {
                audio,
                text: textRow || { input: "", cachedInput: "", output: "" }
            }
        };
    }

    return null;
}

function parseOpenAiTranscriptionPricing(content) {
    const text = normalizeOpenAiPricingText(content);
    const rows = [];
    const seen = new Set();
    const rowPattern = /\b(gpt-4o(?:-mini)?-transcribe(?:-[0-9-]+)?|gpt-4o-transcribe-diarize)\b\s+Transcription\s*\$([\d.]+)\s*\$([\d.]+)\s*\$([\d.]+)\s*\/\s*minute/gi;
    let match;

    while ((match = rowPattern.exec(text))) {
        const model = match[1];
        if (seen.has(model)) continue;
        seen.add(model);
        rows.push({
            model,
            input: formatOpenAiPricingAmount(match[2]),
            output: formatOpenAiPricingAmount(match[3]),
            estimatedCost: `${formatOpenAiPricingAmount(match[4])} / minute`
        });
    }

    const serializedText = decodeOpenAiPricingHtmlEntities(content);
    const modelPattern = /"model":\[0,"(gpt-4o(?:-mini)?-transcribe(?:-[0-9-]+)?|gpt-4o-transcribe-diarize)"\]/gi;
    while ((match = modelPattern.exec(serializedText))) {
        const model = match[1];
        if (seen.has(model)) continue;

        const segment = serializedText.slice(match.index, match.index + 800);
        const row = parseOpenAiSerializedPricingRow(segment, "Transcription")
            || parseOpenAiSerializedPricingRow(segment, "Transcription + diarization");
        if (!row) continue;

        seen.add(model);
        rows.push({
            model,
            input: row.input,
            output: row.cachedInput,
            estimatedCost: row.output
        });
    }

    return rows;
}

function buildOpenAiVoicePricingData(content, source) {
    const fallback = getOpenAiVoicePricingFallback(source);
    const realtimePricing = parseOpenAiRealtimePricing(content);
    const transcriptionModels = parseOpenAiTranscriptionPricing(content);

    return {
        ...fallback,
        ...(realtimePricing || {}),
        transcriptionModels: transcriptionModels.length ? transcriptionModels : fallback.transcriptionModels,
        refreshed: Boolean(realtimePricing || transcriptionModels.length),
        partial: !realtimePricing || transcriptionModels.length === 0
    };
}

async function fetchOpenAiPricingPageInBrowser(url, signal = null) {
    const res = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
        },
        signal
    });
    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();
    const readable = extractReadablePageText(raw, contentType);
    const content = [readable.text, raw].filter(Boolean).join("\n");

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    if (isBlockedOpenAiPricingContent(content || raw)) {
        throw new Error("Pricing page requires JavaScript or cookies for this request.");
    }

    return {
        url,
        finalUrl: res.url || url,
        title: readable.title,
        contentType,
        status: res.status,
        source: "browser",
        content
    };
}

async function fetchOpenAiPricingPageWithBridge(url, signal = null) {
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("Local Workspace Bridge is not enabled.");
    }

    const result = await requestWorkspaceBridge("/fetch-url", {
        method: "POST",
        signal,
        body: {
            url,
            maxBytes: 160000
        }
    });
    const content = normalizeReadableWebText(result.content || "");
    if (isBlockedOpenAiPricingContent(content)) {
        throw new Error("Pricing page requires JavaScript or cookies for this request.");
    }

    return {
        url,
        finalUrl: result.finalUrl || result.url || url,
        title: result.title || "",
        contentType: result.contentType || "",
        status: result.status,
        source: "local bridge",
        content
    };
}

async function fetchOpenAiPricingPage(url, signal = null) {
    const isPlatformPricingPage = (() => {
        try {
            const parsed = new URL(url);
            return parsed.hostname === "platform.openai.com" && parsed.pathname.replace(/\/+$/, "") === "/pricing";
        } catch {
            return false;
        }
    })();

    if (isPlatformPricingPage) {
        if (!hasWorkspaceBridgeAccess()) {
            throw new Error("platform.openai.com/pricing is not directly readable from the browser.");
        }
        return fetchOpenAiPricingPageWithBridge(url, signal);
    }

    try {
        return await fetchOpenAiPricingPageInBrowser(url, signal);
    } catch (browserError) {
        if (browserError.name === "AbortError") throw browserError;
        try {
            return await fetchOpenAiPricingPageWithBridge(url, signal);
        } catch (bridgeError) {
            if (bridgeError.name === "AbortError") throw bridgeError;
            throw new Error(bridgeError.message || browserError.message || "Pricing page could not be read.");
        }
    }
}

async function loadOpenAiVoicePricingForNotice() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), OPENAI_PRICING_FETCH_TIMEOUT_MS);
    const errors = [];

    try {
        for (const url of [OPENAI_PRICING_PAGE_URL, OPENAI_PRICING_DOCS_URL]) {
            try {
                const page = await fetchOpenAiPricingPage(url, controller.signal);
                const pricing = buildOpenAiVoicePricingData(page.content, {
                    sourceUrl: page.finalUrl || url,
                    sourceLabel: getOpenAiPricingSourceLabel(page.finalUrl || url)
                });

                if (!pricing.refreshed) {
                    throw new Error("No readable Realtime or transcription prices were found.");
                }
                return pricing;
            } catch (err) {
                if (err.name === "AbortError") throw err;
                errors.push(`${getOpenAiPricingSourceLabel(url)}: ${err.message}`);
            }
        }
    } catch (err) {
        if (err.name !== "AbortError") errors.push(err.message);
    } finally {
        window.clearTimeout(timeoutId);
    }

    return getOpenAiVoicePricingFallback({
        refreshed: false,
        warning: errors.filter(Boolean).join(" ")
    });
}

function getBaseOpenAiTranscriptionModelId(modelId) {
    return String(modelId || "").replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

function getSelectedOpenAiTranscriptionPricing(pricing) {
    const selectedModel = getOpenAiTranscriptionModel();
    const baseModel = getBaseOpenAiTranscriptionModelId(selectedModel);
    const rows = pricing.transcriptionModels || [];
    const match = rows.find(row => row.model === selectedModel)
        || rows.find(row => row.model === baseModel)
        || rows.find(row => row.model === DEFAULT_OPENAI_TRANSCRIPTION_MODEL)
        || rows[0]
        || OPENAI_VOICE_PRICING_FALLBACK.transcriptionModels[0];

    return {
        ...match,
        selectedModel,
        matchedSelectedModel: match.model === selectedModel || match.model === baseModel
    };
}

function appendOpenAiVoiceCostMetric(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
}

function createOpenAiVoiceCostCard(title, metrics, note = "") {
    const card = document.createElement("section");
    card.className = "voice-cost-rate-card";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const list = document.createElement("dl");
    metrics.forEach(([label, value]) => appendOpenAiVoiceCostMetric(list, label, value));

    card.append(heading, list);
    if (note) {
        const noteNode = document.createElement("p");
        noteNode.textContent = note;
        card.appendChild(noteNode);
    }

    return card;
}

function showOpenAiVoiceCostDialog(pricing) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "approval-modal";
        overlay.setAttribute("role", "presentation");

        const dialog = document.createElement("section");
        dialog.className = "approval-dialog openai-voice-cost-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "openAiVoiceCostTitle");

        const titleNode = document.createElement("h2");
        titleNode.id = "openAiVoiceCostTitle";
        titleNode.textContent = "OpenAI voice chat can add up";

        const lede = document.createElement("p");
        lede.className = "voice-cost-lede";
        lede.textContent = "Fauna uses OpenAI Realtime voice chat and input transcription. Those are billed as separate OpenAI line items.";

        const selectedTranscription = getSelectedOpenAiTranscriptionPricing(pricing);
        const rateGrid = document.createElement("div");
        rateGrid.className = "voice-cost-rate-grid";
        rateGrid.append(
            createOpenAiVoiceCostCard(
                `Realtime audio (${pricing.realtimeModel})`,
                [
                    ["Input audio", formatOpenAiTokenPrice(pricing.realtime.audio.input)],
                    ["Cached input", formatOpenAiTokenPrice(pricing.realtime.audio.cachedInput)],
                    ["Output audio", formatOpenAiTokenPrice(pricing.realtime.audio.output)]
                ],
                pricing.realtimeMatchedSelectedModel ? "" : `Selected Realtime model: ${pricing.selectedRealtimeModel}. Showing the closest current OpenAI pricing row.`
            ),
            createOpenAiVoiceCostCard(
                "Realtime text context",
                [
                    ["Input text", formatOpenAiTokenPrice(pricing.realtime.text.input)],
                    ["Cached input", formatOpenAiTokenPrice(pricing.realtime.text.cachedInput)],
                    ["Output text", formatOpenAiTokenPrice(pricing.realtime.text.output)]
                ],
                "Text context inside the voice session is billed separately from audio tokens."
            ),
            createOpenAiVoiceCostCard(
                `Input transcription (${selectedTranscription.model})`,
                [
                    ["Input", formatOpenAiTokenPrice(selectedTranscription.input)],
                    ["Output", formatOpenAiTokenPrice(selectedTranscription.output)],
                    ["Estimate", selectedTranscription.estimatedCost || "Check current pricing"]
                ],
                selectedTranscription.matchedSelectedModel ? "" : `Selected transcription model: ${selectedTranscription.selectedModel}. Check OpenAI pricing if your selected model differs.`
            )
        );

        const cacheNote = document.createElement("p");
        cacheNote.className = "voice-cost-note";
        cacheNote.textContent = "Caching can make repeated input cheaper when OpenAI applies cached-input pricing, but it is not guaranteed for every turn.";

        const sourceNote = document.createElement("p");
        sourceNote.className = "voice-cost-source";
        const sourceIntro = pricing.refreshed
            ? "Loaded current prices from "
            : "Could not refresh pricing; showing last verified official values from ";
        sourceNote.append(document.createTextNode(sourceIntro));
        const sourceLink = document.createElement("a");
        sourceLink.href = pricing.sourceUrl || OPENAI_PRICING_PAGE_URL;
        sourceLink.target = "_blank";
        sourceLink.rel = "noreferrer";
        sourceLink.textContent = pricing.sourceLabel || "OpenAI pricing";
        sourceNote.appendChild(sourceLink);
        sourceNote.append(document.createTextNode("."));

        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "approval-checkbox-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkboxLabel.append(checkbox, document.createTextNode("Don't show this again"));

        const actions = document.createElement("div");
        actions.className = "approval-actions";

        const cancelButton = document.createElement("button");
        cancelButton.className = "provider-btn provider-btn-secondary";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        const confirmButton = document.createElement("button");
        confirmButton.className = "provider-btn provider-btn-primary";
        confirmButton.type = "button";
        confirmButton.textContent = "Continue";

        const close = (approved) => {
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve({
                approved,
                dontShowAgain: approved && checkbox.checked
            });
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") close(false);
        };

        cancelButton.addEventListener("click", () => close(false));
        confirmButton.addEventListener("click", () => close(true));
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close(false);
        });
        document.addEventListener("keydown", onKeyDown);

        actions.append(cancelButton, confirmButton);
        dialog.append(titleNode, lede, rateGrid, cacheNote, sourceNote, checkboxLabel, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        window.setTimeout(() => confirmButton.focus(), 0);
    });
}

async function ensureOpenAiVoiceCostNoticeAccepted() {
    if (safeLocalStorageGet(OPENAI_VOICE_COST_NOTICE_DISMISSED_STORAGE_KEY) === "true") return true;

    const pricing = await loadOpenAiVoicePricingForNotice();
    const result = await showOpenAiVoiceCostDialog(pricing);
    if (result.approved && result.dontShowAgain) {
        safeLocalStorageSet(OPENAI_VOICE_COST_NOTICE_DISMISSED_STORAGE_KEY, "true");
    }
    return result.approved;
}

function showDeleteChatDialog(session, mediaCount = 0) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "approval-modal";
        overlay.setAttribute("role", "presentation");

        const dialog = document.createElement("section");
        dialog.className = "approval-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "deleteChatDialogTitle");

        const titleNode = document.createElement("h2");
        titleNode.id = "deleteChatDialogTitle";
        titleNode.textContent = "Delete chat?";

        const messageNode = document.createElement("p");
        messageNode.textContent = "Do you want to delete this chat?";

        const detailList = document.createElement("ul");
        detailList.className = "approval-detail-list";
        [session?.title, mediaCount > 0 ? `${mediaCount} media ${mediaCount === 1 ? "item" : "items"} in Library` : "No media from this chat in Library"]
            .filter(Boolean)
            .forEach(detail => {
                const item = document.createElement("li");
                item.textContent = detail;
                detailList.appendChild(item);
            });

        const optionLabel = document.createElement("label");
        optionLabel.className = "approval-checkbox-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.disabled = mediaCount === 0;

        const optionText = document.createElement("span");
        optionText.textContent = "Delete this chat's media from Library";

        optionLabel.append(checkbox, optionText);

        const actions = document.createElement("div");
        actions.className = "approval-actions";

        const cancelButton = document.createElement("button");
        cancelButton.className = "provider-btn provider-btn-secondary";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        const confirmButton = document.createElement("button");
        confirmButton.className = "provider-btn provider-btn-primary";
        confirmButton.type = "button";
        confirmButton.textContent = "Delete chat";

        const close = (approved) => {
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve({
                approved,
                deleteMedia: approved && checkbox.checked && mediaCount > 0
            });
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") close(false);
        };

        cancelButton.addEventListener("click", () => close(false));
        confirmButton.addEventListener("click", () => close(true));
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close(false);
        });
        document.addEventListener("keydown", onKeyDown);

        actions.append(cancelButton, confirmButton);
        dialog.append(titleNode, messageNode, detailList, optionLabel, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        window.setTimeout(() => cancelButton.focus(), 0);
    });
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
}

function getToolActivityIcon(kind = "tool") {
    const icons = {
        web: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.3 2.45 3.45 5.45 3.45 9S14.3 18.55 12 21"></path><path d="M12 3c-2.3 2.45-3.45 5.45-3.45 9S9.7 18.55 12 21"></path>',
        workspace: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"></path>',
        file: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path>',
        image: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path>',
        location: '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle>',
        timer: '<circle cx="12" cy="13" r="8"></circle><path d="M12 13V8"></path><path d="M12 13l3 2"></path><path d="M9 2h6"></path>',
        memory: '<path d="M6 3h12v18l-6-3-6 3V3Z"></path><path d="M9 8h6"></path><path d="M9 12h4"></path>',
        terminal: '<path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path>',
        done: '<circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.6 2.6L16.5 8.7"></path>',
        tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-3-3Z"></path>'
    };
    return icons[kind] || icons.tool;
}

let toolActivityPanelIdCounter = 0;

const PIXEL_LOADER_KINDS = new Set(["thinking", "image", "video", "web", "location", "timer", "memory", "workspace", "terminal", "tool"]);
const PIXEL_LOADER_SPRITES = {
    dots: [
        "00000000",
        "00000000",
        "00100100",
        "00000000",
        "00000000",
        "00100100",
        "00000000",
        "00000000"
    ],
    arrow: [
        "00010000",
        "00011000",
        "11111100",
        "11111110",
        "11111100",
        "00011000",
        "00010000",
        "00000000"
    ],
    heart: [
        "01100110",
        "11111111",
        "11111111",
        "11111111",
        "01111110",
        "00111100",
        "00011000",
        "00000000"
    ],
    sparkle: [
        "00010000",
        "00010000",
        "01010100",
        "00111000",
        "11111110",
        "00111000",
        "01010100",
        "00010000"
    ],
    diamond: [
        "00010000",
        "00111000",
        "01111100",
        "11111110",
        "01111100",
        "00111000",
        "00010000",
        "00000000"
    ],
    box: [
        "11111111",
        "10000001",
        "10111101",
        "10100101",
        "10100101",
        "10111101",
        "10000001",
        "11111111"
    ],
    bolt: [
        "00011100",
        "00111000",
        "01110000",
        "11111100",
        "00011100",
        "00111000",
        "01110000",
        "01000000"
    ],
    check: [
        "00000000",
        "00000010",
        "00000110",
        "10001100",
        "11011000",
        "01110000",
        "00100000",
        "00000000"
    ],
    chat: [
        "01111110",
        "10000001",
        "10100101",
        "10000001",
        "10111101",
        "10000001",
        "01111110",
        "00001100"
    ],
    ring: [
        "00111100",
        "01100110",
        "11000011",
        "11000011",
        "11000011",
        "11000011",
        "01100110",
        "00111100"
    ]
};
const PIXEL_LOADER_SEQUENCES = [
    ["dots", "arrow", "heart", "sparkle", "diamond", "dots"],
    ["ring", "heart", "check", "sparkle", "arrow", "ring"],
    ["box", "sparkle", "bolt", "heart", "check", "box"],
    ["dots", "diamond", "chat", "heart", "arrow", "dots"],
    ["sparkle", "bolt", "arrow", "check", "heart", "sparkle"],
    ["ring", "box", "diamond", "heart", "sparkle", "ring"]
];
const PIXEL_LOADER_GRID_SIZE = 8;
const PIXEL_LOADER_PIXEL_SIZE = 2;
const PIXEL_LOADER_PARTICLE_COUNT = PIXEL_LOADER_GRID_SIZE * PIXEL_LOADER_GRID_SIZE;
const PIXEL_LOADER_MOTIONS = ["shuffle", "hop", "orbit", "scatter", "drift"];
let lastPixelLoaderSequenceIndex = -1;
let lastPixelLoaderMotionIndex = -1;

function getPixelLoaderKind(kind = "thinking", label = "") {
    const normalizedKind = String(kind || "").toLowerCase();
    const normalizedLabel = String(label || "").toLowerCase();
    if (/image|picture|preview|rendering image|edit/.test(normalizedKind) || /\bimage|picture|preview|rendering image|edit\b/.test(normalizedLabel)) return "image";
    if (/video|clip|wan/.test(normalizedKind) || /\bvideo|clip|wan|frames|encoding\b/.test(normalizedLabel)) return "video";
    if (/web|search|google|bing|duck/.test(normalizedKind) || /\bweb|search|google|bing|duck\b/.test(normalizedLabel)) return "web";
    if (/location|weather/.test(normalizedKind) || /\blocation|weather|temperature\b/.test(normalizedLabel)) return "location";
    if (/timer|wait|sleep/.test(normalizedKind) || /\btimer|wait|sleep\b/.test(normalizedLabel)) return "timer";
    if (/memory/.test(normalizedKind) || /\bmemor/.test(normalizedLabel)) return "memory";
    if (/terminal|command|shell/.test(normalizedKind) || /\bterminal|command|shell|powershell\b/.test(normalizedLabel)) return "terminal";
    if (/workspace|file|folder|local/.test(normalizedKind) || /\bworkspace|file|folder|local\b/.test(normalizedLabel)) return "workspace";
    return PIXEL_LOADER_KINDS.has(normalizedKind) ? normalizedKind : "thinking";
}

function getRandomPixelLoaderSequence() {
    if (PIXEL_LOADER_SEQUENCES.length <= 1) return PIXEL_LOADER_SEQUENCES[0];
    let nextIndex = Math.floor(Math.random() * PIXEL_LOADER_SEQUENCES.length);
    if (nextIndex === lastPixelLoaderSequenceIndex) {
        nextIndex = (nextIndex + 1) % PIXEL_LOADER_SEQUENCES.length;
    }
    lastPixelLoaderSequenceIndex = nextIndex;
    return PIXEL_LOADER_SEQUENCES[nextIndex];
}

function getRandomPixelLoaderMotion() {
    if (PIXEL_LOADER_MOTIONS.length <= 1) return PIXEL_LOADER_MOTIONS[0];
    let nextIndex = Math.floor(Math.random() * PIXEL_LOADER_MOTIONS.length);
    if (nextIndex === lastPixelLoaderMotionIndex) {
        nextIndex = (nextIndex + 1) % PIXEL_LOADER_MOTIONS.length;
    }
    lastPixelLoaderMotionIndex = nextIndex;
    return PIXEL_LOADER_MOTIONS[nextIndex];
}

function getPixelSpritePoints(spriteName) {
    const sprite = PIXEL_LOADER_SPRITES[spriteName] || PIXEL_LOADER_SPRITES.dots;
    const points = [];
    sprite.forEach((row, y) => {
        row.split("").forEach((cell, x) => {
            if (cell === "1") points.push({ x, y });
        });
    });
    return points;
}

function clampPixelLoaderCoordinate(value) {
    const max = (PIXEL_LOADER_GRID_SIZE - 1) * PIXEL_LOADER_PIXEL_SIZE;
    const snapped = Math.round(value / PIXEL_LOADER_PIXEL_SIZE) * PIXEL_LOADER_PIXEL_SIZE;
    return Math.max(0, Math.min(max, snapped));
}

function getPixelLoaderNoise(seed, particleIndex, frameIndex, salt, range) {
    const value = Math.sin((seed + 1) * 17.17 + (particleIndex + 3) * 31.31 + (frameIndex + 5) * 13.13 + salt * 7.07);
    return Math.round(value * range);
}

function getPixelParticleTarget(points, particleIndex, frameIndex, seed) {
    if (!points.length) {
        return { x: 3, y: 3, opacity: "0" };
    }
    const pointIndex = (particleIndex + seed + frameIndex * 7) % points.length;
    const point = points[pointIndex] || points[0];
    return {
        x: point.x,
        y: point.y,
        opacity: particleIndex < points.length ? "0.95" : "0"
    };
}

function getPixelParticleTransitionOpacity(from, to, particleIndex, frameIndex, seed) {
    const fromVisible = from.opacity !== "0";
    const toVisible = to.opacity !== "0";
    if (fromVisible && toVisible) return "0.95";
    if (fromVisible || toVisible) return "0.68";
    return (particleIndex + frameIndex + seed) % 17 === 0 ? "0.22" : "0";
}

function getPixelParticleTransitionTarget(from, to, particleIndex, frameIndex, seed, motionKind) {
    const fromX = from.x * PIXEL_LOADER_PIXEL_SIZE;
    const fromY = from.y * PIXEL_LOADER_PIXEL_SIZE;
    const toX = to.x * PIXEL_LOADER_PIXEL_SIZE;
    const toY = to.y * PIXEL_LOADER_PIXEL_SIZE;
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const direction = (particleIndex + seed + frameIndex) % 2 === 0 ? 1 : -1;
    const perpendicularX = Math.sign(toY - fromY || getPixelLoaderNoise(seed, particleIndex, frameIndex, 11, 1) || 1);
    const perpendicularY = Math.sign(fromX - toX || getPixelLoaderNoise(seed, particleIndex, frameIndex, 13, 1) || -1);
    let offsetX = 0;
    let offsetY = 0;

    if (motionKind === "hop") {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 2, 1);
        offsetY = -2 - Math.abs(getPixelLoaderNoise(seed, particleIndex, frameIndex, 3, 2));
    } else if (motionKind === "orbit") {
        offsetX = perpendicularX * direction * (2 + Math.abs(getPixelLoaderNoise(seed, particleIndex, frameIndex, 4, 2)));
        offsetY = perpendicularY * direction * (2 + Math.abs(getPixelLoaderNoise(seed, particleIndex, frameIndex, 5, 2)));
    } else if (motionKind === "scatter") {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 6, 4);
        offsetY = getPixelLoaderNoise(seed, particleIndex, frameIndex, 7, 4);
    } else if (motionKind === "drift") {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 8, 2);
        offsetY = getPixelLoaderNoise(seed, particleIndex, frameIndex, 9, 2);
    } else {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 10, 3);
        offsetY = getPixelLoaderNoise(seed, particleIndex, frameIndex, 12, 3);
    }

    return {
        x: clampPixelLoaderCoordinate(midX + offsetX),
        y: clampPixelLoaderCoordinate(midY + offsetY),
        opacity: getPixelParticleTransitionOpacity(from, to, particleIndex, frameIndex, seed)
    };
}

function getPixelParticleFrameStyle(frameIndex, target) {
    const x = target.x * PIXEL_LOADER_PIXEL_SIZE;
    const y = target.y * PIXEL_LOADER_PIXEL_SIZE;
    return [
        `--tx${frameIndex}:${x}px`,
        `--ty${frameIndex}:${y}px`,
        `--a${frameIndex}:${target.opacity}`
    ];
}

function getPixelParticleTransitionStyle(frameIndex, target) {
    return [
        `--mx${frameIndex}:${target.x}px`,
        `--my${frameIndex}:${target.y}px`,
        `--ma${frameIndex}:${target.opacity}`
    ];
}

function renderPixelLoader(kind = "thinking", label = "Working") {
    const animationKind = getPixelLoaderKind(kind, label);
    const sequence = getRandomPixelLoaderSequence();
    const motionKind = getRandomPixelLoaderMotion();
    const spritePoints = sequence.map(spriteName => getPixelSpritePoints(spriteName));
    const seed = Math.floor(Math.random() * PIXEL_LOADER_PARTICLE_COUNT);
    const durationMs = 2500 + Math.floor(Math.random() * 700);
    const cells = Array.from({ length: PIXEL_LOADER_PARTICLE_COUNT }, (_, index) => {
        const frameTargets = spritePoints.map((points, frameIndex) =>
            getPixelParticleTarget(points, index, frameIndex, seed)
        );
        const transitionTargets = frameTargets.map((target, frameIndex) =>
            getPixelParticleTransitionTarget(
                target,
                frameTargets[(frameIndex + 1) % frameTargets.length],
                index,
                frameIndex,
                seed,
                motionKind
            )
        );
        const style = [
            `--i:${index}`,
            ...frameTargets.flatMap((target, frameIndex) => getPixelParticleFrameStyle(frameIndex, target)),
            ...transitionTargets.flatMap((target, frameIndex) => getPixelParticleTransitionStyle(frameIndex + 1, target))
        ].join(";");
        return `<span class="pixel-loader-cell" style="${style};"></span>`;
    }).join("");
    const sequenceName = sequence.join("-");

    return `<span class="pixel-loader pixel-loader-${animationKind} pixel-loader-motion-${motionKind}" data-pixel-kind="${animationKind}" data-pixel-animation="${sequenceName}" data-pixel-motion="${motionKind}" data-pixel-seed="${seed}" style="--pixel-duration:${durationMs}ms;" aria-hidden="true">${cells}</span>`;
}

function normalizeToolActivityItems(items = []) {
    return (Array.isArray(items) ? items : [])
        .map(item => ({
            id: String(item?.id || "").trim(),
            kind: String(item?.kind || "tool").trim().toLowerCase() || "tool",
            label: String(item?.label || "Tool").trim(),
            tool: String(item?.tool || item?.toolName || "").trim(),
            detail: String(item?.detail || "").trim(),
            meta: String(item?.meta || "").trim(),
            input: String(item?.input || item?.prompt || "").trim(),
            settings: String(item?.settings || "").trim(),
            query: String(item?.query || "").trim(),
            resultCount: Number.isFinite(Number(item?.resultCount)) ? Number(item.resultCount) : null,
            error: String(item?.error || "").trim(),
            sources: Array.isArray(item?.sources)
                ? item.sources.slice(0, 8).map(source => ({
                    title: String(source?.title || source?.url || "Result").trim(),
                    url: String(source?.url || "").trim(),
                    snippet: String(source?.snippet || "").replace(/\s+/g, " ").trim()
                })).filter(source => source.title || source.url || source.snippet)
                : []
        }))
        .filter(item => item.label || item.tool || item.detail || item.meta || item.input || item.settings || item.query || item.sources.length);
}

function getToolActivityCountLabel(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function lowerFirst(value) {
    const text = String(value || "");
    return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
}

function getToolActivitySummary(items, fallbackTitle = "Thinking about") {
    const counts = {
        terminal: 0,
        file: 0,
        workspace: 0,
        web: 0,
        image: 0,
        location: 0,
        timer: 0,
        memory: 0,
        tool: 0
    };

    items.forEach(item => {
        if (item.kind === "terminal") counts.terminal += 1;
        else if (item.kind === "file") counts.file += 1;
        else if (item.kind === "workspace") counts.workspace += 1;
        else if (item.kind === "web") counts.web += 1;
        else if (item.kind === "image") counts.image += 1;
        else if (item.kind === "location") counts.location += 1;
        else if (item.kind === "timer") counts.timer += 1;
        else if (item.kind === "memory") counts.memory += 1;
        else counts.tool += 1;
    });

    const parts = [];
    if (counts.terminal) parts.push(`Ran ${getToolActivityCountLabel(counts.terminal, "command")}`);
    if (counts.file) parts.push(`Viewed ${getToolActivityCountLabel(counts.file, "file")}`);
    if (counts.workspace) parts.push(`Inspected ${getToolActivityCountLabel(counts.workspace, "workspace item")}`);
    if (counts.web) parts.push(`Searched ${getToolActivityCountLabel(counts.web, "source")}`);
    if (counts.image) parts.push(`Uploaded ${getToolActivityCountLabel(counts.image, "image")}`);
    if (counts.location) parts.push(`Checked ${getToolActivityCountLabel(counts.location, "location")}`);
    if (counts.timer) parts.push(`Waited on ${getToolActivityCountLabel(counts.timer, "timer")}`);
    if (counts.memory) parts.push(`Checked ${getToolActivityCountLabel(counts.memory, "memory", "memories")}`);
    if (counts.tool) parts.push(`Used ${getToolActivityCountLabel(counts.tool, "tool")}`);

    if (!parts.length) return fallbackTitle || "Working";
    return parts.map((part, index) => index === 0 ? part : lowerFirst(part)).join(", ");
}

function getToolActivityExtensionLabel(detail = "") {
    const extension = String(detail || "").match(/\.([a-z0-9]+)(?:$|[\s?#])/i)?.[1]?.toLowerCase();
    const labels = {
        html: "HTML",
        css: "CSS",
        js: "Script",
        mjs: "Script",
        cjs: "Script",
        ts: "TS",
        jsx: "JSX",
        tsx: "TSX",
        json: "JSON",
        md: "Markdown",
        py: "Python",
        ps1: "PowerShell",
        sh: "Shell"
    };
    return labels[extension] || "File";
}

function getToolActivityTag(item) {
    if (item.kind === "terminal") return "Script";
    if (item.kind === "file") return getToolActivityExtensionLabel(item.detail || item.label);
    if (item.kind === "workspace") return "Workspace";
    if (item.kind === "web") return "Web";
    if (item.kind === "location") return "Location";
    if (item.kind === "timer") return "Timer";
    if (item.kind === "memory") return "Memory";
    if (item.kind === "image") return "Image";
    return item.label || "Tool";
}

function getImageActivitySettings(options = {}) {
    const parts = [];
    const style = String(options.style || "").trim();
    const quality = String(options.quality || "").trim();
    const aspectRatio = String(options.aspectRatio || options.aspect_ratio || "").trim();
    const format = String(options.format || "").trim();
    const width = Number(options.width);
    const height = Number(options.height);

    if (style) parts.push(style);
    if (quality) parts.push(`${quality} quality`);
    if (aspectRatio) parts.push(aspectRatio);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        parts.push(`${width}x${height}`);
    }
    if (format) parts.push(format.toUpperCase());

    return parts.join(", ");
}

function getToolActivityRowTitle(item) {
    if (item.kind === "web") return item.label || "Searched the web";
    return item.detail || item.label || "Tool";
}

function formatToolActivityToolName(value, fallback = "Tool call") {
    const text = String(value || fallback || "Tool call")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "Tool call";
    return text.replace(/\b[a-z]/g, match => match.toUpperCase());
}

function renderToolActivityDetailField(label, value, { code = false } = {}) {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return "";
    const valueMarkup = code
        ? `<code class="tool-activity-query">${escapeHtml(cleanValue)}</code>`
        : `<span class="tool-activity-detail-value">${escapeHtml(cleanValue)}</span>`;

    return `
        <div class="tool-activity-detail-field">
            <span class="tool-activity-detail-label">${escapeHtml(label)}</span>
            ${valueMarkup}
        </div>
    `;
}

function renderToolActivityDetails(item) {
    const toolLabel = formatToolActivityToolName(item.tool, getToolActivityTag(item));
    const input = item.input || (item.kind !== "web" ? item.query : "");
    const fields = [
        renderToolActivityDetailField("Tool", toolLabel),
        renderToolActivityDetailField("Status", item.meta),
        renderToolActivityDetailField("Input", input, {
            code: item.kind === "terminal" || item.kind === "file" || item.kind === "workspace"
        }),
        renderToolActivityDetailField("Settings", item.settings),
        item.kind !== "web"
            ? renderToolActivityDetailField("Detail", item.detail, {
                code: item.kind === "terminal" || item.kind === "file" || item.kind === "workspace"
            })
            : "",
        item.resultCount !== null ? renderToolActivityDetailField("Count", `${item.resultCount} result${item.resultCount === 1 ? "" : "s"}`) : "",
        renderToolActivityDetailField("Error", item.error)
    ].filter(Boolean).join("");

    if (item.kind !== "web") {
        return `
            <div class="tool-activity-details">
                ${fields || `<p class="tool-activity-detail-empty">No additional tool details were returned.</p>`}
            </div>
        `;
    }

    const query = item.query || item.detail || "";
    const sources = item.sources || [];
    const sourceRows = sources.map((source, index) => {
        const label = source.title || source.url || `Result ${index + 1}`;
        const host = getSourceHost(source.url);
        const title = source.url
            ? `<a class="tool-activity-result-title" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
            : `<span class="tool-activity-result-title">${escapeHtml(label)}</span>`;
        return `
            <li class="tool-activity-result">
                <div class="tool-activity-result-head">
                    <span class="tool-activity-result-index">${index + 1}</span>
                    <div class="tool-activity-result-copy">
                        ${title}
                        ${host ? `<span class="tool-activity-result-host">${escapeHtml(host)}</span>` : ""}
                    </div>
                </div>
                ${source.snippet ? `<p class="tool-activity-result-snippet">${escapeHtml(source.snippet)}</p>` : ""}
            </li>
        `;
    }).join("");
    const emptyText = item.error
        ? `Search failed: ${item.error}`
        : "No result details were returned.";

    return `
        <div class="tool-activity-details">
            ${fields}
            ${query ? renderToolActivityDetailField("Query", query, { code: true }) : ""}
            <div class="tool-activity-detail-field">
                <span class="tool-activity-detail-label">Returned</span>
                ${sourceRows ? `<ol class="tool-activity-results">${sourceRows}</ol>` : `<p class="tool-activity-detail-empty">${escapeHtml(emptyText)}</p>`}
            </div>
        </div>
    `;
}

function getToolActivityItemId(item, index, panelId) {
    return item.id || `${panelId || "tool-activity"}-item-${index}`;
}

function renderToolActivityRow(item, index, extraClass = "", {
    showDetails = true,
    isOpen = false,
    panelId = "",
    preview = false
} = {}) {
    const title = getToolActivityRowTitle(item);
    const tag = getToolActivityTag(item);
    const itemId = getToolActivityItemId(item, index, panelId);
    const detailsId = `${itemId}-details`;
    const badges = [
        tag ? `<span class="tool-activity-tag">${escapeHtml(tag)}</span>` : "",
        item.meta ? `<span class="tool-activity-meta">${escapeHtml(item.meta)}</span>` : ""
    ].filter(Boolean).join("");
    const details = showDetails ? renderToolActivityDetails(item) : "";
    const expanded = Boolean(details && isOpen && !preview);
    const controls = preview ? panelId : detailsId;
    const ariaLabel = `${expanded ? "Hide" : "Show"} details for ${title}`;

    return `
        <div class="tool-activity-row-wrap ${expanded ? "expanded" : ""} ${preview ? "tool-activity-row-wrap-preview" : ""}" data-tool-activity-item-id="${escapeAttribute(itemId)}">
            <button class="tool-activity-row ${extraClass}" type="button" data-tool-activity-row-toggle data-tool-activity-item-id="${escapeAttribute(itemId)}" data-tool-kind="${escapeAttribute(item.kind)}" aria-expanded="${expanded ? "true" : "false"}" ${controls ? `aria-controls="${escapeAttribute(controls)}"` : ""} aria-label="${escapeAttribute(ariaLabel)}">
                <span class="tool-activity-icon-wrap" aria-hidden="true">
                    <svg class="tool-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${getToolActivityIcon(item.kind)}</svg>
                </span>
                <span class="tool-activity-row-body">
                    <span class="tool-activity-label">${escapeHtml(title)}</span>
                    ${badges ? `<span class="tool-activity-badges">${badges}</span>` : ""}
                </span>
                <span class="tool-activity-row-chevron" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m9 6 6 6-6 6"></path>
                    </svg>
                </span>
            </button>
            ${details ? `<div id="${escapeAttribute(detailsId)}" class="tool-activity-detail-panel" ${expanded ? "" : "hidden"}>${details}</div>` : ""}
        </div>
    `;
}

function renderToolActivityDoneRow() {
    return `
        <div class="tool-activity-row tool-activity-row-done">
            <span class="tool-activity-icon-wrap" aria-hidden="true">
                <svg class="tool-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${getToolActivityIcon("done")}</svg>
            </span>
            <div class="tool-activity-row-body">
                <div class="tool-activity-label">Done</div>
            </div>
        </div>
    `;
}

function renderToolActivity(container, options = {}) {
    if (!container) return;
    const previousState = container._faunaToolActivityState || {};
    const title = options.title || previousState.title || "Thinking about";
    const summaryOverride = Object.prototype.hasOwnProperty.call(options, "summary")
        ? String(options.summary || "").trim()
        : String(previousState.summary || "").trim();
    const items = normalizeToolActivityItems(Object.prototype.hasOwnProperty.call(options, "items") ? options.items : previousState.items);
    const status = options.status || previousState.status || "running";
    const isRunning = status !== "done" && status !== "error";
    const collapsed = typeof options.collapsed === "boolean"
        ? options.collapsed
        : previousState.collapsed !== undefined
            ? previousState.collapsed
            : true;
    const panelId = previousState.panelId || `tool-activity-panel-${++toolActivityPanelIdCounter}`;
    const hasResponseHtml = Object.prototype.hasOwnProperty.call(options, "responseHtml");
    const responseHtml = hasResponseHtml ? String(options.responseHtml || "") : String(previousState.responseHtml || "");
    const responseBusy = Object.prototype.hasOwnProperty.call(options, "responseBusy")
        ? Boolean(options.responseBusy)
        : Boolean(previousState.responseBusy);
    const openItemIds = new Set(Array.isArray(options.openItemIds)
        ? options.openItemIds
        : Array.isArray(previousState.openItemIds)
            ? previousState.openItemIds
            : []);

    container.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    container.classList.add("tool-activity-bubble");
    if (isRunning) {
        container.setAttribute("aria-busy", "true");
    } else {
        container.removeAttribute("aria-busy");
    }

    const summary = summaryOverride || getToolActivitySummary(items, title);
    const previewItems = isRunning && collapsed ? items.slice(-2) : [];
    const previewStartIndex = Math.max(0, items.length - previewItems.length);
    const previewRows = previewItems
        .map((item, previewIndex) => renderToolActivityRow(item, previewStartIndex + previewIndex, "tool-activity-row-preview", {
            showDetails: false,
            panelId,
            preview: true
        }))
        .join("");
    const rows = [
        ...items.map((item, index) => {
            const itemId = getToolActivityItemId(item, index, panelId);
            return renderToolActivityRow(item, index, "", {
                isOpen: openItemIds.has(itemId),
                panelId
            });
        }),
        !isRunning ? renderToolActivityDoneRow() : ""
    ].filter(Boolean).join("") || `<div class="tool-activity-empty">Preparing tools...</div>`;

    container._faunaToolActivityState = {
        title,
        items,
        status,
        collapsed,
        panelId,
        openItemIds: Array.from(openItemIds),
        summary: summaryOverride,
        responseHtml,
        responseBusy
    };

    container.innerHTML = `
        <div class="tool-activity-card ${collapsed ? "collapsed" : "expanded"} ${isRunning ? "running" : "done"}">
            <button class="tool-activity-toggle" type="button" data-tool-activity-toggle aria-expanded="${collapsed ? "false" : "true"}" aria-controls="${panelId}">
                <svg class="tool-activity-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m9 6 6 6-6 6"></path>
                </svg>
                <span>${escapeHtml(summary)}</span>
            </button>
            ${previewRows ? `<div class="tool-activity-live-preview ${previewItems.length > 1 ? "has-multiple" : "has-single"}" aria-label="Recent tool activity">${previewRows}</div>` : ""}
            <div id="${panelId}" class="tool-activity-list ${items.length > 1 || !isRunning ? "has-multiple" : "has-single"}" ${collapsed ? "hidden" : ""}>
                ${rows || `<div class="tool-activity-empty">Preparing tools...</div>`}
            </div>
        </div>
        ${responseHtml ? `<div class="tool-activity-response ${responseBusy ? "typewriter-active" : ""}">${responseHtml}</div>` : ""}
    `;
    scrollChatToBottom();
}

function createSiblingBubble(anchorBubble) {
    const block = anchorBubble?.parentElement;
    if (!(block instanceof HTMLElement)) return null;

    const bubble = document.createElement("div");
    bubble.className = "bubble markdown";
    block.appendChild(bubble);
    return bubble;
}

function createToolActivityBubble(anchorBubble) {
    return createSiblingBubble(anchorBubble);
}

function createImageGenerationToolActivity(anchorBubble, {
    title = "Generating image",
    detail = "Generate image",
    meta = "Preparing",
    prompt = "",
    options = {},
    toolName = "generate_image"
} = {}) {
    const bubble = createToolActivityBubble(anchorBubble);
    const item = {
        kind: "image",
        label: "Image generation",
        tool: toolName,
        detail,
        meta,
        input: prompt,
        settings: getImageActivitySettings(options)
    };

    renderToolActivity(bubble, {
        title,
        summary: title,
        items: [item],
        collapsed: true
    });

    return { bubble, item, title };
}

function updateImageGenerationToolActivity(activity, meta, status = "running") {
    if (!activity?.bubble || !activity.item) return;

    activity.item.meta = meta;
    renderToolActivity(activity.bubble, {
        title: activity.title,
        summary: activity.title,
        items: [activity.item],
        status,
        collapsed: true
    });
}

function moveToolActivityBeforeBubble(activity, targetBubble) {
    const toolBubble = activity?.bubble;
    const block = targetBubble?.parentElement;
    if (!(toolBubble instanceof HTMLElement) || !(targetBubble instanceof HTMLElement) || toolBubble === targetBubble) return;
    if (toolBubble.parentElement !== block) return;

    block.insertBefore(toolBubble, targetBubble);
}

function renderAssistantContentHtml(target, html, { final = false, busy = false, typewriter = !final } = {}) {
    if (!target) return;

    if (target._faunaToolActivityState) {
        renderToolActivity(target, {
            ...target._faunaToolActivityState,
            status: final ? "done" : "running",
            responseHtml: html,
            responseBusy: busy && typewriter
        });
        return;
    }

    target.classList.remove("tool-activity-bubble", "creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    if (final) {
        target.classList.remove("typewriter-active");
        target.removeAttribute("aria-busy");
    } else {
        target.classList.toggle("typewriter-active", Boolean(typewriter));
        if (busy) {
            target.setAttribute("aria-busy", "true");
        } else {
            target.removeAttribute("aria-busy");
        }
    }
    target.innerHTML = html;
    scrollChatToBottom();
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
        zsh: "Zsh",
        fish: "Fish",
        ps1: "PowerShell",
        powershell: "PowerShell",
        pwsh: "PowerShell",
        cmd: "Command Prompt",
        bat: "Batch",
        batch: "Batch",
        terminal: "Terminal",
        console: "Terminal",
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
    const travelSpan = columns + rows * 0.8;
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
        const pathProgress = (column + row * 0.8) / travelSpan;
        const delay = (pathProgress * -4.6).toFixed(3);
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
    const pixelKind = getPixelLoaderKind(kind, `${title} ${status}`);
    const isImageProgress = pixelKind === "image";
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
    container.classList.toggle("creation-progress-bubble-image", isImageProgress);

    if (isImageProgress) {
        container.innerHTML = `
            <div class="creation-progress-card creation-progress-card-image" data-progress-kind="${kind}">
                <div class="creation-progress-image-head">
                    <div class="creation-progress-title">${escapeHtml(title)}</div>
                    <div class="creation-progress-status visually-hidden" data-creation-status>${escapeHtml(status)}</div>
                </div>
                <div class="creation-field-stage" aria-hidden="true">
                    <span class="creation-field-glow"></span>
                    <span class="creation-field-sweep"></span>
                    <div class="creation-dot-field">${renderCreationDotField(15, 11)}</div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="creation-progress-card" data-progress-kind="${kind}">
            ${renderPixelLoader(pixelKind, title)}
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

function normalizeTokenCount(value) {
    if (value === null || value === undefined || value === "") return null;
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return null;
    return Math.round(count);
}

function firstTokenCount(...values) {
    for (const value of values) {
        const count = normalizeTokenCount(value);
        if (count !== null) return count;
    }
    return null;
}

function normalizeTokenUsage(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" || typeof value === "string") {
        const total = normalizeTokenCount(value);
        return total === null ? null : { total, source: TOKEN_USAGE_SOURCE_PROVIDER };
    }

    if (typeof value !== "object") return null;
    const input = firstTokenCount(value.input, value.inputTokens, value.input_tokens, value.prompt, value.promptTokens, value.prompt_tokens);
    const output = firstTokenCount(value.output, value.outputTokens, value.output_tokens, value.completion, value.completionTokens, value.completion_tokens);
    const total = firstTokenCount(
        value.total,
        value.totalTokens,
        value.total_tokens,
        input !== null || output !== null ? (input || 0) + (output || 0) : null
    );
    if (total === null) return null;

    return {
        total,
        ...(input !== null ? { input } : {}),
        ...(output !== null ? { output } : {}),
        ...(value.eventId || value.usageEventId ? { eventId: String(value.eventId || value.usageEventId) } : {}),
        source: value.source || TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function getProviderTokenUsage(data) {
    const usage = data?.usage || {};
    const openAiInput = firstTokenCount(usage.input_tokens, usage.prompt_tokens);
    const openAiOutput = firstTokenCount(usage.output_tokens, usage.completion_tokens);
    const ollamaInput = firstTokenCount(data?.prompt_eval_count);
    const ollamaOutput = firstTokenCount(data?.eval_count);
    const input = firstTokenCount(openAiInput, ollamaInput);
    const output = firstTokenCount(openAiOutput, ollamaOutput);
    const total = firstTokenCount(
        usage.total_tokens,
        input !== null || output !== null ? (input || 0) + (output || 0) : null
    );

    if (total === null) return null;
    return {
        total,
        ...(input !== null ? { input } : {}),
        ...(output !== null ? { output } : {}),
        source: TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function attachTokenUsage(message, usage) {
    const normalized = normalizeTokenUsage(usage);
    if (message && normalized) {
        message.tokenUsage = normalized;
    }
    return message;
}

function sumHistoryTokenUsage(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, message) => total + (normalizeTokenUsage(message?.tokenUsage)?.total || 0), 0);
}

function createUsageEventId() {
    return window.crypto?.randomUUID?.() || `usage-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUsageEventModel(metadata = {}) {
    return String(metadata.model || metadata.message?.model || getCurrentModelLabel() || "").trim();
}

function getUsageEventReasoning(metadata = {}) {
    return String(metadata.reasoning || metadata.message?.reasoning || getReasoningLabelForMessage(getUsageEventModel(metadata)) || "").trim();
}

function normalizeUsageEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const usage = normalizeTokenUsage(raw);
    if (!usage?.total) return null;
    const date = parseStoredDate(raw.date, raw.createdAt) || new Date();
    const id = String(raw.id || raw.eventId || usage.eventId || createUsageEventId()).trim();
    return {
        id,
        date: date.toISOString(),
        total: usage.total,
        ...(usage.input !== undefined ? { input: usage.input } : {}),
        ...(usage.output !== undefined ? { output: usage.output } : {}),
        source: usage.source || TOKEN_USAGE_SOURCE_PROVIDER,
        model: String(raw.model || "").trim(),
        reasoning: String(raw.reasoning || "").trim(),
        provider: String(raw.provider || "").trim(),
        sessionId: String(raw.sessionId || "").trim()
    };
}

function readStoredUsageEvents() {
    const raw = safeLocalStorageGet(USAGE_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeUsageEvent)
            .filter(event => {
                if (!event || seen.has(event.id)) return false;
                seen.add(event.id);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse saved Fauna usage events:", err);
        return [];
    }
}

function persistUsageEvents() {
    safeLocalStorageSet(USAGE_EVENTS_STORAGE_KEY, JSON.stringify(usageEvents));
}

function upsertUsageEvent(rawEvent, { persist = true } = {}) {
    const event = normalizeUsageEvent(rawEvent);
    if (!event) return null;
    const existingIndex = usageEvents.findIndex(item => item.id === event.id);
    if (existingIndex >= 0) {
        usageEvents[existingIndex] = {
            ...usageEvents[existingIndex],
            ...event,
            model: event.model || usageEvents[existingIndex].model,
            reasoning: event.reasoning || usageEvents[existingIndex].reasoning,
            provider: event.provider || usageEvents[existingIndex].provider,
            sessionId: event.sessionId || usageEvents[existingIndex].sessionId
        };
    } else {
        usageEvents.push(event);
    }
    if (persist) persistUsageEvents();
    return event;
}

function normalizeUsageToolEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const label = String(raw.label || raw.name || raw.tool || "").trim();
    if (!label) return null;
    const date = parseStoredDate(raw.date, raw.createdAt) || new Date();
    const id = String(raw.id || raw.eventId || `tool-${Date.now()}-${Math.random().toString(16).slice(2)}`).trim();
    return {
        id,
        date: date.toISOString(),
        label,
        kind: String(raw.kind || "tool").trim() || "tool",
        sessionId: String(raw.sessionId || "").trim()
    };
}

function readStoredUsageToolEvents() {
    const raw = safeLocalStorageGet(USAGE_TOOL_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeUsageToolEvent)
            .filter(event => {
                if (!event || seen.has(event.id)) return false;
                seen.add(event.id);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse saved Fauna tool usage events:", err);
        return [];
    }
}

function persistUsageToolEvents() {
    safeLocalStorageSet(USAGE_TOOL_EVENTS_STORAGE_KEY, JSON.stringify(usageToolEvents));
}

function upsertUsageToolEvent(rawEvent, { persist = true } = {}) {
    const event = normalizeUsageToolEvent(rawEvent);
    if (!event) return null;
    const existingIndex = usageToolEvents.findIndex(item => item.id === event.id);
    if (existingIndex >= 0) {
        usageToolEvents[existingIndex] = {
            ...usageToolEvents[existingIndex],
            ...event,
            sessionId: event.sessionId || usageToolEvents[existingIndex].sessionId
        };
    } else {
        usageToolEvents.push(event);
    }
    if (persist) persistUsageToolEvents();
    return event;
}

function recordTokenUsageEvent(usage, metadata = {}) {
    const normalized = normalizeTokenUsage(usage);
    if (!normalized?.total) return null;
    const message = metadata.message || null;
    const eventId = normalized.eventId || message?.tokenUsage?.eventId || metadata.eventId || createUsageEventId();
    const usageWithEvent = { ...normalized, eventId };
    if (message) message.tokenUsage = usageWithEvent;
    const event = upsertUsageEvent({
        ...usageWithEvent,
        id: eventId,
        date: metadata.date || message?.createdAt || new Date().toISOString(),
        model: getUsageEventModel(metadata),
        reasoning: getUsageEventReasoning(metadata),
        provider: metadata.provider || message?.provider || getCurrentProviderLabel(),
        sessionId: metadata.sessionId || activeSessionId || ""
    });
    refreshUsageSettingsPaneIfVisible();
    return event;
}

function migrateUsageEventsFromSessions() {
    let changed = false;
    let toolEventsChanged = false;
    chatSessions.forEach(session => {
        const sessionDate = parseStoredDate(session.updatedAt, session.createdAt) || new Date();
        let messageTotal = 0;
        (session.conversationHistory || []).forEach((message, index) => {
            const usage = normalizeTokenUsage(message.tokenUsage);
            if (!usage?.total) return;
            messageTotal += usage.total;
            const eventId = usage.eventId || `chat:${session.id}:${index}:${message.createdAt || session.updatedAt || session.createdAt || ""}:${usage.total}`;
            if (!usage.eventId) {
                message.tokenUsage = { ...usage, eventId };
                changed = true;
            }
            const event = upsertUsageEvent({
                ...message.tokenUsage,
                id: eventId,
                date: message.createdAt || sessionDate.toISOString(),
                model: message.model,
                reasoning: message.reasoning,
                provider: message.provider,
                sessionId: session.id
            }, { persist: false });
            if (event) changed = true;
        });

        const sessionTotal = getSessionTokenTotal(session);
        if (sessionTotal > messageTotal) {
            const delta = sessionTotal - messageTotal;
            const event = upsertUsageEvent({
                id: `chat-total:${session.id}:${session.updatedAt || session.createdAt || ""}:${delta}`,
                date: sessionDate.toISOString(),
                total: delta,
                source: TOKEN_USAGE_SOURCE_PROVIDER,
                sessionId: session.id
            }, { persist: false });
            if (event) changed = true;
        }

        if (syncUsageToolEventsFromSession(session, { persist: false }) > 0) {
            toolEventsChanged = true;
        }
    });
    if (changed) persistUsageEvents();
    if (toolEventsChanged) persistUsageToolEvents();
}

function initializeUsageEvents() {
    usageEvents = readStoredUsageEvents();
    usageToolEvents = readStoredUsageToolEvents();
    migrateUsageEventsFromSessions();
}

function addSessionTokens(usage, metadata = {}) {
    const normalized = normalizeTokenUsage(usage);
    if (!normalized) {
        updateTokenDisplay();
        return 0;
    }
    const event = recordTokenUsageEvent(normalized, metadata);
    const trackedUsage = event ? { ...normalized, eventId: event.id } : normalized;
    if (metadata.message && trackedUsage.eventId) {
        metadata.message.tokenUsage = trackedUsage;
    }
    sessionTotalTokens += normalized.total;
    updateTokenDisplay();
    return normalized.total;
}

function isImageAttachment(file) {
    return Boolean(file?.type?.startsWith("image/"));
}

function getComposerTokenModel(text = input?.value || "", files = attachedFiles) {
    if (isOpenAiProvider()) return getOpenAiChatModel();
    try {
        const trimmed = String(text || "").trim();
        return chooseModelForRequest(
            trimmed,
            files,
            getImageCommandPrompt(trimmed),
            getVideoCommandPrompt(trimmed)
        ) || OLLAMA_MODEL;
    } catch {
        return OLLAMA_MODEL;
    }
}

function getComposerTokenSignature() {
    const text = input?.value || "";
    const files = attachedFiles.map(file => [
        file.name || "",
        file.size || 0,
        file.type || "",
        file.lastModified || 0
    ].join(":")).join("|");
    const provider = isOpenAiProvider() ? AI_PROVIDER_OPENAI : AI_PROVIDER_LOCAL;
    const model = getComposerTokenModel(text, attachedFiles);
    return JSON.stringify({ text, files, provider, model });
}

function hasComposerTokenContent() {
    return Boolean((input?.value || "").trim() || attachedFiles.length > 0);
}

async function buildComposerTokenText(text, files) {
    let messageContent = String(text || "").trim();
    for (const file of files) {
        if (isImageAttachment(file)) continue;
        try {
            const textContent = await file.text();
            messageContent += `\n\n--- Attached File Content: ${file.name} ---\n${textContent}\n-----------------------`;
        } catch {
            messageContent += `\n\n[Error reading file context item: ${file.name}]`;
        }
    }
    return messageContent;
}

function extractOllamaTokenizeCount(data) {
    const direct = firstTokenCount(data?.count, data?.token_count, data?.num_tokens, data?.total_tokens);
    if (direct !== null) return direct;

    const tokens = data?.tokens || data?.token_ids || data?.ids;
    return Array.isArray(tokens) ? tokens.length : null;
}

async function requestOllamaTokenCount(text, model) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), TOKEN_COUNTER_TIMEOUT_MS);
    let res;
    try {
        res = await fetch(OLLAMA_TOKENIZE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ model, prompt: text })
        });
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error("Ollama tokenizer timed out.");
        }
        throw err;
    } finally {
        window.clearTimeout(timeout);
    }

    if (!res.ok) {
        throw new Error(`Ollama tokenizer responded with HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    const count = extractOllamaTokenizeCount(data);
    if (count === null) {
        throw new Error("Ollama tokenizer did not return token ids.");
    }
    return count;
}

function setComposerTokenState(nextState) {
    composerTokenState = {
        signature: nextState.signature || "",
        status: nextState.status || "idle",
        count: normalizeTokenCount(nextState.count),
        source: nextState.source || "",
        error: nextState.error || ""
    };
    updateTokenDisplay({ scheduleCount: false });
}

async function refreshComposerTokenCount(signature, requestId) {
    setComposerTokenState({ signature, status: "counting" });

    const text = input?.value || "";
    const files = [...attachedFiles];
    if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;

    if (isOpenAiProvider()) {
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: `OpenAI draft tokens are counted from API usage after send. For a manual preflight count, use ${OPENAI_TOKENIZER_URL}.`
        });
        return;
    }

    if (!isOllamaReachable) {
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: "Ollama tokenizer is unavailable because Ollama is offline or has not checked in yet. Token usage will update from provider usage after send."
        });
        return;
    }

    if (files.some(isImageAttachment)) {
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: "Image attachment tokens are counted from provider usage after send."
        });
        return;
    }

    try {
        const tokenText = await buildComposerTokenText(text, files);
        if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;

        if (!tokenText.trim()) {
            setComposerTokenState({ signature: "", status: "idle" });
            return;
        }

        const model = getComposerTokenModel(text, files);
        const count = await requestOllamaTokenCount(tokenText, model);
        if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;

        setComposerTokenState({
            signature,
            status: "ready",
            count,
            source: `Ollama tokenizer (${model})`
        });
    } catch (err) {
        if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: `Tokenizer unavailable; token usage will update from provider usage after send. ${err.message}`
        });
    }
}

function scheduleComposerTokenCount() {
    if (composerTokenCountTimer) {
        window.clearTimeout(composerTokenCountTimer);
        composerTokenCountTimer = null;
    }

    if (isGenerating || !hasComposerTokenContent()) {
        composerTokenCountRequestId += 1;
        if (composerTokenState.status !== "idle" || composerTokenState.count !== null) {
            setComposerTokenState({ signature: "", status: "idle" });
        }
        return;
    }

    const signature = getComposerTokenSignature();
    if (composerTokenState.signature === signature && ["ready", "counting", "unavailable"].includes(composerTokenState.status)) {
        return;
    }

    const requestId = ++composerTokenCountRequestId;
    composerTokenState = { signature, status: "queued", count: null, source: "", error: "" };
    composerTokenCountTimer = window.setTimeout(() => {
        composerTokenCountTimer = null;
        refreshComposerTokenCount(signature, requestId);
    }, TOKEN_COUNTER_DEBOUNCE_MS);
}

function getComposerTokenDisplayPart() {
    if (isGenerating) return "Busy";
    if (!hasComposerTokenContent()) return "";
    if (composerTokenState.status === "ready" && composerTokenState.count !== null) {
        return `${composerTokenState.count.toLocaleString()} Prompt Tokens`;
    }
    if (composerTokenState.status === "queued" || composerTokenState.status === "counting") {
        return "Counting Tokens";
    }
    if (composerTokenState.status === "unavailable") {
        return "Tokens After Send";
    }
    return "";
}

function updateTokenDisplay({ scheduleCount = true } = {}) {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        setLibraryHeaderSummary(collectLibraryItems());
        return;
    }
    if (scheduleCount) scheduleComposerTokenCount();
    if (tokenCounter) {
        const parts = [`${sessionTotalTokens.toLocaleString()} Session Tokens`];
        const composerPart = getComposerTokenDisplayPart();
        if (composerPart) parts.push(composerPart);
        tokenCounter.textContent = parts.join(" · ");
        const tokenSummaryParts = [
            `Session tokens: ${sessionTotalTokens.toLocaleString()} from provider-reported usage.`
        ];
        if (!isGenerating && composerTokenState.status === "ready" && composerTokenState.count !== null) {
            tokenSummaryParts.push(`Current prompt tokens: ${composerTokenState.count.toLocaleString()} from ${composerTokenState.source}.`);
        } else if (!isGenerating && composerTokenState.status === "unavailable" && composerTokenState.error) {
            tokenSummaryParts.push(composerTokenState.error);
        } else if (!isGenerating && (composerTokenState.status === "queued" || composerTokenState.status === "counting")) {
            tokenSummaryParts.push("Counting current prompt tokens.");
        }
        const tokenSummary = tokenSummaryParts.join(" ");
        tokenCounter.dataset.tooltip = tokenSummary;
        tokenCounter.setAttribute("aria-label", tokenSummary);
    }
}

// ===== MODEL SWITCHER LOGIC =====
const OLLAMA_URL = "http://localhost:11434/api/chat";
const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_TAGS_URL = `${OLLAMA_BASE_URL}/api/tags`;
const OLLAMA_SHOW_URL = `${OLLAMA_BASE_URL}/api/show`;
const OLLAMA_TOKENIZE_URL = `${OLLAMA_BASE_URL}/api/tokenize`;
const OLLAMA_PULL_URL = `${OLLAMA_BASE_URL}/api/pull`;
const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";
const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const BING_SEARCH_URL = "https://www.bing.com/search";
const DUCKDUCKGO_SEARCH_URL = "https://duckduckgo.com/";
const IP_GEOLOCATION_URL = "https://ipapi.co/json/";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const WEB_URL_RE = /\bhttps?:\/\/[^\s`<>"']+/gi;
const IMAGE_GEN_BASE_URL = "https://image.pollinations.ai/prompt/";
const OPENAI_BRIDGE_PATH = "/openai";
const LOCAL_AI_BRIDGE_PATH = "/local-ai";
const WORKSPACE_BRIDGE_TOKEN_HEADER = "X-Fauna-Bridge-Token";
const LEGACY_WORKSPACE_BRIDGE_TOKEN_HEADER = ["X", "Flo" + "ra", "Bridge", "Token"].join("-");
const OPENAI_BRIDGE_REQUIRED_MESSAGE = "OpenAI requests need the Local Workspace Bridge. Start local-bridge.py, save the bridge token, and enable Local Workspace in Tools.";
const AI_PROVIDER_LOCAL = "local";
const AI_PROVIDER_OPENAI = "openai";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1.5";
const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_OPENAI_SPEECH_MODEL = "gpt-4o-mini-tts";
const DEFAULT_OPENAI_REALTIME_MODEL = "gpt-realtime-2";
const DEFAULT_OPENAI_VOICE = "alloy";
const DEFAULT_OPENAI_REASONING_MODE = "medium";
const LOCAL_VOICE_TRANSCRIPTION_BROWSER = "browser";
const LOCAL_VOICE_TRANSCRIPTION_WHISPER = "whisper";
const LOCAL_VOICE_REPLY_BROWSER = "browser";
const LOCAL_VOICE_REPLY_MOSHI = "moshi";
const LOCAL_VOICE_REPLY_QWEN3_OMNI = "qwen3-omni";
const DEFAULT_LOCAL_VOICE_TRANSCRIPTION = LOCAL_VOICE_TRANSCRIPTION_WHISPER;
const DEFAULT_LOCAL_VOICE_REPLY_MODEL = LOCAL_VOICE_REPLY_MOSHI;
const DEFAULT_LOCAL_VOICE_TRANSCRIPTION_ENDPOINT = "http://127.0.0.1:8000/v1/audio/transcriptions";
const DEFAULT_LOCAL_VOICE_TRANSCRIPTION_MODEL = "whisper-large-v3";
const DEFAULT_LOCAL_VOICE_REPLY_ENDPOINT = "http://127.0.0.1:8998/v1/audio/speech";
const LOCAL_VOICE_TRANSCRIPTION_OPTIONS = [
    { id: LOCAL_VOICE_TRANSCRIPTION_BROWSER, label: "Browser" },
    { id: LOCAL_VOICE_TRANSCRIPTION_WHISPER, label: "Whisper" }
];
const LOCAL_VOICE_REPLY_MODEL_OPTIONS = [
    { id: LOCAL_VOICE_REPLY_BROWSER, label: "Browser voice" },
    { id: LOCAL_VOICE_REPLY_MOSHI, label: "Moshi" },
    { id: LOCAL_VOICE_REPLY_QWEN3_OMNI, label: "Qwen3-Omni" }
];
const OPENAI_CHAT_MODEL_OPTIONS = DEFAULT_OPENAI_CHAT_MODEL_OPTIONS;
const OPENAI_IMAGE_MODEL_OPTIONS = DEFAULT_OPENAI_IMAGE_MODEL_OPTIONS;
const OPENAI_TRANSCRIPTION_MODEL_OPTIONS = [
    { id: "gpt-4o-mini-transcribe", label: "gpt-4o-mini-transcribe" },
    { id: "gpt-4o-mini-transcribe-2025-03-20", label: "gpt-4o-mini-transcribe-2025-03-20" },
    { id: "gpt-4o-mini-transcribe-2025-12-15", label: "gpt-4o-mini-transcribe-2025-12-15" },
    { id: "gpt-4o-transcribe", label: "gpt-4o-transcribe" },
    { id: "gpt-4o-transcribe-diarize", label: "gpt-4o-transcribe-diarize" },
    { id: "gpt-realtime-whisper", label: "gpt-realtime-whisper" },
    { id: "whisper-1", label: "whisper-1" }
];
const OPENAI_REALTIME_MODEL_OPTIONS = [
    { id: "gpt-realtime-2", label: "gpt-realtime-2", group: "Reasoning" },
    { id: "gpt-realtime-mini-2025-12-15", label: "gpt-realtime-mini-2025-12-15", group: "GPT-4O" },
    { id: "gpt-realtime-mini-2025-10-06", label: "gpt-realtime-mini-2025-10-06", group: "GPT-4O" },
    { id: "gpt-realtime-mini", label: "gpt-realtime-mini", group: "GPT-4O" },
    { id: "gpt-realtime-2025-08-28", label: "gpt-realtime-2025-08-28", group: "GPT-4O" },
    { id: "gpt-realtime-1.5", label: "gpt-realtime-1.5", group: "GPT-4O" },
    { id: "gpt-realtime", label: "gpt-realtime", group: "GPT-4O" }
];
const OPENAI_VISION_FILE_PURPOSE = "vision";
const OPENAI_VOICE_OPTIONS = [
    { id: "alloy", name: "Alloy", description: "Balanced and clear", swatch: "voice-swatch-alloy", color: "#8fa7ff" },
    { id: "ash", name: "Ash", description: "Calm and steady", swatch: "voice-swatch-ash", color: "#a8b2c2" },
    { id: "ballad", name: "Ballad", description: "Warm and expressive", swatch: "voice-swatch-ballad", color: "#d98cff" },
    { id: "coral", name: "Coral", description: "Bright and conversational", swatch: "voice-swatch-coral", color: "#ff8f86" },
    { id: "echo", name: "Echo", description: "Crisp and direct", swatch: "voice-swatch-echo", color: "#79c7ff" },
    { id: "sage", name: "Sage", description: "Measured and relaxed", swatch: "voice-swatch-sage", color: "#91d6a8" },
    { id: "shimmer", name: "Shimmer", description: "Airy and upbeat", swatch: "voice-swatch-shimmer", color: "#ff9bd6" },
    { id: "verse", name: "Verse", description: "Smooth and polished", swatch: "voice-swatch-verse", color: "#b3a1ff" },
    { id: "marin", name: "Marin", description: "Gentle and natural", swatch: "voice-swatch-marin", color: "#74d6d1" },
    { id: "cedar", name: "Cedar", description: "Low and composed", swatch: "voice-swatch-cedar", color: "#d0a06f" }
];
const DEFAULT_WAN_VIDEO_BASE_URL = "http://localhost:8188";
const DEFAULT_WORKSPACE_BRIDGE_URL = "http://127.0.0.1:8765";
const AI_PROVIDER_STORAGE_KEY = "faunaAiProvider";
const LOCAL_CHAT_MODEL_STORAGE_KEY = "faunaLocalChatModel";
const OPENAI_API_KEY_STORAGE_KEY = "faunaOpenAiApiKey";
const OPENAI_CHAT_MODEL_STORAGE_KEY = "faunaOpenAiChatModel";
const OPENAI_REASONING_MODE_STORAGE_KEY = "faunaOpenAiReasoningMode";
const OPENAI_IMAGE_MODEL_STORAGE_KEY = "faunaOpenAiImageModel";
const OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY = "faunaOpenAiTranscriptionModel";
const OPENAI_SPEECH_MODEL_STORAGE_KEY = "faunaOpenAiSpeechModel";
const OPENAI_REALTIME_MODEL_STORAGE_KEY = "faunaOpenAiRealtimeModel";
const OPENAI_VOICE_COST_NOTICE_DISMISSED_STORAGE_KEY = "faunaOpenAiVoiceCostNoticeDismissed";
const OPENAI_VOICE_STORAGE_KEY = "faunaOpenAiVoice";
const LOCAL_VOICE_TRANSCRIPTION_STORAGE_KEY = "faunaLocalVoiceTranscription";
const LOCAL_VOICE_TRANSCRIPTION_ENDPOINT_STORAGE_KEY = "faunaLocalVoiceTranscriptionEndpoint";
const LOCAL_VOICE_TRANSCRIPTION_MODEL_STORAGE_KEY = "faunaLocalVoiceTranscriptionModel";
const LOCAL_VOICE_REPLY_MODEL_STORAGE_KEY = "faunaLocalVoiceReplyModel";
const LOCAL_VOICE_REPLY_ENDPOINT_STORAGE_KEY = "faunaLocalVoiceReplyEndpoint";
const AI_CACHING_STORAGE_KEY = "faunaAiCachingEnabled";
const OPENAI_VOICE_PREVIEW_CACHE_STORAGE_KEY = "faunaVoicePreviewCache";
const OPENAI_SPEECH_CACHE_STORAGE_KEY = "faunaOpenAiSpeechCache";
const OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY = "faunaOpenAiTranscriptionCache";
const OPENAI_FILE_CACHE_STORAGE_KEY = "faunaOpenAiFileCache";
const OPENAI_MODEL_CATALOG_STORAGE_KEY = "faunaOpenAiModelCatalog";
const OPENAI_PROMPT_CACHE_RETENTION = "24h";
const OPENAI_SPEECH_CACHE_MAX_ENTRIES = 16;
const OPENAI_SPEECH_CACHE_MAX_CHARS = 3200000;
const OPENAI_TRANSCRIPTION_CACHE_MAX_ENTRIES = 24;
const OPENAI_FILE_CACHE_MAX_ENTRIES = 120;
const OPENAI_MODEL_CATALOG_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const OPENAI_VOICE_PRICING_FALLBACK = {
    realtimeModel: "gpt-realtime-2",
    realtimeMatchedSelectedModel: true,
    realtime: {
        audio: { input: "$32.00", cachedInput: "$0.40", output: "$64.00" },
        text: { input: "$4.00", cachedInput: "$0.40", output: "$24.00" }
    },
    transcriptionModels: [
        { model: "gpt-4o-mini-transcribe", input: "$1.25", output: "$5.00", estimatedCost: "$0.003 / minute" },
        { model: "gpt-4o-transcribe", input: "$2.50", output: "$10.00", estimatedCost: "$0.006 / minute" }
    ]
};
const ASSISTANT_TTS_WAVEFORM_BARS = 26;
const OLLAMA_CACHE_KEEP_ALIVE = "30m";
const OPENROUTER_MODEL_CAPABILITIES_STORAGE_KEY = "faunaOpenRouterModelCapabilities";
const VOICE_SPEED_STORAGE_KEY = "faunaVoiceSpeed";
const VOICE_REPLY_ENABLED_STORAGE_KEY = "faunaVoiceReplyEnabled";
const VOICE_MIC_DEVICE_STORAGE_KEY = "faunaVoiceMicDevice";
const VOICE_OUTPUT_DEVICE_STORAGE_KEY = "faunaVoiceOutputDevice";
const WAN_VIDEO_ENDPOINT_STORAGE_KEY = "faunaWanEndpoint";
const WAN_VIDEO_WORKFLOW_STORAGE_KEY = "faunaWanWorkflow";
const WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY = "faunaWorkspaceBridgeEndpoint";
const WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY = "faunaWorkspaceBridgeToken";
const WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY = "faunaWorkspaceBridgeEnabled";
const MEMORY_ENABLED_STORAGE_KEY = "faunaMemoryEnabled";
const MEMORY_STORAGE_KEY = "faunaMemories";
const PERSONA_DISPLAY_NAME_STORAGE_KEY = "faunaPersonaDisplayName";
const PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY = "faunaPersonaCustomInstructions";
const PERSONA_DISPLAY_NAME_MAX_LENGTH = 40;
const PERSONA_CUSTOM_INSTRUCTIONS_MAX_LENGTH = 4000;
const MEMORY_MAX_ENTRIES = 50;
const MEMORY_MAX_TEXT_LENGTH = 240;
const THEME_STORAGE_KEY = "faunaTheme";
const ACCENT_STORAGE_KEY = "faunaAccent";
const CHAT_TITLE_RE = createAssistantControlTagRegex("chat_title", "i");
const CHAT_TITLE_MAX_LENGTH = 80;
const FAUNA_TOOL_CALL_RE = createAssistantControlTagRegex("tool_call", "i");
const FAUNA_TOOL_CALLS_RE = createAssistantControlTagRegex("tool_call", "gi");
const FAUNA_TOOL_CALL_OPEN_RE = createAssistantControlOpenRegex("tool_call", "i");
const FAUNA_TOOL_CALL_OPEN_TO_END_RE = createAssistantControlOpenToEndRegex("tool_call", "i");
const FAUNA_TOOL_MAX_STEPS = 4;
const FAUNA_TOOL_FALLBACK_RESULT_MAX_CHARS = 6000;
const LOCAL_TOOL_RESULT_MAX_CHARS = 14000;
const WEB_INSPECT_RESULT_MAX_CHARS = 12000;
const WAIT_TOOL_DEFAULT_DELAY_MS = 1000;
const WAIT_TOOL_MAX_DELAY_MS = 5 * 60 * 1000;
const WAIT_FOR_COMMAND_DEFAULT_MAX_MS = 30 * 1000;
const WAIT_FOR_COMMAND_MAX_MS = 5 * 60 * 1000;
const WAIT_FOR_COMMAND_DEFAULT_INTERVAL_MS = 2000;
const WAIT_FOR_COMMAND_MIN_INTERVAL_MS = 500;
const WORKSPACE_TOOL_NAME_ALIASES = {
    workspace_tree: "workspace_tree",
    read_directory: "workspace_tree",
    list_directory: "workspace_tree",
    directory_tree: "workspace_tree",
    list_files: "workspace_tree",
    tree: "workspace_tree",
    ls: "workspace_tree",
    read_file: "read_file",
    open_file: "read_file",
    file_read: "read_file",
    run_command: "run_command",
    run_terminal_command: "run_command",
    terminal_command: "run_command",
    shell_command: "run_command",
    run_shell_command: "run_command",
    exec: "run_command"
};
const WORKSPACE_TOOL_NAMES = new Set(Object.values(WORKSPACE_TOOL_NAME_ALIASES));
const MEMORY_TOOL_NAME_ALIASES = {
    read_memories: "read_memories",
    memory_list: "read_memories",
    memory_search: "read_memories",
    save_memory: "save_memory",
    memory_add: "save_memory",
    delete_memory: "delete_memory",
    memory_delete: "delete_memory"
};
const MEMORY_TOOL_NAMES = new Set(Object.values(MEMORY_TOOL_NAME_ALIASES));
const IMAGE_TOOL_NAME_ALIASES = {
    generate_image: "generate_image",
    image_generate: "generate_image",
    create_image: "generate_image",
    make_image: "generate_image",
    draw_image: "generate_image",
    imagine: "generate_image"
};
const IMAGE_TOOL_NAMES = new Set(Object.values(IMAGE_TOOL_NAME_ALIASES));
const IMAGE_TOOL_SYSTEM_PROMPT = `You can generate images when the user asks for visual creation, artwork, photos, posters, illustrations, wallpapers, icons, or image ideas. If image generation is appropriate, briefly acknowledge the request in natural language, then append exactly one hidden tool call and no extra text after it. Use this schema: <fauna_tool_call>{"tool":"generate_image","prompt":"A complete polished image prompt","aspectRatio":"1:1","style":"photorealistic","quality":"high","format":"png","width":1024,"height":1024}</fauna_tool_call>. You may choose or honor aspectRatio (1:1, 16:9, 9:16, 4:3, 3:4), width, height, style, medium, lighting, composition, mood, colorPalette, camera, quality (auto, low, medium, high), format (png, jpeg, webp), background (auto, transparent, opaque), and negativePrompt. Put all visual requirements into the prompt. Do not use this tool for editing an attached image unless the user asks for a new generated image based on it.`;
const WEB_TOOL_NAME_ALIASES = {
    web_search: "web_search",
    search_web: "web_search",
    google_search: "web_search",
    search: "web_search",
    inspect_url: "inspect_url",
    inspect_site: "inspect_url",
    fetch_url: "inspect_url",
    read_url: "inspect_url",
    open_url: "inspect_url",
    browse_url: "inspect_url"
};
const WEB_TOOL_NAMES = new Set(Object.values(WEB_TOOL_NAME_ALIASES));
const WEB_TOOL_SYSTEM_PROMPT = `You can use Fauna web tools when the user asks for current information, live websites, sources, search results, URLs, or site inspection. To request a tool, respond with only the required hidden chat title block when present, then exactly one tool XML block, and no normal prose. Search example: <fauna_tool_call>{"tool":"web_search","query":"Friendify app"}</fauna_tool_call>. Site inspection example: <fauna_tool_call>{"tool":"inspect_url","url":"https://example.com"}</fauna_tool_call>. Prefer inspect_url when the user provides a URL or asks what a page/site contains. Web search returns search links and available summaries; inspect_url reads page text directly when browser CORS allows it or through the token-protected Local Workspace Bridge. Cite URLs from tool results for factual claims. If inspection fails or the result is insufficient, say exactly what could not be inspected and ask for pasted text or a screenshot.`;
const LOCATION_TOOL_NAME_ALIASES = {
    get_ip_location: "get_ip_location",
    ip_location: "get_ip_location",
    approximate_location: "get_ip_location",
    approx_location: "get_ip_location",
    rough_location: "get_ip_location",
    current_weather: "current_weather",
    local_weather: "current_weather",
    weather: "current_weather",
    temperature: "current_weather",
    temperature_now: "current_weather"
};
const LOCATION_TOOL_NAMES = new Set(Object.values(LOCATION_TOOL_NAME_ALIASES));
const TIME_TOOL_NAME_ALIASES = {
    wait: "wait",
    sleep: "wait",
    timer: "wait",
    delay: "wait",
    pause: "wait",
    wait_until: "wait",
    wait_for: "wait_for",
    wait_for_command: "wait_for",
    poll_command: "wait_for",
    stopwatch: "stopwatch",
    stop_watch: "stopwatch",
    time: "stopwatch",
    time_command: "stopwatch",
    stopwatch_command: "stopwatch",
    measure_command: "stopwatch",
    user_input_stopwatch: "stopwatch",
    wait_for_user_input: "stopwatch"
};
const TIME_TOOL_NAMES = new Set(Object.values(TIME_TOOL_NAME_ALIASES));
const LOCAL_TOOL_SYSTEM_PROMPT = `You can use Fauna local workspace tools when the user asks about local files, this project, directory listings, or terminal commands. To request a tool, respond with only the required hidden chat title block when present, then exactly one tool XML block, and no normal prose. Directory read/list examples: <fauna_tool_call>{"tool":"read_directory","path":".","depth":2}</fauna_tool_call> or <fauna_tool_call>{"tool":"list_directory","path":"components","depth":1}</fauna_tool_call>. File read example: <fauna_tool_call>{"tool":"read_file","path":"script.js"}</fauna_tool_call>. Terminal example: <fauna_tool_call>{"tool":"run_terminal_command","command":"git status --short","cwd":".","timeout":20}</fauna_tool_call>. Commands run only inside the configured workspace and may be blocked by bridge safety rules. Tool file results include line numbers; when you cite local files, reference them inline as path (line N) or path (lines A-B). After Fauna returns a tool result, answer the user normally. Do not call the same tool with the same path or command again; use the returned result unless you need a different file or command.`;
function buildRuntimeToolSystemPrompt(allowLocationTools = false, allowWaitForCommand = false) {
    const locationPrompt = allowLocationTools
        ? `Approx location/weather tools: Use <fauna_tool_call>{"tool":"get_ip_location"}</fauna_tool_call> only when the user asks about their rough location. Use <fauna_tool_call>{"tool":"current_weather"}</fauna_tool_call> when the user asks for weather or temperature near them, such as "how warm is it at my place?" or "wie viel Grad ist es gerade bei mir?". This uses coarse public-IP geolocation and may be city/region-level inaccurate. Never claim a precise address and do not reveal the public IP address unless the user explicitly asks for it.`
        : "Approx location/weather tools are disabled in the Tools menu. If the user asks for local weather or rough IP location, tell them to enable Approx Location.";
    const waitForCommandPrompt = allowWaitForCommand
        ? `For command readiness checks, use <fauna_tool_call>{"tool":"wait_for","command":"curl -I http://127.0.0.1:5173","intervalSeconds":2,"maxSeconds":20,"expectedExitCode":0}</fauna_tool_call>. The command is run through the token-protected Local Workspace Bridge and must stay within its safety rules.`
        : "For wait_for command checks, ask the user to enable and configure Local Workspace Bridge first.";
    return `You can use Fauna runtime tools for timers, stopwatches, short waits, rough IP-based location, and current weather. To request a runtime tool, respond with only the required hidden chat title block when present, then exactly one tool XML block, and no normal prose. Timer examples: <fauna_tool_call>{"tool":"wait","seconds":10,"reason":"short timer"}</fauna_tool_call> or <fauna_tool_call>{"tool":"timer","duration":"2 minutes"}</fauna_tool_call>. Stopwatch command example: <fauna_tool_call>{"tool":"stopwatch","command":"npm test","cwd":".","timeout":60}</fauna_tool_call>. Stopwatch until user input example: <fauna_tool_call>{"tool":"stopwatch","mode":"user_input","prompt":"Type anything when I should stop the stopwatch.","label":"User response time"}</fauna_tool_call>. Keep waits reasonably short; Fauna caps long waits. After a wait, timer, or stopwatch result, answer the user normally. ${waitForCommandPrompt} ${locationPrompt}`;
}
const CHAT_TITLE_SYSTEM_PROMPT = `For your first assistant response in a new chat, the very first characters of the response must be one hidden XML block that names the chat: <fauna_chat_title>{"title":"Short chat title"}</fauna_chat_title>. Use 3 to 7 words, match the user's language when clear, and avoid trailing punctuation. If you also need to request a Fauna tool, put this chat title block first and the tool call block immediately after it, with no normal prose until tool results are returned. Do not mention the hidden title block to the user.`;
const CLARIFYING_QUESTION_RE = createAssistantControlTagRegex("question", "i");
const CLARIFYING_QUESTION_SYSTEM_PROMPT = `When you need user input before continuing, ask the question in your normal response and append one hidden JSON block at the end using this exact format: <fauna_question>{"questions":[{"question":"What should I know?","options":["Option A","Option B"],"allowCustom":true,"placeholder":"Type your answer..."}]}</fauna_question>. Use 1-3 concise questions. Each question may include 2-5 short options. Do not mention the XML block to the user. If you can answer well without more information, do not use this block.`;
const MEMORY_REQUEST_RE = createAssistantControlTagRegex("memory", "gi");
const MEMORY_SYSTEM_PROMPT = `Memory beta is enabled. Saved memories are durable user context across chats. When the user asks to inspect, search, save, update, or delete saved memories, prefer the memory tool so the answer reflects the latest local state. To request a memory tool, respond with exactly one XML block and no other text: <fauna_tool_call>{"tool":"read_memories"}</fauna_tool_call>, <fauna_tool_call>{"tool":"read_memories","query":"writing style"}</fauna_tool_call>, <fauna_tool_call>{"tool":"save_memory","text":"User prefers concise answers."}</fauna_tool_call>, or <fauna_tool_call>{"tool":"delete_memory","target":"2"}</fauna_tool_call>. Save a memory only when the user explicitly asks you to remember something or gives a stable preference, project fact, or personal detail likely to be useful later. Delete a memory only when the user asks you to forget it. After Fauna returns a tool result, answer normally.`;
const USER_LOCALE_SYSTEM_PROMPT = `Use this browser locale context as a hint for language, spelling, units, dates, and regional assumptions. Reply in the user's message language by default. If the message language is ambiguous, prefer the primary browser language. Do not claim a precise physical location; the country or region is inferred from browser locale settings.`;
const CODE_BLOCK_SYSTEM_PROMPT = `When you include a fenced code block, always add the best language identifier after the opening fence, such as \`\`\`python, \`\`\`javascript, \`\`\`html, \`\`\`css, \`\`\`json, \`\`\`bash, or \`\`\`powershell. For a large generated file that should appear as a compact preview card instead of an expanded code block, put an HTML comment immediately before the fence, like <!-- fauna-file: index.html -->, then include the full fenced code as usual.`;
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
const OLLAMA_SHOW_TIMEOUT_MS = 2500;
const OLLAMA_CAPABILITY_DETAIL_LIMIT = 80;
const OLLAMA_TEXT_FILE_INPUT_CAPABILITIES = ["text", "document", "spreadsheet"];
const OLLAMA_VISION_FILE_INPUT_CAPABILITIES = [...OLLAMA_TEXT_FILE_INPUT_CAPABILITIES, "image"];
const OLLAMA_CHAT_PARAMETERS = ["temperature", "num_predict", "top_p", "top_k"];
const OLLAMA_TOOL_MODEL_PATTERNS = [
    /(^|[/:_-])qwen(?:2\.5|3)(?=$|[/:_-])/i,
    /(^|[/:_-])gpt-oss(?=$|[/:_-])/i,
    /(^|[/:_-])llama3\.(?:1|2|3)(?=$|[/:_-])/i,
    /(^|[/:_-])mistral(?=$|[/:_-])/i,
    /(^|[/:_-])mixtral(?=$|[/:_-])/i,
    /(^|[/:_-])command-r(?=$|[/:_-])/i,
    /(^|[/:_-])devstral(?=$|[/:_-])/i,
    /(^|[/:_-])functionary(?=$|[/:_-])/i,
    /(^|[/:_-])firefunction(?=$|[/:_-])/i,
    /(^|[/:_-])hermes(?:3|4)?(?=$|[/:_-])/i,
    /(^|[/:_-])granite3(?:\.[23])?(?=$|[/:_-])/i,
    /(^|[/:_-])nemotron(?=$|[/:_-])/i,
    /(^|[/:_-])glm(?:4|4\.5)?(?=$|[/:_-])/i,
    /(^|[/:_-])kimi(?=$|[/:_-])/i,
    /(^|[/:_-])minimax(?=$|[/:_-])/i,
    /(^|[/:_-])tool(?:s)?(?=$|[/:_-])/i
];
const OLLAMA_VISION_MODEL_PATTERNS = [
    /(^|[/:_-])llava(?=$|[/:_-])/i,
    /(^|[/:_-])bakllava(?=$|[/:_-])/i,
    /(^|[/:_-])moondream(?=$|[/:_-])/i,
    /(^|[/:_-])minicpm-v(?=$|[/:_-])/i,
    /(^|[/:_-])qwen(?:2|2\.5)?-?vl(?=$|[/:_-])/i,
    /(^|[/:_-])llama3\.2-vision(?=$|[/:_-])/i,
    /(^|[/:_-])mllama(?=$|[/:_-])/i,
    /(^|[/:_-])vision(?=$|[/:_-])/i,
    /(^|[/:_-])vl(?=$|[/:_-])/i
];
const OLLAMA_THINKING_MODEL_PATTERNS = [
    /(^|[/:_-])qwen3(?=$|[/:_-])/i,
    /(^|[/:_-])deepseek-r1(?=$|[/:_-])/i,
    /(^|[/:_-])gpt-oss(?=$|[/:_-])/i,
    /(^|[/:_-])glm(?:4|4\.5)?(?=$|[/:_-])/i,
    /(^|[/:_-])nemotron(?=$|[/:_-])/i,
    /(^|[/:_-])kimi(?=$|[/:_-])/i,
    /(^|[/:_-])minimax(?=$|[/:_-])/i
];
const OLLAMA_NON_CHAT_MODEL_PATTERNS = [
    /(^|[/:_-])embed(?:ding)?(?=$|[/:_-])/i,
    /(^|[/:_-])nomic-embed(?=$|[/:_-])/i,
    /(^|[/:_-])mxbai-embed(?=$|[/:_-])/i,
    /(^|[/:_-])bge(?:-|_)?(?:m3|large|base|small|embedding)?(?=$|[/:_-])/i,
    /(^|[/:_-])e5(?:-|_)?(?:large|base|small)?(?=$|[/:_-])/i,
    /(^|[/:_-])snowflake-arctic-embed(?=$|[/:_-])/i,
    /(^|[/:_-])all-minilm(?=$|[/:_-])/i
];
const LOCAL_MODEL_OPTIONS = [
    {
        id: "llama2",
        label: "llama2",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion"],
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "qwen3:8b",
        label: "qwen3:8b",
        meta: "Reasoning",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools", "thinking"],
        supportsToolCalling: true,
        supportsImageInput: false,
        supportsThinking: true
    },
    {
        id: "qwen3-coder:30b",
        label: "qwen3-coder:30b",
        meta: "Code",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "moondream",
        label: "moondream",
        meta: "Vision",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "vision"],
        supportsToolCalling: false,
        supportsImageInput: true
    }
];
const OLLAMA_CATALOG_MODEL_OPTIONS = [
    ...LOCAL_MODEL_OPTIONS,
    {
        id: "llama3.3",
        label: "llama3.3",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "llama3.2",
        label: "llama3.2",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "llama3.2-vision",
        label: "llama3.2-vision",
        meta: "Vision",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "vision"],
        supportsToolCalling: false,
        supportsImageInput: true
    },
    {
        id: "llama3.1",
        label: "llama3.1",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "qwen3",
        label: "qwen3",
        meta: "Reasoning",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools", "thinking"],
        supportsToolCalling: true,
        supportsImageInput: false,
        supportsThinking: true
    },
    {
        id: "qwen2.5",
        label: "qwen2.5",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "qwen2.5-coder",
        label: "qwen2.5-coder",
        meta: "Code",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "deepseek-r1",
        label: "deepseek-r1",
        meta: "Reasoning",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "thinking"],
        supportsToolCalling: false,
        supportsImageInput: false,
        supportsThinking: true
    },
    {
        id: "gemma3",
        label: "gemma3",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion"],
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "mistral",
        label: "mistral",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "mixtral",
        label: "mixtral",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "phi4",
        label: "phi4",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion"],
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "phi3",
        label: "phi3",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion"],
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "codellama",
        label: "codellama",
        meta: "Code",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion"],
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "llava",
        label: "llava",
        meta: "Vision",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "vision"],
        supportsToolCalling: false,
        supportsImageInput: true
    },
    {
        id: "bakllava",
        label: "bakllava",
        meta: "Vision",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "vision"],
        supportsToolCalling: false,
        supportsImageInput: true
    },
    {
        id: "minicpm-v",
        label: "minicpm-v",
        meta: "Vision",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "vision"],
        supportsToolCalling: false,
        supportsImageInput: true
    },
    {
        id: "granite3.3",
        label: "granite3.3",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "devstral",
        label: "devstral",
        meta: "Code",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "command-r",
        label: "command-r",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "hermes3",
        label: "hermes3",
        meta: "Chat",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools"],
        supportsToolCalling: true,
        supportsImageInput: false
    },
    {
        id: "gpt-oss",
        label: "gpt-oss",
        meta: "Reasoning",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["completion", "tools", "thinking"],
        supportsToolCalling: true,
        supportsImageInput: false,
        supportsThinking: true
    },
    {
        id: "nomic-embed-text",
        label: "nomic-embed-text",
        meta: "Embeddings",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["embedding"],
        supportsCompletion: false,
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "mxbai-embed-large",
        label: "mxbai-embed-large",
        meta: "Embeddings",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["embedding"],
        supportsCompletion: false,
        supportsToolCalling: false,
        supportsImageInput: false
    },
    {
        id: "bge-m3",
        label: "bge-m3",
        meta: "Embeddings",
        provider: AI_PROVIDER_LOCAL,
        capabilities: ["embedding"],
        supportsCompletion: false,
        supportsToolCalling: false,
        supportsImageInput: false
    }
];
const REQUIRED_OLLAMA_MODELS = LOCAL_MODEL_OPTIONS.map(model => model.id);
let installedOllamaModels = [];
let localModelOptions = [...LOCAL_MODEL_OPTIONS];
let ollamaModelCapabilities = new Map();
let availableOpenAiModelIds = null;
let cachedOpenAiCatalogModels = [];
let openAiCatalogSearchQuery = "";
let openAiCatalogSortMode = "default";
let openAiCatalogProvider = AI_PROVIDER_OPENAI;
const openAiCatalogFilters = {
    require: new Set(),
    exclude: new Set()
};
let openAiCatalogReturnFocus = null;
const aiCapabilityRegistry = createAiCapabilityRegistry([
    ...OPENAI_CHAT_MODEL_OPTIONS,
    ...OPENAI_IMAGE_MODEL_OPTIONS
]);
let isOllamaReachable = false;
let hasCheckedOllamaStatus = false;
let OLLAMA_MODEL = getStoredLocalModel();
let activeAiProvider = normalizeAiProvider(safeLocalStorageGet(AI_PROVIDER_STORAGE_KEY));
isWorkspaceBridgeEnabled = safeLocalStorageGet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY) === "true";
isMemoryEnabled = safeLocalStorageGet(MEMORY_ENABLED_STORAGE_KEY) === "true";
isAiStreamingEnabled = safeLocalStorageGet(AI_STREAMING_ENABLED_STORAGE_KEY) !== "false";
activeTemperature = normalizeAiTemperature(safeLocalStorageGet(AI_TEMPERATURE_STORAGE_KEY));
activeMaxOutputTokens = normalizeMaxOutputTokens(safeLocalStorageGet(AI_MAX_OUTPUT_TOKENS_STORAGE_KEY));
activeTopP = normalizeTopP(safeLocalStorageGet(AI_TOP_P_STORAGE_KEY));
activeOllamaTopK = normalizeOllamaTopK(safeLocalStorageGet(OLLAMA_TOP_K_STORAGE_KEY));
activeOpenAiVerbosity = normalizeOpenAiVerbosity(safeLocalStorageGet(OPENAI_VERBOSITY_STORAGE_KEY));
isAiCachingEnabled = safeLocalStorageGet(AI_CACHING_STORAGE_KEY) === "true";
activeVoiceSpeed = normalizeStoredVoiceSpeed(safeLocalStorageGet(VOICE_SPEED_STORAGE_KEY));
isVoiceReplyEnabled = safeLocalStorageGet(VOICE_REPLY_ENABLED_STORAGE_KEY) !== "false";
selectedVoiceMicDeviceId = safeLocalStorageGet(VOICE_MIC_DEVICE_STORAGE_KEY) || "default";
selectedVoiceOutputDeviceId = safeLocalStorageGet(VOICE_OUTPUT_DEVICE_STORAGE_KEY) || "default";
let conversationHistory = [];
let chatSessions = [];
let memoryEntries = readStoredMemoryEntries();
let activeSessionId = null;
let chatStorageProfile = CHAT_STORAGE_PROFILE_FULL;
let hasShownChatStorageWarning = false;
let isChatHistoryCollapsed = safeLocalStorageGet(CHAT_HISTORY_COLLAPSED_STORAGE_KEY) === "true";
let isArchivedChatHistoryCollapsed = safeLocalStorageGet(ARCHIVED_CHAT_HISTORY_COLLAPSED_STORAGE_KEY) === "true";

function createSessionId() {
    return window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeAiProvider(provider) {
    return provider === AI_PROVIDER_OPENAI ? AI_PROVIDER_OPENAI : AI_PROVIDER_LOCAL;
}

function normalizeAiTemperature(value) {
    const temperature = Number(value);
    if (!Number.isFinite(temperature)) return 0.7;
    return Math.min(1.5, Math.max(0, Math.round(temperature * 10) / 10));
}

function normalizeMaxOutputTokens(value) {
    const tokens = Number(value);
    if (!Number.isFinite(tokens)) return 0;
    return Math.min(128000, Math.max(0, Math.round(tokens)));
}

function normalizeTopP(value) {
    const topP = Number(value);
    if (!Number.isFinite(topP)) return 1;
    return Math.min(1, Math.max(0.05, Math.round(topP * 100) / 100));
}

function normalizeOllamaTopK(value) {
    const topK = Number(value);
    if (!Number.isFinite(topK)) return 40;
    return Math.min(200, Math.max(0, Math.round(topK)));
}

function normalizeOpenAiVerbosity(value) {
    const verbosity = String(value || "").trim().toLowerCase();
    return ["low", "medium", "high"].includes(verbosity) ? verbosity : "medium";
}

function normalizeModelId(model) {
    return String(model || "").trim();
}

function getStoredLocalModel() {
    const saved = normalizeModelId(safeLocalStorageGet(LOCAL_CHAT_MODEL_STORAGE_KEY));
    return saved || MODEL_ROUTES.chat;
}

function getLocalModelOption(modelId) {
    return localModelOptions.find(option => option.id === modelId)
        || LOCAL_MODEL_OPTIONS.find(option => option.id === modelId)
        || { id: modelId, label: modelId, meta: "Local", provider: AI_PROVIDER_LOCAL };
}

function ollamaModelMatches(installedModel, requestedModel) {
    const installed = normalizeModelId(installedModel);
    const requested = normalizeModelId(requestedModel);
    return installed === requested
        || installed === `${requested}:latest`
        || `${installed}:latest` === requested;
}

function isOllamaModelInstalled(modelId) {
    return installedOllamaModels.some(installed => ollamaModelMatches(installed, modelId));
}

function getOllamaModelAliases(modelId) {
    const id = normalizeModelId(modelId);
    if (!id) return [];
    const aliases = new Set([id]);
    if (id.endsWith(":latest")) {
        aliases.add(id.replace(/:latest$/, ""));
    } else if (!id.includes(":")) {
        aliases.add(`${id}:latest`);
    }
    return Array.from(aliases);
}

function getStaticOllamaModelOption(modelId) {
    return OLLAMA_CATALOG_MODEL_OPTIONS.find(option => ollamaModelMatches(option.id, modelId))
        || OLLAMA_CATALOG_MODEL_OPTIONS.find(option => ollamaModelMatches(modelId, option.id))
        || null;
}

function normalizeOllamaCapabilityToken(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function getOllamaShowCapabilities(showData = {}, baseOption = null) {
    const capabilities = new Set();
    const add = value => {
        const token = normalizeOllamaCapabilityToken(value);
        if (token) capabilities.add(token);
    };
    if (Array.isArray(showData.capabilities)) showData.capabilities.forEach(add);
    if (Array.isArray(baseOption?.capabilities)) baseOption.capabilities.forEach(add);
    return capabilities;
}

function getOllamaModelInfo(showData = {}) {
    return showData && typeof showData.model_info === "object" && showData.model_info
        ? showData.model_info
        : {};
}

function getOllamaFamilyText(modelId, showData = {}) {
    const details = showData && typeof showData.details === "object" && showData.details
        ? showData.details
        : {};
    const modelInfo = getOllamaModelInfo(showData);
    const families = Array.isArray(details.families) ? details.families : [];
    return [
        modelId,
        showData?.model,
        showData?.name,
        details.family,
        ...families,
        modelInfo["general.architecture"],
        modelInfo["general.type"]
    ].filter(Boolean).join(" ").toLowerCase();
}

function textMatchesAnyPattern(text, patterns = []) {
    return patterns.some(pattern => pattern.test(text));
}

function ollamaModelInfoLooksVisionCapable(modelInfo = {}) {
    return Object.keys(modelInfo).some(key => /(?:vision|clip|mmproj|projector|image|mllama)/i.test(key))
        || Object.values(modelInfo).some(value => typeof value === "string" && /(?:vision|clip|mllama)/i.test(value));
}

function getOllamaContextLength(showData = {}, baseOption = null) {
    const explicit = Number(baseOption?.contextLength || 0);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const modelInfo = getOllamaModelInfo(showData);
    const contextEntry = Object.entries(modelInfo).find(([key, value]) => /context[_-]?length$/i.test(key) && Number(value) > 0);
    if (contextEntry) return Number(contextEntry[1]);
    const parameters = String(showData?.parameters || "");
    const parameterMatch = parameters.match(/(?:^|\n)\s*num_ctx\s+(\d+)/i);
    return parameterMatch ? Number(parameterMatch[1]) : null;
}

function createOllamaModelCapabilityRecord(modelId, showData = {}, baseOption = null) {
    const id = normalizeModelId(modelId);
    const capabilities = getOllamaShowCapabilities(showData, baseOption);
    const hasShowCapabilities = Array.isArray(showData?.capabilities) && showData.capabilities.length > 0;
    const modelInfo = getOllamaModelInfo(showData);
    const familyText = getOllamaFamilyText(id, showData);
    const looksEmbeddingOnly = capabilities.has("embedding")
        || capabilities.has("embeddings")
        || (baseOption?.supportsCompletion !== true && textMatchesAnyPattern(familyText, OLLAMA_NON_CHAT_MODEL_PATTERNS));
    const supportsCompletion = capabilities.has("completion")
        || baseOption?.supportsCompletion === true
        || (!hasShowCapabilities && baseOption?.supportsCompletion !== false && !looksEmbeddingOnly);
    const hasVisionCapability = capabilities.has("vision")
        || baseOption?.supportsImageInput === true
        || ollamaModelInfoLooksVisionCapable(modelInfo);
    const inferredVision = !hasShowCapabilities && textMatchesAnyPattern(familyText, OLLAMA_VISION_MODEL_PATTERNS);
    const hasToolCapability = capabilities.has("tools")
        || capabilities.has("tool")
        || capabilities.has("function_calling")
        || capabilities.has("function-calling");
    const inferredTools = baseOption?.supportsToolCalling !== false
        && textMatchesAnyPattern(familyText, OLLAMA_TOOL_MODEL_PATTERNS);
    const supportsToolCalling = supportsCompletion
        && (hasToolCapability || baseOption?.supportsToolCalling === true || inferredTools);
    const supportsImageInput = supportsCompletion && (hasVisionCapability || inferredVision);
    const supportsThinking = capabilities.has("thinking")
        || capabilities.has("think")
        || baseOption?.supportsThinking === true
        || textMatchesAnyPattern(familyText, OLLAMA_THINKING_MODEL_PATTERNS);

    return {
        id,
        provider: AI_PROVIDER_LOCAL,
        inputModalities: supportsImageInput ? ["text", "image"] : ["text"],
        outputModalities: ["text"],
        capabilities: Array.from(capabilities),
        supportsStreaming: supportsCompletion,
        supportsTemperature: supportsCompletion,
        supportsMaxOutputTokens: supportsCompletion,
        supportsTopP: supportsCompletion,
        supportsTopK: supportsCompletion,
        supportsFileInput: supportsCompletion,
        supportsImageInput,
        supportsToolCalling,
        supportsThinking,
        supportsStructuredOutputs: supportsCompletion,
        fileInputCapabilities: supportsImageInput
            ? OLLAMA_VISION_FILE_INPUT_CAPABILITIES
            : OLLAMA_TEXT_FILE_INPUT_CAPABILITIES,
        supportedParameters: supportsCompletion ? OLLAMA_CHAT_PARAMETERS : [],
        contextLength: getOllamaContextLength(showData, baseOption)
    };
}

function setOllamaModelCapability(modelId, record, targetMap = ollamaModelCapabilities) {
    getOllamaModelAliases(modelId).forEach(alias => targetMap.set(alias, record));
}

function getOllamaModelCapability(modelId = OLLAMA_MODEL) {
    const id = normalizeModelId(modelId);
    for (const alias of getOllamaModelAliases(id)) {
        const cached = ollamaModelCapabilities.get(alias);
        if (cached) return cached;
    }
    return createOllamaModelCapabilityRecord(id, {}, getStaticOllamaModelOption(id));
}

async function fetchOllamaModelDetails(modelId) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), OLLAMA_SHOW_TIMEOUT_MS);
    try {
        const res = await fetch(OLLAMA_SHOW_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, verbose: false }),
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json().catch(() => ({}));
    } finally {
        window.clearTimeout(timeoutId);
    }
}

async function refreshOllamaModelCapabilities(modelIds = []) {
    const knownIds = Array.from(new Set([
        ...LOCAL_MODEL_OPTIONS.map(option => option.id),
        ...modelIds.map(normalizeModelId).filter(Boolean)
    ]));
    const nextCapabilities = new Map();

    knownIds.forEach(id => {
        const record = createOllamaModelCapabilityRecord(id, {}, getStaticOllamaModelOption(id));
        setOllamaModelCapability(id, record, nextCapabilities);
    });

    const detailIds = modelIds.map(normalizeModelId).filter(Boolean).slice(0, OLLAMA_CAPABILITY_DETAIL_LIMIT);
    await Promise.allSettled(detailIds.map(async id => {
        try {
            const details = await fetchOllamaModelDetails(id);
            const record = createOllamaModelCapabilityRecord(id, details, getStaticOllamaModelOption(id));
            setOllamaModelCapability(id, record, nextCapabilities);
        } catch {
            // Keep the fallback record when /api/show is unavailable for a specific model.
        }
    }));

    ollamaModelCapabilities = nextCapabilities;
}

function isLikelyOpenAiChatModelId(modelId) {
    return isLikelyChatModelId(modelId);
}

function getOpenAiChatModelOption(modelId) {
    return aiCapabilityRegistry.getModelOption(modelId);
}

function getOpenAiReasoningOptionsForModel(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.getReasoningOptions(modelId);
}

function openAiModelSupportsTemperature(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.getRecord(modelId)?.supportsTemperature === true
        || aiCapabilityRegistry.supportsParameter(modelId, "temperature");
}

function openAiModelSupportsStreaming(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.getRecord(modelId)?.supportsStreaming !== false;
}

function openAiModelSupportsMaxOutputTokens(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.supportsParameter(modelId, "max_output_tokens");
}

function openAiModelSupportsTopP(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.supportsParameter(modelId, "top_p");
}

function openAiModelSupportsVerbosity(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.supportsParameter(modelId, "text.verbosity")
        || aiCapabilityRegistry.supportsParameter(modelId, "verbosity");
}

function openAiModelSupportsImages(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.supportsImageInput(modelId)
        || aiCapabilityRegistry.supportsInputModality(modelId, "image");
}

function activeModelSupportsStreaming() {
    return isOpenAiProvider()
        ? openAiModelSupportsStreaming(getOpenAiChatModel())
        : getOllamaModelCapability().supportsStreaming === true;
}

function activeModelSupportsTemperature() {
    return isOpenAiProvider()
        ? openAiModelSupportsTemperature(getOpenAiChatModel())
        : getOllamaModelCapability().supportsTemperature === true;
}

function activeModelSupportsMaxOutputTokens() {
    return isOpenAiProvider()
        ? openAiModelSupportsMaxOutputTokens(getOpenAiChatModel())
        : getOllamaModelCapability().supportsMaxOutputTokens === true;
}

function activeModelSupportsTopP() {
    return isOpenAiProvider()
        ? openAiModelSupportsTopP(getOpenAiChatModel())
        : getOllamaModelCapability().supportsTopP === true;
}

function activeModelSupportsOllamaTopK() {
    return !isOpenAiProvider() && getOllamaModelCapability().supportsTopK === true;
}

function activeModelSupportsOpenAiVerbosity() {
    return isOpenAiProvider() && openAiModelSupportsVerbosity(getOpenAiChatModel());
}

function isAiStreamingActive() {
    return isAiStreamingEnabled && activeModelSupportsStreaming();
}

function getActiveComposerModelLabel() {
    return isOpenAiProvider() ? getOpenAiChatModel() : OLLAMA_MODEL;
}

function getOllamaOfflineErrorMessage() {
    return `Ollama is offline at ${OLLAMA_BASE_URL}. Start Ollama, click Check Ollama, or switch Fauna to OpenAI in Settings.`;
}

function isLikelyOllamaConnectionError(error) {
    const message = String(error?.message || error || "");
    return error instanceof TypeError ||
        /Failed to fetch|fetch failed|NetworkError|ERR_CONNECTION_REFUSED|Load failed/i.test(message);
}

function canUseComposerImageAttachments() {
    if (!isOpenAiProvider()) return getOllamaModelCapability().supportsImageInput === true;
    return openAiModelSupportsImages(getOpenAiChatModel());
}

function canUseComposerFileAttachments() {
    if (!isOpenAiProvider()) return getOllamaModelCapability().supportsFileInput === true;
    return aiCapabilityRegistry.supportsFileInput(getOpenAiChatModel());
}

function canUseComposerAttachments() {
    return canUseComposerImageAttachments() || canUseComposerFileAttachments();
}

function canUseComposerTools() {
    if (!isOpenAiProvider()) return getOllamaModelCapability().supportsToolCalling === true;
    return aiCapabilityRegistry.supportsToolCalling(getOpenAiChatModel());
}

function getLocalChatModelUnavailableReason(modelId = OLLAMA_MODEL) {
    if (isOpenAiProvider()) return "";
    const capability = getOllamaModelCapability(modelId);
    return capability.supportsStreaming === true
        ? ""
        : `${modelId} is not a chat-capable Ollama model. Choose a completion-capable model first.`;
}

function getUnsupportedAttachmentReason(file) {
    if (!(file instanceof File)) return "This attachment is not a supported file.";
    const modelLabel = getActiveComposerModelLabel();
    if (file.type?.startsWith("image/")) {
        return canUseComposerImageAttachments()
            ? ""
            : `${modelLabel} does not support image attachments. Choose a vision-capable chat model first.`;
    }
    return canUseComposerFileAttachments()
        ? ""
        : `${modelLabel} does not support file attachments. Choose a file-capable chat model first.`;
}

function getUnsupportedAttachmentFiles(files = []) {
    return Array.from(files || [])
        .map(file => ({ file, reason: getUnsupportedAttachmentReason(file) }))
        .filter(item => item.reason);
}

function showUnsupportedAttachmentToast(items = []) {
    if (!items.length) return;
    const imageCount = items.filter(item => item.file?.type?.startsWith("image/")).length;
    const fileCount = items.length - imageCount;
    const reason = items[0].reason;
    const parts = [];
    if (imageCount) parts.push(`${imageCount} image${imageCount === 1 ? "" : "s"}`);
    if (fileCount) parts.push(`${fileCount} file${fileCount === 1 ? "" : "s"}`);
    showToast(`${parts.join(" and ")} not attached. ${reason}`, "warning");
}

function updateComposerCapabilityUi() {
    const canAttach = canUseComposerAttachments();
    const canAttachImages = canUseComposerImageAttachments();
    const canAttachFiles = canUseComposerFileAttachments();
    const canUseTools = canUseComposerTools();
    const modelLabel = getActiveComposerModelLabel();
    const attachmentReason = `${modelLabel} cannot read attachments. Choose a file- or vision-capable model first.`;
    const toolReason = `${modelLabel} cannot call tools. Choose a tool-capable model first.`;

    if (fileInput) {
        const accepted = [
            canAttachImages ? "image/*" : "",
            canAttachFiles ? ".pdf,.txt,.md,.js,.py,.json,.csv" : ""
        ].filter(Boolean).join(",");
        fileInput.setAttribute("accept", accepted);
    }

    if (uploadButton) {
        uploadButton.disabled = !canAttach || isGenerating;
        uploadButton.classList.toggle("composer-control-unavailable", !canAttach);
        uploadButton.dataset.tooltip = canAttach ? "Attach" : attachmentReason;
        uploadButton.setAttribute("aria-label", canAttach ? "Attach" : attachmentReason);
    }

    [attachmentUploadFileButton, attachmentChooseLibraryButton].forEach(button => {
        if (!button) return;
        button.disabled = !canAttach || isGenerating;
        button.classList.toggle("composer-control-unavailable", !canAttach);
        button.dataset.tooltip = canAttach ? "" : attachmentReason;
    });

    if (!canAttach) {
        closeAttachmentMenu();
    }

    if (toolsBtn) {
        toolsBtn.disabled = !canUseTools || isGenerating;
        toolsBtn.classList.toggle("composer-control-unavailable", !canUseTools);
        toolsBtn.dataset.tooltip = canUseTools ? "Tools" : toolReason;
        toolsBtn.setAttribute("aria-label", canUseTools ? "Tools" : toolReason);
    }

    if (toolsDropdown) {
        toolsDropdown.classList.toggle("composer-tools-unavailable", !canUseTools);
        if (!canUseTools) toolsDropdown.classList.remove("open");
    }

    [toggleSandbox, toggleWebSearch, toggleGrounding, toggleGoogleGrounding, toggleApproxLocation, toggleWorkspaceBridge].forEach(control => {
        if (!control) return;
        control.disabled = !canUseTools || isGenerating;
    });
}

function setSettingsControlUnavailable(control, unavailable, reason = "") {
    if (!control) return;
    control.disabled = Boolean(unavailable);
    const container = control.closest?.(".settings-field-label") || control.closest?.(".settings-control-card");
    container?.classList.toggle("settings-control-unavailable", Boolean(unavailable));
    if (!Object.prototype.hasOwnProperty.call(control.dataset, "originalAriaLabel")) {
        control.dataset.originalAriaLabel = control.getAttribute("aria-label") || "";
    }
    const unavailableReason = unavailable ? reason : "";
    if (unavailableReason) {
        control.dataset.tooltip = unavailableReason;
        control.setAttribute("aria-label", unavailableReason);
    } else {
        delete control.dataset.tooltip;
        const originalLabel = control.dataset.originalAriaLabel;
        if (originalLabel) {
            control.setAttribute("aria-label", originalLabel);
        } else {
            control.removeAttribute("aria-label");
        }
    }
}

function setSettingStatus(node, text, unavailable = false) {
    if (!node) return;
    node.textContent = text;
    node.dataset.state = unavailable ? "missing" : "configured";
}

function getActiveModelCapabilityReason(settingName) {
    return `${getActiveComposerModelLabel()} does not support ${settingName}.`;
}

function updateAiCallSettingsUi() {
    const streamingSupported = activeModelSupportsStreaming();
    const temperatureSupported = activeModelSupportsTemperature();
    const maxTokensSupported = activeModelSupportsMaxOutputTokens();
    const topPSupported = activeModelSupportsTopP();
    const topKSupported = activeModelSupportsOllamaTopK();
    const verbositySupported = activeModelSupportsOpenAiVerbosity();

    if (toggleAiStreaming) {
        toggleAiStreaming.checked = streamingSupported && isAiStreamingEnabled;
        setSettingsControlUnavailable(toggleAiStreaming, !streamingSupported, "Streaming is not supported by the active model.");
    }
    setSettingStatus(
        aiStreamingStatus,
        streamingSupported
            ? "Stream supported model replies as they arrive."
            : "Streaming is unavailable for the active model.",
        !streamingSupported
    );

    if (paramTemp) {
        paramTemp.value = String(activeTemperature);
        setSettingsControlUnavailable(paramTemp, !temperatureSupported, getActiveModelCapabilityReason("temperature"));
    }
    if (tempValue) tempValue.textContent = activeTemperature.toFixed(1);
    setSettingStatus(
        temperatureStatus,
        temperatureSupported
            ? "Default sampling temperature for supported chat calls."
            : "Temperature is unavailable for the active model.",
        !temperatureSupported
    );

    if (maxOutputTokensInput) {
        maxOutputTokensInput.value = String(activeMaxOutputTokens);
        setSettingsControlUnavailable(maxOutputTokensInput, !maxTokensSupported, getActiveModelCapabilityReason("max output tokens"));
    }
    if (topPInput) {
        topPInput.value = String(activeTopP);
        setSettingsControlUnavailable(topPInput, !topPSupported, getActiveModelCapabilityReason("top P"));
    }
    if (ollamaTopKInput) {
        ollamaTopKInput.value = String(activeOllamaTopK);
        setSettingsControlUnavailable(
            ollamaTopKInput,
            !topKSupported,
            isOpenAiProvider() ? "Top K is only used for local Ollama calls." : getActiveModelCapabilityReason("Top K")
        );
    }
    setSettingStatus(
        aiOutputLimitsStatus,
        isOpenAiProvider()
            ? "OpenAI uses max output tokens and supported sampling controls."
            : "Ollama uses num_predict, top_p, and top_k.",
        !(maxTokensSupported || topPSupported || topKSupported)
    );

    openAiVerbosityButtons.forEach(button => {
        const isActive = button.dataset.aiVerbosity === activeOpenAiVerbosity;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
        button.disabled = !verbositySupported;
        button.classList.toggle("settings-control-unavailable", !verbositySupported);
    });
    setSettingStatus(
        openAiVerbosityStatus,
        verbositySupported
            ? "Controls OpenAI response detail for this model."
            : "Verbosity is unavailable for the active model.",
        !verbositySupported
    );
}

function getActiveChatRequestOptions() {
    const options = {};

    if (activeModelSupportsTemperature()) {
        options.temperature = activeTemperature;
    }

    if (activeModelSupportsMaxOutputTokens() && activeMaxOutputTokens > 0) {
        if (isOpenAiProvider()) {
            options.max_output_tokens = activeMaxOutputTokens;
        } else {
            options.num_predict = activeMaxOutputTokens;
        }
    }

    if (activeModelSupportsTopP()) {
        options.top_p = activeTopP;
    }

    if (activeModelSupportsOllamaTopK() && activeOllamaTopK > 0) {
        options.top_k = activeOllamaTopK;
    }

    if (activeModelSupportsOpenAiVerbosity()) {
        options.text_verbosity = activeOpenAiVerbosity;
    }

    return options;
}

function appendUniqueMetaPart(parts, part) {
    const value = String(part || "").trim();
    if (!value) return;
    if (parts.some(existing => existing.toLowerCase() === value.toLowerCase())) return;
    parts.push(value);
}

function getOllamaCapabilityMetaParts(capability = {}) {
    const parts = [];
    if (capability.supportsStreaming === false) appendUniqueMetaPart(parts, "No chat");
    if (capability.supportsImageInput) appendUniqueMetaPart(parts, "Vision");
    if (capability.supportsToolCalling) appendUniqueMetaPart(parts, "Tools");
    if (capability.supportsThinking) appendUniqueMetaPart(parts, "Thinking");
    return parts;
}

function getLocalModelMeta(option, installed, capability) {
    const parts = [];
    appendUniqueMetaPart(parts, option?.meta);
    appendUniqueMetaPart(parts, installed ? "Installed" : "Missing");
    getOllamaCapabilityMetaParts(capability).forEach(part => appendUniqueMetaPart(parts, part));
    return parts.join(" · ");
}

function getLocalModelSwitcherOptions() {
    const known = new Map();
    [...LOCAL_MODEL_OPTIONS, ...installedOllamaModels.map(id => ({ id, label: id, meta: "Installed", provider: AI_PROVIDER_LOCAL }))]
        .forEach(option => {
            const id = normalizeModelId(option.id);
            if (!id || known.has(id)) return;
            const installed = isOllamaModelInstalled(id);
            const capability = getOllamaModelCapability(id);
            known.set(id, {
                ...option,
                id,
                label: option.label || id,
                meta: getLocalModelMeta(option, installed, capability),
                state: installed ? (capability.supportsStreaming === false ? "unavailable" : "installed") : "missing",
                provider: AI_PROVIDER_LOCAL
            });
        });
    return Array.from(known.values());
}

function getOpenAiModelSwitcherOptions() {
    const activeModel = getOpenAiChatModel();
    const options = aiCapabilityRegistry.getChatModelOptions({
        provider: AI_PROVIDER_OPENAI,
        availableIds: availableOpenAiModelIds
    });
    if (
        activeModel
        && isLikelyOpenAiChatModelId(activeModel)
        && (!availableOpenAiModelIds || availableOpenAiModelIds.has(activeModel))
        && !options.some(option => option.id === activeModel)
    ) {
        options.unshift({
            id: activeModel,
            label: activeModel,
            meta: "Saved",
            provider: AI_PROVIDER_OPENAI,
            reasoningModes: []
        });
    }
    return availableOpenAiModelIds ? options : OPENAI_CHAT_MODEL_OPTIONS;
}

function readCachedOpenRouterCapabilities() {
    try {
        const payload = JSON.parse(safeLocalStorageGet(OPENROUTER_MODEL_CAPABILITIES_STORAGE_KEY) || "{}");
        const ageMs = Date.now() - Number(payload.updatedAt || 0);
        if (!Array.isArray(payload.models) || ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) return null;
        return payload.models;
    } catch {
        return null;
    }
}

function applyOpenRouterCapabilities(models) {
    if (!Array.isArray(models) || models.length === 0) return;
    aiCapabilityRegistry.ingestOpenRouterModels(models);
    updateModelSwitcherForProvider();
    updateOpenAiModelSelects();
}

async function refreshOpenRouterCapabilities() {
    applyOpenRouterCapabilities(readCachedOpenRouterCapabilities());

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6500);
    try {
        const models = await fetchOpenRouterModelCatalog({ signal: controller.signal });
        const compactModels = compactOpenRouterModels(models);
        safeLocalStorageSet(OPENROUTER_MODEL_CAPABILITIES_STORAGE_KEY, JSON.stringify({
            updatedAt: Date.now(),
            models: compactModels
        }));
        applyOpenRouterCapabilities(compactModels);
    } catch {
        // Capability metadata is optional; Fauna keeps using its built-in catalog when OpenRouter is unavailable.
    } finally {
        window.clearTimeout(timeout);
    }
}

function setLocalModelsStatus(text, state = "missing") {
    if (!localModelsStatus) return;
    localModelsStatus.textContent = text;
    localModelsStatus.dataset.state = state;
}

function updateLocalInstallButton() {
    if (!localModelsInstallBtn) return;
    if (!isOllamaReachable) {
        localModelsInstallBtn.textContent = "Install Ollama";
        return;
    }
    const missingCount = REQUIRED_OLLAMA_MODELS.filter(model => !isOllamaModelInstalled(model)).length;
    localModelsInstallBtn.textContent = missingCount > 0 ? "Install missing" : "All installed";
}

function isOpenAiProvider() {
    return activeAiProvider === AI_PROVIDER_OPENAI;
}

function updateAiCachingUi() {
    if (aiCachingToggle) {
        aiCachingToggle.setAttribute("aria-pressed", String(isAiCachingEnabled));
        aiCachingToggle.classList.toggle("active", isAiCachingEnabled);
        aiCachingToggle.dataset.tooltip = isAiCachingEnabled
            ? "AI caching is on"
            : "Turn on caching";
    }
    if (aiCachingToggleLabel) {
        aiCachingToggleLabel.textContent = isAiCachingEnabled ? "Caching on" : "Turn on";
    }
    if (aiCachingStatus) {
        aiCachingStatus.textContent = isAiCachingEnabled
            ? "On for supported text, image, and voice calls."
            : "Off";
        aiCachingStatus.dataset.state = isAiCachingEnabled ? "configured" : "missing";
    }
}

function setAiCachingEnabled(enabled, { persist = true, notify = false } = {}) {
    isAiCachingEnabled = Boolean(enabled);
    if (persist) {
        safeLocalStorageSet(AI_CACHING_STORAGE_KEY, isAiCachingEnabled ? "true" : "false");
    }
    updateAiCachingUi();
    if (notify) {
        showToast(isAiCachingEnabled ? "AI caching enabled." : "AI caching disabled.", isAiCachingEnabled ? "success" : "info");
    }
}

function getOpenAiPromptCacheKey(seed = "") {
    const model = getOpenAiChatModel();
    const stableSeed = String(seed || buildPersonalizationSystemPrompt() || "default").slice(0, 12000);
    return `fauna:${model}:${getStableSpeechTextHash(stableSeed)}`;
}

function applyOpenAiPromptCaching(payload, seed = "") {
    if (!isAiCachingEnabled || !payload || typeof payload !== "object") return payload;
    payload.prompt_cache_key = getOpenAiPromptCacheKey(seed || payload.instructions || payload.model);
    payload.prompt_cache_retention = OPENAI_PROMPT_CACHE_RETENTION;
    return payload;
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
    updateTokenDisplay();
}

function getOpenAiApiKey() {
    return (safeLocalStorageGet(OPENAI_API_KEY_STORAGE_KEY) || "").trim();
}

function hasOpenAiVoiceSetup() {
    return Boolean(getOpenAiApiKey() && hasWorkspaceBridgeAccess());
}

function getOpenAiVoiceSetupReason() {
    if (!getOpenAiApiKey()) return "Add an OpenAI API key to unlock voice settings.";
    if (!hasWorkspaceBridgeAccess()) return "Enable the Local Workspace Bridge to unlock voice settings.";
    return "";
}

function getOpenAiChatModel() {
    const saved = normalizeModelId(safeLocalStorageGet(OPENAI_CHAT_MODEL_STORAGE_KEY));
    const model = isLikelyOpenAiChatModelId(saved) ? saved : DEFAULT_OPENAI_CHAT_MODEL;
    if (availableOpenAiModelIds && !availableOpenAiModelIds.has(model)) {
        return OPENAI_CHAT_MODEL_OPTIONS.find(option => availableOpenAiModelIds.has(option.id))?.id
            || DEFAULT_OPENAI_CHAT_MODEL;
    }
    return model;
}

function normalizeOpenAiReasoningMode(value, model = getOpenAiChatModel()) {
    return aiCapabilityRegistry.normalizeReasoningMode(value, model, DEFAULT_OPENAI_REASONING_MODE);
}

function getOpenAiReasoningMode(model = getOpenAiChatModel()) {
    return normalizeOpenAiReasoningMode(safeLocalStorageGet(OPENAI_REASONING_MODE_STORAGE_KEY), model);
}

function getOpenAiReasoningModeOption(mode = getOpenAiReasoningMode(), model = getOpenAiChatModel()) {
    const options = getOpenAiReasoningOptionsForModel(model);
    const normalized = normalizeOpenAiReasoningMode(mode, model);
    return options.find(option => option.id === normalized) || null;
}

function setOpenAiReasoningMode(mode, { persist = true } = {}) {
    const option = getOpenAiReasoningModeOption(mode);
    if (!option) {
        if (persist) safeLocalStorageRemove(OPENAI_REASONING_MODE_STORAGE_KEY);
        modelSwitcher?.setActiveReasoning?.("");
        return;
    }
    if (persist) safeLocalStorageSet(OPENAI_REASONING_MODE_STORAGE_KEY, option.id);
    modelSwitcher?.setActiveReasoning?.(option.id);
}

function getReasoningLabelForMessage(model = getCurrentModelLabel()) {
    if (isOpenAiProvider()) {
        const option = getOpenAiReasoningModeOption(getOpenAiReasoningMode(model), model);
        return option?.label || option?.id || "";
    }
    return normalizeModelId(model) === MODEL_ROUTES.reasoning ? "Local reasoning" : "";
}

function shouldSendOpenAiReasoningEffort(model) {
    return getOpenAiReasoningOptionsForModel(model).length > 0;
}

function getOpenAiImageModel() {
    return normalizeOpenAiCatalogModelForKinds(
        safeLocalStorageGet(OPENAI_IMAGE_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_IMAGE_MODEL,
        OPENAI_IMAGE_MODEL_OPTIONS,
        DEFAULT_OPENAI_IMAGE_MODEL,
        ["Image"]
    );
}

function normalizeOpenAiListedModel(value, options, fallback) {
    const model = normalizeModelId(value);
    return options.some(option => option.id === model) ? model : fallback;
}

function getOpenAiCatalogRecordById(modelId) {
    const id = normalizeModelId(modelId);
    if (!id) return null;
    return getOpenAiCatalogModels().find(model => model.id === id) || null;
}

function getActiveModelCatalogRecordById(modelId) {
    const id = normalizeModelId(modelId);
    if (!id) return null;
    const models = openAiCatalogProvider === AI_PROVIDER_LOCAL
        ? getOllamaCatalogModels()
        : getOpenAiCatalogModels();
    return models.find(model => model.id === id) || null;
}

function normalizeOpenAiCatalogModelForKinds(value, options, fallback, allowedKinds = []) {
    const model = normalizeModelId(value);
    if (!model) return fallback;
    if (options.some(option => option.id === model)) return model;
    const record = getOpenAiCatalogRecordById(model);
    return record && allowedKinds.includes(record.kind) ? model : fallback;
}

function mergeCatalogOptions(baseOptions = [], allowedKinds = []) {
    const options = new Map();
    baseOptions.forEach(option => {
        if (!option?.id || options.has(option.id)) return;
        options.set(option.id, option);
    });
    getOpenAiCatalogModels()
        .filter(model => allowedKinds.includes(model.kind))
        .forEach(model => {
            if (options.has(model.id)) return;
            options.set(model.id, {
                id: model.id,
                label: model.label || model.id,
                meta: model.meta || model.kind,
                provider: AI_PROVIDER_OPENAI
            });
        });
    return Array.from(options.values());
}

function getOpenAiImageModelOptions() {
    return mergeCatalogOptions(OPENAI_IMAGE_MODEL_OPTIONS, ["Image"]);
}

function getOpenAiTranscriptionModelOptions() {
    return mergeCatalogOptions(OPENAI_TRANSCRIPTION_MODEL_OPTIONS, ["Transcription"]);
}

function getOpenAiRealtimeModelOptions() {
    return mergeCatalogOptions(OPENAI_REALTIME_MODEL_OPTIONS, ["Realtime"]);
}

function getLocalVoiceTranscription() {
    return normalizeOpenAiListedModel(
        safeLocalStorageGet(LOCAL_VOICE_TRANSCRIPTION_STORAGE_KEY) || DEFAULT_LOCAL_VOICE_TRANSCRIPTION,
        LOCAL_VOICE_TRANSCRIPTION_OPTIONS,
        DEFAULT_LOCAL_VOICE_TRANSCRIPTION
    );
}

function getLocalVoiceTranscriptionEndpoint() {
    return (safeLocalStorageGet(LOCAL_VOICE_TRANSCRIPTION_ENDPOINT_STORAGE_KEY) || DEFAULT_LOCAL_VOICE_TRANSCRIPTION_ENDPOINT).trim();
}

function getLocalVoiceTranscriptionModel() {
    return (safeLocalStorageGet(LOCAL_VOICE_TRANSCRIPTION_MODEL_STORAGE_KEY) || DEFAULT_LOCAL_VOICE_TRANSCRIPTION_MODEL).trim();
}

function getLocalVoiceReplyModel() {
    return normalizeOpenAiListedModel(
        safeLocalStorageGet(LOCAL_VOICE_REPLY_MODEL_STORAGE_KEY) || DEFAULT_LOCAL_VOICE_REPLY_MODEL,
        LOCAL_VOICE_REPLY_MODEL_OPTIONS,
        DEFAULT_LOCAL_VOICE_REPLY_MODEL
    );
}

function getLocalVoiceReplyEndpoint() {
    return (safeLocalStorageGet(LOCAL_VOICE_REPLY_ENDPOINT_STORAGE_KEY) || DEFAULT_LOCAL_VOICE_REPLY_ENDPOINT).trim();
}

function shouldUseLocalVoiceTranscription() {
    return !isOpenAiProvider() && getLocalVoiceTranscription() === LOCAL_VOICE_TRANSCRIPTION_WHISPER;
}

function shouldUseLocalVoiceReplyModel() {
    return !isOpenAiProvider() && getLocalVoiceReplyModel() !== LOCAL_VOICE_REPLY_BROWSER;
}

function getOpenAiTranscriptionModel() {
    return normalizeOpenAiCatalogModelForKinds(
        safeLocalStorageGet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
        OPENAI_TRANSCRIPTION_MODEL_OPTIONS,
        DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
        ["Transcription"]
    );
}

function getOpenAiSpeechModel() {
    return (safeLocalStorageGet(OPENAI_SPEECH_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_SPEECH_MODEL).trim();
}

function getOpenAiRealtimeModel() {
    return normalizeOpenAiCatalogModelForKinds(
        safeLocalStorageGet(OPENAI_REALTIME_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_REALTIME_MODEL,
        OPENAI_REALTIME_MODEL_OPTIONS,
        DEFAULT_OPENAI_REALTIME_MODEL,
        ["Realtime"]
    );
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

function removeVoiceSwatchClasses(element) {
    if (!element?.classList) return;
    Array.from(element.classList)
        .filter(className => className.startsWith("voice-swatch-"))
        .forEach(className => element.classList.remove(className));
}

function applyVoiceThemeToElement(element, option) {
    if (!element?.classList || !option) return;
    removeVoiceSwatchClasses(element);
    element.classList.add(option.swatch);
    element.style.setProperty("--voice-orb-accent", option.color);
}

function applyActiveVoiceOrbTheme(voice = getOpenAiVoice()) {
    const option = getOpenAiVoiceOption(voice);
    document.body?.style.setProperty("--active-voice-orb-accent", option.color);
    if (document.body) document.body.dataset.openAiVoice = option.id;
    applyVoiceThemeToElement(voiceOrb, option);
    applyVoiceThemeToElement(voiceAgentOrb, option);
}

function buildOpenAiRealtimeSessionUpdateConfig() {
    return {
        type: "realtime",
        audio: {
            output: {
                voice: getOpenAiVoice()
            }
        }
    };
}

function sendOpenAiRealtimeVoiceUpdate() {
    if (!isOpenAiVoiceSessionActive || openAiRealtimeDataChannel?.readyState !== "open") return false;
    try {
        openAiRealtimeDataChannel.send(JSON.stringify({
            type: "session.update",
            session: buildOpenAiRealtimeSessionUpdateConfig()
        }));
        return true;
    } catch (err) {
        console.warn("Could not update Realtime voice:", err);
        return false;
    }
}

function applyOpenAiRealtimeVoiceChange() {
    if (!isOpenAiVoiceSessionActive) return;
    if (openAiRealtimeVoiceOutputStarted) {
        void restartOpenAiRealtimeVoiceSessionForVoiceChange();
        return;
    }
    sendOpenAiRealtimeVoiceUpdate();
}

async function restartOpenAiRealtimeVoiceSessionForVoiceChange() {
    if (openAiRealtimeVoiceRestartPromise) return openAiRealtimeVoiceRestartPromise;
    openAiRealtimeVoiceRestartPromise = (async () => {
        const restoreMicMuted = isVoiceMicMuted;
        setVoiceSessionStatus("Switching voice", 0.26);
        stopOpenAiVoiceSession({ silent: true });
        await startOpenAiRealtimeVoiceSession();
        if (restoreMicMuted) setVoiceMicMuted(true);
        showToast("AI voice switched.", "success");
    })().catch(err => {
        showToast(`Could not switch AI voice: ${err.message}`, "error");
    }).finally(() => {
        openAiRealtimeVoiceRestartPromise = null;
    });
    return openAiRealtimeVoiceRestartPromise;
}

function setOpenAiVoice(voice, { persist = true } = {}) {
    const option = getOpenAiVoiceOption(String(voice || "").trim().toLowerCase());
    if (activeVoicePreviewId && activeVoicePreviewId !== option.id) {
        stopVoicePreview();
    }
    if (persist) {
        safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, option.id);
    }
    if (openAiVoiceInput) openAiVoiceInput.value = option.id;
    updateVoicePickerUi(option.id);
    applyOpenAiRealtimeVoiceChange();
    updateVoiceQuickUi();
}

function getOpenAiSettingsChatModelOptions() {
    const activeModel = getOpenAiChatModel();
    const options = getOpenAiModelSwitcherOptions();
    if (
        activeModel
        && isLikelyOpenAiChatModelId(activeModel)
        && !options.some(option => option.id === activeModel)
    ) {
        return [
            { id: activeModel, label: activeModel, meta: "Saved", provider: AI_PROVIDER_OPENAI },
            ...options
        ];
    }
    return options;
}

function closeOpenAiModelSelects(except = null) {
    [
        openAiChatModelSelect,
        openAiImageModelSelect,
        openAiTranscriptionModelSelect,
        openAiRealtimeModelSelect,
        localVoiceTranscriptionSelect,
        localVoiceReplyModelSelect
    ].forEach(select => {
        if (select && select !== except) select.close();
    });
}

function createOpenAiModelSelect({
    host,
    input,
    options,
    value,
    label = "OpenAI model",
    storageKey,
    fallback,
    onChange = null,
    persistOnChange = Boolean(storageKey)
} = {}) {
    if (!host || !Array.isArray(options) || options.length === 0) return null;
    let currentOptions = [...options];

    const select = document.createElement("div");
    select.className = "settings-model-select";

    const button = document.createElement("button");
    button.className = "settings-model-select-button";
    button.type = "button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", `Choose ${label}`);

    const valueLabel = document.createElement("span");
    valueLabel.className = "settings-model-select-value";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.classList.add("settings-model-select-chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("stroke", "currentColor");
    chevron.setAttribute("stroke-width", "2.4");
    chevron.setAttribute("stroke-linecap", "round");
    chevron.setAttribute("stroke-linejoin", "round");
    chevron.setAttribute("aria-hidden", "true");
    const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    chevronPath.setAttribute("d", "m6 9 6 6 6-6");
    chevron.appendChild(chevronPath);

    button.append(valueLabel, chevron);

    const list = document.createElement("div");
    list.className = "settings-model-select-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", label);

    const normalizeValue = model => normalizeOpenAiListedModel(model, currentOptions, fallback || currentOptions[0]?.id || "");
    let activeValue = normalizeValue(value);

    const getOptionButtons = () => Array.from(list.querySelectorAll(".settings-model-select-option"));
    const getOption = model => currentOptions.find(option => option.id === model) || currentOptions[0];

    const setOpen = isOpen => {
        if (isOpen) closeOpenAiModelSelects(api);
        select.classList.toggle("open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
    };

    const setValue = nextValue => {
        activeValue = normalizeValue(nextValue);
        if (input) input.value = activeValue;
        valueLabel.textContent = getOption(activeValue)?.label || activeValue;
        getOptionButtons().forEach(optionButton => {
            const isActive = optionButton.dataset.model === activeValue;
            optionButton.classList.toggle("active", isActive);
            optionButton.setAttribute("aria-selected", String(isActive));
        });
    };

    const chooseValue = nextValue => {
        const model = normalizeValue(nextValue);
        setValue(model);
        if (storageKey && persistOnChange) safeLocalStorageSet(storageKey, model);
        if (typeof onChange === "function") onChange(model);
        setOpen(false);
        button.focus();
    };

    const renderOptions = (nextOptions = currentOptions, nextValue = activeValue) => {
        currentOptions = Array.isArray(nextOptions) && nextOptions.length > 0 ? [...nextOptions] : currentOptions;
        activeValue = normalizeValue(nextValue);
        list.replaceChildren();
        let currentGroup = "";
        currentOptions.forEach(option => {
            if (option.group && option.group !== currentGroup) {
                currentGroup = option.group;
                const heading = document.createElement("div");
                heading.className = "settings-model-select-group";
                heading.textContent = currentGroup;
                list.appendChild(heading);
            }

            const optionButton = document.createElement("button");
            optionButton.className = "settings-model-select-option";
            optionButton.type = "button";
            optionButton.dataset.model = option.id;
            optionButton.setAttribute("role", "option");
            optionButton.setAttribute("aria-selected", "false");

            const check = document.createElement("span");
            check.className = "settings-model-select-check";
            check.setAttribute("aria-hidden", "true");

            const optionLabel = document.createElement("span");
            optionLabel.className = "settings-model-select-option-label";
            optionLabel.textContent = option.label || option.id;

            optionButton.append(check, optionLabel);
            optionButton.addEventListener("click", () => chooseValue(option.id));
            list.appendChild(optionButton);
        });
        setValue(activeValue);
    };

    button.addEventListener("click", event => {
        event.stopPropagation();
        setOpen(!select.classList.contains("open"));
    });

    button.addEventListener("keydown", event => {
        if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
        event.preventDefault();
        setOpen(true);
        const activeOption = list.querySelector(".settings-model-select-option.active") || getOptionButtons()[0];
        activeOption?.focus();
    });

    list.addEventListener("keydown", event => {
        const optionButtons = getOptionButtons();
        const currentIndex = optionButtons.indexOf(document.activeElement);
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            button.focus();
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextIndex = currentIndex < 0
                ? 0
                : (currentIndex + direction + optionButtons.length) % optionButtons.length;
            optionButtons[nextIndex]?.focus();
            return;
        }
        if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            optionButtons[event.key === "Home" ? 0 : optionButtons.length - 1]?.focus();
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            document.activeElement?.click();
        }
    });

    document.addEventListener("click", event => {
        if (!select.contains(event.target)) setOpen(false);
    });

    select.append(button, list);
    host.replaceChildren(select);
    const api = {
        setValue,
        setOptions: (nextOptions, nextValue = activeValue) => renderOptions(nextOptions, nextValue),
        close: () => setOpen(false)
    };
    renderOptions();
    return api;
}

function renderOpenAiModelSelects() {
    openAiChatModelSelect = createOpenAiModelSelect({
        host: openAiChatModelSelectHost,
        input: openAiChatModelInput,
        options: getOpenAiSettingsChatModelOptions(),
        value: getOpenAiChatModel(),
        label: "OpenAI chat model",
        storageKey: OPENAI_CHAT_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_CHAT_MODEL,
        persistOnChange: false,
        onChange: () => {
            updateOpenAiSaveButtonState();
        }
    });
    openAiImageModelSelect = createOpenAiModelSelect({
        host: openAiImageModelSelectHost,
        input: openAiImageModelInput,
        options: getOpenAiImageModelOptions(),
        value: getOpenAiImageModel(),
        label: "OpenAI image model",
        storageKey: OPENAI_IMAGE_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_IMAGE_MODEL,
        persistOnChange: false,
        onChange: updateOpenAiSaveButtonState
    });
    openAiTranscriptionModelSelect = createOpenAiModelSelect({
        host: openAiTranscriptionModelSelectHost,
        input: openAiTranscriptionModelInput,
        options: getOpenAiTranscriptionModelOptions(),
        value: getOpenAiTranscriptionModel(),
        label: "OpenAI transcription model",
        storageKey: OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
        persistOnChange: false,
        onChange: updateOpenAiSaveButtonState
    });
    openAiRealtimeModelSelect = createOpenAiModelSelect({
        host: openAiRealtimeModelSelectHost,
        input: openAiRealtimeModelInput,
        options: getOpenAiRealtimeModelOptions(),
        value: getOpenAiRealtimeModel(),
        label: "OpenAI voice model",
        storageKey: OPENAI_REALTIME_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_REALTIME_MODEL
    });
}

function renderLocalVoiceModelSelects() {
    localVoiceTranscriptionSelect = createOpenAiModelSelect({
        host: localVoiceTranscriptionSelectHost,
        input: localVoiceTranscriptionInput,
        options: LOCAL_VOICE_TRANSCRIPTION_OPTIONS,
        value: getLocalVoiceTranscription(),
        label: "local transcription",
        storageKey: LOCAL_VOICE_TRANSCRIPTION_STORAGE_KEY,
        fallback: DEFAULT_LOCAL_VOICE_TRANSCRIPTION,
        onChange: () => {
            updateLocalVoiceSettingsUi();
            updateVoiceButtonAvailability();
        }
    });
    localVoiceReplyModelSelect = createOpenAiModelSelect({
        host: localVoiceReplyModelSelectHost,
        input: localVoiceReplyModelInput,
        options: LOCAL_VOICE_REPLY_MODEL_OPTIONS,
        value: getLocalVoiceReplyModel(),
        label: "local voice reply model",
        storageKey: LOCAL_VOICE_REPLY_MODEL_STORAGE_KEY,
        fallback: DEFAULT_LOCAL_VOICE_REPLY_MODEL,
        onChange: () => {
            updateLocalVoiceSettingsUi();
            updateVoiceQuickUi();
        }
    });
}

function updateLocalVoiceSettingsUi() {
    if (localVoiceTranscriptionInput) localVoiceTranscriptionInput.value = getLocalVoiceTranscription();
    if (localVoiceReplyModelInput) localVoiceReplyModelInput.value = getLocalVoiceReplyModel();
    if (localVoiceTranscriptionEndpointInput) localVoiceTranscriptionEndpointInput.value = getLocalVoiceTranscriptionEndpoint();
    if (localVoiceTranscriptionModelInput) localVoiceTranscriptionModelInput.value = getLocalVoiceTranscriptionModel();
    if (localVoiceReplyEndpointInput) localVoiceReplyEndpointInput.value = getLocalVoiceReplyEndpoint();

    localVoiceTranscriptionSelect?.setOptions(LOCAL_VOICE_TRANSCRIPTION_OPTIONS, getLocalVoiceTranscription());
    localVoiceReplyModelSelect?.setOptions(LOCAL_VOICE_REPLY_MODEL_OPTIONS, getLocalVoiceReplyModel());

    const usesWhisper = getLocalVoiceTranscription() === LOCAL_VOICE_TRANSCRIPTION_WHISPER;
    const usesLocalReply = getLocalVoiceReplyModel() !== LOCAL_VOICE_REPLY_BROWSER;
    localVoiceTranscriptionEndpointInput?.closest(".settings-field-label")?.classList.toggle("settings-field-muted", !usesWhisper);
    localVoiceTranscriptionModelInput?.closest(".settings-field-label")?.classList.toggle("settings-field-muted", !usesWhisper);
    localVoiceReplyEndpointInput?.closest(".settings-field-label")?.classList.toggle("settings-field-muted", !usesLocalReply);
}

function updateOpenAiModelSelects() {
    if (openAiTranscriptionModelInput) openAiTranscriptionModelInput.value = getOpenAiTranscriptionModel();
    if (openAiRealtimeModelInput) openAiRealtimeModelInput.value = getOpenAiRealtimeModel();
    if (openAiChatModelInput) openAiChatModelInput.value = getOpenAiChatModel();
    if (openAiImageModelInput) openAiImageModelInput.value = getOpenAiImageModel();
    openAiChatModelSelect?.setOptions(getOpenAiSettingsChatModelOptions(), getOpenAiChatModel());
    openAiImageModelSelect?.setOptions(getOpenAiImageModelOptions(), getOpenAiImageModel());
    openAiTranscriptionModelSelect?.setOptions(getOpenAiTranscriptionModelOptions(), getOpenAiTranscriptionModel());
    openAiRealtimeModelSelect?.setOptions(getOpenAiRealtimeModelOptions(), getOpenAiRealtimeModel());
    updateOpenAiSaveButtonState();
}

function persistLocalVoiceInput(input, storageKey, fallback) {
    const value = (input?.value || "").trim() || fallback;
    safeLocalStorageSet(storageKey, value);
    if (input) input.value = value;
    updateVoiceButtonAvailability();
}

function setSettingsSaveButtonState(button, isDirty) {
    if (!button) return;
    button.disabled = !isDirty;
    button.classList.toggle("settings-save-dirty", isDirty);
    button.classList.toggle("settings-save-clean", !isDirty);
    button.setAttribute("aria-disabled", String(!isDirty));
}

function normalizeEndpointInputValue(value, fallback) {
    return (String(value || fallback || "").trim().replace(/\/+$/, "") || fallback || "").trim();
}

function getPendingOpenAiSettings() {
    const chatModel = normalizeModelId(openAiChatModelInput?.value || DEFAULT_OPENAI_CHAT_MODEL);
    return {
        key: (openAiApiKeyInput?.value || "").trim(),
        chatModel: isLikelyOpenAiChatModelId(chatModel) ? chatModel : DEFAULT_OPENAI_CHAT_MODEL,
        imageModel: normalizeOpenAiCatalogModelForKinds(openAiImageModelInput?.value, OPENAI_IMAGE_MODEL_OPTIONS, DEFAULT_OPENAI_IMAGE_MODEL, ["Image"]),
        transcriptionModel: normalizeOpenAiCatalogModelForKinds(openAiTranscriptionModelInput?.value, OPENAI_TRANSCRIPTION_MODEL_OPTIONS, DEFAULT_OPENAI_TRANSCRIPTION_MODEL, ["Transcription"]),
        realtimeModel: normalizeOpenAiCatalogModelForKinds(openAiRealtimeModelInput?.value, OPENAI_REALTIME_MODEL_OPTIONS, DEFAULT_OPENAI_REALTIME_MODEL, ["Realtime"])
    };
}

function updateOpenAiSaveButtonState() {
    const pending = getPendingOpenAiSettings();
    const isDirty = pending.key !== getOpenAiApiKey()
        || pending.chatModel !== getOpenAiChatModel()
        || pending.imageModel !== getOpenAiImageModel()
        || pending.transcriptionModel !== getOpenAiTranscriptionModel()
        || pending.realtimeModel !== getOpenAiRealtimeModel();
    setSettingsSaveButtonState(openAiSaveBtn, isDirty);
}

function updateWanSaveButtonState() {
    const pendingEndpoint = normalizeEndpointInputValue(wanEndpointInput?.value, DEFAULT_WAN_VIDEO_BASE_URL);
    const pendingWorkflow = (wanWorkflowInput?.value || "").trim();
    const isDirty = pendingEndpoint !== getWanVideoBaseUrl()
        || pendingWorkflow !== (safeLocalStorageGet(WAN_VIDEO_WORKFLOW_STORAGE_KEY) || "").trim();
    setSettingsSaveButtonState(wanSaveBtn, isDirty);
}

function updateWorkspaceBridgeSaveButtonState() {
    const pendingEndpoint = normalizeEndpointInputValue(workspaceBridgeEndpointInput?.value, DEFAULT_WORKSPACE_BRIDGE_URL);
    const pendingToken = (workspaceBridgeTokenInput?.value || "").trim();
    const isDirty = pendingEndpoint !== getWorkspaceBridgeBaseUrl()
        || pendingToken !== getWorkspaceBridgeToken();
    setSettingsSaveButtonState(workspaceBridgeSaveBtn, isDirty);
}

function updatePersonaSaveButtonState() {
    const pendingDisplayName = normalizePersonaDisplayName(personaDisplayNameInput?.value);
    const pendingCustomInstructions = normalizePersonaCustomInstructions(personaCustomInstructionsInput?.value);
    const isDirty = pendingDisplayName !== getPersonaDisplayName()
        || pendingCustomInstructions !== getPersonaCustomInstructions();
    setSettingsSaveButtonState(personaSaveBtn, isDirty);
}

function addDirtyStateListeners(elements, updateFn) {
    elements.forEach(element => {
        element?.addEventListener("input", updateFn);
        element?.addEventListener("change", updateFn);
    });
}

function normalizeOpenAiCatalogModel(raw = {}) {
    const id = normalizeModelId(raw.id || raw.model || raw.name);
    if (!id) return null;
    const created = Number(raw.created || raw.createdAt || 0) || null;
    return {
        id,
        label: String(raw.label || raw.name || id).trim(),
        ownedBy: String(raw.owned_by || raw.ownedBy || "").trim(),
        created,
        source: raw.source || "live"
    };
}

function readCachedOpenAiModelCatalog({ allowStale = true } = {}) {
    try {
        const payload = JSON.parse(safeLocalStorageGet(OPENAI_MODEL_CATALOG_STORAGE_KEY) || "{}");
        const ageMs = Date.now() - Number(payload.updatedAt || 0);
        if (!Array.isArray(payload.models) || ageMs < 0) return [];
        if (!allowStale && ageMs > OPENAI_MODEL_CATALOG_CACHE_MAX_AGE_MS) return [];
        return payload.models.map(normalizeOpenAiCatalogModel).filter(Boolean);
    } catch {
        return [];
    }
}

function writeCachedOpenAiModelCatalog(models = []) {
    cachedOpenAiCatalogModels = models.map(normalizeOpenAiCatalogModel).filter(Boolean);
    safeLocalStorageSet(OPENAI_MODEL_CATALOG_STORAGE_KEY, JSON.stringify({
        updatedAt: Date.now(),
        models: cachedOpenAiCatalogModels
    }));
}

function getExplicitOpenAiCatalogOptions() {
    return [
        ...OPENAI_TRANSCRIPTION_MODEL_OPTIONS.map(option => ({
            ...option,
            provider: AI_PROVIDER_OPENAI,
            catalogKind: "Transcription",
            inputModalities: ["audio"],
            outputModalities: ["text"],
            supportedParameters: [],
            supportedTools: [],
            reasoningModes: [],
            supportsStreaming: false,
            supportsTemperature: false
        })),
        ...OPENAI_REALTIME_MODEL_OPTIONS.map(option => ({
            ...option,
            provider: AI_PROVIDER_OPENAI,
            catalogKind: "Realtime",
            inputModalities: ["text", "audio"],
            outputModalities: ["text", "audio"],
            supportedParameters: [],
            supportedTools: [],
            reasoningModes: option.group === "Reasoning" ? ["medium"] : [],
            supportsStreaming: true,
            supportsTemperature: false
        })),
        {
            id: DEFAULT_OPENAI_SPEECH_MODEL,
            label: DEFAULT_OPENAI_SPEECH_MODEL,
            meta: "Speech",
            provider: AI_PROVIDER_OPENAI,
            catalogKind: "Speech",
            inputModalities: ["text"],
            outputModalities: ["audio"],
            supportedParameters: ["voice", "speed"],
            supportedTools: [],
            reasoningModes: [],
            supportsStreaming: false,
            supportsTemperature: false
        }
    ];
}

function inferOpenAiCatalogKind(modelId, model = {}) {
    const id = normalizeModelId(modelId).toLowerCase();
    if (model.catalogKind) return model.catalogKind;
    if (model.outputModalities?.includes("image") || /(?:^|[-_/])image|gpt-image/i.test(id)) return "Image";
    if (/(?:transcribe|transcription|whisper)/i.test(id)) return "Transcription";
    if (/(?:realtime|voice-preview)/i.test(id)) return "Realtime";
    if (/(?:tts|speech)/i.test(id)) return "Speech";
    if (/(?:embedding|embed)/i.test(id)) return "Embeddings";
    if (/moderation/i.test(id)) return "Moderation";
    if (/codex/i.test(id)) return "Coding";
    if (model.isChat || isLikelyOpenAiChatModelId(id)) return "Chat";
    return "Model";
}

function inferOpenAiCatalogModalities(kind, modelId) {
    const id = normalizeModelId(modelId).toLowerCase();
    if (kind === "Image") return { input: ["text", "image"], output: ["image"] };
    if (kind === "Transcription") return { input: ["audio"], output: ["text"] };
    if (kind === "Realtime") return { input: ["text", "audio"], output: ["text", "audio"] };
    if (kind === "Speech") return { input: ["text"], output: ["audio"] };
    if (kind === "Embeddings") return { input: ["text"], output: ["embedding"] };
    if (kind === "Moderation") return { input: ["text", "image"], output: ["moderation"] };
    if (kind === "Chat" || /^o\d|^gpt-/i.test(id)) return { input: ["text"], output: ["text"] };
    return { input: [], output: [] };
}

function normalizeOpenAiCatalogRecord(raw = {}) {
    const live = normalizeOpenAiCatalogModel(raw);
    const id = live?.id || normalizeModelId(raw.id);
    if (!id) return null;
    const registryOption = aiCapabilityRegistry.getModelOption(id);
    const explicitOption = getExplicitOpenAiCatalogOptions().find(option => option.id === id);
    const base = {
        ...raw,
        ...registryOption,
        ...explicitOption
    };
    const kind = inferOpenAiCatalogKind(id, base);
    const inferredModalities = inferOpenAiCatalogModalities(kind, id);
    const inputModalities = Array.isArray(base.inputModalities) && base.inputModalities.length
        ? base.inputModalities
        : inferredModalities.input;
    const outputModalities = Array.isArray(base.outputModalities) && base.outputModalities.length
        ? base.outputModalities
        : inferredModalities.output;

    return {
        id,
        label: base.label || live?.label || id,
        meta: base.meta || kind,
        kind,
        provider: AI_PROVIDER_OPENAI,
        ownedBy: live?.ownedBy || base.ownedBy || "",
        created: live?.created || base.created || null,
        source: live?.source || base.source || "built-in",
        live: Boolean(live && live.source === "live"),
        inputModalities,
        outputModalities,
        supportedParameters: Array.isArray(base.supportedParameters) ? base.supportedParameters : [],
        supportedTools: Array.isArray(base.supportedTools) ? base.supportedTools : [],
        reasoningModes: Array.isArray(base.reasoningModes) ? base.reasoningModes : [],
        fileInputCapabilities: Array.isArray(base.fileInputCapabilities) ? base.fileInputCapabilities : [],
        supportsImageInput: Boolean(base.supportsImageInput || inputModalities.includes("image")),
        supportsFileInput: Boolean(base.supportsFileInput),
        supportsToolCalling: Boolean(base.supportsToolCalling),
        supportsStructuredOutputs: Boolean(base.supportsStructuredOutputs),
        supportsTemperature: Boolean(base.supportsTemperature),
        supportsStreaming: base.supportsStreaming !== false && ["Chat", "Realtime"].includes(kind),
        contextLength: base.contextLength || null
    };
}

function getBuiltInOpenAiCatalogModels() {
    return [
        ...aiCapabilityRegistry.getAllModelOptions({ provider: AI_PROVIDER_OPENAI }),
        ...getExplicitOpenAiCatalogOptions()
    ].map(option => ({ ...option, source: "built-in" }));
}

function mergeOpenAiCatalogModels(modelGroups = []) {
    const merged = new Map();
    modelGroups.flat().forEach(model => {
        const normalized = normalizeOpenAiCatalogRecord(model);
        if (!normalized) return;
        const existing = merged.get(normalized.id);
        merged.set(normalized.id, existing ? { ...existing, ...normalized, live: existing.live || normalized.live } : normalized);
    });
    return Array.from(merged.values()).sort((a, b) => {
        const kindCompare = a.kind.localeCompare(b.kind);
        return kindCompare || a.id.localeCompare(b.id);
    });
}

function getOpenAiCatalogModels() {
    if (!cachedOpenAiCatalogModels.length) {
        cachedOpenAiCatalogModels = readCachedOpenAiModelCatalog({ allowStale: true });
    }
    return mergeOpenAiCatalogModels([
        getBuiltInOpenAiCatalogModels(),
        cachedOpenAiCatalogModels
    ]);
}

function getOllamaCatalogKind(capability = {}) {
    if (capability.supportsStreaming === false) return "Embeddings";
    if (capability.supportsImageInput) return "Vision";
    if (capability.supportsThinking) return "Reasoning";
    return "Chat";
}

function normalizeOllamaCatalogRecord(raw = {}) {
    const rawId = normalizeModelId(raw.id || raw.name || raw.model);
    if (!rawId) return null;
    const staticOption = getStaticOllamaModelOption(rawId);
    const id = staticOption?.id || rawId;
    const installed = isOllamaModelInstalled(rawId) || isOllamaModelInstalled(id);
    const capability = getOllamaModelCapability(rawId);
    const kind = getOllamaCatalogKind(capability);
    const option = staticOption || raw;
    return {
        id,
        label: option.label || raw.label || id,
        meta: getLocalModelMeta(option, installed, capability) || kind,
        kind,
        provider: AI_PROVIDER_LOCAL,
        ownedBy: "Ollama",
        source: installed ? "installed" : "known",
        sourceLabel: installed ? "Installed" : "Known",
        installed,
        live: installed,
        inputModalities: Array.isArray(capability.inputModalities) ? capability.inputModalities : ["text"],
        outputModalities: Array.isArray(capability.outputModalities) ? capability.outputModalities : ["text"],
        supportedParameters: Array.isArray(capability.supportedParameters) ? capability.supportedParameters : [],
        supportedTools: capability.supportsToolCalling ? ["tools"] : [],
        reasoningModes: capability.supportsThinking ? ["thinking"] : [],
        fileInputCapabilities: Array.isArray(capability.fileInputCapabilities) ? capability.fileInputCapabilities : [],
        supportsImageInput: Boolean(capability.supportsImageInput),
        supportsFileInput: Boolean(capability.supportsFileInput),
        supportsToolCalling: Boolean(capability.supportsToolCalling),
        supportsStructuredOutputs: Boolean(capability.supportsStructuredOutputs),
        supportsTemperature: Boolean(capability.supportsTemperature),
        supportsStreaming: Boolean(capability.supportsStreaming),
        contextLength: capability.contextLength || null
    };
}

function getOllamaCatalogModels() {
    const models = new Map();
    [
        ...OLLAMA_CATALOG_MODEL_OPTIONS,
        ...installedOllamaModels.map(id => ({ id, label: id, meta: "Installed", provider: AI_PROVIDER_LOCAL }))
    ].forEach(option => {
        const normalized = normalizeOllamaCatalogRecord(option);
        if (!normalized) return;
        const existing = models.get(normalized.id);
        models.set(normalized.id, existing
            ? { ...existing, ...normalized, installed: existing.installed || normalized.installed, live: existing.live || normalized.live }
            : normalized);
    });
    return Array.from(models.values()).sort((a, b) => {
        const installedCompare = Number(b.installed) - Number(a.installed);
        if (installedCompare) return installedCompare;
        const kindCompare = a.kind.localeCompare(b.kind);
        return kindCompare || a.id.localeCompare(b.id);
    });
}

function formatOpenAiCatalogList(values = []) {
    return values.map(value => String(value || "").trim()).filter(Boolean).join(", ");
}

function getOpenAiCatalogCapabilities(model) {
    const tags = [model.kind];
    if (model.inputModalities.length) tags.push(`Input: ${formatOpenAiCatalogList(model.inputModalities)}`);
    if (model.outputModalities.length) tags.push(`Output: ${formatOpenAiCatalogList(model.outputModalities)}`);
    if (model.supportsImageInput && !model.inputModalities.includes("image")) tags.push("Vision");
    if (model.supportsFileInput) tags.push("Files");
    if (model.supportsToolCalling || model.supportedTools.length) tags.push("Tools");
    if (model.supportsStructuredOutputs) tags.push("Structured output");
    if (model.supportsStreaming) tags.push("Streaming");
    if (model.supportsTemperature) tags.push("Temperature");
    if (model.reasoningModes.length) tags.push(`Reasoning: ${formatOpenAiCatalogList(model.reasoningModes)}`);
    if (model.contextLength) tags.push(`${Number(model.contextLength).toLocaleString("en-US")} context`);
    return Array.from(new Set(tags));
}

function openAiCatalogModelHasCapability(model, key) {
    switch (key) {
        case "text-input":
            return model.inputModalities.includes("text");
        case "image-input":
            return model.inputModalities.includes("image") || model.supportsImageInput;
        case "audio-input":
            return model.inputModalities.includes("audio");
        case "text-output":
            return model.outputModalities.includes("text");
        case "image-output":
            return model.outputModalities.includes("image");
        case "audio-output":
            return model.outputModalities.includes("audio");
        case "tools":
            return model.supportsToolCalling || model.supportedTools.length > 0;
        case "files":
            return model.supportsFileInput || model.fileInputCapabilities.length > 0;
        case "structured":
            return model.supportsStructuredOutputs;
        case "reasoning":
            return model.reasoningModes.length > 0;
        case "streaming":
            return Boolean(model.supportsStreaming);
        case "temperature":
            return Boolean(model.supportsTemperature);
        default:
            return false;
    }
}

function modelMatchesOpenAiCatalogFilters(model) {
    for (const key of openAiCatalogFilters.require) {
        if (!openAiCatalogModelHasCapability(model, key)) return false;
    }
    for (const key of openAiCatalogFilters.exclude) {
        if (openAiCatalogModelHasCapability(model, key)) return false;
    }
    return true;
}

function getOpenAiCatalogActiveFilterCount() {
    return openAiCatalogFilters.require.size + openAiCatalogFilters.exclude.size;
}

function sortOpenAiCatalogModels(models = []) {
    const sorted = [...models];
    if (openAiCatalogSortMode === "context-desc") {
        return sorted.sort((a, b) => (Number(b.contextLength) || 0) - (Number(a.contextLength) || 0) || a.id.localeCompare(b.id));
    }
    if (openAiCatalogSortMode === "context-asc") {
        return sorted.sort((a, b) => {
            const aContext = Number(a.contextLength) || Number.POSITIVE_INFINITY;
            const bContext = Number(b.contextLength) || Number.POSITIVE_INFINITY;
            return aContext - bContext || a.id.localeCompare(b.id);
        });
    }
    return sorted;
}

function modelMatchesOpenAiCatalogQuery(model, query) {
    if (!query) return true;
    const haystack = [
        model.id,
        model.label,
        model.meta,
        model.kind,
        model.ownedBy,
        model.sourceLabel,
        model.provider,
        ...model.inputModalities,
        ...model.outputModalities,
        ...model.supportedParameters,
        ...model.supportedTools,
        ...model.reasoningModes,
        ...getOpenAiCatalogCapabilities(model)
    ].join(" ").toLowerCase();
    return query.split(/\s+/).filter(Boolean).every(part => haystack.includes(part));
}

function getOpenAiCatalogUseTarget(model) {
    if (!model) return null;
    if (model.provider === AI_PROVIDER_LOCAL) {
        if (model.supportsStreaming === false) return null;
        return { id: "local-chat", label: "Use chat", toastLabel: "Ollama model" };
    }
    if (model.kind === "Image" || model.outputModalities.includes("image")) {
        return { id: "image", label: "Use image", toastLabel: "Image model" };
    }
    if (model.kind === "Transcription") {
        return { id: "transcription", label: "Use transcription", toastLabel: "Transcription model" };
    }
    if (model.kind === "Realtime") {
        return { id: "realtime", label: "Use voice", toastLabel: "Realtime voice model" };
    }
    if (model.kind === "Speech") {
        return { id: "speech", label: "Use speech", toastLabel: "Speech model" };
    }
    if (model.kind === "Chat" && (model.isChat || isLikelyOpenAiChatModelId(model.id))) {
        return { id: "chat", label: "Use chat", toastLabel: "Chat model" };
    }
    return null;
}

function getCatalogModelOption(model) {
    return {
        id: model.id,
        label: model.label || model.id,
        meta: model.meta || model.kind,
        provider: model.provider || AI_PROVIDER_OPENAI
    };
}

function addOptionIfMissing(options = [], model) {
    if (!model?.id || options.some(option => option.id === model.id)) return options;
    return [getCatalogModelOption(model), ...options];
}

function useOpenAiCatalogModel(modelId) {
    const model = getActiveModelCatalogRecordById(modelId);
    const target = getOpenAiCatalogUseTarget(model);
    if (!model || !target) {
        showToast("This model does not match a configurable Fauna model slot yet.", "warning");
        return;
    }

    if (target.id === "local-chat") {
        setActiveModel(model.id, { provider: AI_PROVIDER_LOCAL });
        renderLocalModelChoices();
        updateModelSwitcherForProvider();
        if (model.installed) {
            showToast(`${target.toastLabel} set to ${model.id}. Ready to use.`, "success");
        }
        return;
    } else if (target.id === "chat") {
        const options = addOptionIfMissing(getOpenAiSettingsChatModelOptions(), model);
        openAiChatModelSelect?.setOptions(options, model.id);
        if (openAiChatModelInput) openAiChatModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "image") {
        const options = addOptionIfMissing(getOpenAiImageModelOptions(), model);
        openAiImageModelSelect?.setOptions(options, model.id);
        if (openAiImageModelInput) openAiImageModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "transcription") {
        const options = addOptionIfMissing(getOpenAiTranscriptionModelOptions(), model);
        openAiTranscriptionModelSelect?.setOptions(options, model.id);
        if (openAiTranscriptionModelInput) openAiTranscriptionModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "realtime") {
        const options = addOptionIfMissing(getOpenAiRealtimeModelOptions(), model);
        openAiRealtimeModelSelect?.setOptions(options, model.id);
        if (openAiRealtimeModelInput) openAiRealtimeModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "speech") {
        safeLocalStorageSet(OPENAI_SPEECH_MODEL_STORAGE_KEY, model.id);
        stopVoicePreview();
    }

    const saveHint = target.id === "speech"
        ? "Saved for speech."
        : "Save OpenAI settings to apply.";
    showToast(`${target.toastLabel} set to ${model.id}. ${saveHint}`, target.id === "speech" ? "success" : "info");
}

function renderOpenAiCatalog() {
    if (!openAiCatalogList) return;
    const query = openAiCatalogSearchQuery.trim().toLowerCase();
    const models = openAiCatalogProvider === AI_PROVIDER_LOCAL ? getOllamaCatalogModels() : getOpenAiCatalogModels();
    const filtered = sortOpenAiCatalogModels(models.filter(model => modelMatchesOpenAiCatalogQuery(model, query) && modelMatchesOpenAiCatalogFilters(model)));
    const liveCount = models.filter(model => model.live).length;
    const installedCount = models.filter(model => model.installed).length;
    const activeFilterCount = getOpenAiCatalogActiveFilterCount();
    if (openAiCatalogStatus) {
        const baseStatus = openAiCatalogProvider === AI_PROVIDER_LOCAL
            ? (isOllamaReachable
                ? `${filtered.length} of ${models.length} Ollama models · ${installedCount} installed`
                : `${filtered.length} of ${models.length} known Ollama models · offline`)
            : (liveCount
                ? `${filtered.length} of ${models.length} models · ${liveCount} live`
                : `${filtered.length} of ${models.length} built-in models`);
        openAiCatalogStatus.textContent = activeFilterCount ? `${baseStatus} · ${activeFilterCount} filters` : baseStatus;
    }
    if (openAiCatalogEmpty) {
        openAiCatalogEmpty.hidden = filtered.length > 0;
        openAiCatalogEmpty.textContent = query || activeFilterCount
            ? "No models match that search and filter set."
            : openAiCatalogProvider === AI_PROVIDER_LOCAL ? "No Ollama models found." : "No OpenAI models found.";
    }
    updateOpenAiCatalogSortUi();
    updateOpenAiCatalogFilterUi();

    openAiCatalogList.replaceChildren(...filtered.map(model => {
        const item = document.createElement("article");
        item.className = "model-catalog-item";
        item.setAttribute("role", "listitem");

        const head = document.createElement("div");
        head.className = "model-catalog-item-head";

        const titleWrap = document.createElement("div");
        titleWrap.className = "model-catalog-title-wrap";

        const title = document.createElement("h3");
        title.textContent = model.label || model.id;

        const id = document.createElement("code");
        id.textContent = model.id;

        titleWrap.append(title, id);

        const badge = document.createElement("span");
        badge.className = "model-catalog-source";
        badge.textContent = model.sourceLabel || (model.live ? "Available" : "Known");

        const actionWrap = document.createElement("div");
        actionWrap.className = "model-catalog-item-actions";
        actionWrap.appendChild(badge);

        const useTarget = getOpenAiCatalogUseTarget(model);
        const useButton = document.createElement("button");
        useButton.className = "provider-btn provider-btn-secondary model-catalog-use-btn";
        useButton.type = "button";
        useButton.textContent = useTarget?.label || "No slot";
        useButton.disabled = !useTarget;
        if (useTarget) {
            useButton.addEventListener("click", () => useOpenAiCatalogModel(model.id));
        }
        actionWrap.appendChild(useButton);

        head.append(titleWrap, actionWrap);

        const meta = document.createElement("p");
        meta.className = "model-catalog-meta";
        const metaParts = [model.meta, model.ownedBy ? `Owner: ${model.ownedBy}` : ""].filter(Boolean);
        meta.textContent = metaParts.join(" · ") || model.kind;

        const capabilityList = document.createElement("div");
        capabilityList.className = "model-catalog-capabilities";
        getOpenAiCatalogCapabilities(model).forEach(capability => {
            const chip = document.createElement("span");
            chip.className = "model-catalog-chip";
            chip.textContent = capability;
            capabilityList.appendChild(chip);
        });

        item.append(head, meta, capabilityList);
        return item;
    }));
}

async function refreshOpenAiCatalog({ force = false } = {}) {
    if (openAiCatalogProvider === AI_PROVIDER_LOCAL) {
        await refreshOllamaCatalog();
        return;
    }
    cachedOpenAiCatalogModels = readCachedOpenAiModelCatalog({ allowStale: true });
    renderOpenAiCatalog();

    if (!getOpenAiApiKey() || !hasWorkspaceBridgeAccess()) {
        if (openAiCatalogStatus) {
            openAiCatalogStatus.textContent = "Built-in catalog · save OpenAI and bridge settings to refresh live models";
        }
        return;
    }

    const freshCache = readCachedOpenAiModelCatalog({ allowStale: false });
    if (!force && freshCache.length) {
        cachedOpenAiCatalogModels = freshCache;
        renderOpenAiCatalog();
        return;
    }

    if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = true;
    if (openAiCatalogStatus) openAiCatalogStatus.textContent = "Refreshing live models...";

    try {
        const res = await openAiFetch("/models", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(formatOpenAiApiError(data, res.status));
        const models = (Array.isArray(data?.data) ? data.data : [])
            .map(model => normalizeOpenAiCatalogModel({ ...model, source: "live" }))
            .filter(Boolean);
        writeCachedOpenAiModelCatalog(models);
        availableOpenAiModelIds = new Set(models.map(model => model.id));
        updateModelSwitcherForProvider();
        updateOpenAiModelSelects();
        renderOpenAiCatalog();
    } catch (err) {
        if (openAiCatalogStatus) openAiCatalogStatus.textContent = `Live refresh failed: ${err.message}`;
    } finally {
        if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = false;
    }
}

async function refreshOllamaCatalog() {
    renderOpenAiCatalog();
    if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = true;
    if (openAiCatalogStatus) openAiCatalogStatus.textContent = "Refreshing local Ollama models...";
    try {
        await checkOllamaStatus();
        renderOpenAiCatalog();
    } finally {
        if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = false;
    }
}

function updateOpenAiCatalogChrome() {
    const isLocalCatalog = openAiCatalogProvider === AI_PROVIDER_LOCAL;
    if (openAiCatalogTitle) {
        openAiCatalogTitle.textContent = isLocalCatalog ? "Ollama Model Catalog" : "OpenAI Model Catalog";
    }
    if (openAiCatalogSearchInput) {
        openAiCatalogSearchInput.placeholder = isLocalCatalog
            ? "Search Ollama models or capabilities"
            : "Search models or capabilities";
    }
    if (openAiCatalogRefreshBtn) {
        openAiCatalogRefreshBtn.textContent = isLocalCatalog ? "Refresh Ollama" : "Refresh";
    }
}

function openOpenAiCatalogModal(provider = AI_PROVIDER_OPENAI) {
    if (!openAiCatalogModal) return;
    openAiCatalogProvider = normalizeAiProvider(provider);
    openAiCatalogReturnFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : openAiCatalogProvider === AI_PROVIDER_LOCAL ? ollamaCatalogBtn : openAiCatalogBtn;
    openAiCatalogSearchQuery = "";
    if (openAiCatalogSearchInput) openAiCatalogSearchInput.value = "";
    openAiCatalogModal.hidden = false;
    openAiCatalogModal.setAttribute("aria-hidden", "false");
    updateOpenAiCatalogChrome();
    renderOpenAiCatalog();
    window.setTimeout(() => openAiCatalogSearchInput?.focus(), 0);
    void refreshOpenAiCatalog();
}

function openOllamaCatalogModal() {
    openOpenAiCatalogModal(AI_PROVIDER_LOCAL);
}

function closeOpenAiCatalogModal({ returnFocus = true } = {}) {
    if (!openAiCatalogModal || openAiCatalogModal.hidden) return;
    closeOpenAiCatalogFilters();
    openAiCatalogModal.hidden = true;
    openAiCatalogModal.setAttribute("aria-hidden", "true");
    if (returnFocus && openAiCatalogReturnFocus && document.contains(openAiCatalogReturnFocus)) {
        openAiCatalogReturnFocus.focus?.({ preventScroll: true });
    }
    openAiCatalogReturnFocus = null;
}

function setOpenAiCatalogFiltersOpen(isOpen) {
    if (!openAiCatalogFiltersMenu || !openAiCatalogFiltersBtn) return;
    openAiCatalogFiltersMenu.hidden = !isOpen;
    openAiCatalogFiltersBtn.setAttribute("aria-expanded", String(isOpen));
    openAiCatalogFiltersBtn.classList.toggle("active", isOpen);
}

function closeOpenAiCatalogFilters() {
    setOpenAiCatalogFiltersOpen(false);
}

function updateOpenAiCatalogSortUi() {
    openAiCatalogSortButtons.forEach(button => {
        const isActive = button.dataset.openaiCatalogSort === openAiCatalogSortMode;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
    scheduleAnimatedSegmentIndicators();
}

function updateOpenAiCatalogFilterUi() {
    const activeCount = getOpenAiCatalogActiveFilterCount();
    if (openAiCatalogFiltersBtn) {
        openAiCatalogFiltersBtn.classList.toggle("has-filters", activeCount > 0);
        const label = activeCount ? `Filters (${activeCount})` : "Filters";
        const labelElement = openAiCatalogFiltersBtn.querySelector("[data-openai-catalog-filter-label]");
        if (labelElement) {
            labelElement.textContent = label;
        } else {
            openAiCatalogFiltersBtn.append(label);
        }
    }
    openAiCatalogFiltersMenu?.querySelectorAll("[data-openai-catalog-filter]").forEach(input => {
        const mode = input.dataset.openaiCatalogFilter;
        input.checked = Boolean(openAiCatalogFilters[mode]?.has(input.value));
    });
}

function clearOpenAiCatalogFilters() {
    openAiCatalogFilters.require.clear();
    openAiCatalogFilters.exclude.clear();
    renderOpenAiCatalog();
}

function normalizeStoredVoiceSpeed(value) {
    const speed = Number(value);
    if (!Number.isFinite(speed)) return 1;
    return Math.min(1.3, Math.max(0.7, Math.round(speed * 10) / 10));
}

function setVoiceSpeed(speed, { persist = true } = {}) {
    activeVoiceSpeed = normalizeStoredVoiceSpeed(speed);
    if (persist) safeLocalStorageSet(VOICE_SPEED_STORAGE_KEY, String(activeVoiceSpeed));
    updateVoiceQuickUi();
}

function setVoiceReplyEnabled(enabled, { persist = true, cue = false } = {}) {
    isVoiceReplyEnabled = Boolean(enabled);
    if (persist) safeLocalStorageSet(VOICE_REPLY_ENABLED_STORAGE_KEY, isVoiceReplyEnabled ? "true" : "false");
    applyVoiceReplyOutputState();
    updateVoiceQuickUi();
    if (cue) void playVoiceSessionCue(isVoiceReplyEnabled ? "unmute" : "mute");
}

function setSelectedVoiceMic(deviceId, { persist = true } = {}) {
    selectedVoiceMicDeviceId = deviceId || "default";
    if (persist) safeLocalStorageSet(VOICE_MIC_DEVICE_STORAGE_KEY, selectedVoiceMicDeviceId);
    updateVoiceMicChoiceSelection();
}

function supportsVoiceOutputSelection() {
    return typeof HTMLMediaElement !== "undefined"
        && typeof HTMLMediaElement.prototype.setSinkId === "function";
}

function getSelectedVoiceOutputSinkId() {
    return selectedVoiceOutputDeviceId === "default" ? "" : selectedVoiceOutputDeviceId;
}

async function applySelectedVoiceOutput(audio, { notify = false } = {}) {
    if (!audio || !supportsVoiceOutputSelection()) return false;
    try {
        await audio.setSinkId(getSelectedVoiceOutputSinkId());
        return true;
    } catch (err) {
        console.warn("Could not set voice output device:", err);
        if (notify && !hasShownVoiceOutputWarning) {
            hasShownVoiceOutputWarning = true;
            showToast("Could not use that output device. Using the system default.", "warning");
        }
        return false;
    }
}

function setSelectedVoiceOutput(deviceId, { persist = true } = {}) {
    selectedVoiceOutputDeviceId = deviceId || "default";
    if (persist) safeLocalStorageSet(VOICE_OUTPUT_DEVICE_STORAGE_KEY, selectedVoiceOutputDeviceId);
    updateVoiceOutputChoiceSelection();
    hasShownVoiceOutputWarning = false;
    applySelectedVoiceOutput(activeSpeechAudio, { notify: true });
    applySelectedVoiceOutput(activeVoicePreviewAudio, { notify: true });
    applySelectedVoiceOutput(openAiRealtimeAudioElement, { notify: true });
}

function normalizePersonaDisplayName(value) {
    return String(value || "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, PERSONA_DISPLAY_NAME_MAX_LENGTH);
}

function normalizePersonaCustomInstructions(value) {
    return String(value || "")
        .replace(/\r\n?/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim()
        .slice(0, PERSONA_CUSTOM_INSTRUCTIONS_MAX_LENGTH);
}

function getPersonaDisplayName() {
    return normalizePersonaDisplayName(safeLocalStorageGet(PERSONA_DISPLAY_NAME_STORAGE_KEY));
}

function getPersonaCustomInstructions() {
    return normalizePersonaCustomInstructions(safeLocalStorageGet(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY));
}

function updatePersonaSettingsUi() {
    if (personaDisplayNameInput) personaDisplayNameInput.value = getPersonaDisplayName();
    if (personaCustomInstructionsInput) personaCustomInstructionsInput.value = getPersonaCustomInstructions();
    updatePersonaSaveButtonState();
}

function savePersonaSettings() {
    const displayName = normalizePersonaDisplayName(personaDisplayNameInput?.value);
    const customInstructions = normalizePersonaCustomInstructions(personaCustomInstructionsInput?.value);

    if (displayName) {
        safeLocalStorageSet(PERSONA_DISPLAY_NAME_STORAGE_KEY, displayName);
    } else {
        safeLocalStorageRemove(PERSONA_DISPLAY_NAME_STORAGE_KEY);
    }

    if (customInstructions) {
        safeLocalStorageSet(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY, customInstructions);
    } else {
        safeLocalStorageRemove(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    }

    updatePersonaSettingsUi();
    updateTimeGreeting({ forceRandom: true });
    showToast(displayName || customInstructions ? "Personalization saved." : "Personalization cleared.", displayName || customInstructions ? "success" : "info");
}

function clearPersonaSettings() {
    safeLocalStorageRemove(PERSONA_DISPLAY_NAME_STORAGE_KEY);
    safeLocalStorageRemove(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    updatePersonaSettingsUi();
    updateTimeGreeting({ forceRandom: true });
    showToast("Personalization cleared.", "info");
}

function buildPersonalizationSystemPrompt() {
    const displayName = getPersonaDisplayName();
    const customInstructions = getPersonaCustomInstructions();
    if (!displayName && !customInstructions) return "";

    const sections = ["Personalization is enabled for this user."];
    if (displayName) {
        sections.push(`The user's display name is "${displayName}". Address them by this name when it feels natural, without overusing it.`);
    }
    if (customInstructions) {
        sections.push(`Follow these user-saved custom instructions:\n${customInstructions}`);
    }
    return sections.join("\n\n");
}

function getBrowserLocales() {
    const locales = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language || ""];
    return locales
        .map(locale => String(locale || "").trim())
        .filter(Boolean);
}

function getLocaleRegionCode(locale) {
    const value = String(locale || "").trim();
    if (!value) return "";

    try {
        const parsed = new Intl.Locale(value);
        if (parsed.region) return parsed.region.toUpperCase();
    } catch {
        // Fall back to a light BCP-47 parse below.
    }

    const match = value.match(/[-_](?:[A-Za-z]{4}[-_])?([A-Za-z]{2}|\d{3})(?:[-_]|$)/);
    return match ? match[1].toUpperCase() : "";
}

function getRegionDisplayName(regionCode) {
    const code = String(regionCode || "").trim().toUpperCase();
    if (!code) return "";
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
    } catch {
        return code;
    }
}

function buildUserLocaleSystemPrompt() {
    const locales = getBrowserLocales();
    const primaryLocale = locales[0] || "";
    const regionCode = locales.map(getLocaleRegionCode).find(Boolean) || "";
    const regionName = getRegionDisplayName(regionCode);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lines = [];

    if (primaryLocale) lines.push(`Primary browser language/locale: ${primaryLocale}`);
    if (locales.length > 1) lines.push(`Browser language preferences: ${locales.join(", ")}`);
    if (regionCode) lines.push(`Inferred user country/region: ${regionName} (${regionCode})`);
    if (timeZone) lines.push(`Browser time zone: ${timeZone}`);

    if (!lines.length) return "";
    return `${USER_LOCALE_SYSTEM_PROMPT}\n\n${lines.join("\n")}`;
}

function getSelectedVoiceMicConstraints() {
    if (!selectedVoiceMicDeviceId || selectedVoiceMicDeviceId === "default") return true;
    return { deviceId: { exact: selectedVoiceMicDeviceId } };
}

function getVoiceModeInstruction() {
    return "\n\n[Voice chat settings]\nRespond for spoken playback. Keep the answer concise and conversational. Summaries are only allowed when the user explicitly asks for a summary/recap (for example: \"summarize\", \"recap\", or \"zusammenfassen\"). Otherwise keep each reply focused on the current request and do not combine/merge multiple turns.";
}

function buildRealtimeMemoryContext() {
    if (!isMemoryEnabled || !memoryEntries.length) return "";
    const lines = memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`).join("\n");
    return `Saved memories for context only. Do not mention them unless relevant:\n${lines}`;
}

function buildOpenAiRealtimeInstructions() {
    return [
        "You are Fauna in a live speech-to-speech conversation.",
        "Speak naturally, warmly, and concisely. Keep most replies to a few sentences unless the user asks for detail.",
        "Use the user's spoken language by default.",
        "Only summarize earlier messages when the user explicitly requests a summary or recap. Otherwise keep replies focused and do not merge multiple assistant turns unless the user directly asks you to summarize them.",
        "Do not speak markup, hidden tool calls, XML, JSON control blocks, or code fences aloud.",
        "If the user asks for local workspace files, terminal commands, web browsing, or tool-backed work, explain briefly that those tools are available in typed chat.",
        buildUserLocaleSystemPrompt(),
        buildPersonalizationSystemPrompt(),
        buildRealtimeMemoryContext()
    ].filter(Boolean).join("\n\n");
}

function buildOpenAiRealtimeSessionConfig() {
    return {
        type: "realtime",
        model: getOpenAiRealtimeModel(),
        instructions: buildOpenAiRealtimeInstructions(),
        audio: {
            input: {
                transcription: {
                    model: getOpenAiTranscriptionModel()
                },
                turn_detection: {
                    type: "server_vad"
                }
            },
            output: {
                voice: getOpenAiVoice()
            }
        }
    };
}

function getMediaDataUrlMime(value) {
    return String(value || "").match(MEDIA_DATA_URL_PREFIX_RE)?.[1] || "media";
}

function sanitizeContentForModelContext(content) {
    return String(content || "")
        .replace(MARKDOWN_MEDIA_DATA_URL_RE, (_match, altText, dataUrl) => {
            const label = String(altText || "Generated media").trim() || "Generated media";
            return `[${label} omitted from model context: ${getMediaDataUrlMime(dataUrl)} data]`;
        })
        .replace(MEDIA_DATA_URL_RE, dataUrl => `[${getMediaDataUrlMime(dataUrl)} data omitted from model context]`);
}

function getGeneratedImageHistoryContent(label, prompt) {
    return `${label} for: ${prompt}\n\n[Generated image preview is visible in the chat. Image data is omitted from model context.]`;
}

function getGeneratedMediaCopyText(url, fallbackText) {
    return MEDIA_DATA_URL_PREFIX_RE.test(String(url || "")) ? fallbackText : (url || fallbackText);
}

function cloneConversationHistory(history, { includeImages = true, sanitizeContent = true } = {}) {
    if (!Array.isArray(history)) return [];
    return history
        .filter(message => message && typeof message === "object")
        .map(message => {
            const cloned = {
                role: message.role || "assistant",
                content: sanitizeContent ? sanitizeContentForModelContext(message.content) : (message.content || "")
            };
            ["model", "provider", "reasoning", "createdAt"].forEach(key => {
                if (message[key] !== undefined && message[key] !== null && message[key] !== "") {
                    cloned[key] = String(message[key]);
                }
            });
            if (includeImages && Array.isArray(message.images) && message.images.length > 0) {
                cloned.images = [...message.images];
            }
            if (includeImages && Array.isArray(message.openAiImageFileIds) && message.openAiImageFileIds.length > 0) {
                cloned.openAiImageFileIds = [...message.openAiImageFileIds];
            }
            const tokenUsage = normalizeTokenUsage(message.tokenUsage);
            if (tokenUsage) {
                cloned.tokenUsage = tokenUsage;
            }
            return cloned;
        });
}

function createMemoryId() {
    return window.crypto?.randomUUID?.() || `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeMemoryText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MEMORY_MAX_TEXT_LENGTH);
}

function createMemoryEntry(text, source = "user", overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: createMemoryId(),
        text: normalizeMemoryText(text),
        source: source === "assistant" ? "assistant" : "user",
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

function normalizeStoredMemoryEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = normalizeMemoryText(raw.text || raw.memory || raw.content);
    if (!text) return null;
    const now = new Date().toISOString();
    return createMemoryEntry(text, raw.source, {
        id: String(raw.id || createMemoryId()),
        createdAt: raw.createdAt || raw.updatedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || now
    });
}

function readStoredMemoryEntries() {
    const raw = safeLocalStorageGet(MEMORY_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeStoredMemoryEntry)
            .filter(Boolean)
            .slice(0, MEMORY_MAX_ENTRIES);
    } catch (err) {
        console.warn("Could not parse saved Fauna memories:", err);
        return [];
    }
}

function persistMemoryEntries() {
    memoryEntries = memoryEntries
        .map(normalizeStoredMemoryEntry)
        .filter(Boolean)
        .slice(0, MEMORY_MAX_ENTRIES);
    safeLocalStorageSet(MEMORY_STORAGE_KEY, JSON.stringify(memoryEntries));
    updateMemorySettingsUi();
}

function getMemoryCountLabel() {
    const count = memoryEntries.length;
    return `${count} ${count === 1 ? "memory" : "memories"}`;
}

function updateMemorySettingsUi() {
    if (toggleMemoryBeta) toggleMemoryBeta.checked = isMemoryEnabled;
    if (memoryBetaStatus) {
        memoryBetaStatus.textContent = isMemoryEnabled ? "Beta on" : "Off";
        memoryBetaStatus.dataset.state = isMemoryEnabled ? "configured" : "missing";
    }
    if (memoryCountLabel) {
        memoryCountLabel.textContent = getMemoryCountLabel();
    }
}

function setMemoryEnabled(enabled, { persist = true, notify = true } = {}) {
    isMemoryEnabled = Boolean(enabled);
    if (persist) safeLocalStorageSet(MEMORY_ENABLED_STORAGE_KEY, isMemoryEnabled ? "true" : "false");
    updateMemorySettingsUi();
    if (notify) {
        showToast(isMemoryEnabled ? "Memory beta enabled." : "Memory beta disabled.", isMemoryEnabled ? "success" : "info");
    }
}

function addMemoryEntry(text, source = "user") {
    const cleanText = normalizeMemoryText(text);
    if (!cleanText) return { entry: null, created: false };

    const existing = memoryEntries.find(entry => entry.text.toLowerCase() === cleanText.toLowerCase());
    if (existing) {
        existing.updatedAt = new Date().toISOString();
        existing.source = source === "assistant" ? "assistant" : existing.source;
        persistMemoryEntries();
        return { entry: existing, created: false };
    }

    const entry = createMemoryEntry(cleanText, source);
    memoryEntries.unshift(entry);
    persistMemoryEntries();
    return { entry, created: true };
}

function findMemoryIndex(target) {
    const cleanTarget = String(target || "").trim();
    if (!cleanTarget) return -1;

    const numeric = cleanTarget.match(/^#?(\d+)$/);
    if (numeric) {
        const index = Number(numeric[1]) - 1;
        return index >= 0 && index < memoryEntries.length ? index : -1;
    }

    const lowerTarget = cleanTarget.toLowerCase();
    return memoryEntries.findIndex(entry =>
        entry.id === cleanTarget ||
        entry.text.toLowerCase() === lowerTarget ||
        entry.text.toLowerCase().includes(lowerTarget)
    );
}

function removeMemoryEntry(target) {
    const index = findMemoryIndex(target);
    if (index < 0) return null;
    const [removed] = memoryEntries.splice(index, 1);
    persistMemoryEntries();
    return removed || null;
}

function clearMemoryEntries() {
    const count = memoryEntries.length;
    memoryEntries = [];
    persistMemoryEntries();
    return count;
}

function formatMemoryList() {
    if (!memoryEntries.length) {
        return isMemoryEnabled
            ? "Memory beta is on, but there are no saved memories yet.\nUse /memory add <something to remember>."
            : "Memory beta is off. Enable it in Settings > Personalization to use saved memories across chats.";
    }

    const state = isMemoryEnabled ? "on" : "off";
    const lines = memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`);
    return `Memory beta is ${state}. Saved memories:\n${lines.join("\n")}\n\nUse /memory add, /memory delete <number>, or /memory clear.`;
}

function buildMemorySystemPrompt() {
    if (!isMemoryEnabled) return "";
    const lines = memoryEntries.length
        ? memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`).join("\n")
        : "No saved memories yet.";
    return `${MEMORY_SYSTEM_PROMPT}\n\nSaved memories:\n${lines}`;
}

function normalizeMemoryRequestPayload(payload) {
    const rawItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.memories)
            ? payload.memories
            : [payload];

    return rawItems
        .map(item => {
            if (!item || typeof item !== "object") return null;
            const action = String(item.action || item.type || "add").trim().toLowerCase();
            const text = normalizeMemoryText(item.text || item.memory || item.content || item.value);
            const target = String(item.target || item.id || item.index || item.text || "").trim();
            return { action, text, target };
        })
        .filter(item => item && (item.text || item.target));
}

function parseMemoryRequests(content) {
    const text = String(content || "");
    const regex = new RegExp(MEMORY_REQUEST_RE.source, "gi");
    const requests = [];

    for (const match of text.matchAll(regex)) {
        try {
            const payload = JSON.parse(match[1]);
            requests.push(...normalizeMemoryRequestPayload(payload));
        } catch (err) {
            console.warn("Could not parse Fauna memory request:", err);
        }
    }

    return requests;
}

function stripMemoryRequests(content) {
    return String(content || "").replace(MEMORY_REQUEST_RE, "").trim();
}

function stripAssistantControlBlocks(content) {
    return normalizeAssistantControlMarkup(content)
        .replace(ASSISTANT_CONTROL_BLOCKS_RE, "")
        .replace(ASSISTANT_CONTROL_OPEN_TO_END_RE, "")
        .trim();
}

function applyAssistantMemoryRequests(content) {
    if (!isMemoryEnabled) return;
    const requests = parseMemoryRequests(content);
    if (!requests.length) return;

    let changed = 0;
    requests.forEach(request => {
        if (["add", "remember", "create"].includes(request.action) && request.text) {
            const result = addMemoryEntry(request.text, "assistant");
            if (result.entry) changed += 1;
            return;
        }
        if (["delete", "forget", "remove"].includes(request.action) && request.target) {
            if (removeMemoryEntry(request.target)) changed += 1;
        }
    });

    if (changed > 0) {
        showToast(changed === 1 ? "Memory updated." : `${changed} memories updated.`, "success");
    }
}

function findMemoryEntries(query = "") {
    const cleanQuery = String(query || "").trim().toLowerCase();
    if (!cleanQuery) return memoryEntries;
    return memoryEntries.filter(entry =>
        entry.text.toLowerCase().includes(cleanQuery) ||
        String(entry.source || "").toLowerCase().includes(cleanQuery)
    );
}

function formatMemoryToolEntries(entries, query = "") {
    if (!entries.length) {
        return query
            ? `No saved memories matched "${query}".`
            : "No saved memories.";
    }

    const lines = entries.map(entry => {
        const index = memoryEntries.findIndex(candidate => candidate.id === entry.id);
        const number = index >= 0 ? index + 1 : "?";
        const updated = entry.updatedAt ? `, updated: ${entry.updatedAt}` : "";
        return `${number}. ${entry.text} (source: ${entry.source || "user"}${updated})`;
    });
    return query
        ? `Saved memories matching "${query}":\n${lines.join("\n")}`
        : `Saved memories:\n${lines.join("\n")}`;
}

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

function shouldRequestAssistantChatTitle(messages = conversationHistory) {
    const hasAssistantReply = (Array.isArray(messages) ? messages : [])
        .some(message => message?.role === "assistant");
    if (hasAssistantReply) return false;

    const session = getActiveSession();
    return !(session?.manualTitle || session?.assistantTitle);
}

function applyAssistantChatTitle(content) {
    const title = parseChatTitleRequest(content);
    if (!title || title === "Current Session") return false;

    let session = getActiveSession();
    if (!session && activeChatHasContent()) {
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
    updateActiveChatTitle();
    renderChatHistory();
    return true;
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
        assistantTitle: false,
        chatHtml: "",
        conversationHistory: [],
        sessionTotalTokens: 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER,
        ...overrides
    };
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
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        if (chatTitle) chatTitle.textContent = "Library";
        if (chatTitleInput && !isChatTitleEditing) chatTitleInput.value = "Library";
        document.title = "Library - Fauna";
        return;
    }
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
        console.warn("Could not save Fauna chat history: browser storage quota was exceeded.");
        if (!hasShownChatStorageWarning) {
            showToast("Chat history is too large to save locally. Delete or archive older chats to free browser storage.", "warning");
            hasShownChatStorageWarning = true;
        }
    } else if (chatStorageProfile !== CHAT_STORAGE_PROFILE_FULL && !hasShownChatStorageWarning) {
        showToast("Browser storage is nearly full, so Fauna saved a lighter chat history snapshot.", "warning");
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
        if (!activeChatHasContent()) {
            if (render) renderChatHistory();
            return null;
        }
        session = createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
        createdActiveSession = true;
    }

    session.chatHtml = sanitizeChatHtmlMediaSources(chat?.innerHTML || "");
    session.domNodes = chat ? Array.from(chat.childNodes) : [];
    session.conversationHistory = cloneConversationHistory(conversationHistory);
    session.sessionTotalTokens = sessionTotalTokens;
    session.sessionTokenSource = TOKEN_USAGE_SOURCE_PROVIDER;
    if (!session.manualTitle && !session.assistantTitle) {
        session.title = deriveSessionTitle(session);
    }
    session.updatedAt = new Date().toISOString();
    syncUsageToolEventsFromSession(session, { html: session.chatHtml });

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

function createChatSessionRow(session) {
    const row = document.createElement("div");
    row.className = "chat-session-row";
    row.classList.toggle("active", session.id === activeSessionId);
    row.classList.toggle("pinned", session.pinned);
    row.classList.toggle("archived", session.archived);
    row.classList.toggle("menu-drop-up", session.archived);

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

    menu.append(pinButton, archiveButton, deleteButton);
    menuWrap.append(menuButton, menu);
    row.append(mainButton, menuWrap);
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
    const visibleSessions = chatSessions.filter(session => !session.archived).sort(compareChatSessions);
    const archivedSessions = chatSessions.filter(session => session.archived).sort(compareChatSessions);
    appendChatSessionGroup(chatHistoryList, "", visibleSessions);
    if (archivedHistorySection) {
        archivedHistorySection.hidden = archivedSessions.length === 0;
        archivedHistorySection.setAttribute("aria-hidden", String(archivedSessions.length === 0));
    }
    appendChatSessionGroup(archivedChatList || chatHistoryList, archivedChatList ? "" : "Archived", archivedSessions);
    setArchivedChatHistoryCollapsed(isArchivedChatHistoryCollapsed, { persist: false });
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

function restoreChatSessionToView(session, { closeWorkbench = true } = {}) {
    if (!session) return;
    if (closeWorkbench) closeCodeWorkbench();
    conversationHistory = cloneConversationHistory(session.conversationHistory);
    sessionTotalTokens = Math.max(sumHistoryTokenUsage(conversationHistory), normalizeTokenCount(session.sessionTotalTokens) || 0);
    clearComposerDraft();

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
    restoreChatSessionToView(session, { closeWorkbench: isSwitchingSessions });
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) {
        setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { closeSidebar: false, updateUrl: false });
    }
    persistChatSessions();
    renderChatHistory();
    if (closeSidebar) sidebarController.close();
    if (updateUrl) updateWorkspaceUrlFragment({ replace: urlMode === "replace" });
}

function startNewChatSession({ notify = true, updateUrl = true, urlMode = "push" } = {}) {
    if (activeSessionId) {
        const currentSession = saveCurrentSession({ render: false, updateUrl: false });
        if (currentSession && !chatSessionHasContent(currentSession) && !currentSession.archived) {
            chatSessions = chatSessions.filter(session => session.id !== currentSession.id);
        }
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
    return /^(?:https?:|data:(?:image|video|audio)\/)/i.test(value);
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
    return /^(?:https?:|blob:|data:(?:image|video|audio)\/)/i.test(value);
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

function createLibraryPickerItem(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-picker-item";
    button.dataset.libraryPickerItemId = item.id;
    button.setAttribute("aria-pressed", String(libraryPickerSelectedIds.has(item.id)));
    button.setAttribute("aria-label", `Select ${item.title}`);

    const check = document.createElement("span");
    check.className = "library-picker-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;

    const body = document.createElement("span");
    body.className = "library-picker-item-body";
    const title = document.createElement("span");
    title.className = "library-picker-item-title";
    title.textContent = item.title || getLibraryItemKindLabel(item);
    const detail = document.createElement("span");
    detail.className = "library-picker-item-detail";
    detail.textContent = item.detail || item.sessionTitle || getLibraryItemKindLabel(item);
    const meta = document.createElement("span");
    meta.className = "library-picker-item-meta";
    meta.textContent = `${getLibraryItemKindLabel(item)} · ${formatLibraryItemDate(item)}`;
    body.append(title, detail, meta);

    button.append(createLibraryPickerPreview(item), check, body);
    button.addEventListener("click", () => toggleLibraryPickerSelection(item.id));
    return button;
}

function renderLibraryPicker() {
    if (!libraryPickerGrid || !libraryPickerEmpty) return;
    const items = getLibraryPickerItems();
    const validIds = new Set(collectLibraryItems().map(item => item.id));
    libraryPickerSelectedIds = new Set(Array.from(libraryPickerSelectedIds).filter(id => validIds.has(id)));

    libraryPickerGrid.replaceChildren();
    items.forEach(item => libraryPickerGrid.appendChild(createLibraryPickerItem(item)));
    const isEmpty = items.length === 0;
    libraryPickerGrid.hidden = isEmpty;
    libraryPickerEmpty.hidden = !isEmpty;
    updateLibraryPickerSelectionUi();
}

function openLibraryPickerModal() {
    if (!libraryPickerModal) return;
    if (!canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    if (activeChatHasContent()) saveCurrentSession({ render: false });
    closeAttachmentMenu();
    libraryPickerReturnFocus = document.activeElement instanceof HTMLElement && !libraryPickerModal.contains(document.activeElement)
        ? document.activeElement
        : uploadButton;
    libraryPickerSelectedIds = new Set();
    libraryPickerQuery = "";
    libraryPickerTypeFilter = LIBRARY_PICKER_TYPE_ALL;
    libraryPickerSortOrder = LIBRARY_PICKER_SORT_NEWEST;
    if (libraryPickerSearch) libraryPickerSearch.value = "";
    libraryPickerModal.hidden = false;
    libraryPickerModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("library-picker-open");
    setLibraryPickerTypeFilter(libraryPickerTypeFilter);
    setLibraryPickerSortOrder(libraryPickerSortOrder);
    renderLibraryPicker();
    window.setTimeout(() => libraryPickerSearch?.focus({ preventScroll: true }), 0);
}

function closeLibraryPickerModal() {
    if (!libraryPickerModal || libraryPickerModal.hidden) return;
    const activeElement = document.activeElement;
    libraryPickerModal.hidden = true;
    libraryPickerModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("library-picker-open");
    libraryPickerSelectedIds = new Set();
    updateLibraryPickerSelectionUi();
    if (activeElement instanceof HTMLElement && libraryPickerModal.contains(activeElement)) {
        const focusTarget = libraryPickerReturnFocus && document.contains(libraryPickerReturnFocus)
            ? libraryPickerReturnFocus
            : uploadButton || input;
        focusTarget?.focus?.({ preventScroll: true });
    }
    libraryPickerReturnFocus = null;
}

function getLibrarySelectionKey(item) {
    return getLibraryItemPersistentKey(item);
}

function pruneLibrarySelection(items = collectLibraryItems()) {
    const validKeys = new Set(items.map(getLibrarySelectionKey));
    selectedLibraryItemKeys = new Set(
        Array.from(selectedLibraryItemKeys).filter(key => validKeys.has(key))
    );
}

function getSelectedLibraryItems() {
    const selected = [];
    const seen = new Set();
    collectLibraryItems().forEach(item => {
        const key = getLibrarySelectionKey(item);
        if (!selectedLibraryItemKeys.has(key) || seen.has(key)) return;
        seen.add(key);
        selected.push(item);
    });
    return selected;
}

function updateLibrarySelectionUi(items = collectLibraryItems(), filteredItems = getFilteredLibraryItems(items)) {
    pruneLibrarySelection(items);
    const selectedCount = selectedLibraryItemKeys.size;
    const visibleKeys = filteredItems.map(getLibrarySelectionKey);
    const hasVisibleItems = visibleKeys.length > 0;
    const allVisibleSelected = hasVisibleItems && visibleKeys.every(key => selectedLibraryItemKeys.has(key));

    if (librarySelectionCount) {
        librarySelectionCount.textContent = `${selectedCount.toLocaleString()} selected`;
    }
    if (librarySelectVisibleButton) {
        librarySelectVisibleButton.disabled = !hasVisibleItems || allVisibleSelected;
    }
    if (libraryClearSelectionButton) {
        const hasSelection = selectedCount > 0;
        libraryClearSelectionButton.hidden = !hasSelection;
        libraryClearSelectionButton.disabled = !hasSelection;
    }
    if (libraryDeleteSelectedButton) {
        const hasSelection = selectedCount > 0;
        libraryDeleteSelectedButton.hidden = !hasSelection;
        libraryDeleteSelectedButton.disabled = !hasSelection;
        libraryDeleteSelectedButton.textContent = selectedCount > 0 ? `Delete ${selectedCount.toLocaleString()}` : "Delete";
    }

    libraryGrid?.querySelectorAll("[data-library-item-key]").forEach(card => {
        const selected = selectedLibraryItemKeys.has(card.dataset.libraryItemKey);
        card.classList.toggle("selected", selected);
        const selectButton = card.querySelector(".library-card-select");
        selectButton?.classList.toggle("selected", selected);
        selectButton?.setAttribute("aria-pressed", String(selected));
        selectButton?.setAttribute("aria-label", selected ? "Deselect Library item" : "Select Library item");
        if (selectButton) selectButton.dataset.tooltip = selected ? "Deselect" : "Select";
    });
}

function toggleLibraryItemSelection(item) {
    const key = getLibrarySelectionKey(item);
    if (!key) return;
    if (selectedLibraryItemKeys.has(key)) {
        selectedLibraryItemKeys.delete(key);
    } else {
        selectedLibraryItemKeys.add(key);
    }
    updateLibrarySelectionUi();
}

function selectVisibleLibraryItems() {
    const items = getFilteredLibraryItems(collectLibraryItems());
    items.forEach(item => selectedLibraryItemKeys.add(getLibrarySelectionKey(item)));
    updateLibrarySelectionUi();
}

function clearLibrarySelection() {
    selectedLibraryItemKeys = new Set();
    updateLibrarySelectionUi();
}

function getLibraryDeleteDetails(items) {
    const labels = items.slice(0, 4).map(item => item.title || getLibraryItemKindLabel(item));
    if (items.length > labels.length) {
        labels.push(`${items.length - labels.length} more`);
    }
    return labels;
}

async function deleteLibraryItems(items = []) {
    const uniqueItems = [];
    const keys = new Set();
    items.forEach(item => {
        const key = getLibrarySelectionKey(item);
        if (!item || !key || keys.has(key)) return;
        keys.add(key);
        uniqueItems.push(item);
    });
    if (uniqueItems.length === 0) return;

    const approved = await showApprovalDialog({
        title: uniqueItems.length === 1 ? "Delete Library item?" : `Delete ${uniqueItems.length} Library items?`,
        message: "This removes the selection from Library. Chat messages stay unchanged.",
        details: getLibraryDeleteDetails(uniqueItems),
        confirmLabel: uniqueItems.length === 1 ? "Delete item" : `Delete ${uniqueItems.length} items`,
        cancelLabel: "Cancel"
    });
    if (!approved) return;

    const openAiCleanupResult = await deleteOpenAiFilesForLibraryKeys(keys);
    keys.forEach(key => deletedLibraryItemKeys.add(key));
    persistedLibraryItems = persistedLibraryItems.filter(item => !keys.has(getLibrarySelectionKey(item)));
    selectedLibraryItemKeys = new Set(Array.from(selectedLibraryItemKeys).filter(key => !keys.has(key)));
    libraryPickerSelectedIds = new Set(
        Array.from(libraryPickerSelectedIds).filter(id => !uniqueItems.some(item => item.id === id))
    );

    const deletedKeysSaved = persistDeletedLibraryItemKeys();
    const storedItemsSaved = persistStoredLibraryItems();
    renderLibraryView();
    if (libraryPickerModal && !libraryPickerModal.hidden) renderLibraryPicker();

    const label = uniqueItems.length === 1 ? "item" : "items";
    const cleanupMessage = getOpenAiCacheCleanupMessage(openAiCleanupResult);
    const saved = deletedKeysSaved && storedItemsSaved && openAiCleanupResult.failed === 0;
    showToast(
        saved
            ? `Deleted ${uniqueItems.length.toLocaleString()} Library ${label}.`
            : `Deleted ${uniqueItems.length.toLocaleString()} Library ${label}, but the change may not fully persist after reload.${cleanupMessage}`,
        saved ? "success" : "warning"
    );
}

function deleteSelectedLibraryItems() {
    void deleteLibraryItems(getSelectedLibraryItems());
}

function createLibrarySelectButton(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-card-select";
    button.setAttribute("aria-pressed", String(selectedLibraryItemKeys.has(getLibrarySelectionKey(item))));
    button.setAttribute("aria-label", "Select Library item");
    button.dataset.tooltip = "Select";
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5"></path>
        </svg>
    `;
    button.addEventListener("click", event => {
        event.stopPropagation();
        toggleLibraryItemSelection(item);
    });
    return button;
}

function prepareLibraryCard(card, item) {
    const key = getLibrarySelectionKey(item);
    card.dataset.libraryItemKey = key;
    card.classList.toggle("selected", selectedLibraryItemKeys.has(key));
    card.prepend(createLibrarySelectButton(item));
    return card;
}

function createLibraryActionButton(label, iconMarkup) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-card-action";
    button.setAttribute("aria-label", label);
    button.dataset.tooltip = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconMarkup}</svg><span>${label}</span>`;
    return button;
}

function createLibraryDeleteButton(item) {
    const deleteBtn = createLibraryActionButton("Delete", '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>');
    deleteBtn.classList.add("library-card-action-danger");
    deleteBtn.addEventListener("click", () => {
        void deleteLibraryItems([item]);
    });
    return deleteBtn;
}

function appendLibraryCardMeta(card, item) {
    const body = document.createElement("div");
    body.className = "library-card-body";
    const title = document.createElement("h2");
    title.textContent = item.title;
    const detail = document.createElement("p");
    detail.textContent = item.detail || item.sessionTitle;
    const meta = document.createElement("div");
    meta.className = "library-card-meta";
    meta.textContent = item.sessionTitle;
    body.append(title, detail, meta);
    card.appendChild(body);
}

function renderLibraryImageCard(item) {
    const card = document.createElement("article");
    card.className = `library-card library-media-card library-${item.origin}-image`;
    prepareLibraryCard(card, item);

    const mediaButton = document.createElement("button");
    mediaButton.type = "button";
    mediaButton.className = "library-media-button";
    mediaButton.setAttribute("aria-label", `Open ${item.title}`);
    mediaButton.addEventListener("click", () => imageLightboxController.open(item.src));

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || item.title;
    img.loading = "lazy";
    img.decoding = "async";
    mediaButton.appendChild(img);
    card.appendChild(mediaButton);
    appendLibraryCardMeta(card, item);

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    const openBtn = createLibraryActionButton("Open", '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path>');
    openBtn.addEventListener("click", () => imageLightboxController.open(item.src));
    const copyBtn = createLibraryActionButton("Copy", '<rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect>');
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, item.src));
    actions.append(openBtn, copyBtn, createLibraryDeleteButton(item));
    card.appendChild(actions);
    return card;
}

function renderLibraryVideoCard(item) {
    const card = document.createElement("article");
    card.className = "library-card library-media-card library-video-item";
    prepareLibraryCard(card, item);
    const video = document.createElement("video");
    video.className = "library-video";
    video.src = item.src;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    card.appendChild(video);
    appendLibraryCardMeta(card, item);

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    const copyBtn = createLibraryActionButton("Copy", '<rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect>');
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, item.src));
    const downloadLink = document.createElement("a");
    downloadLink.className = "library-card-action";
    downloadLink.href = item.src;
    downloadLink.download = "fauna-video.mp4";
    downloadLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg><span>Download</span>';
    actions.append(copyBtn, downloadLink, createLibraryDeleteButton(item));
    card.appendChild(actions);
    return card;
}

function renderLibraryCodeCard(item) {
    const card = document.createElement("article");
    card.className = "library-card library-code-card";
    prepareLibraryCard(card, item);
    const preview = document.createElement("pre");
    preview.className = "library-code-preview";
    const previewLines = item.code.split("\n").slice(0, 14).join("\n");
    preview.textContent = previewLines;
    card.appendChild(preview);
    appendLibraryCardMeta(card, item);

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    const openBtn = createLibraryActionButton("Open", '<path d="M3 5h18"></path><path d="M5 5v14h14V5"></path><path d="m8 13 2 2 4-6"></path>');
    openBtn.addEventListener("click", () => {
        openCodeBlocksInWorkbench([{
            lang: item.lang,
            code: item.code,
            kind: item.kind
        }], {
            title: item.title,
            subtitle: item.sessionTitle,
            initialMode: item.kind ? "preview" : "code",
            downloadText: item.code,
            downloadName: item.fileName || getCodeDownloadName(item.lang, item.kind),
            downloadMime: item.kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
        });
    });
    const copyBtn = createLibraryActionButton("Copy", '<rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect>');
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, item.code));
    const downloadBtn = createLibraryActionButton("Download", '<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>');
    downloadBtn.addEventListener("click", () => {
        downloadTextFile(item.code, item.fileName || getCodeDownloadName(item.lang, item.kind));
        showToast("Download started.", "success");
    });
    actions.append(openBtn, copyBtn, downloadBtn, createLibraryDeleteButton(item));
    card.appendChild(actions);
    return card;
}

function renderLibraryItem(item) {
    if (item.type === "image") return renderLibraryImageCard(item);
    if (item.type === "video") return renderLibraryVideoCard(item);
    return renderLibraryCodeCard(item);
}

function renderLibraryView() {
    if (!libraryView || !libraryGrid || !libraryEmpty) return;
    const items = collectLibraryItems();
    const filteredItems = getFilteredLibraryItems(items);
    pruneLibrarySelection(items);
    setLibraryHeaderSummary(items);
    renderLibraryStats(items);
    updateLibraryLayoutControls();
    applyLibraryLayoutToGrid();

    libraryGrid.replaceChildren();
    filteredItems.forEach(item => libraryGrid.appendChild(renderLibraryItem(item)));
    const isEmpty = filteredItems.length === 0;
    libraryGrid.hidden = isEmpty;
    libraryEmpty.hidden = !isEmpty;
    updateLibrarySelectionUi(items, filteredItems);
}

function refreshLibraryViewIfActive() {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) renderLibraryView();
}

function safelyDecodeFragment(value = "") {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getChatUrlFragment() {
    return activeSessionId
        ? `${WORKSPACE_URL_FRAGMENT_CHAT}=${encodeURIComponent(activeSessionId)}`
        : WORKSPACE_URL_FRAGMENT_CHAT;
}

function getWorkspaceUrlFragment() {
    return activeWorkspaceView === WORKSPACE_VIEW_LIBRARY
        ? WORKSPACE_URL_FRAGMENT_LIBRARY
        : getChatUrlFragment();
}

function updateWorkspaceUrlFragment({ replace = false } = {}) {
    if (!window.history?.pushState || !window.location) return;
    const nextHash = `#${getWorkspaceUrlFragment()}`;
    if (window.location.hash === nextHash) return;

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = nextHash;
    const historyMethod = replace ? "replaceState" : "pushState";
    try {
        window.history[historyMethod](window.history.state, "", nextUrl);
    } catch (err) {
        console.warn("Could not update Fauna URL fragment:", err);
    }
}

function parseWorkspaceUrlFragment() {
    const rawFragment = String(window.location.hash || "").replace(/^#/, "").trim();
    if (!rawFragment) return null;

    const fragment = safelyDecodeFragment(rawFragment);
    const normalizedFragment = fragment.toLowerCase();
    if (normalizedFragment === WORKSPACE_URL_FRAGMENT_LIBRARY) {
        return { view: WORKSPACE_VIEW_LIBRARY, sessionId: "" };
    }
    if (normalizedFragment === WORKSPACE_URL_FRAGMENT_CHAT || normalizedFragment === WORKSPACE_VIEW_PLAYGROUND) {
        return { view: WORKSPACE_VIEW_PLAYGROUND, sessionId: "" };
    }

    const chatMatch = fragment.match(/^chat(?:=|:|\/)(.+)$/i);
    if (chatMatch) {
        return {
            view: WORKSPACE_VIEW_PLAYGROUND,
            sessionId: safelyDecodeFragment(chatMatch[1]).trim()
        };
    }

    return null;
}

function applyWorkspaceUrlFragment({ normalize = false } = {}) {
    const route = parseWorkspaceUrlFragment();
    let shouldNormalize = normalize;

    if (route?.view === WORKSPACE_VIEW_LIBRARY) {
        setWorkspaceView(WORKSPACE_VIEW_LIBRARY, { closeSidebar: false, updateUrl: false });
    } else if (route?.view === WORKSPACE_VIEW_PLAYGROUND) {
        if (route.sessionId && chatSessions.some(session => session.id === route.sessionId && !session.archived)) {
            activateChatSession(route.sessionId, { captureCurrent: false, closeSidebar: false, updateUrl: false });
        } else {
            setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { closeSidebar: false, updateUrl: false });
            shouldNormalize = shouldNormalize || Boolean(route.sessionId);
        }
    } else if (window.location.hash) {
        shouldNormalize = true;
    }

    if (shouldNormalize) updateWorkspaceUrlFragment({ replace: true });
}

function setWorkspaceView(view, { focusComposer = false, closeSidebar = true, updateUrl = true, urlMode = "push" } = {}) {
    const nextView = view === WORKSPACE_VIEW_LIBRARY ? WORKSPACE_VIEW_LIBRARY : WORKSPACE_VIEW_PLAYGROUND;
    if (nextView === WORKSPACE_VIEW_LIBRARY && activeChatHasContent()) {
        saveCurrentSession({ render: false, updateUrl });
    }
    activeWorkspaceView = nextView;
    document.body?.classList.toggle("library-view-active", activeWorkspaceView === WORKSPACE_VIEW_LIBRARY);
    setWorkspaceNavState(activeWorkspaceView);

    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        closeCodeWorkbench();
        closeChatSessionMenus();
        setChatTitleEditing(false);
        if (libraryView) {
            libraryView.hidden = false;
            libraryView.setAttribute("aria-hidden", "false");
        }
        if (welcome) welcome.style.display = "none";
        if (chat) chat.style.display = "none";
        if (inputWrapper) inputWrapper.hidden = true;
        if (chatTitle) chatTitle.textContent = "Library";
        if (chatTitleEditBtn) chatTitleEditBtn.hidden = true;
        updateActiveChatTitle();
        renderLibraryView();
    } else {
        if (libraryView) {
            libraryView.hidden = true;
            libraryView.setAttribute("aria-hidden", "true");
        }
        if (inputWrapper) inputWrapper.hidden = false;
        if (chat) chat.style.display = activeChatHasContent() ? "block" : "none";
        if (welcome) welcome.style.display = activeChatHasContent() ? "none" : "flex";
        if (chatTitleEditBtn) chatTitleEditBtn.hidden = false;
        updateActiveChatTitle();
        updateTokenDisplay();
        if (focusComposer) focusComposerInput({ force: true });
    }

    if (closeSidebar) sidebarController.close();
    if (updateUrl) updateWorkspaceUrlFragment({ replace: urlMode === "replace" });
    scheduleAnimatedSegmentIndicators();
}

function initializeChatSessions() {
    deletedLibraryItemKeys = readDeletedLibraryItemKeys();
    persistedLibraryItems = readStoredLibraryItems();
    openAiFileCache = readStoredOpenAiFileCache();
    chatSessions = readStoredChatSessions();
    initializeUsageEvents();
    const storedActiveId = safeLocalStorageGet(ACTIVE_CHAT_SESSION_STORAGE_KEY);

    if (chatSessions.length === 0) {
        restoreEmptyChatDraft({ updateUrl: false });
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
    hasCheckedOllamaStatus = true;
    setServiceStatus("checking", "Checking Ollama");
    setLocalModelsStatus("Checking", "missing");
    try {
        const res = await fetch(OLLAMA_TAGS_URL, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        isOllamaReachable = true;
        installedOllamaModels = Array.isArray(data.models)
            ? data.models.map(model => normalizeModelId(model.name)).filter(Boolean)
            : [];
        await refreshOllamaModelCapabilities(installedOllamaModels);
        localModelOptions = getLocalModelSwitcherOptions();
        renderLocalModelChoices();
        updateModelSwitcherForProvider();
        const modelCount = installedOllamaModels.length;
        const missingCount = REQUIRED_OLLAMA_MODELS.filter(model => !isOllamaModelInstalled(model)).length;
        setServiceStatus("online", `Ollama connected · ${modelCount} models`);
        setLocalModelsStatus(missingCount > 0 ? `${missingCount} missing` : "Ready", missingCount > 0 ? "missing" : "configured");
    } catch (err) {
        isOllamaReachable = false;
        installedOllamaModels = [];
        await refreshOllamaModelCapabilities([]);
        localModelOptions = getLocalModelSwitcherOptions();
        renderLocalModelChoices();
        updateModelSwitcherForProvider();
        setServiceStatus("offline", "Ollama offline");
        setLocalModelsStatus("Ollama offline", "missing");
    }
    updateTokenDisplay();
}

async function checkOpenAiStatus() {
    if (!getOpenAiApiKey()) {
        availableOpenAiModelIds = null;
        updateModelSwitcherForProvider();
        setServiceStatus("offline", "OpenAI key needed");
        setOpenAiSettingsStatus("Key needed", "missing");
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        availableOpenAiModelIds = null;
        updateModelSwitcherForProvider();
        setServiceStatus("offline", "OpenAI bridge needed");
        setOpenAiSettingsStatus("Bridge needed", "missing");
        throw new Error(OPENAI_BRIDGE_REQUIRED_MESSAGE);
    }

    setServiceStatus("checking", "Checking OpenAI");
    setOpenAiSettingsStatus("Testing...", "missing");

    try {
        const res = await openAiFetch("/models", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(formatOpenAiApiError(data, res.status));
        }
        availableOpenAiModelIds = new Set(
            (Array.isArray(data?.data) ? data.data : [])
                .map(model => normalizeModelId(model?.id))
                .filter(Boolean)
        );
        updateModelSwitcherForProvider();
        setServiceStatus("online", "OpenAI connected");
        setOpenAiSettingsStatus("Ready", "configured");
    } catch (err) {
        availableOpenAiModelIds = null;
        updateModelSwitcherForProvider();
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
    const applyModelOptions = (options, activeModel, config = {}) => {
        if (typeof modelSwitcher?.setModels === "function") {
            modelSwitcher.setModels(options, activeModel, config);
            return;
        }
        modelSwitcher?.setActive?.(activeModel);
    };

    if (isOpenAiProvider()) {
        const activeOpenAiModel = getOpenAiChatModel();
        applyModelOptions(getOpenAiModelSwitcherOptions(), getOpenAiChatModel(), {
            reasoningModes: getOpenAiReasoningOptionsForModel(activeOpenAiModel),
            activeReasoning: getOpenAiReasoningMode(activeOpenAiModel)
        });
        updateComposerCapabilityUi();
        updateAiCallSettingsUi();
        return;
    }
    applyModelOptions(getLocalModelSwitcherOptions(), OLLAMA_MODEL, {
        reasoningModes: [],
        activeReasoning: ""
    });
    updateComposerCapabilityUi();
    updateAiCallSettingsUi();
}

function setActiveModel(model, option = {}) {
    const modelId = normalizeModelId(model);
    if (!modelId) return;

    if (isOpenAiProvider() || option.provider === AI_PROVIDER_OPENAI) {
        safeLocalStorageSet(OPENAI_CHAT_MODEL_STORAGE_KEY, modelId);
        const normalizedReasoning = getOpenAiReasoningMode(modelId);
        if (normalizedReasoning) {
            safeLocalStorageSet(OPENAI_REASONING_MODE_STORAGE_KEY, normalizedReasoning);
        } else {
            safeLocalStorageRemove(OPENAI_REASONING_MODE_STORAGE_KEY);
        }
        if (openAiChatModelInput) openAiChatModelInput.value = modelId;
        if (!isOpenAiProvider()) {
            setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
        } else {
            updateModelSwitcherForProvider();
            updateProviderSettingsUi();
        }
        if (!getOpenAiApiKey()) {
            showToast("OpenAI model selected. Add an API key before sending.", "warning");
        }
        updateTokenDisplay();
        return;
    }

    OLLAMA_MODEL = modelId;
    safeLocalStorageSet(LOCAL_CHAT_MODEL_STORAGE_KEY, OLLAMA_MODEL);
    setActiveAiProvider(AI_PROVIDER_LOCAL, { refreshStatus: false });
    renderLocalModelChoices();
    if (!isOllamaModelInstalled(modelId)) {
        showToast(`${modelId} is selected but not installed yet. Use Install missing to pull it.`, "warning");
    }
    updateTokenDisplay();
}

function chooseModelForRequest(text, currentFiles, imagePrompt, videoPrompt = null) {
    const hasImages = getImageFiles(currentFiles).length > 0;

    if (videoPrompt !== null) return MODEL_ROUTES.videoGeneration;
    if (imagePrompt !== null) return MODEL_ROUTES.imageGeneration;
    if (getNaturalImageGenerationPrompt(text, currentFiles) !== null) return MODEL_ROUTES.imageGeneration;
    if (hasImages) return MODEL_ROUTES.imageAnalysis;
    if (isCodeRequest(text, currentFiles)) return MODEL_ROUTES.code;
    if (isHighThinkingRequest(text)) return MODEL_ROUTES.reasoning;
    return OLLAMA_MODEL;
}

async function readTextStreamLines(response, { signal = null, onLine = null } = {}) {
    if (!response.body?.getReader) {
        throw new Error("This browser cannot read streamed responses.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            throwIfAborted(signal);
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lineEnd = buffer.indexOf("\n");
            while (lineEnd !== -1) {
                const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
                buffer = buffer.slice(lineEnd + 1);
                if (line.trim()) onLine?.(line);
                lineEnd = buffer.indexOf("\n");
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) onLine?.(buffer.trim());
    } finally {
        reader.releaseLock?.();
    }
}

async function readOllamaChatStream(response, { signal = null, onTextDelta = null, model = "" } = {}) {
    let content = "";
    let role = "assistant";
    let finalData = { model };

    await readTextStreamLines(response, {
        signal,
        onLine(line) {
            const data = JSON.parse(line);
            if (data?.error) {
                throw new Error(data.error);
            }

            if (data?.message?.role) role = data.message.role;
            const delta = data?.message?.content || "";
            if (delta) {
                content += delta;
                onTextDelta?.(delta, content, data);
            }

            if (data?.done) {
                finalData = { ...finalData, ...data };
            }
        }
    });

    return {
        ...finalData,
        model: finalData.model || model,
        message: {
            ...(finalData.message || {}),
            role,
            content
        }
    };
}

function parseServerSentEventBlock(block) {
    const lines = String(block || "").split("\n");
    let event = "message";
    const dataLines = [];

    lines.forEach(line => {
        if (!line || line.startsWith(":")) return;
        if (line.startsWith("event:")) {
            event = line.slice(6).trim() || event;
            return;
        }
        if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
        }
    });

    return { event, data: dataLines.join("\n") };
}

async function readServerSentEvents(response, { signal = null, onEvent = null } = {}) {
    if (!response.body?.getReader) {
        throw new Error("This browser cannot read streamed responses.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            throwIfAborted(signal);
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            let eventEnd = buffer.indexOf("\n\n");
            while (eventEnd !== -1) {
                const block = buffer.slice(0, eventEnd);
                buffer = buffer.slice(eventEnd + 2);
                if (block.trim()) onEvent?.(parseServerSentEventBlock(block));
                eventEnd = buffer.indexOf("\n\n");
            }
        }

        buffer += decoder.decode();
        buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        if (buffer.trim()) onEvent?.(parseServerSentEventBlock(buffer));
    } finally {
        reader.releaseLock?.();
    }
}

function getOpenAiStreamErrorMessage(data, status = "") {
    const error = data?.error || data?.response?.error;
    if (typeof error === "string") return error;
    return error?.message || data?.message || `OpenAI stream failed${status ? ` with HTTP ${status}` : ""}`;
}

async function normalizeOpenAiStreamBridgeResponse(response) {
    const contentType = response.headers?.get?.("Content-Type") || response.headers?.get?.("content-type") || "";
    if (!/application\/json/i.test(contentType)) {
        return response;
    }

    const data = await response.json().catch(() => null);
    if (data?.bodyBase64 || data?.status || data?.headers) {
        if (data.ok === false) {
            return new Response(JSON.stringify(data), {
                status: Math.max(400, Math.min(599, Number(data.status) || 502)),
                headers: { "Content-Type": "application/json" }
            });
        }
        return buildOpenAiBridgeResponse(data);
    }

    return new Response(JSON.stringify(data || {}), {
        status: response.status,
        headers: { "Content-Type": contentType || "application/json" }
    });
}

async function readOpenAiErrorResponse(response) {
    const text = await response.text().catch(() => "");
    if (text) {
        try {
            return formatOpenAiApiError(JSON.parse(text), response.status);
        } catch {
            return `OpenAI error ${response.status}: ${text.slice(0, 500)}`;
        }
    }
    return `OpenAI error ${response.status}: ${response.statusText || "Request failed"}`;
}

function appendOpenAiStreamText(value, state, onTextDelta, payload) {
    const delta = String(value || "");
    if (!delta) return;
    state.content += delta;
    onTextDelta?.(delta, state.content, payload);
}

function extractOpenAiTextFromStreamPayload(payload) {
    if (!payload || typeof payload !== "object") return "";
    if (typeof payload.delta === "string") return payload.delta;
    if (typeof payload.text === "string") return payload.text;
    if (typeof payload.refusal === "string") return payload.refusal;

    const part = payload.part || payload.content_part;
    if (typeof part?.text === "string") return part.text;
    if (typeof part?.refusal === "string") return part.refusal;

    const itemText = extractOpenAiResponseText(payload.item || payload.output_item || {});
    if (itemText) return itemText;

    return "";
}

async function readOpenAiResponseStream(response, { signal = null, onTextDelta = null } = {}) {
    const state = { content: "" };
    let finalResponse = null;

    await readServerSentEvents(response, {
        signal,
        onEvent({ event, data }) {
            if (!data || data === "[DONE]") return;

            let payload;
            try {
                payload = JSON.parse(data);
            } catch {
                return;
            }

            const type = payload.type || event;
            if (type === "response.output_text.delta" || type === "response.refusal.delta") {
                appendOpenAiStreamText(payload.delta, state, onTextDelta, payload);
                return;
            }

            if (type === "response.output_text.done" || type === "response.refusal.done") {
                if (!state.content.trim()) {
                    appendOpenAiStreamText(payload.text || payload.refusal, state, onTextDelta, payload);
                }
                return;
            }

            if (type === "response.content_part.done" || type === "response.output_item.done") {
                const doneText = extractOpenAiTextFromStreamPayload(payload);
                if (doneText && !state.content.trim()) {
                    appendOpenAiStreamText(doneText, state, onTextDelta, payload);
                }
                return;
            }

            if (type === "response.completed") {
                finalResponse = payload.response || payload;
                return;
            }

            if (type === "response.incomplete") {
                finalResponse = payload.response || payload;
                return;
            }

            if (type === "response.failed" || type === "error" || payload.error) {
                throw new Error(getOpenAiStreamErrorMessage(payload, response.status));
            }
        }
    });

    const data = finalResponse || {};
    const finalText = extractOpenAiResponseText(data) || state.content.trim();
    if (!finalText) {
        throw new Error("OpenAI returned an empty response.");
    }

    return {
        ...data,
        message: {
            role: "assistant",
            content: finalText
        }
    };
}

async function sendOllamaChat(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, streamOptions = {}) {
    const triedModels = [];
    const modelsToTry = Array.from(new Set([preferredModel, FALLBACK_MODEL].filter(Boolean)));
    let lastError = null;
    const shouldStream = typeof streamOptions.onTextDelta === "function";

    for (const model of modelsToTry) {
        triedModels.push(model);
        let streamedContent = false;

        try {
            const res = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal,
                body: JSON.stringify({
                    model,
                    messages,
                    options,
                    ...(isAiCachingEnabled ? { keep_alive: OLLAMA_CACHE_KEEP_ALIVE } : {}),
                    stream: shouldStream
                })
            });
            markGenerationConnectionEstablished();
            hasCheckedOllamaStatus = true;
            isOllamaReachable = true;

            if (res.ok) {
                const data = shouldStream
                    ? await readOllamaChatStream(res, {
                        signal,
                        model,
                        onTextDelta: (delta, content, chunk) => {
                            streamedContent = streamedContent || Boolean(delta);
                            streamOptions.onTextDelta(delta, content, chunk);
                        }
                    })
                    : await res.json();
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
            if (shouldStream && streamedContent) throw err;
            if (isLikelyOllamaConnectionError(err)) {
                hasCheckedOllamaStatus = true;
                isOllamaReachable = false;
                installedOllamaModels = [];
                setServiceStatus("offline", "Ollama offline");
                setLocalModelsStatus("Ollama offline", "missing");
                updateTokenDisplay();
                lastError = new Error(getOllamaOfflineErrorMessage());
                break;
            }
            lastError = err;
        }
    }

    throw new Error(`No available model responded. Tried: ${triedModels.join(", ")}${lastError ? `. Last error: ${lastError.message}` : ""}`);
}

function normalizeHeaderMap(headers = {}) {
    const normalized = {};
    if (headers instanceof Headers) {
        headers.forEach((value, key) => {
            normalized[key] = value;
        });
        return normalized;
    }
    Object.entries(headers || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) normalized[key] = String(value);
    });
    return normalized;
}

function getHeaderValue(headers, name) {
    const target = name.toLowerCase();
    const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
    return entry ? entry[1] : "";
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            resolve(result.includes(",") ? result.split(",").pop() : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function buildOpenAiBridgeBody(body, headers = {}) {
    if (body === null || body === undefined) return null;

    if (body instanceof FormData) {
        const fields = [];
        for (const [name, value] of body.entries()) {
            if (value instanceof Blob) {
                fields.push({
                    name,
                    fileName: value.name || "upload.bin",
                    mimeType: value.type || "application/octet-stream",
                    dataBase64: await blobToBase64(value)
                });
            } else {
                fields.push({ name, value: String(value) });
            }
        }
        return { kind: "multipart", fields };
    }

    if (body instanceof Blob) {
        return {
            kind: "base64",
            contentType: body.type || getHeaderValue(headers, "Content-Type") || "application/octet-stream",
            dataBase64: await blobToBase64(body)
        };
    }

    const text = String(body);
    const contentType = getHeaderValue(headers, "Content-Type");
    if (/application\/json/i.test(contentType)) {
        try {
            return { kind: "json", value: JSON.parse(text) };
        } catch {
            return { kind: "text", contentType, value: text };
        }
    }

    return { kind: "text", contentType: contentType || "text/plain; charset=utf-8", value: text };
}

function base64ToUint8Array(value) {
    const binary = window.atob(value || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function buildOpenAiBridgeResponse(data) {
    if (data?.truncated) {
        throw new Error("OpenAI response was too large for the local bridge.");
    }
    const status = Math.max(200, Math.min(599, Number(data?.status) || 502));
    return new Response(base64ToUint8Array(data?.bodyBase64), {
        status,
        headers: data?.headers || {}
    });
}

function buildLocalAiBridgeResponse(data) {
    if (data?.truncated) {
        throw new Error("Local AI response was too large for the local bridge.");
    }
    const status = Math.max(200, Math.min(599, Number(data?.status) || 502));
    return new Response(base64ToUint8Array(data?.bodyBase64), {
        status,
        headers: data?.headers || {}
    });
}

async function openAiFetch(path, { method = "POST", headers = {}, body = null, signal = null, streamResponse = false } = {}) {
    const key = requireOpenAiApiKey();
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error(OPENAI_BRIDGE_REQUIRED_MESSAGE);
    }

    const normalizedHeaders = normalizeHeaderMap(headers);
    const bridgeBody = {
        path,
        method,
        apiKey: key,
        headers: normalizedHeaders,
        streamResponse: Boolean(streamResponse),
        body: await buildOpenAiBridgeBody(body, normalizedHeaders)
    };

    if (streamResponse) {
        const baseUrl = getWorkspaceBridgeBaseUrl();
        let res;
        try {
            res = await fetch(`${baseUrl}${OPENAI_BRIDGE_PATH}`, {
                method: "POST",
                headers: getWorkspaceBridgeHeaders(true),
                body: JSON.stringify(bridgeBody),
                signal
            });
        } catch (err) {
            if (err.name === "AbortError") throw err;
            throw createWorkspaceBridgeNetworkError(OPENAI_BRIDGE_PATH, err);
        }
        markGenerationConnectionEstablished();
        return normalizeOpenAiStreamBridgeResponse(res);
    }

    const data = await requestWorkspaceBridge(OPENAI_BRIDGE_PATH, {
        method: "POST",
        signal,
        body: bridgeBody
    });
    return buildOpenAiBridgeResponse(data);
}

async function localAiFetch(url, { method = "POST", headers = {}, body = null, signal = null } = {}) {
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("Local AI endpoints need the Local Workspace Bridge. Start local-bridge.py, save the bridge token, and enable Local Workspace in Tools.");
    }

    const normalizedHeaders = normalizeHeaderMap(headers);
    const data = await requestWorkspaceBridge(LOCAL_AI_BRIDGE_PATH, {
        method: "POST",
        signal,
        body: {
            url,
            method,
            headers: normalizedHeaders,
            body: await buildOpenAiBridgeBody(body, normalizedHeaders)
        }
    });
    return buildLocalAiBridgeResponse(data);
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

function normalizeOpenAiFileCacheEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const cacheKey = String(raw.cacheKey || raw.key || "").trim();
    const fileId = String(raw.fileId || raw.id || "").trim();
    if (!cacheKey || !fileId) return null;
    const libraryKeys = [
        ...(Array.isArray(raw.libraryKeys) ? raw.libraryKeys : []),
        raw.libraryKey,
        raw.librarySourceKey
    ].map(value => String(value || "").trim()).filter(Boolean);
    const uniqueLibraryKeys = Array.from(new Set(libraryKeys));
    return {
        cacheKey,
        fileId,
        purpose: String(raw.purpose || OPENAI_VISION_FILE_PURPOSE),
        fileName: String(raw.fileName || raw.filename || ""),
        type: String(raw.type || raw.mimeType || ""),
        size: Number(raw.size || raw.bytes || 0) || 0,
        sha256: String(raw.sha256 || ""),
        libraryKeys: uniqueLibraryKeys,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
        pendingDelete: Boolean(raw.pendingDelete),
        pendingDeleteAt: raw.pendingDeleteAt || "",
        pendingDeleteReason: String(raw.pendingDeleteReason || "")
    };
}

function readStoredOpenAiFileCache() {
    const raw = safeLocalStorageGet(OPENAI_FILE_CACHE_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeOpenAiFileCacheEntry)
            .filter(entry => {
                const key = `${entry?.cacheKey || ""}:${entry?.fileId || ""}`;
                if (!entry || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse OpenAI file cache:", err);
        return [];
    }
}

function pruneOpenAiFileCacheEntries(entries = openAiFileCache) {
    return [...entries]
        .map(normalizeOpenAiFileCacheEntry)
        .filter(Boolean)
        .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))
        .slice(0, OPENAI_FILE_CACHE_MAX_ENTRIES);
}

function persistOpenAiFileCache() {
    openAiFileCache = pruneOpenAiFileCacheEntries(openAiFileCache);
    if (openAiFileCache.length === 0) {
        return safeLocalStorageRemove(OPENAI_FILE_CACHE_STORAGE_KEY);
    }
    return safeLocalStorageSet(OPENAI_FILE_CACHE_STORAGE_KEY, JSON.stringify(openAiFileCache));
}

function getOpenAiFileLibraryKey(file) {
    return String(file?.__faunaLibrarySourceKey || "").trim();
}

async function getBlobSha256Hex(blob) {
    if (!window.crypto?.subtle || !(blob instanceof Blob)) return "";
    const buffer = await blob.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function getOpenAiVisionUploadCacheKey(file) {
    const hash = await getBlobSha256Hex(file);
    if (hash) {
        return {
            cacheKey: `${OPENAI_VISION_FILE_PURPOSE}:sha256:${hash}:${file.type || "image"}:${file.size || 0}`,
            sha256: hash
        };
    }
    return {
        cacheKey: [
            OPENAI_VISION_FILE_PURPOSE,
            "file",
            file.name || "",
            file.type || "",
            file.size || 0,
            file.lastModified || 0
        ].join(":"),
        sha256: ""
    };
}

function addLibraryKeyToOpenAiCacheEntry(entry, libraryKey) {
    const key = String(libraryKey || "").trim();
    if (!entry || !key) return false;
    const keys = new Set(entry.libraryKeys || []);
    const previousSize = keys.size;
    keys.add(key);
    entry.libraryKeys = Array.from(keys);
    return keys.size !== previousSize;
}

function upsertOpenAiFileCacheEntry({ cacheKey, sha256 = "", file, fileId, libraryKey = "" }) {
    const now = new Date().toISOString();
    let entry = openAiFileCache.find(item => item.cacheKey === cacheKey && item.fileId === fileId);
    if (!entry) {
        entry = {
            cacheKey,
            fileId,
            purpose: OPENAI_VISION_FILE_PURPOSE,
            fileName: file?.name || "image.png",
            type: file?.type || "image/png",
            size: Number(file?.size || 0) || 0,
            sha256,
            libraryKeys: [],
            createdAt: now,
            updatedAt: now,
            pendingDelete: false,
            pendingDeleteAt: "",
            pendingDeleteReason: ""
        };
        openAiFileCache.unshift(entry);
    }
    entry.fileName = file?.name || entry.fileName || "image.png";
    entry.type = file?.type || entry.type || "image/png";
    entry.size = Number(file?.size || entry.size || 0) || 0;
    entry.sha256 = sha256 || entry.sha256 || "";
    entry.updatedAt = now;
    entry.pendingDelete = false;
    entry.pendingDeleteAt = "";
    entry.pendingDeleteReason = "";
    addLibraryKeyToOpenAiCacheEntry(entry, libraryKey);
    persistOpenAiFileCache();
    return entry;
}

function removeOpenAiFileCacheEntry(entry) {
    if (!entry) return;
    openAiFileCache = openAiFileCache.filter(item => !(item.cacheKey === entry.cacheKey && item.fileId === entry.fileId));
    persistOpenAiFileCache();
}

function getOpenAiFilePath(fileId) {
    const clean = String(fileId || "").trim();
    if (!/^[A-Za-z0-9_.-]+$/.test(clean)) {
        throw new Error("Invalid OpenAI file id.");
    }
    return `/files/${encodeURIComponent(clean)}`;
}

async function fetchOpenAiFileMetadata(fileId, signal = null) {
    const res = await openAiFetch(getOpenAiFilePath(fileId), {
        method: "GET",
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return null;
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return data;
}

async function deleteOpenAiStoredFile(fileId, signal = null) {
    const res = await openAiFetch(getOpenAiFilePath(fileId), {
        method: "DELETE",
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return { deleted: true, missing: true };
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return data;
}

function isOpenAiBridgeCapabilityError(error) {
    return /OpenAI endpoint is not allowed by this bridge|supports GET and POST only|Local bridge needs restart/i.test(error?.message || "");
}

async function getReusableOpenAiVisionFile(file, cacheKey, libraryKey, signal = null) {
    const candidates = openAiFileCache
        .filter(entry => (
            entry.cacheKey === cacheKey
            && entry.purpose === OPENAI_VISION_FILE_PURPOSE
            && entry.fileId
            && !entry.pendingDelete
        ))
        .sort((a, b) => {
            const aMatchesLibrary = libraryKey && a.libraryKeys?.includes(libraryKey);
            const bMatchesLibrary = libraryKey && b.libraryKeys?.includes(libraryKey);
            if (aMatchesLibrary !== bMatchesLibrary) return aMatchesLibrary ? -1 : 1;
            return Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0);
        });

    for (const entry of candidates) {
        try {
            const metadata = await fetchOpenAiFileMetadata(entry.fileId, signal);
            if (!metadata) {
                removeOpenAiFileCacheEntry(entry);
                continue;
            }
            upsertOpenAiFileCacheEntry({
                cacheKey,
                sha256: entry.sha256,
                file,
                fileId: entry.fileId,
                libraryKey
            });
            return { fileId: entry.fileId, reused: true };
        } catch (err) {
            if (isOpenAiBridgeCapabilityError(err)) {
                console.warn("OpenAI file cache validation needs a restarted local bridge; reusing cached file id.", err);
                addLibraryKeyToOpenAiCacheEntry(entry, libraryKey);
                entry.updatedAt = new Date().toISOString();
                persistOpenAiFileCache();
                return { fileId: entry.fileId, reused: true, validationSkipped: true };
            }
            console.warn("Could not validate cached OpenAI file id; uploading a fresh copy.", err);
        }
    }

    return null;
}

async function uploadOpenAiVisionImageToStorage(file, signal = null) {
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

async function prepareOpenAiVisionImage(file, signal = null) {
    if (!isAiCachingEnabled) {
        const fileId = await uploadOpenAiVisionImageToStorage(file, signal);
        return { fileId, reused: false };
    }

    const { cacheKey, sha256 } = await getOpenAiVisionUploadCacheKey(file);
    const libraryKey = getOpenAiFileLibraryKey(file);
    const cached = await getReusableOpenAiVisionFile(file, cacheKey, libraryKey, signal);
    if (cached) return cached;

    const fileId = await uploadOpenAiVisionImageToStorage(file, signal);
    upsertOpenAiFileCacheEntry({ cacheKey, sha256, file, fileId, libraryKey });
    return { fileId, reused: false };
}

function formatOpenAiApiError(data, status) {
    const message = data?.error?.message
        || (typeof data?.error === "string" ? data.error : "")
        || data?.message
        || `OpenAI responded with HTTP ${status}`;
    if (/OpenAI endpoint is not allowed by this bridge/i.test(message)) {
        return "Local bridge needs restart: this running bridge does not allow this OpenAI endpoint yet. Stop it, restart `py -3 local-bridge.py --root . --port 8765`, save the printed token, then try again.";
    }
    const code = data?.error?.code || data?.error?.type || data?.code;
    return `OpenAI error${status ? ` ${status}` : ""}: ${message}${code ? ` (${code})` : ""}`;
}

function buildOpenAiContentParts(message) {
    const parts = [];
    const text = sanitizeContentForModelContext(message?.content || "").trim();
    if (text) {
        parts.push({ type: "input_text", text });
    }

    const openAiImageFileIds = Array.isArray(message?.openAiImageFileIds) ? message.openAiImageFileIds : [];
    openAiImageFileIds.forEach(fileId => {
        if (fileId) parts.push({ type: "input_image", file_id: fileId });
    });

    return parts.length ? parts : [{ type: "input_text", text: "" }];
}

function openAiMessagesIncludeImages(messages = []) {
    return messages.some(message =>
        Array.isArray(message?.openAiImageFileIds) && message.openAiImageFileIds.some(Boolean)
    );
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

async function sendOpenAiResponse(messages, options = {}, signal = null, streamOptions = {}) {
    const prepared = prepareOpenAiResponseInput(messages);
    const model = getOpenAiChatModel();
    if (openAiMessagesIncludeImages(messages) && !openAiModelSupportsImages(model)) {
        throw new Error(`${model} does not support image input. Choose a vision-capable chat model before sending images.`);
    }
    const payload = {
        model,
        input: prepared.input
    };

    if (prepared.instructions) payload.instructions = prepared.instructions;
    if (shouldSendOpenAiReasoningEffort(model)) {
        payload.reasoning = { effort: getOpenAiReasoningMode(model) };
    }
    if (Number.isFinite(options.temperature) && openAiModelSupportsTemperature(model)) {
        payload.temperature = options.temperature;
    }
    if (Number.isFinite(options.top_p) && openAiModelSupportsTopP(model)) {
        payload.top_p = options.top_p;
    }
    if (Number.isFinite(options.max_output_tokens) && options.max_output_tokens > 0 && openAiModelSupportsMaxOutputTokens(model)) {
        payload.max_output_tokens = options.max_output_tokens;
    }
    if (options.text_verbosity && openAiModelSupportsVerbosity(model)) {
        payload.text = {
            ...(payload.text || {}),
            verbosity: normalizeOpenAiVerbosity(options.text_verbosity)
        };
    }
    applyOpenAiPromptCaching(payload, prepared.instructions);

    if (typeof streamOptions.onTextDelta === "function" && openAiModelSupportsStreaming(model)) {
        payload.stream = true;
        const res = await openAiFetch("/responses", {
            signal,
            streamResponse: true,
            headers: {
                "Content-Type": "application/json",
                "Accept": "text/event-stream"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error(await readOpenAiErrorResponse(res));
        }
        return readOpenAiResponseStream(res, {
            signal,
            onTextDelta: streamOptions.onTextDelta
        });
    }

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

async function sendProviderChat(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, streamOptions = {}) {
    if (isOpenAiProvider()) {
        return sendOpenAiResponse(messages, options, signal, streamOptions);
    }
    if (hasCheckedOllamaStatus && !isOllamaReachable) {
        throw new Error(getOllamaOfflineErrorMessage());
    }
    const unavailableReason = getLocalChatModelUnavailableReason(preferredModel);
    if (unavailableReason) throw new Error(unavailableReason);
    return sendOllamaChat(messages, options, preferredModel, signal, streamOptions);
}

function shouldSearchWeb(text) {
    if (!canUseComposerTools()) return false;
    if (!isWebSearchEnabled || !text) return false;
    if (/^\/(?:search|web)\b/i.test(text)) return true;
    if (/\bhttps?:\/\//i.test(text)) return true;
    return /\b(link|links|url|website|site|source|sources|search|inspect|browse|look up|lookup|online|internet|web|latest|current|today|news|recent|price|where can i|find me|provide me information|useful links|usefull links|skakel|soek|nuutste|vandag)\b/i.test(text);
}

function shouldUseApproxWeatherContext(text) {
    if (!canUseComposerTools() || !text) return false;
    if (/^\/(?:weather|wetter|temp|temperature|location|ip-location)\b/i.test(text)) return true;
    const asksWeather = /\b(weather|wetter|temperature|temperatur|degrees?|outside|warm|cold|hot|kalt|draußen|draussen)\b/i.test(text)
        || /\b(?:wie\s+)?viel\s+grad\b/i.test(text)
        || /\bgrad\s+(?:ist|sind|hat|haben)\b/i.test(text);
    const asksHere = /\b(bei mir|hier|near me|my location|where i am|current|now|gerade|jetzt|aktuell|today|heute|local|lokal)\b/i.test(text);
    return asksWeather && asksHere;
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
    markGenerationConnectionEstablished();
    if (!res.ok) throw new Error("Wikipedia search failed");
    const data = await res.json();

    return (data?.query?.search || []).slice(0, 5).map(item => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
        snippet: item.snippet?.replace(/<[^>]+>/g, "") || ""
    }));
}

function normalizeReadableWebText(text) {
    return String(text || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .join("\n")
        .trim();
}

function getWebSnippet(text, maxLength = 180) {
    const snippet = String(text || "").replace(/\s+/g, " ").trim();
    if (snippet.length <= maxLength) return snippet;
    return `${snippet.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function normalizeWebUrl(value) {
    let text = String(value || "").trim().replace(/^["'`]+|["'`]+$/g, "");
    while (text && /[)\].,!?;]$/.test(text)) {
        text = text.slice(0, -1);
    }
    if (text && !/^[a-z][a-z0-9+.-]*:\/\//i.test(text) && /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(text)) {
        text = `https://${text}`;
    }
    try {
        const parsed = new URL(text);
        if (!/^https?:$/i.test(parsed.protocol)) return "";
        return parsed.href;
    } catch {
        return "";
    }
}

function extractWebUrlsFromText(text, limit = 3) {
    const urls = [];
    const seen = new Set();
    for (const match of String(text || "").matchAll(WEB_URL_RE)) {
        const url = normalizeWebUrl(match[0]);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        urls.push(url);
        if (urls.length >= limit) break;
    }
    return urls;
}

function extractReadablePageText(rawText, contentType = "") {
    const raw = String(rawText || "");
    const isHtml = /html/i.test(contentType) || /^\s*<!doctype html|^\s*<html[\s>]/i.test(raw);
    if (!isHtml || typeof DOMParser === "undefined") {
        return {
            title: "",
            text: normalizeReadableWebText(raw)
        };
    }

    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("script, style, noscript, svg, canvas, iframe, nav, footer").forEach(node => node.remove());
    const title = normalizeReadableWebText(doc.querySelector("title")?.textContent || "");
    const text = normalizeReadableWebText(doc.body?.innerText || doc.body?.textContent || raw);
    return { title, text };
}

async function inspectUrlInBrowser(url, signal = null) {
    const res = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
        },
        signal
    });
    markGenerationConnectionEstablished();
    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const readable = extractReadablePageText(raw, contentType);
    return {
        url,
        finalUrl: res.url || url,
        title: readable.title,
        contentType,
        status: res.status,
        source: "browser",
        content: readable.text,
        truncated: false
    };
}

async function inspectUrlWithBridge(url, signal = null) {
    const result = await requestWorkspaceBridge("/fetch-url", {
        method: "POST",
        signal,
        body: {
            url,
            maxBytes: 120000
        }
    });
    return {
        url,
        finalUrl: result.finalUrl || result.url || url,
        title: result.title || "",
        contentType: result.contentType || "",
        status: result.status,
        source: "local bridge",
        content: normalizeReadableWebText(result.content || ""),
        truncated: result.truncated === true
    };
}

function formatInspectedPageResult(page) {
    const title = page.title || page.finalUrl || page.url || "Untitled page";
    const lines = [
        `Inspected page: ${title}`,
        `URL: ${page.url || page.finalUrl || ""}`
    ];
    if (page.finalUrl && page.url && page.finalUrl !== page.url) lines.push(`Final URL: ${page.finalUrl}`);
    if (page.status) lines.push(`HTTP status: ${page.status}`);
    if (page.contentType) lines.push(`Content type: ${page.contentType}`);
    if (page.source) lines.push(`Inspection source: ${page.source}`);
    if (page.error) {
        lines.push(`Inspection failed: ${page.error}`);
        return lines.join("\n");
    }
    const content = trimLocalToolText(page.content || "[No readable page text found]", WEB_INSPECT_RESULT_MAX_CHARS);
    const truncated = page.truncated ? "\n[Page content truncated by bridge limit]" : "";
    return `${lines.join("\n")}\nReadable text:\n${content}${truncated}`;
}

function pageToWebSource(page) {
    const url = page.finalUrl || page.url;
    if (!url) return null;
    return {
        title: page.title || getSourceHost(url) || url,
        url,
        snippet: page.error ? `Inspection failed: ${page.error}` : getWebSnippet(page.content)
    };
}

function normalizeWebSource(source) {
    if (!source?.url) return null;
    const url = normalizeWebUrl(source.url);
    if (!url) return null;
    return {
        title: String(source.title || getSourceHost(url) || url).trim(),
        url,
        snippet: String(source.snippet || "").replace(/\s+/g, " ").trim()
    };
}

function mergeWebSources(...sourceGroups) {
    const seen = new Set();
    const merged = [];
    sourceGroups.flat().forEach(source => {
        const normalized = normalizeWebSource(source);
        if (!normalized || seen.has(normalized.url)) return;
        seen.add(normalized.url);
        merged.push(normalized);
    });
    return merged.slice(0, 10);
}

async function inspectUrlForModel(value, signal = null) {
    const url = normalizeWebUrl(value);
    if (!url) {
        throw new Error("inspect_url requires a valid http or https URL.");
    }

    let browserError = null;
    try {
        const page = await inspectUrlInBrowser(url, signal);
        if (page.content) return page;
        browserError = new Error("No readable text was found in the browser response.");
    } catch (err) {
        if (err.name === "AbortError") throw err;
        browserError = err;
    }

    if (hasWorkspaceBridgeAccess()) {
        try {
            const page = await inspectUrlWithBridge(url, signal);
            if (page.content) return page;
            throw new Error("The bridge reached the page, but no readable text was found.");
        } catch (err) {
            if (err.name === "AbortError") throw err;
            if (/Unknown endpoint|fetch-url/i.test(err.message || "")) {
                throw new Error("Local bridge needs restart: this running bridge does not allow URL inspection yet. Stop it, restart `py -3 local-bridge.py --root . --port 8765`, save the printed token, then try again.");
            }
            throw err;
        }
    }

    throw new Error(`Browser inspection failed${browserError?.message ? `: ${browserError.message}` : ""}. Enable Local Workspace Bridge to inspect most live sites, or paste the page text/screenshot.`);
}

async function inspectPromptUrls(text, signal = null) {
    const urls = extractWebUrlsFromText(text);
    const pages = [];
    for (const url of urls) {
        try {
            pages.push(await inspectUrlForModel(url, signal));
        } catch (err) {
            if (err.name === "AbortError") throw err;
            pages.push({
                url,
                finalUrl: url,
                title: getSourceHost(url) || url,
                source: "web inspector",
                content: "",
                error: err.message
            });
        }
    }
    return pages;
}

async function getWebContextForPrompt(text, signal = null, options = {}) {
    const query = buildSearchQuery(text);
    const wikiResults = await searchWithWikipedia(query).catch(() => []);
    const inspectedPages = options.inspectUrls === false
        ? []
        : await inspectPromptUrls(text, signal);

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

    if (results.length === 0 && inspectedPages.length === 0) {
        return { context: "", sources: [], query, resultCount: 0 };
    }

    const sourceLines = results.map((result, index) => {
        const snippet = result.snippet ? `\n   Summary: ${result.snippet}` : "";
        return `${index + 1}. ${result.title}\n   URL: ${result.url}${snippet}`;
    }).join("\n");
    const inspectedLines = inspectedPages.map(formatInspectedPageResult).join("\n\n");

    const groundingInstruction = isGroundingEnabled
        ? "Ground the answer in these online results and inspected pages. Cite links from this list for factual claims based on web results, and say when the results are insufficient."
        : "Use these online results as optional background. You may include useful links from this list, but you do not need to strictly ground every factual claim in them.";

    const sections = [
        sourceLines ? `Search results:\n${sourceLines}` : "",
        inspectedLines ? `Inspected pages:\n${inspectedLines}` : ""
    ].filter(Boolean).join("\n\n");
    const inspectedSources = inspectedPages.map(pageToWebSource).filter(Boolean);
    const sources = mergeWebSources(results, inspectedSources);

    return {
        context: `\n\n--- Web Search Context ---\nSearch query: ${query}\n${groundingInstruction}\n${sections}\n--- End Web Search Context ---`,
        sources,
        query,
        resultCount: sources.length
    };
}

function firstFiniteNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return null;
}

function clampDurationMs(value, fallbackMs, maxMs = WAIT_TOOL_MAX_DELAY_MS) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallbackMs;
    return Math.max(0, Math.min(maxMs, Math.round(number)));
}

function formatPreciseDuration(ms) {
    const duration = Math.max(0, Number(ms) || 0);
    if (duration < 1000) return `${Math.round(duration)}ms`;
    if (duration < 60 * 1000) return `${(duration / 1000).toFixed(duration < 10 * 1000 ? 2 : 1)}s`;
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
}

function parseDurationStringToMs(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return null;

    if (/^\d+(?:\.\d+)?$/.test(text)) {
        return Number(text) * 1000;
    }

    const clockMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (clockMatch) {
        const first = Number(clockMatch[1]);
        const second = Number(clockMatch[2]);
        const third = Number(clockMatch[3] || 0);
        return clockMatch[3]
            ? ((first * 60 * 60) + (second * 60) + third) * 1000
            : ((first * 60) + second) * 1000;
    }

    let totalMs = 0;
    const unitRe = /(-?\d+(?:\.\d+)?)\s*(milliseconds?|msecs?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/gi;
    for (const match of text.matchAll(unitRe)) {
        const amount = Number(match[1]);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const unit = match[2].toLowerCase();
        if (/^m(?:illi|sec)|^ms$/.test(unit)) totalMs += amount;
        else if (/^s/.test(unit)) totalMs += amount * 1000;
        else if (/^m/.test(unit)) totalMs += amount * 60 * 1000;
        else if (/^h/.test(unit)) totalMs += amount * 60 * 60 * 1000;
    }

    return totalMs > 0 ? totalMs : null;
}

function getToolCallDurationMs(toolCall = {}, {
    fallbackMs = WAIT_TOOL_DEFAULT_DELAY_MS,
    maxMs = WAIT_TOOL_MAX_DELAY_MS,
    prefix = ""
} = {}) {
    const directMs = firstFiniteNumber(
        toolCall[`${prefix}Milliseconds`],
        toolCall[`${prefix}Ms`],
        prefix ? null : toolCall.milliseconds,
        prefix ? null : toolCall.ms,
        prefix ? null : toolCall.durationMs,
        prefix ? null : toolCall.delayMs
    );
    if (directMs !== null) return clampDurationMs(directMs, fallbackMs, maxMs);

    const seconds = firstFiniteNumber(
        toolCall[`${prefix}Seconds`],
        prefix ? null : toolCall.seconds,
        prefix ? null : toolCall.sec
    );
    const minutes = firstFiniteNumber(
        toolCall[`${prefix}Minutes`],
        prefix ? null : toolCall.minutes,
        prefix ? null : toolCall.min
    );
    const hours = firstFiniteNumber(
        toolCall[`${prefix}Hours`],
        prefix ? null : toolCall.hours
    );
    const componentMs = (
        Math.max(0, seconds || 0) * 1000
        + Math.max(0, minutes || 0) * 60 * 1000
        + Math.max(0, hours || 0) * 60 * 60 * 1000
    );
    if (componentMs > 0) return clampDurationMs(componentMs, fallbackMs, maxMs);

    const rawDuration = toolCall[`${prefix}Duration`] || (!prefix ? toolCall.duration || toolCall.delay : "");
    const parsedDuration = parseDurationStringToMs(rawDuration);
    if (parsedDuration !== null) return clampDurationMs(parsedDuration, fallbackMs, maxMs);

    if (!prefix && toolCall.until) {
        const targetTime = Date.parse(toolCall.until);
        if (Number.isFinite(targetTime)) {
            return clampDurationMs(targetTime - Date.now(), fallbackMs, maxMs);
        }
    }

    return fallbackMs;
}

function waitWithAbort(ms, signal = null) {
    const delayMs = clampDurationMs(ms, 0, WAIT_TOOL_MAX_DELAY_MS);
    if (delayMs <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timerId = window.setTimeout(() => {
            signal?.removeEventListener?.("abort", handleAbort);
            resolve();
        }, delayMs);
        function handleAbort() {
            window.clearTimeout(timerId);
            reject(new DOMException("Wait stopped", "AbortError"));
        }
        if (signal?.aborted) {
            handleAbort();
        } else {
            signal?.addEventListener?.("abort", handleAbort, { once: true });
        }
    });
}

function getWaitForCommandIntervalMs(toolCall = {}) {
    const direct = firstFiniteNumber(toolCall.intervalMilliseconds, toolCall.intervalMs);
    const seconds = firstFiniteNumber(toolCall.intervalSeconds);
    const parsed = parseDurationStringToMs(toolCall.interval);
    const value = direct ?? (seconds !== null ? seconds * 1000 : parsed);
    return Math.max(
        WAIT_FOR_COMMAND_MIN_INTERVAL_MS,
        clampDurationMs(value ?? WAIT_FOR_COMMAND_DEFAULT_INTERVAL_MS, WAIT_FOR_COMMAND_DEFAULT_INTERVAL_MS, WAIT_TOOL_MAX_DELAY_MS)
    );
}

function normalizeExpectedExitCode(value) {
    if (value === null || value === undefined || value === "" || String(value).toLowerCase() === "any") return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : 0;
}

function commandResultMatchesWaitCondition(result, {
    expectedExitCode = 0,
    contains = "",
    caseSensitive = false
} = {}) {
    if (expectedExitCode !== null && Number(result?.exitCode) !== expectedExitCode) return false;
    const needle = String(contains || "").trim();
    if (!needle) return true;
    const output = [result?.stdout, result?.stderr].filter(Boolean).join("\n");
    return caseSensitive
        ? output.includes(needle)
        : output.toLowerCase().includes(needle.toLowerCase());
}

async function executeWaitForCommandToolCall(toolCall, signal = null) {
    const command = String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim();
    if (!command) {
        return executeWaitToolCall(toolCall, signal);
    }
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("wait_for with command requires the Local Workspace Bridge.");
    }

    const maxMs = getToolCallDurationMs(toolCall, {
        fallbackMs: WAIT_FOR_COMMAND_DEFAULT_MAX_MS,
        maxMs: WAIT_FOR_COMMAND_MAX_MS,
        prefix: "max"
    });
    const intervalMs = getWaitForCommandIntervalMs(toolCall);
    const expectedExitCode = normalizeExpectedExitCode(toolCall.expectedExitCode ?? toolCall.exitCode ?? 0);
    const contains = String(toolCall.contains || toolCall.match || toolCall.stdoutContains || "").trim();
    const commandTimeout = Math.max(1, Math.min(60, Number(toolCall.commandTimeout || toolCall.commandTimeoutSeconds || toolCall.timeout || 10) || 10));
    const startedAt = Date.now();
    let attempts = 0;
    let lastResult = null;

    while (Date.now() - startedAt <= maxMs) {
        throwIfAborted(signal);
        attempts += 1;
        lastResult = await runWorkspaceCommand(command, toolCall.cwd || ".", commandTimeout, signal);
        if (commandResultMatchesWaitCondition(lastResult, {
            expectedExitCode,
            contains,
            caseSensitive: toolCall.caseSensitive === true
        })) {
            return [
                `wait_for matched after ${formatDuration(Date.now() - startedAt)} (${attempts} attempt${attempts === 1 ? "" : "s"}).`,
                contains ? `Condition: output contains "${contains}".` : `Condition: exit code ${expectedExitCode ?? "any"}.`,
                "",
                formatWorkspaceCommandResult(lastResult)
            ].join("\n");
        }

        const remainingMs = maxMs - (Date.now() - startedAt);
        if (remainingMs <= 0) break;
        await waitWithAbort(Math.min(intervalMs, remainingMs), signal);
    }

    return [
        `wait_for timed out after ${formatDuration(Date.now() - startedAt)} (${attempts} attempt${attempts === 1 ? "" : "s"}).`,
        contains ? `Unmet condition: output contains "${contains}".` : `Unmet condition: exit code ${expectedExitCode ?? "any"}.`,
        "",
        lastResult ? formatWorkspaceCommandResult(lastResult) : "Command did not run before the timeout."
    ].join("\n");
}

async function executeWaitToolCall(toolCall, signal = null) {
    const waitMs = getToolCallDurationMs(toolCall);
    const startedAt = Date.now();
    await waitWithAbort(waitMs, signal);
    const reason = String(toolCall.reason || toolCall.label || "").trim();
    return [
        `Waited ${formatDuration(Date.now() - startedAt)}.`,
        reason ? `Reason: ${reason}` : "",
        `Requested duration: ${formatDuration(waitMs)}.`
    ].filter(Boolean).join("\n");
}

function getStopwatchLabel(toolCall = {}) {
    return String(toolCall.label || toolCall.name || toolCall.reason || "Stopwatch").trim() || "Stopwatch";
}

function shouldStopwatchWaitForUserInput(toolCall = {}) {
    const mode = String(toolCall.mode || toolCall.until || toolCall.target || toolCall.waitFor || "").trim().toLowerCase();
    return /^(?:user|input|user_input|user-input|reply|response|answer|manual|stop)$/.test(mode)
        || toolCall.userInput === true
        || toolCall.waitForUser === true
        || toolCall.untilUserInput === true;
}

function createStopwatchUserInputRequest(toolCall = {}) {
    const startedAtEpochMs = Date.now();
    const label = getStopwatchLabel(toolCall);
    const prompt = String(
        toolCall.prompt
        || toolCall.question
        || "Type anything when I should stop the stopwatch."
    ).trim();
    return {
        title: String(toolCall.title || "Stopwatch running").trim(),
        questions: [{
            id: "stopwatch-user-input",
            question: prompt,
            options: Array.isArray(toolCall.options) ? toolCall.options : [],
            allowCustom: true,
            placeholder: String(toolCall.placeholder || "Type here to stop the stopwatch...").trim()
        }],
        stopwatch: {
            mode: "user_input",
            label,
            startedAtEpochMs,
            startedAt: new Date(startedAtEpochMs).toISOString()
        }
    };
}

async function executeStopwatchCommandToolCall(toolCall, signal = null) {
    const command = String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim();
    if (!command) throw new Error("stopwatch command timing requires a command.");
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("stopwatch command timing requires the Local Workspace Bridge.");
    }

    const startedAtEpochMs = Date.now();
    const startedAt = performance.now();
    const timeout = Math.max(1, Math.min(60, Number(toolCall.timeout || toolCall.commandTimeout || toolCall.commandTimeoutSeconds || 20) || 20));
    const result = await runWorkspaceCommand(command, toolCall.cwd || ".", timeout, signal);
    const elapsedMs = performance.now() - startedAt;
    const bridgeDuration = Number.isFinite(Number(result.durationMs))
        ? `Bridge command duration: ${formatPreciseDuration(Number(result.durationMs))} (${Math.round(Number(result.durationMs))}ms).`
        : "";

    return [
        `Stopwatch: ${getStopwatchLabel(toolCall)}`,
        `Started at: ${new Date(startedAtEpochMs).toISOString()}`,
        `Stopped at: ${new Date().toISOString()}`,
        `Elapsed: ${formatPreciseDuration(elapsedMs)} (${Math.round(elapsedMs)}ms).`,
        bridgeDuration,
        "",
        formatWorkspaceCommandResult(result)
    ].filter(Boolean).join("\n");
}

async function executeStopwatchToolCall(toolCall, signal = null) {
    if (String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim()) {
        return executeStopwatchCommandToolCall(toolCall, signal);
    }

    if (shouldStopwatchWaitForUserInput(toolCall)) {
        const request = createStopwatchUserInputRequest(toolCall);
        return {
            text: [
                `Stopwatch started: ${request.stopwatch.label}.`,
                "I am waiting for your input to stop it."
            ].join("\n"),
            needsUserInput: request
        };
    }

    const waitMs = getToolCallDurationMs(toolCall, {
        fallbackMs: 0,
        maxMs: WAIT_TOOL_MAX_DELAY_MS
    });
    const startedAtEpochMs = Date.now();
    const startedAt = performance.now();
    if (waitMs > 0) await waitWithAbort(waitMs, signal);
    const elapsedMs = performance.now() - startedAt;

    return [
        `Stopwatch: ${getStopwatchLabel(toolCall)}`,
        `Started at: ${new Date(startedAtEpochMs).toISOString()}`,
        `Stopped at: ${new Date().toISOString()}`,
        `Elapsed: ${formatPreciseDuration(elapsedMs)} (${Math.round(elapsedMs)}ms).`,
        waitMs > 0 ? `Requested timed wait: ${formatDuration(waitMs)}.` : "No command, wait duration, or user input target was provided."
    ].join("\n");
}

function normalizeApproxIpLocation(data = {}) {
    const latitude = firstFiniteNumber(data.latitude, data.lat);
    const longitude = firstFiniteNumber(data.longitude, data.lon, data.lng);
    if (latitude === null || longitude === null) {
        throw new Error("Approx location service did not return coordinates.");
    }
    return {
        city: String(data.city || "").trim(),
        region: String(data.region || data.region_name || "").trim(),
        countryName: String(data.country_name || data.country || "").trim(),
        countryCode: String(data.country_code || data.countryCode || "").trim(),
        postal: String(data.postal || data.zip || "").trim(),
        timezone: String(data.timezone || "").trim(),
        latitude,
        longitude
    };
}

function getApproxLocationLabel(location = {}) {
    return [location.city, location.region, location.countryName || location.countryCode]
        .map(part => String(part || "").trim())
        .filter(Boolean)
        .join(", ") || "Unknown area";
}

function formatCoordinate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "";
}

async function fetchApproxIpLocation(signal = null) {
    if (!isApproxLocationEnabled) {
        throw new Error("Approx Location is disabled in the Tools menu.");
    }
    const response = await fetch(IP_GEOLOCATION_URL, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal
    });
    if (!response.ok) {
        throw new Error(`Approx location service responded with HTTP ${response.status}.`);
    }
    const data = await response.json().catch(() => ({}));
    if (data.error || data.reason) {
        throw new Error(data.reason || data.error || "Approx location service failed.");
    }
    return normalizeApproxIpLocation(data);
}

function getLocationSources(includeWeather = false) {
    const sources = [{
        title: "IP geolocation",
        url: IP_GEOLOCATION_URL,
        snippet: "Approximate public-IP city or region lookup."
    }];
    if (includeWeather) {
        sources.push({
            title: "Open-Meteo forecast API",
            url: "https://open-meteo.com/",
            snippet: "Current weather from latitude and longitude."
        });
    }
    return sources;
}

function getWeatherSourcesForLocation(usedApproxIpLocation = true) {
    return usedApproxIpLocation
        ? getLocationSources(true)
        : [{
            title: "Open-Meteo forecast API",
            url: "https://open-meteo.com/",
            snippet: "Current weather from latitude and longitude."
        }];
}

function formatApproxLocationResult(location) {
    const coordinateText = [formatCoordinate(location.latitude), formatCoordinate(location.longitude)]
        .filter(Boolean)
        .join(", ");
    return [
        "Approximate public-IP location:",
        `Area: ${getApproxLocationLabel(location)}`,
        coordinateText ? `Coordinates: ${coordinateText} (rounded)` : "",
        location.timezone ? `Timezone: ${location.timezone}` : "",
        "Precision: city/region level at best; this is not GPS and may be wrong.",
        "Privacy: public IP address was not included in this tool result."
    ].filter(Boolean).join("\n");
}

function getWeatherCodeLabel(code) {
    const labels = {
        0: "clear",
        1: "mainly clear",
        2: "partly cloudy",
        3: "overcast",
        45: "fog",
        48: "depositing rime fog",
        51: "light drizzle",
        53: "moderate drizzle",
        55: "dense drizzle",
        61: "slight rain",
        63: "moderate rain",
        65: "heavy rain",
        71: "slight snow",
        73: "moderate snow",
        75: "heavy snow",
        80: "slight rain showers",
        81: "moderate rain showers",
        82: "violent rain showers",
        95: "thunderstorm"
    };
    return labels[Number(code)] || (code === null || code === undefined ? "" : `weather code ${code}`);
}

async function fetchCurrentWeather(latitude, longitude, signal = null) {
    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        timezone: "auto",
        forecast_days: "1"
    });
    const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal
    });
    if (!response.ok) {
        throw new Error(`Weather service responded with HTTP ${response.status}.`);
    }
    const data = await response.json().catch(() => ({}));
    if (!data || typeof data !== "object") {
        throw new Error("Weather service returned an invalid response.");
    }
    return data;
}

function getToolCallCoordinates(toolCall = {}) {
    const latitude = firstFiniteNumber(toolCall.latitude, toolCall.lat);
    const longitude = firstFiniteNumber(toolCall.longitude, toolCall.lon, toolCall.lng);
    if (latitude === null || longitude === null) return null;
    return {
        latitude,
        longitude,
        city: String(toolCall.city || toolCall.location || "").trim(),
        region: String(toolCall.region || "").trim(),
        countryName: String(toolCall.country || toolCall.countryName || "").trim(),
        timezone: String(toolCall.timezone || "").trim()
    };
}

function formatCurrentWeatherResult(location, weatherData) {
    const current = weatherData?.current || weatherData?.current_weather || {};
    const units = weatherData?.current_units || {};
    const temp = firstFiniteNumber(current.temperature_2m, current.temperature);
    const apparent = firstFiniteNumber(current.apparent_temperature);
    const humidity = firstFiniteNumber(current.relative_humidity_2m);
    const wind = firstFiniteNumber(current.wind_speed_10m, current.windspeed);
    const weatherCode = current.weather_code ?? current.weathercode;
    const observedAt = current.time || "";
    const tempUnit = units.temperature_2m || "°C";
    const windUnit = units.wind_speed_10m || "km/h";
    const coordinateText = [formatCoordinate(location.latitude), formatCoordinate(location.longitude)]
        .filter(Boolean)
        .join(", ");

    return [
        "Current weather for approximate location:",
        `Area: ${getApproxLocationLabel(location)}`,
        coordinateText ? `Coordinates: ${coordinateText} (rounded)` : "",
        temp !== null ? `Temperature: ${temp}${tempUnit}` : "",
        apparent !== null ? `Feels like: ${apparent}${tempUnit}` : "",
        humidity !== null ? `Humidity: ${humidity}%` : "",
        wind !== null ? `Wind: ${wind} ${windUnit}` : "",
        getWeatherCodeLabel(weatherCode) ? `Condition: ${getWeatherCodeLabel(weatherCode)}` : "",
        observedAt ? `Observed at: ${observedAt}${weatherData.timezone ? ` (${weatherData.timezone})` : ""}` : "",
        "Location precision: public-IP city/region level; not GPS."
    ].filter(Boolean).join("\n");
}

async function executeLocationToolCall(toolCall, signal = null) {
    if (toolCall.tool === "get_ip_location") {
        const location = await fetchApproxIpLocation(signal);
        return {
            text: formatApproxLocationResult(location),
            sources: getLocationSources(false)
        };
    }
    if (toolCall.tool === "current_weather") {
        const suppliedLocation = getToolCallCoordinates(toolCall);
        const location = suppliedLocation || await fetchApproxIpLocation(signal);
        const weather = await fetchCurrentWeather(location.latitude, location.longitude, signal);
        return {
            text: formatCurrentWeatherResult(location, weather),
            sources: getWeatherSourcesForLocation(!suppliedLocation)
        };
    }
    throw new Error("Unknown location tool.");
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
    if (token) {
        headers[WORKSPACE_BRIDGE_TOKEN_HEADER] = token;
        headers[LEGACY_WORKSPACE_BRIDGE_TOKEN_HEADER] = token;
    }
    return headers;
}

function createWorkspaceBridgeNetworkError(path, error) {
    const isOpenAiBridgeRequest = path === OPENAI_BRIDGE_PATH;
    const message = isOpenAiBridgeRequest
        ? "OpenAI bridge is unreachable. Start local-bridge.py, save the current token, and enable Local Workspace before using OpenAI."
        : "Workspace bridge is unreachable. Start local-bridge.py, save the current token, and try the workspace request again.";
    const detail = error?.message ? ` (${error.message})` : "";
    const bridgeError = new Error(`${message}${detail}`);
    bridgeError.name = "WorkspaceBridgeUnavailableError";
    bridgeError.cause = error;
    return bridgeError;
}

function isWorkspaceBridgeUnavailableError(error) {
    const rawMessage = error?.message || String(error || "");
    return error?.name === "WorkspaceBridgeUnavailableError"
        || /OpenAI bridge is unreachable|Workspace bridge is unreachable|OpenAI requests need the Local Workspace Bridge|local-bridge\.py/i.test(rawMessage);
}

async function requestWorkspaceBridge(path, options = {}) {
    const baseUrl = getWorkspaceBridgeBaseUrl();
    let res;
    try {
        res = await fetch(`${baseUrl}${path}`, {
            method: options.method || "GET",
            headers: getWorkspaceBridgeHeaders(Boolean(options.body)),
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.signal
        });
    } catch (err) {
        if (err.name === "AbortError") throw err;
        throw createWorkspaceBridgeNetworkError(path, err);
    }
    markGenerationConnectionEstablished();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
        if (path === OPENAI_BRIDGE_PATH) {
            throw new Error(formatOpenAiApiError(data, res.status));
        }
        throw new Error(data.error || `Workspace bridge responded with HTTP ${res.status}`);
    }
    return data;
}

function trimLocalToolText(value, maxLength = LOCAL_TOOL_RESULT_MAX_CHARS) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n[Output truncated to ${maxLength.toLocaleString()} characters]`;
}

function formatLineNumberedText(value) {
    const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
    const width = String(Math.max(1, lines.length)).length;
    return lines
        .map((line, index) => `${String(index + 1).padStart(width, " ")} | ${line}`)
        .join("\n");
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
    const content = trimLocalToolText(formatLineNumberedText(result.content || ""));
    const truncated = result.truncated ? "\n[File truncated by bridge limit]" : "";
    return `File: ${result.path} (${Number(result.size || 0).toLocaleString()} bytes)\nLine-numbered content:\n${content}${truncated}`;
}

function formatWorkspaceCommandResult(result) {
    const stdout = trimLocalToolText(result.stdout || "[No stdout]");
    const stderr = result.stderr ? `\nStderr:\n${trimLocalToolText(result.stderr)}` : "";
    const timedOut = result.timedOut ? "\n[Command timed out]" : "";
    const truncated = result.truncated ? "\n[Output truncated by bridge limit]" : "";
    return `Command: ${result.command}\nCwd: ${result.cwd || "."}\nExit code: ${result.exitCode ?? "timeout"}\nDuration: ${result.durationMs ?? 0}ms\nStdout:\n${stdout}${stderr}${timedOut}${truncated}`;
}

function shouldUseWorkspaceBridge(text) {
    if (!canUseComposerTools()) return false;
    if (!isWorkspaceBridgeEnabled || !text) return false;
    if (/^\/(?:tree|files|dir|ls|read|run|cmd|shell|terminal|ps)\b/i.test(text)) return true;
    return /\b(local directory|local workspace|workspace files|project files|repo files|repository files|file tree|directory tree|directory listing|folder tree|list files|list directory|read directory|show directory|read file|open file|show file|inspect file|terminal command|shell command|powershell|command output|run tests?|execute command)\b/i.test(text);
}

function shouldListWorkspace(text) {
    return /^\/(?:tree|files|dir|ls)\b/i.test(text)
        || /\b(local directory|local workspace|workspace files|project files|repo files|repository files|file tree|directory tree|directory listing|folder tree|list files|list directory|read directory|show files|show directory)\b/i.test(text);
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

function cleanWorkspaceToolPath(value) {
    return String(value || "")
        .trim()
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/[.?!,;:]+$/g, "")
        .trim() || ".";
}

function extractDirectWorkspaceTreePath(text) {
    const slash = text.match(/^\/(?:tree|files|dir|ls)(?:\s+([\s\S]+))?$/i);
    if (slash) return cleanWorkspaceToolPath(slash[1] || ".");

    const backticked = text.match(/\b(?:list|show|read|inspect|open)\s+(?:the\s+)?(?:directory|folder|files|file tree|directory tree)\s+(?:in|under|at|for|from)?\s*`([^`\n]+)`/i);
    if (backticked) return cleanWorkspaceToolPath(backticked[1]);

    const prose = text.match(/\b(?:list|show|read|inspect|open)\s+(?:the\s+)?(?:directory|folder|files|file tree|directory tree)\s+(?:in|under|at|for|from)\s+([A-Za-z0-9_.\-\\/]+)/i);
    return prose ? cleanWorkspaceToolPath(prose[1]) : ".";
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
    const treePath = extractDirectWorkspaceTreePath(text);

    if (shouldListWorkspace(text) || (!command && readPaths.length === 0)) {
        const tree = await listWorkspaceTree(treePath || ".", 2, signal);
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

function normalizeFaunaToolName(toolName) {
    const name = String(toolName || "").trim().toLowerCase();
    if (IMAGE_TOOL_NAME_ALIASES[name]) return IMAGE_TOOL_NAME_ALIASES[name];
    if (IMAGE_TOOL_NAMES.has(name)) return name;
    if (WEB_TOOL_NAME_ALIASES[name]) return WEB_TOOL_NAME_ALIASES[name];
    if (WEB_TOOL_NAMES.has(name)) return name;
    if (LOCATION_TOOL_NAME_ALIASES[name]) return LOCATION_TOOL_NAME_ALIASES[name];
    if (LOCATION_TOOL_NAMES.has(name)) return name;
    if (TIME_TOOL_NAME_ALIASES[name]) return TIME_TOOL_NAME_ALIASES[name];
    if (TIME_TOOL_NAMES.has(name)) return name;
    if (WORKSPACE_TOOL_NAME_ALIASES[name]) return WORKSPACE_TOOL_NAME_ALIASES[name];
    if (WORKSPACE_TOOL_NAMES.has(name)) return name;
    return MEMORY_TOOL_NAME_ALIASES[name] || "";
}

function extractFirstJsonObjectText(content) {
    const text = String(content || "");
    const startIndex = text.indexOf("{");
    if (startIndex < 0) return "";

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < text.length; index += 1) {
        const char = text[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
            inString = true;
            continue;
        }
        if (char === "{") depth += 1;
        if (char === "}") {
            depth -= 1;
            if (depth === 0) return text.slice(startIndex, index + 1);
        }
    }

    return "";
}

function extractFaunaToolCallPayload(content) {
    const text = normalizeAssistantControlMarkup(content);
    const closedMatch = text.match(FAUNA_TOOL_CALL_RE);
    if (closedMatch) return String(closedMatch[1] || "").trim();

    const openMatch = text.match(FAUNA_TOOL_CALL_OPEN_RE);
    if (!openMatch) {
        const jsonText = extractFirstJsonObjectText(text);
        return /"?(?:tool|name)"?\s*:/i.test(jsonText) ? jsonText : "";
    }

    return extractFirstJsonObjectText(text.slice(openMatch.index + openMatch[0].length));
}

function parseFaunaToolCall(content) {
    const payload = extractFaunaToolCallPayload(content);
    if (!payload) return null;
    try {
        const parsed = JSON.parse(payload);
        if (!parsed || typeof parsed !== "object") return null;
        const tool = normalizeFaunaToolName(parsed.tool || parsed.name);
        if (!tool) return null;
        return { ...parsed, tool };
    } catch {
        return null;
    }
}

function getAssistantToolPlaceholder(toolCall) {
    if (!toolCall?.tool) return "Fauna requested a tool.";
    if (isImageToolName(toolCall.tool)) return "Fauna requested image generation.";
    if (isWebToolName(toolCall.tool)) return "Fauna requested a web tool.";
    if (isLocationToolName(toolCall.tool)) return "Fauna requested location or weather.";
    if (isTimeToolName(toolCall.tool)) return "Fauna requested a timer or stopwatch.";
    if (isMemoryToolName(toolCall.tool)) return "Fauna requested memory access.";
    return "Fauna requested a local workspace tool.";
}

function stripFaunaToolCall(content) {
    return normalizeAssistantControlMarkup(content)
        .replace(FAUNA_TOOL_CALLS_RE, "")
        .replace(FAUNA_TOOL_CALL_OPEN_TO_END_RE, "")
        .trim();
}

function normalizeFaunaToolPathForSignature(value) {
    const path = cleanWorkspaceToolPath(value).replace(/\\/g, "/").replace(/^\.\//, "");
    return path || ".";
}

function getFaunaToolCallSignature(toolCall = {}) {
    const tool = normalizeFaunaToolName(toolCall.tool || toolCall.name);
    if (!tool) return "";

    if (tool === "workspace_tree") {
        return JSON.stringify({
            tool,
            path: normalizeFaunaToolPathForSignature(toolCall.path || "."),
            depth: Math.max(0, Math.min(5, Number(toolCall.depth) || 2))
        });
    }
    if (tool === "read_file") {
        return JSON.stringify({
            tool,
            path: normalizeFaunaToolPathForSignature(toolCall.path || ".")
        });
    }
    if (tool === "run_command") {
        return JSON.stringify({
            tool,
            command: String(toolCall.command || "").trim(),
            cwd: normalizeFaunaToolPathForSignature(toolCall.cwd || ".")
        });
    }
    if (tool === "web_search") {
        return JSON.stringify({
            tool,
            query: String(toolCall.query || toolCall.text || toolCall.prompt || "").trim()
        });
    }
    if (tool === "inspect_url") {
        return JSON.stringify({
            tool,
            url: String(toolCall.url || toolCall.href || toolCall.link || "").trim()
        });
    }
    if (tool === "get_ip_location") {
        return JSON.stringify({ tool });
    }
    if (tool === "current_weather") {
        const coordinates = getToolCallCoordinates(toolCall);
        return JSON.stringify({
            tool,
            latitude: coordinates ? Number(coordinates.latitude).toFixed(4) : "approx-ip",
            longitude: coordinates ? Number(coordinates.longitude).toFixed(4) : "approx-ip"
        });
    }
    if (tool === "wait") {
        return JSON.stringify({
            tool,
            durationMs: getToolCallDurationMs(toolCall)
        });
    }
    if (tool === "wait_for") {
        return JSON.stringify({
            tool,
            command: String(toolCall.command || toolCall.cmd || "").trim(),
            cwd: normalizeFaunaToolPathForSignature(toolCall.cwd || "."),
            maxMs: getToolCallDurationMs(toolCall, {
                fallbackMs: WAIT_FOR_COMMAND_DEFAULT_MAX_MS,
                maxMs: WAIT_FOR_COMMAND_MAX_MS,
                prefix: "max"
            }),
            intervalMs: getWaitForCommandIntervalMs(toolCall),
            contains: String(toolCall.contains || toolCall.match || toolCall.stdoutContains || "").trim(),
            expectedExitCode: String(toolCall.expectedExitCode ?? toolCall.exitCode ?? 0)
        });
    }
    if (tool === "stopwatch") {
        return JSON.stringify({
            tool,
            mode: String(toolCall.mode || toolCall.until || toolCall.target || toolCall.waitFor || "").trim().toLowerCase(),
            command: String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim(),
            cwd: normalizeFaunaToolPathForSignature(toolCall.cwd || "."),
            durationMs: getToolCallDurationMs(toolCall, { fallbackMs: 0 }),
            prompt: String(toolCall.prompt || toolCall.question || "").trim(),
            label: getStopwatchLabel(toolCall)
        });
    }
    if (tool === "read_memories") {
        return JSON.stringify({
            tool,
            query: String(toolCall.query || toolCall.text || "").trim()
        });
    }
    if (tool === "save_memory") {
        return JSON.stringify({
            tool,
            text: normalizeMemoryText(toolCall.text || toolCall.memory || toolCall.content || toolCall.value)
        });
    }
    if (tool === "delete_memory") {
        return JSON.stringify({
            tool,
            target: String(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "").trim()
        });
    }

    return JSON.stringify({ tool });
}

function isMemoryToolName(toolName) {
    return MEMORY_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isImageToolName(toolName) {
    return IMAGE_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isWebToolName(toolName) {
    return WEB_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isLocationToolName(toolName) {
    return LOCATION_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isTimeToolName(toolName) {
    return TIME_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function getToolDetailSnippet(value, maxLength = 84) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function getFaunaToolProgressLabel(toolCall) {
    if (toolCall?.tool === "generate_image") return "Generating image...";
    if (toolCall?.tool === "web_search") return "Searching the web...";
    if (toolCall?.tool === "inspect_url") return "Inspecting site...";
    if (toolCall?.tool === "get_ip_location") return "Checking approximate location...";
    if (toolCall?.tool === "current_weather") return "Checking local weather...";
    if (toolCall?.tool === "wait") return "Waiting...";
    if (toolCall?.tool === "wait_for") return toolCall.command || toolCall.cmd ? "Waiting for command..." : "Waiting...";
    if (toolCall?.tool === "stopwatch") {
        if (toolCall.command || toolCall.cmd || toolCall.shell) return "Timing command...";
        if (shouldStopwatchWaitForUserInput(toolCall)) return "Starting stopwatch...";
        return "Timing stopwatch...";
    }
    if (toolCall?.tool === "read_memories") return "Reading saved memories...";
    if (toolCall?.tool === "save_memory") return "Saving memory...";
    if (toolCall?.tool === "delete_memory") return "Updating memories...";
    if (toolCall?.tool === "run_command") return "Running local terminal command...";
    if (toolCall?.tool === "read_file") return "Reading local file...";
    return "Inspecting local workspace...";
}

function getFaunaToolActivityKind(toolCall) {
    if (isImageToolName(toolCall?.tool)) return "image";
    if (isWebToolName(toolCall?.tool)) return "web";
    if (isLocationToolName(toolCall?.tool)) return "location";
    if (isTimeToolName(toolCall?.tool)) return "timer";
    if (isMemoryToolName(toolCall?.tool)) return "memory";
    if (toolCall?.tool === "run_command") return "terminal";
    if (toolCall?.tool === "read_file") return "file";
    return "workspace";
}

function getFaunaToolActivityLabel(toolCall) {
    if (isImageToolName(toolCall?.tool)) return "Image generation";
    if (isWebToolName(toolCall?.tool)) return "Web";
    if (isLocationToolName(toolCall?.tool)) return "Location";
    if (isTimeToolName(toolCall?.tool)) return "Timer";
    if (isMemoryToolName(toolCall?.tool)) return "Memory";
    return "Local workspace";
}

function getFaunaToolActivityDetail(toolCall) {
    if (toolCall?.tool === "generate_image") return getToolDetailSnippet(toolCall.prompt || toolCall.description || toolCall.text || "Generated image");
    if (toolCall?.tool === "web_search") return getToolDetailSnippet(toolCall.query || toolCall.text || "Search");
    if (toolCall?.tool === "inspect_url") return getToolDetailSnippet(toolCall.url || toolCall.href || toolCall.link || "URL");
    if (toolCall?.tool === "get_ip_location") return "Approximate public-IP location";
    if (toolCall?.tool === "current_weather") return getToolCallCoordinates(toolCall)
        ? "Current weather for coordinates"
        : "Current weather near me";
    if (toolCall?.tool === "wait") return `Wait ${formatDuration(getToolCallDurationMs(toolCall))}`;
    if (toolCall?.tool === "wait_for") return toolCall.command || toolCall.cmd
        ? getToolDetailSnippet(toolCall.command || toolCall.cmd || "Command")
        : `Wait ${formatDuration(getToolCallDurationMs(toolCall))}`;
    if (toolCall?.tool === "stopwatch") {
        if (toolCall.command || toolCall.cmd || toolCall.shell) return getToolDetailSnippet(toolCall.command || toolCall.cmd || toolCall.shell);
        if (shouldStopwatchWaitForUserInput(toolCall)) return getStopwatchLabel(toolCall);
        return `Stopwatch ${formatDuration(getToolCallDurationMs(toolCall, { fallbackMs: 0 }))}`;
    }
    if (toolCall?.tool === "read_memories") return toolCall.query ? `Search: ${toolCall.query}` : "Saved memories";
    if (toolCall?.tool === "save_memory") return getToolDetailSnippet(toolCall.text || toolCall.memory || toolCall.content || toolCall.value || "New memory");
    if (toolCall?.tool === "delete_memory") return getToolDetailSnippet(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "Memory");
    if (toolCall?.tool === "run_command") return toolCall.command || "Local command";
    if (toolCall?.tool === "read_file") return toolCall.path || "Local file";
    return toolCall?.path || ".";
}

function getFaunaToolActivityInput(toolCall) {
    if (toolCall?.tool === "generate_image") return String(toolCall.prompt || toolCall.description || toolCall.text || "").trim();
    if (toolCall?.tool === "web_search") return String(toolCall.query || toolCall.text || toolCall.prompt || "").trim();
    if (toolCall?.tool === "inspect_url") return String(toolCall.url || toolCall.href || toolCall.link || "").trim();
    if (toolCall?.tool === "get_ip_location") return "";
    if (toolCall?.tool === "current_weather") {
        const coordinates = getToolCallCoordinates(toolCall);
        return coordinates
            ? [formatCoordinate(coordinates.latitude), formatCoordinate(coordinates.longitude)].filter(Boolean).join(", ")
            : "Approximate location";
    }
    if (toolCall?.tool === "wait") return formatDuration(getToolCallDurationMs(toolCall));
    if (toolCall?.tool === "wait_for") return String(toolCall.command || toolCall.cmd || formatDuration(getToolCallDurationMs(toolCall))).trim();
    if (toolCall?.tool === "stopwatch") {
        if (toolCall.command || toolCall.cmd || toolCall.shell) return String(toolCall.command || toolCall.cmd || toolCall.shell).trim();
        if (shouldStopwatchWaitForUserInput(toolCall)) return String(toolCall.prompt || toolCall.question || getStopwatchLabel(toolCall)).trim();
        return formatDuration(getToolCallDurationMs(toolCall, { fallbackMs: 0 }));
    }
    if (toolCall?.tool === "read_memories") return String(toolCall.query || toolCall.text || "").trim();
    if (toolCall?.tool === "save_memory") return normalizeMemoryText(toolCall.text || toolCall.memory || toolCall.content || toolCall.value);
    if (toolCall?.tool === "delete_memory") return String(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "").trim();
    if (toolCall?.tool === "run_command") return String(toolCall.command || "").trim();
    if (toolCall?.tool === "read_file") return String(toolCall.path || "").trim();
    return String(toolCall?.path || ".").trim();
}

async function executeFaunaToolCall(toolCall, signal = null) {
    if (isImageToolName(toolCall?.tool)) {
        throw new Error("Image generation tools need a visible chat target.");
    }

    if (isMemoryToolName(toolCall?.tool)) {
        return executeMemoryToolCall(toolCall);
    }

    if (isWebToolName(toolCall?.tool)) {
        if (toolCall.tool === "web_search") {
            const query = String(toolCall.query || toolCall.text || toolCall.prompt || "").trim();
            if (!query) throw new Error("web_search requires a query.");
            const result = await getWebContextForPrompt(query, signal, { inspectUrls: false });
            const text = result.context
                ? result.context.replace(/\n?--- Web Search Context ---\n?|\n?--- End Web Search Context ---\n?/g, "").trim()
                : `No web results were available for "${query}".`;
            return {
                text,
                sources: result.sources || []
            };
        }
        if (toolCall.tool === "inspect_url") {
            const url = toolCall.url || toolCall.href || toolCall.link;
            if (!url) throw new Error("inspect_url requires a URL.");
            const page = await inspectUrlForModel(url, signal);
            const source = pageToWebSource(page);
            return {
                text: formatInspectedPageResult(page),
                sources: source ? [source] : []
            };
        }
    }

    if (isLocationToolName(toolCall?.tool)) {
        return executeLocationToolCall(toolCall, signal);
    }

    if (isTimeToolName(toolCall?.tool)) {
        if (toolCall.tool === "stopwatch") {
            return executeStopwatchToolCall(toolCall, signal);
        }
        return toolCall.tool === "wait_for"
            ? executeWaitForCommandToolCall(toolCall, signal)
            : executeWaitToolCall(toolCall, signal);
    }

    if (!WORKSPACE_TOOL_NAMES.has(toolCall?.tool)) {
        throw new Error("Unknown Fauna tool.");
    }
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

async function retryImageToolCallInBubble(target, request, visibleText = "") {
    if (isGenerating || !target) return;

    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    setGeneratingBusy(true);
    prepareBubbleForRetry(target);

    const activity = createImageGenerationToolActivity(target, {
        title: "Generating image",
        detail: request.style ? `Generate ${request.style} image` : "Generate image",
        meta: "Preparing",
        prompt: request.prompt,
        options: request
    });

    try {
        const generated = await generateImageIntoBubble(target, request.prompt, {
            signal: generationSignal,
            options: request,
            activity,
            label: "Generated image"
        });
        const historyContent = getGeneratedImageHistoryContent("Generated image", generated.prompt);
        const content = [String(visibleText || "").trim(), historyContent].filter(Boolean).join("\n\n");
        let messageIndex = updateAssistantHistoryForBubble(target, content);
        if (messageIndex === null) {
            conversationHistory.push({
                role: "assistant",
                content,
                createdAt: new Date().toISOString()
            });
            messageIndex = conversationHistory.length - 1;
        }
        setupAssistantActions(target.parentElement, getGeneratedMediaCopyText(generated.imageUrl, content), {
            messageIndex,
            canFork: true
        });
        showToast("Image generation retried.", "success");
    } catch (err) {
        updateImageGenerationToolActivity(activity, err.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(target, err, {
            title: err.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: getImageGenerationFailureMessage(err),
            retryLabel: "Retry generation",
            onRetry: () => retryImageToolCallInBubble(target, request, visibleText)
        });
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
    }
}

async function executeImageGenerationToolCall(toolCall, signal = null, {
    progressTarget = null,
    visibleText = ""
} = {}) {
    const request = normalizeImageGenerationToolCall(toolCall);
    if (!request.prompt) {
        throw new Error("generate_image requires a prompt.");
    }

    let anchorBubble = progressTarget;
    if (!anchorBubble) {
        anchorBubble = addRenderNode("__thinking__", "output");
    }

    const cleanVisibleText = String(visibleText || "").trim();
    let imageBubble = anchorBubble;
    if (cleanVisibleText) {
        renderAssistantContentHtml(anchorBubble, renderMarkdown(cleanVisibleText), { final: true, busy: false });
        imageBubble = createSiblingBubble(anchorBubble) || anchorBubble;
        imageBubble.innerHTML = getThinkingBubbleMarkup();
    }

    const activity = createImageGenerationToolActivity(anchorBubble, {
        title: "Generating image",
        detail: request.style ? `Generate ${request.style} image` : "Generate image",
        meta: "Preparing",
        prompt: request.prompt,
        options: request
    });

    try {
        const generated = await generateImageIntoBubble(imageBubble, request.prompt, {
            signal,
            options: request,
            activity,
            label: "Generated image"
        });
        const historyContent = getGeneratedImageHistoryContent("Generated image", generated.prompt);
        return {
            ok: true,
            imageUrl: generated.imageUrl,
            prompt: generated.prompt,
            historyContent,
            content: [cleanVisibleText, historyContent].filter(Boolean).join("\n\n")
        };
    } catch (err) {
        updateImageGenerationToolActivity(activity, err.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(imageBubble, err, {
            title: err.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: getImageGenerationFailureMessage(err),
            retryLabel: "Retry generation",
            onRetry: () => retryImageToolCallInBubble(imageBubble, request, cleanVisibleText)
        });
        return {
            ok: false,
            content: cleanVisibleText || "I tried to generate the image, but it failed.",
            historyContent: `Image generation failed: ${err.message}`
        };
    }
}

function formatFaunaToolResultForModel(toolCall, resultText) {
    const isMemoryTool = isMemoryToolName(toolCall?.tool);
    const isWebTool = isWebToolName(toolCall?.tool);
    const isLocationTool = isLocationToolName(toolCall?.tool);
    const isTimeTool = isTimeToolName(toolCall?.tool);
    const label = isMemoryTool
        ? "Memory tool result"
        : isWebTool
            ? "Web tool result"
            : isLocationTool
                ? "Location/weather tool result"
                : isTimeTool
                    ? "Timer/wait tool result"
                    : "Local workspace tool result";
    const instruction = isMemoryTool
        ? "Use this result to answer the user's original memory request. If memory changed, acknowledge it briefly."
        : isWebTool
            ? "Use this web result to answer the user's original request. Cite the URLs used, and say if search or inspection was insufficient."
            : isLocationTool
                ? "Use this result to answer the user's original request. Mention that IP-based location is approximate when relevant, and cite source URLs if present."
                : isTimeTool
                    ? "Use this result to answer the user's original request. If a wait_for command timed out, say that clearly and include the relevant command outcome. For stopwatch results, report the elapsed time plainly."
                    : "Use this result to answer the user's original request. If the tool failed or was insufficient, say what is missing.";
    return `[${label}]\nTool: ${toolCall.tool}\n${trimLocalToolText(resultText)}\n\n${instruction}`;
}

function formatDuplicateFaunaToolResultForModel(toolCall, resultText) {
    return [
        formatFaunaToolResultForModel(toolCall, resultText),
        "",
        "[Fauna note]",
        "This exact tool call already ran in this turn. Do not request it again. Answer the user's original request now using the result above."
    ].join("\n");
}

function buildFaunaToolLimitMessage(toolResultsBySignature) {
    const toolResults = Array.from(toolResultsBySignature?.values?.() || []);
    const latest = toolResults[toolResults.length - 1];
    if (!latest?.resultText) {
        return "I reached the Fauna tool limit before forming a final answer. Try asking for one tool-backed step at a time.";
    }

    const detail = getFaunaToolActivityDetail(latest.toolCall);
    return [
        `I inspected ${detail}, but reached the tool-call limit before a final answer.`,
        "",
        trimLocalToolText(latest.resultText, FAUNA_TOOL_FALLBACK_RESULT_MAX_CHARS)
    ].join("\n");
}

function buildAssistantSystemPrompt(allowLocalTools = false, requireChatTitle = false, allowWebTools = false, allowToolCalls = true, allowLocationTools = false) {
    return [
        CODE_BLOCK_SYSTEM_PROMPT,
        requireChatTitle ? CHAT_TITLE_SYSTEM_PROMPT : "",
        CLARIFYING_QUESTION_SYSTEM_PROMPT,
        allowToolCalls ? IMAGE_TOOL_SYSTEM_PROMPT : "",
        allowToolCalls && allowWebTools ? WEB_TOOL_SYSTEM_PROMPT : "",
        allowToolCalls ? buildRuntimeToolSystemPrompt(allowLocationTools, allowLocalTools) : "",
        buildUserLocaleSystemPrompt(),
        buildPersonalizationSystemPrompt(),
        allowToolCalls ? buildMemorySystemPrompt() : "",
        allowToolCalls && allowLocalTools ? LOCAL_TOOL_SYSTEM_PROMPT : ""
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

function createFaunaQuestionBlock(payload) {
    return `<fauna_question>${JSON.stringify(payload || {})}</fauna_question>`;
}

function normalizeStopwatchMetadata(value) {
    if (!value || typeof value !== "object") return null;
    const parsedStartedAt = Date.parse(value.startedAt);
    const startedAtEpochMs = firstFiniteNumber(value.startedAtEpochMs, value.startTime, parsedStartedAt);
    if (startedAtEpochMs === null) return null;
    return {
        mode: String(value.mode || "user_input").trim() || "user_input",
        label: String(value.label || "Stopwatch").trim() || "Stopwatch",
        startedAtEpochMs,
        startedAt: new Date(startedAtEpochMs).toISOString()
    };
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
        questions,
        ...(normalizeStopwatchMetadata(payload.stopwatch) ? { stopwatch: normalizeStopwatchMetadata(payload.stopwatch) } : {})
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
    scheduleComposerSafeAreaUpdate({ scroll: true });
    if (focusInput) {
        window.setTimeout(() => input?.focus(), 0);
    }
}

function showClarifyingQuestionComposer(request) {
    if (!clarifyingQuestionComposer || !request?.questions?.length) return;
    activeClarifyingQuestion = {
        ...request,
        index: 0,
        hasAnimated: false,
        answers: new Array(request.questions.length).fill(null)
    };
    if (composerPanel) composerPanel.hidden = true;
    clarifyingQuestionComposer.hidden = false;
    inputWrapper?.classList.add("asking-question");
    renderClarifyingQuestionStep();
    scheduleComposerSafeAreaUpdate({ scroll: true, force: true });
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

function updateClarifyingQuestionSelectionUi() {
    const answer = getCurrentClarifyingAnswer();
    clarifyingQuestionComposer?.querySelectorAll(".clarifying-question-option").forEach(button => {
        const isSelected = answer?.type === "option" && button.dataset.optionValue === answer.value;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    const customInput = clarifyingQuestionComposer?.querySelector(".clarifying-question-input");
    if (answer?.type === "option" && customInput) {
        customInput.value = "";
        customInput.style.height = "auto";
    }
}

function renderClarifyingQuestionStep() {
    if (!clarifyingQuestionComposer || !activeClarifyingQuestion) return;

    const state = activeClarifyingQuestion;
    const question = state.questions[state.index];
    const answer = getCurrentClarifyingAnswer();
    const shouldAnimate = state.hasAnimated !== true;
    clarifyingQuestionComposer.innerHTML = "";

    const card = document.createElement("div");
    card.className = "clarifying-question-card";
    if (shouldAnimate) {
        card.classList.add("is-entering");
    }

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
        optionButton.dataset.optionValue = option.value;
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
            updateClarifyingQuestionSelectionUi();
            renderClarifyingSubmitState();
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
    state.hasAnimated = true;

    renderClarifyingSubmitState();
    scheduleComposerSafeAreaUpdate({ scroll: true, force: true });
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

function formatClarifyingAnswers(state) {
    return state.questions.map((question, index) => {
        const answer = state.answers[index]?.value || "";
        return `Q: ${question.question}\nA: ${answer}`;
    }).join("\n\n");
}

function finalizeClarifyingQuestionStopwatch(state) {
    if (!state?.stopwatch || state.stopwatch.stoppedAtEpochMs) return state;
    const stoppedAtEpochMs = Date.now();
    state.stopwatch = {
        ...state.stopwatch,
        stoppedAtEpochMs,
        stoppedAt: new Date(stoppedAtEpochMs).toISOString(),
        elapsedMs: Math.max(0, stoppedAtEpochMs - Number(state.stopwatch.startedAtEpochMs || stoppedAtEpochMs))
    };
    return state;
}

function formatClarifyingStopwatchResult(state, { display = false } = {}) {
    const stopwatch = state?.stopwatch;
    if (!stopwatch?.elapsedMs && stopwatch?.elapsedMs !== 0) return "";
    if (display) {
        return `Stopwatch: ${stopwatch.label || "Stopwatch"}\nElapsed: ${formatPreciseDuration(stopwatch.elapsedMs)}`;
    }
    return [
        "[Stopwatch result]",
        `Label: ${stopwatch.label || "Stopwatch"}`,
        `Started at: ${stopwatch.startedAt || new Date(stopwatch.startedAtEpochMs).toISOString()}`,
        `Stopped at: ${stopwatch.stoppedAt}`,
        `Elapsed: ${formatPreciseDuration(stopwatch.elapsedMs)} (${Math.round(stopwatch.elapsedMs)}ms)`
    ].join("\n");
}

function buildClarifyingAnswerPayload(state) {
    const stopwatchResult = formatClarifyingStopwatchResult(state);
    return [
        `[Answer to Fauna's clarifying question]\n${formatClarifyingAnswers(state)}`,
        stopwatchResult,
        "Continue the original task using this answer."
    ].filter(Boolean).join("\n\n");
}

function buildClarifyingAnswerDisplay(state) {
    return [
        formatClarifyingAnswers(state),
        formatClarifyingStopwatchResult(state, { display: true })
    ].filter(Boolean).join("\n\n");
}

async function submitClarifyingAnswers() {
    if (!activeClarifyingQuestion || isGenerating) return;
    const state = finalizeClarifyingQuestionStopwatch(activeClarifyingQuestion);
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
        const userMessageCreatedAt = new Date().toISOString();
        const userBubble = addRenderNode(displayText, "user", [], {
            createdAt: userMessageCreatedAt
        });
        conversationHistory.push({
            role: "user",
            content: payload,
            createdAt: userMessageCreatedAt
        });
        const userMessageNode = userBubble?.closest?.(".message-node.user-node");
        if (userMessageNode) {
            userMessageNode.dataset.historyIndex = String(conversationHistory.length - 1);
        }

        aiBubble = addRenderNode("__thinking__", "output");
        const data = await sendOllamaChatWithLocalTools(
            conversationHistory,
            getActiveChatRequestOptions(),
            OLLAMA_MODEL,
            generationSignal,
            aiBubble,
            { enabled: true }
        );
        const tokenUsage = getProviderTokenUsage(data);
        const assistantMessage = getAssistantMessageForConversation(data, OLLAMA_MODEL);
        attachTokenUsage(assistantMessage, tokenUsage);
        conversationHistory.push(assistantMessage);
        const assistantIndex = conversationHistory.length - 1;
        addSessionTokens(tokenUsage, { message: assistantMessage });
        await renderAssistantResponse(data, aiBubble, [], generationSignal, false, {
            messageIndex: assistantIndex,
            alreadyRendered: data.__faunaAlreadyRendered === true,
            preserveRenderedContent: data.__faunaPreserveRenderedContent === true
        });
        scrollChatToBottom();
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

function getAssistantMessageForConversation(data, fallbackModel = getCurrentModelLabel()) {
    const rawContent = data?.message?.content || "";
    const titleRequest = parseChatTitleRequest(rawContent);
    const questionRequest = parseClarifyingQuestionRequest(rawContent);
    const memoryRequest = parseMemoryRequests(rawContent).length > 0;
    const toolRequest = parseFaunaToolCall(rawContent);
    const strippedContent = stripAssistantControlBlocks(rawContent);
    const content = strippedContent
        || (questionRequest ? "I need a little more detail before I continue." : "")
        || (memoryRequest ? "Got it. I'll remember that." : "")
        || (toolRequest ? getAssistantToolPlaceholder(toolRequest) : "")
        || (titleRequest ? "I've named this chat." : rawContent);
    const model = normalizeModelId(data?.model || data?.message?.model || fallbackModel);
    return attachTokenUsage({
        ...(data?.message || { role: "assistant" }),
        role: data?.message?.role || "assistant",
        content,
        model,
        provider: getCurrentProviderLabel(),
        reasoning: getReasoningLabelForMessage(model),
        createdAt: new Date().toISOString()
    }, getProviderTokenUsage(data));
}

async function renderAssistantResponse(data, aiBubble, webSources = [], signal = null, speakThisReply = false, options = {}) {
    const rawContent = data?.message?.content || "";
    applyAssistantChatTitle(rawContent);
    const questionRequest = parseClarifyingQuestionRequest(rawContent);
    const assistantMessage = getAssistantMessageForConversation(data);
    const displayContent = String(data.__faunaDisplayContent || assistantMessage.content || "");
    const responseWebSources = mergeWebSources(webSources, data?.__faunaWebSources || []);
    const messageIndex = Number.isInteger(options.messageIndex) ? options.messageIndex : null;
    const alreadyRendered = options.alreadyRendered === true;
    const preserveRenderedContent = options.preserveRenderedContent === true;
    const shouldPlayVoiceReply = speakThisReply
        && isVoiceReplyEnabled
        && (!isOpenAiProvider() || isOpenAiVoiceSessionActive);
    const realtimeSpeechReply = shouldPlayVoiceReply && !alreadyRendered ? createRealtimeSpeechReply(signal) : null;

    if (alreadyRendered) {
        if (!preserveRenderedContent) {
            renderAssistantContentHtml(aiBubble, renderMarkdown(displayContent), { final: true, busy: false });
        }
        if (shouldPlayVoiceReply) {
            speakReply(displayContent);
        }
    } else {
        await renderTypewriterMarkdown(aiBubble, displayContent, signal, {
            onReveal: realtimeSpeechReply ? text => realtimeSpeechReply.appendRevealedText(text) : null
        });
    }
    setupCodeSandbox(aiBubble);
    setupAssistantActions(aiBubble.parentElement, options.copyText || data.__faunaCopyText || assistantMessage.content, {
        messageIndex,
        canRegenerate: messageIndex !== null,
        canFork: messageIndex !== null,
        canSpeak: true,
        speakText: displayContent
    });
    renderWebSources(aiBubble.parentElement, responseWebSources);
    applyAssistantMemoryRequests(rawContent);
    if (shouldPlayVoiceReply) {
        realtimeSpeechReply?.finish();
    } else if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        scheduleOpenAiVoiceRearm(undefined, { cue: true });
    }
    if (questionRequest) {
        showClarifyingQuestionComposer(questionRequest);
    }
    return assistantMessage;
}

async function sendOllamaChatWithLocalTools(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, progressTarget = null, streamOptions = {}) {
    const allowToolCalls = canUseComposerTools();
    const allowLocalTools = allowToolCalls && hasWorkspaceBridgeAccess();
    const allowWebTools = allowToolCalls && isWebSearchEnabled;
    const allowLocationTools = allowToolCalls && isApproxLocationEnabled;
    const requireChatTitle = shouldRequestAssistantChatTitle(messages);
    const workingMessages = [
        { role: "system", content: buildAssistantSystemPrompt(allowLocalTools, requireChatTitle, allowWebTools, allowToolCalls, allowLocationTools) },
        ...cloneConversationHistory(messages)
    ];
    let lastData = null;
    const toolActivityItems = [];
    const toolWebSources = [];
    const toolResultsBySignature = new Map();
    const duplicateToolReminders = new Set();

    for (let step = 0; step < FAUNA_TOOL_MAX_STEPS; step += 1) {
        const streamRenderer = progressTarget && streamOptions.enabled !== false && isAiStreamingActive()
            ? createAssistantStreamRenderer(progressTarget, signal)
            : null;
        let data;
        try {
            data = await sendProviderChat(workingMessages, options, preferredModel, signal, streamRenderer
                ? { onTextDelta: delta => streamRenderer.append(delta) }
                : {});
        } catch (err) {
            streamRenderer?.cancel();
            throw err;
        }
        lastData = data;
        applyAssistantChatTitle(data.message?.content);
        const toolCall = parseFaunaToolCall(data.message?.content);
        if (toolCall && !allowToolCalls) {
            if (data.message) {
                data.message.content = stripAssistantControlBlocks(data.message.content)
                    || `${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`;
            }
            return data;
        }
        if (!toolCall) {
            if (streamRenderer) {
                streamRenderer.finish(data.message?.content || "");
                data.__faunaAlreadyRendered = streamRenderer.hasRendered;
            }
            if (toolWebSources.length > 0) {
                data.__faunaWebSources = mergeWebSources(toolWebSources);
            }
            return data;
        }

        streamRenderer?.cancel();
        if (isImageToolName(toolCall.tool)) {
            const visibleText = stripAssistantControlBlocks(data.message?.content || "");
            const imageResult = await executeImageGenerationToolCall(toolCall, signal, {
                progressTarget,
                visibleText
            });
            if (data.message) {
                data.message.content = imageResult.content || visibleText || imageResult.historyContent || "";
            }
            data.__faunaDisplayContent = visibleText || "Generated image";
            if (imageResult.imageUrl) {
                data.__faunaCopyText = getGeneratedMediaCopyText(imageResult.imageUrl, data.message?.content || imageResult.historyContent || "");
            }
            data.__faunaAlreadyRendered = true;
            data.__faunaPreserveRenderedContent = true;
            data.__faunaImageToolHandled = true;
            return data;
        }

        const toolSignature = getFaunaToolCallSignature(toolCall);
        if (toolSignature && toolResultsBySignature.has(toolSignature)) {
            const previousResult = toolResultsBySignature.get(toolSignature);
            if (!duplicateToolReminders.has(toolSignature)) {
                duplicateToolReminders.add(toolSignature);
                workingMessages.push({ role: "assistant", content: data.message.content });
                workingMessages.push({ role: "user", content: formatDuplicateFaunaToolResultForModel(toolCall, previousResult.resultText) });
                continue;
            }

            if (data.message) {
                data.message.content = stripAssistantControlBlocks(data.message.content)
                    || buildFaunaToolLimitMessage(toolResultsBySignature);
            }
            if (toolWebSources.length > 0) {
                data.__faunaWebSources = mergeWebSources(toolWebSources);
            }
            return data;
        }

        const activityItem = {
            kind: getFaunaToolActivityKind(toolCall),
            label: getFaunaToolActivityLabel(toolCall),
            tool: toolCall.tool,
            detail: getFaunaToolActivityDetail(toolCall),
            input: getFaunaToolActivityInput(toolCall),
            settings: isImageToolName(toolCall.tool) ? getImageActivitySettings(toolCall) : "",
            query: isWebToolName(toolCall.tool) ? getFaunaToolActivityInput(toolCall) : "",
            meta: "Running"
        };
        toolActivityItems.push(activityItem);
        if (progressTarget) {
            renderToolActivity(progressTarget, {
                title: getFaunaToolProgressLabel(toolCall),
                items: toolActivityItems
            });
        }

        let resultText = "";
        try {
            const toolResult = await executeFaunaToolCall(toolCall, signal);
            if (toolResult && typeof toolResult === "object") {
                resultText = toolResult.text || "";
                if (toolResult.needsUserInput) {
                    const questionRequest = normalizeClarifyingQuestionPayload(toolResult.needsUserInput);
                    if (!questionRequest) throw new Error("Tool requested user input with an invalid question payload.");
                    activityItem.meta = "Waiting";
                    if (progressTarget) {
                        renderToolActivity(progressTarget, {
                            title: getFaunaToolProgressLabel(toolCall),
                            items: toolActivityItems
                        });
                    }
                    if (data.message) {
                        data.message.content = [
                            resultText || "Waiting for your input.",
                            createFaunaQuestionBlock(questionRequest)
                        ].filter(Boolean).join("\n\n");
                    }
                    if (toolWebSources.length > 0) {
                        data.__faunaWebSources = mergeWebSources(toolWebSources);
                    }
                    return data;
                }
                if (Array.isArray(toolResult.sources) && toolResult.sources.length > 0) {
                    activityItem.sources = toolResult.sources;
                    toolWebSources.push(...toolResult.sources);
                }
            } else {
                resultText = String(toolResult || "");
            }
            activityItem.meta = "Done";
        } catch (err) {
            resultText = `Tool failed: ${err.message}`;
            activityItem.meta = "Failed";
        }
        if (toolSignature) {
            toolResultsBySignature.set(toolSignature, { toolCall, resultText });
        }

        if (progressTarget) {
            renderToolActivity(progressTarget, {
                title: getFaunaToolProgressLabel(toolCall),
                items: toolActivityItems
            });
        }

        workingMessages.push({ role: "assistant", content: data.message.content });
        workingMessages.push({ role: "user", content: formatFaunaToolResultForModel(toolCall, resultText) });
    }

    if (lastData?.message) {
        lastData.message.content = stripAssistantControlBlocks(lastData.message.content)
            || buildFaunaToolLimitMessage(toolResultsBySignature);
    }
    if (lastData && toolWebSources.length > 0) {
        lastData.__faunaWebSources = mergeWebSources(toolWebSources);
    }
    return lastData;
}

modelSwitcher = createModelSwitcher({
    button: modelBtn,
    dropdown: modelDropdown,
    label: modelLabel,
    models: getLocalModelSwitcherOptions(),
    activeModel: OLLAMA_MODEL,
    reasoningModes: isOpenAiProvider() ? getOpenAiReasoningOptionsForModel(getOpenAiChatModel()) : [],
    activeReasoning: isOpenAiProvider() ? getOpenAiReasoningMode(getOpenAiChatModel()) : "",
    onReasoningSelect: setOpenAiReasoningMode,
    onSelect: setActiveModel
});
updateModelSwitcherForProvider();
refreshOpenRouterCapabilities();

initializeChatSessions();
applyWorkspaceUrlFragment({ normalize: true });
setWorkspaceNavState(activeWorkspaceView);
scheduleAnimatedSegmentIndicators();
window.addEventListener("popstate", () => applyWorkspaceUrlFragment());
window.addEventListener("hashchange", () => applyWorkspaceUrlFragment());

workspaceNavButtons.forEach(button => {
    button.addEventListener("click", () => {
        setWorkspaceView(button.dataset.workspaceView, {
            focusComposer: button.dataset.workspaceView === WORKSPACE_VIEW_PLAYGROUND
        });
    });
});

libraryFilterButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryFilter(button.dataset.libraryFilter));
});

libraryLayoutButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryLayout(button.dataset.libraryLayout));
});

librarySelectVisibleButton?.addEventListener("click", selectVisibleLibraryItems);
libraryClearSelectionButton?.addEventListener("click", clearLibrarySelection);
libraryDeleteSelectedButton?.addEventListener("click", deleteSelectedLibraryItems);
libraryUploadButton?.addEventListener("click", () => {
    libraryUploadInput?.click();
});
libraryUploadInput?.addEventListener("change", event => {
    void addUploadedFilesToLibrary(event.target.files);
    event.target.value = "";
});

chatTitleEditBtn?.addEventListener("click", event => {
    event.preventDefault();
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) return;
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
    const toolActivityToggle = e.target.closest("[data-tool-activity-toggle]");
    if (toolActivityToggle) {
        const bubble = toolActivityToggle.closest(".tool-activity-bubble");
        const state = bubble?._faunaToolActivityState;
        if (bubble && state) {
            renderToolActivity(bubble, {
                ...state,
                collapsed: !state.collapsed
            });
            bubble.querySelector("[data-tool-activity-toggle]")?.focus();
        } else {
            const card = toolActivityToggle.closest(".tool-activity-card");
            const list = card?.querySelector(".tool-activity-list");
            const nextCollapsed = toolActivityToggle.getAttribute("aria-expanded") === "true";
            toolActivityToggle.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
            card?.classList.toggle("collapsed", nextCollapsed);
            card?.classList.toggle("expanded", !nextCollapsed);
            if (list) list.hidden = nextCollapsed;
        }
        return;
    }

    const toolActivityRowToggle = e.target.closest("[data-tool-activity-row-toggle]");
    if (toolActivityRowToggle) {
        const bubble = toolActivityRowToggle.closest(".tool-activity-bubble");
        const state = bubble?._faunaToolActivityState;
        const itemId = toolActivityRowToggle.dataset.toolActivityItemId || "";
        if (bubble && state && itemId) {
            const openItemIds = new Set(Array.isArray(state.openItemIds) ? state.openItemIds : []);
            const isOpen = toolActivityRowToggle.getAttribute("aria-expanded") === "true";
            if (isOpen) {
                openItemIds.delete(itemId);
            } else {
                openItemIds.add(itemId);
            }
            renderToolActivity(bubble, {
                ...state,
                collapsed: false,
                openItemIds: Array.from(openItemIds)
            });
            const nextFocus = Array.from(bubble.querySelectorAll("[data-tool-activity-row-toggle]"))
                .find(button => button.dataset.toolActivityItemId === itemId);
            nextFocus?.focus();
        } else {
            const controls = toolActivityRowToggle.getAttribute("aria-controls");
            const details = controls ? document.getElementById(controls) : null;
            const isOpen = toolActivityRowToggle.getAttribute("aria-expanded") === "true";
            toolActivityRowToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
            toolActivityRowToggle.closest(".tool-activity-row-wrap")?.classList.toggle("expanded", !isOpen);
            if (details) details.hidden = isOpen;
        }
        return;
    }

    const assistantTtsClose = e.target.closest("[data-assistant-tts-close]");
    if (assistantTtsClose) {
        closeAssistantTtsPlayer(assistantTtsClose);
        return;
    }

    const assistantTtsSeek = e.target.closest("[data-assistant-tts-seek]");
    if (assistantTtsSeek) {
        handleAssistantTtsSeek(e, assistantTtsSeek);
        return;
    }

    const assistantTtsToggle = e.target.closest("[data-assistant-tts-toggle]");
    if (assistantTtsToggle) {
        handleAssistantTtsPlayerToggle(assistantTtsToggle);
        return;
    }

    const generatedImageInfoToggle = e.target.closest("[data-generated-image-info-toggle]");
    if (generatedImageInfoToggle) {
        e.stopPropagation();
        const imageWrap = generatedImageInfoToggle.closest(".generated-image-card");
        if (imageWrap) {
            setGeneratedImageInfoOpen(
                imageWrap,
                generatedImageInfoToggle,
                !imageWrap.classList.contains("generated-image-info-open")
            );
        }
        return;
    }

    const assistantAction = e.target.closest("[data-assistant-action]");
    if (assistantAction) {
        const action = assistantAction.dataset.assistantAction;
        if (action === "copy") {
            handleCopyButton(assistantAction, assistantAction.dataset.copyText || "");
        } else if (action === "speak") {
            handleSpeakButton(assistantAction, assistantAction.dataset.speakText || assistantAction.dataset.copyText || "");
        } else if (action === "regenerate") {
            regenerateAssistantFromAction(assistantAction);
        } else if (action === "fork") {
            forkChatFromAssistantAction(assistantAction);
        }
        return;
    }

    const copyButton = e.target.closest(".copy-action-btn");
    if (copyButton && !copyButton._faunaCopyAttached && copyButton.dataset.copyText) {
        handleCopyButton(copyButton, copyButton.dataset.copyText);
        return;
    }

    const img = e.target.closest(".bubble-img");
    if (img?.src) imageLightboxController.open(img.src);
});

chat.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        const generatedImageInfoToggle = event.target.closest("[data-generated-image-info-toggle]");
        const imageWrap = generatedImageInfoToggle?.closest(".generated-image-card");
        if (generatedImageInfoToggle && imageWrap) {
            setGeneratedImageInfoOpen(imageWrap, generatedImageInfoToggle, false);
            event.stopPropagation();
            return;
        }
    }

    handleAssistantTtsSeekKey(event);
});

// ===== FILE HANDLING =====
fileInput.setAttribute("accept", "image/*,.pdf,.txt,.md,.js,.py,.json,.csv");
libraryUploadInput?.setAttribute("accept", "image/*,video/*,.html,.htm,.css,.js,.mjs,.ts,.tsx,.jsx,.json,.md,.py,.txt,.csv,.sh,.ps1");

function setAttachmentMenuOpen(open, { focusMenu = false } = {}) {
    if (!attachmentMenu || !uploadButton) return;
    if (open && !canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    const isOpen = Boolean(open);
    attachmentMenu.hidden = !isOpen;
    uploadButton.setAttribute("aria-expanded", String(isOpen));
    uploadButton.classList.toggle("active", isOpen);
    if (isOpen) {
        toolsDropdown?.classList.remove("open");
        if (focusMenu) {
            window.setTimeout(() => attachmentMenu.querySelector(".attachment-menu-item")?.focus({ preventScroll: true }), 0);
        }
    }
}

function closeAttachmentMenu() {
    setAttachmentMenuOpen(false);
}

function toggleAttachmentMenu() {
    setAttachmentMenuOpen(attachmentMenu?.hidden !== false, { focusMenu: true });
}

function isDuplicateAttachment(file) {
    return attachedFiles.some(existing => (
        existing.name === file.name
        && existing.size === file.size
        && existing.type === file.type
    ));
}

function addAttachedFile(file, { notify = true } = {}) {
    if (!(file instanceof File)) return false;
    const unsupportedReason = getUnsupportedAttachmentReason(file);
    if (unsupportedReason) {
        if (notify) showUnsupportedAttachmentToast([{ file, reason: unsupportedReason }]);
        return false;
    }
    if (isDuplicateAttachment(file)) return false;
    attachedFiles.push(file);
    renderPreviewPill(file);
    scheduleComposerSafeAreaUpdate();
    return true;
}

function addAttachedFiles(files) {
    let added = 0;
    const rejected = [];
    Array.from(files || []).forEach(file => {
        const unsupportedReason = getUnsupportedAttachmentReason(file);
        if (unsupportedReason) {
            rejected.push({ file, reason: unsupportedReason });
            return;
        }
        if (addAttachedFile(file, { notify: false })) added += 1;
    });
    showUnsupportedAttachmentToast(rejected);
    if (added > 0) updateTokenDisplay();
    return added;
}

function markFileAsLibraryAttachment(file, item, { sourceSrc = "" } = {}) {
    if (!(file instanceof File) || !item) return file;
    try {
        Object.defineProperties(file, {
            __faunaLibrarySourceKey: {
                value: getLibraryItemPersistentKey(item),
                enumerable: false
            },
            __faunaLibrarySourceId: {
                value: item.id || "",
                enumerable: false
            },
            __faunaLibrarySourceSrc: {
                value: sourceSrc || item.src || "",
                enumerable: false
            }
        });
    } catch {
        file.__faunaLibrarySourceKey = getLibraryItemPersistentKey(item);
        file.__faunaLibrarySourceId = item.id || "";
        file.__faunaLibrarySourceSrc = sourceSrc || item.src || "";
    }
    return file;
}

function setFilePersistentPreviewSource(file, source = "") {
    if (!(file instanceof File)) return file;
    const src = String(source || "").trim();
    if (!src) return file;
    try {
        Object.defineProperty(file, "__faunaPersistentPreviewSrc", {
            value: src,
            enumerable: false,
            configurable: true
        });
    } catch {
        file.__faunaPersistentPreviewSrc = src;
    }
    return file;
}

async function ensurePersistentImagePreviewSource(file) {
    if (!(file instanceof File) || !file.type?.startsWith("image/")) return "";
    const existing = String(file.__faunaPersistentPreviewSrc || file.__faunaLibrarySourceSrc || "").trim();
    if (/^(?:data:image\/|https?:)/i.test(existing)) return existing;
    const base64 = await blobToBase64(file);
    const src = `data:${file.type || "image/png"};base64,${base64}`;
    setFilePersistentPreviewSource(file, src);
    return src;
}

async function ensurePersistentImagePreviewSources(files = []) {
    const imageFiles = Array.from(files || []).filter(file => file instanceof File && file.type?.startsWith("image/"));
    await Promise.all(imageFiles.map(file => ensurePersistentImagePreviewSource(file)));
}

function sanitizeAttachmentFileNamePart(value, fallback = "library-item") {
    const clean = String(value || "")
        .trim()
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 56);
    return clean || fallback;
}

function getMimeExtension(mimeType, fallback = "bin") {
    const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
    const extensions = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "text/html": "html",
        "text/css": "css",
        "text/javascript": "js",
        "application/javascript": "js",
        "application/json": "json",
        "text/markdown": "md",
        "text/plain": "txt"
    };
    return extensions[normalized] || fallback;
}

function getCodeAttachmentMime(lang, kind) {
    const normalized = normalizeCodeLanguage(lang || kind);
    const mimeTypes = {
        html: "text/html",
        htm: "text/html",
        css: "text/css",
        js: "text/javascript",
        javascript: "text/javascript",
        mjs: "text/javascript",
        json: "application/json",
        md: "text/markdown",
        markdown: "text/markdown",
        py: "text/x-python",
        python: "text/x-python"
    };
    return mimeTypes[normalized] || "text/plain";
}

function getLibraryAttachmentBaseName(item) {
    return sanitizeAttachmentFileNamePart(item?.title || item?.fileName || item?.type || "library-item");
}

function getLibraryReferenceText(item, reason = "") {
    return [
        `${getLibraryItemKindLabel(item)} from Fauna Library`,
        `Title: ${item.title || "Untitled"}`,
        item.detail ? `Detail: ${item.detail}` : "",
        item.sessionTitle ? `Chat: ${item.sessionTitle}` : "",
        `Created: ${formatLibraryItemDate(item)}`,
        item.src ? `Source: ${item.src}` : "",
        reason ? `Note: ${reason}` : ""
    ].filter(Boolean).join("\n");
}

function createLibraryReferenceFile(item, reason = "") {
    const base = getLibraryAttachmentBaseName(item);
    return {
        file: markFileAsLibraryAttachment(
            new File([getLibraryReferenceText(item, reason)], `${base}-reference.txt`, { type: "text/plain" }),
            item
        ),
        fallback: true
    };
}

async function getBlobFromLibrarySource(src) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
}

async function getPersistentLibraryImageSource(item, blob, type) {
    const src = String(item?.src || "").trim();
    if (/^(?:data:image\/|https?:)/i.test(src)) return src;
    const base64 = await blobToBase64(blob);
    return `data:${type || "image/png"};base64,${base64}`;
}

async function createAttachmentFileFromLibraryItem(item) {
    if (item.type === "code") {
        const fileName = item.fileName || getCodeDownloadName(item.lang, item.kind, getLibraryAttachmentBaseName(item));
        return {
            file: markFileAsLibraryAttachment(
                new File([item.code || ""], fileName, { type: getCodeAttachmentMime(item.lang, item.kind) }),
                item
            ),
            fallback: false
        };
    }

    if (item.type === "image") {
        try {
            const blob = await getBlobFromLibrarySource(item.src);
            const type = blob.type || "image/png";
            const ext = getMimeExtension(type, "png");
            const sourceSrc = await getPersistentLibraryImageSource(item, blob, type);
            return {
                file: markFileAsLibraryAttachment(
                    new File([blob], `${getLibraryAttachmentBaseName(item)}.${ext}`, { type }),
                    item,
                    { sourceSrc }
                ),
                fallback: false
            };
        } catch (err) {
            return createLibraryReferenceFile(item, "The browser could not copy this image as a file, so Fauna attached a source reference.");
        }
    }

    return createLibraryReferenceFile(item, "Videos are attached as source references for chat context.");
}

async function attachSelectedLibraryItems() {
    if (!libraryPickerAttach || libraryPickerSelectedIds.size === 0) return;
    const selectedItems = collectLibraryItems().filter(item => libraryPickerSelectedIds.has(item.id));
    if (selectedItems.length === 0) return;

    const previousLabel = libraryPickerAttach.textContent;
    libraryPickerAttach.disabled = true;
    libraryPickerAttach.textContent = "Attaching...";

    let added = 0;
    let fallbackCount = 0;
    let failed = 0;
    for (const item of selectedItems) {
        try {
            const result = await createAttachmentFileFromLibraryItem(item);
            if (addAttachedFile(result.file)) {
                added += 1;
                if (result.fallback) fallbackCount += 1;
            }
        } catch (err) {
            console.warn("Could not attach library item:", err);
            failed += 1;
        }
    }

    updateTokenDisplay();
    closeLibraryPickerModal();
    focusComposerInput({ force: true });

    if (added > 0) {
        const suffix = fallbackCount > 0 ? ` ${fallbackCount} attached as references.` : "";
        showToast(`Attached ${added} ${added === 1 ? "item" : "items"} from Library.${suffix}`, fallbackCount > 0 ? "info" : "success");
    } else if (failed > 0) {
        showToast("Could not attach the selected Library items.", "error");
    } else {
        showToast("Selected Library items were already attached.", "info");
    }

    libraryPickerAttach.textContent = previousLabel || "Attach selected";
    updateLibraryPickerSelectionUi();
}

fileInput.onchange = (e) => {
    if (isGenerating) return;
    if (!canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        fileInput.value = "";
        return;
    }
    addAttachedFiles(e.target.files);
    fileInput.value = "";
};

if (uploadButton) {
    uploadButton.addEventListener("click", event => {
        event.stopPropagation();
        if (isGenerating) return;
        toggleAttachmentMenu();
    });

    uploadButton.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isGenerating) setAttachmentMenuOpen(true, { focusMenu: true });
        }
    });
}

attachmentMenu?.addEventListener("click", event => event.stopPropagation());
attachmentMenu?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeAttachmentMenu();
        uploadButton?.focus({ preventScroll: true });
        return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(attachmentMenu.querySelectorAll(".attachment-menu-item"));
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    const nextIndex = event.key === "ArrowDown"
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
});

attachmentUploadFileButton?.addEventListener("click", () => {
    if (isGenerating || !canUseComposerAttachments()) {
        if (!isGenerating) showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    closeAttachmentMenu();
    fileInput.click();
});

attachmentChooseLibraryButton?.addEventListener("click", () => {
    if (isGenerating || !canUseComposerAttachments()) {
        if (!isGenerating) showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    openLibraryPickerModal();
});

document.addEventListener("click", event => {
    if (!event.target.closest(".attachment-menu-wrap")) closeAttachmentMenu();
});

libraryPickerSearch?.addEventListener("input", event => {
    libraryPickerQuery = event.target.value || "";
    renderLibraryPicker();
});

libraryPickerTypeButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryPickerTypeFilter(button.dataset.libraryPickerType));
});

libraryPickerSortButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryPickerSortOrder(button.dataset.libraryPickerSort));
});

libraryPickerModal?.addEventListener("click", event => {
    if (event.target.closest("[data-library-picker-close]")) closeLibraryPickerModal();
});

libraryPickerAttach?.addEventListener("click", () => {
    void attachSelectedLibraryItems();
});

document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", e => {
    e.preventDefault();
    if (isGenerating) return;
    addAttachedFiles(e.dataTransfer.files);
});

input.addEventListener("paste", e => {
    if (isGenerating) return;
    const pastedImages = [];
    Array.from(e.clipboardData.items).forEach(item => {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) return;
            const ext = item.type.split("/")[1] || "png";
            const named = new File([file], "pasted-image." + ext, { type: item.type });
            pastedImages.push(named);
        }
    });
    addAttachedFiles(pastedImages);
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
        attachedFiles = attachedFiles.filter(f => f !== file);
        pill.remove();
        updateTokenDisplay();
        scheduleComposerSafeAreaUpdate();
    };
    pill.append(icon);
    pill.append(meta);
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

function updateGenerationStopButtonVisibility() {
    if (!stopButton) return;
    const voiceModeActive = document.body?.classList.contains("voice-chat-active");
    const generationAbortPending = Boolean(activeRequestController?.signal?.aborted);
    stopButton.hidden = !isGenerating || voiceModeActive || generationAbortPending || !hasGenerationConnectionBeenMade;
    stopButton.disabled = false;
}

function markGenerationConnectionEstablished() {
    if (!isGenerating || hasGenerationConnectionBeenMade) return;
    hasGenerationConnectionBeenMade = true;
    updateGenerationStopButtonVisibility();
    updateSendButtonState();
    updateComposerCapabilityUi();
}

function updateSendButtonState() {
    if (!sendButton) return;

    const isLoadingConnection = isGenerating && !hasGenerationConnectionBeenMade;
    const idleState = sendButton.querySelector("[data-send-state='idle']");
    const loadingState = sendButton.querySelector("[data-send-state='loading']");
    const label = isLoadingConnection ? "Working on message" : "Send message";

    sendButton.hidden = isGenerating && hasGenerationConnectionBeenMade;
    sendButton.setAttribute("aria-busy", isGenerating ? "true" : "false");
    sendButton.setAttribute("aria-label", label);
    sendButton.dataset.tooltip = label;

    if (idleState) {
        idleState.hidden = isGenerating;
    }
    if (loadingState) {
        loadingState.hidden = !isLoadingConnection;
    }
}

function setGeneratingBusy(busy) {
    isGenerating = busy;
    hasGenerationConnectionBeenMade = false;

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
            || control === voiceMicToggleBtn
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

    updateGenerationStopButtonVisibility();
    updateSendButtonState();
    updateComposerCapabilityUi();
}

function cancelActiveGeneration() {
    if (!activeRequestController) return;
    activeRequestController.abort();
    updateGenerationStopButtonVisibility();
    showToast("Generation stopped.", "info");
}

const SLASH_COMMANDS = [
    {
        name: "image",
        command: "/image",
        aliases: ["img", "imagine"],
        description: "Generate an image from a prompt",
        icon: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path>',
        acceptsPrompt: true
    },
    {
        name: "video",
        command: "/video",
        aliases: ["vid", "clip"],
        description: "Create a short video clip",
        icon: '<rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3Z"></path>',
        acceptsPrompt: true
    },
    {
        name: "screenshot",
        command: "/screenshot",
        aliases: ["screen"],
        description: "Capture your screen as an attachment",
        icon: '<rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M8 22h8"></path><path d="M12 18v4"></path><circle cx="12" cy="11" r="3"></circle>',
        acceptsPrompt: false
    },
    {
        name: "memory",
        command: "/memory",
        aliases: ["remember"],
        description: "Add or manage beta memories",
        icon: '<path d="M12 3a7 7 0 0 0-7 7c0 2.2 1 4 2.5 5.3V19h9v-3.7A6.8 6.8 0 0 0 19 10a7 7 0 0 0-7-7Z"></path><path d="M9 22h6"></path><path d="M9 10h.01M12 9h.01M15 10h.01"></path>',
        acceptsPrompt: true
    },
    {
        name: "weather",
        command: "/weather",
        aliases: ["wetter", "temp", "temperature"],
        description: "Check current weather near you",
        icon: '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle>',
        acceptsPrompt: true
    },
    {
        name: "wait",
        command: "/wait",
        aliases: ["timer", "sleep", "wait_for"],
        description: "Start a timer or wait for a command",
        icon: '<circle cx="12" cy="13" r="8"></circle><path d="M12 13V8"></path><path d="M12 13l3 2"></path><path d="M9 2h6"></path>',
        acceptsPrompt: true
    },
    {
        name: "stopwatch",
        command: "/stopwatch",
        aliases: ["time", "measure"],
        description: "Measure command time or user input",
        icon: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 1.5"></path><path d="M9 2h6"></path><path d="m5 5 2 2"></path><path d="m19 5-2 2"></path>',
        acceptsPrompt: true
    },
    {
        name: "model",
        command: "/model",
        aliases: ["provider"],
        description: "Open or change the active model",
        icon: '<path d="M12 3 4 7v10l8 4 8-4V7Z"></path><path d="M4 7l8 4 8-4"></path><path d="M12 11v10"></path>',
        acceptsPrompt: true
    },
    {
        name: "info",
        command: "/info",
        aliases: ["about"],
        description: "Show details about this chat",
        icon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
        acceptsPrompt: false
    },
    {
        name: "new",
        command: "/new",
        aliases: ["chat"],
        description: "Start a fresh chat",
        icon: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
        acceptsPrompt: false
    }
];
let activeSlashCommandIndex = 0;
let visibleSlashCommandMatches = [];
let commandMenu = null;
let commandMenuSearchInput = null;
let commandMenuList = null;
let commandMenuItems = [];
let visibleCommandMenuItems = [];
let activeCommandMenuIndex = 0;

function getSlashCommandQuery() {
    if (!input) return null;
    const value = input.value || "";
    const caret = Number.isInteger(input.selectionStart) ? input.selectionStart : value.length;
    const beforeCaret = value.slice(0, caret);
    const afterCaret = value.slice(caret);
    if (afterCaret.trim()) return null;
    const match = beforeCaret.match(/^\/([^\s/]*)$/);
    return match ? match[1].toLowerCase() : null;
}

function getSlashCommandMatches(query = "") {
    const needle = String(query || "").toLowerCase();
    if (!needle) return SLASH_COMMANDS.slice();

    return SLASH_COMMANDS
        .map((command, index) => {
            const aliases = command.aliases || [];
            const description = String(command.description || "").toLowerCase();
            let score = Number.POSITIVE_INFINITY;
            if (command.name.startsWith(needle) || command.command.slice(1).startsWith(needle)) score = 0;
            else if (aliases.some(alias => alias.startsWith(needle))) score = 1;
            else if (command.name.includes(needle) || command.command.includes(needle)) score = 2;
            else if (aliases.some(alias => alias.includes(needle))) score = 3;
            else if (description.includes(needle)) score = 4;
            return { command, index, score };
        })
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .map(item => item.command);
}

function hideSlashCommandPalette() {
    if (!slashCommandPalette) return;
    slashCommandPalette.hidden = true;
    slashCommandPalette.replaceChildren();
    visibleSlashCommandMatches = [];
    activeSlashCommandIndex = 0;
    input?.removeAttribute("aria-activedescendant");
}

function updateSlashCommandSelection() {
    if (!slashCommandPalette || slashCommandPalette.hidden) return;
    const options = Array.from(slashCommandPalette.querySelectorAll(".slash-command-option"));
    options.forEach((option, index) => {
        const active = index === activeSlashCommandIndex;
        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", String(active));
        if (active) {
            input?.setAttribute("aria-activedescendant", option.id);
            option.scrollIntoView({ block: "nearest" });
        }
    });
}

function getSlashCommandUnavailableReason(command) {
    if (!command) return "";
    if (command.name === "screenshot" && !canUseComposerImageAttachments()) {
        return `${getActiveComposerModelLabel()} does not support image attachments. Choose a vision-capable chat model first.`;
    }
    return "";
}

function applySlashCommandSuggestion(command) {
    if (!command || !input) return;
    const unavailableReason = getSlashCommandUnavailableReason(command);
    if (unavailableReason) {
        showToast(unavailableReason, "warning");
        return;
    }
    if (command.name === "model") {
        clearComposerText();
        hideSlashCommandPalette();
        openModelCommandMenu();
        return;
    }
    if (command.name === "memory") {
        clearComposerText();
        hideSlashCommandPalette();
        openMemoryCommandMenu();
        return;
    }
    if (command.name === "info") {
        clearComposerText();
        hideSlashCommandPalette();
        openInfoCommandMenu();
        return;
    }
    input.value = `${command.command}${command.acceptsPrompt ? " " : ""}`;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    hideSlashCommandPalette();
    input.focus();
}

function renderSlashCommandPalette() {
    if (!slashCommandPalette || !input || isGenerating) {
        hideSlashCommandPalette();
        return;
    }

    const query = getSlashCommandQuery();
    if (query === null) {
        hideSlashCommandPalette();
        return;
    }

    visibleSlashCommandMatches = getSlashCommandMatches(query);
    if (visibleSlashCommandMatches.length === 0) {
        hideSlashCommandPalette();
        return;
    }

    activeSlashCommandIndex = Math.min(activeSlashCommandIndex, visibleSlashCommandMatches.length - 1);
    slashCommandPalette.replaceChildren(...visibleSlashCommandMatches.map((command, index) => {
        const displayCommand = String(command.command || command.name || "").replace(/^\//, "");
        const unavailableReason = getSlashCommandUnavailableReason(command);
        const option = document.createElement("button");
        option.id = `slash-command-${command.name}`;
        option.className = "slash-command-option";
        option.type = "button";
        option.disabled = Boolean(unavailableReason);
        option.classList.toggle("composer-control-unavailable", Boolean(unavailableReason));
        if (unavailableReason) option.dataset.tooltip = unavailableReason;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === activeSlashCommandIndex));
        option.innerHTML = `
            <span class="slash-command-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${command.icon}</svg>
            </span>
            <span class="slash-command-copy">
                <span class="slash-command-name">${escapeHtml(displayCommand)}</span>
                <span class="slash-command-desc">${escapeHtml(command.description)}</span>
            </span>
        `;
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => applySlashCommandSuggestion(command));
        return option;
    }));
    slashCommandPalette.hidden = false;
    updateSlashCommandSelection();
}

function handleSlashCommandKeydown(event) {
    if (!slashCommandPalette || slashCommandPalette.hidden || visibleSlashCommandMatches.length === 0) return false;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeSlashCommandIndex = (activeSlashCommandIndex + direction + visibleSlashCommandMatches.length) % visibleSlashCommandMatches.length;
        updateSlashCommandSelection();
        return true;
    }

    if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        applySlashCommandSuggestion(visibleSlashCommandMatches[activeSlashCommandIndex]);
        return true;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        applySlashCommandSuggestion(visibleSlashCommandMatches[activeSlashCommandIndex]);
        return true;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        hideSlashCommandPalette();
        return true;
    }

    return false;
}

function clearComposerText() {
    if (!input) return;
    input.value = "";
    input.style.height = "auto";
    hideSlashCommandPalette();
    closeCommandMenu();
    updateTokenDisplay();
}

function showChatSurface() {
    if (welcome) welcome.style.display = "none";
    if (chat) chat.style.display = "block";
}

function renderCommandResult(commandText, resultText) {
    showChatSurface();
    const createdAt = new Date().toISOString();
    addRenderNode(commandText, "user", [], { createdAt });
    addRenderNode(resultText, "output", [], { createdAt: new Date().toISOString() });
    scrollChatToBottom();
    saveCurrentSession();
}

function ensureCommandMenu() {
    if (commandMenu || !composerPanel) return commandMenu;

    commandMenu = document.createElement("div");
    commandMenu.id = "commandMenu";
    commandMenu.className = "command-menu";
    commandMenu.hidden = true;
    commandMenu.setAttribute("role", "dialog");
    commandMenu.setAttribute("aria-label", "Command menu");

    commandMenuSearchInput = document.createElement("input");
    commandMenuSearchInput.className = "command-menu-search";
    commandMenuSearchInput.type = "search";
    commandMenuSearchInput.autocomplete = "off";
    commandMenuSearchInput.spellcheck = false;

    commandMenuList = document.createElement("div");
    commandMenuList.className = "command-menu-list";
    commandMenuList.setAttribute("role", "listbox");

    commandMenu.append(commandMenuSearchInput, commandMenuList);
    composerPanel.appendChild(commandMenu);

    commandMenuSearchInput.addEventListener("input", renderCommandMenuItems);
    commandMenuSearchInput.addEventListener("keydown", handleCommandMenuKeydown);

    return commandMenu;
}

function closeCommandMenu() {
    if (!commandMenu) return;
    commandMenu.hidden = true;
    commandMenuItems = [];
    visibleCommandMenuItems = [];
    activeCommandMenuIndex = 0;
}

function commandMenuItemMatches(item, query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return true;
    return [
        item.label,
        item.meta,
        item.description,
        item.searchText
    ].some(value => String(value || "").toLowerCase().includes(needle));
}

function updateCommandMenuSelection() {
    if (!commandMenuList) return;
    const options = Array.from(commandMenuList.querySelectorAll(".command-menu-option"));
    options.forEach((option, index) => {
        const active = index === activeCommandMenuIndex;
        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", String(active));
    });
}

function runCommandMenuItem(item) {
    if (!item || item.disabled || item.readOnly || typeof item.action !== "function") return;
    closeCommandMenu();
    item.action?.();
}

function renderCommandMenuItems() {
    if (!commandMenuList) return;
    const query = commandMenuSearchInput?.value || "";
    visibleCommandMenuItems = commandMenuItems.filter(item => commandMenuItemMatches(item, query));
    activeCommandMenuIndex = Math.min(activeCommandMenuIndex, Math.max(visibleCommandMenuItems.length - 1, 0));

    if (visibleCommandMenuItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "command-menu-empty";
        empty.textContent = "No matches";
        commandMenuList.replaceChildren(empty);
        return;
    }

    commandMenuList.replaceChildren(...visibleCommandMenuItems.map((item, index) => {
        const option = document.createElement("button");
        option.className = "command-menu-option";
        option.type = "button";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === activeCommandMenuIndex));
        option.disabled = Boolean(item.disabled);
        option.classList.toggle("read-only", Boolean(item.readOnly));

        const label = document.createElement("span");
        label.className = "command-menu-label";
        label.textContent = item.label;

        const meta = document.createElement("small");
        meta.className = "command-menu-meta";
        meta.textContent = item.meta || "";

        const check = document.createElement("span");
        check.className = "command-menu-check";
        check.setAttribute("aria-hidden", "true");
        check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>';

        option.classList.toggle("selected", Boolean(item.selected));
        option.append(label, meta, check);
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => runCommandMenuItem(item));
        return option;
    }));
    updateCommandMenuSelection();
}

function handleCommandMenuKeydown(event) {
    if (!commandMenu || commandMenu.hidden) return;

    if (event.key === "Escape") {
        event.preventDefault();
        closeCommandMenu();
        input?.focus();
        return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (visibleCommandMenuItems.length === 0) return;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeCommandMenuIndex = (activeCommandMenuIndex + direction + visibleCommandMenuItems.length) % visibleCommandMenuItems.length;
        updateCommandMenuSelection();
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        runCommandMenuItem(visibleCommandMenuItems[activeCommandMenuIndex]);
    }
}

function openCommandMenu({ placeholder = "Search", items = [], query = "", label = "Command menu" } = {}) {
    const menu = ensureCommandMenu();
    if (!menu || !commandMenuSearchInput || !commandMenuList) return;

    modelSwitcher?.close?.();
    toolsDropdown?.classList.remove("open");
    closeVoiceQuickPanel();
    closeCommandMenu();
    commandMenuItems = items;
    activeCommandMenuIndex = 0;
    commandMenuSearchInput.placeholder = placeholder;
    commandMenuSearchInput.setAttribute("aria-label", placeholder);
    commandMenuList.setAttribute("aria-label", label);
    commandMenuSearchInput.value = query;
    menu.hidden = false;
    renderCommandMenuItems();
    window.setTimeout(() => {
        commandMenuSearchInput?.focus();
        commandMenuSearchInput?.select();
    }, 0);
}

function setComposerCommandText(text) {
    if (!input) return;
    input.value = text;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    input.focus();
}

function getCurrentProviderLabel() {
    return isOpenAiProvider() ? "OpenAI" : "Ollama";
}

function getCurrentModelLabel() {
    return isOpenAiProvider() ? getOpenAiChatModel() : OLLAMA_MODEL;
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatMessagePreview(message, maxLength = 96) {
    const text = String(message?.content || "")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "[No text]";
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function getLastMessageInfo() {
    const message = conversationHistory[conversationHistory.length - 1];
    if (!message) return "None";
    const model = message.model ? ` · ${message.model}` : "";
    return `${message.role || "message"}${model}: ${formatMessagePreview(message)}`;
}

function getMostUsedModelInfo() {
    const counts = new Map();
    conversationHistory.forEach(message => {
        const model = normalizeModelId(message?.model);
        if (!model) return;
        counts.set(model, (counts.get(model) || 0) + 1);
    });
    if (counts.size === 0) return "Not tracked yet";
    const [model, count] = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return `${model} (${count} ${count === 1 ? "message" : "messages"})`;
}

function getChatInfoText() {
    const session = getActiveSession();
    const userCount = conversationHistory.filter(message => message.role === "user").length;
    const assistantCount = conversationHistory.filter(message => message.role === "assistant").length;
    const title = session?.title || "Current Session";
    const created = session?.createdAt ? new Date(session.createdAt).toLocaleString() : "Not saved yet";
    const updated = session?.updatedAt ? new Date(session.updatedAt).toLocaleString() : "Not saved yet";
    const activeLabel = activeSessionId ? activeSessionId : "Draft";
    const createdAt = session?.createdAt ? new Date(session.createdAt) : appStartedAt;
    const runtimeBase = Number.isNaN(createdAt.getTime()) ? appStartedAt : createdAt;

    return [
        "Chat info",
        `Title: ${title}`,
        `Session: ${activeLabel}`,
        `Runtime: ${formatDuration(Date.now() - runtimeBase.getTime())}`,
        `App runtime: ${formatDuration(Date.now() - appStartedAt.getTime())}`,
        `Messages: ${conversationHistory.length} (${userCount} user, ${assistantCount} assistant)`,
        `Last message: ${getLastMessageInfo()}`,
        `Session tokens: ${sessionTotalTokens.toLocaleString()}`,
        `Provider: ${getCurrentProviderLabel()}`,
        `Current model: ${getCurrentModelLabel()}`,
        `Most used model: ${getMostUsedModelInfo()}`,
        `Memory beta: ${isMemoryEnabled ? "On" : "Off"} (${getMemoryCountLabel()})`,
        `Created: ${created}`,
        `Updated: ${updated}`
    ].join("\n");
}

function getLocalDateKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfLocalDay(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addLocalDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
}

function parseStoredDate(...values) {
    for (const value of values) {
        const date = new Date(value || "");
        if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
}

function formatFullDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function formatMonthLabel(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatTokenAmount(value) {
    const count = normalizeTokenCount(value) || 0;
    if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
    const safeCount = Number(count) || 0;
    return `${safeCount.toLocaleString()} ${safeCount === 1 ? singular : plural}`;
}

function incrementUsageCount(map, key, count = 1) {
    const label = String(key || "").trim();
    if (!label) return;
    map.set(label, (map.get(label) || 0) + count);
}

function getTopUsageEntry(map) {
    if (!(map instanceof Map) || map.size === 0) return null;
    const [label, count] = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { label, count };
}

function getSessionTokenTotal(session) {
    return Math.max(
        sumHistoryTokenUsage(session?.conversationHistory || []),
        normalizeTokenCount(session?.sessionTotalTokens) || 0
    );
}

function getWeekKeyForDate(date) {
    const start = startOfLocalDay(date);
    start.setDate(start.getDate() - start.getDay());
    return getLocalDateKey(start);
}

function parseLocalDateKey(key) {
    const [year, month, day] = String(key || "").split("-").map(Number);
    if (!year || !month || !day) return startOfLocalDay();
    return new Date(year, month - 1, day);
}

function getUsageToolLabelFromRow(row) {
    const kind = row.dataset.toolKind || "tool";
    const label = row.querySelector(".tool-activity-label")?.textContent?.trim();
    if (label && label !== "Done") return label;
    if (kind === "web") return "Web search";
    if (kind === "workspace") return "Workspace tool";
    if (kind === "terminal") return "Terminal command";
    if (kind === "memory") return "Memory tool";
    if (kind === "image") return "Image generation";
    return "Tool call";
}

function getUsageToolEventId({ sessionId, index, kind, label }) {
    return [
        "tool",
        sessionId || "draft",
        index,
        String(kind || "tool").trim().toLowerCase(),
        String(label || "Tool call").trim().toLowerCase()
    ].join(":");
}

function getUsageToolEventsFromHtml(html, { sessionId = "", date = new Date().toISOString() } = {}) {
    if (!html) return [];
    const template = document.createElement("template");
    template.innerHTML = String(html);
    return Array.from(template.content.querySelectorAll(".tool-activity-row:not(.tool-activity-row-preview):not(.tool-activity-row-done)"))
        .map((row, index) => {
            const kind = row.dataset.toolKind || "tool";
            const label = getUsageToolLabelFromRow(row);
            return {
                id: getUsageToolEventId({ sessionId, index, kind, label }),
                date,
                kind,
                label,
                sessionId
            };
        });
}

function syncUsageToolEventsFromSession(session, { html = session?.chatHtml, persist = true } = {}) {
    if (!session) return 0;
    const date = parseStoredDate(session.updatedAt, session.createdAt)?.toISOString() || new Date().toISOString();
    const events = getUsageToolEventsFromHtml(html, { sessionId: session.id, date });
    events.forEach(event => upsertUsageToolEvent(event, { persist: false }));
    if (events.length > 0 && persist) persistUsageToolEvents();
    return events.length;
}

function calculateStreaks(dayEntries) {
    let current = 0;
    let longest = 0;
    let running = 0;

    dayEntries.forEach(entry => {
        if (entry.tokens > 0) {
            running += 1;
            longest = Math.max(longest, running);
        } else {
            running = 0;
        }
    });

    for (let index = dayEntries.length - 1; index >= 0; index -= 1) {
        if (dayEntries[index].tokens <= 0) break;
        current += 1;
    }

    return { current, longest };
}

function buildUsageStatsSnapshot() {
    const today = startOfLocalDay();
    const firstDay = addLocalDays(today, -(USAGE_HEATMAP_DAYS - 1));
    const calendarStart = addLocalDays(firstDay, -firstDay.getDay());
    const dayMap = new Map();
    const modelCounts = new Map();
    const reasoningCounts = new Map();
    const toolCounts = new Map();
    let totalTokens = 0;
    let messageTokenTotal = 0;

    for (let cursor = new Date(calendarStart); cursor <= today; cursor = addLocalDays(cursor, 1)) {
        const date = new Date(cursor);
        dayMap.set(getLocalDateKey(date), {
            date,
            tokens: 0,
            inRange: date >= firstDay && date <= today
        });
    }

    usageEvents
        .map(normalizeUsageEvent)
        .filter(Boolean)
        .forEach(event => {
            totalTokens += event.total;
            messageTokenTotal += event.total;
            incrementUsageCount(modelCounts, event.model);
            incrementUsageCount(reasoningCounts, event.reasoning);
            const usageDate = parseStoredDate(event.date) || today;
            const key = getLocalDateKey(startOfLocalDay(usageDate));
            const bucket = dayMap.get(key);
            if (bucket) bucket.tokens += event.total;
        });

    usageToolEvents
        .map(normalizeUsageToolEvent)
        .filter(Boolean)
        .forEach(event => incrementUsageCount(toolCounts, event.label));

    const dayEntries = Array.from(dayMap.values());
    const inRangeDays = dayEntries.filter(entry => entry.inRange);
    const peakDay = inRangeDays.reduce((best, entry) => entry.tokens > best.tokens ? entry : best, { tokens: 0, date: today });
    const activeDays = inRangeDays.filter(entry => entry.tokens > 0).length;
    const streaks = calculateStreaks(inRangeDays);
    const weeklyTotals = new Map();

    dayEntries.forEach(entry => {
        const weekKey = getWeekKeyForDate(entry.date);
        weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + entry.tokens);
    });

    const cumulativeWeeklyTotals = new Map();
    let runningWeeklyTotal = 0;
    let previousWeekKey = "";
    dayEntries.forEach(entry => {
        const weekKey = getWeekKeyForDate(entry.date);
        if (weekKey === previousWeekKey) return;
        previousWeekKey = weekKey;
        runningWeeklyTotal += weeklyTotals.get(weekKey) || 0;
        cumulativeWeeklyTotals.set(weekKey, runningWeeklyTotal);
    });

    const heatmapEntries = dayEntries.map(entry => {
        const weekKey = getWeekKeyForDate(entry.date);
        return {
            ...entry,
            weeklyTokens: weeklyTotals.get(weekKey) || 0,
            cumulativeTokens: cumulativeWeeklyTotals.get(weekKey) || 0
        };
    });

    return {
        totalTokens,
        messageTokenTotal,
        peakDay,
        activeDays,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        heatmapEntries,
        firstDay,
        today,
        topModel: getTopUsageEntry(modelCounts),
        topReasoning: getTopUsageEntry(reasoningCounts),
        topTools: Array.from(toolCounts.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 5)
            .map(([label, count]) => ({ label, count }))
    };
}

function getUsageCellTokens(entry, view = activeUsageView) {
    if (view === "weekly") return entry.weeklyTokens;
    if (view === "cumulative") return entry.cumulativeTokens;
    return entry.tokens;
}

function getUsageCellTooltip(entry, view = activeUsageView) {
    const amount = formatTokenAmount(getUsageCellTokens(entry, view));
    const date = formatFullDate(entry.date);
    if (view === "weekly") {
        const weekStart = parseLocalDateKey(getWeekKeyForDate(entry.date));
        return `${amount} tokens in the week of ${formatFullDate(weekStart)}`;
    }
    if (view === "cumulative") {
        const weekStart = parseLocalDateKey(getWeekKeyForDate(entry.date));
        return `${amount} tokens through the week of ${formatFullDate(weekStart)}`;
    }
    return `${amount} tokens on ${date}`;
}

function getUsageLevel(tokens, maxTokens) {
    if (!tokens || !maxTokens) return 0;
    const ratio = tokens / maxTokens;
    if (ratio >= 0.72) return 4;
    if (ratio >= 0.38) return 3;
    if (ratio >= 0.16) return 2;
    return 1;
}

function renderUsageStatsRail(snapshot) {
    const rail = document.getElementById("usageStatsRail");
    if (!rail) return;
    const stats = [
        { value: formatTokenAmount(snapshot.totalTokens), label: "Total tokens" },
        { value: formatTokenAmount(snapshot.peakDay.tokens), label: "Peak token day" },
        { value: snapshot.topModel?.label || "Not tracked", label: "Most used model" },
        { value: snapshot.topReasoning?.label || "Not tracked", label: "Most used reasoning" },
        { value: `${snapshot.longestStreak.toLocaleString()} days`, label: "Longest streak" }
    ];

    rail.replaceChildren(...stats.map(stat => {
        const item = document.createElement("div");
        item.className = "usage-stat-item";
        item.innerHTML = `
            <strong>${escapeHtml(stat.value)}</strong>
            <span>${escapeHtml(stat.label)}</span>
        `;
        return item;
    }));
}

function renderUsageCalendar(snapshot) {
    const calendar = document.getElementById("usageCalendar");
    const months = document.getElementById("usageMonthLabels");
    if (!calendar || !months) return;

    const maxTokens = Math.max(...snapshot.heatmapEntries.map(entry => getUsageCellTokens(entry)), 0);
    calendar.replaceChildren(...snapshot.heatmapEntries.map(entry => {
        const tokens = getUsageCellTokens(entry);
        const cell = document.createElement("span");
        cell.className = `usage-day-cell usage-level-${getUsageLevel(tokens, maxTokens)}`;
        cell.classList.toggle("outside-range", !entry.inRange);
        cell.dataset.tooltip = getUsageCellTooltip(entry);
        cell.setAttribute("aria-label", getUsageCellTooltip(entry));
        return cell;
    }));

    const monthMarkers = [];
    let previousMonth = "";
    snapshot.heatmapEntries.forEach((entry, index) => {
        if (!entry.inRange) return;
        const month = `${entry.date.getFullYear()}-${entry.date.getMonth()}`;
        if (month === previousMonth) return;
        previousMonth = month;
        monthMarkers.push({
            label: formatMonthLabel(entry.date),
            column: Math.floor(index / 7) + 1
        });
    });

    months.replaceChildren(...monthMarkers.map(marker => {
        const label = document.createElement("span");
        label.textContent = marker.label;
        label.style.gridColumn = `${marker.column} / span 4`;
        return label;
    }));
}

function renderUsageInsights(snapshot) {
    const insights = document.getElementById("usageActivityInsights");
    if (insights) {
        const rows = [
            ["Most used model", snapshot.topModel?.label || "Not tracked"],
            ["Most used reasoning", snapshot.topReasoning?.label || "Not tracked"],
            ["Active days", `${snapshot.activeDays.toLocaleString()} days`],
            ["Current streak", `${snapshot.currentStreak.toLocaleString()} days`],
            ["Longest streak", `${snapshot.longestStreak.toLocaleString()} days`],
            ["Peak day", snapshot.peakDay.tokens ? `${formatTokenAmount(snapshot.peakDay.tokens)} on ${formatFullDate(snapshot.peakDay.date)}` : "No token usage yet"],
            ["Tracked usage", snapshot.messageTokenTotal ? formatTokenAmount(snapshot.messageTokenTotal) : "Waiting for provider usage"]
        ];
        insights.replaceChildren(...rows.map(([label, value]) => {
            const row = document.createElement("div");
            row.className = "usage-insight-row";
            row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
            return row;
        }));
    }

    const tools = document.getElementById("usageToolCalls");
    if (!tools) return;
    if (snapshot.topTools.length === 0) {
        tools.innerHTML = `<p class="usage-empty">No tool calls tracked yet.</p>`;
        return;
    }
    tools.replaceChildren(...snapshot.topTools.map(tool => {
        const row = document.createElement("div");
        row.className = "usage-tool-row";
        row.innerHTML = `
            <span class="usage-tool-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"></path><path d="M12 18v3"></path><path d="m4.22 4.22 2.12 2.12"></path><path d="m17.66 17.66 2.12 2.12"></path><path d="M3 12h3"></path><path d="M18 12h3"></path><path d="m4.22 19.78 2.12-2.12"></path><path d="m17.66 6.34 2.12-2.12"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </span>
            <strong>${escapeHtml(tool.label)}</strong>
            <span>${escapeHtml(formatCountLabel(tool.count, "call"))}</span>
        `;
        return row;
    }));
}

function renderUsageSettingsPane() {
    const pane = document.querySelector('[data-settings-pane-panel="usage"]');
    if (!pane) return;
    const snapshot = buildUsageStatsSnapshot();
    renderUsageStatsRail(snapshot);
    renderUsageCalendar(snapshot);
    renderUsageInsights(snapshot);
}

function refreshUsageSettingsPaneIfVisible() {
    const pane = document.querySelector('[data-settings-pane-panel="usage"]');
    if (!pane || pane.hidden) return;
    renderUsageSettingsPane();
}

function getChatInfoMenuItems() {
    return getChatInfoText()
        .split("\n")
        .slice(1)
        .map((line, index) => {
            const separatorIndex = line.indexOf(":");
            const label = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : line.trim();
            const meta = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : "";
            return {
                id: `chat-info:${index}`,
                label: label || "Info",
                meta,
                searchText: line,
                readOnly: true
            };
        });
}

function openInfoCommandMenu(query = "") {
    openCommandMenu({
        placeholder: "Search chat info",
        label: "Chat info",
        query,
        items: getChatInfoMenuItems()
    });
}

function getAllSelectableModels() {
    const models = [...getLocalModelSwitcherOptions(), ...getOpenAiModelSwitcherOptions()];
    const seen = new Set();
    return models.filter(model => {
        const id = normalizeModelId(model.id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function openModelCommandMenu(query = "") {
    const activeModel = getCurrentModelLabel();
    const activeProvider = activeAiProvider;
    const items = getAllSelectableModels().map(option => {
        const providerLabel = option.provider === AI_PROVIDER_OPENAI ? "OpenAI" : "Ollama";
        const label = option.label || option.id;
        return {
            id: `model:${option.provider || AI_PROVIDER_LOCAL}:${option.id}`,
            label,
            meta: [providerLabel, option.meta].filter(Boolean).join(" · "),
            searchText: `${option.id} ${label} ${providerLabel} ${option.meta || ""}`,
            selected: option.provider === activeProvider && option.id === activeModel,
            action: () => {
                setActiveModel(option.id, option);
                showToast(`Model changed to ${label}.`, "success");
            }
        };
    });

    openCommandMenu({
        placeholder: "Search models",
        label: "Model commands",
        query,
        items
    });
}

function handleModelSlashCommand(argument = "") {
    const target = argument.trim();
    clearComposerText();

    if (!target) {
        window.setTimeout(() => openModelCommandMenu(), 0);
        return true;
    }

    if (/^(ollama|local)$/i.test(target)) {
        setActiveAiProvider(AI_PROVIDER_LOCAL);
        showToast("Switched to local Ollama models.", "success");
        return true;
    }

    if (/^openai$/i.test(target)) {
        setActiveAiProvider(AI_PROVIDER_OPENAI);
        showToast("Switched to OpenAI models.", getOpenAiApiKey() ? "success" : "warning");
        return true;
    }

    const lowerTarget = target.toLowerCase();
    const match = getAllSelectableModels().find(model =>
        model.id.toLowerCase() === lowerTarget ||
        String(model.label || "").toLowerCase() === lowerTarget
    );

    if (!match) {
        showToast(`No model named "${target}" was found.`, "error");
        return true;
    }

    setActiveModel(match.id, match);
    showToast(`Model changed to ${match.label || match.id}.`, "success");
    return true;
}

function formatMemoryEntryDetails(entry, index) {
    const created = entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown";
    const updated = entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "Unknown";
    return [
        `Memory ${index + 1}`,
        entry?.text || "[No text]",
        `Source: ${entry?.source || "user"}`,
        `Created: ${created}`,
        `Updated: ${updated}`,
        "",
        `Delete with: /memory delete ${index + 1}`
    ].join("\n");
}

function openMemoryCommandMenu(query = "") {
    const items = [
        {
            id: "memory-toggle",
            label: isMemoryEnabled ? "Turn memory off" : "Turn memory on",
            meta: isMemoryEnabled ? `${getMemoryCountLabel()} saved` : "Enable saved memories",
            searchText: "memory toggle on off enable disable",
            action: () => setMemoryEnabled(!isMemoryEnabled)
        },
        {
            id: "memory-list",
            label: "List memories",
            meta: getMemoryCountLabel(),
            searchText: "memory list show saved",
            action: () => renderCommandResult("/memory list", formatMemoryList())
        },
        {
            id: "memory-add",
            label: "Add memory",
            meta: "Prepare /memory add",
            searchText: "memory add remember create",
            action: () => setComposerCommandText("/memory add ")
        },
        {
            id: "memory-delete",
            label: "Delete memory",
            meta: "Prepare /memory delete",
            searchText: "memory delete remove forget",
            disabled: memoryEntries.length === 0,
            action: () => setComposerCommandText("/memory delete ")
        },
        {
            id: "memory-clear",
            label: "Clear all memories",
            meta: memoryEntries.length ? `${memoryEntries.length} saved` : "No saved memories",
            searchText: "memory clear reset",
            disabled: memoryEntries.length === 0,
            action: () => handleMemorySlashCommand("clear", "/memory clear")
        },
        ...memoryEntries.map((entry, index) => ({
            id: `memory:${entry.id || index}`,
            label: `${index + 1}. ${entry.text}`,
            meta: "Saved memory",
            searchText: `${entry.text} memory saved ${entry.source || ""}`,
            action: () => renderCommandResult(`/memory ${index + 1}`, formatMemoryEntryDetails(entry, index))
        }))
    ];

    openCommandMenu({
        placeholder: "Search memory",
        label: "Memory commands",
        query,
        items
    });
}

async function captureScreenshotAttachment() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
        showToast("Screen capture is not available in this browser.", "error");
        return;
    }

    let stream = null;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = () => reject(new Error("Could not read the screen capture stream."));
        });
        await video.play();
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Could not create a screenshot image.");

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `screenshot-${timestamp}.png`, { type: "image/png" });
        if (addAttachedFile(file)) updateTokenDisplay();
        showToast("Screenshot attached. Add a message and send when ready.", "success");
    } catch (err) {
        if (err.name === "NotAllowedError") {
            showToast("Screen capture was cancelled.", "info");
        } else {
            showToast(`Screenshot failed: ${err.message}`, "error");
        }
    } finally {
        stream?.getTracks().forEach(track => track.stop());
    }
}

function getMemoryHelpText() {
    return [
        "Memory commands",
        "/memory list",
        "/memory add <thing to remember>",
        "/memory delete <number or text>",
        "/memory clear",
        "/memory on or /memory off"
    ].join("\n");
}

async function handleMemorySlashCommand(argument = "", commandText = "/memory") {
    const arg = argument.trim();
    const actionMatch = arg.match(/^(\S+)(?:\s+([\s\S]+))?$/);
    const action = (actionMatch?.[1] || "list").toLowerCase();
    const value = (actionMatch?.[2] || "").trim();

    clearComposerText();

    if (!arg) {
        window.setTimeout(() => openMemoryCommandMenu(), 0);
        return true;
    }

    if (["on", "enable"].includes(action)) {
        setMemoryEnabled(true);
        renderCommandResult(commandText, `Memory beta is on.\n\n${formatMemoryList()}`);
        return true;
    }

    if (["off", "disable"].includes(action)) {
        setMemoryEnabled(false);
        renderCommandResult(commandText, "Memory beta is off. Saved memories stay stored but are not used in chats.");
        return true;
    }

    if (!isMemoryEnabled) {
        renderCommandResult(commandText, "Memory beta is off. Enable it in Settings > Personalization, or run /memory on.");
        return true;
    }

    if (["help", "?"].includes(action)) {
        renderCommandResult(commandText, getMemoryHelpText());
        return true;
    }

    if (["list", "show", "manage"].includes(action)) {
        renderCommandResult(commandText, formatMemoryList());
        return true;
    }

    if (["add", "remember", "create"].includes(action)) {
        if (!value) {
            renderCommandResult(commandText, "Add the memory text after the command.\nExample: /memory add User prefers short answers.");
            return true;
        }
        const result = addMemoryEntry(value, "user");
        renderCommandResult(commandText, result.created
            ? `Memory saved: ${result.entry.text}`
            : `That memory already exists: ${result.entry.text}`);
        return true;
    }

    if (["delete", "forget", "remove"].includes(action)) {
        if (!value) {
            renderCommandResult(commandText, "Tell me which memory to delete by number or text.\nExample: /memory delete 2");
            return true;
        }
        const removed = removeMemoryEntry(value);
        renderCommandResult(commandText, removed
            ? `Memory deleted: ${removed.text}`
            : `No memory matched "${value}".`);
        return true;
    }

    if (action === "clear") {
        const approved = await showApprovalDialog({
            title: "Clear all memories?",
            message: "This removes every saved beta memory from this browser.",
            details: memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`).slice(0, 6),
            confirmLabel: "Clear memories",
            cancelLabel: "Keep memories"
        });
        if (!approved) {
            showToast("Memories kept.", "info");
            return true;
        }
        const count = clearMemoryEntries();
        renderCommandResult(commandText, `Cleared ${count} ${count === 1 ? "memory" : "memories"}.`);
        return true;
    }

    const knownMemoryActions = new Set([
        "on", "enable", "off", "disable", "help", "?", "list", "show", "manage",
        "add", "remember", "create", "delete", "forget", "remove", "clear"
    ]);

    if (arg && !knownMemoryActions.has(action)) {
        const result = addMemoryEntry(arg, "user");
        renderCommandResult(commandText, result.created
            ? `Memory saved: ${result.entry.text}`
            : `That memory already exists: ${result.entry.text}`);
        return true;
    }

    renderCommandResult(commandText, getMemoryHelpText());
    return true;
}

function getSlashCommandSubmission(text) {
    const match = String(text || "").trim().match(/^\/([a-z][\w-]*)(?:\s+([\s\S]*))?$/i);
    if (!match) return null;
    return {
        name: match[1].toLowerCase(),
        argument: (match[2] || "").trim()
    };
}

function isComposerToolSlashCommand(commandName = "") {
    return ["search", "web", "tree", "files", "read", "run", "cmd", "shell", "terminal", "ps", "weather", "wetter", "temp", "temperature", "location", "ip-location", "wait", "timer", "sleep", "wait_for", "stopwatch", "time", "measure"].includes(
        String(commandName || "").trim().toLowerCase()
    );
}

async function handleSlashCommandSubmission(textValue) {
    const command = getSlashCommandSubmission(textValue);
    if (!command) return false;

    if (["image", "img", "imagine", "video", "vid", "clip", "search", "web", "tree", "files", "read", "run", "cmd", "shell", "terminal", "ps", "weather", "wetter", "temp", "temperature", "location", "ip-location", "wait", "timer", "sleep", "wait_for", "stopwatch", "time", "measure"].includes(command.name)) {
        return false;
    }

    if (command.name === "screenshot" || command.name === "screen") {
        clearComposerText();
        await captureScreenshotAttachment();
        return true;
    }

    if (command.name === "info" || command.name === "about") {
        clearComposerText();
        window.setTimeout(() => openInfoCommandMenu(command.argument), 0);
        return true;
    }

    if (command.name === "new" || command.name === "chat") {
        clearComposerDraft();
        hideSlashCommandPalette();
        startNewChatSession();
        return true;
    }

    if (command.name === "model" || command.name === "provider") {
        return handleModelSlashCommand(command.argument);
    }

    if (command.name === "memory" || command.name === "remember") {
        return handleMemorySlashCommand(command.argument, textValue);
    }

    return false;
}

// ===== PROCESSING PIPELINE =====
sendButton.onclick = processWorkspaceEntry;
input.addEventListener("keydown", e => {
    if (handleSlashCommandKeydown(e)) return;
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!isGenerating) processWorkspaceEntry();
    }
});
input.addEventListener("input", () => {
    if (!isVoiceInputUpdate) {
        shouldSpeakNextReply = false;
    }
    closeCommandMenu();
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    scheduleComposerSafeAreaUpdate();
    updateTokenDisplay();
    renderSlashCommandPalette();
});
input.addEventListener("focus", renderSlashCommandPalette);
input.addEventListener("click", renderSlashCommandPalette);
document.addEventListener("click", event => {
    if (event.target.closest("#slashCommandPalette") || event.target.closest("#commandMenu") || event.target.closest("#prompt")) return;
    hideSlashCommandPalette();
    closeCommandMenu();
});

async function processWorkspaceEntry(options = {}) {
    if (isGenerating) return;

    const skipWorkspaceContext = options?.skipWorkspaceContext === true;
    const hasRetryPayload = typeof options?.textValue === "string" || Array.isArray(options?.files);
    const textValue = (hasRetryPayload ? options.textValue || "" : input.value).trim();
    const sourceFiles = Array.isArray(options?.files) ? options.files : attachedFiles;
    if (!textValue && sourceFiles.length === 0) return;

    if (await handleSlashCommandSubmission(textValue)) {
        return;
    }

    const command = getSlashCommandSubmission(textValue);
    if (command && isComposerToolSlashCommand(command.name) && !canUseComposerTools()) {
        showToast(`${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`, "warning");
        return;
    }

    const unsupportedAttachments = getUnsupportedAttachmentFiles(sourceFiles);
    if (unsupportedAttachments.length > 0) {
        showUnsupportedAttachmentToast(unsupportedAttachments);
        return;
    }

    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    const speakThisReply = shouldSpeakNextReply && textValue.length > 0;
    const videoPrompt = getVideoCommandPrompt(textValue);
    const imagePrompt = getImageCommandPrompt(textValue);
    shouldSpeakNextReply = false;

    setGeneratingBusy(true);
    if (isOpenAiProvider() && isOpenAiVoiceSessionActive && speakThisReply) {
        setVoiceSessionStatus("Thinking", 0.34);
    }

    try {
        welcome.style.display = "none";
        chat.style.display = "block";
        isChatPinnedToBottom = true;

        const currentFiles = [...sourceFiles];
        await ensurePersistentImagePreviewSources(currentFiles);
        if (!hasRetryPayload) {
            input.value = "";
            input.style.height = "auto";
            previewContainer.innerHTML = "";
            attachedFiles = [];
            updateTokenDisplay();
            scheduleComposerSafeAreaUpdate();
        }

        const routedModel = chooseModelForRequest(textValue, currentFiles, imagePrompt, videoPrompt);
        if (isOpenAiProvider()) {
            updateModelSwitcherForProvider();
        }

        const userMessageCreatedAt = new Date().toISOString();
        const userBubble = options?.skipUserBubble === true
            ? null
            : addRenderNode(textValue, "user", currentFiles, {
                createdAt: userMessageCreatedAt
            });

        if (videoPrompt !== null) {
            await processVideoGeneration(videoPrompt, currentFiles, generationSignal, {
                userCreatedAt: userMessageCreatedAt
            });
            scrollChatToBottom();
            return;
        }

        if (imagePrompt !== null) {
            await processImageGeneration(imagePrompt, currentFiles, generationSignal, {
                userCreatedAt: userMessageCreatedAt
            });
            scrollChatToBottom();
            return;
        }

        if (isImageEditRequest(textValue, currentFiles)) {
            await processImageEdit(textValue, currentFiles, generationSignal, {
                userCreatedAt: userMessageCreatedAt
            });
            scrollChatToBottom();
            return;
        }

        let messageContent = speakThisReply ? `${textValue}${getVoiceModeInstruction()}` : textValue;
        let base64Images = [];
        let openAiImageFileIds = [];
        const aiBubble = options?.targetBubble || addRenderNode("__thinking__", "output");
        if (options?.targetBubble) {
            prepareBubbleForRetry(aiBubble);
        }
        if (speakThisReply) {
            userBubble?.closest(".message-node")?.classList.add("voice-user-prompt");
        }
        if (document.body?.classList.contains("voice-chat-active")) {
            setCurrentVoiceAssistantNode(aiBubble.closest(".message-node"));
        }
        let webSources = [];
        const openAiUploadItems = [];

        for (const file of currentFiles) {
            if (file.type.startsWith("image/")) {
                try {
                    if (isOpenAiProvider()) {
                        const uploadItem = {
                            kind: "image",
                            label: "OpenAI image upload",
                            tool: "upload_image",
                            detail: file.name || "image",
                            input: file.name || "image",
                            meta: "Uploading"
                        };
                        openAiUploadItems.push(uploadItem);
                        renderToolActivity(aiBubble, {
                            title: "Thinking about",
                            items: openAiUploadItems
                        });
                        const preparedImage = await prepareOpenAiVisionImage(file, generationSignal);
                        openAiImageFileIds.push(preparedImage.fileId);
                        uploadItem.meta = preparedImage.reused ? "Reused" : "Uploaded";
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
                                : "Fauna could not upload the image to OpenAI. Check the API key, file type, and file size.",
                            retryLabel: "Retry generation",
                            onRetry: () => processWorkspaceEntry({
                                textValue,
                                files: currentFiles,
                                skipWorkspaceContext,
                                skipUserBubble: true,
                                targetBubble: aiBubble
                            })
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

        if (!hasImageAttachments && shouldUseApproxWeatherContext(textValue)) {
            const locationActivityItem = {
                kind: "location",
                label: "Location",
                tool: "current_weather",
                detail: "Current weather near me",
                input: "Approximate location",
                meta: "Checking"
            };
            renderToolActivity(aiBubble, {
                title: "Checking local weather...",
                items: [locationActivityItem]
            });
            try {
                const weatherResult = await executeLocationToolCall({ tool: "current_weather" }, generationSignal);
                locationActivityItem.meta = "Done";
                locationActivityItem.sources = weatherResult.sources || [];
                renderToolActivity(aiBubble, {
                    title: "Checking local weather...",
                    items: [locationActivityItem]
                });
                if (weatherResult.text) {
                    messageContent += `\n\n--- Approx Location Weather Context ---\n${weatherResult.text}\n--- End Approx Location Weather Context ---`;
                }
                if (Array.isArray(weatherResult.sources) && weatherResult.sources.length > 0) {
                    webSources = mergeWebSources(webSources, weatherResult.sources);
                }
            } catch (err) {
                locationActivityItem.meta = "Failed";
                locationActivityItem.error = err.message;
                renderToolActivity(aiBubble, {
                    title: "Checking local weather...",
                    items: [locationActivityItem]
                });
                messageContent += `\n\n[Approx location weather was requested, but Fauna could not read it: ${err.message}]`;
            }
        }

        if (!hasImageAttachments && shouldSearchWeb(textValue)) {
            const webSearchQuery = buildSearchQuery(textValue);
            const webActivityItem = {
                kind: "web",
                label: "Searched the web",
                tool: "web_search",
                detail: "",
                input: webSearchQuery,
                query: webSearchQuery,
                meta: "Searching"
            };
            renderToolActivity(aiBubble, {
                title: "Thinking about",
                items: [webActivityItem]
            });
            try {
                const webResult = await getWebContextForPrompt(textValue, generationSignal);
                webActivityItem.query = webResult.query || webSearchQuery;
                webActivityItem.sources = webResult.sources || [];
                webActivityItem.resultCount = webResult.resultCount ?? webResult.sources.length;
                webActivityItem.meta = `${webResult.resultCount ?? webResult.sources.length} results`;
                renderToolActivity(aiBubble, {
                    title: "Thinking about",
                    items: [webActivityItem]
                });
                if (webResult.context) {
                    messageContent += webResult.context;
                    webSources = mergeWebSources(webSources, webResult.sources);
                }
            } catch (err) {
                webActivityItem.meta = "Failed";
                webActivityItem.error = err.message;
                renderToolActivity(aiBubble, {
                    title: "Thinking about",
                    items: [webActivityItem]
                });
                messageContent += `\n\n[Web search was requested, but the browser could not fetch online results: ${err.message}]`;
            }
        }

        if (!skipWorkspaceContext && !hasImageAttachments && shouldUseWorkspaceBridge(textValue)) {
            const workspaceActivityItem = {
                kind: "workspace",
                label: "Local workspace",
                tool: "workspace_context",
                detail: "Prepare local context",
                input: textValue,
                meta: "Reading"
            };
            renderToolActivity(aiBubble, {
                title: "Inspecting local workspace...",
                items: [workspaceActivityItem]
            });
            try {
                messageContent += await getWorkspaceContextForPrompt(textValue, generationSignal);
                workspaceActivityItem.meta = "Done";
                renderToolActivity(aiBubble, {
                    title: "Inspecting local workspace...",
                    items: [workspaceActivityItem]
                });
            } catch (err) {
                workspaceActivityItem.meta = "Failed";
                renderToolActivity(aiBubble, {
                    title: "Inspecting local workspace...",
                    items: [workspaceActivityItem]
                });
                messageContent += `\n\n[Local workspace bridge was requested, but the app could not access it: ${err.message}]`;
            }
        }

        const userMessageObject = {
            role: "user",
            content: messageContent,
            createdAt: userMessageCreatedAt
        };
        if (base64Images.length > 0) {
            userMessageObject.images = base64Images;
        }
        if (openAiImageFileIds.length > 0) {
            userMessageObject.openAiImageFileIds = openAiImageFileIds;
        }
        conversationHistory.push(userMessageObject);
        const userHistoryIndex = conversationHistory.length - 1;
        const userMessageNode = userBubble?.closest?.(".message-node.user-node");
        if (userMessageNode) {
            userMessageNode.dataset.historyIndex = String(userHistoryIndex);
            userMessageNode.dataset.createdAt = userMessageCreatedAt;
        }

        try {
            const data = await sendOllamaChatWithLocalTools(
                conversationHistory,
                getActiveChatRequestOptions(),
                routedModel,
                generationSignal,
                aiBubble,
                { enabled: true }
            );
            const tokenUsage = getProviderTokenUsage(data);
            const assistantMessage = getAssistantMessageForConversation(data, routedModel);
            attachTokenUsage(assistantMessage, tokenUsage);
            conversationHistory.push(assistantMessage);
            const assistantIndex = conversationHistory.length - 1;

            addSessionTokens(tokenUsage, { message: assistantMessage });
            await renderAssistantResponse(data, aiBubble, webSources, generationSignal, speakThisReply, {
                messageIndex: assistantIndex,
                alreadyRendered: data.__faunaAlreadyRendered === true,
                preserveRenderedContent: data.__faunaPreserveRenderedContent === true
            });

        } catch (e) {
            renderErrorCard(aiBubble, e, {
                retryLabel: "Retry generation",
                onRetry: () => retryAssistantGenerationFromBubble(aiBubble, {
                    model: routedModel,
                    webSources,
                    speakThisReply
                })
            });
        }

        scrollChatToBottom();
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

function cleanImageOptionText(value, maxLength = 140) {
    return String(value || "")
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
        .trim();
}

function normalizeImageDimension(value, fallback) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(512, Math.min(1536, Math.round(number / 8) * 8));
}

function getDimensionsFromAspectRatio(aspectRatio = "") {
    const normalized = String(aspectRatio || "").trim().replace(/\s+/g, "");
    const dimensions = {
        "1:1": { width: 1024, height: 1024, openAiSize: "1024x1024" },
        "16:9": { width: 1536, height: 864, openAiSize: "1536x1024" },
        "9:16": { width: 864, height: 1536, openAiSize: "1024x1536" },
        "4:3": { width: 1536, height: 1152, openAiSize: "1536x1024" },
        "3:4": { width: 1152, height: 1536, openAiSize: "1024x1536" }
    };
    return dimensions[normalized] || dimensions["1:1"];
}

function normalizeImageFormat(value) {
    const normalized = String(value || "").trim().toLowerCase().replace(/^jpg$/, "jpeg");
    return ["png", "jpeg", "webp"].includes(normalized) ? normalized : "";
}

function normalizeImageQuality(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return ["auto", "low", "medium", "high"].includes(normalized) ? normalized : "";
}

function normalizeImageBackground(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return ["auto", "transparent", "opaque"].includes(normalized) ? normalized : "";
}

function normalizeImageGenerationOptions(options = {}) {
    const aspectRatio = cleanImageOptionText(options.aspectRatio || options.ratio || options.aspect, 12);
    const fromAspect = getDimensionsFromAspectRatio(aspectRatio);
    const sizeMatch = String(options.size || "").match(/(\d{3,4})\s*x\s*(\d{3,4})/i);
    const width = normalizeImageDimension(options.width || sizeMatch?.[1], fromAspect.width);
    const height = normalizeImageDimension(options.height || sizeMatch?.[2], fromAspect.height);
    const openAiSize = sizeMatch
        ? width === height
            ? "1024x1024"
            : width > height
                ? "1536x1024"
                : "1024x1536"
        : fromAspect.openAiSize;

    return {
        aspectRatio: aspectRatio || (width === height ? "1:1" : width > height ? "16:9" : "9:16"),
        width,
        height,
        openAiSize: ["1024x1024", "1536x1024", "1024x1536"].includes(openAiSize) ? openAiSize : fromAspect.openAiSize,
        style: cleanImageOptionText(options.style || options.visualStyle),
        medium: cleanImageOptionText(options.medium),
        lighting: cleanImageOptionText(options.lighting),
        composition: cleanImageOptionText(options.composition),
        mood: cleanImageOptionText(options.mood),
        colorPalette: cleanImageOptionText(options.colorPalette || options.palette),
        camera: cleanImageOptionText(options.camera || options.lens),
        negativePrompt: cleanImageOptionText(options.negativePrompt || options.negative || options.avoid, 220),
        format: normalizeImageFormat(options.format || options.outputFormat),
        quality: normalizeImageQuality(options.quality),
        background: normalizeImageBackground(options.background),
        model: cleanImageOptionText(options.model, 32)
    };
}

function buildEffectiveImagePrompt(prompt, options = {}) {
    const normalized = normalizeImageGenerationOptions(options);
    const hints = [
        normalized.style ? `${normalized.style} style` : "",
        normalized.medium,
        normalized.lighting ? `${normalized.lighting} lighting` : "",
        normalized.composition ? `${normalized.composition} composition` : "",
        normalized.mood ? `${normalized.mood} mood` : "",
        normalized.colorPalette ? `${normalized.colorPalette} color palette` : "",
        normalized.camera,
        normalized.aspectRatio ? `${normalized.aspectRatio} aspect ratio` : "",
        normalized.quality && normalized.quality !== "auto" ? `${normalized.quality} quality` : ""
    ].filter(Boolean);
    const negative = normalized.negativePrompt ? `Avoid ${normalized.negativePrompt}.` : "";
    return [String(prompt || "").trim(), hints.join(", "), negative].filter(Boolean).join(". ");
}

function normalizeImageGenerationToolCall(toolCall = {}) {
    const prompt = cleanImageOptionText(
        toolCall.prompt || toolCall.description || toolCall.scene || toolCall.text || toolCall.query,
        1200
    );
    return {
        ...normalizeImageGenerationOptions(toolCall),
        prompt
    };
}

async function generateImageIntoBubble(container, prompt, {
    signal = null,
    options = {},
    activity = null,
    label = "Generated image"
} = {}) {
    const imageOptions = normalizeImageGenerationOptions(options);
    const effectivePrompt = buildEffectiveImagePrompt(prompt, imageOptions);
    const useOpenAi = isOpenAiProvider();
    const imageUrl = useOpenAi ? null : buildImageGenerationUrl(effectivePrompt, imageOptions);

    updateImageGenerationToolActivity(activity, "Rendering");
    const generatedImageUrl = useOpenAi
        ? await generateOpenAiImage(effectivePrompt, signal, imageOptions)
        : imageUrl;
    updateImageGenerationToolActivity(activity, "Preparing preview");
    await preloadImage(generatedImageUrl, signal);
    updateImageGenerationToolActivity(activity, "Ready", "done");
    renderGeneratedImage(container, effectivePrompt, generatedImageUrl, label, isSensitiveImagePrompt(effectivePrompt));
    moveToolActivityBeforeBubble(activity, container);
    return {
        imageUrl: generatedImageUrl,
        prompt: effectivePrompt,
        options: imageOptions
    };
}

function getImageGenerationFailureMessage(error) {
    return error?.name === "AbortError"
        ? "Your prompt is safe to edit and run again."
        : isOpenAiProvider()
            ? "Fauna could not create the image through OpenAI. Check the key, image model, and account limits."
            : "Fauna could not create the image. Check your connection and try again.";
}

async function retryImageGenerationInBubble(target, prompt, options = {}) {
    if (isGenerating || !target) return;

    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    setGeneratingBusy(true);
    prepareBubbleForRetry(target);

    try {
        const didGenerate = await renderImageGenerationAttempt(target, prompt, generationSignal, options);
        if (didGenerate) showToast("Image generation retried.", "success");
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
    }
}

async function renderImageGenerationAttempt(aiBubble, prompt, signal = null, options = {}) {
    const imageActivity = createImageGenerationToolActivity(aiBubble, {
        title: "Generating image",
        detail: "Generate image",
        meta: "Preparing",
        prompt,
        options
    });
    scrollChatToBottom();

    try {
        const generated = await generateImageIntoBubble(aiBubble, prompt, {
            signal,
            options,
            activity: imageActivity,
            label: "Generated image"
        });
        const historyContent = getGeneratedImageHistoryContent("Generated image", generated.prompt);
        conversationHistory.push({
            role: "assistant",
            content: historyContent,
            createdAt: new Date().toISOString()
        });
        setupAssistantActions(aiBubble.parentElement, getGeneratedMediaCopyText(generated.imageUrl, historyContent), {
            messageIndex: conversationHistory.length - 1,
            canFork: true
        });
        return true;
    } catch (e) {
        updateImageGenerationToolActivity(imageActivity, e.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(aiBubble, e, {
            title: e.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: getImageGenerationFailureMessage(e),
            retryLabel: "Retry generation",
            onRetry: () => retryImageGenerationInBubble(aiBubble, prompt, options)
        });
        return false;
    }
}

async function processImageGeneration(prompt, currentFiles, signal = null, options = {}) {
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
        await processImageEdit(prompt, currentFiles, signal, options);
        return;
    }

    if (currentFiles.length > 0) {
        const noteBubble = addRenderNode("Image generation uses the text prompt only. Non-image attachments were shown above but not sent to the image generator.", "output");
        noteBubble.style.color = "#f59e0b";
    }

    conversationHistory.push({
        role: "user",
        content: `[Image prompt] ${prompt}`,
        createdAt: options.userCreatedAt || new Date().toISOString()
    });

    const aiBubble = addRenderNode("__thinking__", "output");
    await renderImageGenerationAttempt(aiBubble, prompt, signal, options);
}

function getImageEditFailureMessage(error) {
    return error?.name === "AbortError"
        ? "Your edit request is safe to adjust and run again."
        : isOpenAiProvider()
            ? "Fauna could not edit the image through OpenAI. Check the key, image model, and attached image."
            : `Fauna could not prepare the edit. Make sure Ollama is running and "${IMAGE_EDIT_MODEL}" is installed.`;
}

async function retryImageEditInBubble(target, requestText, imageFiles) {
    if (isGenerating || !target) return;

    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    setGeneratingBusy(true);
    prepareBubbleForRetry(target);

    try {
        const didEdit = await renderImageEditAttempt(target, requestText, imageFiles, generationSignal);
        if (didEdit) showToast("Image edit retried.", "success");
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
    }
}

async function renderImageEditAttempt(aiBubble, requestText, imageFiles, signal = null, options = {}) {
    const imageActivity = createImageGenerationToolActivity(aiBubble, {
        title: "Editing image",
        detail: "Generate image edit",
        meta: "Reading image",
        prompt: requestText,
        options,
        toolName: "edit_image"
    });
    scrollChatToBottom();

    try {
        throwIfAborted(signal);

        if (isOpenAiProvider()) {
            updateImageGenerationToolActivity(imageActivity, "Sending edit");
            const imageUrl = await editOpenAiImage(requestText, imageFiles, signal);
            updateImageGenerationToolActivity(imageActivity, "Preparing preview");
            await preloadImage(imageUrl, signal);
            updateImageGenerationToolActivity(imageActivity, "Ready", "done");
            renderGeneratedImage(aiBubble, requestText, imageUrl, "Generated edit", isSensitiveImagePrompt(requestText));
            const historyContent = getGeneratedImageHistoryContent("Generated image edit", requestText);

            conversationHistory.push({
                role: "user",
                content: `[Image edit request] ${requestText}`,
                createdAt: options.userCreatedAt || new Date().toISOString()
            });
            conversationHistory.push({
                role: "assistant",
                content: historyContent,
                createdAt: new Date().toISOString()
            });
            setupAssistantActions(aiBubble.parentElement, getGeneratedMediaCopyText(imageUrl, historyContent), {
                messageIndex: conversationHistory.length - 1,
                canFork: true
            });
            return true;
        }

        updateImageGenerationToolActivity(imageActivity, "Writing prompt");
        const editPrompt = await buildImageEditPrompt(requestText, imageFiles, signal);
        const imageUrl = buildImageGenerationUrl(editPrompt);

        updateImageGenerationToolActivity(imageActivity, "Rendering edit");
        await preloadImage(imageUrl, signal);
        updateImageGenerationToolActivity(imageActivity, "Ready", "done");
        renderGeneratedImage(aiBubble, editPrompt, imageUrl, "Generated edit", isSensitiveImagePrompt(`${requestText} ${editPrompt}`));
        const historyContent = getGeneratedImageHistoryContent("Generated image edit", editPrompt);

        conversationHistory.push({
            role: "user",
            content: `[Image edit request] ${requestText}`,
            createdAt: options.userCreatedAt || new Date().toISOString()
        });
        conversationHistory.push({
            role: "assistant",
            content: historyContent,
            createdAt: new Date().toISOString()
        });
        setupAssistantActions(aiBubble.parentElement, getGeneratedMediaCopyText(imageUrl, historyContent), {
            messageIndex: conversationHistory.length - 1,
            canFork: true
        });
        return true;
    } catch (e) {
        updateImageGenerationToolActivity(imageActivity, e.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(aiBubble, e, {
            title: e.name === "AbortError" ? "Image edit stopped" : "Image edit failed",
            message: getImageEditFailureMessage(e),
            retryLabel: "Retry edit",
            onRetry: () => retryImageEditInBubble(aiBubble, requestText, imageFiles)
        });
        return false;
    }
}

async function processImageEdit(requestText, currentFiles, signal = null, options = {}) {
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
        await processImageGeneration(requestText, currentFiles, signal, options);
        return;
    }

    const aiBubble = addRenderNode("__thinking__", "output");
    await renderImageEditAttempt(aiBubble, requestText, imageFiles, signal, options);
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

    addSessionTokens(getProviderTokenUsage(data), {
        model: IMAGE_EDIT_MODEL,
        provider: getCurrentProviderLabel()
    });

    return prompt.replace(/^["']|["']$/g, "");
}

async function processVideoGeneration(prompt, currentFiles, signal = null, options = {}) {
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

    conversationHistory.push({
        role: "user",
        content: `[Video prompt, 10 seconds] ${prompt}`,
        createdAt: options.userCreatedAt || new Date().toISOString()
    });

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
            content: `Generated Wan video clip for: ${prompt}\n\n${videoResult.url}`,
            createdAt: new Date().toISOString()
        });
        setupAssistantActions(aiBubble.parentElement, videoResult.url, {
            messageIndex: conversationHistory.length - 1,
            canFork: true
        });
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
                content: `Wan was unavailable, so Fauna generated a fallback 10 second animated clip for: ${prompt}\n\n${videoResult.url}`,
                createdAt: new Date().toISOString()
            });
            setupAssistantActions(aiBubble.parentElement, videoResult.url, {
                messageIndex: conversationHistory.length - 1,
                canFork: true
            });
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

function getOpenAiImageUrlFromData(data, format = "png") {
    const first = data?.data?.[0];
    const safeFormat = normalizeImageFormat(format) || "png";
    if (first?.b64_json) return `data:image/${safeFormat};base64,${first.b64_json}`;
    if (first?.url) return first.url;
    throw new Error("OpenAI did not return an image.");
}

async function generateOpenAiImage(prompt, signal = null, options = {}) {
    const imageOptions = normalizeImageGenerationOptions(options);
    const payload = {
        model: getOpenAiImageModel(),
        prompt,
        size: imageOptions.openAiSize || "1024x1024",
        n: 1
    };
    if (imageOptions.quality) payload.quality = imageOptions.quality;
    if (imageOptions.background) payload.background = imageOptions.background;
    if (imageOptions.format) payload.output_format = imageOptions.format;

    const data = await openAiJsonFetch("/images/generations", payload, { signal });
    return getOpenAiImageUrlFromData(data, imageOptions.format);
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

function buildImageGenerationUrl(prompt, options = {}) {
    const imageOptions = normalizeImageGenerationOptions(options);
    const seed = Math.floor(Math.random() * 1000000000);
    const params = new URLSearchParams({
        width: String(imageOptions.width || 1024),
        height: String(imageOptions.height || 1024),
        model: /^[a-z0-9_.:-]{2,32}$/i.test(imageOptions.model) ? imageOptions.model : "flux",
        nologo: "true",
        private: "true",
        seed: String(seed)
    });

    return `${IMAGE_GEN_BASE_URL}${encodeURIComponent(prompt)}?${params.toString()}`;
}

function getWanWorkflowTemplate() {
    const workflow = window.FAUNA_WAN_WORKFLOW || safeLocalStorageGet(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
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
    markGenerationConnectionEstablished();

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
        markGenerationConnectionEstablished();
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
    markGenerationConnectionEstablished();
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
    markGenerationConnectionEstablished();
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

function getGeneratedImageSourceLabel(imageUrl) {
    const value = String(imageUrl || "").trim();
    if (!value) return "Generated image";
    if (/^data:image\//i.test(value)) return "Inline image data";
    if (/^blob:/i.test(value)) return "Browser image URL";

    try {
        const url = new URL(value, window.location.href);
        return url.hostname.replace(/^www\./i, "") || "Generated image";
    } catch {
        return "Generated image";
    }
}

function getImageRatioLabel(width, height) {
    if (!width || !height) return "Unknown";
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const divisor = gcd(width, height);
    const ratioWidth = Math.round(width / divisor);
    const ratioHeight = Math.round(height / divisor);
    if (ratioWidth <= 32 && ratioHeight <= 32) return `${ratioWidth}:${ratioHeight}`;
    return `${(width / height).toFixed(2)}:1`;
}

function appendGeneratedImageInfoRow(list, label, value, className = "") {
    const term = document.createElement("dt");
    term.textContent = label;

    const detail = document.createElement("dd");
    detail.textContent = value || "Unknown";
    if (className) detail.className = className;

    list.appendChild(term);
    list.appendChild(detail);
    return detail;
}

function setGeneratedImageInfoOpen(imageWrap, button, isOpen) {
    imageWrap.classList.toggle("generated-image-info-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
}

function createGeneratedImageInfo(prompt, imageUrl, label, isSensitive, img) {
    const info = document.createElement("div");
    info.className = "generated-image-info";

    const panelId = `generated-image-info-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const button = document.createElement("button");
    button.className = "generated-image-info-button";
    button.type = "button";
    button.dataset.generatedImageInfoToggle = "true";
    button.setAttribute("aria-label", "Show image details");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", panelId);
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path></svg>`;

    const panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "generated-image-info-panel";
    panel.setAttribute("role", "tooltip");

    const title = document.createElement("div");
    title.className = "generated-image-info-title";
    title.textContent = "Image details";

    const details = document.createElement("dl");
    details.className = "generated-image-info-list";
    appendGeneratedImageInfoRow(details, "Type", label || "Generated image");
    appendGeneratedImageInfoRow(details, "Prompt", prompt, "generated-image-info-prompt");
    appendGeneratedImageInfoRow(details, "Source", getGeneratedImageSourceLabel(imageUrl));
    const sizeValue = appendGeneratedImageInfoRow(details, "Size", "Loading");
    const ratioValue = appendGeneratedImageInfoRow(details, "Aspect", "Loading");
    appendGeneratedImageInfoRow(details, "Safety", isSensitive ? "Potential 18+ image" : "Standard");

    const updateImageInfoSize = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
            sizeValue.textContent = "Unknown";
            ratioValue.textContent = "Unknown";
            return;
        }
        sizeValue.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
        ratioValue.textContent = getImageRatioLabel(img.naturalWidth, img.naturalHeight);
    };

    if (img.complete) {
        window.requestAnimationFrame(updateImageInfoSize);
    } else {
        img.addEventListener("load", updateImageInfoSize, { once: true });
        img.addEventListener("error", () => {
            sizeValue.textContent = "Unavailable";
            ratioValue.textContent = "Unavailable";
        }, { once: true });
    }

    panel.appendChild(title);
    panel.appendChild(details);
    info.appendChild(button);
    info.appendChild(panel);
    return info;
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
    caption.className = "generated-image-caption visually-hidden";
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
    imageWrap.appendChild(createGeneratedImageInfo(prompt, imageUrl, label, isSensitive, img));
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

function getThinkingBubbleMarkup() {
    return `
            <div class="skeleton-block" role="status" aria-label="Fauna is thinking">
                <div class="skeleton-header">
                    ${renderPixelLoader("thinking", "Fauna is thinking")}
                    <span class="thinking-label">
                        Thinking
                        <span class="thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>
                    </span>
                </div>
            </div>`;
}

function addRenderNode(text, type, fileArray = [], options = {}) {
    const node = document.createElement("div");
    node.className = `message-node ${type}-node`;
    if (Number.isInteger(options.historyIndex) && options.historyIndex >= 0) {
        node.dataset.historyIndex = String(options.historyIndex);
    }
    if (options.createdAt) {
        node.dataset.createdAt = String(options.createdAt);
    }
    const isImageOnlyUserUpload = type === "user"
        && !String(text || "").trim()
        && fileArray.length > 0
        && fileArray.every(file => file?.type?.startsWith("image/"));

    const avatar = document.createElement("div");
    avatar.className = "avatar-wrapper";
    if (type === "user") {
        avatar.textContent = "U";
    } else {
        avatar.innerHTML = `<svg class="fauna-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.09 6.26L20.82 9.18l-5.09 3.7L17.82 20 12 16.27 6.18 20l1.09-7.12-5.09-3.7 6.73-.92L12 2z"/></svg>`;
        avatar.setAttribute("aria-label", "Fauna");
    }
    node.appendChild(avatar);

    const block = document.createElement("div");
    block.className = "bubble-block";

    const bubble = document.createElement("div");
    bubble.className = "bubble markdown";
    if (text === "__thinking__") {
        bubble.innerHTML = getThinkingBubbleMarkup();
    } else {
        if (type === "output") {
            bubble.classList.add("plain-output");
        }
        bubble.textContent = text;
    }

    let attachContainer = null;
    if (fileArray.length > 0) {
        attachContainer = document.createElement("div");
        attachContainer.className = "bubble-attachments";
        fileArray.forEach(file => {
            if (file.type.startsWith("image/")) {
                const imageAttachment = document.createElement("div");
                imageAttachment.className = "bubble-image-attachment";

                const img = document.createElement("img");
                img.className = "bubble-img";
                img.alt = file.name || "Image attachment";
                img.src = file.__faunaPersistentPreviewSrc || file.__faunaLibrarySourceSrc || URL.createObjectURL(file);
                if (file.__faunaLibrarySourceKey) {
                    img.dataset.faunaLibraryAttachment = "true";
                    img.dataset.faunaLibrarySourceKey = file.__faunaLibrarySourceKey;
                    if (file.__faunaLibrarySourceId) {
                        img.dataset.faunaLibrarySourceId = file.__faunaLibrarySourceId;
                    }
                }

                const imageName = document.createElement("span");
                imageName.className = "bubble-image-name";
                imageName.textContent = file.name || "Image";

                imageAttachment.append(img, imageName);
                attachContainer.appendChild(imageAttachment);
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

    if (!isImageOnlyUserUpload) {
        block.appendChild(bubble);
    }

    if (type === "user" && text) {
        setupUserPromptActions(block, text, {
            sentAt: options.createdAt
        });
    } else if (type === "output" && text !== "__thinking__") {
        setupCopyFeature(block, text, {
            completedAt: options.createdAt
        });
    }

    node.appendChild(block);
    if (options.beforeNode instanceof Node && options.beforeNode.parentElement === chat) {
        chat.insertBefore(node, options.beforeNode);
    } else {
        chat.appendChild(node);
    }
    scrollChatToBottom({ force: options.forceScroll === true });
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

function getFileReferenceCopyText(button) {
    const path = button?.dataset?.fileReferencePath || "";
    const line = button?.dataset?.fileReferenceLine || "";
    const endLine = button?.dataset?.fileReferenceEndLine || "";
    if (!path) return "";
    if (line && endLine && endLine !== line) return `${path}:${line}-${endLine}`;
    return line ? `${path}:${line}` : path;
}

document.addEventListener("click", event => {
    const fileReference = event.target.closest(".file-reference");
    if (!fileReference) return;
    event.preventDefault();
    const copyText = getFileReferenceCopyText(fileReference);
    if (copyText) handleCopyButton(fileReference, copyText);
});

document.addEventListener("error", event => {
    const favicon = event.target?.classList?.contains("website-reference-favicon") ? event.target : null;
    if (!favicon) return;
    favicon.hidden = true;
    const fallback = favicon.closest(".website-reference-icon")?.querySelector(".website-reference-fallback");
    if (fallback) fallback.hidden = false;
}, true);

function getAssistantTtsIcon(type = "play") {
    const icons = {
        play: '<polygon points="9 7 17 12 9 17 9 7"></polygon>',
        stop: '<rect x="8" y="8" width="8" height="8" rx="1.5"></rect>',
        close: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
    };
    return `<svg viewBox="0 0 24 24" fill="${type === "play" || type === "stop" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[type] || icons.play}</svg>`;
}

function getAssistantTtsWaveformMarkup() {
    return Array.from({ length: ASSISTANT_TTS_WAVEFORM_BARS }, (_, index) => {
        const level = (index * 7) % 11;
        const fallbackLevel = (0.34 + (level / 10) * 0.48).toFixed(3);
        return `<span style="--bar-index:${index};--bar-level:${fallbackLevel}"></span>`;
    }).join("");
}

function getAssistantTtsPlayer(block) {
    return block?.querySelector(".assistant-tts-player") || null;
}

function upgradeAssistantTtsPlayer(player) {
    if (!player) return null;
    const waveform = player.querySelector(".assistant-tts-waveform");
    if (waveform) {
        waveform.dataset.assistantTtsSeek = "";
        waveform.setAttribute("role", "slider");
        waveform.setAttribute("tabindex", "0");
        waveform.setAttribute("aria-label", "Seek voice response");
        waveform.setAttribute("aria-valuemin", "0");
        waveform.setAttribute("aria-valuemax", "100");
        if (!waveform.hasAttribute("aria-valuenow")) {
            waveform.setAttribute("aria-valuenow", "0");
        }
    }

    const legacySpeaker = player.querySelector(".assistant-tts-speaker");
    if (legacySpeaker) {
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "assistant-tts-close";
        closeButton.dataset.assistantTtsClose = "";
        closeButton.dataset.tooltip = "Close voice response";
        closeButton.setAttribute("aria-label", "Close voice response");
        closeButton.innerHTML = getAssistantTtsIcon("close");
        legacySpeaker.replaceWith(closeButton);
    }
    return player;
}

function ensureAssistantTtsPlayer(speakBtn, spokenText) {
    const block = speakBtn?.closest(".bubble-block");
    if (!block) return null;

    let player = getAssistantTtsPlayer(block);
    if (!player) {
        player = document.createElement("div");
        player.className = "assistant-tts-player";
        player.innerHTML = `
            <button type="button" class="assistant-tts-toggle" data-assistant-tts-toggle aria-label="Play voice response" data-tooltip="Play voice response">
                <span class="assistant-tts-icon assistant-tts-play">${getAssistantTtsIcon("play")}</span>
                <span class="assistant-tts-icon assistant-tts-stop">${getAssistantTtsIcon("stop")}</span>
                <span class="assistant-tts-loader" aria-hidden="true"></span>
            </button>
            <div class="assistant-tts-waveform" data-assistant-tts-seek role="slider" tabindex="0" aria-label="Seek voice response" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${getAssistantTtsWaveformMarkup()}</div>
            <span class="assistant-tts-time">0:00</span>
            <button type="button" class="assistant-tts-close" data-assistant-tts-close aria-label="Close voice response" data-tooltip="Close voice response">
                ${getAssistantTtsIcon("close")}
            </button>
        `;
        block.appendChild(player);
    }

    upgradeAssistantTtsPlayer(player);
    player.dataset.speakText = spokenText;
    return player;
}

function estimateSpeechDurationSeconds(text) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(2, Math.round((words / 155) * 60));
}

function formatAssistantTtsTime(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = String(safeSeconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
}

function updateAssistantTtsProgress(player, progress = 0, seconds = 0) {
    if (!player) return;
    const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
    player.style.setProperty("--tts-progress", String(safeProgress));
    const timeLabel = player.querySelector(".assistant-tts-time");
    if (timeLabel) timeLabel.textContent = formatAssistantTtsTime(seconds);
    const waveform = player.querySelector(".assistant-tts-waveform");
    waveform?.setAttribute("aria-valuenow", String(Math.round(safeProgress * 100)));
    const bars = Array.from(player.querySelectorAll(".assistant-tts-waveform span"));
    const progressPosition = safeProgress * bars.length;
    bars.forEach((bar, index) => {
        const barProgress = Math.max(0, Math.min(1, progressPosition - index));
        bar.style.setProperty("--bar-progress", barProgress.toFixed(3));
        bar.classList.toggle("active", barProgress > 0.001);
    });
}

function setAssistantTtsWaveform(player, waveform = []) {
    if (!player) return;
    const bars = Array.from(player.querySelectorAll(".assistant-tts-waveform span"));
    if (!bars.length) return;
    const levels = Array.isArray(waveform) && waveform.length ? waveform : [];
    bars.forEach((bar, index) => {
        const rawLevel = Number(levels[index]);
        const fallbackLevel = 0.38 + (((index * 7) % 11) / 10) * 0.44;
        const level = Number.isFinite(rawLevel) ? rawLevel : fallbackLevel;
        bar.style.setProperty("--bar-level", Math.max(0.08, Math.min(1, level)).toFixed(3));
    });
}

function normalizeAssistantTtsWaveform(waveform) {
    if (!Array.isArray(waveform) || waveform.length === 0) return [];
    return waveform
        .slice(0, ASSISTANT_TTS_WAVEFORM_BARS)
        .map(level => Math.max(0.08, Math.min(1, Number(level) || 0)));
}

async function getAudioWaveformFromBlob(audioBlob, barCount = ASSISTANT_TTS_WAVEFORM_BARS) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor || !audioBlob) return [];

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContextConstructor();
    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const channelCount = Math.max(1, audioBuffer.numberOfChannels || 1);
        const sampleCount = audioBuffer.length;
        const bucketSize = Math.max(1, Math.floor(sampleCount / barCount));
        const rmsLevels = [];

        for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
            const start = barIndex * bucketSize;
            const end = barIndex === barCount - 1 ? sampleCount : Math.min(sampleCount, start + bucketSize);
            let sumSquares = 0;
            let countedSamples = 0;

            for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
                const channel = audioBuffer.getChannelData(channelIndex);
                for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
                    const sample = channel[sampleIndex] || 0;
                    sumSquares += sample * sample;
                    countedSamples += 1;
                }
            }

            rmsLevels.push(countedSamples ? Math.sqrt(sumSquares / countedSamples) : 0);
        }

        const maxLevel = Math.max(...rmsLevels, 0.0001);
        return rmsLevels.map(level => {
            const normalized = Math.pow(level / maxLevel, 0.72);
            return Math.max(0.12, Math.min(1, normalized));
        });
    } finally {
        audioContext.close?.().catch(() => {});
    }
}

async function getAudioWaveformFromSource(audioSource) {
    if (!audioSource) return [];
    const res = await fetch(audioSource);
    const audioBlob = await res.blob();
    return getAudioWaveformFromBlob(audioBlob);
}

function setAssistantTtsPlayerState(player, state = "idle", detail = {}) {
    if (!player) return;
    player.classList.toggle("is-loading", state === "loading");
    player.classList.toggle("is-playing", state === "playing");
    player.classList.toggle("is-cached", Boolean(detail.cached));
    player.classList.toggle("is-browser-voice", Boolean(detail.browserVoice));
    player.dataset.state = state;

    const toggle = player.querySelector("[data-assistant-tts-toggle]");
    if (toggle) {
        const active = state === "loading" || state === "playing";
        const label = state === "loading"
            ? "Loading voice response"
            : state === "playing"
                ? "Stop voice response"
                : "Play voice response";
        toggle.setAttribute("aria-label", label);
        toggle.setAttribute("aria-pressed", String(active));
        toggle.dataset.tooltip = label;
    }

    if (state === "idle") {
        updateAssistantTtsProgress(player, 0, detail.duration || 0);
    }
}

function setAssistantSpeakButtonState(button, state = "idle") {
    if (!button) return;
    const active = state === "loading" || state === "playing";
    button.classList.toggle("loading", state === "loading");
    button.classList.toggle("speaking", state === "playing");
    button.setAttribute("aria-pressed", String(active));
    button.dataset.tooltip = state === "loading"
        ? "Loading voice response"
        : state === "playing"
            ? "Stop reading aloud"
            : "Read response aloud";
}

function clearAssistantTtsTimer(playback = activeAssistantTtsPlayback) {
    if (!playback?.timer) return;
    window.cancelAnimationFrame(playback.timer);
    playback.timer = null;
}

function stopAssistantTtsPlayback({ resetUi = true } = {}) {
    const playback = activeAssistantTtsPlayback;
    if (!playback) return;

    clearAssistantTtsTimer(playback);
    playback.controller?.abort();
    if (activeSpeechController === playback.controller) activeSpeechController = null;
    if (activeSpeechAudio) {
        activeSpeechAudio.pause();
        activeSpeechAudio = null;
    }
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    if (resetUi) {
        setAssistantSpeakButtonState(playback.button, "idle");
        setAssistantTtsPlayerState(playback.player, "idle", {
            duration: playback.duration || estimateSpeechDurationSeconds(playback.text)
        });
    }
    activeAssistantTtsPlayback = null;
    isSpeechPlaybackActive = false;
}

function handleAssistantTtsPlayerToggle(toggle) {
    const player = toggle?.closest(".assistant-tts-player");
    if (!player) return;

    if (player.classList.contains("is-loading") || player.classList.contains("is-playing")) {
        stopAssistantTtsPlayback();
        return;
    }

    const block = player.closest(".bubble-block");
    const speakBtn = block?.querySelector(".assistant-action-speak");
    const text = player.dataset.speakText || speakBtn?.dataset.speakText || speakBtn?.dataset.copyText || "";
    if (speakBtn) handleSpeakButton(speakBtn, text);
}

function getAssistantTtsSeekRatio(event, seekTarget) {
    const rect = seekTarget?.getBoundingClientRect?.();
    if (!rect?.width) return 0;
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
}

function seekAssistantTtsPlayer(player, ratio) {
    if (!player) return;
    const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    const playback = activeAssistantTtsPlayback?.player === player ? activeAssistantTtsPlayback : null;
    const audio = playback?.audio || null;
    const duration = Number.isFinite(audio?.duration) && audio.duration > 0 ? audio.duration : 0;

    if (!audio || !duration) {
        player.dataset.pendingSeekRatio = safeRatio.toFixed(4);
        updateAssistantTtsProgress(player, safeRatio, safeRatio * (playback?.duration || estimateSpeechDurationSeconds(player.dataset.speakText || "")));
        return;
    }

    audio.currentTime = safeRatio * duration;
    updateAssistantTtsProgress(player, safeRatio, audio.currentTime);
}

function handleAssistantTtsSeek(event, seekTarget) {
    const player = seekTarget?.closest(".assistant-tts-player");
    if (!player) return;
    seekAssistantTtsPlayer(player, getAssistantTtsSeekRatio(event, seekTarget));
}

function handleAssistantTtsSeekKey(event) {
    const seekTarget = event.target?.closest?.("[data-assistant-tts-seek]");
    if (!seekTarget) return;
    const player = seekTarget.closest(".assistant-tts-player");
    const playback = activeAssistantTtsPlayback?.player === player ? activeAssistantTtsPlayback : null;
    const audio = playback?.audio || null;
    const duration = Number.isFinite(audio?.duration) && audio.duration > 0 ? audio.duration : 0;
    const currentRatio = duration
        ? audio.currentTime / duration
        : Number(player?.style.getPropertyValue("--tts-progress")) || 0;
    const step = event.shiftKey ? 0.1 : 0.04;
    let nextRatio = null;

    if (event.key === "ArrowLeft") nextRatio = currentRatio - step;
    if (event.key === "ArrowRight") nextRatio = currentRatio + step;
    if (event.key === "Home") nextRatio = 0;
    if (event.key === "End") nextRatio = 1;
    if (nextRatio === null) return;

    event.preventDefault();
    seekAssistantTtsPlayer(player, nextRatio);
}

function closeAssistantTtsPlayer(closeButton) {
    const player = closeButton?.closest(".assistant-tts-player");
    if (!player) return;
    const speakBtn = player.closest(".bubble-block")?.querySelector(".assistant-action-speak");

    if (activeAssistantTtsPlayback?.player === player) {
        stopAssistantTtsPlayback({ resetUi: false });
    }

    if (speakBtn) setAssistantSpeakButtonState(speakBtn, "idle");
    player.remove();
}

function bindAssistantTtsAudioProgress(player, audio, playback) {
    if (!player || !audio || !playback) return () => {};
    let progressFrame = null;

    const update = () => {
        const duration = Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : playback.duration || estimateSpeechDurationSeconds(playback.text);
        playback.duration = duration;
        const pendingSeekRatio = Number(player.dataset.pendingSeekRatio);
        if (duration > 0 && Number.isFinite(pendingSeekRatio)) {
            audio.currentTime = Math.max(0, Math.min(1, pendingSeekRatio)) * duration;
            delete player.dataset.pendingSeekRatio;
        }
        const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        updateAssistantTtsProgress(player, duration ? current / duration : 0, current);
    };
    const stopSmoothProgress = () => {
        if (!progressFrame) return;
        window.cancelAnimationFrame(progressFrame);
        progressFrame = null;
    };
    const updateSmoothProgress = () => {
        update();
        if (!audio.paused && !audio.ended) {
            progressFrame = window.requestAnimationFrame(updateSmoothProgress);
        } else {
            progressFrame = null;
        }
    };
    const startSmoothProgress = () => {
        stopSmoothProgress();
        progressFrame = window.requestAnimationFrame(updateSmoothProgress);
    };

    audio.addEventListener("loadedmetadata", update);
    audio.addEventListener("durationchange", update);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("play", startSmoothProgress);
    audio.addEventListener("pause", stopSmoothProgress);
    audio.addEventListener("ended", stopSmoothProgress);
    return () => {
        stopSmoothProgress();
        audio.removeEventListener("loadedmetadata", update);
        audio.removeEventListener("durationchange", update);
        audio.removeEventListener("timeupdate", update);
        audio.removeEventListener("play", startSmoothProgress);
        audio.removeEventListener("pause", stopSmoothProgress);
        audio.removeEventListener("ended", stopSmoothProgress);
    };
}

function startAssistantTtsEstimatedProgress(player, playback) {
    const duration = estimateSpeechDurationSeconds(playback.text);
    playback.duration = duration;
    playback.startedAt = Date.now();
    updateAssistantTtsProgress(player, 0, 0);
    const update = () => {
        const elapsed = (Date.now() - playback.startedAt) / 1000;
        updateAssistantTtsProgress(player, duration ? elapsed / duration : 0, elapsed);
        playback.timer = elapsed < duration
            ? window.requestAnimationFrame(update)
            : null;
    };
    playback.timer = window.requestAnimationFrame(update);
}

async function playAssistantTtsSpeech(spokenText, { signal = null, player = null, playback = null } = {}) {
    isSpeechPlaybackActive = true;

    if (isOpenAiProvider() && getOpenAiApiKey()) {
        try {
            await playCachedOpenAiSpeechAudio(spokenText, { signal, player, playback });
            return;
        } catch (err) {
            if (err.name === "AbortError") throw err;
            console.warn("OpenAI speech failed, falling back to browser speech:", err);
            showToast(`OpenAI speech failed, using browser voice: ${err.message}`, "warning");
        }
    }

    setAssistantSpeakButtonState(playback?.button, "playing");
    setAssistantTtsPlayerState(player, "playing", { browserVoice: true });
    startAssistantTtsEstimatedProgress(player, playback);
    await speakReplyWithBrowserVoice(spokenText, signal);
}

async function handleSpeakButton(speakBtn, rawTextToSpeak) {
    const spokenText = sanitizeSpeechText(rawTextToSpeak);
    if (!spokenText) {
        showToast("There is no readable text in that response.", "warning");
        return;
    }
    if (isOpenAiVoiceSessionActive) {
        showToast("Stop Realtime voice chat before reading a message aloud.", "warning");
        return;
    }

    if (activeAssistantTtsPlayback?.button === speakBtn) {
        stopAssistantTtsPlayback();
        return;
    }

    stopAssistantTtsPlayback();
    activeRealtimeSpeechReply?.cancel();
    activeSpeechController?.abort();
    activeSpeechAudio?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    const player = ensureAssistantTtsPlayer(speakBtn, spokenText);
    const controller = new AbortController();
    const playback = {
        button: speakBtn,
        player,
        controller,
        text: spokenText,
        timer: null,
        audio: null,
        duration: estimateSpeechDurationSeconds(spokenText)
    };
    activeAssistantTtsPlayback = playback;
    activeSpeechController = controller;

    setAssistantSpeakButtonState(speakBtn, "loading");
    setAssistantTtsPlayerState(player, "loading");
    updateAssistantTtsProgress(player, 0, 0);

    try {
        await playAssistantTtsSpeech(spokenText, {
            signal: controller.signal,
            player,
            playback
        });
    } catch (err) {
        if (err.name !== "AbortError") {
            showToast(`Read aloud failed: ${err.message}`, "error");
        }
    } finally {
        clearAssistantTtsTimer(playback);
        if (activeSpeechController === controller) activeSpeechController = null;
        if (activeAssistantTtsPlayback === playback) {
            setAssistantSpeakButtonState(speakBtn, "idle");
            setAssistantTtsPlayerState(player, "idle", { duration: playback.duration });
            activeAssistantTtsPlayback = null;
            isSpeechPlaybackActive = false;
        }
    }
}

function normalizeHistoryIndex(value) {
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 ? index : null;
}

function getAssistantActionIcon(action) {
    const icons = {
        copy: '<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
        speak: '<path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path>',
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
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
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

function appendMessageActionTime(actions, value, label) {
    if (!actions) return null;
    actions.querySelector(".message-action-time")?.remove();
    const time = createMessageActionTime(value, label);
    if (time) actions.appendChild(time);
    return time;
}

function prependMessageActionTime(actions, value, label) {
    if (!actions) return null;
    actions.querySelector(".message-action-time")?.remove();
    const time = createMessageActionTime(value, label);
    if (time) actions.insertBefore(time, actions.firstChild);
    return time;
}

function setupAssistantActions(parentBubbleBlock, rawTextToCopy, {
    messageIndex = null,
    canRegenerate = false,
    canFork = false,
    canSpeak = false,
    speakText = rawTextToCopy,
    completedAt = null
} = {}) {
    if (!parentBubbleBlock) return;
    parentBubbleBlock.querySelector(".copy-action-btn")?.remove();
    parentBubbleBlock.querySelector(".assistant-message-actions")?.remove();

    const historyIndex = normalizeHistoryIndex(messageIndex);
    const historyMessage = historyIndex !== null ? conversationHistory[historyIndex] : null;
    const timestamp = completedAt || historyMessage?.createdAt || null;
    const messageNode = parentBubbleBlock.closest(".message-node.output-node");
    if (messageNode && historyIndex !== null) {
        messageNode.dataset.historyIndex = String(historyIndex);
    }
    if (messageNode && timestamp) {
        messageNode.dataset.createdAt = String(timestamp);
    }

    const actions = document.createElement("div");
    actions.className = "assistant-message-actions";
    if (historyIndex !== null) {
        actions.dataset.messageIndex = String(historyIndex);
    }

    const copyButton = createAssistantActionButton("copy", "Copy", "Copy response");
    copyButton.dataset.copyText = rawTextToCopy || "";
    actions.appendChild(copyButton);

    if (canSpeak && sanitizeSpeechText(speakText).length > 0) {
        const speakButton = createAssistantActionButton("speak", "Read aloud", "Read response aloud");
        speakButton.dataset.speakText = speakText || "";
        actions.appendChild(speakButton);
    }

    if (historyIndex !== null && canRegenerate) {
        actions.appendChild(createAssistantActionButton("regenerate", "Regenerate", "Regenerate response"));
    }

    if (historyIndex !== null && canFork) {
        actions.appendChild(createAssistantActionButton("fork", "Fork", "Fork chat here"));
    }

    const completedTime = createMessageActionTime(timestamp, "Response completed at");
    if (completedTime) actions.appendChild(completedTime);

    parentBubbleBlock.appendChild(actions);
}

function setupCopyFeature(parentBubbleBlock, rawTextToCopy, {
    completedAt = null
} = {}) {
    setupAssistantActions(parentBubbleBlock, rawTextToCopy, {
        canRegenerate: false,
        canFork: false,
        completedAt
    });
}

function setupUserPromptActions(parentBubbleBlock, rawTextToCopy, {
    sentAt = null
} = {}) {
    if (!parentBubbleBlock) return;
    parentBubbleBlock.querySelector(".user-message-actions")?.remove();

    const messageNode = parentBubbleBlock.closest(".message-node.user-node");
    if (messageNode && sentAt) {
        messageNode.dataset.createdAt = String(sentAt);
    }

    const actions = document.createElement("div");
    actions.className = "assistant-message-actions user-message-actions";

    const sentTime = createMessageActionTime(sentAt, "Prompt sent at");
    if (sentTime) actions.appendChild(sentTime);

    const copyButton = createAssistantActionButton("copy", "Copy prompt", "Copy prompt");
    copyButton.dataset.copyText = rawTextToCopy || "";
    actions.appendChild(copyButton);

    parentBubbleBlock.appendChild(actions);
}

function getAssistantActionContext(control) {
    const actionRow = control?.closest(".assistant-message-actions");
    const messageNode = control?.closest(".message-node.output-node");
    const messageIndex = normalizeHistoryIndex(actionRow?.dataset.messageIndex || messageNode?.dataset.historyIndex);
    const block = messageNode?.querySelector(".bubble-block") || null;
    const bubble = block?.querySelector(".bubble") || null;
    const message = messageIndex !== null ? conversationHistory[messageIndex] : null;

    if (!actionRow || !messageNode || !block || !bubble || !message || message.role !== "assistant") {
        return null;
    }

    return { actionRow, messageNode, block, bubble, messageIndex, message };
}

function removeRenderedNodesAfter(messageNode) {
    if (!messageNode) return;
    let next = messageNode.nextSibling;
    while (next) {
        const current = next;
        next = next.nextSibling;
        current.remove();
    }
}

function renderThinkingBubble(bubble) {
    if (!bubble) return;
    bubble.className = "bubble markdown";
    bubble.setAttribute("aria-busy", "true");
    bubble.innerHTML = getThinkingBubbleMarkup();
}

function getRegenerationModel(history) {
    if (isOpenAiProvider()) return OLLAMA_MODEL;
    const lastUserMessage = [...history].reverse().find(message => message.role === "user" && message.content);
    return chooseModelForRequest(lastUserMessage?.content || "", [], null, null);
}

async function regenerateAssistantFromAction(control) {
    if (isGenerating) return;

    const context = getAssistantActionContext(control);
    if (!context) {
        showToast("Could not find that response in the current chat.", "error");
        return;
    }

    const historyBeforeResponse = cloneConversationHistory(conversationHistory.slice(0, context.messageIndex));
    if (!historyBeforeResponse.some(message => message.role === "user")) {
        showToast("There is no prompt to regenerate from.", "warning");
        return;
    }

    clearClarifyingQuestionComposer();
    activeRequestController = new AbortController();
    const generationSignal = activeRequestController.signal;
    setGeneratingBusy(true);

    removeRenderedNodesAfter(context.messageNode);
    context.block.querySelector(".assistant-message-actions")?.remove();
    context.block.querySelector(".web-sources")?.remove();
    renderThinkingBubble(context.bubble);
    conversationHistory = historyBeforeResponse;
    scrollChatToBottom();

    try {
        const regenerationModel = getRegenerationModel(conversationHistory);
        const data = await sendOllamaChatWithLocalTools(
            conversationHistory,
            getActiveChatRequestOptions(),
            regenerationModel,
            generationSignal,
            context.bubble,
            { enabled: true }
        );
        const tokenUsage = getProviderTokenUsage(data);
        const assistantMessage = getAssistantMessageForConversation(data, regenerationModel);
        attachTokenUsage(assistantMessage, tokenUsage);
        conversationHistory.push(assistantMessage);
        const assistantIndex = conversationHistory.length - 1;

        addSessionTokens(tokenUsage, { message: assistantMessage });
        await renderAssistantResponse(data, context.bubble, [], generationSignal, false, {
            messageIndex: assistantIndex,
            alreadyRendered: data.__faunaAlreadyRendered === true,
            preserveRenderedContent: data.__faunaPreserveRenderedContent === true
        });
        showToast("Response regenerated.", "success");
    } catch (err) {
        renderErrorCard(context.bubble, err);
    } finally {
        activeRequestController = null;
        setGeneratingBusy(false);
        updateTokenDisplay();
        saveCurrentSession();
    }
}

function cloneChatNodesThrough(messageNode) {
    const clones = [];
    if (!chat || !messageNode) return clones;

    for (const child of Array.from(chat.children)) {
        clones.push(child.cloneNode(true));
        if (child === messageNode) break;
    }

    return clones;
}

function getHtmlForClonedNodes(nodes) {
    const host = document.createElement("div");
    nodes.forEach(node => host.appendChild(node.cloneNode(true)));
    return host.innerHTML;
}

function getForkTitle(history) {
    const firstUserMessage = history.find(message => message.role === "user" && message.content);
    const baseTitle = cleanSessionTitle(firstUserMessage?.content || "Forked chat", 54);
    return cleanSessionTitle(`Fork: ${baseTitle}`, 64);
}

function forkChatFromAssistantAction(control) {
    const context = getAssistantActionContext(control);
    if (!context) {
        showToast("Could not find that response in the current chat.", "error");
        return;
    }

    const forkHistory = cloneConversationHistory(conversationHistory.slice(0, context.messageIndex + 1));
    const forkNodes = cloneChatNodesThrough(context.messageNode);
    if (forkHistory.length === 0 || forkNodes.length === 0) {
        showToast("There is nothing to fork yet.", "warning");
        return;
    }

    if (activeSessionId) {
        saveCurrentSession({ render: false, updateUrl: false });
    }

    const forkSession = createChatSession({
        title: getForkTitle(forkHistory),
        manualTitle: true,
        chatHtml: sanitizeChatHtmlMediaSources(getHtmlForClonedNodes(forkNodes)),
        domNodes: forkNodes,
        conversationHistory: forkHistory,
        sessionTotalTokens: sumHistoryTokenUsage(forkHistory),
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER
    });

    chatSessions.unshift(forkSession);
    activeSessionId = forkSession.id;
    restoreChatSessionToView(forkSession);
    persistChatSessions();
    renderChatHistory();
    sidebarController.close();
    updateWorkspaceUrlFragment();
    showToast("Forked chat from this response.", "success");
}

function getSourceHost(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function setWebSourcesCollapsed(panel, collapsed) {
    if (!panel) return;
    const isCollapsed = Boolean(collapsed);
    const sourceList = panel.querySelector(".web-sources-list");
    const toggle = panel.querySelector(".web-sources-toggle");
    panel.classList.toggle("collapsed", isCollapsed);
    if (sourceList) sourceList.hidden = isCollapsed;
    if (toggle) {
        toggle.setAttribute("aria-expanded", String(!isCollapsed));
        toggle.setAttribute("aria-label", isCollapsed ? "Expand sources" : "Collapse sources");
        toggle.dataset.tooltip = isCollapsed ? "Expand sources" : "Collapse sources";
    }
}

function getWebSourcesListId() {
    return `webSourcesList-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createWebSourcesToggle(panel, listId, titleText = "Sources") {
    const toggle = document.createElement("button");
    toggle.className = "web-sources-header web-sources-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Collapse sources");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", listId);
    toggle.dataset.tooltip = "Collapse sources";
    const title = document.createElement("span");
    title.className = "web-sources-title";
    title.textContent = titleText;
    toggle.appendChild(title);
    toggle.insertAdjacentHTML("beforeend", `
        <svg class="web-sources-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    `);
    return toggle;
}

function wireWebSourcesPanel(panel) {
    if (!panel) return;
    const sourceList = panel.querySelector(".web-sources-list");
    const toggle = panel.querySelector(".web-sources-toggle");
    if (!sourceList || !toggle || toggle._faunaSourcesToggleAttached) return;
    if (!sourceList.id) sourceList.id = getWebSourcesListId();
    toggle.setAttribute("aria-controls", sourceList.id);
    toggle.addEventListener("click", () => {
        setWebSourcesCollapsed(panel, !panel.classList.contains("collapsed"));
    });
    toggle._faunaSourcesToggleAttached = true;
    setWebSourcesCollapsed(panel, panel.classList.contains("collapsed") || sourceList.hidden);
}

function upgradeWebSourcesPanel(panel) {
    if (!panel) return;
    const existingList = panel.querySelector(".web-sources-list");
    if (existingList) {
        if (!panel.querySelector(".web-sources-header.web-sources-toggle")) {
            if (!existingList.id) existingList.id = getWebSourcesListId();
            const existingTitle = panel.querySelector(".web-sources-title");
            const titleText = existingTitle?.textContent.trim() || "Sources";
            const header = panel.querySelector(".web-sources-header");
            const toggle = createWebSourcesToggle(panel, existingList.id, titleText);
            if (header) {
                header.replaceWith(toggle);
            } else {
                panel.insertBefore(toggle, existingList);
            }
        }
        wireWebSourcesPanel(panel);
        return;
    }

    const directChildren = Array.from(panel.children);
    const title = directChildren.find(child => child.classList?.contains("web-sources-title"));
    const titleText = title?.textContent.trim() || "Sources";

    const sourcePills = directChildren.filter(child => child.classList?.contains("web-source-pill"));
    if (sourcePills.length === 0) return;

    const list = document.createElement("div");
    list.id = getWebSourcesListId();
    list.className = "web-sources-list";

    const toggle = createWebSourcesToggle(panel, list.id, titleText);
    sourcePills.forEach(source => list.appendChild(source));
    panel.replaceChildren(toggle, list);
    wireWebSourcesPanel(panel);
}

function renderWebSources(parentBubbleBlock, sources) {
    if (!parentBubbleBlock || !sources || sources.length === 0) return;

    const validSources = sources.filter(source => source && source.url);
    if (validSources.length === 0) return;

    const existingSources = parentBubbleBlock.querySelector(".web-sources");
    if (existingSources) existingSources.remove();

    const panel = document.createElement("div");
    panel.className = "web-sources";

    const listId = getWebSourcesListId();
    const toggle = createWebSourcesToggle(panel, listId, validSources.length === 1 ? "Source" : "Sources");

    const list = document.createElement("div");
    list.id = listId;
    list.className = "web-sources-list";

    panel.append(toggle, list);

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

        list.appendChild(link);
    });

    parentBubbleBlock.appendChild(panel);
    wireWebSourcesPanel(panel);
}

// ===== MARKDOWN ENGINE =====

function getFileReferenceExtension(path) {
    const fileName = String(path || "").split(/[\\/]/).pop() || "";
    const match = fileName.match(/\.([A-Za-z0-9]+)$/);
    return match ? match[1].toLowerCase() : "";
}

function isLikelyFileReferencePath(path) {
    const cleanPath = String(path || "").trim();
    if (!cleanPath || /^https?:/i.test(cleanPath)) return false;
    if (/^[A-Za-z]:[\\/]/.test(cleanPath)) return true;
    if (/[\\/]/.test(cleanPath)) return true;
    return FILE_REFERENCE_EXTENSIONS.has(getFileReferenceExtension(cleanPath));
}

function cleanFileReferencePath(value) {
    return String(value || "")
        .trim()
        .replace(/^<|>$/g, "")
        .replace(/^["'`]+|["'`]+$/g, "")
        .trim();
}

function splitTrailingFileReferencePunctuation(value) {
    let path = String(value || "");
    let suffix = "";
    while (path && /[)\].,!?;]$/.test(path)) {
        suffix = path.slice(-1) + suffix;
        path = path.slice(0, -1);
    }
    return { path, suffix };
}

function parseFileReferenceTarget(value) {
    let path = cleanFileReferencePath(value);
    if (!path) return null;
    let line = "";
    let endLine = "";

    const parenthesizedLine = path.match(/^(.*?)\s*\((?:line|lines?)\s+(\d+)(?:\s*[-–]\s*(\d+))?\)$/i);
    if (parenthesizedLine) {
        path = parenthesizedLine[1].trim();
        line = parenthesizedLine[2];
        endLine = parenthesizedLine[3] || "";
    }

    const hashLine = path.match(/^(.*?)#L(\d+)(?:[-:](\d+))?$/i);
    if (hashLine) {
        path = hashLine[1].trim();
        line = line || hashLine[2];
        endLine = endLine || hashLine[3] || "";
    }

    const colonLine = path.match(/^(.*):(\d+)(?:[-:](\d+))?$/);
    if (colonLine && !/^[A-Za-z]$/.test(colonLine[1])) {
        path = colonLine[1].trim();
        line = line || colonLine[2];
        endLine = endLine || colonLine[3] || "";
    }

    const splitPath = splitTrailingFileReferencePunctuation(path);
    path = cleanFileReferencePath(splitPath.path);
    if (!isLikelyFileReferencePath(path)) return null;
    return { path, line, endLine, suffix: splitPath.suffix };
}

function getFileReferenceDisplayPath(path) {
    const cleanPath = String(path || "").replace(/[\\/]+$/g, "");
    return cleanPath.split(/[\\/]/).pop() || cleanPath || "file";
}

function getFileReferenceLineLabel(line, endLine) {
    if (!line) return "";
    return endLine && endLine !== line ? `lines ${line}-${endLine}` : `line ${line}`;
}

function renderFileReference(path, line = "", endLine = "", label = "") {
    const displayName = String(label || "").trim() || [
        getFileReferenceDisplayPath(path),
        getFileReferenceLineLabel(line, endLine) ? `(${getFileReferenceLineLabel(line, endLine)})` : ""
    ].filter(Boolean).join(" ");
    const extension = getFileReferenceExtension(path);
    const iconLabel = (extension || (/[\\/]$/.test(path) ? "dir" : "file")).slice(0, 4).toUpperCase();
    const tooltip = [
        path,
        getFileReferenceLineLabel(line, endLine) ? `(${getFileReferenceLineLabel(line, endLine)})` : ""
    ].filter(Boolean).join(" ");
    const iconClass = extension ? ` file-reference-icon-${escapeHtml(extension)}` : "";

    return `<button type="button" class="file-reference" data-file-reference-path="${escapeHtml(path)}" data-file-reference-line="${escapeHtml(line)}" data-file-reference-end-line="${escapeHtml(endLine)}" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`Copy file reference ${displayName}`)}"><span class="file-reference-icon${iconClass}" aria-hidden="true">${escapeHtml(iconLabel)}</span><span class="file-reference-label">${escapeHtml(displayName)}</span></button>`;
}

function splitTrailingWebsitePunctuation(value) {
    let url = String(value || "");
    let suffix = "";
    while (url && /[)\].,!?;]$/.test(url)) {
        suffix = url.slice(-1) + suffix;
        url = url.slice(0, -1);
    }
    return { url, suffix };
}

function parseWebsiteReferenceTarget(value) {
    const split = splitTrailingWebsitePunctuation(String(value || "").trim());
    if (!/^https?:\/\//i.test(split.url)) return null;
    try {
        const parsed = new URL(split.url);
        return {
            url: parsed.href,
            host: parsed.hostname.replace(/^www\./, ""),
            suffix: split.suffix
        };
    } catch {
        return null;
    }
}

function getWebsiteFaviconUrl(url) {
    try {
        const parsed = new URL(url);
        return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsed.origin)}&sz=32`;
    } catch {
        return "";
    }
}

function getSearchReferenceLabel(reference) {
    try {
        const parsed = new URL(reference.url);
        const host = parsed.hostname.replace(/^www\./, "");
        if (/^(?:google\.)/i.test(host) && parsed.pathname === "/search") return "Google search";
        if (/^(?:bing\.)/i.test(host) && parsed.pathname === "/search") return "Bing search";
        if (/duckduckgo\.com$/i.test(host)) return "DuckDuckGo search";
    } catch {
        return "";
    }
    return "";
}

function isWebsiteReferenceLabelUrl(value) {
    return Boolean(parseWebsiteReferenceTarget(String(value || "").trim()));
}

function getWebsiteReferenceDisplayName(reference, label = "") {
    const cleanLabel = String(label || "").trim();
    if (cleanLabel && !isWebsiteReferenceLabelUrl(cleanLabel)) return cleanLabel;
    return getSearchReferenceLabel(reference) || reference.host;
}

function renderWebsiteReference(url, label = "") {
    const reference = parseWebsiteReferenceTarget(url);
    if (!reference) return formatInlinePlainText(url);
    const displayName = getWebsiteReferenceDisplayName(reference, label);
    const ariaLabel = `Open website ${displayName}`;
    const faviconUrl = getWebsiteFaviconUrl(reference.url);
    return `<a class="website-reference" href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer" data-tooltip="${escapeHtml(`Open ${displayName}`)}" aria-label="${escapeHtml(ariaLabel)}"><span class="website-reference-icon" aria-hidden="true">${faviconUrl ? `<img class="website-reference-favicon" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy" decoding="async">` : ""}<span class="website-reference-fallback" ${faviconUrl ? "hidden" : ""}>${escapeHtml(reference.host.slice(0, 1).toUpperCase() || "W")}</span></span><span class="website-reference-label">${escapeHtml(displayName)}</span></a>`;
}

function formatInlinePlainText(segment) {
    let safe = escapeHtml(segment);
    safe = safe.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return safe;
}

function getInlineReferenceCandidates(text) {
    const candidates = [];

    for (const match of text.matchAll(WEBSITE_REFERENCE_URL_RE)) {
        const matchIndex = match.index || 0;
        const reference = parseWebsiteReferenceTarget(match[0]);
        if (!reference) continue;
        candidates.push({
            type: "website",
            index: matchIndex,
            length: match[0].length,
            url: reference.url,
            suffix: reference.suffix
        });
    }

    for (const match of text.matchAll(FILE_REFERENCE_PATH_RE)) {
        const matchIndex = match.index || 0;
        const before = text[matchIndex - 1] || "";
        if (before && /[A-Za-z0-9_/@:#-]/.test(before)) continue;

        const reference = parseFileReferenceTarget(match[1]);
        if (!reference) continue;
        candidates.push({
            type: "file",
            index: matchIndex,
            length: match[0].length,
            path: reference.path,
            line: match[3] || match[2] || reference.line || "",
            endLine: match[4] || reference.endLine || "",
            suffix: reference.suffix
        });
    }

    return candidates
        .sort((a, b) => a.index - b.index || b.length - a.length)
        .filter((candidate, index, sorted) => !sorted.slice(0, index).some(previous => candidate.index < previous.index + previous.length));
}

function renderPlainTextWithReferences(text) {
    let output = "";
    let lastIndex = 0;

    for (const candidate of getInlineReferenceCandidates(text)) {
        if (candidate.index < lastIndex) continue;
        output += formatInlinePlainText(text.slice(lastIndex, candidate.index));
        if (candidate.type === "website") {
            output += renderWebsiteReference(candidate.url);
        } else {
            output += renderFileReference(candidate.path, candidate.line, candidate.endLine);
        }
        output += candidate.suffix ? formatInlinePlainText(candidate.suffix) : "";
        lastIndex = candidate.index + candidate.length;
    }

    output += formatInlinePlainText(text.slice(lastIndex));
    return output;
}

function renderMarkdownLinks(text) {
    let output = "";
    let lastIndex = 0;
    const linkPattern = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;

    for (const match of text.matchAll(linkPattern)) {
        const matchIndex = match.index || 0;
        output += renderPlainTextWithReferences(text.slice(lastIndex, matchIndex));

        const fileReference = parseFileReferenceTarget(match[2]);
        const websiteReference = parseWebsiteReferenceTarget(match[2]);
        if (fileReference) {
            output += renderFileReference(fileReference.path, fileReference.line, fileReference.endLine, match[1]);
            output += fileReference.suffix ? formatInlinePlainText(fileReference.suffix) : "";
        } else if (websiteReference) {
            output += renderWebsiteReference(websiteReference.url, match[1]);
            output += websiteReference.suffix ? formatInlinePlainText(websiteReference.suffix) : "";
        } else {
            output += renderPlainTextWithReferences(match[0]);
        }
        lastIndex = matchIndex + match[0].length;
    }

    output += renderPlainTextWithReferences(text.slice(lastIndex));
    return output;
}

function formatInlineMarkdownText(str) {
    return String(str || "").split(/(`[^`\n]+`)/g).map(segment => {
        if (/^`[^`\n]+`$/.test(segment)) {
            return `<code>${escapeHtml(segment.slice(1, -1))}</code>`;
        }
        return renderMarkdownLinks(segment);
    }).join("");
}

function renderMarkdown(md) {
    const escape = escapeHtml;
    const lines = md.split("\n");
    let html = "", inCode = false, codeLang = "", codeBuffer = "", inUL = false, inOL = false, pendingCodeFileName = "";

    const closeList = () => {
        if (inUL) { html += "</ul>"; inUL = false; }
        if (inOL) { html += "</ol>"; inOL = false; }
    };

    const inlineFormat = formatInlineMarkdownText;

    const renderCodeBlock = () => {
        const lang = normalizeCodeLanguage(codeLang);
        const label = getCodeLanguageLabel(lang);
        const className = lang ? `lang-${escape(lang)}` : "";
        const rawCode = codeBuffer.replace(/\n$/,"");
        const fileName = pendingCodeFileName;
        pendingCodeFileName = "";
        const cardAttrs = fileName
            ? ` data-code-card-requested="true" data-code-file-name="${escape(fileName)}"`
            : "";
        const cardClass = fileName ? " code-file-card-requested" : "";
        return `<div class="code-block-wrapper markdown-code-block${cardClass}"${cardAttrs}><div class="code-block-header"><span class="code-lang-label">${escape(label)}</span></div><pre><code class="${className}">${highlightCode(rawCode, lang)}</code></pre></div>`;
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

        const fileCardDirective = raw.match(CODE_FILE_CARD_DIRECTIVE_RE);
        if (fileCardDirective) {
            closeList();
            pendingCodeFileName = fileCardDirective[1].trim();
            continue;
        }

        if (raw.trim() !== "" && pendingCodeFileName) {
            pendingCodeFileName = "";
        }

        const h = raw.match(/^(#{1,6})\s+(.*)/);
        if (h) {
            closeList();
            html += "<h" + h[1].length + ">" + inlineFormat(h[2]) + "</h" + h[1].length + ">";
            continue;
        }

        const blockquote = raw.match(/^>\s?(.*)/);
        if (blockquote) {
            closeList();
            html += "<blockquote><p>" + inlineFormat(blockquote[1]) + "</p></blockquote>";
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
const PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";
const PREVIEW_STORAGE_SHIM = `(() => {
    const createMemoryStorage = () => {
        const values = new Map();
        return {
            get length() { return values.size; },
            key(index) { return Array.from(values.keys())[Number(index)] ?? null; },
            getItem(key) {
                key = String(key);
                return values.has(key) ? values.get(key) : null;
            },
            setItem(key, value) {
                values.set(String(key), String(value));
            },
            removeItem(key) {
                values.delete(String(key));
            },
            clear() {
                values.clear();
            }
        };
    };

    const ensureStorage = name => {
        const fallbackStorage = createMemoryStorage();
        try {
            Object.defineProperty(window, name, {
                configurable: true,
                enumerable: true,
                value: fallbackStorage
            });
            return;
        } catch {}

        try {
            const storage = window[name];
            const testKey = "__fauna_preview_storage_test__";
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return;
        } catch {}
    };

    ensureStorage("localStorage");
    ensureStorage("sessionStorage");
})();`;
const PREVIEW_RUNTIME_ERROR_SHIM = `(() => {
    const ERROR_BOX_ID = "fauna-preview-runtime-error";
    const ERROR_STYLE_ID = "fauna-preview-runtime-error-style";

    const formatReason = reason => {
        if (reason instanceof Error) return reason.name + ": " + reason.message;
        if (reason && typeof reason === "object") {
            try {
                return JSON.stringify(reason);
            } catch {}
        }
        return String(reason || "Unknown preview error");
    };

    const ensureStyle = () => {
        if (document.getElementById(ERROR_STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = ERROR_STYLE_ID;
        style.textContent = [
            "#" + ERROR_BOX_ID + " {",
            "position: fixed;",
            "left: 12px;",
            "right: 12px;",
            "bottom: 12px;",
            "z-index: 2147483647;",
            "display: grid;",
            "gap: 6px;",
            "max-height: min(42vh, 220px);",
            "overflow: auto;",
            "padding: 12px 14px;",
            "border: 1px solid rgba(220, 38, 38, 0.38);",
            "border-radius: 10px;",
            "background: rgba(255, 247, 247, 0.96);",
            "color: #7f1d1d;",
            "box-shadow: 0 18px 48px rgba(127, 29, 29, 0.16);",
            "font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
            "}",
            "#" + ERROR_BOX_ID + " strong { font-size: 12px; letter-spacing: 0; text-transform: uppercase; }",
            "#" + ERROR_BOX_ID + " code { white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: inherit; }",
            "@media (prefers-color-scheme: dark) {",
            "#" + ERROR_BOX_ID + " { background: rgba(45, 18, 18, 0.96); color: #fecaca; border-color: rgba(248, 113, 113, 0.42); }",
            "}"
        ].join("\\n");
        (document.head || document.documentElement).appendChild(style);
    };

    const showRuntimeError = message => {
        const text = String(message || "Unknown preview error");
        const render = () => {
            if (!document.body) return false;
            ensureStyle();
            let box = document.getElementById(ERROR_BOX_ID);
            if (!box) {
                box = document.createElement("aside");
                box.id = ERROR_BOX_ID;
                box.setAttribute("role", "alert");
                box.innerHTML = "<strong>Preview script error</strong><code></code>";
                document.body.appendChild(box);
            }
            const code = box.querySelector("code");
            if (code) code.textContent = text;
            return true;
        };

        if (!render()) {
            document.addEventListener("DOMContentLoaded", render, { once: true });
        }
    };

    window.addEventListener("error", event => {
        if (event.target && event.target !== window) return;
        showRuntimeError(event.error ? formatReason(event.error) : event.message);
        event.preventDefault();
    });

    window.addEventListener("unhandledrejection", event => {
        showRuntimeError(formatReason(event.reason));
        event.preventDefault();
    });

    window.onerror = (message, source, lineno, colno, error) => {
        showRuntimeError(error ? formatReason(error) : message);
        return true;
    };
})();`;
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

function looksLikeTerminalCommand(code) {
    const trimmed = String(code || "").trim();
    if (!trimmed) return false;
    return /^(?:[$#>]\s*)?(?:bun|cargo|cat|cd|cmd|copy|curl|deno|dir|docker|dotnet|git|go|grep|ls|mkdir|node|npm|ollama|pnpm|powershell|pwsh|py|python|pytest|rg|ruff|tar|uv|wget|yarn)\b/im.test(trimmed)
        || /^\s*(?:Get|Set|New|Remove|Copy|Move|Start|Stop|Test|Select|Where)-[A-Za-z]+\b/m.test(trimmed)
        || /^\s*(?:\.\/|\.\\|[A-Za-z]:\\)[^\n]+/m.test(trimmed);
}

function isTerminalCommandBlock(lang, code) {
    const normalized = normalizeCodeLanguage(lang);
    return TERMINAL_COMMAND_LANGS.has(normalized) || (!normalized && looksLikeTerminalCommand(code));
}

function isMarkdownCodeBlock(lang) {
    const normalized = normalizeCodeLanguage(lang);
    return normalized === "md" || normalized === "markdown";
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

function getPreviewBootstrapScript() {
    return `<script>\n${PREVIEW_STORAGE_SHIM}\n${PREVIEW_RUNTIME_ERROR_SHIM}\n<\/script>`;
}

function injectPreviewBootstrap(html) {
    const bootstrap = getPreviewBootstrapScript();
    if (/<head[^>]*>/i.test(html)) {
        return html.replace(/<head[^>]*>/i, match => `${match}\n${bootstrap}`);
    }
    if (/<html[^>]*>/i.test(html)) {
        return html.replace(/<html[^>]*>/i, match => `${match}\n<head>\n${bootstrap}\n</head>`);
    }
    return `${bootstrap}\n${html}`;
}

function wrapAsPreviewDocument(html, css = "", js = "") {
    const trimmed = html.trim();
    const isFullDoc = /^\s*<!DOCTYPE/i.test(trimmed) || /^\s*<html[\s>]/i.test(trimmed);

    if (isFullDoc) {
        return injectCssAndJs(injectPreviewBootstrap(trimmed), css, js);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${getPreviewBootstrapScript()}
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

function renderHighlightedCodeLines(code, lang) {
    const normalized = normalizeCodeLanguage(lang);
    const lines = String(code ?? "").split("\n");
    return lines.map((line, index) => `
        <span class="code-line">
            <span class="code-line-number" aria-hidden="true">${index + 1}</span>
            <span class="code-line-text">${highlightCode(line, normalized)}</span>
        </span>
    `).join("");
}

function renderCodeElement(codeElement, code, lang) {
    if (!codeElement) return;
    const normalized = normalizeCodeLanguage(lang);
    codeElement.className = normalized ? `lang-${normalized}` : "";
    codeElement.innerHTML = renderHighlightedCodeLines(code, normalized);
}

function getRawCodeFromCodeElement(codeElement) {
    const renderedLines = Array.from(codeElement?.querySelectorAll(".code-line-text") || []);
    if (renderedLines.length) {
        return renderedLines.map(line => line.textContent || "").join("\n");
    }
    return codeElement?.textContent || "";
}

function getCodeWorkbenchPreviewBundle(blocks = []) {
    const previewBlocks = (Array.isArray(blocks) ? blocks : [])
        .map(block => ({
            ...block,
            kind: getCodeBlockKind(block.lang, block.code) || block.kind
        }))
        .filter(block => block.kind);
    const documentHtml = previewBlocks.length > 1
        ? buildCombinedPreviewDocument(previewBlocks)
        : previewBlocks.length === 1
            ? getPreviewDocumentForBlock(previewBlocks[0].kind, previewBlocks[0].code)
            : "";
    return { previewBlocks, documentHtml };
}

function getCodeWorkbenchDownloadPayload(blocks = [], documentHtml = "") {
    const safeBlocks = Array.isArray(blocks) ? blocks : [];
    const firstBlock = safeBlocks[0] || {};
    const firstKind = getCodeBlockKind(firstBlock.lang, firstBlock.code) || firstBlock.kind;
    const previewBlocks = getCodeWorkbenchPreviewBundle(safeBlocks).previewBlocks;

    if (previewBlocks.length > 1) {
        return {
            text: documentHtml,
            name: "fauna-preview.html",
            mime: "text/html;charset=utf-8"
        };
    }

    return {
        text: firstBlock.code || "",
        name: getCodeDownloadName(firstBlock.lang, firstKind),
        mime: firstKind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
    };
}

function syncCodeWorkbenchArtifacts(elements, { reloadPreview = false } = {}) {
    if (!activeCodeWorkbench) return;
    const blocks = activeCodeWorkbench.blocks || [];
    const { documentHtml } = getCodeWorkbenchPreviewBundle(blocks);
    const downloadPayload = getCodeWorkbenchDownloadPayload(blocks, documentHtml);

    activeCodeWorkbench.documentHtml = documentHtml;
    activeCodeWorkbench.copyText = getWorkbenchCopyText(blocks);
    activeCodeWorkbench.downloadText = downloadPayload.text;
    activeCodeWorkbench.downloadName = downloadPayload.name;
    activeCodeWorkbench.downloadMime = downloadPayload.mime;

    if (reloadPreview) {
        loadCodeWorkbenchPreview(elements, documentHtml);
    }
}

function scheduleCodeWorkbenchPreviewReload(elements) {
    if (codeWorkbenchEditTimer !== null) {
        window.clearTimeout(codeWorkbenchEditTimer);
        codeWorkbenchEditTimer = null;
    }

    codeWorkbenchEditTimer = window.setTimeout(() => {
        codeWorkbenchEditTimer = null;
        syncCodeWorkbenchArtifacts(elements, { reloadPreview: true });
    }, CODE_WORKBENCH_PREVIEW_DEBOUNCE_MS);
}

function syncCodeWorkbenchEditorScroll(textarea, highlightPre) {
    if (!textarea || !highlightPre) return;
    highlightPre.scrollTop = textarea.scrollTop;
    highlightPre.scrollLeft = textarea.scrollLeft;
}

function insertCodeWorkbenchEditorText(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = textarea.value || "";
    textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleCodeWorkbenchEditorKeydown(event, textarea) {
    if (event.key === "Tab") {
        event.preventDefault();
        insertCodeWorkbenchEditorText(textarea, "    ");
        return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        const hasSelection = (textarea.selectionEnd || 0) > (textarea.selectionStart || 0);
        if (!hasSelection) return;
        event.preventDefault();
        askAiAboutWorkbenchSelection();
    }
}

function handleCodeWorkbenchEditorInput(textarea, block, codeElement, highlightPre, elements) {
    block.code = textarea.value;
    block.kind = getCodeBlockKind(block.lang, block.code) || block.kind;
    renderCodeElement(codeElement, block.code, block.lang || block.kind);
    syncCodeWorkbenchEditorScroll(textarea, highlightPre);
    syncCodeWorkbenchArtifacts(elements);
    scheduleCodeWorkbenchPreviewReload(elements);
}

function createPromptCodeFence(text) {
    const longestFence = Math.max(2, ...Array.from(String(text || "").matchAll(/`{3,}/g), match => match[0].length));
    return "`".repeat(longestFence + 1);
}

function formatPromptCodeBlock(lang, code) {
    const fence = createPromptCodeFence(code);
    const normalized = normalizeCodeLanguage(lang);
    return `${fence}${normalized}\n${code}\n${fence}`;
}

function getLineNumberAtIndex(text, index) {
    return String(text || "").slice(0, Math.max(0, index)).split("\n").length;
}

function getSelectionContextForPrompt(code, start, end) {
    const text = String(code || "");
    const lines = text.split("\n");
    const startLine = getLineNumberAtIndex(text, start);
    const endLine = getLineNumberAtIndex(text, Math.max(start, end - 1));
    const contextStartLine = Math.max(1, startLine - CODE_WORKBENCH_SELECTION_CONTEXT_LINES);
    const contextEndLine = Math.min(lines.length, endLine + CODE_WORKBENCH_SELECTION_CONTEXT_LINES);
    let contextText = lines.slice(contextStartLine - 1, contextEndLine).join("\n");

    if (contextText.length > CODE_WORKBENCH_SELECTION_MAX_CONTEXT_CHARS) {
        contextText = contextText.slice(0, CODE_WORKBENCH_SELECTION_MAX_CONTEXT_CHARS).trimEnd()
            + "\n\n[Context truncated]";
    }

    return { startLine, endLine, contextStartLine, contextEndLine, contextText };
}

function getActiveWorkbenchSelection() {
    const elements = document.getElementById("codeWorkbenchOverlay")?._faunaElements;
    const editors = Array.from(elements?.code?.querySelectorAll(".code-workbench-editor-input") || []);
    const activeEditor = document.activeElement?.classList?.contains("code-workbench-editor-input")
        ? document.activeElement
        : null;
    const orderedEditors = activeEditor ? [activeEditor, ...editors.filter(editor => editor !== activeEditor)] : editors;

    for (const editor of orderedEditors) {
        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || 0;
        if (end <= start) continue;
        const block = activeCodeWorkbench?.blocks?.[Number(editor.dataset.blockIndex)] || null;
        return {
            editor,
            block,
            start,
            end,
            code: editor.value,
            text: editor.value.slice(start, end)
        };
    }

    return null;
}

function buildWorkbenchSelectionQuestionPrompt(selection) {
    const block = selection?.block || {};
    const lang = normalizeCodeLanguage(block.lang || block.kind);
    const label = getCodeLanguageLabel(block.lang, block.kind) || "Code";
    const context = getSelectionContextForPrompt(selection.code, selection.start, selection.end);
    const lineLabel = context.startLine === context.endLine
        ? `line ${context.startLine}`
        : `lines ${context.startLine}-${context.endLine}`;
    const contextLabel = context.contextStartLine === context.contextEndLine
        ? `line ${context.contextStartLine}`
        : `lines ${context.contextStartLine}-${context.contextEndLine}`;

    return [
        "Explain this selected code and give practical guidance. If there is a bug, risk, or cleaner edit, call it out.",
        "",
        `Language: ${label}`,
        `Selection: ${lineLabel}`,
        "",
        "Selected code:",
        formatPromptCodeBlock(lang, selection.text),
        "",
        `Nearby context (${contextLabel}):`,
        formatPromptCodeBlock(lang, context.contextText)
    ].join("\n");
}

function askAiAboutWorkbenchSelection() {
    if (isGenerating) {
        showToast("Wait for the current response to finish first.", "warning");
        return;
    }

    const selection = getActiveWorkbenchSelection();
    if (!selection?.text?.trim()) {
        showToast("Select code in the editor first.", "warning");
        return;
    }
    if (!input) return;

    input.value = buildWorkbenchSelectionQuestionPrompt(selection);
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();

    if (window.matchMedia?.("(max-width: 1179px)")?.matches) {
        closeCodeWorkbench();
    }

    showToast("Asking AI about the selection.", "info");
    processWorkspaceEntry({ skipWorkspaceContext: true });
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
        file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>`,
        copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>`,
        console: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path></svg>`,
        terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path></svg>`,
        wrap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"></path><path d="M4 12h13a3 3 0 1 1 0 6h-5"></path><path d="m14 16-2 2 2 2"></path><path d="M4 18h5"></path></svg>`,
        add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>`,
        ask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"></path><path d="M9.5 9a2.5 2.5 0 0 1 4.33-1.7c.92.96.9 2.46-.05 3.38-.53.51-1.28.86-1.28 1.82"></path><path d="M12.5 16h.01"></path></svg>`,
        markdown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"></path><path d="M4 12h10"></path><path d="M4 19h7"></path><path d="m15 16 3 3 3-3"></path><path d="M18 10v9"></path></svg>`,
        desktop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path></svg>`,
        tablet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.6"></rect><path d="M12 18h.01"></path></svg>`,
        phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.4"></rect><path d="M11 18h2"></path></svg>`,
        refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4"></path><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path></svg>`,
        more: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="19" cy="12" r="1.7"></circle></svg>`,
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

function getCodeLineCount(code) {
    const text = String(code ?? "");
    if (!text) return 0;
    return text.split("\n").length;
}

function formatCodeFileSize(code) {
    const bytes = new Blob([String(code ?? "")]).size;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function getDefaultCodeFileName(lang, kind) {
    const normalized = normalizeCodeLanguage(lang || kind);
    if (kind === "html" || PREVIEW_HTML_LANGS.has(normalized)) return "index.html";
    if (kind === "css" || PREVIEW_CSS_LANGS.has(normalized)) return "styles.css";
    if (kind === "js" || PREVIEW_JS_LANGS.has(normalized)) return "script.js";
    return getCodeDownloadName(lang, kind, "file");
}

function getCodeFileCardName(wrapper, lang, kind) {
    const explicit = String(wrapper?.dataset?.codeFileName || "").trim();
    return explicit || getDefaultCodeFileName(lang, kind);
}

function shouldRenderCodeFileCard(wrapper, code) {
    if (wrapper?.dataset?.codeCardRequested === "true") return true;
    const text = String(code ?? "");
    return text.length >= LARGE_CODE_FILE_CARD_MIN_CHARS || getCodeLineCount(text) >= LARGE_CODE_FILE_CARD_MIN_LINES;
}

function getCodeFileCardMeta(lang, kind, code) {
    const label = getCodeLanguageLabel(lang, kind) || "Code";
    const lineCount = getCodeLineCount(code);
    const lineLabel = `${lineCount.toLocaleString()} ${lineCount === 1 ? "line" : "lines"}`;
    return `${label} · ${lineLabel} · ${formatCodeFileSize(code)}`;
}

function renderWorkbenchCode(codeHost, blocks) {
    if (!codeHost) return;
    codeHost.innerHTML = "";
    codeHost.classList.toggle("has-multiple-editors", blocks.length > 1);
    blocks.forEach((block, index) => {
        const section = document.createElement("section");
        section.className = "code-workbench-code-section";
        block.kind = getCodeBlockKind(block.lang, block.code) || block.kind;
        const lang = normalizeCodeLanguage(block.lang || block.kind);
        const labelText = getCodeLanguageLabel(block.lang, block.kind) || "Code";

        if (blocks.length > 1) {
            const label = document.createElement("div");
            label.className = "code-workbench-code-label";
            label.textContent = labelText;
            section.appendChild(label);
        }

        const editor = document.createElement("div");
        editor.className = "code-workbench-editor";
        editor.dataset.lang = lang;

        const pre = document.createElement("pre");
        pre.className = "code-workbench-editor-highlight";
        pre.setAttribute("aria-hidden", "true");

        const codeElement = document.createElement("code");
        renderCodeElement(codeElement, block.code || "", lang);
        pre.appendChild(codeElement);

        const textarea = document.createElement("textarea");
        textarea.className = "code-workbench-editor-input";
        textarea.value = block.code || "";
        textarea.dataset.blockIndex = String(index);
        textarea.setAttribute("aria-label", `${labelText} editor`);
        textarea.setAttribute("autocomplete", "off");
        textarea.setAttribute("autocapitalize", "off");
        textarea.setAttribute("spellcheck", "false");
        textarea.wrap = "off";

        textarea.addEventListener("scroll", () => syncCodeWorkbenchEditorScroll(textarea, pre));
        textarea.addEventListener("keydown", event => handleCodeWorkbenchEditorKeydown(event, textarea));
        textarea.addEventListener("input", () => handleCodeWorkbenchEditorInput(textarea, block, codeElement, pre, codeHost._faunaElements || ensureCodeWorkbench()));

        editor.append(pre, textarea);
        section.appendChild(editor);
        codeHost.appendChild(section);

        if (index < blocks.length - 1) {
            const divider = document.createElement("div");
            divider.className = "code-workbench-code-divider";
            codeHost.appendChild(divider);
        }
    });
}

function clearCodeWorkbenchEditTimer() {
    if (codeWorkbenchEditTimer !== null) {
        window.clearTimeout(codeWorkbenchEditTimer);
        codeWorkbenchEditTimer = null;
    }
}

function clearCodeWorkbenchLoadTimer() {
    if (codeWorkbenchLoadTimer !== null) {
        window.clearTimeout(codeWorkbenchLoadTimer);
        codeWorkbenchLoadTimer = null;
    }
}

function setCodeWorkbenchProgressState(elements, state = "idle") {
    const workbench = elements?.workbench;
    const progress = elements?.progress;
    if (!workbench || !progress) return;

    workbench.dataset.previewState = state;
    progress.setAttribute("aria-valuetext", state === "loading" ? "Loading preview" : state === "loaded" ? "Preview loaded" : "Preview idle");
    if (state === "loaded") {
        progress.setAttribute("aria-valuenow", "100");
    } else {
        progress.removeAttribute("aria-valuenow");
    }
}

function beginCodeWorkbenchLoading(elements) {
    clearCodeWorkbenchLoadTimer();
    codeWorkbenchLoadToken += 1;
    const token = codeWorkbenchLoadToken;
    setCodeWorkbenchProgressState(elements, "loading");
    codeWorkbenchLoadTimer = window.setTimeout(() => {
        finishCodeWorkbenchLoading(elements, token);
    }, 2400);
    return token;
}

function finishCodeWorkbenchLoading(elements, token = codeWorkbenchLoadToken) {
    if (token !== codeWorkbenchLoadToken) return;
    clearCodeWorkbenchLoadTimer();
    setCodeWorkbenchProgressState(elements, "loaded");
    codeWorkbenchLoadTimer = window.setTimeout(() => {
        if (token === codeWorkbenchLoadToken) {
            setCodeWorkbenchProgressState(elements, "idle");
        }
        codeWorkbenchLoadTimer = null;
    }, 900);
}

function bindCodeWorkbenchPreviewLoad(elements) {
    elements.iframe?.addEventListener("load", () => {
        if (!activeCodeWorkbench || elements.iframe?.srcdoc !== activeCodeWorkbench.documentHtml) return;
        finishCodeWorkbenchLoading(elements);
    });
}

function resetCodeWorkbenchPreviewFrame(elements) {
    const currentFrame = elements?.iframe;
    if (!currentFrame?.parentElement) return currentFrame || null;

    const iframe = document.createElement("iframe");
    iframe.className = currentFrame.className;
    iframe.setAttribute("sandbox", PREVIEW_IFRAME_SANDBOX);
    iframe.setAttribute("aria-label", currentFrame.getAttribute("aria-label") || "Code preview");
    currentFrame.replaceWith(iframe);
    elements.iframe = iframe;
    bindCodeWorkbenchPreviewLoad(elements);
    return iframe;
}

function loadCodeWorkbenchPreview(elements, documentHtml = "") {
    if (!elements?.iframe) return;
    const token = beginCodeWorkbenchLoading(elements);
    const iframe = resetCodeWorkbenchPreviewFrame(elements);

    if (!String(documentHtml || "").trim()) {
        finishCodeWorkbenchLoading(elements, token);
        return;
    }

    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (token !== codeWorkbenchLoadToken || !activeCodeWorkbench) return;
        if (iframe) iframe.srcdoc = documentHtml;
    }));
}

function getCodeWorkbenchOverflowLabel(button) {
    return button?.dataset?.overflowLabel
        || button?.getAttribute("aria-label")
        || button?.dataset?.tooltip
        || "Action";
}

function prepareCodeWorkbenchOverflowButton(button) {
    if (!button) return;
    button.dataset.overflowLabel = getCodeWorkbenchOverflowLabel(button);
    if (!button.querySelector(".code-workbench-overflow-item-label")) {
        const label = document.createElement("span");
        label.className = "code-workbench-overflow-item-label";
        label.textContent = button.dataset.overflowLabel;
        button.appendChild(label);
    }
}

function setCodeWorkbenchOverflowMenuOpen(elements, open) {
    if (!elements?.overflowBtn || !elements?.overflowMenu) return false;
    const shouldOpen = Boolean(open) && !elements.overflowBtn.hidden;
    elements.actions?.classList.toggle("overflow-open", shouldOpen);
    elements.overflowBtn.classList.toggle("active", shouldOpen);
    elements.overflowBtn.setAttribute("aria-expanded", String(shouldOpen));
    elements.overflowMenu.hidden = !shouldOpen;
    return shouldOpen;
}

function closeCodeWorkbenchOverflowMenu(elements) {
    if (!elements?.actions?.classList.contains("overflow-open")) return false;
    setCodeWorkbenchOverflowMenuOpen(elements, false);
    return true;
}

function applyCodeWorkbenchOverflowCount(elements, overflowCount = 0) {
    const buttons = elements?.overflowableActionBtns || [];
    const actions = elements?.actions;
    const menu = elements?.overflowMenu;
    const overflowBtn = elements?.overflowBtn;
    if (!actions || !menu || !overflowBtn) return;

    const safeCount = Math.max(0, Math.min(buttons.length, overflowCount));
    const visibleCount = buttons.length - safeCount;

    buttons.forEach((button, index) => {
        if (!button) return;
        const isOverflowed = index >= visibleCount;
        button.classList.toggle("code-workbench-overflow-item", isOverflowed);
        if (isOverflowed) {
            button.setAttribute("role", "menuitem");
            menu.appendChild(button);
        } else {
            button.removeAttribute("role");
            actions.insertBefore(button, overflowBtn);
        }
    });

    overflowBtn.hidden = safeCount === 0;
    actions.dataset.overflowCount = String(safeCount);
    if (safeCount === 0) {
        setCodeWorkbenchOverflowMenuOpen(elements, false);
    }
}

function codeWorkbenchToolbarOverflows(elements) {
    const toolbar = elements?.toolbar;
    const actions = elements?.actions;
    if (!toolbar || !actions) return false;

    const toolbarRect = toolbar.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const rightLimit = Math.min(toolbarRect.right, window.innerWidth);
    const leftLimit = Math.max(toolbarRect.left, 0);
    const visibleButtons = Array.from(actions.children)
        .filter(node => node.matches?.(".code-workbench-icon-btn:not([hidden])"));
    const buttonsOverflow = visibleButtons.some(button => {
        const rect = button.getBoundingClientRect();
        return rect.right > rightLimit + 1 || rect.left < leftLimit - 1;
    });

    return actionsRect.right > rightLimit + 1
        || actionsRect.left < leftLimit - 1
        || buttonsOverflow;
}

function updateCodeWorkbenchActionOverflow(elements) {
    if (!elements?.actions || !elements?.overflowBtn || !elements?.overflowMenu) return;
    if (elements.overlay?.hidden) {
        applyCodeWorkbenchOverflowCount(elements, 0);
        return;
    }

    const buttons = elements.overflowableActionBtns || [];
    const wasOpen = elements.actions.classList.contains("overflow-open");
    if (wasOpen) setCodeWorkbenchOverflowMenuOpen(elements, false);
    let overflowCount = 0;

    for (; overflowCount <= buttons.length; overflowCount += 1) {
        applyCodeWorkbenchOverflowCount(elements, overflowCount);
        if (!codeWorkbenchToolbarOverflows(elements)) break;
    }

    if (wasOpen && !elements.overflowBtn.hidden) {
        setCodeWorkbenchOverflowMenuOpen(elements, true);
    }
}

function scheduleCodeWorkbenchActionOverflowUpdate(elements) {
    if (!elements) return;
    if (elements.overflowRaf) {
        window.cancelAnimationFrame(elements.overflowRaf);
    }
    elements.overflowRaf = window.requestAnimationFrame(() => {
        elements.overflowRaf = 0;
        updateCodeWorkbenchActionOverflow(elements);
    });
}

function bindCodeWorkbenchActionOverflow(elements) {
    if (!elements?.actions || !elements?.overflowBtn || !elements?.overflowMenu) return;

    elements.overflowableActionBtns?.forEach(prepareCodeWorkbenchOverflowButton);
    elements.overflowBtn.addEventListener("click", event => {
        event.stopPropagation();
        setCodeWorkbenchOverflowMenuOpen(elements, !elements.actions.classList.contains("overflow-open"));
    });
    elements.overflowMenu.addEventListener("click", event => {
        if (event.target.closest("[data-workbench-action]")) {
            window.setTimeout(() => setCodeWorkbenchOverflowMenuOpen(elements, false), 0);
        }
    });

    if ("ResizeObserver" in window) {
        elements.overflowObserver = new ResizeObserver(() => scheduleCodeWorkbenchActionOverflowUpdate(elements));
        [elements.workbench, elements.toolbar, elements.actions, elements.title].forEach(node => {
            if (node) elements.overflowObserver.observe(node);
        });
    }

    window.addEventListener("resize", () => scheduleCodeWorkbenchActionOverflowUpdate(elements));
}

function ensureCodeWorkbench() {
    let overlay = document.getElementById("codeWorkbenchOverlay");
    if (overlay?._faunaElements) return overlay._faunaElements;

    overlay = document.createElement("div");
    overlay.id = "codeWorkbenchOverlay";
    overlay.className = "code-workbench-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="code-workbench" role="region" aria-labelledby="codeWorkbenchTitle" data-preview-state="idle">
            <header class="code-workbench-toolbar">
                <div class="code-workbench-title-group">
                    <div id="codeWorkbenchTitle" class="code-workbench-title">Code Preview</div>
                    <div class="code-workbench-subtitle">Sandboxed preview</div>
                </div>
                <div class="code-workbench-tabs" role="tablist" aria-label="Code preview mode">
                    <button type="button" class="code-workbench-tab" data-workbench-mode="code" role="tab" aria-selected="false">Code</button>
                    <button type="button" class="code-workbench-tab" data-workbench-mode="preview" role="tab" aria-selected="true">Preview</button>
                </div>
                <div class="code-workbench-viewport" role="group" aria-label="Preview viewport">
                    <button type="button" class="code-workbench-viewport-btn active" data-workbench-viewport="desktop" data-tooltip="Desktop preview" aria-label="Desktop preview" aria-pressed="true">${getCodeActionIcon("desktop")}</button>
                    <button type="button" class="code-workbench-viewport-btn" data-workbench-viewport="tablet" data-tooltip="Tablet preview" aria-label="Tablet preview" aria-pressed="false">${getCodeActionIcon("tablet")}</button>
                    <button type="button" class="code-workbench-viewport-btn" data-workbench-viewport="phone" data-tooltip="Phone preview" aria-label="Phone preview" aria-pressed="false">${getCodeActionIcon("phone")}</button>
                </div>
                <div class="code-workbench-actions">
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="ask-selection" data-tooltip="Ask AI about selected code" data-overflow-label="Ask AI" aria-label="Ask AI about selected code">${getCodeActionIcon("ask")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="copy" data-tooltip="Copy code" data-overflow-label="Copy" aria-label="Copy code">${getCodeActionIcon("copy")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="download" data-tooltip="Download code" data-overflow-label="Download" aria-label="Download code">${getCodeActionIcon("download")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="refresh" data-tooltip="Refresh preview" data-overflow-label="Refresh" aria-label="Refresh preview">${getCodeActionIcon("refresh")}</button>
                    <button type="button" class="code-workbench-icon-btn code-workbench-overflow-btn" data-workbench-action="overflow" data-tooltip="More actions" aria-label="More actions" aria-haspopup="menu" aria-expanded="false" hidden>${getCodeActionIcon("more")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="close" data-tooltip="Close" aria-label="Close preview">${getCodeActionIcon("close")}</button>
                    <div class="code-workbench-overflow-menu" role="menu" hidden></div>
                </div>
            </header>
            <div class="code-workbench-accent" role="progressbar" aria-label="Preview loading progress" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Preview idle"></div>
            <div class="code-workbench-body" data-mode="preview">
                <div class="code-workbench-code" role="tabpanel"></div>
                <div class="code-workbench-preview-shell" data-viewport="desktop">
                    <div class="code-workbench-preview-stage">
                        <iframe class="code-workbench-preview" sandbox="${PREVIEW_IFRAME_SANDBOX}" aria-label="Code preview"></iframe>
                    </div>
                </div>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);

    const elements = {
        overlay,
        workbench: overlay.querySelector(".code-workbench"),
        title: overlay.querySelector(".code-workbench-title"),
        subtitle: overlay.querySelector(".code-workbench-subtitle"),
        progress: overlay.querySelector(".code-workbench-accent"),
        body: overlay.querySelector(".code-workbench-body"),
        code: overlay.querySelector(".code-workbench-code"),
        toolbar: overlay.querySelector(".code-workbench-toolbar"),
        previewShell: overlay.querySelector(".code-workbench-preview-shell"),
        iframe: overlay.querySelector(".code-workbench-preview"),
        actions: overlay.querySelector(".code-workbench-actions"),
        tabs: Array.from(overlay.querySelectorAll("[data-workbench-mode]")),
        viewportBtns: Array.from(overlay.querySelectorAll("[data-workbench-viewport]")),
        askSelectionBtn: overlay.querySelector("[data-workbench-action='ask-selection']"),
        copyBtn: overlay.querySelector("[data-workbench-action='copy']"),
        downloadBtn: overlay.querySelector("[data-workbench-action='download']"),
        refreshBtn: overlay.querySelector("[data-workbench-action='refresh']"),
        overflowBtn: overlay.querySelector("[data-workbench-action='overflow']"),
        overflowMenu: overlay.querySelector(".code-workbench-overflow-menu"),
        closeBtn: overlay.querySelector("[data-workbench-action='close']")
    };
    elements.overflowableActionBtns = [
        elements.askSelectionBtn,
        elements.copyBtn,
        elements.downloadBtn,
        elements.refreshBtn
    ].filter(Boolean);
    if (elements.code) elements.code._faunaElements = elements;

    elements.tabs.forEach(tab => {
        tab.addEventListener("click", () => setCodeWorkbenchMode(tab.dataset.workbenchMode));
    });
    elements.viewportBtns.forEach(button => {
        button.addEventListener("click", () => setCodeWorkbenchViewport(button.dataset.workbenchViewport));
    });
    elements.askSelectionBtn?.addEventListener("mousedown", event => event.preventDefault());
    elements.askSelectionBtn?.addEventListener("click", askAiAboutWorkbenchSelection);
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
        syncCodeWorkbenchArtifacts(elements);
        loadCodeWorkbenchPreview(elements, activeCodeWorkbench.documentHtml);
    });
    bindCodeWorkbenchActionOverflow(elements);
    bindCodeWorkbenchPreviewLoad(elements);
    elements.closeBtn?.addEventListener("click", closeCodeWorkbench);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeCodeWorkbench();
    });
    document.addEventListener("click", event => {
        if (overlay.hidden || elements.actions?.contains(event.target)) return;
        closeCodeWorkbenchOverflowMenu(elements);
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || overlay.hidden) return;
        if (closeCodeWorkbenchOverflowMenu(elements)) {
            event.preventDefault();
            return;
        }
        closeCodeWorkbench();
    });

    overlay._faunaElements = elements;
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
    if (nextMode === "code") {
        window.setTimeout(() => {
            elements.code?.querySelector(".code-workbench-editor-input")?.focus({ preventScroll: true });
        }, 0);
    }
}

function setCodeWorkbenchViewport(viewport = "desktop") {
    const elements = ensureCodeWorkbench();
    const allowed = new Set(["desktop", "tablet", "phone"]);
    const nextViewport = allowed.has(viewport) ? viewport : "desktop";
    if (elements.previewShell) elements.previewShell.dataset.viewport = nextViewport;
    elements.viewportBtns.forEach(button => {
        const isActive = button.dataset.workbenchViewport === nextViewport;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
    activeCodeWorkbench = activeCodeWorkbench ? { ...activeCodeWorkbench, viewport: nextViewport } : null;
}

function openCodeWorkbench({
    title = "Code Preview",
    subtitle = "Sandboxed preview",
    blocks = [],
    documentHtml = "",
    initialMode = "preview",
    initialViewport = "desktop",
    copyText = "",
    downloadText = "",
    downloadName = "fauna-code.txt",
    downloadMime = "text/plain;charset=utf-8"
} = {}) {
    const elements = ensureCodeWorkbench();
    clearCodeWorkbenchEditTimer();
    const safeBlocks = blocks.filter(block => block?.code != null);
    activeCodeWorkbench = {
        blocks: safeBlocks,
        documentHtml,
        copyText: copyText || getWorkbenchCopyText(safeBlocks),
        downloadText: downloadText || copyText || getWorkbenchCopyText(safeBlocks),
        downloadName,
        downloadMime,
        mode: initialMode,
        viewport: initialViewport
    };

    if (elements.title) elements.title.textContent = title;
    if (elements.subtitle) elements.subtitle.textContent = subtitle;
    renderWorkbenchCode(elements.code, safeBlocks);
    if (elements.iframe) elements.iframe.srcdoc = "";

    elements.overlay.hidden = false;
    elements.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("code-workbench-open");
    setCodeWorkbenchMode(initialMode);
    setCodeWorkbenchViewport(initialViewport);
    scheduleCodeWorkbenchActionOverflowUpdate(elements);
    window.requestAnimationFrame(() => loadCodeWorkbenchPreview(elements, documentHtml));
    const focusTarget = initialMode === "code"
        ? elements.code?.querySelector(".code-workbench-editor-input")
        : elements.overlay.querySelector(".code-workbench-tab.active");
    focusTarget?.focus({ preventScroll: true });
}

function closeCodeWorkbench() {
    codeWorkbenchLoadToken += 1;
    clearCodeWorkbenchLoadTimer();
    clearCodeWorkbenchEditTimer();
    const overlay = document.getElementById("codeWorkbenchOverlay");
    const elements = overlay?._faunaElements || null;
    if (!elements) {
        document.body.classList.remove("code-workbench-open");
        activeCodeWorkbench = null;
        return;
    }
    setCodeWorkbenchProgressState(elements, "idle");
    closeCodeWorkbenchOverflowMenu(elements);
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

function createTerminalPanel() {
    const panel = document.createElement("div");
    panel.className = "terminal-output-box";
    return panel;
}

function buildTerminalChatContext(command, outputText) {
    return [
        "Terminal command output",
        "",
        `Command: ${command}`,
        "",
        "Output:",
        outputText
    ].join("\n");
}

function buildTerminalQuestionPrompt(command, outputText) {
    return [
        "Analyze this completed process result and suggest next steps.",
        "",
        `Process: ${command}`,
        "",
        "Result:",
        outputText
    ].join("\n");
}

function addTerminalOutputToChat(command, outputText, button = null) {
    const contextText = buildTerminalChatContext(command, outputText);
    const userMessageCreatedAt = new Date().toISOString();
    showChatSurface();
    const userBubble = addRenderNode(`Terminal output: ${command}`, "user", [], {
        createdAt: userMessageCreatedAt
    });
    addRenderNode(outputText, "output", [], {
        createdAt: new Date().toISOString()
    });
    conversationHistory.push({
        role: "user",
        content: contextText,
        createdAt: userMessageCreatedAt
    });
    const userMessageNode = userBubble?.closest?.(".message-node.user-node");
    if (userMessageNode) {
        userMessageNode.dataset.historyIndex = String(conversationHistory.length - 1);
    }
    saveCurrentSession();

    if (button) {
        button.disabled = true;
        setActionButtonState(button, true, "Added", "Add to chat");
        button.dataset.tooltip = "Added to chat";
        button.setAttribute("aria-label", "Added to chat");
    }

    showToast("Terminal output added to chat.", "success");
}

function askAiAboutTerminalOutput(command, outputText) {
    if (isGenerating) {
        showToast("Wait for the current response to finish first.", "warning");
        return;
    }
    if (!input) return;

    input.value = buildTerminalQuestionPrompt(command, outputText);
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    processWorkspaceEntry({ skipWorkspaceContext: true });
}

function renderTerminalPanel(panel, text, state = "info", options = {}) {
    if (!panel) return;
    panel.classList.toggle("terminal-output-error", state === "error");
    panel.classList.toggle("terminal-output-running", state === "running");
    panel.innerHTML = "";

    const pre = document.createElement("pre");
    pre.textContent = text;
    panel.appendChild(pre);

    if (options.canShare && options.command && text.trim()) {
        const actions = document.createElement("div");
        actions.className = "terminal-output-actions";

        const addBtn = createActionButton("Add to chat", "add", { compact: true });
        const askBtn = createActionButton("Ask AI", "ask", { compact: true });

        addBtn.onclick = () => addTerminalOutputToChat(options.command, text, addBtn);
        askBtn.onclick = () => askAiAboutTerminalOutput(options.command, text);

        actions.append(addBtn, askBtn);
        panel.appendChild(actions);
    }

    panel.style.display = "block";
}

function setRunButtonState(btn, active, label = "Run", ariaLabel = label) {
    setActionButtonState(btn, active, label, "Run");
    btn.dataset.tooltip = active ? ariaLabel : "Run in terminal";
    btn.setAttribute("aria-label", active ? ariaLabel : "Run in terminal");
}

async function runTerminalCodeBlock(command, terminalPanel, runBtn) {
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Enable Local Workspace Bridge to run terminal commands.", "warning");
        return;
    }

    runBtn.disabled = true;
    setRunButtonState(runBtn, true, "Running", "Running terminal command");
    renderTerminalPanel(terminalPanel, `Running:\n${command}`, "running");
    scrollChatToBottom();

    try {
        const result = await runWorkspaceCommand(command, ".", 60);
        const resultText = formatWorkspaceCommandResult(result);
        renderTerminalPanel(terminalPanel, resultText, result.exitCode === 0 ? "info" : "error", {
            command,
            canShare: true
        });
        showToast(result.exitCode === 0 ? "Terminal command finished." : "Terminal command exited with errors.", result.exitCode === 0 ? "success" : "warning");
    } catch (err) {
        renderTerminalPanel(terminalPanel, `Command failed:\n${err.message}`, "error", {
            command,
            canShare: true
        });
        showToast(`Terminal command failed: ${err.message}`, "error");
    } finally {
        runBtn.disabled = false;
        setRunButtonState(runBtn, true, "Hide", "Hide terminal");
        saveCurrentSession({ render: false });
        scrollChatToBottom({ force: true });
    }
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
        const code = getRawCodeFromCodeElement(codeElement);
        const kind = getCodeBlockKind(lang, code);
        return { pre: codeElement.closest("pre"), lang, code, kind };
    }).filter(block => block.pre);
}

function openCodeBlocksInWorkbench(blocks, {
    title = "",
    subtitle = "",
    initialMode = "preview",
    downloadText = "",
    downloadName = "",
    downloadMime = ""
} = {}) {
    const safeBlocks = (Array.isArray(blocks) ? blocks : []).filter(block => block?.code != null);
    if (safeBlocks.length === 0) return;

    const previewBlocks = safeBlocks.filter(block => block.kind);
    const documentHtml = previewBlocks.length > 1
        ? buildCombinedPreviewDocument(previewBlocks)
        : previewBlocks.length === 1
            ? getPreviewDocumentForBlock(previewBlocks[0].kind, previewBlocks[0].code)
            : "";
    const firstBlock = safeBlocks[0];
    const firstLabel = getCodeLanguageLabel(firstBlock.lang, firstBlock.kind);
    const canPreview = Boolean(documentHtml);

    openCodeWorkbench({
        title: title || getPreviewTitleFromDocument(documentHtml, `${firstLabel || "Code"} Preview`),
        subtitle: subtitle || (safeBlocks.length > 1 ? `${safeBlocks.length} linked code blocks` : `${firstLabel || "Code"} sandbox`),
        blocks: safeBlocks,
        documentHtml,
        initialMode: canPreview ? initialMode : "code",
        downloadText: downloadText || (previewBlocks.length > 1 ? documentHtml : firstBlock.code),
        downloadName: downloadName || (previewBlocks.length > 1 ? "fauna-preview.html" : getCodeDownloadName(firstBlock.lang, firstBlock.kind)),
        downloadMime: downloadMime || (previewBlocks.length > 1 || firstBlock.kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8")
    });
}

function createCodeFileCard({
    title,
    meta,
    onOpen,
    onCopy,
    onDownload
}) {
    const card = document.createElement("div");
    card.className = "code-file-card";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "code-file-card-main";
    main.dataset.tooltip = "Open preview";
    main.setAttribute("aria-label", `Open preview for ${title}`);
    main.innerHTML = `
        <span class="code-file-card-icon" aria-hidden="true">${getCodeActionIcon("file")}</span>
        <span class="code-file-card-copy">
            <span class="code-file-card-title">${escapeHtml(title)}</span>
            <span class="code-file-card-meta">${escapeHtml(meta)}</span>
        </span>
    `;
    main.addEventListener("click", onOpen);

    const actions = document.createElement("div");
    actions.className = "code-file-card-actions";

    const copyBtn = createActionButton("Copy", "copy", { compact: true });
    copyBtn.addEventListener("click", event => {
        event.stopPropagation();
        onCopy?.(copyBtn);
    });

    const downloadBtn = createActionButton("Download", "download", { compact: true });
    downloadBtn.addEventListener("click", event => {
        event.stopPropagation();
        onDownload?.();
    });

    actions.append(copyBtn, downloadBtn);
    card.append(main, actions);
    return card;
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
        openCodeBlocksInWorkbench(blocks, {
            title: "Combined Preview",
            subtitle: `${blocks.length} linked code blocks`,
            downloadName: "fauna-preview.html",
            downloadMime: "text/html;charset=utf-8"
        });
    };
}

function wrapCodeBlock(pre, lang, code, kind, allowSandbox = true, options = {}) {
    let wrapper = pre.parentElement?.classList.contains("code-block-wrapper") ? pre.parentElement : null;
    if (wrapper?.dataset.codeEnhanced === "true") return;

    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "code-block-wrapper";
        pre.parentNode.insertBefore(wrapper, pre);
    }

    wrapper.querySelectorAll(".code-file-card").forEach(card => card.remove());
    wrapper.classList.remove("code-file-card-mode");
    pre.hidden = false;

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
    header.hidden = false;

    const existingActions = header.querySelector(".code-block-actions");
    if (existingActions) existingActions.remove();

    const actions = document.createElement("div");
    actions.className = "code-block-actions";
    const isMarkdownBlock = isMarkdownCodeBlock(lang);

    let previewBtn = null;
    if (kind && allowSandbox) {
        previewBtn = createActionButton("Preview", "preview");
        actions.appendChild(previewBtn);
    }

    let markdownToggleBtn = null;
    if (isMarkdownBlock) {
        markdownToggleBtn = createActionButton("Render", "markdown");
        markdownToggleBtn.dataset.tooltip = "Render markdown";
        markdownToggleBtn.setAttribute("aria-label", "Render markdown");
        actions.appendChild(markdownToggleBtn);
    }

    let runBtn = null;
    if (isTerminalCommandBlock(lang, code)) {
        runBtn = createActionButton("Run", "terminal");
        runBtn.dataset.tooltip = "Run in terminal";
        runBtn.setAttribute("aria-label", "Run in terminal");
        actions.appendChild(runBtn);
    }

    const wrapBtn = createActionButton("Wrap", "wrap");
    actions.appendChild(wrapBtn);

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
    renderCodeElement(pre.querySelector("code"), code, lang);
    wrapper.dataset.codeEnhanced = "true";

    let consolePanel = null;
    if (kind === "js" && allowSandbox) {
        consolePanel = Array.from(wrapper.children).find(child => child.classList?.contains("console-output-box")) || createConsolePanel();
        if (consolePanel.parentElement !== wrapper) wrapper.appendChild(consolePanel);
    }

    let terminalPanel = null;
    if (runBtn) {
        terminalPanel = Array.from(wrapper.children).find(child => child.classList?.contains("terminal-output-box")) || createTerminalPanel();
        if (terminalPanel.parentElement !== wrapper) wrapper.appendChild(terminalPanel);
    }

    let markdownPanel = null;
    if (isMarkdownBlock) {
        markdownPanel = Array.from(wrapper.children).find(child => child.classList?.contains("markdown-render-panel")) || document.createElement("div");
        markdownPanel.className = "markdown-render-panel markdown";
        markdownPanel.hidden = true;
        markdownPanel.innerHTML = renderMarkdown(code);
        if (markdownPanel.parentElement !== wrapper) wrapper.appendChild(markdownPanel);
        wrapper.classList.remove("markdown-rendered");
    }

    let activeMode = null;
    const sharedPreviewBlocks = allowSandbox && Array.isArray(options.previewBlocks) && options.previewBlocks.length > 1
        ? options.previewBlocks
        : null;
    const openPreviewBlocks = () => {
        closeAll();
        const targetBlocks = sharedPreviewBlocks || [{ pre, lang, code, kind }];
        const documentHtml = sharedPreviewBlocks
            ? buildCombinedPreviewDocument(sharedPreviewBlocks)
            : allowSandbox
                ? getPreviewDocumentForBlock(kind, code)
                : "";
        const label = getCodeLanguageLabel(lang, kind) || "Code";
        openCodeBlocksInWorkbench(targetBlocks, {
            title: sharedPreviewBlocks
                ? getPreviewTitleFromDocument(documentHtml, "Combined Preview")
                : getPreviewTitleFromDocument(documentHtml, `${label} Preview`),
            subtitle: sharedPreviewBlocks ? `${sharedPreviewBlocks.length} linked code blocks` : `${label} sandbox`,
            downloadText: sharedPreviewBlocks ? documentHtml : code,
            downloadName: sharedPreviewBlocks ? "fauna-preview.html" : getCodeDownloadName(lang, kind),
            downloadMime: sharedPreviewBlocks || kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
        });
    };

    const closeAll = () => {
        if (consolePanel) {
            consolePanel.style.display = "none";
            consolePanel.innerHTML = "";
        }
        if (consoleBtn) setActionButtonState(consoleBtn, false, "Hide console", "Console");
        if (terminalPanel) terminalPanel.style.display = "none";
        if (runBtn) setRunButtonState(runBtn, false);
        activeMode = null;
    };

    if (shouldRenderCodeFileCard(wrapper, code)) {
        const fileName = getCodeFileCardName(wrapper, lang, kind);
        const fileCard = createCodeFileCard({
            title: fileName,
            meta: getCodeFileCardMeta(lang, kind, code),
            onOpen: openPreviewBlocks,
            onCopy: button => handleCopyButton(button, code),
            onDownload: () => {
                downloadTextFile(code, fileName || getCodeDownloadName(lang, kind));
                showToast("Download started.", "success");
            }
        });
        wrapper.classList.add("code-file-card-mode");
        header.hidden = true;
        pre.hidden = true;
        wrapper.insertBefore(fileCard, pre);
    }

    const setMarkdownRendered = rendered => {
        if (!markdownPanel || !markdownToggleBtn) return;
        const isFileCardMode = wrapper.classList.contains("code-file-card-mode");
        wrapper.classList.toggle("markdown-rendered", rendered);
        pre.hidden = rendered || isFileCardMode;
        markdownPanel.hidden = !rendered;
        setActionButtonState(markdownToggleBtn, rendered, "Markup", "Render");
        markdownToggleBtn.dataset.tooltip = rendered ? "Show markdown markup" : "Render markdown";
        markdownToggleBtn.setAttribute("aria-label", rendered ? "Show markdown markup" : "Render markdown");
    };

    setMarkdownRendered(false);

    setActionButtonState(wrapBtn, wrapper.classList.contains("code-wrap-enabled"), "Unwrap", "Wrap");
    wrapBtn.onclick = () => {
        const shouldWrap = !wrapper.classList.contains("code-wrap-enabled");
        wrapper.classList.toggle("code-wrap-enabled", shouldWrap);
        setActionButtonState(wrapBtn, shouldWrap, "Unwrap", "Wrap");
    };

    copyBtn.onclick = () => handleCopyButton(copyBtn, code);
    downloadBtn.onclick = () => {
        downloadTextFile(code, getCodeDownloadName(lang, kind));
        showToast("Download started.", "success");
    };

    if (markdownToggleBtn && markdownPanel) {
        markdownToggleBtn.onclick = () => {
            setMarkdownRendered(!wrapper.classList.contains("markdown-rendered"));
            scrollChatToBottom();
        };
    }

    if (runBtn && terminalPanel) {
        runBtn.onclick = () => {
            if (activeMode === "terminal") {
                closeAll();
    scrollChatToBottom();
                return;
            }

            if (!hasWorkspaceBridgeAccess()) {
                showToast("Enable Local Workspace Bridge to run terminal commands.", "warning");
                return;
            }

            closeAll();
            activeMode = "terminal";
            runTerminalCodeBlock(code, terminalPanel, runBtn);
        };
    }

    if (previewBtn) previewBtn.onclick = openPreviewBlocks;

    if (consoleBtn && consolePanel) {
        consoleBtn.onclick = () => {
            if (activeMode === "console") {
                closeAll();
                scrollChatToBottom({ force: true });
                return;
            }

            closeAll();
            executeJsSandboxed(code, consolePanel);
            setActionButtonState(consoleBtn, true, "Hide console", "Console");
            activeMode = "console";
            scrollChatToBottom({ force: true });
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
            scrollChatToBottom();
        }
    };
    
    window.addEventListener('message', onMessage);
    
    const iframeHtml = `
        <!DOCTYPE html>
        <html>
        <body>
            ${getPreviewBootstrapScript()}
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
        wrapCodeBlock(pre, lang, code, kind, isSandboxEnabled, {
            previewBlocks
        });
    });
}

// ===== TOOLS & SETTINGS INTERACTIONS =====
if (toolsBtn && toolsDropdown) {
    toolsBtn.onclick = (e) => {
        e.stopPropagation();
        if (isGenerating || !canUseComposerTools()) {
            toolsDropdown.classList.remove("open");
            if (!isGenerating && !canUseComposerTools()) {
                showToast(`${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`, "warning");
            }
            return;
        }
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
    updatePersonaSettingsUi();
    settingsReturnFocus = document.activeElement instanceof HTMLElement && !settingsModal.contains(document.activeElement)
        ? document.activeElement
        : null;
    settingsModal.hidden = false;
    settingsModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("settings-modal-open");
    scheduleAnimatedSegmentIndicators();
    window.setTimeout(() => settingsCloseBtn?.focus(), 0);
}

function closeSettingsModal() {
    if (!settingsModal || settingsModal.hidden) return;
    closeOpenAiCatalogModal({ returnFocus: false });
    stopVoicePreview();
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && settingsModal.contains(activeElement)) {
        const focusTarget = settingsReturnFocus && document.contains(settingsReturnFocus)
            ? settingsReturnFocus
            : settingsOpenBtn || mobileSettingsOpenBtn || input;
        focusTarget?.focus?.({ preventScroll: true });
        if (document.activeElement === activeElement) {
            activeElement.blur();
        }
    }
    settingsModal.hidden = true;
    settingsModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("settings-modal-open");
    settingsReturnFocus = null;
}

function getSettingsNavButton(paneName) {
    return Array.from(settingsNavButtons).find(button => button.dataset.settingsPane === paneName) || null;
}

function getSettingsPane(paneName) {
    return Array.from(settingsPanes).find(pane => pane.dataset.settingsPanePanel === paneName) || null;
}

function updateOpenAiVoiceSettingsAvailability() {
    const isOpenAiActive = isOpenAiProvider();
    const hasSetup = hasOpenAiVoiceSetup();
    const isReady = isOpenAiActive && hasSetup;
    const reason = getOpenAiVoiceSetupReason();
    const voiceNavButton = getSettingsNavButton("voice");
    const voicePane = getSettingsPane("voice");

    if (voiceNavButton) {
        voiceNavButton.classList.remove("settings-nav-item-muted");
        voiceNavButton.removeAttribute("aria-disabled");
        delete voiceNavButton.dataset.tooltip;
        delete voiceNavButton.dataset.unavailable;
    }

    if (!voicePane) return;
    voicePane.classList.remove("settings-pane-unavailable");
    voicePane.setAttribute("aria-disabled", "false");
    if (voiceSetupNotice) {
        const showSetupNotice = isOpenAiActive && !hasSetup;
        voiceSetupNotice.hidden = !showSetupNotice;
        voiceSetupNotice.textContent = showSetupNotice
            ? `${reason} Local Whisper and voice endpoints remain available through the Local Workspace Bridge.`
            : "";
    }
    delete voicePane.dataset.unavailableReason;

    const openAiVoiceSections = [
        voicePane.querySelector(".voice-picker"),
        openAiRealtimeModelSelectHost?.closest(".settings-row")
    ].filter(Boolean);

    openAiVoiceSections.forEach(section => {
        section.classList.toggle("openai-voice-unavailable", !isReady);
        section.setAttribute("aria-disabled", String(!isReady));
        section.querySelectorAll("button").forEach(button => {
            button.disabled = !isReady;
        });
    });

    if (!isReady) {
        stopVoicePreview();
        openAiRealtimeModelSelect?.close();
    }
}

function setSettingsPane(paneName = "general") {
    const normalized = Array.from(settingsPanes).some(pane => pane.dataset.settingsPanePanel === paneName)
        ? paneName
        : "general";
    updateOpenAiVoiceSettingsAvailability();
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
    if (normalized === "usage") {
        renderUsageSettingsPane();
    }
    scheduleAnimatedSegmentIndicators();
}

[settingsOpenBtn, mobileSettingsOpenBtn].forEach(button => {
    button?.addEventListener("click", () => openSettingsModal());
});

settingsNavButtons.forEach(button => {
    button.addEventListener("click", () => setSettingsPane(button.dataset.settingsPane));
});

settingsModal?.addEventListener("click", event => {
    const usageTab = event.target.closest("[data-usage-view]");
    if (!usageTab) return;
    activeUsageView = usageTab.dataset.usageView || "daily";
    settingsModal.querySelectorAll("[data-usage-view]").forEach(button => {
        const isActive = button === usageTab;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    renderUsageSettingsPane();
});

settingsModal?.addEventListener("click", event => {
    if (event.target.closest("[data-settings-close]")) {
        closeSettingsModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (openAiCatalogModal && !openAiCatalogModal.hidden) {
            if (openAiCatalogFiltersMenu && !openAiCatalogFiltersMenu.hidden) {
                closeOpenAiCatalogFilters();
                return;
            }
            closeOpenAiCatalogModal();
            return;
        }
        closeAttachmentMenu();
        closeLibraryPickerModal();
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

if (toggleApproxLocation) {
    toggleApproxLocation.checked = isApproxLocationEnabled;
    toggleApproxLocation.onchange = (e) => {
        isApproxLocationEnabled = e.target.checked;
    };
}

if (toggleWorkspaceBridge) {
    toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;
    toggleWorkspaceBridge.onchange = (e) => {
        isWorkspaceBridgeEnabled = e.target.checked;
        safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, isWorkspaceBridgeEnabled ? "true" : "false");
        updateWorkspaceBridgeSettingsUi();
        updateProviderSettingsUi();
    };
}

if (toggleMemoryBeta) {
    toggleMemoryBeta.checked = isMemoryEnabled;
    toggleMemoryBeta.onchange = (e) => {
        setMemoryEnabled(e.target.checked);
    };
}

memoryOpenCommandBtn?.addEventListener("click", () => {
    closeSettingsModal();
    if (!input) return;
    input.value = "/memory ";
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    input.focus();
    updateTokenDisplay();
    renderSlashCommandPalette();
});

personaSaveBtn?.addEventListener("click", savePersonaSettings);
personaClearBtn?.addEventListener("click", clearPersonaSettings);
addDirtyStateListeners([personaDisplayNameInput, personaCustomInstructionsInput], updatePersonaSaveButtonState);
addDirtyStateListeners([openAiApiKeyInput], updateOpenAiSaveButtonState);
addDirtyStateListeners([wanEndpointInput, wanWorkflowInput], updateWanSaveButtonState);
addDirtyStateListeners([workspaceBridgeEndpointInput, workspaceBridgeTokenInput], updateWorkspaceBridgeSaveButtonState);
localVoiceTranscriptionEndpointInput?.addEventListener("change", () => {
    persistLocalVoiceInput(
        localVoiceTranscriptionEndpointInput,
        LOCAL_VOICE_TRANSCRIPTION_ENDPOINT_STORAGE_KEY,
        DEFAULT_LOCAL_VOICE_TRANSCRIPTION_ENDPOINT
    );
});
localVoiceTranscriptionModelInput?.addEventListener("change", () => {
    persistLocalVoiceInput(
        localVoiceTranscriptionModelInput,
        LOCAL_VOICE_TRANSCRIPTION_MODEL_STORAGE_KEY,
        DEFAULT_LOCAL_VOICE_TRANSCRIPTION_MODEL
    );
});
localVoiceReplyEndpointInput?.addEventListener("change", () => {
    persistLocalVoiceInput(
        localVoiceReplyEndpointInput,
        LOCAL_VOICE_REPLY_ENDPOINT_STORAGE_KEY,
        DEFAULT_LOCAL_VOICE_REPLY_ENDPOINT
    );
});

ollamaCatalogBtn?.addEventListener("click", openOllamaCatalogModal);
openAiCatalogBtn?.addEventListener("click", () => openOpenAiCatalogModal(AI_PROVIDER_OPENAI));
openAiCatalogCloseBtn?.addEventListener("click", () => closeOpenAiCatalogModal());
openAiCatalogModal?.addEventListener("click", event => {
    if (event.target.closest("[data-openai-catalog-close]")) {
        closeOpenAiCatalogModal();
    }
});
openAiCatalogSearchInput?.addEventListener("input", event => {
    openAiCatalogSearchQuery = event.currentTarget.value || "";
    renderOpenAiCatalog();
});
openAiCatalogSortButtons.forEach(button => {
    button.addEventListener("click", () => {
        openAiCatalogSortMode = button.dataset.openaiCatalogSort || "default";
        renderOpenAiCatalog();
    });
});
openAiCatalogFiltersBtn?.addEventListener("click", event => {
    event.stopPropagation();
    setOpenAiCatalogFiltersOpen(Boolean(openAiCatalogFiltersMenu?.hidden));
});
openAiCatalogFiltersMenu?.addEventListener("click", event => {
    event.stopPropagation();
});
openAiCatalogFiltersMenu?.addEventListener("change", event => {
    const input = event.target instanceof Element
        ? event.target.closest("[data-openai-catalog-filter]")
        : null;
    if (!(input instanceof HTMLInputElement)) return;
    const mode = input.dataset.openaiCatalogFilter;
    if (!Object.prototype.hasOwnProperty.call(openAiCatalogFilters, mode)) return;
    const oppositeMode = mode === "require" ? "exclude" : "require";
    if (input.checked) {
        openAiCatalogFilters[mode].add(input.value);
        openAiCatalogFilters[oppositeMode].delete(input.value);
    } else {
        openAiCatalogFilters[mode].delete(input.value);
    }
    renderOpenAiCatalog();
});
openAiCatalogClearFiltersBtn?.addEventListener("click", event => {
    event.stopPropagation();
    clearOpenAiCatalogFilters();
});
document.addEventListener("click", event => {
    if (!openAiCatalogFiltersMenu || openAiCatalogFiltersMenu.hidden) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const filterWrap = openAiCatalogFiltersBtn?.closest(".model-catalog-filter-wrap");
    if (filterWrap && !filterWrap.contains(target)) {
        closeOpenAiCatalogFilters();
    }
});
openAiCatalogRefreshBtn?.addEventListener("click", () => {
    void refreshOpenAiCatalog({ force: true });
});

if (paramTemp && tempValue) {
    updateAiCallSettingsUi();
    
    paramTemp.oninput = (e) => {
        activeTemperature = normalizeAiTemperature(e.target.value);
        safeLocalStorageSet(AI_TEMPERATURE_STORAGE_KEY, String(activeTemperature));
        updateAiCallSettingsUi();
    };
}

toggleAiStreaming?.addEventListener("change", event => {
    isAiStreamingEnabled = Boolean(event.target.checked);
    safeLocalStorageSet(AI_STREAMING_ENABLED_STORAGE_KEY, isAiStreamingEnabled ? "true" : "false");
    updateAiCallSettingsUi();
});

aiCachingToggle?.addEventListener("click", () => {
    setAiCachingEnabled(!isAiCachingEnabled, { notify: true });
});

maxOutputTokensInput?.addEventListener("change", event => {
    activeMaxOutputTokens = normalizeMaxOutputTokens(event.target.value);
    safeLocalStorageSet(AI_MAX_OUTPUT_TOKENS_STORAGE_KEY, String(activeMaxOutputTokens));
    updateAiCallSettingsUi();
});

topPInput?.addEventListener("change", event => {
    activeTopP = normalizeTopP(event.target.value);
    safeLocalStorageSet(AI_TOP_P_STORAGE_KEY, String(activeTopP));
    updateAiCallSettingsUi();
});

ollamaTopKInput?.addEventListener("change", event => {
    activeOllamaTopK = normalizeOllamaTopK(event.target.value);
    safeLocalStorageSet(OLLAMA_TOP_K_STORAGE_KEY, String(activeOllamaTopK));
    updateAiCallSettingsUi();
});

openAiVerbosityButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (button.disabled) return;
        activeOpenAiVerbosity = normalizeOpenAiVerbosity(button.dataset.aiVerbosity);
        safeLocalStorageSet(OPENAI_VERBOSITY_STORAGE_KEY, activeOpenAiVerbosity);
        updateAiCallSettingsUi();
    });
});

if (typewriterDuration || typewriterDurationNumber || typewriterDurationValue) {
    updateTypewriterDurationUi();

    typewriterDuration?.addEventListener("input", event => {
        setTypewriterDurationSeconds(event.target.value);
    });

    typewriterDurationNumber?.addEventListener("change", event => {
        setTypewriterDurationSeconds(event.target.value);
    });

    typewriterDurationNumber?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            setTypewriterDurationSeconds(event.currentTarget.value);
            event.currentTarget.blur();
        }
    });
}

function updateVoiceQuickUi() {
    applyActiveVoiceOrbTheme();
    if (voiceQuickVoiceLabel && !isOpenAiProvider()) {
        voiceQuickVoiceLabel.textContent = getLocalVoiceReplyModelLabel();
    }
    if (voiceAgentStatus && isRecording) {
        voiceAgentStatus.textContent = voiceDetectedSpeech ? "Listening" : "Waiting for your voice";
    }
    if (voiceReplyToggleBtn) {
        const label = isVoiceReplyEnabled ? "Turn voice replies off" : "Turn voice replies on";
        voiceReplyToggleBtn.classList.toggle("active", isVoiceReplyEnabled);
        voiceReplyToggleBtn.setAttribute("aria-pressed", String(isVoiceReplyEnabled));
        voiceReplyToggleBtn.setAttribute("aria-label", label);
        voiceReplyToggleBtn.dataset.tooltip = label;
        const icon = voiceReplyToggleBtn.querySelector(".voice-reply-icon");
        if (icon) icon.innerHTML = isVoiceReplyEnabled ? VOICE_REPLY_ON_ICON : VOICE_REPLY_OFF_ICON;
    }
    updateVoiceMicToggleUi();
    if (voiceSpeedSlider) {
        voiceSpeedSlider.value = String(activeVoiceSpeed);
    }
    if (voiceSpeedValue) {
        voiceSpeedValue.textContent = `${activeVoiceSpeed.toFixed(1)}x`;
    }
    updateVoiceQuickVoiceAvailability();
    updateVoiceMicChoiceSelection();
    updateVoiceOutputChoiceSelection();
}

function scheduleVoiceQuickPanelLayout() {
    if (!voiceQuickPanel || voiceQuickPanel.hidden) return;
    window.requestAnimationFrame(positionVoiceQuickPanel);
}

function positionVoiceQuickPanel() {
    if (!voiceQuickPanel || voiceQuickPanel.hidden) return;

    const anchorRect = composerPanel?.getBoundingClientRect?.()
        || voiceQuickPanel.parentElement?.getBoundingClientRect?.();
    const availableAbove = anchorRect
        ? Math.floor(anchorRect.top - VOICE_QUICK_PANEL_GAP - VOICE_QUICK_PANEL_VIEWPORT_INSET)
        : VOICE_QUICK_PANEL_MAX_HEIGHT;
    const maxHeight = availableAbove < VOICE_QUICK_PANEL_MIN_HEIGHT
        ? Math.max(1, availableAbove)
        : Math.min(VOICE_QUICK_PANEL_MAX_HEIGHT, availableAbove);

    voiceQuickPanel.style.setProperty("--voice-quick-panel-max-height", `${maxHeight}px`);
    voiceQuickPanel.style.setProperty("--voice-quick-panel-shift-x", "0px");

    const rect = voiceQuickPanel.getBoundingClientRect();
    const viewportRight = window.innerWidth - VOICE_QUICK_PANEL_VIEWPORT_INSET;
    let shiftX = 0;

    if (rect.left < VOICE_QUICK_PANEL_VIEWPORT_INSET) {
        shiftX = VOICE_QUICK_PANEL_VIEWPORT_INSET - rect.left;
    }
    if (rect.right + shiftX > viewportRight) {
        shiftX += viewportRight - (rect.right + shiftX);
    }

    voiceQuickPanel.style.setProperty("--voice-quick-panel-shift-x", `${Math.round(shiftX)}px`);
}

function keepActiveVoiceDeviceChoiceVisible(list) {
    if (!voiceQuickPanel || voiceQuickPanel.hidden || !list) return;
    const activeChoice = list.querySelector(".voice-device-choice.active");
    if (!activeChoice) return;

    const listRect = list.getBoundingClientRect();
    const activeRect = activeChoice.getBoundingClientRect();

    if (activeRect.top < listRect.top) {
        list.scrollTop -= listRect.top - activeRect.top;
    } else if (activeRect.bottom > listRect.bottom) {
        list.scrollTop += activeRect.bottom - listRect.bottom;
    }
}

function isVoiceQuickVoiceSelectionAvailable() {
    return isOpenAiProvider();
}

function updateVoiceQuickVoiceAvailability() {
    const isAvailable = isVoiceQuickVoiceSelectionAvailable();
    const voiceSection = voiceQuickVoiceChoices?.closest(".voice-quick-section");

    voiceSection?.classList.toggle("voice-quick-section-disabled", !isAvailable);
    voiceSection?.setAttribute("aria-disabled", String(!isAvailable));
    voiceQuickVoiceChoices?.setAttribute("aria-disabled", String(!isAvailable));
    voiceQuickVoiceChoices?.setAttribute("aria-label", isAvailable ? "AI voice" : "AI voice (OpenAI only)");

    voiceQuickVoiceChoices?.querySelectorAll("[data-voice-quick-voice]").forEach(button => {
        button.disabled = !isAvailable;
        button.setAttribute("aria-disabled", String(!isAvailable));
    });
}

function renderVoiceQuickSettings() {
    voiceMicToggleBtn?.addEventListener("click", () => {
        setVoiceMicMuted(!isVoiceMicMuted, { notify: true });
    });

    voiceReplyToggleBtn?.addEventListener("click", () => {
        setVoiceReplyEnabled(!isVoiceReplyEnabled, { cue: true });
    });
    voiceSpeedSlider?.addEventListener("input", event => {
        setVoiceSpeed(event.target.value);
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
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshVoiceMicChoices);
}

function openVoiceQuickPanel() {
    if (!voiceQuickPanel || !voiceQuickSettingsBtn) return;
    toolsDropdown?.classList.remove("open");
    updateVoiceQuickVoiceAvailability();
    voiceQuickPanel.hidden = false;
    voiceQuickSettingsBtn.setAttribute("aria-expanded", "true");
    positionVoiceQuickPanel();
    void refreshVoiceMicChoices().finally(scheduleVoiceQuickPanelLayout);
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
    keepActiveVoiceDeviceChoiceVisible(voiceMicChoices);
}

function updateVoiceOutputChoiceSelection() {
    voiceOutputChoices?.querySelectorAll("[data-voice-output]").forEach(button => {
        const isActive = button.dataset.voiceOutput === selectedVoiceOutputDeviceId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });
    keepActiveVoiceDeviceChoiceVisible(voiceOutputChoices);
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
        button.className = "voice-device-choice";
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
    scheduleVoiceQuickPanelLayout();
}

function renderVoiceOutputChoices(devices = []) {
    if (!voiceOutputChoices) return;
    if (!supportsVoiceOutputSelection()) {
        voiceOutputChoices.replaceChildren(createVoiceDeviceNote("Output selection is not supported in this browser."));
        scheduleVoiceQuickPanelLayout();
        return;
    }

    const outputDevices = devices.filter(device => device.kind === "audiooutput");
    const options = [
        { deviceId: "default", label: "Default output" },
        ...outputDevices
            .filter(device => device.deviceId && device.deviceId !== "default")
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Output ${index + 1}`
            }))
    ];

    if (!options.some(option => option.deviceId === selectedVoiceOutputDeviceId)) {
        selectedVoiceOutputDeviceId = "default";
        safeLocalStorageSet(VOICE_OUTPUT_DEVICE_STORAGE_KEY, "default");
    }

    voiceOutputChoices.replaceChildren(...options.map(option => {
        const button = document.createElement("button");
        button.className = "voice-device-choice";
        button.type = "button";
        button.dataset.voiceOutput = option.deviceId;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(option.deviceId === selectedVoiceOutputDeviceId));
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
                <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                <path d="M18.5 5.5a9 9 0 0 1 0 13"></path>
            </svg>
            <span>${escapeHtml(option.label)}</span>
            <svg class="voice-choice-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        `;
        button.addEventListener("click", () => setSelectedVoiceOutput(option.deviceId));
        return button;
    }));
    updateVoiceOutputChoiceSelection();
    scheduleVoiceQuickPanelLayout();
}

function createVoiceDeviceNote(text) {
    const note = document.createElement("div");
    note.className = "voice-device-note";
    note.textContent = text;
    return note;
}

async function refreshVoiceMicChoices() {
    if (!voiceMicChoices && !voiceOutputChoices) return;
    if (!navigator.mediaDevices?.enumerateDevices) {
        renderVoiceMicChoices([]);
        renderVoiceOutputChoices([]);
        return;
    }
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        renderVoiceMicChoices(devices);
        renderVoiceOutputChoices(devices);
    } catch (err) {
        renderVoiceMicChoices([]);
        renderVoiceOutputChoices([]);
    }
}

function updateVoicePickerUi(voice = getOpenAiVoice()) {
    const option = getOpenAiVoiceOption(voice);
    applyActiveVoiceOrbTheme(option.id);
    if (voicePreviewBtn) {
        voicePreviewBtn.setAttribute("aria-label", `Preview ${option.name} voice`);
        voicePreviewBtn.dataset.voicePreview = option.id;
        voicePreviewBtn.classList.toggle("is-active", activeVoicePreviewId === option.id);
    }
    if (voiceNameLabel) voiceNameLabel.textContent = option.name;
    if (voiceDescLabel) voiceDescLabel.textContent = option.description;
    if (voiceQuickVoiceLabel) voiceQuickVoiceLabel.textContent = option.name;
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
    voiceQuickVoiceChoices?.querySelectorAll("[data-voice-quick-voice]").forEach(button => {
        const isActive = button.dataset.voiceQuickVoice === option.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
        if (isActive && voiceQuickPanel && !voiceQuickPanel.hidden) {
            button.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
    });
    updateVoiceQuickVoiceAvailability();
}

function setVoicePreviewButtonState(state = "idle", voiceId = getOpenAiVoice()) {
    if (!voicePreviewBtn) return;
    voicePreviewBtn.dataset.previewState = state;
    voicePreviewBtn.classList.toggle("is-loading", state === "loading");
    voicePreviewBtn.classList.toggle("is-playing", state === "playing");
    voicePreviewBtn.classList.toggle("is-active", state !== "idle" && activeVoicePreviewId === voiceId);
    voicePreviewBtn.setAttribute("aria-pressed", String(state === "playing"));
}

function clearVoicePreviewAudio() {
    if (activeVoicePreviewAudio) {
        activeVoicePreviewAudio.pause();
        activeVoicePreviewAudio.removeAttribute("src");
        activeVoicePreviewAudio.load?.();
    }
    if (activeVoicePreviewUrl) {
        URL.revokeObjectURL(activeVoicePreviewUrl);
    }
    activeVoicePreviewAudio = null;
    activeVoicePreviewUrl = null;
}

function stopVoicePreview({ updateUi = true } = {}) {
    activeVoicePreviewController?.abort();
    activeVoicePreviewController = null;
    clearVoicePreviewAudio();
    activeVoicePreviewId = "";
    if (updateUi) setVoicePreviewButtonState("idle");
}

function getVoicePreviewText(option) {
    return `Hi, I am ${option.name}. This is a quick preview of my voice.`;
}

function getStableSpeechTextHash(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function getOpenAiSpeechCacheKey(inputText, voice = getOpenAiVoice()) {
    const text = sanitizeSpeechText(inputText);
    return [
        "v1",
        getOpenAiSpeechModel(),
        voice,
        text.length,
        getStableSpeechTextHash(text)
    ].join("|");
}

function readOpenAiSpeechCache() {
    const raw = safeLocalStorageGet(OPENAI_SPEECH_CACHE_STORAGE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.warn("Could not parse cached speech audio:", err);
        return {};
    }
}

function getCachedOpenAiSpeechEntry(inputText, voice = getOpenAiVoice()) {
    if (!isAiCachingEnabled) return null;
    const entry = readOpenAiSpeechCache()[getOpenAiSpeechCacheKey(inputText, voice)];
    if (!entry || typeof entry !== "object") return null;
    const mimeType = String(entry.mimeType || "audio/mpeg").trim();
    const dataBase64 = String(entry.dataBase64 || "").trim();
    if (!dataBase64) return null;
    return {
        source: `data:${mimeType};base64,${dataBase64}`,
        waveform: normalizeAssistantTtsWaveform(entry.waveform)
    };
}

function pruneOpenAiSpeechCache(cache) {
    const entries = Object.entries(cache || {})
        .filter(([, entry]) => entry?.dataBase64)
        .sort((a, b) => String(b[1].lastUsedAt || b[1].createdAt || "").localeCompare(String(a[1].lastUsedAt || a[1].createdAt || "")));
    const kept = [];
    let totalChars = 0;
    entries.forEach(([key, entry]) => {
        const size = String(entry.dataBase64 || "").length;
        if (kept.length >= OPENAI_SPEECH_CACHE_MAX_ENTRIES) return;
        if (totalChars + size > OPENAI_SPEECH_CACHE_MAX_CHARS && kept.length > 0) return;
        kept.push([key, entry]);
        totalChars += size;
    });
    return Object.fromEntries(kept);
}

function touchOpenAiSpeechCacheEntry(inputText, voice = getOpenAiVoice()) {
    if (!isAiCachingEnabled) return;
    const cache = readOpenAiSpeechCache();
    const key = getOpenAiSpeechCacheKey(inputText, voice);
    if (!cache[key]) return;
    cache[key] = {
        ...cache[key],
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_SPEECH_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiSpeechCache(cache)));
}

function updateOpenAiSpeechCacheWaveform(inputText, voice, waveform) {
    if (!isAiCachingEnabled) return;
    const normalizedWaveform = normalizeAssistantTtsWaveform(waveform);
    if (!normalizedWaveform.length) return;
    const cache = readOpenAiSpeechCache();
    const key = getOpenAiSpeechCacheKey(inputText, voice);
    if (!cache[key]) return;
    cache[key] = {
        ...cache[key],
        waveform: normalizedWaveform,
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_SPEECH_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiSpeechCache(cache)));
}

function saveOpenAiSpeechCacheEntry(inputText, voice, audioBlob, dataBase64, waveform = []) {
    if (!isAiCachingEnabled) return;
    if (!dataBase64) return;
    const cache = pruneOpenAiSpeechCache(readOpenAiSpeechCache());
    cache[getOpenAiSpeechCacheKey(inputText, voice)] = {
        voice,
        model: getOpenAiSpeechModel(),
        textLength: sanitizeSpeechText(inputText).length,
        mimeType: audioBlob.type || "audio/mpeg",
        dataBase64,
        waveform: normalizeAssistantTtsWaveform(waveform),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_SPEECH_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiSpeechCache(cache)));
}

function getVoicePreviewCacheKey(option) {
    return [
        "v2",
        getOpenAiSpeechModel(),
        option.id,
        getVoicePreviewText(option)
    ].join("|");
}

function readVoicePreviewCache() {
    const raw = safeLocalStorageGet(OPENAI_VOICE_PREVIEW_CACHE_STORAGE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.warn("Could not parse cached voice previews:", err);
        return {};
    }
}

function getCachedVoicePreview(option) {
    if (!isAiCachingEnabled) return "";
    const entry = readVoicePreviewCache()[getVoicePreviewCacheKey(option)];
    if (!entry || typeof entry !== "object") return "";
    const mimeType = String(entry.mimeType || "audio/mpeg").trim();
    const dataBase64 = String(entry.dataBase64 || "").trim();
    return dataBase64 ? `data:${mimeType};base64,${dataBase64}` : "";
}

function pruneVoicePreviewCache(cache) {
    const entries = Object.entries(cache || {})
        .filter(([, entry]) => entry?.dataBase64)
        .sort((a, b) => String(b[1].createdAt || "").localeCompare(String(a[1].createdAt || "")));
    return Object.fromEntries(entries.slice(0, OPENAI_VOICE_OPTIONS.length));
}

function saveVoicePreviewCacheEntry(option, audioBlob, dataBase64) {
    if (!isAiCachingEnabled) return;
    if (!dataBase64) return;
    const cache = pruneVoicePreviewCache(readVoicePreviewCache());
    cache[getVoicePreviewCacheKey(option)] = {
        voice: option.id,
        model: getOpenAiSpeechModel(),
        mimeType: audioBlob.type || "audio/mpeg",
        dataBase64,
        createdAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_VOICE_PREVIEW_CACHE_STORAGE_KEY, JSON.stringify(pruneVoicePreviewCache(cache)));
}

function readOpenAiTranscriptionCache() {
    const raw = safeLocalStorageGet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.warn("Could not parse cached transcriptions:", err);
        return {};
    }
}

function pruneOpenAiTranscriptionCache(cache) {
    const entries = Object.entries(cache || {})
        .filter(([, entry]) => typeof entry?.text === "string" && entry.text.trim())
        .sort((a, b) => String(b[1].lastUsedAt || b[1].createdAt || "").localeCompare(String(a[1].lastUsedAt || a[1].createdAt || "")));
    return Object.fromEntries(entries.slice(0, OPENAI_TRANSCRIPTION_CACHE_MAX_ENTRIES));
}

async function getOpenAiTranscriptionCacheKey(blob) {
    if (!isAiCachingEnabled || !(blob instanceof Blob)) return "";
    try {
        const hash = await getBlobSha256Hex(blob);
        if (!hash) return "";
        return [
            "v1",
            getOpenAiTranscriptionModel(),
            blob.type || "audio/webm",
            blob.size || 0,
            hash
        ].join("|");
    } catch (err) {
        console.warn("Could not hash audio for transcription cache:", err);
        return "";
    }
}

async function getLocalTranscriptionCacheKey(blob) {
    if (!isAiCachingEnabled || !(blob instanceof Blob)) return "";
    try {
        const hash = await getBlobSha256Hex(blob);
        if (!hash) return "";
        return [
            "local-v1",
            getLocalVoiceTranscription(),
            getLocalVoiceTranscriptionEndpoint(),
            getLocalVoiceTranscriptionModel(),
            blob.type || "audio/webm",
            blob.size || 0,
            hash
        ].join("|");
    } catch (err) {
        console.warn("Could not hash audio for local transcription cache:", err);
        return "";
    }
}

function getCachedOpenAiTranscription(cacheKey) {
    if (!isAiCachingEnabled || !cacheKey) return "";
    const cache = readOpenAiTranscriptionCache();
    const entry = cache[cacheKey];
    const text = typeof entry?.text === "string" ? entry.text.trim() : "";
    if (!text) return "";
    cache[cacheKey] = {
        ...entry,
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
    return text;
}

function saveLocalTranscriptionCacheEntry(cacheKey, text, blob) {
    if (!isAiCachingEnabled || !cacheKey || !String(text || "").trim()) return;
    const cache = pruneOpenAiTranscriptionCache(readOpenAiTranscriptionCache());
    cache[cacheKey] = {
        provider: "local",
        engine: getLocalVoiceTranscription(),
        endpoint: getLocalVoiceTranscriptionEndpoint(),
        model: getLocalVoiceTranscriptionModel(),
        type: blob?.type || "audio/webm",
        size: Number(blob?.size || 0) || 0,
        text: String(text || "").trim(),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
}

function saveOpenAiTranscriptionCacheEntry(cacheKey, text, blob) {
    if (!isAiCachingEnabled || !cacheKey || !String(text || "").trim()) return;
    const cache = pruneOpenAiTranscriptionCache(readOpenAiTranscriptionCache());
    cache[cacheKey] = {
        model: getOpenAiTranscriptionModel(),
        type: blob?.type || "audio/webm",
        size: Number(blob?.size || 0) || 0,
        text: String(text || "").trim(),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
}

async function playVoicePreview(voiceId = getOpenAiVoice()) {
    const option = getOpenAiVoiceOption(voiceId);
    if (activeVoicePreviewId === option.id && activeVoicePreviewController) {
        stopVoicePreview();
        return;
    }

    stopVoicePreview({ updateUi: false });
    const controller = new AbortController();
    activeVoicePreviewController = controller;
    activeVoicePreviewId = option.id;
    setVoicePreviewButtonState("loading", option.id);

    try {
        const cachedPreviewUrl = getCachedVoicePreview(option);
        if (cachedPreviewUrl) {
            activeVoicePreviewAudio = new Audio(cachedPreviewUrl);
        } else {
            const res = await openAiSpeechFetch(getVoicePreviewText(option), {
                signal: controller.signal,
                voice: option.id
            });
            throwIfAborted(controller.signal);
            const audioBlob = await res.blob();
            throwIfAborted(controller.signal);
            const dataBase64 = await blobToBase64(audioBlob);
            throwIfAborted(controller.signal);
            saveVoicePreviewCacheEntry(option, audioBlob, dataBase64);
            activeVoicePreviewUrl = URL.createObjectURL(audioBlob);
            activeVoicePreviewAudio = new Audio(activeVoicePreviewUrl);
        }
        setVoicePreviewButtonState("playing", option.id);
        await playAudioElementToEnd(activeVoicePreviewAudio, controller.signal);
    } catch (err) {
        if (err.name !== "AbortError") {
            showToast(`Voice preview failed: ${err.message}`, "error");
        }
    } finally {
        if (activeVoicePreviewController === controller) {
            activeVoicePreviewController = null;
            clearVoicePreviewAudio();
            activeVoicePreviewId = "";
            setVoicePreviewButtonState("idle", option.id);
        }
    }
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

function renderVoiceQuickChoices() {
    if (!voiceQuickVoiceChoices || voiceQuickVoiceChoices.children.length > 0) return;
    OPENAI_VOICE_OPTIONS.forEach(option => {
        const button = document.createElement("button");
        button.className = "voice-quick-voice-choice";
        button.type = "button";
        button.dataset.voiceQuickVoice = option.id;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("aria-label", `${option.name}: ${option.description}`);
        button.innerHTML = `
            <span class="voice-choice-swatch ${option.swatch}" aria-hidden="true"></span>
            <span class="voice-quick-voice-copy">
                <strong>${escapeHtml(option.name)}</strong>
                <small>${escapeHtml(option.description)}</small>
            </span>
        `;
        button.addEventListener("click", () => {
            if (!isVoiceQuickVoiceSelectionAvailable()) return;
            setOpenAiVoice(option.id);
        });
        voiceQuickVoiceChoices.appendChild(button);
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
voicePreviewBtn?.addEventListener("click", event => {
    event.stopPropagation();
    playVoicePreview(getOpenAiVoice());
});
renderVoiceChoices();
renderVoiceQuickChoices();
renderVoiceQuickSettings();
renderOpenAiModelSelects();
renderLocalVoiceModelSelects();
updateLocalVoiceSettingsUi();

document.getElementById("voiceShowMoreBtn")?.addEventListener("click", () => {
    document.getElementById("voiceChoiceWrap")?.classList.add("expanded");
});
document.getElementById("voiceShowLessBtn")?.addEventListener("click", () => {
    document.getElementById("voiceChoiceWrap")?.classList.remove("expanded");
});

function renderLocalModelChoices() {
    updateLocalInstallButton();
    if (!localModelList) return;
    const options = getLocalModelSwitcherOptions();
    localModelList.replaceChildren(...options.map(option => {
        const button = document.createElement("button");
        const installed = isOllamaModelInstalled(option.id);
        const isActive = option.id === OLLAMA_MODEL;
        button.className = "local-model-choice";
        button.type = "button";
        button.dataset.localModel = option.id;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(isActive));
        button.classList.toggle("active", isActive);
        button.classList.toggle("missing", !installed);
        button.classList.toggle("unavailable", option.state === "unavailable");

        const label = document.createElement("span");
        label.className = "local-model-choice-label";
        label.textContent = option.label || option.id;

        const meta = document.createElement("small");
        meta.className = "local-model-choice-meta";
        meta.textContent = option.meta || (installed ? "Installed" : "Missing");

        button.append(label, meta);
        button.addEventListener("click", () => setActiveModel(option.id, { provider: AI_PROVIDER_LOCAL }));
        return button;
    }));
}

async function pullOllamaModel(modelId) {
    const res = await fetch(OLLAMA_PULL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelId, stream: false })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
        throw new Error(data.error || `Ollama responded with HTTP ${res.status}`);
    }
    return data;
}

async function installOllamaWithApproval() {
    const approved = await showApprovalDialog({
        title: "Install Ollama?",
        message: "Fauna could not reach Ollama on this machine. Approve this before installing or opening the Ollama installer.",
        details: [
            "If the local workspace bridge is enabled, Fauna will ask Windows winget to install Ollama.",
            "If the bridge is not available, Fauna will open the official Ollama download page.",
            "No model downloads start until Ollama is reachable and you approve them."
        ],
        confirmLabel: "Approve install"
    });
    if (!approved) return false;

    if (!hasWorkspaceBridgeAccess()) {
        window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
        showToast("Opened the Ollama download page. Start Ollama, then click Install missing again.", "info");
        return false;
    }

    setLocalModelsStatus("Installing Ollama", "missing");
    if (localModelsInstallBtn) localModelsInstallBtn.disabled = true;
    try {
        const command = [
            "$ErrorActionPreference = 'Stop'",
            "if (Get-Command ollama -ErrorAction SilentlyContinue) { ollama --version; exit 0 }",
            "if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'Ollama is not installed and winget is unavailable. Download Ollama from https://ollama.com/download.' }",
            "winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements"
        ].join("; ");
        const result = await runWorkspaceCommand(command, ".", 60);
        if (result.exitCode !== 0) {
            throw new Error((result.stderr || result.stdout || "Ollama installer failed.").trim());
        }
        showToast("Ollama install command finished. Start Ollama if it is not running yet.", "success");
        await checkOllamaStatus();
        return true;
    } catch (err) {
        setLocalModelsStatus("Install failed", "missing");
        showToast(`Ollama install failed: ${err.message}`, "error");
        window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
        return false;
    } finally {
        if (localModelsInstallBtn) localModelsInstallBtn.disabled = false;
    }
}

async function installMissingOllamaModels() {
    if (localModelsInstallBtn) localModelsInstallBtn.disabled = true;
    if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = true;
    try {
        await checkOllamaStatus();
        if (!isOllamaReachable) {
            const installed = await installOllamaWithApproval();
            if (!installed) return;
            await checkOllamaStatus();
            if (!isOllamaReachable) return;
        }

        const missing = REQUIRED_OLLAMA_MODELS.filter(model => !isOllamaModelInstalled(model));
        if (missing.length === 0) {
            setLocalModelsStatus("Ready", "configured");
            showToast("All required Ollama models are installed.", "success");
            return;
        }

        const approved = await showApprovalDialog({
            title: "Install missing models?",
            message: "Fauna will pull the missing Ollama models to this machine. Large models can take a long time and use significant disk space.",
            details: missing.map(model => `Pull ${model}`),
            confirmLabel: "Pull models"
        });
        if (!approved) return;

        for (const modelId of missing) {
            setLocalModelsStatus(`Pulling ${modelId}`, "missing");
            showToast(`Pulling ${modelId} from Ollama...`, "info");
            await pullOllamaModel(modelId);
        }

        await checkOllamaStatus();
        showToast("Missing Ollama models installed.", "success");
    } catch (err) {
        setLocalModelsStatus("Install failed", "missing");
        showToast(`Model install failed: ${err.message}`, "error");
    } finally {
        if (localModelsInstallBtn) localModelsInstallBtn.disabled = false;
        if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = false;
    }
}

function setOpenAiSettingsStatus(text, state = "missing") {
    if (!openAiStatus) return;
    openAiStatus.textContent = text;
    openAiStatus.dataset.state = state;
}

function updateProviderConfigVisibility() {
    providerConfigPanels.forEach(panel => {
        const isActive = normalizeAiProvider(panel.dataset.providerConfig) === activeAiProvider;
        panel.hidden = !isActive;
        panel.setAttribute("aria-hidden", String(!isActive));
    });
}

function updateProviderSettingsUi() {
    const key = getOpenAiApiKey();
    providerChoiceButtons.forEach(button => {
        const isActive = button.dataset.aiProvider === activeAiProvider;
        button.setAttribute("aria-checked", String(isActive));
    });
    scheduleAnimatedSegmentIndicators();
    updateProviderConfigVisibility();

    if (openAiApiKeyInput) openAiApiKeyInput.value = key;
    if (openAiChatModelInput) openAiChatModelInput.value = getOpenAiChatModel();
    if (openAiImageModelInput) openAiImageModelInput.value = getOpenAiImageModel();
    updateOpenAiModelSelects();
    updateLocalVoiceSettingsUi();
    setOpenAiVoice(getOpenAiVoice(), { persist: false });

    if (isOpenAiProvider()) {
        if (!key) {
            setOpenAiSettingsStatus("Key needed", "missing");
            setServiceStatus("offline", "OpenAI key needed");
        } else if (!hasWorkspaceBridgeAccess()) {
            setOpenAiSettingsStatus("Bridge needed", "missing");
            setServiceStatus("offline", "OpenAI bridge needed");
        } else {
            setOpenAiSettingsStatus("Active", "configured");
            setServiceStatus("online", "OpenAI selected");
        }
    } else {
        setOpenAiSettingsStatus(key ? "Saved" : "Local", key ? "configured" : "missing");
        if (!isOllamaReachable) setLocalModelsStatus("Not checked", "missing");
        setServiceStatus("offline", "Ollama local");
    }
    updateOpenAiVoiceSettingsAvailability();
    updateVoiceButtonAvailability();
    updateAiCachingUi();
    updateAiCallSettingsUi();
}

function saveOpenAiSettings() {
    const pending = getPendingOpenAiSettings();
    if (!pending.key) {
        showToast("Paste an OpenAI API key before saving.", "error");
        setOpenAiSettingsStatus("Key needed", "missing");
        return false;
    }

    safeLocalStorageSet(OPENAI_API_KEY_STORAGE_KEY, pending.key);
    safeLocalStorageSet(OPENAI_CHAT_MODEL_STORAGE_KEY, pending.chatModel);
    safeLocalStorageSet(OPENAI_IMAGE_MODEL_STORAGE_KEY, pending.imageModel);
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY, pending.transcriptionModel);
    safeLocalStorageSet(OPENAI_SPEECH_MODEL_STORAGE_KEY, getOpenAiSpeechModel() || DEFAULT_OPENAI_SPEECH_MODEL);
    safeLocalStorageSet(OPENAI_REALTIME_MODEL_STORAGE_KEY, pending.realtimeModel);
    const voiceOption = getOpenAiVoiceOption((openAiVoiceInput?.value || DEFAULT_OPENAI_VOICE).trim().toLowerCase());
    safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, voiceOption.id);
    setOpenAiVoice(voiceOption.id, { persist: false });
    setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
    updateProviderSettingsUi();
    showToast(hasWorkspaceBridgeAccess() ? "OpenAI settings saved." : "OpenAI saved. Enable the local bridge before using it.", hasWorkspaceBridgeAccess() ? "success" : "warning");
    return true;
}

providerChoiceButtons.forEach(button => {
    button.addEventListener("click", () => {
        const provider = normalizeAiProvider(button.dataset.aiProvider);
        setActiveAiProvider(provider, { refreshStatus: false });
        if (provider === AI_PROVIDER_OPENAI && !getOpenAiApiKey()) {
            showToast("Add an OpenAI API key to use this provider.", "warning");
        } else if (provider === AI_PROVIDER_OPENAI && !hasWorkspaceBridgeAccess()) {
            showToast("Enable the Local Workspace Bridge before using OpenAI.", "warning");
        }
    });
});

localModelsRefreshBtn?.addEventListener("click", async () => {
    showToast("Refreshing local Ollama models...", "info");
    await checkOllamaStatus();
});

localModelsInstallBtn?.addEventListener("click", () => {
    installMissingOllamaModels();
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
    safeLocalStorageRemove(OPENAI_REASONING_MODE_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_IMAGE_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_SPEECH_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_REALTIME_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_VOICE_STORAGE_KEY);
    setActiveAiProvider(AI_PROVIDER_LOCAL, { refreshStatus: false });
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
    updateWanSaveButtonState();
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
    updateWorkspaceBridgeSaveButtonState();
    updateVoiceButtonAvailability();
}

workspaceBridgeSaveBtn?.addEventListener("click", () => {
    const endpoint = normalizeEndpointInputValue(workspaceBridgeEndpointInput?.value, DEFAULT_WORKSPACE_BRIDGE_URL);
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
    updateProviderSettingsUi();
    showToast("Workspace bridge saved and enabled.", "success");
});

workspaceBridgeClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY);
    safeLocalStorageRemove(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY);
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "false");
    isWorkspaceBridgeEnabled = false;
    updateWorkspaceBridgeSettingsUi();
    updateProviderSettingsUi();
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
            headers: {
                [WORKSPACE_BRIDGE_TOKEN_HEADER]: token,
                [LEGACY_WORKSPACE_BRIDGE_TOKEN_HEADER]: token
            }
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
    const endpoint = normalizeEndpointInputValue(wanEndpointInput?.value, DEFAULT_WAN_VIDEO_BASE_URL);
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

renderLocalModelChoices();
updateProviderSettingsUi();
updateWanSettingsUi();
updateWorkspaceBridgeSettingsUi();
updateMemorySettingsUi();
updatePersonaSettingsUi();

setChatHistoryCollapsed(isChatHistoryCollapsed, { persist: false });
setArchivedChatHistoryCollapsed(isArchivedChatHistoryCollapsed, { persist: false });
chatHistoryToggle?.addEventListener("click", () => {
    setChatHistoryCollapsed(!isChatHistoryCollapsed);
});
archivedChatToggle?.addEventListener("click", () => {
    setArchivedChatHistoryCollapsed(!isArchivedChatHistoryCollapsed);
});

newChatBtn.onclick = () => startNewChatSession();
focusComposerInput();

// Initialize Token Count visually
updateTokenDisplay();

// ===== VOICE INPUT =====
const MIC_ICON = `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
const STOP_ICON = `<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"></rect>`;

function updateVoiceMicToggleUi() {
    if (!voiceMicToggleBtn) return;
    const label = isVoiceMicMuted ? "Unmute microphone" : "Mute microphone";
    voiceMicToggleBtn.classList.toggle("muted", isVoiceMicMuted);
    voiceMicToggleBtn.setAttribute("aria-pressed", String(isVoiceMicMuted));
    voiceMicToggleBtn.setAttribute("aria-label", label);
    voiceMicToggleBtn.dataset.tooltip = label;
    const icon = voiceMicToggleBtn.querySelector(".voice-listening-icon");
    if (icon) icon.innerHTML = isVoiceMicMuted ? VOICE_MIC_MUTED_ICON : VOICE_MIC_UNMUTED_ICON;
    if (voiceListeningLabel) {
        voiceListeningLabel.textContent = isVoiceMicMuted ? "Microphone muted" : "Listening";
    }
}

function applyVoiceMicMuteState() {
    const trackEnabled = !isVoiceMicMuted;
    voiceMediaStream?.getAudioTracks?.().forEach(track => {
        track.enabled = trackEnabled;
    });
    openAiRealtimePeerConnection?.getSenders?.().forEach(sender => {
        if (sender.track?.kind === "audio") {
            sender.track.enabled = trackEnabled;
        }
    });
}

function setVoiceMicMuted(muted, { notify = false } = {}) {
    isVoiceMicMuted = Boolean(muted);
    applyVoiceMicMuteState();
    updateVoiceMicToggleUi();
    if (notify) {
        void playVoiceSessionCue(isVoiceMicMuted ? "mute" : "unmute");
        showToast(isVoiceMicMuted ? "Microphone muted." : "Microphone unmuted.", isVoiceMicMuted ? "info" : "success");
    }
}

function applyVoiceReplyOutputState() {
    const muted = !isVoiceReplyEnabled;
    [openAiRealtimeAudioElement, activeSpeechAudio].forEach(audio => {
        if (audio) audio.muted = muted;
    });
    if (muted) {
        activeRealtimeSpeechReply?.cancel();
        activeSpeechController?.abort();
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }
}

function setVoiceChatActive(active) {
    const enabled = Boolean(active);
    const wasEnabled = document.body?.classList.contains("voice-chat-active");
    document.body?.classList.toggle("voice-chat-active", enabled);
    inputWrapper?.classList.toggle("voice-chat-active", enabled);
    composerPanel?.classList.toggle("voice-chat-active", enabled);
    if (voiceAgentStage) {
        voiceAgentStage.hidden = !enabled;
        voiceAgentStage.classList.toggle("active", enabled);
    }
    if (enabled) applyActiveVoiceOrbTheme();
    if (voiceChatControls) voiceChatControls.hidden = !enabled;
    if (voiceStopButton) voiceStopButton.hidden = !enabled;
    updateGenerationStopButtonVisibility();
    if (enabled && !wasEnabled) {
        scrollVoiceChatToFocus({ behavior: "auto", force: true });
    }
    if (!enabled) {
        closeVoiceQuickPanel();
        setVoiceMicMuted(false);
        setVoiceActivityLevel(0);
        chat?.style.removeProperty("--voice-chat-turn-padding");
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

function scrollVoiceAssistantIntoView(options = {}) {
    if (!chat || !openAiRealtimeAssistantBubble) return;
    scrollVoiceChatToFocus({ behavior: "smooth", ...options });
}

function mergeRealtimeMessageText(existingText = "", nextText = "") {
    const existing = String(existingText || "").trim();
    const next = String(nextText || "").trim();
    if (!existing) return next;
    if (!next) return existing;
    if (existing === next || existing.endsWith(next)) return existing;
    if (next.startsWith(`${existing}\n`) || next.startsWith(`${existing} `)) return next;
    return `${existing}\n\n${next}`;
}

function getMessageNodeBubble(node) {
    return node?.querySelector?.(".bubble-block > .bubble") || null;
}

function getHistoryIndexForMessageNode(node) {
    return normalizeHistoryIndex(node?.dataset?.historyIndex);
}

function getRealtimeRoleForNodeType(type) {
    return type === "user" ? "user" : "assistant";
}

function getMessageNodeHistoryContent(node, role) {
    const historyIndex = getHistoryIndexForMessageNode(node);
    const message = historyIndex !== null ? conversationHistory[historyIndex] : null;
    if (message?.role === role && typeof message.content === "string") {
        return message.content;
    }
    return getMessageNodeBubble(node)?.textContent || "";
}

function isDirectHistoryMatch(historyIndex, role, source = null) {
    const normalized = normalizeHistoryIndex(historyIndex);
    if (normalized === null || normalized !== conversationHistory.length - 1) return false;
    const message = conversationHistory[normalized];
    if (!message || message.role !== role) return false;
    if (source && message.source !== source) return false;
    return true;
}

function getAdjacentRealtimeMessageTarget(type, beforeNode = null, { source = null } = {}) {
    if (!chat) return null;
    const targetNode = beforeNode?.parentElement === chat
        ? beforeNode.previousElementSibling
        : chat.lastElementChild;
    if (!targetNode?.classList?.contains(`${type}-node`)) return null;
    if (type === "output" && openAiRealtimePendingUserTurn) return null;
    const role = getRealtimeRoleForNodeType(type);
    const historyIndex = getHistoryIndexForMessageNode(targetNode);
    if (historyIndex !== null && !isDirectHistoryMatch(historyIndex, role, source)) {
        return null;
    }
    if (historyIndex === null && conversationHistory.length > 0) {
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (!lastMessage || lastMessage.role !== role || (source && lastMessage.source !== source)) {
            return null;
        }
    }
    const bubble = getMessageNodeBubble(targetNode);
    return bubble ? { node: targetNode, bubble } : null;
}

function clearOpenAiRealtimeUserDraft() {
    openAiRealtimeUserHistoryIndex = null;
    openAiRealtimeUserBubble = null;
    openAiRealtimeUserNode = null;
    openAiRealtimeUserText = "";
    openAiRealtimeUserBaseText = "";
}

function clearOpenAiRealtimeAssistantDraft({ clearCurrent = false } = {}) {
    openAiRealtimeAssistantBubble?.classList?.remove("typewriter-active");
    openAiRealtimeAssistantBubble?.removeAttribute?.("aria-busy");
    openAiRealtimeAssistantHistoryIndex = null;
    openAiRealtimeAssistantBubble = null;
    openAiRealtimeAssistantNode = null;
    openAiRealtimeAssistantText = "";
    openAiRealtimeAssistantBaseText = "";
    openAiRealtimeAssistantRenderedText = "";
    if (clearCurrent) setCurrentVoiceAssistantNode(null);
}

function syncRealtimeAssistantHistoryIndex() {
    if (!openAiRealtimeAssistantNode || openAiRealtimeAssistantHistoryIndex === null) return;
    openAiRealtimeAssistantNode.dataset.historyIndex = String(openAiRealtimeAssistantHistoryIndex);
    const actions = openAiRealtimeAssistantNode.querySelector(".assistant-message-actions");
    if (actions) actions.dataset.messageIndex = String(openAiRealtimeAssistantHistoryIndex);
}

function recordRealtimeUserTranscript(text, { allowMergeWithLastUser = false } = {}) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return null;

    if (openAiRealtimeUserHistoryIndex !== null && isDirectHistoryMatch(openAiRealtimeUserHistoryIndex, "user", "voice")) {
        conversationHistory[openAiRealtimeUserHistoryIndex].content = cleanText;
        if (!conversationHistory[openAiRealtimeUserHistoryIndex].createdAt) {
            conversationHistory[openAiRealtimeUserHistoryIndex].createdAt = new Date().toISOString();
        }
        if (openAiRealtimeAssistantHistoryIndex !== null) saveCurrentSession();
        return openAiRealtimeUserHistoryIndex;
    }
    if (openAiRealtimeUserHistoryIndex !== null) {
        clearOpenAiRealtimeUserDraft();
    }

    const userMessage = {
        role: "user",
        content: cleanText,
        source: "voice",
        createdAt: new Date().toISOString()
    };

    const lastIndex = conversationHistory.length - 1;
    if (allowMergeWithLastUser && isDirectHistoryMatch(lastIndex, "user", "voice")) {
        conversationHistory[lastIndex].content = mergeRealtimeMessageText(conversationHistory[lastIndex].content, cleanText);
        if (!conversationHistory[lastIndex].createdAt) {
            conversationHistory[lastIndex].createdAt = userMessage.createdAt;
        }
        openAiRealtimeUserHistoryIndex = lastIndex;
        saveCurrentSession();
        return openAiRealtimeUserHistoryIndex;
    }

    conversationHistory.push(userMessage);
    openAiRealtimeUserHistoryIndex = conversationHistory.length - 1;
    return openAiRealtimeUserHistoryIndex;
}

function updateRealtimeUserBubble(text) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;
    welcome.style.display = "none";
    chat.style.display = "block";

    const latestChatNode = chat?.lastElementChild || null;
    const isReusableOpenAiUserBubble =
        openAiRealtimeUserBubble instanceof Node &&
        openAiRealtimeUserNode instanceof HTMLElement &&
        openAiRealtimeUserNode === latestChatNode &&
        openAiRealtimeUserNode.classList.contains("user-node");

    if (!isReusableOpenAiUserBubble) {
        openAiRealtimeUserBubble = null;
        openAiRealtimeUserNode = null;
        openAiRealtimeUserBaseText = "";
    }

    const assistantNode = openAiRealtimeAssistantNode?.parentElement === chat
        ? openAiRealtimeAssistantNode
        : null;

    let shouldMergeWithExistingUser = Boolean(openAiRealtimeUserBubble);
    if (!openAiRealtimeUserBubble) {
        const mergeTarget = getAdjacentRealtimeMessageTarget("user", assistantNode, { source: "voice" });
        if (mergeTarget) {
            openAiRealtimeUserBubble = mergeTarget.bubble;
            openAiRealtimeUserNode = mergeTarget.node;
            openAiRealtimeUserBaseText = getMessageNodeHistoryContent(mergeTarget.node, "user");
            shouldMergeWithExistingUser = true;
        }
    }

    const mergedText = mergeRealtimeMessageText(openAiRealtimeUserBaseText, cleanText);
    const recordedHistoryIndex = recordRealtimeUserTranscript(mergedText, {
        allowMergeWithLastUser: shouldMergeWithExistingUser
    });
    if (recordedHistoryIndex === null) return;

    if (openAiRealtimeUserNode && openAiRealtimeUserHistoryIndex !== null) {
        openAiRealtimeUserNode.setAttribute("data-history-index", String(openAiRealtimeUserHistoryIndex));
    }
    const userNodeIsAtInsertionEdge = openAiRealtimeUserNode === latestChatNode
        || Boolean(assistantNode && openAiRealtimeUserNode?.nextElementSibling === assistantNode);
    if (
        openAiRealtimeUserHistoryIndex === null
        || openAiRealtimeUserNode?.getAttribute?.("data-history-index") !== String(openAiRealtimeUserHistoryIndex)
        || !userNodeIsAtInsertionEdge
    ) {
        openAiRealtimeUserBubble = null;
        openAiRealtimeUserNode = null;
        openAiRealtimeUserBaseText = "";
    }

    if (openAiRealtimeUserBubble) {
        openAiRealtimeUserBubble.textContent = mergedText;
        setupUserPromptActions(openAiRealtimeUserBubble.parentElement, mergedText, {
            sentAt: conversationHistory[recordedHistoryIndex]?.createdAt
        });
        openAiRealtimeUserNode?.classList.add("voice-user-prompt");
        if (openAiRealtimeUserHistoryIndex !== null) {
            openAiRealtimeUserNode?.setAttribute("data-history-index", String(openAiRealtimeUserHistoryIndex));
        }
        scrollVoiceChatToFocus({ force: true });
        return;
    }

    openAiRealtimeUserBubble = addRenderNode(mergedText, "user", [], {
        beforeNode: assistantNode,
        createdAt: conversationHistory[recordedHistoryIndex]?.createdAt
    });
    openAiRealtimeUserNode = openAiRealtimeUserBubble.closest(".message-node");
    if (openAiRealtimeUserHistoryIndex !== null) {
        openAiRealtimeUserNode?.setAttribute("data-history-index", String(openAiRealtimeUserHistoryIndex));
    }
    openAiRealtimeUserNode?.classList.add("voice-user-prompt");
    scrollVoiceChatToFocus({ force: true });
}

function ensureOpenAiRealtimeAssistantBubble() {
    if (openAiRealtimeAssistantBubble) {
        const activeNode = openAiRealtimeAssistantBubble.closest?.(".message-node.output-node") || null;
        if (activeNode?.parentElement === chat && activeNode === openAiRealtimeAssistantNode) {
            return openAiRealtimeAssistantBubble;
        }
        clearOpenAiRealtimeAssistantDraft();
    }
    welcome.style.display = "none";
    chat.style.display = "block";
    const mergeTarget = getAdjacentRealtimeMessageTarget("output");
    if (mergeTarget) {
        openAiRealtimeAssistantBubble = mergeTarget.bubble;
        openAiRealtimeAssistantNode = mergeTarget.node;
        openAiRealtimeAssistantBaseText = getMessageNodeHistoryContent(mergeTarget.node, "assistant");
        openAiRealtimeAssistantHistoryIndex = getHistoryIndexForMessageNode(mergeTarget.node);
        if (
            openAiRealtimeAssistantHistoryIndex === null
            && conversationHistory[conversationHistory.length - 1]?.role === "assistant"
        ) {
            openAiRealtimeAssistantHistoryIndex = conversationHistory.length - 1;
            openAiRealtimeAssistantNode.dataset.historyIndex = String(openAiRealtimeAssistantHistoryIndex);
        }
        openAiRealtimeAssistantBubble.parentElement?.querySelector(".assistant-message-actions")?.remove();
        setCurrentVoiceAssistantNode(openAiRealtimeAssistantNode);
        openAiRealtimeAssistantText = "";
        openAiRealtimeAssistantRenderedText = "";
        scrollVoiceAssistantIntoView({ force: true });
        return openAiRealtimeAssistantBubble;
    }

    openAiRealtimeAssistantBubble = addRenderNode("__thinking__", "output");
    openAiRealtimeAssistantNode = openAiRealtimeAssistantBubble.closest(".message-node");
    setCurrentVoiceAssistantNode(openAiRealtimeAssistantNode);
    openAiRealtimeAssistantBaseText = "";
    openAiRealtimeAssistantText = "";
    openAiRealtimeAssistantRenderedText = "";
    openAiRealtimePendingUserTurn = false;
    scrollVoiceAssistantIntoView({ force: true });
    return openAiRealtimeAssistantBubble;
}

function renderOpenAiRealtimeAssistantText(final = false) {
    const bubble = ensureOpenAiRealtimeAssistantBubble();
    const text = mergeRealtimeMessageText(
        openAiRealtimeAssistantBaseText,
        stripAssistantControlBlocks(openAiRealtimeAssistantText || "")
    );
    bubble.classList.remove("tool-activity-bubble", "creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    const containsCodeFence = hasMarkdownCodeFence(text);
    if (final) {
        bubble.classList.remove("typewriter-active");
        bubble.removeAttribute("aria-busy");
        bubble.innerHTML = renderMarkdown(text);
        openAiRealtimeAssistantRenderedText = text;
    } else if (!shouldUseTypewriterMotion() || containsCodeFence) {
        bubble.classList.remove("typewriter-active");
        bubble.setAttribute("aria-busy", "true");
        bubble.innerHTML = renderMarkdown(text);
        openAiRealtimeAssistantRenderedText = text;
    } else {
        bubble.classList.add("typewriter-active");
        bubble.setAttribute("aria-busy", "true");
        const fadeChars = Math.max(1, text.length - openAiRealtimeAssistantRenderedText.length);
        bubble.innerHTML = renderMarkdownWithTypewriterCaret(text, { fadeChars });
        openAiRealtimeAssistantRenderedText = text;
    }
    scrollVoiceAssistantIntoView();
}

function extractOpenAiRealtimeResponseText(response) {
    const directText = extractOpenAiResponseText(response || {});
    if (directText) return directText;

    const chunks = [];
    (response?.output || []).forEach(item => {
        (item?.content || []).forEach(part => {
            if (typeof part?.transcript === "string") chunks.push(part.transcript);
            if (typeof part?.text === "string") chunks.push(part.text);
        });
    });
    return chunks.join("\n").trim();
}

function finalizeOpenAiRealtimeAssistantMessage(finalText = "") {
    const cleanText = stripAssistantControlBlocks(finalText || openAiRealtimeAssistantText || "").trim();
    if (!cleanText || !openAiRealtimeAssistantBubble) {
        openAiRealtimeAssistantBubble = null;
        openAiRealtimeAssistantBaseText = "";
        openAiRealtimeAssistantText = "";
        openAiRealtimeAssistantRenderedText = "";
        openAiRealtimeAssistantNode = null;
        return;
    }

    openAiRealtimeAssistantText = cleanText;
    renderOpenAiRealtimeAssistantText(true);
    const mergedText = mergeRealtimeMessageText(openAiRealtimeAssistantBaseText, cleanText);

    const assistantMessage = {
        role: "assistant",
        content: mergedText,
        model: getOpenAiRealtimeModel(),
        provider: "OpenAI Realtime",
        createdAt: new Date().toISOString()
    };
    if (
        openAiRealtimeAssistantHistoryIndex !== null
        && isDirectHistoryMatch(openAiRealtimeAssistantHistoryIndex, "assistant")
        && conversationHistory[openAiRealtimeAssistantHistoryIndex]?.role === "assistant"
    ) {
        conversationHistory[openAiRealtimeAssistantHistoryIndex] = {
            ...conversationHistory[openAiRealtimeAssistantHistoryIndex],
            content: mergedText,
            model: getOpenAiRealtimeModel(),
            provider: "OpenAI Realtime",
            createdAt: assistantMessage.createdAt
        };
    } else {
        conversationHistory.push(assistantMessage);
        openAiRealtimeAssistantHistoryIndex = conversationHistory.length - 1;
    }
    const assistantIndex = openAiRealtimeAssistantHistoryIndex;
    openAiRealtimeAssistantNode = openAiRealtimeAssistantBubble.closest(".message-node");
    setupCodeSandbox(openAiRealtimeAssistantBubble);
    setupAssistantActions(openAiRealtimeAssistantBubble.parentElement, mergedText, {
        messageIndex: assistantIndex,
        canRegenerate: false,
        canFork: true,
        canSpeak: true
    });
    applyAssistantMemoryRequests(cleanText);
    saveCurrentSession();
    openAiRealtimeAssistantBubble = null;
    openAiRealtimeAssistantBaseText = "";
    openAiRealtimeAssistantText = "";
    openAiRealtimeAssistantRenderedText = "";
    openAiRealtimeAssistantNode = null;
}

function handleOpenAiRealtimeServerEvent(event) {
    if (!event?.type) return;
    if (event.type === "response.done" || event.type.startsWith("response.output_audio") || event.type.startsWith("response.audio")) {
        openAiRealtimeVoiceOutputStarted = true;
    }

    if (event.type === "session.created" || event.type === "session.updated") {
        setVoiceSessionStatus("Listening", 0.18);
        return;
    }

    if (event.type === "input_audio_buffer.speech_started") {
        clearOpenAiRealtimeUserDraft();
        clearOpenAiRealtimeAssistantDraft({ clearCurrent: true });
        openAiRealtimePendingUserTurn = true;
        scrollVoiceChatToFocus({ behavior: "auto", force: true });
        setVoiceSessionStatus("Listening", 0.74);
        return;
    }

    if (event.type === "input_audio_buffer.speech_stopped" || event.type === "input_audio_buffer.committed") {
        setVoiceSessionStatus("Thinking", 0.34);
        void playVoiceSessionCue("thinking", { dedupeMs: 900 });
        return;
    }

    if (event.type === "conversation.item.input_audio_transcription.completed" || event.type === "input_audio_transcription.completed") {
        openAiRealtimeUserText = String(event.transcript || event.text || "").trim();
        updateRealtimeUserBubble(openAiRealtimeUserText);
        return;
    }

    if (event.type === "response.output_audio_transcript.delta" || event.type === "response.output_text.delta") {
        const delta = String(event.delta || "");
        if (!delta) return;
        openAiRealtimeAssistantText += delta;
        renderOpenAiRealtimeAssistantText(false);
        setVoiceSessionStatus("Speaking", 0.48);
        return;
    }

    if (event.type === "response.output_audio_transcript.done" || event.type === "response.output_text.done") {
        const text = String(event.transcript || event.text || "").trim();
        if (text && !openAiRealtimeAssistantText.trim()) {
            openAiRealtimeAssistantText = text;
            renderOpenAiRealtimeAssistantText(false);
        }
        return;
    }

    if (event.type === "response.done") {
        const finalText = extractOpenAiRealtimeResponseText(event.response) || openAiRealtimeAssistantText;
        finalizeOpenAiRealtimeAssistantMessage(finalText);
        setVoiceSessionStatus("Listening", 0.18);
        void playVoiceSessionCue("ready", { dedupeMs: 900 });
        return;
    }

    if (event.type === "error" || event.error) {
        const message = event.error?.message || event.message || "OpenAI Realtime reported an error.";
        showToast(`Realtime voice error: ${message}`, "error");
        setVoiceSessionStatus("Listening", 0.18);
    }
}

function waitForOpenAiRealtimeIceGathering(pc, signal = null) {
    if (!pc || pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(resolve, 1600);
        const cleanup = () => {
            window.clearTimeout(timeout);
            pc.removeEventListener("icegatheringstatechange", onChange);
            signal?.removeEventListener?.("abort", onAbort);
        };
        const onChange = () => {
            if (pc.iceGatheringState === "complete") {
                cleanup();
                resolve();
            }
        };
        const onAbort = () => {
            cleanup();
            reject(new DOMException("Realtime voice stopped", "AbortError"));
        };
        pc.addEventListener("icegatheringstatechange", onChange);
        signal?.addEventListener?.("abort", onAbort, { once: true });
    });
}

async function createOpenAiRealtimeAnswerSdp(localSdp, signal = null) {
    const formData = new FormData();
    formData.append("sdp", localSdp);
    formData.append("session", JSON.stringify(buildOpenAiRealtimeSessionConfig()));

    const res = await openAiFetch("/realtime/calls", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/sdp" },
        signal
    });

    if (!res.ok) {
        throw new Error(await readOpenAiErrorResponse(res));
    }

    const answerSdp = await res.text();
    if (!answerSdp.trim()) {
        throw new Error("OpenAI Realtime returned an empty SDP answer.");
    }
    return answerSdp;
}

function getVoiceCueNotes(kind = "start") {
    switch (kind) {
        case "end":
            return {
                notes: [{ frequency: 660, start: 0 }, { frequency: 392, start: 0.11 }],
                duration: 0.32,
                volume: 0.055,
                type: "sine"
            };
        case "mute":
            return {
                notes: [{ frequency: 520, start: 0 }, { frequency: 330, start: 0.075 }],
                duration: 0.22,
                volume: 0.04,
                type: "triangle"
            };
        case "unmute":
            return {
                notes: [{ frequency: 330, start: 0 }, { frequency: 520, start: 0.075 }],
                duration: 0.22,
                volume: 0.042,
                type: "triangle"
            };
        case "thinking":
            return {
                notes: [{ frequency: 440, start: 0 }, { frequency: 554.37, start: 0.08 }],
                duration: 0.24,
                volume: 0.042,
                type: "sine"
            };
        case "ready":
            return {
                notes: [{ frequency: 523.25, start: 0 }, { frequency: 659.25, start: 0.08 }, { frequency: 783.99, start: 0.16 }],
                duration: 0.34,
                volume: 0.04,
                type: "sine"
            };
        case "start":
        default:
            return {
                notes: [{ frequency: 392, start: 0 }, { frequency: 660, start: 0.11 }],
                duration: 0.32,
                volume: 0.055,
                type: "sine"
            };
    }
}

async function playVoiceSessionCue(kind = "start", { dedupeMs = 0 } = {}) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const now = performance.now();
    if (dedupeMs > 0 && now - (voiceCueLastPlayedAt.get(kind) || 0) < dedupeMs) return;
    voiceCueLastPlayedAt.set(kind, now);

    const { notes, duration, volume, type } = getVoiceCueNotes(kind);

    try {
        const context = new AudioContextConstructor();
        if (typeof context.setSinkId === "function" && getSelectedVoiceOutputSinkId()) {
            await context.setSinkId(getSelectedVoiceOutputSinkId());
        }
        if (context.state === "suspended") {
            await context.resume();
        }

        const masterGain = context.createGain();
        masterGain.gain.setValueAtTime(volume, context.currentTime);
        masterGain.connect(context.destination);

        notes.forEach(({ frequency, start }) => {
            const oscillator = context.createOscillator();
            const noteGain = context.createGain();
            const noteStart = context.currentTime + start;
            const noteEnd = noteStart + 0.16;

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, noteStart);
            noteGain.gain.setValueAtTime(0.0001, noteStart);
            noteGain.gain.exponentialRampToValueAtTime(1, noteStart + 0.018);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
            oscillator.connect(noteGain);
            noteGain.connect(masterGain);
            oscillator.start(noteStart);
            oscillator.stop(noteEnd + 0.02);
        });

        window.setTimeout(() => {
            context.close().catch(() => {});
        }, Math.ceil((duration + 0.08) * 1000));
    } catch (err) {
        console.warn("Could not play voice chat cue:", err);
    }
}

function markOpenAiRealtimeVoiceConnected() {
    if (!isOpenAiVoiceSessionActive || openAiRealtimeSessionConnected) return;
    openAiRealtimeSessionConnected = true;
    void playVoiceSessionCue("start");
}

function cleanupOpenAiRealtimeSession() {
    openAiRealtimeDataChannel?.close?.();
    openAiRealtimeDataChannel = null;
    openAiRealtimePeerConnection?.getSenders?.().forEach(sender => {
        sender.track?.stop?.();
    });
    openAiRealtimePeerConnection?.close?.();
    openAiRealtimePeerConnection = null;
    if (openAiRealtimeAudioElement) {
        openAiRealtimeAudioElement.pause();
        openAiRealtimeAudioElement.srcObject = null;
        openAiRealtimeAudioElement.remove();
    }
    openAiRealtimeAudioElement = null;
    openAiRealtimeAssistantBubble = null;
    openAiRealtimeAssistantNode = null;
    openAiRealtimeUserBubble = null;
    openAiRealtimeUserNode = null;
    openAiRealtimeAssistantText = "";
    openAiRealtimeAssistantBaseText = "";
    openAiRealtimeAssistantRenderedText = "";
    openAiRealtimeUserText = "";
    openAiRealtimeUserBaseText = "";
    openAiRealtimeUserHistoryIndex = null;
    openAiRealtimeAssistantHistoryIndex = null;
    openAiRealtimePendingUserTurn = false;
    openAiRealtimeSessionConnected = false;
    openAiRealtimeVoiceOutputStarted = false;
}

async function startOpenAiRealtimeVoiceSession() {
    if (isOpenAiVoiceSessionActive) return;
    if (!getOpenAiApiKey()) {
        showToast("Add an OpenAI API key before using voice chat.", "error");
        openSettingsModal();
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Enable the Local Workspace Bridge before using OpenAI Realtime.", "error");
        openSettingsModal();
        return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        showToast("OpenAI Realtime voice is not supported in this browser.", "error");
        return;
    }
    if (!(await ensureOpenAiVoiceCostNoticeAccepted())) {
        return;
    }

    isOpenAiVoiceSessionActive = true;
    shouldSpeakNextReply = false;
    openAiRealtimePendingUserTurn = false;
    openAiRealtimeSessionConnected = false;
    openAiRealtimeVoiceOutputStarted = false;
    clearOpenAiVoiceRearmTimer();
    setVoiceSessionStatus("Connecting", 0.28);

    const startupController = new AbortController();
    try {
        const pc = new RTCPeerConnection();
        openAiRealtimePeerConnection = pc;

        openAiRealtimeAudioElement = document.createElement("audio");
        openAiRealtimeAudioElement.autoplay = true;
        openAiRealtimeAudioElement.hidden = true;
        openAiRealtimeAudioElement.muted = !isVoiceReplyEnabled;
        document.body.appendChild(openAiRealtimeAudioElement);
        await applySelectedVoiceOutput(openAiRealtimeAudioElement, { notify: true });
        pc.ontrack = event => {
            openAiRealtimeAudioElement.srcObject = event.streams[0];
        };

        openAiRealtimeDataChannel = pc.createDataChannel("oai-events");
        openAiRealtimeDataChannel.addEventListener("open", () => {
            setVoiceSessionStatus("Listening", 0.18);
            markOpenAiRealtimeVoiceConnected();
        });
        openAiRealtimeDataChannel.addEventListener("message", event => {
            try {
                handleOpenAiRealtimeServerEvent(JSON.parse(event.data));
            } catch (err) {
                console.warn("Could not parse OpenAI Realtime event:", err);
            }
        });
        openAiRealtimeDataChannel.addEventListener("close", () => {
            if (isOpenAiVoiceSessionActive) {
                setVoiceSessionStatus("Disconnected", 0.12);
            }
        });

        pc.addEventListener("connectionstatechange", () => {
            if (pc.connectionState === "connected") {
                markOpenAiRealtimeVoiceConnected();
            }
            if (["failed", "disconnected", "closed"].includes(pc.connectionState) && isOpenAiVoiceSessionActive) {
                stopOpenAiVoiceSession({ silent: true });
                showToast("OpenAI Realtime voice disconnected.", "warning");
            }
        });

        try {
            voiceMediaStream = await navigator.mediaDevices.getUserMedia({ audio: getSelectedVoiceMicConstraints() });
        } catch (err) {
            if (selectedVoiceMicDeviceId === "default") throw err;
            setSelectedVoiceMic("default");
            voiceMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        refreshVoiceMicChoices();
        applyVoiceMicMuteState();
        voiceMediaStream.getAudioTracks().forEach(track => pc.addTrack(track, voiceMediaStream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForOpenAiRealtimeIceGathering(pc, startupController.signal);
        const answerSdp = await createOpenAiRealtimeAnswerSdp(pc.localDescription?.sdp || offer.sdp, startupController.signal);
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        if (pc.connectionState === "connected" || openAiRealtimeDataChannel?.readyState === "open") {
            markOpenAiRealtimeVoiceConnected();
        }
        setSpeechRecognitionState(true, { keepVoiceChatActive: true });
        showToast("Realtime voice chat started.", "success");
    } catch (err) {
        cleanupOpenAiRealtimeSession();
        cleanupVoiceMediaStream();
        setSpeechRecognitionState(false, { keepVoiceChatActive: false });
        isOpenAiVoiceSessionActive = false;
        setVoiceChatActive(false);
        if (err.name !== "AbortError") throw err;
    }
}

function scheduleOpenAiVoiceRearm(delay = OPENAI_VOICE_RELISTEN_DELAY_MS, { cue = false } = {}) {
    clearOpenAiVoiceRearmTimer();
    if (isOpenAiVoiceSessionActive && isOpenAiProvider()) {
        setVoiceSessionStatus("Listening", 0.18);
        if (cue) void playVoiceSessionCue("ready", { dedupeMs: 900 });
    }
}

function stopOpenAiVoiceSession({ silent = false } = {}) {
    const shouldPlayEndCue = openAiRealtimeSessionConnected;
    isOpenAiVoiceSessionActive = false;
    clearOpenAiVoiceRearmTimer();
    shouldSpeakNextReply = false;
    cleanupOpenAiRealtimeSession();

    if (voiceMediaRecorder && voiceMediaRecorder.state !== "inactive") {
        stopOpenAiVoiceRecording({ submit: false });
    } else {
        cleanupVoiceMediaStream();
        setSpeechRecognitionState(false);
    }

    activeRealtimeSpeechReply?.cancel();
    activeRealtimeSpeechReply = null;
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
    if (!silent && shouldPlayEndCue) void playVoiceSessionCue("end");
    if (!silent) showToast("Voice chat stopped.", "info");
}

function setSpeechRecognitionState(recording, { keepVoiceChatActive = isOpenAiVoiceSessionActive && isOpenAiProvider() } = {}) {
    isRecording = recording;
    const isWhisperInput = shouldUseLocalVoiceTranscription();
    if (recording) {
        setVoiceChatActive(true);
        setVoiceActivityLevel(0.18);
        setVoiceListeningText("Listening");
        voiceButton?.classList.add("recording");
        if (voiceBtnIcon) voiceBtnIcon.innerHTML = STOP_ICON;
        voiceButton?.setAttribute("aria-label", isOpenAiProvider() ? "Stop voice chat" : isWhisperInput ? "Stop Whisper recording" : "Stop Recording");
        if (voiceButton) {
            voiceButton.dataset.tooltip = isOpenAiProvider() ? "Stop voice chat" : isWhisperInput ? "Stop Whisper recording" : "Stop recording";
        }
    } else {
        const idleLabel = isOpenAiProvider() ? "OpenAI voice chat" : isWhisperInput ? "Whisper voice input" : "Voice Input";
        if (keepVoiceChatActive) {
            setVoiceChatActive(true);
        } else {
            setVoiceChatActive(false);
        }
        voiceButton?.classList.remove("recording");
        if (voiceBtnIcon) voiceBtnIcon.innerHTML = MIC_ICON;
        if (voiceButton) {
            voiceButton.dataset.tooltip = isOpenAiProvider() ? "OpenAI voice chat" : isWhisperInput ? "Whisper voice input" : "Voice input";
            voiceButton.setAttribute("aria-label", idleLabel);
        }
    }
}

function getBrowserSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function supportsVoiceMediaRecording() {
    return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function supportsOpenAiVoiceRecording() {
    return Boolean(supportsVoiceMediaRecording() && window.RTCPeerConnection);
}

function updateVoiceButtonAvailability() {
    if (!voiceButton) return;
    let canUse = false;
    let label = "Voice Input";
    let tooltip = "Voice input";

    if (isOpenAiProvider()) {
        canUse = supportsOpenAiVoiceRecording();
        label = "OpenAI voice chat";
        tooltip = "OpenAI voice chat";
    } else if (shouldUseLocalVoiceTranscription()) {
        label = "Whisper voice input";
        if (!hasWorkspaceBridgeAccess()) {
            canUse = false;
            tooltip = "Enable Local Workspace Bridge to use Whisper";
        } else if (!supportsVoiceMediaRecording()) {
            canUse = false;
            tooltip = "Voice recording is not supported in this browser";
        } else {
            canUse = true;
            tooltip = "Whisper voice input";
        }
    } else {
        canUse = Boolean(getBrowserSpeechRecognitionConstructor());
    }

    voiceButton.disabled = !canUse;
    if (canUse) {
        voiceButton.dataset.tooltip = tooltip;
        voiceButton.setAttribute("aria-label", label);
    } else {
        voiceButton.dataset.tooltip = tooltip || "Voice input is not supported in this browser";
        voiceButton.setAttribute("aria-label", voiceButton.dataset.tooltip);
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
    const usingOpenAiVoice = isOpenAiProvider();

    if (usingOpenAiVoice && !getOpenAiApiKey()) {
        stopOpenAiVoiceSession({ silent: true });
        showToast("Add an OpenAI API key before using voice chat.", "error");
        openSettingsModal();
        return;
    }

    if (!usingOpenAiVoice && !hasWorkspaceBridgeAccess()) {
        showToast("Enable the Local Workspace Bridge before using Whisper voice input.", "error");
        openSettingsModal();
        return;
    }

    const canRecord = usingOpenAiVoice ? supportsOpenAiVoiceRecording() : supportsVoiceMediaRecording();
    if (!canRecord) {
        stopOpenAiVoiceSession({ silent: true });
        showToast(`${usingOpenAiVoice ? "OpenAI voice recording" : "Whisper voice input"} is not supported in this browser.`, "error");
        return;
    }

    if (isGenerating || activeRequestController || isSpeechPlaybackActive || activeSpeechAudio) {
        if (usingOpenAiVoice) scheduleOpenAiVoiceRearm();
        return;
    }

    isOpenAiVoiceSessionActive = usingOpenAiVoice;
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
        if (!rearm) {
            showToast(
                usingOpenAiVoice
                    ? "Listening. Fauna will send when you pause."
                    : "Listening. Whisper will transcribe when you pause.",
                "info"
            );
        }
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
            if (usingOpenAiVoice) scheduleOpenAiVoiceRearm();
            return;
        }

        try {
            setVoiceSessionStatus("Transcribing", 0.34);
            showToast(usingOpenAiVoice ? "Transcribing voice input..." : "Transcribing with Whisper...", "info");
            const transcript = usingOpenAiVoice
                ? await transcribeOpenAiAudio(new Blob(chunks, { type }))
                : await transcribeLocalAudio(new Blob(chunks, { type }));
            if (!transcript.trim()) {
                if (usingOpenAiVoice) scheduleOpenAiVoiceRearm();
                else setVoiceChatActive(false);
                return;
            }

            isVoiceInputUpdate = true;
            input.value = transcript.trim();
            input.dispatchEvent(new Event("input"));
            isVoiceInputUpdate = false;
            shouldSpeakNextReply = true;
            input.focus();
            if (!isGenerating) {
                setVoiceSessionStatus("Thinking", 0.34);
                void playVoiceSessionCue("thinking", { dedupeMs: 900 });
                await processWorkspaceEntry();
            } else {
                if (usingOpenAiVoice) scheduleOpenAiVoiceRearm();
                else setVoiceChatActive(false);
            }
        } catch (err) {
            showToast(`${usingOpenAiVoice ? "OpenAI voice" : "Whisper voice"} failed: ${err.message}`, "error");
            if (usingOpenAiVoice) scheduleOpenAiVoiceRearm();
            else setVoiceChatActive(false);
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
            shouldSpeakNextReply = true;
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
    const cacheKey = await getOpenAiTranscriptionCacheKey(blob);
    throwIfAborted(signal);
    const cachedTranscript = getCachedOpenAiTranscription(cacheKey);
    if (cachedTranscript) return cachedTranscript;

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
    const transcript = String(data.text || "").trim();
    saveOpenAiTranscriptionCacheEntry(cacheKey, transcript, blob);
    return transcript;
}

function extractLocalTranscript(data) {
    if (!data || typeof data !== "object") return "";
    const message = Array.isArray(data.choices) ? data.choices[0]?.message : null;
    if (typeof message?.content === "string") return message.content.trim();
    if (typeof message?.audio?.transcript === "string") return message.audio.transcript.trim();
    const direct = data.text || data.transcript || data.result || data.output || data.response;
    if (typeof direct === "string") return direct.trim();
    if (Array.isArray(data.segments)) {
        return data.segments
            .map(segment => segment?.text || segment?.transcript || "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
    }
    return "";
}

async function transcribeLocalAudio(blob, signal = null) {
    const cacheKey = await getLocalTranscriptionCacheKey(blob);
    throwIfAborted(signal);
    const cachedTranscript = getCachedOpenAiTranscription(cacheKey);
    if (cachedTranscript) return cachedTranscript;

    const endpoint = getLocalVoiceTranscriptionEndpoint();
    const model = getLocalVoiceTranscriptionModel();
    if (!endpoint) throw new Error("Add a Whisper endpoint in Voice settings.");

    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    if (model) formData.append("model", model);
    formData.append("file", new File([blob], `fauna-voice.${extension}`, { type: blob.type || "audio/webm" }));

    const res = await localAiFetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json,text/plain" },
        body: formData,
        signal
    });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || `Whisper endpoint responded with HTTP ${res.status}`);
    }

    let transcript = "";
    if (/json/i.test(contentType)) {
        const data = await res.json().catch(() => ({}));
        transcript = extractLocalTranscript(data);
    } else {
        transcript = (await res.text().catch(() => "")).trim();
    }
    saveLocalTranscriptionCacheEntry(cacheKey, transcript, blob);
    return transcript;
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
                await startOpenAiRealtimeVoiceSession();
            } else {
                if (shouldUseLocalVoiceTranscription()) {
                    await startOpenAiVoiceRecording();
                } else {
                    startBrowserSpeechRecognition();
                }
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
    const stoppedGeneration = Boolean(activeRequestController);
    activeRequestController?.abort();

    if (isOpenAiProvider()) {
        stopOpenAiVoiceSession({ silent: true });
        showToast(stoppedGeneration ? "Voice chat and generation stopped." : "Voice chat stopped.", "info");
        return;
    }
    if (isRecording) {
        stopVoiceInput({ submit: false });
    }
    setVoiceChatActive(false);
    showToast(stoppedGeneration ? "Voice input and generation stopped." : "Voice input stopped.", "info");
});

function sanitizeSpeechText(text) {
    return String(text || "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#*_>~|-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function findRealtimeSpeechBoundary(text, minChars, maxChars, boundaryPattern) {
    const end = Math.min(text.length, maxChars);
    for (let index = minChars; index < end; index += 1) {
        const char = text[index];
        const next = text[index + 1] || "";
        if (boundaryPattern.test(char) && (!next || /\s/.test(next))) {
            return index + 1;
        }
    }
    return 0;
}

function takeRealtimeSpeechChunk(buffer, force = false) {
    const text = String(buffer || "").replace(/\s+/g, " ").trimStart();
    if (!text.trim()) return null;

    const minChars = force ? 1 : VOICE_REALTIME_SPEECH_MIN_CHARS;
    if (!force && text.length < minChars) return null;

    let cutAt = findRealtimeSpeechBoundary(
        text,
        minChars,
        VOICE_REALTIME_SPEECH_MAX_CHARS,
        /[.!?]/
    );

    if (!cutAt && text.length >= VOICE_REALTIME_SPEECH_SOFT_CHARS) {
        cutAt = findRealtimeSpeechBoundary(
            text,
            minChars,
            VOICE_REALTIME_SPEECH_MAX_CHARS,
            /[,;:]/
        );
    }

    if (!cutAt && text.length >= VOICE_REALTIME_SPEECH_MAX_CHARS) {
        const windowText = text.slice(0, VOICE_REALTIME_SPEECH_MAX_CHARS);
        const spaceIndex = windowText.lastIndexOf(" ");
        cutAt = spaceIndex >= minChars ? spaceIndex : VOICE_REALTIME_SPEECH_MAX_CHARS;
    }

    if (!cutAt && force) cutAt = text.length;
    if (!cutAt) return null;

    const chunk = text.slice(0, cutAt).trim();
    const rest = text.slice(cutAt).trimStart();
    return chunk ? { chunk, rest } : null;
}

function createRealtimeSpeechReply(generationSignal = null) {
    activeRealtimeSpeechReply?.cancel();
    activeSpeechController?.abort();
    activeSpeechAudio?.pause();
    activeSpeechAudio = null;
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    const speechController = new AbortController();
    let pendingSpeech = "";
    let lastRevealLength = 0;
    let playbackQueue = Promise.resolve();
    let finished = false;
    let reportedSpeechError = false;

    const finalize = ({ cueReady = false } = {}) => {
        generationSignal?.removeEventListener?.("abort", onGenerationAbort);
        if (activeSpeechController === speechController) activeSpeechController = null;
        if (activeRealtimeSpeechReply === speechReply) activeRealtimeSpeechReply = null;
        isSpeechPlaybackActive = false;
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            scheduleOpenAiVoiceRearm(undefined, { cue: cueReady });
        }
    };

    const onGenerationAbort = () => {
        speechController.abort();
    };

    const enqueueSpeechChunk = (chunk) => {
        playbackQueue = playbackQueue.then(async () => {
            throwIfAborted(speechController.signal);
            await playRealtimeSpeechSegment(chunk, speechController.signal);
        }).catch(err => {
            if (err.name === "AbortError") return;
            if (!reportedSpeechError) {
                reportedSpeechError = true;
                showToast(`Speech failed: ${err.message}`, "error");
            }
        });
    };

    const flushPendingSpeech = (force = false) => {
        while (!speechController.signal.aborted) {
            const next = takeRealtimeSpeechChunk(pendingSpeech, force);
            if (!next) break;
            pendingSpeech = next.rest;
            enqueueSpeechChunk(next.chunk);
            if (force) continue;
        }
    };

    const speechReply = {
        appendRevealedText(revealedText) {
            if (finished || speechController.signal.aborted) return;
            const text = String(revealedText || "");
            if (text.length < lastRevealLength) {
                lastRevealLength = text.length;
                pendingSpeech = "";
                return;
            }

            const delta = text.slice(lastRevealLength);
            lastRevealLength = text.length;
            const cleanDelta = sanitizeSpeechText(delta);
            if (!cleanDelta) return;

            pendingSpeech = `${pendingSpeech} ${cleanDelta}`.replace(/\s+/g, " ").trimStart();
            flushPendingSpeech(false);
        },
        finish() {
            if (finished) return playbackQueue;
            finished = true;
            flushPendingSpeech(true);
            const done = playbackQueue.finally(() => finalize({ cueReady: true }));
            done.catch(() => {});
            return done;
        },
        cancel() {
            finished = true;
            speechController.abort();
            finalize();
        }
    };

    generationSignal?.addEventListener?.("abort", onGenerationAbort, { once: true });
    activeSpeechController = speechController;
    activeRealtimeSpeechReply = speechReply;
    isSpeechPlaybackActive = true;
    if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        setVoiceSessionStatus("Preparing voice", 0.34);
    }

    return speechReply;
}

async function playRealtimeSpeechSegment(spokenText, signal = null) {
    throwIfAborted(signal);

    if (isOpenAiProvider() && getOpenAiApiKey()) {
        try {
            if (canStreamOpenAiSpeechAudio()) {
                try {
                    await streamOpenAiSpeechAudio(spokenText, signal);
                    return;
                } catch (err) {
                    if (err.name === "AbortError") throw err;
                    if (isWorkspaceBridgeUnavailableError(err)) throw err;
                    console.warn("OpenAI speech streaming failed, falling back to buffered audio:", err);
                }
            }

            await playBufferedOpenAiSpeechAudio(spokenText, signal);
            return;
        } catch (err) {
            if (err.name === "AbortError") throw err;
            console.warn("OpenAI speech failed, falling back to browser speech:", err);
        }
    }

    if (!isOpenAiProvider() && shouldUseLocalVoiceReplyModel()) {
        try {
            await speakReplyWithLocalVoiceModel(spokenText, signal);
            return;
        } catch (err) {
            if (err.name === "AbortError") throw err;
            console.warn("Local voice model failed, falling back to browser speech:", err);
        }
    }

    await speakBrowserSpeechSegment(spokenText, signal);
}

function speakReply(text) {
    activeRealtimeSpeechReply?.cancel();
    const spokenText = sanitizeSpeechText(text);

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

    if (!isOpenAiProvider() && shouldUseLocalVoiceReplyModel()) {
        try {
            await speakReplyWithLocalVoiceModel(spokenText);
            return;
        } catch (err) {
            if (err.name === "AbortError") throw err;
            showToast(`Local voice failed: ${err.message}`, "error");
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
    await applySelectedVoiceOutput(audio, { notify: true });
    await audio.play();
    if (audio.ended) return;
    await waitForAudioElementToEnd(audio, signal);
}

function getLocalVoiceReplyModelId() {
    const model = getLocalVoiceReplyModel();
    if (model === LOCAL_VOICE_REPLY_QWEN3_OMNI) return "Qwen/Qwen3-Omni-30B-A3B-Instruct";
    if (model === LOCAL_VOICE_REPLY_MOSHI) return "moshi";
    return model;
}

function getLocalVoiceReplyModelLabel() {
    return LOCAL_VOICE_REPLY_MODEL_OPTIONS.find(option => option.id === getLocalVoiceReplyModel())?.label || "Local voice";
}

function getBase64AudioBlob(data) {
    if (!data || typeof data !== "object") return null;
    const audio = data.audio && typeof data.audio === "object" ? data.audio : {};
    const messageAudio = Array.isArray(data.choices) && data.choices[0]?.message?.audio
        ? data.choices[0].message.audio
        : {};
    const dataBase64 = data.audioBase64
        || data.audio_base64
        || data.audioData
        || data.audio_data
        || audio.base64
        || audio.data
        || messageAudio.base64
        || messageAudio.data
        || data.data;
    if (!dataBase64 || typeof dataBase64 !== "string") return null;
    const audioFormat = messageAudio.format || audio.format || data.format || "";
    const mimeType = data.mimeType
        || data.mime_type
        || audio.mimeType
        || audio.mime_type
        || messageAudio.mimeType
        || messageAudio.mime_type
        || (audioFormat ? `audio/${audioFormat === "mp3" ? "mpeg" : audioFormat}` : "audio/mpeg");
    return new Blob([base64ToUint8Array(dataBase64)], { type: mimeType });
}

async function getAudioBlobFromLocalVoiceJson(data, signal = null) {
    const base64Blob = getBase64AudioBlob(data);
    if (base64Blob) return base64Blob;

    const audioUrl = data?.audioUrl || data?.audio_url || data?.url;
    if (!audioUrl || typeof audioUrl !== "string") return null;
    if (audioUrl.startsWith("data:")) {
        const res = await fetch(audioUrl, { signal });
        return res.blob();
    }

    const res = await localAiFetch(audioUrl, {
        method: "GET",
        headers: { Accept: "audio/*,application/octet-stream" },
        signal
    });
    if (!res.ok) {
        throw new Error(`Local voice audio URL responded with HTTP ${res.status}`);
    }
    return res.blob();
}

async function playAudioBlob(blob, signal = null) {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    activeSpeechAudio = audio;
    try {
        if (document.body?.classList.contains("voice-chat-active")) {
            setVoiceSessionStatus("Speaking", 0.42);
        }
        await playAudioElementToEnd(audio, signal);
    } finally {
        clearActiveSpeechAudio(audio, audioUrl);
    }
}

async function speakReplyWithLocalVoiceModel(spokenText, signal = null) {
    const endpoint = getLocalVoiceReplyEndpoint();
    if (!endpoint) throw new Error("Add a local voice endpoint in Voice settings.");

    const model = getLocalVoiceReplyModelId();
    const payload = getLocalVoiceReplyModel() === LOCAL_VOICE_REPLY_QWEN3_OMNI
        ? {
            model,
            messages: [{ role: "user", content: spokenText }],
            modalities: ["text", "audio"],
            audio: { format: "mp3" }
        }
        : {
            model,
            input: spokenText,
            text: spokenText,
            voice: model,
            speed: activeVoiceSpeed,
            response_format: "mp3"
        };

    const res = await localAiFetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg,audio/wav,audio/ogg,audio/webm,application/json,text/plain"
        },
        body: JSON.stringify(payload),
        signal
    });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || `${getLocalVoiceReplyModelLabel()} endpoint responded with HTTP ${res.status}`);
    }

    if (/^audio\//i.test(contentType) || /octet-stream/i.test(contentType)) {
        await playAudioBlob(await res.blob(), signal);
        return;
    }

    if (/json/i.test(contentType)) {
        const data = await res.json().catch(() => ({}));
        const audioBlob = await getAudioBlobFromLocalVoiceJson(data, signal);
        if (audioBlob) {
            await playAudioBlob(audioBlob, signal);
            return;
        }
        const fallbackText = extractLocalTranscript(data);
        if (fallbackText) {
            await speakBrowserSpeechSegment(fallbackText, signal);
            return;
        }
    }

    const fallbackText = (await res.text().catch(() => "")).trim();
    if (fallbackText) {
        await speakBrowserSpeechSegment(fallbackText, signal);
        return;
    }

    throw new Error(`${getLocalVoiceReplyModelLabel()} did not return playable audio.`);
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
                if (isWorkspaceBridgeUnavailableError(err)) throw err;
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

async function playCachedOpenAiSpeechAudio(spokenText, { signal = null, player = null, playback = null } = {}) {
    const voice = getOpenAiVoice();
    const cachedEntry = getCachedOpenAiSpeechEntry(spokenText, voice);
    let audioSource = cachedEntry?.source || "";
    let waveform = normalizeAssistantTtsWaveform(cachedEntry?.waveform);
    let shouldRevokeAudioSource = false;
    const cached = Boolean(audioSource);

    if (cached) {
        touchOpenAiSpeechCacheEntry(spokenText, voice);
        if (waveform.length) {
            setAssistantTtsWaveform(player, waveform);
        } else {
            getAudioWaveformFromSource(audioSource)
                .then(levels => {
                    waveform = normalizeAssistantTtsWaveform(levels);
                    if (!waveform.length) return;
                    setAssistantTtsWaveform(player, waveform);
                    updateOpenAiSpeechCacheWaveform(spokenText, voice, waveform);
                })
                .catch(err => console.warn("Could not read cached speech waveform:", err));
        }
    } else {
        setAssistantTtsPlayerState(player, "loading");
        const res = await openAiSpeechFetch(spokenText, { signal, voice });
        throwIfAborted(signal);
        const audioBlob = await res.blob();
        throwIfAborted(signal);
        waveform = await getAudioWaveformFromBlob(audioBlob).catch(err => {
            console.warn("Could not read speech waveform:", err);
            return [];
        });
        throwIfAborted(signal);
        setAssistantTtsWaveform(player, waveform);
        audioSource = URL.createObjectURL(audioBlob);
        shouldRevokeAudioSource = true;
        blobToBase64(audioBlob)
            .then(dataBase64 => saveOpenAiSpeechCacheEntry(spokenText, voice, audioBlob, dataBase64, waveform))
            .catch(err => console.warn("Could not cache speech audio:", err));
    }

    const audio = new Audio(audioSource);
    activeSpeechAudio = audio;
    if (playback) playback.audio = audio;
    const unbindProgress = bindAssistantTtsAudioProgress(player, audio, playback);

    try {
        if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            setVoiceSessionStatus("Speaking", 0.42);
        }
        throwIfAborted(signal);
        await applySelectedVoiceOutput(audio, { notify: true });
        await audio.play();
        setAssistantSpeakButtonState(playback?.button, "playing");
        setAssistantTtsPlayerState(player, "playing", { cached });
        if (audio.ended) return;
        await waitForAudioElementToEnd(audio, signal);
    } finally {
        unbindProgress();
        if (playback?.audio === audio) playback.audio = null;
        clearActiveSpeechAudio(audio);
        if (shouldRevokeAudioSource) URL.revokeObjectURL(audioSource);
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
    await applySelectedVoiceOutput(audio, { notify: true });

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

async function openAiSpeechFetch(inputText, { signal = null, voice = getOpenAiVoice() } = {}) {
    const res = await openAiFetch("/audio/speech", {
        method: "POST",
        signal,
        headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg"
        },
        body: JSON.stringify({
            model: getOpenAiSpeechModel(),
            voice,
            input: inputText,
            response_format: "mp3"
        })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return res;
}

function speakBrowserSpeechSegment(spokenText, signal = null) {
    if (!("speechSynthesis" in window) || !spokenText) return Promise.resolve();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = navigator.language || "en-US";
    utterance.pitch = 1.15;

    const voice = getPreferredVoice();
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || utterance.lang;
    }

    if (isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        setVoiceSessionStatus("Speaking", 0.42);
    }

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            utterance.onend = null;
            utterance.onerror = null;
            signal?.removeEventListener("abort", onAbort);
        };
        const onAbort = () => {
            cleanup();
            window.speechSynthesis.cancel();
            reject(new DOMException("Speech stopped", "AbortError"));
        };
        utterance.onend = () => {
            cleanup();
            resolve();
        };
        utterance.onerror = event => {
            cleanup();
            reject(new Error(event.error || "Browser speech failed."));
        };
        if (signal?.aborted) {
            onAbort();
            return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        window.speechSynthesis.speak(utterance);
    });
}

function speakReplyWithBrowserVoice(spokenText, signal = null) {
    if (!("speechSynthesis" in window) || !spokenText) return Promise.resolve();
    window.speechSynthesis.cancel();
    return speakBrowserSpeechSegment(spokenText, signal);
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
