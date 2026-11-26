import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Next.js static image imports are { src, width, height } objects (StaticImageData); mirror that shape in tests. */
function nextStaticImages(): Plugin {
  return {
    name: 'next-static-images',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0];
      if (!/\.(png|jpe?g|webp|svg)$/.test(file)) return null;
      const src = '/_next/static/media/' + path.basename(file);
      return `export default { src: ${JSON.stringify(src)}, width: 1, height: 1 };`;
    },
  };
}

/**
 * Unit/component tests (jsdom). Network access is never real: the HTTP adapters are tested with a stubbed fetch and
 * the form components with the mock adapters or in-memory fakes. Route-level checks run against the built site
 * (scripts/verify-routes.mjs, e2e/).
 */
export default defineConfig({
  plugins: [nextStaticImages(), react()],
  resolve: { alias: { '@': `${import.meta.dirname}/src` } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    restoreMocks: true,
    // Pin the public flags so a developer's .env.local can never point the tests at a real API.
    env: { NEXT_PUBLIC_USE_MOCK_API: 'true', NEXT_PUBLIC_API_BASE_URL: 'http://api.test/api/v1', SITE_ENV: '', SITE_URL: '' },
    testTimeout: 15_000,
  },
});
