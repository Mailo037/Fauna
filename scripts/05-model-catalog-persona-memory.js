// Original script.js lines 5578-7162.
function setOpenAiVoice(voice, { persist = true } = {}) {
    const option = getOpenAiVoiceOption(String(voice || "").trim().toLowerCase());
    if (activeVoicePreviewId && activeVoicePreviewId !== option.id) {
        stopVoicePreview();
    }
    if (persist) {
        safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, option.id);
    }
    if (openAiVoiceInput) openAiVoiceInput.value = option.id;
    updateVoicePickerUi(option.id);
    applyOpenAiRealtimeVoiceChange();
    updateVoiceQuickUi();
}

function getOpenAiSettingsChatModelOptions() {
    const activeModel = getOpenAiChatModel();
    const options = getOpenAiModelSwitcherOptions();
    if (
        activeModel
        && isLikelyOpenAiChatModelId(activeModel)
        && !options.some(option => option.id === activeModel)
    ) {
        return [
            { id: activeModel, label: activeModel, meta: "Saved", provider: AI_PROVIDER_OPENAI },
            ...options
        ];
    }
    return options;
}

function closeOpenAiModelSelects(except = null) {
    [
        openAiChatModelSelect,
        openAiImageModelSelect,
        openAiTranscriptionModelSelect,
        openAiRealtimeModelSelect,
        localVoiceTranscriptionSelect,
        localVoiceReplyModelSelect,
        localTaskReasoningModelSelect,
        localTaskVisionModelSelect,
        localTaskCodeModelSelect,
        localTaskImageModelSelect,
        localTaskVideoModelSelect
    ].forEach(select => {
        if (select && select !== except) select.close();
    });
}

function createOpenAiModelSelect({
    host,
    input,
    options,
    value,
    label = "OpenAI model",
    storageKey,
    fallback,
    onChange = null,
    persistOnChange = Boolean(storageKey)
} = {}) {
    if (!host || !Array.isArray(options) || options.length === 0) return null;
    let currentOptions = [...options];

    const select = document.createElement("div");
    select.className = "settings-model-select";

    const button = document.createElement("button");
    button.className = "settings-model-select-button";
    button.type = "button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", `Choose ${label}`);

    const valueLabel = document.createElement("span");
    valueLabel.className = "settings-model-select-value";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.classList.add("settings-model-select-chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("stroke", "currentColor");
    chevron.setAttribute("stroke-width", "2.4");
    chevron.setAttribute("stroke-linecap", "round");
    chevron.setAttribute("stroke-linejoin", "round");
    chevron.setAttribute("aria-hidden", "true");
    const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    chevronPath.setAttribute("d", "m6 9 6 6 6-6");
    chevron.appendChild(chevronPath);

    button.append(valueLabel, chevron);

    const list = document.createElement("div");
    list.className = "settings-model-select-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", label);

    const normalizeValue = model => normalizeOpenAiListedModel(model, currentOptions, fallback || currentOptions[0]?.id || "");
    let activeValue = normalizeValue(value);

    const getOptionButtons = () => Array.from(list.querySelectorAll(".settings-model-select-option"));
    const getOption = model => currentOptions.find(option => option.id === model) || currentOptions[0];

    const setOpen = isOpen => {
        if (isOpen) closeOpenAiModelSelects(api);
        select.classList.toggle("open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
    };

    const setValue = nextValue => {
        activeValue = normalizeValue(nextValue);
        if (input) input.value = activeValue;
        valueLabel.textContent = getOption(activeValue)?.label || activeValue;
        getOptionButtons().forEach(optionButton => {
            const isActive = optionButton.dataset.model === activeValue;
            optionButton.classList.toggle("active", isActive);
            optionButton.setAttribute("aria-selected", String(isActive));
        });
    };

    const chooseValue = nextValue => {
        const model = normalizeValue(nextValue);
        setValue(model);
        if (storageKey && persistOnChange) safeLocalStorageSet(storageKey, model);
        if (typeof onChange === "function") onChange(model);
        setOpen(false);
        button.focus();
    };

    const renderOptions = (nextOptions = currentOptions, nextValue = activeValue) => {
        currentOptions = Array.isArray(nextOptions) && nextOptions.length > 0 ? [...nextOptions] : currentOptions;
        activeValue = normalizeValue(nextValue);
        list.replaceChildren();
        let currentGroup = "";
        currentOptions.forEach(option => {
            if (option.group && option.group !== currentGroup) {
                currentGroup = option.group;
                const heading = document.createElement("div");
                heading.className = "settings-model-select-group";
                heading.textContent = currentGroup;
                list.appendChild(heading);
            }

            const optionButton = document.createElement("button");
            optionButton.className = "settings-model-select-option";
            optionButton.type = "button";
            optionButton.dataset.model = option.id;
            optionButton.setAttribute("role", "option");
            optionButton.setAttribute("aria-selected", "false");

            const check = document.createElement("span");
            check.className = "settings-model-select-check";
            check.setAttribute("aria-hidden", "true");

            const optionLabel = document.createElement("span");
            optionLabel.className = "settings-model-select-option-label";
            optionLabel.textContent = option.label || option.id;

            optionButton.append(check, optionLabel);
            optionButton.addEventListener("click", () => chooseValue(option.id));
            list.appendChild(optionButton);
        });
        setValue(activeValue);
    };

    button.addEventListener("click", event => {
        event.stopPropagation();
        setOpen(!select.classList.contains("open"));
    });

    button.addEventListener("keydown", event => {
        if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
        event.preventDefault();
        setOpen(true);
        const activeOption = list.querySelector(".settings-model-select-option.active") || getOptionButtons()[0];
        activeOption?.focus();
    });

    list.addEventListener("keydown", event => {
        const optionButtons = getOptionButtons();
        const currentIndex = optionButtons.indexOf(document.activeElement);
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            button.focus();
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextIndex = currentIndex < 0
                ? 0
                : (currentIndex + direction + optionButtons.length) % optionButtons.length;
            optionButtons[nextIndex]?.focus();
            return;
        }
        if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            optionButtons[event.key === "Home" ? 0 : optionButtons.length - 1]?.focus();
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            document.activeElement?.click();
        }
    });

    document.addEventListener("click", event => {
        if (!select.contains(event.target)) setOpen(false);
    });

    select.append(button, list);
    host.replaceChildren(select);
    const api = {
        setValue,
        setOptions: (nextOptions, nextValue = activeValue) => renderOptions(nextOptions, nextValue),
        close: () => setOpen(false)
    };
    renderOptions();
    return api;
}

function renderOpenAiModelSelects() {
    openAiChatModelSelect = createOpenAiModelSelect({
        host: openAiChatModelSelectHost,
        input: openAiChatModelInput,
        options: getOpenAiSettingsChatModelOptions(),
        value: getOpenAiChatModel(),
        label: "OpenAI chat model",
        storageKey: OPENAI_CHAT_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_CHAT_MODEL,
        persistOnChange: false,
        onChange: () => {
            updateOpenAiSaveButtonState();
        }
    });
    openAiImageModelSelect = createOpenAiModelSelect({
        host: openAiImageModelSelectHost,
        input: openAiImageModelInput,
        options: getOpenAiImageModelOptions(),
        value: getOpenAiImageModel(),
        label: "OpenAI image model",
        storageKey: OPENAI_IMAGE_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_IMAGE_MODEL,
        persistOnChange: false,
        onChange: updateOpenAiSaveButtonState
    });
    openAiTranscriptionModelSelect = createOpenAiModelSelect({
        host: openAiTranscriptionModelSelectHost,
        input: openAiTranscriptionModelInput,
        options: getOpenAiTranscriptionModelOptions(),
        value: getOpenAiTranscriptionModel(),
        label: "OpenAI transcription model",
        storageKey: OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
        persistOnChange: false,
        onChange: updateOpenAiSaveButtonState
    });
    openAiRealtimeModelSelect = createOpenAiModelSelect({
        host: openAiRealtimeModelSelectHost,
        input: openAiRealtimeModelInput,
        options: getOpenAiRealtimeModelOptions(),
        value: getOpenAiRealtimeModel(),
        label: "OpenAI voice model",
        storageKey: OPENAI_REALTIME_MODEL_STORAGE_KEY,
        fallback: DEFAULT_OPENAI_REALTIME_MODEL
    });
}

function renderLocalVoiceModelSelects() {
    localVoiceTranscriptionSelect = createOpenAiModelSelect({
        host: localVoiceTranscriptionSelectHost,
        input: localVoiceTranscriptionInput,
        options: LOCAL_VOICE_TRANSCRIPTION_OPTIONS,
        value: getLocalVoiceTranscription(),
        label: "local transcription",
        storageKey: LOCAL_VOICE_TRANSCRIPTION_STORAGE_KEY,
        fallback: DEFAULT_LOCAL_VOICE_TRANSCRIPTION,
        onChange: () => {
            updateLocalVoiceSettingsUi();
            updateVoiceButtonAvailability();
        }
    });
    localVoiceReplyModelSelect = createOpenAiModelSelect({
        host: localVoiceReplyModelSelectHost,
        input: localVoiceReplyModelInput,
        options: LOCAL_VOICE_REPLY_MODEL_OPTIONS,
        value: getLocalVoiceReplyModel(),
        label: "local voice reply model",
        storageKey: LOCAL_VOICE_REPLY_MODEL_STORAGE_KEY,
        fallback: DEFAULT_LOCAL_VOICE_REPLY_MODEL,
        onChange: () => {
            updateLocalVoiceSettingsUi();
            updateVoiceQuickUi();
        }
    });
}

