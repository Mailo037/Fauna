// Original script.js lines 19-1665.
const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const timeGreeting = document.getElementById("timeGreeting");
const inputWrapper = document.querySelector(".input-wrapper");
const composerPanel = document.querySelector(".input-container-floating");
const clarifyingQuestionComposer = document.getElementById("clarifyingQuestionComposer");
const input = document.getElementById("prompt");
const sendButton = document.getElementById("sendButton");
const sendShortcutBadge = sendButton?.querySelector(".shortcut-badge");
const slashCommandPalette = document.getElementById("slashCommandPalette");
const newChatBtn = document.getElementById("newChat");
const newChatProjectMenu = document.getElementById("newChatProjectMenu");
const chatHistoryList = document.getElementById("chatHistoryList");
const chatHistorySection = document.querySelector(".history.sidebar-section");
const chatHistoryToggle = document.getElementById("chatHistoryToggle");
const archivedHistorySection = document.getElementById("archivedHistorySection");
const archivedChatToggle = document.getElementById("archivedChatToggle");
const archivedChatList = document.getElementById("archivedChatList");
const projectListToggle = document.getElementById("projectListToggle");
const addProjectFolderBtn = document.getElementById("addProjectFolderBtn");
const projectSortBtn = document.getElementById("projectSortBtn");
const projectSortMenu = document.getElementById("projectSortMenu");
const projectList = document.getElementById("projectList");
const projectAgentPanel = document.getElementById("projectAgentPanel");
const projectAgentTitle = document.getElementById("projectAgentTitle");
const projectAgentCollapseBtn = document.getElementById("projectAgentCollapseBtn");
const projectAgentExpandBtn = document.getElementById("projectAgentExpandBtn");
const projectAgentResizeHandle = document.getElementById("projectAgentResizeHandle");
const projectAgentTabs = document.getElementById("projectAgentTabs");
const projectPanelMenuTab = document.getElementById("projectPanelMenuTab");
const projectPanelAddTabBtn = document.getElementById("projectPanelAddTabBtn");
const projectPanelTabMenu = document.getElementById("projectPanelTabMenu");
const projectFilesTab = document.getElementById("projectFilesTab");
const projectTerminalTab = document.getElementById("projectTerminalTab");
const projectActivityTab = document.getElementById("projectActivityTab");
const projectPageChatTab = document.getElementById("projectPageChatTab");
const projectMenuPane = document.getElementById("projectMenuPane");
const projectFilesPane = document.getElementById("projectFilesPane");
const projectTerminalPane = document.getElementById("projectTerminalPane");
const projectActivityPane = document.getElementById("projectActivityPane");
const projectPageChatPane = document.getElementById("projectPageChatPane");
const projectPageChatLog = document.getElementById("projectPageChatLog");
const projectPageChatInput = document.getElementById("projectPageChatInput");
const projectPageChatSendBtn = document.getElementById("projectPageChatSendBtn");
const workspaceMenuButtons = document.querySelectorAll("[data-workspace-panel-action]");
const projectExplorerRefreshBtn = document.getElementById("projectExplorerRefreshBtn");
const projectInstructionsBtn = document.getElementById("projectInstructionsBtn");
const projectDiffReviewBtn = document.getElementById("projectDiffReviewBtn");
const projectWorktreeActionBtn = document.getElementById("projectWorktreeActionBtn");
const projectBranchSummary = document.getElementById("projectBranchSummary");
const projectExplorerPath = document.getElementById("projectExplorerPath");
const projectExplorerFilterInput = document.getElementById("projectExplorerFilterInput");
const projectExplorerList = document.getElementById("projectExplorerList");
const projectFileBreadcrumbRoot = document.getElementById("projectFileBreadcrumbRoot");
const projectFileBreadcrumbName = document.getElementById("projectFileBreadcrumbName");
const projectFileEmptyState = document.getElementById("projectFileEmptyState");
const projectFileViewer = document.getElementById("projectFileViewer");
const projectFileRendered = document.getElementById("projectFileRendered");
const projectFileCode = document.getElementById("projectFileCode");
const projectFileMoreBtn = document.getElementById("projectFileMoreBtn");
const projectFileMoreMenu = document.getElementById("projectFileMoreMenu");
const projectFileCopyPathBtn = document.getElementById("projectFileCopyPathBtn");
const projectFileCopyContentBtn = document.getElementById("projectFileCopyContentBtn");
const projectFileToggleExtendedBtn = document.getElementById("projectFileToggleExtendedBtn");
const projectFileToggleWrapBtn = document.getElementById("projectFileToggleWrapBtn");
const projectFileRevealBtn = document.getElementById("projectFileRevealBtn");
const projectCommandInput = document.getElementById("projectCommandInput");
const projectCommandRunBtn = document.getElementById("projectCommandRunBtn");
const projectCommandOutput = document.getElementById("projectCommandOutput");
const agentActivityList = document.getElementById("agentActivityList");
const composerProjectBtn = document.getElementById("composerProjectBtn");
const composerProjectLabel = document.getElementById("composerProjectLabel");
const composerProjectMenu = document.getElementById("composerProjectMenu");
const composerLocalWorkBtn = document.getElementById("composerLocalWorkBtn");
const composerBranchBtn = document.getElementById("composerBranchBtn");
const composerBranchLabel = document.getElementById("composerBranchLabel");
const agentTaskModeBtn = document.getElementById("agentTaskModeBtn");
const agentTaskModeLabel = document.getElementById("agentTaskModeLabel");
const agentTaskModeMenu = document.getElementById("agentTaskModeMenu");
const newNormalChatBtn = document.getElementById("newNormalChatBtn");
const chatTitle = document.getElementById("chatTitle");
const chatTitleInput = document.getElementById("chatTitleInput");
const chatTitleEditBtn = document.getElementById("chatTitleEditBtn");
const appWindowBar = document.getElementById("appWindowBar");
const windowBackBtn = document.getElementById("windowBackBtn");
const windowForwardBtn = document.getElementById("windowForwardBtn");
const windowLocationLabel = document.getElementById("windowLocationLabel");
const changelogMenuWrap = document.getElementById("changelogMenuWrap");
const changelogBtn = document.getElementById("changelogBtn");
const changelogPanel = document.getElementById("changelogPanel");
const changelogSummary = document.getElementById("changelogSummary");
const changelogList = document.getElementById("changelogList");
const windowUpdateBtn = document.getElementById("windowUpdateBtn");
const windowUpdateNotice = document.getElementById("windowUpdateNotice");
const windowUpdateNoticeText = document.getElementById("windowUpdateNoticeText");
const windowUpdateInstallBtn = document.getElementById("windowUpdateInstallBtn");
const modelDownloadMenuWrap = document.getElementById("modelDownloadMenuWrap");
const modelDownloadBtn = document.getElementById("modelDownloadBtn");
const modelDownloadLabel = document.getElementById("modelDownloadLabel");
const modelDownloadCount = document.getElementById("modelDownloadCount");
const modelDownloadMiniBar = document.getElementById("modelDownloadMiniBar");
const modelDownloadPanel = document.getElementById("modelDownloadPanel");
const modelDownloadSummary = document.getElementById("modelDownloadSummary");
const modelDownloadList = document.getElementById("modelDownloadList");
const windowMinimizeBtn = document.getElementById("windowMinimizeBtn");
const windowMaximizeBtn = document.getElementById("windowMaximizeBtn");
const windowCloseBtn = document.getElementById("windowCloseBtn");
const windowWorkspacePanelToggleBtn = document.getElementById("windowSidebarToggleBtn");
const windowWorkspacePanelMaximizeBtn = document.getElementById("windowSidebarMaximizeBtn");
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
const libraryPickerTypeGroup = document.querySelector(".library-picker-type-row");
const libraryPickerSortGroup = document.querySelector(".library-picker-sort-row");
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
const compactModeToggle = document.getElementById("compactModeToggle");
const compactModeStatus = document.getElementById("compactModeStatus");
const temperatureStatus = document.getElementById("temperatureStatus");
const maxOutputTokensInput = document.getElementById("maxOutputTokensInput");
const topPInput = document.getElementById("topPInput");
const ollamaTopKInput = document.getElementById("ollamaTopKInput");
const aiOutputLimitsStatus = document.getElementById("aiOutputLimitsStatus");
const agentMaxStepsAtATimeInput = document.getElementById("agentMaxStepsAtATimeInput");
const agentMaxStepsPerRunInput = document.getElementById("agentMaxStepsPerRunInput");
const agentLoopStatus = document.getElementById("agentLoopStatus");
const contextCompactionStatus = document.getElementById("contextCompactionStatus");
const contextCompactionThreshold = document.getElementById("contextCompactionThreshold");
const contextCompactionThresholdValue = document.getElementById("contextCompactionThresholdValue");
const contextCompactionReviewToggle = document.getElementById("contextCompactionReviewToggle");
const contextCompactionReviewStatus = document.getElementById("contextCompactionReviewStatus");
const contextCompactionRotationLimitInput = document.getElementById("contextCompactionRotationLimitInput");
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
const localModelsStartBtn = document.getElementById("localModelsStartBtn");
const localModelsInstallBtn = document.getElementById("localModelsInstallBtn");
const localModelsAutoStartToggle = document.getElementById("localModelsAutoStartToggle");
const localModelsAutoStartStatus = document.getElementById("localModelsAutoStartStatus");
const localTaskModelsStatus = document.getElementById("localTaskModelsStatus");
const localTaskModelsResetBtn = document.getElementById("localTaskModelsResetBtn");
const localTaskModelsMissingCard = document.getElementById("localTaskModelsMissingCard");
const localTaskModelsMissingSummary = document.getElementById("localTaskModelsMissingSummary");
const localTaskModelsMissingList = document.getElementById("localTaskModelsMissingList");
const localTaskModelsInstallBtn = document.getElementById("localTaskModelsInstallBtn");
const localTaskReasoningModelInput = document.getElementById("localTaskReasoningModelInput");
const localTaskVisionModelInput = document.getElementById("localTaskVisionModelInput");
const localTaskCodeModelInput = document.getElementById("localTaskCodeModelInput");
const localTaskImageModelInput = document.getElementById("localTaskImageModelInput");
const localTaskVideoModelInput = document.getElementById("localTaskVideoModelInput");
const localTaskReasoningModelSelectHost = document.getElementById("localTaskReasoningModelSelectHost");
const localTaskVisionModelSelectHost = document.getElementById("localTaskVisionModelSelectHost");
const localTaskCodeModelSelectHost = document.getElementById("localTaskCodeModelSelectHost");
const localTaskImageModelSelectHost = document.getElementById("localTaskImageModelSelectHost");
const localTaskVideoModelSelectHost = document.getElementById("localTaskVideoModelSelectHost");
const workspaceBridgeEndpointInput = document.getElementById("workspaceBridgeEndpointInput");
const workspaceBridgeTokenInput = document.getElementById("workspaceBridgeTokenInput");
const workspaceBridgeStatus = document.getElementById("workspaceBridgeStatus");
const workspaceBridgeSaveBtn = document.getElementById("workspaceBridgeSaveBtn");
const workspaceBridgeTestBtn = document.getElementById("workspaceBridgeTestBtn");
const workspaceBridgeClearBtn = document.getElementById("workspaceBridgeClearBtn");
const workspaceAccessPolicySection = document.getElementById("workspaceAccessPolicySection");
const workspaceAccessPolicyStatus = document.getElementById("workspaceAccessPolicyStatus");
const workspaceAccessPolicyButtons = document.querySelectorAll("[data-workspace-access-policy]");
const stopButton = document.getElementById("stopButton");
const settingsOpenBtn = document.getElementById("settingsOpenBtn");
const mobileSettingsOpenBtn = document.getElementById("mobileSettingsOpenBtn");
const settingsModal = document.getElementById("settingsModal");
const settingsCloseBtn = document.getElementById("settingsCloseBtn");
const settingsTitle = document.getElementById("settingsTitle");
const settingsNavButtons = document.querySelectorAll("[data-settings-pane]");
const settingsPanes = document.querySelectorAll("[data-settings-pane-panel]");
const keyboardShortcutList = document.getElementById("keyboardShortcutList");
const keyboardShortcutsResetBtn = document.getElementById("keyboardShortcutsResetBtn");
const shortcutRecorderModal = document.getElementById("shortcutRecorderModal");
const shortcutRecorderTitle = document.getElementById("shortcutRecorderTitle");
const shortcutRecorderSubtitle = document.getElementById("shortcutRecorderSubtitle");
const shortcutRecorderKeyCaps = document.getElementById("shortcutRecorderKeyCaps");
const shortcutRecorderHint = document.getElementById("shortcutRecorderHint");
const shortcutRecorderResetBtn = document.getElementById("shortcutRecorderResetBtn");
const shortcutRecorderClearBtn = document.getElementById("shortcutRecorderClearBtn");
const shortcutRecorderSaveBtn = document.getElementById("shortcutRecorderSaveBtn");
const completionNotificationsToggle = document.getElementById("completionNotificationsToggle");
const completionSoundToggle = document.getElementById("completionSoundToggle");
const completionOnlyUnfocusedToggle = document.getElementById("completionOnlyUnfocusedToggle");
const completionBackgroundOnlyToggle = document.getElementById("completionBackgroundOnlyToggle");
const completionSoundVolume = document.getElementById("completionSoundVolume");
const completionSoundVolumeValue = document.getElementById("completionSoundVolumeValue");
const notificationPermissionStatus = document.getElementById("notificationPermissionStatus");
const notificationSettingsStatus = document.getElementById("notificationSettingsStatus");
const notificationPermissionBtn = document.getElementById("notificationPermissionBtn");
const notificationTestBtn = document.getElementById("notificationTestBtn");
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
const localVoiceInstallBtn = document.getElementById("localVoiceInstallBtn");
const appInfoVersion = document.getElementById("appInfoVersion");
const appInfoUpdateStatus = document.getElementById("appInfoUpdateStatus");
const appInfoStorageBackend = document.getElementById("appInfoStorageBackend");
const appInfoAppDataPath = document.getElementById("appInfoAppDataPath");
const appInfoSettingsPath = document.getElementById("appInfoSettingsPath");
const appInfoChatsPath = document.getElementById("appInfoChatsPath");
const appInfoMediaPath = document.getElementById("appInfoMediaPath");
const appInfoOutputPath = document.getElementById("appInfoOutputPath");
const appInfoBridgeEndpoint = document.getElementById("appInfoBridgeEndpoint");
const appInfoWorkspaceAccessPolicy = document.getElementById("appInfoWorkspaceAccessPolicy");
const appInfoChatCount = document.getElementById("appInfoChatCount");
const appInfoStoredKeys = document.getElementById("appInfoStoredKeys");
const appInfoOnboardingBtn = document.getElementById("appInfoOnboardingBtn");
const appCacheClearBtn = document.getElementById("appCacheClearBtn");
const appResetBtn = document.getElementById("appResetBtn");
const potatoModeToggle = document.getElementById("potatoModeToggle");
const potatoModeStatus = document.getElementById("potatoModeStatus");
const potatoModeSummary = document.getElementById("potatoModeSummary");
const potatoApplyPresetBtn = document.getElementById("potatoApplyPresetBtn");
const potatoRestoreDefaultsBtn = document.getElementById("potatoRestoreDefaultsBtn");
const potatoParallelChatsToggle = document.getElementById("potatoParallelChatsToggle");
const potatoMediaGenerationToggle = document.getElementById("potatoMediaGenerationToggle");
const potatoVoiceRepliesToggle = document.getElementById("potatoVoiceRepliesToggle");
const potatoAutoWebContextToggle = document.getElementById("potatoAutoWebContextToggle");
const potatoAutoWorkspaceContextToggle = document.getElementById("potatoAutoWorkspaceContextToggle");
const potatoApproxLocationToggle = document.getElementById("potatoApproxLocationToggle");
const potatoShortOutputsToggle = document.getElementById("potatoShortOutputsToggle");
const potatoTrimHistoryToggle = document.getElementById("potatoTrimHistoryToggle");
const potatoReduceMotionToggle = document.getElementById("potatoReduceMotionToggle");
const onboardingModal = document.getElementById("onboardingModal");
const onboardingDialog = onboardingModal?.querySelector(".onboarding-dialog");
const onboardingStepLabel = document.getElementById("onboardingStepLabel");
const onboardingTitle = document.getElementById("onboardingTitle");
const onboardingSlides = document.querySelectorAll("[data-onboarding-slide]");
const onboardingProviderSetupPanels = document.querySelectorAll("[data-onboarding-provider-setup]");
const onboardingProviderVisuals = document.querySelectorAll("[data-onboarding-provider-visual]");
const onboardingProgress = document.getElementById("onboardingProgress");
const onboardingDots = document.querySelectorAll("[data-onboarding-step]");
const onboardingBackBtn = document.getElementById("onboardingBackBtn");
const onboardingNextBtn = document.getElementById("onboardingNextBtn");
const onboardingFinishBtn = document.getElementById("onboardingFinishBtn");
const onboardingSkipBtn = document.getElementById("onboardingSkipBtn");
const onboardingOllamaStatus = document.getElementById("onboardingOllamaStatus");
const onboardingOpenAiStatus = document.getElementById("onboardingOpenAiStatus");
const onboardingOpenAiApiKeyInput = document.getElementById("onboardingOpenAiApiKeyInput");

