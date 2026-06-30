const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const input = document.getElementById("prompt");
const sendButton = document.getElementById("sendButton");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarToggles = document.querySelectorAll(".sidebar-toggle-btn");
const newChatBtn = document.getElementById("newChat");
const uploadButton = document.getElementById("uploadButton");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const tokenCounter = document.getElementById("tokenCounter");
const imageLightbox = document.getElementById("imageLightbox");
const imageLightboxImg = imageLightbox?.querySelector(".image-lightbox-img");
const imageLightboxClose = imageLightbox?.querySelector(".image-lightbox-close");

// Tools & Sandbox Elements
const toolsBtn = document.getElementById("toolsBtn");
const toolsDropdown = document.getElementById("toolsDropdown");
const toggleSandbox = document.getElementById("toggleSandbox");
const toggleWebSearch = document.getElementById("toggleWebSearch");
const toggleGrounding = document.getElementById("toggleGrounding");
const toggleGoogleGrounding = document.getElementById("toggleGoogleGrounding");
const paramTemp = document.getElementById("paramTemp");
const tempValue = document.getElementById("tempValue");
const exportChatBtn = document.getElementById("exportChatBtn");
const wanEndpointInput = document.getElementById("wanEndpointInput");
const wanWorkflowInput = document.getElementById("wanWorkflowInput");
const wanStatus = document.getElementById("wanStatus");
const wanSaveBtn = document.getElementById("wanSaveBtn");
const wanTestBtn = document.getElementById("wanTestBtn");
const wanClearBtn = document.getElementById("wanClearBtn");

let isSandboxEnabled = true;
let isWebSearchEnabled = true;
let isGroundingEnabled = true;
let isGoogleGroundingEnabled = true;
let activeTemperature = 0.7;

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
const disabledButtonStates = new Map();

// Helper: Estimate tokens based on a standard 1 token ≈ 4 chars rule
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

function updateTokenDisplay() {
    if (tokenCounter) {
        tokenCounter.textContent = `${sessionTotalTokens.toLocaleString()} Tokens (Sessie)`;
    }
}

// ===== MODEL SWITCHER LOGIC =====
const OLLAMA_URL = "http://localhost:11434/api/chat";
const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const BING_SEARCH_URL = "https://www.bing.com/search";
const DUCKDUCKGO_SEARCH_URL = "https://duckduckgo.com/";
const IMAGE_GEN_BASE_URL = "https://image.pollinations.ai/prompt/";
const DEFAULT_WAN_VIDEO_BASE_URL = "http://localhost:8188";
const WAN_VIDEO_ENDPOINT_STORAGE_KEY = "floraWanEndpoint";
const WAN_VIDEO_WORKFLOW_STORAGE_KEY = "floraWanWorkflow";
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
let conversationHistory = [];

function setActiveModel(model) {
    OLLAMA_MODEL = model;
    if (modelLabel) {
        modelLabel.textContent = model;
    }
    document.querySelectorAll(".model-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.model === model);
    });
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

async function sendOllamaChat(messages, options = {}, preferredModel = OLLAMA_MODEL) {
    const triedModels = [];
    const modelsToTry = [preferredModel];

    if (preferredModel !== FALLBACK_MODEL) {
        modelsToTry.push(FALLBACK_MODEL);
    }

    for (const model of modelsToTry) {
        triedModels.push(model);

        const res = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages,
                options,
                stream: false
            })
        });

        if (res.ok) {
            setActiveModel(model);
            return await res.json();
        }
    }

    throw new Error(`No available model responded. Tried: ${triedModels.join(", ")}`);
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
        return { context: "", sources: [] };
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
        sources: results
    };
}

if (modelDropdown && modelBtn) {
    availableModels.forEach(model => {
        const btn = document.createElement("button");
        btn.className = "model-option";
        btn.dataset.model = model;
        if (model === OLLAMA_MODEL) btn.classList.add("active");
        btn.innerHTML = `${model}`;
        
        btn.onclick = () => {
            setActiveModel(model);
            modelDropdown.classList.remove("open");
        };
        modelDropdown.appendChild(btn);
    });

    modelBtn.onclick = (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle("open");
    };

    document.addEventListener("click", (e) => {
        if (!modelBtn.contains(e.target) && !modelDropdown.contains(e.target)) {
            modelDropdown.classList.remove("open");
        }
    });
}

