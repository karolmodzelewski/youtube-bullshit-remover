import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTING_KEYS, SETTING_LABELS } from '../shared/settings';
import Popup from './Popup';

// No `chrome` global in jsdom, so settings.ts runs on its localStorage dev backend.

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const toggleFor = (title: string) => screen.findByRole<HTMLInputElement>('checkbox', { name: new RegExp(title) });

describe('Popup', () => {
    it('is busy while settings are loading', () => {
        // Act
        render(<Popup />);

        // Assert
        expect(screen.getByRole('list').getAttribute('aria-busy')).toBe('true');
    });

    it('is no longer busy once settings have loaded', async () => {
        // Act
        render(<Popup />);
        await screen.findAllByRole('checkbox');

        // Assert
        expect(screen.getByRole('list').getAttribute('aria-busy')).toBe('false');
    });

    it('renders one labelled toggle per setting, all on by default', async () => {
        // Act
        render(<Popup />);
        const toggles = await screen.findAllByRole<HTMLInputElement>('checkbox');

        // Assert
        expect(toggles).toHaveLength(SETTING_KEYS.length);

        for (const key of SETTING_KEYS) {
            expect((await toggleFor(SETTING_LABELS[key].title)).checked).toBe(true);
            expect(screen.getByText(SETTING_LABELS[key].hint)).toBeDefined();
        }
    });

    it('reflects stored settings', async () => {
        // Arrange
        localStorage.setItem('settings', JSON.stringify({ hideShorts: false }));

        // Act
        render(<Popup />);

        // Assert
        expect((await toggleFor(SETTING_LABELS.hideShorts.title)).checked).toBe(false);
        expect((await toggleFor(SETTING_LABELS.hidePlayables.title)).checked).toBe(true);
    });

    it('saves a toggled setting', async () => {
        // Arrange
        render(<Popup />);
        const toggle = await toggleFor(SETTING_LABELS.hidePlayables.title);

        // Act
        fireEvent.click(toggle);

        // Assert
        expect(toggle.checked).toBe(false);
        expect(JSON.parse(localStorage.getItem('settings')!)).toEqual({ ...DEFAULT_SETTINGS, hidePlayables: false });
    });
});
