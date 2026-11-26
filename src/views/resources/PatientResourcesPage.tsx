import Link from 'next/link';
import { LegacyHashRedirect } from '../../components/layout/LegacyHashRedirect';
import { media } from '../../data/media';
import { HUB_FAQS, RESOURCE_PAGES, resourceHref, type ResourceSlug } from '../../data/resources';
import { Band, SectionIntro } from '../../components/blocks/Blocks';
import { DisclosureList } from '../../components/blocks/Disclosure';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ArrowLink, FaqAnswer, ResourceContact } from './shared';
import styles from './Resources.module.css';

/** Section anchors of the previous single-page Patient Resources layout → the page that now holds that content. */
const LEGACY_SLUGS: Record<string, ResourceSlug> = {
  'first-visit-guide': 'first-visit',
  'preparing-for-your-visit': 'first-visit',
  'before-you-arrive': 'first-visit',
  'insurance-payment': 'insurance-payment',
  'referrals-illinois': 'direct-access',
  faqs: 'faqs',
};
const LEGACY_ANCHORS: Record<string, string> = Object.fromEntries(Object.entries(LEGACY_SLUGS).map(([anchor, slug]) => [anchor, resourceHref(slug)]));

/** Patient Resources hub (client package `#patient-resources`). */
export default function PatientResourcesPage() {
  return (
    <>
      <LegacyHashRedirect anchors={LEGACY_ANCHORS} />
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Patient Resources' }]}
        title="Patient Resources"
        tagline="Feel prepared for your first step."
        text="Find answers, prepare for your visit, and understand what to expect from care at Stride."
        image={media('patient-resources-care-plan', 'A physical therapist and patient reviewing a care plan together on a tablet')}
        imagePosition="60% 40%"
        actions={
          <>
            <ButtonLink to={resourceHref('first-visit')} variant="clay">
              Prepare for Your First Visit
            </ButtonLink>
            <ButtonLink to="#resource-directory" variant="ghost" arrow={false}>
              Explore Your Resources
            </ButtonLink>
          </>
        }
      />

      <Band id="resource-directory" labelledBy="directory-title">
        <div className="container">
          <SectionIntro
            id="directory-title"
            eyebrow="A little clarity, before you begin"
            title="What would you like help with?"
            intro="Start with the information that matters to you right now."
          />
          <div className={styles.directory}>
            {RESOURCE_PAGES.map((page) => (
              <article key={page.slug} className={styles.row}>
                <div>
                  <Eyebrow>{page.label}</Eyebrow>
                  <h3 className={styles.rowTitle}>
                    <Link href={resourceHref(page.slug)}>{page.title}</Link>
                  </h3>
                </div>
                <p className={styles.rowText}>{page.description}</p>
                <Link href={resourceHref(page.slug)} className={styles.rowLink} aria-label={`Learn more about ${page.title}`}>
                  Learn More <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </Band>

      <Band labelledBy="hub-faq-title">
        <div className="container">
          <SectionIntro id="hub-faq-title" title="A few answers before you begin." intro="Small questions should not stand between you and getting started." />
          <DisclosureList narrow items={HUB_FAQS.map((faq) => ({ title: faq.question, content: <FaqAnswer faq={faq} /> }))} />
          <ArrowLink to={resourceHref('faqs')} className={styles.faqMore}>
            View All Patient FAQs
          </ArrowLink>
        </div>
      </Band>

      <ResourceContact
        title="Still have questions before getting started?"
        text="Contact Stride for help preparing for your visit, or book your evaluation when you’re ready."
      />
    </>
  );
}
