import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    server: { open: '/popup.html' },
    build: {
        emptyOutDir: false,
        rollupOptions: {
            input: { popup: 'popup.html' },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
});
