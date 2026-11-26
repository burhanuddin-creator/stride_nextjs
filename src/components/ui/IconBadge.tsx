import { icons, type IconName } from './icons';
import styles from './IconBadge.module.css';

interface Props {
  icon: IconName;
  /** ring: clay outline circle (most of the site). soft-*: filled tint circle (Patient Resources). */
  variant?: 'ring' | 'ring-filled' | 'soft-teal' | 'soft-sand' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Decorative icon in a circle. Always hidden from assistive technology. */
export function IconBadge({ icon, variant = 'ring', size = 'md', className }: Props) {
  const Icon = icons[icon];
  return (
    <span className={[styles.badge, styles[variant], styles[size], className].filter(Boolean).join(' ')} aria-hidden="true">
      <Icon className={styles.icon} strokeWidth={1.6} aria-hidden="true" focusable="false" />
    </span>
  );
}
