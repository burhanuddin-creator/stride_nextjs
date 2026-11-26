import { serverEnv } from '../../config/env';
import styles from './StagingNotice.module.css';

/**
 * Shown on every page of the staging build only (SITE_ENV=staging). It is not dismissible, so reviewers see it
 * on every page they open, including the appointment form.
 */
export function StagingNotice() {
  if (!serverEnv.isStaging) return null;
  return (
    <aside className={styles.notice} aria-label="Staging site notice">
      <p>
        <strong>Staging site for testing.</strong> Please use test details and no real health information. Requests
        here are tests, not appointments; emails go to the address you enter.
      </p>
    </aside>
  );
}
