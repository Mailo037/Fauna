// Original script.js lines 8911-10708.
function createLibraryPickerItem(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-picker-item";
    button.dataset.libraryPickerItemId = item.id;
    button.setAttribute("aria-pressed", String(libraryPickerSelectedIds.has(item.id)));
    button.setAttribute("aria-label", `Select ${item.title}`);

    const check = document.createElement("span");
    check.className = "library-picker-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;

    const body = document.createElement("span");
    body.className = "library-picker-item-body";
    const title = document.createElement("span");
    title.className = "library-picker-item-title";
    title.textContent = item.title || getLibraryItemKindLabel(item);
    const detail = document.createElement("span");
    detail.className = "library-picker-item-detail";
    detail.textContent = item.detail || item.sessionTitle || getLibraryItemKindLabel(item);
    const meta = document.createElement("span");
    meta.className = "library-picker-item-meta";
    meta.textContent = `${getLibraryItemKindLabel(item)} · ${formatLibraryItemDate(item)}`;
    body.append(title, detail, meta);

    button.append(createLibraryPickerPreview(item), check, body);
    button.addEventListener("click", () => toggleLibraryPickerSelection(item.id));
    return button;
}

function renderLibraryPicker() {
    if (!libraryPickerGrid || !libraryPickerEmpty) return;
    const items = getLibraryPickerItems();
    const validIds = new Set(collectLibraryItems().map(item => item.id));
    libraryPickerSelectedIds = new Set(Array.from(libraryPickerSelectedIds).filter(id => validIds.has(id)));

    libraryPickerGrid.replaceChildren();
    items.forEach(item => libraryPickerGrid.appendChild(createLibraryPickerItem(item)));
    const isEmpty = items.length === 0;
    libraryPickerGrid.hidden = isEmpty;
    libraryPickerEmpty.hidden = !isEmpty;
    updateLibraryPickerSelectionUi();
    scheduleAnimatedSegmentIndicators();
}

function openLibraryPickerModal({ attachmentTarget = "main" } = {}) {
    if (!libraryPickerModal) return;
    if (!canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    if (activeChatHasContent()) saveCurrentSession({ render: false });
    closeAttachmentMenu();
    if (typeof closeProjectPageChatAttachmentMenu === "function") closeProjectPageChatAttachmentMenu();
    libraryPickerAttachmentTarget = attachmentTarget === "projectPageChat" ? "projectPageChat" : "main";
    libraryPickerReturnFocus = document.activeElement instanceof HTMLElement && !libraryPickerModal.contains(document.activeElement)
        ? document.activeElement
        : libraryPickerAttachmentTarget === "projectPageChat"
            ? projectPageChatUploadButton
            : uploadButton;
    libraryPickerSelectedIds = new Set();
    libraryPickerQuery = "";
    libraryPickerTypeFilter = LIBRARY_PICKER_TYPE_ALL;
    libraryPickerSortOrder = LIBRARY_PICKER_SORT_NEWEST;
    if (libraryPickerSearch) libraryPickerSearch.value = "";
    libraryPickerModal.hidden = false;
    libraryPickerModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("library-picker-open");
    setLibraryPickerTypeFilter(libraryPickerTypeFilter);
    setLibraryPickerSortOrder(libraryPickerSortOrder);
    renderLibraryPicker();
    scheduleAnimatedSegmentIndicators();
    window.setTimeout(() => libraryPickerSearch?.focus({ preventScroll: true }), 0);
}

function closeLibraryPickerModal() {
    if (!libraryPickerModal || libraryPickerModal.hidden) return;
    const activeElement = document.activeElement;
    libraryPickerModal.hidden = true;
    libraryPickerModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("library-picker-open");
    libraryPickerSelectedIds = new Set();
    updateLibraryPickerSelectionUi();
    if (activeElement instanceof HTMLElement && libraryPickerModal.contains(activeElement)) {
        const focusTarget = libraryPickerReturnFocus && document.contains(libraryPickerReturnFocus)
            ? libraryPickerReturnFocus
            : libraryPickerAttachmentTarget === "projectPageChat"
                ? projectPageChatUploadButton || projectPageChatInput
                : uploadButton || input;
        focusTarget?.focus?.({ preventScroll: true });
    }
    libraryPickerReturnFocus = null;
    libraryPickerAttachmentTarget = "main";
}

function getLibrarySelectionKey(item) {
    return getLibraryItemPersistentKey(item);
}

function pruneLibrarySelection(items = collectLibraryItems()) {
    const validKeys = new Set(items.map(getLibrarySelectionKey));
    selectedLibraryItemKeys = new Set(
        Array.from(selectedLibraryItemKeys).filter(key => validKeys.has(key))
    );
}

function getSelectedLibraryItems() {
    const selected = [];
    const seen = new Set();
    collectLibraryItems().forEach(item => {
        const key = getLibrarySelectionKey(item);
        if (!selectedLibraryItemKeys.has(key) || seen.has(key)) return;
        seen.add(key);
        selected.push(item);
    });
    return selected;
}

function updateLibrarySelectionUi(items = collectLibraryItems(), filteredItems = getFilteredLibraryItems(items)) {
    pruneLibrarySelection(items);
    const selectedCount = selectedLibraryItemKeys.size;
    const visibleKeys = filteredItems.map(getLibrarySelectionKey);
    const hasVisibleItems = visibleKeys.length > 0;
    const allVisibleSelected = hasVisibleItems && visibleKeys.every(key => selectedLibraryItemKeys.has(key));

    if (librarySelectionCount) {
        librarySelectionCount.textContent = `${selectedCount.toLocaleString()} selected`;
    }
    if (librarySelectVisibleButton) {
        librarySelectVisibleButton.disabled = !hasVisibleItems || allVisibleSelected;
    }
    if (libraryClearSelectionButton) {
        const hasSelection = selectedCount > 0;
        libraryClearSelectionButton.hidden = !hasSelection;
        libraryClearSelectionButton.disabled = !hasSelection;
    }
    if (libraryDeleteSelectedButton) {
        const hasSelection = selectedCount > 0;
        libraryDeleteSelectedButton.hidden = !hasSelection;
        libraryDeleteSelectedButton.disabled = !hasSelection;
        libraryDeleteSelectedButton.textContent = selectedCount > 0 ? `Delete ${selectedCount.toLocaleString()}` : "Delete";
    }

    libraryGrid?.querySelectorAll("[data-library-item-key]").forEach(card => {
        const selected = selectedLibraryItemKeys.has(card.dataset.libraryItemKey);
        card.classList.toggle("selected", selected);
        const selectButton = card.querySelector(".library-card-select");
        selectButton?.classList.toggle("selected", selected);
        selectButton?.setAttribute("aria-pressed", String(selected));
        selectButton?.setAttribute("aria-label", selected ? "Deselect Library item" : "Select Library item");
        if (selectButton) selectButton.dataset.tooltip = selected ? "Deselect" : "Select";
    });
}

function toggleLibraryItemSelection(item) {
    const key = getLibrarySelectionKey(item);
    if (!key) return;
    if (selectedLibraryItemKeys.has(key)) {
        selectedLibraryItemKeys.delete(key);
    } else {
        selectedLibraryItemKeys.add(key);
    }
    updateLibrarySelectionUi();
}

function selectVisibleLibraryItems() {
    const items = getFilteredLibraryItems(collectLibraryItems());
    items.forEach(item => selectedLibraryItemKeys.add(getLibrarySelectionKey(item)));
    updateLibrarySelectionUi();
}

function clearLibrarySelection() {
    selectedLibraryItemKeys = new Set();
    updateLibrarySelectionUi();
}

function getLibraryDeleteDetails(items) {
    const labels = items.slice(0, 4).map(item => item.title || getLibraryItemKindLabel(item));
    if (items.length > labels.length) {
        labels.push(`${items.length - labels.length} more`);
    }
    return labels;
}

async function deleteLibraryItems(items = []) {
    const uniqueItems = [];
    const keys = new Set();
    items.forEach(item => {
        const key = getLibrarySelectionKey(item);
        if (!item || !key || keys.has(key)) return;
        keys.add(key);
        uniqueItems.push(item);
    });
    if (uniqueItems.length === 0) return;

    const approved = await showApprovalDialog({
        title: uniqueItems.length === 1 ? "Delete Library item?" : `Delete ${uniqueItems.length} Library items?`,
        message: "This removes the selection from Library. Chat messages stay unchanged.",
        details: getLibraryDeleteDetails(uniqueItems),
        confirmLabel: uniqueItems.length === 1 ? "Delete item" : `Delete ${uniqueItems.length} items`,
        cancelLabel: "Cancel"
    });
    if (!approved) return;

    const openAiCleanupResult = await deleteOpenAiFilesForLibraryKeys(keys);
    keys.forEach(key => deletedLibraryItemKeys.add(key));
    persistedLibraryItems = persistedLibraryItems.filter(item => !keys.has(getLibrarySelectionKey(item)));
    selectedLibraryItemKeys = new Set(Array.from(selectedLibraryItemKeys).filter(key => !keys.has(key)));
    libraryPickerSelectedIds = new Set(
        Array.from(libraryPickerSelectedIds).filter(id => !uniqueItems.some(item => item.id === id))
    );

    const deletedKeysSaved = persistDeletedLibraryItemKeys();
    const storedItemsSaved = persistStoredLibraryItems();
    renderLibraryView();
    if (libraryPickerModal && !libraryPickerModal.hidden) renderLibraryPicker();

    const label = uniqueItems.length === 1 ? "item" : "items";
    const cleanupMessage = getOpenAiCacheCleanupMessage(openAiCleanupResult);
    const saved = deletedKeysSaved && storedItemsSaved && openAiCleanupResult.failed === 0;
    showToast(
        saved
            ? `Deleted ${uniqueItems.length.toLocaleString()} Library ${label}.`
            : `Deleted ${uniqueItems.length.toLocaleString()} Library ${label}, but the change may not fully persist after reload.${cleanupMessage}`,
        saved ? "success" : "warning"
    );
}

function deleteSelectedLibraryItems() {
    void deleteLibraryItems(getSelectedLibraryItems());
}

function createLibrarySelectButton(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-card-select";
    button.setAttribute("aria-pressed", String(selectedLibraryItemKeys.has(getLibrarySelectionKey(item))));
    button.setAttribute("aria-label", "Select Library item");
    button.dataset.tooltip = "Select";
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5"></path>
        </svg>
    `;
    button.addEventListener("click", event => {
        event.stopPropagation();
        toggleLibraryItemSelection(item);
    });
    return button;
}

function prepareLibraryCard(card, item) {
    const key = getLibrarySelectionKey(item);
    card.dataset.libraryItemKey = key;
    card.classList.toggle("selected", selectedLibraryItemKeys.has(key));
    card.prepend(createLibrarySelectButton(item));
    return card;
}

function createLibraryActionButton(label, iconMarkup) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-card-action";
    button.setAttribute("aria-label", label);
    button.dataset.tooltip = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconMarkup}</svg><span>${label}</span>`;
    return button;
}

function createLibraryDeleteButton(item) {
    const deleteBtn = createLibraryActionButton("Delete", '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>');
    deleteBtn.classList.add("library-card-action-danger");
    deleteBtn.addEventListener("click", () => {
        void deleteLibraryItems([item]);
    });
    return deleteBtn;
}

function appendLibraryCardMeta(card, item) {
    const body = document.createElement("div");
    body.className = "library-card-body";
    const title = document.createElement("h2");
    title.textContent = item.title;
    const detail = document.createElement("p");
    detail.textContent = item.detail || item.sessionTitle;
    const meta = document.createElement("div");
    meta.className = "library-card-meta";
    meta.textContent = item.sessionTitle;
    body.append(title, detail, meta);
    card.appendChild(body);
}

function renderLibraryImageCard(item) {
    const card = document.createElement("article");
    card.className = `library-card library-media-card library-${item.origin}-image`;
    prepareLibraryCard(card, item);

    const mediaButton = document.createElement("button");
    mediaButton.type = "button";
    mediaButton.className = "library-media-button";
    mediaButton.setAttribute("aria-label", `Open ${item.title}`);
    mediaButton.addEventListener("click", () => imageLightboxController.open(item.src));

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || item.title;
    img.loading = "lazy";
    img.decoding = "async";
    mediaButton.appendChild(img);
    card.appendChild(mediaButton);
    appendLibraryCardMeta(card, item);

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    const openBtn = createLibraryActionButton("Open", '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path>');
    openBtn.addEventListener("click", () => imageLightboxController.open(item.src));
    const copyBtn = createLibraryActionButton("Copy", '<rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect>');
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, item.src));
    actions.append(openBtn, copyBtn, createLibraryDeleteButton(item));
    card.appendChild(actions);
    return card;
}

