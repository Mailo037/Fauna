// Original script.js lines 10709-12314.
async function inspectUrlInBrowser(url, signal = null) {
    const res = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
        },
        signal
    });
    markGenerationConnectionEstablished(signal);
    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const readable = extractReadablePageText(raw, contentType);
    return {
        url,
        finalUrl: res.url || url,
        title: readable.title,
        contentType,
        status: res.status,
        source: "browser",
        content: readable.text,
        truncated: false
    };
}

async function inspectUrlWithBridge(url, signal = null) {
    const result = await requestWorkspaceBridge("/fetch-url", {
        method: "POST",
        signal,
        body: {
            url,
            maxBytes: 120000
        }
    });
    return {
        url,
        finalUrl: result.finalUrl || result.url || url,
        title: result.title || "",
        contentType: result.contentType || "",
        status: result.status,
        source: "local bridge",
        content: normalizeReadableWebText(result.content || ""),
        truncated: result.truncated === true
    };
}

function formatInspectedPageResult(page) {
    const title = page.title || page.finalUrl || page.url || "Untitled page";
    const lines = [
        `Inspected page: ${title}`,
        `URL: ${page.url || page.finalUrl || ""}`
    ];
    if (page.finalUrl && page.url && page.finalUrl !== page.url) lines.push(`Final URL: ${page.finalUrl}`);
    if (page.status) lines.push(`HTTP status: ${page.status}`);
    if (page.contentType) lines.push(`Content type: ${page.contentType}`);
    if (page.source) lines.push(`Inspection source: ${page.source}`);
    if (page.error) {
        lines.push(`Inspection failed: ${page.error}`);
        return lines.join("\n");
    }
    const content = trimLocalToolText(page.content || "[No readable page text found]", WEB_INSPECT_RESULT_MAX_CHARS);
    const truncated = page.truncated ? "\n[Page content truncated by bridge limit]" : "";
    return `${lines.join("\n")}\nReadable text:\n${content}${truncated}`;
}

function pageToWebSource(page) {
    const url = page.finalUrl || page.url;
    if (!url) return null;
    return {
        title: page.title || getSourceHost(url) || url,
        url,
        snippet: page.error ? `Inspection failed: ${page.error}` : getWebSnippet(page.content)
    };
}

function normalizeWebSource(source) {
    if (!source?.url) return null;
    const url = normalizeWebUrl(source.url);
    if (!url) return null;
    return {
        title: String(source.title || getSourceHost(url) || url).trim(),
        url,
        snippet: String(source.snippet || "").replace(/\s+/g, " ").trim()
    };
}

function mergeWebSources(...sourceGroups) {
    const seen = new Set();
    const merged = [];
    sourceGroups.flat().forEach(source => {
        const normalized = normalizeWebSource(source);
        if (!normalized || seen.has(normalized.url)) return;
        seen.add(normalized.url);
        merged.push(normalized);
    });
    return merged.slice(0, 10);
}

async function inspectUrlForModel(value, signal = null) {
    const url = normalizeWebUrl(value);
    if (!url) {
        throw new Error("inspect_url requires a valid http or https URL.");
    }

    let browserError = null;
    try {
        const page = await inspectUrlInBrowser(url, signal);
        if (page.content) return page;
        browserError = new Error("No readable text was found in the browser response.");
    } catch (err) {
        if (err.name === "AbortError") throw err;
        browserError = err;
    }

    if (hasWorkspaceBridgeAccess()) {
        try {
            const page = await inspectUrlWithBridge(url, signal);
            if (page.content) return page;
            throw new Error("The bridge reached the page, but no readable text was found.");
        } catch (err) {
            if (err.name === "AbortError") throw err;
            if (/Unknown endpoint|fetch-url/i.test(err.message || "")) {
                throw new Error("Local bridge needs restart: this running bridge does not allow URL inspection yet. Stop it, restart `py -3 local-bridge.py --root . --port 8765`, save the printed token, then try again.");
            }
            throw err;
        }
    }

    throw new Error(`Browser inspection failed${browserError?.message ? `: ${browserError.message}` : ""}. Enable Local Workspace Bridge to inspect most live sites, or paste the page text/screenshot.`);
}

async function inspectPromptUrls(text, signal = null) {
    const urls = extractWebUrlsFromText(text);
    const pages = [];
    for (const url of urls) {
        try {
            pages.push(await inspectUrlForModel(url, signal));
        } catch (err) {
            if (err.name === "AbortError") throw err;
            pages.push({
                url,
                finalUrl: url,
                title: getSourceHost(url) || url,
                source: "web inspector",
                content: "",
                error: err.message
            });
        }
    }
    return pages;
}

async function getWebContextForPrompt(text, signal = null, options = {}) {
    const query = buildSearchQuery(text);
    const wikiResults = await searchWithWikipedia(query).catch(() => []);
    const inspectedPages = options.inspectUrls === false
        ? []
        : await inspectPromptUrls(text, signal);

    const seenUrls = new Set();
    const searchEngineSources = isGoogleGroundingEnabled
        ? getSearchEngineSources(query)
        : [];
    const results = [...searchEngineSources, ...wikiResults]
        .filter(result => {
            if (!result.url || seenUrls.has(result.url)) return false;
            seenUrls.add(result.url);
            return true;
        })
        .slice(0, 8);

    if (results.length === 0 && inspectedPages.length === 0) {
        return { context: "", sources: [], query, resultCount: 0 };
    }

    const sourceLines = results.map((result, index) => {
        const snippet = result.snippet ? `\n   Summary: ${result.snippet}` : "";
        return `${index + 1}. ${result.title}\n   URL: ${result.url}${snippet}`;
    }).join("\n");
    const inspectedLines = inspectedPages.map(formatInspectedPageResult).join("\n\n");

    const groundingInstruction = isGroundingEnabled
        ? "Ground the answer in these online results and inspected pages. Cite links from this list for factual claims based on web results, and say when the results are insufficient."
        : "Use these online results as optional background. You may include useful links from this list, but you do not need to strictly ground every factual claim in them.";

    const sections = [
        sourceLines ? `Search results:\n${sourceLines}` : "",
        inspectedLines ? `Inspected pages:\n${inspectedLines}` : ""
    ].filter(Boolean).join("\n\n");
    const inspectedSources = inspectedPages.map(pageToWebSource).filter(Boolean);
    const sources = mergeWebSources(results, inspectedSources);

    return {
        context: `\n\n--- Web Search Context ---\nSearch query: ${query}\n${groundingInstruction}\n${sections}\n--- End Web Search Context ---`,
        sources,
        query,
        resultCount: sources.length
    };
}

function firstFiniteNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return null;
}

function clampDurationMs(value, fallbackMs, maxMs = WAIT_TOOL_MAX_DELAY_MS) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallbackMs;
    return Math.max(0, Math.min(maxMs, Math.round(number)));
}

function formatPreciseDuration(ms) {
    const duration = Math.max(0, Number(ms) || 0);
    if (duration < 1000) return `${Math.round(duration)}ms`;
    if (duration < 60 * 1000) return `${(duration / 1000).toFixed(duration < 10 * 1000 ? 2 : 1)}s`;
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
}

function parseDurationStringToMs(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return null;

    if (/^\d+(?:\.\d+)?$/.test(text)) {
        return Number(text) * 1000;
    }

    const clockMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (clockMatch) {
        const first = Number(clockMatch[1]);
        const second = Number(clockMatch[2]);
        const third = Number(clockMatch[3] || 0);
        return clockMatch[3]
            ? ((first * 60 * 60) + (second * 60) + third) * 1000
            : ((first * 60) + second) * 1000;
    }

    let totalMs = 0;
    const unitRe = /(-?\d+(?:\.\d+)?)\s*(milliseconds?|msecs?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/gi;
    for (const match of text.matchAll(unitRe)) {
        const amount = Number(match[1]);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const unit = match[2].toLowerCase();
        if (/^m(?:illi|sec)|^ms$/.test(unit)) totalMs += amount;
        else if (/^s/.test(unit)) totalMs += amount * 1000;
        else if (/^m/.test(unit)) totalMs += amount * 60 * 1000;
        else if (/^h/.test(unit)) totalMs += amount * 60 * 60 * 1000;
    }

    return totalMs > 0 ? totalMs : null;
}

function getToolCallDurationMs(toolCall = {}, {
    fallbackMs = WAIT_TOOL_DEFAULT_DELAY_MS,
    maxMs = WAIT_TOOL_MAX_DELAY_MS,
    prefix = ""
} = {}) {
    const directMs = firstFiniteNumber(
        toolCall[`${prefix}Milliseconds`],
        toolCall[`${prefix}Ms`],
        prefix ? null : toolCall.milliseconds,
        prefix ? null : toolCall.ms,
        prefix ? null : toolCall.durationMs,
        prefix ? null : toolCall.delayMs
    );
    if (directMs !== null) return clampDurationMs(directMs, fallbackMs, maxMs);

    const seconds = firstFiniteNumber(
        toolCall[`${prefix}Seconds`],
        prefix ? null : toolCall.seconds,
        prefix ? null : toolCall.sec
    );
    const minutes = firstFiniteNumber(
        toolCall[`${prefix}Minutes`],
        prefix ? null : toolCall.minutes,
        prefix ? null : toolCall.min
    );
    const hours = firstFiniteNumber(
        toolCall[`${prefix}Hours`],
        prefix ? null : toolCall.hours
    );
    const componentMs = (
        Math.max(0, seconds || 0) * 1000
        + Math.max(0, minutes || 0) * 60 * 1000
        + Math.max(0, hours || 0) * 60 * 60 * 1000
    );
    if (componentMs > 0) return clampDurationMs(componentMs, fallbackMs, maxMs);

    const rawDuration = toolCall[`${prefix}Duration`] || (!prefix ? toolCall.duration || toolCall.delay : "");
    const parsedDuration = parseDurationStringToMs(rawDuration);
    if (parsedDuration !== null) return clampDurationMs(parsedDuration, fallbackMs, maxMs);

    if (!prefix && toolCall.until) {
        const targetTime = Date.parse(toolCall.until);
        if (Number.isFinite(targetTime)) {
            return clampDurationMs(targetTime - Date.now(), fallbackMs, maxMs);
        }
    }

    return fallbackMs;
}

function waitWithAbort(ms, signal = null) {
    const delayMs = clampDurationMs(ms, 0, WAIT_TOOL_MAX_DELAY_MS);
    if (delayMs <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timerId = window.setTimeout(() => {
            signal?.removeEventListener?.("abort", handleAbort);
            resolve();
        }, delayMs);
        function handleAbort() {
            window.clearTimeout(timerId);
            reject(new DOMException("Wait stopped", "AbortError"));
        }
        if (signal?.aborted) {
            handleAbort();
        } else {
            signal?.addEventListener?.("abort", handleAbort, { once: true });
        }
    });
}

function getWaitForCommandIntervalMs(toolCall = {}) {
    const direct = firstFiniteNumber(toolCall.intervalMilliseconds, toolCall.intervalMs);
    const seconds = firstFiniteNumber(toolCall.intervalSeconds);
    const parsed = parseDurationStringToMs(toolCall.interval);
    const value = direct ?? (seconds !== null ? seconds * 1000 : parsed);
    return Math.max(
        WAIT_FOR_COMMAND_MIN_INTERVAL_MS,
        clampDurationMs(value ?? WAIT_FOR_COMMAND_DEFAULT_INTERVAL_MS, WAIT_FOR_COMMAND_DEFAULT_INTERVAL_MS, WAIT_TOOL_MAX_DELAY_MS)
    );
}

