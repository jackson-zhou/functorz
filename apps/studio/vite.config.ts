/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@antv/x6': resolve(__dirname, 'node_modules/@antv/x6/es/index.js'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  optimizeDeps: {
    include: ['@antv/x6'],
  },
  test: {
    server: {
      deps: {
        inline: ['@antv/x6'],
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
})
