'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { env } from '../../config/env';
import { addressLine } from '../../config/site';
import { LegalDialogContext, useLegalDialog, type LegalTopic } from './legalDialogContext';
import styles from './LegalDialog.module.css';

/**
 * DRAFT information panels. Final privacy and accessibility statements require clinic/legal
 * approval (docs/CONTENT_PENDING.md). This copy only describes how the website currently
 * behaves and makes no compliance claims.
 */
function PrivacyDraft() {
  return (
    <>
      <p>
        The clinic’s final privacy policy has not yet been approved and will replace this draft before launch.
      </p>
      <h3>How this website currently handles information</h3>
      <ul>
        {env.useMockApi ? (
          <li>
            In this review build, the appointment request form is a demonstration. Information typed into it is not sent,
            stored or shared anywhere.
          </li>
        ) : (
          <li>
            Information you submit through the appointment request form is sent to the clinic so the team can contact you
            about your request. An email confirming that your request was received is sent to the address you enter.
          </li>
        )}
        <li>The website does not save your form entries in your browser, and it does not use analytics or advertising trackers.</li>
        <li>
          The Contact page shows an embedded Google Map, which loads content from Google. “Get Directions” links open
          Google Maps in a new tab.
        </li>
      </ul>
      <h3>Please share only general information</h3>
      <p>Please do not include medical records, diagnoses, or insurance member numbers in online requests.</p>
      <p>
        For questions about privacy, please contact the clinic or visit us at {addressLine}.
      </p>
    </>
  );
}

function AccessibilityDraft() {
  return (
    <>
      <p>
        The clinic’s formal accessibility statement has not yet been approved and will replace this draft before launch.
      </p>
      <h3>Our approach</h3>
      <p>
        This website is being built with the goal of meeting the Web Content Accessibility Guidelines (WCAG) 2.1 at
        level AA, including keyboard access, visible focus, text alternatives and support for reduced motion. Testing is
        ongoing.
      </p>
      <h3>Need help or found a problem?</h3>
      <p>
        If any part of this website is difficult to use, please let us know through the{' '}
        <Link href="/contact#request-form">contact form</Link> or visit us at {addressLine}, and we will help you.
      </p>
    </>
  );
}

const TITLES: Record<LegalTopic, string> = {
  privacy: 'Privacy',
  accessibility: 'Accessibility',
};

export function LegalDialogProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [topic, setTopic] = useState<LegalTopic | null>(null);

  const open = useCallback((next: LegalTopic) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setTopic(next);
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !topic) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }, [topic]);

  const handleClose = () => {
    setTopic(null);
    returnFocusRef.current?.focus();
  };

  return (
    <LegalDialogContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="legal-dialog-title"
        onClose={handleClose}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        {topic && (
          <div className={styles.body}>
            <div className={styles.header}>
              <p className={styles.badge}>Draft — pending approval</p>
              <button type="button" className={styles.close} onClick={close} aria-label="Close">
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <h2 id="legal-dialog-title">{TITLES[topic]}</h2>
            <div className={styles.content}>{topic === 'privacy' ? <PrivacyDraft /> : <AccessibilityDraft />}</div>
            <button type="button" className={styles.done} onClick={close}>
              Close
            </button>
          </div>
        )}
      </dialog>
    </LegalDialogContext.Provider>
  );
}

/** Text-style button that opens a draft legal panel. */
export function LegalLink({ topic, children, className }: { topic: LegalTopic; children: ReactNode; className?: string }) {
  const open = useLegalDialog();
  return (
    <button type="button" className={[styles.trigger, className].filter(Boolean).join(' ')} onClick={() => open(topic)} aria-haspopup="dialog">
      {children}
    </button>
  );
}
