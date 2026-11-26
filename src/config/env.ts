/**
 * Build-time configuration.
 *
 * Browser-visible values use NEXT_PUBLIC_ variables: Next.js inlines them into the client bundle at build time, so
 * they are PUBLIC — never put secrets, keys or tokens in them. They only describe where the public Laravel API lives
 * and whether the offline mock adapter is used. Each one is read with a literal `process.env.NEXT_PUBLIC_…` access,
 * which is what Next.js replaces at build time.
 *
 * SITE_URL and SITE_ENV are read on the server only (metadata, sitemap, robots, the staging notice — all rendered
 * on the server) and are never sent to the browser as configuration. Changes require a rebuild.
 *
 * Vite → Next.js mapping:
 *   VITE_API_BASE_URL   → NEXT_PUBLIC_API_BASE_URL
 *   VITE_USE_MOCK_API   → NEXT_PUBLIC_USE_MOCK_API
 *   VITE_API_TIMEOUT_MS → NEXT_PUBLIC_API_TIMEOUT_MS
 *   VITE_SITE_ENV       → SITE_ENV   (server only)
 *   VITE_SITE_URL       → SITE_URL   (server only)
 */

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, ''),
  /** Defaults to mock mode so the site works offline without Laravel. */
  useMockApi: readBoolean(process.env.NEXT_PUBLIC_USE_MOCK_API, true),
  apiTimeoutMs: readNumber(process.env.NEXT_PUBLIC_API_TIMEOUT_MS, 15000),
} as const;

/** Server-only values. Importing this from a Client Component would only ever see empty strings. */
export const serverEnv = {
  /** "staging" turns on the review notice and site-wide noindex. */
  get isStaging(): boolean {
    return process.env.SITE_ENV === 'staging';
  },
  /** Public origin used for canonical/Open Graph URLs, sitemap.xml and robots.txt. Empty = not emitted. */
  get siteUrl(): string {
    return (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '');
  },
};
