import { SEX_OPTIONS } from '../types/patientProfile';
import { PAYMENT_MODES, type BookingPayload, type SchedulingErrors, type SchedulingField, type SchedulingValues } from '../types/scheduling';
import { normalizeEmail } from './appointmentForm';
import { composeDateOfBirth, normalizeUsMobile, validatePatientProfile } from './patientProfileForm';

/** Field order for the error summary (top of the form to the bottom). */
export const FIELD_ORDER: SchedulingField[] = ['slot', 'firstName', 'lastName', 'dateOfBirth', 'sex', 'mobile', 'email', 'paymentMode', 'consent'];

export const CONSENT_REQUIRED =
  'Confirm that we may send these details to SPRY to create your patient profile and book the appointment.';

export function emptyScheduling(): SchedulingValues {
  return {
    date: '',
    slot: null,
    firstName: '',
    lastName: '',
    dobMonth: '',
    dobDay: '',
    dobYear: '',
    sex: '',
    mobile: '',
    email: '',
    paymentMode: '',
    consent: false,
  };
}

/** The appointment (time, payment) and the basic patient details SPRY needs to create or match the patient. */
export function validateScheduling(values: SchedulingValues, now = new Date()): SchedulingErrors {
  const errors: SchedulingErrors = {};
  if (!values.slot) errors.slot = values.date ? 'Choose a time.' : 'Choose a date, then a time.';
  if (!PAYMENT_MODES.some((o) => o.value === values.paymentMode)) errors.paymentMode = 'Choose how you plan to pay.';
  Object.assign(
    errors,
    validatePatientProfile(
      {
        firstName: values.firstName,
        lastName: values.lastName,
        dobMonth: values.dobMonth,
        dobDay: values.dobDay,
        dobYear: values.dobYear,
        sex: values.sex,
        mobile: values.mobile,
        email: values.email,
        consent: values.consent,
      },
      now,
    ),
  );
  if (!values.consent) errors.consent = CONSENT_REQUIRED;
  else delete errors.consent;
  return errors;
}

/** Call only after validateScheduling() returned no errors. */
export function toBookingPayload(values: SchedulingValues): BookingPayload {
  return {
    start: values.slot!.start,
    payment_mode: values.paymentMode as BookingPayload['payment_mode'],
    first_name: values.firstName.trim().replace(/\s+/g, ' '),
    last_name: values.lastName.trim().replace(/\s+/g, ' '),
    date_of_birth: composeDateOfBirth(values.dobMonth, values.dobDay, values.dobYear)!,
    sex: values.sex as BookingPayload['sex'],
    mobile: normalizeUsMobile(values.mobile)!,
    email: normalizeEmail(values.email),
    consent: true,
  };
}

export const labelOf = <T extends { value: string; label: string }>(list: readonly T[], value: string) =>
  list.find((o) => o.value === value)?.label ?? '';

export const sexLabel = (value: string) => SEX_OPTIONS.find((o) => o.value === value)?.label ?? '';

// ---- calendar helpers: all arithmetic on clinic-local dates (YYYY-MM-DD) in UTC, so the visitor's own time zone
// never shifts a date.

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const format = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const date = parse(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date);
}

/** YYYY-MM of a date. */
export const monthOf = (iso: string) => iso.slice(0, 7);

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return format(date).slice(0, 7);
}

/** Weeks (Sunday first) of a month; days outside the month are null. */
export function monthGrid(month: string): (string | null)[][] {
  const first = parse(`${month}-01`);
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = first; monthOf(format(d)) === month; d = parse(addDays(format(d), 1))) {
    week.push(format(d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  return weeks;
}

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parse(`${month}-01`));

export const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parse(iso));

/** "Central Time (CST)" / "(CDT)" for the clinic zone on a given date (handles daylight saving). */
export function zoneLabel(timezone: string, isoStart?: string): string {
  const at = isoStart ? new Date(isoStart) : new Date();
  const abbr =
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')
      ?.value ?? '';
  const name = timezone === 'America/Chicago' ? 'Central Time' : timezone;
  return abbr ? `${name} (${abbr})` : name;
}
