import { safeLocalStorageGet, safeLocalStorageSet } from "./storage.js";

function getInitialTheme(storageKey) {
    const saved = safeLocalStorageGet(storageKey);
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
}

const accentLabels = {
    blue: "Blue",
    orange: "Claude Orange",
    green: "Green",
    red: "Red"
};

function normalizeAccent(accent) {
    return Object.hasOwn(accentLabels, accent) ? accent : "blue";
}

export function createThemeController({
    themeToggle = document.getElementById("themeToggle"),
    mobileThemeToggle = document.getElementById("mobileThemeToggle"),
    themeLabel = document.getElementById("themeLabel"),
    accentButtons = document.querySelectorAll("[data-accent-choice]"),
    accentValue = document.getElementById("accentValue"),
    storageKey = "floraTheme",
    accentStorageKey = "floraAccent"
} = {}) {
    const apply = (theme) => {
        const normalized = theme === "light" ? "light" : "dark";
        document.documentElement.dataset.theme = normalized;
        safeLocalStorageSet(storageKey, normalized);
        const nextLabel = normalized === "dark" ? "Switch to light theme" : "Switch to dark theme";
        themeToggle?.setAttribute("aria-label", nextLabel);
        mobileThemeToggle?.setAttribute("aria-label", nextLabel);
        if (themeLabel) {
            themeLabel.textContent = normalized === "dark" ? "Dark" : "Light";
        }
    };

    const applyAccent = (accent) => {
        const normalized = normalizeAccent(accent);
        document.documentElement.dataset.accent = normalized;
        safeLocalStorageSet(accentStorageKey, normalized);
        accentButtons.forEach(button => {
            const isActive = button.dataset.accentChoice === normalized;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-checked", String(isActive));
        });
        if (accentValue) {
            accentValue.textContent = accentLabels[normalized];
        }
    };

    const toggle = () => {
        const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
        apply(current === "dark" ? "light" : "dark");
    };

    const init = () => {
        apply(getInitialTheme(storageKey));
        applyAccent(safeLocalStorageGet(accentStorageKey));
        themeToggle?.addEventListener("click", toggle);
        mobileThemeToggle?.addEventListener("click", toggle);
        accentButtons.forEach(button => {
            button.addEventListener("click", () => applyAccent(button.dataset.accentChoice));
            button.addEventListener("keydown", (event) => {
                if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                event.preventDefault();
                const choices = Array.from(accentButtons);
                const currentIndex = choices.indexOf(button);
                const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
                const nextButton = choices[(currentIndex + direction + choices.length) % choices.length];
                nextButton.focus();
                applyAccent(nextButton.dataset.accentChoice);
            });
        });
    };

    return { apply, applyAccent, init, toggle };
}
