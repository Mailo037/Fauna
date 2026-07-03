// Original script.js lines 2255-3884.
function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
}

function getToolActivityIcon(kind = "tool") {
    const icons = {
        web: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.3 2.45 3.45 5.45 3.45 9S14.3 18.55 12 21"></path><path d="M12 3c-2.3 2.45-3.45 5.45-3.45 9S9.7 18.55 12 21"></path>',
        workspace: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"></path>',
        file: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path>',
        image: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path>',
        location: '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle>',
        timer: '<circle cx="12" cy="13" r="8"></circle><path d="M12 13V8"></path><path d="M12 13l3 2"></path><path d="M9 2h6"></path>',
        memory: '<path d="M6 3h12v18l-6-3-6 3V3Z"></path><path d="M9 8h6"></path><path d="M9 12h4"></path>',
        terminal: '<path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path>',
        done: '<circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.6 2.6L16.5 8.7"></path>',
        tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-3-3Z"></path>'
    };
    return icons[kind] || icons.tool;
}

let toolActivityPanelIdCounter = 0;

const PIXEL_LOADER_KINDS = new Set(["thinking", "image", "video", "web", "location", "timer", "memory", "workspace", "terminal", "tool"]);
const PIXEL_LOADER_SPRITES = {
    dots: [
        "00000000",
        "00000000",
        "00100100",
        "00000000",
        "00000000",
        "00100100",
        "00000000",
        "00000000"
    ],
    arrow: [
        "00010000",
        "00011000",
        "11111100",
        "11111110",
        "11111100",
        "00011000",
        "00010000",
        "00000000"
    ],
    heart: [
        "01100110",
        "11111111",
        "11111111",
        "11111111",
        "01111110",
        "00111100",
        "00011000",
        "00000000"
    ],
    sparkle: [
        "00010000",
        "00010000",
        "01010100",
        "00111000",
        "11111110",
        "00111000",
        "01010100",
        "00010000"
    ],
    diamond: [
        "00010000",
        "00111000",
        "01111100",
        "11111110",
        "01111100",
        "00111000",
        "00010000",
        "00000000"
    ],
    box: [
        "11111111",
        "10000001",
        "10111101",
        "10100101",
        "10100101",
        "10111101",
        "10000001",
        "11111111"
    ],
    bolt: [
        "00011100",
        "00111000",
        "01110000",
        "11111100",
        "00011100",
        "00111000",
        "01110000",
        "01000000"
    ],
    check: [
        "00000000",
        "00000010",
        "00000110",
        "10001100",
        "11011000",
        "01110000",
        "00100000",
        "00000000"
    ],
    chat: [
        "01111110",
        "10000001",
        "10100101",
        "10000001",
        "10111101",
        "10000001",
        "01111110",
        "00001100"
    ],
    ring: [
        "00111100",
        "01100110",
        "11000011",
        "11000011",
        "11000011",
        "11000011",
        "01100110",
        "00111100"
    ]
};
const PIXEL_LOADER_SEQUENCES = [
    ["dots", "arrow", "heart", "sparkle", "diamond", "dots"],
    ["ring", "heart", "check", "sparkle", "arrow", "ring"],
    ["box", "sparkle", "bolt", "heart", "check", "box"],
    ["dots", "diamond", "chat", "heart", "arrow", "dots"],
    ["sparkle", "bolt", "arrow", "check", "heart", "sparkle"],
    ["ring", "box", "diamond", "heart", "sparkle", "ring"]
];
const PIXEL_LOADER_GRID_SIZE = 8;
const PIXEL_LOADER_PIXEL_SIZE = 2;
const PIXEL_LOADER_PARTICLE_COUNT = PIXEL_LOADER_GRID_SIZE * PIXEL_LOADER_GRID_SIZE;
const PIXEL_LOADER_MOTIONS = ["shuffle", "hop", "orbit", "scatter", "drift"];
let lastPixelLoaderSequenceIndex = -1;
let lastPixelLoaderMotionIndex = -1;

function getPixelLoaderKind(kind = "thinking", label = "") {
    const normalizedKind = String(kind || "").toLowerCase();
    const normalizedLabel = String(label || "").toLowerCase();
    if (/image|picture|preview|rendering image|edit/.test(normalizedKind) || /\bimage|picture|preview|rendering image|edit\b/.test(normalizedLabel)) return "image";
    if (/video|clip|wan/.test(normalizedKind) || /\bvideo|clip|wan|frames|encoding\b/.test(normalizedLabel)) return "video";
    if (/web|search|google|bing|duck/.test(normalizedKind) || /\bweb|search|google|bing|duck\b/.test(normalizedLabel)) return "web";
    if (/location|weather/.test(normalizedKind) || /\blocation|weather|temperature\b/.test(normalizedLabel)) return "location";
    if (/timer|wait|sleep/.test(normalizedKind) || /\btimer|wait|sleep\b/.test(normalizedLabel)) return "timer";
    if (/memory/.test(normalizedKind) || /\bmemor/.test(normalizedLabel)) return "memory";
    if (/terminal|command|shell/.test(normalizedKind) || /\bterminal|command|shell|powershell\b/.test(normalizedLabel)) return "terminal";
    if (/workspace|file|folder|local/.test(normalizedKind) || /\bworkspace|file|folder|local\b/.test(normalizedLabel)) return "workspace";
    return PIXEL_LOADER_KINDS.has(normalizedKind) ? normalizedKind : "thinking";
}

function getRandomPixelLoaderSequence() {
    if (PIXEL_LOADER_SEQUENCES.length <= 1) return PIXEL_LOADER_SEQUENCES[0];
    let nextIndex = Math.floor(Math.random() * PIXEL_LOADER_SEQUENCES.length);
    if (nextIndex === lastPixelLoaderSequenceIndex) {
        nextIndex = (nextIndex + 1) % PIXEL_LOADER_SEQUENCES.length;
    }
    lastPixelLoaderSequenceIndex = nextIndex;
    return PIXEL_LOADER_SEQUENCES[nextIndex];
}

function getRandomPixelLoaderMotion() {
    if (PIXEL_LOADER_MOTIONS.length <= 1) return PIXEL_LOADER_MOTIONS[0];
    let nextIndex = Math.floor(Math.random() * PIXEL_LOADER_MOTIONS.length);
    if (nextIndex === lastPixelLoaderMotionIndex) {
        nextIndex = (nextIndex + 1) % PIXEL_LOADER_MOTIONS.length;
    }
    lastPixelLoaderMotionIndex = nextIndex;
    return PIXEL_LOADER_MOTIONS[nextIndex];
}

function getPixelSpritePoints(spriteName) {
    const sprite = PIXEL_LOADER_SPRITES[spriteName] || PIXEL_LOADER_SPRITES.dots;
    const points = [];
    sprite.forEach((row, y) => {
        row.split("").forEach((cell, x) => {
            if (cell === "1") points.push({ x, y });
        });
    });
    return points;
}

function clampPixelLoaderCoordinate(value) {
    const max = (PIXEL_LOADER_GRID_SIZE - 1) * PIXEL_LOADER_PIXEL_SIZE;
    const snapped = Math.round(value / PIXEL_LOADER_PIXEL_SIZE) * PIXEL_LOADER_PIXEL_SIZE;
    return Math.max(0, Math.min(max, snapped));
}

function getPixelLoaderNoise(seed, particleIndex, frameIndex, salt, range) {
    const value = Math.sin((seed + 1) * 17.17 + (particleIndex + 3) * 31.31 + (frameIndex + 5) * 13.13 + salt * 7.07);
    return Math.round(value * range);
}

