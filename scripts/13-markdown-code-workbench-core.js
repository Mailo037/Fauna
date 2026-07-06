// Original script.js lines 17701-19389.
// ===== MARKDOWN ENGINE =====

function getFileReferenceExtension(path) {
    const fileName = String(path || "").split(/[\\/]/).pop() || "";
    const match = fileName.match(/\.([A-Za-z0-9]+)$/);
    return match ? match[1].toLowerCase() : "";
}

function isLikelyFileReferencePath(path) {
    const cleanPath = String(path || "").trim();
    if (!cleanPath || /^https?:/i.test(cleanPath)) return false;
    if (hasExplicitFileReferenceSyntax(cleanPath)) return true;
    if (/[\\/]/.test(cleanPath)) return isKnownWorkspaceReferencePath(cleanPath);
    return FILE_REFERENCE_EXTENSIONS.has(getFileReferenceExtension(cleanPath));
}

function hasExplicitFileReferenceSyntax(path) {
    const cleanPath = String(path || "").trim();
    if (/^[A-Za-z]:[\\/]/.test(cleanPath)) return true;
    if (/^\.{1,2}[\\/]/.test(cleanPath)) return true;
    if (FILE_REFERENCE_EXTENSIONS.has(getFileReferenceExtension(cleanPath))) return true;
    return /[\\/][A-Za-z0-9_.-]+\.[A-Za-z0-9]{1,12}$/.test(cleanPath);
}

function normalizeFileReferenceLookupPath(path = "") {
    return String(path || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/\/+$/, "")
        .toLowerCase();
}

function getKnownWorkspaceReferenceEntry(path = "") {
    const lookupPath = normalizeFileReferenceLookupPath(path);
    if (!lookupPath) return null;

    if (activeProjectFile?.path && normalizeFileReferenceLookupPath(activeProjectFile.path) === lookupPath) {
        return { type: "file", path: activeProjectFile.path };
    }

    const entries = Array.isArray(currentProjectExplorerResult?.entries)
        ? currentProjectExplorerResult.entries
        : [];
    return entries.find(entry => normalizeFileReferenceLookupPath(entry?.path || "") === lookupPath) || null;
}

function isKnownWorkspaceReferencePath(path = "") {
    return Boolean(getKnownWorkspaceReferenceEntry(path));
}

function cleanFileReferencePath(value) {
    return String(value || "")
        .trim()
        .replace(/^<|>$/g, "")
        .replace(/^["'`]+|["'`]+$/g, "")
        .trim();
}

function splitTrailingFileReferencePunctuation(value) {
    let path = String(value || "");
    let suffix = "";
    while (path && /[)\].,!?;]$/.test(path)) {
        suffix = path.slice(-1) + suffix;
        path = path.slice(0, -1);
    }
    return { path, suffix };
}

function parseFileReferenceTarget(value) {
    let path = cleanFileReferencePath(value);
    if (!path) return null;
    let line = "";
    let endLine = "";

    const parenthesizedLine = path.match(/^(.*?)\s*\((?:line|lines?)\s+(\d+)(?:\s*[-–]\s*(\d+))?\)$/i);
    if (parenthesizedLine) {
        path = parenthesizedLine[1].trim();
        line = parenthesizedLine[2];
        endLine = parenthesizedLine[3] || "";
    }

    const hashLine = path.match(/^(.*?)#L(\d+)(?:[-:](\d+))?$/i);
    if (hashLine) {
        path = hashLine[1].trim();
        line = line || hashLine[2];
        endLine = endLine || hashLine[3] || "";
    }

    const colonLine = path.match(/^(.*):(\d+)(?:[-:](\d+))?$/);
    if (colonLine && !/^[A-Za-z]$/.test(colonLine[1])) {
        path = colonLine[1].trim();
        line = line || colonLine[2];
        endLine = endLine || colonLine[3] || "";
    }

    const splitPath = splitTrailingFileReferencePunctuation(path);
    path = cleanFileReferencePath(splitPath.path);
    if (!line) {
        const hashLineAfterSuffix = path.match(/^(.*?)#L(\d+)(?:[-:](\d+))?$/i);
        if (hashLineAfterSuffix) {
            path = hashLineAfterSuffix[1].trim();
            line = hashLineAfterSuffix[2];
            endLine = hashLineAfterSuffix[3] || "";
        }
    }
    if (!line) {
        const colonLineAfterSuffix = path.match(/^(.*):(\d+)(?:[-:](\d+))?$/);
        if (colonLineAfterSuffix && !/^[A-Za-z]$/.test(colonLineAfterSuffix[1])) {
            path = colonLineAfterSuffix[1].trim();
            line = colonLineAfterSuffix[2];
            endLine = colonLineAfterSuffix[3] || "";
        }
    }
    if (!isLikelyFileReferencePath(path)) return null;
    return { path, line, endLine, suffix: splitPath.suffix };
}

function getFileReferenceDisplayPath(path) {
    const cleanPath = String(path || "").replace(/[\\/]+$/g, "");
    return cleanPath.split(/[\\/]/).pop() || cleanPath || "file";
}

function getFileReferenceLineLabel(line, endLine) {
    if (!line) return "";
    return endLine && endLine !== line ? `lines ${line}-${endLine}` : `line ${line}`;
}

function renderFileReference(path, line = "", endLine = "", label = "") {
    const displayName = String(label || "").trim() || [
        getFileReferenceDisplayPath(path),
        getFileReferenceLineLabel(line, endLine) ? `(${getFileReferenceLineLabel(line, endLine)})` : ""
    ].filter(Boolean).join(" ");
    const extension = getFileReferenceExtension(path);
    const knownEntry = getKnownWorkspaceReferenceEntry(path);
    const iconLabel = (extension || (knownEntry?.type === "directory" || /[\\/]$/.test(path) ? "dir" : "file")).slice(0, 4).toLowerCase();
    const tooltip = [
        path,
        getFileReferenceLineLabel(line, endLine) ? `(${getFileReferenceLineLabel(line, endLine)})` : ""
    ].filter(Boolean).join(" ");
    const iconClass = extension ? ` file-reference-icon-${escapeHtml(extension)}` : "";

    return `<button type="button" class="file-reference" data-file-reference-path="${escapeHtml(path)}" data-file-reference-line="${escapeHtml(line)}" data-file-reference-end-line="${escapeHtml(endLine)}" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`Copy file reference ${displayName}`)}"><span class="file-reference-icon${iconClass}" aria-hidden="true">${escapeHtml(iconLabel)}</span><span class="file-reference-label">${escapeHtml(displayName)}</span></button>`;
}

function splitTrailingWebsitePunctuation(value) {
    let url = String(value || "");
    let suffix = "";
    while (url && /[)\].,!?;]$/.test(url)) {
        suffix = url.slice(-1) + suffix;
        url = url.slice(0, -1);
    }
    return { url, suffix };
}

function parseWebsiteReferenceTarget(value) {
    const split = splitTrailingWebsitePunctuation(String(value || "").trim());
    if (!/^https?:\/\//i.test(split.url)) return null;
    try {
        const parsed = new URL(split.url);
        return {
            url: parsed.href,
            host: parsed.hostname.replace(/^www\./, ""),
            suffix: split.suffix
        };
    } catch {
        return null;
    }
}

function getWebsiteFaviconUrl(url) {
    try {
        const parsed = new URL(url);
        return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsed.origin)}&sz=32`;
    } catch {
        return "";
    }
}

function getSearchReferenceLabel(reference) {
    try {
        const parsed = new URL(reference.url);
        const host = parsed.hostname.replace(/^www\./, "");
        if (/^(?:google\.)/i.test(host) && parsed.pathname === "/search") return "Google search";
        if (/^(?:bing\.)/i.test(host) && parsed.pathname === "/search") return "Bing search";
        if (/duckduckgo\.com$/i.test(host)) return "DuckDuckGo search";
    } catch {
        return "";
    }
    return "";
}

function isWebsiteReferenceLabelUrl(value) {
    return Boolean(parseWebsiteReferenceTarget(String(value || "").trim()));
}

function getWebsiteReferenceDisplayName(reference, label = "") {
    const cleanLabel = String(label || "").trim();
    if (cleanLabel && !isWebsiteReferenceLabelUrl(cleanLabel)) return cleanLabel;
    return getSearchReferenceLabel(reference) || reference.host;
}

function renderWebsiteReference(url, label = "") {
    const reference = parseWebsiteReferenceTarget(url);
    if (!reference) return formatInlinePlainText(url);
    const displayName = getWebsiteReferenceDisplayName(reference, label);
    const ariaLabel = `Open website ${displayName}`;
    const faviconUrl = getWebsiteFaviconUrl(reference.url);
    return `<a class="website-reference" href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer" data-tooltip="${escapeHtml(`Open ${displayName}`)}" aria-label="${escapeHtml(ariaLabel)}"><span class="website-reference-icon" aria-hidden="true">${faviconUrl ? `<img class="website-reference-favicon" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy" decoding="async">` : ""}<span class="website-reference-fallback" ${faviconUrl ? "hidden" : ""}>${escapeHtml(reference.host.slice(0, 1).toUpperCase() || "W")}</span></span><span class="website-reference-label">${escapeHtml(displayName)}</span></a>`;
}

