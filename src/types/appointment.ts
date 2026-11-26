import type { ServiceSlug } from '../data/services';

export const CARE_TYPES = ['physical_therapy', 'wellness', 'insurance_question', 'not_sure'] as const;
export type CareType = (typeof CARE_TYPES)[number];

/**
 * Care types offered in the form. `wellness` stays in CARE_TYPES because it is part of the API contract and of saved
 * records, but the Wellness page was removed (client developer package), so it is no longer a visible choice.
 */
export const SELECTABLE_CARE_TYPES = ['physical_therapy', 'insurance_question', 'not_sure'] as const satisfies readonly CareType[];

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  physical_therapy: 'Physical Therapy',
  wellness: 'Wellness',
  insurance_question: 'Insurance Question',
  not_sure: 'Not Sure',
};

/** Email is the only contact method offered; it must be verified with a one-time code before submitting. */
export type ContactMethod = 'email';

export const NOTES_MAX_LENGTH = 500;

/** Form state as edited in the UI. */
export interface AppointmentFormValues {
  firstName: string;
  lastName: string;
  careType: CareType | '';
  /** Optional specific service (canonical slug), or '' for none. */
  serviceSlug: ServiceSlug | '';
  /** The visitor's email address. */
  contactValue: string;
  /** The visitor's phone number as typed (required; normalised to E.164 when sent). */
  phone: string;
  notes: string;
  insuranceHelp: boolean;
}

export type AppointmentField = keyof AppointmentFormValues;
export type FieldErrors = Partial<Record<AppointmentField, string>>;

/** Request body for POST /appointment-requests (see docs/API_CONTRACT.md). */
export interface AppointmentRequestPayload {
  first_name: string;
  last_name: string;
  care_type: CareType;
  /** Optional; one of the 12 canonical service slugs. The server resolves the display name. */
  service_slug: ServiceSlug | null;
  preferred_contact_method: ContactMethod;
  contact_value: string;
  /**
   * Required phone number, normalised to E.164 (e.g. +16305550123) — same rules as the API (ContactNormalizer::phone).
   * Never verified (no SMS or one-time code).
   */
  phone: string;
  /**
   * Token from POST /email-verifications/{id}/confirm proving the visitor controls contact_value.
   * Sent only when the server policy requires email verification (see AppointmentPolicy); omitted otherwise.
   */
  email_verification_token?: string;
  notes: string | null;
  insurance_help: boolean;
}

/** `ok: true` means the server SAVED the request (HTTP 201) — not merely that an email was queued. */
export type SubmitResult =
  | { ok: true; mode: 'mock' | 'http'; reference?: string }
  | {
      ok: false;
      kind: 'validation' | 'rate_limited' | 'server' | 'network' | 'timeout' | 'conflict';
      message: string;
      fieldErrors?: FieldErrors;
    };

export interface SubmitOptions {
  /**
   * One key per submission attempt. Retries of the SAME payload reuse it so the server can
   * de-duplicate; a different payload must use a new key.
   */
  idempotencyKey?: string;
}

/**
 * Public, read-only form policy decided by the server (GET /appointment-config). The browser only adapts its UI;
 * the server enforces the same policy and ignores anything the browser says about it.
 */
export interface AppointmentPolicy {
  /** true: the address must be confirmed with a one-time code before the request can be sent. */
  emailVerificationRequired: boolean;
}

/** Result of asking for a verification code (POST /email-verifications). */
export type EmailCodeResult =
  | { ok: true; id: string; expiresInSeconds: number; resendInSeconds: number }
  | { ok: false; message: string; retryAfterSeconds?: number };

/** Result of checking a code (POST /email-verifications/{id}/confirm). */
export type EmailConfirmResult = { ok: true; token: string } | { ok: false; message: string };