let isSandboxEnabled = true;
let isWebSearchEnabled = true;
let isGroundingEnabled = true;
let isGoogleGroundingEnabled = true;
let isApproxLocationEnabled = true;
let isWorkspaceBridgeEnabled = false;
let isMemoryEnabled = false;
let isAiStreamingEnabled = true;
let isCompactModeEnabled = false;
let completionNotificationsEnabled = false;
let completionSoundEnabled = false;
let completionOnlyUnfocused = true;
let completionBackgroundOnly = true;
let completionSoundVolumeLevel = 0.55;
let desktopNotificationClickUnsubscribe = null;
let isOllamaAutoStartEnabled = false;
let activeTemperature = 0.7;
let activeMaxOutputTokens = 0;
let activeTopP = 1;
let activeOllamaTopK = 40;
let activeOpenAiVerbosity = "medium";
let activeAgentMaxStepsAtATime = 4;
let activeAgentMaxStepsPerRun = 16;
let activeContextCompactionThresholdPercent = 70;
let isContextCompactionReviewEnabled = false;
let activeContextCompactionRotationLimit = 2;
let isAiCachingEnabled = false;
let isPotatoModeEnabled = false;
let isPotatoParallelChatsEnabled = true;
let isPotatoAutoWebContextEnabled = true;
let isPotatoAutoWorkspaceContextEnabled = true;
let isPotatoMediaGenerationEnabled = true;
let isPotatoShortOutputsEnabled = false;
let isPotatoTrimHistoryEnabled = false;
let isPotatoReduceMotionEnabled = false;
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

