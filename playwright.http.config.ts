import { defineConfig, devices } from '@playwright/test';

/**
 * The real HTTP adapters against an intercepted fake API (e2e-http/). The build's API base URL is a reserved .test
 * host that never resolves, and every request to it is answered by the tests — nothing reaches Laravel, SPRY or
 * SendGrid. Run with: npm run test:e2e:http
 * Note: this rebuilds .next/ in HTTP mode; run `npm run build` again before deploying.
 */
const channel = process.env.PW_CHANNEL ?? 'msedge';
const port = 4174;

export default defineConfig({
  testDir: './e2e-http',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results/http',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    channel: channel === 'chromium' ? undefined : channel,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npx next build && npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 400_000,
    env: { NEXT_PUBLIC_USE_MOCK_API: 'false', NEXT_PUBLIC_API_BASE_URL: 'http://api.stride.test/api/v1', SITE_URL: '', SITE_ENV: '' },
  },
});
