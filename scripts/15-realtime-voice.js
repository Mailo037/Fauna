// Original script.js lines 21340-22498.
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

