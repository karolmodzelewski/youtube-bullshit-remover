import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, type Settings } from '../shared/settings';

const CSS_ATTRIBUTES: Record<keyof Settings, string> = {
    hideShorts: 'data-ybr-shorts',
    hidePlayables: 'data-ybr-playables',
    hideMostRelevant: 'data-ybr-most-relevant',
};

function applyCss(settings: Settings): void {
    const root = document.documentElement;
    for (const [key, attribute] of Object.entries(CSS_ATTRIBUTES) as [keyof Settings, string][]) {
        if (settings[key]) {
            root.setAttribute(attribute, 'off');
        } else {
            root.removeAttribute(attribute);
        }
    }
}

applyCss(DEFAULT_SETTINGS);

void loadSettings().then(applyCss);

onSettingsChanged(applyCss);

/**
 * The "Shorts" filter chip on search results has no attribute, link or position
 * CSS could rely on — only its label, which YouTube leaves untranslated. Tag it
 * so content.css can hide it; the tag does nothing while the setting is off, so
 * this runs regardless. YouTube recycles chip elements between searches, so
 * every chip is re-checked rather than tagged once.
 */
function tagShortsChips(): void {
    for (const chip of document.querySelectorAll('yt-chip-cloud-chip-renderer')) {
        chip.toggleAttribute('data-ybr-shorts-chip', chip.textContent?.trim() === 'Shorts');
    }
}

// Batched to at most one pass per frame: YouTube mutates the DOM constantly.
let tagQueued = false;

new MutationObserver(() => {
    if (tagQueued) {
        return;
    }

    tagQueued = true;

    requestAnimationFrame(() => {
        tagQueued = false;

        tagShortsChips();
    });
}).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
});
