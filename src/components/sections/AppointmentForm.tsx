'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { appointmentService, type AppointmentService } from '../../services/appointments';
import {
  SELECTABLE_CARE_TYPES,
  CARE_TYPE_LABELS,
  NOTES_MAX_LENGTH,
  type AppointmentField,
  type AppointmentFormValues,
  type CareType,
  type FieldErrors,
} from '../../types/appointment';
import { emptyFormValues, normalizeEmail, toPayload, validateAppointmentForm } from '../../utils/appointmentForm';
import { newIdempotencyKey } from '../../utils/idempotency';
import { SERVICES, type ServiceSlug } from '../../data/services';
import { LegalLink } from '../ui/LegalDialog';
import { EmailVerificationField } from './EmailVerificationField';
import styles from './AppointmentForm.module.css';

type Status =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'error'; message: string }
  | { state: 'success'; mode: 'mock' | 'http'; reference?: string };

const FIELD_ORDER: AppointmentField[] = ['firstName', 'lastName', 'careType', 'serviceSlug', 'contactValue', 'phone', 'notes', 'insuranceHelp'];

interface Props {
  initialCare?: CareType;
  /** Service preselected from ?service= (the visitor can change or clear it). */
  initialService?: ServiceSlug;
  /** Non-sensitive context shown to the visitor (e.g. "Back & Neck"); never submitted. */
  topicLabel?: string;
  service?: AppointmentService;
}

