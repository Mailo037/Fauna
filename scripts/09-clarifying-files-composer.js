// Original script.js lines 12315-14148.
function getCurrentClarifyingAnswer() {
    if (!activeClarifyingQuestion) return null;
    return activeClarifyingQuestion.answers[activeClarifyingQuestion.index] || null;
}

function setClarifyingAnswer(answer) {
    if (!activeClarifyingQuestion) return;
    activeClarifyingQuestion.answers[activeClarifyingQuestion.index] = answer;
}

function clearClarifyingQuestionComposer({ focusInput = false } = {}) {
    activeClarifyingQuestion = null;
    if (clarifyingQuestionComposer) {
        clarifyingQuestionComposer.hidden = true;
        clarifyingQuestionComposer.innerHTML = "";
    }
    if (composerPanel) composerPanel.hidden = false;
    inputWrapper?.classList.remove("asking-question");
    scheduleComposerSafeAreaUpdate({ scroll: true });
    if (focusInput) {
        window.setTimeout(() => input?.focus(), 0);
    }
}

function showClarifyingQuestionComposer(request) {
    if (!clarifyingQuestionComposer || !request?.questions?.length) return;
    activeClarifyingQuestion = {
        ...request,
        index: 0,
        hasAnimated: false,
        answers: new Array(request.questions.length).fill(null)
    };
    if (composerPanel) composerPanel.hidden = true;
    clarifyingQuestionComposer.hidden = false;
    inputWrapper?.classList.add("asking-question");
    renderClarifyingQuestionStep();
    scheduleComposerSafeAreaUpdate({ scroll: true, force: true });
}

function createQuestionIconButton(label, path, disabled = false) {
    const button = document.createElement("button");
    button.className = "clarifying-question-icon-btn";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    return button;
}

