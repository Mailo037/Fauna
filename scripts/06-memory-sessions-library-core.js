// Original script.js lines 7163-8910.
function executeMemoryToolCall(toolCall) {
    if (!isMemoryEnabled) {
        throw new Error("Memory beta is not enabled.");
    }

    if (toolCall.tool === "read_memories") {
        const query = String(toolCall.query || toolCall.text || "").trim();
        return formatMemoryToolEntries(findMemoryEntries(query), query);
    }

    if (toolCall.tool === "save_memory") {
        const text = normalizeMemoryText(toolCall.text || toolCall.memory || toolCall.content || toolCall.value);
        if (!text) throw new Error("save_memory requires text.");
        const result = addMemoryEntry(text, "assistant");
        return result.created
            ? `Memory saved: ${result.entry.text}`
            : `Memory already existed and was refreshed: ${result.entry.text}`;
    }

    if (toolCall.tool === "delete_memory") {
        const target = String(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "").trim();
        if (!target) throw new Error("delete_memory requires a target.");
        const removed = removeMemoryEntry(target);
        return removed
            ? `Memory deleted: ${removed.text}`
            : `No memory matched "${target}".`;
    }

    throw new Error("Unknown memory tool.");
}

function cleanSessionTitle(value, maxLength = 44) {
    const normalized = String(value || "")
        .split(/\n\n--- Attached File Content:/i)[0]
        .replace(/\n+\[Voice chat settings\][\s\S]*$/i, "")
        .replace(/^\[(?:image|video)[^\]]*\]\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!normalized) return "Current Session";
    return normalized.length > maxLength ? `${normalized.slice(0, Math.max(1, maxLength - 3)).trim()}...` : normalized;
}

function parseChatTitleRequest(content) {
    const match = String(content || "").match(CHAT_TITLE_RE);
    if (!match) return "";

    const rawTitle = String(match[1] || "").trim();
    if (!rawTitle) return "";

    try {
        const payload = JSON.parse(rawTitle);
        return cleanSessionTitle(payload?.title || payload?.chatTitle || payload?.name || "", CHAT_TITLE_MAX_LENGTH);
    } catch {
        return cleanSessionTitle(rawTitle, CHAT_TITLE_MAX_LENGTH);
    }
}

function stripChatTitleRequest(content) {
    return String(content || "").replace(CHAT_TITLE_RE, "").trim();
}

function shouldRequestAssistantChatTitle(messages = conversationHistory, sessionId = activeSessionId) {
    const hasAssistantReply = (Array.isArray(messages) ? messages : [])
        .some(message => message?.role === "assistant");
    if (hasAssistantReply) return false;

    const session = sessionId ? getChatSessionById(sessionId) : getActiveSession();
    return !(session?.manualTitle || session?.assistantTitle);
}

function applyAssistantChatTitle(content, sessionId = activeSessionId) {
    const title = parseChatTitleRequest(content);
    if (!title || title === "Current Session") return false;

    let session = sessionId ? getChatSessionById(sessionId) : getActiveSession();
    if (!session && (!sessionId || sessionId === activeSessionId) && activeChatHasContent()) {
        session = createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
        updateWorkspaceUrlFragment({ replace: true });
    }
    if (!session || session.manualTitle) return false;
    if (session.assistantTitle && session.title === title) return true;

    session.title = title;
    session.assistantTitle = true;
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    if (session.id === activeSessionId) updateActiveChatTitle();
    renderChatHistory();
    return true;
}

function createChatSession(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: createSessionId(),
        title: "Current Session",
        createdAt: now,
        updatedAt: now,
        pinned: false,
        archived: false,
        manualTitle: false,
        assistantTitle: false,
        chatHtml: "",
        conversationHistory: [],
        composerDraft: createEmptyComposerDraft(),
        sessionTotalTokens: 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER,
        ...overrides
    };
}

function createEmptyComposerDraft() {
    return {
        text: "",
        attachments: [],
        updatedAt: ""
    };
}

function normalizeStoredComposerDraft(raw) {
    if (!raw || typeof raw !== "object") return createEmptyComposerDraft();
    return {
        text: String(raw.text || ""),
        attachments: Array.isArray(raw.attachments)
            ? raw.attachments.map(normalizeStoredComposerDraftAttachment).filter(Boolean)
            : [],
        updatedAt: String(raw.updatedAt || "")
    };
}

function normalizeStoredComposerDraftAttachment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const path = String(raw.path || raw.filePath || "").trim();
    const sourceSrc = String(raw.sourceSrc || raw.src || "").trim();
    const pathName = typeof getFileNameFromPath === "function" ? getFileNameFromPath(path) : path.split(/[\\/]/).filter(Boolean).pop();
    const name = String(raw.name || pathName || "attachment").trim();
    if (!path && !sourceSrc && !raw.liveOnly) return null;
    return {
        name,
        type: String(raw.type || (typeof inferAttachmentMimeType === "function" ? inferAttachmentMimeType(name) : "") || "application/octet-stream"),
        size: Number(raw.size || 0) || 0,
        lastModified: Number(raw.lastModified || 0) || 0,
        path,
        sourceSrc,
        librarySourceKey: String(raw.librarySourceKey || ""),
        librarySourceId: String(raw.librarySourceId || "")
    };
}

function composerDraftHasContent(draft) {
    if (!draft) return false;
    return Boolean(
        String(draft.text || "").trim()
        || (Array.isArray(draft.attachments) && draft.attachments.length > 0)
        || (Array.isArray(draft.liveFiles) && draft.liveFiles.length > 0)
    );
}

function normalizeStoredChatSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const now = new Date().toISOString();
    const conversationHistory = cloneConversationHistory(raw.conversationHistory, { includeImages: false });
    const historyTokenTotal = sumHistoryTokenUsage(conversationHistory);
    const trustedStoredTotal = raw.sessionTokenSource === TOKEN_USAGE_SOURCE_PROVIDER
        ? normalizeTokenCount(raw.sessionTotalTokens)
        : null;
    return createChatSession({
        id: String(raw.id || createSessionId()),
        title: cleanSessionTitle(raw.title || "Current Session"),
        createdAt: raw.createdAt || raw.updatedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || now,
        pinned: Boolean(raw.pinned),
        archived: Boolean(raw.archived),
        manualTitle: Boolean(raw.manualTitle),
        assistantTitle: Boolean(raw.assistantTitle),
        chatHtml: sanitizeChatHtmlMediaSources(typeof raw.chatHtml === "string" ? raw.chatHtml : ""),
        conversationHistory,
        composerDraft: normalizeStoredComposerDraft(raw.composerDraft),
        sessionTotalTokens: Math.max(historyTokenTotal, trustedStoredTotal || 0),
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER
    });
}

function readStoredChatSessions() {
    const raw = safeLocalStorageGet(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeStoredChatSession)
            .filter(session => session && chatSessionHasContent(session));
    } catch (err) {
        console.warn("Could not parse saved Fauna chats:", err);
        return [];
    }
}

function getActiveSession() {
    return chatSessions.find(session => session.id === activeSessionId) || null;
}

function getChatSessionById(sessionId) {
    return chatSessions.find(session => session.id === sessionId) || null;
}

function isActiveChatArchived() {
    return Boolean(getActiveSession()?.archived);
}

function isChatSessionVisible(sessionId) {
    return Boolean(
        sessionId
        && activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND
        && activeSessionId === sessionId
    );
}

function chatSessionHasContent(session) {
    if (!session) return false;
    return Boolean(
        session.chatHtml?.trim() ||
        session.domNodes?.length ||
        session.conversationHistory?.length
    );
}

function activeChatHasContent() {
    return Boolean(chat?.children.length || conversationHistory.length || getCurrentComposerDraftHasContent());
}

function activeChatHasPersistableContent() {
    return Boolean(chat?.children.length || conversationHistory.length);
}

function serializeComposerDraftAttachment(file) {
    if (!(file instanceof File)) return null;
    const desktopPath = String(file.__faunaDesktopFilePath || "").trim();
    const desktopPreview = String(file.__faunaDesktopPreviewSrc || "").trim();
    const persistentSrc = String(file.__faunaPersistentPreviewSrc || file.__faunaLibrarySourceSrc || desktopPreview || "").trim();
    const sourceSrc = desktopPath
        ? ""
        : /^(?:https?:|data:|fauna-app:|fauna-file:|file:)/i.test(persistentSrc)
            ? persistentSrc
            : "";

    return {
        name: file.name || "attachment",
        type: file.type || (typeof inferAttachmentMimeType === "function" ? inferAttachmentMimeType(file.name) : "") || "application/octet-stream",
        size: Number(file.size || 0) || 0,
        lastModified: Number(file.lastModified || 0) || 0,
        path: desktopPath,
        sourceSrc,
        librarySourceKey: String(file.__faunaLibrarySourceKey || ""),
        librarySourceId: String(file.__faunaLibrarySourceId || ""),
        liveOnly: !desktopPath && !sourceSrc
    };
}

function captureComposerDraft() {
    const files = Array.from(attachedFiles || []).filter(file => file instanceof File);
    const attachments = files.map(serializeComposerDraftAttachment).filter(Boolean);
    return {
        text: input?.value || "",
        attachments,
        liveFiles: files,
        updatedAt: new Date().toISOString()
    };
}

function serializeComposerDraftForStorage(draft = createEmptyComposerDraft()) {
    const normalized = normalizeStoredComposerDraft(draft);
    const attachments = Array.isArray(normalized.attachments)
        ? normalized.attachments.filter(attachment => !attachment.liveOnly && (attachment.path || attachment.sourceSrc))
        : [];
    return {
        text: normalized.text,
        attachments,
        updatedAt: normalized.updatedAt || ""
    };
}

function getCurrentComposerDraftHasContent() {
    if (String(input?.value || "").trim()) return true;
    return Array.isArray(attachedFiles) && attachedFiles.length > 0;
}

function setComposerTextValue(text = "") {
    if (!input) return;
    input.value = String(text || "");
    input.style.height = "auto";
    if (input.value) input.style.height = `${input.scrollHeight}px`;
}

function clearSessionComposerDraft(sessionId, { persist = false, render = false } = {}) {
    const session = getChatSessionById(sessionId);
    if (!session) return;
    session.composerDraft = createEmptyComposerDraft();
    if (persist) persistChatSessions();
    if (render) renderChatHistory();
}

