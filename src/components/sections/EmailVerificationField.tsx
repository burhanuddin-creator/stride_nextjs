'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CircleCheck } from 'lucide-react';
import type { AppointmentService } from '../../services/appointments';
import { DEMO_VERIFICATION_CODE } from '../../services/appointments/mockAdapter';
import { emailError, normalizeEmail } from '../../utils/appointmentForm';
import styles from './AppointmentForm.module.css';

interface Challenge {
  id: string;
  /** Normalised address the code was sent to. */
  email: string;
  expiresInMinutes: number;
  resendAt: number;
}

interface Props {
  id: string;
  errorId: string;
  value: string;
  onChange: (value: string) => void;
  /** Field error from the form (format / not verified / server). */
  error?: string;
  /** True when `value` is the address that was verified. */
  verified: boolean;
  /**
   * Server policy. When false (or still loading), this is a plain email field: no hint, no "Send code" or "Verify"
   * controls. The address format is still validated by the form.
   */
  verificationRequired: boolean;
  onVerified: (email: string, token: string) => void;
  service: AppointmentService;
}

/**
 * Email address with one-time-code verification: "Send code" → enter the 6-digit code → the field turns green
 * with "Email verified". Changing the address afterwards requires verifying again (handled by the parent, which
 * compares the current value with the verified address).
 */
export function EmailVerificationField({ id, errorId, value, onChange, error, verified: verifiedProp, verificationRequired, onVerified, service }: Props) {
  const verified = verificationRequired && verifiedProp;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  // Clock for the resend countdown. Only read once a challenge exists (set together with it), so it starts at 0 and
  // the server render never reads the current time.
  const [now, setNow] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const verifiedRef = useRef<HTMLParagraphElement>(null);
  const focusAfter = useRef<'code' | 'verified' | null>(null);

  // A code only applies to the address it was sent to.
  const activeChallenge = verificationRequired && challenge && challenge.email === normalizeEmail(value) && !verified ? challenge : null;
  const showHint = verificationRequired && !verified;
  const resendIn = activeChallenge ? Math.max(0, Math.ceil((activeChallenge.resendAt - now) / 1000)) : 0;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (focusAfter.current === 'code' && activeChallenge) codeRef.current?.focus();
    if (focusAfter.current === 'verified' && verified) verifiedRef.current?.focus();
    focusAfter.current = null;
  });

  const sendCode = async () => {
    const formatError = emailError(value);
    if (formatError) {
      setSendError(formatError);
      return;
    }
    setSending(true);
    setSendError(null);
    setCodeError(null);
    const email = normalizeEmail(value);
    const result = await service.requestEmailCode(value.trim());
    setSending(false);
    if (result.ok) {
      setChallenge({ id: result.id, email, expiresInMinutes: Math.round(result.expiresInSeconds / 60), resendAt: Date.now() + result.resendInSeconds * 1000 });
      setNow(Date.now());
      setCode('');
      focusAfter.current = 'code';
    } else {
      setSendError(result.message);
      if (result.retryAfterSeconds && challenge?.email === email) {
        setChallenge({ ...challenge, resendAt: Date.now() + result.retryAfterSeconds * 1000 });
        setNow(Date.now());
      }
    }
  };

  const checkCode = async () => {
    if (!activeChallenge || checking) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError('Enter the 6-digit code from the email.');
      codeRef.current?.focus();
      return;
    }
    setChecking(true);
    setCodeError(null);
    const result = await service.confirmEmailCode(activeChallenge.id, code.trim());
    setChecking(false);
    if (result.ok) {
      setChallenge(null);
      setCode('');
      focusAfter.current = 'verified';
      onVerified(activeChallenge.email, result.token);
    } else {
      setCodeError(result.message);
      codeRef.current?.focus();
    }
  };

  const onCodeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // verify the code instead of submitting the whole form
      void checkCode();
    }
  };

  const describedBy = [error ? errorId : '', verified ? `${id}-verified` : showHint ? `${id}-hint` : '', sendError ? `${id}-send-error` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Email address <span className={styles.star} aria-hidden="true">*</span>
      </label>
      {showHint && (
        <p id={`${id}-hint`} className={styles.hint}>
          We’ll email you a 6-digit code to confirm this address.
        </p>
      )}
      <div className={styles.emailRow}>
        <div className={[styles.emailInputWrap, verified ? styles.verifiedWrap : ''].join(' ')}>
          <input
            id={id}
            name="contactValue"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            className={[styles.input, verified ? styles.inputVerified : ''].join(' ')}
            value={value}
            aria-invalid={!!error && !verified}
            aria-describedby={describedBy || undefined}
            onChange={(e) => {
              setSendError(null);
              onChange(e.target.value);
            }}
          />
          {verified && <CircleCheck className={styles.verifiedIcon} size={20} strokeWidth={2.25} aria-hidden="true" />}
        </div>
        {verificationRequired && !verified && !activeChallenge && (
          <button type="button" className={styles.inlineButton} onClick={sendCode} disabled={sending} aria-disabled={sending}>
            {sending ? 'Sending…' : 'Send code'}
          </button>
        )}
      </div>

      {verified && (
        <p id={`${id}-verified`} ref={verifiedRef} tabIndex={-1} className={styles.verifiedNote} role="status">
          <CircleCheck size={16} strokeWidth={2.25} aria-hidden="true" />
          Email verified
        </p>
      )}
      {sendError && (
        <p id={`${id}-send-error`} className={styles.error} role="alert">
          {sendError}
        </p>
      )}
      {error && !verified && !sendError && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}

      {activeChallenge && (
        <div className={styles.codePanel}>
          <p className={styles.codeIntro} role="status">
            We sent a 6-digit code to <strong>{activeChallenge.email}</strong>. It expires in {activeChallenge.expiresInMinutes} minutes.
            {service.mode === 'mock' && <> In this demo, use {DEMO_VERIFICATION_CODE}.</>}
          </p>
          <label htmlFor={`${id}-code`} className={styles.label}>
            Verification code
          </label>
          <div className={styles.emailRow}>
            <input
              ref={codeRef}
              id={`${id}-code`}
              name="verificationCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              className={`${styles.input} ${styles.codeInput}`}
              value={code}
              aria-invalid={!!codeError}
              aria-describedby={codeError ? `${id}-code-error` : undefined}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setCodeError(null);
              }}
              onKeyDown={onCodeKeyDown}
            />
            <button type="button" className={styles.inlineButton} onClick={checkCode} disabled={checking} aria-disabled={checking}>
              {checking ? 'Checking…' : 'Verify'}
            </button>
          </div>
          {codeError && (
            <p id={`${id}-code-error`} className={styles.error} role="alert">
              {codeError}
            </p>
          )}
          <button type="button" className={styles.resendButton} onClick={sendCode} disabled={sending || resendIn > 0}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      )}
    </div>
  );
}
