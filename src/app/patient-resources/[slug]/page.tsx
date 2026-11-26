import type { Metadata } from 'next';
import { ARTICLE_SLUGS, RESOURCE_PAGES } from '@/data/resources';
import { pageMetadata } from '@/seo/head';
import { NOT_FOUND_META, resourceMeta } from '@/seo/routeMeta';
import ResourcePage from '@/views/resources/ResourcePage';

/**
 * Every patient-resources page is generated at build time and must stay fully static. Unknown slugs never reach this page:
 * src/proxy.ts answers them with the not-found page and HTTP 404 (notFound() below is only a safety net).
 */
export const ensureStatic = 'navigation';
// The page reads its slug before rendering (no Suspense placeholder): navigating here waits for the prerendered page.
export const instant = false;

export function generateStaticParams() {
  return [...RESOURCE_PAGES.map((p) => ({ slug: p.slug })), ...ARTICLE_SLUGS.map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: PageProps<'/patient-resources/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const meta = resourceMeta(slug);
  // Unknown slug (normally stopped by src/proxy.ts): the page calls notFound(); its metadata is the not-found page's.
  return meta ? pageMetadata(`/patient-resources/${slug}`, meta) : pageMetadata('/404', NOT_FOUND_META);
}

export default async function Page({ params }: PageProps<'/patient-resources/[slug]'>) {
  const { slug } = await params;
  return <ResourcePage slug={slug} />;
}
