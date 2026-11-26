/**
 * Every public, indexable page (Home + the 40 client-package pages). Used by src/app/sitemap.ts (sitemap.xml on production),
 * src/proxy.ts (unknown slugs → 404), scripts/verify-routes.mjs and the tests. Redirects (/wellness, /physical-therapy)
 * and the not-found page are deliberately absent.
 *
 * Built from the generated content and resources.ts only (plain data, no React/asset imports), so src/proxy.ts and the
 * Node-side scripts can import it.
 */
import { CONDITION_CONTENT } from './generated/conditionContent';
import { SERVICE_CONTENT } from './generated/serviceContent';
import { ARTICLE_SLUGS, RESOURCE_PAGES } from './resources';

export const SITE_PATHS: readonly string[] = [
  '/',
  '/services',
  ...SERVICE_CONTENT.map((s) => `/services/${s.slug}`),
  '/what-we-treat',
  ...CONDITION_CONTENT.map((c) => `/what-we-treat/${c.slug}`),
  '/patient-resources',
  ...RESOURCE_PAGES.map((page) => `/patient-resources/${page.slug}`),
  ...ARTICLE_SLUGS.map((slug) => `/patient-resources/${slug}`),
  '/about',
  '/about/meet-dr-gadly',
  '/contact',
];

/**
 * Public pages that are generated but must NOT be indexed (they carry a per-page noindex and are not in the sitemap):
 * the separate patient-profile page (an unfinished SPRY phase-one flow). It renders an empty form only.
 */
export const NOINDEX_PATHS: readonly string[] = ['/contact/schedule-appointment'];

/**
 * Every path generated as a static page by `next build` (src/app/…/page.tsx, generateStaticParams). Redirect routes
 * (/wellness, /physical-therapy) are 301s in next.config.ts and are never generated.
 */
export const PRERENDER_PATHS: readonly string[] = [...SITE_PATHS, ...NOINDEX_PATHS];

export function sitemapXml(origin: string): string {
  const urls = SITE_PATHS.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
