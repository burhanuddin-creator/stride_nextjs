import type { PatientProfileService } from './types';

/**
 * Offline demonstration adapter. It never transmits, stores or logs the payload and never contacts SPRY; it only waits
 * briefly so loading states can be reviewed.
 */
export function createMockPatientProfileService(delayMs = 700, { available = true } = {}): PatientProfileService {
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    mode: 'mock',
    async isAvailable() {
      return available;
    },
    async submit() {
      await wait();
      return { ok: true, mode: 'mock', outcome: 'complete' };
    },
  };
}