setActiveModel(OLLAMA_MODEL);

// ===== IMAGE LIGHTBOX =====
function openImageLightbox(src) {
    if (!imageLightbox || !imageLightboxImg) return;
    imageLightboxImg.src = src;
    imageLightbox.hidden = false;
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeImageLightbox() {
    if (!imageLightbox || !imageLightboxImg) return;
    imageLightbox.hidden = true;
    imageLightbox.setAttribute("aria-hidden", "true");
    imageLightboxImg.src = "";
    document.body.style.overflow = "";
}

if (imageLightbox) {
    imageLightboxClose?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeImageLightbox();
    });
    imageLightbox.addEventListener("click", closeImageLightbox);
    imageLightboxImg?.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !imageLightbox.hidden) closeImageLightbox();
    });
}

chat.addEventListener("click", (e) => {
    const img = e.target.closest(".bubble-img");
    if (img?.src) openImageLightbox(img.src);
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
});

input.addEventListener("paste", e => {
    if (isGenerating) return;
    Array.from(e.clipboardData.items).forEach(item => {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) return;
            const ext = item.type.split("/")[1] || "png";
            const named = new File([file], "pasted-image." + ext, { type: item.type });
            attachedFiles.push(named);
            renderPreviewPill(named);
        }
    });
});

function renderPreviewPill(file) {
    const pill = document.createElement("div");
    pill.className = "preview-pill";
    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "14px"; img.style.height = "14px"; img.style.objectFit = "cover"; img.style.borderRadius = "3px";
        pill.appendChild(img);
    } else {
        pill.insertAdjacentHTML("beforeend", `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`);
    }
    const nameSpan = document.createElement("span");
    nameSpan.textContent = file.name;
    pill.appendChild(nameSpan);
    const closeBtn = document.createElement("button");
    closeBtn.className = "remove-preview";
    closeBtn.style.background = "none"; closeBtn.style.border = "none"; closeBtn.style.color = "var(--text-dim)"; closeBtn.style.cursor = "pointer";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => { attachedFiles = attachedFiles.filter(f => f !== file); pill.remove(); };
    pill.appendChild(closeBtn);
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

    sendButton.setAttribute("aria-busy", busy ? "true" : "false");
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
});

