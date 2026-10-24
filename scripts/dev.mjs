// Watch-builds the extension into dist/ — the loop to use while the unpacked
// extension is loaded in the browser.
//
// Both Vite passes run from this one process, which avoids needing `concurrently`
// just to hold two watchers open. Each build() call returns once its watcher is
// attached; the watchers then keep the process alive.
import { build } from 'vite';

// Content script first: the popup pass must not start before this file exists.
await build({ configFile: 'vite.content.config.ts', build: { watch: {} } });
await build({ configFile: 'vite.config.ts', build: { watch: {} } });

console.log('\nWatching. Popup changes: reopen the popup. Content script, content.css or manifest changes: click ↻ on the extension card, then reload the YouTube tab.\n');
