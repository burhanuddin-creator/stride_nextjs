import { useId, type CSSProperties, type ReactNode } from 'react';
import type { SiteImage } from '../../data/images';
import { Reveal } from '../ui/Reveal';
import { Eyebrow } from '../ui/Eyebrow';
import { Photo } from '../ui/Photo';
import styles from './Blocks.module.css';

export type BandTone = 'white' | 'subtle' | 'warm' | 'sand';

/** Full-width page band with one of the package's background treatments. */
export function Band({
  tone = 'white',
  id,
  labelledBy,
  label,
  className,
  children,
}: {
  tone?: BandTone;
  id?: string;
  labelledBy?: string;
  /** Accessible name when the band has no visible heading. */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} aria-label={label} className={[styles.band, styles[tone], className].filter(Boolean).join(' ')}>
      {children}
    </section>
  );
}

/** Eyebrow + h2 + intro sentence. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  intro,
  center,
  className,
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={[styles.intro, center ? styles.center : '', className].filter(Boolean).join(' ')}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id}>{title}</h2>
      {intro && <p className={styles.introText}>{intro}</p>}
    </div>
  );
}

export interface TextItem {
  title: string;
  text: ReactNode;
  action?: ReactNode;
}

/** Three cards with a large clay number (service "why" benefits). */
export function NumberedCards({ items }: { items: readonly TextItem[] }) {
  return (
    <ol className={styles.numberedCards}>
      {items.map((item, i) => (
        <li key={item.title} className={styles.numberedCard}>
          <span className={styles.bigNumber} aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Columns topped by a thin clay rule (condition "how PT can help", resource mini-grids). `numbered` adds 01/02/03
 * above each title; `as="ol"` keeps the numbering meaningful for assistive technology.
 */
export function RuledColumns({ items, numbered = false, numberStyle = 'large' }: { items: readonly TextItem[]; numbered?: boolean; numberStyle?: 'large' | 'small' }) {
  const List = numbered ? 'ol' : 'ul';
  return (
    <List className={styles.ruled}>
      {items.map((item, i) => (
        <li key={item.title} className={styles.ruledItem}>
          {numbered && (
            <span className={numberStyle === 'large' ? styles.ruledNumber : styles.ruledNumberSmall} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
          )}
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          {item.action && <div className={styles.ruledAction}>{item.action}</div>}
        </li>
      ))}
    </List>
  );
}

function Arrow() {
  return (
    <svg className={styles.arrowIcon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3 10h14M12 5l5 5-5 5" />
    </svg>
  );
}

/** Two columns of arrow-led everyday activities that slide in on scroll (condition pages). */
export function ArrowColumns({ items }: { items: readonly string[] }) {
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)];
  return (
    <Reveal className={styles.arrowColumns}>
      {columns.map((column, c) => (
        <ul key={c} className={styles.arrowList}>
          {column.map((item, i) => (
            <li key={item} className={styles.revealItem} style={{ '--reveal-delay': `${i * 95}ms` } as CSSProperties}>
              <Arrow />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ))}
    </Reveal>
  );
}

/** Arrow checklist with dividers that slides in on scroll (first-visit preparation). */
export function Checklist({ items }: { items: readonly string[] }) {
  return (
    <Reveal as="ul" className={styles.checklist}>
      {items.map((item, i) => (
        <li key={item} className={styles.revealItem} style={{ '--reveal-delay': `${(i % 3) * 70}ms` } as CSSProperties}>
          <span className={styles.checkArrow} aria-hidden="true">
            →
          </span>
          <span>{item}</span>
        </li>
      ))}
    </Reveal>
  );
}

/** Two-column bullet list with clay dots (questions for your insurer). */
export function DotList({ items }: { items: readonly string[] }) {
  return (
    <ul className={styles.dotList}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Warm panel with a clay left rule (asides beside resource copy). */
export function NotePanel({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <aside className={styles.note} aria-labelledby={titleId}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h3 id={titleId} className={styles.noteTitle}>
        {title}
      </h3>
      <div className={styles.noteBody}>{children}</div>
    </aside>
  );
}

/** Main copy with an aside panel beside it (stacks on small screens). */
export function TwoColumn({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={['container', styles.twoColumn, className].filter(Boolean).join(' ')}>
      <div className={styles.mainColumn}>{children}</div>
      {aside}
    </div>
  );
}

/** Centered closing band with a heading, sentence and actions (resource, about and contact pages). */
export function CenteredCta({
  id,
  title,
  text,
  actions,
  tone = 'warm',
}: {
  id: string;
  title: string;
  text: ReactNode;
  actions: ReactNode;
  tone?: 'warm' | 'sand';
}) {
  return (
    <section id={id} className={[styles.centeredCta, styles[tone]].join(' ')} aria-labelledby={`${id}-title`}>
      <div className={`container ${styles.centeredInner}`}>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{text}</p>
        <div className={styles.actions}>{actions}</div>
      </div>
    </section>
  );
}

/** Sand appointment banner with copy, one action and a photo (service and condition pages). */
export function AppointmentBanner({ id = 'appointment', title, text, action, image }: { id?: string; title: string; text: string; action: ReactNode; image: SiteImage }) {
  return (
    <section id={id} className={styles.banner} aria-labelledby={`${id}-title`}>
      <div className={`container ${styles.bannerInner}`}>
        <div className={styles.bannerCopy}>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{text}</p>
          <div>{action}</div>
        </div>
        <Photo image={image} className={styles.bannerPhoto} sizes="(min-width: 900px) 45vw, 100vw" />
      </div>
    </section>
  );
}
