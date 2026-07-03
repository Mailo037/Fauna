// Original script.js lines 19390-21339.
function createCodeFileCard({
    title,
    meta,
    onOpen,
    onCopy,
    onDownload
}) {
    const card = document.createElement("div");
    card.className = "code-file-card";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "code-file-card-main";
    main.dataset.tooltip = "Open preview";
    main.setAttribute("aria-label", `Open preview for ${title}`);
    main.innerHTML = `
        <span class="code-file-card-icon" aria-hidden="true">${getCodeActionIcon("file")}</span>
        <span class="code-file-card-copy">
            <span class="code-file-card-title">${escapeHtml(title)}</span>
            <span class="code-file-card-meta">${escapeHtml(meta)}</span>
        </span>
    `;
    main.addEventListener("click", onOpen);

    const actions = document.createElement("div");
    actions.className = "code-file-card-actions";

    const copyBtn = createActionButton("Copy", "copy", { compact: true });
    copyBtn.addEventListener("click", event => {
        event.stopPropagation();
        onCopy?.(copyBtn);
    });

    const downloadBtn = createActionButton("Download", "download", { compact: true });
    downloadBtn.addEventListener("click", event => {
        event.stopPropagation();
        onDownload?.();
    });

    actions.append(copyBtn, downloadBtn);
    card.append(main, actions);
    return card;
}

function addCombinedPreviewBar(container, blocks) {
    if (container.querySelector(".code-combined-preview")) return;

    const bar = document.createElement("div");
    bar.className = "code-combined-preview";
    bar.innerHTML = `
        <div class="code-combined-preview-header">
            <span class="code-combined-preview-label">Preview workspace</span>
            <button type="button" class="code-combined-preview-btn">
                ${getCodeActionIcon("preview")}
                <span>Open preview</span>
            </button>
        </div>
    `;

    container.insertBefore(bar, container.firstChild);

    const toggleBtn = bar.querySelector(".code-combined-preview-btn");
    toggleBtn.onclick = () => {
        openCodeBlocksInWorkbench(blocks, {
            title: "Combined Preview",
            subtitle: `${blocks.length} linked code blocks`,
            downloadName: "fauna-preview.html",
            downloadMime: "text/html;charset=utf-8"
        });
    };
}

