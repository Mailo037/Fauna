// Original script.js lines 15358-16578.
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
    label = "Generated image",
    sessionId = ""
} = {}) {
    const imageOptions = normalizeImageGenerationOptions(options);
    const effectivePrompt = buildEffectiveImagePrompt(prompt, imageOptions);
    const useOpenAi = isOpenAiProvider();
    const imageUrl = useOpenAi ? null : buildImageGenerationUrl(effectivePrompt, imageOptions);

    updateImageGenerationToolActivity(activity, "Rendering");
    let generatedImageUrl = useOpenAi
        ? await generateOpenAiImage(effectivePrompt, signal, imageOptions)
        : imageUrl;
    generatedImageUrl = await persistGeneratedMediaSource(generatedImageUrl, {
        kind: "image",
        prompt: effectivePrompt,
        label,
        extension: imageOptions.format || "png",
        chatId: sessionId || getGenerationSessionIdForSignal(signal)
    });
    updateImageGenerationToolActivity(activity, "Preparing preview");
    await preloadImage(generatedImageUrl, signal);
    updateImageGenerationToolActivity(activity, "Ready", "done");
    renderGeneratedImage(container, effectivePrompt, generatedImageUrl, label, isSensitiveImagePrompt(effectivePrompt));
    moveToolActivityBeforeBubble(activity, container);
    return {
        imageUrl: generatedImageUrl,
        prompt: effectivePrompt,
        options: imageOptions,
        label,
        sensitive: isSensitiveImagePrompt(effectivePrompt)
    };
}

function getImageGenerationFailureMessage(error) {
    return error?.name === "AbortError"
        ? "Your prompt is safe to edit and run again."
        : isOpenAiProvider()
            ? "Fauna could not create the image through OpenAI. Check the key, image model, and account limits."
            : "Fauna could not create the image. Check your connection and try again.";
}

function getGenerationHistory(options = {}) {
    return Array.isArray(options.history) ? options.history : conversationHistory;
}

function pushGenerationHistoryMessage(options = {}, message) {
    const history = getGenerationHistory(options);
    history.push(message);
    if (options.sessionId && isChatSessionVisible(options.sessionId)) {
        conversationHistory = cloneConversationHistory(history);
    }
    return history.length - 1;
}

function syncGenerationHistorySnapshot(options = {}) {
    if (!options.sessionId) return;
    updateStoredSessionFromGeneration(options.sessionId, {
        history: getGenerationHistory(options),
        tokenTotal: typeof options.getTokenTotal === "function" ? options.getTokenTotal() : sessionTotalTokens
    });
}

function addGenerationTokenUsage(options = {}, usage, metadata = {}) {
    const sessionId = options.sessionId || activeSessionId || "";
    const added = recordSessionTokenUsage(sessionId, usage, metadata);
    if (typeof options.getTokenTotal === "function" && typeof options.setTokenTotal === "function") {
        options.setTokenTotal(options.getTokenTotal() + added);
    }
    return added;
}

