import type { Metadata } from 'next';
import { CONDITIONS } from '@/data/conditions';
import { pageMetadata } from '@/seo/head';
import { NOT_FOUND_META, conditionMeta } from '@/seo/routeMeta';
import ConditionPage from '@/views/conditions/ConditionPage';

/**
 * Every what-we-treat page is generated at build time and must stay fully static. Unknown slugs never reach this page:
 * src/proxy.ts answers them with the not-found page and HTTP 404 (notFound() below is only a safety net).
 */
export const ensureStatic = 'navigation';
// The page reads its slug before rendering (no Suspense placeholder): navigating here waits for the prerendered page.
export const instant = false;

export function generateStaticParams() {
  return CONDITIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/what-we-treat/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const meta = conditionMeta(slug);
  // Unknown slug (normally stopped by src/proxy.ts): the page calls notFound(); its metadata is the not-found page's.
  return meta ? pageMetadata(`/what-we-treat/${slug}`, meta) : pageMetadata('/404', NOT_FOUND_META);
}

export default async function Page({ params }: PageProps<'/what-we-treat/[slug]'>) {
  const { slug } = await params;
  return <ConditionPage slug={slug} />;
}