function wrapCodeBlock(pre, lang, code, kind, allowSandbox = true, options = {}) {
    let wrapper = pre.parentElement?.classList.contains("code-block-wrapper") ? pre.parentElement : null;
    if (wrapper?.dataset.codeEnhanced === "true") return;

    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "code-block-wrapper";
        pre.parentNode.insertBefore(wrapper, pre);
    }

    wrapper.querySelectorAll(".code-file-card").forEach(card => card.remove());
    wrapper.classList.remove("code-file-card-mode");
    pre.hidden = false;

    let header = Array.from(wrapper.children).find(child => child.classList?.contains("code-block-header"));
    if (!header) {
        header = document.createElement("div");
        header.className = "code-block-header";
        wrapper.appendChild(header);

        const label = document.createElement("span");
        label.className = "code-lang-label";
        label.textContent = getCodeLanguageLabel(lang, kind);
        header.appendChild(label);
    }
    header.hidden = false;

    const existingActions = header.querySelector(".code-block-actions");
    if (existingActions) existingActions.remove();

    const actions = document.createElement("div");
    actions.className = "code-block-actions";
    const isMarkdownBlock = isMarkdownCodeBlock(lang);

    let previewBtn = null;
    if (kind && allowSandbox) {
        previewBtn = createActionButton("Preview", "preview");
        actions.appendChild(previewBtn);
    }

    let markdownToggleBtn = null;
    if (isMarkdownBlock) {
        markdownToggleBtn = createActionButton("Render", "markdown");
        markdownToggleBtn.dataset.tooltip = "Render markdown";
        markdownToggleBtn.setAttribute("aria-label", "Render markdown");
        actions.appendChild(markdownToggleBtn);
    }

    let runBtn = null;
    if (isTerminalCommandBlock(lang, code)) {
        runBtn = createActionButton("Run", "terminal");
        runBtn.dataset.tooltip = "Run in terminal";
        runBtn.setAttribute("aria-label", "Run in terminal");
        actions.appendChild(runBtn);
    }

    const wrapBtn = createActionButton("Wrap", "wrap");
    actions.appendChild(wrapBtn);

    const copyBtn = createActionButton("Copy", "copy");
    const downloadBtn = createActionButton("Download", "download");
    actions.append(copyBtn, downloadBtn);

    let consoleBtn = null;
    if (kind === "js" && allowSandbox) {
        consoleBtn = createActionButton("Console", "console");
        actions.appendChild(consoleBtn);
    }

    header.appendChild(actions);
    if (pre.parentElement !== wrapper) wrapper.appendChild(pre);
    renderCodeElement(pre.querySelector("code"), code, lang);
    wrapper.dataset.codeEnhanced = "true";

    let consolePanel = null;
    if (kind === "js" && allowSandbox) {
        consolePanel = Array.from(wrapper.children).find(child => child.classList?.contains("console-output-box")) || createConsolePanel();
        if (consolePanel.parentElement !== wrapper) wrapper.appendChild(consolePanel);
    }

    let terminalPanel = null;
    if (runBtn) {
        terminalPanel = Array.from(wrapper.children).find(child => child.classList?.contains("terminal-output-box")) || createTerminalPanel();
        if (terminalPanel.parentElement !== wrapper) wrapper.appendChild(terminalPanel);
    }

    let markdownPanel = null;
    if (isMarkdownBlock) {
        markdownPanel = Array.from(wrapper.children).find(child => child.classList?.contains("markdown-render-panel")) || document.createElement("div");
        markdownPanel.className = "markdown-render-panel markdown";
        markdownPanel.hidden = true;
        markdownPanel.innerHTML = renderMarkdown(code);
        if (markdownPanel.parentElement !== wrapper) wrapper.appendChild(markdownPanel);
        wrapper.classList.remove("markdown-rendered");
    }

    let activeMode = null;
    const sharedPreviewBlocks = allowSandbox && Array.isArray(options.previewBlocks) && options.previewBlocks.length > 1
        ? options.previewBlocks
        : null;
    const openPreviewBlocks = () => {
        closeAll();
        const targetBlocks = sharedPreviewBlocks || [{ pre, lang, code, kind }];
        const documentHtml = sharedPreviewBlocks
            ? buildCombinedPreviewDocument(sharedPreviewBlocks)
            : allowSandbox
                ? getPreviewDocumentForBlock(kind, code)
                : "";
        const label = getCodeLanguageLabel(lang, kind) || "Code";
        openCodeBlocksInWorkbench(targetBlocks, {
            title: sharedPreviewBlocks
                ? getPreviewTitleFromDocument(documentHtml, "Combined Preview")
                : getPreviewTitleFromDocument(documentHtml, `${label} Preview`),
            subtitle: sharedPreviewBlocks ? `${sharedPreviewBlocks.length} linked code blocks` : `${label} sandbox`,
            downloadText: sharedPreviewBlocks ? documentHtml : code,
            downloadName: sharedPreviewBlocks ? "fauna-preview.html" : getCodeDownloadName(lang, kind),
            downloadMime: sharedPreviewBlocks || kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
        });
    };

    const closeAll = () => {
        if (consolePanel) {
            consolePanel.style.display = "none";
            consolePanel.innerHTML = "";
        }
        if (consoleBtn) setActionButtonState(consoleBtn, false, "Hide console", "Console");
        if (terminalPanel) terminalPanel.style.display = "none";
        if (runBtn) setRunButtonState(runBtn, false);
        activeMode = null;
    };

    if (shouldRenderCodeFileCard(wrapper, code)) {
        const fileName = getCodeFileCardName(wrapper, lang, kind);
        const fileCard = createCodeFileCard({
            title: fileName,
            meta: getCodeFileCardMeta(lang, kind, code),
            onOpen: openPreviewBlocks,
            onCopy: button => handleCopyButton(button, code),
            onDownload: () => {
                downloadTextFile(code, fileName || getCodeDownloadName(lang, kind));
                showToast("Download started.", "success");
            }
        });
        wrapper.classList.add("code-file-card-mode");
        header.hidden = true;
        pre.hidden = true;
        wrapper.insertBefore(fileCard, pre);
    }

    const setMarkdownRendered = rendered => {
        if (!markdownPanel || !markdownToggleBtn) return;
        const isFileCardMode = wrapper.classList.contains("code-file-card-mode");
        wrapper.classList.toggle("markdown-rendered", rendered);
        pre.hidden = rendered || isFileCardMode;
        markdownPanel.hidden = !rendered;
        setActionButtonState(markdownToggleBtn, rendered, "Markup", "Render");
        markdownToggleBtn.dataset.tooltip = rendered ? "Show markdown markup" : "Render markdown";
        markdownToggleBtn.setAttribute("aria-label", rendered ? "Show markdown markup" : "Render markdown");
    };

    setMarkdownRendered(false);

    setActionButtonState(wrapBtn, wrapper.classList.contains("code-wrap-enabled"), "Unwrap", "Wrap");
    wrapBtn.onclick = () => {
        const shouldWrap = !wrapper.classList.contains("code-wrap-enabled");
        wrapper.classList.toggle("code-wrap-enabled", shouldWrap);
        setActionButtonState(wrapBtn, shouldWrap, "Unwrap", "Wrap");
    };

    copyBtn.onclick = () => handleCopyButton(copyBtn, code);
    downloadBtn.onclick = () => {
        downloadTextFile(code, getCodeDownloadName(lang, kind));
        showToast("Download started.", "success");
    };

    if (markdownToggleBtn && markdownPanel) {
        markdownToggleBtn.onclick = () => {
            setMarkdownRendered(!wrapper.classList.contains("markdown-rendered"));
            scrollChatToBottom();
        };
    }

    if (runBtn && terminalPanel) {
        runBtn.onclick = () => {
            if (activeMode === "terminal") {
                closeAll();
    scrollChatToBottom();
                return;
            }

            if (!hasWorkspaceBridgeAccess()) {
                showToast("Enable Local Workspace Bridge to run terminal commands.", "warning");
                return;
            }

            closeAll();
            activeMode = "terminal";
            runTerminalCodeBlock(code, terminalPanel, runBtn);
        };
    }

    if (previewBtn) previewBtn.onclick = openPreviewBlocks;

    if (consoleBtn && consolePanel) {
        consoleBtn.onclick = () => {
            if (activeMode === "console") {
                closeAll();
                scrollChatToBottom({ force: true });
                return;
            }

            closeAll();
            executeJsSandboxed(code, consolePanel);
            setActionButtonState(consoleBtn, true, "Hide console", "Console");
            activeMode = "console";
            scrollChatToBottom({ force: true });
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
            scrollChatToBottom();
        }
    };
    
    window.addEventListener('message', onMessage);
    
    const iframeHtml = `
        <!DOCTYPE html>
        <html>
        <body>
            ${getPreviewBootstrapScript()}
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
    const codeBlocks = collectCodeBlocks(container);
    const previewBlocks = isSandboxEnabled ? codeBlocks.filter(block => block.kind) : [];
    const hasMultiplePreviewBlocks = previewBlocks.length >= 2;
    const hasMixedBlocks = new Set(previewBlocks.map(block => block.kind)).size > 1;

    if (hasMultiplePreviewBlocks || hasMixedBlocks) {
        addCombinedPreviewBar(container, previewBlocks);
    }

    codeBlocks.forEach(({ pre, lang, code, kind }) => {
        wrapCodeBlock(pre, lang, code, kind, isSandboxEnabled, {
            previewBlocks
        });
    });
}

// ===== TOOLS & SETTINGS INTERACTIONS =====
if (toolsBtn && toolsDropdown) {
    toolsBtn.onclick = (e) => {
        e.stopPropagation();
        const archived = typeof isActiveChatArchived === "function" && isActiveChatArchived();
        if (isGenerating || archived || !canUseComposerTools()) {
            toolsDropdown.classList.remove("open");
            if (archived) {
                showToast("Archived chats are read-only.", "warning");
            } else if (!isGenerating && !canUseComposerTools()) {
                showToast(`${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`, "warning");
            }
            return;
        }
        toolsDropdown.classList.toggle("open");
    };
    
    document.addEventListener("click", (e) => {
        if (!toolsBtn.contains(e.target) && !toolsDropdown.contains(e.target)) {
            toolsDropdown.classList.remove("open");
        }
    });
}

function openSettingsModal() {
    if (!settingsModal) return;
    toolsDropdown?.classList.remove("open");
    updatePersonaSettingsUi();
    void updateAppInfoPane();
    renderKeyboardShortcutSettings();
    updateShortcutBadges();
    settingsReturnFocus = document.activeElement instanceof HTMLElement && !settingsModal.contains(document.activeElement)
        ? document.activeElement
        : null;
    settingsModal.hidden = false;
    settingsModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("settings-modal-open");
    scheduleAnimatedSegmentIndicators();
    window.setTimeout(() => settingsCloseBtn?.focus(), 0);
}

function closeSettingsModal() {
    if (!settingsModal || settingsModal.hidden) return;
    closeOpenAiCatalogModal({ returnFocus: false });
    stopVoicePreview();
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && settingsModal.contains(activeElement)) {
        const focusTarget = settingsReturnFocus && document.contains(settingsReturnFocus)
            ? settingsReturnFocus
            : settingsOpenBtn || mobileSettingsOpenBtn || input;
        focusTarget?.focus?.({ preventScroll: true });
        if (document.activeElement === activeElement) {
            activeElement.blur();
        }
    }
    settingsModal.hidden = true;
    settingsModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("settings-modal-open");
    settingsReturnFocus = null;
}

function getSettingsNavButton(paneName) {
    return Array.from(settingsNavButtons).find(button => button.dataset.settingsPane === paneName) || null;
}

function getSettingsPane(paneName) {
    return Array.from(settingsPanes).find(pane => pane.dataset.settingsPanePanel === paneName) || null;
}

function updateOpenAiVoiceSettingsAvailability() {
    const isOpenAiActive = isOpenAiProvider();
    const hasSetup = hasOpenAiVoiceSetup();
    const isReady = isOpenAiActive && hasSetup;
    const reason = getOpenAiVoiceSetupReason();
    const voiceNavButton = getSettingsNavButton("voice");
    const voicePane = getSettingsPane("voice");

    if (voiceNavButton) {
        voiceNavButton.classList.remove("settings-nav-item-muted");
        voiceNavButton.removeAttribute("aria-disabled");
        delete voiceNavButton.dataset.tooltip;
        delete voiceNavButton.dataset.unavailable;
    }

    if (!voicePane) return;
    voicePane.classList.remove("settings-pane-unavailable");
    voicePane.setAttribute("aria-disabled", "false");
    if (voiceSetupNotice) {
        const showSetupNotice = isOpenAiActive && !hasSetup;
        voiceSetupNotice.hidden = !showSetupNotice;
        voiceSetupNotice.textContent = showSetupNotice
            ? `${reason} Local Whisper and voice endpoints remain available through the Local Workspace Bridge.`
            : "";
    }
    delete voicePane.dataset.unavailableReason;

    const openAiVoiceSections = [
        voicePane.querySelector(".voice-picker"),
        openAiRealtimeModelSelectHost?.closest(".settings-row")
    ].filter(Boolean);

    openAiVoiceSections.forEach(section => {
        section.classList.toggle("openai-voice-unavailable", !isReady);
        section.setAttribute("aria-disabled", String(!isReady));
        section.querySelectorAll("button").forEach(button => {
            button.disabled = !isReady;
        });
    });

    if (!isReady) {
        stopVoicePreview();
        openAiRealtimeModelSelect?.close();
    }
}

function setSettingsPane(paneName = "general") {
    const normalized = Array.from(settingsPanes).some(pane => pane.dataset.settingsPanePanel === paneName)
        ? paneName
        : "general";
    updateOpenAiVoiceSettingsAvailability();
    settingsNavButtons.forEach(button => {
        const isActive = button.dataset.settingsPane === normalized;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    settingsPanes.forEach(pane => {
        const isActive = pane.dataset.settingsPanePanel === normalized;
        pane.hidden = !isActive;
        pane.classList.toggle("active", isActive);
    });
    if (settingsTitle) {
        const activeButton = Array.from(settingsNavButtons).find(button => button.dataset.settingsPane === normalized);
        settingsTitle.textContent = activeButton?.textContent?.trim() || "Settings";
    }
    if (normalized === "usage") {
        renderUsageSettingsPane();
    }
    if (normalized === "info") {
        void updateAppInfoPane();
    }
    if (normalized === "shortcuts") {
        renderKeyboardShortcutSettings();
    }
    if (normalized === "notifications") {
        renderNotificationSettings();
    }
    if (normalized === "task-models") {
        refreshLocalTaskModelsPane();
    }
    scheduleAnimatedSegmentIndicators();
}

function readStoredBoolean(key, fallback) {
    const value = safeLocalStorageGet(key);
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
}

let hasRunOllamaStartupCheck = false;
let hasShownOllamaStartPrompt = false;
let activeOnboardingStep = 0;
let onboardingStepDirection = "next";
let onboardingReturnFocus = null;

const ONBOARDING_STEP_TITLES = [
    "Welcome to Fauna",
    "Connect provider",
    "Tune the agent",
    "Ready to start"
];

function renderOllamaAutoStartSetting() {
    if (localModelsAutoStartToggle) {
        localModelsAutoStartToggle.checked = isOllamaAutoStartEnabled;
    }
    if (localModelsAutoStartStatus) {
        localModelsAutoStartStatus.textContent = isOllamaAutoStartEnabled
            ? "Fauna will try to start Ollama automatically when local AI is offline."
            : "Fauna will notify you when Ollama is offline and offer a start button.";
    }
}

function setOllamaAutoStartEnabled(enabled, { persist = true, notify = false } = {}) {
    isOllamaAutoStartEnabled = Boolean(enabled);
    if (persist) {
        safeLocalStorageSet(OLLAMA_AUTO_START_STORAGE_KEY, isOllamaAutoStartEnabled ? "true" : "false");
    }
    renderOllamaAutoStartSetting();
    if (notify) {
        showToast(
            isOllamaAutoStartEnabled ? "Ollama auto-start enabled." : "Ollama auto-start disabled.",
            isOllamaAutoStartEnabled ? "success" : "info"
        );
    }
}

function showOllamaStartNotification({ force = false } = {}) {
    if (!force && hasShownOllamaStartPrompt) return;
    hasShownOllamaStartPrompt = true;
    showToast("Ollama is offline. Start it from Fauna to use local models.", "warning", {
        duration: 10000,
        actionLabel: "Start Ollama",
        onAction: () => {
            void startOllamaHttpService({ remember: true });
        }
    });
}

async function runOllamaStartupCheck() {
    if (hasRunOllamaStartupCheck) return;
    hasRunOllamaStartupCheck = true;
    const shouldRestoreOpenAiStatus = isOpenAiProvider();
    if (shouldRestoreOpenAiStatus && !isOllamaAutoStartEnabled) return;
    await checkOllamaStatus();
    if (isOllamaReachable) {
        if (shouldRestoreOpenAiStatus) updateActiveProviderStatus();
        return;
    }

    const desktopStatus = await getDesktopOllamaStatus();
    if (desktopStatus?.processRunning) {
        if (shouldRestoreOpenAiStatus) updateProviderSettingsUi();
        window.setTimeout(async () => {
            if (!isOllamaReachable) await checkOllamaStatus();
            if (shouldRestoreOpenAiStatus) updateActiveProviderStatus();
            if (!isOllamaReachable && !isOpenAiProvider()) showOllamaStartNotification();
        }, 1800);
        return;
    }

    if (isOllamaAutoStartEnabled) {
        const started = await startOllamaHttpService({ silent: true });
        if (shouldRestoreOpenAiStatus) updateActiveProviderStatus();
        if (started) return;
    }

    if (shouldRestoreOpenAiStatus) updateProviderSettingsUi();
    if (!isOpenAiProvider()) showOllamaStartNotification();
}

function scheduleOllamaStartupCheck() {
    window.setTimeout(() => {
        void runOllamaStartupCheck();
    }, 900);
}

function hasCompletedOnboarding() {
    const value = safeLocalStorageGet(ONBOARDING_COMPLETED_STORAGE_KEY);
    return value === ONBOARDING_VERSION || value === "true";
}

function markOnboardingComplete() {
    safeLocalStorageSet(ONBOARDING_COMPLETED_STORAGE_KEY, ONBOARDING_VERSION);
}

function isOnboardingOpen() {
    return Boolean(onboardingModal && !onboardingModal.hidden);
}

function updateOnboardingProviderChoices() {
    onboardingModal?.querySelectorAll("[data-onboarding-action='provider-local'], [data-onboarding-action='provider-openai']")
        .forEach(button => {
            const isActive = button.dataset.onboardingAction === (isOpenAiProvider() ? "provider-openai" : "provider-local");
            button.classList.toggle("active", isActive);
        });
}

function updateOnboardingOllamaStatus() {
    if (!onboardingOllamaStatus) return;
    if (!hasCheckedOllamaStatus) {
        onboardingOllamaStatus.textContent = "Not checked";
        onboardingOllamaStatus.dataset.state = "missing";
        return;
    }
    if (!isOllamaReachable) {
        onboardingOllamaStatus.textContent = "Offline";
        onboardingOllamaStatus.dataset.state = "missing";
        return;
    }
    const missingCount = getRequiredOllamaModels().filter(model => !isOllamaModelInstalled(model)).length;
    onboardingOllamaStatus.textContent = missingCount > 0 ? `${missingCount} missing` : "Ready";
    onboardingOllamaStatus.dataset.state = missingCount > 0 ? "missing" : "configured";
}

function updateOnboardingOpenAiStatus() {
    if (onboardingOpenAiApiKeyInput && document.activeElement !== onboardingOpenAiApiKeyInput) {
        onboardingOpenAiApiKeyInput.value = getOpenAiApiKey();
    }
    if (!onboardingOpenAiStatus) return;
    const hasKey = Boolean(getOpenAiApiKey());
    const pendingKey = (onboardingOpenAiApiKeyInput?.value || "").trim();
    if (!hasKey) {
        onboardingOpenAiStatus.textContent = pendingKey ? "Ready to save" : "Key needed";
        onboardingOpenAiStatus.dataset.state = pendingKey ? "configured" : "missing";
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        onboardingOpenAiStatus.textContent = "Bridge needed";
        onboardingOpenAiStatus.dataset.state = "missing";
        return;
    }
    onboardingOpenAiStatus.textContent = "Ready";
    onboardingOpenAiStatus.dataset.state = "configured";
}

function updateOnboardingProviderSetup() {
    const provider = isOpenAiProvider() ? "openai" : "local";
    onboardingProviderSetupPanels.forEach(panel => {
        const isActive = panel.dataset.onboardingProviderSetup === provider;
        panel.hidden = !isActive;
        panel.classList.toggle("active", isActive);
    });
    onboardingProviderVisuals.forEach(visual => {
        const isActive = visual.dataset.onboardingProviderVisual === provider;
        visual.hidden = !isActive;
        visual.classList.toggle("active", isActive);
    });
    updateOnboardingOllamaStatus();
    updateOnboardingOpenAiStatus();
}

function saveOpenAiKeyFromOnboarding() {
    const key = (onboardingOpenAiApiKeyInput?.value || "").trim();
    if (!key) {
        showToast("Paste an OpenAI API key first.", "warning");
        updateOnboardingOpenAiStatus();
        return false;
    }
    safeLocalStorageSet(OPENAI_API_KEY_STORAGE_KEY, key);
    if (!safeLocalStorageGet(OPENAI_CHAT_MODEL_STORAGE_KEY)) {
        safeLocalStorageSet(OPENAI_CHAT_MODEL_STORAGE_KEY, DEFAULT_OPENAI_CHAT_MODEL);
    }
    if (!safeLocalStorageGet(OPENAI_IMAGE_MODEL_STORAGE_KEY)) {
        safeLocalStorageSet(OPENAI_IMAGE_MODEL_STORAGE_KEY, DEFAULT_OPENAI_IMAGE_MODEL);
    }
    if (!safeLocalStorageGet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY)) {
        safeLocalStorageSet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY, DEFAULT_OPENAI_TRANSCRIPTION_MODEL);
    }
    if (!safeLocalStorageGet(OPENAI_SPEECH_MODEL_STORAGE_KEY)) {
        safeLocalStorageSet(OPENAI_SPEECH_MODEL_STORAGE_KEY, DEFAULT_OPENAI_SPEECH_MODEL);
    }
    if (!safeLocalStorageGet(OPENAI_REALTIME_MODEL_STORAGE_KEY)) {
        safeLocalStorageSet(OPENAI_REALTIME_MODEL_STORAGE_KEY, DEFAULT_OPENAI_REALTIME_MODEL);
    }
    if (!safeLocalStorageGet(OPENAI_VOICE_STORAGE_KEY)) {
        safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, DEFAULT_OPENAI_VOICE);
    }
    setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
    updateProviderSettingsUi();
    updateOnboardingOpenAiStatus();
    showToast(hasWorkspaceBridgeAccess() ? "OpenAI key saved." : "OpenAI key saved. Enable the Local Workspace Bridge before testing.", hasWorkspaceBridgeAccess() ? "success" : "warning");
    return true;
}

function renderOnboarding() {
    const maxStep = Math.max(0, onboardingSlides.length - 1);
    activeOnboardingStep = Math.max(0, Math.min(maxStep, activeOnboardingStep));
    onboardingDialog?.classList.toggle("onboarding-direction-back", onboardingStepDirection === "back");
    onboardingDialog?.classList.toggle("onboarding-direction-next", onboardingStepDirection !== "back");
    onboardingSlides.forEach(slide => {
        const step = Number(slide.dataset.onboardingSlide);
        const isActive = step === activeOnboardingStep;
        slide.hidden = !isActive;
        slide.classList.toggle("active", isActive);
    });
    onboardingDots.forEach(dot => {
        const isActive = Number(dot.dataset.onboardingStep) === activeOnboardingStep;
        dot.classList.toggle("active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
    });
    if (onboardingStepLabel) {
        onboardingStepLabel.textContent = `Step ${activeOnboardingStep + 1} of ${maxStep + 1}`;
    }
    if (onboardingTitle) {
        onboardingTitle.textContent = activeOnboardingStep === 1
            ? (isOpenAiProvider() ? "Connect OpenAI" : "Connect Ollama")
            : ONBOARDING_STEP_TITLES[activeOnboardingStep] || "Fauna setup";
    }
    if (onboardingBackBtn) onboardingBackBtn.disabled = activeOnboardingStep === 0;
    if (onboardingNextBtn) onboardingNextBtn.hidden = activeOnboardingStep >= maxStep;
    if (onboardingFinishBtn) onboardingFinishBtn.hidden = activeOnboardingStep < maxStep;
    updateOnboardingProviderChoices();
    updateOnboardingProviderSetup();
}

function setOnboardingStep(step) {
    const requestedStep = Number(step) || 0;
    const maxStep = Math.max(0, onboardingSlides.length - 1);
    const nextStep = Math.max(0, Math.min(maxStep, requestedStep));
    onboardingStepDirection = nextStep < activeOnboardingStep ? "back" : "next";
    activeOnboardingStep = nextStep;
    renderOnboarding();
}

function openOnboardingModal({ force = false } = {}) {
    if (!onboardingModal || (!force && hasCompletedOnboarding())) return;
    onboardingReturnFocus = document.activeElement instanceof HTMLElement && !onboardingModal.contains(document.activeElement)
        ? document.activeElement
        : null;
    onboardingModal.hidden = false;
    onboardingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("onboarding-modal-open");
    setOnboardingStep(0);
    window.setTimeout(() => onboardingDialog?.focus?.(), 0);
}

function closeOnboardingModal({ complete = true, returnFocus = true } = {}) {
    if (!onboardingModal || onboardingModal.hidden) return;
    if (complete) markOnboardingComplete();
    onboardingModal.hidden = true;
    onboardingModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("onboarding-modal-open");
    if (returnFocus) {
        const focusTarget = onboardingReturnFocus && document.contains(onboardingReturnFocus)
            ? onboardingReturnFocus
            : input || settingsOpenBtn;
        focusTarget?.focus?.({ preventScroll: true });
    }
    onboardingReturnFocus = null;
}

function scheduleOnboardingPrompt() {
    if (hasCompletedOnboarding()) return;
    window.setTimeout(() => openOnboardingModal(), 1200);
}

async function handleOnboardingAction(action, button) {
    if (!action) return;
    if (button instanceof HTMLButtonElement) button.disabled = true;
    try {
        switch (action) {
            case "provider-local":
                setActiveAiProvider(AI_PROVIDER_LOCAL, { refreshStatus: false });
                showToast("Ollama selected.", "success");
                setOnboardingStep(1);
                break;
            case "provider-openai":
                setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
                showToast("OpenAI selected.", "info");
                setOnboardingStep(1);
                break;
            case "check-ollama":
                await checkOllamaStatus();
                showToast(isOllamaReachable ? "Ollama is reachable." : "Ollama is offline.", isOllamaReachable ? "success" : "warning");
                break;
            case "start-ollama":
                await startOllamaHttpService({ remember: true });
                break;
            case "install-models":
                await installMissingOllamaModels();
                break;
            case "save-openai-key":
                saveOpenAiKeyFromOnboarding();
                break;
            case "test-openai":
                if (!getOpenAiApiKey() && !saveOpenAiKeyFromOnboarding()) break;
                try {
                    await checkOpenAiStatus();
                    showToast("OpenAI API reachable.", "success");
                } catch (err) {
                    showToast(`OpenAI test failed: ${err.message}`, "error");
                }
                updateOnboardingOpenAiStatus();
                break;
            case "open-provider-settings":
                closeOnboardingModal({ complete: true, returnFocus: false });
                openSettingsModal();
                setSettingsPane("provider");
                break;
            case "enable-notifications":
                completionSoundEnabled = true;
                completionOnlyUnfocused = true;
                completionBackgroundOnly = true;
                completionNotificationsEnabled = true;
                saveCompletionNotificationSetting(COMPLETION_SOUND_ENABLED_STORAGE_KEY, true);
                saveCompletionNotificationSetting(COMPLETION_ONLY_UNFOCUSED_STORAGE_KEY, true);
                saveCompletionNotificationSetting(COMPLETION_BACKGROUND_ONLY_STORAGE_KEY, true);
                saveCompletionNotificationSetting(COMPLETION_NOTIFICATIONS_ENABLED_STORAGE_KEY, true);
                await requestCompletionNotificationPermission({ silent: false });
                renderNotificationSettings();
                showToast("Completion alerts enabled.", "success");
                break;
            case "open-task-models":
                closeOnboardingModal({ complete: true, returnFocus: false });
                openSettingsModal();
                setSettingsPane("task-models");
                break;
            case "open-library":
                closeOnboardingModal({ complete: true, returnFocus: false });
                setWorkspaceView(WORKSPACE_VIEW_LIBRARY, { closeSidebar: false, updateUrl: true });
                break;
            case "create-chat":
                closeOnboardingModal({ complete: true, returnFocus: false });
                startNewChatSession({ notify: false, urlMode: "replace" });
                break;
            default:
                break;
        }
    } finally {
        if (button instanceof HTMLButtonElement && isOnboardingOpen()) button.disabled = false;
        renderOnboarding();
    }
}

function normalizeCompletionSoundVolume(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0.55;
    return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function saveCompletionNotificationSetting(key, enabled) {
    safeLocalStorageSet(key, enabled ? "true" : "false");
}

function loadNotificationSettings() {
    completionNotificationsEnabled = readStoredBoolean(COMPLETION_NOTIFICATIONS_ENABLED_STORAGE_KEY, false);
    completionSoundEnabled = readStoredBoolean(COMPLETION_SOUND_ENABLED_STORAGE_KEY, false);
    completionOnlyUnfocused = readStoredBoolean(COMPLETION_ONLY_UNFOCUSED_STORAGE_KEY, true);
    completionBackgroundOnly = readStoredBoolean(COMPLETION_BACKGROUND_ONLY_STORAGE_KEY, true);
    completionSoundVolumeLevel = normalizeCompletionSoundVolume(safeLocalStorageGet(COMPLETION_SOUND_VOLUME_STORAGE_KEY) || "0.55");
}

function getNotificationPermissionState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission || "default";
}

function getNotificationPermissionUi(permission = getNotificationPermissionState()) {
    switch (permission) {
        case "granted":
            return { label: "Allowed", state: "configured", status: "System notifications are ready." };
        case "denied":
            return { label: "Blocked", state: "missing", status: "Notifications are blocked in system or browser settings." };
        case "unsupported":
            return { label: "Unsupported", state: "missing", status: "System notifications are not supported here." };
        default:
            return { label: "Not requested", state: "missing", status: "Allow notifications to show OS alerts." };
    }
}

function renderNotificationSettings() {
    const permission = getNotificationPermissionState();
    const permissionUi = getNotificationPermissionUi(permission);

    if (completionNotificationsToggle) {
        completionNotificationsToggle.checked = completionNotificationsEnabled;
        completionNotificationsToggle.disabled = permission === "unsupported";
    }
    if (completionSoundToggle) completionSoundToggle.checked = completionSoundEnabled;
    if (completionOnlyUnfocusedToggle) completionOnlyUnfocusedToggle.checked = completionOnlyUnfocused;
    if (completionBackgroundOnlyToggle) completionBackgroundOnlyToggle.checked = completionBackgroundOnly;
    if (completionSoundVolume) {
        completionSoundVolume.value = String(Math.round(completionSoundVolumeLevel * 100));
        completionSoundVolume.disabled = !completionSoundEnabled;
    }
    if (completionSoundVolumeValue) {
        completionSoundVolumeValue.textContent = `${Math.round(completionSoundVolumeLevel * 100)}%`;
    }
    if (notificationPermissionStatus) {
        notificationPermissionStatus.textContent = permissionUi.label;
        notificationPermissionStatus.dataset.state = permissionUi.state;
    }
    if (notificationSettingsStatus) {
        notificationSettingsStatus.textContent = permissionUi.status;
    }
    if (notificationPermissionBtn) {
        notificationPermissionBtn.disabled = permission === "granted" || permission === "unsupported";
        notificationPermissionBtn.textContent = permission === "granted" ? "Allowed" : "Allow notifications";
    }
}

async function requestCompletionNotificationPermission({ silent = false } = {}) {
    if (!("Notification" in window)) {
        if (!silent) showToast("System notifications are not supported here.", "warning");
        renderNotificationSettings();
        return "unsupported";
    }
    if (Notification.permission !== "default") {
        renderNotificationSettings();
        return Notification.permission;
    }
    let permission = "default";
    try {
        permission = await Notification.requestPermission();
    } catch {
        permission = Notification.permission || "default";
    }
    renderNotificationSettings();
    if (!silent) {
        if (permission === "granted") showToast("Notifications enabled.", "success");
        else if (permission === "denied") showToast("Notifications are blocked.", "warning");
    }
    return permission;
}

function isAppFocusedForNotificationAlerts() {
    return document.visibilityState === "visible" && document.hasFocus();
}

function shouldSendCompletionAlert(sessionId, { force = false } = {}) {
    if (force) return true;
    if (completionOnlyUnfocused && isAppFocusedForNotificationAlerts()) return false;
    if (completionBackgroundOnly && sessionId === activeSessionId) return false;
    return true;
}

async function playCompletionSound() {
    if (!completionSoundEnabled || completionSoundVolumeLevel <= 0) return false;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return false;
    try {
        const context = new AudioContextCtor();
        if (context.state === "suspended") await context.resume();
        const now = context.currentTime;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, completionSoundVolumeLevel * 0.18), now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
        gain.connect(context.destination);

        [660, 880].forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
            oscillator.connect(gain);
            oscillator.start(now + index * 0.08);
            oscillator.stop(now + 0.36);
        });

        window.setTimeout(() => {
            context.close?.().catch?.(() => {});
        }, 700);
        return true;
    } catch (err) {
        console.warn("Completion sound failed:", err);
        return false;
    }
}

function showCompletionSystemNotification(sessionId, { title = "", body = "" } = {}) {
    if (!completionNotificationsEnabled) return false;
    if (!("Notification" in window) || Notification.permission !== "granted") return false;
    const session = chatSessions.find(item => item.id === sessionId);
    const notificationTitle = title || "Fauna";
    const notificationBody = body || `${session?.title || "A chat"} finished generating.`;
    try {
        const notification = new Notification(notificationTitle, {
            body: notificationBody,
            tag: sessionId ? `fauna-chat-${sessionId}-complete` : "fauna-chat-complete",
            silent: true
        });
        notification.onclick = () => {
            window.focus?.();
            if (sessionId && typeof activateChatSession === "function") {
                activateChatSession(sessionId, { closeSidebar: false });
            }
            notification.close?.();
        };
        window.setTimeout(() => notification.close?.(), 9000);
        return true;
    } catch (err) {
        console.warn("Completion notification failed:", err);
        return false;
    }
}

function notifyChatGenerationCompleted(sessionId) {
    if (!shouldSendCompletionAlert(sessionId)) return;
    const session = chatSessions.find(item => item.id === sessionId);
    showCompletionSystemNotification(sessionId, {
        title: "Fauna",
        body: `${session?.title || "A chat"} is ready.`
    });
    void playCompletionSound();
}

async function testCompletionNotificationAlert() {
    if (!completionNotificationsEnabled && !completionSoundEnabled) {
        showToast("Enable sound or system notifications first.", "info");
        return;
    }
    if (completionNotificationsEnabled && getNotificationPermissionState() === "default") {
        await requestCompletionNotificationPermission({ silent: false });
    }
    const shown = showCompletionSystemNotification(activeSessionId || "", {
        title: "Fauna",
        body: "Notification test is ready."
    });
    const played = await playCompletionSound();
    if (!shown && !played) {
        showToast("No alert could be sent with the current settings.", "warning");
    } else {
        showToast("Test alert sent.", "success");
    }
}

function initializeNotificationSettings() {
    loadNotificationSettings();
    renderNotificationSettings();
}

function setAppInfoText(node, value, fallback = "Not set") {
    if (!node) return;
    const text = String(value || "").trim();
    node.textContent = text || fallback;
}

function getWebStoredFaunaKeys() {
    try {
        return Object.keys(localStorage)
            .filter(key => key.startsWith("fauna"))
            .sort();
    } catch {
        return [];
    }
}

function renderAppInfoStoredKeys(keys = []) {
    if (!appInfoStoredKeys) return;
    const normalized = Array.from(new Set(keys.map(key => String(key || "").trim()).filter(Boolean))).sort();
    if (normalized.length === 0) {
        appInfoStoredKeys.textContent = "No stored settings yet.";
        return;
    }
    appInfoStoredKeys.replaceChildren(...normalized.map(key => {
        const chip = document.createElement("span");
        chip.className = "app-info-key-chip";
        chip.textContent = key;
        return chip;
    }));
}

function getUpdateBadgeState(status = "") {
    return ["current", "idle", "downloaded"].includes(status) ? "configured" : "missing";
}

async function getAppInfoUpdateState(info = {}) {
    const desktopUpdates = getFaunaDesktopApi()?.updates;
    if (desktopUpdates?.getState) {
        return desktopUpdates.getState().catch(() => info.updateState || null);
    }
    return info.updateState || {
        status: "web",
        message: "version.json"
    };
}

async function updateAppInfoPane() {
    const desktopApi = getFaunaDesktopApi();
    let info = null;
    if (desktopApi?.getInfo) {
        try {
            info = await desktopApi.getInfo();
        } catch (err) {
            console.warn("Could not read desktop app info:", err);
        }
    }

    const updateStateInfo = await getAppInfoUpdateState(info || {});
    const isDesktop = Boolean(desktopApi && info);
    const storageBackend = isDesktop
        ? info.storageBackend || "AppData"
        : "Browser localStorage";

    setAppInfoText(appInfoVersion, info?.version || FAUNA_APP_VERSION, FAUNA_APP_VERSION);
    setAppInfoText(appInfoStorageBackend, storageBackend);
    setAppInfoText(appInfoChatCount, Number.isFinite(Number(info?.chatCount)) ? `${Number(info.chatCount).toLocaleString()} chats` : `${chatSessions.length.toLocaleString()} chats`, "0 chats");
    setAppInfoText(appInfoBridgeEndpoint, info?.bridgeEndpoint || getWorkspaceBridgeBaseUrl(), "Not set");
    setAppInfoText(appInfoWorkspaceAccessPolicy, getWorkspaceAccessPolicyLabel(info?.workspaceAccessPolicy || getEffectiveWorkspaceAccessPolicy()), "Output only");
    setAppInfoText(appInfoAppDataPath, info?.appDataPath, isDesktop ? "AppData path unavailable" : "Browser localStorage");
    setAppInfoText(appInfoSettingsPath, info?.settingsPath, isDesktop ? "settings.json" : "localStorage");
    setAppInfoText(appInfoChatsPath, info?.chatsPath, isDesktop ? "chats/<chatId>/chat.json" : "localStorage");
    setAppInfoText(appInfoMediaPath, info?.mediaPath, isDesktop ? "chats/<chatId>/media" : "Browser blob/data URLs");
    setAppInfoText(appInfoOutputPath, info?.outputPath, isDesktop ? "chats/<chatId>/output" : "Browser localStorage");

    if (appInfoUpdateStatus) {
        const status = String(updateStateInfo?.status || "").trim();
        appInfoUpdateStatus.textContent = updateStateInfo?.message || "Update status unavailable";
        appInfoUpdateStatus.dataset.state = getUpdateBadgeState(status);
    }

    const desktopKeys = Array.isArray(info?.settingsKeys) ? info.settingsKeys : null;
    const keys = desktopKeys
        ? [...desktopKeys, "faunaChatSessions -> chats/<chatId>/chat.json"]
        : getWebStoredFaunaKeys();
    renderAppInfoStoredKeys(keys);
}

function toggleAppInfoSection(toggle) {
    const section = toggle?.closest("[data-app-info-section]");
    const bodyId = toggle?.getAttribute("aria-controls") || "";
    const body = bodyId ? document.getElementById(bodyId) : section?.querySelector(".app-info-section-body");
    if (!section || !body) return;

    const willExpand = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(willExpand));
    section.classList.toggle("is-collapsed", !willExpand);
    body.hidden = !willExpand;
}

function getAppCacheStorageKeys() {
    return [
        OPENAI_SPEECH_CACHE_STORAGE_KEY,
        OPENAI_VOICE_PREVIEW_CACHE_STORAGE_KEY,
        OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY,
        OPENAI_FILE_CACHE_STORAGE_KEY,
        OPENAI_MODEL_CATALOG_STORAGE_KEY,
        OPENROUTER_MODEL_CAPABILITIES_STORAGE_KEY
    ].filter(Boolean);
}

function clearWebCacheStorageKeys() {
    let removed = 0;
    getAppCacheStorageKeys().forEach(key => {
        if (safeLocalStorageGet(key) !== null) removed += 1;
        safeLocalStorageRemove(key);
    });
    openAiFileCache = [];
    cachedOpenAiCatalogModels = [];
    ollamaModelCapabilities.clear?.();
    return removed;
}

async function clearBrowserCacheStorage() {
    if (!window.caches?.keys) return 0;
    const keys = await window.caches.keys().catch(() => []);
    let removed = 0;
    for (const key of keys) {
        if (/fauna|openai|voice|speech|image|media|model/i.test(key)) {
            if (await window.caches.delete(key).catch(() => false)) removed += 1;
        }
    }
    return removed;
}

function removeVoiceRecordingPlayersFromHtml(html = "") {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    template.content.querySelectorAll(".voice-recording-player").forEach(player => player.remove());
    return template.innerHTML;
}

function stripVoiceRecordingsFromLocalChatState() {
    let updatedMessages = 0;
    let removedPlayers = 0;
    conversationHistory.forEach(message => {
        if (message?.voiceRecording) {
            delete message.voiceRecording;
            updatedMessages += 1;
        }
    });
    chatSessions.forEach(session => {
        if (Array.isArray(session.conversationHistory)) {
            session.conversationHistory.forEach(message => {
                if (message?.voiceRecording) {
                    delete message.voiceRecording;
                    updatedMessages += 1;
                }
            });
        }
        if (typeof session.chatHtml === "string" && session.chatHtml.includes("voice-recording-player")) {
            const cleanedHtml = removeVoiceRecordingPlayersFromHtml(session.chatHtml);
            if (cleanedHtml !== session.chatHtml) {
                session.chatHtml = cleanedHtml;
                removedPlayers += 1;
            }
        }
        if (Array.isArray(session.domNodes)) {
            session.domNodes.forEach(node => {
                node?.querySelectorAll?.(".voice-recording-player").forEach(player => {
                    player.remove();
                    removedPlayers += 1;
                });
            });
        }
    });
    chat?.querySelectorAll(".voice-recording-player").forEach(player => {
        player.remove();
        removedPlayers += 1;
    });
    if (updatedMessages > 0 || removedPlayers > 0) {
        persistChatSessions();
    }
    return updatedMessages + removedPlayers;
}

async function clearAppCacheFromSettings() {
    const approved = await showApprovalDialog({
        title: "Clear app cache?",
        message: "This deletes temporary voice clips, speech clips, cached transcriptions, uploaded-file cache entries, model metadata, and local app cache files.",
        details: [
            "Chats and generated images/artifacts stay unless they are temporary voice or speech cache files.",
            "Models, API keys, settings, and memories are not reset.",
            "Voice recording players that point to deleted temporary clips will be removed from saved chats."
        ],
        confirmLabel: "Clear cache"
    });
    if (!approved) return;

    if (appCacheClearBtn) appCacheClearBtn.disabled = true;
    try {
        stopAssistantTtsPlayback?.();
        clearVoicePreviewAudio?.();
        const desktopResult = await getFaunaDesktopApi()?.clearAppCache?.();
        const removedStorageKeys = clearWebCacheStorageKeys();
        const removedBrowserCaches = await clearBrowserCacheStorage();
        const strippedRecordings = stripVoiceRecordingsFromLocalChatState();
        await updateAppInfoPane();
        const removedFiles = Number(desktopResult?.removedTemporaryFiles || 0);
        const removedDirs = Number(desktopResult?.removedCacheDirectories || 0);
        const summary = [
            removedFiles ? `${removedFiles} temporary files` : "",
            removedDirs ? `${removedDirs} cache folders` : "",
            removedStorageKeys ? `${removedStorageKeys} cache keys` : "",
            removedBrowserCaches ? `${removedBrowserCaches} browser caches` : "",
            strippedRecordings ? `${strippedRecordings} voice references` : ""
        ].filter(Boolean).join(", ");
        showToast(summary ? `Cache cleared: ${summary}.` : "Cache cleared.", "success");
    } catch (err) {
        showToast(`Cache cleanup failed: ${err.message}`, "error");
    } finally {
        if (appCacheClearBtn) appCacheClearBtn.disabled = false;
    }
}

function showResetAppDialog() {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "approval-modal";
        overlay.setAttribute("role", "presentation");

        const dialog = document.createElement("section");
        dialog.className = "approval-dialog app-reset-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "resetAppDialogTitle");

        const titleNode = document.createElement("h2");
        titleNode.id = "resetAppDialogTitle";
        titleNode.textContent = "Reset Fauna?";

        const messageNode = document.createElement("p");
        messageNode.textContent = "This resets the whole app on this device. It cannot be undone.";

        const details = document.createElement("ul");
        details.className = "approval-detail-list";
        [
            "Deletes local settings, provider choices, caches, memories, shortcuts, and workspace bridge configuration.",
            "Deletes local chats and generated media/artifact folders from AppData.",
            "The app reloads into a fresh state after reset."
        ].forEach(text => {
            const item = document.createElement("li");
            item.textContent = text;
            details.appendChild(item);
        });

        const filesOption = createMandatoryResetCheckbox("I understand files, images, generated media, artifacts, and voice clips will be deleted.");
        const chatsOption = createMandatoryResetCheckbox("I understand all chats and chat history will be deleted.");

        const actions = document.createElement("div");
        actions.className = "approval-actions";

        const cancelButton = document.createElement("button");
        cancelButton.className = "provider-btn provider-btn-secondary";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        const confirmButton = document.createElement("button");
        confirmButton.className = "provider-btn provider-btn-danger";
        confirmButton.type = "button";
        confirmButton.textContent = "Reset app";
        confirmButton.disabled = true;

        const updateConfirmState = () => {
            confirmButton.disabled = !(filesOption.input.checked && chatsOption.input.checked);
        };

        const close = (approved) => {
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            resolve({
                approved,
                confirmFiles: approved && filesOption.input.checked,
                confirmChats: approved && chatsOption.input.checked
            });
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") close(false);
        };

        filesOption.input.addEventListener("change", updateConfirmState);
        chatsOption.input.addEventListener("change", updateConfirmState);
        cancelButton.addEventListener("click", () => close(false));
        confirmButton.addEventListener("click", () => {
            if (!confirmButton.disabled) close(true);
        });
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close(false);
        });
        document.addEventListener("keydown", onKeyDown);

        actions.append(cancelButton, confirmButton);
        dialog.append(titleNode, messageNode, details, filesOption.label, chatsOption.label, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        window.setTimeout(() => cancelButton.focus(), 0);
    });
}

function createMandatoryResetCheckbox(text) {
    const label = document.createElement("label");
    label.className = "approval-checkbox-option approval-checkbox-required";
    const input = document.createElement("input");
    input.type = "checkbox";
    const span = document.createElement("span");
    span.textContent = text;
    label.append(input, span);
    return { label, input };
}

function clearAllWebFaunaStorage() {
    try {
        Object.keys(localStorage)
            .filter(key => key.startsWith("fauna"))
            .forEach(key => localStorage.removeItem(key));
    } catch {
        getAppCacheStorageKeys().forEach(key => safeLocalStorageRemove(key));
        safeLocalStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
        safeLocalStorageRemove(ACTIVE_CHAT_SESSION_STORAGE_KEY);
    }
}

async function resetAppFromSettings() {
    const approval = await showResetAppDialog();
    if (!approval.approved || !approval.confirmFiles || !approval.confirmChats) return;

    if (appResetBtn) appResetBtn.disabled = true;
    try {
        stopAssistantTtsPlayback?.();
        clearVoicePreviewAudio?.();
        await getFaunaDesktopApi()?.resetAppData?.({
            confirmFiles: true,
            confirmChats: true
        });
        clearAllWebFaunaStorage();
        await clearBrowserCacheStorage();
        showToast("Fauna reset complete. Reloading...", "success");
        window.setTimeout(() => window.location.reload(), 650);
    } catch (err) {
        showToast(`Reset failed: ${err.message}`, "error");
        if (appResetBtn) appResetBtn.disabled = false;
    }
}

let cachedKeyboardShortcutOverrides = null;
let shortcutRecorderActionId = "";
let shortcutRecorderDraft = null;
let shortcutRecorderReturnFocus = null;

function getShortcutAction(actionId) {
    return KEYBOARD_SHORTCUT_ACTIONS.find(action => action.id === actionId) || null;
}

function normalizeShortcutKey(key = "") {
    const value = String(key || "").trim();
    if (!value) return "";
    if (value === " ") return "Space";
    if (value.length === 1 && /[a-z]/i.test(value)) return value.toUpperCase();
    const aliases = {
        Esc: "Escape",
        Del: "Delete",
        " ": "Space",
        ArrowLeft: "Left",
        ArrowRight: "Right",
        ArrowUp: "Up",
        ArrowDown: "Down"
    };
    return aliases[value] || value;
}

function parseShortcutString(value = "") {
    const parts = String(value || "").split("+").map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const shortcut = { ctrl: false, alt: false, shift: false, meta: false, key: "" };
    parts.forEach(part => {
        const lower = part.toLowerCase();
        if (lower === "ctrl" || lower === "control") shortcut.ctrl = true;
        else if (lower === "alt" || lower === "option") shortcut.alt = true;
        else if (lower === "shift") shortcut.shift = true;
        else if (lower === "meta" || lower === "cmd" || lower === "command" || lower === "win" || lower === "windows") shortcut.meta = true;
        else shortcut.key = normalizeShortcutKey(part);
    });
    return shortcut.key ? shortcut : null;
}

function normalizeShortcutValue(value) {
    if (value === null) return null;
    if (typeof value === "string") return parseShortcutString(value);
    if (!value || typeof value !== "object") return null;
    const shortcut = {
        ctrl: Boolean(value.ctrl),
        alt: Boolean(value.alt),
        shift: Boolean(value.shift),
        meta: Boolean(value.meta),
        key: normalizeShortcutKey(value.key)
    };
    return shortcut.key || shortcut.ctrl || shortcut.alt || shortcut.shift || shortcut.meta ? shortcut : null;
}

function isAllowedSingleKeyShortcut(shortcut) {
    return normalizeShortcutKey(shortcut?.key).toLowerCase() === "enter";
}

function isValidShortcut(shortcut) {
    return Boolean(
        shortcut?.key
        && (
            shortcut.ctrl
            || shortcut.alt
            || shortcut.shift
            || shortcut.meta
            || isAllowedSingleKeyShortcut(shortcut)
        )
    );
}

function shortcutFromEvent(event) {
    const modifierKeys = new Set(["Control", "Shift", "Alt", "Meta"]);
    const key = modifierKeys.has(event.key) ? "" : normalizeShortcutKey(event.key);
    return {
        ctrl: Boolean(event.ctrlKey || event.key === "Control"),
        alt: Boolean(event.altKey || event.key === "Alt"),
        shift: Boolean(event.shiftKey || event.key === "Shift"),
        meta: Boolean(event.metaKey || event.key === "Meta"),
        key
    };
}

function shortcutsEqual(a, b) {
    return Boolean(a && b)
        && Boolean(a.ctrl) === Boolean(b.ctrl)
        && Boolean(a.alt) === Boolean(b.alt)
        && Boolean(a.shift) === Boolean(b.shift)
        && Boolean(a.meta) === Boolean(b.meta)
        && normalizeShortcutKey(a.key).toLowerCase() === normalizeShortcutKey(b.key).toLowerCase();
}

function getMetaKeyLabel() {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "") ? "Cmd" : "Win";
}

function getShortcutParts(shortcut) {
    if (!shortcut) return [];
    return [
        shortcut.ctrl ? "Ctrl" : "",
        shortcut.alt ? "Alt" : "",
        shortcut.shift ? "Shift" : "",
        shortcut.meta ? getMetaKeyLabel() : "",
        shortcut.key || ""
    ].filter(Boolean);
}

function formatShortcutText(shortcut) {
    const parts = getShortcutParts(shortcut);
    return parts.length > 0 ? parts.join(" ") : "Not assigned";
}

function serializeShortcut(shortcut) {
    if (!shortcut) return null;
    return {
        ctrl: Boolean(shortcut.ctrl),
        alt: Boolean(shortcut.alt),
        shift: Boolean(shortcut.shift),
        meta: Boolean(shortcut.meta),
        key: normalizeShortcutKey(shortcut.key)
    };
}

function readKeyboardShortcutOverrides() {
    if (cachedKeyboardShortcutOverrides) return cachedKeyboardShortcutOverrides;
    const raw = safeLocalStorageGet(KEYBOARD_SHORTCUTS_STORAGE_KEY);
    let parsed = {};
    try {
        parsed = raw ? JSON.parse(raw) : {};
    } catch {
        parsed = {};
    }
    cachedKeyboardShortcutOverrides = parsed && typeof parsed === "object" ? parsed : {};
    return cachedKeyboardShortcutOverrides;
}

function writeKeyboardShortcutOverrides(overrides) {
    cachedKeyboardShortcutOverrides = overrides && typeof overrides === "object" ? overrides : {};
    safeLocalStorageSet(KEYBOARD_SHORTCUTS_STORAGE_KEY, JSON.stringify(cachedKeyboardShortcutOverrides));
    renderKeyboardShortcutSettings();
    updateShortcutBadges();
}

function resetKeyboardShortcutOverrides() {
    cachedKeyboardShortcutOverrides = {};
    safeLocalStorageRemove(KEYBOARD_SHORTCUTS_STORAGE_KEY);
    renderKeyboardShortcutSettings();
    updateShortcutBadges();
}

function getEffectiveKeyboardShortcuts() {
    const overrides = readKeyboardShortcutOverrides();
    const shortcuts = {};
    KEYBOARD_SHORTCUT_ACTIONS.forEach(action => {
        const hasOverride = Object.prototype.hasOwnProperty.call(overrides, action.id);
        shortcuts[action.id] = hasOverride
            ? normalizeShortcutValue(overrides[action.id])
            : parseShortcutString(action.defaultShortcut);
    });
    return shortcuts;
}

function getShortcutConflict(actionId, shortcut) {
    if (!isValidShortcut(shortcut)) return null;
    const shortcuts = getEffectiveKeyboardShortcuts();
    return KEYBOARD_SHORTCUT_ACTIONS.find(action => (
        action.id !== actionId
        && shortcutsEqual(shortcuts[action.id], shortcut)
    )) || null;
}

function setKeyboardShortcut(actionId, shortcut) {
    const action = getShortcutAction(actionId);
    if (!action) return;
    const overrides = { ...readKeyboardShortcutOverrides() };
    const defaultShortcut = parseShortcutString(action.defaultShortcut);
    if (shortcut === null) {
        overrides[actionId] = null;
    } else if (shortcutsEqual(shortcut, defaultShortcut)) {
        delete overrides[actionId];
    } else {
        overrides[actionId] = serializeShortcut(shortcut);
    }
    writeKeyboardShortcutOverrides(overrides);
}

function resetKeyboardShortcut(actionId) {
    const overrides = { ...readKeyboardShortcutOverrides() };
    delete overrides[actionId];
    writeKeyboardShortcutOverrides(overrides);
}

function renderShortcutKeyCaps(target, shortcut, { emptyText = "Not assigned" } = {}) {
    if (!target) return;
    const parts = getShortcutParts(shortcut);
    if (parts.length === 0) {
        target.innerHTML = "";
        const empty = document.createElement("span");
        empty.className = "shortcut-recorder-empty";
        empty.textContent = emptyText;
        target.appendChild(empty);
        return;
    }
    target.replaceChildren(...parts.map(part => {
        const key = document.createElement("span");
        key.className = "shortcut-keycap";
        key.textContent = part;
        return key;
    }));
}

function createShortcutPreview(shortcut) {
    const preview = document.createElement("span");
    preview.className = "shortcut-preview";
    renderShortcutKeyCaps(preview, shortcut);
    return preview;
}

function renderKeyboardShortcutSettings() {
    if (!keyboardShortcutList) return;
    const shortcuts = getEffectiveKeyboardShortcuts();
    const overrides = readKeyboardShortcutOverrides();
    keyboardShortcutList.replaceChildren(...KEYBOARD_SHORTCUT_ACTIONS.map(action => {
        const hasCustomShortcut = Object.prototype.hasOwnProperty.call(overrides, action.id);
        const row = document.createElement("div");
        row.className = "shortcut-settings-row";
        row.classList.toggle("shortcut-settings-row-custom", hasCustomShortcut);

        const info = document.createElement("div");
        info.className = "shortcut-settings-info";
        const title = document.createElement("span");
        title.className = "setting-title";
        title.textContent = action.title;
        const desc = document.createElement("span");
        desc.className = "setting-desc";
        desc.textContent = action.description;
        info.append(title, desc);

        const controls = document.createElement("div");
        controls.className = "shortcut-settings-controls";
        controls.appendChild(createShortcutPreview(shortcuts[action.id]));

        const changeBtn = document.createElement("button");
        changeBtn.className = "provider-btn provider-btn-secondary shortcut-change-btn";
        changeBtn.type = "button";
        changeBtn.textContent = "Change";
        changeBtn.addEventListener("click", () => openShortcutRecorder(action.id, changeBtn));

        const resetBtn = document.createElement("button");
        resetBtn.className = `provider-btn ${hasCustomShortcut ? "provider-btn-secondary" : "provider-btn-ghost"} shortcut-reset-row-btn`;
        resetBtn.type = "button";
        resetBtn.textContent = "Reset";
        resetBtn.disabled = !hasCustomShortcut;
        resetBtn.setAttribute("aria-disabled", String(!hasCustomShortcut));
        resetBtn.dataset.tooltip = hasCustomShortcut ? "Reset to default" : "Already using default";
        resetBtn.addEventListener("click", () => {
            if (!hasCustomShortcut) return;
            resetKeyboardShortcut(action.id);
            showToast(`${action.title} reset to default.`, "info");
        });

        controls.append(changeBtn, resetBtn);
        row.append(info, controls);
        return row;
    }));
}

function updateShortcutBadges() {
    const sendShortcut = getEffectiveKeyboardShortcuts().sendPrompt;
    if (!sendShortcutBadge) return;
    sendShortcutBadge.hidden = !sendShortcut;
    sendShortcutBadge.textContent = formatShortcutText(sendShortcut);
}

function updateShortcutRecorderUi() {
    const action = getShortcutAction(shortcutRecorderActionId);
    if (!action) return;
    if (shortcutRecorderTitle) shortcutRecorderTitle.textContent = action.title;
    if (shortcutRecorderSubtitle) shortcutRecorderSubtitle.textContent = "Press keys to assign this shortcut.";
    renderShortcutKeyCaps(shortcutRecorderKeyCaps, shortcutRecorderDraft, { emptyText: "Press keys" });

    const isValid = isValidShortcut(shortcutRecorderDraft);
    const conflict = getShortcutConflict(action.id, shortcutRecorderDraft);
    if (shortcutRecorderHint) {
        shortcutRecorderHint.textContent = !shortcutRecorderDraft?.key
            ? "Use Ctrl, Alt, Shift, or Win/Cmd with another key. Enter can be used alone."
            : !isValid
                ? "Add Ctrl, Alt, Shift, or Win/Cmd, or press Enter by itself."
                : conflict
                    ? `Already used by ${conflict.title}.`
                    : "Ready to save.";
        shortcutRecorderHint.dataset.state = conflict ? "error" : isValid ? "ready" : "idle";
    }
    if (shortcutRecorderSaveBtn) shortcutRecorderSaveBtn.disabled = !isValid || Boolean(conflict);
}

function pulseShortcutRecorderKeys() {
    if (!shortcutRecorderKeyCaps) return;
    shortcutRecorderKeyCaps.classList.remove("shortcut-recorder-pop");
    void shortcutRecorderKeyCaps.offsetWidth;
    shortcutRecorderKeyCaps.classList.add("shortcut-recorder-pop");
}

function openShortcutRecorder(actionId, returnFocus = null) {
    const action = getShortcutAction(actionId);
    if (!shortcutRecorderModal || !action) return;
    shortcutRecorderActionId = actionId;
    shortcutRecorderDraft = getEffectiveKeyboardShortcuts()[actionId];
    shortcutRecorderReturnFocus = returnFocus instanceof HTMLElement
        ? returnFocus
        : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    updateShortcutRecorderUi();
    shortcutRecorderModal.hidden = false;
    shortcutRecorderModal.setAttribute("aria-hidden", "false");
    window.setTimeout(() => shortcutRecorderModal.querySelector(".shortcut-recorder-dialog")?.focus?.({ preventScroll: true }), 0);
}

function closeShortcutRecorder({ returnFocus = true } = {}) {
    if (!shortcutRecorderModal || shortcutRecorderModal.hidden) return;
    shortcutRecorderModal.hidden = true;
    shortcutRecorderModal.setAttribute("aria-hidden", "true");
    shortcutRecorderActionId = "";
    shortcutRecorderDraft = null;
    if (returnFocus && shortcutRecorderReturnFocus && document.contains(shortcutRecorderReturnFocus)) {
        shortcutRecorderReturnFocus.focus({ preventScroll: true });
    }
    shortcutRecorderReturnFocus = null;
}

function saveShortcutRecorderDraft() {
    if (!shortcutRecorderActionId || !isValidShortcut(shortcutRecorderDraft)) return;
    const action = getShortcutAction(shortcutRecorderActionId);
    const conflict = getShortcutConflict(shortcutRecorderActionId, shortcutRecorderDraft);
    if (!action || conflict) {
        if (conflict) showToast(`${formatShortcutText(shortcutRecorderDraft)} is already used by ${conflict.title}.`, "warning");
        return;
    }
    setKeyboardShortcut(shortcutRecorderActionId, shortcutRecorderDraft);
    showToast(`${action.title} shortcut saved.`, "success");
    closeShortcutRecorder();
}

function clearShortcutRecorderShortcut() {
    const action = getShortcutAction(shortcutRecorderActionId);
    if (!action) return;
    setKeyboardShortcut(shortcutRecorderActionId, null);
    showToast(`${action.title} shortcut cleared.`, "info");
    closeShortcutRecorder();
}

function resetShortcutRecorderShortcut() {
    const action = getShortcutAction(shortcutRecorderActionId);
    if (!action) return;
    resetKeyboardShortcut(shortcutRecorderActionId);
    showToast(`${action.title} reset to default.`, "info");
    closeShortcutRecorder();
}

function isShortcutRecorderOpen() {
    return Boolean(shortcutRecorderModal && !shortcutRecorderModal.hidden);
}

function isKeyboardShortcutEvent(event, actionId) {
    const shortcut = getEffectiveKeyboardShortcuts()[actionId];
    return Boolean(shortcut && shortcutsEqual(shortcutFromEvent(event), shortcut));
}

function getKeyboardShortcutActionForEvent(event) {
    const eventShortcut = shortcutFromEvent(event);
    if (!isValidShortcut(eventShortcut)) return null;
    const shortcuts = getEffectiveKeyboardShortcuts();
    return KEYBOARD_SHORTCUT_ACTIONS.find(action => shortcutsEqual(shortcuts[action.id], eventShortcut)) || null;
}

function isEditableShortcutTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return target.isContentEditable || ["input", "textarea", "select"].includes(tagName);
}

function hasBlockingShortcutModalOpen() {
    return Boolean(
        (settingsModal && !settingsModal.hidden)
        || (openAiCatalogModal && !openAiCatalogModal.hidden)
        || (onboardingModal && !onboardingModal.hidden)
        || (libraryPickerModal && !libraryPickerModal.hidden)
        || (document.getElementById("codeWorkbenchOverlay") && !document.getElementById("codeWorkbenchOverlay").hidden)
        || (document.getElementById("imageLightbox") && !document.getElementById("imageLightbox").hidden)
    );
}

function toggleSidebarFromShortcut() {
    const sidebar = document.getElementById("sidebar");
    if (window.matchMedia?.("(max-width: 768px)")?.matches) {
        if (sidebar?.classList.contains("open")) sidebarController.close();
        else sidebarController.open();
        return;
    }
    sidebarController.toggleCollapsed();
}

function executeKeyboardShortcutAction(actionId) {
    switch (actionId) {
        case "sendPrompt":
            if (!isGenerating) void processWorkspaceEntry();
            return true;
        case "focusPrompt":
            setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl: true, urlMode: "replace" });
            return true;
        case "newChat":
            startNewChatSession({ notify: true, urlMode: "replace" });
            return true;
        case "openSettings":
            openSettingsModal();
            return true;
        case "toggleSidebar":
            toggleSidebarFromShortcut();
            return true;
        case "openLibrary":
            setWorkspaceView(WORKSPACE_VIEW_LIBRARY, { closeSidebar: false, updateUrl: true });
            return true;
        case "openChat":
            setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: false, closeSidebar: false, updateUrl: true });
            return true;
        case "toggleTools":
            toolsBtn?.click();
            return true;
        case "toggleVoice":
            voiceButton?.click();
            return true;
        case "checkUpdates":
            void checkFaunaAppUpdate({ manual: true });
            return true;
        default:
            return false;
    }
}

function handleGlobalKeyboardShortcut(event) {
    if (event.defaultPrevented || isShortcutRecorderOpen()) return;
    const action = getKeyboardShortcutActionForEvent(event);
    if (!action) return;
    if (hasBlockingShortcutModalOpen()) return;
    if (isEditableShortcutTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    executeKeyboardShortcutAction(action.id);
}

function handleShortcutRecorderKeydown(event) {
    if (!isShortcutRecorderOpen()) return;
    if (event.key === "Tab") return;
    if (event.key === "Escape") {
        event.preventDefault();
        closeShortcutRecorder();
        return;
    }
    if (event.repeat) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    const nextShortcut = shortcutFromEvent(event);
    if (!nextShortcut.key && !(nextShortcut.ctrl || nextShortcut.alt || nextShortcut.shift || nextShortcut.meta)) return;
    event.preventDefault();
    event.stopPropagation();
    shortcutRecorderDraft = nextShortcut;
    updateShortcutRecorderUi();
    pulseShortcutRecorderKeys();
}

[settingsOpenBtn, mobileSettingsOpenBtn].forEach(button => {
    button?.addEventListener("click", () => openSettingsModal());
});

settingsNavButtons.forEach(button => {
    button.addEventListener("click", () => setSettingsPane(button.dataset.settingsPane));
});

settingsModal?.addEventListener("click", event => {
    const usageTab = event.target.closest("[data-usage-view]");
    if (!usageTab) return;
    activeUsageView = usageTab.dataset.usageView || "daily";
    settingsModal.querySelectorAll("[data-usage-view]").forEach(button => {
        const isActive = button === usageTab;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    renderUsageSettingsPane();
});

settingsModal?.addEventListener("click", event => {
    const appInfoToggle = event.target.closest("[data-app-info-toggle]");
    if (!appInfoToggle) return;
    event.preventDefault();
    toggleAppInfoSection(appInfoToggle);
});

settingsModal?.addEventListener("click", event => {
    if (event.target.closest("[data-settings-close]")) {
        closeSettingsModal();
    }
});

keyboardShortcutsResetBtn?.addEventListener("click", () => {
    resetKeyboardShortcutOverrides();
    showToast("Keyboard shortcuts reset to defaults.", "info");
});

appCacheClearBtn?.addEventListener("click", () => {
    void clearAppCacheFromSettings();
});

appResetBtn?.addEventListener("click", () => {
    void resetAppFromSettings();
});

appInfoOnboardingBtn?.addEventListener("click", () => {
    openOnboardingModal({ force: true });
});

localModelsAutoStartToggle?.addEventListener("change", event => {
    setOllamaAutoStartEnabled(Boolean(event.target.checked), { notify: true });
});

completionNotificationsToggle?.addEventListener("change", event => {
    completionNotificationsEnabled = Boolean(event.target.checked);
    saveCompletionNotificationSetting(COMPLETION_NOTIFICATIONS_ENABLED_STORAGE_KEY, completionNotificationsEnabled);
    if (completionNotificationsEnabled && getNotificationPermissionState() === "default") {
        void requestCompletionNotificationPermission({ silent: false });
    }
    renderNotificationSettings();
});

completionSoundToggle?.addEventListener("change", event => {
    completionSoundEnabled = Boolean(event.target.checked);
    saveCompletionNotificationSetting(COMPLETION_SOUND_ENABLED_STORAGE_KEY, completionSoundEnabled);
    renderNotificationSettings();
});

completionOnlyUnfocusedToggle?.addEventListener("change", event => {
    completionOnlyUnfocused = Boolean(event.target.checked);
    saveCompletionNotificationSetting(COMPLETION_ONLY_UNFOCUSED_STORAGE_KEY, completionOnlyUnfocused);
    renderNotificationSettings();
});

completionBackgroundOnlyToggle?.addEventListener("change", event => {
    completionBackgroundOnly = Boolean(event.target.checked);
    saveCompletionNotificationSetting(COMPLETION_BACKGROUND_ONLY_STORAGE_KEY, completionBackgroundOnly);
    renderNotificationSettings();
});

completionSoundVolume?.addEventListener("input", event => {
    completionSoundVolumeLevel = normalizeCompletionSoundVolume(event.target.value);
    safeLocalStorageSet(COMPLETION_SOUND_VOLUME_STORAGE_KEY, String(completionSoundVolumeLevel));
    renderNotificationSettings();
});

notificationPermissionBtn?.addEventListener("click", () => {
    void requestCompletionNotificationPermission({ silent: false });
});

notificationTestBtn?.addEventListener("click", () => {
    void testCompletionNotificationAlert();
});

shortcutRecorderModal?.addEventListener("click", event => {
    if (event.target.closest("[data-shortcut-recorder-close]")) {
        closeShortcutRecorder();
    }
});

shortcutRecorderSaveBtn?.addEventListener("click", saveShortcutRecorderDraft);
shortcutRecorderClearBtn?.addEventListener("click", clearShortcutRecorderShortcut);
shortcutRecorderResetBtn?.addEventListener("click", resetShortcutRecorderShortcut);

onboardingModal?.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("[data-onboarding-close]")) {
        closeOnboardingModal({ complete: true });
        return;
    }
    const stepButton = target.closest("[data-onboarding-step]");
    if (stepButton) {
        setOnboardingStep(Number(stepButton.dataset.onboardingStep));
        return;
    }
    const actionButton = target.closest("[data-onboarding-action]");
    if (actionButton) {
        void handleOnboardingAction(actionButton.dataset.onboardingAction, actionButton);
    }
});

onboardingBackBtn?.addEventListener("click", () => setOnboardingStep(activeOnboardingStep - 1));
onboardingNextBtn?.addEventListener("click", () => setOnboardingStep(activeOnboardingStep + 1));
onboardingFinishBtn?.addEventListener("click", () => closeOnboardingModal({ complete: true }));
onboardingSkipBtn?.addEventListener("click", () => closeOnboardingModal({ complete: true }));
onboardingOpenAiApiKeyInput?.addEventListener("input", updateOnboardingOpenAiStatus);

document.addEventListener("keydown", handleShortcutRecorderKeydown, true);
document.addEventListener("keydown", handleGlobalKeyboardShortcut);
updateShortcutBadges();
renderKeyboardShortcutSettings();
initializeNotificationSettings();
renderOllamaAutoStartSetting();

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (isShortcutRecorderOpen()) {
            closeShortcutRecorder();
            return;
        }
        if (isOnboardingOpen()) {
            closeOnboardingModal({ complete: true });
            return;
        }
        if (openAiCatalogModal && !openAiCatalogModal.hidden) {
            if (openAiCatalogFiltersMenu && !openAiCatalogFiltersMenu.hidden) {
                closeOpenAiCatalogFilters();
                return;
            }
            closeOpenAiCatalogModal();
            return;
        }
        closeAttachmentMenu();
        closeLibraryPickerModal();
        closeVoiceQuickPanel();
        closeSettingsModal();
    }
});

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

if (toggleApproxLocation) {
    toggleApproxLocation.checked = isApproxLocationEnabled;
    toggleApproxLocation.onchange = (e) => {
        isApproxLocationEnabled = e.target.checked;
    };
}

if (toggleWorkspaceBridge) {
    toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;
    toggleWorkspaceBridge.onchange = (e) => {
        isWorkspaceBridgeEnabled = e.target.checked;
        safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, isWorkspaceBridgeEnabled ? "true" : "false");
        updateWorkspaceBridgeSettingsUi();
        updateProviderSettingsUi();
    };
}

if (toggleMemoryBeta) {
    toggleMemoryBeta.checked = isMemoryEnabled;
    toggleMemoryBeta.onchange = (e) => {
        setMemoryEnabled(e.target.checked);
    };
}

memoryOpenCommandBtn?.addEventListener("click", () => {
    closeSettingsModal();
    if (!input) return;
    input.value = "/memory ";
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    input.focus();
    updateTokenDisplay();
    scheduleComposerDraftSave({ render: true });
    renderSlashCommandPalette();
});

personaSaveBtn?.addEventListener("click", savePersonaSettings);
personaClearBtn?.addEventListener("click", clearPersonaSettings);
addDirtyStateListeners([personaDisplayNameInput, personaCustomInstructionsInput], updatePersonaSaveButtonState);
addDirtyStateListeners([openAiApiKeyInput], updateOpenAiSaveButtonState);
addDirtyStateListeners([wanEndpointInput, wanWorkflowInput], updateWanSaveButtonState);
addDirtyStateListeners([workspaceBridgeEndpointInput, workspaceBridgeTokenInput], updateWorkspaceBridgeSaveButtonState);
localVoiceTranscriptionEndpointInput?.addEventListener("change", () => {
    persistLocalVoiceInput(
        localVoiceTranscriptionEndpointInput,
        LOCAL_VOICE_TRANSCRIPTION_ENDPOINT_STORAGE_KEY,
        DEFAULT_LOCAL_VOICE_TRANSCRIPTION_ENDPOINT
    );
});
localVoiceTranscriptionModelInput?.addEventListener("change", () => {
    persistLocalVoiceInput(
        localVoiceTranscriptionModelInput,
        LOCAL_VOICE_TRANSCRIPTION_MODEL_STORAGE_KEY,
        DEFAULT_LOCAL_VOICE_TRANSCRIPTION_MODEL
    );
});
localVoiceReplyEndpointInput?.addEventListener("change", () => {
    persistLocalVoiceInput(
        localVoiceReplyEndpointInput,
        LOCAL_VOICE_REPLY_ENDPOINT_STORAGE_KEY,
        DEFAULT_LOCAL_VOICE_REPLY_ENDPOINT
    );
});

ollamaCatalogBtn?.addEventListener("click", openOllamaCatalogModal);
openAiCatalogBtn?.addEventListener("click", () => openOpenAiCatalogModal(AI_PROVIDER_OPENAI));
openAiCatalogCloseBtn?.addEventListener("click", () => closeOpenAiCatalogModal());
openAiCatalogModal?.addEventListener("click", event => {
    if (event.target.closest("[data-openai-catalog-close]")) {
        closeOpenAiCatalogModal();
    }
});
openAiCatalogSearchInput?.addEventListener("input", event => {
    openAiCatalogSearchQuery = event.currentTarget.value || "";
    renderOpenAiCatalog();
});
openAiCatalogSortButtons.forEach(button => {
    button.addEventListener("click", () => {
        openAiCatalogSortMode = button.dataset.openaiCatalogSort || "default";
        renderOpenAiCatalog();
    });
});
openAiCatalogFiltersBtn?.addEventListener("click", event => {
    event.stopPropagation();
    setOpenAiCatalogFiltersOpen(Boolean(openAiCatalogFiltersMenu?.hidden));
});
openAiCatalogFiltersMenu?.addEventListener("click", event => {
    event.stopPropagation();
});
openAiCatalogFiltersMenu?.addEventListener("change", event => {
    const input = event.target instanceof Element
        ? event.target.closest("[data-openai-catalog-filter]")
        : null;
    if (!(input instanceof HTMLInputElement)) return;
    const mode = input.dataset.openaiCatalogFilter;
    if (!Object.prototype.hasOwnProperty.call(openAiCatalogFilters, mode)) return;
    const oppositeMode = mode === "require" ? "exclude" : "require";
    if (input.checked) {
        openAiCatalogFilters[mode].add(input.value);
        openAiCatalogFilters[oppositeMode].delete(input.value);
    } else {
        openAiCatalogFilters[mode].delete(input.value);
    }
    renderOpenAiCatalog();
});
openAiCatalogClearFiltersBtn?.addEventListener("click", event => {
    event.stopPropagation();
    clearOpenAiCatalogFilters();
});
document.addEventListener("click", event => {
    if (!openAiCatalogFiltersMenu || openAiCatalogFiltersMenu.hidden) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const filterWrap = openAiCatalogFiltersBtn?.closest(".model-catalog-filter-wrap");
    if (filterWrap && !filterWrap.contains(target)) {
        closeOpenAiCatalogFilters();
    }
});
openAiCatalogRefreshBtn?.addEventListener("click", () => {
    void refreshOpenAiCatalog({ force: true });
});

if (paramTemp && tempValue) {
    updateAiCallSettingsUi();
    
    paramTemp.oninput = (e) => {
        activeTemperature = normalizeAiTemperature(e.target.value);
        safeLocalStorageSet(AI_TEMPERATURE_STORAGE_KEY, String(activeTemperature));
        updateAiCallSettingsUi();
    };
}

toggleAiStreaming?.addEventListener("change", event => {
    isAiStreamingEnabled = Boolean(event.target.checked);
    safeLocalStorageSet(AI_STREAMING_ENABLED_STORAGE_KEY, isAiStreamingEnabled ? "true" : "false");
    updateAiCallSettingsUi();
});

aiCachingToggle?.addEventListener("click", () => {
    setAiCachingEnabled(!isAiCachingEnabled, { notify: true });
});

maxOutputTokensInput?.addEventListener("change", event => {
    activeMaxOutputTokens = normalizeMaxOutputTokens(event.target.value);
    safeLocalStorageSet(AI_MAX_OUTPUT_TOKENS_STORAGE_KEY, String(activeMaxOutputTokens));
    updateAiCallSettingsUi();
});

topPInput?.addEventListener("change", event => {
    activeTopP = normalizeTopP(event.target.value);
    safeLocalStorageSet(AI_TOP_P_STORAGE_KEY, String(activeTopP));
    updateAiCallSettingsUi();
});

ollamaTopKInput?.addEventListener("change", event => {
    activeOllamaTopK = normalizeOllamaTopK(event.target.value);
    safeLocalStorageSet(OLLAMA_TOP_K_STORAGE_KEY, String(activeOllamaTopK));
    updateAiCallSettingsUi();
});

agentMaxStepsAtATimeInput?.addEventListener("change", event => {
    activeAgentMaxStepsAtATime = normalizeAgentMaxStepsAtATime(event.target.value);
    safeLocalStorageSet(AGENT_MAX_STEPS_AT_A_TIME_STORAGE_KEY, String(activeAgentMaxStepsAtATime));
    updateAiCallSettingsUi();
});

agentMaxStepsPerRunInput?.addEventListener("change", event => {
    activeAgentMaxStepsPerRun = normalizeAgentMaxStepsPerRun(event.target.value);
    safeLocalStorageSet(AGENT_MAX_STEPS_PER_RUN_STORAGE_KEY, String(activeAgentMaxStepsPerRun));
    updateAiCallSettingsUi();
});

openAiVerbosityButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (button.disabled) return;
        activeOpenAiVerbosity = normalizeOpenAiVerbosity(button.dataset.aiVerbosity);
        safeLocalStorageSet(OPENAI_VERBOSITY_STORAGE_KEY, activeOpenAiVerbosity);
        updateAiCallSettingsUi();
    });
});

if (typewriterDuration || typewriterDurationNumber || typewriterDurationValue) {
    updateTypewriterDurationUi();

    typewriterDuration?.addEventListener("input", event => {
        setTypewriterDurationSeconds(event.target.value);
    });

    typewriterDurationNumber?.addEventListener("change", event => {
        setTypewriterDurationSeconds(event.target.value);
    });

    typewriterDurationNumber?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            setTypewriterDurationSeconds(event.currentTarget.value);
            event.currentTarget.blur();
        }
    });
}

function updateVoiceQuickUi() {
    applyActiveVoiceOrbTheme();
    if (voiceQuickVoiceLabel && !isOpenAiProvider()) {
        voiceQuickVoiceLabel.textContent = getLocalVoiceReplyModelLabel();
    }
    if (voiceAgentStatus && isRecording) {
        voiceAgentStatus.textContent = voiceDetectedSpeech ? "Listening" : "Waiting for your voice";
    }
    if (voiceReplyToggleBtn) {
        const label = isVoiceReplyEnabled ? "Turn voice replies off" : "Turn voice replies on";
        voiceReplyToggleBtn.classList.toggle("active", isVoiceReplyEnabled);
        voiceReplyToggleBtn.setAttribute("aria-pressed", String(isVoiceReplyEnabled));
        voiceReplyToggleBtn.setAttribute("aria-label", label);
        voiceReplyToggleBtn.dataset.tooltip = label;
        const icon = voiceReplyToggleBtn.querySelector(".voice-reply-icon");
        if (icon) icon.innerHTML = isVoiceReplyEnabled ? VOICE_REPLY_ON_ICON : VOICE_REPLY_OFF_ICON;
    }
    updateVoiceMicToggleUi();
    if (voiceSpeedSlider) {
        voiceSpeedSlider.value = String(activeVoiceSpeed);
    }
    if (voiceSpeedValue) {
        voiceSpeedValue.textContent = `${activeVoiceSpeed.toFixed(1)}x`;
    }
    updateVoiceQuickVoiceAvailability();
    updateVoiceMicChoiceSelection();
    updateVoiceOutputChoiceSelection();
}

function scheduleVoiceQuickPanelLayout() {
    if (!voiceQuickPanel || voiceQuickPanel.hidden) return;
    window.requestAnimationFrame(positionVoiceQuickPanel);
}

function positionVoiceQuickPanel() {
    if (!voiceQuickPanel || voiceQuickPanel.hidden) return;

    const anchorRect = composerPanel?.getBoundingClientRect?.()
        || voiceQuickPanel.parentElement?.getBoundingClientRect?.();
    const availableAbove = anchorRect
        ? Math.floor(anchorRect.top - VOICE_QUICK_PANEL_GAP - VOICE_QUICK_PANEL_VIEWPORT_INSET)
        : VOICE_QUICK_PANEL_MAX_HEIGHT;
    const maxHeight = availableAbove < VOICE_QUICK_PANEL_MIN_HEIGHT
        ? Math.max(1, availableAbove)
        : Math.min(VOICE_QUICK_PANEL_MAX_HEIGHT, availableAbove);

    voiceQuickPanel.style.setProperty("--voice-quick-panel-max-height", `${maxHeight}px`);
    voiceQuickPanel.style.setProperty("--voice-quick-panel-shift-x", "0px");

    const rect = voiceQuickPanel.getBoundingClientRect();
    const viewportRight = window.innerWidth - VOICE_QUICK_PANEL_VIEWPORT_INSET;
    let shiftX = 0;

    if (rect.left < VOICE_QUICK_PANEL_VIEWPORT_INSET) {
        shiftX = VOICE_QUICK_PANEL_VIEWPORT_INSET - rect.left;
    }
    if (rect.right + shiftX > viewportRight) {
        shiftX += viewportRight - (rect.right + shiftX);
    }

    voiceQuickPanel.style.setProperty("--voice-quick-panel-shift-x", `${Math.round(shiftX)}px`);
}

function keepActiveVoiceDeviceChoiceVisible(list) {
    if (!voiceQuickPanel || voiceQuickPanel.hidden || !list) return;
    const activeChoice = list.querySelector(".voice-device-choice.active");
    if (!activeChoice) return;

    const listRect = list.getBoundingClientRect();
    const activeRect = activeChoice.getBoundingClientRect();

    if (activeRect.top < listRect.top) {
        list.scrollTop -= listRect.top - activeRect.top;
    } else if (activeRect.bottom > listRect.bottom) {
        list.scrollTop += activeRect.bottom - listRect.bottom;
    }
}

function isVoiceQuickVoiceSelectionAvailable() {
    return isOpenAiProvider();
}

function updateVoiceQuickVoiceAvailability() {
    const isAvailable = isVoiceQuickVoiceSelectionAvailable();
    const voiceSection = voiceQuickVoiceChoices?.closest(".voice-quick-section");

    voiceSection?.classList.toggle("voice-quick-section-disabled", !isAvailable);
    voiceSection?.setAttribute("aria-disabled", String(!isAvailable));
    voiceQuickVoiceChoices?.setAttribute("aria-disabled", String(!isAvailable));
    voiceQuickVoiceChoices?.setAttribute("aria-label", isAvailable ? "AI voice" : "AI voice (OpenAI only)");

    voiceQuickVoiceChoices?.querySelectorAll("[data-voice-quick-voice]").forEach(button => {
        button.disabled = !isAvailable;
        button.setAttribute("aria-disabled", String(!isAvailable));
    });
}

function renderVoiceQuickSettings() {
    voiceMicToggleBtn?.addEventListener("click", () => {
        setVoiceMicMuted(!isVoiceMicMuted, { notify: true });
    });

    voiceReplyToggleBtn?.addEventListener("click", () => {
        setVoiceReplyEnabled(!isVoiceReplyEnabled, { cue: true });
    });
    voiceSpeedSlider?.addEventListener("input", event => {
        setVoiceSpeed(event.target.value);
    });

    voiceQuickSettingsBtn?.addEventListener("click", event => {
        event.stopPropagation();
        if (voiceQuickPanel?.hidden) {
            openVoiceQuickPanel();
        } else {
            closeVoiceQuickPanel();
        }
    });

    voiceQuickPanel?.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", event => {
        if (!voiceQuickPanel || voiceQuickPanel.hidden) return;
        if (event.target.closest("#voiceQuickSettingsBtn") || event.target.closest("#voiceQuickPanel")) return;
        closeVoiceQuickPanel();
    });

    updateVoiceQuickUi();
    refreshVoiceMicChoices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshVoiceMicChoices);
}

function openVoiceQuickPanel() {
    if (!voiceQuickPanel || !voiceQuickSettingsBtn) return;
    toolsDropdown?.classList.remove("open");
    updateVoiceQuickVoiceAvailability();
    voiceQuickPanel.hidden = false;
    voiceQuickSettingsBtn.setAttribute("aria-expanded", "true");
    positionVoiceQuickPanel();
    void refreshVoiceMicChoices().finally(scheduleVoiceQuickPanelLayout);
}

function closeVoiceQuickPanel() {
    if (!voiceQuickPanel || voiceQuickPanel.hidden) return;
    voiceQuickPanel.hidden = true;
    voiceQuickSettingsBtn?.setAttribute("aria-expanded", "false");
}

function updateVoiceMicChoiceSelection() {
    voiceMicChoices?.querySelectorAll("[data-voice-mic]").forEach(button => {
        const isActive = button.dataset.voiceMic === selectedVoiceMicDeviceId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });
    keepActiveVoiceDeviceChoiceVisible(voiceMicChoices);
}

function updateVoiceOutputChoiceSelection() {
    voiceOutputChoices?.querySelectorAll("[data-voice-output]").forEach(button => {
        const isActive = button.dataset.voiceOutput === selectedVoiceOutputDeviceId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });
    keepActiveVoiceDeviceChoiceVisible(voiceOutputChoices);
}

function renderVoiceMicChoices(devices = []) {
    if (!voiceMicChoices) return;
    const existingDevices = devices.filter(device => device.kind === "audioinput");
    const options = [
        { deviceId: "default", label: "Default microphone" },
        ...existingDevices
            .filter(device => device.deviceId && device.deviceId !== "default")
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Microphone ${index + 1}`
            }))
    ];

    if (!options.some(option => option.deviceId === selectedVoiceMicDeviceId)) {
        selectedVoiceMicDeviceId = "default";
        safeLocalStorageSet(VOICE_MIC_DEVICE_STORAGE_KEY, "default");
    }

    voiceMicChoices.replaceChildren(...options.map(option => {
        const button = document.createElement("button");
        button.className = "voice-device-choice";
        button.type = "button";
        button.dataset.voiceMic = option.deviceId;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(option.deviceId === selectedVoiceMicDeviceId));
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path>
                <path d="M19 11v1a7 7 0 0 1-14 0v-1"></path>
            </svg>
            <span>${escapeHtml(option.label)}</span>
            <svg class="voice-choice-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        `;
        button.addEventListener("click", () => setSelectedVoiceMic(option.deviceId));
        return button;
    }));
    updateVoiceMicChoiceSelection();
    scheduleVoiceQuickPanelLayout();
}

