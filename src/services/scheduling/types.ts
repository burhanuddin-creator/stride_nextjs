import type { AvailabilityResult, BookingPayload, BookingResult, SchedulingConfig } from '../../types/scheduling';

/**
 * Boundary between the scheduling form and Laravel. The browser never talks to SPRY. Bookings carry an Idempotency-Key
 * (one per payload, memory only) so double clicks and retries replay instead of booking twice; a booking is never
 * retried automatically.
 */
export interface SchedulingService {
  readonly mode: 'mock' | 'http';
  getConfig(): Promise<SchedulingConfig>;
  /** Clinic-local dates, inclusive. */
  getAvailability(from: string, to: string): Promise<AvailabilityResult>;
  book(payload: BookingPayload, idempotencyKey: string): Promise<BookingResult>;
}
