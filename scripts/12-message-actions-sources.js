// Original script.js lines 16579-17700.
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

function normalizeVoiceRecordingMetadata(recording = {}) {
    if (!recording || typeof recording !== "object") return null;
    const path = String(recording.path || recording.filePath || "").trim();
    const suppliedUrl = String(recording.url || recording.source || recording.sourceUrl || "").trim();
    const desktopUrl = !suppliedUrl && path ? getFaunaDesktopApi()?.filePathToUrl?.(path) || "" : "";
    const url = suppliedUrl || desktopUrl;
    if (!url) return null;

    const duration = Number(recording.duration || recording.durationSeconds || 0);
    const size = Number(recording.size || 0);
    return {
        url,
        path,
        mimeType: String(recording.mimeType || recording.type || "audio/webm").trim(),
        provider: String(recording.provider || "voice").trim(),
        transcript: String(recording.transcript || "").trim(),
        createdAt: String(recording.createdAt || "").trim(),
        duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
        size: Number.isFinite(size) && size > 0 ? size : 0
    };
}

function createVoiceRecordingPlayer(recording) {
    const normalized = normalizeVoiceRecordingMetadata(recording);
    if (!normalized) return null;

    const player = document.createElement("div");
    player.className = "assistant-tts-player voice-recording-player";
    player.dataset.voiceRecordingPlayer = "true";
    player.dataset.audioSource = normalized.url;
    player.dataset.mimeType = normalized.mimeType;
    player.dataset.transcript = normalized.transcript;
    player.dataset.duration = normalized.duration ? String(normalized.duration) : "";
    player.innerHTML = `
        <button type="button" class="assistant-tts-toggle" data-assistant-tts-toggle aria-label="Play voice recording" data-tooltip="Play voice recording">
            <span class="assistant-tts-icon assistant-tts-play">${getAssistantTtsIcon("play")}</span>
            <span class="assistant-tts-icon assistant-tts-stop">${getAssistantTtsIcon("stop")}</span>
            <span class="assistant-tts-loader" aria-hidden="true"></span>
        </button>
        <div class="assistant-tts-waveform" data-assistant-tts-seek role="slider" tabindex="0" aria-label="Seek voice recording" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${getAssistantTtsWaveformMarkup()}</div>
        <span class="assistant-tts-time">0:00</span>
    `;
    updateAssistantTtsProgress(player, 0, normalized.duration || 0);
    if (normalized.createdAt) {
        const date = new Date(normalized.createdAt);
        if (!Number.isNaN(date.getTime())) {
            player.setAttribute("aria-label", `Voice recording from ${date.toLocaleString()}`);
        }
    }
    return player;
}

function addRenderNode(text, type, fileArray = [], options = {}) {
    const target = options.container instanceof Element ? options.container : chat;
    if (!target) return null;
    if (
        target === chat
        && type === "output"
        && text === "__thinking__"
        && options.liveGenerationPlaceholder !== true
        && typeof removeLiveGenerationPlaceholders === "function"
    ) {
        removeLiveGenerationPlaceholders(activeSessionId);
    }
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
        if (typeof renderPlainTextWithSkillMentionChips === "function") {
            bubble.innerHTML = renderPlainTextWithSkillMentionChips(text);
        } else {
            bubble.textContent = text;
        }
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

    const voiceRecordingPlayer = type === "user" ? createVoiceRecordingPlayer(options.voiceRecording) : null;
    if (voiceRecordingPlayer) {
        block.appendChild(voiceRecordingPlayer);
    }

    node.appendChild(block);
    if (options.beforeNode instanceof Node && options.beforeNode.parentElement === target) {
        target.insertBefore(node, options.beforeNode);
    } else {
        target.appendChild(node);
    }
    if (target === chat) {
        updateComposerChatContentLayoutState();
        renderPromptTimeline();
    }
    if (options.skipScroll !== true) {
        scrollChatToBottom({ force: options.forceScroll === true });
    }
    return bubble;
}

