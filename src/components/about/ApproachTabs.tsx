'use client';

import { useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from 'react';
import styles from './ApproachTabs.module.css';

export interface ApproachTab {
  label: string;
  title: string;
  text: string;
}

const HORIZONTAL_QUERY = '(max-width: 720px)';

function subscribe(callback: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(HORIZONTAL_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function isHorizontal() {
  return typeof window.matchMedia === 'function' && window.matchMedia(HORIZONTAL_QUERY).matches;
}

/**
 * "Her approach" tabs (client package Meet Dr. Arva Gadly). WAI-ARIA tabs with automatic activation: arrow keys move
 * between tabs (Up/Down on the vertical desktop list, Left/Right on the horizontal mobile row — both work either
 * way), Home/End jump to the ends, and only the selected tab is in the tab order. The clay indicator slides to the
 * selected tab (no motion when reduced motion is requested). Never auto-rotates.
 */
export function ApproachTabs({ tabs, label }: { tabs: readonly ApproachTab[]; label: string }) {
  const [selected, setSelected] = useState(0);
  const horizontal = useSyncExternalStore(subscribe, isHorizontal, () => false);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activate = (index: number) => {
    setSelected(index);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    activate(next);
  };

  return (
    <div className={styles.layout}>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label={label}
        aria-orientation={horizontal ? 'horizontal' : 'vertical'}
        style={{ '--approach-index': selected, '--approach-count': tabs.length } as CSSProperties}
      >
        <span className={styles.indicator} aria-hidden="true" />
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-controls={`${baseId}-panel-${i}`}
            aria-selected={selected === i}
            tabIndex={selected === i ? 0 : -1}
            className={styles.tab}
            onClick={() => setSelected(i)}
            onKeyDown={(event) => onKeyDown(event, i)}
          >
            {tab.label}
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <div className={styles.panels}>
        {tabs.map((tab, i) => (
          <div
            key={tab.label}
            role="tabpanel"
            id={`${baseId}-panel-${i}`}
            aria-labelledby={`${baseId}-tab-${i}`}
            tabIndex={0}
            hidden={selected !== i}
            className={styles.panel}
          >
            <p className={styles.caption}>{tab.label}</p>
            <h3 className={styles.title}>{tab.title}</h3>
            <p className={styles.copy}>{tab.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