function renderLocalTaskModelSelects() {
    LOCAL_TASK_MODEL_CONFIGS.forEach(config => {
        const select = createOpenAiModelSelect({
            host: config.selectHost(),
            input: config.input(),
            options: getLocalTaskModelOptions(config.task),
            value: getLocalTaskModel(config.task),
            label: `${config.label} task model`,
            storageKey: config.storageKey,
            fallback: config.defaultModel,
            onChange: model => {
                safeLocalStorageSet(config.storageKey, model);
                updateLocalTaskModelSelects();
            }
        });
        config.setSelectRef(select);
    });
    updateLocalTaskModelSelects();
}

let isTaskModelInstallInProgress = false;

function groupLocalTaskModelRows(rows, predicate) {
    const grouped = new Map();
    rows.filter(predicate).forEach(row => {
        const model = normalizeModelId(row.model);
        if (!model) return;
        const key = model.toLowerCase().replace(/:latest$/, "");
        const item = grouped.get(key) || {
            model,
            labels: [],
            tasks: []
        };
        if (!item.labels.includes(row.label)) item.labels.push(row.label);
        if (!item.tasks.includes(row.task)) item.tasks.push(row.task);
        grouped.set(key, item);
    });
    return Array.from(grouped.values());
}

function getMissingLocalTaskModelGroups(rows = getLocalTaskModelStatusRows()) {
    return groupLocalTaskModelRows(rows, row => !row.installed);
}

function getIncompatibleLocalTaskModelGroups(rows = getLocalTaskModelStatusRows()) {
    return groupLocalTaskModelRows(rows, row => row.installed && !row.supportsTask);
}

function createLocalTaskModelIssueRow(item, stateText) {
    const row = document.createElement("div");
    row.className = "local-task-missing-row";

    const model = document.createElement("span");
    model.className = "local-task-missing-model";
    model.textContent = item.model;

    const roles = document.createElement("span");
    roles.className = "local-task-missing-roles";
    item.labels.forEach(label => {
        const chip = document.createElement("span");
        chip.className = "local-task-missing-chip";
        chip.textContent = label;
        roles.append(chip);
    });

    const state = document.createElement("span");
    state.className = "local-task-missing-state";
    state.textContent = stateText;

    row.append(model, roles, state);
    return row;
}

function renderLocalTaskModelsMissingCard(rows = getLocalTaskModelStatusRows()) {
    if (!localTaskModelsMissingCard) return;
    const missing = getMissingLocalTaskModelGroups(rows);
    const incompatible = getIncompatibleLocalTaskModelGroups(rows);
    const shouldShow = isOllamaReachable && (missing.length > 0 || incompatible.length > 0);
    localTaskModelsMissingCard.hidden = !shouldShow;
    if (!shouldShow) {
        localTaskModelsMissingList?.replaceChildren();
        if (localTaskModelsInstallBtn) {
            localTaskModelsInstallBtn.hidden = true;
            localTaskModelsInstallBtn.disabled = true;
        }
        return;
    }

    localTaskModelsMissingCard.dataset.state = missing.length > 0 ? "missing" : "incompatible";
    const title = localTaskModelsMissingCard.querySelector(".local-task-missing-title");
    if (title) {
        title.textContent = missing.length > 0 ? "Missing task models" : "Task model mismatch";
    }
    if (localTaskModelsMissingSummary) {
        const missingRouteCount = missing.reduce((total, item) => total + item.labels.length, 0);
        const incompatibleRouteCount = incompatible.reduce((total, item) => total + item.labels.length, 0);
        if (missing.length > 0 && incompatible.length > 0) {
            localTaskModelsMissingSummary.textContent = `Install ${missing.length} model${missing.length === 1 ? "" : "s"} and change ${incompatibleRouteCount} task route${incompatibleRouteCount === 1 ? "" : "s"}.`;
        } else if (missing.length > 0) {
            localTaskModelsMissingSummary.textContent = `Install ${missing.length} Ollama model${missing.length === 1 ? "" : "s"} to enable ${missingRouteCount} task route${missingRouteCount === 1 ? "" : "s"}.`;
        } else {
            localTaskModelsMissingSummary.textContent = `Choose a compatible Ollama model for ${incompatibleRouteCount} task route${incompatibleRouteCount === 1 ? "" : "s"}.`;
        }
    }

    if (localTaskModelsMissingList) {
        localTaskModelsMissingList.replaceChildren(
            ...missing.map(item => createLocalTaskModelIssueRow(item, "Missing")),
            ...incompatible.map(item => createLocalTaskModelIssueRow(item, "Wrong type"))
        );
    }

    if (localTaskModelsInstallBtn) {
        localTaskModelsInstallBtn.hidden = missing.length === 0;
        localTaskModelsInstallBtn.disabled = missing.length === 0 || isTaskModelInstallInProgress;
        localTaskModelsInstallBtn.textContent = isTaskModelInstallInProgress ? "Installing..." : "Install missing";
    }
}

function updateLocalTaskModelsStatus() {
    const rows = getLocalTaskModelStatusRows();
    const missing = getMissingLocalTaskModelGroups(rows);
    const incompatible = getIncompatibleLocalTaskModelGroups(rows);
    renderLocalTaskModelsMissingCard(rows);
    if (!localTaskModelsStatus) return;
    if (!isOllamaReachable) {
        localTaskModelsStatus.textContent = hasCheckedOllamaStatus ? "Ollama offline" : "Checking";
        localTaskModelsStatus.dataset.state = "missing";
        return;
    }
    if (missing.length > 0) {
        localTaskModelsStatus.textContent = `${missing.length} missing`;
        localTaskModelsStatus.dataset.state = "missing";
        return;
    }
    if (incompatible.length > 0) {
        localTaskModelsStatus.textContent = `${incompatible.length} incompatible`;
        localTaskModelsStatus.dataset.state = "missing";
        return;
    }
    localTaskModelsStatus.textContent = "Ready";
    localTaskModelsStatus.dataset.state = "configured";
}

function updateLocalTaskModelSelects() {
    LOCAL_TASK_MODEL_CONFIGS.forEach(config => {
        const model = getLocalTaskModel(config.task);
        const input = config.input();
        if (input) input.value = model;
        config.selectRef()?.setOptions(getLocalTaskModelOptions(config.task), model);
    });
    updateLocalTaskModelsStatus();
    updateLocalInstallButton();
}

function refreshLocalTaskModelsPane() {
    updateLocalTaskModelSelects();
    if (!hasCheckedOllamaStatus && typeof checkOllamaStatus === "function") {
        if (localTaskModelsStatus) {
            localTaskModelsStatus.textContent = "Checking";
            localTaskModelsStatus.dataset.state = "missing";
        }
        void checkOllamaStatus();
    }
}

function updateLocalVoiceSettingsUi() {
    if (localVoiceTranscriptionInput) localVoiceTranscriptionInput.value = getLocalVoiceTranscription();
    if (localVoiceReplyModelInput) localVoiceReplyModelInput.value = getLocalVoiceReplyModel();
    if (localVoiceTranscriptionEndpointInput) localVoiceTranscriptionEndpointInput.value = getLocalVoiceTranscriptionEndpoint();
    if (localVoiceTranscriptionModelInput) localVoiceTranscriptionModelInput.value = getLocalVoiceTranscriptionModel();
    if (localVoiceReplyEndpointInput) localVoiceReplyEndpointInput.value = getLocalVoiceReplyEndpoint();

    localVoiceTranscriptionSelect?.setOptions(LOCAL_VOICE_TRANSCRIPTION_OPTIONS, getLocalVoiceTranscription());
    localVoiceReplyModelSelect?.setOptions(LOCAL_VOICE_REPLY_MODEL_OPTIONS, getLocalVoiceReplyModel());

    const usesWhisper = getLocalVoiceTranscription() === LOCAL_VOICE_TRANSCRIPTION_WHISPER;
    const usesLocalReply = getLocalVoiceReplyModel() !== LOCAL_VOICE_REPLY_BROWSER;
    localVoiceTranscriptionEndpointInput?.closest(".settings-field-label")?.classList.toggle("settings-field-muted", !usesWhisper);
    localVoiceTranscriptionModelInput?.closest(".settings-field-label")?.classList.toggle("settings-field-muted", !usesWhisper);
    localVoiceReplyEndpointInput?.closest(".settings-field-label")?.classList.toggle("settings-field-muted", !usesLocalReply);
}