export function AppointmentForm({ initialCare, initialService, topicLabel, service = appointmentService }: Props) {
  const uid = useId();
  const fieldId = (name: AppointmentField) => `${uid}-${name}`;
  const errorId = (name: AppointmentField) => `${uid}-${name}-error`;

  const [values, setValues] = useState<AppointmentFormValues>(() => emptyFormValues(initialCare ?? '', initialService ?? ''));
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const errors: FieldErrors = { ...serverErrors, ...clientErrors };
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [summaryVisible, setSummaryVisible] = useState(false);
  const submittingRef = useRef(false);
  // In memory only: the key for the current payload, reused when the same payload is retried.
  const attemptRef = useRef<{ key: string; payload: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  // In memory only: the address confirmed with a one-time code and the token proving it.
  const [verification, setVerification] = useState<{ email: string; token: string } | null>(null);
  const emailVerified = !!verification && verification.email === normalizeEmail(values.contactValue);
  // Server policy (GET /appointment-config); null while loading. The server enforces it regardless of the UI.
  const [verificationRequired, setVerificationRequired] = useState<boolean | null>(null);
  const policyRef = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    let active = true;
    const pending = service.getPolicy().then(
      (policy) => policy.emailVerificationRequired,
      () => true,
    );
    policyRef.current = pending;
    void pending.then((required) => {
      if (active) setVerificationRequired(required);
    });
    return () => {
      active = false;
    };
  }, [service]);

  // A new ?care= value (e.g. following another CTA while on this page) updates only the care selection.
  const [lastInitialCare, setLastInitialCare] = useState(initialCare);
  if (initialCare !== lastInitialCare) {
    setLastInitialCare(initialCare);
    if (initialCare) setValues((v) => ({ ...v, careType: initialCare }));
  }
  const [lastInitialService, setLastInitialService] = useState(initialService);
  if (initialService !== lastInitialService) {
    setLastInitialService(initialService);
    if (initialService) setValues((v) => ({ ...v, serviceSlug: initialService }));
  }

  const isMock = service.mode === 'mock';
  const submitting = status.state === 'submitting';

  const update = <K extends AppointmentField>(name: K, value: AppointmentFormValues[K]) => {
    const next = { ...values, [name]: value };
    setValues(next);
    // Any change to the address clears its verification; the new (or restored) address must be verified again.
    const stillVerified = !!verification && verification.email === normalizeEmail(next.contactValue);
    if (name === 'contactValue' && verification && !stillVerified) setVerification(null);
    // A server-side (422) message no longer applies once the visitor edits that field.
    if (serverErrors[name]) {
      setServerErrors(({ [name]: _removed, ...rest }) => rest);
    }
    // After the first submit attempt, keep client errors in sync as the visitor corrects them.
    if (attempted) setClientErrors(validateAppointmentForm(next, stillVerified, verificationRequired !== false));
  };

  useEffect(() => {
    if (status.state === 'success') confirmationRef.current?.focus();
    if (status.state === 'error') alertRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (summaryVisible) summaryRef.current?.focus();
  }, [summaryVisible]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    // If the policy is still loading, wait for it (a failed read means "required").
    let required = verificationRequired;
    if (required === null) {
      submittingRef.current = true;
      try {
        required = await (policyRef.current ?? Promise.resolve(true));
      } finally {
        submittingRef.current = false;
      }
    }
    setAttempted(true);

    const found = validateAppointmentForm(values, emailVerified, required);
    setClientErrors(found);
    setServerErrors({});
    if (Object.keys(found).length > 0) {
      setStatus({ state: 'idle' });
      setSummaryVisible(false);
      // Re-trigger focus even if the summary was already showing.
      requestAnimationFrame(() => setSummaryVisible(true));
      return;
    }

    setSummaryVisible(false);
    submittingRef.current = true;
    setStatus({ state: 'submitting' });
    try {
      // The token is sent only when the policy requires verification.
      const payload = toPayload(values, required ? verification!.token : null);
      const serialized = JSON.stringify(payload);
      if (attemptRef.current?.payload !== serialized) {
        attemptRef.current = { key: newIdempotencyKey(), payload: serialized };
      }

      const result = await service.submit(payload, { idempotencyKey: attemptRef.current.key });
      if (result.ok) {
        attemptRef.current = null;
        setValues(emptyFormValues());
        setVerification(null);
        setClientErrors({});
        setAttempted(false);
        setStatus({ state: 'success', mode: result.mode, reference: result.reference });
      } else {
        if (result.kind === 'conflict') attemptRef.current = null;
        // Input is preserved for every recoverable failure. A rejected token (expired) means verifying again.
        if (result.fieldErrors?.contactValue) setVerification(null);
        setServerErrors(result.fieldErrors ?? {});
        setStatus({ state: 'error', message: result.message });
      }
    } catch {
      setStatus({
        state: 'error',
        message: 'Something went wrong and your request was not sent. Your information is still in the form — please try again.',
      });
    } finally {
      submittingRef.current = false;
    }
  };

  const startOver = () => {
    setValues(emptyFormValues(initialCare ?? '', initialService ?? ''));
    setVerification(null);
    setStatus({ state: 'idle' });
    requestAnimationFrame(() => document.getElementById(fieldId('firstName'))?.focus());
  };

  if (status.state === 'success') {
    const demo = status.mode === 'mock';
    return (
      <div className={`${styles.confirmation} ${demo ? styles.confirmationDemo : ''}`} role="status">
        <CircleCheck className={styles.confirmIcon} size={64} strokeWidth={1.5} aria-hidden="true" />
        <div>
          {demo && <p className={styles.demoTag}>Local demo — nothing was sent</p>}
          <h3 ref={confirmationRef} tabIndex={-1} className={styles.confirmTitle}>
            {demo ? 'Demo complete. This request was not sent.' : 'Thank you. Your request has been received.'}
          </h3>
          {demo ? (
            <p className={styles.confirmText}>
              This review build uses a demonstration form, so nothing was sent to Stride and nothing was stored. On the
              live site, our team will contact you to discuss the next steps. A request is not a confirmed appointment.
            </p>
          ) : (
            <>
              <p className={styles.confirmText}>
                We’ll contact you to discuss the next steps.
                <br />
                Your appointment is not yet confirmed.
              </p>
              {status.reference && (
                <p className={styles.reference}>
                  Your request reference: <strong>{status.reference}</strong>
                </p>
              )}
            </>
          )}
          <button type="button" className={styles.secondaryButton} onClick={startOver}>
            {demo ? 'Try the demo again' : 'Send another request'}
          </button>
        </div>
      </div>
    );
  }

  const errorEntries = FIELD_ORDER.filter((name) => errors[name]);
  const describedBy = (name: AppointmentField, ...extra: string[]) =>
    [errors[name] ? errorId(name) : '', ...extra].filter(Boolean).join(' ') || undefined;

  const notesRemaining = NOTES_MAX_LENGTH - values.notes.length;

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit} aria-describedby={isMock ? `${uid}-demo` : undefined}>
      {isMock && (
        <p id={`${uid}-demo`} className={styles.demoBanner}>
          <Info size={18} aria-hidden="true" />
          <span>
            <strong>Local demo:</strong> this form is not connected yet. Nothing you enter will be sent or stored.
          </span>
        </p>
      )}

      {topicLabel && (
        <p className={styles.topicNote}>
          You’re asking about <strong>{topicLabel}</strong>.
        </p>
      )}

      <p className={styles.required}>
        Fields marked <span aria-hidden="true">*</span>
        <span className="visually-hidden">with an asterisk</span> are required.
      </p>

      {summaryVisible && errorEntries.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className={styles.errorSummary} role="alert" aria-labelledby={`${uid}-summary-title`}>
          <h3 id={`${uid}-summary-title`} className={styles.errorSummaryTitle}>
            Please fix {errorEntries.length === 1 ? 'this problem' : `these ${errorEntries.length} problems`}:
          </h3>
          <ul>
            {errorEntries.map((name) => (
              <li key={name}>
                <a
                  href={`#${fieldId(name)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    const target = document.getElementById(fieldId(name));
                    target?.focus();
                    target?.scrollIntoView({ block: 'center' });
                  }}
                >
                  {errors[name]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status.state === 'error' && (
        <div ref={alertRef} tabIndex={-1} className={styles.alert} role="alert">
          <TriangleAlert size={22} aria-hidden="true" />
          <p>
            <strong>Your request was not sent.</strong> {status.message}
          </p>
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={fieldId('firstName')} className={styles.label}>
            First name <span className={styles.star} aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId('firstName')}
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            maxLength={100}
            className={styles.input}
            value={values.firstName}
            aria-invalid={!!errors.firstName}
            aria-describedby={describedBy('firstName')}
            onChange={(e) => update('firstName', e.target.value)}
          />
          {errors.firstName && (
            <p id={errorId('firstName')} className={styles.error}>
              {errors.firstName}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor={fieldId('lastName')} className={styles.label}>
            Last name <span className={styles.star} aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId('lastName')}
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            maxLength={100}
            className={styles.input}
            value={values.lastName}
            aria-invalid={!!errors.lastName}
            aria-describedby={describedBy('lastName')}
            onChange={(e) => update('lastName', e.target.value)}
          />
          {errors.lastName && (
            <p id={errorId('lastName')} className={styles.error}>
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('careType')} className={styles.label}>
          What can we help you with? <span className={styles.star} aria-hidden="true">*</span>
        </label>
        <select
          id={fieldId('careType')}
          name="careType"
          required
          className={`${styles.input} ${styles.select}`}
          value={values.careType}
          aria-invalid={!!errors.careType}
          aria-describedby={describedBy('careType')}
          onChange={(e) => update('careType', e.target.value as CareType | '')}
        >
          <option value="">Choose one</option>
          {SELECTABLE_CARE_TYPES.map((type) => (
            <option key={type} value={type}>
              {CARE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {errors.careType && (
          <p id={errorId('careType')} className={styles.error}>
            {errors.careType}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('serviceSlug')} className={styles.label}>
          Specific service (optional)
        </label>
        <select
          id={fieldId('serviceSlug')}
          name="serviceSlug"
          className={`${styles.input} ${styles.select}`}
          value={values.serviceSlug}
          aria-invalid={!!errors.serviceSlug}
          aria-describedby={describedBy('serviceSlug')}
          onChange={(e) => update('serviceSlug', e.target.value as ServiceSlug | '')}
        >
          <option value="">No specific service</option>
          {SERVICES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.fullName ? `${s.name} (${s.fullName})` : s.name}
            </option>
          ))}
        </select>
        {errors.serviceSlug && (
          <p id={errorId('serviceSlug')} className={styles.error}>
            {errors.serviceSlug}
          </p>
        )}
      </div>

      <EmailVerificationField
        id={fieldId('contactValue')}
        errorId={errorId('contactValue')}
        value={values.contactValue}
        onChange={(value) => update('contactValue', value)}
        error={errors.contactValue}
        verified={emailVerified}
        verificationRequired={verificationRequired === true}
        onVerified={(email, token) => {
          setVerification({ email, token });
          // The "not verified" message no longer applies.
          setClientErrors(({ contactValue: _removed, ...rest }) => rest);
          setServerErrors(({ contactValue: _removed, ...rest }) => rest);
        }}
        service={service}
      />

      <div className={styles.field}>
        <label htmlFor={fieldId('phone')} className={styles.label}>
          Phone <span className={styles.star} aria-hidden="true">*</span>
        </label>
        <input
          id={fieldId('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={32}
          className={styles.input}
          value={values.phone}
          aria-invalid={!!errors.phone}
          aria-describedby={describedBy('phone', `${uid}-phone-hint`)}
          onChange={(e) => update('phone', e.target.value)}
        />
        <p id={`${uid}-phone-hint`} className={styles.hint}>
          So our team can call you about your request, for example (630) 555-0123.
        </p>
        {errors.phone && (
          <p id={errorId('phone')} className={styles.error}>
            {errors.phone}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('notes')} className={styles.label}>
          Brief notes (optional)
        </label>
        <textarea
          id={fieldId('notes')}
          name="notes"
          rows={5}
          maxLength={NOTES_MAX_LENGTH}
          className={`${styles.input} ${styles.textarea}`}
          placeholder="Share a few details about how we can help."
          value={values.notes}
          aria-invalid={!!errors.notes}
          aria-describedby={describedBy('notes', `${uid}-notes-count`, `${uid}-notes-warning`)}
          onChange={(e) => update('notes', e.target.value)}
        />
        <div className={styles.notesMeta}>
          <p id={`${uid}-notes-warning`} className={styles.hint}>
            Please do not include medical records, diagnoses, or insurance member numbers.
          </p>
          <p id={`${uid}-notes-count`} className={styles.count}>
            {values.notes.length} / {NOTES_MAX_LENGTH}
             <span className="visually-hidden">characters used</span>
          </p>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {notesRemaining <= 50 ? `${notesRemaining} characters remaining` : ''}
        </p>
        {errors.notes && (
          <p id={errorId('notes')} className={styles.error}>
            {errors.notes}
          </p>
        )}
      </div>

      <div className={styles.checkboxRow}>
        <input
          id={fieldId('insuranceHelp')}
          type="checkbox"
          name="insuranceHelp"
          checked={values.insuranceHelp}
          onChange={(e) => update('insuranceHelp', e.target.checked)}
        />
        <label htmlFor={fieldId('insuranceHelp')}>I would like help understanding insurance options.</label>
      </div>

      <p className={styles.privacy}>
        See our <LegalLink topic="privacy" className={styles.inlineLink}>Privacy Policy</LegalLink> for how we handle your
        information. Please share only general information here.
      </p>

      <button type="submit" className={styles.submit} disabled={submitting} aria-disabled={submitting}>
        <span>{submitting ? 'Sending…' : isMock ? 'Send My Request (demo)' : 'Send My Request'}</span>
        {!submitting && <ArrowRight size={20} aria-hidden="true" />}
      </button>
      <p className="visually-hidden" role="status">
        {submitting ? 'Sending your request…' : ''}
      </p>

      <p className={styles.disclaimer}>
        Submitting this form does not confirm an appointment.
        <br />
        Our team will contact you to discuss your request.
      </p>
    </form>
  );
}
