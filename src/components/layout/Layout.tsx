import type { ReactNode } from 'react';
import { LegalDialogProvider } from '../ui/LegalDialog';
import { RouteFocus } from './RouteFocus';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { StagingNotice } from './StagingNotice';
import styles from './Layout.module.css';

/** Shared page frame (rendered once by src/app/layout.tsx): skip link, staging notice, header, main, footer. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <LegalDialogProvider>
      <RouteFocus />
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <StagingNotice />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter />
    </LegalDialogProvider>
  );
}