function normalizeExpectedExitCode(value) {
    if (value === null || value === undefined || value === "" || String(value).toLowerCase() === "any") return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : 0;
}

function commandResultMatchesWaitCondition(result, {
    expectedExitCode = 0,
    contains = "",
    caseSensitive = false
} = {}) {
    if (expectedExitCode !== null && Number(result?.exitCode) !== expectedExitCode) return false;
    const needle = String(contains || "").trim();
    if (!needle) return true;
    const output = [result?.stdout, result?.stderr].filter(Boolean).join("\n");
    return caseSensitive
        ? output.includes(needle)
        : output.toLowerCase().includes(needle.toLowerCase());
}

async function executeWaitForCommandToolCall(toolCall, signal = null) {
    const command = String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim();
    if (!command) {
        return executeWaitToolCall(toolCall, signal);
    }
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("wait_for with command requires the Local Workspace Bridge.");
    }

    const maxMs = getToolCallDurationMs(toolCall, {
        fallbackMs: WAIT_FOR_COMMAND_DEFAULT_MAX_MS,
        maxMs: WAIT_FOR_COMMAND_MAX_MS,
        prefix: "max"
    });
    const intervalMs = getWaitForCommandIntervalMs(toolCall);
    const expectedExitCode = normalizeExpectedExitCode(toolCall.expectedExitCode ?? toolCall.exitCode ?? 0);
    const contains = String(toolCall.contains || toolCall.match || toolCall.stdoutContains || "").trim();
    const commandTimeout = Math.max(1, Math.min(60, Number(toolCall.commandTimeout || toolCall.commandTimeoutSeconds || toolCall.timeout || 10) || 10));
    const startedAt = Date.now();
    let attempts = 0;
    let lastResult = null;

    while (Date.now() - startedAt <= maxMs) {
        throwIfAborted(signal);
        attempts += 1;
        lastResult = await runWorkspaceCommand(command, toolCall.cwd || ".", commandTimeout, signal, getWorkspaceToolBridgeOptions(signal));
        if (commandResultMatchesWaitCondition(lastResult, {
            expectedExitCode,
            contains,
            caseSensitive: toolCall.caseSensitive === true
        })) {
            return [
                `wait_for matched after ${formatDuration(Date.now() - startedAt)} (${attempts} attempt${attempts === 1 ? "" : "s"}).`,
                contains ? `Condition: output contains "${contains}".` : `Condition: exit code ${expectedExitCode ?? "any"}.`,
                "",
                formatWorkspaceCommandResult(lastResult)
            ].join("\n");
        }

        const remainingMs = maxMs - (Date.now() - startedAt);
        if (remainingMs <= 0) break;
        await waitWithAbort(Math.min(intervalMs, remainingMs), signal);
    }

    return [
        `wait_for timed out after ${formatDuration(Date.now() - startedAt)} (${attempts} attempt${attempts === 1 ? "" : "s"}).`,
        contains ? `Unmet condition: output contains "${contains}".` : `Unmet condition: exit code ${expectedExitCode ?? "any"}.`,
        "",
        lastResult ? formatWorkspaceCommandResult(lastResult) : "Command did not run before the timeout."
    ].join("\n");
}

async function executeWaitToolCall(toolCall, signal = null) {
    const waitMs = getToolCallDurationMs(toolCall);
    const startedAt = Date.now();
    await waitWithAbort(waitMs, signal);
    const reason = String(toolCall.reason || toolCall.label || "").trim();
    return [
        `Waited ${formatDuration(Date.now() - startedAt)}.`,
        reason ? `Reason: ${reason}` : "",
        `Requested duration: ${formatDuration(waitMs)}.`
    ].filter(Boolean).join("\n");
}

function getStopwatchLabel(toolCall = {}) {
    return String(toolCall.label || toolCall.name || toolCall.reason || "Stopwatch").trim() || "Stopwatch";
}

function shouldStopwatchWaitForUserInput(toolCall = {}) {
    const mode = String(toolCall.mode || toolCall.until || toolCall.target || toolCall.waitFor || "").trim().toLowerCase();
    return /^(?:user|input|user_input|user-input|reply|response|answer|manual|stop)$/.test(mode)
        || toolCall.userInput === true
        || toolCall.waitForUser === true
        || toolCall.untilUserInput === true;
}

function createStopwatchUserInputRequest(toolCall = {}) {
    const startedAtEpochMs = Date.now();
    const label = getStopwatchLabel(toolCall);
    const prompt = String(
        toolCall.prompt
        || toolCall.question
        || "Type anything when I should stop the stopwatch."
    ).trim();
    return {
        title: String(toolCall.title || "Stopwatch running").trim(),
        questions: [{
            id: "stopwatch-user-input",
            question: prompt,
            options: Array.isArray(toolCall.options) ? toolCall.options : [],
            allowCustom: true,
            placeholder: String(toolCall.placeholder || "Type here to stop the stopwatch...").trim()
        }],
        stopwatch: {
            mode: "user_input",
            label,
            startedAtEpochMs,
            startedAt: new Date(startedAtEpochMs).toISOString()
        }
    };
}

async function executeStopwatchCommandToolCall(toolCall, signal = null) {
    const command = String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim();
    if (!command) throw new Error("stopwatch command timing requires a command.");
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("stopwatch command timing requires the Local Workspace Bridge.");
    }

    const startedAtEpochMs = Date.now();
    const startedAt = performance.now();
    const timeout = Math.max(1, Math.min(60, Number(toolCall.timeout || toolCall.commandTimeout || toolCall.commandTimeoutSeconds || 20) || 20));
    const result = await runWorkspaceCommand(command, toolCall.cwd || ".", timeout, signal, getWorkspaceToolBridgeOptions(signal));
    const elapsedMs = performance.now() - startedAt;
    const bridgeDuration = Number.isFinite(Number(result.durationMs))
        ? `Bridge command duration: ${formatPreciseDuration(Number(result.durationMs))} (${Math.round(Number(result.durationMs))}ms).`
        : "";

    return [
        `Stopwatch: ${getStopwatchLabel(toolCall)}`,
        `Started at: ${new Date(startedAtEpochMs).toISOString()}`,
        `Stopped at: ${new Date().toISOString()}`,
        `Elapsed: ${formatPreciseDuration(elapsedMs)} (${Math.round(elapsedMs)}ms).`,
        bridgeDuration,
        "",
        formatWorkspaceCommandResult(result)
    ].filter(Boolean).join("\n");
}

async function executeStopwatchToolCall(toolCall, signal = null) {
    if (String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim()) {
        return executeStopwatchCommandToolCall(toolCall, signal);
    }

    if (shouldStopwatchWaitForUserInput(toolCall)) {
        const request = createStopwatchUserInputRequest(toolCall);
        return {
            text: [
                `Stopwatch started: ${request.stopwatch.label}.`,
                "I am waiting for your input to stop it."
            ].join("\n"),
            needsUserInput: request
        };
    }

    const waitMs = getToolCallDurationMs(toolCall, {
        fallbackMs: 0,
        maxMs: WAIT_TOOL_MAX_DELAY_MS
    });
    const startedAtEpochMs = Date.now();
    const startedAt = performance.now();
    if (waitMs > 0) await waitWithAbort(waitMs, signal);
    const elapsedMs = performance.now() - startedAt;

    return [
        `Stopwatch: ${getStopwatchLabel(toolCall)}`,
        `Started at: ${new Date(startedAtEpochMs).toISOString()}`,
        `Stopped at: ${new Date().toISOString()}`,
        `Elapsed: ${formatPreciseDuration(elapsedMs)} (${Math.round(elapsedMs)}ms).`,
        waitMs > 0 ? `Requested timed wait: ${formatDuration(waitMs)}.` : "No command, wait duration, or user input target was provided."
    ].join("\n");
}

function normalizeApproxIpLocation(data = {}) {
    const latitude = firstFiniteNumber(data.latitude, data.lat);
    const longitude = firstFiniteNumber(data.longitude, data.lon, data.lng);
    if (latitude === null || longitude === null) {
        throw new Error("Approx location service did not return coordinates.");
    }
    return {
        city: String(data.city || "").trim(),
        region: String(data.region || data.region_name || "").trim(),
        countryName: String(data.country_name || data.country || "").trim(),
        countryCode: String(data.country_code || data.countryCode || "").trim(),
        postal: String(data.postal || data.zip || "").trim(),
        timezone: String(data.timezone || "").trim(),
        latitude,
        longitude
    };
}

function getApproxLocationLabel(location = {}) {
    return [location.city, location.region, location.countryName || location.countryCode]
        .map(part => String(part || "").trim())
        .filter(Boolean)
        .join(", ") || "Unknown area";
}

function formatCoordinate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "";
}

async function fetchApproxIpLocation(signal = null) {
    if (!isApproxLocationEnabled) {
        throw new Error("Approx Location is disabled in the Tools menu.");
    }
    const response = await fetch(IP_GEOLOCATION_URL, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal
    });
    if (!response.ok) {
        throw new Error(`Approx location service responded with HTTP ${response.status}.`);
    }
    const data = await response.json().catch(() => ({}));
    if (data.error || data.reason) {
        throw new Error(data.reason || data.error || "Approx location service failed.");
    }
    return normalizeApproxIpLocation(data);
}

function getLocationSources(includeWeather = false) {
    const sources = [{
        title: "IP geolocation",
        url: IP_GEOLOCATION_URL,
        snippet: "Approximate public-IP city or region lookup."
    }];
    if (includeWeather) {
        sources.push({
            title: "Open-Meteo forecast API",
            url: "https://open-meteo.com/",
            snippet: "Current weather from latitude and longitude."
        });
    }
    return sources;
}

function getWeatherSourcesForLocation(usedApproxIpLocation = true) {
    return usedApproxIpLocation
        ? getLocationSources(true)
        : [{
            title: "Open-Meteo forecast API",
            url: "https://open-meteo.com/",
            snippet: "Current weather from latitude and longitude."
        }];
}

function formatApproxLocationResult(location) {
    const coordinateText = [formatCoordinate(location.latitude), formatCoordinate(location.longitude)]
        .filter(Boolean)
        .join(", ");
    return [
        "Approximate public-IP location:",
        `Area: ${getApproxLocationLabel(location)}`,
        coordinateText ? `Coordinates: ${coordinateText} (rounded)` : "",
        location.timezone ? `Timezone: ${location.timezone}` : "",
        "Precision: city/region level at best; this is not GPS and may be wrong.",
        "Privacy: public IP address was not included in this tool result."
    ].filter(Boolean).join("\n");
}

function getWeatherCodeLabel(code) {
    const labels = {
        0: "clear",
        1: "mainly clear",
        2: "partly cloudy",
        3: "overcast",
        45: "fog",
        48: "depositing rime fog",
        51: "light drizzle",
        53: "moderate drizzle",
        55: "dense drizzle",
        61: "slight rain",
        63: "moderate rain",
        65: "heavy rain",
        71: "slight snow",
        73: "moderate snow",
        75: "heavy snow",
        80: "slight rain showers",
        81: "moderate rain showers",
        82: "violent rain showers",
        95: "thunderstorm"
    };
    return labels[Number(code)] || (code === null || code === undefined ? "" : `weather code ${code}`);
}

async function fetchCurrentWeather(latitude, longitude, signal = null) {
    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        timezone: "auto",
        forecast_days: "1"
    });
    const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal
    });
    if (!response.ok) {
        throw new Error(`Weather service responded with HTTP ${response.status}.`);
    }
    const data = await response.json().catch(() => ({}));
    if (!data || typeof data !== "object") {
        throw new Error("Weather service returned an invalid response.");
    }
    return data;
}

