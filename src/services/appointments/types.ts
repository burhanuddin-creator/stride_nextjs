import type {
  AppointmentPolicy,
  AppointmentRequestPayload,
  EmailCodeResult,
  EmailConfirmResult,
  SubmitOptions,
  SubmitResult,
} from '../../types/appointment';

/**
 * Boundary between the form UI and whatever receives appointment requests.
 * The mock and HTTP adapters implement the same interface so the Laravel API
 * can be switched on by configuration alone.
 */
export interface AppointmentService {
  readonly mode: 'mock' | 'http';
  /** The server's form policy. If it cannot be read, verification is assumed to be required (the stricter UI). */
  getPolicy(): Promise<AppointmentPolicy>;
  /** Emails a one-time code to the address. */
  requestEmailCode(email: string): Promise<EmailCodeResult>;
  /** Checks a code; on success returns the token that must accompany the request. */
  confirmEmailCode(verificationId: string, code: string): Promise<EmailConfirmResult>;
  submit(payload: AppointmentRequestPayload, options?: SubmitOptions): Promise<SubmitResult>;
}
