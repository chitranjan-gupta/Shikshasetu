import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const root = resolve(__dirname, 'src')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': root,
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'content-menu': resolve(root, 'content-menu.ts'),
      },
      output: {
        entryFileNames: 'content-menu.js',
        format: 'iife',
      },
    },
  },
})