function renderLibraryVideoCard(item) {
    const card = document.createElement("article");
    card.className = "library-card library-media-card library-video-item";
    prepareLibraryCard(card, item);
    const video = document.createElement("video");
    video.className = "library-video";
    video.src = item.src;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    card.appendChild(video);
    appendLibraryCardMeta(card, item);

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    const copyBtn = createLibraryActionButton("Copy", '<rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect>');
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, item.src));
    const downloadLink = document.createElement("a");
    downloadLink.className = "library-card-action";
    downloadLink.href = item.src;
    downloadLink.download = "fauna-video.mp4";
    downloadLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg><span>Download</span>';
    actions.append(copyBtn, downloadLink, createLibraryDeleteButton(item));
    card.appendChild(actions);
    return card;
}

function renderLibraryCodeCard(item) {
    const card = document.createElement("article");
    card.className = "library-card library-code-card";
    prepareLibraryCard(card, item);
    const preview = document.createElement("pre");
    preview.className = "library-code-preview";
    const previewLines = item.code.split("\n").slice(0, 14).join("\n");
    preview.textContent = previewLines;
    card.appendChild(preview);
    appendLibraryCardMeta(card, item);

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    const openBtn = createLibraryActionButton("Open", '<path d="M3 5h18"></path><path d="M5 5v14h14V5"></path><path d="m8 13 2 2 4-6"></path>');
    openBtn.addEventListener("click", () => {
        openCodeBlocksInWorkbench([{
            lang: item.lang,
            code: item.code,
            kind: item.kind
        }], {
            title: item.title,
            subtitle: item.sessionTitle,
            initialMode: item.kind ? "preview" : "code",
            downloadText: item.code,
            downloadName: item.fileName || getCodeDownloadName(item.lang, item.kind),
            downloadMime: item.kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
        });
    });
    const copyBtn = createLibraryActionButton("Copy", '<rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect>');
    copyBtn.addEventListener("click", () => handleCopyButton(copyBtn, item.code));
    const downloadBtn = createLibraryActionButton("Download", '<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>');
    downloadBtn.addEventListener("click", () => {
        downloadTextFile(item.code, item.fileName || getCodeDownloadName(item.lang, item.kind));
        showToast("Download started.", "success");
    });
    actions.append(openBtn, copyBtn, downloadBtn, createLibraryDeleteButton(item));
    card.appendChild(actions);
    return card;
}

function renderLibraryItem(item) {
    if (item.type === "image") return renderLibraryImageCard(item);
    if (item.type === "video") return renderLibraryVideoCard(item);
    return renderLibraryCodeCard(item);
}

function renderLibraryView() {
    if (!libraryView || !libraryGrid || !libraryEmpty) return;
    const items = collectLibraryItems();
    const filteredItems = getFilteredLibraryItems(items);
    pruneLibrarySelection(items);
    setLibraryHeaderSummary(items);
    renderLibraryStats(items);
    updateLibraryLayoutControls();
    applyLibraryLayoutToGrid();

    libraryGrid.replaceChildren();
    filteredItems.forEach(item => libraryGrid.appendChild(renderLibraryItem(item)));
    const isEmpty = filteredItems.length === 0;
    libraryGrid.hidden = isEmpty;
    libraryEmpty.hidden = !isEmpty;
    updateLibrarySelectionUi(items, filteredItems);
}

