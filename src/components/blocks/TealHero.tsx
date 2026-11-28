import type { ReactNode } from 'react';
import Link from 'next/link';
import type { SiteImage } from '../../data/images';
import { Photo } from '../ui/Photo';
import styles from './TealHero.module.css';

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  to?: string;
}

/** Breadcrumb trail ("Home / Services / Physical Therapy"); the last item is the current page. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={[styles.crumbs, className].filter(Boolean).join(' ')}>
      <ol>
        {items.map((item, i) => (
          <li key={item.label}>
            {i > 0 && (
              <span className={styles.crumbSep} aria-hidden="true">
                /
              </span>
            )}
            {item.to ? (
              <Link href={item.to}>{item.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface Props {
  crumbs: Crumb[];
  title: ReactNode;
  tagline?: ReactNode;
  text?: ReactNode;
  actions?: ReactNode;
  /** Optional edge-to-edge photo on the right, faded into the teal panel (Services, Patient Resources). */
  image?: SiteImage;
  imagePosition?: string;
  /**
   * Where the photo goes when the hero stacks (below 900px): 'above' the copy (default — Services, Patient Resources)
   * or 'below' it (Home, as in the Home page package). Desktop is identical either way.
   */
  mobileImage?: 'above' | 'below';
  /** Optional panel beside the copy (What We Treat body explorer). */
  aside?: ReactNode;
  /**
   * Fill a taller parent (the Home hero slider, which may be taller than the hero's own content) and keep the copy
   * vertically centred on desktop.
   */
  fill?: boolean;
  /**
   * Below 900px show only the copy and actions: no photo strip and no breadcrumb (Home hero slider, which must stay
   * as compact as its other slides). Desktop is unchanged.
   */
  compactMobile?: boolean;
}

/**
 * Deep-teal page hero from the client package: breadcrumb, h1, tagline, one sentence and actions. Text-only on
 * service, condition, resource, about and contact pages; with a faded photo on the Services and Patient Resources
 * overviews.
 */
export function TealHero({ crumbs, title, tagline, text, actions, image, imagePosition, mobileImage = 'above', aside, fill, compactMobile }: Props) {
  const below = mobileImage === 'below';
  // The photo is absolutely positioned on desktop, so its place in the markup only matters once the hero stacks:
  // there it also gives text-first reading order when it comes after the copy. When it is hidden on small screens,
  // `sizes` lets those screens fetch only the smallest candidate.
  const media = image && (
    <div className={styles.media}>
      <Photo
        image={image}
        position={imagePosition}
        priority
        sizes={compactMobile ? '(min-width: 900px) 58vw, 1px' : '(min-width: 900px) 58vw, 100vw'}
        className={styles.photo}
      />
    </div>
  );
  return (
    <section
      className={[
        styles.hero,
        image ? styles.withImage : '',
        image && below ? styles.imageBelow : '',
        aside ? styles.withAside : '',
        fill ? styles.fill : '',
        compactMobile ? styles.compactMobile : '',
      ].join(' ')}
      data-surface="dark"
      aria-labelledby="page-title"
    >
      {!below && media}
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <Breadcrumbs items={crumbs} />
          <h1 id="page-title" className={styles.title}>
            {title}
          </h1>
          {tagline && <p className={styles.tagline}>{tagline}</p>}
          {text && <p className={styles.text}>{text}</p>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        {aside}
      </div>
      {below && media}
    </section>
  );
}