function getToolCallCoordinates(toolCall = {}) {
    const latitude = firstFiniteNumber(toolCall.latitude, toolCall.lat);
    const longitude = firstFiniteNumber(toolCall.longitude, toolCall.lon, toolCall.lng);
    if (latitude === null || longitude === null) return null;
    return {
        latitude,
        longitude,
        city: String(toolCall.city || toolCall.location || "").trim(),
        region: String(toolCall.region || "").trim(),
        countryName: String(toolCall.country || toolCall.countryName || "").trim(),
        timezone: String(toolCall.timezone || "").trim()
    };
}

function formatCurrentWeatherResult(location, weatherData) {
    const current = weatherData?.current || weatherData?.current_weather || {};
    const units = weatherData?.current_units || {};
    const temp = firstFiniteNumber(current.temperature_2m, current.temperature);
    const apparent = firstFiniteNumber(current.apparent_temperature);
    const humidity = firstFiniteNumber(current.relative_humidity_2m);
    const wind = firstFiniteNumber(current.wind_speed_10m, current.windspeed);
    const weatherCode = current.weather_code ?? current.weathercode;
    const observedAt = current.time || "";
    const tempUnit = units.temperature_2m || "°C";
    const windUnit = units.wind_speed_10m || "km/h";
    const coordinateText = [formatCoordinate(location.latitude), formatCoordinate(location.longitude)]
        .filter(Boolean)
        .join(", ");

    return [
        "Current weather for approximate location:",
        `Area: ${getApproxLocationLabel(location)}`,
        coordinateText ? `Coordinates: ${coordinateText} (rounded)` : "",
        temp !== null ? `Temperature: ${temp}${tempUnit}` : "",
        apparent !== null ? `Feels like: ${apparent}${tempUnit}` : "",
        humidity !== null ? `Humidity: ${humidity}%` : "",
        wind !== null ? `Wind: ${wind} ${windUnit}` : "",
        getWeatherCodeLabel(weatherCode) ? `Condition: ${getWeatherCodeLabel(weatherCode)}` : "",
        observedAt ? `Observed at: ${observedAt}${weatherData.timezone ? ` (${weatherData.timezone})` : ""}` : "",
        "Location precision: public-IP city/region level; not GPS."
    ].filter(Boolean).join("\n");
}

async function executeLocationToolCall(toolCall, signal = null) {
    if (toolCall.tool === "get_ip_location") {
        const location = await fetchApproxIpLocation(signal);
        return {
            text: formatApproxLocationResult(location),
            sources: getLocationSources(false)
        };
    }
    if (toolCall.tool === "current_weather") {
        const suppliedLocation = getToolCallCoordinates(toolCall);
        const location = suppliedLocation || await fetchApproxIpLocation(signal);
        const weather = await fetchCurrentWeather(location.latitude, location.longitude, signal);
        return {
            text: formatCurrentWeatherResult(location, weather),
            sources: getWeatherSourcesForLocation(!suppliedLocation)
        };
    }
    throw new Error("Unknown location tool.");
}

function getWorkspaceBridgeBaseUrl() {
    return (safeLocalStorageGet(WORKSPACE_BRIDGE_ENDPOINT_STORAGE_KEY) || DEFAULT_WORKSPACE_BRIDGE_URL).trim().replace(/\/+$/, "");
}

function getWorkspaceBridgeToken() {
    return (safeLocalStorageGet(WORKSPACE_BRIDGE_TOKEN_STORAGE_KEY) || "").trim();
}

function hasWorkspaceBridgeAccess() {
    return Boolean(isWorkspaceBridgeEnabled && getWorkspaceBridgeBaseUrl() && getWorkspaceBridgeToken());
}

function sanitizeWorkspacePolicySegment(value, fallback = "item") {
    const clean = String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_.-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 96);
    return clean || fallback;
}

function getEffectiveWorkspaceAccessPolicy() {
    if (!isFaunaDesktopApp()) return WORKSPACE_ACCESS_POLICY_BRIDGE_ROOT;
    const stored = normalizeWorkspaceAccessPolicy(safeLocalStorageGet(WORKSPACE_ACCESS_POLICY_STORAGE_KEY));
    return stored === WORKSPACE_ACCESS_POLICY_BRIDGE_ROOT ? WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT : stored;
}

function getWorkspaceToolSessionId(signal = null) {
    const fromSignal = typeof getGenerationSessionIdForSignal === "function"
        ? getGenerationSessionIdForSignal(signal)
        : "";
    return fromSignal || activeSessionId || getActiveSession?.()?.id || "unassigned-chat";
}

function getWorkspaceToolScope(signal = null) {
    const projectScope = typeof getActiveWorkspaceProjectBridgeScope === "function"
        ? getActiveWorkspaceProjectBridgeScope(signal)
        : "";
    if (projectScope) return projectScope;
    if (getEffectiveWorkspaceAccessPolicy() !== WORKSPACE_ACCESS_POLICY_CHAT_OUTPUT) return "";
    return `chats/${sanitizeWorkspacePolicySegment(getWorkspaceToolSessionId(signal), "unassigned-chat")}/output`;
}

function getWorkspaceToolBridgeOptions(signal = null) {
    const scope = getWorkspaceToolScope(signal);
    return scope ? { scope } : {};
}

function getWorkspaceBridgeHeaders(includeJson = false) {
    const headers = {};
    const token = getWorkspaceBridgeToken();
    if (includeJson) headers["Content-Type"] = "application/json";
    if (token) {
        headers[WORKSPACE_BRIDGE_TOKEN_HEADER] = token;
        headers[LEGACY_WORKSPACE_BRIDGE_TOKEN_HEADER] = token;
    }
    return headers;
}

function createWorkspaceBridgeNetworkError(path, error) {
    const isOpenAiBridgeRequest = path === OPENAI_BRIDGE_PATH;
    const message = isOpenAiBridgeRequest
        ? "OpenAI bridge is unreachable. Start local-bridge.py, save the current token, and enable Local Workspace before using OpenAI."
        : "Workspace bridge is unreachable. Start local-bridge.py, save the current token, and try the workspace request again.";
    const detail = error?.message ? ` (${error.message})` : "";
    const bridgeError = new Error(`${message}${detail}`);
    bridgeError.name = "WorkspaceBridgeUnavailableError";
    bridgeError.cause = error;
    return bridgeError;
}

function isWorkspaceBridgeUnavailableError(error) {
    const rawMessage = error?.message || String(error || "");
    return error?.name === "WorkspaceBridgeUnavailableError"
        || /OpenAI bridge is unreachable|Workspace bridge is unreachable|OpenAI requests need the Local Workspace Bridge|local-bridge\.py/i.test(rawMessage);
}

async function requestWorkspaceBridge(path, options = {}) {
    const baseUrl = getWorkspaceBridgeBaseUrl();
    let res;
    try {
        res = await fetch(`${baseUrl}${path}`, {
            method: options.method || "GET",
            headers: getWorkspaceBridgeHeaders(Boolean(options.body)),
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.signal
        });
    } catch (err) {
        if (err.name === "AbortError") throw err;
        throw createWorkspaceBridgeNetworkError(path, err);
    }
    markGenerationConnectionEstablished(options.signal);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
        if (path === OPENAI_BRIDGE_PATH) {
            throw new Error(formatOpenAiApiError(data, res.status));
        }
        throw new Error(data.error || `Workspace bridge responded with HTTP ${res.status}`);
    }
    return data;
}

function trimLocalToolText(value, maxLength = LOCAL_TOOL_RESULT_MAX_CHARS) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n[Output truncated to ${maxLength.toLocaleString()} characters]`;
}

function formatLineNumberedText(value) {
    const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
    const width = String(Math.max(1, lines.length)).length;
    return lines
        .map((line, index) => `${String(index + 1).padStart(width, " ")} | ${line}`)
        .join("\n");
}

function formatWorkspaceTreeResult(result) {
    const lines = (result.entries || []).map(entry => {
        const kind = entry.type === "directory" ? "[dir]" : "[file]";
        const size = typeof entry.size === "number" ? ` (${entry.size.toLocaleString()} bytes)` : "";
        return `${kind} ${entry.path}${size}`;
    });
    const truncated = result.truncated ? "\n[Tree truncated by bridge limit]" : "";
    return `Workspace tree for ${result.path || "."}:\n${lines.join("\n") || "[No entries]"}${truncated}`;
}

function formatWorkspaceFileResult(result) {
    const content = trimLocalToolText(formatLineNumberedText(result.content || ""));
    const truncated = result.truncated ? "\n[File truncated by bridge limit]" : "";
    return `File: ${result.path} (${Number(result.size || 0).toLocaleString()} bytes)\nLine-numbered content:\n${content}${truncated}`;
}

function formatWorkspaceCommandResult(result) {
    const stdout = trimLocalToolText(result.stdout || "[No stdout]");
    const stderr = result.stderr ? `\nStderr:\n${trimLocalToolText(result.stderr)}` : "";
    const timedOut = result.timedOut ? "\n[Command timed out]" : "";
    const truncated = result.truncated ? "\n[Output truncated by bridge limit]" : "";
    const status = result.timedOut ? "Timed out" : Number(result.exitCode || 0) === 0 ? "Passed" : "Failed";
    const signalLine = String(result.stderr || result.stdout || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean) || "No command output.";
    return `Command: ${result.command}\nCwd: ${result.cwd || "."}\nSummary: ${status}. ${signalLine}\nExit code: ${result.exitCode ?? "timeout"}\nDuration: ${result.durationMs ?? 0}ms\nStdout:\n${stdout}${stderr}${timedOut}${truncated}`;
}

function formatWorkspaceWriteResult(result = {}) {
    return [
        result.appended ? "File appended." : "File written.",
        `Path: ${result.path || "."}`,
        `Size: ${Number(result.size || 0).toLocaleString()} bytes`
    ].join("\n");
}

function formatWorkspaceDirectoryResult(result = {}) {
    return [
        "Directory ready.",
        `Path: ${result.path || "."}`
    ].join("\n");
}

function shouldUseWorkspaceBridge(text) {
    if (!canUseComposerTools()) return false;
    if (!isWorkspaceBridgeEnabled || !text) return false;
    if (/^\/(?:tree|files|dir|ls|read|run|cmd|shell|terminal|ps)\b/i.test(text)) return true;
    return /\b(local directory|local workspace|workspace files|project files|repo files|repository files|file tree|directory tree|directory listing|folder tree|list files|list directory|read directory|show directory|read file|open file|show file|inspect file|terminal command|shell command|powershell|command output|run tests?|execute command)\b/i.test(text);
}

function shouldListWorkspace(text) {
    return /^\/(?:tree|files|dir|ls)\b/i.test(text)
        || /\b(local directory|local workspace|workspace files|project files|repo files|repository files|file tree|directory tree|directory listing|folder tree|list files|list directory|read directory|show files|show directory)\b/i.test(text);
}

function extractDirectWorkspaceCommand(text) {
    const slash = text.match(/^\/(?:run|cmd|shell|terminal|ps)\s+([\s\S]+)$/i);
    if (slash) return slash[1].trim();

    const inline = text.match(/\b(?:run|execute)\s+`([^`]+)`/i);
    if (inline) return inline[1].trim();

    const colon = text.match(/\b(?:run|execute)\s+(?:this\s+)?(?:terminal\s+|shell\s+|powershell\s+|cmd\s+)?command\s*[:\-]\s*([^\n]+)/i);
    if (colon) return colon[1].trim();

    const common = text.match(/^\s*(?:run|execute)\s+((?:npm|pnpm|yarn|python|py|node|git|dir|ls|pytest|ruff|uv|cargo|go|dotnet)\b[^\n]*)/i);
    return common ? common[1].trim() : "";
}

