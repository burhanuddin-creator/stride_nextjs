import { NextResponse, type NextRequest } from 'next/server';
import { NOINDEX_PATHS, SITE_PATHS } from './data/sitemap';

/**
 * Unknown service, condition and resource slugs get the site's not-found page with a real HTTP 404 — as on the Apache
 * site, where only generated pages existed. Every known page is generated at build time from the same data
 * (src/data/sitemap.ts), so the request is rewritten to a path no route matches, which renders src/app/not-found.tsx
 * with status 404. Known pages pass straight through. Plain data only: nothing is fetched here.
 */
const PAGES = new Set([...SITE_PATHS, ...NOINDEX_PATHS]);

export function proxy(request: NextRequest) {
  if (PAGES.has(request.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL('/__not-found', request.url));
}

export const config = {
  matcher: ['/services/:slug', '/what-we-treat/:slug', '/patient-resources/:slug'],
};
