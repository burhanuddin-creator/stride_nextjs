'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { schedulingService, type SchedulingService } from '../../services/scheduling';
import { MONTHS, SEX_OPTIONS } from '../../types/patientProfile';
import {
  PAYMENT_MODES,
  type AvailabilityDay,
  type SchedulingConfig,
  type SchedulingErrors,
  type SchedulingField,
  type SchedulingValues,
  type Slot,
} from '../../types/scheduling';
import {
  FIELD_ORDER,
  addDays,
  addMonths,
  emptyScheduling,
  longDate,
  monthGrid,
  monthLabel,
  monthOf,
  toBookingPayload,
  validateScheduling,
  zoneLabel,
} from '../../utils/schedulingForm';
import { newIdempotencyKey } from '../../utils/idempotency';
import { addressLine, phoneHref, site } from '../../config/site';
import { LegalLink } from '../ui/LegalDialog';
import styles from './AppointmentForm.module.css';
import profile from './PatientProfileForm.module.css';
import own from './SchedulingForm.module.css';

type Status =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'error'; message: string }
  | { state: 'booked'; mode: 'mock' | 'http'; startsAtLabel: string; durationMinutes: number }
  | { state: 'followUp'; message: string };

type MonthState = AvailabilityDay[] | 'loading' | { error: string };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  service?: SchedulingService;
}

/**
 * "Schedule an Appointment": one form with what SPRY's create-appointment call needs from the visitor — a date and time
 * (from SPRY availability, shown in clinic time) and the payment mode — plus the basic patient details used to create or
 * match the patient. Clinic, provider, category and duration are server-controlled. Answers stay in memory only. One
 * POST per click with an Idempotency-Key per payload, never retried automatically; "booked" only when the server
 * confirmed it.
 */
