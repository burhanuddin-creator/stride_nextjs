import type { AvailabilityDay, BookingResult, SchedulingConfig, SchedulingErrors, SchedulingField } from '../../types/scheduling';
import type { SchedulingService } from './types';

const FIELD_MAP: Record<string, SchedulingField> = {
  start: 'slot',
  payment_mode: 'paymentMode',
  first_name: 'firstName',
  last_name: 'lastName',
  date_of_birth: 'dateOfBirth',
  sex: 'sex',
  mobile: 'mobile',
  email: 'email',
  consent: 'consent',
};

interface HttpOptions {
  baseUrl: string;
  timeoutMs: number;
  /** A booking runs several SPRY calls on the server (slot checks, patient, create, lookup): allow longer. */
  bookingTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function mapSchedulingErrors(body: unknown): SchedulingErrors {
  const result: SchedulingErrors = {};
  if (!isRecord(body) || !isRecord(body.errors)) return result;
  for (const [apiField, messages] of Object.entries(body.errors)) {
    const field = FIELD_MAP[apiField];
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (field && typeof first === 'string') result[field] = first;
  }
  return result;
}

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

function parseDays(value: unknown): AvailabilityDay[] | null {
  if (!Array.isArray(value)) return null;
  const days: AvailabilityDay[] = [];
  for (const day of value) {
    if (!isRecord(day) || typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Array.isArray(day.slots)) return null;
    const slots = day.slots.filter(
      (s): s is { start: string; time: string } => isRecord(s) && typeof s.start === 'string' && typeof s.time === 'string',
    );
    days.push({ date: day.date, slots: slots.map((s) => ({ start: s.start, time: s.time })) });
  }
  return days;
}

const UNAVAILABLE = 'Online booking is not available right now. Please call the clinic to schedule.';

export function createHttpSchedulingService({ baseUrl, timeoutMs, bookingTimeoutMs = 90_000, fetchImpl }: HttpOptions): SchedulingService {
  const doFetch = fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function get(path: string): Promise<{ response: Response; body: unknown } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'omit',
        signal: controller.signal,
      });
      return { response, body: await readJson(response) };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    mode: 'http',

    async getConfig(): Promise<SchedulingConfig> {
      const result = await get('/scheduling/config');
      const data = result?.response.ok && isRecord(result.body) && isRecord(result.body.data) ? result.body.data : null;
      if (!data || data.available !== true) return { available: false };
      return {
        available: true,
        providerName: str(data.provider_name),
        appointmentType: str(data.appointment_type),
        durationMinutes: typeof data.duration_minutes === 'number' ? data.duration_minutes : undefined,
        timezone: str(data.timezone),
        firstDate: str(data.first_date),
        lastDate: str(data.last_date),
      };
    },

    async getAvailability(from, to) {
      const result = await get(`/scheduling/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const data = result?.response.ok && isRecord(result.body) && isRecord(result.body.data) ? result.body.data : null;
      const days = data ? parseDays(data.days) : null;
      if (days) return { ok: true, days };
      if (result?.response.status === 429) return { ok: false, message: 'Too many requests. Please wait a minute and try again.' };
      return { ok: false, message: 'We could not load available times right now. Please try again shortly, or call the clinic.' };
    },

    async book(payload, idempotencyKey): Promise<BookingResult> {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, bookingTimeoutMs);

      let response: Response;
      try {
        response = await doFetch(`${baseUrl}/scheduling/bookings`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Idempotency-Key': idempotencyKey,
          },
          credentials: 'omit',
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch {
        // Never retried automatically and never logged: the appointment may or may not exist.
        return timedOut
          ? {
              ok: false,
              kind: 'timeout',
              message:
                'The request took too long and was stopped, so we do not know whether your appointment was booked. Please do not book again — call the clinic to confirm.',
            }
          : { ok: false, kind: 'network', message: 'We could not reach our server. Please check your connection and try again.' };
      } finally {
        clearTimeout(timer);
      }

      const body = await readJson(response);
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : undefined;
      const status = isRecord(body) && typeof body.status === 'string' ? body.status : undefined;

      if (response.status === 201 && data?.status === 'booked' && isRecord(data.appointment)) {
        return {
          ok: true,
          mode: 'http',
          outcome: 'booked',
          startsAtLabel: str(data.appointment.starts_at_label) ?? '',
          durationMinutes: typeof data.appointment.duration_minutes === 'number' ? data.appointment.duration_minutes : 0,
        };
      }
      if (response.status === 202 && (data?.status === 'pending' || data?.status === 'patient_follow_up')) {
        return { ok: true, mode: 'http', outcome: data.status, message: str(data.message) ?? '' };
      }
      if (response.status === 409 && status === 'slot_unavailable') {
        return { ok: false, kind: 'slot_unavailable', message: message ?? 'That time is no longer available. Please choose another time.' };
      }
      if (response.status === 409) {
        return { ok: false, kind: 'busy', message: message ?? 'These details are already being processed. Please wait a moment, then try again.' };
      }
      if (response.status === 422) {
        const fieldErrors = mapSchedulingErrors(body);
        return {
          ok: false,
          kind: 'validation',
          message: Object.keys(fieldErrors).length ? 'Please correct the highlighted fields and try again.' : (message ?? 'Please check your details.'),
          fieldErrors,
        };
      }
      if (response.status === 429) {
        return { ok: false, kind: 'rate_limited', message: 'Too many attempts have been made. Please wait a few minutes and try again.' };
      }
      if (response.status === 503 && status === 'not_booked') {
        return { ok: false, kind: 'not_booked', message: message ?? 'Your appointment was not booked. Please choose another time, try again later, or call the clinic.' };
      }
      if (response.status === 503 && status === 'unavailable') {
        return { ok: false, kind: 'unavailable', message: UNAVAILABLE };
      }
      return {
        ok: false,
        kind: 'server',
        message: 'We could not confirm a booking because of a problem on our side. Please call the clinic before trying again.',
      };
    },
  };
}
