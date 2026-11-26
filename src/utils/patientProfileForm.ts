import {
  SEX_OPTIONS,
  type PatientProfileErrors,
  type PatientProfilePayload,
  type PatientProfileValues,
  type SexValue,
} from '../types/patientProfile';
import { emailError, normalizeEmail, normalizePhone } from './appointmentForm';

export function emptyPatientProfile(): PatientProfileValues {
  return { firstName: '', lastName: '', dobMonth: '', dobDay: '', dobYear: '', sex: '', mobile: '', email: '', consent: false };
}

/** Same wording as the API (StorePatientProfileRequest::MOBILE_FORMAT_MESSAGE). */
export const MOBILE_FORMAT = 'Enter a 10-digit US mobile number, for example (630) 555-0123.';
export const MOBILE_REQUIRED = 'Enter your mobile number.';
export const CONSENT_REQUIRED = 'Confirm that we may send these details to SPRY to create your patient profile.';

/** E.164 for a US number in any common format ((630) 555-0123, 630.555.0123, +1 630 555 0123, …), else null. */
export function normalizeUsMobile(value: string): string | null {
  const phone = normalizePhone(value);
  return phone && /^\+1\d{10}$/.test(phone) ? phone : null;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** YYYY-MM-DD when the three parts form a real calendar date, else null. */
export function composeDateOfBirth(month: string, day: string, year: string): string | null {
  if (!/^\d{1,2}$/.test(month.trim()) || !/^\d{1,2}$/.test(day.trim()) || !/^\d{4}$/.test(year.trim())) return null;
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Today's date in the visitor's time zone, as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function dateOfBirthError(values: Pick<PatientProfileValues, 'dobMonth' | 'dobDay' | 'dobYear'>, now = new Date()): string | null {
  const { dobMonth, dobDay, dobYear } = values;
  if (!dobMonth && !dobDay.trim() && !dobYear.trim()) return 'Enter your date of birth.';
  if (!dobMonth || !dobDay.trim() || !dobYear.trim()) return 'Enter your full date of birth: month, day and year.';
  const iso = composeDateOfBirth(dobMonth, dobDay, dobYear);
  if (!iso) return 'Enter your date of birth as a real date.';
  if (iso > todayIso(now)) return 'Your date of birth cannot be in the future.';
  if (iso <= '1900-01-01') return 'Enter a valid date of birth.';
  return null;
}

const isSex = (value: string): value is SexValue => SEX_OPTIONS.some((o) => o.value === value);

/** A name needs at least one letter or digit (punctuation and spaces alone are not a name). */
const hasNameCharacters = (value: string) => /[\p{L}\p{N}]/u.test(value);

export function validatePatientProfile(values: PatientProfileValues, now = new Date()): PatientProfileErrors {
  const errors: PatientProfileErrors = {};
  const first = values.firstName.trim();
  const last = values.lastName.trim();

  if (!first || !hasNameCharacters(first)) errors.firstName = 'Enter your first name.';
  else if (first.length > 100) errors.firstName = 'First name must be 100 characters or fewer.';

  if (!last || !hasNameCharacters(last)) errors.lastName = 'Enter your last name.';
  else if (last.length > 100) errors.lastName = 'Last name must be 100 characters or fewer.';

  const dob = dateOfBirthError(values, now);
  if (dob) errors.dateOfBirth = dob;

  if (!values.sex) errors.sex = 'Choose an option for sex.';
  else if (!isSex(values.sex)) errors.sex = 'Choose one of the listed options for sex.';

  if (!values.mobile.trim()) errors.mobile = MOBILE_REQUIRED;
  else if (!normalizeUsMobile(values.mobile)) errors.mobile = MOBILE_FORMAT;

  const email = emailError(values.email);
  if (email) errors.email = email;

  if (!values.consent) errors.consent = CONSENT_REQUIRED;

  return errors;
}

export function toPatientProfilePayload(values: PatientProfileValues): PatientProfilePayload {
  const dob = composeDateOfBirth(values.dobMonth, values.dobDay, values.dobYear);
  const mobile = normalizeUsMobile(values.mobile);
  if (!dob || !mobile || !values.sex || !values.consent) throw new Error('toPatientProfilePayload called with an incomplete form');
  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    date_of_birth: dob,
    sex: values.sex,
    mobile,
    email: normalizeEmail(values.email),
    consent: true,
  };
}
