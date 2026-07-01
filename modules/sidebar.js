import { safeLocalStorageGet, safeLocalStorageSet } from "./storage.js";

export function createSidebarController({
    sidebar = document.getElementById("sidebar"),
    overlay = document.getElementById("sidebarOverlay"),
    toggles = document.querySelectorAll(".sidebar-toggle-btn"),
    collapseToggle = document.getElementById("sidebarCollapseToggle"),
    storageKey = "floraSidebar"
} = {}) {
    const desktopQuery = window.matchMedia?.("(min-width: 769px)");

    const isDesktop = () => desktopQuery?.matches ?? window.innerWidth > 768;

    const setCollapsed = (collapsed, { persist = true } = {}) => {
        if (!sidebar) return;
        sidebar.classList.toggle("collapsed", collapsed);
        document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
        collapseToggle?.setAttribute("aria-expanded", String(!collapsed));
        collapseToggle?.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
        if (collapseToggle) {
            collapseToggle.dataset.tooltip = collapsed ? "Expand sidebar" : "Collapse sidebar";
        }
        if (persist) {
            safeLocalStorageSet(storageKey, collapsed ? "collapsed" : "expanded");
        }
    };

    const open = () => {
        if (isDesktop()) {
            setCollapsed(false);
            return;
        }
        sidebar?.classList.add("open");
        overlay?.classList.add("show");
    };

    const close = () => {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
    };

    const toggleCollapsed = () => {
        setCollapsed(!sidebar?.classList.contains("collapsed"));
    };

    const init = () => {
        const saved = safeLocalStorageGet(storageKey);
        setCollapsed(isDesktop() && saved === "collapsed", { persist: false });
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
    overlay?.addEventListener("click", close);
    desktopQuery?.addEventListener("change", init);
    init();

    return { open, close, setCollapsed, toggleCollapsed };
}
