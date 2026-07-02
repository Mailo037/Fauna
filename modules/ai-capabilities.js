const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models?output_modalities=text";

const OPENAI_FUNCTION_TOOL_PARAMETERS = ["tools", "tool_choice"];
const OPENAI_STRUCTURED_OUTPUT_PARAMETERS = ["structured_outputs", "response_format"];
const OPENAI_OUTPUT_CONTROL_PARAMETERS = ["max_output_tokens"];
const OPENAI_BASE_CHAT_PARAMETERS = [...OPENAI_FUNCTION_TOOL_PARAMETERS, ...OPENAI_STRUCTURED_OUTPUT_PARAMETERS, ...OPENAI_OUTPUT_CONTROL_PARAMETERS];
const OPENAI_BASE_CHAT_PARAMETERS_WITHOUT_STRUCTURED = [...OPENAI_FUNCTION_TOOL_PARAMETERS, ...OPENAI_OUTPUT_CONTROL_PARAMETERS];
const OPENAI_REASONING_CHAT_PARAMETERS = ["reasoning", ...OPENAI_BASE_CHAT_PARAMETERS];
const OPENAI_REASONING_CHAT_PARAMETERS_WITHOUT_STRUCTURED = ["reasoning", ...OPENAI_BASE_CHAT_PARAMETERS_WITHOUT_STRUCTURED];
const OPENAI_TEMPERATURE_CHAT_PARAMETERS = ["temperature", "top_p", ...OPENAI_BASE_CHAT_PARAMETERS];
const OPENAI_GPT5_REASONING_CHAT_PARAMETERS = [...OPENAI_REASONING_CHAT_PARAMETERS, "text.verbosity"];
const OPENAI_GPT5_REASONING_CHAT_PARAMETERS_WITHOUT_STRUCTURED = [...OPENAI_REASONING_CHAT_PARAMETERS_WITHOUT_STRUCTURED, "text.verbosity"];
const OPENAI_GPT5_TEMPERATURE_CHAT_PARAMETERS = [...OPENAI_TEMPERATURE_CHAT_PARAMETERS, "text.verbosity"];
const OPENAI_FULL_RESPONSES_TOOLS = ["web_search", "file_search", "image_generation", "code_interpreter", "hosted_shell", "apply_patch", "skills", "computer_use", "mcp", "tool_search"];
const OPENAI_PRO_55_RESPONSES_TOOLS = ["web_search", "file_search", "image_generation", "code_interpreter", "hosted_shell", "mcp"];
const OPENAI_PRO_54_RESPONSES_TOOLS = ["web_search", "file_search", "image_generation", "apply_patch", "computer_use", "mcp", "tool_search"];
const OPENAI_NANO_54_RESPONSES_TOOLS = ["web_search", "file_search", "image_generation", "code_interpreter", "hosted_shell", "apply_patch", "skills", "mcp"];
const OPENAI_CHAT_LATEST_RESPONSES_TOOLS = ["web_search", "file_search", "image_generation", "code_interpreter", "mcp"];
const OPENAI_TEXT_FILE_INPUT_CAPABILITIES = ["pdf", "text", "document", "spreadsheet"];
const OPENAI_VISION_FILE_INPUT_CAPABILITIES = [...OPENAI_TEXT_FILE_INPUT_CAPABILITIES, "pdf_page_images"];
const OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES = {
    supportsImageInput: true,
    supportsFileInput: true,
    fileInputCapabilities: OPENAI_VISION_FILE_INPUT_CAPABILITIES,
    supportsToolCalling: true,
    supportsStructuredOutputs: true
};
const OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES_WITHOUT_STRUCTURED = {
    ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
    supportsStructuredOutputs: false
};
const OPENAI_TEXT_ONLY_CHAT_CAPABILITIES = {
    supportsImageInput: false,
    supportsFileInput: true,
    fileInputCapabilities: OPENAI_TEXT_FILE_INPUT_CAPABILITIES,
    supportsToolCalling: true,
    supportsStructuredOutputs: true
};
const OPENAI_IMAGE_MODEL_CAPABILITIES = {
    supportsImageInput: true,
    supportsFileInput: false,
    fileInputCapabilities: ["image"],
    supportsToolCalling: false,
    supportsStructuredOutputs: false,
    supportsStreaming: false
};

