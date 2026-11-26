'use client';

import { useRef, type SyntheticEvent } from 'react';
import Link from 'next/link';
import type { HOME_FAQS } from '../../data/home';
import { resourceHref } from '../../data/resources';
import styles from './HomeFaqs.module.css';

/**
 * Native <details>/<summary> questions with a plus/minus affordance. One answer is open at a time: the shared `name`
 * groups them in browsers that support exclusive accordions, and the toggle handler closes the others everywhere else.
 */
export function HomeFaqs({ faqs }: { faqs: typeof HOME_FAQS }) {
  const listRef = useRef<HTMLDivElement>(null);

  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const opened = event.currentTarget;
    if (!opened.open) return;
    listRef.current?.querySelectorAll('details').forEach((details) => {
      if (details !== opened && details.open) details.open = false;
    });
  };

  return (
    <div ref={listRef} className={styles.list}>
      {faqs.map((faq) => (
        <details key={faq.question} name="home-faq" className={styles.item} onToggle={onToggle}>
          <summary className={styles.summary}>
            <span>{faq.question}</span>
            <span className={styles.plus} aria-hidden="true" />
          </summary>
          <div className={styles.answer}>
            <p>{faq.answer}</p>
            <Link href={resourceHref(faq.link.resource)} className={styles.link}>
              {faq.link.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </details>
      ))}
    </div>
  );
}
