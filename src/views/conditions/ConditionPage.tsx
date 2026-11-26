import { notFound } from 'next/navigation';
import { CONDITION_BY_SLUG, isConditionSlug, WHAT_WE_TREAT_HREF } from '../../data/conditions';
import { media } from '../../data/media';
import { conditionContactHref } from '../../utils/links';
import { AppointmentBanner, ArrowColumns, Band, RuledColumns, SectionIntro } from '../../components/blocks/Blocks';
import { DisclosureList } from '../../components/blocks/Disclosure';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Photo } from '../../components/ui/Photo';
import styles from './ConditionPage.module.css';

/**
 * The fourteen condition pages (client package `#treat/<slug>`): text-only teal hero → six everyday activities →
 * education with photo → how PT can help → expandable FAQs → sand appointment banner. No related-services block.
 */
export default function ConditionPage({ slug }: { slug: string }) {
  const condition = isConditionSlug(slug) ? CONDITION_BY_SLUG[slug] : undefined;
  if (!condition) notFound();

  const appointmentHref = conditionContactHref(condition.slug);
  const bookLabel = `Book My Evaluation about ${condition.name}`;

  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'What We Treat', to: WHAT_WE_TREAT_HREF }, { label: condition.name }]}
        title={condition.name}
        tagline={condition.tagline}
        text={condition.heroText}
        actions={
          <>
            <ButtonLink to={appointmentHref} variant="clay" aria-label={bookLabel}>
              Book My Evaluation
            </ButtonLink>
            <ButtonLink to={WHAT_WE_TREAT_HREF} variant="ghost" arrow={false}>
              Explore All Treatment Areas
            </ButtonLink>
          </>
        }
      />

      <Band labelledBy="condition-activities">
        <div className="container">
          <SectionIntro id="condition-activities" title={condition.activities.heading} intro={condition.activities.intro} />
          <ArrowColumns items={condition.activities.items} />
        </div>
      </Band>

      <Band tone="warm" labelledBy="condition-about">
        <div className={`container ${styles.about}`}>
          <div>
            <Eyebrow>{condition.about.eyebrow}</Eyebrow>
            <h2 id="condition-about" className={styles.aboutTitle}>
              {condition.about.heading}
            </h2>
            {condition.about.paragraphs.map((p) => (
              <p key={p} className={styles.aboutText}>
                {p}
              </p>
            ))}
          </div>
          <Photo image={media(condition.about.image, condition.about.alt)} className={styles.aboutPhoto} sizes="(min-width: 900px) 42vw, 100vw" />
        </div>
      </Band>

      <Band labelledBy="condition-help">
        <div className="container">
          <SectionIntro id="condition-help" eyebrow={condition.help.eyebrow} title={condition.help.heading} intro={condition.help.intro} />
          <RuledColumns numbered items={condition.help.items} />
        </div>
      </Band>

      <Band tone="subtle" labelledBy="condition-faq">
        <div className="container">
          <SectionIntro id="condition-faq" title={condition.faq.heading} intro={condition.faq.intro} />
          <DisclosureList narrow items={condition.faq.items.map((f) => ({ title: f.question, content: <p>{f.answer}</p> }))} />
        </div>
      </Band>

      <AppointmentBanner
        title={condition.appointment.heading}
        text={condition.appointment.text}
        image={media(condition.appointment.image, condition.appointment.alt)}
        action={
          <ButtonLink to={appointmentHref} variant="clay" aria-label={bookLabel}>
            Book My Evaluation
          </ButtonLink>
        }
      />
    </>
  );
}
