// Original script.js lines 3885-5577.
// ===== MODEL SWITCHER LOGIC =====
const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/chat`;
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
const WORKSPACE_PROJECTS_STORAGE_KEY = "faunaWorkspaceProjects";
const WORKSPACE_PROJECT_SORT_STORAGE_KEY = "faunaWorkspaceProjectSort";
const AGENT_TASK_MODE_STORAGE_KEY = "faunaAgentTaskMode";
const PROJECT_AGENT_TABS_STORAGE_KEY = "faunaProjectAgentTabs";
const PROJECT_AGENT_TAB_STORAGE_KEY = "faunaProjectAgentTab";
const PROJECT_EXPLORER_PATH_STORAGE_KEY = "faunaProjectExplorerPath";
const PROJECT_EXPLORER_EXPANDED_PATHS_STORAGE_KEY = "faunaProjectExplorerExpandedPaths";
const PROJECT_AGENT_WIDTH_STORAGE_KEY = "faunaProjectAgentWidth";
const PROJECT_AGENT_COLLAPSED_STORAGE_KEY = "faunaProjectAgentCollapsed";
const PROJECT_AGENT_MAXIMIZED_STORAGE_KEY = "faunaProjectAgentMaximized";
const PROJECT_FILE_EXTENDED_VIEW_STORAGE_KEY = "faunaProjectFileExtendedView";
const PROJECT_FILE_LINE_WRAP_STORAGE_KEY = "faunaProjectFileLineWrap";
const MEMORY_ENABLED_STORAGE_KEY = "faunaMemoryEnabled";
const MEMORY_STORAGE_KEY = "faunaMemories";
const KEYBOARD_SHORTCUTS_STORAGE_KEY = "faunaKeyboardShortcuts";
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
const DEFAULT_AGENT_MAX_STEPS_AT_A_TIME = 4;
const DEFAULT_AGENT_MAX_STEPS_PER_RUN = 16;
const MIN_AGENT_MAX_STEPS = 1;
const MAX_AGENT_STEPS_AT_A_TIME = 32;
const MAX_AGENT_STEPS_PER_RUN = 64;
const FAUNA_TOOL_FALLBACK_RESULT_MAX_CHARS = 6000;
const LOCAL_TOOL_RESULT_MAX_CHARS = 14000;
const WEB_INSPECT_RESULT_MAX_CHARS = 12000;
const WAIT_TOOL_DEFAULT_DELAY_MS = 1000;
const WAIT_TOOL_MAX_DELAY_MS = 5 * 60 * 1000;
const WAIT_FOR_COMMAND_DEFAULT_MAX_MS = 30 * 1000;
const WAIT_FOR_COMMAND_MAX_MS = 5 * 60 * 1000;
const WAIT_FOR_COMMAND_DEFAULT_INTERVAL_MS = 2000;
const WAIT_FOR_COMMAND_MIN_INTERVAL_MS = 500;
const WORKSPACE_ACCESS_POLICY_STORAGE_KEY = "faunaWorkspaceAccessPolicy";
const WORKSPACE_ACCESS_POLICY_BRIDGE_ROOT = "bridge-root";
const WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT = "chat-output";
const WORKSPACE_ACCESS_POLICY_FULL_MACHINE = "full-machine";
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
    read_files: "read_files",
    read_many_files: "read_files",
    multi_read_file: "read_files",
    open_files: "read_files",
    search_files: "search_files",
    find_files: "search_files",
    find_file: "search_files",
    file_search: "search_files",
    search_workspace_files: "search_files",
    search_text: "search_text",
    grep: "search_text",
    grep_files: "search_text",
    search_workspace: "search_text",
    search_code: "search_text",
    find_text: "search_text",
    write_file: "write_file",
    create_file: "write_file",
    save_file: "write_file",
    append_file: "append_file",
    make_directory: "make_directory",
    mkdir: "make_directory",
    create_directory: "make_directory",
    create_folder: "make_directory",
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
const THINKING_TOOL_NAME_ALIASES = {
    thinking: "thinking",
    think: "thinking",
    reason: "thinking",
    reasoning: "thinking",
    reflect: "thinking",
    plan: "thinking",
    continue_thinking: "thinking"
};
const THINKING_TOOL_NAMES = new Set(Object.values(THINKING_TOOL_NAME_ALIASES));
const KEYBOARD_SHORTCUT_ACTIONS = [
    {
        id: "sendPrompt",
        title: "Send prompt",
        description: "Submit the current composer text.",
        defaultShortcut: "Ctrl+Enter"
    },
    {
        id: "focusPrompt",
        title: "Focus prompt",
        description: "Jump back to the composer.",
        defaultShortcut: "Ctrl+K"
    },
    {
        id: "newChat",
        title: "New chat",
        description: "Start a fresh chat.",
        defaultShortcut: "Ctrl+N"
    },
    {
        id: "openSettings",
        title: "Open settings",
        description: "Open the settings window.",
        defaultShortcut: "Ctrl+,"
    },
    {
        id: "toggleSidebar",
        title: "Toggle sidebar",
        description: "Collapse or expand the sidebar.",
        defaultShortcut: "Ctrl+B"
    },
    {
        id: "openLibrary",
        title: "Open Library",
        description: "Switch to Library.",
        defaultShortcut: "Ctrl+Shift+L"
    },
    {
        id: "openChat",
        title: "Open chat",
        description: "Switch back to the current chat.",
        defaultShortcut: "Ctrl+Shift+P"
    },
    {
        id: "toggleTools",
        title: "Toggle tools",
        description: "Open or close the tools menu.",
        defaultShortcut: "Ctrl+Shift+T"
    },
    {
        id: "toggleVoice",
        title: "Voice input",
        description: "Start or stop voice input.",
        defaultShortcut: "Ctrl+Shift+V"
    },
    {
        id: "checkUpdates",
        title: "Check updates",
        description: "Run a Fauna update check.",
        defaultShortcut: "Ctrl+Shift+U"
    }
];
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
function normalizeWorkspaceAccessPolicy(value) {
    const policy = String(value || "").trim();
    if (policy === WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT) return WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT;
    if (policy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE) return WORKSPACE_ACCESS_POLICY_FULL_MACHINE;
    return WORKSPACE_ACCESS_POLICY_BRIDGE_ROOT;
}
const LOCAL_TOOL_SYSTEM_PROMPT = `The token-protected Local Workspace Bridge is active for this chat. You can access local files and execute terminal commands through Fauna local workspace tools. Do not claim you have no local file or terminal access when this prompt is present; request the matching tool instead. Use these tools when the user asks about local files, this project, code search, directory listings, file creation, command output, tests, installs, scripts, terminal commands, or local system tasks that can be handled from a terminal, such as inspecting running processes or closing specific apps the user names. For system/process actions, prefer targeted, graceful commands first; do not broadly kill unrelated apps or processes unless the user explicitly asks for that and the command is clear. To request a tool, respond with only the required hidden chat title block when present, then exactly one tool XML block, and no normal prose. Directory read/list examples: <fauna_tool_call>{"tool":"read_directory","path":".","depth":2}</fauna_tool_call> or <fauna_tool_call>{"tool":"list_directory","path":"assets","depth":1}</fauna_tool_call>. File write example: <fauna_tool_call>{"tool":"write_file","path":"index.html","content":"<!doctype html>\\n<html>...</html>"}</fauna_tool_call>. Append example: <fauna_tool_call>{"tool":"append_file","path":"styles.css","content":"\\n.footer { display: grid; }"}</fauna_tool_call>. Directory example: <fauna_tool_call>{"tool":"make_directory","path":"assets"}</fauna_tool_call>. File search example: <fauna_tool_call>{"tool":"search_files","query":"settings","path":".","depth":5}</fauna_tool_call>. Text search example: <fauna_tool_call>{"tool":"search_text","query":"function saveCurrentSession","path":"scripts","include":"*.js","caseSensitive":false}</fauna_tool_call>. Single-file read example: <fauna_tool_call>{"tool":"read_file","path":"index.html"}</fauna_tool_call>. Multi-file read example: <fauna_tool_call>{"tool":"read_files","paths":["index.html","styles.css","script.js"]}</fauna_tool_call>. Terminal example: <fauna_tool_call>{"tool":"run_terminal_command","command":"git status --short","cwd":".","timeout":20}</fauna_tool_call>. System task example: <fauna_tool_call>{"tool":"run_terminal_command","command":"Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 ProcessName,Id,CPU","cwd":".","timeout":20}</fauna_tool_call>. Tool file results include line numbers; when you cite local files, reference them inline as path (line N) or path (lines A-B). After Fauna returns a tool result, answer the user normally. Do not call the same tool with the same path, query, or command again; use the returned result unless you need different files, a different query, or a command.`;
function buildLocalToolSystemPrompt(accessPolicy = WORKSPACE_ACCESS_POLICY_BRIDGE_ROOT, sessionId = activeSessionId) {
    const projectPrompt = typeof getActiveWorkspaceProjectSystemPrompt === "function"
        ? getActiveWorkspaceProjectSystemPrompt(sessionId)
        : "";
    const policy = normalizeWorkspaceAccessPolicy(accessPolicy);
    const policyPrompt = projectPrompt || (policy === WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT
        ? "Desktop access policy: Chat Output only. Every local file tool and terminal command is scoped to this chat's output folder, stored beside the chat as chats/<chatId>/output. Use simple relative paths such as index.html, styles.css, script.js, or assets/logo.svg. Do not try to access files outside that output folder; ask the user to switch the access policy if broader access is needed."
        : policy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE
            ? "Desktop access policy: Full Machine. Absolute paths are allowed and terminal commands run without Fauna's command blocklist. This is powerful; prefer non-destructive commands unless the user explicitly asks for destructive system changes. You may use terminal commands for local system tasks such as listing processes, diagnosing the machine, or closing specific apps the user names; use targeted commands and avoid terminating unrelated work."
            : "Access policy: Bridge Root. Local tools are limited by the currently configured bridge root and bridge command policy.");
    return `${policyPrompt}\n\n${LOCAL_TOOL_SYSTEM_PROMPT}`;
}
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
const AGENT_LOOP_SYSTEM_PROMPT = `You have an agent loop with tool-call limits. If you need more tool-backed work after several consecutive tool calls, call the thinking tool first: <fauna_tool_call>{"tool":"thinking","summary":"What I know and what I will do next."}</fauna_tool_call>. Thinking does not access external data; it resets only the consecutive step counter. The total max steps per run is still a hard stop. After useful tool results, answer the user normally with a concise summary of what changed, what was found, or what remains; do not replay tool logs or repeat the same tool call.`;
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
const LOCAL_TASK_MODEL_CONFIGS = [
    {
        task: "reasoning",
        label: "Reasoning",
        defaultModel: MODEL_ROUTES.reasoning,
        storageKey: LOCAL_TASK_REASONING_MODEL_STORAGE_KEY,
        input: () => localTaskReasoningModelInput,
        selectHost: () => localTaskReasoningModelSelectHost,
        selectRef: () => localTaskReasoningModelSelect,
        setSelectRef: select => { localTaskReasoningModelSelect = select; },
        filter: capability => capability.supportsThinking === true || capability.supportsToolCalling === true || capability.supportsStreaming !== false
    },
    {
        task: "vision",
        label: "Vision",
        defaultModel: MODEL_ROUTES.imageAnalysis,
        storageKey: LOCAL_TASK_VISION_MODEL_STORAGE_KEY,
        input: () => localTaskVisionModelInput,
        selectHost: () => localTaskVisionModelSelectHost,
        selectRef: () => localTaskVisionModelSelect,
        setSelectRef: select => { localTaskVisionModelSelect = select; },
        filter: capability => capability.supportsImageInput === true
    },
    {
        task: "code",
        label: "Code",
        defaultModel: MODEL_ROUTES.code,
        storageKey: LOCAL_TASK_CODE_MODEL_STORAGE_KEY,
        input: () => localTaskCodeModelInput,
        selectHost: () => localTaskCodeModelSelectHost,
        selectRef: () => localTaskCodeModelSelect,
        setSelectRef: select => { localTaskCodeModelSelect = select; },
        filter: (_capability, option) => /code|coder|devstral|deepseek-coder|qwen/i.test(`${option.id} ${option.meta || ""}`)
    },
    {
        task: "imageGeneration",
        label: "Image prompts",
        defaultModel: MODEL_ROUTES.imageGeneration,
        storageKey: LOCAL_TASK_IMAGE_MODEL_STORAGE_KEY,
        input: () => localTaskImageModelInput,
        selectHost: () => localTaskImageModelSelectHost,
        selectRef: () => localTaskImageModelSelect,
        setSelectRef: select => { localTaskImageModelSelect = select; },
        filter: capability => capability.supportsStreaming !== false
    },
    {
        task: "videoGeneration",
        label: "Video prompts",
        defaultModel: MODEL_ROUTES.videoGeneration,
        storageKey: LOCAL_TASK_VIDEO_MODEL_STORAGE_KEY,
        input: () => localTaskVideoModelInput,
        selectHost: () => localTaskVideoModelSelectHost,
        selectRef: () => localTaskVideoModelSelect,
        setSelectRef: select => { localTaskVideoModelSelect = select; },
        filter: capability => capability.supportsStreaming !== false
    }
];
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

function getRequiredOllamaModels() {
    return Array.from(new Set([
        ...REQUIRED_OLLAMA_MODELS,
        ...LOCAL_TASK_MODEL_CONFIGS.map(config => getLocalTaskModel(config.task))
    ].map(normalizeModelId).filter(Boolean)));
}
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
isOllamaAutoStartEnabled = safeLocalStorageGet(OLLAMA_AUTO_START_STORAGE_KEY) === "true";
activeTemperature = normalizeAiTemperature(safeLocalStorageGet(AI_TEMPERATURE_STORAGE_KEY));
activeMaxOutputTokens = normalizeMaxOutputTokens(safeLocalStorageGet(AI_MAX_OUTPUT_TOKENS_STORAGE_KEY));
activeTopP = normalizeTopP(safeLocalStorageGet(AI_TOP_P_STORAGE_KEY));
activeOllamaTopK = normalizeOllamaTopK(safeLocalStorageGet(OLLAMA_TOP_K_STORAGE_KEY));
activeOpenAiVerbosity = normalizeOpenAiVerbosity(safeLocalStorageGet(OPENAI_VERBOSITY_STORAGE_KEY));
activeAgentMaxStepsAtATime = normalizeAgentMaxStepsAtATime(safeLocalStorageGet(AGENT_MAX_STEPS_AT_A_TIME_STORAGE_KEY));
activeAgentMaxStepsPerRun = normalizeAgentMaxStepsPerRun(safeLocalStorageGet(AGENT_MAX_STEPS_PER_RUN_STORAGE_KEY));
activeContextCompactionThresholdPercent = normalizeContextCompactionThresholdPercent(safeLocalStorageGet(CONTEXT_COMPACTION_THRESHOLD_STORAGE_KEY));
isContextCompactionReviewEnabled = safeLocalStorageGet(CONTEXT_COMPACTION_REVIEW_STORAGE_KEY) === "true";
activeContextCompactionRotationLimit = normalizeContextCompactionRotationLimit(safeLocalStorageGet(CONTEXT_COMPACTION_ROTATION_LIMIT_STORAGE_KEY));
isAiCachingEnabled = safeLocalStorageGet(AI_CACHING_STORAGE_KEY) === "true";
activeVoiceSpeed = normalizeStoredVoiceSpeed(safeLocalStorageGet(VOICE_SPEED_STORAGE_KEY));
isVoiceReplyEnabled = safeLocalStorageGet(VOICE_REPLY_ENABLED_STORAGE_KEY) !== "false";
selectedVoiceMicDeviceId = safeLocalStorageGet(VOICE_MIC_DEVICE_STORAGE_KEY) || "default";
selectedVoiceOutputDeviceId = safeLocalStorageGet(VOICE_OUTPUT_DEVICE_STORAGE_KEY) || "default";
let conversationHistory = [];
let chatSessions = [];
let workspaceProjects = [];
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

function normalizeAgentMaxStepsAtATime(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return DEFAULT_AGENT_MAX_STEPS_AT_A_TIME;
    }
    const steps = Number(value);
    if (!Number.isFinite(steps)) return DEFAULT_AGENT_MAX_STEPS_AT_A_TIME;
    return Math.min(MAX_AGENT_STEPS_AT_A_TIME, Math.max(MIN_AGENT_MAX_STEPS, Math.round(steps)));
}

function normalizeAgentMaxStepsPerRun(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return DEFAULT_AGENT_MAX_STEPS_PER_RUN;
    }
    const steps = Number(value);
    if (!Number.isFinite(steps)) return DEFAULT_AGENT_MAX_STEPS_PER_RUN;
    return Math.min(MAX_AGENT_STEPS_PER_RUN, Math.max(MIN_AGENT_MAX_STEPS, Math.round(steps)));
}

function normalizeContextCompactionThresholdPercent(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return DEFAULT_CONTEXT_COMPACTION_THRESHOLD_PERCENT;
    }
    const percent = Number(value);
    if (!Number.isFinite(percent)) return DEFAULT_CONTEXT_COMPACTION_THRESHOLD_PERCENT;
    const stepped = Math.round(percent / 5) * 5;
    return Math.min(MAX_CONTEXT_COMPACTION_THRESHOLD_PERCENT, Math.max(MIN_CONTEXT_COMPACTION_THRESHOLD_PERCENT, stepped));
}

function normalizeContextCompactionRotationLimit(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return DEFAULT_CONTEXT_COMPACTION_ROTATION_LIMIT;
    }
    const rotations = Number(value);
    if (!Number.isFinite(rotations)) return DEFAULT_CONTEXT_COMPACTION_ROTATION_LIMIT;
    return Math.min(MAX_CONTEXT_COMPACTION_ROTATION_LIMIT, Math.max(MIN_CONTEXT_COMPACTION_ROTATION_LIMIT, Math.round(rotations)));
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

function getLocalTaskModelConfig(task) {
    const normalized = task === "imageAnalysis" ? "vision" : String(task || "").trim();
    return LOCAL_TASK_MODEL_CONFIGS.find(config => config.task === normalized) || LOCAL_TASK_MODEL_CONFIGS[0];
}

function getLocalTaskModel(task) {
    const config = getLocalTaskModelConfig(task);
    const saved = normalizeModelId(safeLocalStorageGet(config.storageKey));
    return saved || config.defaultModel;
}

function setLocalTaskModel(task, model) {
    const config = getLocalTaskModelConfig(task);
    const normalized = normalizeModelId(model) || config.defaultModel;
    safeLocalStorageSet(config.storageKey, normalized);
    config.input()?.setAttribute("value", normalized);
    if (config.input()) config.input().value = normalized;
    updateLocalTaskModelSelects();
    return normalized;
}

function resetLocalTaskModels() {
    LOCAL_TASK_MODEL_CONFIGS.forEach(config => safeLocalStorageRemove(config.storageKey));
    updateLocalTaskModelSelects();
    showToast("Task models reset.", "success");
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
        const res = await ollamaFetch(OLLAMA_SHOW_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, verbose: false }),
            signal: controller.signal,
            desktopTimeoutMs: OLLAMA_SHOW_TIMEOUT_MS + 1000
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

function openAiModelSupportsToolCalls(modelId = getOpenAiChatModel()) {
    return aiCapabilityRegistry.supportsToolCalling(modelId)
        || aiCapabilityRegistry.supportsParameter(modelId, "tools")
        || aiCapabilityRegistry.supportsParameter(modelId, "tool_choice");
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

function getActiveModelContextLength(modelId = getActiveComposerModelLabel()) {
    if (isOpenAiProvider()) {
        const record = aiCapabilityRegistry.getModelOption(modelId) || getOpenAiChatModelOption(modelId);
        const contextLength = Number(record?.contextLength || 0);
        return Number.isFinite(contextLength) && contextLength > 0
            ? contextLength
            : CONTEXT_COMPACTION_OPENAI_DEFAULT_CONTEXT;
    }
    const capability = getOllamaModelCapability(modelId);
    const contextLength = Number(capability?.contextLength || 0);
    return Number.isFinite(contextLength) && contextLength > 0
        ? contextLength
        : CONTEXT_COMPACTION_LOCAL_DEFAULT_CONTEXT;
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
    if (!isOpenAiProvider()) {
        return getOllamaModelCapability().supportsImageInput === true || localTaskModelSupportsVision();
    }
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
    if (isModelDownloadActive(modelId)) {
        return `${modelId} is still downloading. Open the model downloads menu in the top bar to watch progress.`;
    }
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
            : `${modelLabel} does not support image attachments. Choose a vision task model first.`;
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
    const archived = typeof isActiveChatArchived === "function" && isActiveChatArchived();
    const composerLocked = isGenerating || archived;
    const attachmentReason = `${modelLabel} cannot read attachments. Choose a file- or vision-capable model first.`;
    const toolReason = `${modelLabel} cannot call tools. Choose a tool-capable model first.`;
    const readOnlyReason = archived ? "Archived chats are read-only." : "Wait for this chat to finish generating.";

    if (fileInput) {
        const accepted = [
            canAttachImages ? "image/*" : "",
            canAttachFiles ? ".pdf,.txt,.md,.js,.py,.json,.csv" : ""
        ].filter(Boolean).join(",");
        fileInput.setAttribute("accept", accepted);
    }

    if (uploadButton) {
        uploadButton.disabled = !canAttach || composerLocked;
        uploadButton.classList.toggle("composer-control-unavailable", !canAttach);
        uploadButton.dataset.tooltip = composerLocked ? readOnlyReason : canAttach ? "Attach" : attachmentReason;
        uploadButton.setAttribute("aria-label", uploadButton.dataset.tooltip);
    }

    [attachmentUploadFileButton, attachmentChooseLibraryButton].forEach(button => {
        if (!button) return;
        button.disabled = !canAttach || composerLocked;
        button.classList.toggle("composer-control-unavailable", !canAttach);
        button.dataset.tooltip = composerLocked ? readOnlyReason : canAttach ? "" : attachmentReason;
    });

    if (!canAttach || composerLocked) {
        closeAttachmentMenu();
    }

    if (toolsBtn) {
        toolsBtn.disabled = !canUseTools || composerLocked;
        toolsBtn.classList.toggle("composer-control-unavailable", !canUseTools);
        toolsBtn.dataset.tooltip = composerLocked ? readOnlyReason : canUseTools ? "Tools" : toolReason;
        toolsBtn.setAttribute("aria-label", toolsBtn.dataset.tooltip);
    }

    if (toolsDropdown) {
        toolsDropdown.classList.toggle("composer-tools-unavailable", !canUseTools);
        if (!canUseTools || composerLocked) toolsDropdown.classList.remove("open");
    }

    [toggleSandbox, toggleWebSearch, toggleGrounding, toggleGoogleGrounding, toggleApproxLocation, toggleWorkspaceBridge].forEach(control => {
        if (!control) return;
        control.disabled = !canUseTools || composerLocked;
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

    if (agentMaxStepsAtATimeInput) {
        agentMaxStepsAtATimeInput.value = String(activeAgentMaxStepsAtATime);
    }
    if (agentMaxStepsPerRunInput) {
        agentMaxStepsPerRunInput.value = String(activeAgentMaxStepsPerRun);
    }
    setSettingStatus(
        agentLoopStatus,
        `Runs up to ${activeAgentMaxStepsPerRun} total steps; thinking resets each ${activeAgentMaxStepsAtATime}-step burst.`
    );

    if (contextCompactionThreshold) {
        contextCompactionThreshold.value = String(activeContextCompactionThresholdPercent);
    }
    if (contextCompactionThresholdValue) {
        contextCompactionThresholdValue.textContent = `${activeContextCompactionThresholdPercent}%`;
    }
    setSettingStatus(
        contextCompactionStatus,
        `Compacts automatically above ${activeContextCompactionThresholdPercent}% of the active model context.`
    );
    if (contextCompactionReviewToggle) {
        contextCompactionReviewToggle.checked = isContextCompactionReviewEnabled;
    }
    if (contextCompactionRotationLimitInput) {
        contextCompactionRotationLimitInput.value = String(activeContextCompactionRotationLimit);
        setSettingsControlUnavailable(
            contextCompactionRotationLimitInput,
            !isContextCompactionReviewEnabled,
            "Enable critical review to use rotation limits."
        );
    }
    setSettingStatus(
        contextCompactionReviewStatus,
        isContextCompactionReviewEnabled
            ? `On. A second model can challenge the summary for up to ${activeContextCompactionRotationLimit} pass${activeContextCompactionRotationLimit === 1 ? "" : "es"}.`
            : "Off. The first summary is used directly.",
        false
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

    options.agent_max_steps_at_a_time = activeAgentMaxStepsAtATime;
    options.agent_max_steps_per_run = activeAgentMaxStepsPerRun;

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

function getLocalTaskModelOptions(task) {
    const config = getLocalTaskModelConfig(task);
    const currentModel = getLocalTaskModel(config.task);
    const baseOptions = getLocalModelSwitcherOptions();
    const accepted = baseOptions.filter(option => {
        const capability = getOllamaModelCapability(option.id);
        return typeof config.filter === "function" ? config.filter(capability, option) : true;
    });
    const options = accepted.length > 0 ? accepted : baseOptions;
    const withRequiredModels = [...options];

    [currentModel, config.defaultModel].forEach(modelId => {
        const id = normalizeModelId(modelId);
        if (!id || withRequiredModels.some(option => ollamaModelMatches(option.id, id))) return;
        const option = getLocalModelOption(id);
        const capability = getOllamaModelCapability(id);
        withRequiredModels.unshift({
            ...option,
            id,
            label: option.label || id,
            meta: getLocalModelMeta(option, isOllamaModelInstalled(id), capability) || "Saved",
            provider: AI_PROVIDER_LOCAL
        });
    });

    return withRequiredModels;
}

function localTaskModelSupportsVision() {
    return getOllamaModelCapability(getLocalTaskModel("vision")).supportsImageInput === true;
}

function shouldUseLocalVisionTaskForFiles(files = []) {
    if (isOpenAiProvider()) return false;
    if (getImageFiles(files).length === 0) return false;
    if (getOllamaModelCapability(OLLAMA_MODEL).supportsImageInput === true) return false;
    return localTaskModelSupportsVision();
}

function getLocalTaskModelStatusRows() {
    return LOCAL_TASK_MODEL_CONFIGS.map(config => {
        const model = getLocalTaskModel(config.task);
        const capability = getOllamaModelCapability(model);
        const installed = isOllamaModelInstalled(model);
        const supportsTask = typeof config.filter === "function" ? config.filter(capability, { id: model, meta: "" }) : true;
        return {
            task: config.task,
            label: config.label,
            model,
            installed,
            supportsTask
        };
    });
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
    const missingCount = getRequiredOllamaModels().filter(model => !isOllamaModelInstalled(model)).length;
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

