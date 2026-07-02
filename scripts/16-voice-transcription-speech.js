// Original script.js lines 22499-23455.
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
