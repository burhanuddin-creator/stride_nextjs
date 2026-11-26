import Link from 'next/link';
import { WHAT_WE_TREAT_HREF } from '../../data/conditions';
import { ARTICLES, resourceHref } from '../../data/resources';
import { Band } from '../../components/blocks/Blocks';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ResourceContact, ResourceHero } from './shared';
import styles from './Resources.module.css';

/** Patient Education (client package `#resource/patient-education`): the three linked articles. */
export default function PatientEducationPage() {
  return (
    <>
      <ResourceHero
        title="Patient Education"
        tagline="Understand your care. Take part in the plan."
        text="A few useful reads to support conversations with your clinician and help you prepare for care."
      />

      <Band labelledBy="education-title">
        <div className="container">
          <h2 id="education-title" className={styles.blockTitle}>
            A useful place to begin.
          </h2>
          <ul className={styles.articles}>
            {ARTICLES.map((article) => (
              <li key={article.slug} className={styles.article}>
                <div>
                  <Eyebrow>{article.category}</Eyebrow>
                  <h3>
                    <Link href={resourceHref(article.slug)}>{article.title}</Link>
                  </h3>
                  <p>{article.description}</p>
                </div>
                <Link href={resourceHref(article.slug)} className={styles.rowLink} aria-label={`Read article: ${article.title}`}>
                  Read Article <span aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <section className={styles.access} data-surface="dark" aria-labelledby="access-title">
        <div className={`container ${styles.accessInner}`}>
          <div>
            <h2 id="access-title">Looking for information about a specific concern?</h2>
            <p>Explore the activities and symptoms that may feel familiar in What We Treat.</p>
          </div>
          <ButtonLink to={WHAT_WE_TREAT_HREF} variant="clay">
            Explore What We Treat
          </ButtonLink>
        </div>
      </section>

      <ResourceContact
        title="Still have questions before getting started?"
        text="Contact Stride for help preparing for your visit, or book your evaluation when you’re ready."
      />
    </>
  );
}
