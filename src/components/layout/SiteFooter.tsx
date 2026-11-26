import { Fragment } from 'react';
import Link from 'next/link';
import { addressCityLine, emailHref, faxDisplay, phoneDisplay, phoneHref, site } from '../../config/site';
import { footerLinkGroups } from '../../data/navigation';
import { LegalLink } from '../ui/LegalDialog';
import logoLight from '../../assets/brand/logo-lockup-light.png';
import styles from './SiteFooter.module.css';

/** One footer on every page (client developer package footer content in the site's style). */
export function SiteFooter() {
  return (
    <footer className={styles.footer} data-surface="dark">
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.logo}>
            <img src={logoLight.src} alt="Stride Physical Therapy & Wellness — Home" width={758} height={240} />
          </Link>
          <p className={styles.tagline}>Physical Therapy &amp; Wellness</p>
        </div>
        <address className={styles.contactBlock}>
          <span>{site.address.street}</span>
          <span>{addressCityLine}</span>
          <span className={styles.hoursList}>
            {site.hours.map((h) => (
              <span key={h.days}>
                {h.short}: {h.time}
              </span>
            ))}
          </span>
          <a href={phoneHref} className={styles.footerLink}>{phoneDisplay}</a>
          <span>{faxDisplay}</span>
          <a href={emailHref} className={styles.footerLink}>
            {site.email}
          </a>
        </address>
        <nav aria-label="Footer" className={styles.siteLinks}>
          {footerLinkGroups.map((group) => (
            <p key={group[0].to} className={styles.linkRow}>
              {group.map((link, i) => (
                <Fragment key={link.to}>
                  {i > 0 && (
                    <span className={styles.dot} aria-hidden="true">
                      ·
                    </span>
                  )}
                  <Link href={link.to} className={styles.footerLink}>
                    {link.label}
                  </Link>
                </Fragment>
              ))}
            </p>
          ))}
          <p className={styles.linkRow}>
            <LegalLink topic="privacy" className={styles.footerLink}>
              Privacy
            </LegalLink>
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
            <LegalLink topic="accessibility" className={styles.footerLink}>
              Accessibility
            </LegalLink>
          </p>
        </nav>
        <p className={styles.provenance}>
          Illustrative photography: clinic and everyday scenes are illustrations, not photographs of Stride staff,
          patients, or the clinic.
        </p>
      </div>

      <p className={styles.notice}>
        Design and Developed by Stride Physical Therapy
        <sup className={styles.trademark}>™</sup>
      </p>
    </footer>
  );
}
