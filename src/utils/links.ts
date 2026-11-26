import type { ConditionSlug } from '../data/conditions';
import { SERVICE_BY_SLUG, type ServiceSlug } from '../data/services';
import type { CareType } from '../types/appointment';

export const CONTACT_FORM_ID = 'request-form';

/** Separate "Schedule an Appointment" page (SPRY phase one: patient profile only). Not in the sitemap. */
export const SCHEDULE_APPOINTMENT_PATH = '/contact/schedule-appointment';

/**
 * Link to the contact form, optionally preselecting a care type and/or a service.
 * `topic` carries a non-sensitive context label (a known condition slug) that is shown back to the visitor;
 * it is never sent to the API. `service` is a canonical slug (non-sensitive).
 */
export function contactHref(care?: CareType, topic?: string, service?: ServiceSlug): string {
  const params = new URLSearchParams();
  if (care) params.set('care', care);
  if (service) params.set('service', service);
  if (topic) params.set('topic', topic);
  const query = params.toString();
  return `/contact${query ? `?${query}` : ''}#${CONTACT_FORM_ID}`;
}

/**
 * Appointment link for a condition (What We Treat) page. Conditions are not services: the condition slug travels
 * only as the non-sensitive display `topic`; Physical Therapy is preselected as the broad care type (the visitor can
 * change it).
 */
export function conditionContactHref(slug: ConditionSlug): string {
  return contactHref('physical_therapy', slug);
}

/** Appointment link for a service page: preselects the service and its documented care type, if any. */
export function serviceContactHref(slug: ServiceSlug): string {
  return contactHref(SERVICE_BY_SLUG[slug].careType ?? undefined, undefined, slug);
}

/** The Contact page's general (non-form) section and its visit/map section. */
export const CONTACT_HREF = '/contact';
export const CONTACT_QUESTION_HREF = '/contact#contact-details';
export const CONTACT_VISIT_HREF = '/contact#visit-clinic';

export const ABOUT_HREF = '/about';
export const FOUNDER_HREF = '/about/meet-dr-gadly';
