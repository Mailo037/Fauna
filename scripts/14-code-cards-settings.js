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
        if (isGenerating || !canUseComposerTools()) {
            toolsDropdown.classList.remove("open");
            if (!isGenerating && !canUseComposerTools()) {
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
    scheduleAnimatedSegmentIndicators();
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
    if (event.target.closest("[data-settings-close]")) {
        closeSettingsModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
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

function saveLocalTranscriptionCacheEntry(cacheKey, text, blob) {
    if (!isAiCachingEnabled || !cacheKey || !String(text || "").trim()) return;
    const cache = pruneOpenAiTranscriptionCache(readOpenAiTranscriptionCache());
    cache[cacheKey] = {
        provider: "local",
        engine: getLocalVoiceTranscription(),
        endpoint: getLocalVoiceTranscriptionEndpoint(),
        model: getLocalVoiceTranscriptionModel(),
        type: blob?.type || "audio/webm",
        size: Number(blob?.size || 0) || 0,
        text: String(text || "").trim(),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
    };
    safeLocalStorageSet(OPENAI_TRANSCRIPTION_CACHE_STORAGE_KEY, JSON.stringify(pruneOpenAiTranscriptionCache(cache)));
}

function saveOpenAiTranscriptionCacheEntry(cacheKey, text, blob) {
    if (!isAiCachingEnabled || !cacheKey || !String(text || "").trim()) return;
    const cache = pruneOpenAiTranscriptionCache(readOpenAiTranscriptionCache());
    cache[cacheKey] = {
        model: getOpenAiTranscriptionModel(),
        type: blob?.type || "audio/webm",
        size: Number(blob?.size || 0) || 0,
        text: String(text || "").trim(),
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
updateLocalVoiceSettingsUi();

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

async function pullOllamaModel(modelId) {
    const res = await fetch(OLLAMA_PULL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelId, stream: false })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
        throw new Error(data.error || `Ollama responded with HTTP ${res.status}`);
    }
    return data;
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

async function installMissingOllamaModels() {
    if (localModelsInstallBtn) localModelsInstallBtn.disabled = true;
    if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = true;
    try {
        await checkOllamaStatus();
        if (!isOllamaReachable) {
            const installed = await installOllamaWithApproval();
            if (!installed) return;
            await checkOllamaStatus();
            if (!isOllamaReachable) return;
        }

        const missing = REQUIRED_OLLAMA_MODELS.filter(model => !isOllamaModelInstalled(model));
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

        for (const modelId of missing) {
            setLocalModelsStatus(`Pulling ${modelId}`, "missing");
            showToast(`Pulling ${modelId} from Ollama...`, "info");
            await pullOllamaModel(modelId);
        }

        await checkOllamaStatus();
        showToast("Missing Ollama models installed.", "success");
    } catch (err) {
        setLocalModelsStatus("Install failed", "missing");
        showToast(`Model install failed: ${err.message}`, "error");
    } finally {
        if (localModelsInstallBtn) localModelsInstallBtn.disabled = false;
        if (localModelsRefreshBtn) localModelsRefreshBtn.disabled = false;
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

localModelsInstallBtn?.addEventListener("click", () => {
    installMissingOllamaModels();
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

function updateWorkspaceBridgeSettingsUi() {
    const endpoint = getWorkspaceBridgeBaseUrl();
    const token = getWorkspaceBridgeToken();
    if (workspaceBridgeEndpointInput) workspaceBridgeEndpointInput.value = endpoint;
    if (workspaceBridgeTokenInput) workspaceBridgeTokenInput.value = token;
    if (toggleWorkspaceBridge) toggleWorkspaceBridge.checked = isWorkspaceBridgeEnabled;

    if (!token) {
        setWorkspaceBridgeStatus("Token needed", "missing");
    } else if (isWorkspaceBridgeEnabled) {
        setWorkspaceBridgeStatus(isFaunaDesktopApp() ? "Auto-started" : "Ready", "configured");
    } else {
        setWorkspaceBridgeStatus("Saved off", "missing");
    }
    updateWorkspaceBridgeSaveButtonState();
    updateVoiceButtonAvailability();
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

setChatHistoryCollapsed(isChatHistoryCollapsed, { persist: false });
setArchivedChatHistoryCollapsed(isArchivedChatHistoryCollapsed, { persist: false });
chatHistoryToggle?.addEventListener("click", () => {
    setChatHistoryCollapsed(!isChatHistoryCollapsed);
});
archivedChatToggle?.addEventListener("click", () => {
    setArchivedChatHistoryCollapsed(!isArchivedChatHistoryCollapsed);
});

newChatBtn.onclick = () => startNewChatSession();
focusComposerInput();

// Initialize Token Count visually
updateTokenDisplay();

