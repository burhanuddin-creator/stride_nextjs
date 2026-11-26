import type { PatientProfileErrors, SexValue } from './patientProfile';

/**
 * "Schedule an Appointment" form (SPRY booking through Laravel). The browser never sees SPRY patient or
 * appointment IDs and never chooses the clinic, provider, category or duration — those are server-controlled.
 */

export const PAYMENT_MODES = [
  { value: 'SELF_PAY', label: 'Self-pay' },
  { value: 'INSURANCE_PAY', label: 'Insurance' },
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number]['value'];

/** GET /scheduling/config (available: false → nothing else). */
export interface SchedulingConfig {
  available: boolean;
  providerName?: string;
  appointmentType?: string;
  durationMinutes?: number;
  /** IANA zone of the clinic, e.g. America/Chicago */
  timezone?: string;
  /** First and last clinic-local dates that may be booked (YYYY-MM-DD). */
  firstDate?: string;
  lastDate?: string;
}

/** One bookable start: `start` is UTC (sent back unchanged); `time` is the clinic-local label from the server. */
export interface Slot {
  start: string;
  time: string;
}

export interface AvailabilityDay {
  /** Clinic-local date, YYYY-MM-DD */
  date: string;
  slots: Slot[];
}

export type AvailabilityResult = { ok: true; days: AvailabilityDay[] } | { ok: false; message: string };

export interface SchedulingValues {
  date: string;
  slot: Slot | null;
  firstName: string;
  lastName: string;
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  sex: SexValue | '';
  mobile: string;
  email: string;
  paymentMode: PaymentMode | '';
  consent: boolean;
}

export type SchedulingField =
  | 'slot'
  | 'firstName'
  | 'lastName'
  | 'dateOfBirth'
  | 'sex'
  | 'mobile'
  | 'email'
  | 'paymentMode'
  | 'consent';

export type SchedulingErrors = Partial<Record<SchedulingField, string>>;

/** Body of POST /scheduling/bookings (snake_case, Laravel). */
export interface BookingPayload {
  start: string;
  payment_mode: PaymentMode;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: SexValue;
  mobile: string;
  email: string;
  consent: true;
}

export type BookingResult =
  | { ok: true; mode: 'mock' | 'http'; outcome: 'booked'; startsAtLabel: string; durationMinutes: number }
  | { ok: true; mode: 'mock' | 'http'; outcome: 'pending' | 'patient_follow_up'; message: string }
  | {
      ok: false;
      kind: 'slot_unavailable' | 'validation' | 'busy' | 'not_booked' | 'unavailable' | 'rate_limited' | 'timeout' | 'network' | 'server';
      message: string;
      fieldErrors?: SchedulingErrors;
    };

export type { PatientProfileErrors };
