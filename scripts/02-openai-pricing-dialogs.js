// Original script.js lines 1666-2254.
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