async function writeTextToClipboard(value = "") {
    const text = String(value ?? "");
    const desktopClipboard = window.faunaDesktop?.clipboard?.writeText;
    if (typeof desktopClipboard === "function") {
        const result = await desktopClipboard(text);
        if (result?.ok === false) throw new Error(result.message || "Desktop clipboard failed.");
        return;
    }
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(temp);
    if (!ok) throw new Error("Legacy copy command failed.");
}

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
const FAUNA_APP_VERSION = "0.1.12";
const FAUNA_APP_BUILD_ID = "20260705-chat-tool-ui";
const FAUNA_VERSION_MANIFEST_URL = "version.json";
const FAUNA_REMOTE_VERSION_MANIFEST_URL = "https://raw.githubusercontent.com/Mailo037/Fauna/main/version.json";
const FAUNA_RELEASES_URL = "https://github.com/Mailo037/Fauna/releases/latest";
const FAUNA_CHANGELOG_ENTRIES = [
    {
        version: "0.1.12",
        date: "2026-07-05",
        commit: "v0.1.12",
        title: "Chat tool activity UI cleanup",
        changes: [
            "Removed the left accent gradient from tool-backed assistant answers.",
            "Changed file and website references in Markdown answers from boxed pills to inline accent text.",
            "Opened live tool activity while an answer is running, then collapsed it again after the final response.",
            "Tightened spacing between thinking notes, tool rows, and the final answer in chat."
        ]
    },
    {
        version: "0.1.11",
        date: "2026-07-05",
        commit: "v0.1.11",
        title: "Potato mode, workspace tools, and color previews",
        changes: [
            "Added Potato Mode controls for faster, shorter, more automated local workflows.",
            "Expanded workspace bridge, access policy, and agent loop settings for local project work.",
            "Improved tool activity rendering, command handling, file references, media routing, and compact UI polish.",
            "Added inline color swatches for CSS hex values in AI answers and rendered Markdown files."
        ]
    },
    {
        version: "0.1.10",
        date: "2026-07-05",
        commit: "v0.1.10",
        title: "Workspace tab and tool activity bugfixes",
        changes: [
            "Fixed project chat drafts so empty project chats no longer appear as Current Session rows.",
            "Saved workspace panel state, file tabs, side chats, terminals, and tool activity with each chat.",
            "Reduced tool activity flashing and rendered thinking steps as inline text between tool calls.",
            "Improved project file tree arrows, depth guides, Git-ignored file dimming, file syntax highlighting, and terminal colors."
        ]
    },
    {
        version: "0.1.9",
        date: "2026-07-05",
        commit: "v0.1.9",
        title: "Workspace panel and terminal polish",
        changes: [
            "Made workspace panel tabs duplicable for files, terminal, and side chat workflows.",
            "Moved sidebar project and chat controls into compact text-and-chevron headers.",
            "Added a persistent desktop terminal session inside the workspace panel.",
            "Matched the workspace side-chat composer to the main chat composer controls."
        ]
    },
    {
        version: "0.1.8",
        date: "2026-07-03",
        commit: "v0.1.8",
        title: "Project workspaces and agent tools",
        changes: [
            "Added project folders, project-bound chats, worktree metadata, and a composer project picker.",
            "Added the right workspace panel with files, terminal launch, activity, and page-chat tabs.",
            "Expanded the local workspace bridge with safer desktop agent access controls and command/file tooling.",
            "Improved sidebar, composer, topbar, changelog, shortcut, and Task Models install polish."
        ]
    },
    {
        version: "0.1.7",
        date: "2026-07-03",
        commit: "v0.1.7",
        title: "Changelog, legal info, and download controls",
        changes: [
            "Added a topbar changelog menu generated from the recent desktop commit history.",
            "Added MIT license metadata, legal usage notes, and Settings > Info legal cards.",
            "Added persisted Ollama model download cards with logs, pause, resume, stop, and clear controls.",
            "Collapsed the download chip until hover, focus, open, start, or finish, and kept window controls visible."
        ]
    },
    {
        version: "0.1.6",
        date: "2026-07-03",
        commit: "818f6db",
        title: "Onboarding and Ollama startup flow",
        changes: [
            "Added guided onboarding for choosing local Ollama or OpenAI setup.",
            "Added visible Ollama startup, status checks, and model pull progress in the desktop shell.",
            "Expanded local services settings with voice pipeline and task-model setup controls."
        ]
    },
    {
        version: "0.1.5",
        date: "2026-07-03",
        commit: "06fc421",
        title: "Desktop task routing and release fixes",
        changes: [
            "Improved desktop routing for chats, quick actions, and background task handoff.",
            "Updated realtime voice, model switching, and command pipeline behavior for packaged builds.",
            "Refined update status handling and release metadata."
        ]
    },
    {
        version: "0.1.1",
        date: "2026-07-03",
        commit: "cdae802",
        title: "First release-ready desktop app",
        changes: [
            "Added the frameless desktop window, quick prompt window, persistent AppData storage, and updater wiring.",
            "Moved chats and generated media into desktop-managed files while keeping browser storage fallback.",
            "Added desktop settings, app info, cache reset, local model controls, and workspace bridge improvements."
        ]
    },
    {
        version: "0.1.0",
        date: "2026-07-02",
        commit: "6fedc9a",
        title: "Desktop window bar and agent loop updates",
        changes: [
            "Introduced the custom desktop window bar and window-control integration.",
            "Added agent loop controls and app update metadata for the desktop track.",
            "Prepared the static web app for Electron packaging."
        ]
    }
];
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
const UI_COMPACT_MODE_STORAGE_KEY = "faunaUiCompactMode";
const AI_TEMPERATURE_STORAGE_KEY = "faunaAiTemperature";
const AI_MAX_OUTPUT_TOKENS_STORAGE_KEY = "faunaAiMaxOutputTokens";
const AI_TOP_P_STORAGE_KEY = "faunaAiTopP";
const OLLAMA_TOP_K_STORAGE_KEY = "faunaOllamaTopK";
const OPENAI_VERBOSITY_STORAGE_KEY = "faunaOpenAiVerbosity";
const AGENT_MAX_STEPS_AT_A_TIME_STORAGE_KEY = "faunaAgentMaxStepsAtATime";
const AGENT_MAX_STEPS_PER_RUN_STORAGE_KEY = "faunaAgentMaxStepsPerRun";
const CONTEXT_COMPACTION_THRESHOLD_STORAGE_KEY = "faunaContextCompactionThresholdPercent";
const CONTEXT_COMPACTION_REVIEW_STORAGE_KEY = "faunaContextCompactionReviewEnabled";
const CONTEXT_COMPACTION_ROTATION_LIMIT_STORAGE_KEY = "faunaContextCompactionRotationLimit";
const POTATO_MODE_ENABLED_STORAGE_KEY = "faunaPotatoModeEnabled";
const POTATO_PARALLEL_CHATS_STORAGE_KEY = "faunaPotatoParallelChatsEnabled";
const POTATO_AUTO_WEB_CONTEXT_STORAGE_KEY = "faunaPotatoAutoWebContextEnabled";
const POTATO_AUTO_WORKSPACE_CONTEXT_STORAGE_KEY = "faunaPotatoAutoWorkspaceContextEnabled";
const POTATO_MEDIA_GENERATION_STORAGE_KEY = "faunaPotatoMediaGenerationEnabled";
const POTATO_SHORT_OUTPUTS_STORAGE_KEY = "faunaPotatoShortOutputsEnabled";
const POTATO_TRIM_HISTORY_STORAGE_KEY = "faunaPotatoTrimHistoryEnabled";
const POTATO_REDUCE_MOTION_STORAGE_KEY = "faunaPotatoReduceMotionEnabled";
const POTATO_SHORT_OUTPUT_MAX_TOKENS = 1024;
const POTATO_MAX_CHAT_SESSIONS = 12;
const LOCAL_TASK_REASONING_MODEL_STORAGE_KEY = "faunaLocalTaskReasoningModel";
const LOCAL_TASK_VISION_MODEL_STORAGE_KEY = "faunaLocalTaskVisionModel";
const LOCAL_TASK_CODE_MODEL_STORAGE_KEY = "faunaLocalTaskCodeModel";
const LOCAL_TASK_IMAGE_MODEL_STORAGE_KEY = "faunaLocalTaskImageModel";
const LOCAL_TASK_VIDEO_MODEL_STORAGE_KEY = "faunaLocalTaskVideoModel";
const OLLAMA_AUTO_START_STORAGE_KEY = "faunaOllamaAutoStart";
const ONBOARDING_COMPLETED_STORAGE_KEY = "faunaOnboardingCompletedVersion";
const ONBOARDING_VERSION = "20260704-onboarding-v2";
const MODEL_DOWNLOAD_TASKS_STORAGE_KEY = "faunaModelDownloadTasks";
const MODEL_DOWNLOAD_MAX_PERSISTED_TASKS = 8;
const MODEL_DOWNLOAD_MAX_LOG_LINES = 80;
const MODEL_DOWNLOAD_START_PEEK_MS = 5200;
const MODEL_DOWNLOAD_FINISH_PEEK_MS = 9000;
const COMPLETION_NOTIFICATIONS_ENABLED_STORAGE_KEY = "faunaCompletionNotificationsEnabled";
const COMPLETION_SOUND_ENABLED_STORAGE_KEY = "faunaCompletionSoundEnabled";
const COMPLETION_ONLY_UNFOCUSED_STORAGE_KEY = "faunaCompletionOnlyUnfocused";
const COMPLETION_BACKGROUND_ONLY_STORAGE_KEY = "faunaCompletionBackgroundOnly";
const COMPLETION_SOUND_VOLUME_STORAGE_KEY = "faunaCompletionSoundVolume";
const DESKTOP_FILE_URL_RE = /^(?:fauna-app|fauna-file|file):\/\//i;
const STREAM_RENDER_THROTTLE_MS = 45;
const CHAT_AUTO_SCROLL_THRESHOLD = 96;
const CHAT_INITIAL_RENDER_COUNT = 24;
const CHAT_HISTORY_RENDER_BATCH_SIZE = 16;
const CHAT_HISTORY_PRELOAD_SCROLL_PX = 220;
const CHAT_RENDER_WINDOW_MAX_COUNT = 72;
const CHAT_RENDER_WINDOW_TARGET_COUNT = 48;
const CHAT_RENDER_WINDOW_VISIBLE_BUFFER_PX = 420;
const CHAT_RENDER_WINDOW_ESTIMATED_MESSAGE_HEIGHT_PX = 126;
const CONTEXT_COMPACTION_MESSAGE_TYPE = "context_compaction";
const DEFAULT_CONTEXT_COMPACTION_THRESHOLD_PERCENT = 70;
const MIN_CONTEXT_COMPACTION_THRESHOLD_PERCENT = 10;
const MAX_CONTEXT_COMPACTION_THRESHOLD_PERCENT = 80;
const DEFAULT_CONTEXT_COMPACTION_ROTATION_LIMIT = 2;
const MIN_CONTEXT_COMPACTION_ROTATION_LIMIT = 1;
const MAX_CONTEXT_COMPACTION_ROTATION_LIMIT = 6;
const CONTEXT_COMPACTION_KEEP_RECENT_MESSAGES = 8;
const CONTEXT_COMPACTION_AGGRESSIVE_KEEP_RECENT_MESSAGES = 4;
const CONTEXT_COMPACTION_MIN_HISTORY_MESSAGES = 6;
const CONTEXT_COMPACTION_LOCAL_DEFAULT_CONTEXT = 8192;
const CONTEXT_COMPACTION_OPENAI_DEFAULT_CONTEXT = 128000;
const PROMPT_TIMELINE_MIN_PROMPTS = 5;
const PROMPT_TIMELINE_MAX_ITEMS = 16;
const PROMPT_TIMELINE_PROMPT_PREVIEW_CHARS = 96;
const PROMPT_TIMELINE_RESPONSE_PREVIEW_CHARS = 132;
const COMPOSER_DRAFT_SAVE_DEBOUNCE_MS = 220;
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

