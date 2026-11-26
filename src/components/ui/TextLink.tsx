import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './TextLink.module.css';

interface Props {
  to: string;
  children: ReactNode;
  size?: 'md' | 'lg';
  'aria-label'?: string;
  className?: string;
}

/** Clay text link with underline rule and arrow, as used for "Explore…" and "Meet Arva". */
export function TextLink({ to, children, size = 'md', className, ...rest }: Props) {
  return (
    <Link href={to} className={[styles.link, styles[size], className].filter(Boolean).join(' ')} {...rest}>
      <span>{children}</span>
      <ArrowRight className={styles.arrow} size={size === 'lg' ? 20 : 17} strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}

/** Same visual treatment for in-page disclosure buttons. */
export function TextButton({
  children,
  size = 'md',
  className,
  ...rest
}: Omit<Props, 'to'> & React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button type="button" className={[styles.link, styles.button, styles[size], className].filter(Boolean).join(' ')} {...rest}>
      <span>{children}</span>
      <ArrowRight className={styles.arrow} size={size === 'lg' ? 20 : 17} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
