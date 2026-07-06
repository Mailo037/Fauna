export function createModelSwitcher({
    host = document.getElementById("modelSwitcherHost"),
    button = document.getElementById("modelBtn"),
    dropdown = document.getElementById("modelDropdown"),
    label = document.getElementById("modelLabel"),
    models = [],
    activeModel,
    reasoningModes = [],
    activeReasoning,
    onReasoningSelect,
    onSelect,
    idPrefix = ""
} = {}) {
    const selectTemplate = document.getElementById("customSelectTemplate");
    const optionTemplate = document.getElementById("customSelectOptionTemplate");
    let currentModels = models;
    let currentReasoningModes = reasoningModes;
    const getScopedId = (id) => idPrefix ? `${idPrefix}${id.charAt(0).toUpperCase()}${id.slice(1)}` : id;

    if (host && selectTemplate) {
        const select = selectTemplate.content.firstElementChild.cloneNode(true);
        button = select.querySelector(".custom-select-button");
        dropdown = select.querySelector(".custom-select-list");
        label = select.querySelector(".custom-select-value");

        select.classList.add("model-select");
        button.id = getScopedId("modelBtn");
        button.classList.add("model-current");
        button.dataset.tooltip = "Choose model";
        label.id = getScopedId("modelLabel");
        dropdown.id = getScopedId("modelDropdown");
        dropdown.classList.add("model-dropdown");
        dropdown.setAttribute("aria-label", "Available models");

        host.replaceChildren(select);
    }

    const normalizeModelOption = (model) => {
        if (typeof model === "string") {
            return { id: model, label: model };
        }
        return {
            id: String(model?.id || model?.value || model?.label || ""),
            label: String(model?.label || model?.id || model?.value || ""),
            shortLabel: model?.shortLabel ? String(model.shortLabel) : "",
            meta: model?.meta ? String(model.meta) : "",
            state: model?.state ? String(model.state) : "",
            provider: model?.provider ? String(model.provider) : ""
        };
    };

    const normalizeReasoningOption = (mode) => {
        if (typeof mode === "string") {
            return { id: mode, label: mode, shortLabel: mode };
        }
        return {
            id: String(mode?.id || mode?.value || mode?.label || ""),
            label: String(mode?.label || mode?.id || mode?.value || ""),
            shortLabel: String(mode?.shortLabel || mode?.label || mode?.id || mode?.value || "")
        };
    };

    const normalizedModels = () => currentModels.map(normalizeModelOption).filter(option => option.id);
    const normalizedReasoningModes = () => currentReasoningModes.map(normalizeReasoningOption).filter(option => option.id);
    const hasReasoningMenu = () => normalizedReasoningModes().length > 0;
    const getActiveModelOption = () => normalizedModels().find(option => option.id === activeModel);
    const getActiveReasoningOption = () => normalizedReasoningModes().find(option => option.id === activeReasoning);
    const hasConfigValue = (config, key) => Object.prototype.hasOwnProperty.call(config, key);
    const getOptions = () => Array.from(dropdown?.querySelectorAll(".model-option") || [])
        .filter(option => option.offsetParent !== null);
    const DROP_DOWN_HOVER_CLOSE_DELAY = 240;
    let closeSubmenu = () => {};
    let pendingDropdownCloseTimer = null;

    const setOpen = (isOpen) => {
        if (!dropdown || !button) return;
        if (!isOpen) {
            closeSubmenu();
        }
        if (pendingDropdownCloseTimer) {
            window.clearTimeout(pendingDropdownCloseTimer);
            pendingDropdownCloseTimer = null;
        }
        dropdown.classList.toggle("open", isOpen);
        dropdown.classList.toggle("model-dropdown-openai", isOpen && hasReasoningMenu());
        button.setAttribute("aria-expanded", String(isOpen));
    };

    const clearDropdownCloseTimer = () => {
        if (pendingDropdownCloseTimer) {
            window.clearTimeout(pendingDropdownCloseTimer);
            pendingDropdownCloseTimer = null;
        }
    };

    const scheduleDropdownClose = () => {
        clearDropdownCloseTimer();
        pendingDropdownCloseTimer = window.setTimeout(() => {
            pendingDropdownCloseTimer = null;
            const activeSubmenu = dropdown.querySelector(".model-submenu");
            const isSubmenuHovered = activeSubmenu ? activeSubmenu.matches(":hover") : false;
            if (!button.matches(":hover") && !dropdown.matches(":hover") && !isSubmenuHovered) {
                setOpen(false);
            }
        }, DROP_DOWN_HOVER_CLOSE_DELAY);
    };

    const createCheck = () => {
        const check = document.createElement("span");
        check.className = "model-option-check";
        check.setAttribute("aria-hidden", "true");
        return check;
    };

    const createOptionButton = (optionModel, { type = "model" } = {}) => {
        const option = optionTemplate
            ? optionTemplate.content.firstElementChild.cloneNode(true)
            : document.createElement("button");
        option.classList.add("model-option", `model-${type}-option`);
        if (optionModel.state) option.classList.add(`model-option-${optionModel.state}`);
        option.type = "button";
        option.dataset[type] = optionModel.id;
        if (type === "model") option.dataset.model = optionModel.id;
        if (optionModel.provider) option.dataset.provider = optionModel.provider;
        option.setAttribute("aria-selected", String(optionModel.id === (type === "reasoning" ? activeReasoning : activeModel)));

        const labelText = document.createElement("span");
        labelText.className = "model-option-label";
        labelText.textContent = optionModel.label;
        option.appendChild(labelText);

        if (optionModel.meta) {
            const meta = document.createElement("small");
            meta.className = "model-option-meta";
            meta.textContent = optionModel.meta;
            option.appendChild(meta);
        }

        option.appendChild(createCheck());
        return option;
    };

    const updateButtonLabel = () => {
        if (!label) return;
        const activeOption = getActiveModelOption();
        const activeReasoningOption = getActiveReasoningOption();
        if (hasReasoningMenu() && activeReasoningOption) {
            const modelText = document.createElement("span");
            modelText.className = "model-current-model";
            modelText.textContent = activeOption?.shortLabel || activeOption?.label || activeModel || "";

            const reasoningText = document.createElement("span");
            reasoningText.className = "model-current-reasoning";
            reasoningText.textContent = activeReasoningOption.shortLabel || activeReasoningOption.label;

            label.replaceChildren(modelText, reasoningText);
            button?.setAttribute(
                "aria-label",
                `Choose model and reasoning. Current model ${activeOption?.label || activeModel}. Reasoning ${activeReasoningOption.label}.`
            );
            if (button) button.dataset.tooltip = "Choose model and reasoning";
            return;
        }

        label.textContent = activeOption?.label || activeModel || "";
        button?.setAttribute("aria-label", `Choose model. Current model ${activeOption?.label || activeModel || "none"}.`);
        if (button) button.dataset.tooltip = "Choose model";
    };

    const updateActiveStates = () => {
        dropdown?.querySelectorAll(".model-model-option").forEach(option => {
            const isActive = option.dataset.model === activeModel;
            option.classList.toggle("active", isActive);
            option.setAttribute("aria-selected", String(isActive));
        });
        dropdown?.querySelectorAll(".model-reasoning-option").forEach(option => {
            const isActive = option.dataset.reasoning === activeReasoning;
            option.classList.toggle("active", isActive);
            option.setAttribute("aria-selected", String(isActive));
        });
    };

    const renderOptions = () => {
        if (!dropdown) return;
        dropdown.replaceChildren();
        const modelOptions = normalizedModels();
        const reasoningOptions = normalizedReasoningModes();

        if (reasoningOptions.length > 0) {
            const reasoningSection = document.createElement("div");
            reasoningSection.className = "model-menu-section model-menu-reasoning";

            const heading = document.createElement("div");
            heading.className = "model-menu-section-title";
            heading.textContent = "Reasoning";
            reasoningSection.appendChild(heading);

            reasoningOptions.forEach(reasoningOption => {
                const option = createOptionButton(reasoningOption, { type: "reasoning" });
                option.addEventListener("click", () => {
                    activeReasoning = reasoningOption.id;
                    onReasoningSelect?.(reasoningOption.id, reasoningOption);
                    updateButtonLabel();
                    updateActiveStates();
                    setOpen(false);
                    button.focus();
                });
                reasoningSection.appendChild(option);
            });

            const submenuWrap = document.createElement("div");
            submenuWrap.className = "model-submenu-wrap";

            const submenuTrigger = document.createElement("button");
            submenuTrigger.className = "model-option model-submenu-trigger";
            submenuTrigger.type = "button";
            submenuTrigger.setAttribute("aria-haspopup", "listbox");
            submenuTrigger.setAttribute("aria-expanded", "false");
            const submenuTriggerLabel = document.createElement("span");
            submenuTriggerLabel.className = "model-option-label";
            submenuTriggerLabel.textContent = "Model";
            submenuTrigger.appendChild(submenuTriggerLabel);

            const modelSubmenu = document.createElement("div");
            modelSubmenu.className = "model-submenu";
            modelSubmenu.setAttribute("role", "listbox");
            modelSubmenu.setAttribute("aria-label", "OpenAI models");

            const modelHeading = document.createElement("div");
            modelHeading.className = "model-menu-section-title";
            modelHeading.textContent = "Model";
            modelSubmenu.appendChild(modelHeading);

            modelOptions.forEach(optionModel => {
                const option = createOptionButton(optionModel, { type: "model" });
                option.addEventListener("click", () => {
                    activeModel = optionModel.id;
                    onSelect?.(optionModel.id, optionModel);
                    updateButtonLabel();
                    updateActiveStates();
                    setOpen(false);
                    button.focus();
                });
                modelSubmenu.appendChild(option);
            });

            const setSubmenuOpen = isOpen => {
                if (isOpen) {
                    const triggerRect = submenuTrigger.getBoundingClientRect();
                    const submenuWidth = modelSubmenu.offsetWidth || 222;
                    const opensOffRight = triggerRect.right + 8 + submenuWidth > window.innerWidth - 10;
                    const opensOffLeft = triggerRect.left - 8 - submenuWidth < 10;
                    submenuWrap.classList.toggle("open-left", opensOffRight);
                    submenuWrap.classList.toggle("open-inside", opensOffRight && opensOffLeft);
                } else {
                    submenuWrap.classList.remove("open-left", "open-inside");
                }
                submenuWrap.classList.toggle("open", isOpen);
                submenuTrigger.setAttribute("aria-expanded", String(isOpen));
            };
            closeSubmenu = () => setSubmenuOpen(false);

            submenuTrigger.addEventListener("click", event => {
                event.stopPropagation();
                setSubmenuOpen(!submenuWrap.classList.contains("open"));
            });
            submenuTrigger.addEventListener("keydown", event => {
                if (event.key !== "ArrowRight" && event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setSubmenuOpen(true);
                const activeOption = modelSubmenu.querySelector(".model-option.active")
                    || modelSubmenu.querySelector(".model-option");
                activeOption?.focus();
            });

            submenuWrap.append(submenuTrigger, modelSubmenu);
            reasoningSection.appendChild(submenuWrap);
            dropdown.appendChild(reasoningSection);
            closeSubmenu();
            updateActiveStates();
            return;
        }

        closeSubmenu = () => {};

        modelOptions.forEach(optionModel => {
            const option = createOptionButton(optionModel, { type: "model" });
            option.addEventListener("click", () => {
                activeModel = optionModel.id;
                onSelect?.(optionModel.id, optionModel);
                updateButtonLabel();
                updateActiveStates();
                setOpen(false);
                button.focus();
            });
            dropdown.appendChild(option);
        });
        updateActiveStates();
    };

    const setActive = (model) => {
        activeModel = model;
        updateButtonLabel();
        updateActiveStates();
    };

    const setActiveReasoning = (mode) => {
        activeReasoning = mode;
        updateButtonLabel();
        updateActiveStates();
    };

    const setReasoningModes = (nextReasoningModes = [], nextActiveReasoning = activeReasoning) => {
        currentReasoningModes = nextReasoningModes;
        activeReasoning = nextActiveReasoning;
        renderOptions();
        updateButtonLabel();
        updateActiveStates();
    };

    const setModels = (nextModels = [], nextActiveModel = activeModel, config = {}) => {
        currentModels = nextModels;
        activeModel = nextActiveModel;
        if (hasConfigValue(config, "reasoningModes")) {
            currentReasoningModes = config.reasoningModes || [];
        }
        if (hasConfigValue(config, "activeReasoning")) {
            activeReasoning = config.activeReasoning;
        }
        renderOptions();
        setActive(nextActiveModel);
    };

    if (dropdown && button) {
        renderOptions();

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
        dropdown.addEventListener("focusin", clearDropdownCloseTimer);
        dropdown.addEventListener("focusout", () => {
            if (!dropdown.contains(document.activeElement)) {
                scheduleDropdownClose();
            }
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
            if (event.key === "ArrowLeft" && document.activeElement?.closest(".model-submenu")) {
                event.preventDefault();
                const trigger = dropdown.querySelector(".model-submenu-trigger");
                trigger?.focus();
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
                clearDropdownCloseTimer();
                setOpen(false);
            }
        });
    }

    setActive(activeModel);

    const open = () => setOpen(true);
    const close = () => setOpen(false);

    return { setActive, setActiveReasoning, setModels, setReasoningModes, open, close };
}
