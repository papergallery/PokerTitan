import { test, expect } from '@playwright/test'

test.describe('No console errors', () => {
  const pages = [
    { name: 'Landing', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Register', path: '/register' },
  ]

  for (const { name, path } of pages) {
    test(`${name} page has no console errors`, async ({ page }) => {
      const errors: string[] = []
      const pageErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (err) => pageErrors.push(err.message))

      await page.goto(path)
      await page.waitForLoadState('networkidle')

      expect(errors, `Console errors on ${name}: ${errors.join(', ')}`).toHaveLength(0)
      expect(pageErrors, `Page errors on ${name}: ${pageErrors.join(', ')}`).toHaveLength(0)
    })
  }
})
