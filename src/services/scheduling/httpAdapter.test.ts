import { describe, expect, it, vi } from 'vitest';
import { createHttpSchedulingService } from './httpAdapter';
import type { BookingPayload } from '../../types/scheduling';

const payload: BookingPayload = {
  start: '2026-03-09T15:00:00Z',
  payment_mode: 'SELF_PAY',
  first_name: 'Jamie',
  last_name: 'Rivera',
  date_of_birth: '1985-04-12',
  sex: 'FEMALE',
  mobile: '+16305550123',
  email: 'jamie@example.com',
  consent: true,
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const service = (fetchImpl: typeof fetch, bookingTimeoutMs = 5000) =>
  createHttpSchedulingService({ baseUrl: 'https://api.example.test/api/v1', timeoutMs: 5000, bookingTimeoutMs, fetchImpl });

describe('HTTP scheduling adapter', () => {
  it('reads the server-controlled config and treats anything unexpected as unavailable', async () => {
    const ok = vi.fn<typeof fetch>().mockResolvedValue(
      json(200, { data: { available: true, provider_name: 'P', appointment_type: 'Initial Evaluation', duration_minutes: 45, timezone: 'America/Chicago', first_date: '2026-03-05', last_date: '2026-04-04' } }),
    );
    expect(await service(ok).getConfig()).toEqual({
      available: true, providerName: 'P', appointmentType: 'Initial Evaluation', durationMinutes: 45, timezone: 'America/Chicago', firstDate: '2026-03-05', lastDate: '2026-04-04',
    });
    expect(await service(vi.fn<typeof fetch>().mockResolvedValue(json(500, {}))).getConfig()).toEqual({ available: false });
    expect(await service(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))).getConfig()).toEqual({ available: false });
  });

  it('fetches availability for clinic-local dates and rejects malformed days', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(200, { data: { days: [{ date: '2026-03-09', slots: [{ start: '2026-03-09T15:00:00Z', time: '10:00 AM' }] }] } }));
    expect(await service(fetchImpl).getAvailability('2026-03-01', '2026-03-28')).toEqual({ ok: true, days: [{ date: '2026-03-09', slots: [{ start: '2026-03-09T15:00:00Z', time: '10:00 AM' }] }] });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.example.test/api/v1/scheduling/availability?from=2026-03-01&to=2026-03-28');

    const bad = vi.fn<typeof fetch>().mockResolvedValue(json(200, { data: { days: [{ date: 'tomorrow' }] } }));
    expect((await service(bad).getAvailability('2026-03-01', '2026-03-02')).ok).toBe(false);
  });

  it('POSTs once with the Idempotency-Key and maps a confirmed booking', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(201, { data: { status: 'booked', appointment: { starts_at: '2026-03-09T15:00:00Z', starts_at_label: 'Monday, March 9, 2026 at 10:00 AM CDT', duration_minutes: 45 } } }),
    );
    const result = await service(fetchImpl).book(payload, 'key-0123456789abcdef');

    expect(result).toEqual({ ok: true, mode: 'http', outcome: 'booked', startsAtLabel: 'Monday, March 9, 2026 at 10:00 AM CDT', durationMinutes: 45 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/v1/scheduling/bookings');
    expect(init?.credentials).toBe('omit');
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe('key-0123456789abcdef');
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it.each([
    [202, { data: { status: 'pending', message: 'm' } }, { ok: true, mode: 'http', outcome: 'pending', message: 'm' }],
    [202, { data: { status: 'patient_follow_up', message: 'm' } }, { ok: true, mode: 'http', outcome: 'patient_follow_up', message: 'm' }],
    [409, { status: 'slot_unavailable', message: 'taken' }, { ok: false, kind: 'slot_unavailable', message: 'taken' }],
    [409, { status: 'busy', message: 'busy' }, { ok: false, kind: 'busy', message: 'busy' }],
    [503, { status: 'not_booked', message: 'no' }, { ok: false, kind: 'not_booked', message: 'no' }],
  ])('maps HTTP %i', async (status, body, expected) => {
    expect(await service(vi.fn<typeof fetch>().mockResolvedValue(json(status, body))).book(payload, 'key-0123456789abcdef')).toEqual(expected);
  });

  it('never reports success for an unexpected 200/201 body and never retries', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(201, { data: { status: 'something' } }));
    const result = await service(fetchImpl).book(payload, 'key-0123456789abcdef');
    expect(result.ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps validation errors to form fields', async () => {
    const result = await service(vi.fn<typeof fetch>().mockResolvedValue(json(422, { errors: { start: ['Choose a date and time from the calendar.'], payment_mode: ['x'] } }))).book(payload, 'key-0123456789abcdef');
    expect(result).toMatchObject({ ok: false, kind: 'validation', fieldErrors: { slot: 'Choose a date and time from the calendar.', paymentMode: 'x' } });
  });

  it('tells the visitor not to book again after a timeout', async () => {
    const hang = vi.fn<typeof fetch>((_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
    const result = await service(hang, 10).book(payload, 'key-0123456789abcdef');
    expect(result).toMatchObject({ ok: false, kind: 'timeout' });
    expect(result.ok === false && result.message).toMatch(/do not book again/);
  });
});