function renderVoiceOutputChoices(devices = []) {
    if (!voiceOutputChoices) return;
    if (!supportsVoiceOutputSelection()) {
        voiceOutputChoices.replaceChildren(createVoiceDeviceNote("Output selection is not supported in this browser."));
        scheduleVoiceQuickPanelLayout();
        return;
    }

    const outputDevices = devices.filter(device => device.kind === "audiooutput");
    const options = [
        { deviceId: "default", label: "Default output" },
        ...outputDevices
            .filter(device => device.deviceId && device.deviceId !== "default")
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Output ${index + 1}`
            }))
    ];

    if (!options.some(option => option.deviceId === selectedVoiceOutputDeviceId)) {
        selectedVoiceOutputDeviceId = "default";
        safeLocalStorageSet(VOICE_OUTPUT_DEVICE_STORAGE_KEY, "default");
    }

    voiceOutputChoices.replaceChildren(...options.map(option => {
        const button = document.createElement("button");
        button.className = "voice-device-choice";
        button.type = "button";
        button.dataset.voiceOutput = option.deviceId;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(option.deviceId === selectedVoiceOutputDeviceId));
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
                <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                <path d="M18.5 5.5a9 9 0 0 1 0 13"></path>
            </svg>
            <span>${escapeHtml(option.label)}</span>
            <svg class="voice-choice-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        `;
        button.addEventListener("click", () => setSelectedVoiceOutput(option.deviceId));
        return button;
    }));
    updateVoiceOutputChoiceSelection();
    scheduleVoiceQuickPanelLayout();
}