async function retryImageGenerationInBubble(target, prompt, options = {}) {
    if (isGenerating || !target) return;

    const retrySession = ensureWritableActiveChatSession();
    if (!retrySession) return;
    const runHistory = cloneConversationHistory(conversationHistory);
    let runTokenTotal = sessionTotalTokens;
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    setGeneratingBusy(true, { sessionId: retrySession.id, controller: generationController });
    prepareBubbleForRetry(target);

    try {
        const didGenerate = await renderImageGenerationAttempt(target, prompt, generationSignal, {
            ...options,
            sessionId: retrySession.id,
            history: runHistory,
            getTokenTotal: () => runTokenTotal,
            setTokenTotal: value => { runTokenTotal = value; }
        });
        if (didGenerate) showToast("Image generation retried.", "success");
    } finally {
        finishChatGeneration(retrySession.id, generationController);
        updateTokenDisplay();
        updateStoredSessionFromGeneration(retrySession.id, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
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
            label: "Generated image",
            sessionId: options.sessionId || ""
        });
        const historyContent = getGeneratedImageHistoryContent("Generated image", generated.prompt);
        const assistantIndex = pushGenerationHistoryMessage(options, {
            role: "assistant",
            content: historyContent,
            createdAt: new Date().toISOString(),
            faunaGeneratedMedia: [
                createGeneratedImageMediaItem({
                    src: generated.imageUrl,
                    prompt: generated.prompt,
                    label: "Generated image",
                    sensitive: generated.sensitive
                })
            ].filter(Boolean)
        });
        setupAssistantActions(aiBubble.parentElement, getGeneratedMediaCopyText(generated.imageUrl, historyContent), {
            messageIndex: assistantIndex,
            canFork: true
        });
        syncGenerationHistorySnapshot(options);
        return true;
    } catch (e) {
        updateImageGenerationToolActivity(imageActivity, e.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(aiBubble, e, {
            title: e.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: getImageGenerationFailureMessage(e),
            sessionId: options.sessionId || getGenerationSessionIdForSignal(signal),
            history: getGenerationHistory(options),
            getTokenTotal: options.getTokenTotal,
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

    pushGenerationHistoryMessage(options, {
        role: "user",
        content: `[Image prompt] ${prompt}`,
        createdAt: options.userCreatedAt || new Date().toISOString()
    });
    syncGenerationHistorySnapshot(options);

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

    const retrySession = ensureWritableActiveChatSession();
    if (!retrySession) return;
    const runHistory = cloneConversationHistory(conversationHistory);
    let runTokenTotal = sessionTotalTokens;
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    setGeneratingBusy(true, { sessionId: retrySession.id, controller: generationController });
    prepareBubbleForRetry(target);

    try {
        const didEdit = await renderImageEditAttempt(target, requestText, imageFiles, generationSignal, {
            sessionId: retrySession.id,
            history: runHistory,
            getTokenTotal: () => runTokenTotal,
            setTokenTotal: value => { runTokenTotal = value; }
        });
        if (didEdit) showToast("Image edit retried.", "success");
    } finally {
        finishChatGeneration(retrySession.id, generationController);
        updateTokenDisplay();
        updateStoredSessionFromGeneration(retrySession.id, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
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
            let imageUrl = await editOpenAiImage(requestText, imageFiles, signal);
            imageUrl = await persistGeneratedMediaSource(imageUrl, {
                kind: "image",
                prompt: requestText,
                label: "Generated edit",
                extension: "png",
                chatId: options.sessionId || getGenerationSessionIdForSignal(signal)
            });
            updateImageGenerationToolActivity(imageActivity, "Preparing preview");
            await preloadImage(imageUrl, signal);
            updateImageGenerationToolActivity(imageActivity, "Ready", "done");
            renderGeneratedImage(aiBubble, requestText, imageUrl, "Generated edit", isSensitiveImagePrompt(requestText));
            const historyContent = getGeneratedImageHistoryContent("Generated image edit", requestText);

            pushGenerationHistoryMessage(options, {
                role: "user",
                content: `[Image edit request] ${requestText}`,
                createdAt: options.userCreatedAt || new Date().toISOString()
            });
            const assistantIndex = pushGenerationHistoryMessage(options, {
                role: "assistant",
                content: historyContent,
                createdAt: new Date().toISOString(),
                faunaGeneratedMedia: [
                    createGeneratedImageMediaItem({
                        src: imageUrl,
                        prompt: requestText,
                        label: "Generated edit",
                        sensitive: isSensitiveImagePrompt(requestText)
                    })
                ].filter(Boolean)
            });
            setupAssistantActions(aiBubble.parentElement, getGeneratedMediaCopyText(imageUrl, historyContent), {
                messageIndex: assistantIndex,
                canFork: true
            });
            syncGenerationHistorySnapshot(options);
            return true;
        }

        updateImageGenerationToolActivity(imageActivity, "Writing prompt");
        const editPrompt = await buildImageEditPrompt(requestText, imageFiles, signal, options);
        let imageUrl = buildImageGenerationUrl(editPrompt);
        imageUrl = await persistGeneratedMediaSource(imageUrl, {
            kind: "image",
            prompt: editPrompt,
            label: "Generated edit",
            extension: "png",
            chatId: options.sessionId || getGenerationSessionIdForSignal(signal)
        });

        updateImageGenerationToolActivity(imageActivity, "Rendering edit");
        await preloadImage(imageUrl, signal);
        updateImageGenerationToolActivity(imageActivity, "Ready", "done");
        renderGeneratedImage(aiBubble, editPrompt, imageUrl, "Generated edit", isSensitiveImagePrompt(`${requestText} ${editPrompt}`));
        const historyContent = getGeneratedImageHistoryContent("Generated image edit", editPrompt);

        pushGenerationHistoryMessage(options, {
            role: "user",
            content: `[Image edit request] ${requestText}`,
            createdAt: options.userCreatedAt || new Date().toISOString()
        });
        const assistantIndex = pushGenerationHistoryMessage(options, {
            role: "assistant",
            content: historyContent,
            createdAt: new Date().toISOString(),
            faunaGeneratedMedia: [
                createGeneratedImageMediaItem({
                    src: imageUrl,
                    prompt: editPrompt,
                    label: "Generated edit",
                    sensitive: isSensitiveImagePrompt(`${requestText} ${editPrompt}`)
                })
            ].filter(Boolean)
        });
        setupAssistantActions(aiBubble.parentElement, getGeneratedMediaCopyText(imageUrl, historyContent), {
            messageIndex: assistantIndex,
            canFork: true
        });
        syncGenerationHistorySnapshot(options);
        return true;
    } catch (e) {
        updateImageGenerationToolActivity(imageActivity, e.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(aiBubble, e, {
            title: e.name === "AbortError" ? "Image edit stopped" : "Image edit failed",
            message: getImageEditFailureMessage(e),
            sessionId: options.sessionId || getGenerationSessionIdForSignal(signal),
            history: getGenerationHistory(options),
            getTokenTotal: options.getTokenTotal,
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

async function buildImageEditPrompt(requestText, imageFiles, signal = null, options = {}) {
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

    addGenerationTokenUsage(options, getProviderTokenUsage(data), {
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

    pushGenerationHistoryMessage(options, {
        role: "user",
        content: `[Video prompt, 10 seconds] ${prompt}`,
        createdAt: options.userCreatedAt || new Date().toISOString()
    });
    syncGenerationHistorySnapshot(options);

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
        const videoUrl = await persistGeneratedMediaSource(videoResult.url, {
            kind: "video",
            prompt,
            label: videoResult.label,
            extension: videoResult.extension || "mp4",
            chatId: options.sessionId || getGenerationSessionIdForSignal(signal)
        });

        updateCreationProgress(aiBubble, "Encoding clip", 2);
        renderGeneratedVideo(aiBubble, prompt, videoUrl, videoResult.extension, videoResult.label);
        const assistantIndex = pushGenerationHistoryMessage(options, {
            role: "assistant",
            content: `Generated Wan video clip for: ${prompt}\n\n${videoUrl}`,
            createdAt: new Date().toISOString(),
            faunaGeneratedMedia: [
                createGeneratedVideoMediaItem({
                    src: videoUrl,
                    prompt,
                    label: videoResult.label || "Wan generated video",
                    extension: videoResult.extension || "mp4"
                })
            ].filter(Boolean)
        });
        setupAssistantActions(aiBubble.parentElement, videoUrl, {
            messageIndex: assistantIndex,
            canFork: true
        });
        syncGenerationHistorySnapshot(options);
    } catch (e) {
        if (e.name === "AbortError") {
            renderErrorCard(aiBubble, e, {
                title: "Video generation stopped",
                message: "Your video prompt is safe to edit and run again.",
                sessionId: options.sessionId || getGenerationSessionIdForSignal(signal),
                history: getGenerationHistory(options),
                getTokenTotal: options.getTokenTotal
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
            const videoUrl = await persistGeneratedMediaSource(videoResult.url, {
                kind: "video",
                prompt,
                label: "Fallback animated clip",
                extension: videoResult.extension || "mp4",
                chatId: options.sessionId || getGenerationSessionIdForSignal(signal)
            });

            updateCreationProgress(aiBubble, "Finalizing clip", 2);
            renderGeneratedVideo(aiBubble, prompt, videoUrl, videoResult.extension, "Fallback animated clip");
            const assistantIndex = pushGenerationHistoryMessage(options, {
                role: "assistant",
                content: `Wan was unavailable, so Fauna generated a fallback 10 second animated clip for: ${prompt}\n\n${videoUrl}`,
                createdAt: new Date().toISOString(),
                faunaGeneratedMedia: [
                    createGeneratedVideoMediaItem({
                        src: videoUrl,
                        prompt,
                        label: "Fallback animated clip",
                        extension: videoResult.extension || "mp4"
                    })
                ].filter(Boolean)
            });
            setupAssistantActions(aiBubble.parentElement, videoUrl, {
                messageIndex: assistantIndex,
                canFork: true
            });
            syncGenerationHistorySnapshot(options);
        } catch (fallbackError) {
            renderErrorCard(aiBubble, fallbackError, {
                title: fallbackError.name === "AbortError" ? "Video generation stopped" : "Video generation failed",
                message: fallbackError.name === "AbortError"
                    ? "Your video prompt is safe to edit and run again."
                    : "Fauna could not complete the Wan request or the local fallback clip.",
                sessionId: options.sessionId || getGenerationSessionIdForSignal(signal),
                history: getGenerationHistory(options),
                getTokenTotal: options.getTokenTotal
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
        throw new Error("No Wan workflow configured. Add a ComfyUI API workflow in Settings > Media.");
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
    markGenerationConnectionEstablished(signal);

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
        markGenerationConnectionEstablished(signal);
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
    markGenerationConnectionEstablished(signal);
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
    markGenerationConnectionEstablished(signal);
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
    if (isDesktopFileMediaSource(value)) return "Fauna AppData";

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

