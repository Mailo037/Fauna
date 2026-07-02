export function createImageLightbox({
    root = document.getElementById("imageLightbox")
} = {}) {
    const stage = root?.querySelector(".image-lightbox-stage");
    const image = root?.querySelector(".image-lightbox-img");
    const closeButton = root?.querySelector(".image-lightbox-close");
    const zoomLabel = root?.querySelector(".image-lightbox-zoom");
    const minScale = 1;
    const maxScale = 6;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let dragState = null;
    let previousBodyOverflow = "";
    let returnFocusElement = null;

    const isOpen = () => Boolean(root && !root.hidden);

    const focusElement = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        try {
            element.focus({ preventScroll: true });
        } catch {
            try {
                element.focus();
            } catch {
                return false;
            }
        }
        return document.activeElement === element;
    };

    const moveFocusOutsideRoot = () => {
        const activeElement = document.activeElement;
        if (!root || !(activeElement instanceof HTMLElement) || !root.contains(activeElement)) return;

        if (returnFocusElement && document.contains(returnFocusElement) && focusElement(returnFocusElement)) {
            return;
        }

        const hadBodyTabIndex = document.body.hasAttribute("tabindex");
        const previousBodyTabIndex = document.body.getAttribute("tabindex");
        document.body.setAttribute("tabindex", "-1");
        focusElement(document.body);
        if (hadBodyTabIndex) {
            document.body.setAttribute("tabindex", previousBodyTabIndex || "");
        } else {
            document.body.removeAttribute("tabindex");
        }
    };

    const clampPan = () => {
        if (!stage || !image) return;
        if (scale <= minScale) {
            panX = 0;
            panY = 0;
            return;
        }

        const extraX = Math.max(0, (image.clientWidth * scale - stage.clientWidth) / 2);
        const extraY = Math.max(0, (image.clientHeight * scale - stage.clientHeight) / 2);
        panX = Math.max(-extraX, Math.min(extraX, panX));
        panY = Math.max(-extraY, Math.min(extraY, panY));
    };

    const render = () => {
        if (!root || !image) return;
        clampPan();
        root.style.setProperty("--lightbox-scale", String(scale));
        root.style.setProperty("--lightbox-pan-x", `${Math.round(panX)}px`);
        root.style.setProperty("--lightbox-pan-y", `${Math.round(panY)}px`);
        root.classList.toggle("zoomed", scale > minScale);
        if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    };

    const resetView = () => {
        scale = minScale;
        panX = 0;
        panY = 0;
        render();
    };

    const setScale = (nextScale, origin = null) => {
        const clampedScale = Math.max(minScale, Math.min(maxScale, nextScale));
        if (clampedScale === scale) return;

        if (origin && stage) {
            const rect = stage.getBoundingClientRect();
            const offsetX = origin.clientX - rect.left - rect.width / 2;
            const offsetY = origin.clientY - rect.top - rect.height / 2;
            const factor = clampedScale / scale;
            panX = offsetX - (offsetX - panX) * factor;
            panY = offsetY - (offsetY - panY) * factor;
        }

        scale = clampedScale;
        render();
    };

    const zoomBy = (delta, origin = null) => {
        setScale(scale + delta, origin);
    };

    const panBy = (deltaX, deltaY) => {
        if (scale <= minScale) return;
        panX += deltaX;
        panY += deltaY;
        render();
    };

    const open = (src) => {
        if (!root || !image) return;
        const activeElement = document.activeElement;
        returnFocusElement = activeElement instanceof HTMLElement && !root.contains(activeElement)
            ? activeElement
            : null;
        image.src = src;
        root.inert = false;
        root.hidden = false;
        root.setAttribute("aria-hidden", "false");
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        resetView();
        closeButton?.focus({ preventScroll: true });
    };

    const close = () => {
        if (!root || !image) return;
        moveFocusOutsideRoot();
        root.hidden = true;
        root.setAttribute("aria-hidden", "true");
        root.inert = true;
        root.classList.remove("panning", "zoomed");
        dragState = null;
        returnFocusElement = null;
        image.src = "";
        document.body.style.overflow = previousBodyOverflow;
        resetView();
    };

    root?.querySelectorAll("[data-lightbox-action]").forEach(button => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const action = button.dataset.lightboxAction;
            if (action === "zoom-in") zoomBy(0.5);
            if (action === "zoom-out") zoomBy(-0.5);
            if (action === "reset") resetView();
        });
    });

    closeButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        close();
    });

    root?.addEventListener("click", (event) => {
        if (event.target === root) close();
    });

    stage?.addEventListener("wheel", (event) => {
        if (!isOpen()) return;
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        zoomBy(direction * 0.35, event);
    }, { passive: false });

    stage?.addEventListener("dblclick", (event) => {
        if (!isOpen()) return;
        event.preventDefault();
        setScale(scale > minScale ? minScale : 2.5, event);
    });

    stage?.addEventListener("pointerdown", (event) => {
        if (!isOpen() || event.button !== 0 || scale <= minScale) return;
        event.preventDefault();
        dragState = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            panX,
            panY
        };
        root?.classList.add("panning");
        stage.setPointerCapture?.(event.pointerId);
    });

    stage?.addEventListener("pointermove", (event) => {
        if (!dragState || dragState.id !== event.pointerId) return;
        panX = dragState.panX + event.clientX - dragState.startX;
        panY = dragState.panY + event.clientY - dragState.startY;
        render();
    });

    const endDrag = (event) => {
        if (!dragState || dragState.id !== event.pointerId) return;
        dragState = null;
        root?.classList.remove("panning");
        stage?.releasePointerCapture?.(event.pointerId);
    };

    stage?.addEventListener("pointerup", endDrag);
    stage?.addEventListener("pointercancel", endDrag);
    image?.addEventListener("load", render);
    window.addEventListener("resize", render);

    document.addEventListener("keydown", (event) => {
        if (!isOpen()) return;

        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }

        if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            zoomBy(0.5);
            return;
        }

        if (event.key === "-" || event.key === "_") {
            event.preventDefault();
            zoomBy(-0.5);
            return;
        }

        if (event.key === "0") {
            event.preventDefault();
            resetView();
            return;
        }

        const panStep = event.shiftKey ? 160 : 80;
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            panBy(panStep, 0);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            panBy(-panStep, 0);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            panBy(0, panStep);
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            panBy(0, -panStep);
        }
    });

    return { open, close, resetView };
}
