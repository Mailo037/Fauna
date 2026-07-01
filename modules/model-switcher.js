export function createModelSwitcher({
    host = document.getElementById("modelSwitcherHost"),
    button = document.getElementById("modelBtn"),
    dropdown = document.getElementById("modelDropdown"),
    label = document.getElementById("modelLabel"),
    models = [],
    activeModel,
    onSelect
} = {}) {
    const selectTemplate = document.getElementById("customSelectTemplate");
    const optionTemplate = document.getElementById("customSelectOptionTemplate");

    if (host && selectTemplate) {
        const select = selectTemplate.content.firstElementChild.cloneNode(true);
        button = select.querySelector(".custom-select-button");
        dropdown = select.querySelector(".custom-select-list");
        label = select.querySelector(".custom-select-value");

        select.classList.add("model-select");
        button.id = "modelBtn";
        button.classList.add("model-current");
        button.dataset.tooltip = "Choose model";
        label.id = "modelLabel";
        dropdown.id = "modelDropdown";
        dropdown.classList.add("model-dropdown");
        dropdown.setAttribute("aria-label", "Available models");

        host.replaceChildren(select);
    }

    const setOpen = (isOpen) => {
        if (!dropdown || !button) return;
        dropdown.classList.toggle("open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
    };

    const getOptions = () => Array.from(dropdown?.querySelectorAll(".model-option") || []);

    const setActive = (model) => {
        if (label) {
            label.textContent = model;
        }
        dropdown?.querySelectorAll(".model-option").forEach(option => {
            const isActive = option.dataset.model === model;
            option.classList.toggle("active", isActive);
            option.setAttribute("aria-selected", String(isActive));
        });
    };

    if (dropdown && button) {
        models.forEach(model => {
            const option = optionTemplate
                ? optionTemplate.content.firstElementChild.cloneNode(true)
                : document.createElement("button");
            option.classList.add("model-option");
            option.type = "button";
            option.dataset.model = model;
            option.textContent = model;
            if (model === activeModel) option.classList.add("active");
            option.setAttribute("aria-selected", String(model === activeModel));

            option.addEventListener("click", () => {
                onSelect?.(model);
                setOpen(false);
                button.focus();
            });
            dropdown.appendChild(option);
        });

        button.addEventListener("click", (event) => {
            event.stopPropagation();
            setOpen(!dropdown.classList.contains("open"));
        });

        button.addEventListener("keydown", (event) => {
            if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
            event.preventDefault();
            setOpen(true);
            const activeOption = dropdown.querySelector(".model-option.active") || getOptions()[0];
            activeOption?.focus();
        });

        dropdown.addEventListener("keydown", (event) => {
            const options = getOptions();
            const currentIndex = options.indexOf(document.activeElement);
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                button.focus();
                return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const direction = event.key === "ArrowDown" ? 1 : -1;
                const nextIndex = currentIndex < 0
                    ? 0
                    : (currentIndex + direction + options.length) % options.length;
                options[nextIndex]?.focus();
                return;
            }
            if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                const targetIndex = event.key === "Home" ? 0 : options.length - 1;
                options[targetIndex]?.focus();
                return;
            }
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                document.activeElement?.click();
            }
        });

        document.addEventListener("click", (event) => {
            if (!button.contains(event.target) && !dropdown.contains(event.target)) {
                setOpen(false);
            }
        });
    }

    setActive(activeModel);

    return { setActive };
}
