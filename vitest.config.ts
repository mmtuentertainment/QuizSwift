import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    alias: {
      // Vitest 4.x: Use new URL() for correct path resolution
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
})