export const AI_REASONING_MODE_OPTIONS = [
    { id: "none", label: "None", shortLabel: "None" },
    { id: "minimal", label: "Minimal", shortLabel: "Minimal" },
    { id: "low", label: "Low", shortLabel: "Low" },
    { id: "medium", label: "Medium", shortLabel: "Medium" },
    { id: "high", label: "High", shortLabel: "High" },
    { id: "xhigh", label: "Extra high", shortLabel: "Extra high" }
];

export const DEFAULT_OPENAI_CHAT_MODEL_OPTIONS = [
    {
        id: "gpt-5.5-pro",
        label: "GPT-5.5 Pro",
        shortLabel: "5.5 Pro",
        meta: "Deep reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        supportedTools: OPENAI_PRO_55_RESPONSES_TOOLS,
        reasoningModes: ["medium", "high", "xhigh"],
        defaultReasoningMode: "high",
        supportsTemperature: false,
        supportsStreaming: false
    },
    {
        id: "gpt-5.5",
        label: "GPT-5.5",
        shortLabel: "5.5",
        meta: "Chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        supportedTools: OPENAI_FULL_RESPONSES_TOOLS,
        reasoningModes: ["none", "low", "medium", "high", "xhigh"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.4-pro",
        label: "GPT-5.4 Pro",
        shortLabel: "5.4 Pro",
        meta: "Deep reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES_WITHOUT_STRUCTURED,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS_WITHOUT_STRUCTURED,
        supportedTools: OPENAI_PRO_54_RESPONSES_TOOLS,
        reasoningModes: ["medium", "high", "xhigh"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.4",
        label: "GPT-5.4",
        shortLabel: "5.4",
        meta: "Chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        supportedTools: OPENAI_FULL_RESPONSES_TOOLS,
        reasoningModes: ["none", "low", "medium", "high", "xhigh"],
        defaultReasoningMode: "none",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.4-mini",
        label: "GPT-5.4-Mini",
        shortLabel: "5.4 Mini",
        meta: "Fast chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        supportedTools: OPENAI_FULL_RESPONSES_TOOLS,
        reasoningModes: ["none", "low", "medium", "high", "xhigh"],
        defaultReasoningMode: "none",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.4-nano",
        label: "GPT-5.4-Nano",
        shortLabel: "5.4 Nano",
        meta: "Fastest chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        supportedTools: OPENAI_NANO_54_RESPONSES_TOOLS,
        reasoningModes: ["none", "low", "medium", "high", "xhigh"],
        defaultReasoningMode: "none",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.2",
        label: "GPT-5.2",
        shortLabel: "5.2",
        meta: "Reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["none", "low", "medium", "high", "xhigh"],
        defaultReasoningMode: "none",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.1",
        label: "GPT-5.1",
        shortLabel: "5.1",
        meta: "Reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["none", "low", "medium", "high"],
        defaultReasoningMode: "none",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5.1-chat-latest",
        label: "GPT-5.1 Chat",
        shortLabel: "5.1 Chat",
        meta: "ChatGPT style",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_TEMPERATURE_CHAT_PARAMETERS,
        supportedTools: OPENAI_CHAT_LATEST_RESPONSES_TOOLS,
        reasoningModes: [],
        supportsTemperature: true,
        supportsStreaming: true
    },
    {
        id: "gpt-5",
        label: "GPT-5",
        shortLabel: "5",
        meta: "Reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["minimal", "low", "medium", "high"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5-mini",
        label: "GPT-5 Mini",
        shortLabel: "5 Mini",
        meta: "Fast reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["minimal", "low", "medium", "high"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-5-nano",
        label: "GPT-5 Nano",
        shortLabel: "5 Nano",
        meta: "Tiny reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_GPT5_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["minimal", "low", "medium", "high"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "o3-pro",
        label: "o3-pro",
        shortLabel: "o3 Pro",
        meta: "Deep reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["low", "medium", "high"],
        defaultReasoningMode: "high",
        supportsTemperature: false,
        supportsStreaming: false
    },
    {
        id: "o3",
        label: "o3",
        shortLabel: "o3",
        meta: "Reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["low", "medium", "high"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "o4-mini",
        label: "o4-mini",
        shortLabel: "o4 Mini",
        meta: "Fast reasoning",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["low", "medium", "high"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "o3-mini",
        label: "o3-mini",
        shortLabel: "o3 Mini",
        meta: "Fast reasoning",
        provider: "openai",
        inputModalities: ["text"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_ONLY_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_REASONING_CHAT_PARAMETERS,
        reasoningModes: ["low", "medium", "high"],
        defaultReasoningMode: "medium",
        supportsTemperature: false,
        supportsStreaming: true
    },
    {
        id: "gpt-4.1",
        label: "GPT-4.1",
        shortLabel: "4.1",
        meta: "Classic chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_TEMPERATURE_CHAT_PARAMETERS,
        reasoningModes: [],
        supportsTemperature: true,
        supportsStreaming: true
    },
    {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 Mini",
        shortLabel: "4.1 Mini",
        meta: "Fast chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_TEMPERATURE_CHAT_PARAMETERS,
        reasoningModes: [],
        supportsTemperature: true,
        supportsStreaming: true
    },
    {
        id: "gpt-4.1-nano",
        label: "GPT-4.1 Nano",
        shortLabel: "4.1 Nano",
        meta: "Tiny chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_TEMPERATURE_CHAT_PARAMETERS,
        reasoningModes: [],
        supportsTemperature: true,
        supportsStreaming: true
    },
    {
        id: "gpt-4o",
        label: "GPT-4o",
        shortLabel: "4o",
        meta: "Classic chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_TEMPERATURE_CHAT_PARAMETERS,
        reasoningModes: [],
        supportsTemperature: true,
        supportsStreaming: true
    },
    {
        id: "gpt-4o-mini",
        label: "GPT-4o Mini",
        shortLabel: "4o Mini",
        meta: "Fast chat",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        ...OPENAI_TEXT_IMAGE_CHAT_CAPABILITIES,
        supportedParameters: OPENAI_TEMPERATURE_CHAT_PARAMETERS,
        reasoningModes: [],
        supportsTemperature: true,
        supportsStreaming: true
    }
];

export const DEFAULT_OPENAI_IMAGE_MODEL_OPTIONS = [
    {
        id: "gpt-image-2",
        label: "gpt-image-2",
        meta: "Latest image",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["image"],
        ...OPENAI_IMAGE_MODEL_CAPABILITIES,
        supportedParameters: ["quality", "size", "background", "output_format"],
        reasoningModes: [],
        supportsTemperature: false
    },
    {
        id: "gpt-image-1.5",
        label: "gpt-image-1.5",
        meta: "Image",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["image", "text"],
        ...OPENAI_IMAGE_MODEL_CAPABILITIES,
        supportedParameters: ["quality", "size", "background", "output_format"],
        reasoningModes: [],
        supportsTemperature: false
    },
    {
        id: "gpt-image-1",
        label: "gpt-image-1",
        meta: "Image",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["image"],
        ...OPENAI_IMAGE_MODEL_CAPABILITIES,
        supportedParameters: ["quality", "size", "background", "output_format"],
        reasoningModes: [],
        supportsTemperature: false
    },
    {
        id: "gpt-image-1-mini",
        label: "gpt-image-1-mini",
        meta: "Fast image",
        provider: "openai",
        inputModalities: ["text", "image"],
        outputModalities: ["image"],
        ...OPENAI_IMAGE_MODEL_CAPABILITIES,
        supportedParameters: ["quality", "size", "background", "output_format"],
        reasoningModes: [],
        supportsTemperature: false
    }
];

function normalizeId(value) {
    return String(value || "").trim();
}

function uniqueStrings(values = []) {
    return Array.from(new Set(
        values
            .map(value => String(value || "").trim())
            .filter(Boolean)
    ));
}

export function isLikelyChatModelId(modelId) {
    const id = normalizeId(modelId).toLowerCase();
    if (!id) return false;
    if (/(?:^|[/\-_])(image|img|realtime|transcribe|transcription|whisper|tts|speech|audio|embedding|moderation|rerank|codex)(?:[/\-_]|$)/i.test(id)) {
        return false;
    }
    return /^(?:openai\/)?(?:gpt-|o\d)/i.test(id);
}

function inferProvider(modelId, fallbackProvider = "") {
    const id = normalizeId(modelId);
    if (fallbackProvider) return fallbackProvider;
    if (id.includes("/")) return id.split("/", 1)[0];
    if (/^(?:gpt-|o\d)/i.test(id)) return "openai";
    return "";
}

function openRouterModelAliases(model = {}) {
    const ids = uniqueStrings([model.id, model.canonical_slug]);
    ids.forEach(id => {
        if (id.startsWith("openai/")) ids.push(id.slice("openai/".length));
    });
    return uniqueStrings(ids);
}

function normalizeModelRecord(model = {}) {
    const id = normalizeId(model.id);
    if (!id) return null;
    const architecture = model.architecture || {};
    const inputModalities = uniqueStrings([
        ...(architecture.input_modalities || []),
        ...String(architecture.modality || "").split("->").slice(0, 1).join(",").split(",")
    ]);
    const outputModalities = uniqueStrings([
        ...(architecture.output_modalities || []),
        ...String(architecture.modality || "").split("->").slice(1).join(",").split(",")
    ]);
    const suppliedSupportedParameters = uniqueStrings(model.supported_parameters || model.supportedParameters || []);
    const provider = inferProvider(id, model.provider);
    const baseId = provider === "openai" && id.startsWith("openai/") ? id.slice("openai/".length) : id;
    const known = [
        ...DEFAULT_OPENAI_CHAT_MODEL_OPTIONS,
        ...DEFAULT_OPENAI_IMAGE_MODEL_OPTIONS
    ].find(option => option.id === baseId || option.id === id);
    const supportedParameters = uniqueStrings([
        ...suppliedSupportedParameters,
        ...(known?.supportedParameters || [])
    ]);
    const isChat = Boolean(model.isChat ?? (
        isLikelyChatModelId(id)
        && inputModalities.includes("text")
        && outputModalities.includes("text")
    ));
    const reasoningModes = uniqueStrings(model.reasoningModes || known?.reasoningModes || []);
    const supportedTools = uniqueStrings(model.supportedTools || model.tools || known?.supportedTools || []);
    const fileInputCapabilities = uniqueStrings(model.fileInputCapabilities || known?.fileInputCapabilities || []);
    const defaultReasoningMode = normalizeId(model.defaultReasoningMode || known?.defaultReasoningMode);
    const supportsImageInput = typeof model.supportsImageInput === "boolean"
        ? model.supportsImageInput
        : inputModalities.includes("image") || known?.supportsImageInput === true;
    const supportsFileInput = typeof model.supportsFileInput === "boolean"
        ? model.supportsFileInput
        : known?.supportsFileInput === true;
    const supportsToolCalling = typeof model.supportsToolCalling === "boolean"
        ? model.supportsToolCalling
        : supportedParameters.includes("tools") || known?.supportsToolCalling === true;
    const supportsStructuredOutputs = typeof model.supportsStructuredOutputs === "boolean"
        ? model.supportsStructuredOutputs
        : supportedParameters.some(parameter => OPENAI_STRUCTURED_OUTPUT_PARAMETERS.includes(parameter))
            || known?.supportsStructuredOutputs === true;
    const supportsTemperature = typeof model.supportsTemperature === "boolean"
        ? model.supportsTemperature
        : supportedParameters.includes("temperature") || known?.supportsTemperature === true;
    const supportsStreaming = typeof model.supportsStreaming === "boolean"
        ? model.supportsStreaming
        : known?.supportsStreaming !== false;

    return {
        id: baseId,
        sourceId: id,
        label: model.label || model.name || known?.label || baseId,
        shortLabel: model.shortLabel || known?.shortLabel || "",
        meta: model.meta || known?.meta || (isChat ? "Chat" : ""),
        provider,
        isChat,
        inputModalities: inputModalities.length ? inputModalities : (known?.inputModalities || ["text"]),
        outputModalities: outputModalities.length ? outputModalities : (known?.outputModalities || ["text"]),
        supportedParameters: supportedParameters.length ? supportedParameters : (known?.supportedParameters || []),
        supportedTools,
        reasoningModes,
        fileInputCapabilities,
        defaultReasoningMode: reasoningModes.includes(defaultReasoningMode) ? defaultReasoningMode : "",
        supportsImageInput,
        supportsFileInput,
        supportsToolCalling,
        supportsStructuredOutputs,
        supportsTemperature,
        supportsStreaming,
        contextLength: model.context_length || model.contextLength || known?.contextLength || null
    };
}

export function createAiCapabilityRegistry(initialModels = DEFAULT_OPENAI_CHAT_MODEL_OPTIONS) {
    const records = new Map();
    const aliases = new Map();

    const addRecord = model => {
        const record = normalizeModelRecord(model);
        if (!record) return null;
        const existing = records.get(record.id);
        records.set(record.id, existing ? { ...existing, ...record } : record);
        uniqueStrings([record.id, record.sourceId, ...(model.aliases || [])]).forEach(alias => {
            aliases.set(alias, record.id);
        });
        return record;
    };

    initialModels.forEach(model => addRecord(model));

    const getRecord = modelId => {
        const id = normalizeId(modelId);
        return records.get(id) || records.get(aliases.get(id)) || null;
    };

    const getReasoningOptions = modelId => {
        const record = getRecord(modelId);
        return (record?.reasoningModes || [])
            .map(mode => AI_REASONING_MODE_OPTIONS.find(option => option.id === mode))
            .filter(Boolean);
    };

    const normalizeReasoningMode = (mode, modelId, fallbackMode = "medium") => {
        const record = getRecord(modelId);
        const options = getReasoningOptions(modelId);
        if (options.length === 0) return "";
        const requested = normalizeId(mode).toLowerCase();
        const fallback = record?.defaultReasoningMode || fallbackMode;
        return options.some(option => option.id === requested)
            ? requested
            : (options.find(option => option.id === fallback)?.id || options[0].id);
    };

    const supportsParameter = (modelId, parameter) => {
        const record = getRecord(modelId);
        return Boolean(record?.supportedParameters?.includes(parameter));
    };

    const supportsInputModality = (modelId, modality) => {
        const record = getRecord(modelId);
        return Boolean(record?.inputModalities?.includes(modality));
    };

    const toModelOption = record => {
        if (!record) return null;
        return {
            id: record.id,
            label: record.label,
            shortLabel: record.shortLabel,
            meta: record.meta,
            provider: record.provider,
            isChat: record.isChat,
            reasoningModes: [...record.reasoningModes],
            inputModalities: [...record.inputModalities],
            outputModalities: [...record.outputModalities],
            supportedParameters: [...record.supportedParameters],
            supportedTools: [...record.supportedTools],
            defaultReasoningMode: record.defaultReasoningMode,
            fileInputCapabilities: [...record.fileInputCapabilities],
            supportsImageInput: record.supportsImageInput,
            supportsFileInput: record.supportsFileInput,
            supportsToolCalling: record.supportsToolCalling,
            supportsStructuredOutputs: record.supportsStructuredOutputs,
            supportsTemperature: record.supportsTemperature,
            supportsStreaming: record.supportsStreaming,
            contextLength: record.contextLength
        };
    };

    const getModelOption = modelId => {
        return toModelOption(getRecord(modelId));
    };

    const getChatModelOptions = ({ provider = "", availableIds = null } = {}) => {
        return Array.from(records.values())
            .filter(record => record.isChat)
            .filter(record => !provider || record.provider === provider)
            .filter(record => !availableIds || availableIds.has(record.id) || availableIds.has(record.sourceId))
            .map(record => getModelOption(record.id));
    };

    const getAllModelOptions = ({ provider = "", availableIds = null } = {}) => {
        return Array.from(records.values())
            .filter(record => !provider || record.provider === provider)
            .filter(record => !availableIds || availableIds.has(record.id) || availableIds.has(record.sourceId))
            .map(toModelOption)
            .filter(Boolean);
    };

    const ingestOpenRouterModels = (models = []) => {
        models.forEach(model => {
            const record = normalizeModelRecord(model);
            if (!record) return;
            addRecord(record);
            openRouterModelAliases(model).forEach(alias => aliases.set(alias, record.id));
        });
    };

    return {
        addRecord,
        ingestOpenRouterModels,
        getRecord,
        getModelOption,
        getAllModelOptions,
        getChatModelOptions,
        getReasoningOptions,
        normalizeReasoningMode,
        supportsParameter,
        supportsInputModality,
        supportsImageInput: modelId => Boolean(getRecord(modelId)?.supportsImageInput),
        supportsFileInput: modelId => Boolean(getRecord(modelId)?.supportsFileInput),
        supportsToolCalling: modelId => Boolean(getRecord(modelId)?.supportsToolCalling),
        supportsStructuredOutputs: modelId => Boolean(getRecord(modelId)?.supportsStructuredOutputs),
        getSupportedTools: modelId => [...(getRecord(modelId)?.supportedTools || [])],
        isChatModel: modelId => Boolean(getRecord(modelId)?.isChat)
    };
}

export function compactOpenRouterModels(models = []) {
    return models.map(model => ({
        id: model.id,
        canonical_slug: model.canonical_slug,
        name: model.name,
        architecture: {
            input_modalities: model.architecture?.input_modalities || [],
            output_modalities: model.architecture?.output_modalities || [],
            modality: model.architecture?.modality || ""
        },
        supported_parameters: model.supported_parameters || [],
        context_length: model.context_length || null
    })).filter(model => model.id);
}

export async function fetchOpenRouterModelCatalog({ signal = null } = {}) {
    const response = await fetch(OPENROUTER_MODELS_URL, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal
    });
    if (!response.ok) {
        throw new Error(`OpenRouter models failed with HTTP ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
}