function createVoiceDeviceNote(text) {
    const note = document.createElement("div");
    note.className = "voice-device-note";
    note.textContent = text;
    return note;
}

async function refreshVoiceMicChoices() {
    if (!voiceMicChoices && !voiceOutputChoices) return;
    if (!navigator.mediaDevices?.enumerateDevices) {
        renderVoiceMicChoices([]);
        renderVoiceOutputChoices([]);
        return;
    }
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        renderVoiceMicChoices(devices);
        renderVoiceOutputChoices(devices);
    } catch (err) {
        renderVoiceMicChoices([]);
        renderVoiceOutputChoices([]);
    }
}

function updateVoicePickerUi(voice = getOpenAiVoice()) {
    const option = getOpenAiVoiceOption(voice);
    applyActiveVoiceOrbTheme(option.id);
    if (voicePreviewBtn) {
        voicePreviewBtn.setAttribute("aria-label", `Preview ${option.name} voice`);
        voicePreviewBtn.dataset.voicePreview = option.id;
        voicePreviewBtn.classList.toggle("is-active", activeVoicePreviewId === option.id);
    }
    if (voiceNameLabel) voiceNameLabel.textContent = option.name;
    if (voiceDescLabel) voiceDescLabel.textContent = option.description;
    if (voiceQuickVoiceLabel) voiceQuickVoiceLabel.textContent = option.name;
    if (voiceDots) {
        voiceDots.replaceChildren(...OPENAI_VOICE_OPTIONS.map(item => {
            const dot = document.createElement("span");
            dot.className = "voice-dot";
            dot.classList.toggle("active", item.id === option.id);
            return dot;
        }));
    }
    voiceChoiceList?.querySelectorAll("[data-openai-voice]").forEach(button => {
        const isActive = button.dataset.openaiVoice === option.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
    });
    voiceQuickVoiceChoices?.querySelectorAll("[data-voice-quick-voice]").forEach(button => {
        const isActive = button.dataset.voiceQuickVoice === option.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-checked", String(isActive));
        if (isActive && voiceQuickPanel && !voiceQuickPanel.hidden) {
            button.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
    });
    updateVoiceQuickVoiceAvailability();
}

function setVoicePreviewButtonState(state = "idle", voiceId = getOpenAiVoice()) {
    if (!voicePreviewBtn) return;
    voicePreviewBtn.dataset.previewState = state;
    voicePreviewBtn.classList.toggle("is-loading", state === "loading");
    voicePreviewBtn.classList.toggle("is-playing", state === "playing");
    voicePreviewBtn.classList.toggle("is-active", state !== "idle" && activeVoicePreviewId === voiceId);
    voicePreviewBtn.setAttribute("aria-pressed", String(state === "playing"));
}

function clearVoicePreviewAudio() {
    if (activeVoicePreviewAudio) {
        activeVoicePreviewAudio.pause();
        activeVoicePreviewAudio.removeAttribute("src");
        activeVoicePreviewAudio.load?.();
    }
    if (activeVoicePreviewUrl) {
        URL.revokeObjectURL(activeVoicePreviewUrl);
    }
    activeVoicePreviewAudio = null;
    activeVoicePreviewUrl = null;
}

function stopVoicePreview({ updateUi = true } = {}) {
    activeVoicePreviewController?.abort();
    activeVoicePreviewController = null;
    clearVoicePreviewAudio();
    activeVoicePreviewId = "";
    if (updateUi) setVoicePreviewButtonState("idle");
}

function getVoicePreviewText(option) {
    return `Hi, I am ${option.name}. This is a quick preview of my voice.`;
}

function getStableSpeechTextHash(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function getOpenAiSpeechCacheKey(inputText, voice = getOpenAiVoice()) {
    const text = sanitizeSpeechText(inputText);
    return [
        "v1",
        getOpenAiSpeechModel(),
        voice,
        text.length,
        getStableSpeechTextHash(text)
    ].join("|");
}

function readOpenAiSpeechCache() {
    const raw = safeLocalStorageGet(OPENAI_SPEECH_CACHE_STORAGE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.warn("Could not parse cached speech audio:", err);
        return {};
    }
}

function getCachedOpenAiSpeechEntry(inputText, voice = getOpenAiVoice()) {
    if (!isAiCachingEnabled) return null;
    const entry = readOpenAiSpeechCache()[getOpenAiSpeechCacheKey(inputText, voice)];
    if (!entry || typeof entry !== "object") return null;
    const mimeType = String(entry.mimeType || "audio/mpeg").trim();
    const dataBase64 = String(entry.dataBase64 || "").trim();
    if (!dataBase64) return null;
    return {
        source: `data:${mimeType};base64,${dataBase64}`,
        waveform: normalizeAssistantTtsWaveform(entry.waveform)
    };
}

function pruneOpenAiSpeechCache(cache) {
    const entries = Object.entries(cache || {})
        .filter(([, entry]) => entry?.dataBase64)
        .sort((a, b) => String(b[1].lastUsedAt || b[1].createdAt || "").localeCompare(String(a[1].lastUsedAt || a[1].createdAt || "")));
    const kept = [];
    let totalChars = 0;
    entries.forEach(([key, entry]) => {
        const size = String(entry.dataBase64 || "").length;
        if (kept.length >= OPENAI_SPEECH_CACHE_MAX_ENTRIES) return;
        if (totalChars + size > OPENAI_SPEECH_CACHE_MAX_CHARS && kept.length > 0) return;
        kept.push([key, entry]);
        totalChars += size;
    });
    return Object.fromEntries(kept);
}

function touchOpenAiSpeechCacheEntry(inputText, voice = getOpenAiVoice()) {
    if (!isAiCachingEnabled) return;
    const cache = readOpenAiSpeechCache();
    const key = getOpenAiSpeechCacheKey(inputText, voice);
    if (!cache[key]) return;
    cache[key] = {
        ...cache[key],
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_SPEECH_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiSpeechCache(cache)));
}

function updateOpenAiSpeechCacheWaveform(inputText, voice, waveform) {
    if (!isAiCachingEnabled) return;
    const normalizedWaveform = normalizeAssistantTtsWaveform(waveform);
    if (!normalizedWaveform.length) return;
    const cache = readOpenAiSpeechCache();
    const key = getOpenAiSpeechCacheKey(inputText, voice);
    if (!cache[key]) return;
    cache[key] = {
        ...cache[key],
        waveform: normalizedWaveform,
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_SPEECH_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiSpeechCache(cache)));
}