function updateOpenAiModelSelects() {
    if (openAiTranscriptionModelInput) openAiTranscriptionModelInput.value = getOpenAiTranscriptionModel();
    if (openAiRealtimeModelInput) openAiRealtimeModelInput.value = getOpenAiRealtimeModel();
    if (openAiChatModelInput) openAiChatModelInput.value = getOpenAiChatModel();
    if (openAiImageModelInput) openAiImageModelInput.value = getOpenAiImageModel();
    openAiChatModelSelect?.setOptions(getOpenAiSettingsChatModelOptions(), getOpenAiChatModel());
    openAiImageModelSelect?.setOptions(getOpenAiImageModelOptions(), getOpenAiImageModel());
    openAiTranscriptionModelSelect?.setOptions(getOpenAiTranscriptionModelOptions(), getOpenAiTranscriptionModel());
    openAiRealtimeModelSelect?.setOptions(getOpenAiRealtimeModelOptions(), getOpenAiRealtimeModel());
    updateOpenAiSaveButtonState();
}

function persistLocalVoiceInput(input, storageKey, fallback) {
    const value = (input?.value || "").trim() || fallback;
    safeLocalStorageSet(storageKey, value);
    if (input) input.value = value;
    updateVoiceButtonAvailability();
}

function setSettingsSaveButtonState(button, isDirty) {
    if (!button) return;
    button.disabled = !isDirty;
    button.classList.toggle("settings-save-dirty", isDirty);
    button.classList.toggle("settings-save-clean", !isDirty);
    button.setAttribute("aria-disabled", String(!isDirty));
}

function normalizeEndpointInputValue(value, fallback) {
    return (String(value || fallback || "").trim().replace(/\/+$/, "") || fallback || "").trim();
}

function getPendingOpenAiSettings() {
    const chatModel = normalizeModelId(openAiChatModelInput?.value || DEFAULT_OPENAI_CHAT_MODEL);
    return {
        key: (openAiApiKeyInput?.value || "").trim(),
        chatModel: isLikelyOpenAiChatModelId(chatModel) ? chatModel : DEFAULT_OPENAI_CHAT_MODEL,
        imageModel: normalizeOpenAiCatalogModelForKinds(openAiImageModelInput?.value, OPENAI_IMAGE_MODEL_OPTIONS, DEFAULT_OPENAI_IMAGE_MODEL, ["Image"]),
        transcriptionModel: normalizeOpenAiCatalogModelForKinds(openAiTranscriptionModelInput?.value, OPENAI_TRANSCRIPTION_MODEL_OPTIONS, DEFAULT_OPENAI_TRANSCRIPTION_MODEL, ["Transcription"]),
        realtimeModel: normalizeOpenAiCatalogModelForKinds(openAiRealtimeModelInput?.value, OPENAI_REALTIME_MODEL_OPTIONS, DEFAULT_OPENAI_REALTIME_MODEL, ["Realtime"])
    };
}

function updateOpenAiSaveButtonState() {
    const pending = getPendingOpenAiSettings();
    const isDirty = pending.key !== getOpenAiApiKey()
        || pending.chatModel !== getOpenAiChatModel()
        || pending.imageModel !== getOpenAiImageModel()
        || pending.transcriptionModel !== getOpenAiTranscriptionModel()
        || pending.realtimeModel !== getOpenAiRealtimeModel();
    setSettingsSaveButtonState(openAiSaveBtn, isDirty);
}

function updateWanSaveButtonState() {
    const pendingEndpoint = normalizeEndpointInputValue(wanEndpointInput?.value, DEFAULT_WAN_VIDEO_BASE_URL);
    const pendingWorkflow = (wanWorkflowInput?.value || "").trim();
    const isDirty = pendingEndpoint !== getWanVideoBaseUrl()
        || pendingWorkflow !== (safeLocalStorageGet(WAN_VIDEO_WORKFLOW_STORAGE_KEY) || "").trim();
    setSettingsSaveButtonState(wanSaveBtn, isDirty);
}

function updateWorkspaceBridgeSaveButtonState() {
    const pendingEndpoint = normalizeEndpointInputValue(workspaceBridgeEndpointInput?.value, DEFAULT_WORKSPACE_BRIDGE_URL);
    const pendingToken = (workspaceBridgeTokenInput?.value || "").trim();
    const isDirty = pendingEndpoint !== getWorkspaceBridgeBaseUrl()
        || pendingToken !== getWorkspaceBridgeToken();
    setSettingsSaveButtonState(workspaceBridgeSaveBtn, isDirty);
}

function updatePersonaSaveButtonState() {
    const pendingDisplayName = normalizePersonaDisplayName(personaDisplayNameInput?.value);
    const pendingCustomInstructions = normalizePersonaCustomInstructions(personaCustomInstructionsInput?.value);
    const isDirty = pendingDisplayName !== getPersonaDisplayName()
        || pendingCustomInstructions !== getPersonaCustomInstructions();
    setSettingsSaveButtonState(personaSaveBtn, isDirty);
}

function addDirtyStateListeners(elements, updateFn) {
    elements.forEach(element => {
        element?.addEventListener("input", updateFn);
        element?.addEventListener("change", updateFn);
    });
}

function normalizeOpenAiCatalogModel(raw = {}) {
    const id = normalizeModelId(raw.id || raw.model || raw.name);
    if (!id) return null;
    const created = Number(raw.created || raw.createdAt || 0) || null;
    return {
        id,
        label: String(raw.label || raw.name || id).trim(),
        ownedBy: String(raw.owned_by || raw.ownedBy || "").trim(),
        created,
        source: raw.source || "live"
    };
}

function readCachedOpenAiModelCatalog({ allowStale = true } = {}) {
    try {
        const payload = JSON.parse(safeLocalStorageGet(OPENAI_MODEL_CATALOG_STORAGE_KEY) || "{}");
        const ageMs = Date.now() - Number(payload.updatedAt || 0);
        if (!Array.isArray(payload.models) || ageMs < 0) return [];
        if (!allowStale && ageMs > OPENAI_MODEL_CATALOG_CACHE_MAX_AGE_MS) return [];
        return payload.models.map(normalizeOpenAiCatalogModel).filter(Boolean);
    } catch {
        return [];
    }
}

function writeCachedOpenAiModelCatalog(models = []) {
    cachedOpenAiCatalogModels = models.map(normalizeOpenAiCatalogModel).filter(Boolean);
    safeLocalStorageSet(OPENAI_MODEL_CATALOG_STORAGE_KEY, JSON.stringify({
        updatedAt: Date.now(),
        models: cachedOpenAiCatalogModels
    }));
}

function getExplicitOpenAiCatalogOptions() {
    return [
        ...OPENAI_TRANSCRIPTION_MODEL_OPTIONS.map(option => ({
            ...option,
            provider: AI_PROVIDER_OPENAI,
            catalogKind: "Transcription",
            inputModalities: ["audio"],
            outputModalities: ["text"],
            supportedParameters: [],
            supportedTools: [],
            reasoningModes: [],
            supportsStreaming: false,
            supportsTemperature: false
        })),
        ...OPENAI_REALTIME_MODEL_OPTIONS.map(option => ({
            ...option,
            provider: AI_PROVIDER_OPENAI,
            catalogKind: "Realtime",
            inputModalities: ["text", "audio"],
            outputModalities: ["text", "audio"],
            supportedParameters: [],
            supportedTools: [],
            reasoningModes: option.group === "Reasoning" ? ["medium"] : [],
            supportsStreaming: true,
            supportsTemperature: false
        })),
        {
            id: DEFAULT_OPENAI_SPEECH_MODEL,
            label: DEFAULT_OPENAI_SPEECH_MODEL,
            meta: "Speech",
            provider: AI_PROVIDER_OPENAI,
            catalogKind: "Speech",
            inputModalities: ["text"],
            outputModalities: ["audio"],
            supportedParameters: ["voice", "speed"],
            supportedTools: [],
            reasoningModes: [],
            supportsStreaming: false,
            supportsTemperature: false
        }
    ];
}

function inferOpenAiCatalogKind(modelId, model = {}) {
    const id = normalizeModelId(modelId).toLowerCase();
    if (model.catalogKind) return model.catalogKind;
    if (model.outputModalities?.includes("image") || /(?:^|[-_/])image|gpt-image/i.test(id)) return "Image";
    if (/(?:transcribe|transcription|whisper)/i.test(id)) return "Transcription";
    if (/(?:realtime|voice-preview)/i.test(id)) return "Realtime";
    if (/(?:tts|speech)/i.test(id)) return "Speech";
    if (/(?:embedding|embed)/i.test(id)) return "Embeddings";
    if (/moderation/i.test(id)) return "Moderation";
    if (/codex/i.test(id)) return "Coding";
    if (model.isChat || isLikelyOpenAiChatModelId(id)) return "Chat";
    return "Model";
}

