import type { ReactNode } from 'react';
import styles from './Eyebrow.module.css';

/** Small uppercase clay label above headings. */
export function Eyebrow({ children, tone = 'accent', className }: { children: ReactNode; tone?: 'accent' | 'light' | 'success'; className?: string }) {
  return <p className={[styles.eyebrow, styles[tone], className].filter(Boolean).join(' ')}>{children}</p>;
}
