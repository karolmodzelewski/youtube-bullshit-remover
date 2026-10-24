export type Settings = {
    hideShorts: boolean;
    hidePlayables: boolean;
    hideMostRelevant: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
    hideShorts: true,
    hidePlayables: true,
    hideMostRelevant: true,
};

export const SETTING_LABELS: Record<keyof Settings, { title: string; hint: string }> = {
    hideShorts: {
        title: 'Hide Shorts',
        hint: 'Shelves, feed entries, sidebar link and channel tab',
    },
    hidePlayables: {
        title: 'Hide Playables',
        hint: 'Game shelves on Home and in search, sidebar link',
    },
    hideMostRelevant: {
        title: 'Hide “Most relevant”',
        hint: 'The ranked shelf at the top of Subscriptions',
    },
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

/** Everything lives under one key, so a change fires one onChanged event. */
const STORAGE_KEY = 'settings';

type StorageArea = {
    get(key: string): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
};

/**
 * True inside the extension, false on the Vite dev server (`npm run dev`), where
 * the popup is just a page in an ordinary tab and no `chrome` global exists.
 *
 * `typeof chrome` rather than `chrome?.storage`: `chrome` is undeclared in a
 * normal tab, and a bare reference throws ReferenceError before optional
 * chaining gets a chance to help.
 */
const inExtension = typeof chrome !== 'undefined' && chrome.storage !== undefined;

/**
 * Dev-server stand-in, so popup layout and CSS can be iterated on with HMR
 * instead of rebuild-and-reopen. Never reached inside the extension.
 */
const devArea: StorageArea = {
    get: (key) => {
        const raw = localStorage.getItem(key);
        return Promise.resolve(raw === null ? {} : { [key]: JSON.parse(raw) as unknown });
    },
    set: (items) => {
        for (const [key, value] of Object.entries(items)) {
            localStorage.setItem(key, JSON.stringify(value));
        }
        return Promise.resolve();
    },
};

/**
 * `sync` rather than `local` so settings follow the user across their signed-in
 * browsers. The payload is a few booleans, nowhere near the sync quota.
 */
const area: StorageArea = inExtension ? chrome.storage.sync : devArea;

export async function loadSettings(): Promise<Settings> {
    const stored = await area.get(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
    await area.set({ [STORAGE_KEY]: settings });
}

/**
 * Fires whenever settings change in any context - this is the entire
 * popup-to-content-script channel, so neither side needs message passing.
 * Returns an unsubscribe function.
 */
export function onSettingsChanged(callback: (settings: Settings) => void): () => void {
    // On the dev server there is no second context to stay in sync with.
    if (!inExtension) {
        return () => undefined;
    }

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        if (areaName !== 'sync' || !(STORAGE_KEY in changes)) {
            return;
        }
        callback({
            ...DEFAULT_SETTINGS,
            ...(changes[STORAGE_KEY].newValue as Partial<Settings> | undefined),
        });
    };

    chrome.storage.onChanged.addListener(listener);

    return () => chrome.storage.onChanged.removeListener(listener);
}