async function handleCopyButton(copyBtn, rawTextToCopy) {
    try {
        await writeTextToClipboard(rawTextToCopy);
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

async function playVoiceRecordingPlayer(player) {
    const audioSource = String(player?.dataset?.audioSource || "").trim();
    if (!player || !audioSource) {
        showToast("That voice recording is not available.", "warning");
        return;
    }

    if (activeAssistantTtsPlayback?.player === player) {
        stopAssistantTtsPlayback();
        return;
    }

    stopAssistantTtsPlayback();
    activeRealtimeSpeechReply?.cancel();
    activeSpeechController?.abort();
    activeSpeechAudio?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    const controller = new AbortController();
    const audio = new Audio(audioSource);
    const playback = {
        button: null,
        player,
        controller,
        text: player.dataset.transcript || "Voice recording",
        timer: null,
        audio,
        duration: Number(player.dataset.duration || 0) || 0
    };
    activeAssistantTtsPlayback = playback;
    activeSpeechController = controller;
    activeSpeechAudio = audio;
    isSpeechPlaybackActive = true;

    setAssistantTtsPlayerState(player, "loading", { cached: true });
    updateAssistantTtsProgress(player, 0, playback.duration || 0);
    getAudioWaveformFromSource(audioSource)
        .then(levels => setAssistantTtsWaveform(player, levels))
        .catch(err => console.warn("Could not read voice recording waveform:", err));
    const unbindProgress = bindAssistantTtsAudioProgress(player, audio, playback);

    try {
        await applySelectedVoiceOutput(audio, { notify: true });
        await audio.play();
        setAssistantTtsPlayerState(player, "playing", { cached: true });
        await playAudioElementToEnd(audio, controller.signal);
    } catch (err) {
        if (err.name !== "AbortError") {
            showToast(`Voice recording playback failed: ${err.message}`, "error");
        }
    } finally {
        unbindProgress();
        if (activeSpeechController === controller) activeSpeechController = null;
        if (activeSpeechAudio === audio) activeSpeechAudio = null;
        if (activeAssistantTtsPlayback === playback) {
            setAssistantTtsPlayerState(player, "idle", { duration: playback.duration });
            activeAssistantTtsPlayback = null;
            isSpeechPlaybackActive = false;
        }
    }
}

function handleAssistantTtsPlayerToggle(toggle) {
    const player = toggle?.closest(".assistant-tts-player");
    if (!player) return;

    if (player.dataset.voiceRecordingPlayer === "true") {
        void playVoiceRecordingPlayer(player);
        return;
    }

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

    appendTurnDurationAction(actions, historyIndex, parentBubbleBlock);

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
    if (isActiveChatArchived()) {
        showToast("Archived chats are read-only. Restore the chat before regenerating.", "warning");
        return;
    }

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
    const generationSession = ensureWritableActiveChatSession();
    if (!generationSession) return;
    const generationSessionId = generationSession.id;
    const runHistory = historyBeforeResponse;
    let runTokenTotal = sumHistoryTokenUsage(runHistory);

    clearClarifyingQuestionComposer();
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    setGeneratingBusy(true, { sessionId: generationSessionId, controller: generationController });

    removeRenderedNodesAfter(context.messageNode);
    context.block.querySelector(".assistant-message-actions")?.remove();
    context.block.querySelector(".web-sources")?.remove();
    renderThinkingBubble(context.bubble);
    conversationHistory = cloneConversationHistory(runHistory);
    scrollChatToBottom();

    try {
        const regenerationModel = getRegenerationModel(runHistory);
        const data = await sendOllamaChatWithLocalTools(
            runHistory,
            {
                ...getActiveChatRequestOptions(),
                sessionId: generationSessionId
            },
            regenerationModel,
            generationSignal,
            context.bubble,
            {
                enabled: true,
                preserveActiveModel: shouldPreserveActiveLocalModelForRoute(regenerationModel)
            }
        );
        const tokenUsage = getProviderTokenUsage(data);
        const assistantMessage = getAssistantMessageForConversation(data, regenerationModel);
        attachTokenUsage(assistantMessage, tokenUsage);
        runHistory.push(assistantMessage);
        const assistantIndex = runHistory.length - 1;

        runTokenTotal += recordSessionTokenUsage(generationSessionId, tokenUsage, { message: assistantMessage });
        await renderAssistantResponse(data, context.bubble, [], generationSignal, false, {
            sessionId: generationSessionId,
            messageIndex: assistantIndex,
            alreadyRendered: data.__faunaAlreadyRendered === true,
            preserveRenderedContent: data.__faunaPreserveRenderedContent === true
        });
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
        showToast("Response regenerated.", "success");
    } catch (err) {
        renderErrorCard(context.bubble, err, {
            sessionId: generationSessionId,
            history: runHistory,
            getTokenTotal: () => runTokenTotal
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

