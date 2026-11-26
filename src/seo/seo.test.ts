import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { site } from '../config/site';
import { CONDITIONS } from '../data/conditions';
import { ARTICLES, RESOURCE_PAGES } from '../data/resources';
import { SERVICE_DETAIL_LIST } from '../data/serviceDetails';
import { NOINDEX_PATHS, PRERENDER_PATHS, SITE_PATHS } from '../data/sitemap';
import { buildHead, pageMetadata, SOCIAL_IMAGE, toNextMetadata } from './head';
import { conditionMeta, resourceMeta, serviceMeta, STATIC_META } from './routeMeta';
import { clinicStructuredData, openingHours, structuredDataHtml } from './structuredData';

const SITE = 'https://stridephysical.com';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildHead', () => {
  it('production: page title, absolute canonical, og:url and an absolute social image', () => {
    const head = buildHead({ title: 'Knee Pain', description: 'Care for knee pain.' }, '/what-we-treat/knee-pain/', SITE);
    expect(head.title).toBe(`Knee Pain | ${site.name}`);
    expect(head.canonical).toBe(`${SITE}/what-we-treat/knee-pain`);
    expect(head.og['og:url']).toBe(head.canonical);
    expect(head.og['og:image']).toBe(`${SITE}${SOCIAL_IMAGE.path}`);
    expect(head.twitter['twitter:image']).toBe(head.og['og:image']);
    expect(head.noindex).toBe(false);
  });

  it('noindex pages get no canonical or og:url', () => {
    const head = buildHead({ title: 'Page not found', noindex: true }, '/x', SITE);
    expect(head.canonical).toBeNull();
    expect(head.og['og:url']).toBeUndefined();
    expect(toNextMetadata(head).robots).toEqual({ index: false });
  });
});

describe('Next.js metadata', () => {
  it('production: absolute title, description, canonical, Open Graph and Twitter tags', () => {
    const meta = toNextMetadata(buildHead({ title: 'IASTM', description: 'About IASTM.' }, '/services/iastm', SITE));
    expect(meta.title).toEqual({ absolute: `IASTM | ${site.name}` });
    expect(meta.description).toBe('About IASTM.');
    expect(meta.alternates).toEqual({ canonical: `${SITE}/services/iastm` });
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      siteName: site.name,
      locale: 'en_US',
      title: `IASTM | ${site.name}`,
      url: `${SITE}/services/iastm`,
      images: [{ url: `${SITE}${SOCIAL_IMAGE.path}`, width: 1254, height: 1254, alt: SOCIAL_IMAGE.alt }],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary', title: `IASTM | ${site.name}`, images: [{ url: `${SITE}${SOCIAL_IMAGE.path}` }] });
    expect(meta.robots).toBeUndefined();
  });

  it('staging/local (no site URL): no canonical and no absolute URLs', () => {
    const meta = toNextMetadata(buildHead({ title: 'Services' }, '/services', ''));
    expect(meta.alternates).toEqual({ canonical: null });
    expect(JSON.stringify(meta)).not.toMatch(/https?:\/\//);
  });

  it('staging: every page is noindex, nofollow', () => {
    vi.stubEnv('SITE_ENV', 'staging');
    expect(pageMetadata('/services', STATIC_META['/services']).robots).toEqual({ index: false, follow: false });
  });

  it('reads SITE_URL on the server for canonical URLs', () => {
    vi.stubEnv('SITE_URL', `${SITE}/`);
    expect(pageMetadata('/contact', STATIC_META['/contact']).alternates).toEqual({ canonical: `${SITE}/contact` });
    expect(pageMetadata('/contact/schedule-appointment', STATIC_META['/contact/schedule-appointment'])).toMatchObject({ robots: { index: false } });
    expect(pageMetadata('/contact/schedule-appointment', STATIC_META['/contact/schedule-appointment']).alternates).toEqual({ canonical: null });
  });

  it('gives every prerendered page a unique title and resolves every dynamic slug', () => {
    const titles = PRERENDER_PATHS.map((p) => {
      const [, section, slug] = p.split('/');
      const meta =
        p in STATIC_META
          ? STATIC_META[p as keyof typeof STATIC_META]
          : section === 'services'
            ? serviceMeta(slug)
            : section === 'what-we-treat'
              ? conditionMeta(slug)
              : resourceMeta(slug);
      expect(meta, p).not.toBeNull();
      return buildHead(meta ?? {}, p, '').title;
    });
    expect(new Set(titles).size).toBe(titles.length);
    expect(serviceMeta('nope')).toBeNull();
    expect(conditionMeta('nope')).toBeNull();
    expect(resourceMeta('nope')).toBeNull();
  });
});

describe('clinic structured data', () => {
  it('uses only the confirmed shared configuration', () => {
    const data = clinicStructuredData(SITE);
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Physiotherapy',
      name: site.name,
      url: `${SITE}/`,
      telephone: '+1-630-828-3322',
      faxNumber: '+1-630-763-1486',
      email: site.email,
      address: { streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: 'IL', postalCode: '60559', addressCountry: 'US' },
    });
    for (const key of ['aggregateRating', 'review', 'sameAs', 'priceRange', 'geo', 'founder']) expect(data).not.toHaveProperty(key);
  });

  it('publishes regular hours only (Mon–Fri 7:00–19:00); "By appointment" and "Closed" are not opening hours', () => {
    expect(openingHours()).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '07:00', closes: '19:00' },
    ]);
  });

  it('has no absolute URLs outside production and cannot break out of its script element', () => {
    expect(clinicStructuredData('')).not.toHaveProperty('url');
    const html = structuredDataHtml(SITE);
    expect(JSON.parse(html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''))).toEqual(clinicStructuredData(SITE));
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
});


describe('App Router routes', () => {
  const app = path.resolve(__dirname, '../app');
  const routeFile = (p: string) => path.join(app, p === '/' ? '' : p, 'page.tsx');

  it('have a page file for every static route and a [slug] page for every dynamic section', () => {
    for (const p of Object.keys(STATIC_META)) expect(fs.existsSync(routeFile(p)), p).toBe(true);
    for (const section of ['services', 'what-we-treat', 'patient-resources']) expect(fs.existsSync(path.join(app, section, '[slug]', 'page.tsx')), section).toBe(true);
    expect(PRERENDER_PATHS).toContain('/');
    for (const s of SERVICE_DETAIL_LIST) expect(PRERENDER_PATHS).toContain(`/services/${s.slug}`);
    for (const c of CONDITIONS) expect(PRERENDER_PATHS).toContain(`/what-we-treat/${c.slug}`);
    for (const r of [...RESOURCE_PAGES, ...ARTICLES]) expect(PRERENDER_PATHS).toContain(`/patient-resources/${r.slug}`);
  });

  it('have no pages for the redirected paths', () => {
    for (const p of ['/physical-therapy', '/wellness']) {
      expect(fs.existsSync(routeFile(p)), p).toBe(false);
      expect(PRERENDER_PATHS).not.toContain(p);
    }
  });

  it('keep noindex pages out of the sitemap', () => {
    for (const p of NOINDEX_PATHS) expect(SITE_PATHS).not.toContain(p);
    expect(new Set(PRERENDER_PATHS).size).toBe(PRERENDER_PATHS.length);
  });
});
