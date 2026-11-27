'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { isNavGroup, primaryNav } from '../../data/navigation';
import { MobileNavGroup, NavDropdown } from './NavDropdown';
import { NavLink } from './NavLink';
import { SCHEDULE_APPOINTMENT_PATH } from '../../utils/links';
import { ButtonLink } from '../ui/Button';
import logo from '../../assets/brand/logo-lockup.png';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = usePathname();
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu whenever the route changes (same-page hash links close it on click, below).
  const [lastLocation, setLastLocation] = useState(location);
  if (lastLocation !== location) {
    setLastLocation(location);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          {/* The link is named by the logo's alt text, so crawlers see link text too (an aria-label on the link is not). */}
          <img src={logo.src} alt="Stride Physical Therapy & Wellness — Home" width={758} height={240} />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.navList}>
            {primaryNav.map((item) => (
              <li key={item.to}>
                {isNavGroup(item) ? (
                  <NavDropdown group={item} linkClassName={styles.navLink} activeClassName={styles.active} />
                ) : (
                  <NavLink href={item.to} className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <ButtonLink to={SCHEDULE_APPOINTMENT_PATH} size="sm" className={styles.cta}>
          Schedule an Appointment
        </ButtonLink>

        <button
          ref={toggleRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      <div
        id={menuId}
        className={styles.mobilePanel}
        hidden={!menuOpen}
        onClick={(event) => {
          if ((event.target as Element).closest('a')) setMenuOpen(false);
        }}
      >
        <nav aria-label="Main (mobile)" className="container">
          <ul className={styles.mobileList}>
            {primaryNav.map((item) => (
              <li key={item.to}>
                {isNavGroup(item) ? (
                  <MobileNavGroup group={item} linkClassName={styles.mobileLink} />
                ) : (
                  <NavLink
                    href={item.to}
                    className={({ isActive }) => [styles.mobileLink, isActive ? styles.mobileActive : ''].join(' ')}
                  >
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
          <ButtonLink to={SCHEDULE_APPOINTMENT_PATH} fullWidth className={styles.mobileCta}>
            Schedule an Appointment
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
