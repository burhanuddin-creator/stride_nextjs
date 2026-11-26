import styles from './PortraitPlaceholder.module.css';

/**
 * Neutral silhouette shown until an approved portrait of Arva is supplied.
 * Deliberately not a photograph of any real person.
 */
export function PortraitPlaceholder({ variant = 'wide', label = 'Approved portrait to be supplied' }: { variant?: 'wide' | 'tall'; label?: string }) {
  return (
    <figure className={[styles.figure, styles[variant]].join(' ')}>
      <div className={styles.frame} role="img" aria-label={`Portrait placeholder: ${label}`}>
        <svg className={styles.art} viewBox="0 0 300 260" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
          {variant === 'wide' && (
            <g className={styles.leaves}>
              <path d="M40 250 C 30 200, 45 160, 80 130 C 85 175, 70 215, 40 250 Z" />
              <path d="M260 250 C 270 205, 255 165, 225 140 C 218 180, 232 220, 260 250 Z" />
            </g>
          )}
          <circle className={styles.halo} cx="150" cy="150" r="105" />
          <path
            className={styles.silhouette}
            d="M150 40 c-32 0 -52 26 -52 60 c0 18 -8 40 -18 58 c14 6 30 8 42 6 l0 14 c-34 8 -62 30 -70 82 h196 c-8 -52 -36 -74 -70 -82 l0 -14 c12 2 28 0 42 -6 c-10 -18 -18 -40 -18 -58 c0 -34 -20 -60 -52 -60 z"
          />
        </svg>
        {variant === 'tall' && (
          <span className={styles.inlineLabel} aria-hidden="true">
            {label}
          </span>
        )}
      </div>
      {variant === 'wide' && (
        <figcaption className={styles.caption} aria-hidden="true">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
