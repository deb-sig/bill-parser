/// <reference types="vitest/config" />

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.csv"],
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src'],
      reporter: ['text', 'json', 'html'],
    },
  },
})