function cleanWorkspaceToolPath(value) {
    return String(value || "")
        .trim()
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/[.?!,;:]+$/g, "")
        .trim() || ".";
}

function extractDirectWorkspaceTreePath(text) {
    const slash = text.match(/^\/(?:tree|files|dir|ls)(?:\s+([\s\S]+))?$/i);
    if (slash) return cleanWorkspaceToolPath(slash[1] || ".");

    const backticked = text.match(/\b(?:list|show|read|inspect|open)\s+(?:the\s+)?(?:directory|folder|files|file tree|directory tree)\s+(?:in|under|at|for|from)?\s*`([^`\n]+)`/i);
    if (backticked) return cleanWorkspaceToolPath(backticked[1]);

    const prose = text.match(/\b(?:list|show|read|inspect|open)\s+(?:the\s+)?(?:directory|folder|files|file tree|directory tree)\s+(?:in|under|at|for|from)\s+([A-Za-z0-9_.\-\\/]+)/i);
    return prose ? cleanWorkspaceToolPath(prose[1]) : ".";
}

function extractDirectReadPaths(text) {
    const paths = new Set();
    const slash = text.match(/^\/read\s+([\s\S]+)$/i);
    if (slash) paths.add(slash[1].trim());

    if (/\b(?:read|open|show|inspect)\b/i.test(text)) {
        const backtickMatches = text.matchAll(/`([^`\n]+)`/g);
        for (const match of backtickMatches) {
            const candidate = match[1].trim();
            if (candidate && /[./\\]/.test(candidate)) paths.add(candidate);
        }

        const pathMatches = text.matchAll(/\b(?:read|open|show|inspect)\s+(?:the\s+)?(?:file\s+)?([A-Za-z0-9_.\-\\/]+(?:\.[A-Za-z0-9]+)?)/gi);
        for (const match of pathMatches) {
            const candidate = match[1].trim();
            if (candidate && !/^(file|files|directory|workspace|project)$/i.test(candidate)) paths.add(candidate);
        }
    }

    return [...paths].slice(0, 5);
}

async function listWorkspaceTree(path = ".", depth = 2, signal = null, limit = 220, bridgeOptions = {}) {
    const params = new URLSearchParams({
        path: path || ".",
        depth: String(Math.max(0, Math.min(5, Number(depth) || 2))),
        limit: String(Math.max(1, Math.min(800, Number(limit) || 220)))
    });
    if (bridgeOptions.scope) params.set("scope", bridgeOptions.scope);
    return requestWorkspaceBridge(`/tree?${params.toString()}`, { signal });
}

async function readWorkspaceFile(path, signal = null, bridgeOptions = {}) {
    const params = new URLSearchParams({
        path,
        maxBytes: "80000"
    });
    if (bridgeOptions.scope) params.set("scope", bridgeOptions.scope);
    return requestWorkspaceBridge(`/read?${params.toString()}`, { signal });
}

async function runWorkspaceCommand(command, cwd = ".", timeout = 20, signal = null, bridgeOptions = {}) {
    return requestWorkspaceBridge("/exec", {
        method: "POST",
        body: {
            command,
            cwd: cwd || ".",
            timeout: Math.max(1, Math.min(60, Number(timeout) || 20)),
            ...bridgeOptions
        },
        signal
    });
}

async function getWorkspaceGitInfo(signal = null, bridgeOptions = {}) {
    const options = bridgeOptions || {};
    const params = new URLSearchParams({
        path: String(options.path || ".").trim() || "."
    });
    if (options.scope) params.set("scope", options.scope);
    return requestWorkspaceBridge(`/git?${params.toString()}`, { signal });
}

async function checkoutWorkspaceGitBranch(branch, options = {}, signal = null, bridgeOptions = {}) {
    return requestWorkspaceBridge("/git", {
        method: "POST",
        body: {
            branch: String(branch || "").trim(),
            create: options.create === true,
            remote: options.remote === true,
            path: String((bridgeOptions || {}).path || ".").trim() || ".",
            ...(bridgeOptions || {})
        },
        signal
    });
}

async function writeWorkspaceFile(path, content = "", signal = null, bridgeOptions = {}, append = false) {
    return requestWorkspaceBridge("/write", {
        method: "POST",
        body: {
            path,
            content: String(content ?? ""),
            append: Boolean(append),
            ...bridgeOptions
        },
        signal
    });
}

async function makeWorkspaceDirectory(path, signal = null, bridgeOptions = {}) {
    return requestWorkspaceBridge("/mkdir", {
        method: "POST",
        body: {
            path,
            ...bridgeOptions
        },
        signal
    });
}

