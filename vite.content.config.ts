import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
            entry: 'src/content/index.ts',
            name: 'YouTubeBullshitRemover',
            formats: ['iife'],
            fileName: () => 'content.js',
        },
    },
});
