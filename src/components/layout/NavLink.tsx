'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** True when `href` is the current page, or (unless `end`) a parent section of it — React Router NavLink semantics. */
export function useIsActive(href: string, end = false) {
  const pathname = usePathname();
  const path = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (pathname === path) return true;
  return !end && path !== '/' && pathname.startsWith(`${path}/`);
}

interface Props {
  href: string;
  /** Match the exact path only (not child pages). */
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
  children: ReactNode;
  'data-dropdown-link'?: boolean;
}

/** next/link with the active-state behaviour of React Router's NavLink: aria-current="page" and an active class. */
export function NavLink({ href, end, className, children, ...rest }: Props) {
  const isActive = useIsActive(href, end);
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className}
      {...rest}
    >
      {children}
    </Link>
  );
}
