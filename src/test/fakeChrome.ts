type Changes = Record<string, chrome.storage.StorageChange>;
type Listener = (changes: Changes, areaName: string) => void;

/** In-memory stand-in for the parts of `chrome` that src/shared/settings.ts touches. */
export function createFakeChrome(initial: Record<string, unknown> = {}) {
    const data: Record<string, unknown> = { ...initial };
    const listeners = new Set<Listener>();

    const emit = (changes: Changes, areaName = 'sync') => {
        for (const listener of listeners) {
            listener(changes, areaName);
        }
    };

    const chrome = {
        storage: {
            sync: {
                get: (key: string) => Promise.resolve(key in data ? { [key]: data[key] } : {}),
                set: (items: Record<string, unknown>) => {
                    const changes: Changes = {};
                    for (const [key, newValue] of Object.entries(items)) {
                        changes[key] = { oldValue: data[key], newValue };
                        data[key] = newValue;
                    }
                    emit(changes);
                    return Promise.resolve();
                },
            },
            onChanged: {
                addListener: (listener: Listener) => listeners.add(listener),
                removeListener: (listener: Listener) => listeners.delete(listener),
            },
        },
    };

    return { chrome, data, emit, listeners };
}
