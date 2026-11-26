import type { AppointmentService } from './types';

/** The only code the offline demo accepts (shown in the demo form). */
export const DEMO_VERIFICATION_CODE = '123456';

interface MockOptions {
  /**
   * Mirrors the server setting APPOINTMENT_EMAIL_VERIFICATION_REQUIRED. Defaults to false, the current setup:
   * a validly formatted address is enough and no code is asked for.
   */
  emailVerificationRequired?: boolean;
}

/**
 * Offline demonstration adapter. It never transmits, stores or logs the payload;
 * it only waits briefly so loading states can be reviewed. No email is sent: the
 * demo verification code (used only when verification is required) is always DEMO_VERIFICATION_CODE.
 */
export function createMockAppointmentService(delayMs = 700, { emailVerificationRequired = false }: MockOptions = {}): AppointmentService {
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    mode: 'mock',
    async getPolicy() {
      return { emailVerificationRequired };
    },
    async requestEmailCode() {
      await wait();
      return { ok: true, id: 'demo', expiresInSeconds: 600, resendInSeconds: 60 };
    },
    async confirmEmailCode(_id, code) {
      await wait();
      return code.trim() === DEMO_VERIFICATION_CODE
        ? { ok: true, token: 'demo-verification-token' }
        : { ok: false, message: `That code is not correct. In this demo, use ${DEMO_VERIFICATION_CODE}.` };
    },
    async submit() {
      await wait();
      return { ok: true, mode: 'mock' };
    },
  };
}