function inferOpenAiCatalogModalities(kind, modelId) {
    const id = normalizeModelId(modelId).toLowerCase();
    if (kind === "Image") return { input: ["text", "image"], output: ["image"] };
    if (kind === "Transcription") return { input: ["audio"], output: ["text"] };
    if (kind === "Realtime") return { input: ["text", "audio"], output: ["text", "audio"] };
    if (kind === "Speech") return { input: ["text"], output: ["audio"] };
    if (kind === "Embeddings") return { input: ["text"], output: ["embedding"] };
    if (kind === "Moderation") return { input: ["text", "image"], output: ["moderation"] };
    if (kind === "Chat" || /^o\d|^gpt-/i.test(id)) return { input: ["text"], output: ["text"] };
    return { input: [], output: [] };
}

function normalizeOpenAiCatalogRecord(raw = {}) {
    const live = normalizeOpenAiCatalogModel(raw);
    const id = live?.id || normalizeModelId(raw.id);
    if (!id) return null;
    const registryOption = aiCapabilityRegistry.getModelOption(id);
    const explicitOption = getExplicitOpenAiCatalogOptions().find(option => option.id === id);
    const base = {
        ...raw,
        ...registryOption,
        ...explicitOption
    };
    const kind = inferOpenAiCatalogKind(id, base);
    const inferredModalities = inferOpenAiCatalogModalities(kind, id);
    const inputModalities = Array.isArray(base.inputModalities) && base.inputModalities.length
        ? base.inputModalities
        : inferredModalities.input;
    const outputModalities = Array.isArray(base.outputModalities) && base.outputModalities.length
        ? base.outputModalities
        : inferredModalities.output;

    return {
        id,
        label: base.label || live?.label || id,
        meta: base.meta || kind,
        kind,
        provider: AI_PROVIDER_OPENAI,
        ownedBy: live?.ownedBy || base.ownedBy || "",
        created: live?.created || base.created || null,
        source: live?.source || base.source || "built-in",
        live: Boolean(live && live.source === "live"),
        inputModalities,
        outputModalities,
        supportedParameters: Array.isArray(base.supportedParameters) ? base.supportedParameters : [],
        supportedTools: Array.isArray(base.supportedTools) ? base.supportedTools : [],
        reasoningModes: Array.isArray(base.reasoningModes) ? base.reasoningModes : [],
        fileInputCapabilities: Array.isArray(base.fileInputCapabilities) ? base.fileInputCapabilities : [],
        supportsImageInput: Boolean(base.supportsImageInput || inputModalities.includes("image")),
        supportsFileInput: Boolean(base.supportsFileInput),
        supportsToolCalling: Boolean(base.supportsToolCalling),
        supportsStructuredOutputs: Boolean(base.supportsStructuredOutputs),
        supportsTemperature: Boolean(base.supportsTemperature),
        supportsStreaming: base.supportsStreaming !== false && ["Chat", "Realtime"].includes(kind),
        contextLength: base.contextLength || null
    };
}

function getBuiltInOpenAiCatalogModels() {
    return [
        ...aiCapabilityRegistry.getAllModelOptions({ provider: AI_PROVIDER_OPENAI }),
        ...getExplicitOpenAiCatalogOptions()
    ].map(option => ({ ...option, source: "built-in" }));
}

function mergeOpenAiCatalogModels(modelGroups = []) {
    const merged = new Map();
    modelGroups.flat().forEach(model => {
        const normalized = normalizeOpenAiCatalogRecord(model);
        if (!normalized) return;
        const existing = merged.get(normalized.id);
        merged.set(normalized.id, existing ? { ...existing, ...normalized, live: existing.live || normalized.live } : normalized);
    });
    return Array.from(merged.values()).sort((a, b) => {
        const kindCompare = a.kind.localeCompare(b.kind);
        return kindCompare || a.id.localeCompare(b.id);
    });
}

function getOpenAiCatalogModels() {
    if (!cachedOpenAiCatalogModels.length) {
        cachedOpenAiCatalogModels = readCachedOpenAiModelCatalog({ allowStale: true });
    }
    return mergeOpenAiCatalogModels([
        getBuiltInOpenAiCatalogModels(),
        cachedOpenAiCatalogModels
    ]);
}

function getOllamaCatalogKind(capability = {}) {
    if (capability.supportsStreaming === false) return "Embeddings";
    if (capability.supportsImageInput) return "Vision";
    if (capability.supportsThinking) return "Reasoning";
    return "Chat";
}

function normalizeOllamaCatalogRecord(raw = {}) {
    const rawId = normalizeModelId(raw.id || raw.name || raw.model);
    if (!rawId) return null;
    const staticOption = getStaticOllamaModelOption(rawId);
    const id = staticOption?.id || rawId;
    const installed = isOllamaModelInstalled(rawId) || isOllamaModelInstalled(id);
    const capability = getOllamaModelCapability(rawId);
    const kind = getOllamaCatalogKind(capability);
    const option = staticOption || raw;
    return {
        id,
        label: option.label || raw.label || id,
        meta: getLocalModelMeta(option, installed, capability) || kind,
        kind,
        provider: AI_PROVIDER_LOCAL,
        ownedBy: "Ollama",
        source: installed ? "installed" : "known",
        sourceLabel: installed ? "Installed" : "Known",
        installed,
        live: installed,
        inputModalities: Array.isArray(capability.inputModalities) ? capability.inputModalities : ["text"],
        outputModalities: Array.isArray(capability.outputModalities) ? capability.outputModalities : ["text"],
        supportedParameters: Array.isArray(capability.supportedParameters) ? capability.supportedParameters : [],
        supportedTools: capability.supportsToolCalling ? ["tools"] : [],
        reasoningModes: capability.supportsThinking ? ["thinking"] : [],
        fileInputCapabilities: Array.isArray(capability.fileInputCapabilities) ? capability.fileInputCapabilities : [],
        supportsImageInput: Boolean(capability.supportsImageInput),
        supportsFileInput: Boolean(capability.supportsFileInput),
        supportsToolCalling: Boolean(capability.supportsToolCalling),
        supportsStructuredOutputs: Boolean(capability.supportsStructuredOutputs),
        supportsTemperature: Boolean(capability.supportsTemperature),
        supportsStreaming: Boolean(capability.supportsStreaming),
        contextLength: capability.contextLength || null
    };
}

function getOllamaCatalogModels() {
    const models = new Map();
    [
        ...OLLAMA_CATALOG_MODEL_OPTIONS,
        ...installedOllamaModels.map(id => ({ id, label: id, meta: "Installed", provider: AI_PROVIDER_LOCAL }))
    ].forEach(option => {
        const normalized = normalizeOllamaCatalogRecord(option);
        if (!normalized) return;
        const existing = models.get(normalized.id);
        models.set(normalized.id, existing
            ? { ...existing, ...normalized, installed: existing.installed || normalized.installed, live: existing.live || normalized.live }
            : normalized);
    });
    return Array.from(models.values()).sort((a, b) => {
        const installedCompare = Number(b.installed) - Number(a.installed);
        if (installedCompare) return installedCompare;
        const kindCompare = a.kind.localeCompare(b.kind);
        return kindCompare || a.id.localeCompare(b.id);
    });
}

function formatOpenAiCatalogList(values = []) {
    return values.map(value => String(value || "").trim()).filter(Boolean).join(", ");
}

function getOpenAiCatalogCapabilities(model) {
    const tags = [model.kind];
    if (model.inputModalities.length) tags.push(`Input: ${formatOpenAiCatalogList(model.inputModalities)}`);
    if (model.outputModalities.length) tags.push(`Output: ${formatOpenAiCatalogList(model.outputModalities)}`);
    if (model.supportsImageInput && !model.inputModalities.includes("image")) tags.push("Vision");
    if (model.supportsFileInput) tags.push("Files");
    if (model.supportsToolCalling || model.supportedTools.length) tags.push("Tools");
    if (model.supportsStructuredOutputs) tags.push("Structured output");
    if (model.supportsStreaming) tags.push("Streaming");
    if (model.supportsTemperature) tags.push("Temperature");
    if (model.reasoningModes.length) tags.push(`Reasoning: ${formatOpenAiCatalogList(model.reasoningModes)}`);
    if (model.contextLength) tags.push(`${Number(model.contextLength).toLocaleString("en-US")} context`);
    return Array.from(new Set(tags));
}

function openAiCatalogModelHasCapability(model, key) {
    switch (key) {
        case "text-input":
            return model.inputModalities.includes("text");
        case "image-input":
            return model.inputModalities.includes("image") || model.supportsImageInput;
        case "audio-input":
            return model.inputModalities.includes("audio");
        case "text-output":
            return model.outputModalities.includes("text");
        case "image-output":
            return model.outputModalities.includes("image");
        case "audio-output":
            return model.outputModalities.includes("audio");
        case "tools":
            return model.supportsToolCalling || model.supportedTools.length > 0;
        case "files":
            return model.supportsFileInput || model.fileInputCapabilities.length > 0;
        case "structured":
            return model.supportsStructuredOutputs;
        case "reasoning":
            return model.reasoningModes.length > 0;
        case "streaming":
            return Boolean(model.supportsStreaming);
        case "temperature":
            return Boolean(model.supportsTemperature);
        default:
            return false;
    }
}