function updateClarifyingQuestionSelectionUi() {
    const answer = getCurrentClarifyingAnswer();
    clarifyingQuestionComposer?.querySelectorAll(".clarifying-question-option").forEach(button => {
        const isSelected = answer?.type === "option" && button.dataset.optionValue === answer.value;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    const customInput = clarifyingQuestionComposer?.querySelector(".clarifying-question-input");
    if (answer?.type === "option" && customInput) {
        customInput.value = "";
        customInput.style.height = "auto";
    }
}

function renderClarifyingQuestionStep() {
    if (!clarifyingQuestionComposer || !activeClarifyingQuestion) return;

    const state = activeClarifyingQuestion;
    const question = state.questions[state.index];
    const answer = getCurrentClarifyingAnswer();
    const shouldAnimate = state.hasAnimated !== true;
    clarifyingQuestionComposer.innerHTML = "";

    const card = document.createElement("div");
    card.className = "clarifying-question-card";
    if (shouldAnimate) {
        card.classList.add("is-entering");
    }

    const header = document.createElement("div");
    header.className = "clarifying-question-header";

    const nav = document.createElement("div");
    nav.className = "clarifying-question-nav";

    const previousButton = createQuestionIconButton("Previous question", `<path d="m15 18-6-6 6-6"></path>`, state.index === 0);
    previousButton.addEventListener("click", () => {
        commitClarifyingAnswerFromInputs(false);
        state.index = Math.max(0, state.index - 1);
        renderClarifyingQuestionStep();
    });

    const counter = document.createElement("span");
    counter.className = "clarifying-question-counter";
    counter.textContent = `${state.index + 1} of ${state.questions.length}`;

    const nextButton = createQuestionIconButton("Next question", `<path d="m9 18 6-6-6-6"></path>`, state.index >= state.questions.length - 1);
    nextButton.addEventListener("click", () => {
        if (!commitClarifyingAnswerFromInputs(true)) return;
        state.index = Math.min(state.questions.length - 1, state.index + 1);
        renderClarifyingQuestionStep();
    });

    nav.append(previousButton, counter, nextButton);

    const closeButton = createQuestionIconButton("Dismiss question", `<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>`);
    closeButton.classList.add("clarifying-question-close");
    closeButton.addEventListener("click", () => {
        clearClarifyingQuestionComposer({ focusInput: true });
        showToast("Question dismissed. You can keep typing normally.", "info");
    });

    header.append(nav, closeButton);

    const title = document.createElement("h2");
    title.className = "clarifying-question-title";
    title.textContent = question.question;

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "clarifying-question-options";

    question.options.forEach(option => {
        const optionButton = document.createElement("button");
        optionButton.className = "clarifying-question-option";
        optionButton.type = "button";
        optionButton.dataset.optionValue = option.value;
        optionButton.setAttribute("aria-pressed", answer?.type === "option" && answer.value === option.value ? "true" : "false");
        if (answer?.type === "option" && answer.value === option.value) {
            optionButton.classList.add("selected");
        }

        const marker = document.createElement("span");
        marker.className = "clarifying-question-option-marker";
        marker.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "clarifying-question-option-label";
        label.textContent = option.label;

        optionButton.append(marker, label);
        optionButton.addEventListener("click", () => {
            setClarifyingAnswer({
                type: "option",
                question: question.question,
                label: option.label,
                value: option.value
            });
            updateClarifyingQuestionSelectionUi();
            renderClarifyingSubmitState();
        });

        optionsWrap.appendChild(optionButton);
    });

    const answerRow = document.createElement("div");
    answerRow.className = "clarifying-question-answer-row";

    const pencil = document.createElement("span");
    pencil.className = "clarifying-question-pencil";
    pencil.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path></svg>`;

    const customInput = document.createElement("textarea");
    customInput.className = "clarifying-question-input";
    customInput.rows = 1;
    customInput.placeholder = question.placeholder;
    customInput.setAttribute("aria-label", "Type your answer");
    customInput.disabled = !question.allowCustom;
    if (answer?.type === "custom") {
        customInput.value = answer.value;
    }
    customInput.addEventListener("input", () => {
        customInput.style.height = "auto";
        customInput.style.height = `${customInput.scrollHeight}px`;
        const value = customInput.value.trim();
        if (value) {
            setClarifyingAnswer({
                type: "custom",
                question: question.question,
                label: value,
                value
            });
        } else if (getCurrentClarifyingAnswer()?.type === "custom") {
            setClarifyingAnswer(null);
        }
        renderClarifyingSubmitState();
        clarifyingQuestionComposer.querySelectorAll(".clarifying-question-option").forEach(button => {
            button.classList.remove("selected");
            button.setAttribute("aria-pressed", "false");
        });
    });

    const submitButton = document.createElement("button");
    submitButton.className = "clarifying-question-submit";
    submitButton.type = "button";
    submitButton.setAttribute("aria-label", state.index === state.questions.length - 1 ? "Submit answer" : "Continue to next question");
    submitButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"></path><path d="m13 6 6 6-6 6"></path></svg>`;
    submitButton.addEventListener("click", () => {
        if (!commitClarifyingAnswerFromInputs(true)) return;
        if (state.index < state.questions.length - 1) {
            state.index += 1;
            renderClarifyingQuestionStep();
            return;
        }
        submitClarifyingAnswers();
    });

    answerRow.append(pencil, customInput, submitButton);
    card.append(header, title);
    if (question.options.length > 0) card.appendChild(optionsWrap);
    card.appendChild(answerRow);
    clarifyingQuestionComposer.appendChild(card);
    state.hasAnimated = true;

    renderClarifyingSubmitState();
    scheduleComposerSafeAreaUpdate({ scroll: true, force: true });
    window.setTimeout(() => {
        const focusTarget = question.options.length > 0
            ? clarifyingQuestionComposer.querySelector(".clarifying-question-option")
            : customInput;
        focusTarget?.focus();
    }, 0);
}

function renderClarifyingSubmitState() {
    const submitButton = clarifyingQuestionComposer?.querySelector(".clarifying-question-submit");
    if (!submitButton) return;
    submitButton.disabled = !getCurrentClarifyingAnswer()?.value;
}

function commitClarifyingAnswerFromInputs(showWarning) {
    if (!activeClarifyingQuestion || !clarifyingQuestionComposer) return false;
    const current = getCurrentClarifyingAnswer();
    const customValue = clarifyingQuestionComposer.querySelector(".clarifying-question-input")?.value?.trim() || "";
    if (customValue) {
        const question = activeClarifyingQuestion.questions[activeClarifyingQuestion.index];
        setClarifyingAnswer({
            type: "custom",
            question: question.question,
            label: customValue,
            value: customValue
        });
        return true;
    }
    if (current?.value) return true;
    if (showWarning) showToast("Choose an option or type an answer first.", "warning");
    return false;
}

function formatClarifyingAnswers(state) {
    return state.questions.map((question, index) => {
        const answer = state.answers[index]?.value || "";
        return `Q: ${question.question}\nA: ${answer}`;
    }).join("\n\n");
}

function finalizeClarifyingQuestionStopwatch(state) {
    if (!state?.stopwatch || state.stopwatch.stoppedAtEpochMs) return state;
    const stoppedAtEpochMs = Date.now();
    state.stopwatch = {
        ...state.stopwatch,
        stoppedAtEpochMs,
        stoppedAt: new Date(stoppedAtEpochMs).toISOString(),
        elapsedMs: Math.max(0, stoppedAtEpochMs - Number(state.stopwatch.startedAtEpochMs || stoppedAtEpochMs))
    };
    return state;
}

function formatClarifyingStopwatchResult(state, { display = false } = {}) {
    const stopwatch = state?.stopwatch;
    if (!stopwatch?.elapsedMs && stopwatch?.elapsedMs !== 0) return "";
    if (display) {
        return `Stopwatch: ${stopwatch.label || "Stopwatch"}\nElapsed: ${formatPreciseDuration(stopwatch.elapsedMs)}`;
    }
    return [
        "[Stopwatch result]",
        `Label: ${stopwatch.label || "Stopwatch"}`,
        `Started at: ${stopwatch.startedAt || new Date(stopwatch.startedAtEpochMs).toISOString()}`,
        `Stopped at: ${stopwatch.stoppedAt}`,
        `Elapsed: ${formatPreciseDuration(stopwatch.elapsedMs)} (${Math.round(stopwatch.elapsedMs)}ms)`
    ].join("\n");
}

function buildClarifyingAnswerPayload(state) {
    const stopwatchResult = formatClarifyingStopwatchResult(state);
    return [
        `[Answer to Fauna's clarifying question]\n${formatClarifyingAnswers(state)}`,
        stopwatchResult,
        "Continue the original task using this answer."
    ].filter(Boolean).join("\n\n");
}

function buildClarifyingAnswerDisplay(state) {
    return [
        formatClarifyingAnswers(state),
        formatClarifyingStopwatchResult(state, { display: true })
    ].filter(Boolean).join("\n\n");
}

async function submitClarifyingAnswers() {
    if (!activeClarifyingQuestion || isGenerating) return;
    if (isActiveChatArchived()) {
        showToast("Archived chats are read-only. Restore the chat before writing.", "warning");
        return;
    }
    const generationSession = ensureWritableActiveChatSession();
    if (!generationSession) return;
    const generationSessionId = generationSession.id;
    const state = finalizeClarifyingQuestionStopwatch(activeClarifyingQuestion);
    const payload = buildClarifyingAnswerPayload(state);
    const displayText = buildClarifyingAnswerDisplay(state);
    const runHistory = cloneConversationHistory(conversationHistory);
    let runTokenTotal = sessionTotalTokens;

    clearClarifyingQuestionComposer();
    const generationController = new AbortController();
    activeRequestController = generationController;
    const generationSignal = generationController.signal;
    setGeneratingBusy(true, { sessionId: generationSessionId, controller: generationController });
    let aiBubble = null;

    try {
        welcome.style.display = "none";
        chat.style.display = "block";
        const userMessageCreatedAt = new Date().toISOString();
        const userBubble = addRenderNode(displayText, "user", [], {
            createdAt: userMessageCreatedAt
        });
        runHistory.push({
            role: "user",
            content: payload,
            createdAt: userMessageCreatedAt
        });
        const userMessageNode = userBubble?.closest?.(".message-node.user-node");
        if (userMessageNode) {
            userMessageNode.dataset.historyIndex = String(runHistory.length - 1);
        }
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });

        aiBubble = addRenderNode("__thinking__", "output");
        const data = await sendOllamaChatWithLocalTools(
            runHistory,
            {
                ...getActiveChatRequestOptions(),
                sessionId: generationSessionId
            },
            OLLAMA_MODEL,
            generationSignal,
            aiBubble,
            { enabled: true }
        );
        const tokenUsage = getProviderTokenUsage(data);
        const assistantMessage = getAssistantMessageForConversation(data, OLLAMA_MODEL);
        attachTokenUsage(assistantMessage, tokenUsage);
        runHistory.push(assistantMessage);
        const assistantIndex = runHistory.length - 1;
        runTokenTotal += recordSessionTokenUsage(generationSessionId, tokenUsage, { message: assistantMessage });
        await renderAssistantResponse(data, aiBubble, [], generationSignal, false, {
            sessionId: generationSessionId,
            messageIndex: assistantIndex,
            alreadyRendered: data.__faunaAlreadyRendered === true,
            preserveRenderedContent: data.__faunaPreserveRenderedContent === true
        });
        updateStoredSessionFromGeneration(generationSessionId, {
            history: runHistory,
            tokenTotal: runTokenTotal
        });
        scrollChatToBottom();
    } catch (err) {
        if (!aiBubble) aiBubble = addRenderNode("__thinking__", "output");
        renderErrorCard(aiBubble, err, {
            sessionId: generationSessionId,
            history: runHistory,
            getTokenTotal: () => runTokenTotal
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

function getAssistantToolActivityForConversationData(data = {}) {
    const directItems = data?.__faunaToolActivity || data?.message?.faunaToolActivity || [];
    return typeof normalizeToolActivityItems === "function"
        ? normalizeToolActivityItems(directItems)
        : [];
}

function attachToolActivityToAssistantMessage(message, data = {}) {
    const items = getAssistantToolActivityForConversationData(data);
    if (message && items.length > 0) {
        message.faunaToolActivity = items;
    }
    const generatedMedia = typeof normalizeGeneratedMediaItems === "function"
        ? normalizeGeneratedMediaItems(data?.__faunaGeneratedMedia || data?.message?.faunaGeneratedMedia || data?.message?.generatedMedia || [])
        : [];
    if (message && generatedMedia.length > 0) {
        message.faunaGeneratedMedia = generatedMedia;
    }
    return message;
}

function getAssistantMessageForConversation(data, fallbackModel = getCurrentModelLabel()) {
    const rawContent = data?.message?.content || "";
    const titleRequest = parseChatTitleRequest(rawContent);
    const questionRequest = parseClarifyingQuestionRequest(rawContent);
    const memoryRequest = parseMemoryRequests(rawContent).length > 0;
    const toolRequest = parseFaunaToolCall(rawContent);
    const strippedContent = stripAssistantControlBlocks(rawContent);
    const content = strippedContent
        || (questionRequest ? "I need a little more detail before I continue." : "")
        || (memoryRequest ? "Got it. I'll remember that." : "")
        || (toolRequest ? getAssistantToolPlaceholder(toolRequest) : "")
        || (titleRequest ? "I've named this chat." : rawContent);
    const model = normalizeModelId(data?.model || data?.message?.model || fallbackModel);
    return attachToolActivityToAssistantMessage(attachTokenUsage({
        ...(data?.message || { role: "assistant" }),
        role: data?.message?.role || "assistant",
        content,
        model,
        provider: getCurrentProviderLabel(),
        reasoning: getReasoningLabelForMessage(model),
        createdAt: new Date().toISOString()
    }, getProviderTokenUsage(data)), data);
}

async function renderAssistantResponse(data, aiBubble, webSources = [], signal = null, speakThisReply = false, options = {}) {
    const rawContent = data?.message?.content || "";
    const responseSessionId = options.sessionId || activeSessionId || "";
    const responseIsVisible = !responseSessionId || isChatSessionVisible(responseSessionId);
    applyAssistantChatTitle(rawContent, responseSessionId);
    const questionRequest = parseClarifyingQuestionRequest(rawContent);
    const assistantMessage = getAssistantMessageForConversation(data);
    const displayContent = String(data.__faunaDisplayContent || assistantMessage.content || "");
    const responseWebSources = mergeWebSources(webSources, data?.__faunaWebSources || []);
    const messageIndex = Number.isInteger(options.messageIndex) ? options.messageIndex : null;
    const alreadyRendered = options.alreadyRendered === true;
    const preserveRenderedContent = options.preserveRenderedContent === true;
    const canRenderLiveResponse = responseIsVisible
        && aiBubble instanceof HTMLElement
        && aiBubble.isConnected;
    const shouldPlayVoiceReply = canRenderLiveResponse
        && speakThisReply
        && isVoiceReplyEnabled
        && (!isOpenAiProvider() || isOpenAiVoiceSessionActive);
    const realtimeSpeechReply = shouldPlayVoiceReply && !alreadyRendered ? createRealtimeSpeechReply(signal) : null;

    if (canRenderLiveResponse) {
        if (alreadyRendered) {
            if (!preserveRenderedContent) {
                renderAssistantContentHtml(aiBubble, renderMarkdown(displayContent), { final: true, busy: false });
            }
            if (shouldPlayVoiceReply) {
                speakReply(displayContent);
            }
        } else {
            await renderTypewriterMarkdown(aiBubble, displayContent, signal, {
                onReveal: realtimeSpeechReply ? text => realtimeSpeechReply.appendRevealedText(text) : null
            });
        }
        setupCodeSandbox(aiBubble);
        setupAssistantActions(aiBubble.parentElement, options.copyText || data.__faunaCopyText || assistantMessage.content, {
            messageIndex,
            canRegenerate: messageIndex !== null,
            canFork: messageIndex !== null,
            canSpeak: true,
            speakText: displayContent
        });
        renderWebSources(aiBubble.parentElement, responseWebSources);
    }
    applyAssistantMemoryRequests(rawContent);
    if (shouldPlayVoiceReply) {
        realtimeSpeechReply?.finish();
    } else if (responseIsVisible && isOpenAiProvider() && isOpenAiVoiceSessionActive) {
        scheduleOpenAiVoiceRearm(undefined, { cue: true });
    }
    if (questionRequest && responseIsVisible) {
        showClarifyingQuestionComposer(questionRequest);
    }
    return assistantMessage;
}

function buildFaunaBurstToolStepLimitMessage(burstToolSteps, maxStepsAtATime) {
    return `I paused after ${burstToolSteps} tool steps. The active max steps at a time is ${maxStepsAtATime}; the model must use thinking to reset that counter before more tool calls.`;
}

function buildFaunaBurstToolStepLimitFeedback(burstToolSteps, maxStepsAtATime, toolCall) {
    const attemptedTool = toolCall?.tool ? `\nAttempted next tool: ${toolCall.tool}` : "";
    return [
        "[Fauna tool-step pause]",
        buildFaunaBurstToolStepLimitMessage(burstToolSteps, maxStepsAtATime),
        attemptedTool.trim(),
        "",
        "This message is internal and has not been shown to the user yet.",
        "If more tool work is needed, respond with exactly one thinking tool call to reset the consecutive step counter before any other tool call.",
        "If you already have enough information, answer the user's original request now without calling more tools."
    ].filter(Boolean).join("\n");
}

async function sendOllamaChatWithLocalTools(messages, options = {}, preferredModel = OLLAMA_MODEL, signal = null, progressTarget = null, streamOptions = {}) {
    const allowToolCalls = canUseComposerTools();
    const allowLocalTools = allowToolCalls && hasWorkspaceBridgeAccess();
    const allowWebTools = allowToolCalls && isWebSearchEnabled;
    const allowLocationTools = allowToolCalls && isApproxLocationEnabled;
    const faunaToolContext = { allowToolCalls, allowLocalTools, allowWebTools, allowLocationTools };
    const requestOptions = {
        ...options,
        faunaToolContext
    };
    const maxStepsAtATime = normalizeAgentMaxStepsAtATime(options.agent_max_steps_at_a_time ?? activeAgentMaxStepsAtATime);
    const maxStepsPerRun = normalizeAgentMaxStepsPerRun(options.agent_max_steps_per_run ?? activeAgentMaxStepsPerRun);
    const requestSessionId = options.sessionId || activeSessionId || "";
    const requireChatTitle = shouldRequestAssistantChatTitle(messages, requestSessionId);
    const workingMessages = [
        { role: "system", content: buildAssistantSystemPrompt(allowLocalTools, requireChatTitle, allowWebTools, allowToolCalls, allowLocationTools, getEffectiveWorkspaceAccessPolicy(), requestSessionId) },
        ...cloneConversationHistory(messages)
    ];
    let lastData = null;
    const toolActivityItems = [];
    const toolWebSources = [];
    const toolResultsBySignature = new Map();
    const duplicateToolReminders = new Set();
    let totalToolSteps = 0;
    let burstToolSteps = 0;
    let burstLimitReminderSent = false;
    const attachToolActivityToData = (data, status = "done") => {
        if (!data || toolActivityItems.length === 0) return data;
        const items = normalizeToolActivityItems(toolActivityItems).map(item => ({
            ...item,
            meta: item.meta === "Running" && status === "done" ? "Done" : item.meta
        }));
        data.__faunaToolActivity = items;
        if (data.message && typeof data.message === "object") {
            data.message.faunaToolActivity = items;
        }
        return data;
    };

    while (totalToolSteps < maxStepsPerRun) {
        const streamRenderer = progressTarget
            && streamOptions.enabled !== false
            && isAiStreamingActive()
            ? createAssistantStreamRenderer(progressTarget, signal, { sessionId: requestSessionId })
            : null;
        let data;
        const providerStreamOptions = {
            ...streamOptions,
            ...(streamRenderer ? { onTextDelta: delta => streamRenderer.append(delta) } : {})
        };
        try {
            data = await sendProviderChat(workingMessages, requestOptions, preferredModel, signal, providerStreamOptions);
        } catch (err) {
            streamRenderer?.cancel();
            throw err;
        }
        lastData = data;
        applyAssistantChatTitle(data.message?.content, requestSessionId);
        const toolCalls = getFaunaToolCallsFromAssistantData(data);
        if (toolCalls.length > 0 && !allowToolCalls) {
            if (data.message) {
                data.message.content = stripAssistantControlBlocks(data.message.content)
                    || `${getActiveComposerModelLabel()} cannot call tools. Choose a tool-capable model first.`;
            }
            return attachToolActivityToData(data);
        }
        if (toolCalls.length === 0) {
            if (burstLimitReminderSent && data.message && !stripAssistantControlBlocks(data.message.content || "").trim()) {
                data.message.content = buildFaunaBurstToolStepLimitMessage(burstToolSteps, maxStepsAtATime);
            }
            if (streamRenderer) {
                streamRenderer.finish(data.message?.content || "");
                data.__faunaAlreadyRendered = streamRenderer.hasRendered;
            }
            if (toolWebSources.length > 0) {
                data.__faunaWebSources = mergeWebSources(toolWebSources);
            }
            return attachToolActivityToData(data);
        }

        streamRenderer?.cancel();
        const visibleText = stripAssistantControlBlocks(data.message?.content || "");
        const assistantToolContextContent = data.message?.content
            || toolCalls.map(getAssistantToolPlaceholder).filter(Boolean).join("\n")
            || "Fauna requested tool calls.";
        let assistantContextPushed = false;
        let continueLoop = false;

        for (const toolCall of toolCalls) {
            const isThinkingTool = isThinkingToolName(toolCall.tool);
            if (!isThinkingTool && burstToolSteps >= maxStepsAtATime) {
                if (!burstLimitReminderSent) {
                    if (!assistantContextPushed) {
                        workingMessages.push({ role: "assistant", content: assistantToolContextContent });
                        assistantContextPushed = true;
                    }
                    workingMessages.push({
                        role: "user",
                        content: buildFaunaBurstToolStepLimitFeedback(burstToolSteps, maxStepsAtATime, toolCall)
                    });
                    burstLimitReminderSent = true;
                    continueLoop = true;
                    break;
                }

                if (data.message) {
                    data.message.content = visibleText || buildFaunaBurstToolStepLimitMessage(burstToolSteps, maxStepsAtATime);
                }
                if (toolWebSources.length > 0) {
                    data.__faunaWebSources = mergeWebSources(toolWebSources);
                }
                return attachToolActivityToData(data);
            }

            if (totalToolSteps >= maxStepsPerRun) {
                if (data.message) {
                    data.message.content = visibleText || buildFaunaToolLimitMessage(toolResultsBySignature);
                }
                if (toolWebSources.length > 0) {
                    data.__faunaWebSources = mergeWebSources(toolWebSources);
                }
                return attachToolActivityToData(data);
            }

            totalToolSteps += 1;
            if (isThinkingTool) {
                burstToolSteps = 0;
                burstLimitReminderSent = false;
            } else {
                burstToolSteps += 1;
            }

            if (isImageToolName(toolCall.tool)) {
                const imageResult = await executeImageGenerationToolCall(toolCall, signal, {
                    progressTarget,
                    visibleText
                });
                if (data.message) {
                    data.message.content = imageResult.content || visibleText || imageResult.historyContent || "";
                    if (Array.isArray(imageResult.generatedMedia) && imageResult.generatedMedia.length > 0) {
                        data.message.faunaGeneratedMedia = imageResult.generatedMedia;
                    }
                }
                data.__faunaDisplayContent = visibleText || "Generated image";
                if (Array.isArray(imageResult.generatedMedia) && imageResult.generatedMedia.length > 0) {
                    data.__faunaGeneratedMedia = imageResult.generatedMedia;
                }
                if (imageResult.imageUrl) {
                    data.__faunaCopyText = getGeneratedMediaCopyText(imageResult.imageUrl, data.message?.content || imageResult.historyContent || "");
                }
                data.__faunaAlreadyRendered = true;
                data.__faunaPreserveRenderedContent = true;
                data.__faunaImageToolHandled = true;
                return attachToolActivityToData(data);
            }

            const toolSignature = isThinkingTool ? "" : getFaunaToolCallSignature(toolCall);
            if (toolSignature && toolResultsBySignature.has(toolSignature)) {
                const previousResult = toolResultsBySignature.get(toolSignature);
                if (!duplicateToolReminders.has(toolSignature)) {
                    duplicateToolReminders.add(toolSignature);
                    if (!assistantContextPushed) {
                        workingMessages.push({ role: "assistant", content: assistantToolContextContent });
                        assistantContextPushed = true;
                    }
                    workingMessages.push({ role: "user", content: formatDuplicateFaunaToolResultForModel(toolCall, previousResult.resultText) });
                    continueLoop = true;
                    break;
                }

                if (data.message) {
                    data.message.content = visibleText || buildFaunaToolLimitMessage(toolResultsBySignature);
                }
                if (toolWebSources.length > 0) {
                    data.__faunaWebSources = mergeWebSources(toolWebSources);
                }
                return attachToolActivityToData(data);
            }

            const activityItem = {
                kind: getFaunaToolActivityKind(toolCall),
                label: getFaunaToolActivityLabel(toolCall),
                tool: toolCall.tool,
                detail: getFaunaToolActivityDetail(toolCall),
                input: getFaunaToolActivityInput(toolCall),
                settings: isImageToolName(toolCall.tool) ? getImageActivitySettings(toolCall) : "",
                query: isWebToolName(toolCall.tool) ? getFaunaToolActivityInput(toolCall) : "",
                meta: "Running"
            };
            toolActivityItems.push(activityItem);
            activityItem.agentActivityId = typeof recordAgentActivity === "function"
                ? recordAgentActivity({
                    kind: activityItem.kind,
                    label: activityItem.label,
                    detail: activityItem.detail || activityItem.input,
                    input: activityItem.input,
                    status: "running"
                })
                : "";
            if (progressTarget) {
                renderToolActivity(progressTarget, {
                    title: getFaunaToolProgressLabel(toolCall),
                    items: toolActivityItems
                });
            }

            let resultText = "";
            try {
                const toolResult = await executeFaunaToolCall(toolCall, signal);
                if (toolResult && typeof toolResult === "object") {
                    resultText = toolResult.text || "";
                    if (toolResult.needsUserInput) {
                        const questionRequest = normalizeClarifyingQuestionPayload(toolResult.needsUserInput);
                        if (!questionRequest) throw new Error("Tool requested user input with an invalid question payload.");
                        activityItem.meta = "Waiting";
                        if (progressTarget) {
                            renderToolActivity(progressTarget, {
                                title: getFaunaToolProgressLabel(toolCall),
                                items: toolActivityItems
                            });
                        }
                        if (data.message) {
                            data.message.content = [
                                resultText || "Waiting for your input.",
                                createFaunaQuestionBlock(questionRequest)
                            ].filter(Boolean).join("\n\n");
                        }
                        if (toolWebSources.length > 0) {
                            data.__faunaWebSources = mergeWebSources(toolWebSources);
                        }
                        return attachToolActivityToData(data, "waiting");
                    }
                    if (Array.isArray(toolResult.sources) && toolResult.sources.length > 0) {
                        activityItem.sources = toolResult.sources;
                        toolWebSources.push(...toolResult.sources);
                    }
                } else {
                    resultText = String(toolResult || "");
                }
                activityItem.meta = isThinkingTool ? "Reset" : "Done";
                if (activityItem.agentActivityId && typeof updateAgentActivityEvent === "function") {
                    updateAgentActivityEvent(activityItem.agentActivityId, {
                        status: isThinkingTool ? "reset" : "done",
                        detail: activityItem.detail || activityItem.input
                    });
                }
            } catch (err) {
                resultText = `Tool failed: ${err.message}`;
                activityItem.meta = "Failed";
                if (activityItem.agentActivityId && typeof updateAgentActivityEvent === "function") {
                    updateAgentActivityEvent(activityItem.agentActivityId, {
                        status: "failed",
                        detail: err.message
                    });
                }
            }
            if (toolSignature) {
                toolResultsBySignature.set(toolSignature, { toolCall, resultText });
            }

            if (progressTarget) {
                renderToolActivity(progressTarget, {
                    title: getFaunaToolProgressLabel(toolCall),
                    items: toolActivityItems
                });
            }

            if (!assistantContextPushed) {
                workingMessages.push({ role: "assistant", content: assistantToolContextContent });
                assistantContextPushed = true;
            }
            workingMessages.push({ role: "user", content: formatFaunaToolResultForModel(toolCall, resultText) });
        }

        if (continueLoop) continue;
    }

    if (lastData?.message) {
        lastData.message.content = stripAssistantControlBlocks(lastData.message.content)
            || buildFaunaToolLimitMessage(toolResultsBySignature);
    }
    if (lastData && toolWebSources.length > 0) {
        lastData.__faunaWebSources = mergeWebSources(toolWebSources);
    }
    return attachToolActivityToData(lastData);
}

function getContextCompactionRoleLabel(role) {
    if (role === "system") return "SYSTEM";
    if (role === "assistant") return "ASSISTANT";
    return "USER";
}

function serializeMessagesForContextEstimate(messages = []) {
    return (Array.isArray(messages) ? messages : [])
        .map((message, index) => {
            const parts = [`[${index + 1}] ${getContextCompactionRoleLabel(message?.role)}`];
            if (message?.createdAt) parts.push(`at ${message.createdAt}`);
            parts.push(String(message?.content || ""));
            if (Array.isArray(message?.images) && message.images.length > 0) {
                parts.push(`[${message.images.length} local image attachment${message.images.length === 1 ? "" : "s"} omitted]`);
            }
            if (Array.isArray(message?.openAiImageFileIds) && message.openAiImageFileIds.length > 0) {
                parts.push(`[${message.openAiImageFileIds.length} OpenAI image attachment${message.openAiImageFileIds.length === 1 ? "" : "s"} omitted]`);
            }
            return parts.join("\n");
        })
        .join("\n\n");
}

function estimateTextTokens(text = "") {
    const value = String(text || "").trim();
    if (!value) return 0;
    const wordEstimate = Math.ceil(value.split(/\s+/).filter(Boolean).length * 1.35);
    const charEstimate = Math.ceil(value.length / 4);
    return Math.max(wordEstimate, charEstimate);
}

function buildContextMeasurementMessages(history = [], preferredModel = OLLAMA_MODEL, sessionId = activeSessionId) {
    const allowToolCalls = canUseComposerTools();
    const allowLocalTools = allowToolCalls && hasWorkspaceBridgeAccess();
    const allowWebTools = allowToolCalls && isWebSearchEnabled;
    const allowLocationTools = allowToolCalls && isApproxLocationEnabled;
    return [
        { role: "system", content: buildAssistantSystemPrompt(allowLocalTools, false, allowWebTools, allowToolCalls, allowLocationTools, getEffectiveWorkspaceAccessPolicy(), sessionId) },
        ...cloneConversationHistory(history, { includeImages: false })
    ];
}

async function getContextUsageEstimate(history = [], preferredModel = OLLAMA_MODEL, sessionId = activeSessionId) {
    const model = isOpenAiProvider() ? getOpenAiChatModel() : normalizeModelId(preferredModel) || OLLAMA_MODEL;
    const contextLimit = getActiveModelContextLength(model);
    const measurementMessages = buildContextMeasurementMessages(history, preferredModel, sessionId);
    const tokenText = serializeMessagesForContextEstimate(measurementMessages);
    let count = estimateTextTokens(tokenText) + measurementMessages.length * 6;
    let source = "estimate";

    if (!isOpenAiProvider() && isOllamaReachable && tokenText.trim()) {
        try {
            count = await requestOllamaTokenCount(tokenText, model);
            source = `Ollama tokenizer (${model})`;
        } catch {
            // Keep the fast local estimate if tokenizer preflight is unavailable.
        }
    }

    return {
        count,
        contextLimit,
        ratio: contextLimit > 0 ? count / contextLimit : 0,
        source,
        model
    };
}

function canCompactConversationHistory(history = []) {
    const compactableCount = (Array.isArray(history) ? history : [])
        .filter(message => message && !isContextCompactionMessage(message)).length;
    return compactableCount >= CONTEXT_COMPACTION_MIN_HISTORY_MESSAGES;
}

function getContextCompactionKeepStart(history = [], aggressive = false) {
    const source = Array.isArray(history) ? history : [];
    const keepCount = aggressive
        ? CONTEXT_COMPACTION_AGGRESSIVE_KEEP_RECENT_MESSAGES
        : CONTEXT_COMPACTION_KEEP_RECENT_MESSAGES;
    return Math.max(1, source.length - keepCount);
}

function getContextCompactionSummarizerModel(preferredModel = OLLAMA_MODEL) {
    return isOpenAiProvider()
        ? getOpenAiChatModel()
        : normalizeModelId(preferredModel) || OLLAMA_MODEL;
}

function getContextCompactionCriticModel(summarizerModel = getContextCompactionSummarizerModel()) {
    const activeModel = normalizeModelId(summarizerModel);
    if (isOpenAiProvider()) {
        const candidates = [
            DEFAULT_OPENAI_CHAT_MODEL,
            "gpt-5.1-chat-latest",
            "gpt-5-mini",
            ...getOpenAiModelSwitcherOptions().map(option => option.id)
        ].map(normalizeModelId).filter(Boolean);
        return candidates.find(model => model !== activeModel) || activeModel;
    }

    const candidates = [
        getLocalTaskModel("reasoning"),
        FALLBACK_MODEL,
        ...installedOllamaModels,
        ...LOCAL_MODEL_OPTIONS.map(option => option.id)
    ].map(normalizeModelId).filter(Boolean);
    return candidates.find(model => model !== activeModel && getOllamaModelCapability(model).supportsStreaming !== false)
        || activeModel;
}

function extractJsonObjectFromText(text = "") {
    const value = String(text || "").trim();
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        const first = value.indexOf("{");
        const last = value.lastIndexOf("}");
        if (first < 0 || last <= first) return null;
        try {
            return JSON.parse(value.slice(first, last + 1));
        } catch {
            return null;
        }
    }
}

function normalizeCompactionCarryForward(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item || "").trim()).filter(Boolean).slice(0, 16);
    }
    const text = String(value || "").trim();
    if (!text) return [];
    return text.split(/\n+|;\s*/).map(item => item.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 16);
}

