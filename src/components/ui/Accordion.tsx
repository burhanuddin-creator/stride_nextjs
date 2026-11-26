'use client';

import { useId, useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import type { FaqItem } from '../../data/content';
import styles from './Accordion.module.css';

interface Props {
  items: FaqItem[];
  /** Indexes open on first render (the PDF shows the first answer expanded). */
  defaultOpen?: number[];
  indicator?: 'plus' | 'chevron';
  headingLevel?: 'h3' | 'h4';
}

/** FAQ accordion: native buttons with aria-expanded / aria-controls; each item toggles independently. */
export function Accordion({ items, defaultOpen = [0], indicator = 'plus', headingLevel: Heading = 'h3' }: Props) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<number>>(() => new Set(defaultOpen));

  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className={[styles.list, styles[indicator]].join(' ')}>
      {items.map((item, index) => {
        const isOpen = open.has(index);
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;
        const Icon = indicator === 'chevron' ? ChevronDown : isOpen ? Minus : Plus;
        return (
          <div key={item.question} className={styles.item} data-open={isOpen}>
            <Heading className={styles.heading}>
              <button
                type="button"
                id={buttonId}
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span>{item.question}</span>
                <Icon className={styles.icon} size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={buttonId} className={styles.panel} hidden={!isOpen}>
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