function getPixelParticleTarget(points, particleIndex, frameIndex, seed) {
    if (!points.length) {
        return { x: 3, y: 3, opacity: "0" };
    }
    const pointIndex = (particleIndex + seed + frameIndex * 7) % points.length;
    const point = points[pointIndex] || points[0];
    return {
        x: point.x,
        y: point.y,
        opacity: particleIndex < points.length ? "0.95" : "0"
    };
}

function getPixelParticleTransitionOpacity(from, to, particleIndex, frameIndex, seed) {
    const fromVisible = from.opacity !== "0";
    const toVisible = to.opacity !== "0";
    if (fromVisible && toVisible) return "0.95";
    if (fromVisible || toVisible) return "0.68";
    return (particleIndex + frameIndex + seed) % 17 === 0 ? "0.22" : "0";
}

function getPixelParticleTransitionTarget(from, to, particleIndex, frameIndex, seed, motionKind) {
    const fromX = from.x * PIXEL_LOADER_PIXEL_SIZE;
    const fromY = from.y * PIXEL_LOADER_PIXEL_SIZE;
    const toX = to.x * PIXEL_LOADER_PIXEL_SIZE;
    const toY = to.y * PIXEL_LOADER_PIXEL_SIZE;
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const direction = (particleIndex + seed + frameIndex) % 2 === 0 ? 1 : -1;
    const perpendicularX = Math.sign(toY - fromY || getPixelLoaderNoise(seed, particleIndex, frameIndex, 11, 1) || 1);
    const perpendicularY = Math.sign(fromX - toX || getPixelLoaderNoise(seed, particleIndex, frameIndex, 13, 1) || -1);
    let offsetX = 0;
    let offsetY = 0;

    if (motionKind === "hop") {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 2, 1);
        offsetY = -2 - Math.abs(getPixelLoaderNoise(seed, particleIndex, frameIndex, 3, 2));
    } else if (motionKind === "orbit") {
        offsetX = perpendicularX * direction * (2 + Math.abs(getPixelLoaderNoise(seed, particleIndex, frameIndex, 4, 2)));
        offsetY = perpendicularY * direction * (2 + Math.abs(getPixelLoaderNoise(seed, particleIndex, frameIndex, 5, 2)));
    } else if (motionKind === "scatter") {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 6, 4);
        offsetY = getPixelLoaderNoise(seed, particleIndex, frameIndex, 7, 4);
    } else if (motionKind === "drift") {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 8, 2);
        offsetY = getPixelLoaderNoise(seed, particleIndex, frameIndex, 9, 2);
    } else {
        offsetX = getPixelLoaderNoise(seed, particleIndex, frameIndex, 10, 3);
        offsetY = getPixelLoaderNoise(seed, particleIndex, frameIndex, 12, 3);
    }

    return {
        x: clampPixelLoaderCoordinate(midX + offsetX),
        y: clampPixelLoaderCoordinate(midY + offsetY),
        opacity: getPixelParticleTransitionOpacity(from, to, particleIndex, frameIndex, seed)
    };
}

function getPixelParticleFrameStyle(frameIndex, target) {
    const x = target.x * PIXEL_LOADER_PIXEL_SIZE;
    const y = target.y * PIXEL_LOADER_PIXEL_SIZE;
    return [
        `--tx${frameIndex}:${x}px`,
        `--ty${frameIndex}:${y}px`,
        `--a${frameIndex}:${target.opacity}`
    ];
}

function getPixelParticleTransitionStyle(frameIndex, target) {
    return [
        `--mx${frameIndex}:${target.x}px`,
        `--my${frameIndex}:${target.y}px`,
        `--ma${frameIndex}:${target.opacity}`
    ];
}

function renderPixelLoader(kind = "thinking", label = "Working") {
    const animationKind = getPixelLoaderKind(kind, label);
    const sequence = getRandomPixelLoaderSequence();
    const motionKind = getRandomPixelLoaderMotion();
    const spritePoints = sequence.map(spriteName => getPixelSpritePoints(spriteName));
    const seed = Math.floor(Math.random() * PIXEL_LOADER_PARTICLE_COUNT);
    const durationMs = 2500 + Math.floor(Math.random() * 700);
    const cells = Array.from({ length: PIXEL_LOADER_PARTICLE_COUNT }, (_, index) => {
        const frameTargets = spritePoints.map((points, frameIndex) =>
            getPixelParticleTarget(points, index, frameIndex, seed)
        );
        const transitionTargets = frameTargets.map((target, frameIndex) =>
            getPixelParticleTransitionTarget(
                target,
                frameTargets[(frameIndex + 1) % frameTargets.length],
                index,
                frameIndex,
                seed,
                motionKind
            )
        );
        const style = [
            `--i:${index}`,
            ...frameTargets.flatMap((target, frameIndex) => getPixelParticleFrameStyle(frameIndex, target)),
            ...transitionTargets.flatMap((target, frameIndex) => getPixelParticleTransitionStyle(frameIndex + 1, target))
        ].join(";");
        return `<span class="pixel-loader-cell" style="${style};"></span>`;
    }).join("");
    const sequenceName = sequence.join("-");

    return `<span class="pixel-loader pixel-loader-${animationKind} pixel-loader-motion-${motionKind}" data-pixel-kind="${animationKind}" data-pixel-animation="${sequenceName}" data-pixel-motion="${motionKind}" data-pixel-seed="${seed}" style="--pixel-duration:${durationMs}ms;" aria-hidden="true">${cells}</span>`;
}

function normalizeToolActivityItems(items = []) {
    return (Array.isArray(items) ? items : [])
        .map(item => ({
            id: String(item?.id || "").trim(),
            kind: String(item?.kind || "tool").trim().toLowerCase() || "tool",
            label: String(item?.label || "Tool").trim(),
            tool: String(item?.tool || item?.toolName || "").trim(),
            detail: String(item?.detail || "").trim(),
            meta: String(item?.meta || "").trim(),
            input: String(item?.input || item?.prompt || "").trim(),
            settings: String(item?.settings || "").trim(),
            query: String(item?.query || "").trim(),
            resultCount: Number.isFinite(Number(item?.resultCount)) ? Number(item.resultCount) : null,
            error: String(item?.error || "").trim(),
            sources: Array.isArray(item?.sources)
                ? item.sources.slice(0, 8).map(source => ({
                    title: String(source?.title || source?.url || "Result").trim(),
                    url: String(source?.url || "").trim(),
                    snippet: String(source?.snippet || "").replace(/\s+/g, " ").trim()
                })).filter(source => source.title || source.url || source.snippet)
                : []
        }))
        .filter(item => item.label || item.tool || item.detail || item.meta || item.input || item.settings || item.query || item.sources.length);
}