function persistActiveComposerDraft({ render = false, updateUrl = true } = {}) {
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) return null;
    const draft = captureComposerDraft();
    let session = getActiveSession();
    let shouldRender = render;
    if (!session) {
        return null;
    }

    const hasStoredChatContent = Boolean(
        session.chatHtml?.trim()
        || session.domNodes?.length
        || session.conversationHistory?.length
    );
    if (!composerDraftHasContent(draft) && !hasStoredChatContent) {
        chatSessions = chatSessions.filter(item => item.id !== session.id);
        if (activeSessionId === session.id) activeSessionId = null;
        persistChatSessions();
        updateActiveChatTitle();
        if (updateUrl) updateWorkspaceUrlFragment({ replace: true });
        renderChatHistory();
        return null;
    }

    session.composerDraft = draft;
    if (!session.manualTitle && !session.assistantTitle && !session.conversationHistory?.length) {
        const previousTitle = session.title;
        session.title = deriveSessionTitle(session);
        if (session.title !== previousTitle) {
            shouldRender = true;
            updateActiveChatTitle();
        }
    }
    session.updatedAt = draft.updatedAt || new Date().toISOString();
    persistChatSessions();
    if (shouldRender) renderChatHistory();
    return session;
}

function scheduleComposerDraftSave({ immediate = false, render = false } = {}) {
    if (isRestoringComposerDraft) return;
    if (composerDraftSaveTimer) {
        window.clearTimeout(composerDraftSaveTimer);
        composerDraftSaveTimer = null;
    }
    if (immediate) {
        persistActiveComposerDraft({ render });
        return;
    }
    composerDraftSaveTimer = window.setTimeout(() => {
        composerDraftSaveTimer = null;
        persistActiveComposerDraft({ render });
    }, COMPOSER_DRAFT_SAVE_DEBOUNCE_MS);
}

function getHtmlForSessionNodes(nodes = []) {
    const host = document.createElement("div");
    nodes.forEach(node => {
        if (node instanceof Node) host.appendChild(node.cloneNode(true));
    });
    return sanitizeChatHtmlMediaSources(host.innerHTML || "");
}

function snapshotVisibleChatIntoSession(session, {
    history = conversationHistory,
    tokenTotal = sessionTotalTokens
} = {}) {
    if (!session) return null;
    session.chatHtml = sanitizeChatHtmlMediaSources(chat?.innerHTML || "");
    session.domNodes = chat ? Array.from(chat.childNodes) : [];
    session.conversationHistory = cloneConversationHistory(history);
    session.composerDraft = captureComposerDraft();
    session.sessionTotalTokens = tokenTotal;
    session.sessionTokenSource = TOKEN_USAGE_SOURCE_PROVIDER;
    if (!session.manualTitle && !session.assistantTitle) {
        session.title = deriveSessionTitle(session);
    }
    session.updatedAt = new Date().toISOString();
    syncUsageToolEventsFromSession(session, { html: session.chatHtml });
    return session;
}

function updateStoredSessionFromGeneration(sessionId, {
    history = [],
    tokenTotal = 0,
    render = true
} = {}) {
    const session = getChatSessionById(sessionId);
    if (!session) return null;

    if (isChatSessionVisible(sessionId)) {
        conversationHistory = cloneConversationHistory(history);
        sessionTotalTokens = tokenTotal;
        snapshotVisibleChatIntoSession(session, { history, tokenTotal });
        updateTokenDisplay();
        updateActiveChatTitle();
    } else {
        session.conversationHistory = cloneConversationHistory(history);
        session.sessionTotalTokens = tokenTotal;
        session.sessionTokenSource = TOKEN_USAGE_SOURCE_PROVIDER;
        if (Array.isArray(session.domNodes) && session.domNodes.length > 0) {
            session.chatHtml = getHtmlForSessionNodes(session.domNodes);
        }
        if (!session.manualTitle && !session.assistantTitle) {
            session.title = deriveSessionTitle(session);
        }
        session.updatedAt = new Date().toISOString();
        syncUsageToolEventsFromSession(session, { html: session.chatHtml });
    }

    persistChatSessions();
    if (render) renderChatHistory();
    refreshUsageSettingsPaneIfVisible();
    refreshLibraryViewIfActive();
    return session;
}

function ensureWritableActiveChatSession() {
    const active = getActiveSession();
    if (active?.archived) {
        showToast("Archived chats are read-only. Restore the chat before writing.", "warning");
        return null;
    }
    if (active) return active;

    const session = createChatSession();
    chatSessions.unshift(session);
    activeSessionId = session.id;
    persistChatSessions();
    renderChatHistory();
    updateActiveChatTitle();
    if (activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
        updateWorkspaceUrlFragment({ replace: true });
    }
    return session;
}

function deriveSessionTitle(session = getActiveSession()) {
    const firstUserMessage = (session?.conversationHistory || conversationHistory)
        .find(message => message.role === "user" && message.content);
    const draftText = session?.composerDraft?.text || (session?.id === activeSessionId ? input?.value : "");
    const firstUserBubble = chat?.querySelector(".user-node .bubble")?.textContent;
    return cleanSessionTitle(firstUserMessage?.content || firstUserBubble || draftText || session?.title || "Current Session");
}

function updateActiveChatTitle() {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        if (chatTitle) chatTitle.textContent = "Library";
        if (chatTitleInput && !isChatTitleEditing) chatTitleInput.value = "Library";
        document.title = "Library - Fauna";
        updateWindowBarLocation();
        return;
    }
    const session = getActiveSession();
    const title = session?.title || "Current Session";
    if (chatTitle) chatTitle.textContent = title;
    if (chatTitleInput && !isChatTitleEditing) chatTitleInput.value = title;
    document.title = title === "Current Session" ? "Fauna" : `${title} - Fauna`;
    updateWindowBarLocation();
}

function setChatTitleEditing(editing) {
    if (!chatTitle || !chatTitleInput || !chatTitleEditBtn) return;
    isChatTitleEditing = editing;
    chatTitle.hidden = editing;
    chatTitleInput.hidden = !editing;
    chatTitleEditBtn.classList.toggle("editing", editing);
    chatTitleEditBtn.setAttribute("aria-label", editing ? "Save chat name" : "Rename chat");

    if (editing) {
        chatTitleInput.value = getActiveSession()?.title || "Current Session";
        window.setTimeout(() => {
            chatTitleInput.focus();
            chatTitleInput.select();
        }, 0);
    }
}

function commitChatTitleEdit() {
    if (!isChatTitleEditing || !chatTitleInput) return;
    const session = getActiveSession();
    if (!session) {
        setChatTitleEditing(false);
        return;
    }

    const nextTitle = cleanSessionTitle(chatTitleInput.value, 80);
    session.title = nextTitle;
    session.manualTitle = true;
    session.assistantTitle = false;
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    updateActiveChatTitle();
    renderChatHistory();
    setChatTitleEditing(false);
    showToast("Chat name updated.", "success");
}

function cancelChatTitleEdit() {
    if (!isChatTitleEditing) return;
    if (chatTitleInput) chatTitleInput.value = getActiveSession()?.title || "Current Session";
    setChatTitleEditing(false);
}

function limitSerializedHistory(history, limit = 0) {
    if (!Number.isFinite(limit) || limit <= 0 || history.length <= limit) return history;
    return history.slice(-limit);
}

