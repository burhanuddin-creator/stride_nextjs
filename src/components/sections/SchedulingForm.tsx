'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, CircleCheck, Clock, Info, TriangleAlert } from 'lucide-react';
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
  sexLabel,
  toBookingPayload,
  validateScheduling,
  zoneLabel,
} from '../../utils/schedulingForm';
import { newIdempotencyKey } from '../../utils/idempotency';
import { CONTACT_FORM_ID } from '../../utils/links';
import { addressLine, phoneHref, site } from '../../config/site';
import { Button, ButtonLink } from '../ui/Button';
import { LegalLink } from '../ui/LegalDialog';
import styles from './AppointmentForm.module.css';
import own from './SchedulingForm.module.css';

type Status =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'error'; message: string }
  | { state: 'booked'; mode: 'mock' | 'http'; startsAtLabel: string; durationMinutes: number }
  | { state: 'followUp'; message: string };

type MonthState = AvailabilityDay[] | 'loading' | { error: string };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The three steps and the fields each one validates before the visitor may continue. */
const STEPS: readonly { label: string; title: string; fields: readonly SchedulingField[] }[] = [
  { label: 'Date & time', title: 'Choose a date and time', fields: ['slot'] },
  { label: 'Your details', title: 'Enter your details', fields: ['firstName', 'lastName', 'dateOfBirth', 'sex', 'mobile', 'email'] },
  { label: 'Payment & review', title: 'Payment and review', fields: ['paymentMode', 'consent'] },
];
const LAST_STEP = STEPS.length - 1;
const stepOf = (field: SchedulingField) => Math.max(0, STEPS.findIndex((s) => s.fields.includes(field)));

/** Values that belong to a validated field with another name. */
const FIELD_OF: Partial<Record<keyof SchedulingValues, SchedulingField>> = {
  date: 'slot',
  dobMonth: 'dateOfBirth',
  dobDay: 'dateOfBirth',
  dobYear: 'dateOfBirth',
};

const pick = (errors: SchedulingErrors, fields: readonly SchedulingField[]): SchedulingErrors =>
  Object.fromEntries(fields.filter((f) => errors[f]).map((f) => [f, errors[f]]));

interface Props {
  service?: SchedulingService;
}

/**
 * "Schedule an Appointment" in three steps: (1) a date and an available time (SPRY availability, clinic time), (2) the
 * basic patient details used to create or match the patient, (3) payment mode, consent and a review, then one explicit
 * "Confirm Appointment". Each step is validated before the next; answers stay in memory only (never in the URL or
 * browser storage) and survive moving back and forth. Clinic, provider, category and duration are server-controlled
 * and shown in the summary beside the form. One POST per confirmation with an Idempotency-Key per payload, never retried
 * automatically; "booked" only when the server confirmed it.
 */
