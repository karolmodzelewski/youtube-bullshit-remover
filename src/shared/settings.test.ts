import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeChrome } from '../test/fakeChrome';

// settings.ts picks its storage backend at import time, so every test imports it fresh.
const importSettings = () => import('./settings');

beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
});

describe('setting definitions', () => {
    it('exposes every default as a key, each with a label', async () => {
        // Arrange
        const { DEFAULT_SETTINGS, SETTING_KEYS, SETTING_LABELS } = await importSettings();

        // Assert
        expect(SETTING_KEYS).toEqual(Object.keys(DEFAULT_SETTINGS));

        for (const key of SETTING_KEYS) {
            expect(SETTING_LABELS[key].title).not.toBe('');
            expect(SETTING_LABELS[key].hint).not.toBe('');
        }
    });
});

describe('inside the extension', () => {
    it('loads the defaults when nothing is stored', async () => {
        // Arrange
        vi.stubGlobal('chrome', createFakeChrome().chrome);
        const { DEFAULT_SETTINGS, loadSettings } = await importSettings();

        // Act
        const settings = await loadSettings();

        // Assert
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('merges stored values over the defaults', async () => {
        // Arrange
        vi.stubGlobal('chrome', createFakeChrome({ settings: { hideShorts: false } }).chrome);
        const { loadSettings } = await importSettings();

        // Act
        const settings = await loadSettings();

        // Assert
        expect(settings).toEqual({ hideShorts: false, hidePlayables: true, hideMostRelevant: true });
    });

    it('saves everything under a single key in sync storage', async () => {
        // Arrange
        const fake = createFakeChrome();
        vi.stubGlobal('chrome', fake.chrome);
        const { DEFAULT_SETTINGS, saveSettings } = await importSettings();
        const next = { ...DEFAULT_SETTINGS, hidePlayables: false };

        // Act
        await saveSettings(next);

        // Assert
        expect(fake.data).toEqual({ settings: next });
    });

    it('reports changes merged over the defaults', async () => {
        // Arrange
        const fake = createFakeChrome();
        vi.stubGlobal('chrome', fake.chrome);
        const { onSettingsChanged } = await importSettings();
        const callback = vi.fn();
        onSettingsChanged(callback);

        // Act
        fake.emit({ settings: { newValue: { hideMostRelevant: false } } });

        // Assert
        expect(callback).toHaveBeenCalledExactlyOnceWith({ hideShorts: true, hidePlayables: true, hideMostRelevant: false });
    });

    it('falls back to the defaults when the stored value is removed', async () => {
        // Arrange
        const fake = createFakeChrome();
        vi.stubGlobal('chrome', fake.chrome);
        const { DEFAULT_SETTINGS, onSettingsChanged } = await importSettings();
        const callback = vi.fn();
        onSettingsChanged(callback);

        // Act
        fake.emit({ settings: { oldValue: { hideShorts: false } } });

        // Assert
        expect(callback).toHaveBeenCalledExactlyOnceWith(DEFAULT_SETTINGS);
    });

    it('ignores other storage areas and unrelated keys', async () => {
        // Arrange
        const fake = createFakeChrome();
        vi.stubGlobal('chrome', fake.chrome);
        const { onSettingsChanged } = await importSettings();
        const callback = vi.fn();
        onSettingsChanged(callback);

        // Act
        fake.emit({ settings: { newValue: { hideShorts: false } } }, 'local');
        fake.emit({ somethingElse: { newValue: 1 } });

        // Assert
        expect(callback).not.toHaveBeenCalled();
    });

    it('stops reporting after unsubscribing', async () => {
        // Arrange
        const fake = createFakeChrome();
        vi.stubGlobal('chrome', fake.chrome);
        const { onSettingsChanged } = await importSettings();
        const callback = vi.fn();
        const unsubscribe = onSettingsChanged(callback);

        // Act
        unsubscribe();
        fake.emit({ settings: { newValue: { hideShorts: false } } });

        // Assert
        expect(callback).not.toHaveBeenCalled();
        expect(fake.listeners.size).toBe(0);
    });
});

describe('on the dev server', () => {
    it('loads the defaults when nothing is stored', async () => {
        // Arrange
        const { DEFAULT_SETTINGS, loadSettings } = await importSettings();

        // Act
        const settings = await loadSettings();

        // Assert
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('round-trips saved settings through localStorage', async () => {
        // Arrange
        const { DEFAULT_SETTINGS, loadSettings, saveSettings } = await importSettings();
        const next = { ...DEFAULT_SETTINGS, hideShorts: false };

        // Act
        await saveSettings(next);
        const loaded = await loadSettings();

        // Assert
        expect(JSON.parse(localStorage.getItem('settings')!)).toEqual(next);
        expect(loaded).toEqual(next);
    });

    it('never reports changes', async () => {
        // Arrange
        const { onSettingsChanged } = await importSettings();

        // Act
        const unsubscribe = onSettingsChanged(vi.fn());

        // Assert
        expect(unsubscribe).toBeTypeOf('function');
        expect(() => unsubscribe()).not.toThrow();
    });
});
