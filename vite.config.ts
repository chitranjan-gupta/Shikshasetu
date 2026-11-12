import { resolve } from 'path'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Resolve root path
const root = resolve(__dirname, 'src')
const CHROME_ENV = process.env.CHROME_ENV;
const isChrome = CHROME_ENV ? CHROME_ENV.toLowerCase() === "true" : undefined;
const name = typeof isChrome !== "undefined" ? isChrome ? '-chrome' : '-firefox' : '';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: `src/manifest${name}.json`,
          dest: '.', // Copy manifest to the root of the build folder
          rename: 'manifest.json'
        },
        {
          src: 'src/assets/icons/icon16.png',
          dest: './assets/icons/', // Copy manifest to the root of the build folder
        },
        {
          src: 'src/assets/icons/icon32.png',
          dest: './assets/icons/', // Copy manifest to the root of the build folder
        },
        {
          src: 'src/assets/icons/icon48.png',
          dest: './assets/icons/', // Copy manifest to the root of the build folder
        },
        {
          src: 'src/assets/icons/icon128.png',
          dest: './assets/icons/', // Copy manifest to the root of the build folder
        },
        {
          src: '_locales',
          dest: '.', // Copy _locales to the root of the build folder
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': root, // Alias for 'src' directory
    },
  },
  build: {
    outDir: 'build', // Output directory
    emptyOutDir: true, // Clean output directory before build
    chunkSizeWarningLimit: 1000, // Extension bundle limit
    rollupOptions: {
      input: {
        index: resolve('./index.html'),
        popup: resolve(root, 'popup', 'index.html'), // Entry point for popup (index.html)
        option: resolve(root, 'option', 'index.html'), // Entry point for option (index.html)
        sidepanel: resolve(root, 'sidepanel', 'index.html'), // Entry point for sidepanel (index.html)
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('rehype') || id.includes('remark') || id.includes('micromark') || id.includes('highlight.js')) {
              return 'vendor-markdown';
            }
            if (id.includes('@legendapp/state')) {
              return 'vendor-legendapp';
            }
          }
        },
      },
    },
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
  },
});
