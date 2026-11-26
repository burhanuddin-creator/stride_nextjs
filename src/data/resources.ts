/**
 * Patient Resources: hub directory, the five resource pages, the 27 patient FAQs and the three education articles.
 * FAQ and article copy is generated verbatim from the client developer package into ./generated/resourceContent.ts
 * (scripts/import-client-content.mjs); the hub directory copy below is transcribed from the package's
 * structured-data.json `patientResourcePages`.
 */
import { EDUCATION_ARTICLES, FAQ_FILTERS, PATIENT_FAQS } from './generated/resourceContent';

export const PATIENT_RESOURCES_HREF = '/patient-resources';

export const RESOURCE_PAGES = [
  {
    slug: 'first-visit',
    title: 'Your First Visit',
    label: 'Before you arrive',
    description: 'Know what to expect, what to bring, and how to prepare for a conversation about your goals.',
  },
  {
    slug: 'insurance-payment',
    title: 'Insurance & Payment',
    label: 'Coverage & costs',
    description: 'Understand the questions to ask about your coverage, expected costs, and payment options before you begin.',
  },
  {
    slug: 'direct-access',
    title: 'Direct Access',
    label: 'Getting started',
    description: 'Learn how you may be able to start physical therapy without a referral, and what to check with your insurance plan.',
  },
  {
    slug: 'faqs',
    title: 'Patient FAQs',
    label: 'Quick answers',
    description: 'Get practical answers about appointments, preparing for care, insurance questions, and staying in touch.',
  },
  {
    slug: 'patient-education',
    title: 'Patient Education',
    label: 'Learn at your pace',
    description: 'Explore simple, useful reading to help you take an active role in your care.',
  },
] as const;

export type ResourcePageSlug = (typeof RESOURCE_PAGES)[number]['slug'];

export const ARTICLE_SLUGS = [
  'preparing-for-your-evaluation',
  'questions-to-ask-your-therapist',
  'making-your-home-plan-work',
] as const;
export type ArticleSlug = (typeof ARTICLE_SLUGS)[number];

export type ResourceSlug = ResourcePageSlug | ArticleSlug;

export function resourceHref(slug: ResourceSlug, hash?: string): string {
  return `${PATIENT_RESOURCES_HREF}/${slug}${hash ? `#${hash}` : ''}`;
}

export function isArticleSlug(value: string | null | undefined): value is ArticleSlug {
  return typeof value === 'string' && (ARTICLE_SLUGS as readonly string[]).includes(value);
}

export function isResourceSlug(value: string | null | undefined): value is ResourceSlug {
  return isArticleSlug(value) || RESOURCE_PAGES.some((p) => p.slug === value);
}

export type FaqCategory = Exclude<(typeof FAQ_FILTERS)[number]['id'], 'all'>;

export interface PatientFaq {
  category: FaqCategory;
  question: string;
  answer: readonly string[];
  link?: { slug: ResourceSlug; label: string };
}

function toFaq(f: (typeof PATIENT_FAQS)[number]): PatientFaq {
  const link = 'link' in f ? f.link : undefined;
  if (link && (link.kind !== 'resource' || !isResourceSlug(link.slug))) throw new Error(`Unsupported FAQ link: ${f.question}`);
  return {
    category: f.category as FaqCategory,
    question: f.question,
    answer: f.answer,
    ...(link ? { link: { slug: link.slug as ResourceSlug, label: link.label } } : {}),
  };
}

export const FAQ_CATEGORY_FILTERS = FAQ_FILTERS;
export const PATIENT_FAQ_LIST: readonly PatientFaq[] = PATIENT_FAQS.map(toFaq);

/** The hub shows the first three FAQs (as in the package). */
export const HUB_FAQS = PATIENT_FAQ_LIST.slice(0, 3);

export interface EducationArticle {
  slug: ArticleSlug;
  category: string;
  title: string;
  description: string;
  sections: readonly { heading: string; text: string }[];
  note: string;
  contact: { heading: string; text: string };
}

export const ARTICLES: readonly EducationArticle[] = EDUCATION_ARTICLES.map((a) => {
  if (!isArticleSlug(a.slug)) throw new Error(`Unknown article slug: ${a.slug}`);
  return a as unknown as EducationArticle;
});

export const ARTICLE_BY_SLUG = Object.fromEntries(ARTICLES.map((a) => [a.slug, a])) as Record<ArticleSlug, EducationArticle>;
