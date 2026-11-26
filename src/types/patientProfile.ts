/**
 * Separate "Schedule an Appointment" page — SPRY phase one: create the patient profile only (no appointment is booked).
 * Unrelated to the appointment request form (types/appointment.ts).
 */

/** SPRY `sex` enum values with readable labels (SPRY docs, Create patient). `OTHERS` is not offered. */
export const SEX_OPTIONS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNDEFINED', label: 'Prefer not to say' },
] as const;
export type SexValue = (typeof SEX_OPTIONS)[number]['value'];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface PatientProfileValues {
  firstName: string;
  lastName: string;
  /** '1'–'12', or '' */
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  sex: SexValue | '';
  mobile: string;
  email: string;
  consent: boolean;
}

export type PatientProfileField = 'firstName' | 'lastName' | 'dateOfBirth' | 'sex' | 'mobile' | 'email' | 'consent';

export type PatientProfileErrors = Partial<Record<PatientProfileField, string>>;

/** Snake_case body for POST /api/v1/patient-profiles. */
export interface PatientProfilePayload {
  first_name: string;
  last_name: string;
  /** YYYY-MM-DD */
  date_of_birth: string;
  sex: SexValue;
  /** E.164 US number (+1XXXXXXXXXX) */
  mobile: string;
  email: string;
  consent: true;
}

export type PatientProfileResult =
  /** complete: created or matched (the server never says which). follow_up: saved; the clinic will finish it. */
  | { ok: true; mode: 'mock' | 'http'; outcome: 'complete' | 'follow_up'; message?: string }
  | {
      ok: false;
      kind: 'validation' | 'busy' | 'not_created' | 'unavailable' | 'rate_limited' | 'timeout' | 'network' | 'server';
      message: string;
      fieldErrors?: PatientProfileErrors;
    };
