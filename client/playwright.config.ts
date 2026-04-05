import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://185.70.184.239',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
})
