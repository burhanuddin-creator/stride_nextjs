import Link from 'next/link';
import { notFound } from 'next/navigation';
import { media } from '../../data/media';
import { SERVICE_DETAILS } from '../../data/serviceDetails';
import { isServiceSlug, SERVICES_INDEX_HREF, serviceHref } from '../../data/services';
import { serviceContactHref } from '../../utils/links';
import { AppointmentBanner, Band, NumberedCards, SectionIntro } from '../../components/blocks/Blocks';
import { DisclosureList } from '../../components/blocks/Disclosure';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import { Photo } from '../../components/ui/Photo';
import styles from './ServicePage.module.css';

/**
 * The twelve service pages (client package `#service/<slug>`). The package uses one composition for every service:
 * text-only teal hero → "What is …?" with photo → concern selector → benefits → complementary services → FAQs →
 * sand appointment banner. Copy comes from src/data/serviceDetails.ts.
 */
export default function ServicePage({ slug }: { slug: string }) {
  const service = isServiceSlug(slug) ? SERVICE_DETAILS[slug] : undefined;
  if (!service) notFound();

  const appointmentHref = serviceContactHref(service.slug);

  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Services', to: SERVICES_INDEX_HREF }, { label: service.title }]}
        title={service.title}
        tagline={service.tagline}
        text={service.heroText}
        actions={
          <>
            <ButtonLink to={appointmentHref} variant="clay" aria-label={`Request an Appointment for ${service.title}`}>
              Request an Appointment
            </ButtonLink>
            <ButtonLink to={SERVICES_INDEX_HREF} variant="ghost" arrow={false}>
              Explore All Services
            </ButtonLink>
          </>
        }
      />

      <Band labelledBy="service-about">
        <div className={`container ${styles.about}`}>
          <div>
            <h2 id="service-about" className={styles.aboutTitle}>
              {service.about.heading}
            </h2>
            {service.about.paragraphs.map((p) => (
              <p key={p} className={styles.aboutText}>
                {p}
              </p>
            ))}
          </div>
          <Photo image={media(service.about.image, service.about.alt)} className={styles.aboutPhoto} sizes="(min-width: 900px) 42vw, 100vw" priority />
        </div>
      </Band>

      <Band tone="subtle" id="goals" labelledBy="service-concerns">
        <div className="container">
          <SectionIntro id="service-concerns" title={service.concerns.heading} intro={service.concerns.intro} />
          <DisclosureList
            variant="tile"
            exclusive
            label={service.concerns.heading}
            items={service.concerns.items.map((c) => ({ title: c.title, content: <p>{c.text}</p> }))}
          />
        </div>
      </Band>

      <Band tone="warm" labelledBy="service-benefits">
        <div className="container">
          <SectionIntro id="service-benefits" eyebrow={service.benefits.eyebrow} title={service.benefits.heading} intro={service.benefits.intro} />
          <NumberedCards items={service.benefits.items} />
        </div>
      </Band>

      <Band labelledBy="service-related" className={styles.relatedBand}>
        <div className="container">
          <h2 id="service-related" className={styles.relatedTitle}>
            {service.related.heading}
          </h2>
          <ul className={styles.related}>
            {service.related.items.map((item) => {
              const related = SERVICE_DETAILS[item.slug];
              return (
                <li key={item.slug} className={styles.relatedItem}>
                  {/* The thumbnail repeats the text link, so it is hidden from assistive technology and the tab order. */}
                  <Link href={serviceHref(item.slug)} tabIndex={-1} aria-hidden="true" className={styles.relatedThumb}>
                    <Photo image={media(item.image, '')} sizes="120px" />
                  </Link>
                  <div className={styles.relatedCopy}>
                    <Link href={serviceHref(item.slug)} className={styles.relatedLink}>
                      <span>{related.title}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                    <p>{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}>{service.related.note}</p>
        </div>
      </Band>

      <Band tone="warm" id="faq" labelledBy="service-faq">
        <div className="container">
          <h2 id="service-faq" className={styles.faqTitle}>
            {service.faq.heading}
          </h2>
          <DisclosureList items={service.faq.items.map((f) => ({ title: f.question, content: <p>{f.answer}</p> }))} />
        </div>
      </Band>

      <AppointmentBanner
        title={service.appointment.heading}
        text={service.appointment.text}
        image={media(service.appointment.image, service.appointment.alt)}
        action={
          <ButtonLink to={appointmentHref} variant="clay" aria-label={`Request an Appointment for ${service.title}`}>
            Request an Appointment
          </ButtonLink>
        }
      />
    </>
  );
}