function refreshLibraryViewIfActive() {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) renderLibraryView();
}

function safelyDecodeFragment(value = "") {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getChatUrlFragment() {
    return activeSessionId
        ? `${WORKSPACE_URL_FRAGMENT_CHAT}=${encodeURIComponent(activeSessionId)}`
        : WORKSPACE_URL_FRAGMENT_CHAT;
}

function getWorkspaceUrlFragment() {
    return activeWorkspaceView === WORKSPACE_VIEW_LIBRARY
        ? WORKSPACE_URL_FRAGMENT_LIBRARY
        : getChatUrlFragment();
}

function updateWorkspaceUrlFragment({ replace = false } = {}) {
    if (!window.history?.pushState || !window.location) return;
    const nextHash = `#${getWorkspaceUrlFragment()}`;
    if (window.location.hash === nextHash) return;

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = nextHash;
    const historyMethod = replace ? "replaceState" : "pushState";
    try {
        window.history[historyMethod](window.history.state, "", nextUrl);
    } catch (err) {
        console.warn("Could not update Fauna URL fragment:", err);
    }
}

function parseWorkspaceUrlFragment() {
    const rawFragment = String(window.location.hash || "").replace(/^#/, "").trim();
    if (!rawFragment) return null;

    const fragment = safelyDecodeFragment(rawFragment);
    const normalizedFragment = fragment.toLowerCase();
    if (normalizedFragment === WORKSPACE_URL_FRAGMENT_LIBRARY) {
        return { view: WORKSPACE_VIEW_LIBRARY, sessionId: "" };
    }
    if (normalizedFragment === WORKSPACE_URL_FRAGMENT_CHAT || normalizedFragment === WORKSPACE_VIEW_PLAYGROUND) {
        return { view: WORKSPACE_VIEW_PLAYGROUND, sessionId: "" };
    }

    const chatMatch = fragment.match(/^chat(?:=|:|\/)(.+)$/i);
    if (chatMatch) {
        return {
            view: WORKSPACE_VIEW_PLAYGROUND,
            sessionId: safelyDecodeFragment(chatMatch[1]).trim()
        };
    }

    return null;
}

function applyWorkspaceUrlFragment({ normalize = false } = {}) {
    const route = parseWorkspaceUrlFragment();
    let shouldNormalize = normalize;

    if (route?.view === WORKSPACE_VIEW_LIBRARY) {
        setWorkspaceView(WORKSPACE_VIEW_LIBRARY, { closeSidebar: false, updateUrl: false });
    } else if (route?.view === WORKSPACE_VIEW_PLAYGROUND) {
        if (route.sessionId && chatSessions.some(session => session.id === route.sessionId && !session.archived)) {
            activateChatSession(route.sessionId, { captureCurrent: false, closeSidebar: false, updateUrl: false });
        } else {
            setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { closeSidebar: false, updateUrl: false });
            shouldNormalize = shouldNormalize || Boolean(route.sessionId);
        }
    } else if (window.location.hash) {
        shouldNormalize = true;
    }

    if (shouldNormalize) updateWorkspaceUrlFragment({ replace: true });
}

function setWorkspaceView(view, { focusComposer = false, closeSidebar = true, updateUrl = true, urlMode = "push" } = {}) {
    const nextView = view === WORKSPACE_VIEW_LIBRARY ? WORKSPACE_VIEW_LIBRARY : WORKSPACE_VIEW_PLAYGROUND;
    const previousView = activeWorkspaceView;
    if (nextView === WORKSPACE_VIEW_LIBRARY && activeChatHasContent()) {
        saveCurrentSession({ render: false, updateUrl });
    }
    activeWorkspaceView = nextView;
    document.body?.classList.toggle("library-view-active", activeWorkspaceView === WORKSPACE_VIEW_LIBRARY);
    setWorkspaceNavState(activeWorkspaceView);

    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        closeCodeWorkbench();
        closeChatSessionMenus();
        setChatTitleEditing(false);
        if (libraryView) {
            libraryView.hidden = false;
            libraryView.setAttribute("aria-hidden", "false");
        }
        if (welcome) welcome.style.display = "none";
        if (chat) chat.style.display = "none";
        if (inputWrapper) inputWrapper.hidden = true;
        if (chatTitle) chatTitle.textContent = "Library";
        if (chatTitleEditBtn) chatTitleEditBtn.hidden = true;
        updateActiveChatTitle();
        renderLibraryView();
    } else {
        let restoredActiveSessionFromViewSwitch = false;
        if (libraryView) {
            libraryView.hidden = true;
            libraryView.setAttribute("aria-hidden", "true");
        }
        if (inputWrapper) inputWrapper.hidden = false;
        if (previousView !== WORKSPACE_VIEW_PLAYGROUND && activeSessionId) {
            const activeSession = getChatSessionById(activeSessionId);
            if (activeSession) {
                clearUnreadGenerationCompletion?.(activeSessionId, { renderHistory: false });
                restoreChatSessionToView(activeSession, { closeWorkbench: false });
                restoredActiveSessionFromViewSwitch = true;
            }
        }
        if (chat) chat.style.display = activeChatHasContent() ? "block" : "none";
        if (welcome) welcome.style.display = activeChatHasContent() ? "none" : "flex";
        if (chatTitleEditBtn) chatTitleEditBtn.hidden = false;
        updateActiveChatTitle();
        updateTokenDisplay();
        renderPromptTimeline();
        if (focusComposer) focusComposerInput({ force: true });
        if (restoredActiveSessionFromViewSwitch) renderChatHistory();
    }

    if (closeSidebar) sidebarController.close();
    if (updateUrl) updateWorkspaceUrlFragment({ replace: urlMode === "replace" });
    renderPromptTimeline();
    window.setTimeout(() => {
        if (isFaunaDesktopApp()) {
            void refreshDesktopNavigationState();
        } else {
            applyWindowNavigationState();
        }
    }, 0);
    scheduleAnimatedSegmentIndicators();
}

function initializeChatSessions() {
    deletedLibraryItemKeys = readDeletedLibraryItemKeys();
    persistedLibraryItems = readStoredLibraryItems();
    openAiFileCache = readStoredOpenAiFileCache();
    workspaceProjects = readStoredWorkspaceProjects();
    chatSessions = readStoredChatSessions();
    initializeUsageEvents();
    const storedActiveId = safeLocalStorageGet(ACTIVE_CHAT_SESSION_STORAGE_KEY);
    renderProjectList();
    renderComposerProjectPicker();

    if (chatSessions.length === 0) {
        restoreEmptyChatDraft({ updateUrl: false });
        return;
    }

    const preferredSession =
        chatSessions.find(session => session.id === storedActiveId && !session.archived) ||
        chatSessions.find(session => !session.archived) ||
        chatSessions[0];
    activeSessionId = preferredSession.id;
    restoreChatSessionToView(preferredSession);
    persistChatSessions();
    renderChatHistory();
}

createThemeController({
    themeToggle,
    mobileThemeToggle,
    themeLabel,
    accentButtons,
    accentValue,
    storageKey: THEME_STORAGE_KEY,
    accentStorageKey: ACCENT_STORAGE_KEY
}).init();
stopButton?.addEventListener("click", cancelActiveGeneration);
updateTimeGreeting({ forceRandom: true });
window.setInterval(() => updateTimeGreeting(), GREETING_REFRESH_MS);

document.querySelectorAll(".suggestion-card[data-prompt]").forEach(card => {
    card.addEventListener("click", () => {
        if (isGenerating || isActiveChatArchived()) return;
        input.value = card.dataset.prompt || "";
        input.dispatchEvent(new Event("input"));
        input.focus();
    });
});

