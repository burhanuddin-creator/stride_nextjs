import Link from 'next/link';
import { primaryNav } from '../data/navigation';
import { contactHref } from '../utils/links';
import { ButtonLink } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Curves } from '../components/ui/Curves';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {

  return (
    <section className={styles.section}>
      <Curves variant="hero-sand" />
      <div className={`container ${styles.inner}`}>
        <Eyebrow>Page not found</Eyebrow>
        <h1 className={styles.title}>We couldn’t find that page.</h1>
        <p className={styles.lead}>The link may be out of date or the address may be mistyped. These pages may help:</p>
        <ul className={styles.links}>
          {[{ label: 'Home', to: '/' }, ...primaryNav].map((item) => (
            <li key={item.to}>
              <Link href={item.to}>{item.label}</Link>
            </li>
          ))}
        </ul>
        <ButtonLink to={contactHref()}>Request an Appointment</ButtonLink>
      </div>
    </section>
  );
}
