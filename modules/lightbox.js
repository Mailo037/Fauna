export function createImageLightbox({
    root = document.getElementById("imageLightbox")
} = {}) {
    const image = root?.querySelector(".image-lightbox-img");
    const closeButton = root?.querySelector(".image-lightbox-close");

    const open = (src) => {
        if (!root || !image) return;
        image.src = src;
        root.hidden = false;
        root.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    };

    const close = () => {
        if (!root || !image) return;
        root.hidden = true;
        root.setAttribute("aria-hidden", "true");
        image.src = "";
        document.body.style.overflow = "";
    };

    closeButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        close();
    });
    root?.addEventListener("click", close);
    image?.addEventListener("click", (event) => event.stopPropagation());
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && root && !root.hidden) close();
    });

    return { open, close };
}
