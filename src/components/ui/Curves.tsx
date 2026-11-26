import styles from './Curves.module.css';

type Variant = 'hero-sand' | 'hero-clay' | 'band-sand' | 'band-teal';

/**
 * Lightweight decorative sweeping curves (the PDF's motif). Purely presentational,
 * hidden from assistive technology, positioned absolutely inside a relative parent.
 */
export function Curves({ variant, className }: { variant: Variant; className?: string }) {
  return (
    <svg
      className={[styles.curves, styles[variant], className].filter(Boolean).join(' ')}
      viewBox="0 0 600 400"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {variant === 'hero-clay' ? (
        <>
          <defs>
            <linearGradient id="curve-clay" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#e9d6bb" />
              <stop offset="0.55" stopColor="#c98f5c" />
              <stop offset="1" stopColor="#b5703e" />
            </linearGradient>
            <linearGradient id="curve-sand" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#f4e8d6" />
              <stop offset="1" stopColor="#e6caa4" />
            </linearGradient>
          </defs>
          <path d="M150 420 C 260 230, 420 70, 640 -20 L 640 40 C 450 120, 300 260, 215 420 Z" fill="url(#curve-sand)" />
          <path d="M300 420 C 380 250, 500 110, 660 30 L 660 110 C 530 180, 430 300, 380 420 Z" fill="url(#curve-clay)" />
          <path d="M420 420 C 470 300, 560 190, 680 130 L 680 175 C 590 230, 510 320, 470 420 Z" fill="url(#curve-clay)" opacity="0.8" />
        </>
      ) : (
        <>
          <path className={styles.c1} d="M120 420 C 230 230, 400 80, 640 -10 L 640 60 C 440 140, 300 270, 205 420 Z" />
          <path className={styles.c2} d="M290 420 C 370 260, 490 130, 660 50 L 660 120 C 520 190, 420 300, 365 420 Z" />
        </>
      )}
    </svg>
  );
}
