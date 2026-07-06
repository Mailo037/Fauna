import { safeLocalStorageGet, safeLocalStorageSet } from "./storage.js";

export function createSidebarController({
    sidebar = document.getElementById("sidebar"),
    overlay = document.getElementById("sidebarOverlay"),
    toggles = document.querySelectorAll(".sidebar-toggle-btn"),
    collapseToggle = document.getElementById("sidebarCollapseToggle"),
    windowToggle = null,
    maximizeToggle = null,
    storageKey = "faunaSidebar",
    maximizeStorageKey = "faunaSidebarSize"
} = {}) {
    const desktopQuery = window.matchMedia?.("(min-width: 769px)");
    let isMaximized = safeLocalStorageGet(maximizeStorageKey) === "maximized";

    const isDesktop = () => desktopQuery?.matches ?? window.innerWidth > 768;

    const setButtonState = (button, {
        expanded = null,
        pressed = null,
        label = "",
        tooltip = ""
    } = {}) => {
        if (!button) return;
        if (expanded !== null) button.setAttribute("aria-expanded", String(expanded));
        if (pressed !== null) button.setAttribute("aria-pressed", String(pressed));
        if (label) button.setAttribute("aria-label", label);
        if (tooltip) button.dataset.tooltip = tooltip;
    };

    const syncControls = () => {
        if (!sidebar) return;
        const collapsed = sidebar.classList.contains("collapsed");
        const expanded = !collapsed;
        setButtonState(collapseToggle, {
            expanded,
            label: collapsed ? "Show sidebar" : "Hide sidebar",
            tooltip: collapsed ? "Show sidebar" : "Hide sidebar"
        });
        setButtonState(windowToggle, {
            expanded,
            label: collapsed ? "Show sidebar" : "Hide sidebar",
            tooltip: collapsed ? "Show sidebar" : "Hide sidebar"
        });
        setButtonState(maximizeToggle, {
            pressed: isMaximized && expanded,
            label: isMaximized ? "Restore sidebar" : "Maximize sidebar",
            tooltip: isMaximized ? "Restore sidebar" : "Maximize sidebar"
        });
        if (maximizeToggle) {
            maximizeToggle.hidden = collapsed || !isDesktop();
        }
    };

    const applySidebarSize = () => {
        if (!sidebar) return;
        const active = isMaximized && isDesktop() && !sidebar.classList.contains("collapsed");
        sidebar.classList.toggle("maximized", active);
        document.documentElement.dataset.sidebarSize = active ? "maximized" : "compact";
        syncControls();
    };

    const setCollapsed = (collapsed, { persist = true } = {}) => {
        if (!sidebar) return;
        sidebar.classList.toggle("collapsed", collapsed);
        document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
        applySidebarSize();
        if (persist) {
            safeLocalStorageSet(storageKey, collapsed ? "collapsed" : "expanded");
        }
        syncControls();
    };

    const open = () => {
        if (isDesktop()) {
            setCollapsed(false);
            return;
        }
        sidebar?.classList.add("open");
        overlay?.classList.add("show");
        setButtonState(windowToggle, {
            expanded: true,
            label: "Hide sidebar",
            tooltip: "Hide sidebar"
        });
    };

    const close = () => {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
        if (!isDesktop()) {
            setButtonState(windowToggle, {
                expanded: false,
                label: "Show sidebar",
                tooltip: "Show sidebar"
            });
        }
    };

    const toggleCollapsed = () => {
        setCollapsed(!sidebar?.classList.contains("collapsed"));
    };

    const toggleMaximized = () => {
        if (!sidebar || sidebar.classList.contains("collapsed") || !isDesktop()) return;
        isMaximized = !isMaximized;
        safeLocalStorageSet(maximizeStorageKey, isMaximized ? "maximized" : "compact");
        applySidebarSize();
    };

    const init = () => {
        const saved = safeLocalStorageGet(storageKey);
        setCollapsed(isDesktop() && saved === "collapsed", { persist: false });
        applySidebarSize();
    };

    toggles.forEach(button => {
        button.addEventListener("click", open);
    });
    collapseToggle?.addEventListener("click", () => {
        if (isDesktop()) {
            toggleCollapsed();
            return;
        }
        close();
    });
    windowToggle?.addEventListener("click", () => {
        if (isDesktop()) {
            toggleCollapsed();
            return;
        }
        if (sidebar?.classList.contains("open")) {
            close();
        } else {
            open();
        }
    });
    maximizeToggle?.addEventListener("click", toggleMaximized);
    overlay?.addEventListener("click", close);
    desktopQuery?.addEventListener("change", init);
    init();

    return { open, close, setCollapsed, toggleCollapsed, toggleMaximized };
}
