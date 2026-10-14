import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  use: { serviceWorkers: 'block', baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI && process.env.OFFLINE_ACCEPTANCE !== '1',
  },
})
