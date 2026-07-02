const CURRENT_STORAGE_PREFIX = "fauna";
const LEGACY_STORAGE_PREFIX = "flo" + "ra";

function getLegacyStorageKey(key) {
    if (typeof key !== "string" || !key.startsWith(CURRENT_STORAGE_PREFIX)) return "";
    return `${LEGACY_STORAGE_PREFIX}${key.slice(CURRENT_STORAGE_PREFIX.length)}`;
}

export function safeLocalStorageGet(key) {
    try {
        const value = localStorage.getItem(key);
        if (value !== null) return value;

        const legacyKey = getLegacyStorageKey(key);
        if (!legacyKey) return null;

        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue !== null) {
            localStorage.setItem(key, legacyValue);
        }
        return legacyValue;
    } catch (err) {
        console.warn(`Could not read localStorage key "${key}":`, err);
        return null;
    }
}

export function safeLocalStorageSet(key, value, { silent = false } = {}) {
    try {
        localStorage.setItem(key, value);
        const legacyKey = getLegacyStorageKey(key);
        if (legacyKey) localStorage.removeItem(legacyKey);
        return true;
    } catch (err) {
        if (!silent) {
            console.warn(`Could not write localStorage key "${key}":`, err);
        }
        return false;
    }
}

export function safeLocalStorageRemove(key) {
    try {
        localStorage.removeItem(key);
        const legacyKey = getLegacyStorageKey(key);
        if (legacyKey) localStorage.removeItem(legacyKey);
        return true;
    } catch (err) {
        console.warn(`Could not remove localStorage key "${key}":`, err);
        return false;
    }
}