function saveOpenAiSpeechCacheEntry(inputText, voice, audioBlob, dataBase64, waveform = []) {
    if (!isAiCachingEnabled) return;
    if (!dataBase64) return;
    const cache = pruneOpenAiSpeechCache(readOpenAiSpeechCache());
    cache[getOpenAiSpeechCacheKey(inputText, voice)] = {
        voice,
        model: getOpenAiSpeechModel(),
        textLength: sanitizeSpeechText(inputText).length,
        mimeType: audioBlob.type || "audio/mpeg",
        dataBase64,
        waveform: normalizeAssistantTtsWaveform(waveform),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_SPEECH_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiSpeechCache(cache)));
}

function getVoicePreviewCacheKey(option) {
    return [
        "v2",
        getOpenAiSpeechModel(),
        option.id,
        getVoicePreviewText(option)
    ].join("|");
}

function readVoicePreviewCache() {
    const raw = safeLocalStorageGet(OPENAI_VOICE_PREVIEW_CACHE_STORAGE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.warn("Could not parse cached voice previews:", err);
        return {};
    }
}

function getCachedVoicePreview(option) {
    if (!isAiCachingEnabled) return "";
    const entry = readVoicePreviewCache()[getVoicePreviewCacheKey(option)];
    if (!entry || typeof entry !== "object") return "";
    const mimeType = String(entry.mimeType || "audio/mpeg").trim();
    const dataBase64 = String(entry.dataBase64 || "").trim();
    return dataBase64 ? `data:${mimeType};base64,${dataBase64}` : "";
}

