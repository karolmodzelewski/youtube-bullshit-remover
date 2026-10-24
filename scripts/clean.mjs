// Empties dist/ before a production build.
//
// Neither Vite pass does this itself: both write into the same dist/ and run
// concurrently as watchers during development, so whichever started second
// would delete the other's output.
import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
