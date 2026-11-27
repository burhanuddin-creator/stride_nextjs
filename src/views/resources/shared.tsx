import type { ReactNode } from 'react';
import Link from 'next/link';
import { PATIENT_RESOURCES_HREF, resourceHref, type PatientFaq } from '../../data/resources';
import { CONTACT_HREF, CONTACT_QUESTION_HREF } from '../../utils/links';
import { CenteredCta } from '../../components/blocks/Blocks';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import styles from './Resources.module.css';

export const RESOURCE_CONTACT_ID = 'resource-contact';

/** Text-only teal hero shared by the resource pages and articles (client package `resourceHero`). */
export function ResourceHero({ title, tagline, text }: { title: string; tagline?: string; text: string }) {
  return (
    <TealHero
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Patient Resources', to: PATIENT_RESOURCES_HREF }, { label: title }]}
      title={title}
      tagline={tagline}
      text={text}
      actions={
        <>
          <ButtonLink to={PATIENT_RESOURCES_HREF} variant="ghost" arrow={false}>
            All Patient Resources
          </ButtonLink>
          <ButtonLink to={`#${RESOURCE_CONTACT_ID}`} variant="clay" arrow={false}>
            Ask a Question
          </ButtonLink>
        </>
      }
    />
  );
}

/** Closing band on every Patient Resources page (client package `resourceContact`). */
export function ResourceContact({ title, text }: { title: string; text: ReactNode }) {
  return (
    <CenteredCta
      id={RESOURCE_CONTACT_ID}
      title={title}
      text={text}
      actions={
        <>
          <ButtonLink to={CONTACT_HREF}>Contact Stride</ButtonLink>
          <ButtonLink to={CONTACT_QUESTION_HREF} variant="outline" arrow={false}>
            Contact Stride
          </ButtonLink>
        </>
      }
    />
  );
}

/** Clay text link with a trailing arrow ("View All Patient FAQs →"). */
export function ArrowLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link href={to} className={[styles.arrowLink, className].filter(Boolean).join(' ')}>
      {children} <span aria-hidden="true">→</span>
    </Link>
  );
}

/** FAQ answer: its paragraphs plus the optional related-page link. */
export function FaqAnswer({ faq }: { faq: PatientFaq }) {
  return (
    <>
      {faq.answer.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {faq.link && <ArrowLink to={resourceHref(faq.link.slug)}>{faq.link.label}</ArrowLink>}
    </>
  );
}
