import { site } from '../config/site';
import { SOCIAL_IMAGE } from './head';

/**
 * Clinic JSON-LD (Schema.org Physiotherapy — a MedicalBusiness/LocalBusiness subtype) built only from the confirmed
 * shared configuration (src/config/site.ts) and matching what the footer and Contact page show. Deliberately absent:
 * reviews, ratings, price ranges, insurers, social profiles, staff credentials and geo coordinates (none confirmed).
 *
 * Rendered once by the root layout (src/app/layout.tsx) on every page; client-side navigation keeps the layout, so it is
 * never duplicated.
 */
export const STRUCTURED_DATA_ID = 'clinic-jsonld';

const DAY_NAMES: Record<string, string[]> = {
  'Monday–Friday': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  Saturday: ['Saturday'],
  Sunday: ['Sunday'],
};

/** "7:00 am" → "07:00"; null if the text is not a clock time (e.g. "By appointment only", "Closed"). */
function to24h(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(value.trim());
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'pm') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

/** Regular opening hours only: "By appointment only" and "Closed" days are not published as opening hours. */
export function openingHours() {
  return site.hours.flatMap((h) => {
    const [opens, closes] = h.time.split('–').map(to24h);
    const days = DAY_NAMES[h.days];
    if (!opens || !closes || !days) return [];
    return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes }];
  });
}

/** "(630) 828-3322" → "+1-630-828-3322" */
const e164ish = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

export function clinicStructuredData(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physiotherapy',
    ...(siteUrl ? { '@id': `${siteUrl}/#clinic`, url: `${siteUrl}/`, image: `${siteUrl}${SOCIAL_IMAGE.path}`, logo: `${siteUrl}${SOCIAL_IMAGE.path}` } : {}),
    name: site.name,
    telephone: e164ish(site.phone),
    faxNumber: e164ish(site.fax),
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: 'US',
    },
    openingHoursSpecification: openingHours(),
  };
}

/** The JSON text of the script element. `<` is escaped so the JSON can never close the script element. */
export function structuredDataJson(siteUrl: string): string {
  return JSON.stringify(clinicStructuredData(siteUrl)).replace(/</g, '\\u003c');
}

/** The complete <script> element, as rendered by the root layout (src/app/layout.tsx). */
export function structuredDataHtml(siteUrl: string): string {
  return `<script type="application/ld+json" id="${STRUCTURED_DATA_ID}">${structuredDataJson(siteUrl)}</script>`;
}