function serializeChatSession(session, options = {}) {
    const includeHtml = options.includeHtml !== false;
    const historyLimit = Number(options.historyLimit) || 0;
    const conversation = limitSerializedHistory(
        cloneConversationHistory(session.conversationHistory, { includeImages: false }),
        historyLimit
    );

    return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        pinned: Boolean(session.pinned),
        archived: Boolean(session.archived),
        manualTitle: Boolean(session.manualTitle),
        assistantTitle: Boolean(session.assistantTitle),
        chatHtml: includeHtml ? sanitizeChatHtmlMediaSources(session.chatHtml || "") : "",
        conversationHistory: conversation,
        composerDraft: serializeComposerDraftForStorage(session.composerDraft),
        sessionTotalTokens: normalizeTokenCount(session.sessionTotalTokens) || 0,
        sessionTokenSource: TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function trimChatSessions() {
    if (chatSessions.length <= MAX_CHAT_SESSIONS) return;
    const removedSessions = [];
    const removable = [...chatSessions]
        .filter(session => session.id !== activeSessionId)
        .sort((a, b) => {
            if (a.archived !== b.archived) return a.archived ? -1 : 1;
            if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });

    while (chatSessions.length > MAX_CHAT_SESSIONS && removable.length > 0) {
        const sessionToRemove = removable.shift();
        removedSessions.push(sessionToRemove);
        chatSessions = chatSessions.filter(session => session.id !== sessionToRemove.id);
    }
    if (removedSessions.length > 0) archiveLibraryItemsFromSessions(removedSessions);
}

function serializeChatSessionsForStorage(profile) {
    return chatSessions.map(session => {
        const isActive = session.id === activeSessionId;
        if (profile === CHAT_STORAGE_PROFILE_ACTIVE_HTML) {
            return serializeChatSession(session, {
                includeHtml: isActive,
                historyLimit: isActive ? 0 : 48
            });
        }
        if (profile === CHAT_STORAGE_PROFILE_HISTORY_ONLY) {
            return serializeChatSession(session, {
                includeHtml: false,
                historyLimit: isActive ? 96 : 40
            });
        }
        if (profile === CHAT_STORAGE_PROFILE_MINIMAL) {
            return serializeChatSession(session, {
                includeHtml: false,
                historyLimit: isActive ? 40 : 12
            });
        }
        return serializeChatSession(session);
    });
}

function getChatStorageProfilesToTry() {
    const profiles = [
        CHAT_STORAGE_PROFILE_FULL,
        CHAT_STORAGE_PROFILE_ACTIVE_HTML,
        CHAT_STORAGE_PROFILE_HISTORY_ONLY,
        CHAT_STORAGE_PROFILE_MINIMAL
    ];
    const startIndex = Math.max(0, profiles.indexOf(chatStorageProfile));
    return profiles.slice(startIndex);
}

function persistChatSessions() {
    trimChatSessions();
    let saved = false;
    for (const profile of getChatStorageProfilesToTry()) {
        const payload = JSON.stringify(serializeChatSessionsForStorage(profile));
        if (safeLocalStorageSet(CHAT_SESSIONS_STORAGE_KEY, payload, { silent: true })) {
            chatStorageProfile = profile;
            saved = true;
            break;
        }
    }

    if (!saved) {
        const storageLabel = isFaunaDesktopApp() ? "AppData storage" : "browser storage";
        console.warn(`Could not save Fauna chat history: ${storageLabel} was unavailable.`);
        if (!hasShownChatStorageWarning) {
            showToast(`Chat history is too large to save locally. Delete or archive older chats to free ${storageLabel}.`, "warning");
            hasShownChatStorageWarning = true;
        }
    } else if (chatStorageProfile !== CHAT_STORAGE_PROFILE_FULL && !hasShownChatStorageWarning) {
        showToast(`${isFaunaDesktopApp() ? "AppData storage" : "Browser storage"} is nearly full, so Fauna saved a lighter chat history snapshot.`, "warning");
        hasShownChatStorageWarning = true;
    }

    if (activeSessionId) {
        safeLocalStorageSet(ACTIVE_CHAT_SESSION_STORAGE_KEY, activeSessionId);
    } else {
        safeLocalStorageRemove(ACTIVE_CHAT_SESSION_STORAGE_KEY);
    }
    return saved;
}

function saveCurrentSession({ render = true, updateUrl = true } = {}) {
    let session = getActiveSession();
    let createdActiveSession = false;
    if (!session) {
        if (!activeChatHasPersistableContent()) {
            if (render) renderChatHistory();
            return null;
        }
        session = createChatSession();
        chatSessions.unshift(session);
        activeSessionId = session.id;
        createdActiveSession = true;
    }

    snapshotVisibleChatIntoSession(session);

    persistChatSessions();
    updateActiveChatTitle();
    if (render) renderChatHistory();
    refreshUsageSettingsPaneIfVisible();
    refreshLibraryViewIfActive();
    if (createdActiveSession && updateUrl && activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
        updateWorkspaceUrlFragment({ replace: true });
    }
    return session;
}

function compareChatSessions(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function updateArchivedMenuOverflow() {
    archivedHistorySection?.classList.toggle(
        "archived-menu-open",
        Boolean(archivedHistorySection.querySelector(".chat-session-menu-wrap.open"))
    );
}

function closeChatSessionMenus(except = null) {
    document.querySelectorAll(".chat-session-menu-wrap.open").forEach(menuWrap => {
        if (except && menuWrap === except) return;
        menuWrap.classList.remove("open");
        menuWrap.closest(".chat-session-row")?.classList.remove("menu-open");
        const trigger = menuWrap.querySelector(".chat-session-menu-trigger");
        const menu = menuWrap.querySelector(".chat-session-menu");
        trigger?.setAttribute("aria-expanded", "false");
        if (menu) menu.hidden = true;
    });
    updateArchivedMenuOverflow();
}

function createSessionMenuItem(action, label, iconMarkup, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chat-session-menu-item chat-session-menu-item-${action}`;
    button.setAttribute("role", "menuitem");
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconMarkup}</svg>
        <span></span>
    `;
    button.querySelector("span").textContent = label;
    button.addEventListener("click", event => {
        event.stopPropagation();
        closeChatSessionMenus();
        onSelect();
    });
    return button;
}

function formatChatInfoDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function createChatInfoRow(label, value) {
    const row = document.createElement("div");
    row.className = "chat-info-row";
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.textContent = String(value || "None");
    row.append(labelNode, valueNode);
    return row;
}

function getChatInfoStats(session) {
    const history = Array.isArray(session?.conversationHistory) ? session.conversationHistory : [];
    const draft = session?.composerDraft || createEmptyComposerDraft();
    return {
        messages: history.length,
        userMessages: history.filter(message => message?.role === "user").length,
        assistantMessages: history.filter(message => message?.role === "assistant").length,
        tokens: normalizeTokenCount(session?.sessionTotalTokens) || 0,
        draftText: String(draft.text || "").trim().length,
        draftAttachments: (Array.isArray(draft.attachments) ? draft.attachments.length : 0)
            || (Array.isArray(draft.liveFiles) ? draft.liveFiles.length : 0)
    };
}

function openChatRenameDialog(sessionId) {
    const session = getChatSessionById(sessionId);
    if (!session) return;
    setChatTitleEditing(false);

    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "approval-dialog chat-rename-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "chatRenameDialogTitle");

    const titleNode = document.createElement("h2");
    titleNode.id = "chatRenameDialogTitle";
    titleNode.textContent = "Rename chat";

    const inputLabel = document.createElement("label");
    inputLabel.className = "chat-rename-field";
    const inputLabelText = document.createElement("span");
    inputLabelText.textContent = "Chat name";
    const nameInput = document.createElement("input");
    nameInput.className = "settings-input chat-rename-input";
    nameInput.type = "text";
    nameInput.maxLength = 80;
    nameInput.value = session.title || "Current Session";
    nameInput.setAttribute("aria-label", "Chat name");
    inputLabel.append(inputLabelText, nameInput);

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "provider-btn provider-btn-secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    const saveButton = document.createElement("button");
    saveButton.className = "provider-btn provider-btn-primary";
    saveButton.type = "button";
    saveButton.textContent = "Save";

    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const save = () => {
        const nextTitle = cleanSessionTitle(nameInput.value, 80);
        session.title = nextTitle;
        session.manualTitle = true;
        session.assistantTitle = false;
        session.updatedAt = new Date().toISOString();
        persistChatSessions();
        if (session.id === activeSessionId) updateActiveChatTitle();
        renderChatHistory();
        showToast("Chat name updated.", "success");
        close();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" && document.activeElement === nameInput) {
            event.preventDefault();
            save();
        }
    };

    cancelButton.addEventListener("click", close);
    saveButton.addEventListener("click", save);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(cancelButton, saveButton);
    dialog.append(titleNode, inputLabel, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => {
        nameInput.focus();
        nameInput.select();
    }, 0);
}

function openChatInfoDialog(sessionId) {
    let session = getChatSessionById(sessionId);
    if (!session) return;
    if (session.id === activeSessionId) {
        session = saveCurrentSession({ render: false, updateUrl: false }) || session;
    }
    const stats = getChatInfoStats(session);
    const status = [
        session.pinned ? "Pinned" : "",
        session.archived ? "Archived" : "Active",
        typeof isSessionGenerating === "function" && isSessionGenerating(session.id) ? "Generating" : ""
    ].filter(Boolean).join(" / ");

    const overlay = document.createElement("div");
    overlay.className = "approval-modal";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "approval-dialog chat-info-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "chatInfoDialogTitle");

    const titleNode = document.createElement("h2");
    titleNode.id = "chatInfoDialogTitle";
    titleNode.textContent = "Chat info";

    const subtitle = document.createElement("p");
    subtitle.className = "chat-info-title";
    subtitle.textContent = session.title || "Current Session";

    const grid = document.createElement("div");
    grid.className = "chat-info-grid";
    grid.append(
        createChatInfoRow("Status", status),
        createChatInfoRow("Created", formatChatInfoDate(session.createdAt)),
        createChatInfoRow("Updated", formatChatInfoDate(session.updatedAt)),
        createChatInfoRow("Messages", `${stats.messages} (${stats.userMessages} user, ${stats.assistantMessages} AI)`),
        createChatInfoRow("Session tokens", stats.tokens.toLocaleString()),
        createChatInfoRow("Composer draft", stats.draftText || stats.draftAttachments ? `${stats.draftText} chars, ${stats.draftAttachments} attachments` : "None"),
        createChatInfoRow("Chat ID", session.id)
    );

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const closeButton = document.createElement("button");
    closeButton.className = "provider-btn provider-btn-secondary";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    const renameButton = document.createElement("button");
    renameButton.className = "provider-btn provider-btn-primary";
    renameButton.type = "button";
    renameButton.textContent = "Rename";

    const close = () => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
    };
    const onKeyDown = event => {
        if (event.key === "Escape") close();
    };
    closeButton.addEventListener("click", close);
    renameButton.addEventListener("click", () => {
        close();
        openChatRenameDialog(session.id);
    });
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(closeButton, renameButton);
    dialog.append(titleNode, subtitle, grid, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.setTimeout(() => closeButton.focus(), 0);
}

function createChatSessionRow(session) {
    const generating = typeof isSessionGenerating === "function" && isSessionGenerating(session.id) === true;
    const generationComplete = typeof hasUnreadGenerationCompletion === "function" && hasUnreadGenerationCompletion(session.id) === true;
    const row = document.createElement("div");
    row.className = "chat-session-row";
    row.classList.toggle("active", session.id === activeSessionId);
    row.classList.toggle("pinned", session.pinned);
    row.classList.toggle("archived", session.archived);
    row.classList.toggle("generating", generating);
    row.classList.toggle("generation-complete", generationComplete);
    row.classList.toggle("menu-drop-up", session.archived);
    row.setAttribute("aria-busy", String(generating));

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "history-item chat-session-main";
    mainButton.setAttribute("aria-label", generating
        ? `${session.title} is generating`
        : generationComplete
            ? `${session.title} has a completed reply`
            : session.title);
    mainButton.setAttribute("aria-current", session.id === activeSessionId ? "page" : "false");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = session.title;
    mainButton.append(dot, label);
    mainButton.addEventListener("click", () => activateChatSession(session.id));

    const activitySpinner = document.createElement("span");
    activitySpinner.className = "chat-session-generating-spinner";
    activitySpinner.setAttribute("aria-hidden", "true");

    const completionDot = document.createElement("span");
    completionDot.className = "chat-session-complete-dot";
    completionDot.setAttribute("aria-hidden", "true");

    const menuWrap = document.createElement("div");
    menuWrap.className = "chat-session-menu-wrap";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "chat-session-menu-trigger";
    menuButton.setAttribute("aria-label", `Options for ${session.title}`);
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.7"></circle>
            <circle cx="12" cy="12" r="1.7"></circle>
            <circle cx="19" cy="12" r="1.7"></circle>
        </svg>
    `;

    const menu = document.createElement("div");
    menu.className = "chat-session-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    const renameButton = createSessionMenuItem(
        "rename",
        "Rename chat",
        '<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path>',
        () => openChatRenameDialog(session.id)
    );

    const infoButton = createSessionMenuItem(
        "info",
        "Chat info",
        '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>',
        () => openChatInfoDialog(session.id)
    );

    const pinButton = createSessionMenuItem(
        "pin",
        session.pinned ? "Unpin chat" : "Pin chat",
        '<path d="M12 17v5"></path><path d="m5 14 4-4V4h6v6l4 4Z"></path>',
        () => toggleChatSessionPinned(session.id)
    );

    const archiveButton = createSessionMenuItem(
        "archive",
        session.archived ? "Restore chat" : "Archive chat",
        '<path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path><path d="M3 8l2-5h14l2 5"></path><path d="M10 12h4"></path>',
        () => toggleChatSessionArchived(session.id)
    );

    const deleteButton = createSessionMenuItem(
        "delete",
        "Delete chat",
        '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>',
        () => { void deleteChatSession(session.id); }
    );

    menuButton.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = !menuWrap.classList.contains("open");
        closeChatSessionMenus(menuWrap);
        menuWrap.classList.toggle("open", willOpen);
        row.classList.toggle("menu-open", willOpen);
        menuButton.setAttribute("aria-expanded", String(willOpen));
        menu.hidden = !willOpen;
        updateArchivedMenuOverflow();
    });

    menu.append(renameButton, infoButton);
    if (!session.archived) {
        menu.append(pinButton);
    }
    menu.append(archiveButton, deleteButton);
    menuWrap.append(menuButton, menu);
    row.append(mainButton, activitySpinner, completionDot, menuWrap);
    return row;
}

function appendChatSessionGroup(container, label, sessions) {
    if (!container || sessions.length === 0) return;
    if (label) {
        const groupLabel = document.createElement("div");
        groupLabel.className = "history-label history-subsection-label";
        groupLabel.textContent = label;
        container.appendChild(groupLabel);
    }
    sessions.forEach(session => container.appendChild(createChatSessionRow(session)));
}

function renderChatHistory() {
    if (!chatHistoryList && !archivedChatList) return;
    if (chatHistoryList) chatHistoryList.innerHTML = "";
    if (archivedChatList) archivedChatList.innerHTML = "";
    const visibleSessions = chatSessions.filter(session => !session.archived).sort(compareChatSessions);
    const archivedSessions = chatSessions.filter(session => session.archived).sort(compareChatSessions);
    appendChatSessionGroup(chatHistoryList, "", visibleSessions);
    if (archivedHistorySection) {
        archivedHistorySection.hidden = archivedSessions.length === 0;
        archivedHistorySection.setAttribute("aria-hidden", String(archivedSessions.length === 0));
    }
    appendChatSessionGroup(archivedChatList || chatHistoryList, archivedChatList ? "" : "Archived", archivedSessions);
    setArchivedChatHistoryCollapsed(isArchivedChatHistoryCollapsed, { persist: false });
}

function setChatHistoryCollapsed(collapsed, { persist = true } = {}) {
    isChatHistoryCollapsed = Boolean(collapsed);
    chatHistorySection?.classList.toggle("chat-history-collapsed", isChatHistoryCollapsed);
    if (chatHistoryList) chatHistoryList.hidden = isChatHistoryCollapsed;
    if (chatHistoryToggle) {
        chatHistoryToggle.setAttribute("aria-expanded", String(!isChatHistoryCollapsed));
        chatHistoryToggle.setAttribute("aria-label", isChatHistoryCollapsed ? "Expand chats" : "Collapse chats");
        chatHistoryToggle.dataset.tooltip = isChatHistoryCollapsed ? "Expand chats" : "Collapse chats";
    }
    if (persist) {
        safeLocalStorageSet(CHAT_HISTORY_COLLAPSED_STORAGE_KEY, isChatHistoryCollapsed ? "true" : "false");
    }
}

function setArchivedChatHistoryCollapsed(collapsed, { persist = true } = {}) {
    isArchivedChatHistoryCollapsed = Boolean(collapsed);
    archivedHistorySection?.classList.toggle("chat-history-collapsed", isArchivedChatHistoryCollapsed);
    if (archivedChatList) archivedChatList.hidden = isArchivedChatHistoryCollapsed;
    if (archivedChatToggle) {
        archivedChatToggle.setAttribute("aria-expanded", String(!isArchivedChatHistoryCollapsed));
        archivedChatToggle.setAttribute("aria-label", isArchivedChatHistoryCollapsed ? "Expand archived chats" : "Collapse archived chats");
        archivedChatToggle.dataset.tooltip = isArchivedChatHistoryCollapsed ? "Expand archived" : "Collapse archived";
    }
    if (persist) {
        safeLocalStorageSet(ARCHIVED_CHAT_HISTORY_COLLAPSED_STORAGE_KEY, isArchivedChatHistoryCollapsed ? "true" : "false");
    }
}

function clearComposerDraft() {
    composerDraftRestoreToken += 1;
    if (input) {
        input.value = "";
        input.style.height = "auto";
    }
    if (previewContainer) previewContainer.innerHTML = "";
    attachedFiles = [];
    scheduleComposerSafeAreaUpdate();
}

function focusComposerInput({ force = false } = {}) {
    if (!input || input.disabled || input.readOnly) return;
    window.setTimeout(() => {
        if (!input || input.disabled || input.readOnly) return;
        const active = document.activeElement;
        const canFocus = force || !active || active === document.body || active === document.documentElement;
        if (!canFocus) return;
        try {
            input.focus({ preventScroll: true });
        } catch {
            input.focus();
        }
    }, 0);
}

function rehydrateAssistantActions(container) {
    if (!container) return;

    container.querySelectorAll(".assistant-action-btn").forEach(button => {
        button.disabled = false;
    });

    container.querySelectorAll(".output-node .bubble-block").forEach(block => {
        const messageNode = block.closest(".message-node.output-node");
        const messageIndex = normalizeHistoryIndex(messageNode?.dataset.historyIndex);
        const message = messageIndex !== null ? conversationHistory[messageIndex] : null;
        const timestamp = message?.createdAt || messageNode?.dataset.createdAt;
        const existingActions = block.querySelector(".assistant-message-actions:not(.user-message-actions)");
        if (existingActions) {
            appendMessageActionTime(existingActions, timestamp, "Response completed at");
            if (messageNode && timestamp) messageNode.dataset.createdAt = String(timestamp);
            return;
        }

        const legacyCopyButton = block.querySelector(".copy-action-btn");
        if (!legacyCopyButton?.dataset.copyText) return;

        setupAssistantActions(block, legacyCopyButton.dataset.copyText, {
            messageIndex,
            canRegenerate: messageIndex !== null,
            canFork: messageIndex !== null,
            completedAt: timestamp
        });
    });
}

function rehydrateUserPromptActions(container) {
    if (!container) return;

    container.querySelectorAll(".user-node .bubble-block").forEach(block => {
        const messageNode = block.closest(".message-node.user-node");
        const messageIndex = normalizeHistoryIndex(messageNode?.dataset.historyIndex);
        const message = messageIndex !== null ? conversationHistory[messageIndex] : null;
        const timestamp = message?.createdAt || messageNode?.dataset.createdAt;
        const existingActions = block.querySelector(".user-message-actions");
        if (existingActions) {
            prependMessageActionTime(existingActions, timestamp, "Prompt sent at");
            if (messageNode && timestamp) messageNode.dataset.createdAt = String(timestamp);
            return;
        }

        const bubble = block.querySelector(".bubble");
        const promptText = bubble?.textContent || "";
        if (!promptText) return;

        setupUserPromptActions(block, promptText, {
            sentAt: timestamp
        });
    });
}

function rehydrateRenderedChat(container) {
    if (!container) return;
    window.requestAnimationFrame(() => {
        rehydrateAssistantActions(container);
        rehydrateUserPromptActions(container);
        container.querySelectorAll(".assistant-tts-player").forEach(upgradeAssistantTtsPlayer);
        container.querySelectorAll(".web-sources").forEach(upgradeWebSourcesPanel);
        container.querySelectorAll(".code-combined-preview").forEach(bar => bar.remove());
        container.querySelectorAll(".code-block-wrapper").forEach(wrapper => {
            delete wrapper.dataset.codeEnhanced;
            delete wrapper.dataset.previewEnhanced;
        });
        setupCodeSandbox(container);
    });
}

function renderChatFromConversationHistoryFallback(history = conversationHistory) {
    if (!chat) return;
    chat.replaceChildren();
    history.forEach((message, index) => {
        const role = message?.role === "user" ? "user" : "output";
        const rawContent = String(message?.content || "").trim();
        if (!rawContent) return;

        const toolRequest = parseFaunaToolCall(rawContent);
        const visibleContent = role === "output"
            ? stripAssistantControlBlocks(rawContent) || (toolRequest ? getAssistantToolPlaceholder(toolRequest) : rawContent)
            : rawContent;
        const bubble = addRenderNode(visibleContent, role, [], {
            historyIndex: index,
            createdAt: message.createdAt,
            voiceRecording: message.voiceRecording,
            forceScroll: false
        });

        if (role === "output") {
            renderAssistantContentHtml(bubble, renderMarkdown(visibleContent), { final: true, busy: false });
            setupAssistantActions(bubble.parentElement, visibleContent, {
                messageIndex: index,
                canRegenerate: true,
                canFork: true,
                canSpeak: true,
                speakText: visibleContent
            });
        }
    });
}

async function createComposerDraftFileFromAttachment(attachment = {}) {
    if (attachment.liveFile instanceof File) return attachment.liveFile;

    if (attachment.path && typeof createDesktopAttachmentFile === "function") {
        return createDesktopAttachmentFile(attachment);
    }

    const sourceSrc = String(attachment.sourceSrc || "").trim();
    if (!sourceSrc || !/^(?:https?:|data:|fauna-app:|fauna-file:|file:)/i.test(sourceSrc)) return null;

    const response = await fetch(sourceSrc);
    if (!response.ok) throw new Error(`Could not restore ${attachment.name || "attachment"} (${response.status})`);
    const blob = await response.blob();
    const name = attachment.name || "attachment";
    const type = attachment.type || blob.type || (typeof inferAttachmentMimeType === "function" ? inferAttachmentMimeType(name) : "") || "application/octet-stream";
    const file = new File([blob], name, {
        type,
        lastModified: Number(attachment.lastModified || Date.now())
    });
    setFilePersistentPreviewSource?.(file, sourceSrc);
    if (attachment.librarySourceKey || attachment.librarySourceId) {
        defineHiddenFileValue?.(file, "__faunaLibrarySourceKey", attachment.librarySourceKey || "");
        defineHiddenFileValue?.(file, "__faunaLibrarySourceId", attachment.librarySourceId || "");
        defineHiddenFileValue?.(file, "__faunaLibrarySourceSrc", sourceSrc);
    }
    return file;
}

async function restoreComposerDraftAttachments(draft, restoreToken) {
    const serializedAttachments = Array.isArray(draft?.attachments) ? draft.attachments : [];
    const liveFiles = Array.isArray(draft?.liveFiles) ? draft.liveFiles.filter(file => file instanceof File) : [];
    const restoredFiles = [...liveFiles];

    for (const attachment of serializedAttachments) {
        try {
            const file = await createComposerDraftFileFromAttachment(attachment);
            if (file) restoredFiles.push(file);
        } catch (err) {
            console.warn("Could not restore composer draft attachment:", err);
        }
    }

    if (restoreToken !== composerDraftRestoreToken) return;
    attachedFiles = [];
    if (previewContainer) previewContainer.innerHTML = "";
    restoredFiles.forEach(file => {
        if (!isDuplicateAttachment(file)) {
            attachedFiles.push(file);
            renderPreviewPill(file);
        }
    });
    updateTokenDisplay();
    scheduleComposerSafeAreaUpdate();
}

function restoreComposerDraft(draft = createEmptyComposerDraft()) {
    const restoreToken = ++composerDraftRestoreToken;
    isRestoringComposerDraft = true;
    try {
        setComposerTextValue(draft?.text || "");
        attachedFiles = [];
        if (previewContainer) previewContainer.innerHTML = "";
        updateTokenDisplay();
        scheduleComposerSafeAreaUpdate();
    } finally {
        isRestoringComposerDraft = false;
    }
    void restoreComposerDraftAttachments(draft, restoreToken);
}

function restoreChatSessionToView(session, { closeWorkbench = true } = {}) {
    if (!session) return;
    if (closeWorkbench) closeCodeWorkbench();
    conversationHistory = cloneConversationHistory(session.conversationHistory);
    sessionTotalTokens = Math.max(sumHistoryTokenUsage(conversationHistory), normalizeTokenCount(session.sessionTotalTokens) || 0);
    clearComposerDraft();
    restoreComposerDraft(session.composerDraft);

    if (chat) {
        if (session.domNodes?.length) {
            chat.replaceChildren(...session.domNodes);
        } else if (session.chatHtml?.trim()) {
            chat.innerHTML = sanitizeChatHtmlMediaSources(session.chatHtml || "");
        } else if (conversationHistory.length > 0) {
            renderChatFromConversationHistoryFallback(conversationHistory);
        } else {
            chat.replaceChildren();
        }
        chat.style.display = activeChatHasContent() ? "block" : "none";
        scrollChatToBottom({ force: true });
        rehydrateRenderedChat(chat);
        applyActiveVoiceOrbTheme();
    }
    if (welcome) welcome.style.display = activeChatHasContent() ? "none" : "flex";

    updateTokenDisplay();
    updateActiveChatTitle();
    updateGenerationUi?.({ renderHistory: false });
}

function restoreEmptyChatDraft({ render = true, persist = true, updateUrl = true } = {}) {
    closeCodeWorkbench();
    clearClarifyingQuestionComposer();
    activeSessionId = null;
    conversationHistory = [];
    sessionTotalTokens = 0;
    clearComposerDraft();
    setChatTitleEditing(false);

    if (chat) {
        chat.replaceChildren();
        chat.style.display = "none";
    }
    if (welcome) welcome.style.display = "flex";

    updateTokenDisplay();
    updateActiveChatTitle();
    updateGenerationUi?.({ renderHistory: false });
    if (persist) persistChatSessions();
    if (render) renderChatHistory();
    if (updateUrl && activeWorkspaceView === WORKSPACE_VIEW_PLAYGROUND) {
        updateWorkspaceUrlFragment({ replace: true });
    }
}

function activateChatSession(sessionId, { captureCurrent = true, closeSidebar = true, updateUrl = true, urlMode = "push" } = {}) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    const isSwitchingSessions = activeSessionId !== sessionId;
    clearClarifyingQuestionComposer();
    closeChatSessionMenus();
    if (captureCurrent && activeSessionId && activeSessionId !== sessionId) {
        saveCurrentSession({ render: false, updateUrl: false });
    }
    activeSessionId = sessionId;
    if (typeof clearUnreadGenerationCompletion === "function") {
        clearUnreadGenerationCompletion(sessionId, { renderHistory: false });
    }
    restoreChatSessionToView(session, { closeWorkbench: isSwitchingSessions });
    if (activeWorkspaceView !== WORKSPACE_VIEW_PLAYGROUND) {
        setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { closeSidebar: false, updateUrl: false });
    }
    persistChatSessions();
    renderChatHistory();
    updateGenerationUi?.({ renderHistory: false });
    if (closeSidebar) sidebarController.close();
    if (updateUrl) updateWorkspaceUrlFragment({ replace: urlMode === "replace" });
}

function startNewChatSession({ notify = true, updateUrl = true, urlMode = "push" } = {}) {
    if (activeSessionId) {
        const currentSession = saveCurrentSession({ render: false, updateUrl: false });
        if (currentSession && !chatSessionHasContent(currentSession) && !currentSession.archived) {
            chatSessions = chatSessions.filter(session => session.id !== currentSession.id);
        }
    }

    restoreEmptyChatDraft({ updateUrl: false });
    setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl, urlMode });
    sidebarController.close();
    focusComposerInput({ force: true });
    if (notify) showToast("New chat ready.", "info");
}

function getNextVisibleSessionId(excludeId) {
    return chatSessions
        .filter(session => session.id !== excludeId && !session.archived)
        .sort(compareChatSessions)[0]?.id || null;
}

function toggleChatSessionPinned(sessionId) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    if (session.archived) {
        showToast("Archived chats cannot be pinned. Restore the chat first.", "warning");
        return;
    }
    if (session.id === activeSessionId) saveCurrentSession({ render: false });
    session.pinned = !session.pinned;
    session.updatedAt = new Date().toISOString();
    persistChatSessions();
    renderChatHistory();
    showToast(session.pinned ? "Chat pinned." : "Chat unpinned.", "success");
}

function toggleChatSessionArchived(sessionId) {
    const session = chatSessions.find(item => item.id === sessionId);
    if (!session) return;
    if (session.id === activeSessionId) saveCurrentSession({ render: false });
    session.archived = !session.archived;
    session.updatedAt = new Date().toISOString();

    if (session.archived && session.id === activeSessionId) {
        const nextId = getNextVisibleSessionId(session.id);
        if (nextId) {
            activateChatSession(nextId, { captureCurrent: false, closeSidebar: false });
        } else {
            restoreEmptyChatDraft();
        }
    } else {
        persistChatSessions();
        renderChatHistory();
    }

    showToast(session.archived ? "Chat archived." : "Chat restored.", "success");
}

async function deleteChatSession(sessionId) {
    const wasActive = sessionId === activeSessionId;
    const sessionToDelete = chatSessions.find(session => session.id === sessionId);
    if (!sessionToDelete) return;

    let libraryArchiveResult = { count: 0, saved: true };
    let mediaDeleteSaved = true;
    let openAiCleanupResult = { attempted: 0, deleted: 0, failed: 0 };

    if (wasActive) {
        sessionToDelete.chatHtml = sanitizeChatHtmlMediaSources(chat?.innerHTML || sessionToDelete.chatHtml || "");
        sessionToDelete.domNodes = chat ? Array.from(chat.childNodes) : sessionToDelete.domNodes;
        sessionToDelete.conversationHistory = cloneConversationHistory(conversationHistory);
        sessionToDelete.sessionTotalTokens = sessionTotalTokens;
    }

    syncUsageToolEventsFromSession(sessionToDelete, {
        html: sanitizeChatHtmlMediaSources(wasActive ? (chat?.innerHTML || sessionToDelete.chatHtml) : sessionToDelete.chatHtml)
    });

    const mediaDeleteKeys = collectLibraryMediaDeleteKeysFromSession(sessionToDelete);
    const approval = await showDeleteChatDialog(sessionToDelete, mediaDeleteKeys.size);
    if (!approval.approved) return;

    if (approval.deleteMedia) {
        openAiCleanupResult = await deleteOpenAiFilesForLibraryKeys(mediaDeleteKeys);
        mediaDeleteKeys.forEach(key => deletedLibraryItemKeys.add(key));
        persistedLibraryItems = persistedLibraryItems.filter(item => !mediaDeleteKeys.has(getLibraryItemPersistentKey(item)));
        mediaDeleteSaved = persistDeletedLibraryItemKeys() && persistStoredLibraryItems();
    } else {
        mediaDeleteKeys.clear();
    }

    libraryArchiveResult = archiveLibraryItemsFromSessions([sessionToDelete], { excludeKeys: mediaDeleteKeys });
    chatSessions = chatSessions.filter(session => session.id !== sessionId);

    if (chatSessions.length === 0) {
        restoreEmptyChatDraft();
    } else if (wasActive) {
        const nextId = getNextVisibleSessionId(sessionId) || chatSessions.sort(compareChatSessions)[0]?.id;
        activateChatSession(nextId, { captureCurrent: false, closeSidebar: false });
    } else {
        persistChatSessions();
        renderChatHistory();
    }

    const librarySaved = libraryArchiveResult.saved !== false && mediaDeleteSaved !== false && openAiCleanupResult.failed === 0;
    const cleanupMessage = getOpenAiCacheCleanupMessage(openAiCleanupResult);
    showToast(librarySaved
        ? (approval.deleteMedia ? "Chat deleted. Media removed from Library." : "Chat deleted.")
        : `Chat deleted, but Library changes could not be fully saved.${cleanupMessage}`, librarySaved ? "info" : "warning");
    refreshUsageSettingsPaneIfVisible();
    refreshLibraryViewIfActive();
}

function setWorkspaceNavState(view) {
    workspaceNavButtons.forEach(button => {
        const active = button.dataset.workspaceView === view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });
}

function setLibraryHeaderSummary(items = []) {
    if (!librarySummary && !tokenCounter) return;
    const imageCount = items.filter(item => item.type === "image").length;
    const videoCount = items.filter(item => item.type === "video").length;
    const codeCount = items.filter(item => item.type === "code").length;
    const itemLabel = `${items.length.toLocaleString()} ${items.length === 1 ? "item" : "items"}`;
    const summary = `${itemLabel} · ${imageCount} images · ${videoCount} videos · ${codeCount} code`;
    if (librarySummary) librarySummary.textContent = summary;
    if (tokenCounter && activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        tokenCounter.textContent = summary;
        tokenCounter.dataset.tooltip = "Library items from chats and uploads.";
        tokenCounter.setAttribute("aria-label", summary);
    }
}

function getLibraryStatMarkup(label, value) {
    return `<span class="library-stat"><strong>${value.toLocaleString()}</strong><span>${label}</span></span>`;
}

function renderLibraryStats(items = []) {
    if (!libraryStats) return;
    const counts = {
        Images: items.filter(item => item.type === "image").length,
        Videos: items.filter(item => item.type === "video").length,
        Code: items.filter(item => item.type === "code").length
    };
    libraryStats.innerHTML = Object.entries(counts)
        .map(([label, value]) => getLibraryStatMarkup(label, value))
        .join("");
}

function formatLibraryUploadSize(size) {
    const bytes = Number(size || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function getLibraryUploadLanguage(file) {
    const fileName = String(file?.name || "");
    const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
    const aliases = {
        htm: "html",
        mjs: "js",
        jsx: "js",
        tsx: "ts",
        md: "markdown",
        py: "python",
        ps1: "powershell",
        sh: "shell",
        txt: "text"
    };
    return normalizeCodeLanguage(aliases[extension] || extension || file?.type || "text");
}

function isLibraryUploadCodeFile(file) {
    if (!(file instanceof File)) return false;
    return file.type.startsWith("text/") ||
        ["application/json", "application/javascript"].includes(file.type) ||
        isCodeLikeAttachment(file);
}

function getLibraryUploadType(file) {
    if (!(file instanceof File)) return "";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (isLibraryUploadCodeFile(file)) return "code";
    return "";
}

async function createUploadedLibraryItem(file, index = 0) {
    const type = getLibraryUploadType(file);
    if (!type) return null;

    const now = new Date().toISOString();
    const title = file.name || (type === "image" ? "Uploaded image" : type === "video" ? "Uploaded video" : "Uploaded code");
    const sizeLabel = formatLibraryUploadSize(file.size);
    const titleExt = String(title).includes(".") ? String(title).split(".").pop() : "";
    const extension = getMimeExtension(file.type, titleExt || type).toUpperCase();
    const base = {
        type,
        origin: "upload",
        title,
        sessionTitle: "Manual upload",
        sessionId: "manual-library-upload",
        createdAt: now,
        updatedAt: now,
        storedAt: now,
        persisted: true
    };

    if (type === "image" || type === "video") {
        const desktopRef = prepareDesktopFileReference(file);
        if (desktopRef.url) {
            return {
                ...base,
                id: getLibraryItemId(`upload-${type}`, { id: "manual-library-upload" }, `${title}:${file.size}:${file.lastModified}:${desktopRef.path || desktopRef.url}`, index),
                detail: [type === "image" ? "Uploaded image" : "Uploaded video", extension, sizeLabel].filter(Boolean).join(" · "),
                src: desktopRef.url,
                filePath: desktopRef.path,
                alt: title
            };
        }
        const dataBase64 = await blobToBase64(file);
        const mimeType = file.type || (type === "image" ? "image/png" : "video/mp4");
        const src = `data:${mimeType};base64,${dataBase64}`;
        return {
            ...base,
            id: getLibraryItemId(`upload-${type}`, { id: "manual-library-upload" }, `${title}:${file.size}:${file.lastModified}:${src.slice(0, 4096)}`, index),
            detail: [type === "image" ? "Uploaded image" : "Uploaded video", extension, sizeLabel].filter(Boolean).join(" · "),
            src,
            alt: title
        };
    }

    const code = await file.text();
    if (!code.trim()) return null;
    const lang = getLibraryUploadLanguage(file);
    const kind = getCodeBlockKind(lang, code) || lang || "text";
    return {
        ...base,
        id: getLibraryItemId("upload-code", { id: "manual-library-upload" }, `${title}:${file.size}:${file.lastModified}:${code.slice(0, 4096)}`, index),
        detail: getCodeLibraryMeta(lang, kind, code),
        code,
        lang,
        kind,
        fileName: title
    };
}

async function addUploadedFilesToLibrary(files) {
    const fileList = Array.from(files || []).filter(file => file instanceof File);
    if (fileList.length === 0) return;

    if (libraryUploadButton) {
        libraryUploadButton.disabled = true;
        libraryUploadButton.setAttribute("aria-busy", "true");
    }

    const existingKeys = new Set(collectLibraryItems().map(getLibraryItemPersistentKey));
    const additions = [];
    let skipped = 0;

    for (const [index, file] of fileList.entries()) {
        try {
            const normalized = normalizeStoredLibraryItem(await createUploadedLibraryItem(file, index));
            const key = getLibraryItemPersistentKey(normalized);
            if (!normalized || !key || existingKeys.has(key)) {
                skipped += 1;
                continue;
            }
            deletedLibraryItemKeys.delete(key);
            existingKeys.add(key);
            additions.push(normalized);
        } catch (err) {
            console.warn("Could not upload file to Library:", err);
            skipped += 1;
        }
    }

    if (additions.length > 0) {
        persistedLibraryItems = [...additions, ...persistedLibraryItems];
    }

    const deletedSaved = persistDeletedLibraryItemKeys();
    const storedSaved = additions.length > 0 ? persistStoredLibraryItems() : true;
    renderLibraryView();
    if (libraryPickerModal && !libraryPickerModal.hidden) renderLibraryPicker();

    if (libraryUploadButton) {
        libraryUploadButton.disabled = false;
        libraryUploadButton.setAttribute("aria-busy", "false");
    }

    if (additions.length > 0) {
        const suffix = skipped > 0 ? ` ${skipped} skipped.` : "";
        showToast(
            storedSaved && deletedSaved
                ? `Uploaded ${additions.length.toLocaleString()} ${additions.length === 1 ? "item" : "items"} to Library.${suffix}`
                : `Uploaded ${additions.length.toLocaleString()} ${additions.length === 1 ? "item" : "items"}, but saving may fail after reload.${suffix}`,
            storedSaved && deletedSaved ? "success" : "warning"
        );
    } else {
        showToast(skipped > 0 ? "No supported new files were uploaded." : "No files selected.", "info");
    }
}

function setLibraryFilter(filter) {
    activeLibraryFilter = ["all", "images", "videos", "code"].includes(filter) ? filter : LIBRARY_FILTER_ALL;
    libraryFilterButtons.forEach(button => {
        const active = button.dataset.libraryFilter === activeLibraryFilter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    scheduleAnimatedSegmentIndicators();
    renderLibraryView();
}

function normalizeLibraryLayout(layout) {
    return layout === LIBRARY_LAYOUT_LIST ? LIBRARY_LAYOUT_LIST : LIBRARY_LAYOUT_GRID;
}

function updateLibraryLayoutControls() {
    libraryLayoutButtons.forEach(button => {
        const active = normalizeLibraryLayout(button.dataset.libraryLayout) === activeLibraryLayout;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function applyLibraryLayoutToGrid() {
    if (!libraryGrid) return;
    const isList = activeLibraryLayout === LIBRARY_LAYOUT_LIST;
    delete libraryGrid.dataset.libraryLayout;
    libraryGrid.dataset.libraryCurrentLayout = activeLibraryLayout;
    libraryGrid.classList.toggle("library-layout-grid", !isList);
    libraryGrid.classList.toggle("library-layout-list", isList);
}

function setLibraryLayout(layout, { persist = true } = {}) {
    activeLibraryLayout = normalizeLibraryLayout(layout);
    if (persist) safeLocalStorageSet(LIBRARY_LAYOUT_STORAGE_KEY, activeLibraryLayout);
    updateLibraryLayoutControls();
    applyLibraryLayoutToGrid();
    scheduleAnimatedSegmentIndicators();
}

function getLibraryItemFilterType(item) {
    if (item.type === "image") return "images";
    if (item.type === "video") return "videos";
    return "code";
}

function getLibraryItemPersistentKey(item) {
    const id = String(item?.id || "").trim();
    if (id) return `id:${id}`;
    if (item?.type === "code") {
        return `code:${item.sessionId || ""}:${item.lang || ""}:${item.code || ""}`;
    }
    return `${item?.type || "item"}:${item?.origin || ""}:${item?.sessionId || ""}:${item?.src || ""}`;
}

function getLibraryItemByPersistentKey(sourceKey) {
    const value = String(sourceKey || "").trim();
    if (!value) return null;
    return persistedLibraryItems.find(item => (
        getLibraryItemPersistentKey(item) === value ||
        String(item?.id || "") === value ||
        `id:${item?.id || ""}` === value
    )) || null;
}

function getRestorableLibraryMediaSource(sourceKey, mediaType = "image") {
    const item = getLibraryItemByPersistentKey(sourceKey);
    const src = String(item?.src || "").trim();
    if (!src || /^blob:/i.test(src)) return "";
    if (isDesktopFileMediaSource(src)) return src;
    if (mediaType === "image") return /^(?:data:image\/|https?:)/i.test(src) ? src : "";
    if (mediaType === "video") return /^(?:data:video\/|https?:)/i.test(src) ? src : "";
    if (mediaType === "audio") return /^(?:data:audio\/|https?:)/i.test(src) ? src : "";
    return /^(?:data:(?:image|video|audio)\/|https?:)/i.test(src) ? src : "";
}

function getElementMediaType(element) {
    const tagName = String(element?.tagName || "").toLowerCase();
    if (tagName === "source") {
        const parentTag = String(element.parentElement?.tagName || "").toLowerCase();
        if (["picture", "img"].includes(parentTag)) return "image";
        if (["video", "audio"].includes(parentTag)) return parentTag;
    }
    if (["img", "image"].includes(tagName)) return "image";
    if (["video", "audio"].includes(tagName)) return tagName;
    return "media";
}

function sanitizeChatHtmlMediaSources(html = "") {
    const markup = String(html || "");
    if (!markup || !/blob:/i.test(markup)) return markup;

    const template = document.createElement("template");
    template.innerHTML = markup;
    template.content.querySelectorAll("img, video, audio, source").forEach(element => {
        const src = String(element.getAttribute("src") || "").trim();
        const srcset = String(element.getAttribute("srcset") || "").trim();
        if (!/^blob:/i.test(src) && !/blob:/i.test(srcset)) return;

        const mediaType = getElementMediaType(element);
        const sourceKey = element.dataset.faunaLibrarySourceKey ||
            element.closest("[data-fauna-library-source-key]")?.dataset.faunaLibrarySourceKey ||
            "";
        const restoredSrc = getRestorableLibraryMediaSource(sourceKey, mediaType);
        element.removeAttribute("srcset");

        if (restoredSrc) {
            element.setAttribute("src", restoredSrc);
            return;
        }

        element.dataset.faunaMissingBlob = "true";
        if (mediaType === "image") {
            element.setAttribute("src", TRANSPARENT_PIXEL_DATA_URL);
            if (!element.getAttribute("alt")) element.setAttribute("alt", "Image unavailable after reload");
        } else {
            element.removeAttribute("src");
        }
    });
    return template.innerHTML;
}

function isPersistableLibraryMediaSrc(src) {
    const value = String(src || "").trim();
    if (!value) return false;
    if (value.includes("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")) return false;
    return /^(?:https?:|data:(?:image|video|audio)\/)/i.test(value) || isDesktopFileMediaSource(value);
}

function normalizeStoredLibraryItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = ["image", "video", "code"].includes(raw.type) ? raw.type : "";
    if (!type) return null;

    const sessionId = String(raw.sessionId || "").trim();
    const sourceValue = raw.src || raw.code || raw.fileName || raw.title || "";
    const fallbackId = getLibraryItemId(`stored-${type}`, { id: sessionId || "library" }, sourceValue, 0);
    const now = new Date().toISOString();
    const base = {
        id: String(raw.id || fallbackId),
        type,
        origin: String(raw.origin || (type === "image" ? "assistant" : "assistant")),
        title: String(raw.title || (type === "code" ? "Code" : type === "video" ? "Generated video" : "Image")),
        detail: String(raw.detail || ""),
        sessionTitle: String(raw.sessionTitle || "Deleted chat"),
        sessionId,
        createdAt: raw.createdAt || raw.updatedAt || raw.storedAt || now,
        updatedAt: raw.updatedAt || raw.createdAt || raw.storedAt || now,
        storedAt: raw.storedAt || now,
        persisted: true
    };

    if (type === "code") {
        const code = String(raw.code || "");
        if (!code.trim()) return null;
        const lang = normalizeCodeLanguage(raw.lang || raw.kind || "");
        const kind = getCodeBlockKind(lang, code) || raw.kind || lang || "text";
        return {
            ...base,
            code,
            lang,
            kind,
            fileName: String(raw.fileName || raw.title || getCodeDownloadName(lang, kind, "fauna-artifact"))
        };
    }

    const src = String(raw.src || "").trim();
    if (!isPersistableLibraryMediaSrc(src)) return null;
    return {
        ...base,
        src,
        filePath: String(raw.filePath || ""),
        fileName: String(raw.fileName || ""),
        alt: String(raw.alt || raw.detail || raw.title || base.title)
    };
}

function readStoredLibraryItems() {
    const raw = safeLocalStorageGet(LIBRARY_ITEMS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeStoredLibraryItem)
            .filter(item => {
                const key = getLibraryItemPersistentKey(item);
                if (!item || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse saved Fauna Library items:", err);
        return [];
    }
}

function persistStoredLibraryItems() {
    if (persistedLibraryItems.length === 0) {
        return safeLocalStorageRemove(LIBRARY_ITEMS_STORAGE_KEY);
    }
    return safeLocalStorageSet(LIBRARY_ITEMS_STORAGE_KEY, JSON.stringify(persistedLibraryItems));
}

function readDeletedLibraryItemKeys() {
    const raw = safeLocalStorageGet(LIBRARY_DELETED_ITEMS_STORAGE_KEY);
    if (!raw) return new Set();
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.map(value => String(value || "").trim()).filter(Boolean));
    } catch (err) {
        console.warn("Could not parse deleted Fauna Library items:", err);
        return new Set();
    }
}

function persistDeletedLibraryItemKeys() {
    if (deletedLibraryItemKeys.size === 0) {
        return safeLocalStorageRemove(LIBRARY_DELETED_ITEMS_STORAGE_KEY);
    }
    return safeLocalStorageSet(
        LIBRARY_DELETED_ITEMS_STORAGE_KEY,
        JSON.stringify(Array.from(deletedLibraryItemKeys))
    );
}

function isLibraryItemDeleted(item) {
    return deletedLibraryItemKeys.has(getLibraryItemPersistentKey(item));
}

function getOpenAiCacheCleanupMessage(result) {
    if (!result || result.attempted === 0) return "";
    if (result.failed > 0) {
        return ` OpenAI storage cleanup failed for ${result.failed.toLocaleString()} ${result.failed === 1 ? "file" : "files"}.`;
    }
    return "";
}

async function deleteOpenAiFilesForLibraryKeys(keys, signal = null) {
    const keySet = keys instanceof Set
        ? new Set(Array.from(keys).map(value => String(value || "").trim()).filter(Boolean))
        : new Set(Array.from(keys || []).map(value => String(value || "").trim()).filter(Boolean));
    if (keySet.size === 0) return { attempted: 0, deleted: 0, failed: 0 };

    openAiFileCache = readStoredOpenAiFileCache();
    if (openAiFileCache.length === 0) return { attempted: 0, deleted: 0, failed: 0 };

    const remainingLibraryKeys = new Set(
        collectLibraryItems()
            .map(getLibraryItemPersistentKey)
            .filter(key => key && !keySet.has(key))
    );
    const nextCache = [];
    const now = new Date().toISOString();
    const result = { attempted: 0, deleted: 0, failed: 0 };

    for (const entry of openAiFileCache) {
        const libraryKeys = Array.isArray(entry.libraryKeys) ? entry.libraryKeys : [];
        const matchesDeletedLibrary = libraryKeys.some(key => keySet.has(key));
        if (!matchesDeletedLibrary) {
            nextCache.push(entry);
            continue;
        }

        const keptLibraryKeys = libraryKeys.filter(key => !keySet.has(key));
        const stillUsedByLibrary = keptLibraryKeys.some(key => remainingLibraryKeys.has(key));
        if (stillUsedByLibrary) {
            nextCache.push({
                ...entry,
                libraryKeys: keptLibraryKeys,
                updatedAt: now
            });
            continue;
        }

        result.attempted += 1;
        try {
            await deleteOpenAiStoredFile(entry.fileId, signal);
            result.deleted += 1;
        } catch (err) {
            result.failed += 1;
            console.warn("Could not delete OpenAI file for removed Library item:", err);
            nextCache.push({
                ...entry,
                libraryKeys: keptLibraryKeys,
                pendingDelete: true,
                pendingDeleteAt: now,
                pendingDeleteReason: err.message || "OpenAI storage cleanup failed",
                updatedAt: now
            });
        }
    }

    openAiFileCache = nextCache;
    persistOpenAiFileCache();
    return result;
}

function archiveLibraryItemsFromSessions(sessions = [], { excludeKeys = new Set() } = {}) {
    const sessionList = Array.isArray(sessions) ? sessions.filter(Boolean) : [];
    if (sessionList.length === 0) return { count: 0, saved: true };

    const skippedKeys = excludeKeys instanceof Set ? excludeKeys : new Set(excludeKeys || []);
    const existingKeys = new Set(persistedLibraryItems.map(getLibraryItemPersistentKey));
    const additions = [];
    sessionList.forEach(session => {
        collectLibraryItemsFromSession(session).forEach(item => {
            const stored = normalizeStoredLibraryItem({
                ...item,
                sessionTitle: item.sessionTitle || getLibrarySessionTitle(session),
                sessionId: item.sessionId || session.id,
                storedAt: new Date().toISOString()
            });
            const key = getLibraryItemPersistentKey(stored);
            if (!stored || skippedKeys.has(key) || deletedLibraryItemKeys.has(key) || existingKeys.has(key)) return;
            existingKeys.add(key);
            additions.push(stored);
        });
    });

    if (additions.length === 0) return { count: 0, saved: true };
    persistedLibraryItems = [...additions, ...persistedLibraryItems];
    return { count: additions.length, saved: persistStoredLibraryItems() };
}

function getFilteredLibraryItems(items) {
    if (activeLibraryFilter === LIBRARY_FILTER_ALL) return items;
    return items.filter(item => getLibraryItemFilterType(item) === activeLibraryFilter);
}

function getSessionLibraryRoot(session) {
    const root = document.createElement("div");
    if (Array.isArray(session?.domNodes) && session.domNodes.length > 0) {
        root.append(...session.domNodes.map(node => node.cloneNode(true)));
        return root;
    }
    root.innerHTML = sanitizeChatHtmlMediaSources(session?.chatHtml || "");
    return root;
}

function getLibrarySessionTitle(session) {
    return cleanSessionTitle(session?.title || "Current Session", 56);
}

function getMessageNodeText(node) {
    return String(node?.querySelector(".bubble")?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
}

function getGeneratedMediaCaption(element) {
    return String(
        element.closest(".generated-image-card, .generated-video-card")
            ?.querySelector(".generated-image-caption, .generated-video-caption")
            ?.textContent || ""
    ).replace(/\s+/g, " ").trim();
}

function getLibraryPromptFromGeneratedCaption(caption, fallback = "") {
    const value = String(caption || fallback || "").trim();
    const split = value.match(/^[^:]{1,48}:\s*([\s\S]+)$/);
    return (split?.[1] || value).trim();
}

function isUsableLibraryMediaSrc(src, session = null) {
    const value = String(src || "").trim();
    if (!value) return false;
    if (value.includes("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")) return false;
    if (/^blob:/i.test(value) && !(Array.isArray(session?.domNodes) && session.domNodes.length > 0)) return false;
    return /^(?:https?:|blob:|data:(?:image|video|audio)\/)/i.test(value) || isDesktopFileMediaSource(value);
}

function getLibraryItemId(prefix, session, value, index) {
    const source = `${session?.id || "session"}:${value || ""}:${index}`;
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    return `${prefix}-${Math.abs(hash).toString(36)}-${index}`;
}

function getUserImageAttachmentName(img) {
    const wrapper = img?.closest?.(".bubble-image-attachment");
    const label = wrapper?.querySelector?.(".bubble-image-name")?.textContent || "";
    const alt = img?.getAttribute?.("alt") || "";
    const value = String(label || alt || "").replace(/\s+/g, " ").trim();
    if (!value || /^(?:image|image attachment|user image)$/i.test(value)) return "";
    return value;
}

function collectLibraryImagesFromSession(session, root, seen) {
    const items = [];
    const sessionTitle = getLibrarySessionTitle(session);

    root.querySelectorAll(".user-node .bubble-attachments img, .user-node img.bubble-img").forEach((img, index) => {
        if (img.dataset.faunaLibraryAttachment === "true" || img.dataset.faunaLibrarySourceKey) return;
        const src = img.getAttribute("src") || img.src || "";
        const key = `image:user:${session.id}:${src}`;
        if (!isUsableLibraryMediaSrc(src, session) || seen.has(key)) return;
        seen.add(key);
        const prompt = getMessageNodeText(img.closest(".message-node"));
        const fileName = getUserImageAttachmentName(img);
        items.push({
            id: getLibraryItemId("user-image", session, src, index),
            type: "image",
            origin: "user",
            title: fileName || "User image",
            detail: prompt || "Image attachment",
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            src,
            fileName,
            alt: fileName || img.getAttribute("alt") || prompt || "User image"
        });
    });

    root.querySelectorAll(".output-node img.generated-image, .output-node .generated-image-card img").forEach((img, index) => {
        const src = img.getAttribute("src") || img.src || "";
        const key = `image:generated:${session.id}:${src}`;
        if (!isUsableLibraryMediaSrc(src, session) || seen.has(key)) return;
        seen.add(key);
        const caption = getGeneratedMediaCaption(img);
        const prompt = getLibraryPromptFromGeneratedCaption(caption, img.getAttribute("alt") || "");
        items.push({
            id: getLibraryItemId("generated-image", session, src, index),
            type: "image",
            origin: "assistant",
            title: caption?.split(":")[0] || "Generated image",
            detail: prompt || "Generated image",
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            src,
            alt: img.getAttribute("alt") || prompt || "Generated image"
        });
    });

    return items;
}

function collectLibraryVideosFromSession(session, root, seen) {
    const items = [];
    const sessionTitle = getLibrarySessionTitle(session);
    root.querySelectorAll(".output-node video.generated-video, .output-node .generated-video-card video").forEach((video, index) => {
        const src = video.getAttribute("src") || video.currentSrc || video.src || "";
        const key = `video:${session.id}:${src}`;
        if (!isUsableLibraryMediaSrc(src, session) || seen.has(key)) return;
        seen.add(key);
        const caption = getGeneratedMediaCaption(video);
        items.push({
            id: getLibraryItemId("video", session, src, index),
            type: "video",
            origin: "assistant",
            title: caption?.split(":")[0] || "Generated video",
            detail: getLibraryPromptFromGeneratedCaption(caption, "Generated video"),
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            src
        });
    });
    return items;
}

function getCodeElementLanguage(codeElement) {
    let lang = "";
    codeElement?.classList?.forEach(className => {
        if (className.startsWith("lang-")) lang = className.replace("lang-", "");
    });
    return normalizeCodeLanguage(lang);
}

function collectLibraryCodeFromSession(session, root, seen) {
    const items = [];
    const sessionTitle = getLibrarySessionTitle(session);
    root.querySelectorAll(".output-node pre code").forEach((codeElement, index) => {
        const code = getRawCodeFromCodeElement(codeElement).trim();
        if (!code) return;
        const lang = getCodeElementLanguage(codeElement);
        const kind = getCodeBlockKind(lang, code);
        const wrapper = codeElement.closest(".code-block-wrapper");
        const explicitName = wrapper?.dataset?.codeFileName || "";
        const title = explicitName || getCodeDownloadName(lang, kind, "fauna-artifact");
        const key = `code:${session.id}:${lang}:${code}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
            id: getLibraryItemId("code", session, `${lang}:${code.slice(0, 160)}`, index),
            type: "code",
            origin: "assistant",
            title,
            detail: getCodeLibraryMeta(lang, kind, code),
            sessionTitle,
            sessionId: session.id,
            createdAt: session.createdAt || session.updatedAt || "",
            updatedAt: session.updatedAt || session.createdAt || "",
            code,
            lang,
            kind,
            fileName: title
        });
    });
    return items;
}