export function SchedulingForm({ service = schedulingService }: Props) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const errorId = (name: SchedulingField) => `${uid}-${name}-error`;

  const [config, setConfig] = useState<SchedulingConfig | null>(null);
  const [values, setValues] = useState<SchedulingValues>(emptyScheduling);
  const [errors, setErrors] = useState<SchedulingErrors>({});
  const [step, setStep] = useState(0);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState('');
  const [days, setDays] = useState<Record<string, MonthState>>({});
  const [activeDay, setActiveDay] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);

  const submittingRef = useRef(false);
  const attemptRef = useRef<{ key: string; payload: string } | null>(null);
  const focusStepRef = useRef(false);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const calendarRef = useRef<HTMLTableElement>(null);
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

  // A new step: its heading takes focus (and scrolls into view), so keyboard and screen-reader users start at the top.
  useEffect(() => {
    if (!focusStepRef.current) return;
    focusStepRef.current = false;
    stepTitleRef.current?.focus();
  }, [step]);

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

  /** Changes values; a field that already shows an error is re-checked as the visitor corrects it. */
  const update = (patch: Partial<SchedulingValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    const touched = (Object.keys(patch) as (keyof SchedulingValues)[]).map((k) => FIELD_OF[k] ?? (k as SchedulingField));
    if (!touched.some((f) => errors[f])) return;
    const fresh = validateScheduling(next);
    setErrors((current) => {
      const updated = { ...current };
      for (const f of touched) {
        if (!updated[f]) continue;
        if (fresh[f]) updated[f] = fresh[f];
        else delete updated[f];
      }
      return updated;
    });
  };

  const goToStep = (target: number, { focus = true } = {}) => {
    setErrors({});
    setSummaryVisible(false);
    if (status.state === 'error') setStatus({ state: 'idle' });
    focusStepRef.current = focus;
    setStep(target);
  };

  /** Shows the errors of one step (going there if needed) in a focused summary. */
  const showErrors = (found: SchedulingErrors, target: number) => {
    setStep(target);
    setErrors(pick(found, STEPS[target].fields));
    setSummaryVisible(false);
    requestAnimationFrame(() => setSummaryVisible(true));
  };

  const showMonth = (target: string) => {
    setMonth(target);
    setActiveDay('');
    if (config && !Array.isArray(days[target]) && days[target] !== 'loading') void loadMonth(config, target);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setNotice('');
    const found = validateScheduling(values);

    if (step < LAST_STEP) {
      const stepErrors = pick(found, STEPS[step].fields);
      if (Object.keys(stepErrors).length) showErrors(stepErrors, step);
      else goToStep(step + 1);
      return;
    }

    const invalid = FIELD_ORDER.filter((f) => found[f]);
    if (invalid.length) {
      setStatus({ state: 'idle' });
      showErrors(found, stepOf(invalid[0]));
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
        // Back to the times, freshly loaded for that month; every other answer is kept.
        setValues((v) => ({ ...v, slot: null }));
        setStatus({ state: 'idle' });
        goToStep(0, { focus: false });
        setNotice(result.message);
        if (config) void loadMonth(config, values.date ? monthOf(values.date) : month);
      } else if (result.kind === 'validation' && result.fieldErrors && Object.keys(result.fieldErrors).length) {
        const fieldErrors = result.fieldErrors;
        setStatus({ state: 'idle' });
        showErrors(fieldErrors, stepOf(FIELD_ORDER.find((f) => fieldErrors[f]) ?? 'consent'));
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
      <div className={own.unavailable}>
        <div className={styles.alert} role="status">
          <Info size={22} aria-hidden="true" />
          <p>
            <strong>Online booking is not available right now.</strong> Please call the clinic at <a href={phoneHref}>{site.phone}</a>{' '}
            to schedule, or use the request form on the Contact page.
          </p>
        </div>
        <ButtonLink to={`/contact#${CONTACT_FORM_ID}`} variant="outline" arrow={false}>
          Use the Request Form
        </ButtonLink>
      </div>
    );
  }

  // ---- the three steps ----

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

  // Every loaded month, so the chosen day keeps its times while another month is on screen.
  const slotsByDate = new Map<string, Slot[]>(
    Object.values(days).flatMap((m) => (Array.isArray(m) ? m.map((d) => [d.date, d.slots] as const) : [])),
  );
  const monthDays = month ? days[month] : undefined;
  const monthEnabled = Array.isArray(monthDays) ? monthDays.filter((d) => d.slots.length > 0).map((d) => d.date).sort() : [];
  const daySlots = values.date ? (slotsByDate.get(values.date) ?? []) : [];
  const canPrev = !!config.firstDate && month > monthOf(config.firstDate);
  const canNext = !!config.lastDate && month < monthOf(config.lastDate);
  const tabbableDay = [activeDay, values.date].find((d) => d && monthEnabled.includes(d)) ?? monthEnabled[0];
  const zoneText = zoneLabel(zone, values.slot?.start ?? daySlots[0]?.start);

  const fieldTarget = (name: SchedulingField): HTMLElement | null => {
    if (name === 'slot') {
      return document.getElementById(id('slot-0')) ?? calendarRef.current?.querySelector<HTMLElement>('button[tabindex="0"]') ?? null;
    }
    if (name === 'dateOfBirth') return document.getElementById(id('dobMonth'));
    if (name === 'paymentMode') return document.getElementById(id('paymentMode-0'));
    return document.getElementById(id(name));
  };

  /** Arrow keys move between the days that have times (roving focus: the calendar is one Tab stop). */
  const onCalendarKey = (event: KeyboardEvent<HTMLTableElement>) => {
    const current = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-date]')?.dataset.date;
    if (!current || !monthEnabled.length) return;
    const after = (d: string) => monthEnabled.find((x) => x > d);
    const before = (d: string) => [...monthEnabled].reverse().find((x) => x < d);
    const weekOrNearest = (d: string, delta: number) => (monthEnabled.includes(d) ? d : delta > 0 ? after(d) : before(d));
    const moves: Record<string, () => string | undefined> = {
      ArrowRight: () => after(current),
      ArrowLeft: () => before(current),
      ArrowDown: () => weekOrNearest(addDays(current, 7), 1),
      ArrowUp: () => weekOrNearest(addDays(current, -7), -1),
      Home: () => monthEnabled[0],
      End: () => monthEnabled[monthEnabled.length - 1],
    };
    if (!Object.hasOwn(moves, event.key)) return;
    event.preventDefault();
    const target = moves[event.key]();
    if (!target) return;
    setActiveDay(target);
    calendarRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${target}"]`)?.focus();
  };

  const textInput = (
    name: 'firstName' | 'lastName' | 'email' | 'mobile',
    label: string,
    props: Record<string, string | number>,
    hint?: string,
  ) => (
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
        onChange={(e) => update({ [name]: e.target.value })}
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

  const dateOfBirth =
    values.dobMonth && values.dobDay && values.dobYear
      ? `${MONTHS[Number(values.dobMonth) - 1] ?? ''} ${Number(values.dobDay)}, ${values.dobYear}`
      : '';

  // ---- step contents ----

  const stepDateTime = (
    <>
      {notice && (
        <div ref={noticeRef} tabIndex={-1} className={own.notice} role="alert">
          <TriangleAlert size={20} aria-hidden="true" />
          <p>{notice}</p>
        </div>
      )}

      <div className={own.schedule}>
        <div className={own.panel}>
          <div className={own.calendarHead}>
            <button type="button" className={own.navButton} disabled={!canPrev} onClick={() => showMonth(addMonths(month, -1))} aria-label="Previous month">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <p id={id('month')} className={own.monthTitle} aria-live="polite">
              {month && monthLabel(month)}
            </p>
            <button type="button" className={own.navButton} disabled={!canNext} onClick={() => showMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          {monthDays === 'loading' || monthDays === undefined ? (
            <p className={own.panelMessage} role="status">
              Loading available dates…
            </p>
          ) : !Array.isArray(monthDays) ? (
            <p className={own.panelMessage} role="alert">
              {monthDays.error}{' '}
              <button type="button" className={own.linkButton} onClick={() => void loadMonth(config, month)}>
                Try again
              </button>
            </p>
          ) : (
            <table ref={calendarRef} id={id('calendar')} className={own.calendar} onKeyDown={onCalendarKey}>
              <caption className="visually-hidden">
                {monthLabel(month)}: dates with available times can be selected. Use the arrow keys to move between them.
              </caption>
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
                      const count = slotsByDate.get(date)?.length ?? 0;
                      return (
                        <td key={date}>
                          <button
                            type="button"
                            className={own.day}
                            data-date={date}
                            disabled={count === 0}
                            tabIndex={date === tabbableDay ? 0 : -1}
                            aria-pressed={values.date === date}
                            aria-label={`${longDate(date)}, ${count === 0 ? 'no times available' : `${count} ${count === 1 ? 'time' : 'times'} available`}`}
                            onFocus={() => setActiveDay(date)}
                            onClick={() => update(values.date === date ? { date } : { date, slot: null })}
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
          {Array.isArray(monthDays) && monthEnabled.length === 0 && (
            <p className={own.panelMessage}>No times this month. {canNext ? 'Try the next month, or call the clinic.' : 'Please call the clinic.'}</p>
          )}
        </div>

        <fieldset className={`${own.panel} ${own.timesPanel} ${errors.slot ? own.invalid : ''}`} aria-describedby={describedBy('slot', id('zone'))}>
          <legend className={own.panelLegend}>
            Available times <span className={styles.star} aria-hidden="true">*</span>
            {values.date && <span className={own.dayLine}>on {longDate(values.date)}</span>}
          </legend>
          {!values.date ? (
            <p className={own.panelMessage}>Choose a date to see its available times.</p>
          ) : daySlots.length === 0 ? (
            <p className={own.panelMessage}>No times are left on this date. Please choose another date.</p>
          ) : (
            <div className={own.slots}>
              {daySlots.map((slot, index) => {
                const checked = values.slot?.start === slot.start;
                return (
                  <label key={slot.start} className={own.slot}>
                    <input
                      id={index === 0 ? id('slot-0') : undefined}
                      type="radio"
                      name={`${uid}-slot`}
                      value={slot.start}
                      checked={checked}
                      onChange={() => update({ slot })}
                    />
                    {checked && <Check size={16} strokeWidth={2.5} aria-hidden="true" />}
                    <span>{slot.time}</span>
                  </label>
                );
              })}
            </div>
          )}
          <p id={id('zone')} className={own.zone}>
            <Clock size={15} aria-hidden="true" /> Times are shown in clinic time: {zoneText}.
          </p>
          {fieldError('slot')}
        </fieldset>
      </div>
      <p className="visually-hidden" role="status">
        {values.date
          ? `${daySlots.length} ${daySlots.length === 1 ? 'time' : 'times'} available on ${longDate(values.date)}.`
          : ''}
      </p>
    </>
  );

  const stepDetails = (
    <>
      <p className={own.lead}>
        Enter your details exactly as they appear on your ID or insurance card. New and returning patients enter the same
        details; we match them to your existing record if you have one.
      </p>

      <div className={own.row}>
        {textInput('firstName', 'First name', { type: 'text', autoComplete: 'given-name', maxLength: 100 })}
        {textInput('lastName', 'Last name', { type: 'text', autoComplete: 'family-name', maxLength: 100 })}
      </div>

      <div className={own.row}>
        <fieldset className={own.dob} aria-describedby={describedBy('dateOfBirth', id('dob-hint'))}>
          <legend className={styles.label}>
            Date of birth <span className={styles.star} aria-hidden="true">*</span>
          </legend>
          <div className={own.dobParts}>
            <div className={styles.field}>
              <label htmlFor={id('dobMonth')} className={own.partLabel}>
                Month
              </label>
              <select
                id={id('dobMonth')}
                autoComplete="bday-month"
                className={`${styles.input} ${styles.select}`}
                value={values.dobMonth}
                aria-invalid={!!errors.dateOfBirth}
                onChange={(e) => update({ dobMonth: e.target.value })}
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
              <label htmlFor={id('dobDay')} className={own.partLabel}>
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
                onChange={(e) => update({ dobDay: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={id('dobYear')} className={own.partLabel}>
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
                onChange={(e) => update({ dobYear: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </div>
          <p id={id('dob-hint')} className={styles.hint}>
            For example, March 15 1985.
          </p>
          {fieldError('dateOfBirth')}
        </fieldset>

        <div className={styles.field}>
          <label htmlFor={id('sex')} className={styles.label}>
            Sex <span className={styles.star} aria-hidden="true">*</span>
          </label>
          {/* Above the control, like the Month/Day/Year labels beside it, so both controls line up. */}
          <p id={id('sex-hint')} className={own.partLabel}>
            As used for your medical record.
          </p>
          <select
            id={id('sex')}
            required
            className={`${styles.input} ${styles.select}`}
            value={values.sex}
            aria-invalid={!!errors.sex}
            aria-describedby={describedBy('sex', id('sex-hint'))}
            onChange={(e) => update({ sex: e.target.value as SchedulingValues['sex'] })}
          >
            <option value="">Choose one</option>
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {fieldError('sex')}
        </div>
      </div>

      <div className={own.row}>
        {textInput('mobile', 'US mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', maxLength: 32 }, 'For example (630) 555-0123.')}
        {textInput('email', 'Email address', { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 254 })}
      </div>
    </>
  );

  const stepReview = (
    <>
      <section className={own.review} aria-labelledby={id('review-title')}>
        <h4 id={id('review-title')} className={own.reviewTitle}>
          Review your booking
        </h4>
        <dl className={own.reviewList}>
          <div className={own.reviewItem}>
            <dt>Appointment</dt>
            <dd>
              {values.date && values.slot ? (
                <>
                  {longDate(values.date)} at {values.slot.time}
                  <span className={own.reviewMuted}> ({zoneLabel(zone, values.slot.start)})</span>
                </>
              ) : (
                'No time chosen'
              )}
            </dd>
            <button type="button" className={own.linkButton} onClick={() => goToStep(0)} disabled={submitting} aria-label="Change date and time">
              Change
            </button>
          </div>
          <div className={own.reviewItem}>
            <dt>Patient</dt>
            <dd>
              {values.firstName.trim()} {values.lastName.trim()}
              <span className={own.reviewMuted}>
                <br />
                Born {dateOfBirth}
                {values.sex ? ` · ${sexLabel(values.sex)}` : ''}
                <br />
                {values.mobile.trim()} · {values.email.trim()}
              </span>
            </dd>
            <button type="button" className={own.linkButton} onClick={() => goToStep(1)} disabled={submitting} aria-label="Change your details">
              Change
            </button>
          </div>
        </dl>
      </section>

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
                onChange={() => update({ paymentMode: option.value })}
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

      <div className={own.consent}>
        <div className={styles.checkboxRow}>
          <input
            id={id('consent')}
            type="checkbox"
            checked={values.consent}
            aria-invalid={!!errors.consent}
            aria-describedby={describedBy('consent')}
            onChange={(e) => update({ consent: e.target.checked })}
          />
          <label htmlFor={id('consent')}>
            I agree that Stride Physical Therapy &amp; Wellness may send the details above to SPRY, the practice-management system
            the clinic uses, to create my patient profile and book this appointment.{' '}
            <span className={styles.star} aria-hidden="true">*</span>
          </label>
        </div>
        {fieldError('consent')}
        <p className={styles.privacy}>
          See our <LegalLink topic="privacy" className={styles.inlineLink}>Privacy Policy</LegalLink> for how we handle your
          information.
        </p>
      </div>
    </>
  );

  return (
    <div className={own.shell}>
      <div className={own.main}>
        {isMock && (
          <p id={id('demo')} className={`${styles.demoBanner} ${own.demo}`}>
            <Info size={18} aria-hidden="true" />
            <span>
              <strong>Local demo:</strong> sample times only. Nothing you enter will be sent, stored or booked.
            </span>
          </p>
        )}

        <ol className={own.progress} aria-label="Booking steps">
          {STEPS.map((s, index) => (
            <li
              key={s.label}
              className={index < step ? own.done : index === step ? own.current : own.todo}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className={own.marker} aria-hidden="true">
                {index < step ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>
              <span className={own.stepLabel}>
                <span className="visually-hidden">Step {index + 1}: </span>
                {s.label}
                {index < step && <span className="visually-hidden"> (done)</span>}
              </span>
            </li>
          ))}
        </ol>

        <form className={own.form} noValidate onSubmit={handleSubmit} aria-labelledby={id('step-title')} aria-describedby={isMock ? id('demo') : undefined}>
          <div className={own.stepHead}>
            <h3 id={id('step-title')} ref={stepTitleRef} tabIndex={-1} className={own.stepTitle}>
              <span className={own.stepCount}>
                Step {step + 1} of {STEPS.length}
                <span className="visually-hidden">:</span>
              </span>{' '}
              {STEPS[step].title}
            </h3>
            <p className={own.required}>
              <span aria-hidden="true">*</span> Required
              <span className="visually-hidden"> fields are marked with an asterisk</span>
            </p>
          </div>

          {summaryVisible && errorEntries.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} className={styles.errorSummary} role="alert" aria-labelledby={id('summary-title')}>
              <h4 id={id('summary-title')} className={styles.errorSummaryTitle}>
                Please fix {errorEntries.length === 1 ? 'this problem' : `these ${errorEntries.length} problems`}:
              </h4>
              <ul>
                {errorEntries.map((name) => (
                  <li key={name}>
                    <a
                      href={`#${id(name === 'slot' ? 'calendar' : name === 'dateOfBirth' ? 'dobMonth' : name === 'paymentMode' ? 'paymentMode-0' : name)}`}
                      onClick={(event) => {
                        event.preventDefault();
                        const target = fieldTarget(name);
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

          {step === 0 ? stepDateTime : step === 1 ? stepDetails : stepReview}

          <div className={own.actions}>
            {step > 0 && (
              <Button variant="outline" icon={<ArrowLeft size={18} />} onClick={() => goToStep(step - 1)} disabled={submitting}>
                Back
              </Button>
            )}
            {step < LAST_STEP ? (
              <Button type="submit" arrow className={own.next}>
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                className={own.next}
                disabled={submitting}
                aria-disabled={submitting}
                arrow={!submitting}
                // Continue and Confirm share a position: the second click of a double-click on Continue lands here
                // (click count 2) and must not book. Keyboard activation has detail 0.
                onClick={(event) => {
                  if (event.detail > 1) event.preventDefault();
                }}
              >
                {submitting ? 'Booking…' : isMock ? 'Confirm Appointment (demo)' : 'Confirm Appointment'}
              </Button>
            )}
          </div>
          <p className="visually-hidden" role="status">
            {submitting ? 'Booking your appointment. This can take up to a minute.' : ''}
          </p>
        </form>
      </div>

      <aside className={own.summary} aria-labelledby={id('summary-heading')}>
        <div className={own.summaryHead}>
          <h3 id={id('summary-heading')} className={own.summaryTitle}>
            Your appointment
          </h3>
        </div>
        <dl className={own.facts}>
          <div>
            <dt>Visit</dt>
            <dd>
              {config.appointmentType}
              {config.durationMinutes ? ` · ${config.durationMinutes} minutes` : ''}
            </dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{config.providerName}</dd>
            <dd className={own.providerToggle}>
              <button
                type="button"
                className={own.linkButton}
                aria-expanded={providerOpen}
                aria-controls={id('provider')}
                onClick={() => setProviderOpen((o) => !o)}
              >
                About this provider
              </button>
            </dd>
            {providerOpen && (
              <dd id={id('provider')} className={own.providerPanel}>
                {config.providerName} is the provider who sees new patients for an {config.appointmentType} booked online at Stride
                Physical Therapy &amp; Wellness, {addressLine}.
              </dd>
            )}
          </div>
          <div>
            <dt>Date &amp; time</dt>
            <dd>
              {values.date && values.slot ? (
                <>
                  {longDate(values.date)}
                  <br />
                  {values.slot.time}
                </>
              ) : (
                <span className={own.pending}>Not chosen yet</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Clinic time zone</dt>
            <dd>{zoneText}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{addressLine}</dd>
          </div>
        </dl>
        <div className={own.summaryFoot}>
          <p>Your appointment is booked only when you see the confirmation on screen.</p>
          <p>
            Prefer to talk to us? Call <a href={phoneHref}>{site.phone}</a>, or{' '}
            <Link href={`/contact#${CONTACT_FORM_ID}`}>send us a request</Link>.
          </p>
        </div>
      </aside>
    </div>
  );
}
