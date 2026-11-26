'use client';

import { useId, useState, type ReactNode } from 'react';
import styles from './Disclosure.module.css';

export interface DisclosureItem {
  /** Stable key (defaults to the title). */
  key?: string;
  title: string;
  content: ReactNode;
}

interface Props {
  items: readonly DisclosureItem[];
  /**
   * `faq`: full-width cards with a + control (FAQs, credentials).
   * `tile`: numbered three-column tiles (service concern selectors) — top-aligned so opening one tile never
   * stretches its neighbours.
   */
  variant?: 'faq' | 'tile';
  /** Only one item open at a time (concern selectors), like the package's `<details name>` groups. */
  exclusive?: boolean;
  headingLevel?: 'h3' | 'h4';
  /** Narrower FAQ column (condition and resource pages). */
  narrow?: boolean;
  className?: string;
  /** Accessible name for the group (optional). */
  label?: string;
}

/**
 * Expand-in-place list built on native buttons: aria-expanded / aria-controls, Enter/Space via the button, and the
 * answer region labelled by its question. Everything starts closed, as in the package.
 */
export function DisclosureList({ items, variant = 'faq', exclusive = false, headingLevel: Heading = 'h3', narrow, className, label }: Props) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(exclusive ? [] : current);
      if (current.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div
      className={[styles.list, styles[variant], narrow ? styles.narrow : '', className].filter(Boolean).join(' ')}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      {items.map((item, index) => {
        const key = item.key ?? item.title;
        const isOpen = open.has(key);
        const buttonId = `${baseId}-b${index}`;
        const panelId = `${baseId}-p${index}`;
        return (
          <div key={key} className={styles.item} data-open={isOpen}>
            <Heading className={styles.heading}>
              <button type="button" id={buttonId} className={styles.trigger} aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(key)}>
                {variant === 'tile' && (
                  <span className={styles.index} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                )}
                <span className={styles.title}>{item.title}</span>
                <span className={styles.plus} aria-hidden="true" />
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={buttonId} className={styles.panel} hidden={!isOpen}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