function getFaunaDesktopApi() {
    const api = globalThis.faunaDesktop;
    return api?.isDesktop ? api : null;
}

function isFaunaDesktopApp() {
    return Boolean(getFaunaDesktopApi());
}

function normalizeHeadersForDesktopOllama(headers = {}) {
    if (headers instanceof Headers) {
        const normalized = {};
        headers.forEach((value, key) => {
            normalized[key] = value;
        });
        return normalized;
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers.map(([key, value]) => [String(key), String(value)]));
    }
    return Object.fromEntries(
        Object.entries(headers || {})
            .filter(([key, value]) => key && value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
    );
}

function decodeDesktopOllamaBody(bodyBase64 = "") {
    const binary = window.atob(String(bodyBase64 || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

async function desktopOllamaFetch(url, options = {}) {
    const desktopApi = getFaunaDesktopApi();
    if (!desktopApi?.ollamaFetch) {
        throw new Error("Desktop Ollama bridge is unavailable.");
    }
    if (options.signal?.aborted) {
        throw new DOMException("Ollama request cancelled", "AbortError");
    }

    const result = await desktopApi.ollamaFetch({
        url,
        method: options.method || "GET",
        headers: normalizeHeadersForDesktopOllama(options.headers),
        bodyText: options.body === undefined || options.body === null ? "" : String(options.body),
        timeoutMs: options.desktopTimeoutMs || 0
    });

    if (options.signal?.aborted) {
        throw new DOMException("Ollama request cancelled", "AbortError");
    }

    return new Response(decodeDesktopOllamaBody(result?.bodyBase64), {
        status: Math.max(200, Math.min(599, Number(result?.status) || 502)),
        statusText: result?.statusText || "",
        headers: result?.headers || {}
    });
}

async function ollamaFetch(url, options = {}) {
    try {
        return await fetch(url, options);
    } catch (err) {
        if (err?.name === "AbortError") throw err;
        if (!getFaunaDesktopApi()?.ollamaFetch) throw err;
        return desktopOllamaFetch(url, options);
    }
}

async function getDesktopOllamaStatus() {
    try {
        return await getFaunaDesktopApi()?.getOllamaStatus?.();
    } catch {
        return null;
    }
}

function compareSemanticVersions(a, b) {
    const left = String(a || "").split(/[.-]/).map(part => Number.parseInt(part, 10));
    const right = String(b || "").split(/[.-]/).map(part => Number.parseInt(part, 10));
    const length = Math.max(left.length, right.length, 3);
    for (let index = 0; index < length; index += 1) {
        const leftValue = Number.isFinite(left[index]) ? left[index] : 0;
        const rightValue = Number.isFinite(right[index]) ? right[index] : 0;
        if (leftValue !== rightValue) return leftValue > rightValue ? 1 : -1;
    }
    return 0;
}

function isManifestNewer(manifest = {}) {
    const remoteVersion = String(manifest.version || "").trim();
    const remoteBuild = String(manifest.buildId || manifest.build || "").trim();
    if (remoteVersion && compareSemanticVersions(remoteVersion, FAUNA_APP_VERSION) > 0) return true;
    return Boolean(remoteBuild && remoteBuild !== FAUNA_APP_BUILD_ID);
}

function getWindowLocationText() {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) return "Library";
    const title = String(chatTitle?.textContent || getActiveSession?.()?.title || "").trim();
    return title || "Current Session";
}

function updateWindowBarLocation() {
    if (windowLocationLabel) {
        windowLocationLabel.textContent = getWindowLocationText();
    }
}

let webNavigationStack = [window.location.href];
let webNavigationIndex = 0;

function syncWebNavigationStack() {
    const href = window.location.href;
    if (webNavigationStack[webNavigationIndex] === href) return;

    const previousIndex = webNavigationStack.lastIndexOf(href, webNavigationIndex - 1);
    if (previousIndex !== -1) {
        webNavigationIndex = previousIndex;
        return;
    }

    const nextIndex = webNavigationStack.indexOf(href, webNavigationIndex + 1);
    if (nextIndex !== -1) {
        webNavigationIndex = nextIndex;
        return;
    }

    webNavigationStack = webNavigationStack.slice(0, webNavigationIndex + 1);
    webNavigationStack.push(href);
    webNavigationIndex = webNavigationStack.length - 1;
}

function applyWindowNavigationState(state = null) {
    if (isFaunaDesktopApp() && state) {
        if (windowBackBtn) windowBackBtn.disabled = !state.canGoBack;
        if (windowForwardBtn) windowForwardBtn.disabled = !state.canGoForward;
        return;
    }

    syncWebNavigationStack();
    if (windowBackBtn) windowBackBtn.disabled = webNavigationIndex <= 0;
    if (windowForwardBtn) windowForwardBtn.disabled = webNavigationIndex >= webNavigationStack.length - 1;
}

async function refreshDesktopNavigationState() {
    const state = await getFaunaDesktopApi()?.navigation?.getState?.();
    applyWindowNavigationState(state);
}

function setWindowMaximizedState(isMaximized) {
    document.body?.classList.toggle("desktop-window-maximized", Boolean(isMaximized));
    if (windowMaximizeBtn) {
        const label = isMaximized ? "Restore" : "Maximize";
        windowMaximizeBtn.setAttribute("aria-label", label);
        windowMaximizeBtn.dataset.tooltip = label;
    }
}

function setWindowUpdateUi(state = {}, { manual = false } = {}) {
    const status = state?.status || "idle";
    const message = state?.message || "";
    const isBusy = ["checking", "downloading", "installing"].includes(status);
    const hasNotice = ["available", "downloading", "downloaded", "installing", "error"].includes(status);

    if (windowUpdateBtn) {
        windowUpdateBtn.disabled = isBusy;
        windowUpdateBtn.setAttribute("aria-busy", String(isBusy));
        windowUpdateBtn.dataset.updateStatus = status;
        windowUpdateBtn.dataset.tooltip = message || "Check updates";
    }

    if (windowUpdateNotice) {
        windowUpdateNotice.hidden = !hasNotice;
    }
    if (windowUpdateNoticeText) {
        windowUpdateNoticeText.textContent = message || "Update available";
    }
    if (windowUpdateInstallBtn) {
        windowUpdateInstallBtn.hidden = !["available", "downloaded"].includes(status);
        windowUpdateInstallBtn.disabled = isBusy;
        windowUpdateInstallBtn.textContent = status === "downloaded"
            ? "Install"
            : isFaunaDesktopApp() ? "Download" : "Reload";
    }

    if (manual) {
        if (status === "current") showToast("Fauna is up to date.", "success");
        else if (status === "dev") showToast(message || "Update checks run in packaged builds.", "info");
        else if (status === "error") showToast(`Update check failed: ${message}`, "error");
        else if (status === "available") showToast(message || "Update available.", "info");
        else if (status === "downloaded") showToast("Update ready to install.", "success");
    }
}

async function checkWebAppUpdate({ manual = false } = {}) {
    setWindowUpdateUi({ status: "checking", message: "Checking for updates..." });
    try {
        const fetchManifest = async (sourceUrl) => {
            const url = new URL(sourceUrl, window.location.href);
            url.searchParams.set("t", String(Date.now()));
            const response = await fetch(url, { cache: "no-store", credentials: "omit" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        };
        let manifest;
        try {
            manifest = await fetchManifest(FAUNA_REMOTE_VERSION_MANIFEST_URL);
        } catch (remoteError) {
            console.warn("Remote update manifest was unavailable:", remoteError);
            manifest = await fetchManifest(FAUNA_VERSION_MANIFEST_URL);
        }
        if (isManifestNewer(manifest)) {
            setWindowUpdateUi({
                status: "available",
                message: manifest.version ? `Version ${manifest.version} is available` : "Update available",
                canInstall: true,
                availableVersion: manifest.version || "",
                releaseUrl: manifest.releaseUrl || FAUNA_RELEASES_URL
            }, { manual });
        } else {
            setWindowUpdateUi({
                status: "current",
                message: "Fauna is up to date",
                canInstall: false
            }, { manual });
        }
    } catch (error) {
        setWindowUpdateUi({
            status: "error",
            message: error?.message || "Update check failed",
            canInstall: false
        }, { manual });
    }
}

async function checkFaunaAppUpdate({ manual = false } = {}) {
    const desktopUpdates = getFaunaDesktopApi()?.updates;
    if (desktopUpdates?.check) {
        const state = await desktopUpdates.check();
        setWindowUpdateUi(state, { manual });
        return;
    }
    await checkWebAppUpdate({ manual });
}

async function installFaunaAppUpdate() {
    const desktopUpdates = getFaunaDesktopApi()?.updates;
    if (desktopUpdates?.install) {
        const state = await desktopUpdates.install();
        setWindowUpdateUi(state);
        return;
    }
    window.location.reload();
}

function closeChangelogMenu() {
    if (!changelogPanel || !changelogBtn) return;
    changelogPanel.hidden = true;
    changelogBtn.setAttribute("aria-expanded", "false");
}

function openChangelogMenu() {
    if (!changelogPanel || !changelogBtn) return;
    renderChangelogMenu();
    changelogPanel.hidden = false;
    changelogBtn.setAttribute("aria-expanded", "true");
}

function renderChangelogMenu() {
    if (!changelogList) return;
    if (changelogSummary) {
        changelogSummary.textContent = `${FAUNA_CHANGELOG_ENTRIES.length} recent desktop releases`;
    }
    changelogList.replaceChildren(...FAUNA_CHANGELOG_ENTRIES.map((entry, index) => {
        const article = document.createElement("article");
        article.className = "changelog-entry";

        const header = document.createElement("header");
        header.className = "changelog-entry-head";
        const toggle = document.createElement("button");
        toggle.className = "changelog-entry-toggle";
        toggle.type = "button";
        const detailsId = `changelogDetails-${String(entry.version || index).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", detailsId);
        const titleWrap = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = `Fauna ${entry.version}`;
        const subtitle = document.createElement("small");
        subtitle.textContent = `${entry.date} - ${entry.commit}`;
        titleWrap.append(title, subtitle);
        const badge = document.createElement("span");
        badge.className = "changelog-entry-summary";
        badge.textContent = entry.title;
        const chevron = document.createElement("svg");
        chevron.className = "changelog-entry-chevron";
        chevron.setAttribute("viewBox", "0 0 24 24");
        chevron.setAttribute("fill", "none");
        chevron.setAttribute("stroke", "currentColor");
        chevron.setAttribute("stroke-width", "2.2");
        chevron.setAttribute("stroke-linecap", "round");
        chevron.setAttribute("stroke-linejoin", "round");
        chevron.setAttribute("aria-hidden", "true");
        chevron.innerHTML = '<path d="m9 18 6-6-6-6"></path>';
        toggle.append(titleWrap, badge, chevron);
        header.append(toggle);

        const list = document.createElement("ul");
        list.className = "changelog-change-list";
        list.id = detailsId;
        list.hidden = true;
        entry.changes.forEach(change => {
            const item = document.createElement("li");
            item.textContent = change;
            list.appendChild(item);
        });

        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            article.classList.toggle("expanded", !expanded);
            list.hidden = expanded;
        });

        article.append(header, list);
        return article;
    }));
}

function initializeWindowBar() {
    if (!appWindowBar) return;
    const desktopApi = getFaunaDesktopApi();
    document.body?.classList.toggle("desktop-app", Boolean(desktopApi));
    updateWindowBarLocation();
    applyWindowNavigationState();

    windowBackBtn?.addEventListener("click", () => {
        if (desktopApi?.navigation?.back) {
            void desktopApi.navigation.back().then(applyWindowNavigationState);
            return;
        }
        if (webNavigationIndex > 0) window.history.back();
    });
    windowForwardBtn?.addEventListener("click", () => {
        if (desktopApi?.navigation?.forward) {
            void desktopApi.navigation.forward().then(applyWindowNavigationState);
            return;
        }
        if (webNavigationIndex < webNavigationStack.length - 1) window.history.forward();
    });
    windowUpdateBtn?.addEventListener("click", () => {
        windowUpdateBtn.classList.remove("window-update-pulse");
        void windowUpdateBtn.offsetWidth;
        windowUpdateBtn.classList.add("window-update-pulse");
        window.setTimeout(() => windowUpdateBtn?.classList.remove("window-update-pulse"), 620);
        void checkFaunaAppUpdate({ manual: true });
    });
    windowUpdateInstallBtn?.addEventListener("click", () => {
        void installFaunaAppUpdate();
    });
    changelogBtn?.addEventListener("click", event => {
        event.stopPropagation();
        if (changelogPanel?.hidden) openChangelogMenu();
        else closeChangelogMenu();
    });

    if (desktopApi) {
        windowMinimizeBtn?.addEventListener("click", () => void desktopApi.window?.minimize?.());
        windowMaximizeBtn?.addEventListener("click", () => void desktopApi.window?.toggleMaximize?.());
        windowCloseBtn?.addEventListener("click", () => void desktopApi.window?.close?.());
        desktopApi.window?.getState?.().then(state => setWindowMaximizedState(state?.isMaximized));
        desktopApi.window?.onStateChanged?.(state => setWindowMaximizedState(state?.isMaximized));
        desktopApi.navigation?.getState?.().then(applyWindowNavigationState);
        desktopApi.navigation?.onChanged?.(applyWindowNavigationState);
        desktopApi.updates?.getState?.().then(setWindowUpdateUi);
        desktopApi.updates?.onStatus?.(setWindowUpdateUi);
    }

    window.addEventListener("popstate", () => {
        window.setTimeout(() => applyWindowNavigationState(), 0);
    });
    window.addEventListener("hashchange", () => {
        window.setTimeout(() => applyWindowNavigationState(), 0);
    });

    window.setTimeout(() => {
        void checkFaunaAppUpdate({ manual: false });
    }, 2200);
}

function defineHiddenFileValue(file, key, value) {
    if (!(file instanceof File) || !value) return;
    try {
        Object.defineProperty(file, key, {
            value,
            enumerable: false,
            configurable: true
        });
    } catch {
        file[key] = value;
    }
}

function prepareDesktopFileReference(file) {
    const api = getFaunaDesktopApi();
    if (!api || !(file instanceof File)) return { path: "", url: "" };

    const existingPath = String(file.__faunaDesktopFilePath || "").trim();
    const existingUrl = String(file.__faunaDesktopPreviewSrc || "").trim();
    if (existingPath && existingUrl) return { path: existingPath, url: existingUrl };

    const filePath = existingPath || api.getFilePath?.(file) || "";
    const previewUrl = filePath ? api.filePathToUrl?.(filePath) || "" : "";
    defineHiddenFileValue(file, "__faunaDesktopFilePath", filePath);
    defineHiddenFileValue(file, "__faunaDesktopPreviewSrc", previewUrl);
    return { path: filePath, url: previewUrl };
}

function getDesktopFilePreviewSource(file) {
    const existing = String(file?.__faunaDesktopPreviewSrc || "").trim();
    if (existing) return existing;
    return prepareDesktopFileReference(file).url;
}

function isDesktopFileMediaSource(src) {
    return DESKTOP_FILE_URL_RE.test(String(src || "").trim());
}

function getGeneratedMediaExtensionFromUrl(url, fallback = "") {
    const value = String(url || "").split(/[?#]/)[0];
    const match = value.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : fallback;
}

function ensureDesktopArtifactChatSessionId() {
    if (!isFaunaDesktopApp()) return activeSessionId || getActiveSession?.()?.id || "";

    let session = getActiveSession?.() || null;
    if (!session && activeChatHasContent?.()) {
        session = typeof createChatSessionForCurrentDraft === "function"
            ? createChatSessionForCurrentDraft()
            : createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
        clearPendingProjectChatRoot?.();
        updateActiveChatTitle?.();
        if (activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
            updateWorkspaceUrlFragment?.({ replace: true });
        }
    }
    return session?.id || activeSessionId || "unassigned-chat";
}

async function persistGeneratedMediaSource(sourceUrl, {
    kind = "media",
    prompt = "",
    label = "",
    extension = "",
    mimeType = "",
    chatId = ""
} = {}) {
    const api = getFaunaDesktopApi();
    const value = String(sourceUrl || "").trim();
    if (!api || !value || isDesktopFileMediaSource(value)) return value;

    try {
        const result = await api.saveGeneratedMedia?.({
            sourceUrl: value,
            chatId: chatId || ensureDesktopArtifactChatSessionId(),
            kind,
            prompt,
            label,
            extension: extension || getGeneratedMediaExtensionFromUrl(value, kind === "image" ? "png" : ""),
            mimeType
        });
        return result?.url || value;
    } catch (err) {
        console.warn("Could not save generated media to AppData:", err);
        return value;
    }
}

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
const OPENAI_VOICE_IDLE_TIMEOUT_MS = 5000;
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
let isPromptSubmissionPending = false;
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
let isVoiceStartPending = false;
let openAiRealtimeIdleMonitorTimer = null;
let openAiRealtimeLastAudioAt = 0;
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
const activeGenerationRecords = new Map();
const completedGenerationSessionIds = new Set();
let activeCodeWorkbench = null;
let codeWorkbenchLoadTimer = null;
let codeWorkbenchEditTimer = null;
let codeWorkbenchLoadToken = 0;
const modelDownloadTasks = new Map();
const modelDownloadAbortControllers = new Map();
let modelDownloadCloseTimer = null;
let modelDownloadPeekTimer = null;
let expandedModelDownloadTaskId = "";
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
let localTaskReasoningModelSelect = null;
let localTaskVisionModelSelect = null;
let localTaskCodeModelSelect = null;
let localTaskImageModelSelect = null;
let localTaskVideoModelSelect = null;
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
let chatRenderWindowStart = 0;
let chatRenderWindowEnd = 0;
let chatRenderWindowSessionId = "";
let isChatInitialRenderSettling = false;
let hasChatUserScrolledSinceRender = false;
let isChatHistoryPrepending = false;
let isChatHistoryAppending = false;
let isChatHistoryPruning = false;
let chatRenderWindowPruneFrame = 0;
let chatRenderHeightCacheSessionId = "";
let chatRenderAverageMessageHeight = CHAT_RENDER_WINDOW_ESTIMATED_MESSAGE_HEIGHT_PX;
const chatRenderHeightCache = new Map();
let composerDraftSaveTimer = null;
let composerDraftRestoreToken = 0;
let isRestoringComposerDraft = false;

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

function updateComposerAttachmentLayoutState() {
    const hasAttachments = Boolean(
        attachedFiles.length > 0
        || previewContainer?.children?.length
        || previewContainer?.textContent?.trim()
    );
    inputWrapper?.classList.toggle("has-attachments", hasAttachments);
    composerPanel?.classList.toggle("has-attachments", hasAttachments);
    return hasAttachments;
}

function updateComposerChatContentLayoutState() {
    const hasChatContent = Boolean(chat?.children.length);
    inputWrapper?.classList.toggle("has-chat-content", hasChatContent);
    composerPanel?.classList.toggle("has-chat-content", hasChatContent);
    return hasChatContent;
}

function scheduleComposerSafeAreaUpdate({ scroll = false, force = false } = {}) {
    updateComposerAttachmentLayoutState();
    updateComposerChatContentLayoutState();
    window.requestAnimationFrame(() => {
        updateComposerAttachmentLayoutState();
        updateComposerChatContentLayoutState();
        updateComposerSafeArea();
        if (scroll) {
            scrollChatToBottom({ force, behavior: "auto" });
        }
    });
}

function scrollChatToBottom({ force = false, behavior = "auto" } = {}) {
    if (!chat) return;
    if (!force && !isChatPinnedToBottom && !isChatNearBottom()) return;

    if (behavior === "auto") {
        chat.scrollTop = chat.scrollHeight;
    } else {
        chat.scrollTo({
            top: chat.scrollHeight,
            behavior
        });
    }
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
    setAnimatedSegmentIndicator(libraryPickerTypeGroup, libraryPickerTypeGroup?.querySelector(".library-picker-chip.active"));
    setAnimatedSegmentIndicator(libraryPickerSortGroup, libraryPickerSortGroup?.querySelector(".library-picker-chip.active"));
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
    [libraryFilterGroup, libraryLayoutGroup, libraryPickerTypeGroup, libraryPickerSortGroup, openAiCatalogSortGroup, providerSegment].forEach(group => {
        if (group) segmentResizeObserver.observe(group);
    });
}

chat?.addEventListener("scroll", () => {
    updateChatAutoScrollState();
    if (typeof loadOlderChatMessagesIfNeeded === "function") {
        loadOlderChatMessagesIfNeeded();
    }
    if (typeof loadNewerChatMessagesIfNeeded === "function") {
        loadNewerChatMessagesIfNeeded();
    }
    if (typeof scheduleChatRenderWindowPrune === "function") {
        scheduleChatRenderWindowPrune();
    }
}, { passive: true });

function markChatUserScrollIntent() {
    hasChatUserScrolledSinceRender = true;
}

chat?.addEventListener("wheel", markChatUserScrollIntent, { passive: true });
chat?.addEventListener("touchmove", markChatUserScrollIntent, { passive: true });
chat?.addEventListener("pointerdown", markChatUserScrollIntent, { passive: true });
document.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        markChatUserScrollIntent();
    }
}, { passive: true });
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

if (previewContainer && "MutationObserver" in window) {
    new MutationObserver(() => scheduleComposerSafeAreaUpdate()).observe(previewContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });
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

function showToast(message, type = "info", options = {}) {
    if (!toastRegion) return;
    if (type && typeof type === "object") {
        options = type;
        type = options.type || "info";
    }
    const normalizedType = ["success", "error", "warning", "info"].includes(type) ? type : "info";
    const requestedDuration = Number(options.duration);
    const toastDuration = Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.max(1800, Math.min(30000, requestedDuration))
        : normalizedType === "error" ? 5200 : 3600;
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
    let actionButton = null;
    iconPath?.setAttribute("d", iconPaths[normalizedType]);
    if (title) title.textContent = titles[normalizedType];
    if (messageNode) messageNode.textContent = message;
    if (options.actionLabel && typeof options.onAction === "function" && messageNode) {
        actionButton = document.createElement("button");
        actionButton.type = "button";
        actionButton.className = "toast-action";
        actionButton.textContent = String(options.actionLabel);
        messageNode.after(actionButton);
    }

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

    actionButton?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        try {
            options.onAction(event);
        } finally {
            dismiss();
        }
    });

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
        if (event.button !== 0 || close?.contains(event.target) || event.target?.closest?.(".toast-action")) return;

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

function getModelDownloadTaskId(modelId) {
    return `ollama:${String(modelId || "").trim() || "model"}`;
}

function normalizeModelDownloadState(state = "active") {
    return ["active", "queued", "paused", "stopped", "done", "error", "interrupted"].includes(state)
        ? state
        : "active";
}

function getModelDownloadTask(id) {
    return modelDownloadTasks.get(id) || null;
}

function getModelDownloadTaskState(id) {
    return getModelDownloadTask(id)?.state || "";
}

function getModelDownloadPercent(task) {
    if (!task) return 0;
    const explicit = Number(task.progress);
    if (Number.isFinite(explicit) && explicit >= 0) return Math.max(0, Math.min(100, explicit));
    const completed = Number(task.completed);
    const total = Number(task.total);
    if (Number.isFinite(completed) && Number.isFinite(total) && total > 0) {
        return Math.max(0, Math.min(100, (completed / total) * 100));
    }
    return task.state === "done" ? 100 : 0;
}

function formatModelDownloadBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function getModelDownloadLogTime(timestamp = Date.now()) {
    try {
        return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
        return "";
    }
}

function normalizeModelDownloadLog(entry) {
    if (typeof entry === "string") {
        return { time: Date.now(), level: "info", message: entry };
    }
    const message = String(entry?.message || "").trim();
    if (!message) return null;
    return {
        time: Number(entry?.time) || Date.now(),
        level: ["info", "success", "warning", "error"].includes(entry?.level) ? entry.level : "info",
        message
    };
}

function normalizeModelDownloadTask(rawTask = {}, { markInterrupted = false } = {}) {
    const modelId = String(rawTask.modelId || rawTask.name || "model").trim() || "model";
    const id = String(rawTask.id || getModelDownloadTaskId(modelId));
    let state = normalizeModelDownloadState(rawTask.state || "active");
    let detail = String(rawTask.detail || rawTask.status || "Waiting for Ollama...");
    const logs = Array.isArray(rawTask.logs)
        ? rawTask.logs.map(normalizeModelDownloadLog).filter(Boolean).slice(-MODEL_DOWNLOAD_MAX_LOG_LINES)
        : [];

    if (markInterrupted && ["active", "queued"].includes(state)) {
        const wasQueued = state === "queued";
        state = "interrupted";
        detail = wasQueued
            ? "Fauna restarted before this queued download started. Resume to continue."
            : "Fauna restarted before this download finished. Resume to continue.";
        logs.push({
            time: Date.now(),
            level: "warning",
            message: wasQueued
                ? "Queued download was interrupted by an app restart."
                : "Download was interrupted by an app restart."
        });
    }

    return {
        id,
        modelId,
        requestId: String(rawTask.requestId || ""),
        state,
        status: String(rawTask.status || detail),
        detail,
        completed: Number(rawTask.completed) || 0,
        total: Number(rawTask.total) || 0,
        progress: Number.isFinite(Number(rawTask.progress)) ? Number(rawTask.progress) : 0,
        queueIndex: Number.isFinite(Number(rawTask.queueIndex)) ? Number(rawTask.queueIndex) : 0,
        startedAt: Number(rawTask.startedAt) || Date.now(),
        updatedAt: Number(rawTask.updatedAt) || Date.now(),
        lastLogMessage: String(rawTask.lastLogMessage || ""),
        logs: logs.slice(-MODEL_DOWNLOAD_MAX_LOG_LINES)
    };
}

function getPersistedModelDownloadTasks() {
    try {
        const raw = safeLocalStorageGet(MODEL_DOWNLOAD_TASKS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn("Could not read model download tasks:", err);
        return [];
    }
}

function persistModelDownloadTasks() {
    const tasks = Array.from(modelDownloadTasks.values())
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, MODEL_DOWNLOAD_MAX_PERSISTED_TASKS)
        .map(task => ({
            ...task,
            logs: Array.isArray(task.logs) ? task.logs.slice(-MODEL_DOWNLOAD_MAX_LOG_LINES) : []
        }));
    safeLocalStorageSet(MODEL_DOWNLOAD_TASKS_STORAGE_KEY, JSON.stringify(tasks), { silent: true });
}

function restoreModelDownloadTasks() {
    const restored = getPersistedModelDownloadTasks()
        .map(task => normalizeModelDownloadTask(task, { markInterrupted: true }))
        .filter(task => task.modelId);
    restored.forEach(task => modelDownloadTasks.set(task.id, task));
    if (restored.length > 0) {
        peekModelDownloadButton(MODEL_DOWNLOAD_FINISH_PEEK_MS);
        renderModelDownloadMenu();
    }
}

function hasActiveModelDownloads() {
    return Array.from(modelDownloadTasks.values()).some(task => task.state === "active");
}

function hasAttentionModelDownloads() {
    return Array.from(modelDownloadTasks.values()).some(task => ["active", "queued", "paused", "error", "interrupted"].includes(task.state));
}

function isModelDownloadActive(modelId) {
    return modelDownloadTasks.get(getModelDownloadTaskId(modelId))?.state === "active";
}

function isModelDownloadTaskCancelled(id) {
    return ["paused", "stopped"].includes(getModelDownloadTaskState(id));
}

function setModelDownloadAbortController(id, controller) {
    if (!id) return;
    if (controller) modelDownloadAbortControllers.set(id, controller);
    else modelDownloadAbortControllers.delete(id);
}

function clearModelDownloadAbortController(id) {
    modelDownloadAbortControllers.delete(id);
}

function peekModelDownloadButton(durationMs = MODEL_DOWNLOAD_START_PEEK_MS) {
    if (!modelDownloadMenuWrap) return;
    if (modelDownloadPeekTimer) {
        window.clearTimeout(modelDownloadPeekTimer);
        modelDownloadPeekTimer = null;
    }
    modelDownloadMenuWrap.classList.add("peek");
    modelDownloadPeekTimer = window.setTimeout(() => {
        modelDownloadMenuWrap?.classList.remove("peek");
        modelDownloadPeekTimer = null;
    }, durationMs);
}

function closeModelDownloadMenu() {
    if (!modelDownloadPanel || !modelDownloadBtn) return;
    modelDownloadPanel.hidden = true;
    modelDownloadBtn.setAttribute("aria-expanded", "false");
}

function openModelDownloadMenu() {
    if (!modelDownloadPanel || !modelDownloadBtn || !modelDownloadTasks.size) return;
    modelDownloadPanel.hidden = false;
    modelDownloadBtn.setAttribute("aria-expanded", "true");
}

function scheduleModelDownloadAutoHide() {
    if (modelDownloadCloseTimer) {
        window.clearTimeout(modelDownloadCloseTimer);
        modelDownloadCloseTimer = null;
    }
    if (hasAttentionModelDownloads()) return;
    modelDownloadCloseTimer = window.setTimeout(() => {
        if (modelDownloadPanel && !modelDownloadPanel.hidden) return;
        modelDownloadMenuWrap?.setAttribute("hidden", "");
    }, 18000);
}

function getModelDownloadSortRank(task) {
    const state = task?.state || "active";
    if (state === "active") return 0;
    if (state === "queued") return 1;
    if (["paused", "interrupted", "error"].includes(state)) return 2;
    return 3;
}

function renderModelDownloadMenu() {
    if (!modelDownloadMenuWrap || !modelDownloadBtn || !modelDownloadList) return;
    const wasPanelOpen = Boolean(modelDownloadPanel && !modelDownloadPanel.hidden);
    const tasks = Array.from(modelDownloadTasks.values())
        .sort((a, b) => {
            const rankDelta = getModelDownloadSortRank(a) - getModelDownloadSortRank(b);
            if (rankDelta !== 0) return rankDelta;
            if (a.state === "queued" && b.state === "queued") {
                return (a.queueIndex || 0) - (b.queueIndex || 0);
            }
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
    const activeTasks = tasks.filter(task => task.state === "active");
    const queuedTasks = tasks.filter(task => task.state === "queued");
    const errorTasks = tasks.filter(task => task.state === "error");
    const pausedTasks = tasks.filter(task => ["paused", "interrupted"].includes(task.state));
    const visible = tasks.length > 0;
    modelDownloadMenuWrap.hidden = !visible;
    if (!visible) {
        closeModelDownloadMenu();
        return;
    }
    if (wasPanelOpen && modelDownloadPanel) {
        modelDownloadPanel.hidden = false;
        modelDownloadBtn.setAttribute("aria-expanded", "true");
    }

    const averageProgress = activeTasks.length
        ? activeTasks.reduce((sum, task) => sum + getModelDownloadPercent(task), 0) / activeTasks.length
        : tasks[0]?.state === "done" ? 100 : getModelDownloadPercent(tasks[0]);
    const roundedProgress = Math.round(averageProgress);
    modelDownloadBtn.classList.toggle("active", activeTasks.length > 0);
    modelDownloadBtn.classList.toggle("queued", activeTasks.length === 0 && queuedTasks.length > 0);
    modelDownloadBtn.classList.toggle("error", errorTasks.length > 0 && activeTasks.length === 0);
    modelDownloadBtn.style.setProperty("--download-progress", `${roundedProgress}%`);
    if (modelDownloadMiniBar) modelDownloadMiniBar.style.width = `${roundedProgress}%`;
    if (modelDownloadLabel) {
        modelDownloadLabel.textContent = activeTasks.length > 0
            ? `Downloading ${roundedProgress}%`
            : queuedTasks.length > 0
                ? `${queuedTasks.length} queued`
                : errorTasks.length > 0 ? "Download failed" : tasks[0]?.state === "paused" ? "Download paused" : tasks[0]?.state === "interrupted" ? "Resume download" : "Downloaded";
    }
    if (modelDownloadCount) modelDownloadCount.textContent = String(activeTasks.length || tasks.length);
    if (modelDownloadSummary) {
        modelDownloadSummary.textContent = activeTasks.length > 0
            ? queuedTasks.length > 0
                ? `${activeTasks.length} active, ${queuedTasks.length} queued`
                : `${activeTasks.length} active model ${activeTasks.length === 1 ? "download" : "downloads"}`
            : queuedTasks.length > 0
                ? `${queuedTasks.length} model ${queuedTasks.length === 1 ? "is" : "are"} queued`
            : errorTasks.length > 0
                ? `${errorTasks.length} model ${errorTasks.length === 1 ? "needs" : "need"} attention`
                : pausedTasks.length > 0
                    ? `${pausedTasks.length} model ${pausedTasks.length === 1 ? "is" : "are"} waiting to resume`
                    : "All model downloads finished";
    }

    modelDownloadList.replaceChildren(...tasks.map(task => {
        const item = document.createElement("article");
        item.className = `model-download-item model-download-item-${task.state || "active"}`;
        item.dataset.downloadTaskId = task.id;
        const percent = Math.round(getModelDownloadPercent(task));
        const isExpanded = expandedModelDownloadTaskId === task.id;
        item.style.setProperty("--download-progress", `${percent}%`);

        const main = document.createElement("button");
        main.className = "model-download-item-main";
        main.type = "button";
        main.dataset.downloadToggle = task.id;
        main.setAttribute("aria-expanded", String(isExpanded));

        const top = document.createElement("div");
        top.className = "model-download-item-top";
        const name = document.createElement("strong");
        name.textContent = task.modelId || "Ollama model";
        const state = document.createElement("span");
        state.textContent = task.state === "done"
            ? "Done"
            : task.state === "error"
                ? "Failed"
                : task.state === "queued"
                    ? "Queued"
                    : task.state === "paused"
                        ? "Paused"
                        : task.state === "stopped"
                            ? "Stopped"
                            : task.state === "interrupted"
                                ? "Interrupted"
                                : percent > 0 ? `${percent}%` : "Starting";
        top.append(name, state);

        const detail = document.createElement("small");
        detail.className = "model-download-detail";
        detail.textContent = task.detail || task.status || "Waiting for Ollama...";

        const bar = document.createElement("div");
        bar.className = "model-download-progress";
        const fill = document.createElement("span");
        bar.appendChild(fill);

        main.append(top, detail, bar);
        item.appendChild(main);

        if (isExpanded) {
            item.appendChild(renderModelDownloadDetails(task));
        }
        return item;
    }));

    scheduleModelDownloadAutoHide();
}

function renderModelDownloadDetails(task) {
    const details = document.createElement("div");
    details.className = "model-download-expanded";

    const metrics = document.createElement("div");
    metrics.className = "model-download-metrics";
    const percent = Math.round(getModelDownloadPercent(task));
    const downloaded = formatModelDownloadBytes(task.completed);
    const total = formatModelDownloadBytes(task.total);
    metrics.textContent = total ? `${percent}% - ${downloaded || "0 B"} of ${total}` : `${percent}%`;

    const log = document.createElement("div");
    log.className = "model-download-log";
    const lines = Array.isArray(task.logs) ? task.logs.slice(-12) : [];
    if (lines.length === 0) {
        const empty = document.createElement("small");
        empty.textContent = "No process logs yet.";
        log.appendChild(empty);
    } else {
        lines.forEach(line => {
            const row = document.createElement("p");
            row.dataset.level = line.level || "info";
            const time = document.createElement("span");
            time.textContent = getModelDownloadLogTime(line.time);
            const message = document.createElement("code");
            message.textContent = line.message;
            row.append(time, message);
            log.appendChild(row);
        });
    }

    const actions = document.createElement("div");
    actions.className = "model-download-actions";
    const state = task.state || "active";
    if (state === "active") {
        actions.append(
            createModelDownloadAction(task.id, "pause", "Pause"),
            createModelDownloadAction(task.id, "stop", "Stop", "danger")
        );
    } else if (state === "queued") {
        actions.append(
            createModelDownloadAction(task.id, "resume", "Start"),
            createModelDownloadAction(task.id, "clear", "Clear")
        );
    } else if (["paused", "interrupted", "error"].includes(state)) {
        actions.append(
            createModelDownloadAction(task.id, "resume", "Resume"),
            createModelDownloadAction(task.id, "stop", "Stop", "danger")
        );
    } else {
        actions.append(createModelDownloadAction(task.id, "clear", "Clear"));
    }

    details.append(metrics, log, actions);
    return details;
}

function createModelDownloadAction(taskId, action, label, tone = "") {
    const button = document.createElement("button");
    button.className = `model-download-action${tone ? ` ${tone}` : ""}`;
    button.type = "button";
    button.dataset.downloadAction = action;
    button.dataset.downloadTaskId = taskId;
    button.textContent = label;
    return button;
}

function updateModelDownloadTask(id, patch = {}, options = {}) {
    const existing = modelDownloadTasks.get(id);
    if (!existing) return;
    const nextLogs = Array.isArray(patch.logs)
        ? patch.logs.map(normalizeModelDownloadLog).filter(Boolean)
        : Array.isArray(existing.logs) ? [...existing.logs] : [];
    const logMessage = String(options.log || "").trim();
    if (logMessage) {
        nextLogs.push({
            time: Date.now(),
            level: options.level || "info",
            message: logMessage
        });
    }
    const next = {
        ...existing,
        ...patch,
        state: normalizeModelDownloadState(patch.state || existing.state || "active"),
        logs: nextLogs.slice(-MODEL_DOWNLOAD_MAX_LOG_LINES),
        updatedAt: Date.now()
    };
    modelDownloadTasks.set(id, next);
    persistModelDownloadTasks();
    renderModelDownloadMenu();
}

function startModelDownloadTask(modelId, detail = "Starting download", options = {}) {
    const id = getModelDownloadTaskId(modelId);
    const existing = modelDownloadTasks.get(id);
    modelDownloadTasks.set(id, {
        ...existing,
        id,
        modelId,
        requestId: String(options.requestId || existing?.requestId || ""),
        state: "active",
        status: detail,
        detail,
        queueIndex: Number(existing?.queueIndex) || 0,
        completed: options.resume ? Number(existing?.completed) || 0 : 0,
        total: options.resume ? Number(existing?.total) || 0 : 0,
        progress: options.resume ? Number(existing?.progress) || 0 : 0,
        startedAt: options.resume && existing?.startedAt ? existing.startedAt : Date.now(),
        updatedAt: Date.now(),
        logs: Array.isArray(existing?.logs) ? existing.logs.slice(-MODEL_DOWNLOAD_MAX_LOG_LINES) : []
    });
    if (modelDownloadCloseTimer) {
        window.clearTimeout(modelDownloadCloseTimer);
        modelDownloadCloseTimer = null;
    }
    updateModelDownloadTask(id, {}, { log: detail });
    peekModelDownloadButton(MODEL_DOWNLOAD_START_PEEK_MS);
    return id;
}

function queueModelDownloadTask(modelId, detail = "Waiting in queue", queueIndex = 0) {
    const id = getModelDownloadTaskId(modelId);
    const existing = modelDownloadTasks.get(id);
    if (existing?.state === "active") return id;
    modelDownloadTasks.set(id, {
        ...existing,
        id,
        modelId,
        requestId: String(existing?.requestId || ""),
        state: "queued",
        status: detail,
        detail,
        completed: Number(existing?.completed) || 0,
        total: Number(existing?.total) || 0,
        progress: Number(existing?.progress) || 0,
        queueIndex,
        startedAt: existing?.startedAt || Date.now(),
        updatedAt: Date.now(),
        logs: Array.isArray(existing?.logs) && existing.logs.length > 0
            ? existing.logs.slice(-MODEL_DOWNLOAD_MAX_LOG_LINES)
            : [{
                time: Date.now(),
                level: "info",
                message: detail
            }]
    });
    persistModelDownloadTasks();
    renderModelDownloadMenu();
    return id;
}

function finishModelDownloadTask(id, { ok = true, detail = "" } = {}) {
    clearModelDownloadAbortController(id);
    updateModelDownloadTask(id, {
        state: ok ? "done" : "error",
        progress: ok ? 100 : undefined,
        detail: detail || (ok ? "Installed" : "Download failed")
    }, {
        log: detail || (ok ? "Model installed." : "Download failed."),
        level: ok ? "success" : "error"
    });
    peekModelDownloadButton(MODEL_DOWNLOAD_FINISH_PEEK_MS);
}

function applyOllamaPullProgress(modelId, data = {}) {
    const id = getModelDownloadTaskId(modelId);
    if (!modelDownloadTasks.has(id)) {
        startModelDownloadTask(modelId, "Receiving Ollama progress");
    }
    const task = modelDownloadTasks.get(id);
    if (isModelDownloadTaskCancelled(id)) return;
    const status = String(data.status || "").trim();
    const digest = String(data.digest || "").replace(/^sha256:/i, "").slice(0, 12);
    const completed = Number(data.completed);
    const total = Number(data.total);
    const hasProgress = Number.isFinite(completed) && Number.isFinite(total) && total > 0;
    const percent = hasProgress ? Math.round((completed / total) * 100) : 0;
    const detail = digest && hasProgress
        ? `${status || "Pulling layer"} ${digest}`
        : status || "Downloading model";
    const logMessage = hasProgress
        ? `${detail} - ${percent}%${formatModelDownloadBytes(completed) && formatModelDownloadBytes(total) ? ` (${formatModelDownloadBytes(completed)} / ${formatModelDownloadBytes(total)})` : ""}`
        : detail;
    updateModelDownloadTask(id, {
        status,
        detail,
        completed: hasProgress ? completed : undefined,
        total: hasProgress ? total : undefined,
        progress: hasProgress ? (completed / total) * 100 : undefined,
        lastLogMessage: logMessage
    }, {
        log: task?.lastLogMessage === logMessage ? "" : logMessage,
        level: data.error ? "error" : data.done || status === "success" ? "success" : "info"
    });
}

async function requestCancelModelDownload(task) {
    const controller = modelDownloadAbortControllers.get(task.id);
    controller?.abort?.();
    const desktopApi = getFaunaDesktopApi();
    if (desktopApi?.cancelOllamaPull && task.requestId) {
        try {
            await desktopApi.cancelOllamaPull({ requestId: task.requestId, modelId: task.modelId });
        } catch (err) {
            console.warn("Could not cancel desktop Ollama pull:", err);
        }
    }
}

function pauseModelDownloadTask(id) {
    const task = getModelDownloadTask(id);
    if (!task) return;
    updateModelDownloadTask(id, {
        state: "paused",
        detail: "Paused. Resume to continue the Ollama pull."
    }, { log: "Download paused.", level: "warning" });
    if (typeof setLocalModelsStatus === "function") {
        setLocalModelsStatus("Download paused", "missing");
    }
    void requestCancelModelDownload(task);
}

function stopModelDownloadTask(id) {
    const task = getModelDownloadTask(id);
    if (!task) return;
    updateModelDownloadTask(id, {
        state: "stopped",
        detail: "Stopped by user."
    }, { log: "Download stopped.", level: "warning" });
    if (typeof setLocalModelsStatus === "function") {
        setLocalModelsStatus("Download stopped", "missing");
    }
    void requestCancelModelDownload(task);
}

function resumeModelDownloadTask(id) {
    const task = getModelDownloadTask(id);
    if (!task || !task.modelId || task.state === "active") return;
    if (typeof pullOllamaModel !== "function") {
        showToast("Model download resume is not ready yet.", "warning");
        return;
    }
    updateModelDownloadTask(id, {
        state: "active",
        detail: "Resuming download..."
    }, { log: "Resume requested." });
    void pullOllamaModel(task.modelId, { resume: true }).then(result => {
        if (result?.cancelled) return;
    }).catch(err => {
        finishModelDownloadTask(id, { ok: false, detail: err.message });
        showToast(`Resume failed: ${err.message}`, "error");
    });
}

function clearModelDownloadTask(id) {
    clearModelDownloadAbortController(id);
    modelDownloadTasks.delete(id);
    if (expandedModelDownloadTaskId === id) expandedModelDownloadTaskId = "";
    persistModelDownloadTasks();
    renderModelDownloadMenu();
}

modelDownloadBtn?.addEventListener("click", event => {
    event.stopPropagation();
    if (!modelDownloadPanel) return;
    if (modelDownloadPanel.hidden) openModelDownloadMenu();
    else closeModelDownloadMenu();
});

modelDownloadList?.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-download-action]");
    if (actionButton) {
        event.preventDefault();
        event.stopPropagation();
        const id = actionButton.dataset.downloadTaskId || "";
        const action = actionButton.dataset.downloadAction || "";
        if (action === "pause") pauseModelDownloadTask(id);
        else if (action === "resume") resumeModelDownloadTask(id);
        else if (action === "stop") stopModelDownloadTask(id);
        else if (action === "clear") clearModelDownloadTask(id);
        return;
    }

    const toggle = event.target.closest("[data-download-toggle]");
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    const id = toggle.dataset.downloadToggle || "";
    expandedModelDownloadTaskId = expandedModelDownloadTaskId === id ? "" : id;
    renderModelDownloadMenu();
});

document.addEventListener("click", event => {
    if (!modelDownloadMenuWrap || modelDownloadMenuWrap.hidden) return;
    if (event.target instanceof Node && modelDownloadMenuWrap.contains(event.target)) return;
    closeModelDownloadMenu();
});

document.addEventListener("click", event => {
    if (!changelogMenuWrap || changelogPanel?.hidden) return;
    if (event.target instanceof Node && changelogMenuWrap.contains(event.target)) return;
    closeChangelogMenu();
});

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeModelDownloadMenu();
    closeChangelogMenu();
});

restoreModelDownloadTasks();

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

function normalizeErrorHistoryMetadata(raw = {}) {
    if (!raw || typeof raw !== "object") return null;
    const title = String(raw.title || "Something went wrong").trim();
    const message = String(raw.message || "Fauna could not complete this request.").trim();
    const detail = String(raw.detail || "").trim();
    if (!title && !message && !detail) return null;
    return {
        title: title || "Something went wrong",
        message: message || "Fauna could not complete this request.",
        detail,
        canCheckOllama: Boolean(raw.canCheckOllama),
        canCheckProvider: Boolean(raw.canCheckProvider),
        createdAt: String(raw.createdAt || new Date().toISOString())
    };
}

function getErrorHistoryContent(errorInfo = {}) {
    const info = normalizeErrorHistoryMetadata(errorInfo);
    if (!info) return "Fauna could not complete this request.";
    return [
        `[Error] ${info.title}`,
        info.message,
        info.detail ? `Details: ${info.detail}` : ""
    ].filter(Boolean).join("\n\n");
}

function createErrorHistoryMessage(error, info = {}) {
    const detailText = info.detail || error?.message || "";
    const errorInfo = normalizeErrorHistoryMetadata({
        ...info,
        detail: detailText,
        createdAt: new Date().toISOString()
    });
    return {
        role: "assistant",
        content: getErrorHistoryContent(errorInfo),
        createdAt: errorInfo.createdAt,
        faunaError: errorInfo
    };
}

function persistErrorCardToHistory(target, errorMessage, options = {}) {
    if (options.persist === false || options.persistError === false) return null;
    const history = Array.isArray(options.history) ? options.history : null;
    const sessionId = options.sessionId || activeSessionId || "";
    if (!history) return null;

    let messageIndex = getAssistantHistoryIndexForBubble(target);
    if (messageIndex !== null && history[messageIndex]?.role === "assistant") {
        history[messageIndex] = {
            ...history[messageIndex],
            ...errorMessage
        };
    } else {
        history.push(errorMessage);
        messageIndex = history.length - 1;
    }

    const messageNode = target?.closest?.(".message-node.output-node");
    if (messageNode && messageIndex !== null) {
        messageNode.dataset.historyIndex = String(messageIndex);
        messageNode.dataset.createdAt = errorMessage.createdAt;
    }

    if (sessionId) {
        updateStoredSessionFromGeneration?.(sessionId, {
            history,
            tokenTotal: typeof options.getTokenTotal === "function"
                ? options.getTokenTotal()
                : Number(options.tokenTotal ?? sessionTotalTokens) || 0
        });
    } else {
        conversationHistory = cloneConversationHistory(history);
    }
    return messageIndex;
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
                await writeTextToClipboard(detailText);
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
    persistErrorCardToHistory(target, createErrorHistoryMessage(error, info), options);
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
    if (isActiveChatArchived()) {
        showToast("Archived chats are read-only. Restore the chat before retrying.", "warning");
        return;
    }
    const generationSession = ensureWritableActiveChatSession();
    if (!generationSession) return;
    const generationSessionId = generationSession.id;
    const runHistory = cloneConversationHistory(conversationHistory);
    let runTokenTotal = sessionTotalTokens;

    clearClarifyingQuestionComposer();
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    setGeneratingBusy(true, { sessionId: generationSessionId, controller: generationController });
    prepareBubbleForRetry(target);

    try {
        const data = await sendOllamaChatWithLocalTools(
            runHistory,
            {
                ...getActiveChatRequestOptions(),
                sessionId: generationSessionId
            },
            model,
            generationSignal,
            target,
            {
                enabled: true,
                preserveActiveModel: shouldPreserveActiveLocalModelForRoute(model)
            }
        );
        const tokenUsage = getProviderTokenUsage(data);
        const assistantMessage = getAssistantMessageForConversation(data, model);
        attachTokenUsage(assistantMessage, tokenUsage);
        runHistory.push(assistantMessage);
        const assistantIndex = runHistory.length - 1;

        runTokenTotal += recordSessionTokenUsage(generationSessionId, tokenUsage, { message: assistantMessage });
        await renderAssistantResponse(data, target, webSources, generationSignal, speakThisReply, {
            sessionId: generationSessionId,
            messageIndex: assistantIndex,
            alreadyRendered: data.__faunaAlreadyRendered === true,
            preserveRenderedContent: data.__faunaPreserveRenderedContent === true
        });
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
        showToast("Generation retried.", "success");
    } catch (err) {
        renderErrorCard(target, err, {
            sessionId: generationSessionId,
            history: runHistory,
            getTokenTotal: () => runTokenTotal,
            retryLabel: "Retry generation",
            onRetry: () => retryAssistantGenerationFromBubble(target, { model, webSources, speakThisReply })
        });
    } finally {
        finishChatGeneration(generationSessionId, generationController);
        updateTokenDisplay();
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
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
    return !isPotatoReduceMotionEnabled && !prefersReducedMotion() && activeTypewriterDurationSeconds > 0;
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

function createAssistantStreamRenderer(target, signal = null, { sessionId = "" } = {}) {
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
        applyAssistantChatTitle(rawText, sessionId || activeSessionId);

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
            applyAssistantChatTitle(rawText, sessionId || activeSessionId);
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