async function processWorkspaceEntry() {
    if (isGenerating) return;

    const textValue = input.value.trim();
    if (!textValue && attachedFiles.length === 0) return;
    const speakThisReply = shouldSpeakNextReply && textValue.length > 0;
    const videoPrompt = getVideoCommandPrompt(textValue);
    const imagePrompt = getImageCommandPrompt(textValue) ?? getNaturalImageGenerationPrompt(textValue, attachedFiles);
    shouldSpeakNextReply = false;

    setGeneratingBusy(true);

    try {
        welcome.style.display = "none";
        chat.style.display = "block";

        const currentFiles = [...attachedFiles];
        input.value = "";
        input.style.height = "auto";
        previewContainer.innerHTML = "";
        attachedFiles = [];

        const routedModel = chooseModelForRequest(textValue, currentFiles, imagePrompt, videoPrompt);
        setActiveModel(routedModel);

        addRenderNode(textValue, "user", currentFiles);

        if (videoPrompt !== null) {
            await processVideoGeneration(videoPrompt, currentFiles);
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        if (imagePrompt !== null) {
            await processImageGeneration(imagePrompt, currentFiles);
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        if (isImageEditRequest(textValue, currentFiles)) {
            await processImageEdit(textValue, currentFiles);
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        let messageContent = textValue;
        let base64Images = [];

        for (const file of currentFiles) {
            if (file.type.startsWith("image/")) {
                try {
                    const b64 = await fileToBase64(file);
                    base64Images.push(b64);
                } catch (err) {
                    console.error("Image loading fail:", err);
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

        const aiBubble = addRenderNode("__thinking__", "output");
        let webSources = [];

        if (base64Images.length === 0 && shouldSearchWeb(textValue)) {
            aiBubble.textContent = "Searching the web...";
            try {
                const webResult = await getWebContextForPrompt(textValue);
                if (webResult.context) {
                    messageContent += webResult.context;
                    webSources = webResult.sources;
                }
            } catch (err) {
                messageContent += `\n\n[Web search was requested, but the browser could not fetch online results: ${err.message}]`;
            }
        }

        sessionTotalTokens += estimateTokens(messageContent);
        updateTokenDisplay();

        const userMessageObject = { role: "user", content: messageContent };
        if (base64Images.length > 0) {
            userMessageObject.images = base64Images;
        }
        conversationHistory.push(userMessageObject);

        try {
            const data = await sendOllamaChat(
                conversationHistory,
                { temperature: parseFloat(activeTemperature) },
                OLLAMA_MODEL
            );
            conversationHistory.push(data.message);

            sessionTotalTokens += estimateTokens(data.message.content);
            updateTokenDisplay();

            aiBubble.innerHTML = renderMarkdown(data.message.content);
            setupCodeSandbox(aiBubble);
            setupCopyFeature(aiBubble.parentElement, data.message.content);
            renderWebSources(aiBubble.parentElement, webSources);
            if (speakThisReply) {
                speakReply(data.message.content);
            }

        } catch (e) {
            aiBubble.textContent = `Fout: ${e.message}. Maak seker Ollama hardloop en jou modelle is gelaai.`;
            aiBubble.style.color = "#ef4444";
        }

        chat.scrollTop = chat.scrollHeight;
    } finally {
        setGeneratingBusy(false);
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

    return /\b(code|coding|program|script|function|component|debug|fix bug|error|refactor|html|css|javascript|typescript|python|react|node|api|database|sql|terminal|powershell|kode|programmeer|skrip)\b/i.test(text);
}

function isHighThinkingRequest(text) {
    return /\b(analyze|analyse|reason|think deeply|compare|evaluate|strategy|plan|architecture|design decision|pros and cons|trade[- ]?offs|explain why|solve|complex|advanced|proof|math|logic|research|ontleed|vergelyk|strategie|beplan|argitektuur|ingewikkeld)\b/i.test(text);
}

function isSensitiveImagePrompt(text) {
    return /\b(18\+|adult|nsfw|nude|nudity|naked|explicit|erotic|sex|sexual|porn|lingerie|fetish|topless|sensual|seductive|suggestive|bikini|swimsuit|underwear)\b/i.test(text);
}

async function processImageGeneration(prompt, currentFiles) {
    if (!prompt) {
        const errorBubble = addRenderNode("Type what to generate after the command, for example: /image cat wearing sunglasses", "output");
        errorBubble.style.color = "#ef4444";
        return;
    }

    if (getImageFiles(currentFiles).length > 0) {
        await processImageEdit(prompt, currentFiles);
        return;
    }

    if (currentFiles.length > 0) {
        const noteBubble = addRenderNode("Image generation uses the text prompt only. Non-image attachments were shown above but not sent to the image generator.", "output");
        noteBubble.style.color = "#f59e0b";
    }

    sessionTotalTokens += estimateTokens(prompt);
    updateTokenDisplay();

    conversationHistory.push({ role: "user", content: `[Image prompt] ${prompt}` });

    const aiBubble = addRenderNode("__thinking__", "output");
    const imageUrl = buildImageGenerationUrl(prompt);

    try {
        await preloadImage(imageUrl);
        renderGeneratedImage(aiBubble, prompt, imageUrl, "Generated image", isSensitiveImagePrompt(prompt));
        conversationHistory.push({
            role: "assistant",
            content: `Generated image for: ${prompt}\n\n![Generated image](${imageUrl})`
        });
        setupCopyFeature(aiBubble.parentElement, imageUrl);
    } catch (e) {
        aiBubble.textContent = "Image generation failed. Check your internet connection and try again.";
        aiBubble.style.color = "#ef4444";
    }
}

async function processImageEdit(requestText, currentFiles) {
    if (!requestText) {
        const errorBubble = addRenderNode("Tell me what to change in the attached image.", "output");
        errorBubble.style.color = "#ef4444";
        return;
    }

    const imageFiles = getImageFiles(currentFiles);
    if (imageFiles.length === 0) {
        await processImageGeneration(requestText, currentFiles);
        return;
    }

    sessionTotalTokens += estimateTokens(requestText);
    updateTokenDisplay();

    const aiBubble = addRenderNode("__thinking__", "output");

    try {
        const editPrompt = await buildImageEditPrompt(requestText, imageFiles);
        const imageUrl = buildImageGenerationUrl(editPrompt);

        await preloadImage(imageUrl);
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
        aiBubble.textContent = `Image edit failed: ${e.message}. Make sure Ollama is running and the "${IMAGE_EDIT_MODEL}" vision model is installed, or try /image with a text-only prompt.`;
        aiBubble.style.color = "#ef4444";
    }
}

async function buildImageEditPrompt(requestText, imageFiles) {
    const base64Images = [];

    for (const file of imageFiles.slice(0, 3)) {
        base64Images.push(await fileToBase64(file));
    }

    const data = await sendOllamaChat(
        [
            {
                role: "system",
                content: IMAGE_EDIT_SYSTEM_PROMPT
            },
            {
                role: "user",
                content: `Requested image change: ${requestText}`,
                images: base64Images
            }
        ],
        { temperature: 0.35 },
        IMAGE_EDIT_MODEL
    );
    const prompt = data?.message?.content?.trim();
    if (!prompt) throw new Error("No edit prompt returned");

    return prompt.replace(/^["']|["']$/g, "");
}

async function processVideoGeneration(prompt, currentFiles) {
    if (!prompt) {
        const errorBubble = addRenderNode("Type what to generate after the command, for example: /video neon forest flythrough", "output");
        errorBubble.style.color = "#ef4444";
        return;
    }

    if (currentFiles.length > 0) {
        const noteBubble = addRenderNode("Video generation uses the text prompt only. Attachments were shown above but not sent to the clip generator.", "output");
        noteBubble.style.color = "#f59e0b";
    }

    sessionTotalTokens += estimateTokens(prompt);
    updateTokenDisplay();

    conversationHistory.push({ role: "user", content: `[Video prompt, 10 seconds] ${prompt}` });

    const aiBubble = addRenderNode("__thinking__", "output");

    try {
        const videoResult = await generateWanVideo(prompt);

        renderGeneratedVideo(aiBubble, prompt, videoResult.url, videoResult.extension, videoResult.label);
        conversationHistory.push({
            role: "assistant",
            content: `Generated Wan video clip for: ${prompt}\n\n${videoResult.url}`
        });
        setupCopyFeature(aiBubble.parentElement, videoResult.url);
    } catch (e) {
        try {
            const fallbackNote = `${e.message}. Falling back to Flora's local animated clip generator.`;
            console.warn("Wan video generation unavailable:", fallbackNote);
            const imageUrl = buildImageGenerationUrl(`${prompt}, cinematic still frame, high detail, wide shot`);
            const sourceImage = await loadImageElement(imageUrl);
            const videoResult = await createTenSecondClip(sourceImage, prompt);

            renderGeneratedVideo(aiBubble, prompt, videoResult.url, videoResult.extension, "Fallback animated clip");
            conversationHistory.push({
                role: "assistant",
                content: `Wan was unavailable, so Flora generated a fallback 10 second animated clip for: ${prompt}\n\n${videoResult.url}`
            });
            setupCopyFeature(aiBubble.parentElement, videoResult.url);
        } catch (fallbackError) {
            aiBubble.textContent = `Video generation failed: ${fallbackError.message}. Wan/ComfyUI needs to be running locally, or your browser needs MP4 MediaRecorder support for fallback clips.`;
            aiBubble.style.color = "#ef4444";
        }
    }
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
    const workflow = window.FLORA_WAN_WORKFLOW || localStorage.getItem(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
    if (!workflow) {
        throw new Error(`No Wan workflow configured. Add a ComfyUI API workflow to localStorage key "${WAN_VIDEO_WORKFLOW_STORAGE_KEY}"`);
    }

    return typeof workflow === "string" ? JSON.parse(workflow) : structuredClone(workflow);
}

function getWanVideoBaseUrl() {
    const saved = localStorage.getItem(WAN_VIDEO_ENDPOINT_STORAGE_KEY);
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

async function generateWanVideo(prompt) {
    const workflow = prepareWanWorkflow(prompt);
    const baseUrl = getWanVideoBaseUrl();
    const queueRes = await fetch(`${baseUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow })
    });

    if (!queueRes.ok) {
        throw new Error(`ComfyUI rejected the Wan workflow (${queueRes.status})`);
    }

    const queued = await queueRes.json();
    if (!queued.prompt_id) {
        throw new Error("ComfyUI did not return a prompt id");
    }

    const outputs = await waitForComfyHistory(queued.prompt_id, baseUrl);
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

async function waitForComfyHistory(promptId, baseUrl) {
    const startedAt = Date.now();
    const timeoutMs = 12 * 60 * 1000;

    while (Date.now() - startedAt < timeoutMs) {
        const res = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`);
        if (res.ok) {
            const history = await res.json();
            const result = history[promptId];
            if (result?.outputs) return result.outputs;
        }

        await sleep(2500);
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
    });
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
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

function createTenSecondClip(sourceImage, prompt) {
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
    download.download = `flora-clip.${extension}`;
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
        avatar.setAttribute("aria-label", "Flora");
    }
    node.appendChild(avatar);

    const block = document.createElement("div");
    block.className = "bubble-block";

    const bubble = document.createElement("div");
    bubble.className = "bubble markdown";
    if (text === "__thinking__") {
        bubble.innerHTML = `
            <div class="skeleton-block">
                <div class="skeleton-line" style="width:80%"></div>
                <div class="skeleton-line" style="width:65%"></div>
                <div class="skeleton-line" style="width:90%"></div>
                <div class="skeleton-line" style="width:50%"></div>
            </div>`;
    } else {
        bubble.textContent = text;
    }

    if (fileArray.length > 0) {
        const attachContainer = document.createElement("div");
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
                badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> <span style="margin-left: 6px">${file.name}</span>`;
                attachContainer.appendChild(badge);
            }
        });
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

function setupCopyFeature(parentBubbleBlock, rawTextToCopy) {
    const existing = parentBubbleBlock.querySelector(".copy-action-btn");
    if (existing) existing.remove();

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-action-btn";
    copyBtn.setAttribute("aria-label", "Copy output content");
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(rawTextToCopy).then(() => {
            copyBtn.classList.add("copied");
            setTimeout(() => copyBtn.classList.remove("copied"), 1800);
        });
    };
    parentBubbleBlock.appendChild(copyBtn);
}

function renderWebSources(parentBubbleBlock, sources) {
    if (!parentBubbleBlock || !sources || sources.length === 0) return;

    const existingSources = parentBubbleBlock.querySelector(".web-sources");
    if (existingSources) existingSources.remove();

    const panel = document.createElement("div");
    panel.className = "web-sources";

    const title = document.createElement("div");
    title.className = "web-sources-title";
    title.textContent = "Sources used";
    panel.appendChild(title);

    sources.forEach((source, index) => {
        const link = document.createElement("a");
        link.className = "web-source-link";
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `${index + 1}. ${source.title || source.url}`;
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
        str = str.replace(/`([^`]+)`/g, (_, c) => "<code>" + escape(c) + "</code>");
        str = str.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
        str = str.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        str = str.replace(/\*(.+?)\*/g, "<em>$1</em>");
        return str;
    };

    for (const raw of lines) {
        const fence = raw.match(/^```(\w*)$/);
        if (fence) {
            if (!inCode) {
                closeList();
                inCode = true;
                codeLang = fence[1] || "";
                codeBuffer = "";
            } else {
                html += "<pre><code class=\"lang-" + escape(codeLang) + "\">" + escape(codeBuffer.replace(/\n$/,"")) + "</code></pre>";
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
    return html;
}

// ===== SECURE CODE SANDBOX SYSTEM =====
const PREVIEW_HTML_LANGS = new Set(["html", "htm", "xhtml", "svg"]);
const PREVIEW_JS_LANGS = new Set(["js", "javascript", "mjs", "jsx", "ts", "typescript"]);
const PREVIEW_CSS_LANGS = new Set(["css"]);
const PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-modals allow-popups";

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

function getCodeBlockLangLabel(lang, kind) {
    const normalized = (lang || "").toLowerCase().trim();
    return normalized || kind || "code";
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

function createPreviewPanel() {
    const panel = document.createElement("div");
    panel.className = "html-preview-box";
    panel.innerHTML = `<iframe class="html-preview-iframe" sandbox="${PREVIEW_IFRAME_SANDBOX}" title="Code preview"></iframe>`;
    return panel;
}

function createConsolePanel() {
    const panel = document.createElement("div");
    panel.className = "console-output-box";
    return panel;
}

function showPreviewPanel(panel, documentHtml) {
    panel.style.display = "block";
    const iframe = panel.querySelector(".html-preview-iframe");
    if (iframe) iframe.srcdoc = documentHtml;
}

function hidePanel(panel) {
    panel.style.display = "none";
    const iframe = panel?.querySelector(".html-preview-iframe");
    if (iframe) iframe.srcdoc = "";
}

function setActionButtonState(btn, active, activeLabel, idleLabel) {
    btn.classList.toggle("active", active);
    btn.querySelector("span").textContent = active ? activeLabel : idleLabel;
}

function createActionButton(label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-action-btn";
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>${label}</span>
    `;
    return btn;
}

function collectPreviewBlocks(container) {
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
    }).filter(block => block.kind && block.pre);
}

function addCombinedPreviewBar(container, blocks) {
    if (container.querySelector(".code-combined-preview")) return;

    const bar = document.createElement("div");
    bar.className = "code-combined-preview";
    bar.innerHTML = `
        <div class="code-combined-preview-header">
            <span class="code-combined-preview-label">Live preview</span>
            <button type="button" class="code-combined-preview-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>Preview all blocks</span>
            </button>
        </div>
    `;

    const previewPanel = createPreviewPanel();
    bar.appendChild(previewPanel);
    container.insertBefore(bar, container.firstChild);

    const toggleBtn = bar.querySelector(".code-combined-preview-btn");
    toggleBtn.onclick = () => {
        const isVisible = previewPanel.style.display === "block";
        if (isVisible) {
            hidePanel(previewPanel);
            toggleBtn.classList.remove("active");
            toggleBtn.querySelector("span").textContent = "Preview all blocks";
        } else {
            showPreviewPanel(previewPanel, buildCombinedPreviewDocument(blocks));
            toggleBtn.classList.add("active");
            toggleBtn.querySelector("span").textContent = "Hide preview";
        }
        chat.scrollTop = chat.scrollHeight;
    };
}

function wrapPreviewableCodeBlock(pre, lang, code, kind) {
    if (pre.parentElement?.classList.contains("code-block-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);

    const header = document.createElement("div");
    header.className = "code-block-header";

    const label = document.createElement("span");
    label.className = "code-lang-label";
    label.textContent = getCodeBlockLangLabel(lang, kind);

    const actions = document.createElement("div");
    actions.className = "code-block-actions";

    const previewBtn = createActionButton("Preview");
    actions.appendChild(previewBtn);

    let consoleBtn = null;
    if (kind === "js") {
        consoleBtn = createActionButton("Console");
        actions.appendChild(consoleBtn);
    }

    header.appendChild(label);
    header.appendChild(actions);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);

    const previewPanel = createPreviewPanel();
    wrapper.appendChild(previewPanel);

    let consolePanel = null;
    if (kind === "js") {
        consolePanel = createConsolePanel();
        wrapper.appendChild(consolePanel);
    }

    let activeMode = null;

    const closeAll = () => {
        hidePanel(previewPanel);
        if (consolePanel) {
            consolePanel.style.display = "none";
            consolePanel.innerHTML = "";
        }
        setActionButtonState(previewBtn, false, "Hide preview", "Preview");
        if (consoleBtn) setActionButtonState(consoleBtn, false, "Hide console", "Console");
        activeMode = null;
    };

    previewBtn.onclick = () => {
        if (activeMode === "preview") {
            closeAll();
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        closeAll();
        let documentHtml;
        if (kind === "html") {
            documentHtml = wrapAsPreviewDocument(code);
        } else if (kind === "css") {
            documentHtml = buildCssPreviewDocument(code);
        } else {
            documentHtml = wrapAsPreviewDocument('<div id="app"></div>', "", code);
        }

        showPreviewPanel(previewPanel, documentHtml);
        setActionButtonState(previewBtn, true, "Hide preview", "Preview");
        activeMode = "preview";
        chat.scrollTop = chat.scrollHeight;
    };

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
    if (!isSandboxEnabled) return;

    const previewBlocks = collectPreviewBlocks(container);
    const hasMultiplePreviewBlocks = previewBlocks.length >= 2;
    const hasMixedBlocks = new Set(previewBlocks.map(block => block.kind)).size > 1;

    if (hasMultiplePreviewBlocks || hasMixedBlocks) {
        addCombinedPreviewBar(container, previewBlocks);
    }

    previewBlocks.forEach(({ pre, lang, code, kind }) => {
        wrapPreviewableCodeBlock(pre, lang, code, kind);
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

if (paramTemp && tempValue) {
    paramTemp.value = activeTemperature;
    tempValue.textContent = activeTemperature;
    
    paramTemp.oninput = (e) => {
        activeTemperature = parseFloat(e.target.value);
        tempValue.textContent = activeTemperature.toFixed(1);
    };
}

if (exportChatBtn) {
    exportChatBtn.onclick = () => {
        if (conversationHistory.length === 0) {
            alert("Geen kletshistory om te eksporteer nie!");
            return;
        }
        
        let markdownContent = "# Flora AI Playground Gesprek\\n\\n";
        markdownContent += `Model: **\${OLLAMA_MODEL}**\\n`;
        markdownContent += `Datum: **\${new Date().toLocaleString()}**\\n\\n---\\n\\n`;
        
        conversationHistory.forEach(msg => {
            const roleName = msg.role === 'user' ? 'Kliënt (User)' : 'Flora (AI)';
            markdownContent += `### \${roleName}\\n\${msg.content}\\n\\n`;
        });
        
        const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `flora_klets_\${new Date().toISOString().slice(0,10)}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}

// ===== DRAWER INTERACTIONS =====
function openSidebar() { sidebar.classList.add("open"); sidebarOverlay.classList.add("show"); }
function closeSidebar() { sidebar.classList.remove("open"); sidebarOverlay.classList.remove("show"); }
if (sidebarToggles.length > 0) sidebarToggles.forEach(btn => btn.onclick = openSidebar);
if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;

newChatBtn.onclick = () => {
    chat.innerHTML = "";
    chat.style.display = "none";
    welcome.style.display = "flex";
    previewContainer.innerHTML = "";
    attachedFiles = [];
    conversationHistory = [];
    
    // Reset tokens for a new session
    sessionTotalTokens = 0;
    updateTokenDisplay();
    
    closeSidebar();
};

// Initialize Token Count visually
updateTokenDisplay();

// ===== VOICE INPUT =====
const voiceButton = document.getElementById("voiceButton");
const voiceBtnIcon = document.getElementById("voiceBtnIcon");

const MIC_ICON = `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
const STOP_ICON = `<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"></rect>`;

let mediaRecognition = null;
let isRecording = false;

function setSpeechRecognitionState(recording) {
    isRecording = recording;
    if (recording) {
        voiceButton.classList.add("recording");
        voiceBtnIcon.innerHTML = STOP_ICON;
        voiceButton.setAttribute("aria-label", "Stop Recording");
    } else {
        voiceButton.classList.remove("recording");
        voiceBtnIcon.innerHTML = MIC_ICON;
        voiceButton.setAttribute("aria-label", "Voice Input");
    }
}

if (voiceButton) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceButton.title = "Voice input not supported in this browser";
        voiceButton.disabled = true;
    } else {
        voiceButton.onclick = () => {
            if (isGenerating) return;

            if (isRecording && mediaRecognition) {
                mediaRecognition.stop();
                return;
            }

            mediaRecognition = new SpeechRecognition();
            mediaRecognition.lang = navigator.language || "en-US";
            mediaRecognition.interimResults = true;
            mediaRecognition.continuous = false;

            let finalTranscript = "";

            mediaRecognition.onstart = () => setSpeechRecognitionState(true);

            mediaRecognition.onresult = (e) => {
                let interim = "";
                finalTranscript = "";
                for (let i = 0; i < e.results.length; i++) {
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) finalTranscript += t;
                    else interim += t;
                }
                // Show interim results live in the textarea
                isVoiceInputUpdate = true;
                input.value = finalTranscript || interim;
                input.dispatchEvent(new Event("input"));
                isVoiceInputUpdate = false;
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
        };
    }
}

function speakReply(text) {
    if (!("speechSynthesis" in window) || !text) return;

    const spokenText = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#*_>~|-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!spokenText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = navigator.language || "en-US";
    utterance.pitch = 1.15;
    utterance.rate = 1;

    const voice = getPreferredVoice();
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || utterance.lang;
    }

    window.speechSynthesis.speak(utterance);
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
