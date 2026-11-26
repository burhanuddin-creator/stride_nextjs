import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks against a production build (`next build` + `next start`) in DEMO mode
 * (NEXT_PUBLIC_USE_MOCK_API=true): the request form sends nothing. The real HTTP adapters are covered separately by
 * playwright.http.config.ts against an intercepted fake API.
 * By default this uses the locally installed Microsoft Edge (no browser download). Set PW_CHANNEL=chrome to use Google
 * Chrome, or PW_CHANNEL=chromium after running `npx playwright install chromium`.
 */
const channel = process.env.PW_CHANNEL ?? 'msedge';
const port = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    channel: channel === 'chromium' ? undefined : channel,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    // Always build and serve fresh, so a server already on the port (e.g. an HTTP-mode build) is never tested.
    command: `npm run build && npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 400_000,
    // Pinned so a developer's .env.local can never make this build talk to a real API.
    env: { NEXT_PUBLIC_USE_MOCK_API: 'true', NEXT_PUBLIC_API_BASE_URL: 'http://api.stride.test/api/v1', SITE_URL: '', SITE_ENV: '' },
  },
});
