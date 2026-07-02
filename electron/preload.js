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
  }
});
