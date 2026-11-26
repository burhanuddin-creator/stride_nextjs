/**
 * Services overview rows and the twelve service detail pages. Copy, image placement and alt text are generated
 * verbatim from the client developer package into ./generated/serviceContent.ts
 * (scripts/import-client-content.mjs). Canonical slugs, names and care types stay in ./services.ts (they must match
 * the backend Service enum).
 */
import { SERVICE_CONTENT, SERVICES_HERO_IMAGE } from './generated/serviceContent';
import type { MediaId } from './media';
import { isServiceSlug, SERVICE_SLUGS, type ServiceSlug } from './services';

interface Placed {
  image: MediaId;
  alt: string;
}

export interface ServiceDetail {
  slug: ServiceSlug;
  title: string;
  tagline: string;
  heroText: string;
  overview: { summary: string } & Placed;
  about: { heading: string; paragraphs: readonly string[] } & Placed;
  concerns: { heading: string; intro: string; items: readonly { title: string; text: string }[] };
  benefits: { eyebrow: string; heading: string; intro: string; items: readonly { title: string; text: string }[] };
  related: { heading: string; items: readonly { slug: ServiceSlug; text: string; image: MediaId }[]; note: string };
  faq: { heading: string; items: readonly { question: string; answer: string }[] };
  appointment: { heading: string; text: string } & Placed;
}

const details = SERVICE_CONTENT.map((s) => {
  if (!isServiceSlug(s.slug)) throw new Error(`Unknown service slug in generated content: ${s.slug}`);
  for (const r of s.related.items) if (!isServiceSlug(r.slug)) throw new Error(`Unknown related service: ${r.slug}`);
  return s as unknown as ServiceDetail;
});

export const SERVICE_DETAILS = Object.fromEntries(details.map((d) => [d.slug, d])) as Record<ServiceSlug, ServiceDetail>;

/** Overview order (matches the package and SERVICE_SLUGS). */
export const SERVICE_DETAIL_LIST: readonly ServiceDetail[] = SERVICE_SLUGS.map((slug) => SERVICE_DETAILS[slug]);

export const SERVICES_HERO = SERVICES_HERO_IMAGE as Placed;