function normalizeContextCompactionDraft(rawText = "") {
    const parsed = extractJsonObjectFromText(rawText);
    if (parsed && typeof parsed === "object") {
        const summary = String(parsed.summary || parsed.compacted_summary || parsed.context || "").trim();
        const nextStep = String(parsed.next_step || parsed.nextStep || parsed.next || "").trim();
        const carryForward = normalizeCompactionCarryForward(parsed.carry_forward || parsed.carryForward || parsed.important || parsed.facts);
        return {
            summary: summary || String(rawText || "").trim(),
            nextStep,
            carryForward
        };
    }
    return {
        summary: String(rawText || "").trim(),
        nextStep: "",
        carryForward: []
    };
}

function normalizeContextCompactionReview(rawText = "") {
    const parsed = extractJsonObjectFromText(rawText);
    if (parsed && typeof parsed === "object") {
        const issues = normalizeCompactionCarryForward(parsed.issues || parsed.missing || parsed.feedback || parsed.concerns);
        const approved = Boolean(parsed.approved || parsed.ok || parsed.complete)
            || (issues.length === 0 && /good|sufficient|approved|complete|passt|okay/i.test(String(parsed.verdict || parsed.status || "")));
        return {
            approved,
            issues,
            feedback: String(parsed.feedback || parsed.reason || parsed.verdict || "").trim()
        };
    }
    const text = String(rawText || "").trim();
    const approved = /\b(good|sufficient|approved|complete|looks good|passt|ist gut|okay)\b/i.test(text)
        && !/\b(missing|forgot|fehlt|vergessen|issue|problem|but)\b/i.test(text);
    return {
        approved,
        issues: approved ? [] : normalizeCompactionCarryForward(text),
        feedback: text
    };
}

