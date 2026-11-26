/**
 * Per-route title/description (formerly the useDocumentTitle() call at the top of each page component). Used by the
 * App Router pages (src/app/…/page.tsx) through pageMetadata(), and by the tests.
 */
import { CONDITION_BY_SLUG, isConditionSlug } from '../data/conditions';
import { ARTICLE_BY_SLUG, isArticleSlug, RESOURCE_PAGES } from '../data/resources';
import { SERVICE_DETAILS } from '../data/serviceDetails';
import { isServiceSlug } from '../data/services';
import type { PageMeta } from './head';

export const STATIC_META = {
  '/': {},
  '/services': {
    title: 'Services',
    description: 'Personalized physical therapy services in Westmont, IL — care that meets you where you are and helps you move forward.',
  },
  '/what-we-treat': {
    title: 'What We Treat',
    description: 'Explore common areas of pain, stiffness, and movement difficulty treated at Stride Physical Therapy & Wellness in Westmont, IL.',
  },
  '/patient-resources': {
    title: 'Patient Resources',
    description: 'Find answers, prepare for your visit, and understand what to expect from care at Stride.',
  },
  '/about': {
    title: 'Our Story',
    description: 'Stride began with a desire to give each patient more focused attention and a plan built around their own needs.',
  },
  '/about/meet-dr-gadly': {
    title: 'Meet Dr. Arva Gadly',
    description: 'Get to know Dr. Arva Gadly, PT, DPT, DN — the physical therapist behind Stride’s approach to personal, practical care.',
  },
  '/contact': {
    title: 'Contact Stride',
    description: 'Contact Stride Physical Therapy & Wellness in Westmont, IL: request an evaluation, ask a question, or plan your visit.',
  },
  '/contact/schedule-appointment': {
    title: 'Schedule an Appointment',
    description: 'Book an Initial Evaluation with Stride Physical Therapy & Wellness online: choose a time and enter your details.',
    noindex: true,
  },
} as const satisfies Record<string, PageMeta>;

export const NOT_FOUND_META: PageMeta = {
  title: 'Page not found',
  description: 'This page could not be found. Explore services, the conditions we treat, patient resources or contact Stride.',
  noindex: true,
};

export function serviceMeta(slug: string): PageMeta | null {
  if (!isServiceSlug(slug)) return null;
  const service = SERVICE_DETAILS[slug];
  return { title: service.title, description: service.heroText };
}

export function conditionMeta(slug: string): PageMeta | null {
  if (!isConditionSlug(slug)) return null;
  const condition = CONDITION_BY_SLUG[slug];
  return { title: condition.name, description: condition.heroText };
}

export function resourceMeta(slug: string): PageMeta | null {
  const page = RESOURCE_PAGES.find((p) => p.slug === slug);
  if (page) return { title: page.title, description: page.description };
  if (isArticleSlug(slug)) return { title: ARTICLE_BY_SLUG[slug].title, description: ARTICLE_BY_SLUG[slug].description };
  return null;
}
