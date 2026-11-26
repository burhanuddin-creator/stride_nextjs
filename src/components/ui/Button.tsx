import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './Button.module.css';

/** `ghost`: transparent with a light outline, for dark (teal) surfaces. */
type Variant = 'primary' | 'outline' | 'clay' | 'light' | 'ghost';
type Size = 'md' | 'sm' | 'lg';

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  icon?: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

function classes(variant: Variant, size: Size, fullWidth?: boolean, extra?: string) {
  return [styles.button, styles[variant], styles[size], fullWidth ? styles.full : '', extra ?? ''].filter(Boolean).join(' ');
}

function Content({ children, arrow, icon }: Pick<CommonProps, 'children' | 'arrow' | 'icon'>) {
  return (
    <>
      {icon && (
        <span className={styles.leadingIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {arrow && <ArrowRight className={styles.arrow} size={18} strokeWidth={2} aria-hidden="true" />}
    </>
  );
}

/** Internal route link styled as a button. */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  arrow = true,
  icon,
  className,
  fullWidth,
  children,
  ...rest
}: CommonProps & { to: string; 'aria-label'?: string }) {
  return (
    <Link href={to} className={classes(variant, size, fullWidth, className)} {...rest}>
      <Content arrow={arrow} icon={icon}>
        {children}
      </Content>
    </Link>
  );
}

/** External link (opens in a new tab) styled as a button. */
export function ButtonAnchor({
  href,
  variant = 'primary',
  size = 'md',
  arrow = true,
  icon,
  className,
  fullWidth,
  children,
  ...rest
}: CommonProps & { href: string; 'aria-label'?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes(variant, size, fullWidth, className)} {...rest}>
      <Content arrow={arrow} icon={icon}>
        {children}
      </Content>
    </a>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  arrow = false,
  icon,
  className,
  fullWidth,
  children,
  type = 'button',
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, size, fullWidth, className)} {...rest}>
      <Content arrow={arrow} icon={icon}>
        {children}
      </Content>
    </button>
  );
}
