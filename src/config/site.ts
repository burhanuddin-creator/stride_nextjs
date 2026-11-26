/** Confirmed public clinic details shared across the website. */
export const site = {
  name: 'Stride Physical Therapy & Wellness',
  shortName: 'Stride',
  founder: {
    name: 'Arva Gadly',
    /** First introduction on a page. Later mentions use `shortName`. */
    fullTitle: 'Dr. Arva Gadly, PT, DPT, DN',
    shortName: 'Dr. Arva Gadly',
    credentials: 'PT, DPT, DN',
    displayName: 'Arva Gadly, PT, DPT',
    role: 'Founder & Physical Therapist',
  },
  address: {
    street: '1131 Fairview Ave',
    city: 'Westmont',
    region: 'IL',
    postalCode: '60559',
  },
  /** Public email (confirmed). */
  email: 'info@stridephysical.com',
  /** Clinic phone (confirmed). Always displayed through `phoneDisplay`; dialled through `phoneHref`. */
  phone: '(630) 828-3322',
  /** Clinic fax (confirmed). Shown as labelled text, never as a tel: link. */
  fax: '(630) 763-1486',
  /** Confirmed hours. `short` is the compact form used in one-line footers and bands. */
  hours: [
    { days: 'Monday–Friday', short: 'Mon–Fri', time: '7:00 am–7:00 pm', shortTime: '7am–7pm' },
    { days: 'Saturday', short: 'Sat', time: 'By appointment only', shortTime: 'By appointment' },
    { days: 'Sunday', short: 'Sun', time: 'Closed', shortTime: 'Closed' },
  ],
  timeZone: 'America/Chicago',
} as const;

export const addressLine = `${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}`;
export const addressCityLine = `${site.address.city}, ${site.address.region} ${site.address.postalCode}`;
export const hoursLine = site.hours.map((h) => `${h.short} ${h.shortTime}`).join(' | ');
/** The clinic phone as shown everywhere: “Ph: (630) 828-3322” (link text; the link itself is `phoneHref`). */
export const phoneDisplay = `Ph: ${site.phone}`;
export const phoneHref = 'tel:+16308283322';
/** The clinic fax as shown everywhere: “Fax: (630) 763-1486” (text only, never a link). */
export const faxDisplay = `Fax: ${site.fax}`;
export const emailHref = `mailto:${site.email}`;

/** Opens turn-by-turn directions in a new tab (fallback for the embedded map). */
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine)}`;
/** Larger map view in a new tab. */
export const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;
/** Embedded map on the Contact page (loaded lazily, only on that page). */
export const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(addressLine)}&z=15&output=embed`;