function getCodeLibraryMeta(lang, kind, code) {
    const label = getCodeLanguageLabel(lang, kind) || "Code";
    const lines = String(code || "").split("\n").length;
    return `${label} · ${lines.toLocaleString()} ${lines === 1 ? "line" : "lines"}`;
}

function collectLibraryItemsFromSession(session, seen = new Set()) {
    if (!chatSessionHasContent(session)) return [];
    const root = getSessionLibraryRoot(session);
    return [
        ...collectLibraryImagesFromSession(session, root, seen),
        ...collectLibraryVideosFromSession(session, root, seen),
        ...collectLibraryCodeFromSession(session, root, seen)
    ];
}

function collectLibraryMediaDeleteKeysFromSession(session) {
    const keys = new Set();
    if (!chatSessionHasContent(session)) return keys;

    const root = getSessionLibraryRoot(session);
    const seen = new Set();
    [
        ...collectLibraryImagesFromSession(session, root, seen),
        ...collectLibraryVideosFromSession(session, root, seen)
    ].forEach(item => {
        const key = getLibraryItemPersistentKey(item);
        if (key) keys.add(key);
    });

    return keys;
}

function collectLibraryItems() {
    const liveSeen = new Set();
    const liveItems = chatSessions
        .filter(chatSessionHasContent)
        .sort(compareChatSessions)
        .flatMap(session => collectLibraryItemsFromSession(session, liveSeen));
    const merged = [];
    const mergedKeys = new Set();
    [...liveItems, ...persistedLibraryItems].forEach(item => {
        const key = getLibraryItemPersistentKey(item);
        if (!item || deletedLibraryItemKeys.has(key) || mergedKeys.has(key)) return;
        mergedKeys.add(key);
        merged.push(item);
    });
    return merged;
}

