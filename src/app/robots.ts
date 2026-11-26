import type { MetadataRoute } from 'next';
import { serverEnv } from '@/config/env';

/**
 * /robots.txt. Production (SITE_URL set, not staging): "User-agent: * / Allow: /" plus the sitemap — the same rules
 * the Vite build's robotsTxt() wrote. Staging and local builds had no robots.txt (= allow all); here they get an
 * allow-all file without a sitemap, which means the same. Staging stays out of search results through the
 * site-wide noindex, nofollow meta tag (crawlers must be allowed to fetch pages to see it).
 */
export default function robots(): MetadataRoute.Robots {
  const origin = serverEnv.isStaging ? '' : serverEnv.siteUrl;
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
