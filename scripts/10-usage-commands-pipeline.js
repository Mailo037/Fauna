// Original script.js lines 14149-15357.
function getCurrentProviderLabel() {
    return isOpenAiProvider() ? "OpenAI" : "Ollama";
}

function getCurrentModelLabel() {
    return isOpenAiProvider() ? getOpenAiChatModel() : OLLAMA_MODEL;
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatMessagePreview(message, maxLength = 96) {
    const text = String(message?.content || "")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "[No text]";
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function getLastMessageInfo() {
    const message = conversationHistory[conversationHistory.length - 1];
    if (!message) return "None";
    const model = message.model ? ` · ${message.model}` : "";
    return `${message.role || "message"}${model}: ${formatMessagePreview(message)}`;
}

function getMostUsedModelInfo() {
    const counts = new Map();
    conversationHistory.forEach(message => {
        const model = normalizeModelId(message?.model);
        if (!model) return;
        counts.set(model, (counts.get(model) || 0) + 1);
    });
    if (counts.size === 0) return "Not tracked yet";
    const [model, count] = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return `${model} (${count} ${count === 1 ? "message" : "messages"})`;
}

function getChatInfoText() {
    const session = getActiveSession();
    const userCount = conversationHistory.filter(message => message.role === "user").length;
    const assistantCount = conversationHistory.filter(message => message.role === "assistant").length;
    const title = session?.title || "Current Session";
    const created = session?.createdAt ? new Date(session.createdAt).toLocaleString() : "Not saved yet";
    const updated = session?.updatedAt ? new Date(session.updatedAt).toLocaleString() : "Not saved yet";
    const activeLabel = activeSessionId ? activeSessionId : "Draft";
    const createdAt = session?.createdAt ? new Date(session.createdAt) : appStartedAt;
    const runtimeBase = Number.isNaN(createdAt.getTime()) ? appStartedAt : createdAt;

    return [
        "Chat info",
        `Title: ${title}`,
        `Session: ${activeLabel}`,
        `Runtime: ${formatDuration(Date.now() - runtimeBase.getTime())}`,
        `App runtime: ${formatDuration(Date.now() - appStartedAt.getTime())}`,
        `Messages: ${conversationHistory.length} (${userCount} user, ${assistantCount} assistant)`,
        `Last message: ${getLastMessageInfo()}`,
        `Session tokens: ${sessionTotalTokens.toLocaleString()}`,
        `Provider: ${getCurrentProviderLabel()}`,
        `Current model: ${getCurrentModelLabel()}`,
        `Most used model: ${getMostUsedModelInfo()}`,
        `Memory beta: ${isMemoryEnabled ? "On" : "Off"} (${getMemoryCountLabel()})`,
        `Created: ${created}`,
        `Updated: ${updated}`
    ].join("\n");
}

function getLocalDateKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfLocalDay(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addLocalDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
}

function parseStoredDate(...values) {
    for (const value of values) {
        const date = new Date(value || "");
        if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
}

function formatFullDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function formatMonthLabel(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatTokenAmount(value) {
    const count = normalizeTokenCount(value) || 0;
    if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
    const safeCount = Number(count) || 0;
    return `${safeCount.toLocaleString()} ${safeCount === 1 ? singular : plural}`;
}

function incrementUsageCount(map, key, count = 1) {
    const label = String(key || "").trim();
    if (!label) return;
    map.set(label, (map.get(label) || 0) + count);
}

function getTopUsageEntry(map) {
    if (!(map instanceof Map) || map.size === 0) return null;
    const [label, count] = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { label, count };
}

function getSessionTokenTotal(session) {
    return Math.max(
        sumHistoryTokenUsage(session?.conversationHistory || []),
        normalizeTokenCount(session?.sessionTotalTokens) || 0
    );
}

function getWeekKeyForDate(date) {
    const start = startOfLocalDay(date);
    start.setDate(start.getDate() - start.getDay());
    return getLocalDateKey(start);
}

function parseLocalDateKey(key) {
    const [year, month, day] = String(key || "").split("-").map(Number);
    if (!year || !month || !day) return startOfLocalDay();
    return new Date(year, month - 1, day);
}

function getUsageToolLabelFromRow(row) {
    const kind = row.dataset.toolKind || "tool";
    const tool = row.dataset.toolName || "";
    const label = row.querySelector(".tool-activity-label")?.textContent?.trim();
    const normalizedLabel = normalizeUsageToolLabel({ kind, tool, label });
    if (normalizedLabel && normalizedLabel !== "Done") return normalizedLabel;
    if (label && !normalizedLabel) return "";
    if (kind === "web") return "Web search";
    if (kind === "workspace") return "Workspace tool";
    if (kind === "terminal") return "Terminal command";
    if (kind === "memory") return "Memory tool";
    if (kind === "image") return "Image generation";
    return "Tool call";
}

function getUsageToolEventId({ sessionId, index, kind, label }) {
    return [
        "tool",
        sessionId || "draft",
        index,
        String(kind || "tool").trim().toLowerCase(),
        String(label || "Tool call").trim().toLowerCase()
    ].join(":");
}

function getUsageToolEventsFromHtml(html, { sessionId = "", date = new Date().toISOString() } = {}) {
    if (!html) return [];
    const template = document.createElement("template");
    template.innerHTML = String(html);
    return Array.from(template.content.querySelectorAll(".tool-activity-row:not(.tool-activity-row-preview):not(.tool-activity-row-done)"))
        .map((row, index) => {
            const kind = row.dataset.toolKind || "tool";
            const tool = row.dataset.toolName || "";
            const label = getUsageToolLabelFromRow(row);
            if (!label) return null;
            return {
                id: getUsageToolEventId({ sessionId, index, kind, label }),
                date,
                kind,
                tool,
                label,
                sessionId
            };
        })
        .filter(Boolean);
}

function syncUsageToolEventsFromSession(session, { html = session?.chatHtml, persist = true } = {}) {
    if (!session) return 0;
    const date = parseStoredDate(session.updatedAt, session.createdAt)?.toISOString() || new Date().toISOString();
    const events = getUsageToolEventsFromHtml(html, { sessionId: session.id, date });
    events.forEach(event => upsertUsageToolEvent(event, { persist: false }));
    if (events.length > 0 && persist) persistUsageToolEvents();
    return events.length;
}

function calculateStreaks(dayEntries) {
    let current = 0;
    let longest = 0;
    let running = 0;

    dayEntries.forEach(entry => {
        if (entry.tokens > 0) {
            running += 1;
            longest = Math.max(longest, running);
        } else {
            running = 0;
        }
    });

    for (let index = dayEntries.length - 1; index >= 0; index -= 1) {
        if (dayEntries[index].tokens <= 0) break;
        current += 1;
    }

    return { current, longest };
}

function buildUsageStatsSnapshot() {
    const today = startOfLocalDay();
    const firstDay = addLocalDays(today, -(USAGE_HEATMAP_DAYS - 1));
    const calendarStart = addLocalDays(firstDay, -firstDay.getDay());
    const dayMap = new Map();
    const modelCounts = new Map();
    const reasoningCounts = new Map();
    const toolCounts = new Map();
    let totalTokens = 0;
    let messageTokenTotal = 0;

    for (let cursor = new Date(calendarStart); cursor <= today; cursor = addLocalDays(cursor, 1)) {
        const date = new Date(cursor);
        dayMap.set(getLocalDateKey(date), {
            date,
            tokens: 0,
            inRange: date >= firstDay && date <= today
        });
    }

    usageEvents
        .map(normalizeUsageEvent)
        .filter(Boolean)
        .forEach(event => {
            totalTokens += event.total;
            messageTokenTotal += event.total;
            incrementUsageCount(modelCounts, event.model);
            incrementUsageCount(reasoningCounts, event.reasoning);
            const usageDate = parseStoredDate(event.date) || today;
            const key = getLocalDateKey(startOfLocalDay(usageDate));
            const bucket = dayMap.get(key);
            if (bucket) bucket.tokens += event.total;
        });

    usageToolEvents
        .map(normalizeUsageToolEvent)
        .filter(Boolean)
        .forEach(event => incrementUsageCount(toolCounts, event.label));

    const dayEntries = Array.from(dayMap.values());
    const inRangeDays = dayEntries.filter(entry => entry.inRange);
    const peakDay = inRangeDays.reduce((best, entry) => entry.tokens > best.tokens ? entry : best, { tokens: 0, date: today });
    const activeDays = inRangeDays.filter(entry => entry.tokens > 0).length;
    const streaks = calculateStreaks(inRangeDays);
    const weeklyTotals = new Map();

    dayEntries.forEach(entry => {
        const weekKey = getWeekKeyForDate(entry.date);
        weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + entry.tokens);
    });

    const cumulativeWeeklyTotals = new Map();
    let runningWeeklyTotal = 0;
    let previousWeekKey = "";
    dayEntries.forEach(entry => {
        const weekKey = getWeekKeyForDate(entry.date);
        if (weekKey === previousWeekKey) return;
        previousWeekKey = weekKey;
        runningWeeklyTotal += weeklyTotals.get(weekKey) || 0;
        cumulativeWeeklyTotals.set(weekKey, runningWeeklyTotal);
    });

    const heatmapEntries = dayEntries.map(entry => {
        const weekKey = getWeekKeyForDate(entry.date);
        return {
            ...entry,
            weeklyTokens: weeklyTotals.get(weekKey) || 0,
            cumulativeTokens: cumulativeWeeklyTotals.get(weekKey) || 0
        };
    });

    return {
        totalTokens,
        messageTokenTotal,
        peakDay,
        activeDays,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        heatmapEntries,
        firstDay,
        today,
        topModel: getTopUsageEntry(modelCounts),
        topReasoning: getTopUsageEntry(reasoningCounts),
        topTools: Array.from(toolCounts.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 5)
            .map(([label, count]) => ({ label, count }))
    };
}

function getUsageCellTokens(entry, view = activeUsageView) {
    if (view === "weekly") return entry.weeklyTokens;
    if (view === "cumulative") return entry.cumulativeTokens;
    return entry.tokens;
}

function getUsageCellTooltip(entry, view = activeUsageView) {
    const amount = formatTokenAmount(getUsageCellTokens(entry, view));
    const date = formatFullDate(entry.date);
    if (view === "weekly") {
        const weekStart = parseLocalDateKey(getWeekKeyForDate(entry.date));
        return `${amount} tokens in the week of ${formatFullDate(weekStart)}`;
    }
    if (view === "cumulative") {
        const weekStart = parseLocalDateKey(getWeekKeyForDate(entry.date));
        return `${amount} tokens through the week of ${formatFullDate(weekStart)}`;
    }
    return `${amount} tokens on ${date}`;
}

function getUsageLevel(tokens, maxTokens) {
    if (!tokens || !maxTokens) return 0;
    const ratio = tokens / maxTokens;
    if (ratio >= 0.72) return 4;
    if (ratio >= 0.38) return 3;
    if (ratio >= 0.16) return 2;
    return 1;
}

function renderUsageStatsRail(snapshot) {
    const rail = document.getElementById("usageStatsRail");
    if (!rail) return;
    const stats = [
        { value: formatTokenAmount(snapshot.totalTokens), label: "Total tokens" },
        { value: formatTokenAmount(snapshot.peakDay.tokens), label: "Peak token day" },
        { value: snapshot.topModel?.label || "Not tracked", label: "Most used model" },
        { value: snapshot.topReasoning?.label || "Not tracked", label: "Most used reasoning" },
        { value: `${snapshot.longestStreak.toLocaleString()} days`, label: "Longest streak" }
    ];

    rail.replaceChildren(...stats.map(stat => {
        const item = document.createElement("div");
        item.className = "usage-stat-item";
        item.innerHTML = `
            <strong>${escapeHtml(stat.value)}</strong>
            <span>${escapeHtml(stat.label)}</span>
        `;
        return item;
    }));
}

function renderUsageCalendar(snapshot) {
    const calendar = document.getElementById("usageCalendar");
    const months = document.getElementById("usageMonthLabels");
    if (!calendar || !months) return;

    const maxTokens = Math.max(...snapshot.heatmapEntries.map(entry => getUsageCellTokens(entry)), 0);
    calendar.replaceChildren(...snapshot.heatmapEntries.map(entry => {
        const tokens = getUsageCellTokens(entry);
        const cell = document.createElement("span");
        cell.className = `usage-day-cell usage-level-${getUsageLevel(tokens, maxTokens)}`;
        cell.classList.toggle("outside-range", !entry.inRange);
        cell.dataset.tooltip = getUsageCellTooltip(entry);
        cell.setAttribute("aria-label", getUsageCellTooltip(entry));
        return cell;
    }));

    const monthMarkers = [];
    let previousMonth = "";
    snapshot.heatmapEntries.forEach((entry, index) => {
        if (!entry.inRange) return;
        const month = `${entry.date.getFullYear()}-${entry.date.getMonth()}`;
        if (month === previousMonth) return;
        previousMonth = month;
        monthMarkers.push({
            label: formatMonthLabel(entry.date),
            column: Math.floor(index / 7) + 1
        });
    });

    months.replaceChildren(...monthMarkers.map(marker => {
        const label = document.createElement("span");
        label.textContent = marker.label;
        label.style.gridColumn = `${marker.column} / span 4`;
        return label;
    }));
}

function renderUsageInsights(snapshot) {
    const insights = document.getElementById("usageActivityInsights");
    if (insights) {
        const rows = [
            ["Most used model", snapshot.topModel?.label || "Not tracked"],
            ["Most used reasoning", snapshot.topReasoning?.label || "Not tracked"],
            ["Active days", `${snapshot.activeDays.toLocaleString()} days`],
            ["Current streak", `${snapshot.currentStreak.toLocaleString()} days`],
            ["Longest streak", `${snapshot.longestStreak.toLocaleString()} days`],
            ["Peak day", snapshot.peakDay.tokens ? `${formatTokenAmount(snapshot.peakDay.tokens)} on ${formatFullDate(snapshot.peakDay.date)}` : "No token usage yet"],
            ["Tracked usage", snapshot.messageTokenTotal ? formatTokenAmount(snapshot.messageTokenTotal) : "Waiting for provider usage"]
        ];
        insights.replaceChildren(...rows.map(([label, value]) => {
            const row = document.createElement("div");
            row.className = "usage-insight-row";
            row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
            return row;
        }));
    }

    const tools = document.getElementById("usageToolCalls");
    if (!tools) return;
    if (snapshot.topTools.length === 0) {
        tools.innerHTML = `<p class="usage-empty">No tool calls tracked yet.</p>`;
        return;
    }
    tools.replaceChildren(...snapshot.topTools.map(tool => {
        const row = document.createElement("div");
        row.className = "usage-tool-row";
        row.innerHTML = `
            <span class="usage-tool-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"></path><path d="M12 18v3"></path><path d="m4.22 4.22 2.12 2.12"></path><path d="m17.66 17.66 2.12 2.12"></path><path d="M3 12h3"></path><path d="M18 12h3"></path><path d="m4.22 19.78 2.12-2.12"></path><path d="m17.66 6.34 2.12-2.12"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </span>
            <strong>${escapeHtml(tool.label)}</strong>
            <span>${escapeHtml(formatCountLabel(tool.count, "call"))}</span>
        `;
        return row;
    }));
}

function renderUsageSettingsPane() {
    const pane = document.querySelector('[data-settings-pane-panel="usage"]');
    if (!pane) return;
    const snapshot = buildUsageStatsSnapshot();
    renderUsageStatsRail(snapshot);
    renderUsageCalendar(snapshot);
    renderUsageInsights(snapshot);
}

function refreshUsageSettingsPaneIfVisible() {
    const pane = document.querySelector('[data-settings-pane-panel="usage"]');
    if (!pane || pane.hidden) return;
    renderUsageSettingsPane();
}

function getChatInfoMenuItems() {
    return getChatInfoText()
        .split("\n")
        .slice(1)
        .map((line, index) => {
            const separatorIndex = line.indexOf(":");
            const label = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : line.trim();
            const meta = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : "";
            return {
                id: `chat-info:${index}`,
                label: label || "Info",
                meta,
                searchText: line,
                readOnly: true
            };
        });
}

function openInfoCommandMenu(query = "") {
    openCommandMenu({
        placeholder: "Search chat info",
        label: "Chat info",
        query,
        items: getChatInfoMenuItems()
    });
}

function getAllSelectableModels() {
    const models = [...getLocalModelSwitcherOptions(), ...getOpenAiModelSwitcherOptions()];
    const seen = new Set();
    return models.filter(model => {
        const id = normalizeModelId(model.id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function openModelCommandMenu(query = "") {
    const activeModel = getCurrentModelLabel();
    const activeProvider = activeAiProvider;
    const items = getAllSelectableModels().map(option => {
        const providerLabel = option.provider === AI_PROVIDER_OPENAI ? "OpenAI" : "Ollama";
        const label = option.label || option.id;
        return {
            id: `model:${option.provider || AI_PROVIDER_LOCAL}:${option.id}`,
            label,
            meta: [providerLabel, option.meta].filter(Boolean).join(" · "),
            searchText: `${option.id} ${label} ${providerLabel} ${option.meta || ""}`,
            selected: option.provider === activeProvider && option.id === activeModel,
            action: () => {
                setActiveModel(option.id, option);
                showToast(`Model changed to ${label}.`, "success");
            }
        };
    });

    openCommandMenu({
        placeholder: "Search models",
        label: "Model commands",
        query,
        items
    });
}

function handleModelSlashCommand(argument = "") {
    const target = argument.trim();
    clearComposerText();

    if (!target) {
        window.setTimeout(() => openModelCommandMenu(), 0);
        return true;
    }

    if (/^(ollama|local)$/i.test(target)) {
        setActiveAiProvider(AI_PROVIDER_LOCAL);
        showToast("Switched to local Ollama models.", "success");
        return true;
    }

    if (/^openai$/i.test(target)) {
        setActiveAiProvider(AI_PROVIDER_OPENAI);
        showToast("Switched to OpenAI models.", getOpenAiApiKey() ? "success" : "warning");
        return true;
    }

    const lowerTarget = target.toLowerCase();
    const match = getAllSelectableModels().find(model =>
        model.id.toLowerCase() === lowerTarget ||
        String(model.label || "").toLowerCase() === lowerTarget
    );

    if (!match) {
        showToast(`No model named "${target}" was found.`, "error");
        return true;
    }

    setActiveModel(match.id, match);
    showToast(`Model changed to ${match.label || match.id}.`, "success");
    return true;
}

function formatMemoryEntryDetails(entry, index) {
    const created = entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown";
    const updated = entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "Unknown";
    return [
        `Memory ${index + 1}`,
        entry?.text || "[No text]",
        `Source: ${entry?.source || "user"}`,
        `Created: ${created}`,
        `Updated: ${updated}`,
        "",
        `Delete with: /memory delete ${index + 1}`
    ].join("\n");
}

function openMemoryCommandMenu(query = "") {
    const items = [
        {
            id: "memory-toggle",
            label: isMemoryEnabled ? "Turn memory off" : "Turn memory on",
            meta: isMemoryEnabled ? `${getMemoryCountLabel()} saved` : "Enable saved memories",
            searchText: "memory toggle on off enable disable",
            action: () => setMemoryEnabled(!isMemoryEnabled)
        },
        {
            id: "memory-list",
            label: "List memories",
            meta: getMemoryCountLabel(),
            searchText: "memory list show saved",
            action: () => renderCommandResult("/memory list", formatMemoryList())
        },
        {
            id: "memory-add",
            label: "Add memory",
            meta: "Prepare /memory add",
            searchText: "memory add remember create",
            action: () => setComposerCommandText("/memory add ")
        },
        {
            id: "memory-delete",
            label: "Delete memory",
            meta: "Prepare /memory delete",
            searchText: "memory delete remove forget",
            disabled: memoryEntries.length === 0,
            action: () => setComposerCommandText("/memory delete ")
        },
        {
            id: "memory-clear",
            label: "Clear all memories",
            meta: memoryEntries.length ? `${memoryEntries.length} saved` : "No saved memories",
            searchText: "memory clear reset",
            disabled: memoryEntries.length === 0,
            action: () => handleMemorySlashCommand("clear", "/memory clear")
        },
        ...memoryEntries.map((entry, index) => ({
            id: `memory:${entry.id || index}`,
            label: `${index + 1}. ${entry.text}`,
            meta: "Saved memory",
            searchText: `${entry.text} memory saved ${entry.source || ""}`,
            action: () => renderCommandResult(`/memory ${index + 1}`, formatMemoryEntryDetails(entry, index))
        }))
    ];

    openCommandMenu({
        placeholder: "Search memory",
        label: "Memory commands",
        query,
        items
    });
}

async function captureScreenshotAttachment() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
        showToast("Screen capture is not available in this browser.", "error");
        return;
    }

    let stream = null;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = () => reject(new Error("Could not read the screen capture stream."));
        });
        await video.play();
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Could not create a screenshot image.");

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `screenshot-${timestamp}.png`, { type: "image/png" });
        if (addAttachedFile(file)) updateTokenDisplay();
        showToast("Screenshot attached. Add a message and send when ready.", "success");
    } catch (err) {
        if (err.name === "NotAllowedError") {
            showToast("Screen capture was cancelled.", "info");
        } else {
            showToast(`Screenshot failed: ${err.message}`, "error");
        }
    } finally {
        stream?.getTracks().forEach(track => track.stop());
    }
}

function getMemoryHelpText() {
    return [
        "Memory commands",
        "/memory list",
        "/memory add <thing to remember>",
        "/memory delete <number or text>",
        "/memory clear",
        "/memory on or /memory off"
    ].join("\n");
}

async function handleMemorySlashCommand(argument = "", commandText = "/memory") {
    const arg = argument.trim();
    const actionMatch = arg.match(/^(\S+)(?:\s+([\s\S]+))?$/);
    const action = (actionMatch?.[1] || "list").toLowerCase();
    const value = (actionMatch?.[2] || "").trim();

    clearComposerText();

    if (!arg) {
        window.setTimeout(() => openMemoryCommandMenu(), 0);
        return true;
    }

    if (["on", "enable"].includes(action)) {
        setMemoryEnabled(true);
        renderCommandResult(commandText, `Memory beta is on.\n\n${formatMemoryList()}`);
        return true;
    }

    if (["off", "disable"].includes(action)) {
        setMemoryEnabled(false);
        renderCommandResult(commandText, "Memory beta is off. Saved memories stay stored but are not used in chats.");
        return true;
    }

    if (!isMemoryEnabled) {
        renderCommandResult(commandText, "Memory beta is off. Enable it in Settings > Personalization, or run /memory on.");
        return true;
    }

    if (["help", "?"].includes(action)) {
        renderCommandResult(commandText, getMemoryHelpText());
        return true;
    }

    if (["list", "show", "manage"].includes(action)) {
        renderCommandResult(commandText, formatMemoryList());
        return true;
    }

    if (["add", "remember", "create"].includes(action)) {
        if (!value) {
            renderCommandResult(commandText, "Add the memory text after the command.\nExample: /memory add User prefers short answers.");
            return true;
        }
        const result = addMemoryEntry(value, "user");
        renderCommandResult(commandText, result.created
            ? `Memory saved: ${result.entry.text}`
            : `That memory already exists: ${result.entry.text}`);
        return true;
    }

    if (["delete", "forget", "remove"].includes(action)) {
        if (!value) {
            renderCommandResult(commandText, "Tell me which memory to delete by number or text.\nExample: /memory delete 2");
            return true;
        }
        const removed = removeMemoryEntry(value);
        renderCommandResult(commandText, removed
            ? `Memory deleted: ${removed.text}`
            : `No memory matched "${value}".`);
        return true;
    }

    if (action === "clear") {
        const approved = await showApprovalDialog({
            title: "Clear all memories?",
            message: "This removes every saved beta memory from this browser.",
            details: memoryEntries.map((entry, index) => `${index + 1}. ${entry.text}`).slice(0, 6),
            confirmLabel: "Clear memories",
            cancelLabel: "Keep memories"
        });
        if (!approved) {
            showToast("Memories kept.", "info");
            return true;
        }
        const count = clearMemoryEntries();
        renderCommandResult(commandText, `Cleared ${count} ${count === 1 ? "memory" : "memories"}.`);
        return true;
    }

    const knownMemoryActions = new Set([
        "on", "enable", "off", "disable", "help", "?", "list", "show", "manage",
        "add", "remember", "create", "delete", "forget", "remove", "clear"
    ]);

    if (arg && !knownMemoryActions.has(action)) {
        const result = addMemoryEntry(arg, "user");
        renderCommandResult(commandText, result.created
            ? `Memory saved: ${result.entry.text}`
            : `That memory already exists: ${result.entry.text}`);
        return true;
    }

    renderCommandResult(commandText, getMemoryHelpText());
    return true;
}

function getSlashCommandSubmission(text) {
    const match = String(text || "").trim().match(/^\/([a-z][\w-]*)(?:\s+([\s\S]*))?$/i);
    if (!match) return null;
    return {
        name: match[1].toLowerCase(),
        argument: (match[2] || "").trim()
    };
}

function normalizeInlineSlashCommandSubmission(text) {
    const value = String(text || "").trim();
    if (!value || value.startsWith("/")) return value;
    const match = value.match(/(^|\s)\/([a-z][\w-]*)$/i);
    if (!match) return value;
    const commandName = String(match[2] || "").toLowerCase();
    const command = typeof SLASH_COMMANDS !== "undefined" && Array.isArray(SLASH_COMMANDS)
        ? SLASH_COMMANDS.find(item => item.name === commandName
            || String(item.command || "").slice(1).toLowerCase() === commandName
            || (item.aliases || []).some(alias => String(alias).toLowerCase() === commandName))
        : null;
    if (!command?.acceptsPrompt) return value;
    const prompt = value.slice(0, match.index + match[1].length).trim();
    if (!prompt) return value;
    return `${command.command} ${prompt}`;
}

function isComposerToolSlashCommand(commandName = "") {
    return ["search", "web", "tree", "files", "read", "run", "cmd", "shell", "terminal", "ps", "weather", "wetter", "temp", "temperature", "location", "ip-location", "wait", "timer", "sleep", "wait_for", "stopwatch", "time", "measure"].includes(
        String(commandName || "").trim().toLowerCase()
    );
}

async function handleSlashCommandSubmission(textValue) {
    const command = getSlashCommandSubmission(textValue);
    if (!command) return false;

    if (["image", "img", "imagine", "video", "vid", "clip", "search", "web", "tree", "files", "read", "run", "cmd", "shell", "terminal", "ps", "weather", "wetter", "temp", "temperature", "location", "ip-location", "wait", "timer", "sleep", "wait_for", "stopwatch", "time", "measure"].includes(command.name)) {
        return false;
    }

    if (command.name === "screenshot" || command.name === "screen") {
        clearComposerText();
        await captureScreenshotAttachment();
        return true;
    }

    if (command.name === "info" || command.name === "about") {
        clearComposerText();
        window.setTimeout(() => openInfoCommandMenu(command.argument), 0);
        return true;
    }

    if (command.name === "new" || command.name === "chat") {
        clearComposerDraft();
        hideSlashCommandPalette();
        startNewChatSession();
        return true;
    }

    if (command.name === "model" || command.name === "provider") {
        return handleModelSlashCommand(command.argument);
    }

    if (command.name === "memory" || command.name === "remember") {
        return handleMemorySlashCommand(command.argument, textValue);
    }

    return false;
}

// ===== PROCESSING PIPELINE =====
sendButton.onclick = processWorkspaceEntry;
input.addEventListener("keydown", e => {
    if (handleSlashCommandKeydown(e)) return;
    if (isKeyboardShortcutEvent(e, "sendPrompt")) {
        e.preventDefault();
        if (!isGenerating) processWorkspaceEntry();
    }
});
input.addEventListener("input", () => {
    if (!isVoiceInputUpdate) {
        shouldSpeakNextReply = false;
    }
    closeCommandMenu();
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    scheduleComposerSafeAreaUpdate();
    updateTokenDisplay();
    scheduleComposerDraftSave();
    renderSlashCommandPalette();
});
input.addEventListener("focus", renderSlashCommandPalette);
input.addEventListener("click", renderSlashCommandPalette);
document.addEventListener("click", event => {
    if (event.target.closest("#slashCommandPalette") || event.target.closest("#commandMenu") || event.target.closest("#prompt")) return;
    hideSlashCommandPalette();
    closeCommandMenu();
});

function shouldUseRecentGeneratedImageReference(text, files = []) {
    if (!text || getImageFiles(files).length > 0) return false;
    return /(?:\b(?:this|that|it|last|latest|generated|previous|above)\b[\s\S]{0,48}\b(?:image|picture|photo|artwork|render)\b|\b(?:edit|change|modify|describe|analyze|analyse|see|look at|enhance|recolor|background|brighter|darker)\b[\s\S]{0,48}\b(?:it|this|that|image|picture|photo)\b|\b(?:image|picture|photo)\b[\s\S]{0,48}\b(?:you made|you generated|above|last|previous)\b)/i.test(text);
}

function getLatestGeneratedImageElement() {
    const images = Array.from(chat?.querySelectorAll?.(".output-node img.generated-image, .output-node .generated-image-card img.generated-image") || []);
    return images.reverse().find(img => {
        const src = String(img.getAttribute("src") || img.currentSrc || img.src || "").trim();
        return src && !src.includes("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");
    }) || null;
}

async function createFileFromGeneratedImageElement(img) {
    const src = String(img?.getAttribute("src") || img?.currentSrc || img?.src || "").trim();
    if (!src) return null;
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Generated image responded with HTTP ${response.status}`);
    const blob = await response.blob();
    const type = blob.type || "image/png";
    const extension = getMimeExtension(type, "png");
    const file = new File([blob], `generated-image.${extension}`, { type });
    setFilePersistentPreviewSource(file, src);
    return file;
}

async function getRecentGeneratedImageReferenceFiles(text, files = []) {
    if (!shouldUseRecentGeneratedImageReference(text, files)) return [];
    const latestImage = getLatestGeneratedImageElement();
    if (!latestImage) return [];
    try {
        const file = await createFileFromGeneratedImageElement(latestImage);
        return file ? [file] : [];
    } catch (err) {
        console.warn("Could not attach recent generated image for context:", err);
        return [];
    }
}

function extractOllamaTaskMessageText(data = {}) {
    return String(data?.message?.content || data?.response || "").trim();
}

function buildLocalVisionTaskPrompt(userPrompt = "", imageFiles = []) {
    const names = imageFiles.map(file => file.name || "image").join(", ");
    return [
        "Analyze the attached image or images for another assistant.",
        "Return concise, factual visual context that can answer the user's request.",
        "Mention visible text, objects, layout, UI state, colors, and anything likely relevant.",
        "Do not invent details that are not visible.",
        names ? `Image files: ${names}` : "",
        userPrompt ? `User request: ${userPrompt}` : "User request: describe the image."
    ].filter(Boolean).join("\n");
}

async function analyzeImagesWithLocalTaskModel(userPrompt, imageFiles, signal, progressTarget = null) {
    const images = getImageFiles(imageFiles).slice(0, 4);
    if (images.length === 0) return "";
    const model = getLocalTaskModel("vision");
    const activityItem = {
        kind: "image",
        label: "Vision task model",
        tool: "vision_analysis",
        detail: model,
        input: images.map(file => file.name || "image").join(", "),
        meta: `Using ${model}`
    };
    if (progressTarget) {
        renderToolActivity(progressTarget, {
            title: "Analyzing image context...",
            items: [activityItem]
        });
    }

    try {
        const base64Images = [];
        for (const file of images) {
            throwIfAborted(signal);
            base64Images.push(await fileToBase64(file));
        }
        const data = await sendOllamaTaskChat([
            {
                role: "user",
                content: buildLocalVisionTaskPrompt(userPrompt, images),
                images: base64Images
            }
        ], model, { temperature: 0.15 }, signal);
        const analysis = extractOllamaTaskMessageText(data);
        if (!analysis) throw new Error(`${model} did not return image analysis.`);
        activityItem.meta = "Done";
        activityItem.detail = `${model} analyzed ${images.length} ${images.length === 1 ? "image" : "images"}`;
        if (progressTarget) {
            renderToolActivity(progressTarget, {
                title: "Analyzing image context...",
                items: [activityItem]
            });
        }
        return [
            `--- Image Analysis Context (${model}) ---`,
            `Files: ${images.map(file => file.name || "image").join(", ")}`,
            analysis,
            "--- End Image Analysis Context ---"
        ].join("\n");
    } catch (err) {
        activityItem.meta = "Failed";
        activityItem.error = err.message;
        if (progressTarget) {
            renderToolActivity(progressTarget, {
                title: "Analyzing image context...",
                items: [activityItem]
            });
        }
        throw err;
    }
}

async function processWorkspaceEntry(options = {}) {
    if (isGenerating || isPromptSubmissionPending) return;
    isPromptSubmissionPending = true;
    updateSendButtonState();

    try {
    const skipWorkspaceContext = options?.skipWorkspaceContext === true;
    const hasRetryPayload = typeof options?.textValue === "string" || Array.isArray(options?.files);
    const textValue = normalizeInlineSlashCommandSubmission(hasRetryPayload ? options.textValue || "" : input.value);
    const sourceFiles = Array.isArray(options?.files) ? options.files : attachedFiles;
    if (!textValue && sourceFiles.length === 0) return;

    if (isActiveChatArchived()) {
        showToast("Archived chats are read-only. Restore the chat before writing.", "warning");
        return;
    }

    if (await handleSlashCommandSubmission(textValue)) {
        return;
    }

    const command = getSlashCommandSubmission(textValue);
    if (command && isComposerToolSlashCommand(command.name) && !canUseComposerTools()) {
        showToast(`${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`, "warning");
        return;
    }

    const unsupportedAttachments = getUnsupportedAttachmentFiles(sourceFiles);
    if (unsupportedAttachments.length > 0) {
        showUnsupportedAttachmentToast(unsupportedAttachments);
        return;
    }

    const generationSession = ensureWritableActiveChatSession();
    if (!generationSession) return;
    const generationSessionId = generationSession.id;
    if (isSessionGenerating(generationSessionId)) return;
    if (shouldBlockNewGenerationForPotatoMode(generationSessionId)) {
        showToast("Potato PC mode allows one chat to generate at a time.", "warning");
        return;
    }

    let runHistory = cloneConversationHistory(conversationHistory);
    let runTokenTotal = sessionTotalTokens;
    const speakThisReply = shouldSpeakNextReply && textValue.length > 0;
    const videoPrompt = getVideoCommandPrompt(textValue);
    const imagePrompt = getImageCommandPrompt(textValue);
    if (!isPotatoMediaGenerationEnabled && (videoPrompt !== null || imagePrompt !== null || isImageEditRequest(textValue, sourceFiles))) {
        showToast("Media generation is disabled in Potato PC settings.", "warning");
        return;
    }
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    shouldSpeakNextReply = false;

    setGeneratingBusy(true, { sessionId: generationSessionId, controller: generationController });
    isPromptSubmissionPending = false;
    updateSendButtonState();
    if (isOpenAiProvider() && isOpenAiVoiceSessionActive && speakThisReply) {
        setVoiceSessionStatus("Thinking", 0.34);
    }

    try {
        welcome.style.display = "none";
        chat.style.display = "block";
        isChatPinnedToBottom = true;

        const currentFiles = [
            ...sourceFiles,
            ...await getRecentGeneratedImageReferenceFiles(textValue, sourceFiles)
        ];
        await ensurePersistentImagePreviewSources(currentFiles);
        if (!hasRetryPayload) {
            input.value = "";
            input.style.height = "auto";
            previewContainer.innerHTML = "";
            attachedFiles = [];
            clearSessionComposerDraft(generationSessionId);
            updateTokenDisplay();
            scheduleComposerSafeAreaUpdate();
        }

        const useLocalVisionTask = shouldUseLocalVisionTaskForFiles(currentFiles);
        const filesForModelRouting = useLocalVisionTask
            ? currentFiles.filter(file => !file.type?.startsWith("image/"))
            : currentFiles;
        const routedModel = chooseModelForRequest(textValue, filesForModelRouting, imagePrompt, videoPrompt, {
            imageTaskHandled: useLocalVisionTask
        });
        if (isOpenAiProvider()) {
            updateModelSwitcherForProvider();
        }

        const userMessageCreatedAt = new Date().toISOString();
        const voiceRecording = normalizeVoiceRecordingMetadata(options?.voiceRecording);
        const userBubble = options?.skipUserBubble === true
            ? null
            : addRenderNode(textValue, "user", currentFiles, {
                createdAt: userMessageCreatedAt,
                voiceRecording
            });

        await createPromptWorkspaceCheckpoint(textValue, generationSignal);

        if (videoPrompt !== null) {
            await processVideoGeneration(videoPrompt, currentFiles, generationSignal, {
                userCreatedAt: userMessageCreatedAt,
                sessionId: generationSessionId,
                history: runHistory,
                getTokenTotal: () => runTokenTotal,
                setTokenTotal: value => { runTokenTotal = value; }
            });
            scrollChatToBottom();
            return;
        }

        if (imagePrompt !== null) {
            await processImageGeneration(imagePrompt, currentFiles, generationSignal, {
                userCreatedAt: userMessageCreatedAt,
                sessionId: generationSessionId,
                history: runHistory,
                getTokenTotal: () => runTokenTotal,
                setTokenTotal: value => { runTokenTotal = value; }
            });
            scrollChatToBottom();
            return;
        }

        if (isImageEditRequest(textValue, currentFiles)) {
            await processImageEdit(textValue, currentFiles, generationSignal, {
                userCreatedAt: userMessageCreatedAt,
                sessionId: generationSessionId,
                history: runHistory,
                getTokenTotal: () => runTokenTotal,
                setTokenTotal: value => { runTokenTotal = value; }
            });
            scrollChatToBottom();
            return;
        }

        let messageContent = speakThisReply ? `${textValue}${getVoiceModeInstruction()}` : textValue;
        let base64Images = [];
        let openAiImageFileIds = [];
        let aiBubble = options?.targetBubble || addRenderNode("__thinking__", "output");
        if (options?.targetBubble) {
            prepareBubbleForRetry(aiBubble);
        }
        if (speakThisReply) {
            userBubble?.closest(".message-node")?.classList.add("voice-user-prompt");
        }
        if (document.body?.classList.contains("voice-chat-active")) {
            setCurrentVoiceAssistantNode(aiBubble.closest(".message-node"));
        }
        let webSources = [];
        const openAiUploadItems = [];

        if (useLocalVisionTask) {
            try {
                const imageContext = await analyzeImagesWithLocalTaskModel(textValue, currentFiles, generationSignal, aiBubble);
                if (imageContext) {
                    messageContent += `\n\n${imageContext}`;
                }
            } catch (err) {
                renderErrorCard(aiBubble, err, {
                    title: err.name === "AbortError" ? "Image analysis stopped" : "Image analysis failed",
                    message: err.name === "AbortError"
                        ? "Your prompt is safe to edit and run again."
                        : `Fauna could not analyze the image with ${getLocalTaskModel("vision")}. Make sure that model is installed or choose another Vision task model in Settings.`,
                    sessionId: generationSessionId,
                    history: runHistory,
                    getTokenTotal: () => runTokenTotal,
                    retryLabel: "Retry generation",
                    onRetry: () => processWorkspaceEntry({
                        textValue,
                        files: currentFiles,
                        skipWorkspaceContext,
                        skipUserBubble: true,
                        targetBubble: aiBubble
                    })
                });
                return;
            }
        }

        for (const file of currentFiles) {
            if (file.type.startsWith("image/")) {
                if (useLocalVisionTask) continue;
                try {
                    if (isOpenAiProvider()) {
                        const uploadItem = {
                            kind: "image",
                            label: "OpenAI image upload",
                            tool: "upload_image",
                            detail: file.name || "image",
                            input: file.name || "image",
                            meta: "Uploading"
                        };
                        openAiUploadItems.push(uploadItem);
                        renderToolActivity(aiBubble, {
                            title: "Thinking about",
                            items: openAiUploadItems
                        });
                        const preparedImage = await prepareOpenAiVisionImage(file, generationSignal);
                        openAiImageFileIds.push(preparedImage.fileId);
                        uploadItem.meta = preparedImage.reused ? "Reused" : "Uploaded";
                        renderToolActivity(aiBubble, {
                            title: "Thinking about",
                            items: openAiUploadItems
                        });
                    } else {
                        const b64 = await fileToBase64(file);
                        base64Images.push(b64);
                    }
                } catch (err) {
                    console.error("Image loading fail:", err);
                    if (isOpenAiProvider()) {
                        renderErrorCard(aiBubble, err, {
                            title: err.name === "AbortError" ? "Image upload stopped" : "Image upload failed",
                            message: err.name === "AbortError"
                                ? "Your prompt is safe to edit and run again."
                                : "Fauna could not upload the image to OpenAI. Check the API key, file type, and file size.",
                            sessionId: generationSessionId,
                            history: runHistory,
                            getTokenTotal: () => runTokenTotal,
                            retryLabel: "Retry generation",
                            onRetry: () => processWorkspaceEntry({
                                textValue,
                                files: currentFiles,
                                skipWorkspaceContext,
                                skipUserBubble: true,
                                targetBubble: aiBubble
                            })
                        });
                        return;
                    }
                    messageContent += `\n\n[Image attachment could not be prepared: ${file.name || "image"} (${err.message})]`;
                }
            } else {
                try {
                    const textContent = await file.text();
                    messageContent += `\n\n--- Attached File Content: ${file.name} ---\n${textContent}\n-----------------------`;
                } catch (err) {
                    messageContent += `\n\n[Error reading file context item: ${file.name}]`;
                }
            }
        }

        const hasImageAttachments = base64Images.length > 0 || openAiImageFileIds.length > 0;

        if (!hasImageAttachments && shouldUseApproxWeatherContext(textValue)) {
            const locationActivityItem = {
                kind: "location",
                label: "Location",
                tool: "current_weather",
                detail: "Current weather near me",
                input: "Approximate location",
                meta: "Checking"
            };
            renderToolActivity(aiBubble, {
                title: "Checking local weather...",
                items: [locationActivityItem]
            });
            try {
                const weatherResult = await executeLocationToolCall({ tool: "current_weather" }, generationSignal);
                locationActivityItem.meta = "Done";
                locationActivityItem.sources = weatherResult.sources || [];
                renderToolActivity(aiBubble, {
                    title: "Checking local weather...",
                    items: [locationActivityItem]
                });
                if (weatherResult.text) {
                    messageContent += `\n\n--- Approx Location Weather Context ---\n${weatherResult.text}\n--- End Approx Location Weather Context ---`;
                }
                if (Array.isArray(weatherResult.sources) && weatherResult.sources.length > 0) {
                    webSources = mergeWebSources(webSources, weatherResult.sources);
                }
            } catch (err) {
                locationActivityItem.meta = "Failed";
                locationActivityItem.error = err.message;
                renderToolActivity(aiBubble, {
                    title: "Checking local weather...",
                    items: [locationActivityItem]
                });
                messageContent += `\n\n[Approx location weather was requested, but Fauna could not read it: ${err.message}]`;
            }
        }

        if (!hasImageAttachments && shouldSearchWeb(textValue)) {
            const webSearchQuery = buildSearchQuery(textValue);
            const webActivityItem = {
                kind: "web",
                label: "Searched the web",
                tool: "web_search",
                detail: "",
                input: webSearchQuery,
                query: webSearchQuery,
                meta: "Searching"
            };
            renderToolActivity(aiBubble, {
                title: "Thinking about",
                items: [webActivityItem]
            });
            try {
                const webResult = await getWebContextForPrompt(textValue, generationSignal);
                webActivityItem.query = webResult.query || webSearchQuery;
                webActivityItem.sources = webResult.sources || [];
                webActivityItem.resultCount = webResult.resultCount ?? webResult.sources.length;
                webActivityItem.meta = `${webResult.resultCount ?? webResult.sources.length} results`;
                renderToolActivity(aiBubble, {
                    title: "Thinking about",
                    items: [webActivityItem]
                });
                if (webResult.context) {
                    messageContent += webResult.context;
                    webSources = mergeWebSources(webSources, webResult.sources);
                }
            } catch (err) {
                webActivityItem.meta = "Failed";
                webActivityItem.error = err.message;
                renderToolActivity(aiBubble, {
                    title: "Thinking about",
                    items: [webActivityItem]
                });
                messageContent += `\n\n[Web search was requested, but the browser could not fetch online results: ${err.message}]`;
            }
        }

        if (!skipWorkspaceContext && !hasImageAttachments && shouldUseWorkspaceBridge(textValue)) {
            const workspaceActivityItem = {
                kind: "workspace",
                label: "Local workspace",
                tool: "workspace_context",
                detail: "Prepare local context",
                input: textValue,
                meta: "Reading"
            };
            renderToolActivity(aiBubble, {
                title: "Inspecting local workspace...",
                items: [workspaceActivityItem]
            });
            try {
                messageContent += await getWorkspaceContextForPrompt(textValue, generationSignal);
                workspaceActivityItem.meta = "Done";
                renderToolActivity(aiBubble, {
                    title: "Inspecting local workspace...",
                    items: [workspaceActivityItem]
                });
            } catch (err) {
                workspaceActivityItem.meta = "Failed";
                renderToolActivity(aiBubble, {
                    title: "Inspecting local workspace...",
                    items: [workspaceActivityItem]
                });
                messageContent += `\n\n[Local workspace bridge was requested, but the app could not access it: ${err.message}]`;
            }
        }

        const userMessageObject = {
            role: "user",
            content: messageContent,
            createdAt: userMessageCreatedAt
        };
        if (voiceRecording) {
            userMessageObject.voiceRecording = voiceRecording;
        }
        if (base64Images.length > 0) {
            userMessageObject.images = base64Images;
        }
        if (openAiImageFileIds.length > 0) {
            userMessageObject.openAiImageFileIds = openAiImageFileIds;
        }
        runHistory.push(userMessageObject);
        let preflightCompaction = { compacted: false, history: runHistory, progressTarget: aiBubble };
        try {
            preflightCompaction = await maybeCompactHistoryForContext({
                history: runHistory,
                sessionId: generationSessionId,
                tokenTotal: runTokenTotal,
                preferredModel: routedModel,
                signal: generationSignal,
                progressTarget: aiBubble,
                trigger: "threshold"
            });
        } catch (err) {
            renderErrorCard(aiBubble, err, {
                title: err.name === "AbortError" ? "Context compaction stopped" : "Context compaction failed",
                message: err.name === "AbortError"
                    ? "Your prompt is safe to edit and run again."
                    : "Fauna could not compact this chat before sending it to the model.",
                sessionId: generationSessionId,
                history: runHistory,
                getTokenTotal: () => runTokenTotal,
                retryLabel: "Retry generation",
                onRetry: () => processWorkspaceEntry({
                    textValue,
                    files: currentFiles,
                    skipWorkspaceContext,
                    skipUserBubble: true,
                    targetBubble: aiBubble
                })
            });
            return;
        }
        if (preflightCompaction.compacted) {
            runHistory = cloneConversationHistory(preflightCompaction.history);
            aiBubble = preflightCompaction.progressTarget || aiBubble;
        }
        if (isChatSessionVisible(generationSessionId)) {
            conversationHistory = cloneConversationHistory(runHistory);
        }
        const userHistoryIndex = runHistory.length - 1;
        const userMessageNode = Array.from(chat?.querySelectorAll?.(".message-node.user-node") || [])
            .find(node => node.dataset.createdAt === userMessageCreatedAt)
            || userBubble?.closest?.(".message-node.user-node");
        if (userMessageNode) {
            userMessageNode.dataset.historyIndex = String(userHistoryIndex);
            userMessageNode.dataset.createdAt = userMessageCreatedAt;
        }
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });

        try {
            const requestOptions = {
                ...getActiveChatRequestOptions(),
                sessionId: generationSessionId
            };
            let data = null;
            let recoveredFromContextError = false;
            while (true) {
                try {
                    data = await sendOllamaChatWithLocalTools(
                        runHistory,
                        requestOptions,
                        routedModel,
                        generationSignal,
                        aiBubble,
                        {
                            enabled: true,
                            preserveActiveModel: shouldPreserveActiveLocalModelForRoute(routedModel)
                        }
                    );
                    break;
                } catch (err) {
                    if (!recoveredFromContextError && isLikelyContextWindowError(err)) {
                        recoveredFromContextError = true;
                        const recoveryCompaction = await maybeCompactHistoryForContext({
                            history: runHistory,
                            sessionId: generationSessionId,
                            tokenTotal: runTokenTotal,
                            preferredModel: routedModel,
                            signal: generationSignal,
                            progressTarget: aiBubble,
                            trigger: "context_error",
                            force: true,
                            aggressive: true
                        });
                        if (recoveryCompaction.compacted) {
                            runHistory = cloneConversationHistory(recoveryCompaction.history);
                            aiBubble = recoveryCompaction.progressTarget || aiBubble;
                            continue;
                        }
                    }
                    throw err;
                }
            }
            const tokenUsage = getProviderTokenUsage(data);
            const assistantMessage = getAssistantMessageForConversation(data, routedModel);
            attachTokenUsage(assistantMessage, tokenUsage);
            runHistory.push(assistantMessage);
            if (isChatSessionVisible(generationSessionId)) {
                conversationHistory = cloneConversationHistory(runHistory);
            }
            const assistantIndex = runHistory.length - 1;

            runTokenTotal += recordSessionTokenUsage(generationSessionId, tokenUsage, { message: assistantMessage });
            await renderAssistantResponse(data, aiBubble, webSources, generationSignal, speakThisReply, {
                sessionId: generationSessionId,
                messageIndex: assistantIndex,
                alreadyRendered: data.__faunaAlreadyRendered === true,
                preserveRenderedContent: data.__faunaPreserveRenderedContent === true
            });
            updateStoredSessionFromGeneration(generationSessionId, {
                history: runHistory,
                tokenTotal: runTokenTotal
            });

        } catch (e) {
            renderErrorCard(aiBubble, e, {
                sessionId: generationSessionId,
                history: runHistory,
                getTokenTotal: () => runTokenTotal,
                retryLabel: "Retry generation",
                onRetry: () => retryAssistantGenerationFromBubble(aiBubble, {
                    model: routedModel,
                    webSources,
                    speakThisReply
                })
            });
        }

        scrollChatToBottom();
    } finally {
        finishChatGeneration(generationSessionId, generationController);
        updateTokenDisplay();
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
        if (isChatSessionVisible(generationSessionId) && isOpenAiProvider() && isOpenAiVoiceSessionActive) {
            scheduleOpenAiVoiceRearm();
        }
    }
    } finally {
        isPromptSubmissionPending = false;
        updateSendButtonState();
    }
}

function focusMainWindowComposer() {
    setWorkspaceView(WORKSPACE_VIEW_PLAYGROUND, { focusComposer: true, closeSidebar: false, updateUrl: true, urlMode: "replace" });
    window.setTimeout(() => focusComposerInput({ force: true }), 0);
}

function inferAttachmentMimeType(name = "") {
    const extension = String(name || "").split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
    const types = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        pdf: "application/pdf",
        txt: "text/plain",
        md: "text/markdown",
        js: "text/javascript",
        py: "text/x-python",
        json: "application/json",
        csv: "text/csv",
        html: "text/html",
        css: "text/css"
    };
    return types[extension] || "application/octet-stream";
}

function getFileNameFromPath(filePath = "") {
    return String(filePath || "").split(/[\\/]/).filter(Boolean).pop() || "attachment";
}

async function createDesktopAttachmentFile(attachment = {}) {
    const api = getFaunaDesktopApi();
    const filePath = String(attachment.path || attachment.filePath || "").trim();
    if (!api || !filePath) return null;

    const previewUrl = api.filePathToUrl?.(filePath) || "";
    if (!previewUrl) return null;

    const response = await fetch(previewUrl);
    if (!response.ok) throw new Error(`Could not read ${getFileNameFromPath(filePath)} (${response.status})`);
    const blob = await response.blob();
    const name = String(attachment.name || "").trim() || getFileNameFromPath(filePath);
    const type = String(attachment.type || "").trim() || blob.type || inferAttachmentMimeType(name);
    const file = new File([blob], name, { type });
    defineHiddenFileValue(file, "__faunaDesktopFilePath", filePath);
    defineHiddenFileValue(file, "__faunaDesktopPreviewSrc", previewUrl);
    return file;
}

async function createDesktopAttachmentFiles(attachments = []) {
    const files = [];
    for (const attachment of Array.isArray(attachments) ? attachments : []) {
        const file = await createDesktopAttachmentFile(attachment);
        if (file) files.push(file);
    }
    return files;
}

function applyDesktopQuickModelSelection(payload = {}) {
    const provider = payload.provider === AI_PROVIDER_OPENAI ? AI_PROVIDER_OPENAI : AI_PROVIDER_LOCAL;
    const modelId = normalizeModelId(payload.modelId);
    setActiveAiProvider(provider, { refreshStatus: false });
    if (modelId) {
        setActiveModel(modelId, { provider });
    }
}

function handleDesktopOpenChatRequest(payload = {}) {
    const chatId = String(payload.chatId || "").trim();
    if (!chatId) {
        focusMainWindowComposer();
        return;
    }
    if (chatSessions.some(session => session.id === chatId && !session.archived)) {
        activateChatSession(chatId, { closeSidebar: false, urlMode: "replace" });
        focusComposerInput({ force: true });
        return;
    }
    showToast("That recent chat is no longer available.", "warning");
    focusMainWindowComposer();
}

function handleDesktopNewChatRequest() {
    startNewChatSession({ notify: true, urlMode: "replace" });
}

async function handleDesktopQuickPromptRequest(payload = {}) {
    const prompt = String(payload.prompt || "").trim();
    focusMainWindowComposer();
    if (!input) return;

    applyDesktopQuickModelSelection(payload);

    let files = [];
    try {
        files = await createDesktopAttachmentFiles(payload.attachments);
    } catch (err) {
        showToast(`Quick attachment failed: ${err.message}`, "error");
    }

    if (!prompt && files.length === 0) return;
    input.value = prompt;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    scheduleComposerDraftSave({ render: true });
    window.setTimeout(() => {
        if (isGenerating) return;
        input.value = "";
        input.style.height = "auto";
        scheduleComposerDraftSave({ immediate: true, render: true });
        void processWorkspaceEntry({ textValue: prompt, files });
    }, 0);
}

const desktopQuickApi = getFaunaDesktopApi()?.quick;
desktopQuickApi?.onOpenChat?.(handleDesktopOpenChatRequest);
desktopQuickApi?.onNewChat?.(handleDesktopNewChatRequest);
desktopQuickApi?.onPrompt?.(handleDesktopQuickPromptRequest);
void desktopQuickApi?.rendererReady?.();
