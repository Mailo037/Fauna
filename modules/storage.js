export function safeLocalStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (err) {
        console.warn(`Could not read localStorage key "${key}":`, err);
        return null;
    }
}

export function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        console.warn(`Could not write localStorage key "${key}":`, err);
        return false;
    }
}

export function safeLocalStorageRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (err) {
        console.warn(`Could not remove localStorage key "${key}":`, err);
        return false;
    }
}