function getLibraryItemCreatedTime(item) {
    const value = Date.parse(item?.createdAt || item?.updatedAt || "");
    return Number.isFinite(value) ? value : 0;
}

function formatLibraryItemDate(item) {
    const timestamp = getLibraryItemCreatedTime(item);
    if (!timestamp) return "Unknown date";
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(timestamp));
    } catch {
        return new Date(timestamp).toLocaleString();
    }
}

function getLibraryItemKindLabel(item) {
    if (item?.type === "image") {
        if (item.origin === "upload") return "Uploaded image";
        return item.origin === "user" ? "User image" : "Generated image";
    }
    if (item?.type === "video") return item.origin === "upload" ? "Uploaded video" : "Video";
    return item?.origin === "upload" ? "Uploaded code" : "Code";
}

function getLibraryPickerSearchText(item) {
    return [
        item.title,
        item.detail,
        item.sessionTitle,
        item.fileName,
        item.lang,
        item.type,
        item.origin,
        formatLibraryItemDate(item)
    ].filter(Boolean).join(" ").toLowerCase();
}

function getLibraryPickerItems() {
    const query = libraryPickerQuery.trim().toLowerCase();
    return collectLibraryItems()
        .filter(item => {
            if (libraryPickerTypeFilter !== LIBRARY_PICKER_TYPE_ALL && getLibraryItemFilterType(item) !== libraryPickerTypeFilter) {
                return false;
            }
            if (!query) return true;
            return getLibraryPickerSearchText(item).includes(query);
        })
        .sort((a, b) => {
            const diff = getLibraryItemCreatedTime(a) - getLibraryItemCreatedTime(b);
            return libraryPickerSortOrder === "oldest" ? diff : -diff;
        });
}

