import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeChrome } from '../test/fakeChrome';

const ATTRIBUTES = ['data-ybr-shorts', 'data-ybr-playables', 'data-ybr-most-relevant'];

const root = document.documentElement;
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
// Lets the MutationObserver queue its frame first, then waits for that frame.
const nextFrame = async () => {
    await flushPromises();
    await new Promise((resolve) => requestAnimationFrame(resolve));
};

async function startContentScript(fake = createFakeChrome()) {
    vi.stubGlobal('chrome', fake.chrome);
    vi.resetModules();
    await import('./index');
    return fake;
}

function addChip(label: string): Element {
    const chip = document.createElement('yt-chip-cloud-chip-renderer');
    chip.textContent = ` ${label} `;
    document.body.append(chip);
    return chip;
}

beforeEach(() => {
    for (const attribute of root.getAttributeNames()) {
        if (attribute.startsWith('data-ybr-')) {
            root.removeAttribute(attribute);
        }
    }
    document.body.replaceChildren();
});

describe('settings switches on <html>', () => {
    it('turns every switch on before storage has answered', async () => {
        // Arrange
        const fake = createFakeChrome({ settings: { hideShorts: false } });
        fake.chrome.storage.sync.get = () => new Promise(() => {});

        // Act
        await startContentScript(fake);

        // Assert
        for (const attribute of ATTRIBUTES) {
            expect(root.getAttribute(attribute)).toBe('off');
        }
    });

    it('applies stored settings once they load', async () => {
        // Arrange
        const fake = createFakeChrome({ settings: { hideShorts: false } });

        // Act
        await startContentScript(fake);
        await flushPromises();

        // Assert
        expect(root.hasAttribute('data-ybr-shorts')).toBe(false);
        expect(root.getAttribute('data-ybr-playables')).toBe('off');
        expect(root.getAttribute('data-ybr-most-relevant')).toBe('off');
    });

    it('follows settings changed from the popup', async () => {
        // Arrange
        const fake = await startContentScript();
        await flushPromises();

        // Act
        await fake.chrome.storage.sync.set({ settings: { hideShorts: true, hidePlayables: false, hideMostRelevant: false } });

        // Assert
        expect(root.getAttribute('data-ybr-shorts')).toBe('off');
        expect(root.hasAttribute('data-ybr-playables')).toBe(false);
        expect(root.hasAttribute('data-ybr-most-relevant')).toBe(false);
    });

    it('has a matching rule block in content.css for every switch', async () => {
        // Arrange
        const css = readFileSync('public/content.css', 'utf8');

        // Act
        await startContentScript();
        const switches = root.getAttributeNames().filter((name) => name.startsWith('data-ybr-'));

        // Assert
        expect(switches.sort()).toEqual([...ATTRIBUTES].sort());
        for (const attribute of switches) {
            expect(css).toContain(`html[${attribute}='off']`);
        }
    });
});

describe('Shorts search chip', () => {
    it('tags only the chip labelled "Shorts"', async () => {
        // Arrange
        await startContentScript();

        // Act
        const shorts = addChip('Shorts');
        const music = addChip('Music');
        await nextFrame();

        // Assert
        expect(shorts.hasAttribute('data-ybr-shorts-chip')).toBe(true);
        expect(music.hasAttribute('data-ybr-shorts-chip')).toBe(false);
    });

    it('untags a chip that YouTube recycles with a new label', async () => {
        // Arrange
        await startContentScript();
        const chip = addChip('Shorts');
        await nextFrame();

        // Act
        chip.firstChild!.nodeValue = 'Live';
        await nextFrame();

        // Assert
        expect(chip.hasAttribute('data-ybr-shorts-chip')).toBe(false);
    });
});