function getContextCompactionTaskOptions() {
    const options = { ...getActiveChatRequestOptions() };
    delete options.faunaToolContext;
    delete options.agent_max_steps_at_a_time;
    delete options.agent_max_steps_per_run;
    if (isOpenAiProvider()) {
        options.max_output_tokens = Math.max(Number(options.max_output_tokens || 0), 2200);
    } else {
        options.num_predict = Math.max(Number(options.num_predict || 0), 1800);
    }
    return options;
}

async function sendContextCompactionTask(messages, model, signal = null) {
    const options = getContextCompactionTaskOptions();
    if (isOpenAiProvider()) {
        return sendOpenAiResponse(messages, { ...options, model }, signal, { enabled: false });
    }
    return sendOllamaTaskChat(messages, model, options, signal);
}

function buildContextCompactionTranscript(history = []) {
    return serializeMessagesForContextEstimate(cloneConversationHistory(history, { includeImages: false }));
}

function buildContextCompactionUserPrompt(history, keepStart, previousDraft = null, review = null) {
    const transcript = buildContextCompactionTranscript(history);
    const retainedCount = Math.max(0, history.length - keepStart);
    const lines = [
        "Compact this chat history for the next model call.",
        `The last ${retainedCount} message${retainedCount === 1 ? "" : "s"} will remain verbatim after the compacted summary. Do not repeat those recent messages unless a detail is essential.`,
        "Preserve exact project names, file paths, commands, errors, decisions, constraints, user preferences, tool results, and unresolved tasks.",
        "Say what the next assistant step should be.",
        "Return JSON only with this shape: {\"summary\":\"...\",\"carry_forward\":[\"...\"],\"next_step\":\"...\"}.",
        "",
        "Full chat transcript:",
        transcript
    ];
    if (previousDraft) {
        lines.push("", "Previous compacted summary:", JSON.stringify(previousDraft, null, 2));
    }
    if (review?.feedback || review?.issues?.length) {
        lines.push("", "Critical review feedback to fix:", review.feedback || review.issues.join("\n"));
    }
    return lines.join("\n");
}

async function requestContextCompactionDraft(history, keepStart, {
    model,
    previousDraft = null,
    review = null,
    signal = null
} = {}) {
    const messages = [
        {
            role: "system",
            content: "You compact long AI chat histories. Be precise, skeptical, and loss-minimizing. Return valid JSON only."
        },
        {
            role: "user",
            content: buildContextCompactionUserPrompt(history, keepStart, previousDraft, review)
        }
    ];
    const data = await sendContextCompactionTask(messages, model, signal);
    return normalizeContextCompactionDraft(data?.message?.content || "");
}

async function requestContextCompactionReview(history, keepStart, draft, {
    model,
    summarizerModel,
    signal = null
} = {}) {
    const messages = [
        {
            role: "system",
            content: "You are a critical reviewer for chat context compaction. Find omissions, distorted facts, lost constraints, and missing next steps. Return JSON only."
        },
        {
            role: "user",
            content: [
                "Review this compacted summary against the full chat transcript.",
                `The summarizer model was ${summarizerModel}. The last ${Math.max(0, history.length - keepStart)} messages remain verbatim, but the summary still needs to carry forward important older context.`,
                "Return JSON only with this shape: {\"approved\":true|false,\"issues\":[\"...\"],\"feedback\":\"...\"}.",
                "",
                "Compacted summary:",
                JSON.stringify(draft, null, 2),
                "",
                "Full chat transcript:",
                buildContextCompactionTranscript(history)
            ].join("\n")
        }
    ];
    const data = await sendContextCompactionTask(messages, model, signal);
    return normalizeContextCompactionReview(data?.message?.content || "");
}

async function buildReviewedContextCompaction(history, keepStart, {
    signal = null,
    preferredModel = OLLAMA_MODEL
} = {}) {
    const summarizerModel = getContextCompactionSummarizerModel(preferredModel);
    const criticModel = getContextCompactionCriticModel(summarizerModel);
    let draft = await requestContextCompactionDraft(history, keepStart, {
        model: summarizerModel,
        signal
    });
    let reviewed = false;
    let approved = !isContextCompactionReviewEnabled;
    let rotations = 0;
    let lastReview = null;

    if (isContextCompactionReviewEnabled) {
        const limit = normalizeContextCompactionRotationLimit(activeContextCompactionRotationLimit);
        while (rotations < limit) {
            rotations += 1;
            reviewed = true;
            lastReview = await requestContextCompactionReview(history, keepStart, draft, {
                model: criticModel,
                summarizerModel,
                signal
            });
            if (lastReview.approved || lastReview.issues.length === 0) {
                approved = true;
                break;
            }
            draft = await requestContextCompactionDraft(history, keepStart, {
                model: summarizerModel,
                previousDraft: draft,
                review: lastReview,
                signal
            });
        }
    }

    return {
        draft,
        reviewed,
        approved,
        rotations,
        review: lastReview,
        summarizerModel,
        criticModel: reviewed ? criticModel : ""
    };
}

function createContextCompactionMessageContent(draft, reviewInfo) {
    const carryForward = draft.carryForward?.length
        ? draft.carryForward.map(item => `- ${item}`).join("\n")
        : "- No separate carry-forward items were returned.";
    const reviewLine = reviewInfo.reviewed
        ? (reviewInfo.approved ? "Critical review approved the compacted context." : "Critical review rotation limit reached; carrying forward the latest revision.")
        : "Critical review was not enabled.";
    return [
        "Previous chat context has been automatically compacted for the next model call.",
        "",
        "Summary:",
        draft.summary || "No summary was returned.",
        "",
        "Carry-forward details:",
        carryForward,
        "",
        "Next step:",
        draft.nextStep || "Continue from the latest user request.",
        "",
        reviewLine
    ].join("\n");
}

function createContextCompactionHistoryMessage({
    draft,
    reviewInfo,
    originalMessageCount,
    keptMessageCount,
    usage,
    trigger
}) {
    const createdAt = new Date().toISOString();
    return {
        role: "system",
        content: createContextCompactionMessageContent(draft, reviewInfo),
        createdAt,
        contextCompaction: {
            type: CONTEXT_COMPACTION_MESSAGE_TYPE,
            summary: draft.summary || "",
            nextStep: draft.nextStep || "",
            carryForward: draft.carryForward || [],
            originalMessageCount,
            keptMessageCount,
            thresholdPercent: activeContextCompactionThresholdPercent,
            estimatedTokens: usage?.count || 0,
            contextLimit: usage?.contextLimit || 0,
            reviewed: reviewInfo.reviewed,
            approved: reviewInfo.approved,
            rotations: reviewInfo.rotations,
            model: reviewInfo.summarizerModel,
            criticModel: reviewInfo.criticModel,
            trigger,
            createdAt
        }
    };
}

function renderContextCompactionProgress(progressTarget, stage = "Compacting", meta = "Running") {
    if (!progressTarget) return;
    renderToolActivity(progressTarget, {
        title: "Compacting context...",
        items: [{
            kind: "memory",
            label: "Context compaction",
            tool: "context_compaction",
            detail: stage,
            input: `${activeContextCompactionThresholdPercent}% threshold`,
            meta
        }]
    });
}

function isLikelyContextWindowError(error) {
    const message = String(error?.message || error || "");
    return /context(?: length| window)?|maximum context|too many tokens|token limit|tokens? exceed|prompt is too long|context_length_exceeded|num_ctx/i.test(message);
}

function applyCompactedHistoryToGenerationView(history, sessionId, tokenTotal, progressTarget = null) {
    if (!isChatSessionVisible(sessionId)) {
        updateStoredSessionFromGeneration(sessionId, {
            history,
            tokenTotal,
            render: false
        });
        return progressTarget;
    }

    conversationHistory = cloneConversationHistory(history);
    sessionTotalTokens = tokenTotal;
    renderInitialChatHistoryWindow(conversationHistory, sessionId);
    updateStoredSessionFromGeneration(sessionId, {
        history: conversationHistory,
        tokenTotal,
        render: false
    });
    const nextBubble = addRenderNode("__thinking__", "output");
    if (document.body?.classList.contains("voice-chat-active")) {
        setCurrentVoiceAssistantNode(nextBubble?.closest(".message-node"));
    }
    return nextBubble || progressTarget;
}

