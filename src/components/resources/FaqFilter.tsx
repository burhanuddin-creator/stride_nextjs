'use client';

import { useState, type ReactNode } from 'react';
import { DisclosureList } from '../blocks/Disclosure';
import styles from '../../views/resources/Resources.module.css';

export interface FilterableFaq {
  category: string;
  title: string;
  /** Answer markup, rendered on the server. */
  content: ReactNode;
}

/**
 * Patient FAQ filters: toggle buttons (aria-pressed) in a labelled group; a polite status reports how many questions
 * are shown. Changing the filter closes any open answers, as in the package.
 */
export function FaqFilter({ filters, faqs }: { filters: readonly { id: string; label: string }[]; faqs: readonly FilterableFaq[] }) {
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? faqs : faqs.filter((faq) => faq.category === filter);
  const filterLabel = filters.find((f) => f.id === filter)?.label ?? '';

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter patient questions">
        {filters.map((f) => (
          <button key={f.id} type="button" className={styles.filter} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className={styles.filterStatus} role="status">
        {filter === 'all' ? `Showing all ${visible.length} questions.` : `Showing ${visible.length} questions: ${filterLabel}.`}
      </p>
      <DisclosureList key={filter} narrow items={visible.map(({ title, content }) => ({ title, content }))} />
    </>
  );
}
