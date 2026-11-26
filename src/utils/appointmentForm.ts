import {
  CARE_TYPES,
  SELECTABLE_CARE_TYPES,
  NOTES_MAX_LENGTH,
  type AppointmentFormValues,
  type AppointmentRequestPayload,
  type CareType,
  type FieldErrors,
} from '../types/appointment';
import { isServiceSlug, type ServiceSlug } from '../data/services';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isCareType(value: string | null | undefined): value is CareType {
  return !!value && (CARE_TYPES as readonly string[]).includes(value);
}

/** A care type the form currently offers (used for ?care= preselection; never `wellness`). */
export function isSelectableCareType(value: string | null | undefined): value is CareType {
  return !!value && (SELECTABLE_CARE_TYPES as readonly string[]).includes(value);
}

export function emptyFormValues(careType: CareType | '' = '', serviceSlug: ServiceSlug | '' = ''): AppointmentFormValues {
  return {
    firstName: '',
    lastName: '',
    careType,
    serviceSlug,
    contactValue: '',
    phone: '',
    notes: '',
    insuranceHelp: false,
  };
}

/** Same normalisation as the backend (ContactNormalizer::email): trimmed and lower-cased. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Format check only; returns the message to show, or null when the address looks valid. */
export function emailError(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return 'Enter an email address in the format name@example.com.';
  return null;
}

export const PHONE_REQUIRED = 'Enter your phone number.';
/** Same wording as the API (StoreAppointmentRequest::PHONE_FORMAT_MESSAGE). */
export const PHONE_FORMAT = 'Enter a 10-digit US phone number, for example (630) 555-0123, or an international number starting with +.';

const validNanp = (digits: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);

/**
 * Same rules as the API (backend ContactNormalizer::phone): US numbers in any common format — 630-555-0123,
 * (630) 555-0123, 630.555.0123, 6305550123, +1 630 555 0123, 1 (630) 555-0123 — or an international number starting
 * with + (8–15 digits). Returns E.164 (e.g. +16305550123), or null when the value is not a valid number.
 */
export function normalizePhone(value: string): string | null {
  const v = value.trim();
  if (!v || v.length > 32 || !/^\+?[0-9().\-\s]+$/.test(v)) return null;
  let digits = v.replace(/\D/g, '');
  if (v.startsWith('+')) {
    if (digits.startsWith('1')) return validNanp(digits.slice(1)) ? `+${digits}` : null;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return validNanp(digits) ? `+1${digits}` : null;
}

/** Returns the message to show, or null when the phone number is valid. */
export function phoneError(value: string): string | null {
  if (!value.trim()) return PHONE_REQUIRED;
  return normalizePhone(value) ? null : PHONE_FORMAT;
}

export const EMAIL_NOT_VERIFIED = 'Verify your email address before sending your request.';

/**
 * `emailVerified`: the current address has been confirmed with a one-time code.
 * `verificationRequired`: the server policy; when false only the address format is checked.
 */
export function validateAppointmentForm(values: AppointmentFormValues, emailVerified = false, verificationRequired = true): FieldErrors {
  const errors: FieldErrors = {};
  const first = values.firstName.trim();
  const last = values.lastName.trim();

  if (!first) errors.firstName = 'Enter your first name.';
  else if (first.length > 100) errors.firstName = 'First name must be 100 characters or fewer.';

  if (!last) errors.lastName = 'Enter your last name.';
  else if (last.length > 100) errors.lastName = 'Last name must be 100 characters or fewer.';

  if (!values.careType) errors.careType = 'Choose what we can help you with.';

  const contactError = emailError(values.contactValue);
  if (contactError) errors.contactValue = contactError;
  else if (verificationRequired && !emailVerified) errors.contactValue = EMAIL_NOT_VERIFIED;

  const phoneProblem = phoneError(values.phone);
  if (phoneProblem) errors.phone = phoneProblem;

  if (values.notes.length > NOTES_MAX_LENGTH) {
    errors.notes = `Brief notes must be ${NOTES_MAX_LENGTH} characters or fewer.`;
  }

  if (values.serviceSlug && !isServiceSlug(values.serviceSlug)) {
    errors.serviceSlug = 'Choose one of the listed services, or “No specific service”.';
  }

  return errors;
}

/** `emailVerificationToken`: null when the server policy does not require verification (the key is then omitted). */
export function toPayload(values: AppointmentFormValues, emailVerificationToken: string | null): AppointmentRequestPayload {
  const phone = normalizePhone(values.phone);
  if (!values.careType || !phone) {
    throw new Error('toPayload called with an incomplete form');
  }
  const notes = values.notes.trim();
  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    care_type: values.careType,
    service_slug: values.serviceSlug || null,
    preferred_contact_method: 'email',
    contact_value: values.contactValue.trim(),
    phone,
    ...(emailVerificationToken ? { email_verification_token: emailVerificationToken } : {}),
    notes: notes ? notes : null,
    insurance_help: values.insuranceHelp,
  };
}