async function checkOllamaStatus() {
    hasCheckedOllamaStatus = true;
    setServiceStatus("checking", "Checking Ollama");
    setLocalModelsStatus("Checking", "missing");
    try {
        const res = await ollamaFetch(OLLAMA_TAGS_URL, { method: "GET", desktopTimeoutMs: 8000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        isOllamaReachable = true;
        installedOllamaModels = Array.isArray(data.models)
            ? data.models.map(model => normalizeModelId(model?.name || model?.model || model?.id)).filter(Boolean)
            : [];
        await refreshOllamaModelCapabilities(installedOllamaModels);
        localModelOptions = getLocalModelSwitcherOptions();
        renderLocalModelChoices();
        updateLocalTaskModelSelects();
        updateModelSwitcherForProvider();
        const modelCount = installedOllamaModels.length;
        const missingCount = getRequiredOllamaModels().filter(model => !isOllamaModelInstalled(model)).length;
        setServiceStatus("online", `Ollama connected · ${modelCount} models`);
        setLocalModelsStatus(missingCount > 0 ? `${missingCount} missing` : "Ready", missingCount > 0 ? "missing" : "configured");
    } catch (err) {
        const desktopStatus = await getDesktopOllamaStatus();
        isOllamaReachable = false;
        installedOllamaModels = [];
        await refreshOllamaModelCapabilities([]);
        localModelOptions = getLocalModelSwitcherOptions();
        renderLocalModelChoices();
        updateLocalTaskModelSelects();
        updateModelSwitcherForProvider();
        if (desktopStatus?.processRunning) {
            setServiceStatus("checking", "Ollama app running");
            setLocalModelsStatus("HTTP not ready", "missing");
        } else {
            setServiceStatus("offline", "Ollama offline");
            setLocalModelsStatus("Ollama offline", "missing");
        }
    }
    updateTokenDisplay();
}

async function checkOpenAiStatus() {
    if (!getOpenAiApiKey()) {
        availableOpenAiModelIds = null;
        updateModelSwitcherForProvider();
        setServiceStatus("offline", "OpenAI key needed");
        setOpenAiSettingsStatus("Key needed", "missing");
        return;
    }
    if (!hasWorkspaceBridgeAccess()) {
        availableOpenAiModelIds = null;
        updateModelSwitcherForProvider();
        setServiceStatus("offline", "OpenAI bridge needed");
        setOpenAiSettingsStatus("Bridge needed", "missing");
        throw new Error(OPENAI_BRIDGE_REQUIRED_MESSAGE);
    }

    setServiceStatus("checking", "Checking OpenAI");
    setOpenAiSettingsStatus("Testing...", "missing");

    try {
        const res = await openAiFetch("/models", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(formatOpenAiApiError(data, res.status));
        }
        availableOpenAiModelIds = new Set(
            (Array.isArray(data?.data) ? data.data : [])
                .map(model => normalizeModelId(model?.id))
                .filter(Boolean)
        );
        updateModelSwitcherForProvider();
        setServiceStatus("online", "OpenAI connected");
        setOpenAiSettingsStatus("Ready", "configured");
    } catch (err) {
        availableOpenAiModelIds = null;
        updateModelSwitcherForProvider();
        setServiceStatus("offline", "OpenAI offline");
        setOpenAiSettingsStatus("Offline", "missing");
        throw err;
    }
}

function updateActiveProviderStatus() {
    if (isOpenAiProvider()) {
        checkOpenAiStatus().catch(() => {});
        return;
    }
    checkOllamaStatus();
}

statusPill?.addEventListener("click", () => {
    updateActiveProviderStatus();
    showToast(isOpenAiProvider() ? "Checking OpenAI status..." : "Checking local Ollama status...", "info");
});

function updateModelSwitcherForProvider() {
    const applyModelOptions = (options, activeModel, config = {}) => {
        [modelSwitcher, projectPageChatModelSwitcher].forEach(switcher => {
            if (typeof switcher?.setModels === "function") {
                switcher.setModels(options, activeModel, config);
                return;
            }
            switcher?.setActive?.(activeModel);
        });
    };

    if (isOpenAiProvider()) {
        const activeOpenAiModel = getOpenAiChatModel();
        applyModelOptions(getOpenAiModelSwitcherOptions(), getOpenAiChatModel(), {
            reasoningModes: getOpenAiReasoningOptionsForModel(activeOpenAiModel),
            activeReasoning: getOpenAiReasoningMode(activeOpenAiModel)
        });
        updateComposerCapabilityUi();
        updateAiCallSettingsUi();
        return;
    }
    applyModelOptions(getLocalModelSwitcherOptions(), OLLAMA_MODEL, {
        reasoningModes: [],
        activeReasoning: ""
    });
    updateComposerCapabilityUi();
    updateAiCallSettingsUi();
}

function setActiveModel(model, option = {}) {
    const modelId = normalizeModelId(model);
    if (!modelId) return;

    if (isOpenAiProvider() || option.provider === AI_PROVIDER_OPENAI) {
        safeLocalStorageSet(OPENAI_CHAT_MODEL_STORAGE_KEY, modelId);
        const normalizedReasoning = getOpenAiReasoningMode(modelId);
        if (normalizedReasoning) {
            safeLocalStorageSet(OPENAI_REASONING_MODE_STORAGE_KEY, normalizedReasoning);
        } else {
            safeLocalStorageRemove(OPENAI_REASONING_MODE_STORAGE_KEY);
        }
        if (openAiChatModelInput) openAiChatModelInput.value = modelId;
        if (!isOpenAiProvider()) {
            setActiveAiProvider(AI_PROVIDER_OPENAI, { refreshStatus: false });
        } else {
            updateModelSwitcherForProvider();
            updateProviderSettingsUi();
        }
        if (!getOpenAiApiKey()) {
            showToast("OpenAI model selected. Add an API key before sending.", "warning");
        }
        updateTokenDisplay();
        return;
    }

    OLLAMA_MODEL = modelId;
    safeLocalStorageSet(LOCAL_CHAT_MODEL_STORAGE_KEY, OLLAMA_MODEL);
    setActiveAiProvider(AI_PROVIDER_LOCAL, { refreshStatus: false });
    renderLocalModelChoices();
    if (!isOllamaModelInstalled(modelId)) {
        showToast(`${modelId} is selected but not installed yet. Use Install missing to pull it.`, "warning");
    }
    updateTokenDisplay();
}

function chooseModelForRequest(text, currentFiles, imagePrompt, videoPrompt = null, options = {}) {
    const hasImages = getImageFiles(currentFiles).length > 0;

    if (videoPrompt !== null) return getLocalTaskModel("videoGeneration");
    if (imagePrompt !== null) return getLocalTaskModel("imageGeneration");
    if (getNaturalImageGenerationPrompt(text, currentFiles) !== null) return getLocalTaskModel("imageGeneration");
    if (hasImages && options.imageTaskHandled !== true && !getOllamaModelCapability(OLLAMA_MODEL).supportsImageInput) {
        return getLocalTaskModel("vision");
    }
    if (hasImages) return OLLAMA_MODEL;
    if (isCodeRequest(text, currentFiles)) return getLocalTaskModel("code");
    if (isHighThinkingRequest(text)) return getLocalTaskModel("reasoning");
    return OLLAMA_MODEL;
}

function shouldPreserveActiveLocalModelForRoute(model) {
    const routed = normalizeModelId(model);
    const active = normalizeModelId(OLLAMA_MODEL);
    return Boolean(routed && active && routed !== active);
}

async function readTextStreamLines(response, { signal = null, onLine = null } = {}) {
    if (!response.body?.getReader) {
        throw new Error("This browser cannot read streamed responses.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            throwIfAborted(signal);
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lineEnd = buffer.indexOf("\n");
            while (lineEnd !== -1) {
                const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
                buffer = buffer.slice(lineEnd + 1);
                if (line.trim()) onLine?.(line);
                lineEnd = buffer.indexOf("\n");
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) onLine?.(buffer.trim());
    } finally {
        reader.releaseLock?.();
    }
}

async function readOllamaChatStream(response, { signal = null, onTextDelta = null, model = "" } = {}) {
    let content = "";
    let role = "assistant";
    let finalData = { model };

    await readTextStreamLines(response, {
        signal,
        onLine(line) {
            const data = JSON.parse(line);
            if (data?.error) {
                throw new Error(data.error);
            }

            if (data?.message?.role) role = data.message.role;
            const delta = data?.message?.content || "";
            if (delta) {
                content += delta;
                onTextDelta?.(delta, content, data);
            }

            if (data?.done) {
                finalData = { ...finalData, ...data };
            }
        }
    });

    return {
        ...finalData,
        model: finalData.model || model,
        message: {
            ...(finalData.message || {}),
            role,
            content
        }
    };
}

function parseServerSentEventBlock(block) {
    const lines = String(block || "").split("\n");
    let event = "message";
    const dataLines = [];

    lines.forEach(line => {
        if (!line || line.startsWith(":")) return;
        if (line.startsWith("event:")) {
            event = line.slice(6).trim() || event;
            return;
        }
        if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
        }
    });

    return { event, data: dataLines.join("\n") };
}

async function readServerSentEvents(response, { signal = null, onEvent = null } = {}) {
    if (!response.body?.getReader) {
        throw new Error("This browser cannot read streamed responses.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            throwIfAborted(signal);
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            let eventEnd = buffer.indexOf("\n\n");
            while (eventEnd !== -1) {
                const block = buffer.slice(0, eventEnd);
                buffer = buffer.slice(eventEnd + 2);
                if (block.trim()) onEvent?.(parseServerSentEventBlock(block));
                eventEnd = buffer.indexOf("\n\n");
            }
        }

        buffer += decoder.decode();
        buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        if (buffer.trim()) onEvent?.(parseServerSentEventBlock(buffer));
    } finally {
        reader.releaseLock?.();
    }
}

function getOpenAiStreamErrorMessage(data, status = "") {
    const error = data?.error || data?.response?.error;
    if (typeof error === "string") return error;
    return error?.message || data?.message || `OpenAI stream failed${status ? ` with HTTP ${status}` : ""}`;
}

async function normalizeOpenAiStreamBridgeResponse(response) {
    const contentType = response.headers?.get?.("Content-Type") || response.headers?.get?.("content-type") || "";
    if (!/application\/json/i.test(contentType)) {
        return response;
    }

    const data = await response.json().catch(() => null);
    if (data?.bodyBase64 || data?.status || data?.headers) {
        if (data.ok === false) {
            return new Response(JSON.stringify(data), {
                status: Math.max(400, Math.min(599, Number(data.status) || 502)),
                headers: { "Content-Type": "application/json" }
            });
        }
        return buildOpenAiBridgeResponse(data);
    }

    return new Response(JSON.stringify(data || {}), {
        status: response.status,
        headers: { "Content-Type": contentType || "application/json" }
    });
}

async function readOpenAiErrorResponse(response) {
    const text = await response.text().catch(() => "");
    if (text) {
        try {
            return formatOpenAiApiError(JSON.parse(text), response.status);
        } catch {
            return `OpenAI error ${response.status}: ${text.slice(0, 500)}`;
        }
    }
    return `OpenAI error ${response.status}: ${response.statusText || "Request failed"}`;
}

function appendOpenAiStreamText(value, state, onTextDelta, payload) {
    const delta = String(value || "");
    if (!delta) return;
    state.content += delta;
    onTextDelta?.(delta, state.content, payload);
}

function extractOpenAiTextFromStreamPayload(payload) {
    if (!payload || typeof payload !== "object") return "";
    if (typeof payload.delta === "string") return payload.delta;
    if (typeof payload.text === "string") return payload.text;
    if (typeof payload.refusal === "string") return payload.refusal;

    const part = payload.part || payload.content_part;
    if (typeof part?.text === "string") return part.text;
    if (typeof part?.refusal === "string") return part.refusal;

    const itemText = extractOpenAiResponseText(payload.item || payload.output_item || {});
    if (itemText) return itemText;

    return "";
}

async function readOpenAiResponseStream(response, { signal = null, onTextDelta = null } = {}) {
    const state = { content: "" };
    let finalResponse = null;

    await readServerSentEvents(response, {
        signal,
        onEvent({ event, data }) {
            if (!data || data === "[DONE]") return;

            let payload;
            try {
                payload = JSON.parse(data);
            } catch {
                return;
            }

            const type = payload.type || event;
            if (type === "response.output_text.delta" || type === "response.refusal.delta") {
                appendOpenAiStreamText(payload.delta, state, onTextDelta, payload);
                return;
            }

            if (type === "response.output_text.done" || type === "response.refusal.done") {
                if (!state.content.trim()) {
                    appendOpenAiStreamText(payload.text || payload.refusal, state, onTextDelta, payload);
                }
                return;
            }

            if (type === "response.content_part.done" || type === "response.output_item.done") {
                const doneText = extractOpenAiTextFromStreamPayload(payload);
                if (doneText && !state.content.trim()) {
                    appendOpenAiStreamText(doneText, state, onTextDelta, payload);
                }
                return;
            }

            if (type === "response.completed") {
                finalResponse = payload.response || payload;
                return;
            }

            if (type === "response.incomplete") {
                finalResponse = payload.response || payload;
                return;
            }

            if (type === "response.failed" || type === "error" || payload.error) {
                throw new Error(getOpenAiStreamErrorMessage(payload, response.status));
            }
        }
    });

    const data = finalResponse || {};
    const finalText = extractOpenAiResponseText(data) || state.content.trim();
    const toolCalls = extractOpenAiResponseToolCalls(data);
    if (!finalText && toolCalls.length === 0) {
        throw new Error("OpenAI returned an empty response.");
    }

    return {
        ...data,
        __faunaToolCalls: toolCalls,
        message: {
            role: "assistant",
            content: finalText
        }
    };
}

async function sendOllamaChat(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, streamOptions = {}) {
    const triedModels = [];
    const modelsToTry = Array.from(new Set([preferredModel, FALLBACK_MODEL].filter(Boolean)));
    let lastError = null;
    const shouldStream = typeof streamOptions.onTextDelta === "function";
    const preserveActiveModel = streamOptions.preserveActiveModel === true;
    const faunaToolContext = options.faunaToolContext || null;
    const ollamaTools = faunaToolContext ? buildOllamaFaunaTools(faunaToolContext) : [];
    const ollamaOptions = { ...options };
    delete ollamaOptions.faunaToolContext;
    delete ollamaOptions.agent_max_steps_at_a_time;
    delete ollamaOptions.agent_max_steps_per_run;

    for (const model of modelsToTry) {
        triedModels.push(model);
        let streamedContent = false;

        try {
            const res = await ollamaFetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal,
                desktopTimeoutMs: 30 * 60 * 1000,
                body: JSON.stringify({
                    model,
                    messages,
                    options: ollamaOptions,
                    ...(ollamaTools.length > 0 ? { tools: ollamaTools } : {}),
                    ...(isAiCachingEnabled ? { keep_alive: OLLAMA_CACHE_KEEP_ALIVE } : {}),
                    stream: shouldStream
                })
            });
            markGenerationConnectionEstablished(signal);
            hasCheckedOllamaStatus = true;
            isOllamaReachable = true;

            if (res.ok) {
                const data = shouldStream
                    ? await readOllamaChatStream(res, {
                        signal,
                        model,
                        onTextDelta: (delta, content, chunk) => {
                            streamedContent = streamedContent || Boolean(delta);
                            streamOptions.onTextDelta(delta, content, chunk);
                        }
                    })
                    : await res.json();
                const hasToolCalls = Array.isArray(data?.message?.tool_calls) && data.message.tool_calls.length > 0;
                if (!data?.message?.content && !hasToolCalls) {
                    throw new Error(`${model} returned an empty response`);
                }
                if (!preserveActiveModel) {
                    setActiveModel(model);
                }
                return data;
            }

            const bodyText = await res.text().catch(() => "");
            lastError = new Error(`${model} responded with ${res.status}${bodyText ? `: ${bodyText.slice(0, 140)}` : ""}`);
        } catch (err) {
            if (err.name === "AbortError") throw err;
            if (shouldStream && streamedContent) throw err;
            if (isLikelyOllamaConnectionError(err)) {
                const desktopStatus = await getDesktopOllamaStatus();
                hasCheckedOllamaStatus = true;
                isOllamaReachable = false;
                installedOllamaModels = [];
                if (desktopStatus?.processRunning) {
                    setServiceStatus("checking", "Ollama app running");
                    setLocalModelsStatus("HTTP not ready", "missing");
                } else {
                    setServiceStatus("offline", "Ollama offline");
                    setLocalModelsStatus("Ollama offline", "missing");
                }
                updateTokenDisplay();
                lastError = new Error(getOllamaOfflineErrorMessage());
                break;
            }
            lastError = err;
        }
    }

    throw new Error(`No available model responded. Tried: ${triedModels.join(", ")}${lastError ? `. Last error: ${lastError.message}` : ""}`);
}