async function maybeCompactHistoryForContext({
    history,
    sessionId,
    tokenTotal,
    preferredModel,
    signal,
    progressTarget,
    trigger = "threshold",
    force = false,
    aggressive = false
} = {}) {
    const sourceHistory = cloneConversationHistory(history);
    if (!canCompactConversationHistory(sourceHistory)) {
        return {
            compacted: false,
            history: sourceHistory,
            progressTarget,
            usage: null
        };
    }

    const usage = await getContextUsageEstimate(sourceHistory, preferredModel, sessionId);
    const thresholdRatio = activeContextCompactionThresholdPercent / 100;

    if (!force && usage.ratio < thresholdRatio) {
        return {
            compacted: false,
            history: sourceHistory,
            progressTarget,
            usage
        };
    }

    renderContextCompactionProgress(progressTarget, force ? "Recovering from context limit" : "Summarizing chat history", "Running");
    const keepStart = getContextCompactionKeepStart(sourceHistory, aggressive);
    const keptMessages = sourceHistory.slice(keepStart).filter(message => !isContextCompactionMessage(message));
    const reviewInfo = await buildReviewedContextCompaction(sourceHistory, keepStart, {
        signal,
        preferredModel
    });
    const compactionMessage = createContextCompactionHistoryMessage({
        draft: reviewInfo.draft,
        reviewInfo,
        originalMessageCount: sourceHistory.length,
        keptMessageCount: keptMessages.length,
        usage,
        trigger
    });
    const nextHistory = [
        compactionMessage,
        ...keptMessages
    ];
    renderContextCompactionProgress(progressTarget, "Context summary ready", "Done");
    const nextProgressTarget = applyCompactedHistoryToGenerationView(nextHistory, sessionId, tokenTotal, progressTarget);
    return {
        compacted: true,
        history: nextHistory,
        progressTarget: nextProgressTarget,
        usage,
        compactionMessage
    };
}

modelSwitcher = createModelSwitcher({
    button: modelBtn,
    dropdown: modelDropdown,
    label: modelLabel,
    models: getLocalModelSwitcherOptions(),
    activeModel: OLLAMA_MODEL,
    reasoningModes: isOpenAiProvider() ? getOpenAiReasoningOptionsForModel(getOpenAiChatModel()) : [],
    activeReasoning: isOpenAiProvider() ? getOpenAiReasoningMode(getOpenAiChatModel()) : "",
    onReasoningSelect: setOpenAiReasoningMode,
    onSelect: setActiveModel
});
if (projectPageChatModelSwitcherHost) {
    projectPageChatModelSwitcher = createModelSwitcher({
        host: projectPageChatModelSwitcherHost,
        models: getLocalModelSwitcherOptions(),
        activeModel: OLLAMA_MODEL,
        reasoningModes: isOpenAiProvider() ? getOpenAiReasoningOptionsForModel(getOpenAiChatModel()) : [],
        activeReasoning: isOpenAiProvider() ? getOpenAiReasoningMode(getOpenAiChatModel()) : "",
        onReasoningSelect: setOpenAiReasoningMode,
        onSelect: setActiveModel,
        idPrefix: "projectPageChat"
    });
}
updateModelSwitcherForProvider();
refreshOpenRouterCapabilities();

initializeChatSessions();
applyWorkspaceUrlFragment({ normalize: true });
setWorkspaceNavState(activeWorkspaceView);
initializeWindowBar();
scheduleAnimatedSegmentIndicators();
window.addEventListener("popstate", () => applyWorkspaceUrlFragment());
window.addEventListener("hashchange", () => applyWorkspaceUrlFragment());

workspaceNavButtons.forEach(button => {
    button.addEventListener("click", () => {
        setWorkspaceView(button.dataset.workspaceView, {
            focusComposer: button.dataset.workspaceView === WORKSPACE_VIEW_PLAYGROUND
        });
    });
});

libraryFilterButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryFilter(button.dataset.libraryFilter));
});

libraryLayoutButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryLayout(button.dataset.libraryLayout));
});

librarySelectVisibleButton?.addEventListener("click", selectVisibleLibraryItems);
libraryClearSelectionButton?.addEventListener("click", clearLibrarySelection);
libraryDeleteSelectedButton?.addEventListener("click", deleteSelectedLibraryItems);
libraryUploadButton?.addEventListener("click", () => {
    libraryUploadInput?.click();
});
libraryUploadInput?.addEventListener("change", event => {
    void addUploadedFilesToLibrary(event.target.files);
    event.target.value = "";
});

chatTitleEditBtn?.addEventListener("click", event => {
    event.preventDefault();
    if (activeWorkspaceView === WORKSPACE_VIEW_LIBRARY) return;
    if (isChatTitleEditing) {
        commitChatTitleEdit();
    } else {
        setChatTitleEditing(true);
    }
});

chatTitleInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        commitChatTitleEdit();
    } else if (event.key === "Escape") {
        event.preventDefault();
        cancelChatTitleEdit();
        chatTitleEditBtn?.focus();
    }
});

chatTitleInput?.addEventListener("blur", () => {
    window.setTimeout(() => {
        if (document.activeElement !== chatTitleEditBtn) {
            commitChatTitleEdit();
        }
    }, 0);
});

document.addEventListener("click", event => {
    if (!event.target.closest(".chat-session-menu-wrap")) {
        closeChatSessionMenus();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeChatSessionMenus();
    }
});

chat.addEventListener("click", (e) => {
    const toolActivityToggle = e.target.closest("[data-tool-activity-toggle]");
    if (toolActivityToggle) {
        const bubble = toolActivityToggle.closest(".tool-activity-bubble");
        const state = bubble?._faunaToolActivityState;
        const card = toolActivityToggle.closest(".tool-activity-card");
        const nextCollapsed = toolActivityToggle.getAttribute("aria-expanded") === "true";
        if (typeof setToolActivityCardCollapsed === "function") {
            setToolActivityCardCollapsed(card, nextCollapsed);
        } else {
            const list = card?.querySelector(".tool-activity-list");
            toolActivityToggle.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
            card?.classList.toggle("collapsed", nextCollapsed);
            card?.classList.toggle("expanded", !nextCollapsed);
            if (list) list.hidden = nextCollapsed;
        }
        if (state) {
            state.collapsed = !bubble.querySelector(".tool-activity-card.expanded .tool-activity-list:not([hidden])");
        }
        toolActivityToggle.focus();
        return;
    }

    const toolActivityRowToggle = e.target.closest("[data-tool-activity-row-toggle]");
    if (toolActivityRowToggle) {
        const bubble = toolActivityRowToggle.closest(".tool-activity-bubble");
        const state = bubble?._faunaToolActivityState;
        const itemId = toolActivityRowToggle.dataset.toolActivityItemId || "";
        const card = toolActivityRowToggle.closest(".tool-activity-card");
        if (card?.classList.contains("collapsed")) {
            if (typeof setToolActivityCardCollapsed === "function") {
                setToolActivityCardCollapsed(card, false);
            } else {
                card.classList.remove("collapsed");
                card.classList.add("expanded");
                const list = card.querySelector(".tool-activity-list");
                const toggle = card.querySelector("[data-tool-activity-toggle]");
                if (list) list.hidden = false;
                toggle?.setAttribute("aria-expanded", "true");
            }
        }
        const controls = toolActivityRowToggle.getAttribute("aria-controls");
        const details = controls ? document.getElementById(controls) : null;
        const isOpen = toolActivityRowToggle.getAttribute("aria-expanded") === "true";
        toolActivityRowToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
        toolActivityRowToggle.closest(".tool-activity-row-wrap")?.classList.toggle("expanded", !isOpen);
        if (details) details.hidden = isOpen;
        if (bubble && state && itemId) {
            const openItemIds = new Set(Array.isArray(state.openItemIds) ? state.openItemIds : []);
            if (isOpen) {
                openItemIds.delete(itemId);
            } else {
                openItemIds.add(itemId);
            }
            state.openItemIds = Array.from(openItemIds);
            state.collapsed = !bubble.querySelector(".tool-activity-card.expanded .tool-activity-list:not([hidden])");
        }
        toolActivityRowToggle.focus();
        return;
    }

    const assistantTtsClose = e.target.closest("[data-assistant-tts-close]");
    if (assistantTtsClose) {
        closeAssistantTtsPlayer(assistantTtsClose);
        return;
    }

    const assistantTtsSeek = e.target.closest("[data-assistant-tts-seek]");
    if (assistantTtsSeek) {
        handleAssistantTtsSeek(e, assistantTtsSeek);
        return;
    }

    const assistantTtsToggle = e.target.closest("[data-assistant-tts-toggle]");
    if (assistantTtsToggle) {
        handleAssistantTtsPlayerToggle(assistantTtsToggle);
        return;
    }

    const turnDurationToggle = e.target.closest("[data-turn-duration-toggle]");
    if (turnDurationToggle) {
        toggleTurnToolActivityDetails(turnDurationToggle);
        return;
    }

    const generatedImageInfoToggle = e.target.closest("[data-generated-image-info-toggle]");
    if (generatedImageInfoToggle) {
        e.stopPropagation();
        const imageWrap = generatedImageInfoToggle.closest(".generated-image-card");
        if (imageWrap) {
            setGeneratedImageInfoOpen(
                imageWrap,
                generatedImageInfoToggle,
                !imageWrap.classList.contains("generated-image-info-open")
            );
        }
        return;
    }

    const assistantAction = e.target.closest("[data-assistant-action]");
    if (assistantAction) {
        const action = assistantAction.dataset.assistantAction;
        if (action === "copy") {
            handleCopyButton(assistantAction, assistantAction.dataset.copyText || "");
        } else if (action === "speak") {
            handleSpeakButton(assistantAction, assistantAction.dataset.speakText || assistantAction.dataset.copyText || "");
        } else if (action === "regenerate") {
            regenerateAssistantFromAction(assistantAction);
        } else if (action === "fork") {
            forkChatFromAssistantAction(assistantAction);
        }
        return;
    }

    const copyButton = e.target.closest(".copy-action-btn");
    if (copyButton && !copyButton._faunaCopyAttached && copyButton.dataset.copyText) {
        handleCopyButton(copyButton, copyButton.dataset.copyText);
        return;
    }

    const img = e.target.closest(".bubble-img");
    if (img?.src) imageLightboxController.open(img.src);
});

chat.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        const generatedImageInfoToggle = event.target.closest("[data-generated-image-info-toggle]");
        const imageWrap = generatedImageInfoToggle?.closest(".generated-image-card");
        if (generatedImageInfoToggle && imageWrap) {
            setGeneratedImageInfoOpen(imageWrap, generatedImageInfoToggle, false);
            event.stopPropagation();
            return;
        }
    }

    handleAssistantTtsSeekKey(event);
});

// ===== FILE HANDLING =====
fileInput.setAttribute("accept", "image/*,.pdf,.txt,.md,.js,.py,.json,.csv");
libraryUploadInput?.setAttribute("accept", "image/*,video/*,.html,.htm,.css,.js,.mjs,.ts,.tsx,.jsx,.json,.md,.py,.txt,.csv,.sh,.ps1");