function pruneVoicePreviewCache(cache) {
    const entries = Object.entries(cache || {})
        .filter(([, entry]) => entry?.dataBase64)
        .sort((a, b) => String(b[1].createdAt || "").localeCompare(String(a[1].createdAt || "")));
    return Object.fromEntries(entries.slice(0, OPENAI_VOICE_OPTIONS.length));
}

function saveVoicePreviewCacheEntry(option, audioBlob, dataBase64) {
    if (!isAiCachingEnabled) return;
    if (!dataBase64) return;
    const cache = pruneVoicePreviewCache(readVoicePreviewCache());
    cache[getVoicePreviewCacheKey(option)] = {
        voice: option.id,
        model: getOpenAiSpeechModel(),
        mimeType: audioBlob.type || "audio/mpeg",
        dataBase64,
        createdAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_VOICE_PREVIEW_CACHE_STORAGE_KEY, JSON.stringify(pruneVoicePreviewCache(cache)));
}

function readOpenAiTranscriptionCache() {
    const raw = safeLocalStorageGet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.warn("Could not parse cached transcriptions:", err);
        return {};
    }
}

function pruneOpenAiTranscriptionCache(cache) {
    const entries = Object.entries(cache || {})
        .filter(([, entry]) => typeof entry?.text === "string" && entry.text.trim())
        .sort((a, b) => String(b[1].lastUsedAt || b[1].createdAt || "").localeCompare(String(a[1].lastUsedAt || a[1].createdAt || "")));
    return Object.fromEntries(entries.slice(0, OPENAI_TRANSCRIPTION_CACHE_MAX_ENTRIES));
}

async function getOpenAiTranscriptionCacheKey(blob) {
    if (!isAiCachingEnabled || !(blob instanceof Blob)) return "";
    try {
        const hash = await getBlobSha256Hex(blob);
        if (!hash) return "";
        return [
            "v1",
            getOpenAiTranscriptionModel(),
            blob.type || "audio/webm",
            blob.size || 0,
            hash
        ].join("|");
    } catch (err) {
        console.warn("Could not hash audio for transcription cache:", err);
        return "";
    }
}

async function getLocalTranscriptionCacheKey(blob) {
    if (!isAiCachingEnabled || !(blob instanceof Blob)) return "";
    try {
        const hash = await getBlobSha256Hex(blob);
        if (!hash) return "";
        return [
            "local-v1",
            getLocalVoiceTranscription(),
            getLocalVoiceTranscriptionEndpoint(),
            getLocalVoiceTranscriptionModel(),
            blob.type || "audio/webm",
            blob.size || 0,
            hash
        ].join("|");
    } catch (err) {
        console.warn("Could not hash audio for local transcription cache:", err);
        return "";
    }
}