function modelMatchesOpenAiCatalogFilters(model) {
    for (const key of openAiCatalogFilters.require) {
        if (!openAiCatalogModelHasCapability(model, key)) return false;
    }
    for (const key of openAiCatalogFilters.exclude) {
        if (openAiCatalogModelHasCapability(model, key)) return false;
    }
    return true;
}

function getOpenAiCatalogActiveFilterCount() {
    return openAiCatalogFilters.require.size + openAiCatalogFilters.exclude.size;
}

function sortOpenAiCatalogModels(models = []) {
    const sorted = [...models];
    if (openAiCatalogSortMode === "context-desc") {
        return sorted.sort((a, b) => (Number(b.contextLength) || 0) - (Number(a.contextLength) || 0) || a.id.localeCompare(b.id));
    }
    if (openAiCatalogSortMode === "context-asc") {
        return sorted.sort((a, b) => {
            const aContext = Number(a.contextLength) || Number.POSITIVE_INFINITY;
            const bContext = Number(b.contextLength) || Number.POSITIVE_INFINITY;
            return aContext - bContext || a.id.localeCompare(b.id);
        });
    }
    return sorted;
}

function modelMatchesOpenAiCatalogQuery(model, query) {
    if (!query) return true;
    const haystack = [
        model.id,
        model.label,
        model.meta,
        model.kind,
        model.ownedBy,
        model.sourceLabel,
        model.provider,
        ...model.inputModalities,
        ...model.outputModalities,
        ...model.supportedParameters,
        ...model.supportedTools,
        ...model.reasoningModes,
        ...getOpenAiCatalogCapabilities(model)
    ].join(" ").toLowerCase();
    return query.split(/\s+/).filter(Boolean).every(part => haystack.includes(part));
}

function getOpenAiCatalogUseTarget(model) {
    if (!model) return null;
    if (model.provider === AI_PROVIDER_LOCAL) {
        if (model.supportsStreaming === false) return null;
        return { id: "local-chat", label: "Use chat", toastLabel: "Ollama model" };
    }
    if (model.kind === "Image" || model.outputModalities.includes("image")) {
        return { id: "image", label: "Use image", toastLabel: "Image model" };
    }
    if (model.kind === "Transcription") {
        return { id: "transcription", label: "Use transcription", toastLabel: "Transcription model" };
    }
    if (model.kind === "Realtime") {
        return { id: "realtime", label: "Use voice", toastLabel: "Realtime voice model" };
    }
    if (model.kind === "Speech") {
        return { id: "speech", label: "Use speech", toastLabel: "Speech model" };
    }
    if (model.kind === "Chat" && (model.isChat || isLikelyOpenAiChatModelId(model.id))) {
        return { id: "chat", label: "Use chat", toastLabel: "Chat model" };
    }
    return null;
}

function getCatalogModelOption(model) {
    return {
        id: model.id,
        label: model.label || model.id,
        meta: model.meta || model.kind,
        provider: model.provider || AI_PROVIDER_OPENAI
    };
}

function addOptionIfMissing(options = [], model) {
    if (!model?.id || options.some(option => option.id === model.id)) return options;
    return [getCatalogModelOption(model), ...options];
}

function useOpenAiCatalogModel(modelId) {
    const model = getActiveModelCatalogRecordById(modelId);
    const target = getOpenAiCatalogUseTarget(model);
    if (!model || !target) {
        showToast("This model does not match a configurable Fauna model slot yet.", "warning");
        return;
    }

    if (target.id === "local-chat") {
        setActiveModel(model.id, { provider: AI_PROVIDER_LOCAL });
        renderLocalModelChoices();
        updateModelSwitcherForProvider();
        if (model.installed) {
            showToast(`${target.toastLabel} set to ${model.id}. Ready to use.`, "success");
        }
        return;
    } else if (target.id === "chat") {
        const options = addOptionIfMissing(getOpenAiSettingsChatModelOptions(), model);
        openAiChatModelSelect?.setOptions(options, model.id);
        if (openAiChatModelInput) openAiChatModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "image") {
        const options = addOptionIfMissing(getOpenAiImageModelOptions(), model);
        openAiImageModelSelect?.setOptions(options, model.id);
        if (openAiImageModelInput) openAiImageModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "transcription") {
        const options = addOptionIfMissing(getOpenAiTranscriptionModelOptions(), model);
        openAiTranscriptionModelSelect?.setOptions(options, model.id);
        if (openAiTranscriptionModelInput) openAiTranscriptionModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "realtime") {
        const options = addOptionIfMissing(getOpenAiRealtimeModelOptions(), model);
        openAiRealtimeModelSelect?.setOptions(options, model.id);
        if (openAiRealtimeModelInput) openAiRealtimeModelInput.value = model.id;
        updateOpenAiSaveButtonState();
    } else if (target.id === "speech") {
        safeLocalStorageSet(OPENAI_SPEECH_MODEL_STORAGE_KEY, model.id);
        stopVoicePreview();
    }

    const saveHint = target.id === "speech"
        ? "Saved for speech."
        : "Save OpenAI settings to apply.";
    showToast(`${target.toastLabel} set to ${model.id}. ${saveHint}`, target.id === "speech" ? "success" : "info");
}

function renderOpenAiCatalog() {
    if (!openAiCatalogList) return;
    const query = openAiCatalogSearchQuery.trim().toLowerCase();
    const models = openAiCatalogProvider === AI_PROVIDER_LOCAL ? getOllamaCatalogModels() : getOpenAiCatalogModels();
    const filtered = sortOpenAiCatalogModels(models.filter(model => modelMatchesOpenAiCatalogQuery(model, query) && modelMatchesOpenAiCatalogFilters(model)));
    const liveCount = models.filter(model => model.live).length;
    const installedCount = models.filter(model => model.installed).length;
    const activeFilterCount = getOpenAiCatalogActiveFilterCount();
    if (openAiCatalogStatus) {
        const baseStatus = openAiCatalogProvider === AI_PROVIDER_LOCAL
            ? (isOllamaReachable
                ? `${filtered.length} of ${models.length} Ollama models · ${installedCount} installed`
                : `${filtered.length} of ${models.length} known Ollama models · offline`)
            : (liveCount
                ? `${filtered.length} of ${models.length} models · ${liveCount} live`
                : `${filtered.length} of ${models.length} built-in models`);
        openAiCatalogStatus.textContent = activeFilterCount ? `${baseStatus} · ${activeFilterCount} filters` : baseStatus;
    }
    if (openAiCatalogEmpty) {
        openAiCatalogEmpty.hidden = filtered.length > 0;
        openAiCatalogEmpty.textContent = query || activeFilterCount
            ? "No models match that search and filter set."
            : openAiCatalogProvider === AI_PROVIDER_LOCAL ? "No Ollama models found." : "No OpenAI models found.";
    }
    updateOpenAiCatalogSortUi();
    updateOpenAiCatalogFilterUi();

    openAiCatalogList.replaceChildren(...filtered.map(model => {
        const item = document.createElement("article");
        item.className = "model-catalog-item";
        item.setAttribute("role", "listitem");

        const head = document.createElement("div");
        head.className = "model-catalog-item-head";

        const titleWrap = document.createElement("div");
        titleWrap.className = "model-catalog-title-wrap";

        const title = document.createElement("h3");
        title.textContent = model.label || model.id;

        const id = document.createElement("code");
        id.textContent = model.id;

        titleWrap.append(title, id);

        const badge = document.createElement("span");
        badge.className = "model-catalog-source";
        badge.textContent = model.sourceLabel || (model.live ? "Available" : "Known");

        const actionWrap = document.createElement("div");
        actionWrap.className = "model-catalog-item-actions";
        actionWrap.appendChild(badge);

        const useTarget = getOpenAiCatalogUseTarget(model);
        const useButton = document.createElement("button");
        useButton.className = "provider-btn provider-btn-secondary model-catalog-use-btn";
        useButton.type = "button";
        useButton.textContent = useTarget?.label || "No slot";
        useButton.disabled = !useTarget;
        if (useTarget) {
            useButton.addEventListener("click", () => useOpenAiCatalogModel(model.id));
        }
        actionWrap.appendChild(useButton);

        head.append(titleWrap, actionWrap);

        const meta = document.createElement("p");
        meta.className = "model-catalog-meta";
        const metaParts = [model.meta, model.ownedBy ? `Owner: ${model.ownedBy}` : ""].filter(Boolean);
        meta.textContent = metaParts.join(" · ") || model.kind;

        const capabilityList = document.createElement("div");
        capabilityList.className = "model-catalog-capabilities";
        getOpenAiCatalogCapabilities(model).forEach(capability => {
            const chip = document.createElement("span");
            chip.className = "model-catalog-chip";
            chip.textContent = capability;
            capabilityList.appendChild(chip);
        });

        item.append(head, meta, capabilityList);
        return item;
    }));
}

