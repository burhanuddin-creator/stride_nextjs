import type { Metadata } from 'next';
import { SERVICE_SLUGS } from '@/data/services';
import { pageMetadata } from '@/seo/head';
import { NOT_FOUND_META, serviceMeta } from '@/seo/routeMeta';
import ServicePage from '@/views/services/ServicePage';

/**
 * Every services page is generated at build time and must stay fully static. Unknown slugs never reach this page:
 * src/proxy.ts answers them with the not-found page and HTTP 404 (notFound() below is only a safety net).
 */
export const ensureStatic = 'navigation';
// The page reads its slug before rendering (no Suspense placeholder): navigating here waits for the prerendered page.
export const instant = false;

export function generateStaticParams() {
  return SERVICE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/services/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const meta = serviceMeta(slug);
  // Unknown slug (normally stopped by src/proxy.ts): the page calls notFound(); its metadata is the not-found page's.
  return meta ? pageMetadata(`/services/${slug}`, meta) : pageMetadata('/404', NOT_FOUND_META);
}

export default async function Page({ params }: PageProps<'/services/[slug]'>) {
  const { slug } = await params;
  return <ServicePage slug={slug} />;
}