function normalizeWorkspaceToolLimit(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function normalizeWorkspaceSearchQuery(toolCall = {}) {
    return String(toolCall.query || toolCall.pattern || toolCall.text || toolCall.name || "").trim();
}

function globToRegex(glob = "") {
    const value = String(glob || "").trim();
    if (!value || value === "*") return null;
    const escaped = value
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`, "i");
}

function matchesWorkspaceGlob(filePath, glob = "") {
    const regex = globToRegex(glob);
    if (!regex) return true;
    const normalizedPath = String(filePath || "").replace(/\\/g, "/");
    const fileName = normalizedPath.split("/").pop() || normalizedPath;
    return regex.test(normalizedPath) || regex.test(fileName);
}

function getWorkspaceTreeFiles(result = {}) {
    return (result.entries || [])
        .filter(entry => entry?.type !== "directory" && entry?.path)
        .map(entry => ({
            path: String(entry.path),
            size: Number(entry.size || 0) || 0
        }));
}

function formatWorkspaceFileSearchResult(result = {}) {
    const files = result.files || [];
    const lines = files.map(file => {
        const size = typeof file.size === "number" && file.size > 0 ? ` (${file.size.toLocaleString()} bytes)` : "";
        return `[file] ${file.path}${size}`;
    });
    const truncated = result.truncated ? "\n[Search truncated by result limit]" : "";
    return `Workspace file search for "${result.query || "*"}" under ${result.path || "."}:\n${lines.join("\n") || "[No matching files]"}${truncated}`;
}

function formatWorkspaceTextSearchResult(result = {}) {
    const matches = result.matches || [];
    const lines = matches.map(match => `${match.path}:${match.line}: ${match.text}`);
    const truncated = result.truncated ? "\n[Search truncated by file or match limit]" : "";
    return `Workspace text search for "${result.query}" under ${result.path || "."}:\n${lines.join("\n") || "[No matches]"}${truncated}`;
}

function getWorkspaceSearchInclude(toolCall = {}) {
    const include = toolCall.include || toolCall.glob || toolCall.fileGlob || toolCall.files;
    if (Array.isArray(include)) return include.map(item => String(item || "").trim()).filter(Boolean).slice(0, 8);
    const clean = String(include || "").trim();
    return clean ? clean.split(",").map(item => item.trim()).filter(Boolean).slice(0, 8) : [];
}

function isLikelyTextWorkspaceFile(filePath = "") {
    return /\.(?:[cm]?[jt]sx?|jsonc?|html?|css|scss|sass|mdx?|txt|ya?ml|toml|ini|env|py|ps1|sh|bash|zsh|bat|cmd|java|kt|kts|swift|go|rs|c|cc|cpp|h|hpp|cs|php|rb|sql|xml|svg|vue|svelte)$/i.test(String(filePath || ""));
}

function workspaceSearchPathMatches(filePath, query, includeGlobs = []) {
    const normalized = String(filePath || "").replace(/\\/g, "/");
    if (includeGlobs.length > 0 && !includeGlobs.some(glob => matchesWorkspaceGlob(normalized, glob))) return false;
    if (!query) return true;
    return normalized.toLowerCase().includes(String(query).toLowerCase());
}

async function searchWorkspaceFiles(toolCall = {}, signal = null, bridgeOptions = {}) {
    const path = cleanWorkspaceToolPath(toolCall.path || ".");
    const query = normalizeWorkspaceSearchQuery(toolCall);
    const depth = normalizeWorkspaceToolLimit(toolCall.depth, 5, 0, 5);
    const limit = normalizeWorkspaceToolLimit(toolCall.limit || toolCall.maxResults, 80, 1, 200);
    const includeGlobs = getWorkspaceSearchInclude(toolCall);
    const tree = await listWorkspaceTree(path, depth, signal, 800, bridgeOptions);
    const files = getWorkspaceTreeFiles(tree)
        .filter(file => workspaceSearchPathMatches(file.path, query, includeGlobs))
        .slice(0, limit);
    return {
        path: tree.path || path,
        query,
        files,
        truncated: Boolean(tree.truncated) || getWorkspaceTreeFiles(tree).length > files.length && files.length >= limit
    };
}

function buildTextSearchMatcher(toolCall = {}) {
    const query = normalizeWorkspaceSearchQuery(toolCall);
    if (!query) throw new Error("search_text requires a query.");
    const caseSensitive = Boolean(toolCall.caseSensitive);
    const useRegex = Boolean(toolCall.regex || toolCall.regexp);
    if (useRegex) {
        const flags = caseSensitive ? "" : "i";
        const regex = new RegExp(query, flags);
        return {
            query,
            matches: line => regex.test(line)
        };
    }
    const needle = caseSensitive ? query : query.toLowerCase();
    return {
        query,
        matches: line => {
            const haystack = caseSensitive ? String(line || "") : String(line || "").toLowerCase();
            return haystack.includes(needle);
        }
    };
}

async function searchWorkspaceText(toolCall = {}, signal = null, bridgeOptions = {}) {
    const path = cleanWorkspaceToolPath(toolCall.path || ".");
    const depth = normalizeWorkspaceToolLimit(toolCall.depth, 5, 0, 5);
    const maxFiles = normalizeWorkspaceToolLimit(toolCall.maxFiles || toolCall.fileLimit, 80, 1, 160);
    const maxMatches = normalizeWorkspaceToolLimit(toolCall.maxMatches || toolCall.limit, 120, 1, 240);
    const includeGlobs = getWorkspaceSearchInclude(toolCall);
    const matcher = buildTextSearchMatcher(toolCall);
    const tree = await listWorkspaceTree(path, depth, signal, 800, bridgeOptions);
    const candidateFiles = getWorkspaceTreeFiles(tree)
        .filter(file => includeGlobs.length ? includeGlobs.some(glob => matchesWorkspaceGlob(file.path, glob)) : isLikelyTextWorkspaceFile(file.path))
        .slice(0, maxFiles);
    const matches = [];

    for (const file of candidateFiles) {
        if (matches.length >= maxMatches) break;
        const result = await readWorkspaceFile(file.path, signal, bridgeOptions);
        const lines = String(result.content || "").replace(/\r\n/g, "\n").split("\n");
        for (let index = 0; index < lines.length; index += 1) {
            if (matches.length >= maxMatches) break;
            const line = lines[index];
            if (!matcher.matches(line)) continue;
            matches.push({
                path: result.path || file.path,
                line: index + 1,
                text: getToolDetailSnippet(line, 220)
            });
        }
    }

    return {
        path: tree.path || path,
        query: matcher.query,
        matches,
        truncated: Boolean(tree.truncated) || candidateFiles.length >= maxFiles || matches.length >= maxMatches
    };
}

async function readWorkspaceFiles(paths = [], signal = null, bridgeOptions = {}) {
    const cleanPaths = (Array.isArray(paths) ? paths : String(paths || "").split(","))
        .map(path => cleanWorkspaceToolPath(path))
        .filter(path => path && path !== ".")
        .slice(0, 8);
    if (!cleanPaths.length) throw new Error("read_files requires one or more paths.");
    const results = [];
    for (const path of cleanPaths) {
        results.push(await readWorkspaceFile(path, signal, bridgeOptions));
    }
    return results
        .map(formatWorkspaceFileResult)
        .join("\n\n---\n\n");
}

async function getWorkspaceContextForPrompt(text, signal = null) {
    if (!shouldUseWorkspaceBridge(text)) return "";

    if (!hasWorkspaceBridgeAccess()) {
        return "\n\n--- Local Workspace Bridge Context ---\nThe user requested local workspace access, but the bridge is not configured or enabled. Tell them to start `py -3 local-bridge.py --root . --port 8765`, then save the printed URL/token in Settings > Local Workspace Bridge.\n--- End Local Workspace Bridge Context ---";
    }

    const bridgeOptions = getWorkspaceToolBridgeOptions(signal);
    const chunks = [];
    const command = extractDirectWorkspaceCommand(text);
    const readPaths = extractDirectReadPaths(text);
    const treePath = extractDirectWorkspaceTreePath(text);

    if (shouldListWorkspace(text) || (!command && readPaths.length === 0)) {
        const tree = await listWorkspaceTree(treePath || ".", 2, signal, 220, bridgeOptions);
        chunks.push(formatWorkspaceTreeResult(tree));
    }

    for (const path of readPaths) {
        const file = await readWorkspaceFile(path, signal, bridgeOptions);
        chunks.push(formatWorkspaceFileResult(file));
    }

    if (command) {
        const result = await runWorkspaceCommand(command, ".", 30, signal, bridgeOptions);
        chunks.push(formatWorkspaceCommandResult(result));
    }

    return `\n\n--- Local Workspace Bridge Context ---\n${chunks.join("\n\n") || "No local tool output was produced."}\n--- End Local Workspace Bridge Context ---`;
}

function normalizeFaunaToolName(toolName) {
    const name = String(toolName || "").trim().toLowerCase();
    if (THINKING_TOOL_NAME_ALIASES[name]) return THINKING_TOOL_NAME_ALIASES[name];
    if (THINKING_TOOL_NAMES.has(name)) return name;
    if (IMAGE_TOOL_NAME_ALIASES[name]) return IMAGE_TOOL_NAME_ALIASES[name];
    if (IMAGE_TOOL_NAMES.has(name)) return name;
    if (WEB_TOOL_NAME_ALIASES[name]) return WEB_TOOL_NAME_ALIASES[name];
    if (WEB_TOOL_NAMES.has(name)) return name;
    if (LOCATION_TOOL_NAME_ALIASES[name]) return LOCATION_TOOL_NAME_ALIASES[name];
    if (LOCATION_TOOL_NAMES.has(name)) return name;
    if (TIME_TOOL_NAME_ALIASES[name]) return TIME_TOOL_NAME_ALIASES[name];
    if (TIME_TOOL_NAMES.has(name)) return name;
    if (WORKSPACE_TOOL_NAME_ALIASES[name]) return WORKSPACE_TOOL_NAME_ALIASES[name];
    if (WORKSPACE_TOOL_NAMES.has(name)) return name;
    return MEMORY_TOOL_NAME_ALIASES[name] || "";
}

function createFaunaToolParameterSchema(properties = {}, required = []) {
    return {
        type: "object",
        properties,
        required,
        additionalProperties: true
    };
}

function getFaunaNativeToolDefinitions({
    allowLocalTools = false,
    allowWebTools = false,
    allowLocationTools = false,
    allowToolCalls = true
} = {}) {
    if (!allowToolCalls) return [];

    const tools = [
        {
            name: "thinking",
            description: "Record a brief plan or reflection and reset the consecutive agent-step counter before more tool-backed work.",
            parameters: createFaunaToolParameterSchema({
                summary: { type: "string", description: "Short summary of known facts, uncertainty, and next action." }
            })
        },
        {
            name: "generate_image",
            description: "Generate a new image from a complete visual prompt.",
            parameters: createFaunaToolParameterSchema({
                prompt: { type: "string", description: "Complete polished image prompt." },
                aspectRatio: { type: "string", description: "Aspect ratio such as 1:1, 16:9, 9:16, 4:3, or 3:4." },
                style: { type: "string", description: "Visual style, medium, or look." },
                quality: { type: "string", description: "auto, low, medium, or high." },
                format: { type: "string", description: "png, jpeg, or webp." },
                width: { type: "number" },
                height: { type: "number" },
                negativePrompt: { type: "string" }
            }, ["prompt"])
        },
        {
            name: "wait",
            description: "Wait for a short duration, timer, pause, or delay.",
            parameters: createFaunaToolParameterSchema({
                seconds: { type: "number" },
                duration: { type: "string" },
                reason: { type: "string" }
            })
        },
        {
            name: "stopwatch",
            description: "Measure elapsed time for a command, a fixed duration, or until user input.",
            parameters: createFaunaToolParameterSchema({
                mode: { type: "string" },
                command: { type: "string" },
                cwd: { type: "string" },
                timeout: { type: "number" },
                duration: { type: "string" },
                prompt: { type: "string" },
                label: { type: "string" }
            })
        }
    ];

    if (allowLocalTools) {
        tools.push(
            {
                name: "workspace_tree",
                description: "List files and folders inside the configured local workspace.",
                parameters: createFaunaToolParameterSchema({
                    path: { type: "string", description: "Workspace-relative path." },
                    depth: { type: "number", description: "Directory depth from 0 to 5." }
                })
            },
            {
                name: "search_files",
                description: "Search local workspace file names and paths, optionally narrowed by glob.",
                parameters: createFaunaToolParameterSchema({
                    query: { type: "string", description: "Filename or path text to find." },
                    path: { type: "string", description: "Workspace-relative starting directory." },
                    depth: { type: "number", description: "Directory depth from 0 to 5." },
                    include: { type: "string", description: "Optional glob such as *.js or scripts/*.js." },
                    limit: { type: "number", description: "Maximum results, capped by Fauna." }
                })
            },
            {
                name: "search_text",
                description: "Search text inside local workspace files and return line-numbered matches.",
                parameters: createFaunaToolParameterSchema({
                    query: { type: "string", description: "Literal text or regex pattern to find." },
                    path: { type: "string", description: "Workspace-relative starting directory." },
                    include: { type: "string", description: "Optional glob such as *.js or styles/*.css." },
                    caseSensitive: { type: "boolean" },
                    regex: { type: "boolean" },
                    maxFiles: { type: "number" },
                    maxMatches: { type: "number" }
                }, ["query"])
            },
            {
                name: "read_file",
                description: "Read a file from the configured local workspace.",
                parameters: createFaunaToolParameterSchema({
                    path: { type: "string", description: "Workspace-relative file path." }
                }, ["path"])
            },
            {
                name: "read_files",
                description: "Read several local workspace files in one tool call.",
                parameters: createFaunaToolParameterSchema({
                    paths: {
                        type: "array",
                        items: { type: "string" },
                        description: "Workspace-relative file paths."
                    }
                }, ["paths"])
            },
            {
                name: "write_file",
                description: "Create or replace a text file inside the active workspace policy scope.",
                parameters: createFaunaToolParameterSchema({
                    path: { type: "string", description: "Policy-scoped relative file path, or an absolute path in Full Machine mode." },
                    content: { type: "string", description: "Full text content to write." }
                }, ["path", "content"])
            },
            {
                name: "append_file",
                description: "Append text to a file inside the active workspace policy scope.",
                parameters: createFaunaToolParameterSchema({
                    path: { type: "string", description: "Policy-scoped relative file path, or an absolute path in Full Machine mode." },
                    content: { type: "string", description: "Text content to append." }
                }, ["path", "content"])
            },
            {
                name: "make_directory",
                description: "Create a directory inside the active workspace policy scope.",
                parameters: createFaunaToolParameterSchema({
                    path: { type: "string", description: "Policy-scoped relative directory path, or an absolute path in Full Machine mode." }
                }, ["path"])
            },
            {
                name: "run_command",
                description: "Run a terminal command through the token-protected local workspace bridge.",
                parameters: createFaunaToolParameterSchema({
                    command: { type: "string" },
                    cwd: { type: "string" },
                    timeout: { type: "number" }
                }, ["command"])
            },
            {
                name: "wait_for",
                description: "Poll a terminal command until it succeeds, matches output, or times out.",
                parameters: createFaunaToolParameterSchema({
                    command: { type: "string" },
                    cwd: { type: "string" },
                    intervalSeconds: { type: "number" },
                    maxSeconds: { type: "number" },
                    contains: { type: "string" },
                    expectedExitCode: { type: "number" }
                }, ["command"])
            }
        );
    }

    if (allowWebTools) {
        tools.push(
            {
                name: "web_search",
                description: "Search the web for current information and sources.",
                parameters: createFaunaToolParameterSchema({
                    query: { type: "string" }
                }, ["query"])
            },
            {
                name: "inspect_url",
                description: "Inspect and summarize text from a specific URL.",
                parameters: createFaunaToolParameterSchema({
                    url: { type: "string" }
                }, ["url"])
            }
        );
    }

    if (allowLocationTools) {
        tools.push(
            {
                name: "get_ip_location",
                description: "Get a coarse approximate public-IP location.",
                parameters: createFaunaToolParameterSchema({})
            },
            {
                name: "current_weather",
                description: "Get current weather for supplied coordinates or approximate current location.",
                parameters: createFaunaToolParameterSchema({
                    latitude: { type: "number" },
                    longitude: { type: "number" }
                })
            }
        );
    }

    if (isMemoryEnabled) {
        tools.push(
            {
                name: "read_memories",
                description: "Read or search the user's saved memories.",
                parameters: createFaunaToolParameterSchema({
                    query: { type: "string" }
                })
            },
            {
                name: "save_memory",
                description: "Save a stable user preference or project fact only when the user asks or clearly wants it remembered.",
                parameters: createFaunaToolParameterSchema({
                    text: { type: "string" }
                }, ["text"])
            },
            {
                name: "delete_memory",
                description: "Delete a saved memory when the user asks to forget it.",
                parameters: createFaunaToolParameterSchema({
                    target: { type: "string" }
                }, ["target"])
            }
        );
    }

    return tools;
}

function buildOpenAiFaunaTools(context = {}) {
    return getFaunaNativeToolDefinitions(context).map(tool => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }));
}

function buildOllamaFaunaTools(context = {}) {
    return getFaunaNativeToolDefinitions(context).map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}

function extractFirstJsonObjectText(content) {
    const text = String(content || "");
    const startIndex = text.indexOf("{");
    if (startIndex < 0) return "";

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < text.length; index += 1) {
        const char = text[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
            inString = true;
            continue;
        }
        if (char === "{") depth += 1;
        if (char === "}") {
            depth -= 1;
            if (depth === 0) return text.slice(startIndex, index + 1);
        }
    }

    return "";
}

function extractFaunaToolCallPayload(content) {
    const text = normalizeAssistantControlMarkup(content);
    const closedMatch = text.match(FAUNA_TOOL_CALL_RE);
    if (closedMatch) return String(closedMatch[1] || "").trim();

    const openMatch = text.match(FAUNA_TOOL_CALL_OPEN_RE);
    if (!openMatch) {
        const jsonText = extractFirstJsonObjectText(text);
        return /"?(?:tool|name)"?\s*:/i.test(jsonText) ? jsonText : "";
    }

    return extractFirstJsonObjectText(text.slice(openMatch.index + openMatch[0].length));
}

function parseFaunaToolCall(content) {
    return parseFaunaToolCalls(content)[0] || null;
}

function parseFaunaToolCalls(content) {
    const text = normalizeAssistantControlMarkup(content);
    const calls = [];
    const seenPayloads = new Set();
    const addPayload = payload => {
        const cleanPayload = String(payload || "").trim();
        if (!cleanPayload || seenPayloads.has(cleanPayload)) return;
        seenPayloads.add(cleanPayload);
        try {
            const parsed = JSON.parse(cleanPayload);
            if (!parsed || typeof parsed !== "object") return;
            const tool = normalizeFaunaToolName(parsed.tool || parsed.name);
            if (!tool) return;
            calls.push({ ...parsed, tool });
        } catch {
            // Ignore malformed tool blocks so the assistant can answer normally.
        }
    };

    text.matchAll(FAUNA_TOOL_CALLS_RE).forEach(match => addPayload(match[1]));
    if (calls.length > 0) return calls;

    const payload = extractFaunaToolCallPayload(content);
    addPayload(payload);
    return calls;
}

function parseProviderToolArguments(value) {
    if (!value) return {};
    if (typeof value === "object") return { ...value };
    if (typeof value !== "string") return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function normalizeProviderToolCall(name, args = {}, metadata = {}) {
    const tool = normalizeFaunaToolName(name);
    if (!tool) return null;
    return {
        ...parseProviderToolArguments(args),
        tool,
        __faunaProviderToolCall: true,
        __faunaToolCallId: metadata.callId || metadata.id || ""
    };
}

function extractOpenAiResponseToolCalls(data) {
    const calls = [];
    (data?.output || []).forEach(item => {
        if (item?.type !== "function_call") return;
        const normalized = normalizeProviderToolCall(item.name, item.arguments, {
            callId: item.call_id,
            id: item.id
        });
        if (normalized) calls.push(normalized);
    });
    return calls;
}

function extractOllamaChatToolCalls(data) {
    const calls = [];
    (data?.message?.tool_calls || []).forEach(item => {
        const fn = item?.function || {};
        const normalized = normalizeProviderToolCall(fn.name || item.name, fn.arguments || item.arguments, {
            id: item.id
        });
        if (normalized) calls.push(normalized);
    });
    return calls;
}

function getFaunaToolCallsFromAssistantData(data) {
    if (Array.isArray(data?.__faunaToolCalls) && data.__faunaToolCalls.length > 0) {
        return data.__faunaToolCalls
            .map(call => normalizeProviderToolCall(call.tool || call.name, call, {
                callId: call.__faunaToolCallId,
                id: call.id
            }))
            .filter(Boolean);
    }

    const openAiCalls = extractOpenAiResponseToolCalls(data);
    if (openAiCalls.length > 0) return openAiCalls;

    const ollamaCalls = extractOllamaChatToolCalls(data);
    if (ollamaCalls.length > 0) return ollamaCalls;

    return parseFaunaToolCalls(data?.message?.content || "");
}

function getAssistantToolPlaceholder(toolCall) {
    if (!toolCall?.tool) return "Fauna requested a tool.";
    if (isThinkingToolName(toolCall.tool)) return "Fauna is thinking through the next step.";
    if (isImageToolName(toolCall.tool)) return "Fauna requested image generation.";
    if (isWebToolName(toolCall.tool)) return "Fauna requested a web tool.";
    if (isLocationToolName(toolCall.tool)) return "Fauna requested location or weather.";
    if (isTimeToolName(toolCall.tool)) return "Fauna requested a timer or stopwatch.";
    if (isMemoryToolName(toolCall.tool)) return "Fauna requested memory access.";
    return "Fauna requested a local workspace tool.";
}

function stripFaunaToolCall(content) {
    return normalizeAssistantControlMarkup(content)
        .replace(FAUNA_TOOL_CALLS_RE, "")
        .replace(FAUNA_TOOL_CALL_OPEN_TO_END_RE, "")
        .trim();
}

function normalizeFaunaToolPathForSignature(value) {
    const path = cleanWorkspaceToolPath(value).replace(/\\/g, "/").replace(/^\.\//, "");
    return path || ".";
}

function getFaunaToolCallSignature(toolCall = {}) {
    const tool = normalizeFaunaToolName(toolCall.tool || toolCall.name);
    if (!tool) return "";

    if (tool === "workspace_tree") {
        return JSON.stringify({
            tool,
            path: normalizeFaunaToolPathForSignature(toolCall.path || "."),
            depth: Math.max(0, Math.min(5, Number(toolCall.depth) || 2))
        });
    }
    if (tool === "read_file") {
        return JSON.stringify({
            tool,
            path: normalizeFaunaToolPathForSignature(toolCall.path || ".")
        });
    }
    if (tool === "read_files") {
        const paths = Array.isArray(toolCall.paths) ? toolCall.paths : String(toolCall.paths || toolCall.path || "").split(",");
        return JSON.stringify({
            tool,
            paths: paths.map(path => normalizeFaunaToolPathForSignature(path)).filter(Boolean).slice(0, 8)
        });
    }
    if (tool === "write_file" || tool === "append_file") {
        return JSON.stringify({
            tool,
            path: normalizeFaunaToolPathForSignature(toolCall.path || "."),
            content: String(toolCall.content ?? toolCall.text ?? toolCall.body ?? "")
        });
    }
    if (tool === "make_directory") {
        return JSON.stringify({
            tool,
            path: normalizeFaunaToolPathForSignature(toolCall.path || ".")
        });
    }
    if (tool === "search_files") {
        return JSON.stringify({
            tool,
            query: normalizeWorkspaceSearchQuery(toolCall),
            path: normalizeFaunaToolPathForSignature(toolCall.path || "."),
            include: getWorkspaceSearchInclude(toolCall).join(","),
            depth: Math.max(0, Math.min(5, Number(toolCall.depth) || 5))
        });
    }
    if (tool === "search_text") {
        return JSON.stringify({
            tool,
            query: normalizeWorkspaceSearchQuery(toolCall),
            path: normalizeFaunaToolPathForSignature(toolCall.path || "."),
            include: getWorkspaceSearchInclude(toolCall).join(","),
            caseSensitive: Boolean(toolCall.caseSensitive),
            regex: Boolean(toolCall.regex || toolCall.regexp)
        });
    }
    if (tool === "run_command") {
        return JSON.stringify({
            tool,
            command: String(toolCall.command || "").trim(),
            cwd: normalizeFaunaToolPathForSignature(toolCall.cwd || ".")
        });
    }
    if (tool === "web_search") {
        return JSON.stringify({
            tool,
            query: String(toolCall.query || toolCall.text || toolCall.prompt || "").trim()
        });
    }
    if (tool === "inspect_url") {
        return JSON.stringify({
            tool,
            url: String(toolCall.url || toolCall.href || toolCall.link || "").trim()
        });
    }
    if (tool === "get_ip_location") {
        return JSON.stringify({ tool });
    }
    if (tool === "current_weather") {
        const coordinates = getToolCallCoordinates(toolCall);
        return JSON.stringify({
            tool,
            latitude: coordinates ? Number(coordinates.latitude).toFixed(4) : "approx-ip",
            longitude: coordinates ? Number(coordinates.longitude).toFixed(4) : "approx-ip"
        });
    }
    if (tool === "wait") {
        return JSON.stringify({
            tool,
            durationMs: getToolCallDurationMs(toolCall)
        });
    }
    if (tool === "wait_for") {
        return JSON.stringify({
            tool,
            command: String(toolCall.command || toolCall.cmd || "").trim(),
            cwd: normalizeFaunaToolPathForSignature(toolCall.cwd || "."),
            maxMs: getToolCallDurationMs(toolCall, {
                fallbackMs: WAIT_FOR_COMMAND_DEFAULT_MAX_MS,
                maxMs: WAIT_FOR_COMMAND_MAX_MS,
                prefix: "max"
            }),
            intervalMs: getWaitForCommandIntervalMs(toolCall),
            contains: String(toolCall.contains || toolCall.match || toolCall.stdoutContains || "").trim(),
            expectedExitCode: String(toolCall.expectedExitCode ?? toolCall.exitCode ?? 0)
        });
    }
    if (tool === "stopwatch") {
        return JSON.stringify({
            tool,
            mode: String(toolCall.mode || toolCall.until || toolCall.target || toolCall.waitFor || "").trim().toLowerCase(),
            command: String(toolCall.command || toolCall.cmd || toolCall.shell || "").trim(),
            cwd: normalizeFaunaToolPathForSignature(toolCall.cwd || "."),
            durationMs: getToolCallDurationMs(toolCall, { fallbackMs: 0 }),
            prompt: String(toolCall.prompt || toolCall.question || "").trim(),
            label: getStopwatchLabel(toolCall)
        });
    }
    if (tool === "read_memories") {
        return JSON.stringify({
            tool,
            query: String(toolCall.query || toolCall.text || "").trim()
        });
    }
    if (tool === "save_memory") {
        return JSON.stringify({
            tool,
            text: normalizeMemoryText(toolCall.text || toolCall.memory || toolCall.content || toolCall.value)
        });
    }
    if (tool === "delete_memory") {
        return JSON.stringify({
            tool,
            target: String(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "").trim()
        });
    }
    if (tool === "thinking") {
        return JSON.stringify({
            tool,
            summary: String(toolCall.summary || toolCall.reason || toolCall.plan || toolCall.text || "").trim()
        });
    }

    return JSON.stringify({ tool });
}

function isThinkingToolName(toolName) {
    return THINKING_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isMemoryToolName(toolName) {
    return MEMORY_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isImageToolName(toolName) {
    return IMAGE_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isWebToolName(toolName) {
    return WEB_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isLocationToolName(toolName) {
    return LOCATION_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function isTimeToolName(toolName) {
    return TIME_TOOL_NAMES.has(normalizeFaunaToolName(toolName));
}

function getToolDetailSnippet(value, maxLength = 84) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function getFaunaToolProgressLabel(toolCall) {
    if (toolCall?.tool === "thinking") return "Thinking through next steps...";
    if (toolCall?.tool === "generate_image") return "Generating image...";
    if (toolCall?.tool === "web_search") return "Searching the web...";
    if (toolCall?.tool === "inspect_url") return "Inspecting site...";
    if (toolCall?.tool === "get_ip_location") return "Checking approximate location...";
    if (toolCall?.tool === "current_weather") return "Checking local weather...";
    if (toolCall?.tool === "wait") return "Waiting...";
    if (toolCall?.tool === "wait_for") return toolCall.command || toolCall.cmd ? "Waiting for command..." : "Waiting...";
    if (toolCall?.tool === "stopwatch") {
        if (toolCall.command || toolCall.cmd || toolCall.shell) return "Timing command...";
        if (shouldStopwatchWaitForUserInput(toolCall)) return "Starting stopwatch...";
        return "Timing stopwatch...";
    }
    if (toolCall?.tool === "read_memories") return "Reading saved memories...";
    if (toolCall?.tool === "save_memory") return "Saving memory...";
    if (toolCall?.tool === "delete_memory") return "Updating memories...";
    if (toolCall?.tool === "run_command") return "Running local terminal command...";
    if (toolCall?.tool === "read_file") return "Reading local file...";
    if (toolCall?.tool === "read_files") return "Reading local files...";
    if (toolCall?.tool === "write_file") return "Writing local file...";
    if (toolCall?.tool === "append_file") return "Appending local file...";
    if (toolCall?.tool === "make_directory") return "Creating local directory...";
    if (toolCall?.tool === "search_files") return "Searching local files...";
    if (toolCall?.tool === "search_text") return "Searching local text...";
    return "Inspecting local workspace...";
}

function getFaunaToolActivityKind(toolCall) {
    if (isThinkingToolName(toolCall?.tool)) return "thinking";
    if (isImageToolName(toolCall?.tool)) return "image";
    if (isWebToolName(toolCall?.tool)) return "web";
    if (isLocationToolName(toolCall?.tool)) return "location";
    if (isTimeToolName(toolCall?.tool)) return "timer";
    if (isMemoryToolName(toolCall?.tool)) return "memory";
    if (toolCall?.tool === "run_command") return "terminal";
    if (toolCall?.tool === "read_file" || toolCall?.tool === "read_files") return "file";
    if (toolCall?.tool === "write_file" || toolCall?.tool === "append_file" || toolCall?.tool === "make_directory") return "file";
    if (toolCall?.tool === "search_files" || toolCall?.tool === "search_text") return "search";
    return "workspace";
}

function getFaunaToolActivityLabel(toolCall) {
    if (isThinkingToolName(toolCall?.tool)) return "Thinking";
    if (isImageToolName(toolCall?.tool)) return "Image generation";
    if (isWebToolName(toolCall?.tool)) return "Web";
    if (isLocationToolName(toolCall?.tool)) return "Location";
    if (isTimeToolName(toolCall?.tool)) return "Timer";
    if (isMemoryToolName(toolCall?.tool)) return "Memory";
    return "Local workspace";
}

function getFaunaToolActivityDetail(toolCall) {
    if (toolCall?.tool === "thinking") return getToolDetailSnippet(toolCall.summary || toolCall.reason || toolCall.plan || toolCall.text || "Reset step counter");
    if (toolCall?.tool === "generate_image") return getToolDetailSnippet(toolCall.prompt || toolCall.description || toolCall.text || "Generated image");
    if (toolCall?.tool === "web_search") return getToolDetailSnippet(toolCall.query || toolCall.text || "Search");
    if (toolCall?.tool === "inspect_url") return getToolDetailSnippet(toolCall.url || toolCall.href || toolCall.link || "URL");
    if (toolCall?.tool === "get_ip_location") return "Approximate public-IP location";
    if (toolCall?.tool === "current_weather") return getToolCallCoordinates(toolCall)
        ? "Current weather for coordinates"
        : "Current weather near me";
    if (toolCall?.tool === "wait") return `Wait ${formatDuration(getToolCallDurationMs(toolCall))}`;
    if (toolCall?.tool === "wait_for") return toolCall.command || toolCall.cmd
        ? getToolDetailSnippet(toolCall.command || toolCall.cmd || "Command")
        : `Wait ${formatDuration(getToolCallDurationMs(toolCall))}`;
    if (toolCall?.tool === "stopwatch") {
        if (toolCall.command || toolCall.cmd || toolCall.shell) return getToolDetailSnippet(toolCall.command || toolCall.cmd || toolCall.shell);
        if (shouldStopwatchWaitForUserInput(toolCall)) return getStopwatchLabel(toolCall);
        return `Stopwatch ${formatDuration(getToolCallDurationMs(toolCall, { fallbackMs: 0 }))}`;
    }
    if (toolCall?.tool === "read_memories") return toolCall.query ? `Search: ${toolCall.query}` : "Saved memories";
    if (toolCall?.tool === "save_memory") return getToolDetailSnippet(toolCall.text || toolCall.memory || toolCall.content || toolCall.value || "New memory");
    if (toolCall?.tool === "delete_memory") return getToolDetailSnippet(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "Memory");
    if (toolCall?.tool === "run_command") return toolCall.command || "Local command";
    if (toolCall?.tool === "workspace_tree") {
        const path = String(toolCall.path || ".").trim();
        return !path || path === "." || path === "./" ? "List workspace" : `List ${getToolDetailSnippet(path)}`;
    }
    if (toolCall?.tool === "read_file") return toolCall.path || "Local file";
    if (toolCall?.tool === "read_files") {
        const paths = Array.isArray(toolCall.paths) ? toolCall.paths : String(toolCall.paths || "").split(",");
        return getToolDetailSnippet(paths.filter(Boolean).join(", ") || "Local files");
    }
    if (toolCall?.tool === "write_file" || toolCall?.tool === "append_file" || toolCall?.tool === "make_directory") return toolCall.path || "Local path";
    if (toolCall?.tool === "search_files") return getToolDetailSnippet(normalizeWorkspaceSearchQuery(toolCall) || toolCall.path || "Files");
    if (toolCall?.tool === "search_text") return getToolDetailSnippet(normalizeWorkspaceSearchQuery(toolCall) || "Text");
    return toolCall?.path || ".";
}

function getFaunaToolActivityInput(toolCall) {
    if (toolCall?.tool === "thinking") return String(toolCall.summary || toolCall.reason || toolCall.plan || toolCall.text || "").trim();
    if (toolCall?.tool === "generate_image") return String(toolCall.prompt || toolCall.description || toolCall.text || "").trim();
    if (toolCall?.tool === "web_search") return String(toolCall.query || toolCall.text || toolCall.prompt || "").trim();
    if (toolCall?.tool === "inspect_url") return String(toolCall.url || toolCall.href || toolCall.link || "").trim();
    if (toolCall?.tool === "get_ip_location") return "";
    if (toolCall?.tool === "current_weather") {
        const coordinates = getToolCallCoordinates(toolCall);
        return coordinates
            ? [formatCoordinate(coordinates.latitude), formatCoordinate(coordinates.longitude)].filter(Boolean).join(", ")
            : "Approximate location";
    }
    if (toolCall?.tool === "wait") return formatDuration(getToolCallDurationMs(toolCall));
    if (toolCall?.tool === "wait_for") return String(toolCall.command || toolCall.cmd || formatDuration(getToolCallDurationMs(toolCall))).trim();
    if (toolCall?.tool === "stopwatch") {
        if (toolCall.command || toolCall.cmd || toolCall.shell) return String(toolCall.command || toolCall.cmd || toolCall.shell).trim();
        if (shouldStopwatchWaitForUserInput(toolCall)) return String(toolCall.prompt || toolCall.question || getStopwatchLabel(toolCall)).trim();
        return formatDuration(getToolCallDurationMs(toolCall, { fallbackMs: 0 }));
    }
    if (toolCall?.tool === "read_memories") return String(toolCall.query || toolCall.text || "").trim();
    if (toolCall?.tool === "save_memory") return normalizeMemoryText(toolCall.text || toolCall.memory || toolCall.content || toolCall.value);
    if (toolCall?.tool === "delete_memory") return String(toolCall.target || toolCall.id || toolCall.index || toolCall.text || "").trim();
    if (toolCall?.tool === "run_command") return String(toolCall.command || "").trim();
    if (toolCall?.tool === "read_file") return String(toolCall.path || "").trim();
    if (toolCall?.tool === "read_files") return (Array.isArray(toolCall.paths) ? toolCall.paths : String(toolCall.paths || "").split(",")).filter(Boolean).join(", ");
    if (toolCall?.tool === "write_file" || toolCall?.tool === "append_file" || toolCall?.tool === "make_directory") return String(toolCall.path || "").trim();
    if (toolCall?.tool === "search_files" || toolCall?.tool === "search_text") return normalizeWorkspaceSearchQuery(toolCall);
    return String(toolCall?.path || ".").trim();
}

async function executeFaunaToolCall(toolCall, signal = null) {
    if (isImageToolName(toolCall?.tool)) {
        throw new Error("Image generation tools need a visible chat target.");
    }

    if (isThinkingToolName(toolCall?.tool)) {
        const summary = String(toolCall.summary || toolCall.reason || toolCall.plan || toolCall.text || "").trim();
        return {
            text: [
                "Thinking step recorded. The consecutive tool-step counter has been reset.",
                summary ? `Summary: ${summary}` : "",
                "Continue with the next useful tool call or answer the user."
            ].filter(Boolean).join("\n")
        };
    }

    if (isMemoryToolName(toolCall?.tool)) {
        return executeMemoryToolCall(toolCall);
    }

    if (isWebToolName(toolCall?.tool)) {
        if (toolCall.tool === "web_search") {
            const query = String(toolCall.query || toolCall.text || toolCall.prompt || "").trim();
            if (!query) throw new Error("web_search requires a query.");
            const result = await getWebContextForPrompt(query, signal, { inspectUrls: false });
            const text = result.context
                ? result.context.replace(/\n?--- Web Search Context ---\n?|\n?--- End Web Search Context ---\n?/g, "").trim()
                : `No web results were available for "${query}".`;
            return {
                text,
                sources: result.sources || []
            };
        }
        if (toolCall.tool === "inspect_url") {
            const url = toolCall.url || toolCall.href || toolCall.link;
            if (!url) throw new Error("inspect_url requires a URL.");
            const page = await inspectUrlForModel(url, signal);
            const source = pageToWebSource(page);
            return {
                text: formatInspectedPageResult(page),
                sources: source ? [source] : []
            };
        }
    }

    if (isLocationToolName(toolCall?.tool)) {
        return executeLocationToolCall(toolCall, signal);
    }

    if (isTimeToolName(toolCall?.tool)) {
        if (toolCall.tool === "stopwatch") {
            return executeStopwatchToolCall(toolCall, signal);
        }
        return toolCall.tool === "wait_for"
            ? executeWaitForCommandToolCall(toolCall, signal)
            : executeWaitToolCall(toolCall, signal);
    }

    if (!WORKSPACE_TOOL_NAMES.has(toolCall?.tool)) {
        throw new Error("Unknown Fauna tool.");
    }
    if (!hasWorkspaceBridgeAccess()) {
        throw new Error("Local workspace bridge is not configured or enabled.");
    }
    const bridgeOptions = getWorkspaceToolBridgeOptions(signal);
    if (toolCall.tool === "workspace_tree") {
        return formatWorkspaceTreeResult(await listWorkspaceTree(toolCall.path || ".", toolCall.depth || 2, signal, 220, bridgeOptions));
    }
    if (toolCall.tool === "search_files") {
        return formatWorkspaceFileSearchResult(await searchWorkspaceFiles(toolCall, signal, bridgeOptions));
    }
    if (toolCall.tool === "search_text") {
        return formatWorkspaceTextSearchResult(await searchWorkspaceText(toolCall, signal, bridgeOptions));
    }
    if (toolCall.tool === "read_file") {
        if (!toolCall.path) throw new Error("read_file requires a path.");
        return formatWorkspaceFileResult(await readWorkspaceFile(toolCall.path, signal, bridgeOptions));
    }
    if (toolCall.tool === "read_files") {
        return readWorkspaceFiles(toolCall.paths || toolCall.path || [], signal, bridgeOptions);
    }
    if (toolCall.tool === "write_file" || toolCall.tool === "append_file") {
        if (!toolCall.path) throw new Error(`${toolCall.tool} requires a path.`);
        const content = toolCall.content ?? toolCall.text ?? toolCall.body ?? "";
        if (typeof confirmWorkspaceWriteWithDiff === "function") {
            await confirmWorkspaceWriteWithDiff(toolCall, signal, bridgeOptions);
        }
        return formatWorkspaceWriteResult(await writeWorkspaceFile(toolCall.path, content, signal, bridgeOptions, toolCall.tool === "append_file"));
    }
    if (toolCall.tool === "make_directory") {
        if (!toolCall.path) throw new Error("make_directory requires a path.");
        return formatWorkspaceDirectoryResult(await makeWorkspaceDirectory(toolCall.path, signal, bridgeOptions));
    }
    if (toolCall.tool === "run_command") {
        if (!toolCall.command) throw new Error("run_command requires a command.");
        return formatWorkspaceCommandResult(await runWorkspaceCommand(toolCall.command, toolCall.cwd || ".", toolCall.timeout || 20, signal, bridgeOptions));
    }
    throw new Error("Unknown local tool.");
}

async function retryImageToolCallInBubble(target, request, visibleText = "") {
    if (isGenerating || !target) return;
    if (isActiveChatArchived()) {
        showToast("Archived chats are read-only. Restore the chat before retrying.", "warning");
        return;
    }

    const generationSession = ensureWritableActiveChatSession();
    if (!generationSession) return;
    const generationSessionId = generationSession.id;
    const runHistory = cloneConversationHistory(conversationHistory);
    let runTokenTotal = sessionTotalTokens;
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    setGeneratingBusy(true, { sessionId: generationSessionId, controller: generationController });
    prepareBubbleForRetry(target);

    const activity = createImageGenerationToolActivity(target, {
        title: "Generating image",
        detail: request.style ? `Generate ${request.style} image` : "Generate image",
        meta: "Preparing",
        prompt: request.prompt,
        options: request
    });

    try {
        const generated = await generateImageIntoBubble(target, request.prompt, {
            signal: generationSignal,
            options: request,
            activity,
            label: "Generated image",
            sessionId: generationSessionId
        });
        const historyContent = getGeneratedImageHistoryContent("Generated image", generated.prompt);
        const content = [String(visibleText || "").trim(), historyContent].filter(Boolean).join("\n\n");
        let messageIndex = updateAssistantHistoryForBubble(target, content);
        if (messageIndex !== null && runHistory[messageIndex]?.role === "assistant") {
            runHistory[messageIndex] = {
                ...runHistory[messageIndex],
                content,
                createdAt: new Date().toISOString()
            };
        }
        if (messageIndex === null) {
            runHistory.push({
                role: "assistant",
                content,
                createdAt: new Date().toISOString()
            });
            messageIndex = runHistory.length - 1;
        }
        setupAssistantActions(target.parentElement, getGeneratedMediaCopyText(generated.imageUrl, content), {
            messageIndex,
            canFork: true
        });
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
        showToast("Image generation retried.", "success");
    } catch (err) {
        updateImageGenerationToolActivity(activity, err.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(target, err, {
            title: err.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: getImageGenerationFailureMessage(err),
            retryLabel: "Retry generation",
            onRetry: () => retryImageToolCallInBubble(target, request, visibleText)
        });
    } finally {
        finishChatGeneration(generationSessionId, generationController);
        updateTokenDisplay();
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
    }
}

async function executeImageGenerationToolCall(toolCall, signal = null, {
    progressTarget = null,
    visibleText = ""
} = {}) {
    const request = normalizeImageGenerationToolCall(toolCall);
    if (!request.prompt) {
        throw new Error("generate_image requires a prompt.");
    }

    let anchorBubble = progressTarget;
    if (!anchorBubble) {
        anchorBubble = addRenderNode("__thinking__", "output");
    }

    const cleanVisibleText = String(visibleText || "").trim();
    let imageBubble = anchorBubble;
    if (cleanVisibleText) {
        renderAssistantContentHtml(anchorBubble, renderMarkdown(cleanVisibleText), { final: true, busy: false });
        imageBubble = createSiblingBubble(anchorBubble) || anchorBubble;
        imageBubble.innerHTML = getThinkingBubbleMarkup();
    }

    const activity = createImageGenerationToolActivity(anchorBubble, {
        title: "Generating image",
        detail: request.style ? `Generate ${request.style} image` : "Generate image",
        meta: "Preparing",
        prompt: request.prompt,
        options: request
    });

    try {
        const generated = await generateImageIntoBubble(imageBubble, request.prompt, {
            signal,
            options: request,
            activity,
            label: "Generated image",
            sessionId: getGenerationSessionIdForSignal(signal)
        });
        const historyContent = getGeneratedImageHistoryContent("Generated image", generated.prompt);
        return {
            ok: true,
            imageUrl: generated.imageUrl,
            prompt: generated.prompt,
            historyContent,
            content: [cleanVisibleText, historyContent].filter(Boolean).join("\n\n")
        };
    } catch (err) {
        updateImageGenerationToolActivity(activity, err.name === "AbortError" ? "Stopped" : "Failed", "done");
        renderErrorCard(imageBubble, err, {
            title: err.name === "AbortError" ? "Image generation stopped" : "Image generation failed",
            message: getImageGenerationFailureMessage(err),
            retryLabel: "Retry generation",
            onRetry: () => retryImageToolCallInBubble(imageBubble, request, cleanVisibleText)
        });
        return {
            ok: false,
            content: cleanVisibleText || "I tried to generate the image, but it failed.",
            historyContent: `Image generation failed: ${err.message}`
        };
    }
}

function formatFaunaToolResultForModel(toolCall, resultText) {
    const isThinkingTool = isThinkingToolName(toolCall?.tool);
    const isMemoryTool = isMemoryToolName(toolCall?.tool);
    const isWebTool = isWebToolName(toolCall?.tool);
    const isLocationTool = isLocationToolName(toolCall?.tool);
    const isTimeTool = isTimeToolName(toolCall?.tool);
    const label = isThinkingTool
        ? "Thinking tool result"
        : isMemoryTool
            ? "Memory tool result"
            : isWebTool
            ? "Web tool result"
            : isLocationTool
                ? "Location/weather tool result"
                : isTimeTool
                    ? "Timer/wait tool result"
                    : "Local workspace tool result";
    const instruction = isThinkingTool
        ? "The consecutive tool-step counter has reset. Continue with the next useful tool call or answer the user without repeating unnecessary work."
        : isMemoryTool
            ? "Use this result to answer the user's original memory request. If memory changed, acknowledge it briefly."
            : isWebTool
            ? "Use this web result to answer the user's original request. Cite the URLs used, and say if search or inspection was insufficient."
            : isLocationTool
                ? "Use this result to answer the user's original request. Mention that IP-based location is approximate when relevant, and cite source URLs if present."
                : isTimeTool
                    ? "Use this result to answer the user's original request. If a wait_for command timed out, say that clearly and include the relevant command outcome. For stopwatch results, report the elapsed time plainly."
                    : "Use this result to answer the user's original request. If the tool failed or was insufficient, say what is missing.";
    return `[${label}]\nTool: ${toolCall.tool}\n${trimLocalToolText(resultText)}\n\n${instruction}`;
}

function formatDuplicateFaunaToolResultForModel(toolCall, resultText) {
    return [
        formatFaunaToolResultForModel(toolCall, resultText),
        "",
        "[Fauna note]",
        "This exact tool call already ran in this turn. Do not request it again. Answer the user's original request now using the result above."
    ].join("\n");
}

function buildFaunaToolLimitMessage(toolResultsBySignature) {
    const toolResults = Array.from(toolResultsBySignature?.values?.() || []);
    const latest = toolResults[toolResults.length - 1];
    if (!latest?.resultText) {
        return "I reached the Fauna tool limit before forming a final answer. Try asking for one tool-backed step at a time.";
    }

    const detail = getFaunaToolActivityDetail(latest.toolCall);
    return [
        `I inspected ${detail}, but reached the tool-call limit before a final answer.`,
        "",
        trimLocalToolText(latest.resultText, FAUNA_TOOL_FALLBACK_RESULT_MAX_CHARS)
    ].join("\n");
}

function buildAssistantSystemPrompt(allowLocalTools = false, requireChatTitle = false, allowWebTools = false, allowToolCalls = true, allowLocationTools = false, workspaceAccessPolicy = getEffectiveWorkspaceAccessPolicy(), sessionId = activeSessionId) {
    return [
        CODE_BLOCK_SYSTEM_PROMPT,
        requireChatTitle ? CHAT_TITLE_SYSTEM_PROMPT : "",
        CLARIFYING_QUESTION_SYSTEM_PROMPT,
        typeof buildAgentTaskModeSystemPrompt === "function" ? buildAgentTaskModeSystemPrompt(sessionId) : "",
        allowToolCalls ? AGENT_LOOP_SYSTEM_PROMPT : "",
        allowToolCalls ? IMAGE_TOOL_SYSTEM_PROMPT : "",
        allowToolCalls && allowWebTools ? WEB_TOOL_SYSTEM_PROMPT : "",
        allowToolCalls ? buildRuntimeToolSystemPrompt(allowLocationTools, allowLocalTools) : "",
        buildUserLocaleSystemPrompt(),
        buildPersonalizationSystemPrompt(),
        allowToolCalls ? buildMemorySystemPrompt() : "",
        allowToolCalls && allowLocalTools ? buildLocalToolSystemPrompt(workspaceAccessPolicy, sessionId) : ""
    ].filter(Boolean).join("\n\n");
}

function parseClarifyingQuestionRequest(content) {
    const match = String(content || "").match(CLARIFYING_QUESTION_RE);
    if (!match) return null;

    try {
        const payload = JSON.parse(match[1]);
        return normalizeClarifyingQuestionPayload(payload);
    } catch (err) {
        console.warn("Could not parse Fauna question request:", err);
        return null;
    }
}

function stripClarifyingQuestionRequest(content) {
    return String(content || "").replace(CLARIFYING_QUESTION_RE, "").trim();
}

function createFaunaQuestionBlock(payload) {
    return `<fauna_question>${JSON.stringify(payload || {})}</fauna_question>`;
}

function normalizeStopwatchMetadata(value) {
    if (!value || typeof value !== "object") return null;
    const parsedStartedAt = Date.parse(value.startedAt);
    const startedAtEpochMs = firstFiniteNumber(value.startedAtEpochMs, value.startTime, parsedStartedAt);
    if (startedAtEpochMs === null) return null;
    return {
        mode: String(value.mode || "user_input").trim() || "user_input",
        label: String(value.label || "Stopwatch").trim() || "Stopwatch",
        startedAtEpochMs,
        startedAt: new Date(startedAtEpochMs).toISOString()
    };
}

function normalizeQuestionOption(option) {
    if (typeof option === "string") {
        const text = option.trim();
        return text ? { label: text, value: text } : null;
    }
    if (!option || typeof option !== "object") return null;
    const label = String(option.label || option.text || option.value || "").trim();
    const value = String(option.value || label).trim();
    return label && value ? { label, value } : null;
}

function normalizeClarifyingQuestionPayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    const rawQuestions = Array.isArray(payload.questions) && payload.questions.length > 0
        ? payload.questions
        : [{
            question: payload.question || payload.prompt || payload.title,
            options: payload.options,
            allowCustom: payload.allowCustom,
            placeholder: payload.placeholder
        }];

    const questions = rawQuestions
        .map((item, index) => {
            const source = typeof item === "string" ? { question: item } : item || {};
            const question = String(source.question || source.prompt || source.title || "").trim();
            if (!question) return null;
            const options = Array.isArray(source.options)
                ? source.options.map(normalizeQuestionOption).filter(Boolean).slice(0, 5)
                : [];
            return {
                id: source.id || `question-${index + 1}`,
                question,
                options,
                allowCustom: source.allowCustom !== false,
                placeholder: String(source.placeholder || "Type your answer...").trim()
            };
        })
        .filter(Boolean)
        .slice(0, 3);

    if (questions.length === 0) return null;
    return {
        title: String(payload.title || "Fauna needs one detail").trim(),
        questions,
        ...(normalizeStopwatchMetadata(payload.stopwatch) ? { stopwatch: normalizeStopwatchMetadata(payload.stopwatch) } : {})
    };
}

