import { defineConfig, devices } from '@playwright/test'

const port = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_ENABLE_MSW: 'true' },
    timeout: 180_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet-chromium',
      grep: /@responsive/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
})
