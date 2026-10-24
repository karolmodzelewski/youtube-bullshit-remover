# YouTube Bullshit Remover

A Chrome/Brave (MV3) extension that hides YouTube Shorts and other noise. React
popup for the toggles, CSS for the hiding.

Three settings, defined once in [src/shared/settings.ts](src/shared/settings.ts),
all on by default: hide Shorts, hide Playables (YouTube's mini-games), and hide
the "Most relevant" shelf on the Subscriptions page (PL: "Najtrafniejsze").
Comments and the recommendations next to a video are deliberately left alone.

## How it works

The hiding is **declarative**: [public/content.css](public/content.css) is
injected at `document_start`, before the page paints, so nothing flashes and
nothing needs re-running when YouTube re-renders. Every rule is gated on a
`data-ybr-*` attribute on `<html>`.

[src/content/index.ts](src/content/index.ts) exists only to flip those
attributes from stored settings, plus tag the Shorts filter chip on search
results, which CSS can't identify by anything but its label. It's under 2 kB
built.

The popup writes to `chrome.storage.sync` and the content script listens on
`chrome.storage.onChanged` — that is the entire channel between them, so there
is no message passing and no background service worker.

| Path                                               | Role                                     |
| -------------------------------------------------- | ---------------------------------------- |
| [public/manifest.json](public/manifest.json)       | MV3 manifest                             |
| [public/content.css](public/content.css)           | **Every** YouTube selector lives here    |
| [src/content/index.ts](src/content/index.ts)       | Flips `data-ybr-*` from stored settings  |
| [src/shared/settings.ts](src/shared/settings.ts)   | Settings type, defaults, labels, storage |
| [popup.html](popup.html), [src/popup/](src/popup/) | React toggle UI                          |
| `src/**/*.test.ts(x)`, [src/test/](src/test/)      | Vitest unit tests, `chrome.storage` fake |

## Install it locally

```sh
npm install
npm run build
```

1. Open `brave://extensions` (or `chrome://extensions`)
2. Toggle **Developer mode**, top right
3. **Load unpacked** → select the **`dist` folder**, not the repo root
4. Pin the icon from the puzzle-piece menu

The browser reads `dist/` from disk, so later rebuilds are picked up without
returning to this page. Files are never copied into the browser.

## Development

```sh
npm run dev:ext   # watch-build dist/ — the loop to use with the extension loaded
npm run dev       # popup UI only, at localhost:5173/popup.html, with HMR
npm test          # unit tests (Vitest + jsdom); npm run test:watch to keep it running
npm run lint
npm run format    # Prettier; npm run format:check to verify only
```

With `dev:ext` running, what each change needs:

| Changed         | Needed                                               |
| --------------- | ---------------------------------------------------- |
| Popup React/CSS | **Nothing** — close and reopen the popup             |
| `content.css`   | ↻ on the extension card, then reload the YouTube tab |
| Content script  | ↻ on the extension card, then reload the YouTube tab |
| `manifest.json` | ↻ on the extension card (always), then reload        |

Extension pages reload from disk whenever they open, which is why the popup needs
no reload. Content scripts and the manifest are read when the extension loads,
which is why they do.

For popup layout and CSS, `npm run dev` is the faster loop: real HMR in an
ordinary tab, with `localStorage` standing in for `chrome.storage` (see
`inExtension` in [src/shared/settings.ts](src/shared/settings.ts)).

### Debugging

The three contexts have separate consoles:

- **Popup** — right-click the toolbar icon → _Inspect popup_
- **Content script** — the YouTube page's own DevTools console; in Sources it's
  under the _Content scripts_ tab
- **Stored settings** — from the popup's console: `chrome.storage.sync.get(console.log)`
- **Manifest errors** — the red _Errors_ button on the extension card names the field

When something isn't being hidden, check `document.documentElement.dataset` in
the page console:

- attribute missing → the content script didn't run, or the setting is off
- attribute present but the element is visible → a selector in
  [public/content.css](public/content.css) has rotted; inspect the element, find
  its current custom-element name, and fix that one file

YouTube renames its custom elements without notice, so selector rot is the
expected failure mode — that's why it's confined to a single file.

## Build layout

Two Vite passes write into a shared `dist/`:

- **Popup** ([vite.config.ts](vite.config.ts)) — a normal HTML entry. Output
  names are unhashed: an extension loads from disk, so there's no HTTP cache to
  bust, and stable names let watch rebuilds overwrite in place.
- **Content script** ([vite.content.config.ts](vite.content.config.ts)) — library
  mode, `iife` format. MV3 content scripts are classic scripts; there is no
  `"type": "module"` for them, and hashed, code-split ESM can't be named in a
  manifest.

Neither pass empties `dist/` (they'd delete each other's output while watching),
so `npm run build` runs `scripts/clean.mjs` first.