function getCachedOpenAiTranscription(cacheKey) {
    if (!isAiCachingEnabled || !cacheKey) return "";
    const cache = readOpenAiTranscriptionCache();
    const entry = cache[cacheKey];
    const text = typeof entry?.text === "string" ? entry.text.trim() : "";
    if (!text) return "";
    cache[cacheKey] = {
        ...entry,
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
    return text;
}

function normalizeTranscriptionRecordingMetadata(recording = null) {
    if (!recording || typeof recording !== "object") return null;
    const url = String(recording.url || recording.source || "").trim();
    const path = String(recording.path || recording.filePath || "").trim();
    if (!url && !path) return null;
    const metadata = {
        url,
        path,
        mimeType: String(recording.mimeType || recording.type || "").trim(),
        size: String(recording.size || ""),
        provider: String(recording.provider || "").trim(),
        transcript: String(recording.transcript || "").trim(),
        createdAt: String(recording.createdAt || new Date().toISOString()).trim()
    };
    Object.keys(metadata).forEach(key => {
        if (!metadata[key]) delete metadata[key];
    });
    return metadata;
}

function saveLocalTranscriptionCacheEntry(cacheKey, text, blob, recording = null) {
    if (!isAiCachingEnabled || !cacheKey || !String(text || "").trim()) return;
    const cache = pruneOpenAiTranscriptionCache(readOpenAiTranscriptionCache());
    const recordingMetadata = normalizeTranscriptionRecordingMetadata(recording);
    cache[cacheKey] = {
        provider: "local",
        engine: getLocalVoiceTranscription(),
        endpoint: getLocalVoiceTranscriptionEndpoint(),
        model: getLocalVoiceTranscriptionModel(),
        type: blob?.type || "audio/webm",
        size: Number(blob?.size || 0) || 0,
        text: String(text || "").trim(),
        ...(recordingMetadata ? { recording: recordingMetadata } : {}),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
}

function saveOpenAiTranscriptionCacheEntry(cacheKey, text, blob, recording = null) {
    if (!isAiCachingEnabled || !cacheKey || !String(text || "").trim()) return;
    const cache = pruneOpenAiTranscriptionCache(readOpenAiTranscriptionCache());
    const recordingMetadata = normalizeTranscriptionRecordingMetadata(recording);
    cache[cacheKey] = {
        model: getOpenAiTranscriptionModel(),
        type: blob?.type || "audio/webm",
        size: Number(blob?.size || 0) || 0,
        text: String(text || "").trim(),
        ...(recordingMetadata ? { recording: recordingMetadata } : {}),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
}

async function playVoicePreview(voiceId = getOpenAiVoice()) {
    const option = getOpenAiVoiceOption(voiceId);
    if (activeVoicePreviewId === option.id && activeVoicePreviewController) {
        stopVoicePreview();
        return;
    }

    stopVoicePreview({ updateUi: false });
    const controller = new AbortController();
    activeVoicePreviewController = controller;
    activeVoicePreviewId = option.id;
    setVoicePreviewButtonState("loading", option.id);

    try {
        const cachedPreviewUrl = getCachedVoicePreview(option);
        if (cachedPreviewUrl) {
            activeVoicePreviewAudio = new Audio(cachedPreviewUrl);
        } else {
            const res = await openAiSpeechFetch(getVoicePreviewText(option), {
                signal: controller.signal,
                voice: option.id
            });
            throwIfAborted(controller.signal);
            const audioBlob = await res.blob();
            throwIfAborted(controller.signal);
            const dataBase64 = await blobToBase64(audioBlob);
            throwIfAborted(controller.signal);
            saveVoicePreviewCacheEntry(option, audioBlob, dataBase64);
            activeVoicePreviewUrl = URL.createObjectURL(audioBlob);
            activeVoicePreviewAudio = new Audio(activeVoicePreviewUrl);
        }
        setVoicePreviewButtonState("playing", option.id);
        await playAudioElementToEnd(activeVoicePreviewAudio, controller.signal);
    } catch (err) {
        if (err.name !== "AbortError") {
            showToast(`Voice preview failed: ${err.message}`, "error");
        }
    } finally {
        if (activeVoicePreviewController === controller) {
            activeVoicePreviewController = null;
            clearVoicePreviewAudio();
            activeVoicePreviewId = "";
            setVoicePreviewButtonState("idle", option.id);
        }
    }
}

function renderVoiceChoices() {
    if (!voiceChoiceList || voiceChoiceList.children.length > 0) return;
    OPENAI_VOICE_OPTIONS.forEach(option => {
        const button = document.createElement("button");
        button.className = "voice-choice";
        button.type = "button";
        button.dataset.openaiVoice = option.id;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.innerHTML = `
            <span class="voice-choice-swatch ${option.swatch}" aria-hidden="true"></span>
            <span class="voice-choice-text">
                <strong>${option.name}</strong>
                <small>${option.description}</small>
            </span>
        `;
        button.addEventListener("click", () => setOpenAiVoice(option.id));
        voiceChoiceList.appendChild(button);
    });
    updateVoicePickerUi();
}

function renderVoiceQuickChoices() {
    if (!voiceQuickVoiceChoices || voiceQuickVoiceChoices.children.length > 0) return;
    OPENAI_VOICE_OPTIONS.forEach(option => {
        const button = document.createElement("button");
        button.className = "voice-quick-voice-choice";
        button.type = "button";
        button.dataset.voiceQuickVoice = option.id;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("aria-label", `${option.name}: ${option.description}`);
        button.innerHTML = `
            <span class="voice-choice-swatch ${option.swatch}" aria-hidden="true"></span>
            <span class="voice-quick-voice-copy">
                <strong>${escapeHtml(option.name)}</strong>
                <small>${escapeHtml(option.description)}</small>
            </span>
        `;
        button.addEventListener("click", () => {
            if (!isVoiceQuickVoiceSelectionAvailable()) return;
            setOpenAiVoice(option.id);
        });
        voiceQuickVoiceChoices.appendChild(button);
    });
    updateVoicePickerUi();
}

function cycleOpenAiVoice(direction) {
    const current = getOpenAiVoice();
    const currentIndex = Math.max(0, OPENAI_VOICE_OPTIONS.findIndex(option => option.id === current));
    const nextIndex = (currentIndex + direction + OPENAI_VOICE_OPTIONS.length) % OPENAI_VOICE_OPTIONS.length;
    setOpenAiVoice(OPENAI_VOICE_OPTIONS[nextIndex].id);
}

voicePrevBtn?.addEventListener("click", () => cycleOpenAiVoice(-1));
voiceNextBtn?.addEventListener("click", () => cycleOpenAiVoice(1));
voicePreviewBtn?.addEventListener("click", event => {
    event.stopPropagation();
    playVoicePreview(getOpenAiVoice());
});
renderVoiceChoices();
renderVoiceQuickChoices();
renderVoiceQuickSettings();
renderOpenAiModelSelects();
renderLocalVoiceModelSelects();
renderLocalTaskModelSelects();
updateLocalVoiceSettingsUi();
updateLocalTaskModelSelects();

document.getElementById("voiceShowMoreBtn")?.addEventListener("click", () => {
    document.getElementById("voiceChoiceWrap")?.classList.add("expanded");
});
document.getElementById("voiceShowLessBtn")?.addEventListener("click", () => {
    document.getElementById("voiceChoiceWrap")?.classList.remove("expanded");
});

function renderLocalModelChoices() {
    updateLocalInstallButton();
    if (!localModelList) return;
    const options = getLocalModelSwitcherOptions();
    localModelList.replaceChildren(...options.map(option => {
        const button = document.createElement("button");
        const installed = isOllamaModelInstalled(option.id);
        const isActive = option.id === OLLAMA_MODEL;
        button.className = "local-model-choice";
        button.type = "button";
        button.dataset.localModel = option.id;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(isActive));
        button.classList.toggle("active", isActive);
        button.classList.toggle("missing", !installed);
        button.classList.toggle("unavailable", option.state === "unavailable");

        const label = document.createElement("span");
        label.className = "local-model-choice-label";
        label.textContent = option.label || option.id;

        const meta = document.createElement("small");
        meta.className = "local-model-choice-meta";
        meta.textContent = option.meta || (installed ? "Installed" : "Missing");

        button.append(label, meta);
        button.addEventListener("click", () => setActiveModel(option.id, { provider: AI_PROVIDER_LOCAL }));
        return button;
    }));
}

function createOllamaPullRequestId(modelId) {
    const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `pull:${String(modelId || "model")}:${suffix}`;
}

async function pullOllamaModelThroughDesktop(modelId, requestId) {
    const desktopApi = getFaunaDesktopApi();
    if (!desktopApi?.pullOllamaModel) return null;
    const unsubscribe = desktopApi.onOllamaPullProgress?.(event => {
        if (event?.requestId !== requestId) return;
        applyOllamaPullProgress(modelId, event);
    });
    try {
        const result = await desktopApi.pullOllamaModel({ modelId, requestId });
        if (result?.error) throw new Error(result.error);
        return result;
    } finally {
        unsubscribe?.();
    }
}

async function pullOllamaModelThroughFetch(modelId, options = {}) {
    const res = await ollamaFetch(OLLAMA_PULL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        desktopTimeoutMs: 30 * 60 * 1000,
        body: JSON.stringify({ name: modelId, stream: true }),
        signal: options.signal
    });
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || `Ollama responded with HTTP ${res.status}`);
    }
    let finalData = {};
    await readTextStreamLines(res, {
        onLine(line) {
            const data = JSON.parse(line);
            finalData = { ...finalData, ...data };
            if (data.error) throw new Error(data.error);
            applyOllamaPullProgress(modelId, data);
        }
    });
    return finalData;
}

async function pullOllamaModel(modelId, options = {}) {
    const requestId = createOllamaPullRequestId(modelId);
    const taskId = startModelDownloadTask(modelId, options.resume ? "Resuming Ollama pull" : "Waiting for Ollama", {
        requestId,
        resume: Boolean(options.resume)
    });
    const controller = new AbortController();
    setModelDownloadAbortController(taskId, controller);
    try {
        setLocalModelsStatus(`Pulling ${modelId}`, "missing");
        const data = await pullOllamaModelThroughDesktop(modelId, requestId)
            || await pullOllamaModelThroughFetch(modelId, { signal: controller.signal });
        if (data?.error) throw new Error(data.error);
        finishModelDownloadTask(taskId, { ok: true, detail: "Installed" });
        return data;
    } catch (err) {
        if (isModelDownloadTaskCancelled(taskId)) {
            return { cancelled: true, state: getModelDownloadTaskState(taskId) };
        }
        finishModelDownloadTask(taskId, { ok: false, detail: err.message });
        throw err;
    } finally {
        clearModelDownloadAbortController(taskId);
    }
}

async function installOllamaWithApproval() {
    const approved = await showApprovalDialog({
        title: "Install Ollama?",
        message: "Fauna could not reach Ollama on this machine. Approve this before installing or opening the Ollama installer.",
        details: [
            "If the local workspace bridge is enabled, Fauna will ask Windows winget to install Ollama.",
            "If the bridge is not available, Fauna will open the official Ollama download page.",
            "No model downloads start until Ollama is reachable and you approve them."
        ],
        confirmLabel: "Approve install"
    });
    if (!approved) return false;

    if (!hasWorkspaceBridgeAccess()) {
        window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
        showToast("Opened the Ollama download page. Start Ollama, then click Install missing again.", "info");
        return false;
    }

    setLocalModelsStatus("Installing Ollama", "missing");
    if (localModelsInstallBtn) localModelsInstallBtn.disabled = true;
    try {
        const command = [
            "$ErrorActionPreference = 'Stop'",
            "if (Get-Command ollama -ErrorAction SilentlyContinue) { ollama --version; exit 0 }",
            "if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'Ollama is not installed and winget is unavailable. Download Ollama from https://ollama.com/download.' }",
            "winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements"
        ].join("; ");
        const result = await runWorkspaceCommand(command, ".", 60);
        if (result.exitCode !== 0) {
            throw new Error((result.stderr || result.stdout || "Ollama installer failed.").trim());
        }
        showToast("Ollama install command finished. Start Ollama if it is not running yet.", "success");
        await checkOllamaStatus();
        return true;
    } catch (err) {
        setLocalModelsStatus("Install failed", "missing");
        showToast(`Ollama install failed: ${err.message}`, "error");
        window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
        return false;
    } finally {
        if (localModelsInstallBtn) localModelsInstallBtn.disabled = false;
    }
}

async function startOllamaHttpService({ remember = false, silent = false } = {}) {
    if (remember) setOllamaAutoStartEnabled(true, { notify: false });
    if (localModelsStartBtn) localModelsStartBtn.disabled = true;
    if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = true;
    setLocalModelsStatus("Starting Ollama", "missing");

    try {
        const desktopApi = getFaunaDesktopApi();
        if (desktopApi?.startOllama) {
            const result = await desktopApi.startOllama();
            if (!result?.ok) {
                if (result?.downloadUrl) window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
                throw new Error(result?.message || "Ollama could not be started.");
            }
            if (!silent) showToast(result.message || "Ollama HTTP is starting.", result.status === "running" ? "info" : "success");
        } else if (hasWorkspaceBridgeAccess()) {
            const command = [
                "$ErrorActionPreference = 'Stop'",
                "$ollama = (Get-Command ollama -ErrorAction SilentlyContinue).Source",
                "if (-not $ollama) { throw 'Ollama is not installed or is not on PATH.' }",
                "Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden"
            ].join("; ");
            const result = await runWorkspaceCommand(command, ".", 20);
            if (result.exitCode !== 0) {
                throw new Error((result.stderr || result.stdout || "Ollama start command failed.").trim());
            }
            if (!silent) showToast("Ollama HTTP start command was sent.", "success");
        } else {
            window.open(OLLAMA_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
            throw new Error("Enable the Local Workspace Bridge or use the desktop app to start Ollama from Fauna.");
        }

        await new Promise(resolve => window.setTimeout(resolve, 900));
        await checkOllamaStatus();
        return isOllamaReachable;
    } catch (err) {
        setLocalModelsStatus("Start failed", "missing");
        if (!silent) showToast(`Ollama start failed: ${err.message}`, "error");
        return false;
    } finally {
        if (localModelsStartBtn) localModelsStartBtn.disabled = false;
        if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = false;
    }
}

async function installMissingOllamaModels() {
    if (localModelsInstallBtn) localModelsInstallBtn.disabled = true;
    if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = true;
    if (localModelsStartBtn) localModelsStartBtn.disabled = true;
    try {
        await checkOllamaStatus();
        if (!isOllamaReachable) {
            const installed = await installOllamaWithApproval();
            if (!installed) return;
            await checkOllamaStatus();
            if (!isOllamaReachable) return;
        }

        const missing = getRequiredOllamaModels().filter(model => !isOllamaModelInstalled(model));
        if (missing.length === 0) {
            setLocalModelsStatus("Ready", "configured");
            showToast("All required Ollama models are installed.", "success");
            return;
        }

        const approved = await showApprovalDialog({
            title: "Install missing models?",
            message: "Fauna will pull the missing Ollama models to this machine. Large models can take a long time and use significant disk space.",
            details: missing.map(model => `Pull ${model}`),
            confirmLabel: "Pull models"
        });
        if (!approved) return;

        missing.forEach((modelId, index) => {
            queueModelDownloadTask(modelId, index === 0 ? "Next download" : `Queued after ${missing[index - 1]}`, index);
        });
        showToast(`${missing.length} model ${missing.length === 1 ? "is" : "are"} queued for download.`, "info");

        for (const modelId of missing) {
            setLocalModelsStatus(`Pulling ${modelId}`, "missing");
            showToast(`Pulling ${modelId} from Ollama...`, "info");
            const result = await pullOllamaModel(modelId);
            if (result?.cancelled) return;
        }

        await checkOllamaStatus();
        showToast("Missing Ollama models installed.", "success");
    } catch (err) {
        setLocalModelsStatus("Install failed", "missing");
        showToast(`Model install failed: ${err.message}`, "error");
    } finally {
        if (localModelsInstallBtn) localModelsInstallBtn.disabled = false;
        if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = false;
        if (localModelsStartBtn) localModelsStartBtn.disabled = false;
    }
}

async function installMissingTaskOllamaModels() {
    if (isTaskModelInstallInProgress) return;
    isTaskModelInstallInProgress = true;
    if (localTaskModelsInstallBtn) {
        localTaskModelsInstallBtn.disabled = true;
        localTaskModelsInstallBtn.textContent = "Installing...";
    }
    if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = true;
    if (localModelsStartBtn) localModelsStartBtn.disabled = true;
    try {
        await checkOllamaStatus();
        if (!isOllamaReachable) {
            const installed = await installOllamaWithApproval();
            if (!installed) return;
            await checkOllamaStatus();
            if (!isOllamaReachable) return;
        }

        const groups = getMissingLocalTaskModelGroups()
            .map(group => ({
                ...group,
                model: normalizeModelId(group.model)
            }))
            .filter(group => group.model && !isOllamaModelInstalled(group.model));
        if (groups.length === 0) {
            updateLocalTaskModelsStatus();
            showToast("All selected task models are installed.", "success");
            return;
        }

        const approved = await showApprovalDialog({
            title: "Install missing task models?",
            message: "Fauna will pull the Ollama models needed for agent routing. Large models can take a long time and use significant disk space.",
            details: groups.map(group => `Pull ${group.model} for ${group.labels.join(", ")}`),
            confirmLabel: "Pull models"
        });
        if (!approved) return;

        const missing = groups.map(group => group.model);
        missing.forEach((modelId, index) => {
            queueModelDownloadTask(modelId, index === 0 ? "Next task model" : `Queued after ${missing[index - 1]}`, index);
        });
        showToast(`${missing.length} task model ${missing.length === 1 ? "is" : "are"} queued for download.`, "info");

        for (const modelId of missing) {
            setLocalModelsStatus(`Pulling ${modelId}`, "missing");
            showToast(`Pulling ${modelId} from Ollama...`, "info");
            const result = await pullOllamaModel(modelId);
            if (result?.cancelled) return;
        }

        await checkOllamaStatus();
        showToast("Missing task models installed.", "success");
    } catch (err) {
        setLocalModelsStatus("Install failed", "missing");
        showToast(`Task model install failed: ${err.message}`, "error");
    } finally {
        isTaskModelInstallInProgress = false;
        if (localTaskModelsInstallBtn) localTaskModelsInstallBtn.disabled = false;
        if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = false;
        if (localModelsStartBtn) localModelsStartBtn.disabled = false;
        updateLocalTaskModelsStatus();
    }
}

async function installLocalVoicePipeline() {
    if (localVoiceInstallBtn) localVoiceInstallBtn.disabled = true;
    try {
        const approved = await showApprovalDialog({
            title: "Install local voice support?",
            message: "Fauna can start Ollama and install the local models it uses. Whisper and local voice endpoints still need to run on your machine.",
            details: [
                "Starts the Ollama HTTP service if Ollama is installed.",
                "Pulls missing local Ollama models used by chat and vision.",
                "Whisper and Moshi/Qwen3-Omni endpoints remain self-hosted at the configured URLs."
            ],
            confirmLabel: "Continue"
        });
        if (!approved) return;

        if (!isOllamaReachable) {
            await startOllamaHttpService();
        }
        await installMissingOllamaModels();
        showToast("Local voice setup action finished. Check your Whisper and voice endpoint servers before starting voice chat.", "info");
    } finally {
        if (localVoiceInstallBtn) localVoiceInstallBtn.disabled = false;
    }
}

function setOpenAiSettingsStatus(text, state = "missing") {
    if (!openAiStatus) return;
    openAiStatus.textContent = text;
    openAiStatus.dataset.state = state;
}

function updateProviderConfigVisibility() {
    providerConfigPanels.forEach(panel => {
        const isActive = normalizeAiProvider(panel.dataset.providerConfig) === activeAiProvider;
        panel.hidden = !isActive;
        panel.setAttribute("aria-hidden", String(!isActive));
    });
}

function updateProviderSettingsUi() {
    const key = getOpenAiApiKey();
    providerChoiceButtons.forEach(button => {
        const isActive = button.dataset.aiProvider === activeAiProvider;
        button.setAttribute("aria-checked", String(isActive));
    });
    scheduleAnimatedSegmentIndicators();
    updateProviderConfigVisibility();

    if (openAiApiKeyInput) openAiApiKeyInput.value = key;
    if (openAiChatModelInput) openAiChatModelInput.value = getOpenAiChatModel();
    if (openAiImageModelInput) openAiImageModelInput.value = getOpenAiImageModel();
    updateOpenAiModelSelects();
    updateLocalVoiceSettingsUi();
    setOpenAiVoice(getOpenAiVoice(), { persist: false });

    if (isOpenAiProvider()) {
        if (!key) {
            setOpenAiSettingsStatus("Key needed", "missing");
            setServiceStatus("offline", "OpenAI key needed");
        } else if (!hasWorkspaceBridgeAccess()) {
            setOpenAiSettingsStatus("Bridge needed", "missing");
            setServiceStatus("offline", "OpenAI bridge needed");
        } else {
            setOpenAiSettingsStatus("Active", "configured");
            setServiceStatus("online", "OpenAI selected");
        }
    } else {
        setOpenAiSettingsStatus(key ? "Saved" : "Local", key ? "configured" : "missing");
        if (!isOllamaReachable) setLocalModelsStatus("Not checked", "missing");
        setServiceStatus("offline", "Ollama local");
    }
    updateOpenAiVoiceSettingsAvailability();
    updateVoiceButtonAvailability();
    updateAiCachingUi();
    updateAiCallSettingsUi();
    renderOllamaAutoStartSetting();
}

function saveOpenAiSettings() {
    const pending = getPendingOpenAiSettings();
    if (!pending.key) {
        showToast("Paste an OpenAI API key before saving.", "error");
        setOpenAiSettingsStatus("Key needed", "missing");
        return false;
    }

    safeLocalStorageSet(OPENAI_API_KEY_STORAGE_KEY, pending.key);
    safeLocalStorageSet(OPENAI_CHAT_MODEL_STORAGE_KEY, pending.chatModel);
    safeLocalStorageSet(OPENAI_IMAGE_MODEL_STORAGE_KEY, pending.imageModel);
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY, pending.transcriptionModel);
    safeLocalStorageSet(OPENAI_SPEECH_MODEL_STORAGE_KEY, getOpenAiSpeechModel() || DEFAULT_OPENAI_SPEECH_MODEL);
    safeLocalStorageSet(OPENAI_REALTIME_MODEL_STORAGE_KEY, pending.realtimeModel);
    const voiceOption = getOpenAiVoiceOption((openAiVoiceInput?.value || DEFAULT_OPENAI_VOICE).trim().toLowerCase());
    safeLocalStorageSet(OPENAI_VOICE_STORAGE_KEY, voiceOption.id);
    setOpenAiVoice(voiceOption.id, { persist: false });
    setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
    updateProviderSettingsUi();
    showToast(hasWorkspaceBridgeAccess() ? "OpenAI settings saved." : "OpenAI saved. Enable the local bridge before using it.", hasWorkspaceBridgeAccess() ? "success" : "warning");
    return true;
}

