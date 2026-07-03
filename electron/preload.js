const { contextBridge, ipcRenderer, webUtils } = require("electron");

function invokeSync(channel, ...args) {
  return ipcRenderer.sendSync(channel, ...args);
}

function getFilePath(file) {
  try {
    return webUtils.getPathForFile(file) || "";
  } catch {
    return "";
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",").pop() : value);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveGeneratedMedia(payload = {}) {
  const sourceUrl = String(payload.sourceUrl || "");
  if (/^blob:/i.test(sourceUrl)) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Could not read generated media blob: ${response.status}`);
    const blob = await response.blob();
    return ipcRenderer.invoke("fauna:save-generated-media", {
      ...payload,
      sourceUrl: "",
      mimeType: payload.mimeType || blob.type || "application/octet-stream",
      dataBase64: await blobToBase64(blob)
    });
  }
  return ipcRenderer.invoke("fauna:save-generated-media", payload);
}

function onRendererEvent(channel, handler) {
  if (typeof handler !== "function") return () => {};
  const listener = (_event, payload) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("faunaDesktop", {
  isDesktop: true,
  storageGet(key) {
    return invokeSync("fauna:storage-get", key);
  },
  storageSet(key, value) {
    return Boolean(invokeSync("fauna:storage-set", key, value));
  },
  storageRemove(key) {
    return Boolean(invokeSync("fauna:storage-remove", key));
  },
  getFilePath,
  filePathToUrl(filePath) {
    return invokeSync("fauna:file-url", filePath);
  },
  getFilePreviewUrl(file) {
    const filePath = getFilePath(file);
    return filePath ? invokeSync("fauna:file-url", filePath) : "";
  },
  saveGeneratedMedia,
  getInfo() {
    return ipcRenderer.invoke("fauna:desktop-info");
  },
  getOllamaStatus() {
    return ipcRenderer.invoke("fauna:ollama-status");
  },
  ollamaFetch(payload = {}) {
    return ipcRenderer.invoke("fauna:ollama-fetch", payload);
  },
  pullOllamaModel(payload = {}) {
    return ipcRenderer.invoke("fauna:ollama-pull", payload);
  },
  cancelOllamaPull(payload = {}) {
    return ipcRenderer.invoke("fauna:ollama-pull-cancel", payload);
  },
  onOllamaPullProgress(handler) {
    return onRendererEvent("fauna:ollama-pull-progress", handler);
  },
  startOllama() {
    return ipcRenderer.invoke("fauna:start-ollama");
  },
  setWorkspaceAccessPolicy(policy) {
    return ipcRenderer.invoke("fauna:set-workspace-access-policy", policy);
  },
  projects: {
    chooseFolders() {
      return ipcRenderer.invoke("fauna:projects-choose-folders");
    },
    save(projects = []) {
      return ipcRenderer.invoke("fauna:projects-save", projects);
    },
    openPath(projectPath) {
      return ipcRenderer.invoke("fauna:projects-open-path", projectPath);
    },
    openTerminal(projectPath) {
      return ipcRenderer.invoke("fauna:projects-open-terminal", projectPath);
    },
    createWorktree(payload = {}) {
      return ipcRenderer.invoke("fauna:projects-create-worktree", payload);
    }
  },
  clearAppCache() {
    return ipcRenderer.invoke("fauna:clear-app-cache");
  },
  resetAppData(payload = {}) {
    return ipcRenderer.invoke("fauna:reset-app-data", payload);
  },
  window: {
    minimize() {
      return ipcRenderer.invoke("fauna:window-minimize");
    },
    toggleMaximize() {
      return ipcRenderer.invoke("fauna:window-toggle-maximize");
    },
    close() {
      return ipcRenderer.invoke("fauna:window-close");
    },
    getState() {
      return ipcRenderer.invoke("fauna:window-state");
    },
    onStateChanged(handler) {
      return onRendererEvent("fauna:window-state-changed", handler);
    }
  },
  navigation: {
    back() {
      return ipcRenderer.invoke("fauna:navigation-back");
    },
    forward() {
      return ipcRenderer.invoke("fauna:navigation-forward");
    },
    getState() {
      return ipcRenderer.invoke("fauna:navigation-state");
    },
    onChanged(handler) {
      return onRendererEvent("fauna:navigation-changed", handler);
    }
  },
  updates: {
    getState() {
      return ipcRenderer.invoke("fauna:update-state");
    },
    check() {
      return ipcRenderer.invoke("fauna:update-check");
    },
    install() {
      return ipcRenderer.invoke("fauna:update-install");
    },
    onStatus(handler) {
      return onRendererEvent("fauna:update-status", handler);
    }
  },
  quick: {
    rendererReady() {
      return ipcRenderer.invoke("fauna:main-renderer-ready");
    },
    getRecentChats(limit = 8) {
      return ipcRenderer.invoke("fauna:recent-chats", limit);
    },
    getModelState() {
      return ipcRenderer.invoke("fauna:quick-model-state");
    },
    openMain() {
      return ipcRenderer.invoke("fauna:quick-open-main");
    },
    openChat(chatId) {
      return ipcRenderer.invoke("fauna:quick-open-chat", chatId);
    },
    newChat() {
      return ipcRenderer.invoke("fauna:quick-new-chat");
    },
    sendPrompt(prompt) {
      return ipcRenderer.invoke("fauna:quick-send-prompt", prompt);
    },
    close() {
      return ipcRenderer.invoke("fauna:quick-close");
    },
    onOpenChat(handler) {
      return onRendererEvent("fauna:open-chat", handler);
    },
    onNewChat(handler) {
      return onRendererEvent("fauna:new-chat", handler);
    },
    onPrompt(handler) {
      return onRendererEvent("fauna:quick-prompt", handler);
    },
    onRecentChatsChanged(handler) {
      return onRendererEvent("fauna:recent-chats-changed", handler);
    }
  }
});
