const includeSelector = "[data-include]";
const MIN_BOOT_MS = 520;
const APP_ICON_SRC = "favicon.png?v=20260705-brand-icon";
const APP_ICON_MARKUP = `<img class="fauna-mark app-brand-icon" src="${APP_ICON_SRC}" alt="" decoding="async" draggable="false">`;

function createBootLoader() {
    document.body?.classList.add("app-loading");
    if (document.getElementById("appBootLoader")) return;

    const loader = document.createElement("div");
    loader.id = "appBootLoader";
    loader.className = "app-boot-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.setAttribute("aria-label", "Starting Fauna");
    loader.innerHTML = `
        <div class="app-boot-loader-mark" aria-hidden="true">
            ${APP_ICON_MARKUP}
        </div>
    `;
    document.body.appendChild(loader);
}

function finishBootLoader() {
    const loader = document.getElementById("appBootLoader");
    document.body?.classList.remove("app-loading");
    document.body?.classList.add("app-ready");
    if (!loader) return;

    loader.classList.add("leaving");
    window.setTimeout(() => loader.remove(), 260);
}

async function loadInclude(element) {
    const source = element.dataset.include;
    if (!source) return;

    const response = await fetch(source, { credentials: "same-origin", cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`Could not load ${source}: ${response.status}`);
    }

    element.outerHTML = await response.text();
}

async function loadIncludes() {
    let includes = Array.from(document.querySelectorAll(includeSelector));

    while (includes.length > 0) {
        await Promise.all(includes.map(loadInclude));
        includes = Array.from(document.querySelectorAll(includeSelector));
    }
}

async function writeStartupTextToClipboard(value = "") {
    const text = String(value ?? "");
    const desktopClipboard = window.faunaDesktop?.clipboard?.writeText;
    if (typeof desktopClipboard === "function") {
        const result = await desktopClipboard(text);
        if (result?.ok === false) throw new Error(result.message || "Desktop clipboard failed.");
        return;
    }
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(temp);
    if (!ok) throw new Error("Legacy copy command failed.");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getStartupErrorInfo(error) {
    const message = error?.message || String(error || "Unknown startup error");
    const detail = error?.stack || message;

    if (/before initialization|Cannot access .* before initialization/i.test(message)) {
        return {
            title: "Fauna hit a startup snag",
            message: "One app setting loaded before the rest of Fauna was ready. Reload after the latest fix, and share the details if it comes back.",
            steps: ["Reload the page.", "If it still fails, copy the details and check the most recent script change."],
            detail
        };
    }

    if (/Could not load .*: \d+|Failed to fetch/i.test(message)) {
        return {
            title: "Fauna could not load every file",
            message: "The local server did not return one of the app files. This can happen when the static server is pointed at the wrong folder or the port is serving another project.",
            steps: ["Start the server from the Fauna folder.", "Reload this page.", "Use another local port if another app is already running."],
            detail
        };
    }

    return {
        title: "Fauna could not start",
        message: "The app stopped during startup before the chat UI could load.",
        steps: ["Reload the page.", "If it repeats, copy the details and inspect the browser console."],
        detail
    };
}

function renderStartupError(error) {
    const info = getStartupErrorInfo(error);
    const detailId = "startupErrorDetail";

    document.body?.classList.remove("app-loading");
    document.body?.classList.add("startup-failed");
    document.body.innerHTML = `
        <main class="startup-error" role="alert" aria-labelledby="startupErrorTitle">
            <section class="startup-error-card">
                <div class="startup-error-mark" aria-hidden="true">
                    ${APP_ICON_MARKUP}
                </div>
                <div class="startup-error-copy">
                    <p class="startup-error-kicker">Startup interrupted</p>
                    <h1 id="startupErrorTitle">${escapeHtml(info.title)}</h1>
                    <p>${escapeHtml(info.message)}</p>
                    <ul>
                        ${info.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}
                    </ul>
                </div>
                <div class="startup-error-actions">
                    <button class="startup-error-primary" type="button" data-startup-reload>Reload Fauna</button>
                    <button class="startup-error-secondary" type="button" data-startup-details aria-expanded="false" aria-controls="${detailId}">Details</button>
                    <button class="startup-error-secondary" type="button" data-startup-copy>Copy details</button>
                </div>
                <pre id="${detailId}" class="startup-error-detail" hidden>${escapeHtml(info.detail)}</pre>
            </section>
        </main>
    `;

    const reloadButton = document.querySelector("[data-startup-reload]");
    const detailsButton = document.querySelector("[data-startup-details]");
    const copyButton = document.querySelector("[data-startup-copy]");
    const detail = document.getElementById(detailId);

    reloadButton?.addEventListener("click", () => window.location.reload());
    detailsButton?.addEventListener("click", () => {
        if (!detail) return;
        detail.hidden = !detail.hidden;
        detailsButton.setAttribute("aria-expanded", String(!detail.hidden));
        detailsButton.textContent = detail.hidden ? "Details" : "Hide details";
    });
    copyButton?.addEventListener("click", async () => {
        try {
            await writeStartupTextToClipboard(info.detail);
            copyButton.textContent = "Copied";
            window.setTimeout(() => {
                copyButton.textContent = "Copy details";
            }, 1400);
        } catch {
            copyButton.textContent = "Copy failed";
        }
    });
}

async function bootApp() {
    const bootStartedAt = performance.now();
    createBootLoader();
    try {
        await loadIncludes();
        await import("./script.js?v=20260706-phone-sync");
        const remainingBootMs = Math.max(0, MIN_BOOT_MS - (performance.now() - bootStartedAt));
        if (remainingBootMs > 0) {
            await new Promise(resolve => window.setTimeout(resolve, remainingBootMs));
        }
        finishBootLoader();
    } catch (err) {
        console.error("Fauna failed to start:", err);
        renderStartupError(err);
    }
}

bootApp();
