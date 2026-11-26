import type { Metadata } from 'next';
import { serverEnv } from '../config/env';
import { site } from '../config/site';

/**
 * One description of a page's <head> metadata. buildHead() is the single source of truth; toNextMetadata() maps it
 * onto the Next.js Metadata API, which renders the tags into the initial HTML of every page (and keeps them in sync
 * on client-side navigation).
 *
 * Production (SITE_URL set): absolute canonical, og:url and og:image. Staging/local (no site URL): no canonical or
 * absolute URLs. Staging additionally gets a site-wide noindex, nofollow.
 */

export const DEFAULT_TITLE = `${site.name} | Westmont, IL`;
export const DEFAULT_DESCRIPTION =
  'Stride Physical Therapy & Wellness in Westmont, IL — personalized physical therapy and wellness care to help you move with confidence.';

/** Stable (unhashed) social preview image: the confirmed clinic logo, 1254×1254 (public/assets/social). */
export const SOCIAL_IMAGE = { path: '/assets/social/stride-logo.jpg', width: 1254, height: 1254, alt: `${site.name} logo` } as const;

export interface PageMeta {
  title?: string;
  description?: string;
  noindex?: boolean;
}

export interface HeadTags {
  title: string;
  description: string;
  canonical: string | null;
  /** Per-page robots tag (not-found, unfinished flows). Staging's site-wide noindex is separate and static. */
  noindex: boolean;
  /** property=… (Open Graph) */
  og: Record<string, string>;
  /** name=… (Twitter/X) */
  twitter: Record<string, string>;
}

/** Canonical URL for a path: the configured origin + path, no query or hash, no trailing slash except "/". */
export function canonicalUrl(origin: string, pathname: string): string {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${origin}${path}`;
}

export function buildHead(meta: PageMeta, pathname: string, siteUrl: string): HeadTags {
  const title = meta.title ? `${meta.title} | ${site.name}` : DEFAULT_TITLE;
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const noindex = !!meta.noindex;
  // A page that must not be indexed gets no canonical URL.
  const canonical = siteUrl && !noindex ? canonicalUrl(siteUrl, pathname) : null;

  const og: Record<string, string> = {
    'og:type': 'website',
    'og:site_name': site.name,
    'og:locale': 'en_US',
    'og:title': title,
    'og:description': description,
  };
  const twitter: Record<string, string> = {
    'twitter:card': 'summary',
    'twitter:title': title,
    'twitter:description': description,
  };
  if (canonical) og['og:url'] = canonical;
  if (siteUrl) {
    const image = `${siteUrl}${SOCIAL_IMAGE.path}`;
    Object.assign(og, {
      'og:image': image,
      'og:image:width': String(SOCIAL_IMAGE.width),
      'og:image:height': String(SOCIAL_IMAGE.height),
      'og:image:alt': SOCIAL_IMAGE.alt,
    });
    Object.assign(twitter, { 'twitter:image': image, 'twitter:image:alt': SOCIAL_IMAGE.alt });
  }
  return { title, description, canonical, noindex, og, twitter };
}

/** Map the head description onto Next.js Metadata (absolute title: buildHead already adds the site suffix). */
export function toNextMetadata(head: HeadTags, options: { staging?: boolean } = {}): Metadata {
  const og = head.og;
  const metadata: Metadata = {
    title: { absolute: head.title },
    description: head.description,
    openGraph: {
      type: 'website',
      siteName: og['og:site_name'],
      locale: og['og:locale'],
      title: og['og:title'],
      description: og['og:description'],
      ...(og['og:url'] ? { url: og['og:url'] } : {}),
      ...(og['og:image']
        ? { images: [{ url: og['og:image'], width: Number(og['og:image:width']), height: Number(og['og:image:height']), alt: og['og:image:alt'] }] }
        : {}),
    },
    twitter: {
      card: 'summary',
      title: head.twitter['twitter:title'],
      description: head.twitter['twitter:description'],
      ...(head.twitter['twitter:image'] ? { images: [{ url: head.twitter['twitter:image'], alt: head.twitter['twitter:image:alt'] }] } : {}),
    },
  };
  // Always set (null when there is none): metadata merges per key, so a noindex page or the not-found page would
  // otherwise inherit the root layout's canonical URL.
  metadata.alternates = { canonical: head.canonical };
  // Staging: the whole site is noindex, nofollow. Otherwise only pages flagged noindex (not-found, unfinished flows).
  if (options.staging) metadata.robots = { index: false, follow: false };
  else if (head.noindex) metadata.robots = { index: false };
  return metadata;
}

/** Metadata for one route (used by each src/app/…/page.tsx). Reads SITE_URL / SITE_ENV on the server at build time. */
export function pageMetadata(pathname: string, meta: PageMeta = {}): Metadata {
  return toNextMetadata(buildHead(meta, pathname, serverEnv.siteUrl), { staging: serverEnv.isStaging });
}