function getHexColorMentionPattern() {
    return /(^|[^A-Za-z0-9_-])(#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3}))(?![0-9A-Fa-f])/g;
}

function getHexColorSwatchMarkup(color) {
    const safeColor = String(color || "");
    if (!/^#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(safeColor)) return escapeHtml(safeColor);
    return `<span class="hex-color-swatch" style="--hex-color-preview: ${escapeHtml(safeColor)};" aria-hidden="true"></span>`;
}

function decorateHexColorsInFormattedText(html) {
    return String(html || "").replace(getHexColorMentionPattern(), (_match, prefix, color) => {
        return `${prefix}<span class="hex-color-token"><span class="hex-color-value">${escapeHtml(color)}</span>${getHexColorSwatchMarkup(color)}</span>`;
    });
}

function formatInlineCodeWithHexSwatches(value) {
    const source = String(value || "");
    let output = "";
    let lastIndex = 0;

    const appendCode = text => {
        if (!text) return;
        output += `<code>${escapeHtml(text)}</code>`;
    };

    for (const match of source.matchAll(getHexColorMentionPattern())) {
        const matchIndex = match.index || 0;
        const prefix = match[1] || "";
        const color = match[2] || "";
        const colorIndex = matchIndex + prefix.length;
        appendCode(source.slice(lastIndex, colorIndex));
        output += `<span class="hex-color-token hex-color-token-code"><code>${escapeHtml(color)}</code>${getHexColorSwatchMarkup(color)}</span>`;
        lastIndex = colorIndex + color.length;
    }

    appendCode(source.slice(lastIndex));
    return output || "<code></code>";
}

function formatInlinePlainText(segment) {
    let safe = escapeHtml(segment);
    safe = safe.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return decorateHexColorsInFormattedText(safe);
}

function formatInlinePlainTextWithSkillMentions(segment) {
    if (typeof getSkillMentionRecord !== "function" || typeof renderSkillMentionChip !== "function") {
        return formatInlinePlainText(segment);
    }
    const source = String(segment || "");
    let output = "";
    let lastIndex = 0;
    const mentionPattern = /(^|[\s([{])([$@])([A-Za-z0-9][A-Za-z0-9_.-]{1,80})\b/g;
    for (const match of source.matchAll(mentionPattern)) {
        const matchIndex = match.index || 0;
        const prefix = match[1] || "";
        const token = match[3] || "";
        const skill = getSkillMentionRecord(token);
        if (!skill) continue;
        const mentionStart = matchIndex + prefix.length;
        output += formatInlinePlainText(source.slice(lastIndex, mentionStart));
        output += renderSkillMentionChip(skill);
        lastIndex = mentionStart + match[2].length + token.length;
    }
    output += formatInlinePlainText(source.slice(lastIndex));
    return output;
}

function absorbReferenceMarkdownEmphasis(text, candidate) {
    const source = String(text || "");
    const start = candidate.index || 0;
    const end = start + candidate.length;
    for (const marker of ["***", "**", "*"]) {
        if (start < marker.length) continue;
        if (source.slice(start - marker.length, start) !== marker) continue;
        if (source.slice(end, end + marker.length) !== marker) continue;
        return {
            ...candidate,
            index: start - marker.length,
            length: candidate.length + marker.length * 2
        };
    }
    return candidate;
}

function getInlineReferenceCandidates(text) {
    const candidates = [];

    for (const match of text.matchAll(WEBSITE_REFERENCE_URL_RE)) {
        const matchIndex = match.index || 0;
        const reference = parseWebsiteReferenceTarget(match[0]);
        if (!reference) continue;
        candidates.push(absorbReferenceMarkdownEmphasis(text, {
            type: "website",
            index: matchIndex,
            length: match[0].length,
            url: reference.url,
            suffix: reference.suffix
        }));
    }

    for (const match of text.matchAll(FILE_REFERENCE_PATH_RE)) {
        const matchIndex = match.index || 0;
        const before = text[matchIndex - 1] || "";
        if (before && /[A-Za-z0-9_/@:#-]/.test(before)) continue;

        const reference = parseFileReferenceTarget(match[1]);
        if (!reference) continue;
        candidates.push(absorbReferenceMarkdownEmphasis(text, {
            type: "file",
            index: matchIndex,
            length: match[0].length,
            path: reference.path,
            line: match[3] || match[2] || reference.line || "",
            endLine: match[4] || reference.endLine || "",
            suffix: reference.suffix
        }));
    }

    return candidates
        .sort((a, b) => a.index - b.index || b.length - a.length)
        .filter((candidate, index, sorted) => !sorted.slice(0, index).some(previous => candidate.index < previous.index + previous.length));
}

function renderPlainTextWithReferences(text) {
    let output = "";
    let lastIndex = 0;

    for (const candidate of getInlineReferenceCandidates(text)) {
        if (candidate.index < lastIndex) continue;
        output += formatInlinePlainTextWithSkillMentions(text.slice(lastIndex, candidate.index));
        if (candidate.type === "website") {
            output += renderWebsiteReference(candidate.url);
        } else {
            output += renderFileReference(candidate.path, candidate.line, candidate.endLine);
        }
        output += candidate.suffix ? formatInlinePlainTextWithSkillMentions(candidate.suffix) : "";
        lastIndex = candidate.index + candidate.length;
    }

    output += formatInlinePlainTextWithSkillMentions(text.slice(lastIndex));
    return output;
}

function renderMarkdownLinks(text) {
    let output = "";
    let lastIndex = 0;
    const linkPattern = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;

    for (const match of text.matchAll(linkPattern)) {
        const matchIndex = match.index || 0;
        output += renderPlainTextWithReferences(text.slice(lastIndex, matchIndex));

        const fileReference = parseFileReferenceTarget(match[2]);
        const websiteReference = parseWebsiteReferenceTarget(match[2]);
        if (fileReference) {
            output += renderFileReference(fileReference.path, fileReference.line, fileReference.endLine, match[1]);
            output += fileReference.suffix ? formatInlinePlainText(fileReference.suffix) : "";
        } else if (websiteReference) {
            output += renderWebsiteReference(websiteReference.url, match[1]);
            output += websiteReference.suffix ? formatInlinePlainText(websiteReference.suffix) : "";
        } else {
            output += renderPlainTextWithReferences(match[0]);
        }
        lastIndex = matchIndex + match[0].length;
    }

    output += renderPlainTextWithReferences(text.slice(lastIndex));
    return output;
}

function formatInlineMarkdownText(str) {
    return String(str || "").split(/(`[^`\n]+`)/g).map(segment => {
        if (/^`[^`\n]+`$/.test(segment)) {
            return formatInlineCodeWithHexSwatches(segment.slice(1, -1));
        }
        return renderMarkdownLinks(segment);
    }).join("");
}

function renderMarkdown(md) {
    const escape = escapeHtml;
    const lines = md.split("\n");
    let html = "", inCode = false, codeLang = "", codeBuffer = "", inUL = false, inOL = false, pendingCodeFileName = "";

    const closeList = () => {
        if (inUL) { html += "</ul>"; inUL = false; }
        if (inOL) { html += "</ol>"; inOL = false; }
    };

    const inlineFormat = formatInlineMarkdownText;

    const renderCodeBlock = () => {
        const lang = normalizeCodeLanguage(codeLang);
        const label = getCodeLanguageLabel(lang);
        const className = lang ? `lang-${escape(lang)}` : "";
        const rawCode = codeBuffer.replace(/\n$/,"");
        const fileName = pendingCodeFileName;
        pendingCodeFileName = "";
        const cardAttrs = fileName
            ? ` data-code-card-requested="true" data-code-file-name="${escape(fileName)}"`
            : "";
        const cardClass = fileName ? " code-file-card-requested" : "";
        return `<div class="code-block-wrapper markdown-code-block${cardClass}"${cardAttrs}><div class="code-block-header"><span class="code-lang-label">${escape(label)}</span></div><pre><code class="${className}">${highlightCode(rawCode, lang)}</code></pre></div>`;
    };

    for (const raw of lines) {
        const fence = raw.match(/^```\s*([^\s`]*)?.*$/);
        if (fence) {
            if (!inCode) {
                closeList();
                inCode = true;
                codeLang = normalizeCodeLanguage(fence[1]);
                codeBuffer = "";
            } else {
                html += renderCodeBlock();
                inCode = false;
            }
            continue;
        }
        if (inCode) {
            codeBuffer += raw + "\n";
            continue;
        }

        const fileCardDirective = raw.match(CODE_FILE_CARD_DIRECTIVE_RE);
        if (fileCardDirective) {
            closeList();
            pendingCodeFileName = fileCardDirective[1].trim();
            continue;
        }

        if (raw.trim() !== "" && pendingCodeFileName) {
            pendingCodeFileName = "";
        }

        const h = raw.match(/^(#{1,6})\s+(.*)/);
        if (h) {
            closeList();
            html += "<h" + h[1].length + ">" + inlineFormat(h[2]) + "</h" + h[1].length + ">";
            continue;
        }

        const blockquote = raw.match(/^>\s?(.*)/);
        if (blockquote) {
            closeList();
            html += "<blockquote><p>" + inlineFormat(blockquote[1]) + "</p></blockquote>";
            continue;
        }

        const ul = raw.match(/^[\*\-\+]\s+(.*)/);
        if (ul) {
            if (!inUL) { closeList(); html += "<ul>"; inUL = true; }
            html += "<li>" + inlineFormat(ul[1]) + "</li>";
            continue;
        }

        const ol = raw.match(/^\d+\.\s+(.*)/);
        if (ol) {
            if (!inOL) { closeList(); html += "<ol>"; inOL = true; }
            html += "<li>" + inlineFormat(ol[1]) + "</li>";
            continue;
        }

        if (raw.trim() === "") {
            closeList();
            continue;
        }

        closeList();
        html += "<p>" + inlineFormat(raw) + "</p>";
    }
    closeList();
    if (inCode) {
        html += renderCodeBlock();
    }
    return html;
}

// ===== SECURE CODE SANDBOX SYSTEM =====
const PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";
const PREVIEW_STORAGE_SHIM = `(() => {
    const createMemoryStorage = () => {
        const values = new Map();
        return {
            get length() { return values.size; },
            key(index) { return Array.from(values.keys())[Number(index)] ?? null; },
            getItem(key) {
                key = String(key);
                return values.has(key) ? values.get(key) : null;
            },
            setItem(key, value) {
                values.set(String(key), String(value));
            },
            removeItem(key) {
                values.delete(String(key));
            },
            clear() {
                values.clear();
            }
        };
    };

    const ensureStorage = name => {
        const fallbackStorage = createMemoryStorage();
        try {
            Object.defineProperty(window, name, {
                configurable: true,
                enumerable: true,
                value: fallbackStorage
            });
            return;
        } catch {}

        try {
            const storage = window[name];
            const testKey = "__fauna_preview_storage_test__";
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return;
        } catch {}
    };

    ensureStorage("localStorage");
    ensureStorage("sessionStorage");
})();`;
const PREVIEW_RUNTIME_ERROR_SHIM = `(() => {
    const ERROR_BOX_ID = "fauna-preview-runtime-error";
    const ERROR_STYLE_ID = "fauna-preview-runtime-error-style";

    const formatReason = reason => {
        if (reason instanceof Error) return reason.name + ": " + reason.message;
        if (reason && typeof reason === "object") {
            try {
                return JSON.stringify(reason);
            } catch {}
        }
        return String(reason || "Unknown preview error");
    };

    const ensureStyle = () => {
        if (document.getElementById(ERROR_STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = ERROR_STYLE_ID;
        style.textContent = [
            "#" + ERROR_BOX_ID + " {",
            "position: fixed;",
            "left: 12px;",
            "right: 12px;",
            "bottom: 12px;",
            "z-index: 2147483647;",
            "display: grid;",
            "gap: 6px;",
            "max-height: min(42vh, 220px);",
            "overflow: auto;",
            "padding: 12px 14px;",
            "border: 1px solid rgba(220, 38, 38, 0.38);",
            "border-radius: 10px;",
            "background: rgba(255, 247, 247, 0.96);",
            "color: #7f1d1d;",
            "box-shadow: 0 18px 48px rgba(127, 29, 29, 0.16);",
            "font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
            "}",
            "#" + ERROR_BOX_ID + " strong { font-size: 12px; letter-spacing: 0; text-transform: none; }",
            "#" + ERROR_BOX_ID + " code { white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: inherit; }",
            "@media (prefers-color-scheme: dark) {",
            "#" + ERROR_BOX_ID + " { background: rgba(45, 18, 18, 0.96); color: #fecaca; border-color: rgba(248, 113, 113, 0.42); }",
            "}"
        ].join("\\n");
        (document.head || document.documentElement).appendChild(style);
    };

    const showRuntimeError = message => {
        const text = String(message || "Unknown preview error");
        const render = () => {
            if (!document.body) return false;
            ensureStyle();
            let box = document.getElementById(ERROR_BOX_ID);
            if (!box) {
                box = document.createElement("aside");
                box.id = ERROR_BOX_ID;
                box.setAttribute("role", "alert");
                box.innerHTML = "<strong>Preview script error</strong><code></code>";
                document.body.appendChild(box);
            }
            const code = box.querySelector("code");
            if (code) code.textContent = text;
            return true;
        };

        if (!render()) {
            document.addEventListener("DOMContentLoaded", render, { once: true });
        }
    };

    window.addEventListener("error", event => {
        if (event.target && event.target !== window) return;
        showRuntimeError(event.error ? formatReason(event.error) : event.message);
        event.preventDefault();
    });

    window.addEventListener("unhandledrejection", event => {
        showRuntimeError(formatReason(event.reason));
        event.preventDefault();
    });

    window.onerror = (message, source, lineno, colno, error) => {
        showRuntimeError(error ? formatReason(error) : message);
        return true;
    };
})();`;
function looksLikeHtml(code) {
    return /^\s*<(!DOCTYPE|html|head|body|div|section|main|article|button|form|canvas|svg|style|script|p|h[1-6]|ul|ol|table|nav|header|footer|input|label|select|textarea|iframe)/i.test(code);
}

function looksLikeCss(code) {
    return /^\s*([.#@\[a-z*][\w-]*\s*\{|@media|@keyframes|:root|body\s*\{|html\s*\{)/i.test(code);
}

function looksLikeJs(code) {
    return /^\s*(\/\/|\/\*|function\s|const\s|let\s|var\s|class\s|document\.|window\.|console\.|import\s|export\s|=>)/.test(code);
}

function getCodeBlockKind(lang, code) {
    const normalized = (lang || "").toLowerCase().trim();
    if (PREVIEW_HTML_LANGS.has(normalized)) return "html";
    if (PREVIEW_JS_LANGS.has(normalized)) return "js";
    if (PREVIEW_CSS_LANGS.has(normalized)) return "css";
    if (!normalized) {
        if (looksLikeHtml(code)) return "html";
        if (looksLikeCss(code)) return "css";
        if (looksLikeJs(code)) return "js";
    }
    return null;
}

function looksLikeTerminalCommand(code) {
    const trimmed = String(code || "").trim();
    if (!trimmed) return false;
    return /^(?:[$#>]\s*)?(?:bun|cargo|cat|cd|cmd|copy|curl|deno|dir|docker|dotnet|git|go|grep|ls|mkdir|node|npm|ollama|pnpm|powershell|pwsh|py|python|pytest|rg|ruff|tar|uv|wget|yarn)\b/im.test(trimmed)
        || /^\s*(?:Get|Set|New|Remove|Copy|Move|Start|Stop|Test|Select|Where)-[A-Za-z]+\b/m.test(trimmed)
        || /^\s*(?:\.\/|\.\\|[A-Za-z]:\\)[^\n]+/m.test(trimmed);
}

function isTerminalCommandBlock(lang, code) {
    const normalized = normalizeCodeLanguage(lang);
    return TERMINAL_COMMAND_LANGS.has(normalized) || (!normalized && looksLikeTerminalCommand(code));
}

function isMarkdownCodeBlock(lang) {
    const normalized = normalizeCodeLanguage(lang);
    return normalized === "md" || normalized === "markdown";
}

function injectCssAndJs(html, css, js) {
    let result = html;
    if (css.trim()) {
        const styleTag = `<style>\n${css}\n</style>`;
        if (/<\/head>/i.test(result)) {
            result = result.replace(/<\/head>/i, `${styleTag}\n</head>`);
        } else if (/<html[\s>]/i.test(result)) {
            result = result.replace(/<html([^>]*)>/i, `<html$1><head>${styleTag}</head>`);
        } else {
            result = styleTag + result;
        }
    }
    if (js.trim()) {
        const scriptTag = `<script>\n${js}\n<\/script>`;
        if (/<\/body>/i.test(result)) {
            result = result.replace(/<\/body>/i, `${scriptTag}\n</body>`);
        } else {
            result += scriptTag;
        }
    }
    return result;
}

function getPreviewBootstrapScript() {
    return `<script>\n${PREVIEW_STORAGE_SHIM}\n${PREVIEW_RUNTIME_ERROR_SHIM}\n<\/script>`;
}

function injectPreviewBootstrap(html) {
    const bootstrap = getPreviewBootstrapScript();
    if (/<head[^>]*>/i.test(html)) {
        return html.replace(/<head[^>]*>/i, match => `${match}\n${bootstrap}`);
    }
    if (/<html[^>]*>/i.test(html)) {
        return html.replace(/<html[^>]*>/i, match => `${match}\n<head>\n${bootstrap}\n</head>`);
    }
    return `${bootstrap}\n${html}`;
}

function wrapAsPreviewDocument(html, css = "", js = "") {
    const trimmed = html.trim();
    const isFullDoc = /^\s*<!DOCTYPE/i.test(trimmed) || /^\s*<html[\s>]/i.test(trimmed);

    if (isFullDoc) {
        return injectCssAndJs(injectPreviewBootstrap(trimmed), css, js);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${getPreviewBootstrapScript()}
<style>
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
${css}
</style>
</head>
<body>
${trimmed}
<script>${js}<\/script>
</body>
</html>`;
}

function buildCssPreviewDocument(css) {
    return wrapAsPreviewDocument(
        `<div class="preview-root">
            <p>Sample text</p>
            <button type="button">Button</button>
            <div class="box">Preview box</div>
            <input type="text" placeholder="Input field" />
        </div>`,
        css
    );
}

function buildCombinedPreviewDocument(blocks) {
    let html = "";
    let css = "";
    let js = "";

    blocks.forEach(({ kind, code }) => {
        if (kind === "html") html += (html ? "\n" : "") + code;
        else if (kind === "css") css += (css ? "\n" : "") + code;
        else if (kind === "js") js += (js ? "\n" : "") + code;
    });

    if (!html.trim()) {
        html = '<div id="app"></div>';
    }

    return wrapAsPreviewDocument(html, css, js);
}

function getPreviewDocumentForBlock(kind, code) {
    if (kind === "html") return wrapAsPreviewDocument(code);
    if (kind === "css") return buildCssPreviewDocument(code);
    if (kind === "js") return wrapAsPreviewDocument('<div id="app"></div>', "", code);
    return "";
}

function getPreviewTitleFromDocument(documentHtml, fallback = "Code Preview") {
    const titleMatch = String(documentHtml || "").match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch?.[1]?.trim() || fallback;
}

function getCodeDownloadExtension(lang, kind) {
    const normalized = normalizeCodeLanguage(lang || kind);
    return CODE_DOWNLOAD_EXTENSIONS[normalized] || CODE_DOWNLOAD_EXTENSIONS[kind] || "txt";
}

function getCodeDownloadName(lang, kind, prefix = "fauna-code") {
    return `${prefix}.${getCodeDownloadExtension(lang, kind)}`;
}

function renderHighlightedCodeLines(code, lang) {
    const normalized = normalizeCodeLanguage(lang);
    const lines = String(code ?? "").split("\n");
    return lines.map((line, index) => `
        <span class="code-line">
            <span class="code-line-number" aria-hidden="true">${index + 1}</span>
            <span class="code-line-text">${highlightCode(line, normalized)}</span>
        </span>
    `).join("");
}

function renderCodeElement(codeElement, code, lang) {
    if (!codeElement) return;
    const normalized = normalizeCodeLanguage(lang);
    codeElement.className = normalized ? `lang-${normalized}` : "";
    codeElement.innerHTML = renderHighlightedCodeLines(code, normalized);
}

function getRawCodeFromCodeElement(codeElement) {
    const renderedLines = Array.from(codeElement?.querySelectorAll(".code-line-text") || []);
    if (renderedLines.length) {
        return renderedLines.map(line => line.textContent || "").join("\n");
    }
    return codeElement?.textContent || "";
}

function getCodeWorkbenchPreviewBundle(blocks = []) {
    const previewBlocks = (Array.isArray(blocks) ? blocks : [])
        .map(block => ({
            ...block,
            kind: getCodeBlockKind(block.lang, block.code) || block.kind
        }))
        .filter(block => block.kind);
    const documentHtml = previewBlocks.length > 1
        ? buildCombinedPreviewDocument(previewBlocks)
        : previewBlocks.length === 1
            ? getPreviewDocumentForBlock(previewBlocks[0].kind, previewBlocks[0].code)
            : "";
    return { previewBlocks, documentHtml };
}

function getCodeWorkbenchDownloadPayload(blocks = [], documentHtml = "") {
    const safeBlocks = Array.isArray(blocks) ? blocks : [];
    const firstBlock = safeBlocks[0] || {};
    const firstKind = getCodeBlockKind(firstBlock.lang, firstBlock.code) || firstBlock.kind;
    const previewBlocks = getCodeWorkbenchPreviewBundle(safeBlocks).previewBlocks;

    if (previewBlocks.length > 1) {
        return {
            text: documentHtml,
            name: "fauna-preview.html",
            mime: "text/html;charset=utf-8"
        };
    }

    return {
        text: firstBlock.code || "",
        name: getCodeDownloadName(firstBlock.lang, firstKind),
        mime: firstKind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
    };
}

function syncCodeWorkbenchArtifacts(elements, { reloadPreview = false } = {}) {
    if (!activeCodeWorkbench) return;
    const blocks = activeCodeWorkbench.blocks || [];
    const { documentHtml } = getCodeWorkbenchPreviewBundle(blocks);
    const downloadPayload = getCodeWorkbenchDownloadPayload(blocks, documentHtml);

    activeCodeWorkbench.documentHtml = documentHtml;
    activeCodeWorkbench.copyText = getWorkbenchCopyText(blocks);
    activeCodeWorkbench.downloadText = downloadPayload.text;
    activeCodeWorkbench.downloadName = downloadPayload.name;
    activeCodeWorkbench.downloadMime = downloadPayload.mime;

    if (reloadPreview) {
        loadCodeWorkbenchPreview(elements, documentHtml);
    }
}

function scheduleCodeWorkbenchPreviewReload(elements) {
    if (codeWorkbenchEditTimer !== null) {
        window.clearTimeout(codeWorkbenchEditTimer);
        codeWorkbenchEditTimer = null;
    }

    codeWorkbenchEditTimer = window.setTimeout(() => {
        codeWorkbenchEditTimer = null;
        syncCodeWorkbenchArtifacts(elements, { reloadPreview: true });
    }, CODE_WORKBENCH_PREVIEW_DEBOUNCE_MS);
}

function syncCodeWorkbenchEditorScroll(textarea, highlightPre) {
    if (!textarea || !highlightPre) return;
    highlightPre.scrollTop = textarea.scrollTop;
    highlightPre.scrollLeft = textarea.scrollLeft;
}

function insertCodeWorkbenchEditorText(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = textarea.value || "";
    textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleCodeWorkbenchEditorKeydown(event, textarea) {
    if (event.key === "Tab") {
        event.preventDefault();
        insertCodeWorkbenchEditorText(textarea, "    ");
        return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        const hasSelection = (textarea.selectionEnd || 0) > (textarea.selectionStart || 0);
        if (!hasSelection) return;
        event.preventDefault();
        askAiAboutWorkbenchSelection();
    }
}

function handleCodeWorkbenchEditorInput(textarea, block, codeElement, highlightPre, elements) {
    block.code = textarea.value;
    block.kind = getCodeBlockKind(block.lang, block.code) || block.kind;
    renderCodeElement(codeElement, block.code, block.lang || block.kind);
    syncCodeWorkbenchEditorScroll(textarea, highlightPre);
    syncCodeWorkbenchArtifacts(elements);
    scheduleCodeWorkbenchPreviewReload(elements);
}

function createPromptCodeFence(text) {
    const longestFence = Math.max(2, ...Array.from(String(text || "").matchAll(/`{3,}/g), match => match[0].length));
    return "`".repeat(longestFence + 1);
}

function formatPromptCodeBlock(lang, code) {
    const fence = createPromptCodeFence(code);
    const normalized = normalizeCodeLanguage(lang);
    return `${fence}${normalized}\n${code}\n${fence}`;
}

function getLineNumberAtIndex(text, index) {
    return String(text || "").slice(0, Math.max(0, index)).split("\n").length;
}

function getSelectionContextForPrompt(code, start, end) {
    const text = String(code || "");
    const lines = text.split("\n");
    const startLine = getLineNumberAtIndex(text, start);
    const endLine = getLineNumberAtIndex(text, Math.max(start, end - 1));
    const contextStartLine = Math.max(1, startLine - CODE_WORKBENCH_SELECTION_CONTEXT_LINES);
    const contextEndLine = Math.min(lines.length, endLine + CODE_WORKBENCH_SELECTION_CONTEXT_LINES);
    let contextText = lines.slice(contextStartLine - 1, contextEndLine).join("\n");

    if (contextText.length > CODE_WORKBENCH_SELECTION_MAX_CONTEXT_CHARS) {
        contextText = contextText.slice(0, CODE_WORKBENCH_SELECTION_MAX_CONTEXT_CHARS).trimEnd()
            + "\n\n[Context truncated]";
    }

    return { startLine, endLine, contextStartLine, contextEndLine, contextText };
}

function getActiveWorkbenchSelection() {
    const elements = document.getElementById("codeWorkbenchOverlay")?._faunaElements;
    const editors = Array.from(elements?.code?.querySelectorAll(".code-workbench-editor-input") || []);
    const activeEditor = document.activeElement?.classList?.contains("code-workbench-editor-input")
        ? document.activeElement
        : null;
    const orderedEditors = activeEditor ? [activeEditor, ...editors.filter(editor => editor !== activeEditor)] : editors;

    for (const editor of orderedEditors) {
        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || 0;
        if (end <= start) continue;
        const block = activeCodeWorkbench?.blocks?.[Number(editor.dataset.blockIndex)] || null;
        return {
            editor,
            block,
            start,
            end,
            code: editor.value,
            text: editor.value.slice(start, end)
        };
    }

    return null;
}

function buildWorkbenchSelectionQuestionPrompt(selection) {
    const block = selection?.block || {};
    const lang = normalizeCodeLanguage(block.lang || block.kind);
    const label = getCodeLanguageLabel(block.lang, block.kind) || "Code";
    const context = getSelectionContextForPrompt(selection.code, selection.start, selection.end);
    const lineLabel = context.startLine === context.endLine
        ? `line ${context.startLine}`
        : `lines ${context.startLine}-${context.endLine}`;
    const contextLabel = context.contextStartLine === context.contextEndLine
        ? `line ${context.contextStartLine}`
        : `lines ${context.contextStartLine}-${context.contextEndLine}`;

    return [
        "Explain this selected code and give practical guidance. If there is a bug, risk, or cleaner edit, call it out.",
        "",
        `Language: ${label}`,
        `Selection: ${lineLabel}`,
        "",
        "Selected code:",
        formatPromptCodeBlock(lang, selection.text),
        "",
        `Nearby context (${contextLabel}):`,
        formatPromptCodeBlock(lang, context.contextText)
    ].join("\n");
}

function askAiAboutWorkbenchSelection() {
    if (isGenerating) {
        showToast("Wait for the current response to finish first.", "warning");
        return;
    }

    const selection = getActiveWorkbenchSelection();
    if (!selection?.text?.trim()) {
        showToast("Select code in the editor first.", "warning");
        return;
    }
    if (!input) return;

    input.value = buildWorkbenchSelectionQuestionPrompt(selection);
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();

    if (window.matchMedia?.("(max-width: 1179px)")?.matches) {
        closeCodeWorkbench();
    }

    showToast("Asking AI about the selection.", "info");
    processWorkspaceEntry({ skipWorkspaceContext: true });
}

function downloadTextFile(text, filename, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCodeActionIcon(name) {
    const icons = {
        preview: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`,
        file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>`,
        copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>`,
        console: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path></svg>`,
        terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 5 5-5 5"></path><path d="M12 19h8"></path></svg>`,
        wrap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"></path><path d="M4 12h13a3 3 0 1 1 0 6h-5"></path><path d="m14 16-2 2 2 2"></path><path d="M4 18h5"></path></svg>`,
        add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>`,
        ask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"></path><path d="M9.5 9a2.5 2.5 0 0 1 4.33-1.7c.92.96.9 2.46-.05 3.38-.53.51-1.28.86-1.28 1.82"></path><path d="M12.5 16h.01"></path></svg>`,
        markdown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"></path><path d="M4 12h10"></path><path d="M4 19h7"></path><path d="m15 16 3 3 3-3"></path><path d="M18 10v9"></path></svg>`,
        desktop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path></svg>`,
        tablet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.6"></rect><path d="M12 18h.01"></path></svg>`,
        phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.4"></rect><path d="M11 18h2"></path></svg>`,
        refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4"></path><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path></svg>`,
        more: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="19" cy="12" r="1.7"></circle></svg>`,
        close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`
    };
    return icons[name] || icons.preview;
}

function getWorkbenchCopyText(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) return "";
    if (blocks.length === 1) return blocks[0].code || "";
    return blocks
        .map(block => `/* ${getCodeLanguageLabel(block.lang, block.kind)} */\n${block.code || ""}`)
        .join("\n\n");
}

function getCodeLineCount(code) {
    const text = String(code ?? "");
    if (!text) return 0;
    return text.split("\n").length;
}

function formatCodeFileSize(code) {
    const bytes = new Blob([String(code ?? "")]).size;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function getDefaultCodeFileName(lang, kind) {
    const normalized = normalizeCodeLanguage(lang || kind);
    if (kind === "html" || PREVIEW_HTML_LANGS.has(normalized)) return "index.html";
    if (kind === "css" || PREVIEW_CSS_LANGS.has(normalized)) return "styles.css";
    if (kind === "js" || PREVIEW_JS_LANGS.has(normalized)) return "script.js";
    return getCodeDownloadName(lang, kind, "file");
}

function getCodeFileCardName(wrapper, lang, kind) {
    const explicit = String(wrapper?.dataset?.codeFileName || "").trim();
    return explicit || getDefaultCodeFileName(lang, kind);
}

function shouldRenderCodeFileCard(wrapper, code) {
    if (wrapper?.dataset?.codeCardRequested === "true") return true;
    const text = String(code ?? "");
    return text.length >= LARGE_CODE_FILE_CARD_MIN_CHARS || getCodeLineCount(text) >= LARGE_CODE_FILE_CARD_MIN_LINES;
}

function getCodeFileCardMeta(lang, kind, code) {
    const label = getCodeLanguageLabel(lang, kind) || "Code";
    const lineCount = getCodeLineCount(code);
    const lineLabel = `${lineCount.toLocaleString()} ${lineCount === 1 ? "line" : "lines"}`;
    return `${label} · ${lineLabel} · ${formatCodeFileSize(code)}`;
}

function renderWorkbenchCode(codeHost, blocks) {
    if (!codeHost) return;
    codeHost.innerHTML = "";
    codeHost.classList.toggle("has-multiple-editors", blocks.length > 1);
    blocks.forEach((block, index) => {
        const section = document.createElement("section");
        section.className = "code-workbench-code-section";
        block.kind = getCodeBlockKind(block.lang, block.code) || block.kind;
        const lang = normalizeCodeLanguage(block.lang || block.kind);
        const labelText = getCodeLanguageLabel(block.lang, block.kind) || "Code";

        if (blocks.length > 1) {
            const label = document.createElement("div");
            label.className = "code-workbench-code-label";
            label.textContent = labelText;
            section.appendChild(label);
        }

        const editor = document.createElement("div");
        editor.className = "code-workbench-editor";
        editor.dataset.lang = lang;

        const pre = document.createElement("pre");
        pre.className = "code-workbench-editor-highlight";
        pre.setAttribute("aria-hidden", "true");

        const codeElement = document.createElement("code");
        renderCodeElement(codeElement, block.code || "", lang);
        pre.appendChild(codeElement);

        const textarea = document.createElement("textarea");
        textarea.className = "code-workbench-editor-input";
        textarea.value = block.code || "";
        textarea.dataset.blockIndex = String(index);
        textarea.setAttribute("aria-label", `${labelText} editor`);
        textarea.setAttribute("autocomplete", "off");
        textarea.setAttribute("autocapitalize", "off");
        textarea.setAttribute("spellcheck", "false");
        textarea.wrap = "off";

        textarea.addEventListener("scroll", () => syncCodeWorkbenchEditorScroll(textarea, pre));
        textarea.addEventListener("keydown", event => handleCodeWorkbenchEditorKeydown(event, textarea));
        textarea.addEventListener("input", () => handleCodeWorkbenchEditorInput(textarea, block, codeElement, pre, codeHost._faunaElements || ensureCodeWorkbench()));

        editor.append(pre, textarea);
        section.appendChild(editor);
        codeHost.appendChild(section);

        if (index < blocks.length - 1) {
            const divider = document.createElement("div");
            divider.className = "code-workbench-code-divider";
            codeHost.appendChild(divider);
        }
    });
}

function clearCodeWorkbenchEditTimer() {
    if (codeWorkbenchEditTimer !== null) {
        window.clearTimeout(codeWorkbenchEditTimer);
        codeWorkbenchEditTimer = null;
    }
}

function clearCodeWorkbenchLoadTimer() {
    if (codeWorkbenchLoadTimer !== null) {
        window.clearTimeout(codeWorkbenchLoadTimer);
        codeWorkbenchLoadTimer = null;
    }
}

function setCodeWorkbenchProgressState(elements, state = "idle") {
    const workbench = elements?.workbench;
    const progress = elements?.progress;
    if (!workbench || !progress) return;

    workbench.dataset.previewState = state;
    progress.setAttribute("aria-valuetext", state === "loading" ? "Loading preview" : state === "loaded" ? "Preview loaded" : "Preview idle");
    if (state === "loaded") {
        progress.setAttribute("aria-valuenow", "100");
    } else {
        progress.removeAttribute("aria-valuenow");
    }
}

function beginCodeWorkbenchLoading(elements) {
    clearCodeWorkbenchLoadTimer();
    codeWorkbenchLoadToken += 1;
    const token = codeWorkbenchLoadToken;
    setCodeWorkbenchProgressState(elements, "loading");
    codeWorkbenchLoadTimer = window.setTimeout(() => {
        finishCodeWorkbenchLoading(elements, token);
    }, 2400);
    return token;
}

function finishCodeWorkbenchLoading(elements, token = codeWorkbenchLoadToken) {
    if (token !== codeWorkbenchLoadToken) return;
    clearCodeWorkbenchLoadTimer();
    setCodeWorkbenchProgressState(elements, "loaded");
    codeWorkbenchLoadTimer = window.setTimeout(() => {
        if (token === codeWorkbenchLoadToken) {
            setCodeWorkbenchProgressState(elements, "idle");
        }
        codeWorkbenchLoadTimer = null;
    }, 900);
}

function bindCodeWorkbenchPreviewLoad(elements) {
    elements.iframe?.addEventListener("load", () => {
        if (!activeCodeWorkbench || elements.iframe?.srcdoc !== activeCodeWorkbench.documentHtml) return;
        finishCodeWorkbenchLoading(elements);
    });
}

function resetCodeWorkbenchPreviewFrame(elements) {
    const currentFrame = elements?.iframe;
    if (!currentFrame?.parentElement) return currentFrame || null;

    const iframe = document.createElement("iframe");
    iframe.className = currentFrame.className;
    iframe.setAttribute("sandbox", PREVIEW_IFRAME_SANDBOX);
    iframe.setAttribute("aria-label", currentFrame.getAttribute("aria-label") || "Code preview");
    currentFrame.replaceWith(iframe);
    elements.iframe = iframe;
    bindCodeWorkbenchPreviewLoad(elements);
    return iframe;
}

function loadCodeWorkbenchPreview(elements, documentHtml = "") {
    if (!elements?.iframe) return;
    const token = beginCodeWorkbenchLoading(elements);
    const iframe = resetCodeWorkbenchPreviewFrame(elements);

    if (!String(documentHtml || "").trim()) {
        finishCodeWorkbenchLoading(elements, token);
        return;
    }

    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (token !== codeWorkbenchLoadToken || !activeCodeWorkbench) return;
        if (iframe) iframe.srcdoc = documentHtml;
    }));
}

function getCodeWorkbenchOverflowLabel(button) {
    return button?.dataset?.overflowLabel
        || button?.getAttribute("aria-label")
        || button?.dataset?.tooltip
        || "Action";
}

function prepareCodeWorkbenchOverflowButton(button) {
    if (!button) return;
    button.dataset.overflowLabel = getCodeWorkbenchOverflowLabel(button);
    if (!button.querySelector(".code-workbench-overflow-item-label")) {
        const label = document.createElement("span");
        label.className = "code-workbench-overflow-item-label";
        label.textContent = button.dataset.overflowLabel;
        button.appendChild(label);
    }
}

function setCodeWorkbenchOverflowMenuOpen(elements, open) {
    if (!elements?.overflowBtn || !elements?.overflowMenu) return false;
    const shouldOpen = Boolean(open) && !elements.overflowBtn.hidden;
    elements.actions?.classList.toggle("overflow-open", shouldOpen);
    elements.overflowBtn.classList.toggle("active", shouldOpen);
    elements.overflowBtn.setAttribute("aria-expanded", String(shouldOpen));
    elements.overflowMenu.hidden = !shouldOpen;
    return shouldOpen;
}

function closeCodeWorkbenchOverflowMenu(elements) {
    if (!elements?.actions?.classList.contains("overflow-open")) return false;
    setCodeWorkbenchOverflowMenuOpen(elements, false);
    return true;
}

function applyCodeWorkbenchOverflowCount(elements, overflowCount = 0) {
    const buttons = elements?.overflowableActionBtns || [];
    const actions = elements?.actions;
    const menu = elements?.overflowMenu;
    const overflowBtn = elements?.overflowBtn;
    if (!actions || !menu || !overflowBtn) return;

    const safeCount = Math.max(0, Math.min(buttons.length, overflowCount));
    const visibleCount = buttons.length - safeCount;

    buttons.forEach((button, index) => {
        if (!button) return;
        const isOverflowed = index >= visibleCount;
        button.classList.toggle("code-workbench-overflow-item", isOverflowed);
        if (isOverflowed) {
            button.setAttribute("role", "menuitem");
            menu.appendChild(button);
        } else {
            button.removeAttribute("role");
            actions.insertBefore(button, overflowBtn);
        }
    });

    overflowBtn.hidden = safeCount === 0;
    actions.dataset.overflowCount = String(safeCount);
    if (safeCount === 0) {
        setCodeWorkbenchOverflowMenuOpen(elements, false);
    }
}

function codeWorkbenchToolbarOverflows(elements) {
    const toolbar = elements?.toolbar;
    const actions = elements?.actions;
    if (!toolbar || !actions) return false;

    const toolbarRect = toolbar.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const rightLimit = Math.min(toolbarRect.right, window.innerWidth);
    const leftLimit = Math.max(toolbarRect.left, 0);
    const visibleButtons = Array.from(actions.children)
        .filter(node => node.matches?.(".code-workbench-icon-btn:not([hidden])"));
    const buttonsOverflow = visibleButtons.some(button => {
        const rect = button.getBoundingClientRect();
        return rect.right > rightLimit + 1 || rect.left < leftLimit - 1;
    });

    return actionsRect.right > rightLimit + 1
        || actionsRect.left < leftLimit - 1
        || buttonsOverflow;
}

function updateCodeWorkbenchActionOverflow(elements) {
    if (!elements?.actions || !elements?.overflowBtn || !elements?.overflowMenu) return;
    if (elements.overlay?.hidden) {
        applyCodeWorkbenchOverflowCount(elements, 0);
        return;
    }

    const buttons = elements.overflowableActionBtns || [];
    const wasOpen = elements.actions.classList.contains("overflow-open");
    if (wasOpen) setCodeWorkbenchOverflowMenuOpen(elements, false);
    let overflowCount = 0;

    for (; overflowCount <= buttons.length; overflowCount += 1) {
        applyCodeWorkbenchOverflowCount(elements, overflowCount);
        if (!codeWorkbenchToolbarOverflows(elements)) break;
    }

    if (wasOpen && !elements.overflowBtn.hidden) {
        setCodeWorkbenchOverflowMenuOpen(elements, true);
    }
}

function scheduleCodeWorkbenchActionOverflowUpdate(elements) {
    if (!elements) return;
    if (elements.overflowRaf) {
        window.cancelAnimationFrame(elements.overflowRaf);
    }
    elements.overflowRaf = window.requestAnimationFrame(() => {
        elements.overflowRaf = 0;
        updateCodeWorkbenchActionOverflow(elements);
    });
}

function bindCodeWorkbenchActionOverflow(elements) {
    if (!elements?.actions || !elements?.overflowBtn || !elements?.overflowMenu) return;

    elements.overflowableActionBtns?.forEach(prepareCodeWorkbenchOverflowButton);
    elements.overflowBtn.addEventListener("click", event => {
        event.stopPropagation();
        setCodeWorkbenchOverflowMenuOpen(elements, !elements.actions.classList.contains("overflow-open"));
    });
    elements.overflowMenu.addEventListener("click", event => {
        if (event.target.closest("[data-workbench-action]")) {
            window.setTimeout(() => setCodeWorkbenchOverflowMenuOpen(elements, false), 0);
        }
    });

    if ("ResizeObserver" in window) {
        elements.overflowObserver = new ResizeObserver(() => scheduleCodeWorkbenchActionOverflowUpdate(elements));
        [elements.workbench, elements.toolbar, elements.actions, elements.title].forEach(node => {
            if (node) elements.overflowObserver.observe(node);
        });
    }

    window.addEventListener("resize", () => scheduleCodeWorkbenchActionOverflowUpdate(elements));
}

function ensureCodeWorkbench() {
    let overlay = document.getElementById("codeWorkbenchOverlay");
    if (overlay?._faunaElements) return overlay._faunaElements;

    overlay = document.createElement("div");
    overlay.id = "codeWorkbenchOverlay";
    overlay.className = "code-workbench-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="code-workbench" role="region" aria-labelledby="codeWorkbenchTitle" data-preview-state="idle">
            <header class="code-workbench-toolbar">
                <div class="code-workbench-title-group">
                    <div id="codeWorkbenchTitle" class="code-workbench-title">Code Preview</div>
                    <div class="code-workbench-subtitle">Sandboxed preview</div>
                </div>
                <div class="code-workbench-tabs" role="tablist" aria-label="Code preview mode">
                    <button type="button" class="code-workbench-tab" data-workbench-mode="code" role="tab" aria-selected="false">Code</button>
                    <button type="button" class="code-workbench-tab" data-workbench-mode="preview" role="tab" aria-selected="true">Preview</button>
                </div>
                <div class="code-workbench-viewport" role="group" aria-label="Preview viewport">
                    <button type="button" class="code-workbench-viewport-btn active" data-workbench-viewport="desktop" data-tooltip="Desktop preview" aria-label="Desktop preview" aria-pressed="true">${getCodeActionIcon("desktop")}</button>
                    <button type="button" class="code-workbench-viewport-btn" data-workbench-viewport="tablet" data-tooltip="Tablet preview" aria-label="Tablet preview" aria-pressed="false">${getCodeActionIcon("tablet")}</button>
                    <button type="button" class="code-workbench-viewport-btn" data-workbench-viewport="phone" data-tooltip="Phone preview" aria-label="Phone preview" aria-pressed="false">${getCodeActionIcon("phone")}</button>
                </div>
                <div class="code-workbench-actions">
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="ask-selection" data-tooltip="Ask AI about selected code" data-overflow-label="Ask AI" aria-label="Ask AI about selected code">${getCodeActionIcon("ask")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="copy" data-tooltip="Copy code" data-overflow-label="Copy" aria-label="Copy code">${getCodeActionIcon("copy")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="download" data-tooltip="Download code" data-overflow-label="Download" aria-label="Download code">${getCodeActionIcon("download")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="refresh" data-tooltip="Refresh preview" data-overflow-label="Refresh" aria-label="Refresh preview">${getCodeActionIcon("refresh")}</button>
                    <button type="button" class="code-workbench-icon-btn code-workbench-overflow-btn" data-workbench-action="overflow" data-tooltip="More actions" aria-label="More actions" aria-haspopup="menu" aria-expanded="false" hidden>${getCodeActionIcon("more")}</button>
                    <button type="button" class="code-workbench-icon-btn" data-workbench-action="close" data-tooltip="Close" aria-label="Close preview">${getCodeActionIcon("close")}</button>
                    <div class="code-workbench-overflow-menu" role="menu" hidden></div>
                </div>
            </header>
            <div class="code-workbench-accent" role="progressbar" aria-label="Preview loading progress" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Preview idle"></div>
            <div class="code-workbench-body" data-mode="preview">
                <div class="code-workbench-code" role="tabpanel"></div>
                <div class="code-workbench-preview-shell" data-viewport="desktop">
                    <div class="code-workbench-preview-stage">
                        <iframe class="code-workbench-preview" sandbox="${PREVIEW_IFRAME_SANDBOX}" aria-label="Code preview"></iframe>
                    </div>
                </div>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);

    const elements = {
        overlay,
        workbench: overlay.querySelector(".code-workbench"),
        title: overlay.querySelector(".code-workbench-title"),
        subtitle: overlay.querySelector(".code-workbench-subtitle"),
        progress: overlay.querySelector(".code-workbench-accent"),
        body: overlay.querySelector(".code-workbench-body"),
        code: overlay.querySelector(".code-workbench-code"),
        toolbar: overlay.querySelector(".code-workbench-toolbar"),
        previewShell: overlay.querySelector(".code-workbench-preview-shell"),
        iframe: overlay.querySelector(".code-workbench-preview"),
        actions: overlay.querySelector(".code-workbench-actions"),
        tabs: Array.from(overlay.querySelectorAll("[data-workbench-mode]")),
        viewportBtns: Array.from(overlay.querySelectorAll("[data-workbench-viewport]")),
        askSelectionBtn: overlay.querySelector("[data-workbench-action='ask-selection']"),
        copyBtn: overlay.querySelector("[data-workbench-action='copy']"),
        downloadBtn: overlay.querySelector("[data-workbench-action='download']"),
        refreshBtn: overlay.querySelector("[data-workbench-action='refresh']"),
        overflowBtn: overlay.querySelector("[data-workbench-action='overflow']"),
        overflowMenu: overlay.querySelector(".code-workbench-overflow-menu"),
        closeBtn: overlay.querySelector("[data-workbench-action='close']")
    };
    elements.overflowableActionBtns = [
        elements.askSelectionBtn,
        elements.copyBtn,
        elements.downloadBtn,
        elements.refreshBtn
    ].filter(Boolean);
    if (elements.code) elements.code._faunaElements = elements;

    elements.tabs.forEach(tab => {
        tab.addEventListener("click", () => setCodeWorkbenchMode(tab.dataset.workbenchMode));
    });
    elements.viewportBtns.forEach(button => {
        button.addEventListener("click", () => setCodeWorkbenchViewport(button.dataset.workbenchViewport));
    });
    elements.askSelectionBtn?.addEventListener("mousedown", event => event.preventDefault());
    elements.askSelectionBtn?.addEventListener("click", askAiAboutWorkbenchSelection);
    elements.copyBtn?.addEventListener("click", () => {
        if (!activeCodeWorkbench) return;
        handleCopyButton(elements.copyBtn, activeCodeWorkbench.copyText);
    });
    elements.downloadBtn?.addEventListener("click", () => {
        if (!activeCodeWorkbench) return;
        downloadTextFile(activeCodeWorkbench.downloadText, activeCodeWorkbench.downloadName, activeCodeWorkbench.downloadMime);
        showToast("Download started.", "success");
    });
    elements.refreshBtn?.addEventListener("click", () => {
        if (!activeCodeWorkbench || !elements.iframe) return;
        syncCodeWorkbenchArtifacts(elements);
        loadCodeWorkbenchPreview(elements, activeCodeWorkbench.documentHtml);
    });
    bindCodeWorkbenchActionOverflow(elements);
    bindCodeWorkbenchPreviewLoad(elements);
    elements.closeBtn?.addEventListener("click", closeCodeWorkbench);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeCodeWorkbench();
    });
    document.addEventListener("click", event => {
        if (overlay.hidden || elements.actions?.contains(event.target)) return;
        closeCodeWorkbenchOverflowMenu(elements);
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || overlay.hidden) return;
        if (closeCodeWorkbenchOverflowMenu(elements)) {
            event.preventDefault();
            return;
        }
        closeCodeWorkbench();
    });

    overlay._faunaElements = elements;
    return elements;
}

function setCodeWorkbenchMode(mode = "preview") {
    const elements = ensureCodeWorkbench();
    const nextMode = mode === "code" ? "code" : "preview";
    elements.body.dataset.mode = nextMode;
    elements.tabs.forEach(tab => {
        const isActive = tab.dataset.workbenchMode === nextMode;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });
    activeCodeWorkbench = activeCodeWorkbench ? { ...activeCodeWorkbench, mode: nextMode } : null;
    if (nextMode === "code") {
        window.setTimeout(() => {
            elements.code?.querySelector(".code-workbench-editor-input")?.focus({ preventScroll: true });
        }, 0);
    }
}

function setCodeWorkbenchViewport(viewport = "desktop") {
    const elements = ensureCodeWorkbench();
    const allowed = new Set(["desktop", "tablet", "phone"]);
    const nextViewport = allowed.has(viewport) ? viewport : "desktop";
    if (elements.previewShell) elements.previewShell.dataset.viewport = nextViewport;
    elements.viewportBtns.forEach(button => {
        const isActive = button.dataset.workbenchViewport === nextViewport;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
    activeCodeWorkbench = activeCodeWorkbench ? { ...activeCodeWorkbench, viewport: nextViewport } : null;
}

function openCodeWorkbench({
    title = "Code Preview",
    subtitle = "Sandboxed preview",
    blocks = [],
    documentHtml = "",
    initialMode = "preview",
    initialViewport = "desktop",
    copyText = "",
    downloadText = "",
    downloadName = "fauna-code.txt",
    downloadMime = "text/plain;charset=utf-8"
} = {}) {
    const elements = ensureCodeWorkbench();
    clearCodeWorkbenchEditTimer();
    const safeBlocks = blocks.filter(block => block?.code != null);
    activeCodeWorkbench = {
        blocks: safeBlocks,
        documentHtml,
        copyText: copyText || getWorkbenchCopyText(safeBlocks),
        downloadText: downloadText || copyText || getWorkbenchCopyText(safeBlocks),
        downloadName,
        downloadMime,
        mode: initialMode,
        viewport: initialViewport
    };

    if (elements.title) elements.title.textContent = title;
    if (elements.subtitle) elements.subtitle.textContent = subtitle;
    renderWorkbenchCode(elements.code, safeBlocks);
    if (elements.iframe) elements.iframe.srcdoc = "";

    elements.overlay.hidden = false;
    elements.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("code-workbench-open");
    setCodeWorkbenchMode(initialMode);
    setCodeWorkbenchViewport(initialViewport);
    scheduleCodeWorkbenchActionOverflowUpdate(elements);
    window.requestAnimationFrame(() => loadCodeWorkbenchPreview(elements, documentHtml));
    const focusTarget = initialMode === "code"
        ? elements.code?.querySelector(".code-workbench-editor-input")
        : elements.overlay.querySelector(".code-workbench-tab.active");
    focusTarget?.focus({ preventScroll: true });
}

function closeCodeWorkbench() {
    codeWorkbenchLoadToken += 1;
    clearCodeWorkbenchLoadTimer();
    clearCodeWorkbenchEditTimer();
    const overlay = document.getElementById("codeWorkbenchOverlay");
    const elements = overlay?._faunaElements || null;
    if (!elements) {
        document.body.classList.remove("code-workbench-open");
        activeCodeWorkbench = null;
        return;
    }
    setCodeWorkbenchProgressState(elements, "idle");
    closeCodeWorkbenchOverflowMenu(elements);
    elements.overlay.hidden = true;
    elements.overlay.setAttribute("aria-hidden", "true");
    if (elements.iframe) elements.iframe.srcdoc = "";
    document.body.classList.remove("code-workbench-open");
    activeCodeWorkbench = null;
}

function createConsolePanel() {
    const panel = document.createElement("div");
    panel.className = "console-output-box";
    return panel;
}

function createTerminalPanel() {
    const panel = document.createElement("div");
    panel.className = "terminal-output-box";
    return panel;
}

function buildTerminalChatContext(command, outputText) {
    return [
        "Terminal command output",
        "",
        `Command: ${command}`,
        "",
        "Output:",
        outputText
    ].join("\n");
}

function buildTerminalQuestionPrompt(command, outputText) {
    return [
        "Analyze this completed process result and suggest next steps.",
        "",
        `Process: ${command}`,
        "",
        "Result:",
        outputText
    ].join("\n");
}

function addTerminalOutputToChat(command, outputText, button = null) {
    const contextText = buildTerminalChatContext(command, outputText);
    const userMessageCreatedAt = new Date().toISOString();
    showChatSurface();
    const userBubble = addRenderNode(`Terminal output: ${command}`, "user", [], {
        createdAt: userMessageCreatedAt
    });
    addRenderNode(outputText, "output", [], {
        createdAt: new Date().toISOString()
    });
    conversationHistory.push({
        role: "user",
        content: contextText,
        createdAt: userMessageCreatedAt
    });
    const userMessageNode = userBubble?.closest?.(".message-node.user-node");
    if (userMessageNode) {
        userMessageNode.dataset.historyIndex = String(conversationHistory.length - 1);
    }
    saveCurrentSession();

    if (button) {
        button.disabled = true;
        setActionButtonState(button, true, "Added", "Add to chat");
        button.dataset.tooltip = "Added to chat";
        button.setAttribute("aria-label", "Added to chat");
    }

    showToast("Terminal output added to chat.", "success");
}

function askAiAboutTerminalOutput(command, outputText) {
    if (isGenerating) {
        showToast("Wait for the current response to finish first.", "warning");
        return;
    }
    if (!input) return;

    input.value = buildTerminalQuestionPrompt(command, outputText);
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    processWorkspaceEntry({ skipWorkspaceContext: true });
}

function renderTerminalPanel(panel, text, state = "info", options = {}) {
    if (!panel) return;
    panel.classList.toggle("terminal-output-error", state === "error");
    panel.classList.toggle("terminal-output-running", state === "running");
    panel.innerHTML = "";

    const pre = document.createElement("pre");
    pre.textContent = text;
    panel.appendChild(pre);

    if (options.canShare && options.command && text.trim()) {
        const actions = document.createElement("div");
        actions.className = "terminal-output-actions";

        const addBtn = createActionButton("Add to chat", "add", { compact: true });
        const askBtn = createActionButton("Ask AI", "ask", { compact: true });

        addBtn.onclick = () => addTerminalOutputToChat(options.command, text, addBtn);
        askBtn.onclick = () => askAiAboutTerminalOutput(options.command, text);

        actions.append(addBtn, askBtn);
        panel.appendChild(actions);
    }

    panel.style.display = "block";
}

function setRunButtonState(btn, active, label = "Run", ariaLabel = label) {
    setActionButtonState(btn, active, label, "Run");
    btn.dataset.tooltip = active ? ariaLabel : "Run in terminal";
    btn.setAttribute("aria-label", active ? ariaLabel : "Run in terminal");
}

async function runTerminalCodeBlock(command, terminalPanel, runBtn) {
    if (!hasWorkspaceBridgeAccess()) {
        showToast("Enable Local Workspace Bridge to run terminal commands.", "warning");
        return;
    }

    runBtn.disabled = true;
    setRunButtonState(runBtn, true, "Running", "Running terminal command");
    renderTerminalPanel(terminalPanel, `Running:\n${command}`, "running");
    scrollChatToBottom();

    try {
        const result = await runWorkspaceCommand(command, ".", 60);
        const resultText = formatWorkspaceCommandResult(result);
        renderTerminalPanel(terminalPanel, resultText, result.exitCode === 0 ? "info" : "error", {
            command,
            canShare: true
        });
        showToast(result.exitCode === 0 ? "Terminal command finished." : "Terminal command exited with errors.", result.exitCode === 0 ? "success" : "warning");
    } catch (err) {
        renderTerminalPanel(terminalPanel, `Command failed:\n${err.message}`, "error", {
            command,
            canShare: true
        });
        showToast(`Terminal command failed: ${err.message}`, "error");
    } finally {
        runBtn.disabled = false;
        setRunButtonState(runBtn, true, "Hide", "Hide terminal");
        saveCurrentSession({ render: false });
        scrollChatToBottom({ force: true });
    }
}

function setActionButtonState(btn, active, activeLabel, idleLabel) {
    btn.classList.toggle("active", active);
    const label = btn.querySelector(".code-action-label");
    if (label) label.textContent = active ? activeLabel : idleLabel;
    btn.dataset.tooltip = active ? activeLabel : idleLabel;
    btn.setAttribute("aria-label", active ? activeLabel : idleLabel);
}

function createActionButton(label, icon = "preview", { compact = false } = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = compact ? "code-action-btn compact" : "code-action-btn";
    btn.setAttribute("aria-label", label);
    btn.dataset.tooltip = label;
    btn.innerHTML = `
        ${getCodeActionIcon(icon)}
        <span class="code-action-label">${label}</span>
    `;
    return btn;
}

function collectCodeBlocks(container) {
    return Array.from(container.querySelectorAll("pre code")).map(codeElement => {
        let lang = "";
        codeElement.classList.forEach(className => {
            if (className.startsWith("lang-")) {
                lang = className.replace("lang-", "");
            }
        });
        const code = getRawCodeFromCodeElement(codeElement);
        const kind = getCodeBlockKind(lang, code);
        return { pre: codeElement.closest("pre"), lang, code, kind };
    }).filter(block => block.pre);
}

function openCodeBlocksInWorkbench(blocks, {
    title = "",
    subtitle = "",
    initialMode = "preview",
    downloadText = "",
    downloadName = "",
    downloadMime = ""
} = {}) {
    const safeBlocks = (Array.isArray(blocks) ? blocks : []).filter(block => block?.code != null);
    if (safeBlocks.length === 0) return;

    const previewBlocks = safeBlocks.filter(block => block.kind);
    const documentHtml = previewBlocks.length > 1
        ? buildCombinedPreviewDocument(previewBlocks)
        : previewBlocks.length === 1
            ? getPreviewDocumentForBlock(previewBlocks[0].kind, previewBlocks[0].code)
            : "";
    const firstBlock = safeBlocks[0];
    const firstLabel = getCodeLanguageLabel(firstBlock.lang, firstBlock.kind);
    const canPreview = Boolean(documentHtml);

    openCodeWorkbench({
        title: title || getPreviewTitleFromDocument(documentHtml, `${firstLabel || "Code"} Preview`),
        subtitle: subtitle || (safeBlocks.length > 1 ? `${safeBlocks.length} linked code blocks` : `${firstLabel || "Code"} sandbox`),
        blocks: safeBlocks,
        documentHtml,
        initialMode: canPreview ? initialMode : "code",
        downloadText: downloadText || (previewBlocks.length > 1 ? documentHtml : firstBlock.code),
        downloadName: downloadName || (previewBlocks.length > 1 ? "fauna-preview.html" : getCodeDownloadName(firstBlock.lang, firstBlock.kind)),
        downloadMime: downloadMime || (previewBlocks.length > 1 || firstBlock.kind === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8")
    });
}

