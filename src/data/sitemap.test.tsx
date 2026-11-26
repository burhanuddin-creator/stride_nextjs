import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { robotsTxt, SITE_PATHS, sitemapXml } from './sitemap';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sitemap', () => {
  it('lists Home and the 40 package pages once each, without redirects', () => {
    expect(SITE_PATHS).toHaveLength(41);
    expect(new Set(SITE_PATHS).size).toBe(41);
    expect(SITE_PATHS).not.toContain('/wellness');
    expect(SITE_PATHS).not.toContain('/physical-therapy');
  });

  it('src/app/sitemap.ts writes canonical absolute URLs on production', () => {
    vi.stubEnv('SITE_URL', 'https://stridephysical.com');
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toHaveLength(41);
    expect(urls).toContain('https://stridephysical.com/');
    expect(urls).toContain('https://stridephysical.com/services/iastm');
    expect(urls).not.toContain('https://stridephysical.com/contact/schedule-appointment');
    // Same URL list as the Vite build's sitemap.xml.
    expect(urls.map((u) => `<loc>${u}</loc>`).every((loc) => sitemapXml('https://stridephysical.com').includes(loc))).toBe(true);
  });

  it('is empty without a site URL (local) and on staging', () => {
    expect(sitemap()).toEqual([]);
    vi.stubEnv('SITE_URL', 'https://stridephysical.com');
    vi.stubEnv('SITE_ENV', 'staging');
    expect(sitemap()).toEqual([]);
  });
});

describe('robots', () => {
  it('production: allow all and point at the sitemap (same rules as the Vite build)', () => {
    vi.stubEnv('SITE_URL', 'https://stridephysical.com');
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: 'https://stridephysical.com/sitemap.xml' });
    expect(robotsTxt('https://stridephysical.com')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://stridephysical.com/sitemap.xml\n');
  });

  it('local and staging: allow all, no sitemap (staging relies on its noindex, nofollow meta)', () => {
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' } });
    vi.stubEnv('SITE_URL', 'https://stridephysical.com');
    vi.stubEnv('SITE_ENV', 'staging');
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' } });
  });
});