function setAttachmentMenuOpen(open, { focusMenu = false } = {}) {
    if (!attachmentMenu || !uploadButton) return;
    if (open && !canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    const isOpen = Boolean(open);
    attachmentMenu.hidden = !isOpen;
    uploadButton.setAttribute("aria-expanded", String(isOpen));
    uploadButton.classList.toggle("active", isOpen);
    if (isOpen) {
        toolsDropdown?.classList.remove("open");
        if (focusMenu) {
            window.setTimeout(() => attachmentMenu.querySelector(".attachment-menu-item")?.focus({ preventScroll: true }), 0);
        }
    }
}

function closeAttachmentMenu() {
    setAttachmentMenuOpen(false);
}

function toggleAttachmentMenu() {
    setAttachmentMenuOpen(attachmentMenu?.hidden !== false, { focusMenu: true });
}

function isDuplicateAttachment(file) {
    const incomingPath = String(file?.__faunaDesktopFilePath || "").trim();
    return attachedFiles.some(existing => (
        incomingPath && incomingPath === String(existing.__faunaDesktopFilePath || "").trim()
    ) || (
        existing.name === file.name
        && existing.size === file.size
        && existing.type === file.type
    ));
}

function addAttachedFile(file, { notify = true } = {}) {
    if (!(file instanceof File)) return false;
    prepareDesktopFileReference(file);
    const unsupportedReason = getUnsupportedAttachmentReason(file);
    if (unsupportedReason) {
        if (notify) showUnsupportedAttachmentToast([{ file, reason: unsupportedReason }]);
        return false;
    }
    if (isDuplicateAttachment(file)) return false;
    attachedFiles.push(file);
    renderPreviewPill(file);
    scheduleComposerSafeAreaUpdate();
    scheduleComposerDraftSave({ render: true });
    return true;
}

function addAttachedFiles(files) {
    let added = 0;
    const rejected = [];
    Array.from(files || []).forEach(file => {
        const unsupportedReason = getUnsupportedAttachmentReason(file);
        if (unsupportedReason) {
            rejected.push({ file, reason: unsupportedReason });
            return;
        }
        if (addAttachedFile(file, { notify: false })) added += 1;
    });
    showUnsupportedAttachmentToast(rejected);
    if (added > 0) updateTokenDisplay();
    return added;
}

function markFileAsLibraryAttachment(file, item, { sourceSrc = "" } = {}) {
    if (!(file instanceof File) || !item) return file;
    try {
        Object.defineProperties(file, {
            __faunaLibrarySourceKey: {
                value: getLibraryItemPersistentKey(item),
                enumerable: false
            },
            __faunaLibrarySourceId: {
                value: item.id || "",
                enumerable: false
            },
            __faunaLibrarySourceSrc: {
                value: sourceSrc || item.src || "",
                enumerable: false
            }
        });
    } catch {
        file.__faunaLibrarySourceKey = getLibraryItemPersistentKey(item);
        file.__faunaLibrarySourceId = item.id || "";
        file.__faunaLibrarySourceSrc = sourceSrc || item.src || "";
    }
    return file;
}

function setFilePersistentPreviewSource(file, source = "") {
    if (!(file instanceof File)) return file;
    const src = String(source || "").trim();
    if (!src) return file;
    try {
        Object.defineProperty(file, "__faunaPersistentPreviewSrc", {
            value: src,
            enumerable: false,
            configurable: true
        });
    } catch {
        file.__faunaPersistentPreviewSrc = src;
    }
    return file;
}

async function ensurePersistentImagePreviewSource(file) {
    if (!(file instanceof File) || !file.type?.startsWith("image/")) return "";
    const existing = String(file.__faunaPersistentPreviewSrc || file.__faunaLibrarySourceSrc || "").trim();
    if (/^(?:data:image\/|https?:)/i.test(existing) || isDesktopFileMediaSource(existing)) return existing;
    const desktopPreview = getDesktopFilePreviewSource(file);
    if (desktopPreview) {
        setFilePersistentPreviewSource(file, desktopPreview);
        return desktopPreview;
    }
    const base64 = await blobToBase64(file);
    const src = `data:${file.type || "image/png"};base64,${base64}`;
    setFilePersistentPreviewSource(file, src);
    return src;
}

async function ensurePersistentImagePreviewSources(files = []) {
    const imageFiles = Array.from(files || []).filter(file => file instanceof File && file.type?.startsWith("image/"));
    await Promise.all(imageFiles.map(file => ensurePersistentImagePreviewSource(file)));
}

function sanitizeAttachmentFileNamePart(value, fallback = "library-item") {
    const clean = String(value || "")
        .trim()
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 56);
    return clean || fallback;
}

function getMimeExtension(mimeType, fallback = "bin") {
    const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
    const extensions = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "text/html": "html",
        "text/css": "css",
        "text/javascript": "js",
        "application/javascript": "js",
        "application/json": "json",
        "text/markdown": "md",
        "text/plain": "txt"
    };
    return extensions[normalized] || fallback;
}

function getCodeAttachmentMime(lang, kind) {
    const normalized = normalizeCodeLanguage(lang || kind);
    const mimeTypes = {
        html: "text/html",
        htm: "text/html",
        css: "text/css",
        js: "text/javascript",
        javascript: "text/javascript",
        mjs: "text/javascript",
        json: "application/json",
        md: "text/markdown",
        markdown: "text/markdown",
        py: "text/x-python",
        python: "text/x-python"
    };
    return mimeTypes[normalized] || "text/plain";
}

function getLibraryAttachmentBaseName(item) {
    return sanitizeAttachmentFileNamePart(item?.title || item?.fileName || item?.type || "library-item");
}

function getLibraryReferenceText(item, reason = "") {
    return [
        `${getLibraryItemKindLabel(item)} from Fauna Library`,
        `Title: ${item.title || "Untitled"}`,
        item.detail ? `Detail: ${item.detail}` : "",
        item.sessionTitle ? `Chat: ${item.sessionTitle}` : "",
        `Created: ${formatLibraryItemDate(item)}`,
        item.src ? `Source: ${item.src}` : "",
        reason ? `Note: ${reason}` : ""
    ].filter(Boolean).join("\n");
}

function createLibraryReferenceFile(item, reason = "") {
    const base = getLibraryAttachmentBaseName(item);
    return {
        file: markFileAsLibraryAttachment(
            new File([getLibraryReferenceText(item, reason)], `${base}-reference.txt`, { type: "text/plain" }),
            item
        ),
        fallback: true
    };
}

async function getBlobFromLibrarySource(src) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
}

async function getPersistentLibraryImageSource(item, blob, type) {
    const src = String(item?.src || "").trim();
    if (/^(?:data:image\/|https?:)/i.test(src) || isDesktopFileMediaSource(src)) return src;
    const base64 = await blobToBase64(blob);
    return `data:${type || "image/png"};base64,${base64}`;
}

async function createAttachmentFileFromLibraryItem(item) {
    if (item.type === "code") {
        const fileName = item.fileName || getCodeDownloadName(item.lang, item.kind, getLibraryAttachmentBaseName(item));
        return {
            file: markFileAsLibraryAttachment(
                new File([item.code || ""], fileName, { type: getCodeAttachmentMime(item.lang, item.kind) }),
                item
            ),
            fallback: false
        };
    }

    if (item.type === "image") {
        try {
            const blob = await getBlobFromLibrarySource(item.src);
            const type = blob.type || "image/png";
            const ext = getMimeExtension(type, "png");
            const sourceSrc = await getPersistentLibraryImageSource(item, blob, type);
            return {
                file: markFileAsLibraryAttachment(
                    new File([blob], `${getLibraryAttachmentBaseName(item)}.${ext}`, { type }),
                    item,
                    { sourceSrc }
                ),
                fallback: false
            };
        } catch (err) {
            return createLibraryReferenceFile(item, "The browser could not copy this image as a file, so Fauna attached a source reference.");
        }
    }

    return createLibraryReferenceFile(item, "Videos are attached as source references for chat context.");
}

async function attachSelectedLibraryItems() {
    if (!libraryPickerAttach || libraryPickerSelectedIds.size === 0) return;
    const selectedItems = collectLibraryItems().filter(item => libraryPickerSelectedIds.has(item.id));
    if (selectedItems.length === 0) return;

    const previousLabel = libraryPickerAttach.textContent;
    libraryPickerAttach.disabled = true;
    libraryPickerAttach.textContent = "Attaching...";

    let added = 0;
    let fallbackCount = 0;
    let failed = 0;
    const attachmentTarget = libraryPickerAttachmentTarget;
    const addFileToTarget = attachmentTarget === "projectPageChat"
        ? addProjectPageChatAttachedFile
        : addAttachedFile;
    for (const item of selectedItems) {
        try {
            const result = await createAttachmentFileFromLibraryItem(item);
            if (addFileToTarget(result.file)) {
                added += 1;
                if (result.fallback) fallbackCount += 1;
            }
        } catch (err) {
            console.warn("Could not attach library item:", err);
            failed += 1;
        }
    }

    updateTokenDisplay();
    closeLibraryPickerModal();
    if (attachmentTarget === "projectPageChat") {
        projectPageChatInput?.focus?.({ preventScroll: true });
    } else {
        focusComposerInput({ force: true });
    }

    if (added > 0) {
        const suffix = fallbackCount > 0 ? ` ${fallbackCount} attached as references.` : "";
        showToast(`Attached ${added} ${added === 1 ? "item" : "items"} from Library.${suffix}`, fallbackCount > 0 ? "info" : "success");
    } else if (failed > 0) {
        showToast("Could not attach the selected Library items.", "error");
    } else {
        showToast("Selected Library items were already attached.", "info");
    }

    libraryPickerAttach.textContent = previousLabel || "Attach selected";
    updateLibraryPickerSelectionUi();
}

fileInput.onchange = (e) => {
    if (isGenerating) return;
    if (!canUseComposerAttachments()) {
        showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        fileInput.value = "";
        return;
    }
    addAttachedFiles(e.target.files);
    fileInput.value = "";
};

if (uploadButton) {
    uploadButton.addEventListener("click", event => {
        event.stopPropagation();
        if (isGenerating) return;
        toggleAttachmentMenu();
    });

    uploadButton.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isGenerating) setAttachmentMenuOpen(true, { focusMenu: true });
        }
    });
}

attachmentMenu?.addEventListener("click", event => event.stopPropagation());
attachmentMenu?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeAttachmentMenu();
        uploadButton?.focus({ preventScroll: true });
        return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(attachmentMenu.querySelectorAll(".attachment-menu-item"));
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    const nextIndex = event.key === "ArrowDown"
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
});

attachmentUploadFileButton?.addEventListener("click", () => {
    if (isGenerating || !canUseComposerAttachments()) {
        if (!isGenerating) showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    closeAttachmentMenu();
    fileInput.click();
});

attachmentChooseLibraryButton?.addEventListener("click", () => {
    if (isGenerating || !canUseComposerAttachments()) {
        if (!isGenerating) showToast(`${getActiveComposerModelLabel()} cannot read attachments. Choose a file- or vision-capable model first.`, "warning");
        return;
    }
    openLibraryPickerModal();
});

document.addEventListener("click", event => {
    if (!event.target.closest(".attachment-menu-wrap")) closeAttachmentMenu();
});

libraryPickerSearch?.addEventListener("input", event => {
    libraryPickerQuery = event.target.value || "";
    renderLibraryPicker();
});

libraryPickerTypeButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryPickerTypeFilter(button.dataset.libraryPickerType));
});

libraryPickerSortButtons.forEach(button => {
    button.addEventListener("click", () => setLibraryPickerSortOrder(button.dataset.libraryPickerSort));
});

libraryPickerModal?.addEventListener("click", event => {
    if (event.target.closest("[data-library-picker-close]")) closeLibraryPickerModal();
});

libraryPickerAttach?.addEventListener("click", () => {
    void attachSelectedLibraryItems();
});

document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", e => {
    e.preventDefault();
    if (isGenerating) return;
    addAttachedFiles(e.dataTransfer.files);
});

input.addEventListener("paste", e => {
    if (isGenerating) return;
    const pastedImages = [];
    Array.from(e.clipboardData.items).forEach(item => {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) return;
            const ext = item.type.split("/")[1] || "png";
            const named = new File([file], "pasted-image." + ext, { type: item.type });
            pastedImages.push(named);
        }
    });
    addAttachedFiles(pastedImages);
});

function getAttachmentKindLabel(file) {
    if (file.type?.startsWith("image/")) {
        return (file.type.split("/")[1] || "image").toUpperCase();
    }
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
    return (extension || file.type || "file").toUpperCase();
}

function isCodeLikeAttachment(file) {
    return /\.(html?|css|js|mjs|ts|tsx|jsx|json|md|py|ps1|sh)$/i.test(file.name);
}

