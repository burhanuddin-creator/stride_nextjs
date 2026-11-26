import type { MetadataRoute } from 'next';
import { serverEnv } from '@/config/env';
import { SITE_PATHS } from '@/data/sitemap';

/**
 * /sitemap.xml — every public, indexable page (Home + the 40 client-package pages); redirects, the noindex
 * schedule-appointment page and the not-found page are absent. Production only: without SITE_URL (local, staging)
 * the sitemap is empty, matching the Vite build, which wrote no sitemap.xml there.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = serverEnv.siteUrl;
  if (!origin || serverEnv.isStaging) return [];
  return SITE_PATHS.map((path) => ({ url: `${origin}${path}` }));
}
