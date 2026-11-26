'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { conditionHref } from '../../data/conditions';
import type { ActivityTab } from '../../data/home';
import { media } from '../../data/media';
import { Photo } from '../ui/Photo';
import styles from './ActivityTabs.module.css';

/**
 * Home “everyday movement goals” tabs (WAI-ARIA tabs, automatic activation). Click/tap selects; ArrowLeft/ArrowRight
 * (wrapping), Home and End move focus and selection. Only the selected tab is in the tab order; the panel is focusable
 * and labelled by the selected tab. Each tab updates the image, title, explanation and condition links together.
 */
export function ActivityTabs({ tabs, label }: { tabs: readonly ActivityTab[]; label: string }) {
  const [active, setActive] = useState(0);
  // The panel animates only after the visitor changes tabs (never on first paint).
  const [changed, setChanged] = useState(false);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number, focus: boolean) => {
    if (index !== active) setChanged(true);
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    select(next, true);
  };

  const tab = tabs[active];
  const panelId = `${baseId}-panel`;

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((t, index) => (
          <button
            key={t.label}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={panelId}
            tabIndex={index === active ? 0 : -1}
            className={styles.tab}
            onClick={() => select(index, false)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        key={active}
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        className={[styles.panel, changed ? styles.panelChanged : ''].join(' ')}
      >
        <Photo image={media(tab.image, tab.alt)} className={styles.figure} sizes="(min-width: 900px) 52vw, 100vw" />
        <div className={styles.copy}>
          <h3 className={styles.title}>{tab.title}</h3>
          <p className={styles.text}>{tab.copy}</p>
          <ul className={styles.links} aria-label={`Treatment areas: ${tab.label}`}>
            {tab.links.map((link) => (
              <li key={link.slug}>
                <Link href={conditionHref(link.slug)} className={styles.chip}>
                  {link.label} <span className={styles.chipArrow} aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