async function refreshOpenAiCatalog({ force = false } = {}) {
    if (openAiCatalogProvider === AI_PROVIDER_LOCAL) {
        await refreshOllamaCatalog();
        return;
    }
    cachedOpenAiCatalogModels = readCachedOpenAiModelCatalog({ allowStale: true });
    renderOpenAiCatalog();

    if (!getOpenAiApiKey() || !hasWorkspaceBridgeAccess()) {
        if (openAiCatalogStatus) {
            openAiCatalogStatus.textContent = "Built-in catalog · save OpenAI and bridge settings to refresh live models";
        }
        return;
    }

    const freshCache = readCachedOpenAiModelCatalog({ allowStale: false });
    if (!force && freshCache.length) {
        cachedOpenAiCatalogModels = freshCache;
        renderOpenAiCatalog();
        return;
    }

    if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = true;
    if (openAiCatalogStatus) openAiCatalogStatus.textContent = "Refreshing live models...";

    try {
        const res = await openAiFetch("/models", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(formatOpenAiApiError(data, res.status));
        const models = (Array.isArray(data?.data) ? data.data : [])
            .map(model => normalizeOpenAiCatalogModel({ ...model, source: "live" }))
            .filter(Boolean);
        writeCachedOpenAiModelCatalog(models);
        availableOpenAiModelIds = new Set(models.map(model => model.id));
        updateModelSwitcherForProvider();
        updateOpenAiModelSelects();
        renderOpenAiCatalog();
    } catch (err) {
        if (openAiCatalogStatus) openAiCatalogStatus.textContent = `Live refresh failed: ${err.message}`;
    } finally {
        if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = false;
    }
}

async function refreshOllamaCatalog() {
    renderOpenAiCatalog();
    if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = true;
    if (openAiCatalogStatus) openAiCatalogStatus.textContent = "Refreshing local Ollama models...";
    try {
        await checkOllamaStatus();
        renderOpenAiCatalog();
    } finally {
        if (openAiCatalogRefreshBtn) openAiCatalogRefreshBtn.disabled = false;
    }
}

function updateOpenAiCatalogChrome() {
    const isLocalCatalog = openAiCatalogProvider === AI_PROVIDER_LOCAL;
    if (openAiCatalogTitle) {
        openAiCatalogTitle.textContent = isLocalCatalog ? "Ollama Model Catalog" : "OpenAI Model Catalog";
    }
    if (openAiCatalogSearchInput) {
        openAiCatalogSearchInput.placeholder = isLocalCatalog
            ? "Search Ollama models or capabilities"
            : "Search models or capabilities";
    }
    if (openAiCatalogRefreshBtn) {
        openAiCatalogRefreshBtn.textContent = isLocalCatalog ? "Refresh Ollama" : "Refresh";
    }
}

function openOpenAiCatalogModal(provider = AI_PROVIDER_OPENAI) {
    if (!openAiCatalogModal) return;
    openAiCatalogProvider = normalizeAiProvider(provider);
    openAiCatalogReturnFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : openAiCatalogProvider === AI_PROVIDER_LOCAL ? ollamaCatalogBtn : openAiCatalogBtn;
    openAiCatalogSearchQuery = "";
    if (openAiCatalogSearchInput) openAiCatalogSearchInput.value = "";
    openAiCatalogModal.hidden = false;
    openAiCatalogModal.setAttribute("aria-hidden", "false");
    updateOpenAiCatalogChrome();
    renderOpenAiCatalog();
    window.setTimeout(() => openAiCatalogSearchInput?.focus(), 0);
    void refreshOpenAiCatalog();
}

function openOllamaCatalogModal() {
    openOpenAiCatalogModal(AI_PROVIDER_LOCAL);
}

function closeOpenAiCatalogModal({ returnFocus = true } = {}) {
    if (!openAiCatalogModal || openAiCatalogModal.hidden) return;
    closeOpenAiCatalogFilters();
    openAiCatalogModal.hidden = true;
    openAiCatalogModal.setAttribute("aria-hidden", "true");
    if (returnFocus && openAiCatalogReturnFocus && document.contains(openAiCatalogReturnFocus)) {
        openAiCatalogReturnFocus.focus?.({ preventScroll: true });
    }
    openAiCatalogReturnFocus = null;
}

function setOpenAiCatalogFiltersOpen(isOpen) {
    if (!openAiCatalogFiltersMenu || !openAiCatalogFiltersBtn) return;
    openAiCatalogFiltersMenu.hidden = !isOpen;
    openAiCatalogFiltersBtn.setAttribute("aria-expanded", String(isOpen));
    openAiCatalogFiltersBtn.classList.toggle("active", isOpen);
}

function closeOpenAiCatalogFilters() {
    setOpenAiCatalogFiltersOpen(false);
}

function updateOpenAiCatalogSortUi() {
    openAiCatalogSortButtons.forEach(button => {
        const isActive = button.dataset.openaiCatalogSort === openAiCatalogSortMode;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
    scheduleAnimatedSegmentIndicators();
}

function updateOpenAiCatalogFilterUi() {
    const activeCount = getOpenAiCatalogActiveFilterCount();
    if (openAiCatalogFiltersBtn) {
        openAiCatalogFiltersBtn.classList.toggle("has-filters", activeCount > 0);
        const label = activeCount ? `Filters (${activeCount})` : "Filters";
        const labelElement = openAiCatalogFiltersBtn.querySelector("[data-openai-catalog-filter-label]");
        if (labelElement) {
            labelElement.textContent = label;
        } else {
            openAiCatalogFiltersBtn.append(label);
        }
    }
    openAiCatalogFiltersMenu?.querySelectorAll("[data-openai-catalog-filter]").forEach(input => {
        const mode = input.dataset.openaiCatalogFilter;
        input.checked = Boolean(openAiCatalogFilters[mode]?.has(input.value));
    });
}

function clearOpenAiCatalogFilters() {
    openAiCatalogFilters.require.clear();
    openAiCatalogFilters.exclude.clear();
    renderOpenAiCatalog();
}

function normalizeStoredVoiceSpeed(value) {
    const speed = Number(value);
    if (!Number.isFinite(speed)) return 1;
    return Math.min(1.3, Math.max(0.7, Math.round(speed * 10) / 10));
}

function setVoiceSpeed(speed, { persist = true } = {}) {
    activeVoiceSpeed = normalizeStoredVoiceSpeed(speed);
    if (persist) safeLocalStorageSet(VOICE_SPEED_STORAGE_KEY, String(activeVoiceSpeed));
    updateVoiceQuickUi();
}

function setVoiceReplyEnabled(enabled, { persist = true, cue = false } = {}) {
    isVoiceReplyEnabled = Boolean(enabled);
    if (persist) safeLocalStorageSet(VOICE_REPLY_ENABLED_STORAGE_KEY, isVoiceReplyEnabled ? "true" : "false");
    applyVoiceReplyOutputState();
    updateVoiceQuickUi();
    if (cue) void playVoiceSessionCue(isVoiceReplyEnabled ? "unmute" : "mute");
}

function setSelectedVoiceMic(deviceId, { persist = true } = {}) {
    selectedVoiceMicDeviceId = deviceId || "default";
    if (persist) safeLocalStorageSet(VOICE_MIC_DEVICE_STORAGE_KEY, selectedVoiceMicDeviceId);
    updateVoiceMicChoiceSelection();
}

function supportsVoiceOutputSelection() {
    return typeof HTMLMediaElement !== "undefined"
        && typeof HTMLMediaElement.prototype.setSinkId === "function";
}

function getSelectedVoiceOutputSinkId() {
    return selectedVoiceOutputDeviceId === "default" ? "" : selectedVoiceOutputDeviceId;
}

async function applySelectedVoiceOutput(audio, { notify = false } = {}) {
    if (!audio || !supportsVoiceOutputSelection()) return false;
    try {
        await audio.setSinkId(getSelectedVoiceOutputSinkId());
        return true;
    } catch (err) {
        console.warn("Could not set voice output device:", err);
        if (notify && !hasShownVoiceOutputWarning) {
            hasShownVoiceOutputWarning = true;
            showToast("Could not use that output device. Using the system default.", "warning");
        }
        return false;
    }
}

function setSelectedVoiceOutput(deviceId, { persist = true } = {}) {
    selectedVoiceOutputDeviceId = deviceId || "default";
    if (persist) safeLocalStorageSet(VOICE_OUTPUT_DEVICE_STORAGE_KEY, selectedVoiceOutputDeviceId);
    updateVoiceOutputChoiceSelection();
    hasShownVoiceOutputWarning = false;
    applySelectedVoiceOutput(activeSpeechAudio, { notify: true });
    applySelectedVoiceOutput(activeVoicePreviewAudio, { notify: true });
    applySelectedVoiceOutput(openAiRealtimeAudioElement, { notify: true });
}

function normalizePersonaDisplayName(value) {
    return String(value || "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, PERSONA_DISPLAY_NAME_MAX_LENGTH);
}

function normalizePersonaCustomInstructions(value) {
    return String(value || "")
        .replace(/\r\n?/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim()
        .slice(0, PERSONA_CUSTOM_INSTRUCTIONS_MAX_LENGTH);
}

function getPersonaDisplayName() {
    return normalizePersonaDisplayName(safeLocalStorageGet(PERSONA_DISPLAY_NAME_STORAGE_KEY));
}

function getPersonaCustomInstructions() {
    return normalizePersonaCustomInstructions(safeLocalStorageGet(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY));
}

function updatePersonaSettingsUi() {
    if (personaDisplayNameInput) personaDisplayNameInput.value = getPersonaDisplayName();
    if (personaCustomInstructionsInput) personaCustomInstructionsInput.value = getPersonaCustomInstructions();
    updatePersonaSaveButtonState();
}

function savePersonaSettings() {
    const displayName = normalizePersonaDisplayName(personaDisplayNameInput?.value);
    const customInstructions = normalizePersonaCustomInstructions(personaCustomInstructionsInput?.value);

    if (displayName) {
        safeLocalStorageSet(PERSONA_DISPLAY_NAME_STORAGE_KEY, displayName);
    } else {
        safeLocalStorageRemove(PERSONA_DISPLAY_NAME_STORAGE_KEY);
    }

    if (customInstructions) {
        safeLocalStorageSet(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY, customInstructions);
    } else {
        safeLocalStorageRemove(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    }

    updatePersonaSettingsUi();
    updateTimeGreeting({ forceRandom: true });
    showToast(displayName || customInstructions ? "Personalization saved." : "Personalization cleared.", displayName || customInstructions ? "success" : "info");
}

function clearPersonaSettings() {
    safeLocalStorageRemove(PERSONA_DISPLAY_NAME_STORAGE_KEY);
    safeLocalStorageRemove(PERSONA_CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    updatePersonaSettingsUi();
    updateTimeGreeting({ forceRandom: true });
    showToast("Personalization cleared.", "info");
}

function buildPersonalizationSystemPrompt() {
    const displayName = getPersonaDisplayName();
    const customInstructions = getPersonaCustomInstructions();
    if (!displayName && !customInstructions) return "";

    const sections = ["Personalization is enabled for this user."];
    if (displayName) {
        sections.push(`The user's display name is "${displayName}". Address them by this name when it feels natural, without overusing it.`);
    }
    if (customInstructions) {
        sections.push(`Follow these user-saved custom instructions:\n${customInstructions}`);
    }
    return sections.join("\n\n");
}

function getBrowserLocales() {
    const locales = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language || ""];
    return locales
        .map(locale => String(locale || "").trim())
        .filter(Boolean);
}

function getLocaleRegionCode(locale) {
    const value = String(locale || "").trim();
    if (!value) return "";

    try {
        const parsed = new Intl.Locale(value);
        if (parsed.region) return parsed.region.toUpperCase();
    } catch {
        // Fall back to a light BCP-47 parse below.
    }

    const match = value.match(/[-_](?:[A-Za-z]{4}[-_])?([A-Za-z]{2}|\d{3})(?:[-_]|$)/);
    return match ? match[1].toUpperCase() : "";
}

function getRegionDisplayName(regionCode) {
    const code = String(regionCode || "").trim().toUpperCase();
    if (!code) return "";
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
    } catch {
        return code;
    }
}

function buildUserLocaleSystemPrompt() {
    const locales = getBrowserLocales();
    const primaryLocale = locales[0] || "";
    const regionCode = locales.map(getLocaleRegionCode).find(Boolean) || "";
    const regionName = getRegionDisplayName(regionCode);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lines = [];

    if (primaryLocale) lines.push(`Primary browser language/locale: ${primaryLocale}`);
    if (locales.length > 1) lines.push(`Browser language preferences: ${locales.join(", ")}`);
    if (regionCode) lines.push(`Inferred user country/region: ${regionName} (${regionCode})`);
    if (timeZone) lines.push(`Browser time zone: ${timeZone}`);

    if (!lines.length) return "";
    return `${USER_LOCALE_SYSTEM_PROMPT}\n\n${lines.join("\n")}`;
}

function getSelectedVoiceMicConstraints() {
    if (!selectedVoiceMicDeviceId || selectedVoiceMicDeviceId === "default") return true;
    return { deviceId: { exact: selectedVoiceMicDeviceId } };
}

function getVoiceModeInstruction() {
    return "\n\n[Voice chat settings]\nRespond for spoken playback. Keep the answer concise and conversational. Summaries are only allowed when the user explicitly asks for a summary/recap (for example: \"summarize\", \"recap\", or \"zusammenfassen\"). Otherwise keep each reply focused on the current request and do not combine/merge multiple turns.";
}

function buildRealtimeMemoryContext() {
    if (!isMemoryEnabled || !memoryEntries.length) return "";
    const lines = memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`).join("\n");
    return `Saved memories for context only. Do not mention them unless relevant:\n${lines}`;
}

function buildOpenAiRealtimeInstructions() {
    return [
        "You are Fauna in a live speech-to-speech conversation.",
        "Speak naturally, warmly, and concisely. Keep most replies to a few sentences unless the user asks for detail.",
        "Use the user's spoken language by default.",
        "Only summarize earlier messages when the user explicitly requests a summary or recap. Otherwise keep replies focused and do not merge multiple assistant turns unless the user directly asks you to summarize them.",
        "Do not speak markup, hidden tool calls, XML, JSON control blocks, or code fences aloud.",
        "If the user asks for local workspace files, terminal commands, web browsing, or tool-backed work, explain briefly that those tools are available in typed chat.",
        buildUserLocaleSystemPrompt(),
        buildPersonalizationSystemPrompt(),
        buildRealtimeMemoryContext()
    ].filter(Boolean).join("\n\n");
}

function buildOpenAiRealtimeSessionConfig() {
    return {
        type: "realtime",
        model: getOpenAiRealtimeModel(),
        instructions: buildOpenAiRealtimeInstructions(),
        audio: {
            input: {
                transcription: {
                    model: getOpenAiTranscriptionModel()
                },
                turn_detection: {
                    type: "server_vad"
                }
            },
            output: {
                voice: getOpenAiVoice()
            }
        }
    };
}

function getMediaDataUrlMime(value) {
    return String(value || "").match(MEDIA_DATA_URL_PREFIX_RE)?.[1] || "media";
}

function sanitizeContentForModelContext(content) {
    return String(content || "")
        .replace(MARKDOWN_MEDIA_DATA_URL_RE, (_match, altText, dataUrl) => {
            const label = String(altText || "Generated media").trim() || "Generated media";
            return `[${label} omitted from model context: ${getMediaDataUrlMime(dataUrl)} data]`;
        })
        .replace(MEDIA_DATA_URL_RE, dataUrl => `[${getMediaDataUrlMime(dataUrl)} data omitted from model context]`);
}

function getGeneratedImageHistoryContent(label, prompt) {
    return `${label} for: ${prompt}\n\n[Generated image preview is visible in the chat. Image data is omitted from model context.]`;
}

function getGeneratedMediaCopyText(url, fallbackText) {
    return MEDIA_DATA_URL_PREFIX_RE.test(String(url || "")) ? fallbackText : (url || fallbackText);
}

function isContextCompactionMessage(message) {
    return Boolean(
        message
        && typeof message === "object"
        && message.contextCompaction
        && message.contextCompaction.type === CONTEXT_COMPACTION_MESSAGE_TYPE
    );
}

function cloneContextCompactionMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return null;
    return {
        type: CONTEXT_COMPACTION_MESSAGE_TYPE,
        summary: String(metadata.summary || ""),
        nextStep: String(metadata.nextStep || ""),
        carryForward: Array.isArray(metadata.carryForward)
            ? metadata.carryForward.map(item => String(item || "")).filter(Boolean).slice(0, 16)
            : [],
        originalMessageCount: Number(metadata.originalMessageCount || 0) || 0,
        keptMessageCount: Number(metadata.keptMessageCount || 0) || 0,
        thresholdPercent: Number(metadata.thresholdPercent || 0) || 0,
        estimatedTokens: Number(metadata.estimatedTokens || 0) || 0,
        contextLimit: Number(metadata.contextLimit || 0) || 0,
        reviewed: Boolean(metadata.reviewed),
        approved: metadata.approved === undefined ? null : Boolean(metadata.approved),
        rotations: Number(metadata.rotations || 0) || 0,
        model: String(metadata.model || ""),
        criticModel: String(metadata.criticModel || ""),
        trigger: String(metadata.trigger || ""),
        createdAt: String(metadata.createdAt || "")
    };
}

function cloneConversationHistory(history, { includeImages = true, sanitizeContent = true } = {}) {
    if (!Array.isArray(history)) return [];
    return history
        .filter(message => message && typeof message === "object")
        .map(message => {
            const cloned = {
                role: message.role || "assistant",
                content: sanitizeContent ? sanitizeContentForModelContext(message.content) : (message.content || "")
            };
            ["model", "provider", "reasoning", "createdAt"].forEach(key => {
                if (message[key] !== undefined && message[key] !== null && message[key] !== "") {
                    cloned[key] = String(message[key]);
                }
            });
            if (includeImages && Array.isArray(message.images) && message.images.length > 0) {
                cloned.images = [...message.images];
            }
            if (includeImages && Array.isArray(message.openAiImageFileIds) && message.openAiImageFileIds.length > 0) {
                cloned.openAiImageFileIds = [...message.openAiImageFileIds];
            }
            if (message.voiceRecording && typeof message.voiceRecording === "object") {
                const voiceRecording = {};
                ["url", "path", "mimeType", "size", "duration", "provider", "transcript", "createdAt"].forEach(key => {
                    if (message.voiceRecording[key] !== undefined && message.voiceRecording[key] !== null && message.voiceRecording[key] !== "") {
                        voiceRecording[key] = String(message.voiceRecording[key]);
                    }
                });
                if (Object.keys(voiceRecording).length > 0) {
                    cloned.voiceRecording = voiceRecording;
                }
            }
            const tokenUsage = normalizeTokenUsage(message.tokenUsage);
            if (tokenUsage) {
                cloned.tokenUsage = tokenUsage;
            }
            const contextCompaction = cloneContextCompactionMetadata(message.contextCompaction);
            if (contextCompaction) {
                cloned.contextCompaction = contextCompaction;
            }
            return cloned;
        });
}

function createMemoryId() {
    return window.crypto?.randomUUID?.() || `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeMemoryText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MEMORY_MAX_TEXT_LENGTH);
}

function createMemoryEntry(text, source = "user", overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: createMemoryId(),
        text: normalizeMemoryText(text),
        source: source === "assistant" ? "assistant" : "user",
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

function normalizeStoredMemoryEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = normalizeMemoryText(raw.text || raw.memory || raw.content);
    if (!text) return null;
    const now = new Date().toISOString();
    return createMemoryEntry(text, raw.source, {
        id: String(raw.id || createMemoryId()),
        createdAt: raw.createdAt || raw.updatedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || now
    });
}

function readStoredMemoryEntries() {
    const raw = safeLocalStorageGet(MEMORY_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeStoredMemoryEntry)
            .filter(Boolean)
            .slice(0, MEMORY_MAX_ENTRIES);
    } catch (err) {
        console.warn("Could not parse saved Fauna memories:", err);
        return [];
    }
}

function persistMemoryEntries() {
    memoryEntries = memoryEntries
        .map(normalizeStoredMemoryEntry)
        .filter(Boolean)
        .slice(0, MEMORY_MAX_ENTRIES);
    safeLocalStorageSet(MEMORY_STORAGE_KEY, JSON.stringify(memoryEntries));
    updateMemorySettingsUi();
}

function getMemoryCountLabel() {
    const count = memoryEntries.length;
    return `${count} ${count === 1 ? "memory" : "memories"}`;
}

function updateMemorySettingsUi() {
    if (toggleMemoryBeta) toggleMemoryBeta.checked = isMemoryEnabled;
    if (memoryBetaStatus) {
        memoryBetaStatus.textContent = isMemoryEnabled ? "Beta on" : "Off";
        memoryBetaStatus.dataset.state = isMemoryEnabled ? "configured" : "missing";
    }
    if (memoryCountLabel) {
        memoryCountLabel.textContent = getMemoryCountLabel();
    }
}

function setMemoryEnabled(enabled, { persist = true, notify = true } = {}) {
    isMemoryEnabled = Boolean(enabled);
    if (persist) safeLocalStorageSet(MEMORY_ENABLED_STORAGE_KEY, isMemoryEnabled ? "true" : "false");
    updateMemorySettingsUi();
    if (notify) {
        showToast(isMemoryEnabled ? "Memory beta enabled." : "Memory beta disabled.", isMemoryEnabled ? "success" : "info");
    }
}

function addMemoryEntry(text, source = "user") {
    const cleanText = normalizeMemoryText(text);
    if (!cleanText) return { entry: null, created: false };

    const existing = memoryEntries.find(entry => entry.text.toLowerCase() === cleanText.toLowerCase());
    if (existing) {
        existing.updatedAt = new Date().toISOString();
        existing.source = source === "assistant" ? "assistant" : existing.source;
        persistMemoryEntries();
        return { entry: existing, created: false };
    }

    const entry = createMemoryEntry(cleanText, source);
    memoryEntries.unshift(entry);
    persistMemoryEntries();
    return { entry, created: true };
}

function findMemoryIndex(target) {
    const cleanTarget = String(target || "").trim();
    if (!cleanTarget) return -1;

    const numeric = cleanTarget.match(/^#?(\d+)$/);
    if (numeric) {
        const index = Number(numeric[1]) - 1;
        return index >= 0 && index < memoryEntries.length ? index : -1;
    }

    const lowerTarget = cleanTarget.toLowerCase();
    return memoryEntries.findIndex(entry =>
        entry.id === cleanTarget ||
        entry.text.toLowerCase() === lowerTarget ||
        entry.text.toLowerCase().includes(lowerTarget)
    );
}

function removeMemoryEntry(target) {
    const index = findMemoryIndex(target);
    if (index < 0) return null;
    const [removed] = memoryEntries.splice(index, 1);
    persistMemoryEntries();
    return removed || null;
}

function clearMemoryEntries() {
    const count = memoryEntries.length;
    memoryEntries = [];
    persistMemoryEntries();
    return count;
}

function formatMemoryList() {
    if (!memoryEntries.length) {
        return isMemoryEnabled
            ? "Memory beta is on, but there are no saved memories yet.\nUse /memory add <something to remember>."
            : "Memory beta is off. Enable it in Settings > Personalization to use saved memories across chats.";
    }

    const state = isMemoryEnabled ? "on" : "off";
    const lines = memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`);
    return `Memory beta is ${state}. Saved memories:\n${lines.join("\n")}\n\nUse /memory add, /memory delete <number>, or /memory clear.`;
}

function buildMemorySystemPrompt() {
    if (!isMemoryEnabled) return "";
    const lines = memoryEntries.length
        ? memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`).join("\n")
        : "No saved memories yet.";
    return `${MEMORY_SYSTEM_PROMPT}\n\nSaved memories:\n${lines}`;
}

function normalizeMemoryRequestPayload(payload) {
    const rawItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.memories)
            ? payload.memories
            : [payload];

    return rawItems
        .map(item => {
            if (!item || typeof item !== "object") return null;
            const action = String(item.action || item.type || "add").trim().toLowerCase();
            const text = normalizeMemoryText(item.text || item.memory || item.content || item.value);
            const target = String(item.target || item.id || item.index || item.text || "").trim();
            return { action, text, target };
        })
        .filter(item => item && (item.text || item.target));
}

function parseMemoryRequests(content) {
    const text = String(content || "");
    const regex = new RegExp(MEMORY_REQUEST_RE.source, "gi");
    const requests = [];

    for (const match of text.matchAll(regex)) {
        try {
            const payload = JSON.parse(match[1]);
            requests.push(...normalizeMemoryRequestPayload(payload));
        } catch (err) {
            console.warn("Could not parse Fauna memory request:", err);
        }
    }

    return requests;
}

function stripMemoryRequests(content) {
    return String(content || "").replace(MEMORY_REQUEST_RE, "").trim();
}

function stripAssistantControlBlocks(content) {
    return normalizeAssistantControlMarkup(content)
        .replace(ASSISTANT_CONTROL_BLOCKS_RE, "")
        .replace(ASSISTANT_CONTROL_OPEN_TO_END_RE, "")
        .trim();
}

function applyAssistantMemoryRequests(content) {
    if (!isMemoryEnabled) return;
    const requests = parseMemoryRequests(content);
    if (!requests.length) return;

    let changed = 0;
    requests.forEach(request => {
        if (["add", "remember", "create"].includes(request.action) && request.text) {
            const result = addMemoryEntry(request.text, "assistant");
            if (result.entry) changed += 1;
            return;
        }
        if (["delete", "forget", "remove"].includes(request.action) && request.target) {
            if (removeMemoryEntry(request.target)) changed += 1;
        }
    });

    if (changed > 0) {
        showToast(changed === 1 ? "Memory updated." : `${changed} memories updated.`, "success");
    }
}

function findMemoryEntries(query = "") {
    const cleanQuery = String(query || "").trim().toLowerCase();
    if (!cleanQuery) return memoryEntries;
    return memoryEntries.filter(entry =>
        entry.text.toLowerCase().includes(cleanQuery) ||
        String(entry.source || "").toLowerCase().includes(cleanQuery)
    );
}

function formatMemoryToolEntries(entries, query = "") {
    if (!entries.length) {
        return query
            ? `No saved memories matched "${query}".`
            : "No saved memories.";
    }

    const lines = entries.map(entry => {
        const index = memoryEntries.findIndex(candidate => candidate.id === entry.id);
        const number = index >= 0 ? index + 1 : "?";
        const updated = entry.updatedAt ? `, updated: ${entry.updatedAt}` : "";
        return `${number}. ${entry.text} (source: ${entry.source || "user"}${updated})`;
    });
    return query
        ? `Saved memories matching "${query}":\n${lines.join("\n")}`
        : `Saved memories:\n${lines.join("\n")}`;
}