async function sendOllamaTaskChat(messages, preferredModel, options = {}, signal = null) {
    const model = normalizeModelId(preferredModel) || OLLAMA_MODEL;
    if (isModelDownloadActive(model)) {
        throw new Error(`${model} is still downloading. Open the model downloads menu in the top bar to watch progress.`);
    }
    const res = await ollamaFetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        desktopTimeoutMs: 30 * 60 * 1000,
        body: JSON.stringify({
            model,
            messages,
            options,
            stream: false
        })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
        throw new Error(data.error || `${model} responded with HTTP ${res.status}`);
    }
    if (!data?.message?.content) {
        throw new Error(`${model} returned an empty task response.`);
    }
    return data;
}

function normalizeHeaderMap(headers = {}) {
    const normalized = {};
    if (headers instanceof Headers) {
        headers.forEach((value, key) => {
            normalized[key] = value;
        });
        return normalized;
    }
    Object.entries(headers || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) normalized[key] = String(value);
    });
    return normalized;
}

function getHeaderValue(headers, name) {
    const target = name.toLowerCase();
    const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
    return entry ? entry[1] : "";
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            resolve(result.includes(",") ? result.split(",").pop() : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function buildOpenAiBridgeBody(body, headers = {}) {
    if (body === null || body === undefined) return null;

    if (body instanceof FormData) {
        const fields = [];
        for (const [name, value] of body.entries()) {
            if (value instanceof Blob) {
                fields.push({
                    name,
                    fileName: value.name || "upload.bin",
                    mimeType: value.type || "application/octet-stream",
                    dataBase64: await blobToBase64(value)
                });
            } else {
                fields.push({ name, value: String(value) });
            }
        }
        return { kind: "multipart", fields };
    }

    if (body instanceof Blob) {
        return {
            kind: "base64",
            contentType: body.type || getHeaderValue(headers, "Content-Type") || "application/octet-stream",
            dataBase64: await blobToBase64(body)
        };
    }

    const text = String(body);
    const contentType = getHeaderValue(headers, "Content-Type");
    if (/application\/json/i.test(contentType)) {
        try {
            return { kind: "json", value: JSON.parse(text) };
        } catch {
            return { kind: "text", contentType, value: text };
        }
    }

    return { kind: "text", contentType: contentType || "text/plain; charset=utf-8", value: text };
}

function base64ToUint8Array(value) {
    const binary = window.atob(value || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function buildOpenAiBridgeResponse(data) {
    if (data?.truncated) {
        throw new Error("OpenAI response was too large for the local bridge.");
    }
    const status = Math.max(200, Math.min(599, Number(data?.status) || 502));
    return new Response(base64ToUint8Array(data?.bodyBase64), {
        status,
        headers: data?.headers || {}
    });
}

function buildLocalAiBridgeResponse(data) {
    if (data?.truncated) {
        throw new Error("Local AI response was too large for the local bridge.");
    }
    const status = Math.max(200, Math.min(599, Number(data?.status) || 502));
    return new Response(base64ToUint8Array(data?.bodyBase64), {
        status,
        headers: data?.headers || {}
    });
}

async function openAiFetch(path, { method = "POST", headers = {}, body = null, signal = null, streamResponse = false } = {}) {
    const key = requireOpenAiApiKey();
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error(OPENAI_BRIDGE_REQUIRED_MESSAGE);
    }

    const normalizedHeaders = normalizeHeaderMap(headers);
    const bridgeBody = {
        path,
        method,
        apiKey: key,
        headers: normalizedHeaders,
        streamResponse: Boolean(streamResponse),
        body: await buildOpenAiBridgeBody(body, normalizedHeaders)
    };

    if (streamResponse) {
        const baseUrl = getWorkspaceBridgeBaseUrl();
        let res;
        try {
            res = await fetch(`${baseUrl}${OPENAI_BRIDGE_PATH}`, {
                method: "POST",
                headers: getWorkspaceBridgeHeaders(true),
                body: JSON.stringify(bridgeBody),
                signal
            });
        } catch (err) {
            if (err.name === "AbortError") throw err;
            throw createWorkspaceBridgeNetworkError(OPENAI_BRIDGE_PATH, err);
        }
        markGenerationConnectionEstablished(signal);
        return normalizeOpenAiStreamBridgeResponse(res);
    }

    const data = await requestWorkspaceBridge(OPENAI_BRIDGE_PATH, {
        method: "POST",
        signal,
        body: bridgeBody
    });
    return buildOpenAiBridgeResponse(data);
}

async function localAiFetch(url, { method = "POST", headers = {}, body = null, signal = null } = {}) {
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("Local AI endpoints need the Local Workspace Bridge. Start local-bridge.py, save the bridge token, and enable Local Workspace in Tools.");
    }

    const normalizedHeaders = normalizeHeaderMap(headers);
    const data = await requestWorkspaceBridge(LOCAL_AI_BRIDGE_PATH, {
        method: "POST",
        signal,
        body: {
            url,
            method,
            headers: normalizedHeaders,
            body: await buildOpenAiBridgeBody(body, normalizedHeaders)
        }
    });
    return buildLocalAiBridgeResponse(data);
}

async function openAiJsonFetch(path, payload, { signal = null, method = "POST" } = {}) {
    const res = await openAiFetch(path, {
        method,
        signal,
        headers: { "Content-Type": "application/json" },
        body: payload === undefined ? null : JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return data;
}

function normalizeOpenAiFileCacheEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const cacheKey = String(raw.cacheKey || raw.key || "").trim();
    const fileId = String(raw.fileId || raw.id || "").trim();
    if (!cacheKey || !fileId) return null;
    const libraryKeys = [
        ...(Array.isArray(raw.libraryKeys) ? raw.libraryKeys : []),
        raw.libraryKey,
        raw.librarySourceKey
    ].map(value => String(value || "").trim()).filter(Boolean);
    const uniqueLibraryKeys = Array.from(new Set(libraryKeys));
    return {
        cacheKey,
        fileId,
        purpose: String(raw.purpose || OPENAI_VISION_FILE_PURPOSE),
        fileName: String(raw.fileName || raw.filename || ""),
        type: String(raw.type || raw.mimeType || ""),
        size: Number(raw.size || raw.bytes || 0) || 0,
        sha256: String(raw.sha256 || ""),
        libraryKeys: uniqueLibraryKeys,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
        pendingDelete: Boolean(raw.pendingDelete),
        pendingDeleteAt: raw.pendingDeleteAt || "",
        pendingDeleteReason: String(raw.pendingDeleteReason || "")
    };
}

function readStoredOpenAiFileCache() {
    const raw = safeLocalStorageGet(OPENAI_FILE_CACHE_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeOpenAiFileCacheEntry)
            .filter(entry => {
                const key = `${entry?.cacheKey || ""}:${entry?.fileId || ""}`;
                if (!entry || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse OpenAI file cache:", err);
        return [];
    }
}

function pruneOpenAiFileCacheEntries(entries = openAiFileCache) {
    return [...entries]
        .map(normalizeOpenAiFileCacheEntry)
        .filter(Boolean)
        .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))
        .slice(0, OPENAI_FILE_CACHE_MAX_ENTRIES);
}

function persistOpenAiFileCache() {
    openAiFileCache = pruneOpenAiFileCacheEntries(openAiFileCache);
    if (openAiFileCache.length === 0) {
        return safeLocalStorageRemove(OPENAI_FILE_CACHE_STORAGE_KEY);
    }
    return safeLocalStorageSet(OPENAI_FILE_CACHE_STORAGE_KEY, JSON.stringify(openAiFileCache));
}

function getOpenAiFileLibraryKey(file) {
    return String(file?.__faunaLibrarySourceKey || "").trim();
}

async function getBlobSha256Hex(blob) {
    if (!window.crypto?.subtle || !(blob instanceof Blob)) return "";
    const buffer = await blob.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function getOpenAiVisionUploadCacheKey(file) {
    const hash = await getBlobSha256Hex(file);
    if (hash) {
        return {
            cacheKey: `${OPENAI_VISION_FILE_PURPOSE}:sha256:${hash}:${file.type || "image"}:${file.size || 0}`,
            sha256: hash
        };
    }
    return {
        cacheKey: [
            OPENAI_VISION_FILE_PURPOSE,
            "file",
            file.name || "",
            file.type || "",
            file.size || 0,
            file.lastModified || 0
        ].join(":"),
        sha256: ""
    };
}

function addLibraryKeyToOpenAiCacheEntry(entry, libraryKey) {
    const key = String(libraryKey || "").trim();
    if (!entry || !key) return false;
    const keys = new Set(entry.libraryKeys || []);
    const previousSize = keys.size;
    keys.add(key);
    entry.libraryKeys = Array.from(keys);
    return keys.size !== previousSize;
}

function upsertOpenAiFileCacheEntry({ cacheKey, sha256 = "", file, fileId, libraryKey = "" }) {
    const now = new Date().toISOString();
    let entry = openAiFileCache.find(item => item.cacheKey === cacheKey && item.fileId === fileId);
    if (!entry) {
        entry = {
            cacheKey,
            fileId,
            purpose: OPENAI_VISION_FILE_PURPOSE,
            fileName: file?.name || "image.png",
            type: file?.type || "image/png",
            size: Number(file?.size || 0) || 0,
            sha256,
            libraryKeys: [],
            createdAt: now,
            updatedAt: now,
            pendingDelete: false,
            pendingDeleteAt: "",
            pendingDeleteReason: ""
        };
        openAiFileCache.unshift(entry);
    }
    entry.fileName = file?.name || entry.fileName || "image.png";
    entry.type = file?.type || entry.type || "image/png";
    entry.size = Number(file?.size || entry.size || 0) || 0;
    entry.sha256 = sha256 || entry.sha256 || "";
    entry.updatedAt = now;
    entry.pendingDelete = false;
    entry.pendingDeleteAt = "";
    entry.pendingDeleteReason = "";
    addLibraryKeyToOpenAiCacheEntry(entry, libraryKey);
    persistOpenAiFileCache();
    return entry;
}

function removeOpenAiFileCacheEntry(entry) {
    if (!entry) return;
    openAiFileCache = openAiFileCache.filter(item => !(item.cacheKey === entry.cacheKey && item.fileId === entry.fileId));
    persistOpenAiFileCache();
}

function getOpenAiFilePath(fileId) {
    const clean = String(fileId || "").trim();
    if (!/^[A-Za-z0-9_.-]+$/.test(clean)) {
        throw new Error("Invalid OpenAI file id.");
    }
    return `/files/${encodeURIComponent(clean)}`;
}

async function fetchOpenAiFileMetadata(fileId, signal = null) {
    const res = await openAiFetch(getOpenAiFilePath(fileId), {
        method: "GET",
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return null;
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return data;
}

async function deleteOpenAiStoredFile(fileId, signal = null) {
    const res = await openAiFetch(getOpenAiFilePath(fileId), {
        method: "DELETE",
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return { deleted: true, missing: true };
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    return data;
}

function isOpenAiBridgeCapabilityError(error) {
    return /OpenAI endpoint is not allowed by this bridge|supports GET and POST only|Local bridge needs restart/i.test(error?.message || "");
}

async function getReusableOpenAiVisionFile(file, cacheKey, libraryKey, signal = null) {
    const candidates = openAiFileCache
        .filter(entry => (
            entry.cacheKey === cacheKey
            && entry.purpose === OPENAI_VISION_FILE_PURPOSE
            && entry.fileId
            && !entry.pendingDelete
        ))
        .sort((a, b) => {
            const aMatchesLibrary = libraryKey && a.libraryKeys?.includes(libraryKey);
            const bMatchesLibrary = libraryKey && b.libraryKeys?.includes(libraryKey);
            if (aMatchesLibrary !== bMatchesLibrary) return aMatchesLibrary ? -1 : 1;
            return Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0);
        });

    for (const entry of candidates) {
        try {
            const metadata = await fetchOpenAiFileMetadata(entry.fileId, signal);
            if (!metadata) {
                removeOpenAiFileCacheEntry(entry);
                continue;
            }
            upsertOpenAiFileCacheEntry({
                cacheKey,
                sha256: entry.sha256,
                file,
                fileId: entry.fileId,
                libraryKey
            });
            return { fileId: entry.fileId, reused: true };
        } catch (err) {
            if (isOpenAiBridgeCapabilityError(err)) {
                console.warn("OpenAI file cache validation needs a restarted local bridge; reusing cached file id.", err);
                addLibraryKeyToOpenAiCacheEntry(entry, libraryKey);
                entry.updatedAt = new Date().toISOString();
                persistOpenAiFileCache();
                return { fileId: entry.fileId, reused: true, validationSkipped: true };
            }
            console.warn("Could not validate cached OpenAI file id; uploading a fresh copy.", err);
        }
    }

    return null;
}

async function uploadOpenAiVisionImageToStorage(file, signal = null) {
    const formData = new FormData();
    formData.append("purpose", OPENAI_VISION_FILE_PURPOSE);
    formData.append("file", file, file.name || "image.png");

    const res = await openAiFetch("/files", {
        method: "POST",
        body: formData,
        signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(formatOpenAiApiError(data, res.status));
    }
    if (!data?.id) {
        throw new Error("OpenAI did not return a file id for the image.");
    }
    return data.id;
}

async function prepareOpenAiVisionImage(file, signal = null) {
    if (!isAiCachingEnabled) {
        const fileId = await uploadOpenAiVisionImageToStorage(file, signal);
        return { fileId, reused: false };
    }

    const { cacheKey, sha256 } = await getOpenAiVisionUploadCacheKey(file);
    const libraryKey = getOpenAiFileLibraryKey(file);
    const cached = await getReusableOpenAiVisionFile(file, cacheKey, libraryKey, signal);
    if (cached) return cached;

    const fileId = await uploadOpenAiVisionImageToStorage(file, signal);
    upsertOpenAiFileCacheEntry({ cacheKey, sha256, file, fileId, libraryKey });
    return { fileId, reused: false };
}

function formatOpenAiApiError(data, status) {
    const message = data?.error?.message
        || (typeof data?.error === "string" ? data.error : "")
        || data?.message
        || `OpenAI responded with HTTP ${status}`;
    if (/OpenAI endpoint is not allowed by this bridge/i.test(message)) {
        return "Local bridge needs restart: this running bridge does not allow this OpenAI endpoint yet. Stop it, restart `py -3 local-bridge.py --root . --port 8765`, save the printed token, then try again.";
    }
    const code = data?.error?.code || data?.error?.type || data?.code;
    return `OpenAI error${status ? ` ${status}` : ""}: ${message}${code ? ` (${code})` : ""}`;
}

function buildOpenAiContentParts(message) {
    const parts = [];
    const text = sanitizeContentForModelContext(message?.content || "").trim();
    if (text) {
        parts.push({ type: "input_text", text });
    }

    const openAiImageFileIds = Array.isArray(message?.openAiImageFileIds) ? message.openAiImageFileIds : [];
    openAiImageFileIds.forEach(fileId => {
        if (fileId) parts.push({ type: "input_image", file_id: fileId });
    });

    return parts.length ? parts : [{ type: "input_text", text: "" }];
}

function openAiMessagesIncludeImages(messages = []) {
    return messages.some(message =>
        Array.isArray(message?.openAiImageFileIds) && message.openAiImageFileIds.some(Boolean)
    );
}

function prepareOpenAiResponseInput(messages) {
    const instructions = [];
    const inputItems = [];

    cloneConversationHistory(messages).forEach(message => {
        const role = message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user";
        if (role === "system") {
            if (message.content) instructions.push(message.content);
            return;
        }

        const hasImages = Array.isArray(message.openAiImageFileIds) && message.openAiImageFileIds.length > 0;
        inputItems.push({
            role,
            content: role === "user" && hasImages ? buildOpenAiContentParts(message) : String(message.content || "")
        });
    });

    return {
        instructions: instructions.join("\n\n"),
        input: inputItems
    };
}

function extractOpenAiResponseText(data) {
    if (typeof data?.output_text === "string" && data.output_text.trim()) {
        return data.output_text.trim();
    }

    const chunks = [];
    (data?.output || []).forEach(item => {
        (item?.content || []).forEach(part => {
            if (typeof part?.text === "string") chunks.push(part.text);
            if (typeof part?.refusal === "string") chunks.push(part.refusal);
        });
    });

    return chunks.join("\n").trim();
}

async function sendOpenAiResponse(messages, options = {}, signal = null, streamOptions = {}) {
    const prepared = prepareOpenAiResponseInput(messages);
    const model = normalizeModelId(options.model || options.openAiModel) || getOpenAiChatModel();
    if (openAiMessagesIncludeImages(messages) && !openAiModelSupportsImages(model)) {
        throw new Error(`${model} does not support image input. Choose a vision-capable chat model before sending images.`);
    }
    const payload = {
        model,
        input: prepared.input
    };
    const faunaToolContext = options.faunaToolContext || null;
    const openAiTools = faunaToolContext && openAiModelSupportsToolCalls(model)
        ? buildOpenAiFaunaTools(faunaToolContext)
        : [];

    if (prepared.instructions) payload.instructions = prepared.instructions;
    if (shouldSendOpenAiReasoningEffort(model)) {
        payload.reasoning = { effort: getOpenAiReasoningMode(model) };
    }
    if (Number.isFinite(options.temperature) && openAiModelSupportsTemperature(model)) {
        payload.temperature = options.temperature;
    }
    if (Number.isFinite(options.top_p) && openAiModelSupportsTopP(model)) {
        payload.top_p = options.top_p;
    }
    if (Number.isFinite(options.max_output_tokens) && options.max_output_tokens > 0 && openAiModelSupportsMaxOutputTokens(model)) {
        payload.max_output_tokens = options.max_output_tokens;
    }
    if (options.text_verbosity && openAiModelSupportsVerbosity(model)) {
        payload.text = {
            ...(payload.text || {}),
            verbosity: normalizeOpenAiVerbosity(options.text_verbosity)
        };
    }
    if (openAiTools.length > 0) {
        payload.tools = openAiTools;
        payload.tool_choice = "auto";
    }
    applyOpenAiPromptCaching(payload, prepared.instructions);

    if (typeof streamOptions.onTextDelta === "function" && openAiModelSupportsStreaming(model)) {
        payload.stream = true;
        const res = await openAiFetch("/responses", {
            signal,
            streamResponse: true,
            headers: {
                "Content-Type": "application/json",
                "Accept": "text/event-stream"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error(await readOpenAiErrorResponse(res));
        }
        return readOpenAiResponseStream(res, {
            signal,
            onTextDelta: streamOptions.onTextDelta
        });
    }

    const data = await openAiJsonFetch("/responses", payload, { signal });
    const content = extractOpenAiResponseText(data);
    const toolCalls = extractOpenAiResponseToolCalls(data);
    if (!content && toolCalls.length === 0) {
        throw new Error("OpenAI returned an empty response.");
    }

    return {
        ...data,
        __faunaToolCalls: toolCalls,
        message: {
            role: "assistant",
            content
        }
    };
}

async function sendProviderChat(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, streamOptions = {}) {
    if (isOpenAiProvider()) {
        return sendOpenAiResponse(messages, options, signal, streamOptions);
    }
    if (hasCheckedOllamaStatus && !isOllamaReachable) {
        throw new Error(getOllamaOfflineErrorMessage());
    }
    const unavailableReason = getLocalChatModelUnavailableReason(preferredModel);
    if (unavailableReason) throw new Error(unavailableReason);
    return sendOllamaChat(messages, options, preferredModel, signal, streamOptions);
}

function shouldSearchWeb(text) {
    if (!canUseComposerTools()) return false;
    if (!isWebSearchEnabled || !text) return false;
    if (/^\/(?:search|web)\b/i.test(text)) return true;
    if (!isPotatoAutoWebContextEnabled) return false;
    if (/\bhttps?:\/\//i.test(text)) return true;
    return /\b(link|links|url|website|site|source|sources|search|inspect|browse|look up|lookup|online|internet|web|latest|current|today|news|recent|price|where can i|find me|provide me information|useful links|usefull links|skakel|soek|nuutste|vandag)\b/i.test(text);
}

function shouldUseApproxWeatherContext(text) {
    if (!canUseComposerTools() || !text) return false;
    if (!isApproxLocationEnabled) return false;
    if (/^\/(?:weather|wetter|temp|temperature|location|ip-location)\b/i.test(text)) return true;
    const asksWeather = /\b(weather|wetter|temperature|temperatur|degrees?|outside|warm|cold|hot|kalt|draußen|draussen)\b/i.test(text)
        || /\b(?:wie\s+)?viel\s+grad\b/i.test(text)
        || /\bgrad\s+(?:ist|sind|hat|haben)\b/i.test(text);
    const asksHere = /\b(bei mir|hier|near me|my location|where i am|current|now|gerade|jetzt|aktuell|today|heute|local|lokal)\b/i.test(text);
    return asksWeather && asksHere;
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
    markGenerationConnectionEstablished();
    if (!res.ok) throw new Error("Wikipedia search failed");
    const data = await res.json();

    return (data?.query?.search || []).slice(0, 5).map(item => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
        snippet: item.snippet?.replace(/<[^>]+>/g, "") || ""
    }));
}

function normalizeReadableWebText(text) {
    return String(text || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .join("\n")
        .trim();
}

function getWebSnippet(text, maxLength = 180) {
    const snippet = String(text || "").replace(/\s+/g, " ").trim();
    if (snippet.length <= maxLength) return snippet;
    return `${snippet.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function normalizeWebUrl(value) {
    let text = String(value || "").trim().replace(/^["'`]+|["'`]+$/g, "");
    while (text && /[)\].,!?;]$/.test(text)) {
        text = text.slice(0, -1);
    }
    if (text && !/^[a-z][a-z0-9+.-]*:\/\//i.test(text) && /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(text)) {
        text = `https://${text}`;
    }
    try {
        const parsed = new URL(text);
        if (!/^https?:$/i.test(parsed.protocol)) return "";
        return parsed.href;
    } catch {
        return "";
    }
}

function extractWebUrlsFromText(text, limit = 3) {
    const urls = [];
    const seen = new Set();
    for (const match of String(text || "").matchAll(WEB_URL_RE)) {
        const url = normalizeWebUrl(match[0]);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        urls.push(url);
        if (urls.length >= limit) break;
    }
    return urls;
}

function extractReadablePageText(rawText, contentType = "") {
    const raw = String(rawText || "");
    const isHtml = /html/i.test(contentType) || /^\s*<!doctype html|^\s*<html[\s>]/i.test(raw);
    if (!isHtml || typeof DOMParser === "undefined") {
        return {
            title: "",
            text: normalizeReadableWebText(raw)
        };
    }

    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("script, style, noscript, svg, canvas, iframe, nav, footer").forEach(node => node.remove());
    const title = normalizeReadableWebText(doc.querySelector("title")?.textContent || "");
    const text = normalizeReadableWebText(doc.body?.innerText || doc.body?.textContent || raw);
    return { title, text };
}

