import { createSidebarController } from "./modules/sidebar.js";
import { createImageLightbox } from "./modules/lightbox.js";
import { createThemeController } from "./modules/theme.js?v=20260705-no-caps";
import { createModelSwitcher } from "./modules/model-switcher.js?v=20260705-side-chat-composer-full";
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

const FAUNA_SCRIPT_CHUNK_VERSION = "20260706-capabilities-release";
const FAUNA_SCRIPT_DEPENDENCIES_KEY = "__faunaScriptDependencies";
const FAUNA_SCRIPT_CHUNKS = [
    "./scripts/01-dom-state-feedback.js",
    "./scripts/02-openai-pricing-dialogs.js",
    "./scripts/03-rendering-usage-tokens.js",
    "./scripts/04-model-switcher-core.js",
    "./scripts/05-model-catalog-persona-memory.js",
    "./scripts/06-memory-sessions-library-core.js",
    "./scripts/07-library-provider-web-start.js",
    "./scripts/08-web-local-tools.js",
    "./scripts/09-capabilities-connectors.js",
    "./scripts/09-clarifying-files-composer.js",
    "./scripts/10-usage-commands-pipeline.js",
    "./scripts/11-media-generation.js",
    "./scripts/12-message-actions-sources.js",
    "./scripts/13-markdown-code-workbench-core.js",
    "./scripts/14-code-cards-settings.js",
    "./scripts/15-realtime-voice.js",
    "./scripts/16-voice-transcription-speech.js"
];

const faunaScriptDependencies = {
    createSidebarController,
    createImageLightbox,
    createThemeController,
    createModelSwitcher,
    DEFAULT_OPENAI_CHAT_MODEL_OPTIONS,
    DEFAULT_OPENAI_IMAGE_MODEL_OPTIONS,
    compactOpenRouterModels,
    createAiCapabilityRegistry,
    fetchOpenRouterModelCatalog,
    isLikelyChatModelId,
    safeLocalStorageGet,
    safeLocalStorageSet,
    safeLocalStorageRemove
};

async function fetchFaunaScriptChunk(chunkPath) {
    const url = new URL(chunkPath, import.meta.url);
    url.searchParams.set("v", FAUNA_SCRIPT_CHUNK_VERSION);
    const response = await fetch(url, { credentials: "same-origin", cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`Could not load ${chunkPath}: ${response.status}`);
    }
    return `\n// ${chunkPath}\n${await response.text()}\n`;
}

function createFaunaScriptModuleSource(chunkSources) {
    const dependencyNames = Object.keys(faunaScriptDependencies).join(",\n    ");
    return `const {\n    ${dependencyNames}\n} = globalThis.${FAUNA_SCRIPT_DEPENDENCIES_KEY};\n${chunkSources.join("\n")}\n//# sourceURL=fauna-script-chunks.js\n`;
}

globalThis[FAUNA_SCRIPT_DEPENDENCIES_KEY] = faunaScriptDependencies;

const chunkSources = await Promise.all(FAUNA_SCRIPT_CHUNKS.map(fetchFaunaScriptChunk));
const scriptBlob = new Blob([createFaunaScriptModuleSource(chunkSources)], { type: "text/javascript" });
const scriptUrl = URL.createObjectURL(scriptBlob);

try {
    await import(scriptUrl);
} finally {
    URL.revokeObjectURL(scriptUrl);
    delete globalThis[FAUNA_SCRIPT_DEPENDENCIES_KEY];
}