export function SchedulingForm({ service = schedulingService }: Props) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const errorId = (name: SchedulingField) => `${uid}-${name}-error`;

  const [config, setConfig] = useState<SchedulingConfig | null>(null);
  const [values, setValues] = useState<SchedulingValues>(emptyScheduling);
  const [errors, setErrors] = useState<SchedulingErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState('');
  const [days, setDays] = useState<Record<string, MonthState>>({});
  const [providerOpen, setProviderOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);

  const submittingRef = useRef(false);
  const attemptRef = useRef<{ key: string; payload: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  /** Loads one month of SPRY availability (the server accepts at most 28 days per request). */
  const loadMonth = useCallback(
    async (cfg: SchedulingConfig, target: string) => {
      if (!cfg.firstDate || !cfg.lastDate) return;
      const start = `${target}-01` < cfg.firstDate ? cfg.firstDate : `${target}-01`;
      const monthEnd = addDays(`${addMonths(target, 1)}-01`, -1);
      const end = monthEnd > cfg.lastDate ? cfg.lastDate : monthEnd;
      if (start > end) {
        setDays((d) => ({ ...d, [target]: [] }));
        return;
      }
      setDays((d) => ({ ...d, [target]: 'loading' }));
      const collected: AvailabilityDay[] = [];
      for (let from = start; from <= end; from = addDays(from, 28)) {
        const to = addDays(from, 27) < end ? addDays(from, 27) : end;
        const result = await service.getAvailability(from, to);
        if (!result.ok) {
          setDays((d) => ({ ...d, [target]: { error: result.message } }));
          return;
        }
        collected.push(...result.days);
      }
      setDays((d) => ({ ...d, [target]: collected }));
    },
    [service],
  );

  useEffect(() => {
    let active = true;
    service.getConfig().then(
      (result) => {
        if (!active) return;
        setConfig(result);
        if (result.available && result.firstDate) {
          const first = monthOf(result.firstDate);
          setMonth(first);
          void loadMonth(result, first);
        }
      },
      () => active && setConfig({ available: false }),
    );
    return () => {
      active = false;
    };
  }, [service, loadMonth]);

  // Date popup: focus moves into it (selected or first available date); a click outside closes it.
  useEffect(() => {
    if (!calendarOpen) return;
    const popup = popupRef.current;
    const target =
      popup?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ??
      popup?.querySelector<HTMLButtonElement>('td button:not(:disabled)') ??
      popup?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    target?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setCalendarOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [calendarOpen]);

  useEffect(() => {
    if (summaryVisible) summaryRef.current?.focus();
  }, [summaryVisible]);

  useEffect(() => {
    if (status.state === 'booked' || status.state === 'followUp') doneRef.current?.focus();
    if (status.state === 'error') alertRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const update = <K extends keyof SchedulingValues>(name: K, value: SchedulingValues[K]) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (attempted) setErrors(validateScheduling(next));
      return next;
    });
  };

  const closeCalendar = () => {
    setCalendarOpen(false);
    dateButtonRef.current?.focus();
  };

  const showMonth = (target: string) => {
    setMonth(target);
    if (config && !Array.isArray(days[target]) && days[target] !== 'loading') void loadMonth(config, target);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setAttempted(true);
    setNotice('');

    const found = validateScheduling(values);
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus({ state: 'idle' });
      setSummaryVisible(false);
      requestAnimationFrame(() => setSummaryVisible(true));
      return;
    }

    const payload = toBookingPayload(values);
    const serialized = JSON.stringify(payload);
    if (attemptRef.current?.payload !== serialized) attemptRef.current = { key: newIdempotencyKey(), payload: serialized };

    submittingRef.current = true;
    setSummaryVisible(false);
    setStatus({ state: 'submitting' });
    try {
      const result = await service.book(payload, attemptRef.current.key);
      if (result.ok && result.outcome === 'booked') {
        setValues(emptyScheduling());
        attemptRef.current = null;
        setStatus({ state: 'booked', mode: result.mode, startsAtLabel: result.startsAtLabel, durationMinutes: result.durationMinutes });
      } else if (result.ok) {
        setValues(emptyScheduling());
        attemptRef.current = null;
        setStatus({ state: 'followUp', message: result.message });
      } else if (result.kind === 'slot_unavailable') {
        // Fresh times for this month; every other answer is kept.
        setValues((v) => ({ ...v, slot: null }));
        setStatus({ state: 'idle' });
        setNotice(result.message);
        if (config) void loadMonth(config, month);
      } else if (result.kind === 'validation' && result.fieldErrors && Object.keys(result.fieldErrors).length) {
        setErrors(result.fieldErrors);
        setStatus({ state: 'idle' });
        requestAnimationFrame(() => setSummaryVisible(true));
      } else {
        setStatus({ state: 'error', message: result.message });
      }
    } catch {
      setStatus({ state: 'error', message: 'Something went wrong on this page. Please call the clinic to confirm before trying again.' });
    } finally {
      submittingRef.current = false;
    }
  };

  // ---- final states ----

  if (status.state === 'booked') {
    const demo = status.mode === 'mock';
    return (
      <div className={`${styles.confirmation} ${demo ? styles.confirmationDemo : ''}`} role="status">
        <CircleCheck className={styles.confirmIcon} size={64} strokeWidth={1.5} aria-hidden="true" />
        <div>
          {demo && <p className={styles.demoTag}>Local demo — nothing was booked</p>}
          <h3 ref={doneRef} tabIndex={-1} className={styles.confirmTitle}>
            {demo ? 'Demo complete. Nothing was booked.' : 'Your appointment is booked.'}
          </h3>
          <p className={styles.confirmText}>
            <strong>{config?.appointmentType ?? 'Initial Evaluation'}</strong>
            {status.durationMinutes ? ` (${status.durationMinutes} minutes)` : ''}
            {config?.providerName ? ` with ${config.providerName}` : ''}
            <br />
            {status.startsAtLabel}
            <br />
            {addressLine}
          </p>
          <p className={styles.confirmText}>
            Please keep these details. To change or cancel, call <a href={phoneHref}>{site.phone}</a>.
          </p>
        </div>
      </div>
    );
  }

  if (status.state === 'followUp') {
    return (
      <div className={styles.confirmation} role="status">
        <Info className={styles.confirmIcon} size={56} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h3 ref={doneRef} tabIndex={-1} className={styles.confirmTitle}>
            Your appointment is not confirmed yet.
          </h3>
          <p className={styles.confirmText}>{status.message}</p>
          <p className={styles.confirmText}>
            Questions? Call <a href={phoneHref}>{site.phone}</a>.
          </p>
        </div>
      </div>
    );
  }

  if (config === null) {
    return (
      <p className={own.loading} role="status">
        Loading scheduling…
      </p>
    );
  }

  if (!config.available) {
    return (
      <div className={styles.alert} role="status">
        <Info size={22} aria-hidden="true" />
        <p>
          <strong>Online booking is not available right now.</strong> Please call the clinic at <a href={phoneHref}>{site.phone}</a>{' '}
          to schedule, or use the request form on the Contact page.
        </p>
      </div>
    );
  }

  // ---- form ----

  const isMock = service.mode === 'mock';
  const submitting = status.state === 'submitting';
  const zone = config.timezone ?? 'America/Chicago';
  const errorEntries = FIELD_ORDER.filter((name) => errors[name]);
  const describedBy = (name: SchedulingField, ...extra: string[]) =>
    [errors[name] ? errorId(name) : '', ...extra].filter(Boolean).join(' ') || undefined;
  const fieldError = (name: SchedulingField) =>
    errors[name] && (
      <p id={errorId(name)} className={styles.error}>
        {errors[name]}
      </p>
    );
  const focusTarget = (name: SchedulingField) =>
    name === 'dateOfBirth' ? id('dobMonth') : name === 'slot' ? id('calendar') : name === 'paymentMode' ? id('paymentMode-0') : id(name);

  const monthDays = month ? days[month] : undefined;
  const available = new Map<string, Slot[]>(Array.isArray(monthDays) ? monthDays.map((d) => [d.date, d.slots]) : []);
  const daySlots = values.date ? (available.get(values.date) ?? []) : [];
  const canPrev = !!config.firstDate && month > monthOf(config.firstDate);
  const canNext = !!config.lastDate && month < monthOf(config.lastDate);

  const textInput = (name: 'firstName' | 'lastName' | 'email' | 'mobile', label: string, props: Record<string, string | number>, hint?: string) => (
    <div className={styles.field}>
      <label htmlFor={id(name)} className={styles.label}>
        {label} <span className={styles.star} aria-hidden="true">*</span>
      </label>
      <input
        id={id(name)}
        name={name}
        required
        className={styles.input}
        value={values[name]}
        aria-invalid={!!errors[name]}
        aria-describedby={describedBy(name, hint ? id(`${name}-hint`) : '')}
        onChange={(e) => update(name, e.target.value)}
        {...props}
      />
      {hint && (
        <p id={id(`${name}-hint`)} className={styles.hint}>
          {hint}
        </p>
      )}
      {fieldError(name)}
    </div>
  );

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit} aria-describedby={isMock ? id('demo') : undefined}>
      {isMock && (
        <p id={id('demo')} className={styles.demoBanner}>
          <Info size={18} aria-hidden="true" />
          <span>
            <strong>Local demo:</strong> sample times only. Nothing you enter will be sent, stored or booked.
          </span>
        </p>
      )}

      <p className={styles.required}>
        Fields marked <span aria-hidden="true">*</span>
        <span className="visually-hidden">with an asterisk</span> are required.
      </p>

      {summaryVisible && errorEntries.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className={styles.errorSummary} role="alert" aria-labelledby={id('summary-title')}>
          <h3 id={id('summary-title')} className={styles.errorSummaryTitle}>
            Please fix {errorEntries.length === 1 ? 'this problem' : `these ${errorEntries.length} problems`}:
          </h3>
          <ul>
            {errorEntries.map((name) => (
              <li key={name}>
                <a
                  href={`#${focusTarget(name)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    const target = document.getElementById(focusTarget(name));
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
            <strong>Your appointment was not booked.</strong> {status.message}
          </p>
        </div>
      )}

      {/* ---- Appointment ---- */}
      <h3 className={own.stepTitle}>Appointment</h3>

      <div className={own.visitCard}>
        <p>
          <strong>{config.appointmentType}</strong>
          {config.durationMinutes ? `, ${config.durationMinutes} minutes` : ''}
        </p>
        <p>
          Provider: <strong>{config.providerName}</strong>
        </p>
        <button
          type="button"
          className={own.providerButton}
          aria-expanded={providerOpen}
          aria-controls={id('provider')}
          onClick={() => setProviderOpen((o) => !o)}
        >
          About this provider
        </button>
        {providerOpen && (
          <p id={id('provider')} className={own.providerPanel}>
            {config.providerName} is the provider who sees new patients for an {config.appointmentType} booked online at Stride
            Physical Therapy &amp; Wellness, {addressLine}.
          </p>
        )}
      </div>

      {notice && (
        <div ref={noticeRef} tabIndex={-1} className={own.notice} role="alert">
          <TriangleAlert size={20} aria-hidden="true" />
          <p>{notice}</p>
        </div>
      )}

      <fieldset className={own.group} aria-describedby={describedBy('slot', id('zone'))}>
        <legend className={styles.label}>
          Date and time <span className={styles.star} aria-hidden="true">*</span>
        </legend>
        <div className={own.datePicker} ref={pickerRef}>
          <button
            ref={dateButtonRef}
            id={id('calendar')}
            type="button"
            className={`${styles.input} ${own.dateField}`}
            aria-haspopup="dialog"
            aria-expanded={calendarOpen}
            aria-controls={calendarOpen ? id('calendar-popup') : undefined}
            aria-invalid={!!errors.slot}
            aria-describedby={describedBy('slot')}
            onClick={() => setCalendarOpen((open) => !open)}
          >
            <span className={values.date ? undefined : own.placeholder}>
              <span className="visually-hidden">Date:</span> {values.date ? longDate(values.date) : 'Choose a date'}
            </span>
            <CalendarDays size={20} aria-hidden="true" />
          </button>

          {calendarOpen && (
            <div
              id={id('calendar-popup')}
              ref={popupRef}
              role="dialog"
              aria-modal="false"
              aria-label="Choose a date"
              className={own.popup}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  closeCalendar();
                }
              }}
            >
              <div className={own.calendarHead}>
                <button type="button" className={own.navButton} disabled={!canPrev} onClick={() => showMonth(addMonths(month, -1))} aria-label="Previous month">
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <p className={own.monthTitle} aria-live="polite">
                  {month && monthLabel(month)}
                </p>
                <button type="button" className={own.navButton} disabled={!canNext} onClick={() => showMonth(addMonths(month, 1))} aria-label="Next month">
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>

              {monthDays === 'loading' || monthDays === undefined ? (
                <p className={own.loading} role="status">
                  Loading available dates…
                </p>
              ) : !Array.isArray(monthDays) ? (
                <p className={own.popupError} role="alert">
                  {monthDays.error}{' '}
                  <button type="button" className={styles.inlineButton} onClick={() => void loadMonth(config, month)}>
                    Try again
                  </button>
                </p>
              ) : (
                <table className={own.calendar}>
                  <caption className="visually-hidden">{monthLabel(month)}: dates with available times can be selected</caption>
                  <thead>
                    <tr>
                      {WEEKDAYS.map((d) => (
                        <th key={d} scope="col" abbr={d}>
                          {d.slice(0, 2)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthGrid(month).map((week, w) => (
                      <tr key={w}>
                        {week.map((date, d) => {
                          if (!date) return <td key={d} />;
                          const count = available.get(date)?.length ?? 0;
                          return (
                            <td key={date}>
                              <button
                                type="button"
                                className={own.day}
                                disabled={count === 0}
                                aria-pressed={values.date === date}
                                aria-label={`${longDate(date)}, ${count === 0 ? 'no times available' : `${count} ${count === 1 ? 'time' : 'times'} available`}`}
                                onClick={() => {
                                  update('date', date);
                                  update('slot', null);
                                  closeCalendar();
                                }}
                              >
                                {Number(date.slice(8))}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {Array.isArray(monthDays) && monthDays.length === 0 && (
                <p className={own.popupNote}>No times this month. Try the next month, or call the clinic.</p>
              )}
            </div>
          )}
        </div>

        <p id={id('zone')} className={own.zone}>
          Times are shown in clinic time: {zoneLabel(zone, values.slot?.start ?? daySlots[0]?.start)}.
        </p>

        {values.date && daySlots.length > 0 && (
          <fieldset className={own.group}>
            <legend className={styles.label}>Available times on {longDate(values.date)}</legend>
            <div className={own.times}>
              {daySlots.map((slot) => (
                <label key={slot.start} className={own.choice}>
                  <input
                    type="radio"
                    name={`${uid}-slot`}
                    value={slot.start}
                    checked={values.slot?.start === slot.start}
                    onChange={() => update('slot', slot)}
                  />
                  <span>{slot.time}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {values.slot && values.date && (
          <p className={own.note} aria-live="polite">
            Selected: <strong>{longDate(values.date)} at {values.slot.time}</strong> ({zoneLabel(zone, values.slot.start)})
          </p>
        )}
        {fieldError('slot')}
      </fieldset>

      {/* ---- Patient details ---- */}
      <h3 className={own.stepTitle}>Your details</h3>
      <p className={own.note}>New and returning patients enter the same details; we match them to your existing record if you have one.</p>

      <div className={styles.row}>
        {textInput('firstName', 'First name', { type: 'text', autoComplete: 'given-name', maxLength: 100 })}
        {textInput('lastName', 'Last name', { type: 'text', autoComplete: 'family-name', maxLength: 100 })}
      </div>

      <fieldset className={profile.dob} aria-describedby={describedBy('dateOfBirth', id('dob-hint'))}>
        <legend className={styles.label}>
          Date of birth <span className={styles.star} aria-hidden="true">*</span>
        </legend>
        <p id={id('dob-hint')} className={styles.hint}>
          For example, March 15 1985.
        </p>
        <div className={profile.dobParts}>
          <div className={styles.field}>
            <label htmlFor={id('dobMonth')} className={profile.partLabel}>
              Month
            </label>
            <select
              id={id('dobMonth')}
              autoComplete="bday-month"
              className={`${styles.input} ${styles.select}`}
              value={values.dobMonth}
              aria-invalid={!!errors.dateOfBirth}
              onChange={(e) => update('dobMonth', e.target.value)}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={id('dobDay')} className={profile.partLabel}>
              Day
            </label>
            <input
              id={id('dobDay')}
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
            <label htmlFor={id('dobYear')} className={profile.partLabel}>
              Year
            </label>
            <input
              id={id('dobYear')}
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
        <label htmlFor={id('sex')} className={styles.label}>
          Sex <span className={styles.star} aria-hidden="true">*</span>
        </label>
        <select
          id={id('sex')}
          required
          className={`${styles.input} ${styles.select}`}
          value={values.sex}
          aria-invalid={!!errors.sex}
          aria-describedby={describedBy('sex', id('sex-hint'))}
          onChange={(e) => update('sex', e.target.value as SchedulingValues['sex'])}
        >
          <option value="">Choose one</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p id={id('sex-hint')} className={styles.hint}>
          As used for your medical record.
        </p>
        {fieldError('sex')}
      </div>

      {textInput('mobile', 'US mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', maxLength: 32 }, 'For example (630) 555-0123.')}
      {textInput('email', 'Email address', { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 254 })}

      <fieldset className={own.group} aria-describedby={describedBy('paymentMode', id('paymentMode-hint'))}>
        <legend className={styles.label}>
          Payment <span className={styles.star} aria-hidden="true">*</span>
        </legend>
        <div className={own.choices}>
          {PAYMENT_MODES.map((option, index) => (
            <label key={option.value} className={own.choice}>
              <input
                id={index === 0 ? id('paymentMode-0') : undefined}
                type="radio"
                name={`${uid}-paymentMode`}
                value={option.value}
                checked={values.paymentMode === option.value}
                aria-invalid={!!errors.paymentMode}
                onChange={() => update('paymentMode', option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p id={id('paymentMode-hint')} className={styles.hint}>
          Choosing insurance does not check your eligibility or guarantee coverage. The clinic will review your benefits with
          you.
        </p>
        {fieldError('paymentMode')}
      </fieldset>

      <div className={profile.consent}>
        <div className={styles.checkboxRow}>
          <input
            id={id('consent')}
            type="checkbox"
            checked={values.consent}
            aria-invalid={!!errors.consent}
            aria-describedby={describedBy('consent')}
            onChange={(e) => update('consent', e.target.checked)}
          />
          <label htmlFor={id('consent')}>
            I agree that Stride Physical Therapy &amp; Wellness may send the details above to SPRY, the practice-management system
            the clinic uses, to create my patient profile and book this appointment.{' '}
            <span className={styles.star} aria-hidden="true">*</span>
          </label>
        </div>
        {fieldError('consent')}
      </div>

      <p className={styles.privacy}>
        See our <LegalLink topic="privacy" className={styles.inlineLink}>Privacy Policy</LegalLink> for how we handle your
        information.
      </p>

      <button type="submit" className={styles.submit} disabled={submitting} aria-disabled={submitting}>
        <span>{submitting ? 'Booking…' : isMock ? 'Book Appointment (demo)' : 'Book Appointment'}</span>
        {!submitting && <ArrowRight size={20} aria-hidden="true" />}
      </button>
      <p className="visually-hidden" role="status">
        {submitting ? 'Booking your appointment. This can take up to a minute.' : ''}
      </p>
    </form>
  );
}