function getToolActivityCountLabel(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function lowerFirst(value) {
    const text = String(value || "");
    return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
}

function getToolActivitySummary(items, fallbackTitle = "Thinking about") {
    const counts = {
        terminal: 0,
        file: 0,
        workspace: 0,
        web: 0,
        image: 0,
        location: 0,
        timer: 0,
        memory: 0,
        tool: 0
    };

    items.forEach(item => {
        if (item.kind === "terminal") counts.terminal += 1;
        else if (item.kind === "file") counts.file += 1;
        else if (item.kind === "workspace") counts.workspace += 1;
        else if (item.kind === "web") counts.web += 1;
        else if (item.kind === "image") counts.image += 1;
        else if (item.kind === "location") counts.location += 1;
        else if (item.kind === "timer") counts.timer += 1;
        else if (item.kind === "memory") counts.memory += 1;
        else counts.tool += 1;
    });

    const parts = [];
    if (counts.terminal) parts.push(`Ran ${getToolActivityCountLabel(counts.terminal, "command")}`);
    if (counts.file) parts.push(`Viewed ${getToolActivityCountLabel(counts.file, "file")}`);
    if (counts.workspace) parts.push(`Inspected ${getToolActivityCountLabel(counts.workspace, "workspace item")}`);
    if (counts.web) parts.push(`Searched ${getToolActivityCountLabel(counts.web, "source")}`);
    if (counts.image) parts.push(`Uploaded ${getToolActivityCountLabel(counts.image, "image")}`);
    if (counts.location) parts.push(`Checked ${getToolActivityCountLabel(counts.location, "location")}`);
    if (counts.timer) parts.push(`Waited on ${getToolActivityCountLabel(counts.timer, "timer")}`);
    if (counts.memory) parts.push(`Checked ${getToolActivityCountLabel(counts.memory, "memory", "memories")}`);
    if (counts.tool) parts.push(`Used ${getToolActivityCountLabel(counts.tool, "tool")}`);

    if (!parts.length) return fallbackTitle || "Working";
    return parts.map((part, index) => index === 0 ? part : lowerFirst(part)).join(", ");
}

function getToolActivityExtensionLabel(detail = "") {
    const extension = String(detail || "").match(/\.([a-z0-9]+)(?:$|[\s?#])/i)?.[1]?.toLowerCase();
    const labels = {
        html: "HTML",
        css: "CSS",
        js: "Script",
        mjs: "Script",
        cjs: "Script",
        ts: "TS",
        jsx: "JSX",
        tsx: "TSX",
        json: "JSON",
        md: "Markdown",
        py: "Python",
        ps1: "PowerShell",
        sh: "Shell"
    };
    return labels[extension] || "File";
}

function getToolActivityTag(item) {
    if (item.kind === "terminal") return "Script";
    if (item.kind === "file") return getToolActivityExtensionLabel(item.detail || item.label);
    if (item.kind === "workspace") return "Workspace";
    if (item.kind === "web") return "Web";
    if (item.kind === "location") return "Location";
    if (item.kind === "timer") return "Timer";
    if (item.kind === "memory") return "Memory";
    if (item.kind === "image") return "Image";
    return item.label || "Tool";
}

function getImageActivitySettings(options = {}) {
    const parts = [];
    const style = String(options.style || "").trim();
    const quality = String(options.quality || "").trim();
    const aspectRatio = String(options.aspectRatio || options.aspect_ratio || "").trim();
    const format = String(options.format || "").trim();
    const width = Number(options.width);
    const height = Number(options.height);

    if (style) parts.push(style);
    if (quality) parts.push(`${quality} quality`);
    if (aspectRatio) parts.push(aspectRatio);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        parts.push(`${width}x${height}`);
    }
    if (format) parts.push(format.toUpperCase());

    return parts.join(", ");
}

function getToolActivityRowTitle(item) {
    if (item.kind === "web") return item.label || "Searched the web";
    return item.detail || item.label || "Tool";
}

function formatToolActivityToolName(value, fallback = "Tool call") {
    const text = String(value || fallback || "Tool call")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "Tool call";
    return text.replace(/\b[a-z]/g, match => match.toUpperCase());
}

function renderToolActivityDetailField(label, value, { code = false } = {}) {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return "";
    const valueMarkup = code
        ? `<code class="tool-activity-query">${escapeHtml(cleanValue)}</code>`
        : `<span class="tool-activity-detail-value">${escapeHtml(cleanValue)}</span>`;

    return `
        <div class="tool-activity-detail-field">
            <span class="tool-activity-detail-label">${escapeHtml(label)}</span>
            ${valueMarkup}
        </div>
    `;
}

function renderToolActivityDetails(item) {
    const toolLabel = formatToolActivityToolName(item.tool, getToolActivityTag(item));
    const input = item.input || (item.kind !== "web" ? item.query : "");
    const fields = [
        renderToolActivityDetailField("Tool", toolLabel),
        renderToolActivityDetailField("Status", item.meta),
        renderToolActivityDetailField("Input", input, {
            code: item.kind === "terminal" || item.kind === "file" || item.kind === "workspace"
        }),
        renderToolActivityDetailField("Settings", item.settings),
        item.kind !== "web"
            ? renderToolActivityDetailField("Detail", item.detail, {
                code: item.kind === "terminal" || item.kind === "file" || item.kind === "workspace"
            })
            : "",
        item.resultCount !== null ? renderToolActivityDetailField("Count", `${item.resultCount} result${item.resultCount === 1 ? "" : "s"}`) : "",
        renderToolActivityDetailField("Error", item.error)
    ].filter(Boolean).join("");

    if (item.kind !== "web") {
        return `
            <div class="tool-activity-details">
                ${fields || `<p class="tool-activity-detail-empty">No additional tool details were returned.</p>`}
            </div>
        `;
    }

    const query = item.query || item.detail || "";
    const sources = item.sources || [];
    const sourceRows = sources.map((source, index) => {
        const label = source.title || source.url || `Result ${index + 1}`;
        const host = getSourceHost(source.url);
        const title = source.url
            ? `<a class="tool-activity-result-title" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
            : `<span class="tool-activity-result-title">${escapeHtml(label)}</span>`;
        return `
            <li class="tool-activity-result">
                <div class="tool-activity-result-head">
                    <span class="tool-activity-result-index">${index + 1}</span>
                    <div class="tool-activity-result-copy">
                        ${title}
                        ${host ? `<span class="tool-activity-result-host">${escapeHtml(host)}</span>` : ""}
                    </div>
                </div>
                ${source.snippet ? `<p class="tool-activity-result-snippet">${escapeHtml(source.snippet)}</p>` : ""}
            </li>
        `;
    }).join("");
    const emptyText = item.error
        ? `Search failed: ${item.error}`
        : "No result details were returned.";

    return `
        <div class="tool-activity-details">
            ${fields}
            ${query ? renderToolActivityDetailField("Query", query, { code: true }) : ""}
            <div class="tool-activity-detail-field">
                <span class="tool-activity-detail-label">Returned</span>
                ${sourceRows ? `<ol class="tool-activity-results">${sourceRows}</ol>` : `<p class="tool-activity-detail-empty">${escapeHtml(emptyText)}</p>`}
            </div>
        </div>
    `;
}

function getToolActivityItemId(item, index, panelId) {
    return item.id || `${panelId || "tool-activity"}-item-${index}`;
}

function renderToolActivityRow(item, index, extraClass = "", {
    showDetails = true,
    isOpen = false,
    panelId = "",
    preview = false
} = {}) {
    const title = getToolActivityRowTitle(item);
    const tag = getToolActivityTag(item);
    const itemId = getToolActivityItemId(item, index, panelId);
    const detailsId = `${itemId}-details`;
    const badges = [
        tag ? `<span class="tool-activity-tag">${escapeHtml(tag)}</span>` : "",
        item.meta ? `<span class="tool-activity-meta">${escapeHtml(item.meta)}</span>` : ""
    ].filter(Boolean).join("");
    const details = showDetails ? renderToolActivityDetails(item) : "";
    const expanded = Boolean(details && isOpen && !preview);
    const controls = preview ? panelId : detailsId;
    const ariaLabel = `${expanded ? "Hide" : "Show"} details for ${title}`;

    return `
        <div class="tool-activity-row-wrap ${expanded ? "expanded" : ""} ${preview ? "tool-activity-row-wrap-preview" : ""}" data-tool-activity-item-id="${escapeAttribute(itemId)}">
            <button class="tool-activity-row ${extraClass}" type="button" data-tool-activity-row-toggle data-tool-activity-item-id="${escapeAttribute(itemId)}" data-tool-kind="${escapeAttribute(item.kind)}" aria-expanded="${expanded ? "true" : "false"}" ${controls ? `aria-controls="${escapeAttribute(controls)}"` : ""} aria-label="${escapeAttribute(ariaLabel)}">
                <span class="tool-activity-icon-wrap" aria-hidden="true">
                    <svg class="tool-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${getToolActivityIcon(item.kind)}</svg>
                </span>
                <span class="tool-activity-row-body">
                    <span class="tool-activity-label">${escapeHtml(title)}</span>
                    ${badges ? `<span class="tool-activity-badges">${badges}</span>` : ""}
                </span>
                <span class="tool-activity-row-chevron" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m9 6 6 6-6 6"></path>
                    </svg>
                </span>
            </button>
            ${details ? `<div id="${escapeAttribute(detailsId)}" class="tool-activity-detail-panel" ${expanded ? "" : "hidden"}>${details}</div>` : ""}
        </div>
    `;
}

function renderToolActivityDoneRow() {
    return `
        <div class="tool-activity-row tool-activity-row-done">
            <span class="tool-activity-icon-wrap" aria-hidden="true">
                <svg class="tool-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${getToolActivityIcon("done")}</svg>
            </span>
            <div class="tool-activity-row-body">
                <div class="tool-activity-label">Done</div>
            </div>
        </div>
    `;
}

function renderToolActivity(container, options = {}) {
    if (!container) return;
    const previousState = container._faunaToolActivityState || {};
    const title = options.title || previousState.title || "Thinking about";
    const summaryOverride = Object.prototype.hasOwnProperty.call(options, "summary")
        ? String(options.summary || "").trim()
        : String(previousState.summary || "").trim();
    const items = normalizeToolActivityItems(Object.prototype.hasOwnProperty.call(options, "items") ? options.items : previousState.items);
    const status = options.status || previousState.status || "running";
    const isRunning = status !== "done" && status !== "error";
    const collapsed = typeof options.collapsed === "boolean"
        ? options.collapsed
        : previousState.collapsed !== undefined
            ? previousState.collapsed
            : true;
    const panelId = previousState.panelId || `tool-activity-panel-${++toolActivityPanelIdCounter}`;
    const hasResponseHtml = Object.prototype.hasOwnProperty.call(options, "responseHtml");
    const responseHtml = hasResponseHtml ? String(options.responseHtml || "") : String(previousState.responseHtml || "");
    const responseBusy = Object.prototype.hasOwnProperty.call(options, "responseBusy")
        ? Boolean(options.responseBusy)
        : Boolean(previousState.responseBusy);
    const openItemIds = new Set(Array.isArray(options.openItemIds)
        ? options.openItemIds
        : Array.isArray(previousState.openItemIds)
            ? previousState.openItemIds
            : []);

    container.classList.remove("creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    container.classList.add("tool-activity-bubble");
    if (isRunning) {
        container.setAttribute("aria-busy", "true");
    } else {
        container.removeAttribute("aria-busy");
    }

    const summary = summaryOverride || getToolActivitySummary(items, title);
    const previewItems = isRunning && collapsed ? items.slice(-2) : [];
    const previewStartIndex = Math.max(0, items.length - previewItems.length);
    const previewRows = previewItems
        .map((item, previewIndex) => renderToolActivityRow(item, previewStartIndex + previewIndex, "tool-activity-row-preview", {
            showDetails: false,
            panelId,
            preview: true
        }))
        .join("");
    const rows = [
        ...items.map((item, index) => {
            const itemId = getToolActivityItemId(item, index, panelId);
            return renderToolActivityRow(item, index, "", {
                isOpen: openItemIds.has(itemId),
                panelId
            });
        }),
        !isRunning ? renderToolActivityDoneRow() : ""
    ].filter(Boolean).join("") || `<div class="tool-activity-empty">Preparing tools...</div>`;

    container._faunaToolActivityState = {
        title,
        items,
        status,
        collapsed,
        panelId,
        openItemIds: Array.from(openItemIds),
        summary: summaryOverride,
        responseHtml,
        responseBusy
    };

    container.innerHTML = `
        <div class="tool-activity-card ${collapsed ? "collapsed" : "expanded"} ${isRunning ? "running" : "done"}">
            <button class="tool-activity-toggle" type="button" data-tool-activity-toggle aria-expanded="${collapsed ? "false" : "true"}" aria-controls="${panelId}">
                <svg class="tool-activity-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m9 6 6 6-6 6"></path>
                </svg>
                <span>${escapeHtml(summary)}</span>
            </button>
            ${previewRows ? `<div class="tool-activity-live-preview ${previewItems.length > 1 ? "has-multiple" : "has-single"}" aria-label="Recent tool activity">${previewRows}</div>` : ""}
            <div id="${panelId}" class="tool-activity-list ${items.length > 1 || !isRunning ? "has-multiple" : "has-single"}" ${collapsed ? "hidden" : ""}>
                ${rows || `<div class="tool-activity-empty">Preparing tools...</div>`}
            </div>
        </div>
        ${responseHtml ? `<div class="tool-activity-response ${responseBusy ? "typewriter-active" : ""}">${responseHtml}</div>` : ""}
    `;
    scrollChatToBottom();
}

function createSiblingBubble(anchorBubble) {
    const block = anchorBubble?.parentElement;
    if (!(block instanceof HTMLElement)) return null;

    const bubble = document.createElement("div");
    bubble.className = "bubble markdown";
    block.appendChild(bubble);
    return bubble;
}

function createToolActivityBubble(anchorBubble) {
    return createSiblingBubble(anchorBubble);
}

function createImageGenerationToolActivity(anchorBubble, {
    title = "Generating image",
    detail = "Generate image",
    meta = "Preparing",
    prompt = "",
    options = {},
    toolName = "generate_image"
} = {}) {
    const bubble = createToolActivityBubble(anchorBubble);
    const item = {
        kind: "image",
        label: "Image generation",
        tool: toolName,
        detail,
        meta,
        input: prompt,
        settings: getImageActivitySettings(options)
    };

    renderToolActivity(bubble, {
        title,
        summary: title,
        items: [item],
        collapsed: true
    });

    return { bubble, item, title };
}

function updateImageGenerationToolActivity(activity, meta, status = "running") {
    if (!activity?.bubble || !activity.item) return;

    activity.item.meta = meta;
    renderToolActivity(activity.bubble, {
        title: activity.title,
        summary: activity.title,
        items: [activity.item],
        status,
        collapsed: true
    });
}

function moveToolActivityBeforeBubble(activity, targetBubble) {
    const toolBubble = activity?.bubble;
    const block = targetBubble?.parentElement;
    if (!(toolBubble instanceof HTMLElement) || !(targetBubble instanceof HTMLElement) || toolBubble === targetBubble) return;
    if (toolBubble.parentElement !== block) return;

    block.insertBefore(toolBubble, targetBubble);
}

function renderAssistantContentHtml(target, html, { final = false, busy = false, typewriter = !final } = {}) {
    if (!target) return;

    if (target._faunaToolActivityState) {
        renderToolActivity(target, {
            ...target._faunaToolActivityState,
            status: final ? "done" : "running",
            responseHtml: html,
            responseBusy: busy && typewriter
        });
        return;
    }

    target.classList.remove("tool-activity-bubble", "creation-progress-bubble", "creation-progress-bubble-image", "error-bubble");
    if (final) {
        target.classList.remove("typewriter-active");
        target.removeAttribute("aria-busy");
    } else {
        target.classList.toggle("typewriter-active", Boolean(typewriter));
        if (busy) {
            target.setAttribute("aria-busy", "true");
        } else {
            target.removeAttribute("aria-busy");
        }
    }
    target.innerHTML = html;
    scrollChatToBottom();
}

function normalizeCodeLanguage(lang) {
    return String(lang || "")
        .trim()
        .split(/\s+/)[0]
        .replace(/[^\w#+.-]/g, "")
        .toLowerCase();
}

function getCodeLanguageLabel(lang, fallback = "") {
    const normalized = normalizeCodeLanguage(lang || fallback);
    const labels = {
        csharp: "C#",
        cs: "C#",
        cpp: "C++",
        cplusplus: "C++",
        js: "JavaScript",
        javascript: "JavaScript",
        mjs: "JavaScript",
        jsx: "JSX",
        ts: "TypeScript",
        typescript: "TypeScript",
        tsx: "TSX",
        py: "Python",
        python: "Python",
        sh: "Shell",
        bash: "Bash",
        shell: "Shell",
        zsh: "Zsh",
        fish: "Fish",
        ps1: "PowerShell",
        powershell: "PowerShell",
        pwsh: "PowerShell",
        cmd: "Command Prompt",
        bat: "Batch",
        batch: "Batch",
        terminal: "Terminal",
        console: "Terminal",
        html: "HTML",
        htm: "HTML",
        xhtml: "HTML",
        svg: "SVG",
        css: "CSS",
        json: "JSON",
        md: "Markdown",
        markdown: "Markdown",
        sql: "SQL",
        yaml: "YAML",
        yml: "YAML"
    };
    return labels[normalized] || (normalized ? normalized.toUpperCase() : "Code");
}

function tokenSpan(kind, value) {
    return `<span class="tok-${kind}">${escapeHtml(value)}</span>`;
}

function highlightByPattern(code, pattern, classify) {
    let output = "";
    let lastIndex = 0;
    for (const match of code.matchAll(pattern)) {
        const index = match.index ?? 0;
        if (index < lastIndex) continue;
        output += escapeHtml(code.slice(lastIndex, index));
        const token = match[0];
        const kind = classify(token, index, code, match);
        output += kind ? tokenSpan(kind, token) : escapeHtml(token);
        lastIndex = index + token.length;
    }
    output += escapeHtml(code.slice(lastIndex));
    return output;
}

function highlightHtmlTag(tag) {
    if (tag.startsWith("<!--")) return tokenSpan("comment", tag);
    if (/^<!doctype/i.test(tag)) {
        return tag
            .split(/(\s+)/)
            .map((part, index) => {
                if (!part) return "";
                if (/^\s+$/.test(part)) return escapeHtml(part);
                if (index === 0) return tokenSpan("keyword", part);
                return tokenSpan("string", part);
            })
            .join("");
    }

    let output = "";
    let index = 0;
    let tagNameSeen = false;

    while (index < tag.length) {
        const char = tag[index];

        if (char === "<") {
            const next = tag[index + 1] === "/" ? "</" : "<";
            output += tokenSpan("punct", next);
            index += next.length;
            continue;
        }

        if (char === "/" && tag[index + 1] === ">") {
            output += tokenSpan("punct", "/>");
            index += 2;
            continue;
        }

        if (char === ">" || char === "=") {
            output += tokenSpan("punct", char);
            index += 1;
            continue;
        }

        if (char === "\"" || char === "'") {
            const quote = char;
            let end = index + 1;
            while (end < tag.length && tag[end] !== quote) end += 1;
            output += tokenSpan("string", tag.slice(index, Math.min(end + 1, tag.length)));
            index = Math.min(end + 1, tag.length);
            continue;
        }

        if (/[A-Za-z_:]/.test(char)) {
            let end = index + 1;
            while (end < tag.length && /[\w:.-]/.test(tag[end])) end += 1;
            const name = tag.slice(index, end);
            output += tokenSpan(tagNameSeen ? "attr" : "tag", name);
            tagNameSeen = true;
            index = end;
            continue;
        }

        output += escapeHtml(char);
        index += 1;
    }

    return output;
}

function highlightHtmlCode(code) {
    const tagPattern = /(<!--[\s\S]*?-->|<!DOCTYPE[\s\S]*?>|<\/?[A-Za-z][^>]*?>)/gi;
    let output = "";
    let lastIndex = 0;
    for (const match of code.matchAll(tagPattern)) {
        const index = match.index ?? 0;
        output += escapeHtml(code.slice(lastIndex, index));
        output += highlightHtmlTag(match[0]);
        lastIndex = index + match[0].length;
    }
    output += escapeHtml(code.slice(lastIndex));
    return output;
}

function highlightCssCode(code) {
    const pattern = /\/\*[\s\S]*?\*\/|(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1|#[\da-f]{3,8}\b|@[a-z-]+\b|--[\w-]+(?=\s*:)|\b[a-z-]+(?=\s*:)|-?\b\d*\.?\d+(?:px|rem|em|%|vh|vw|s|ms|deg)?\b|[{}()[\];:,.]/gi;
    return highlightByPattern(code, pattern, token => {
        if (token.startsWith("/*")) return "comment";
        if (/^["']/.test(token)) return "string";
        if (token.startsWith("#")) return "number";
        if (token.startsWith("@")) return "keyword";
        if (/^--/.test(token) || /^[a-z-]+$/i.test(token)) return "property";
        if (/^-?\d/.test(token)) return "number";
        return "punct";
    });
}

function highlightJavaScriptCode(code) {
    const keywords = new Set("async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null return static super switch this throw true try typeof undefined var void while with yield document window console".split(" "));
    const pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1|\b[A-Za-z_$][\w$]*\b|-?\b\d*\.?\d+\b|[{}()[\].,;:?+\-*/%=!<>|&]+/g;
    return highlightByPattern(code, pattern, (token, index, source) => {
        if (token.startsWith("//") || token.startsWith("/*")) return "comment";
        if (/^["'`]/.test(token)) return "string";
        if (keywords.has(token)) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        if (/^[A-Za-z_$]/.test(token) && /\s*\(/.test(source.slice(index + token.length, index + token.length + 3))) return "function";
        if (/^[{}()[\].,;:?+\-*/%=!<>|&]+$/.test(token)) return "punct";
        return "";
    });
}

function highlightJsonCode(code) {
    const pattern = /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|[{}\[\],:]/gi;
    return highlightByPattern(code, pattern, (token, index, source) => {
        if (token.startsWith("\"")) {
            const next = source.slice(index + token.length).match(/^\s*:/);
            return next ? "attr" : "string";
        }
        if (/^(true|false|null)$/i.test(token)) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        return "punct";
    });
}

function highlightPythonCode(code) {
    const keywords = new Set("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self".split(" "));
    const pattern = /#[^\n]*|("""[\s\S]*?"""|'''[\s\S]*?'''|(["'])(?:\\[\s\S]|(?!\2)[^\\])*\2)|\b[A-Za-z_]\w*\b|-?\b\d*\.?\d+\b|[{}()[\].,;:?+\-*/%=!<>|&]+/g;
    return highlightByPattern(code, pattern, (token, index, source) => {
        if (token.startsWith("#")) return "comment";
        if (/^["']/.test(token)) return "string";
        if (keywords.has(token)) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        if (/^[A-Za-z_]/.test(token) && /\s*\(/.test(source.slice(index + token.length, index + token.length + 3))) return "function";
        if (/^[{}()[\].,;:?+\-*/%=!<>|&]+$/.test(token)) return "punct";
        return "";
    });
}

function highlightShellCode(code) {
    const keywords = new Set("if then else elif fi for while do done case esac function in select until return exit cd echo set export sudo pwsh powershell param foreach where-object select-object get-childitem".split(" "));
    const pattern = /#[^\n]*|(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1|\$[\w:]+|\b[A-Za-z][\w-]*\b|--?[\w-]+|-?\b\d*\.?\d+\b|[{}()[\].,;:?+\-*/%=!<>|&]+/gi;
    return highlightByPattern(code, pattern, token => {
        if (token.startsWith("#")) return "comment";
        if (/^["']/.test(token)) return "string";
        if (token.startsWith("$")) return "variable";
        if (token.startsWith("-")) return "attr";
        if (keywords.has(token.toLowerCase())) return "keyword";
        if (/^-?\d/.test(token)) return "number";
        if (/^[{}()[\].,;:?+\-*/%=!<>|&]+$/.test(token)) return "punct";
        return "";
    });
}

function inferHighlightLanguage(lang, code) {
    const normalized = normalizeCodeLanguage(lang);
    if (normalized) return normalized;
    if (/^\s*</.test(code)) return "html";
    if (/^\s*(?:[{[]|"(?:\\.|[^"\\])*"\s*:)/.test(code)) return "json";
    if (/^\s*(?:@|\.|#|:root|body\b|html\b|[a-z-]+\s*:)/i.test(code)) return "css";
    return "";
}

function highlightCode(code, lang) {
    const normalized = inferHighlightLanguage(lang, code);
    if (["html", "htm", "xhtml", "svg"].includes(normalized)) return highlightHtmlCode(code);
    if (normalized === "css") return highlightCssCode(code);
    if (["js", "javascript", "mjs", "jsx", "ts", "typescript", "tsx"].includes(normalized)) return highlightJavaScriptCode(code);
    if (normalized === "json") return highlightJsonCode(code);
    if (["py", "python"].includes(normalized)) return highlightPythonCode(code);
    if (["sh", "bash", "shell", "ps1", "powershell"].includes(normalized)) return highlightShellCode(code);
    return escapeHtml(code);
}

function renderCreationDotField(columns = 13, rows = 11) {
    const centerColumn = (columns - 1) / 2;
    const centerRow = (rows - 1) / 2;
    const travelSpan = columns + rows * 0.8;
    return Array.from({ length: columns * rows }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const normalizedDistance = Math.min(
            1,
            Math.hypot((column - centerColumn) / centerColumn, (row - centerRow) / centerRow)
        );
        const alpha = Math.max(0.16, 0.76 - normalizedDistance * 0.52).toFixed(2);
        const scale = Math.max(0.46, 1.18 - normalizedDistance * 0.5).toFixed(2);
        const restScale = Math.max(0.34, Number(scale) * 0.72).toFixed(2);
        const peakScale = Math.min(1.7, Number(scale) * 1.34).toFixed(2);
        const restAlpha = Math.max(0.1, Number(alpha) * 0.58).toFixed(2);
        const peakAlpha = Math.min(1, Number(alpha) + 0.24).toFixed(2);
        const pathProgress = (column + row * 0.8) / travelSpan;
        const delay = (pathProgress * -4.6).toFixed(3);
        return `<span class="creation-field-dot" style="--dot-alpha:${alpha};--dot-rest-alpha:${restAlpha};--dot-peak-alpha:${peakAlpha};--dot-rest-scale:${restScale};--dot-peak-scale:${peakScale};--dot-delay:${delay}s"></span>`;
    }).join("");
}

function renderCreationProgress(container, {
    kind = "image",
    title = "Creating",
    prompt = "",
    status = "Preparing request",
    steps = []
} = {}) {
    if (!container) return;
    const pixelKind = getPixelLoaderKind(kind, `${title} ${status}`);
    const isImageProgress = pixelKind === "image";
    const safePrompt = prompt.length > 92 ? `${prompt.slice(0, 89).trim()}...` : prompt;
    const stepItems = steps.map((step, index) => `
        <span class="creation-step${index === 0 ? " active" : ""}" data-step-index="${index}">
            <span class="creation-step-dot" aria-hidden="true"></span>
            ${escapeHtml(step)}
        </span>
    `).join("");

    container.classList.remove("tool-activity-bubble", "error-bubble");
    container.classList.add("creation-progress-bubble");
    container.setAttribute("aria-busy", "true");
    container.classList.toggle("creation-progress-bubble-image", isImageProgress);

    if (isImageProgress) {
        container.innerHTML = `
            <div class="creation-progress-card creation-progress-card-image" data-progress-kind="${kind}">
                <div class="creation-progress-image-head">
                    <div class="creation-progress-title">${escapeHtml(title)}</div>
                    <div class="creation-progress-status visually-hidden" data-creation-status>${escapeHtml(status)}</div>
                </div>
                <div class="creation-field-stage" aria-hidden="true">
                    <span class="creation-field-glow"></span>
                    <span class="creation-field-sweep"></span>
                    <div class="creation-dot-field">${renderCreationDotField(15, 11)}</div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="creation-progress-card" data-progress-kind="${kind}">
            ${renderPixelLoader(pixelKind, title)}
            <div class="creation-progress-body">
                <div class="creation-progress-title">${escapeHtml(title)}</div>
                <div class="creation-progress-status" data-creation-status>${escapeHtml(status)}</div>
                ${safePrompt ? `<div class="creation-progress-prompt">${escapeHtml(safePrompt)}</div>` : ""}
                ${stepItems ? `<div class="creation-steps">${stepItems}</div>` : ""}
            </div>
        </div>
    `;
}

function updateCreationProgress(container, status, activeStepIndex = null) {
    if (!container) return;
    const statusNode = container.querySelector("[data-creation-status]");
    if (statusNode) statusNode.textContent = status;

    if (activeStepIndex === null) return;
    container.querySelectorAll(".creation-step").forEach((step, index) => {
        step.classList.toggle("active", index === activeStepIndex);
        step.classList.toggle("done", index < activeStepIndex);
    });
}

function normalizeTokenCount(value) {
    if (value === null || value === undefined || value === "") return null;
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return null;
    return Math.round(count);
}

function firstTokenCount(...values) {
    for (const value of values) {
        const count = normalizeTokenCount(value);
        if (count !== null) return count;
    }
    return null;
}

function normalizeTokenUsage(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" || typeof value === "string") {
        const total = normalizeTokenCount(value);
        return total === null ? null : { total, source: TOKEN_USAGE_SOURCE_PROVIDER };
    }

    if (typeof value !== "object") return null;
    const input = firstTokenCount(value.input, value.inputTokens, value.input_tokens, value.prompt, value.promptTokens, value.prompt_tokens);
    const output = firstTokenCount(value.output, value.outputTokens, value.output_tokens, value.completion, value.completionTokens, value.completion_tokens);
    const total = firstTokenCount(
        value.total,
        value.totalTokens,
        value.total_tokens,
        input !== null || output !== null ? (input || 0) + (output || 0) : null
    );
    if (total === null) return null;

    return {
        total,
        ...(input !== null ? { input } : {}),
        ...(output !== null ? { output } : {}),
        ...(value.eventId || value.usageEventId ? { eventId: String(value.eventId || value.usageEventId) } : {}),
        source: value.source || TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function getProviderTokenUsage(data) {
    const usage = data?.usage || {};
    const openAiInput = firstTokenCount(usage.input_tokens, usage.prompt_tokens);
    const openAiOutput = firstTokenCount(usage.output_tokens, usage.completion_tokens);
    const ollamaInput = firstTokenCount(data?.prompt_eval_count);
    const ollamaOutput = firstTokenCount(data?.eval_count);
    const input = firstTokenCount(openAiInput, ollamaInput);
    const output = firstTokenCount(openAiOutput, ollamaOutput);
    const total = firstTokenCount(
        usage.total_tokens,
        input !== null || output !== null ? (input || 0) + (output || 0) : null
    );

    if (total === null) return null;
    return {
        total,
        ...(input !== null ? { input } : {}),
        ...(output !== null ? { output } : {}),
        source: TOKEN_USAGE_SOURCE_PROVIDER
    };
}

function attachTokenUsage(message, usage) {
    const normalized = normalizeTokenUsage(usage);
    if (message && normalized) {
        message.tokenUsage = normalized;
    }
    return message;
}

function sumHistoryTokenUsage(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, message) => total + (normalizeTokenUsage(message?.tokenUsage)?.total || 0), 0);
}

function createUsageEventId() {
    return window.crypto?.randomUUID?.() || `usage-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUsageEventModel(metadata = {}) {
    return String(metadata.model || metadata.message?.model || getCurrentModelLabel() || "").trim();
}

function getUsageEventReasoning(metadata = {}) {
    return String(metadata.reasoning || metadata.message?.reasoning || getReasoningLabelForMessage(getUsageEventModel(metadata)) || "").trim();
}

function normalizeUsageEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const usage = normalizeTokenUsage(raw);
    if (!usage?.total) return null;
    const date = parseStoredDate(raw.date, raw.createdAt) || new Date();
    const id = String(raw.id || raw.eventId || usage.eventId || createUsageEventId()).trim();
    return {
        id,
        date: date.toISOString(),
        total: usage.total,
        ...(usage.input !== undefined ? { input: usage.input } : {}),
        ...(usage.output !== undefined ? { output: usage.output } : {}),
        source: usage.source || TOKEN_USAGE_SOURCE_PROVIDER,
        model: String(raw.model || "").trim(),
        reasoning: String(raw.reasoning || "").trim(),
        provider: String(raw.provider || "").trim(),
        sessionId: String(raw.sessionId || "").trim()
    };
}

function readStoredUsageEvents() {
    const raw = safeLocalStorageGet(USAGE_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeUsageEvent)
            .filter(event => {
                if (!event || seen.has(event.id)) return false;
                seen.add(event.id);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse saved Fauna usage events:", err);
        return [];
    }
}

function persistUsageEvents() {
    safeLocalStorageSet(USAGE_EVENTS_STORAGE_KEY, JSON.stringify(usageEvents));
}

function upsertUsageEvent(rawEvent, { persist = true } = {}) {
    const event = normalizeUsageEvent(rawEvent);
    if (!event) return null;
    const existingIndex = usageEvents.findIndex(item => item.id === event.id);
    if (existingIndex >= 0) {
        usageEvents[existingIndex] = {
            ...usageEvents[existingIndex],
            ...event,
            model: event.model || usageEvents[existingIndex].model,
            reasoning: event.reasoning || usageEvents[existingIndex].reasoning,
            provider: event.provider || usageEvents[existingIndex].provider,
            sessionId: event.sessionId || usageEvents[existingIndex].sessionId
        };
    } else {
        usageEvents.push(event);
    }
    if (persist) persistUsageEvents();
    return event;
}

function normalizeUsageToolEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const label = String(raw.label || raw.name || raw.tool || "").trim();
    if (!label) return null;
    const date = parseStoredDate(raw.date, raw.createdAt) || new Date();
    const id = String(raw.id || raw.eventId || `tool-${Date.now()}-${Math.random().toString(16).slice(2)}`).trim();
    return {
        id,
        date: date.toISOString(),
        label,
        kind: String(raw.kind || "tool").trim() || "tool",
        sessionId: String(raw.sessionId || "").trim()
    };
}

function readStoredUsageToolEvents() {
    const raw = safeLocalStorageGet(USAGE_TOOL_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed
            .map(normalizeUsageToolEvent)
            .filter(event => {
                if (!event || seen.has(event.id)) return false;
                seen.add(event.id);
                return true;
            });
    } catch (err) {
        console.warn("Could not parse saved Fauna tool usage events:", err);
        return [];
    }
}

function persistUsageToolEvents() {
    safeLocalStorageSet(USAGE_TOOL_EVENTS_STORAGE_KEY, JSON.stringify(usageToolEvents));
}

function upsertUsageToolEvent(rawEvent, { persist = true } = {}) {
    const event = normalizeUsageToolEvent(rawEvent);
    if (!event) return null;
    const existingIndex = usageToolEvents.findIndex(item => item.id === event.id);
    if (existingIndex >= 0) {
        usageToolEvents[existingIndex] = {
            ...usageToolEvents[existingIndex],
            ...event,
            sessionId: event.sessionId || usageToolEvents[existingIndex].sessionId
        };
    } else {
        usageToolEvents.push(event);
    }
    if (persist) persistUsageToolEvents();
    return event;
}

function recordTokenUsageEvent(usage, metadata = {}) {
    const normalized = normalizeTokenUsage(usage);
    if (!normalized?.total) return null;
    const message = metadata.message || null;
    const eventId = normalized.eventId || message?.tokenUsage?.eventId || metadata.eventId || createUsageEventId();
    const usageWithEvent = { ...normalized, eventId };
    if (message) message.tokenUsage = usageWithEvent;
    const event = upsertUsageEvent({
        ...usageWithEvent,
        id: eventId,
        date: metadata.date || message?.createdAt || new Date().toISOString(),
        model: getUsageEventModel(metadata),
        reasoning: getUsageEventReasoning(metadata),
        provider: metadata.provider || message?.provider || getCurrentProviderLabel(),
        sessionId: metadata.sessionId || activeSessionId || ""
    });
    refreshUsageSettingsPaneIfVisible();
    return event;
}

function migrateUsageEventsFromSessions() {
    let changed = false;
    let toolEventsChanged = false;
    chatSessions.forEach(session => {
        const sessionDate = parseStoredDate(session.updatedAt, session.createdAt) || new Date();
        let messageTotal = 0;
        (session.conversationHistory || []).forEach((message, index) => {
            const usage = normalizeTokenUsage(message.tokenUsage);
            if (!usage?.total) return;
            messageTotal += usage.total;
            const eventId = usage.eventId || `chat:${session.id}:${index}:${message.createdAt || session.updatedAt || session.createdAt || ""}:${usage.total}`;
            if (!usage.eventId) {
                message.tokenUsage = { ...usage, eventId };
                changed = true;
            }
            const event = upsertUsageEvent({
                ...message.tokenUsage,
                id: eventId,
                date: message.createdAt || sessionDate.toISOString(),
                model: message.model,
                reasoning: message.reasoning,
                provider: message.provider,
                sessionId: session.id
            }, { persist: false });
            if (event) changed = true;
        });

        const sessionTotal = getSessionTokenTotal(session);
        if (sessionTotal > messageTotal) {
            const delta = sessionTotal - messageTotal;
            const event = upsertUsageEvent({
                id: `chat-total:${session.id}:${session.updatedAt || session.createdAt || ""}:${delta}`,
                date: sessionDate.toISOString(),
                total: delta,
                source: TOKEN_USAGE_SOURCE_PROVIDER,
                sessionId: session.id
            }, { persist: false });
            if (event) changed = true;
        }

        if (syncUsageToolEventsFromSession(session, { persist: false }) > 0) {
            toolEventsChanged = true;
        }
    });
    if (changed) persistUsageEvents();
    if (toolEventsChanged) persistUsageToolEvents();
}

function initializeUsageEvents() {
    usageEvents = readStoredUsageEvents();
    usageToolEvents = readStoredUsageToolEvents();
    migrateUsageEventsFromSessions();
}

function addSessionTokens(usage, metadata = {}) {
    const normalized = normalizeTokenUsage(usage);
    if (!normalized) {
        updateTokenDisplay();
        return 0;
    }
    const event = recordTokenUsageEvent(normalized, metadata);
    const trackedUsage = event ? { ...normalized, eventId: event.id } : normalized;
    if (metadata.message && trackedUsage.eventId) {
        metadata.message.tokenUsage = trackedUsage;
    }
    sessionTotalTokens += normalized.total;
    updateTokenDisplay();
    return normalized.total;
}

function recordSessionTokenUsage(sessionId, usage, metadata = {}) {
    const normalized = normalizeTokenUsage(usage);
    if (!normalized) {
        updateTokenDisplay();
        return 0;
    }
    const event = recordTokenUsageEvent(normalized, {
        ...metadata,
        sessionId: sessionId || metadata.sessionId || activeSessionId || ""
    });
    const trackedUsage = event ? { ...normalized, eventId: event.id } : normalized;
    if (metadata.message && trackedUsage.eventId) {
        metadata.message.tokenUsage = trackedUsage;
    }
    if (!sessionId || sessionId === activeSessionId) {
        sessionTotalTokens += normalized.total;
        updateTokenDisplay();
    }
    return normalized.total;
}

function isImageAttachment(file) {
    return Boolean(file?.type?.startsWith("image/"));
}

function getComposerTokenModel(text = input?.value || "", files = attachedFiles) {
    if (isOpenAiProvider()) return getOpenAiChatModel();
    try {
        const trimmed = String(text || "").trim();
        return chooseModelForRequest(
            trimmed,
            files,
            getImageCommandPrompt(trimmed),
            getVideoCommandPrompt(trimmed)
        ) || OLLAMA_MODEL;
    } catch {
        return OLLAMA_MODEL;
    }
}

function getComposerTokenSignature() {
    const text = input?.value || "";
    const files = attachedFiles.map(file => [
        file.name || "",
        file.size || 0,
        file.type || "",
        file.lastModified || 0
    ].join(":")).join("|");
    const provider = isOpenAiProvider() ? AI_PROVIDER_OPENAI : AI_PROVIDER_LOCAL;
    const model = getComposerTokenModel(text, attachedFiles);
    return JSON.stringify({ text, files, provider, model });
}

function hasComposerTokenContent() {
    return Boolean((input?.value || "").trim() || attachedFiles.length > 0);
}

async function buildComposerTokenText(text, files) {
    let messageContent = String(text || "").trim();
    for (const file of files) {
        if (isImageAttachment(file)) continue;
        try {
            const textContent = await file.text();
            messageContent += `\n\n--- Attached File Content: ${file.name} ---\n${textContent}\n-----------------------`;
        } catch {
            messageContent += `\n\n[Error reading file context item: ${file.name}]`;
        }
    }
    return messageContent;
}

function extractOllamaTokenizeCount(data) {
    const direct = firstTokenCount(data?.count, data?.token_count, data?.num_tokens, data?.total_tokens);
    if (direct !== null) return direct;

    const tokens = data?.tokens || data?.token_ids || data?.ids;
    return Array.isArray(tokens) ? tokens.length : null;
}

async function requestOllamaTokenCount(text, model) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), TOKEN_COUNTER_TIMEOUT_MS);
    let res;
    try {
        res = await ollamaFetch(OLLAMA_TOKENIZE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            desktopTimeoutMs: TOKEN_COUNTER_TIMEOUT_MS + 1000,
            body: JSON.stringify({ model, prompt: text })
        });
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error("Ollama tokenizer timed out.");
        }
        throw err;
    } finally {
        window.clearTimeout(timeout);
    }

    if (!res.ok) {
        throw new Error(`Ollama tokenizer responded with HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    const count = extractOllamaTokenizeCount(data);
    if (count === null) {
        throw new Error("Ollama tokenizer did not return token ids.");
    }
    return count;
}

function setComposerTokenState(nextState) {
    composerTokenState = {
        signature: nextState.signature || "",
        status: nextState.status || "idle",
        count: normalizeTokenCount(nextState.count),
        source: nextState.source || "",
        error: nextState.error || ""
    };
    updateTokenDisplay({ scheduleCount: false });
}

async function refreshComposerTokenCount(signature, requestId) {
    setComposerTokenState({ signature, status: "counting" });

    const text = input?.value || "";
    const files = [...attachedFiles];
    if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;

    if (isOpenAiProvider()) {
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: `OpenAI draft tokens are counted from API usage after send. For a manual preflight count, use ${OPENAI_TOKENIZER_URL}.`
        });
        return;
    }

    if (!isOllamaReachable) {
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: "Ollama tokenizer is unavailable because Ollama is offline or has not checked in yet. Token usage will update from provider usage after send."
        });
        return;
    }

    if (files.some(isImageAttachment)) {
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: "Image attachment tokens are counted from provider usage after send."
        });
        return;
    }

    try {
        const tokenText = await buildComposerTokenText(text, files);
        if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;

        if (!tokenText.trim()) {
            setComposerTokenState({ signature: "", status: "idle" });
            return;
        }

        const model = getComposerTokenModel(text, files);
        const count = await requestOllamaTokenCount(tokenText, model);
        if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;

        setComposerTokenState({
            signature,
            status: "ready",
            count,
            source: `Ollama tokenizer (${model})`
        });
    } catch (err) {
        if (signature !== getComposerTokenSignature() || requestId !== composerTokenCountRequestId) return;
        setComposerTokenState({
            signature,
            status: "unavailable",
            error: `Tokenizer unavailable; token usage will update from provider usage after send. ${err.message}`
        });
    }
}

function scheduleComposerTokenCount() {
    if (composerTokenCountTimer) {
        window.clearTimeout(composerTokenCountTimer);
        composerTokenCountTimer = null;
    }

    if (isGenerating || !hasComposerTokenContent()) {
        composerTokenCountRequestId += 1;
        if (composerTokenState.status !== "idle" || composerTokenState.count !== null) {
            setComposerTokenState({ signature: "", status: "idle" });
        }
        return;
    }

    const signature = getComposerTokenSignature();
    if (composerTokenState.signature === signature && ["ready", "counting", "unavailable"].includes(composerTokenState.status)) {
        return;
    }

    const requestId = ++composerTokenCountRequestId;
    composerTokenState = { signature, status: "queued", count: null, source: "", error: "" };
    composerTokenCountTimer = window.setTimeout(() => {
        composerTokenCountTimer = null;
        refreshComposerTokenCount(signature, requestId);
    }, TOKEN_COUNTER_DEBOUNCE_MS);
}

function getComposerTokenDisplayPart() {
    if (isGenerating) return "Busy";
    if (!hasComposerTokenContent()) return "";
    if (composerTokenState.status === "ready" && composerTokenState.count !== null) {
        return `${composerTokenState.count.toLocaleString()} Prompt Tokens`;
    }
    if (composerTokenState.status === "queued" || composerTokenState.status === "counting") {
        return "Counting Tokens";
    }
    if (composerTokenState.status === "unavailable") {
        return "Tokens After Send";
    }
    return "";
}

function updateTokenDisplay({ scheduleCount = true } = {}) {
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) {
        setLibraryHeaderSummary(collectLibraryItems());
        return;
    }
    if (scheduleCount) scheduleComposerTokenCount();
    if (tokenCounter) {
        const parts = [`${sessionTotalTokens.toLocaleString()} Session Tokens`];
        const composerPart = getComposerTokenDisplayPart();
        if (composerPart) parts.push(composerPart);
        tokenCounter.textContent = parts.join(" · ");
        const tokenSummaryParts = [
            `Session tokens: ${sessionTotalTokens.toLocaleString()} from provider-reported usage.`
        ];
        if (!isGenerating && composerTokenState.status === "ready" && composerTokenState.count !== null) {
            tokenSummaryParts.push(`Current prompt tokens: ${composerTokenState.count.toLocaleString()} from ${composerTokenState.source}.`);
        } else if (!isGenerating && composerTokenState.status === "unavailable" && composerTokenState.error) {
            tokenSummaryParts.push(composerTokenState.error);
        } else if (!isGenerating && (composerTokenState.status === "queued" || composerTokenState.status === "counting")) {
            tokenSummaryParts.push("Counting current prompt tokens.");
        }
        const tokenSummary = tokenSummaryParts.join(" ");
        tokenCounter.dataset.tooltip = tokenSummary;
        tokenCounter.setAttribute("aria-label", tokenSummary);
    }
}

