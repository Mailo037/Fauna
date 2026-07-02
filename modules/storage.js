const CURRENT_STORAGE_PREFIX = "fauna";
const LEGACY_STORAGE_PREFIX = "flo" + "ra";

function getDesktopStorage() {
    const api = globalThis.faunaDesktop;
    return api?.isDesktop && typeof api.storageGet === "function" ? api : null;
}

function getLegacyStorageKey(key) {
    if (typeof key !== "string" || !key.startsWith(CURRENT_STORAGE_PREFIX)) return "";
    return `${LEGACY_STORAGE_PREFIX}${key.slice(CURRENT_STORAGE_PREFIX.length)}`;
}

export function safeLocalStorageGet(key) {
    try {
        const desktopStorage = getDesktopStorage();
        if (desktopStorage) {
            const desktopValue = desktopStorage.storageGet(key);
            if (desktopValue !== null && desktopValue !== undefined) {
                localStorage.removeItem(key);
                const legacyKey = getLegacyStorageKey(key);
                if (legacyKey) localStorage.removeItem(legacyKey);
                return desktopValue;
            }
        }

        const value = localStorage.getItem(key);
        if (value !== null) {
            if (desktopStorage && desktopStorage.storageSet(key, value)) {
                localStorage.removeItem(key);
                const legacyKey = getLegacyStorageKey(key);
                if (legacyKey) localStorage.removeItem(legacyKey);
            }
            return value;
        }

        const legacyKey = getLegacyStorageKey(key);
        if (!legacyKey) return null;

        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue !== null) {
            if (desktopStorage) {
                if (desktopStorage.storageSet(key, legacyValue)) {
                    localStorage.removeItem(legacyKey);
                }
            } else {
                localStorage.setItem(key, legacyValue);
            }
        }
        return legacyValue;
    } catch (err) {
        console.warn(`Could not read Fauna storage key "${key}":`, err);
        return null;
    }
}

export function safeLocalStorageSet(key, value, { silent = false } = {}) {
    try {
        const desktopStorage = getDesktopStorage();
        if (desktopStorage) return desktopStorage.storageSet(key, value);

        localStorage.setItem(key, value);
        const legacyKey = getLegacyStorageKey(key);
        if (legacyKey) localStorage.removeItem(legacyKey);
        return true;
    } catch (err) {
        if (!silent) {
            console.warn(`Could not write Fauna storage key "${key}":`, err);
        }
        return false;
    }
}

export function safeLocalStorageRemove(key) {
    try {
        const desktopStorage = getDesktopStorage();
        if (desktopStorage) return desktopStorage.storageRemove(key);

        localStorage.removeItem(key);
        const legacyKey = getLegacyStorageKey(key);
        if (legacyKey) localStorage.removeItem(legacyKey);
        return true;
    } catch (err) {
        console.warn(`Could not remove Fauna storage key "${key}":`, err);
        return false;
    }
}
