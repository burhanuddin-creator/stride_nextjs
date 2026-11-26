import Link from 'next/link';
import type { EducationArticle } from '../../data/resources';
import { resourceHref } from '../../data/resources';
import { Band } from '../../components/blocks/Blocks';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ResourceContact, ResourceHero } from './shared';
import styles from './Resources.module.css';

/** One Patient Education article (client package `#resource/<article>`). The article title is the page h1. */
export function ArticlePage({ article }: { article: EducationArticle }) {
  return (
    <>
      <ResourceHero title={article.title} text={article.description} />

      <Band label={article.title}>
        <article className={`container ${styles.reading}`}>
          <Eyebrow>{article.category}</Eyebrow>
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.text}</p>
            </section>
          ))}
          <p className={styles.small}>{article.note}</p>
          <Link href={resourceHref('patient-education')} className={styles.arrowLink}>
            <span aria-hidden="true">←</span> Back to Patient Education
          </Link>
        </article>
      </Band>

      <ResourceContact title={article.contact.heading} text={article.contact.text} />
    </>
  );
}
