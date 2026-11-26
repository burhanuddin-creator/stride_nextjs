/**
 * Canonical list of Stride services (client developer package order). Slugs are shared with the backend allowlist (backend/app/Enums/Service.php) — keep both in sync.
 */
import type { IconName } from '../components/ui/icons';
import type { CareType } from '../types/appointment';

export const SERVICE_SLUGS = [
  'physical-therapy',
  'manual-therapy',
  'dry-needling',
  'cupping-therapy',
  'vestibular-therapy',
  'oncology-rehab',
  'sports-rehab',
  'spinal-manipulation',
  'gait-analysis',
  'iastm',
  'injury-prevention',
  'movement-analysis',
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

export interface ServiceInfo {
  slug: ServiceSlug;
  /** Display name (navigation, cards, form). */
  name: string;
  /** Full descriptive name where the PDF shows one (IASTM). */
  fullName?: string;
  /** Card copy from the Services page (PDF page 1). */
  summary: string;
  icon: IconName;
  /**
   * Broad care type preselected on the contact form. Explicit, documented mapping
   * (docs/API_CONTRACT.md): rehabilitation services described in the PDF as part of a rehabilitation
   * plan → physical_therapy; services whose broad category is not clear from approved copy → null
   * (the visitor chooses).
   */
  careType: CareType | null;
}

const services: ServiceInfo[] = [
  {
    slug: 'physical-therapy',
    name: 'Physical Therapy',
    summary: 'A personalized plan for recovery and everyday movement.',
    icon: 'run',
    careType: 'physical_therapy',
  },
  {
    slug: 'manual-therapy',
    name: 'Manual Therapy',
    summary: 'Hands-on techniques within your rehabilitation plan.',
    icon: 'hands',
    careType: 'physical_therapy',
  },
  {
    slug: 'dry-needling',
    name: 'Dry Needling',
    summary: 'An optional approach for selected muscle-related concerns.',
    icon: 'needle',
    careType: 'physical_therapy',
  },
  {
    slug: 'cupping-therapy',
    name: 'Cupping Therapy',
    summary: 'An optional soft-tissue treatment approach.',
    icon: 'cup',
    careType: 'physical_therapy',
  },
  {
    slug: 'vestibular-therapy',
    name: 'Vestibular Therapy',
    summary: 'Assessment and rehabilitation for dizziness and balance concerns.',
    icon: 'ear',
    careType: 'physical_therapy',
  },
  {
    slug: 'oncology-rehab',
    name: 'Oncology Rehab',
    summary: 'Support for movement and function during and after cancer care.',
    icon: 'ribbon',
    careType: 'physical_therapy',
  },
  {
    slug: 'sports-rehab',
    name: 'Sports Rehab',
    summary: 'Rehabilitation guided by your sport and activity goals.',
    icon: 'dumbbell',
    careType: 'physical_therapy',
  },
  {
    slug: 'spinal-manipulation',
    name: 'Spinal Manipulation',
    summary: 'A screened, optional technique within appropriate care.',
    icon: 'spine',
    careType: 'physical_therapy',
  },
  {
    slug: 'gait-analysis',
    name: 'Gait Analysis',
    summary: 'A closer look at how you walk or run.',
    icon: 'footprints',
    careType: null,
  },
  {
    slug: 'iastm',
    name: 'IASTM',
    fullName: 'Instrument-Assisted Soft Tissue Mobilization',
    summary: 'Instrument-assisted soft tissue mobilization.',
    icon: 'instrument',
    careType: 'physical_therapy',
  },
  {
    slug: 'injury-prevention',
    name: 'Injury Prevention',
    summary: 'Movement and training strategies to help reduce injury risk.',
    icon: 'shieldPlain',
    careType: null,
  },
  {
    slug: 'movement-analysis',
    name: 'Movement Analysis',
    summary: 'Explore how you squat, reach, lift, and move.',
    icon: 'chart',
    careType: null,
  },
];

export const SERVICES: readonly ServiceInfo[] = services;

export const SERVICE_BY_SLUG: Readonly<Record<ServiceSlug, ServiceInfo>> = Object.fromEntries(
  services.map((s) => [s.slug, s]),
) as Record<ServiceSlug, ServiceInfo>;

export function isServiceSlug(value: string | null | undefined): value is ServiceSlug {
  return !!value && (SERVICE_SLUGS as readonly string[]).includes(value);
}

export function serviceHref(slug: ServiceSlug): string {
  return `/services/${slug}`;
}

export const SERVICES_INDEX_HREF = '/services';
