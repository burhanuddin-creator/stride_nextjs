/**
 * What We Treat: the overview's body explorer and quiz, and the fourteen condition pages. Copy is generated verbatim
 * from the client developer package into ./generated/conditionContent.ts (scripts/import-client-content.mjs).
 *
 * Conditions are NOT services: they never populate service_slug. Appointment links carry only the condition slug as
 * a non-sensitive `topic` label (shown on the Contact page, never submitted).
 */
import { BODY_AREAS, CONDITION_CONTENT } from './generated/conditionContent';
import type { MediaId } from './media';

export const CONDITION_SLUGS = [
  'headaches',
  'neck-pain',
  'shoulder-pain',
  'back-pain-sciatica',
  'elbow-wrist-hand-pain',
  'hip-pain',
  'knee-pain',
  'foot-ankle-pain',
  'balance-gait-disorders',
  'arthritis',
  'chronic-pain',
  'dizziness-vertigo',
  'pre-post-surgery',
  'sports-injuries',
] as const;

export type ConditionSlug = (typeof CONDITION_SLUGS)[number];

interface Placed {
  image: MediaId;
  alt: string;
}

export interface ConditionInfo {
  slug: ConditionSlug;
  /** Page title (h1), e.g. "Back Pain & Sciatica". */
  name: string;
  tagline: string;
  /** Hero sentence; also the overview card summary and the meta description. */
  heroText: string;
  card: { summary: string } & Placed;
  /** Quiz step 2 choices and their result text. */
  quizActivities: readonly { label: string; detail: string }[];
  activities: { heading: string; intro: string; items: readonly string[] };
  about: { eyebrow: string; heading: string; paragraphs: readonly string[] } & Placed;
  help: { eyebrow: string; heading: string; intro: string; items: readonly { title: string; text: string }[] };
  faq: { heading: string; intro: string; items: readonly { question: string; answer: string }[] };
  appointment: { heading: string; text: string } & Placed;
}

export function isConditionSlug(value: string | null | undefined): value is ConditionSlug {
  return typeof value === 'string' && (CONDITION_SLUGS as readonly string[]).includes(value);
}

export const CONDITIONS: readonly ConditionInfo[] = CONDITION_CONTENT.map((c) => {
  if (!isConditionSlug(c.slug)) throw new Error(`Unknown condition slug in generated content: ${c.slug}`);
  const { title, ...rest } = c;
  return { ...rest, slug: c.slug, name: title } as ConditionInfo;
});

export const CONDITION_BY_SLUG = Object.fromEntries(CONDITIONS.map((c) => [c.slug, c])) as Record<ConditionSlug, ConditionInfo>;

/** Body-area explorer buttons and quiz step 1, in the package order (each maps to a condition page). */
export const BODY_AREA_OPTIONS = BODY_AREAS.map((area) => {
  if (!isConditionSlug(area.slug)) throw new Error(`Unknown body area slug: ${area.slug}`);
  return { slug: area.slug as ConditionSlug, label: area.label };
});

export const WHAT_WE_TREAT_HREF = '/what-we-treat';

export function conditionHref(slug: ConditionSlug): string {
  return `${WHAT_WE_TREAT_HREF}/${slug}`;
}
