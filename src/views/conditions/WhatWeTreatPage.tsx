import Link from 'next/link';
import { CONDITIONS, conditionHref } from '../../data/conditions';
import { media } from '../../data/media';
import { TealHero } from '../../components/blocks/TealHero';
import { BodyExplorer } from '../../components/conditions/BodyExplorer';
import { TreatmentFinder } from '../../components/conditions/TreatmentFinder';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Photo } from '../../components/ui/Photo';
import styles from './WhatWeTreatPage.module.css';

/** What We Treat overview (client package `#what-we-treat`): body explorer, treatment-area cards, branching quiz. */
export default function WhatWeTreatPage() {

  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'What We Treat' }]}
        title="What We Treat"
        tagline="Find care for the way life moves you."
        text="Explore common areas of pain, stiffness, and movement difficulty. Start with a body area, or let a few everyday questions guide you."
        actions={
          <>
            <ButtonLink to="#treatment-areas" variant="clay" arrow={false}>
              Explore Treatment Areas
            </ButtonLink>
            <ButtonLink to="#area-quiz" variant="ghost" arrow={false}>
              Help Me Find a Starting Point
            </ButtonLink>
          </>
        }
        aside={<BodyExplorer />}
      />

      <section id="treatment-areas" className={styles.directory} aria-labelledby="treatment-areas-title">
        <div className="container">
          <h2 id="treatment-areas-title" className={styles.title}>
            Where would you like to start?
          </h2>
          <p className={styles.lead}>Explore body areas and conditions to find familiar concerns and learn how we can help.</p>
          <ul className={styles.cards}>
            {CONDITIONS.map((condition) => (
              <li key={condition.slug}>
                <Link href={conditionHref(condition.slug)} className={styles.card}>
                  <Photo image={media(condition.card.image, condition.card.alt)} className={styles.cardPhoto} sizes="(min-width: 1000px) 30vw, (min-width: 720px) 45vw, 100vw" />
                  <div className={styles.cardCopy}>
                    <h3 className={styles.cardTitle}>{condition.name}</h3>
                    <span className={styles.cardText}>{condition.card.summary}</span>
                    <span className={styles.cardMore} aria-hidden="true">
                      Learn More →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="area-quiz" className={styles.finder} aria-labelledby="finder-title">
        <div className={`container ${styles.finderLayout}`}>
          <div className={styles.finderIntro}>
            <Eyebrow>A place to begin</Eyebrow>
            <h2 id="finder-title">Not sure where to start?</h2>
            <p>Tell us where you notice discomfort and what gets in the way of your day. We’ll point you toward relevant treatment-area pages.</p>
            <p className={styles.finderSmall}>A few quick choices. No personal details needed.</p>
          </div>
          <TreatmentFinder />
        </div>
      </section>
    </>
  );
}