function renderPreviewPill(file) {
    const isImage = file.type.startsWith("image/");
    const pill = document.createElement("div");
    pill.className = `preview-pill ${isImage ? "preview-image-tile" : "preview-file-pill"}`;

    const icon = document.createElement("span");
    icon.className = "preview-file-icon";
    icon.setAttribute("aria-hidden", "true");

    if (isImage) {
        const img = document.createElement("img");
        const desktopPreview = getDesktopFilePreviewSource(file);
        const objectUrl = desktopPreview || URL.createObjectURL(file);
        img.src = objectUrl;
        img.className = "preview-file-thumb";
        img.onload = () => {
            if (!desktopPreview) URL.revokeObjectURL(objectUrl);
        };
        icon.appendChild(img);
    } else if (isCodeLikeAttachment(file)) {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>`;
    } else {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`;
    }

    const meta = document.createElement("span");
    meta.className = "preview-file-meta";

    const nameSpan = document.createElement("span");
    nameSpan.className = "preview-file-name";
    nameSpan.textContent = file.name;

    const kindSpan = document.createElement("span");
    kindSpan.className = "preview-file-type";
    kindSpan.textContent = getAttachmentKindLabel(file);

    meta.append(nameSpan, kindSpan);

    const closeBtn = document.createElement("button");
    closeBtn.className = "remove-preview";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", `Remove ${file.name}`);
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    closeBtn.onclick = () => {
        attachedFiles = attachedFiles.filter(f => f !== file);
        pill.remove();
        updateTokenDisplay();
        scheduleComposerSafeAreaUpdate();
        scheduleComposerDraftSave({ immediate: true, render: true });
    };
    pill.append(icon);
    pill.append(meta);
    pill.append(closeBtn);
    previewContainer.appendChild(pill);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getImageFiles(files) {
    return files.filter(file => file.type.startsWith("image/"));
}

function isSessionGenerating(sessionId) {
    return Boolean(sessionId && activeGenerationRecords.has(sessionId));
}

function hasUnreadGenerationCompletion(sessionId) {
    return Boolean(sessionId && completedGenerationSessionIds.has(sessionId));
}

function clearUnreadGenerationCompletion(sessionId, { renderHistory = true } = {}) {
    if (!sessionId || !completedGenerationSessionIds.delete(sessionId)) return;
    if (renderHistory) renderChatHistory?.();
}

function markUnreadGenerationCompletion(sessionId, { notify = true } = {}) {
    if (!sessionId || isChatSessionVisible(sessionId)) return;
    completedGenerationSessionIds.add(sessionId);
    if (notify && typeof notifyChatGenerationCompleted === "function") {
        notifyChatGenerationCompleted(sessionId);
    }
}

function getGenerationRecordForSession(sessionId = activeSessionId) {
    return sessionId ? activeGenerationRecords.get(sessionId) || null : null;
}

function findVisibleGenerationBubble() {
    if (!chat) return null;
    return chat.querySelector([
        ".message-node.output-node:not([data-history-index]) .bubble[aria-busy=\"true\"]",
        ".message-node.output-node:not([data-history-index]) .tool-activity-bubble",
        ".message-node.output-node:not([data-history-index]) .thinking-label"
    ].join(", "))?.closest(".bubble") || null;
}

function isLiveGenerationPlaceholderNode(node) {
    return node instanceof HTMLElement
        && node.matches(".message-node.output-node[data-live-generation-placeholder=\"true\"]");
}

function removeLiveGenerationPlaceholders(sessionId = activeSessionId) {
    if (!sessionId) return;
    const session = typeof getChatSessionById === "function" ? getChatSessionById(sessionId) : null;
    if (session && Array.isArray(session.domNodes)) {
        session.domNodes = session.domNodes.filter(node => !isLiveGenerationPlaceholderNode(node));
    }
    if (session?.chatHtml?.includes("data-live-generation-placeholder")) {
        const host = document.createElement("div");
        host.innerHTML = session.chatHtml;
        host.querySelectorAll(".message-node.output-node[data-live-generation-placeholder=\"true\"]").forEach(node => node.remove());
        session.chatHtml = sanitizeChatHtmlMediaSources(host.innerHTML || "");
    }
    if (sessionId !== activeSessionId || !chat) return;
    chat.querySelectorAll(".message-node.output-node[data-live-generation-placeholder=\"true\"]").forEach(node => node.remove());
    if (!activeChatHasContent?.()) {
        chat.style.display = "none";
        if (welcome) welcome.style.display = "flex";
    }
    updateComposerChatContentLayoutState?.();
}

function ensureVisibleGenerationProgress(sessionId = activeSessionId) {
    if (!sessionId || sessionId !== activeSessionId || !chat || !isSessionGenerating(sessionId)) return null;
    const existingBubble = findVisibleGenerationBubble();
    if (existingBubble) return existingBubble;
    if (welcome) welcome.style.display = "none";
    chat.style.display = "block";
    const bubble = addRenderNode("__thinking__", "output", [], {
        forceScroll: true,
        liveGenerationPlaceholder: true
    });
    const node = bubble?.closest?.(".message-node.output-node");
    if (node) node.dataset.liveGenerationPlaceholder = "true";
    return bubble;
}

function getGenerationRecordForSignal(signal = null) {
    if (!signal) return null;
    for (const record of activeGenerationRecords.values()) {
        if (record.controller?.signal === signal) return record;
    }
    return null;
}

function getGenerationSessionIdForSignal(signal = null) {
    return getGenerationRecordForSignal(signal)?.sessionId || activeSessionId || "";
}

function syncActiveGenerationState() {
    const record = getGenerationRecordForSession(activeSessionId);
    activeRequestController = record?.controller || null;
    isGenerating = Boolean(record);
    hasGenerationConnectionBeenMade = Boolean(record?.hasConnection);
    document.body?.classList.toggle("chat-generation-active", isGenerating);
    document.body?.classList.toggle("chat-generation-background-active", activeGenerationRecords.size > (isGenerating ? 1 : 0));
    document.body?.classList.toggle("archived-chat-active", typeof isActiveChatArchived === "function" && isActiveChatArchived());
}

function updateGenerationUi({ renderHistory = true } = {}) {
    syncActiveGenerationState();
    updateGenerationStopButtonVisibility();
    updateSendButtonState();
    updateComposerCapabilityUi();
    updateVoiceButtonAvailability?.();
    if (renderHistory) renderChatHistory?.();
}

function beginChatGeneration(sessionId, controller) {
    if (!sessionId || !controller) return null;
    clearUnreadGenerationCompletion(sessionId, { renderHistory: false });
    const record = {
        sessionId,
        controller,
        hasConnection: false,
        startedAt: new Date().toISOString()
    };
    activeGenerationRecords.set(sessionId, record);
    updateGenerationUi();
    return record;
}

function finishChatGeneration(sessionId, controller = null) {
    const record = getGenerationRecordForSession(sessionId);
    const wasRunning = Boolean(record && (!controller || record.controller === controller));
    const wasAborted = Boolean(record?.controller?.signal?.aborted || controller?.signal?.aborted);
    const wasVisibleSession = isChatSessionVisible(sessionId);
    if (record && (!controller || record.controller === controller)) {
        activeGenerationRecords.delete(sessionId);
    }
    removeLiveGenerationPlaceholders(sessionId);
    if (wasRunning && !wasAborted) {
        if (!wasVisibleSession) {
            markUnreadGenerationCompletion(sessionId, { notify: false });
        } else {
            clearUnreadGenerationCompletion(sessionId, { renderHistory: false });
        }
        if (typeof notifyChatGenerationCompleted === "function") {
            notifyChatGenerationCompleted(sessionId);
        }
    } else if (wasVisibleSession) {
        clearUnreadGenerationCompletion(sessionId, { renderHistory: false });
    }
    updateGenerationUi();
}

function updateGenerationStopButtonVisibility() {
    if (!stopButton) return;
    const voiceModeActive = document.body?.classList.contains("voice-chat-active");
    const generationAbortPending = Boolean(getGenerationRecordForSession(activeSessionId)?.controller?.signal?.aborted);
    stopButton.hidden = !isGenerating || voiceModeActive || generationAbortPending || !hasGenerationConnectionBeenMade;
    stopButton.disabled = false;
}

function markGenerationConnectionEstablished(signal = null) {
    const record = getGenerationRecordForSignal(signal) || getGenerationRecordForSession(activeSessionId);
    if (!record || record.hasConnection) return;
    record.hasConnection = true;
    updateGenerationUi();
}

function updateSendButtonState() {
    if (!sendButton) return;

    const archived = typeof isActiveChatArchived === "function" && isActiveChatArchived();
    const isLoadingConnection = (isGenerating || isPromptSubmissionPending) && !hasGenerationConnectionBeenMade;
    const idleState = sendButton.querySelector("[data-send-state='idle']");
    const loadingState = sendButton.querySelector("[data-send-state='loading']");
    const label = archived ? "Archived chats are read-only" : isLoadingConnection ? "Working on message" : "Send message";

    sendButton.hidden = isGenerating && hasGenerationConnectionBeenMade;
    sendButton.disabled = isGenerating || isPromptSubmissionPending || archived;
    sendButton.setAttribute("aria-busy", (isGenerating || isPromptSubmissionPending) ? "true" : "false");
    sendButton.setAttribute("aria-label", label);
    sendButton.dataset.tooltip = label;

    if (idleState) {
        idleState.hidden = isGenerating || isPromptSubmissionPending;
    }
    if (loadingState) {
        loadingState.hidden = !isLoadingConnection;
    }

    if (input) {
        input.disabled = isGenerating || isPromptSubmissionPending || archived;
        input.placeholder = archived ? "Archived chat is read-only" : "Message Fauna";
    }
}

function setGeneratingBusy(busy, options = {}) {
    const sessionId = options.sessionId || activeSessionId || "";
    const controller = options.controller || activeRequestController || null;
    if (busy) {
        beginChatGeneration(sessionId, controller);
    } else {
        finishChatGeneration(sessionId, controller);
    }
}

function cancelActiveGeneration() {
    const record = getGenerationRecordForSession(activeSessionId);
    if (!record?.controller) return;
    record.controller.abort();
    updateGenerationStopButtonVisibility();
    showToast("Generation stopped.", "info");
}

const SLASH_COMMANDS = [
    {
        name: "image",
        command: "/image",
        aliases: ["img", "imagine"],
        description: "Generate an image from a prompt",
        icon: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path>',
        acceptsPrompt: true
    },
    {
        name: "video",
        command: "/video",
        aliases: ["vid", "clip"],
        description: "Create a short video clip",
        icon: '<rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3Z"></path>',
        acceptsPrompt: true
    },
    {
        name: "screenshot",
        command: "/screenshot",
        aliases: ["screen"],
        description: "Capture your screen as an attachment",
        icon: '<rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M8 22h8"></path><path d="M12 18v4"></path><circle cx="12" cy="11" r="3"></circle>',
        acceptsPrompt: false
    },
    {
        name: "memory",
        command: "/memory",
        aliases: ["remember"],
        description: "Add or manage beta memories",
        icon: '<path d="M12 3a7 7 0 0 0-7 7c0 2.2 1 4 2.5 5.3V19h9v-3.7A6.8 6.8 0 0 0 19 10a7 7 0 0 0-7-7Z"></path><path d="M9 22h6"></path><path d="M9 10h.01M12 9h.01M15 10h.01"></path>',
        acceptsPrompt: true
    },
    {
        name: "weather",
        command: "/weather",
        aliases: ["wetter", "temp", "temperature"],
        description: "Check current weather near you",
        icon: '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle>',
        acceptsPrompt: true
    },
    {
        name: "wait",
        command: "/wait",
        aliases: ["timer", "sleep", "wait_for"],
        description: "Start a timer or wait for a command",
        icon: '<circle cx="12" cy="13" r="8"></circle><path d="M12 13V8"></path><path d="M12 13l3 2"></path><path d="M9 2h6"></path>',
        acceptsPrompt: true
    },
    {
        name: "stopwatch",
        command: "/stopwatch",
        aliases: ["time", "measure"],
        description: "Measure command time or user input",
        icon: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 1.5"></path><path d="M9 2h6"></path><path d="m5 5 2 2"></path><path d="m19 5-2 2"></path>',
        acceptsPrompt: true
    },
    {
        name: "model",
        command: "/model",
        aliases: ["provider"],
        description: "Open or change the active model",
        icon: '<path d="M12 3 4 7v10l8 4 8-4V7Z"></path><path d="M4 7l8 4 8-4"></path><path d="M12 11v10"></path>',
        acceptsPrompt: true
    },
    {
        name: "info",
        command: "/info",
        aliases: ["about"],
        description: "Show details about this chat",
        icon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
        acceptsPrompt: false
    },
    {
        name: "new",
        command: "/new",
        aliases: ["chat"],
        description: "Start a fresh chat",
        icon: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
        acceptsPrompt: false
    }
];
let activeSlashCommandIndex = 0;
let visibleSlashCommandMatches = [];
let commandMenu = null;
let commandMenuSearchInput = null;
let commandMenuList = null;
let commandMenuItems = [];
let visibleCommandMenuItems = [];
let activeCommandMenuIndex = 0;

function getSlashCommandQuery() {
    if (!input) return null;
    const value = input.value || "";
    const caret = Number.isInteger(input.selectionStart) ? input.selectionStart : value.length;
    const beforeCaret = value.slice(0, caret);
    const afterCaret = value.slice(caret);
    if (afterCaret.trim()) return null;
    const match = beforeCaret.match(/^\/([^\s/]*)$/);
    return match ? match[1].toLowerCase() : null;
}

function getSlashCommandMatches(query = "") {
    const needle = String(query || "").toLowerCase();
    if (!needle) return SLASH_COMMANDS.slice();

    return SLASH_COMMANDS
        .map((command, index) => {
            const aliases = command.aliases || [];
            const description = String(command.description || "").toLowerCase();
            let score = Number.POSITIVE_INFINITY;
            if (command.name.startsWith(needle) || command.command.slice(1).startsWith(needle)) score = 0;
            else if (aliases.some(alias => alias.startsWith(needle))) score = 1;
            else if (command.name.includes(needle) || command.command.includes(needle)) score = 2;
            else if (aliases.some(alias => alias.includes(needle))) score = 3;
            else if (description.includes(needle)) score = 4;
            return { command, index, score };
        })
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .map(item => item.command);
}

function hideSlashCommandPalette() {
    if (!slashCommandPalette) return;
    slashCommandPalette.hidden = true;
    slashCommandPalette.replaceChildren();
    visibleSlashCommandMatches = [];
    activeSlashCommandIndex = 0;
    input?.removeAttribute("aria-activedescendant");
}

function updateSlashCommandSelection() {
    if (!slashCommandPalette || slashCommandPalette.hidden) return;
    const options = Array.from(slashCommandPalette.querySelectorAll(".slash-command-option"));
    options.forEach((option, index) => {
        const active = index === activeSlashCommandIndex;
        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", String(active));
        if (active) {
            input?.setAttribute("aria-activedescendant", option.id);
            option.scrollIntoView({ block: "nearest" });
        }
    });
}

function getSlashCommandUnavailableReason(command) {
    if (!command) return "";
    if (command.name === "screenshot" && !canUseComposerImageAttachments()) {
        return `${getActiveComposerModelLabel()} does not support image attachments. Choose a Vision task model first.`;
    }
    return "";
}

function applySlashCommandSuggestion(command) {
    if (!command || !input) return;
    const unavailableReason = getSlashCommandUnavailableReason(command);
    if (unavailableReason) {
        showToast(unavailableReason, "warning");
        return;
    }
    if (command.name === "model") {
        clearComposerText();
        hideSlashCommandPalette();
        openModelCommandMenu();
        return;
    }
    if (command.name === "memory") {
        clearComposerText();
        hideSlashCommandPalette();
        openMemoryCommandMenu();
        return;
    }
    if (command.name === "info") {
        clearComposerText();
        hideSlashCommandPalette();
        openInfoCommandMenu();
        return;
    }
    input.value = `${command.command}${command.acceptsPrompt ? " " : ""}`;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    scheduleComposerDraftSave({ render: true });
    hideSlashCommandPalette();
    input.focus();
}

function renderSlashCommandPalette() {
    if (!slashCommandPalette || !input || isGenerating) {
        hideSlashCommandPalette();
        return;
    }

    const query = getSlashCommandQuery();
    if (query === null) {
        hideSlashCommandPalette();
        return;
    }

    visibleSlashCommandMatches = getSlashCommandMatches(query);
    if (visibleSlashCommandMatches.length === 0) {
        hideSlashCommandPalette();
        return;
    }

    activeSlashCommandIndex = Math.min(activeSlashCommandIndex, visibleSlashCommandMatches.length - 1);
    slashCommandPalette.replaceChildren(...visibleSlashCommandMatches.map((command, index) => {
        const displayCommand = String(command.command || command.name || "").replace(/^\//, "");
        const unavailableReason = getSlashCommandUnavailableReason(command);
        const option = document.createElement("button");
        option.id = `slash-command-${command.name}`;
        option.className = "slash-command-option";
        option.type = "button";
        option.disabled = Boolean(unavailableReason);
        option.classList.toggle("composer-control-unavailable", Boolean(unavailableReason));
        if (unavailableReason) option.dataset.tooltip = unavailableReason;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === activeSlashCommandIndex));
        option.innerHTML = `
            <span class="slash-command-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${command.icon}</svg>
            </span>
            <span class="slash-command-copy">
                <span class="slash-command-name">${escapeHtml(displayCommand)}</span>
                <span class="slash-command-desc">${escapeHtml(command.description)}</span>
            </span>
        `;
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => applySlashCommandSuggestion(command));
        return option;
    }));
    slashCommandPalette.hidden = false;
    updateSlashCommandSelection();
}

