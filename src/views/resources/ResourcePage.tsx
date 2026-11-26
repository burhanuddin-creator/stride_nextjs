import { notFound } from 'next/navigation';
import { ARTICLE_BY_SLUG, isArticleSlug, RESOURCE_PAGES } from '../../data/resources';
import { ArticlePage } from './ArticlePage';
import DirectAccessPage from './DirectAccessPage';
import FirstVisitPage from './FirstVisitPage';
import InsurancePaymentPage from './InsurancePaymentPage';
import PatientEducationPage from './PatientEducationPage';
import PatientFaqsPage from './PatientFaqsPage';

const PAGES = {
  'first-visit': FirstVisitPage,
  'insurance-payment': InsurancePaymentPage,
  'direct-access': DirectAccessPage,
  faqs: PatientFaqsPage,
  'patient-education': PatientEducationPage,
} as const;

/** /patient-resources/:slug — the five resource pages and the three education articles. */
export default function ResourcePage({ slug }: { slug: string }) {
  const page = RESOURCE_PAGES.find((p) => p.slug === slug);
  const article = isArticleSlug(slug) ? ARTICLE_BY_SLUG[slug] : undefined;

  if (page) {
    const Page = PAGES[page.slug];
    return <Page key={page.slug} />;
  }
  if (article) return <ArticlePage key={article.slug} article={article} />;
  notFound();
}
