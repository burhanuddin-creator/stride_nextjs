'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { patientProfileService, type PatientProfileService } from '../../services/patientProfile';
import {
  MONTHS,
  SEX_OPTIONS,
  type PatientProfileErrors,
  type PatientProfileField,
  type PatientProfileValues,
} from '../../types/patientProfile';
import { emptyPatientProfile, toPatientProfilePayload, validatePatientProfile } from '../../utils/patientProfileForm';
import { phoneHref, site } from '../../config/site';
import { LegalLink } from '../ui/LegalDialog';
import styles from './AppointmentForm.module.css';
import own from './PatientProfileForm.module.css';

type Status =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'error'; message: string }
  | { state: 'done'; mode: 'mock' | 'http'; outcome: 'complete' | 'follow_up' };

const FIELD_ORDER: PatientProfileField[] = ['firstName', 'lastName', 'dateOfBirth', 'sex', 'mobile', 'email', 'consent'];

interface Props {
  service?: PatientProfileService;
}

/**
 * Separate patient-profile form (SPRY phase one). It registers patient details only — it does not book an appointment
 * and shows no dates, times or providers. One POST per click, never retried automatically. Form data stays in memory.
 */
export function PatientProfileForm({ service = patientProfileService }: Props) {
  const uid = useId();
  const fieldId = (name: PatientProfileField) => (name === 'dateOfBirth' ? `${uid}-dobMonth` : `${uid}-${name}`);
  const errorId = (name: PatientProfileField) => `${uid}-${name}-error`;

  const [values, setValues] = useState<PatientProfileValues>(emptyPatientProfile);
  const [clientErrors, setClientErrors] = useState<PatientProfileErrors>({});
  const [serverErrors, setServerErrors] = useState<PatientProfileErrors>({});
  const errors: PatientProfileErrors = { ...serverErrors, ...clientErrors };
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const submittingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    service.isAvailable().then(
      (result) => active && setAvailable(result),
      () => active && setAvailable(true),
    );
    return () => {
      active = false;
    };
  }, [service]);

  useEffect(() => {
    if (status.state === 'done') doneRef.current?.focus();
    if (status.state === 'error') alertRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (summaryVisible) summaryRef.current?.focus();
  }, [summaryVisible]);

  const isMock = service.mode === 'mock';
  const submitting = status.state === 'submitting';

  const update = <K extends keyof PatientProfileValues>(name: K, value: PatientProfileValues[K]) => {
    const next = { ...values, [name]: value };
    setValues(next);
    const field: PatientProfileField = name === 'dobMonth' || name === 'dobDay' || name === 'dobYear' ? 'dateOfBirth' : name;
    if (serverErrors[field]) setServerErrors(({ [field]: _removed, ...rest }) => rest);
    if (attempted) setClientErrors(validatePatientProfile(next));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setAttempted(true);

    const found = validatePatientProfile(values);
    setClientErrors(found);
    setServerErrors({});
    if (Object.keys(found).length > 0) {
      setStatus({ state: 'idle' });
      setSummaryVisible(false);
      requestAnimationFrame(() => setSummaryVisible(true));
      return;
    }

    setSummaryVisible(false);
    submittingRef.current = true;
    setStatus({ state: 'submitting' });
    try {
      const result = await service.submit(toPatientProfilePayload(values));
      if (result.ok) {
        setValues(emptyPatientProfile());
        setAttempted(false);
        setStatus({ state: 'done', mode: result.mode, outcome: result.outcome });
      } else {
        if (result.kind === 'unavailable') setAvailable(false);
        setServerErrors(result.fieldErrors ?? {});
        setStatus({ state: 'error', message: result.message });
      }
    } catch {
      setStatus({ state: 'error', message: 'Something went wrong and your details were not sent. Your information is still in the form — please try again.' });
    } finally {
      submittingRef.current = false;
    }
  };

  if (status.state === 'done') {
    const demo = status.mode === 'mock';
    const followUp = status.outcome === 'follow_up';
    return (
      <div className={`${styles.confirmation} ${demo ? styles.confirmationDemo : ''}`} role="status">
        <CircleCheck className={styles.confirmIcon} size={64} strokeWidth={1.5} aria-hidden="true" />
        <div>
          {demo && <p className={styles.demoTag}>Local demo — nothing was sent</p>}
          <h3 ref={doneRef} tabIndex={-1} className={styles.confirmTitle}>
            {demo
              ? 'Demo complete. Nothing was sent.'
              : followUp
                ? 'Thank you. Your details have been saved.'
                : 'Thank you. Your patient profile details have been received.'}
          </h3>
          <p className={styles.confirmText}>
            {demo
              ? 'This review build uses a demonstration form, so nothing was sent to Stride or SPRY and nothing was stored.'
              : followUp
                ? 'We could not finish setting up your profile online. Our team will follow up with you, so there is no need to submit again.'
                : 'Our team will contact you about scheduling.'}
            <br />
            <strong>No appointment has been booked yet.</strong>
          </p>
          <p className={styles.confirmText}>
            Questions? Call <a href={phoneHref}>{site.phone}</a>.
          </p>
        </div>
      </div>
    );
  }

  if (available === false) {
    return (
      <div className={styles.alert} role="status">
        <Info size={22} aria-hidden="true" />
        <p>
          <strong>Online patient registration is not available right now.</strong> Please call the clinic at{' '}
          <a href={phoneHref}>{site.phone}</a> to get started, or use the request form on the Contact page.
        </p>
      </div>
    );
  }

  const errorEntries = FIELD_ORDER.filter((name) => errors[name]);
  const describedBy = (name: PatientProfileField, ...extra: string[]) =>
    [errors[name] ? errorId(name) : '', ...extra].filter(Boolean).join(' ') || undefined;
  const fieldError = (name: PatientProfileField) =>
    errors[name] && (
      <p id={errorId(name)} className={styles.error}>
        {errors[name]}
      </p>
    );
  const textInput = (name: 'firstName' | 'lastName', label: string, autoComplete: string) => (
    <div className={styles.field}>
      <label htmlFor={fieldId(name)} className={styles.label}>
        {label} <span className={styles.star} aria-hidden="true">*</span>
      </label>
      <input
        id={fieldId(name)}
        name={name}
        type="text"
        autoComplete={autoComplete}
        required
        maxLength={100}
        className={styles.input}
        value={values[name]}
        aria-invalid={!!errors[name]}
        aria-describedby={describedBy(name)}
        onChange={(e) => update(name, e.target.value)}
      />
      {fieldError(name)}
    </div>
  );

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
            <strong>Your profile was not created.</strong> {status.message}
          </p>
        </div>
      )}

      <div className={styles.row}>
        {textInput('firstName', 'First name', 'given-name')}
        {textInput('lastName', 'Last name', 'family-name')}
      </div>

      <fieldset className={own.dob} aria-describedby={describedBy('dateOfBirth', `${uid}-dob-hint`)}>
        <legend className={styles.label}>
          Date of birth <span className={styles.star} aria-hidden="true">*</span>
        </legend>
        <p id={`${uid}-dob-hint`} className={styles.hint}>
          For example, March 15 1985.
        </p>
        <div className={own.dobParts}>
          <div className={styles.field}>
            <label htmlFor={`${uid}-dobMonth`} className={own.partLabel}>
              Month
            </label>
            <select
              id={`${uid}-dobMonth`}
              name="dobMonth"
              autoComplete="bday-month"
              className={`${styles.input} ${styles.select}`}
              value={values.dobMonth}
              aria-invalid={!!errors.dateOfBirth}
              onChange={(e) => update('dobMonth', e.target.value)}
            >
              <option value="">Month</option>
              {MONTHS.map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${uid}-dobDay`} className={own.partLabel}>
              Day
            </label>
            <input
              id={`${uid}-dobDay`}
              name="dobDay"
              type="text"
              inputMode="numeric"
              autoComplete="bday-day"
              maxLength={2}
              className={styles.input}
              value={values.dobDay}
              aria-invalid={!!errors.dateOfBirth}
              onChange={(e) => update('dobDay', e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${uid}-dobYear`} className={own.partLabel}>
              Year
            </label>
            <input
              id={`${uid}-dobYear`}
              name="dobYear"
              type="text"
              inputMode="numeric"
              autoComplete="bday-year"
              maxLength={4}
              className={styles.input}
              value={values.dobYear}
              aria-invalid={!!errors.dateOfBirth}
              onChange={(e) => update('dobYear', e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
        {fieldError('dateOfBirth')}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={fieldId('sex')} className={styles.label}>
          Sex <span className={styles.star} aria-hidden="true">*</span>
        </label>
        <select
          id={fieldId('sex')}
          name="sex"
          required
          className={`${styles.input} ${styles.select}`}
          value={values.sex}
          aria-invalid={!!errors.sex}
          aria-describedby={describedBy('sex', `${uid}-sex-hint`)}
          onChange={(e) => update('sex', e.target.value as PatientProfileValues['sex'])}
        >
          <option value="">Choose one</option>
          {SEX_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p id={`${uid}-sex-hint`} className={styles.hint}>
          As used for your medical record.
        </p>
        {fieldError('sex')}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('mobile')} className={styles.label}>
          US mobile number <span className={styles.star} aria-hidden="true">*</span>
        </label>
        <input
          id={fieldId('mobile')}
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          maxLength={32}
          className={styles.input}
          value={values.mobile}
          aria-invalid={!!errors.mobile}
          aria-describedby={describedBy('mobile', `${uid}-mobile-hint`)}
          onChange={(e) => update('mobile', e.target.value)}
        />
        <p id={`${uid}-mobile-hint`} className={styles.hint}>
          For example (630) 555-0123.
        </p>
        {fieldError('mobile')}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('email')} className={styles.label}>
          Email address <span className={styles.star} aria-hidden="true">*</span>
        </label>
        <input
          id={fieldId('email')}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          className={styles.input}
          value={values.email}
          aria-invalid={!!errors.email}
          aria-describedby={describedBy('email')}
          onChange={(e) => update('email', e.target.value)}
        />
        {fieldError('email')}
      </div>

      <div className={own.consent}>
        <div className={styles.checkboxRow}>
          <input
            id={fieldId('consent')}
            type="checkbox"
            name="consent"
            checked={values.consent}
            aria-invalid={!!errors.consent}
            aria-describedby={describedBy('consent')}
            onChange={(e) => update('consent', e.target.checked)}
          />
          <label htmlFor={fieldId('consent')}>
            I agree that Stride Physical Therapy &amp; Wellness may send the details above to SPRY, the practice-management system
            the clinic uses, to create my patient profile. <span className={styles.star} aria-hidden="true">*</span>
          </label>
        </div>
        {fieldError('consent')}
      </div>

      <p className={styles.privacy}>
        See our <LegalLink topic="privacy" className={styles.inlineLink}>Privacy Policy</LegalLink> for how we handle your
        information.
      </p>

      <button type="submit" className={styles.submit} disabled={submitting} aria-disabled={submitting}>
        <span>{submitting ? 'Creating profile…' : isMock ? 'Create Patient Profile (demo)' : 'Create Patient Profile'}</span>
        {!submitting && <ArrowRight size={20} aria-hidden="true" />}
      </button>
      <p className="visually-hidden" role="status">
        {submitting ? 'Creating your patient profile…' : ''}
      </p>

      <p className={styles.disclaimer}>This step creates your patient profile only. It does not book an appointment.</p>
    </form>
  );
}