providerChoiceButtons.forEach(button => {
    button.addEventListener("click", () => {
        const provider = normalizeAiProvider(button.dataset.aiProvider);
        setActiveAiProvider(provider, { refreshStatus: false });
        if (provider === AI_PROVIDER_OPENAI && !getOpenAiApiKey()) {
            showToast("Add an OpenAI API key to use this provider.", "warning");
        } else if (provider === AI_PROVIDER_OPENAI && !hasWorkspaceBridgeAccess()) {
            showToast("Enable the Local Workspace Bridge before using OpenAI.", "warning");
        }
    });
});

localModelsRefreshBtn?.addEventListener("click", async () => {
    showToast("Refreshing local Ollama models...", "info");
    await checkOllamaStatus();
});

localTaskModelsResetBtn?.addEventListener("click", resetLocalTaskModels);

localTaskModelsInstallBtn?.addEventListener("click", () => {
    void installMissingTaskOllamaModels();
});

localModelsStartBtn?.addEventListener("click", () => {
    void startOllamaHttpService({ remember: true });
});

localModelsInstallBtn?.addEventListener("click", () => {
    installMissingOllamaModels();
});

localVoiceInstallBtn?.addEventListener("click", () => {
    void installLocalVoicePipeline();
});

openAiSaveBtn?.addEventListener("click", () => {
    saveOpenAiSettings();
});

document.getElementById("providerKeyReveal")?.addEventListener("click", function() {
    const input = document.getElementById("openAiApiKeyInput");
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    this.classList.toggle("revealed", show);
});

openAiClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(OPENAI_API_KEY_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_CHAT_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_REASONING_MODE_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_IMAGE_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_TRANSCRIPTION_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_SPEECH_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_REALTIME_MODEL_STORAGE_KEY);
    safeLocalStorageRemove(OPENAI_VOICE_STORAGE_KEY);
    setActiveAiProvider(AI_PROVIDER_LOCAL, { refreshStatus: false });
    updateProviderSettingsUi();
    showToast("OpenAI settings cleared.", "info");
});

openAiTestBtn?.addEventListener("click", async () => {
    if (!getOpenAiApiKey()) {
        showToast("Save an OpenAI API key before testing.", "error");
        setOpenAiSettingsStatus("Key needed", "missing");
        return;
    }

    try {
        await checkOpenAiStatus();
        showToast("OpenAI API reachable.", "success");
    } catch (err) {
        showToast(`OpenAI test failed: ${err.message}`, "error");
    }
});

function updateWanSettingsUi() {
    const endpoint = getWanVideoBaseUrl();
    const workflow = safeLocalStorageGet(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
    if (wanEndpointInput) wanEndpointInput.value = endpoint;
    if (wanWorkflowInput) wanWorkflowInput.value = workflow || "";
    if (wanStatus) {
        wanStatus.textContent = workflow ? "Configured" : "Not set";
        wanStatus.dataset.state = workflow ? "configured" : "missing";
    }
    updateWanSaveButtonState();
}

function setWorkspaceBridgeStatus(text, state = "missing") {
    if (!workspaceBridgeStatus) return;
    workspaceBridgeStatus.textContent = text;
    workspaceBridgeStatus.dataset.state = state;
}

function getWorkspaceAccessPolicyLabel(policy = getEffectiveWorkspaceAccessPolicy()) {
    return policy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE ? "Full machine" : "Output only";
}

function getWorkspaceAccessPolicyStatusState(policy = getEffectiveWorkspaceAccessPolicy()) {
    return policy === WORKSPACE_ACCESS_POLICY_FULL_MACHINE ? "missing" : "configured";
}

function updateWorkspaceAccessPolicyUi(policy = getEffectiveWorkspaceAccessPolicy()) {
    const isDesktop = isFaunaDesktopApp();
    if (workspaceAccessPolicySection) workspaceAccessPolicySection.hidden = !isDesktop;
    if (workspaceAccessPolicyStatus) {
        workspaceAccessPolicyStatus.textContent = isDesktop ? getWorkspaceAccessPolicyLabel(policy) : "Desktop only";
        workspaceAccessPolicyStatus.dataset.state = isDesktop ? getWorkspaceAccessPolicyStatusState(policy) : "missing";
    }
    workspaceAccessPolicyButtons.forEach(button => {
        const active = button.dataset.workspaceAccessPolicy === policy;
        button.setAttribute("aria-pressed", String(active));
        button.disabled = !isDesktop;
    });
}

function updateWorkspaceBridgeSettingsUi() {
    const endpoint = getWorkspaceBridgeBaseUrl();
    const token = getWorkspaceBridgeToken();
    const policy = getEffectiveWorkspaceAccessPolicy();
    if (workspaceBridgeEndpointInput) workspaceBridgeEndpointInput.value = endpoint;
    if (workspaceBridgeTokenInput) workspaceBridgeTokenInput.value = token;
    if (toggleWorkspaceBridge) toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;
    updateWorkspaceAccessPolicyUi(policy);

    if (!token) {
        setWorkspaceBridgeStatus("Token needed", "missing");
    } else if (isWorkspaceBridgeEnabled) {
        setWorkspaceBridgeStatus(isFaunaDesktopApp() ? `Auto-started · ${getWorkspaceAccessPolicyLabel(policy)}` : "Ready", "configured");
    } else {
        setWorkspaceBridgeStatus("Saved off", "missing");
    }
    updateWorkspaceBridgeSaveButtonState();
    updateVoiceButtonAvailability();
}

async function applyWorkspaceAccessPolicy(policy) {
    const normalized = normalizeWorkspaceAccessPolicy(policy);
    if (!isFaunaDesktopApp()) {
        showToast("Desktop agent access policy is available in the desktop app only.", "warning");
        return;
    }

    safeLocalStorageSet(WORKSPACE_ACCESS_POLICY_STORAGE_KEY, normalized);
    updateWorkspaceAccessPolicyUi(normalized);
    setWorkspaceBridgeStatus("Restarting bridge...", "missing");
    try {
        const info = await getFaunaDesktopApi()?.setWorkspaceAccessPolicy?.(normalized);
        if (info?.bridgeEndpoint) {
            safeLocalStorageSet(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY, info.bridgeEndpoint);
        }
        safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "true");
        isWorkspaceBridgeEnabled = true;
        updateWorkspaceBridgeSettingsUi();
        updateProviderSettingsUi();
        showToast(`Desktop agent access set to ${getWorkspaceAccessPolicyLabel(normalized)}.`, normalized === WORKSPACE_ACCESS_POLICY_FULL_MACHINE ? "warning" : "success");
    } catch (err) {
        updateWorkspaceBridgeSettingsUi();
        showToast(`Could not change desktop agent access: ${err.message}`, "error");
    }
}

workspaceBridgeSaveBtn?.addEventListener("click", () => {
    const endpoint = normalizeEndpointInputValue(workspaceBridgeEndpointInput?.value, DEFAULT_WORKSPACE_BRIDGE_URL);
    const token = (workspaceBridgeTokenInput?.value || "").trim();

    if (!token) {
        showToast("Paste the bridge token before saving.", "error");
        setWorkspaceBridgeStatus("Token needed", "missing");
        return;
    }

    safeLocalStorageSet(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY, endpoint);
    safeLocalStorageSet(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY, token);
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "true");
    isWorkspaceBridgeEnabled = true;
    updateWorkspaceBridgeSettingsUi();
    updateProviderSettingsUi();
    showToast("Workspace bridge saved and enabled.", "success");
});

workspaceBridgeClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY);
    safeLocalStorageRemove(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY);
    safeLocalStorageSet(WORKSPACE_BRIDGE_ENABLED_STORAGE_KEY, "false");
    isWorkspaceBridgeEnabled = false;
    updateWorkspaceBridgeSettingsUi();
    updateProviderSettingsUi();
    showToast("Workspace bridge cleared.", "info");
});

workspaceBridgeTestBtn?.addEventListener("click", async () => {
    const endpoint = (workspaceBridgeEndpointInput?.value || getWorkspaceBridgeBaseUrl()).trim().replace(/\/+$/, "") || DEFAULT_WORKSPACE_BRIDGE_URL;
    const token = (workspaceBridgeTokenInput?.value || getWorkspaceBridgeToken()).trim();

    if (!token) {
        showToast("Paste the bridge token before testing.", "error");
        setWorkspaceBridgeStatus("Token needed", "missing");
        return;
    }

    setWorkspaceBridgeStatus("Testing...", "missing");

    try {
        const res = await fetch(`${endpoint}/health`, {
            method: "GET",
            headers: {
                [WORKSPACE_BRIDGE_TOKEN_HEADER]: token,
                [LEGACY_WORKSPACE_BRIDGE_TOKEN_HEADER]: token
            }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
        setWorkspaceBridgeStatus("Reachable", "configured");
        showToast("Workspace bridge reachable.", "success");
    } catch (err) {
        setWorkspaceBridgeStatus("Offline", "missing");
        showToast(`Workspace bridge test failed: ${err.message}`, "error");
    }
});

workspaceAccessPolicyButtons.forEach(button => {
    button.addEventListener("click", () => {
        void applyWorkspaceAccessPolicy(button.dataset.workspaceAccessPolicy);
    });
});

wanSaveBtn?.addEventListener("click", () => {
    const endpoint = normalizeEndpointInputValue(wanEndpointInput?.value, DEFAULT_WAN_VIDEO_BASE_URL);
    const workflowText = (wanWorkflowInput?.value || "").trim();

    if (!workflowText) {
        showToast("Paste a ComfyUI workflow JSON before saving.", "error");
        return;
    }

    try {
        JSON.parse(workflowText);
    } catch (err) {
        showToast(`Invalid workflow JSON: ${err.message}`, "error");
        return;
    }

    safeLocalStorageSet(WAN_VIDEO_ENDPOINT_STORAGE_KEY, endpoint || DEFAULT_WAN_VIDEO_BASE_URL);
    safeLocalStorageSet(WAN_VIDEO_WORKFLOW_STORAGE_KEY, workflowText);
    updateWanSettingsUi();
    showToast("Wan settings saved.", "success");
});

wanClearBtn?.addEventListener("click", () => {
    safeLocalStorageRemove(WAN_VIDEO_ENDPOINT_STORAGE_KEY);
    safeLocalStorageRemove(WAN_VIDEO_WORKFLOW_STORAGE_KEY);
    updateWanSettingsUi();
    showToast("Wan settings cleared.", "info");
});

wanTestBtn?.addEventListener("click", async () => {
    const endpoint = (wanEndpointInput?.value || DEFAULT_WAN_VIDEO_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_WAN_VIDEO_BASE_URL;
    if (wanStatus) wanStatus.textContent = "Testing...";

    try {
        const res = await fetch(`${endpoint}/system_stats`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (wanStatus) {
            wanStatus.textContent = "Reachable";
            wanStatus.dataset.state = "configured";
        }
        showToast("ComfyUI endpoint reachable.", "success");
    } catch (err) {
        if (wanStatus) {
            wanStatus.textContent = "Offline";
            wanStatus.dataset.state = "missing";
        }
        showToast(`ComfyUI test failed: ${err.message}`, "error");
    }
});

renderLocalModelChoices();
updateProviderSettingsUi();
updateWanSettingsUi();
updateWorkspaceBridgeSettingsUi();
updateMemorySettingsUi();
updatePersonaSettingsUi();
scheduleOllamaStartupCheck();
scheduleOnboardingPrompt();

setChatHistoryCollapsed(isChatHistoryCollapsed, { persist: false });
setArchivedChatHistoryCollapsed(isArchivedChatHistoryCollapsed, { persist: false });
chatHistoryToggle?.addEventListener("click", () => {
    setChatHistoryCollapsed(!isChatHistoryCollapsed);
});
archivedChatToggle?.addEventListener("click", () => {
    setArchivedChatHistoryCollapsed(!isArchivedChatHistoryCollapsed);
});

newChatBtn.onclick = event => {
    event?.stopPropagation?.();
    if (typeof startNewChatComposerProjectPicker === "function") {
        startNewChatComposerProjectPicker();
        return;
    }
    startNewChatSession();
};
newNormalChatBtn?.addEventListener("click", () => {
    startNewChatSession({ notify: true });
});
focusComposerInput();

// Initialize Token Count visually
updateTokenDisplay();