function setLibraryPickerTypeFilter(type) {
    libraryPickerTypeFilter = ["all", "images", "videos", "code"].includes(type) ? type : LIBRARY_PICKER_TYPE_ALL;
    libraryPickerTypeButtons.forEach(button => {
        const active = button.dataset.libraryPickerType === libraryPickerTypeFilter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    renderLibraryPicker();
}

function setLibraryPickerSortOrder(sortOrder) {
    libraryPickerSortOrder = sortOrder === "oldest" ? "oldest" : LIBRARY_PICKER_SORT_NEWEST;
    libraryPickerSortButtons.forEach(button => {
        const active = button.dataset.libraryPickerSort === libraryPickerSortOrder;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    renderLibraryPicker();
}

function updateLibraryPickerSelectionUi() {
    const selectedCount = libraryPickerSelectedIds.size;
    if (libraryPickerSelectionCount) {
        libraryPickerSelectionCount.textContent = `${selectedCount} selected`;
    }
    if (libraryPickerAttach) {
        libraryPickerAttach.disabled = selectedCount === 0;
        libraryPickerAttach.textContent = selectedCount > 0
            ? `Attach ${selectedCount}`
            : "Attach selected";
    }
    libraryPickerGrid?.querySelectorAll("[data-library-picker-item-id]").forEach(button => {
        const selected = libraryPickerSelectedIds.has(button.dataset.libraryPickerItemId);
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

function toggleLibraryPickerSelection(itemId) {
    if (!itemId) return;
    if (libraryPickerSelectedIds.has(itemId)) {
        libraryPickerSelectedIds.delete(itemId);
    } else {
        libraryPickerSelectedIds.add(itemId);
    }
    updateLibraryPickerSelectionUi();
}

function createLibraryPickerPreview(item) {
    const preview = document.createElement("span");
    preview.className = `library-picker-preview library-picker-preview-${item.type}`;

    if (item.type === "image") {
        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.alt || item.title || "Library image";
        img.loading = "lazy";
        img.decoding = "async";
        preview.appendChild(img);
        return preview;
    }

    if (item.type === "video") {
        preview.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7Z"></path></svg>
        `;
        return preview;
    }

    const code = document.createElement("code");
    code.textContent = String(item.code || "").split("\n").slice(0, 5).join("\n");
    preview.appendChild(code);
    return preview;
}

