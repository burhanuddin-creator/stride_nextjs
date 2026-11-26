import { media } from '../../data/media';
import { SERVICE_DETAIL_LIST, SERVICES_HERO } from '../../data/serviceDetails';
import { serviceHref } from '../../data/services';
import { contactHref } from '../../utils/links';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import { Photo } from '../../components/ui/Photo';
import styles from './ServicesPage.module.css';

/** Services overview (client package `#services`): faded-photo hero, alternating rows, guidance timeline. */
export default function ServicesPage() {

  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Services' }]}
        title="Services"
        tagline="Personalized care in Westmont."
        text="Care that meets you where you are—and helps you move forward."
        image={media(SERVICES_HERO.image, SERVICES_HERO.alt)}
        imagePosition="50% 50%"
        actions={
          <>
            <ButtonLink to="#directory" variant="clay">
              Explore All Services
            </ButtonLink>
            <ButtonLink to={contactHref()} variant="ghost" arrow={false}>
              Book My Evaluation
            </ButtonLink>
          </>
        }
      />

      <section id="directory" className={styles.directory} aria-labelledby="directory-title">
        <div className="container">
          <h2 id="directory-title" className={styles.directoryTitle}>
            Find the care that fits your goals.
          </h2>
          <ul className={styles.rows} aria-label="Our services">
            {SERVICE_DETAIL_LIST.map((service) => (
              <li key={service.slug} className={styles.row}>
                <Photo
                  image={media(service.overview.image, service.overview.alt)}
                  className={styles.rowImage}
                  sizes="(min-width: 900px) 40vw, 100vw"
                />
                <div className={styles.rowCopy}>
                  <h3>{service.title}</h3>
                  <p>{service.overview.summary}</p>
                  <ButtonLink to={serviceHref(service.slug)} arrow={false} aria-label={`Learn more about ${service.title}`}>
                    Learn More
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.guidance} aria-labelledby="guidance-title">
        <div className={`container ${styles.guidanceInner}`}>
          <h2 id="guidance-title">Not sure which service you need?</h2>
          <p className={styles.guidanceLead}>Start with an evaluation. Dr. Arva Gadly can help you understand your options.</p>
          <ol className={styles.timeline}>
            <li>
              <span className={styles.timelineNumber} aria-hidden="true">
                01
              </span>
              <h3>Start with an evaluation</h3>
              <p>Share your symptoms, activity needs, and goals.</p>
            </li>
            <li>
              <span className={styles.timelineNumber} aria-hidden="true">
                02
              </span>
              <h3>Discuss your options</h3>
              <p>Review findings and appropriate care choices.</p>
            </li>
            <li>
              <span className={styles.timelineNumber} aria-hidden="true">
                03
              </span>
              <h3>Build your plan</h3>
              <p>Connect care with meaningful movement.</p>
            </li>
          </ol>
          <ButtonLink to={contactHref()} variant="clay">
            Book My Evaluation
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