function handleSlashCommandKeydown(event) {
    if (!slashCommandPalette || slashCommandPalette.hidden || visibleSlashCommandMatches.length === 0) return false;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeSlashCommandIndex = (activeSlashCommandIndex + direction + visibleSlashCommandMatches.length) % visibleSlashCommandMatches.length;
        updateSlashCommandSelection();
        return true;
    }

    if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        applySlashCommandSuggestion(visibleSlashCommandMatches[activeSlashCommandIndex]);
        return true;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        applySlashCommandSuggestion(visibleSlashCommandMatches[activeSlashCommandIndex]);
        return true;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        hideSlashCommandPalette();
        return true;
    }

    return false;
}

function clearComposerText() {
    if (!input) return;
    input.value = "";
    input.style.height = "auto";
    hideSlashCommandPalette();
    closeCommandMenu();
    updateTokenDisplay();
    scheduleComposerDraftSave({ immediate: true, render: true });
}

function showChatSurface() {
    if (welcome) welcome.style.display = "none";
    if (chat) chat.style.display = "block";
}

function renderCommandResult(commandText, resultText) {
    showChatSurface();
    const createdAt = new Date().toISOString();
    addRenderNode(commandText, "user", [], { createdAt });
    addRenderNode(resultText, "output", [], { createdAt: new Date().toISOString() });
    scrollChatToBottom();
    saveCurrentSession();
}

function ensureCommandMenu() {
    if (commandMenu || !composerPanel) return commandMenu;

    commandMenu = document.createElement("div");
    commandMenu.id = "commandMenu";
    commandMenu.className = "command-menu";
    commandMenu.hidden = true;
    commandMenu.setAttribute("role", "dialog");
    commandMenu.setAttribute("aria-label", "Command menu");

    commandMenuSearchInput = document.createElement("input");
    commandMenuSearchInput.className = "command-menu-search";
    commandMenuSearchInput.type = "search";
    commandMenuSearchInput.autocomplete = "off";
    commandMenuSearchInput.spellcheck = false;

    commandMenuList = document.createElement("div");
    commandMenuList.className = "command-menu-list";
    commandMenuList.setAttribute("role", "listbox");

    commandMenu.append(commandMenuSearchInput, commandMenuList);
    composerPanel.appendChild(commandMenu);

    commandMenuSearchInput.addEventListener("input", renderCommandMenuItems);
    commandMenuSearchInput.addEventListener("keydown", handleCommandMenuKeydown);

    return commandMenu;
}

function closeCommandMenu() {
    if (!commandMenu) return;
    commandMenu.hidden = true;
    commandMenuItems = [];
    visibleCommandMenuItems = [];
    activeCommandMenuIndex = 0;
}

function commandMenuItemMatches(item, query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return true;
    return [
        item.label,
        item.meta,
        item.description,
        item.searchText
    ].some(value => String(value || "").toLowerCase().includes(needle));
}

function updateCommandMenuSelection() {
    if (!commandMenuList) return;
    const options = Array.from(commandMenuList.querySelectorAll(".command-menu-option"));
    options.forEach((option, index) => {
        const active = index === activeCommandMenuIndex;
        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", String(active));
    });
}

function runCommandMenuItem(item) {
    if (!item || item.disabled || item.readOnly || typeof item.action !== "function") return;
    closeCommandMenu();
    item.action?.();
}

function renderCommandMenuItems() {
    if (!commandMenuList) return;
    const query = commandMenuSearchInput?.value || "";
    visibleCommandMenuItems = commandMenuItems.filter(item => commandMenuItemMatches(item, query));
    activeCommandMenuIndex = Math.min(activeCommandMenuIndex, Math.max(visibleCommandMenuItems.length - 1, 0));

    if (visibleCommandMenuItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "command-menu-empty";
        empty.textContent = "No matches";
        commandMenuList.replaceChildren(empty);
        return;
    }

    commandMenuList.replaceChildren(...visibleCommandMenuItems.map((item, index) => {
        const option = document.createElement("button");
        option.className = "command-menu-option";
        option.type = "button";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === activeCommandMenuIndex));
        option.disabled = Boolean(item.disabled);
        option.classList.toggle("read-only", Boolean(item.readOnly));

        const label = document.createElement("span");
        label.className = "command-menu-label";
        label.textContent = item.label;

        const meta = document.createElement("small");
        meta.className = "command-menu-meta";
        meta.textContent = item.meta || "";

        const check = document.createElement("span");
        check.className = "command-menu-check";
        check.setAttribute("aria-hidden", "true");
        check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>';

        option.classList.toggle("selected", Boolean(item.selected));
        option.append(label, meta, check);
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => runCommandMenuItem(item));
        return option;
    }));
    updateCommandMenuSelection();
}

function handleCommandMenuKeydown(event) {
    if (!commandMenu || commandMenu.hidden) return;

    if (event.key === "Escape") {
        event.preventDefault();
        closeCommandMenu();
        input?.focus();
        return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (visibleCommandMenuItems.length === 0) return;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeCommandMenuIndex = (activeCommandMenuIndex + direction + visibleCommandMenuItems.length) % visibleCommandMenuItems.length;
        updateCommandMenuSelection();
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        runCommandMenuItem(visibleCommandMenuItems[activeCommandMenuIndex]);
    }
}

function openCommandMenu({ placeholder = "Search", items = [], query = "", label = "Command menu" } = {}) {
    const menu = ensureCommandMenu();
    if (!menu || !commandMenuSearchInput || !commandMenuList) return;

    modelSwitcher?.close?.();
    toolsDropdown?.classList.remove("open");
    closeVoiceQuickPanel();
    closeCommandMenu();
    commandMenuItems = items;
    activeCommandMenuIndex = 0;
    commandMenuSearchInput.placeholder = placeholder;
    commandMenuSearchInput.setAttribute("aria-label", placeholder);
    commandMenuList.setAttribute("aria-label", label);
    commandMenuSearchInput.value = query;
    menu.hidden = false;
    renderCommandMenuItems();
    window.setTimeout(() => {
        commandMenuSearchInput?.focus();
        commandMenuSearchInput?.select();
    }, 0);
}

function setComposerCommandText(text) {
    if (!input) return;
    input.value = text;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    updateTokenDisplay();
    scheduleComposerDraftSave({ render: true });
    input.focus();
}

