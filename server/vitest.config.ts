import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    silent: true,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
})
