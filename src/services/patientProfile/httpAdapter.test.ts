import { describe, expect, it, vi } from 'vitest';
import { createHttpPatientProfileService } from './httpAdapter';
import type { PatientProfilePayload } from '../../types/patientProfile';

const payload: PatientProfilePayload = {
  first_name: 'Jamie',
  last_name: 'Rivera',
  date_of_birth: '1985-04-12',
  sex: 'FEMALE',
  mobile: '+16305550123',
  email: 'jamie@example.com',
  consent: true,
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const service = (fetchImpl: typeof fetch, timeoutMs = 5000) =>
  createHttpPatientProfileService({ baseUrl: 'https://api.example.test/api/v1', timeoutMs, fetchImpl });

describe('HTTP patient-profile adapter', () => {
  it('POSTs JSON once to /patient-profiles without credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(201, { data: { status: 'complete', message: 'ok' } }));
    const result = await service(fetchImpl).submit(payload);

    expect(result).toEqual({ ok: true, mode: 'http', outcome: 'complete', message: 'ok' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/v1/patient-profiles');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('omit');
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it('reports a 202 as saved but needing follow-up', async () => {
    const result = await service(vi.fn<typeof fetch>().mockResolvedValue(json(202, { data: { status: 'follow_up' } }))).submit(payload);
    expect(result).toMatchObject({ ok: true, outcome: 'follow_up' });
  });

  it('maps 422 field errors, including the date of birth', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(422, { message: 'x', errors: { date_of_birth: ['Your date of birth cannot be in the future.'], mobile: ['Bad'], unknown: ['?'] } }),
    );
    const result = await service(fetchImpl).submit(payload);
    expect(result).toMatchObject({ ok: false, kind: 'validation', fieldErrors: { dateOfBirth: 'Your date of birth cannot be in the future.', mobile: 'Bad' } });
  });

  it.each([
    [409, { status: 'busy', message: 'Busy.' }, 'busy'],
    [429, {}, 'rate_limited'],
    [503, { status: 'unavailable', message: 'Off' }, 'unavailable'],
    [503, { status: 'not_created', message: 'Not created.' }, 'not_created'],
    [500, {}, 'server'],
    [200, {}, 'server'],
  ])('maps HTTP %i to %s (never success)', async (status, body, kind) => {
    const result = await service(vi.fn<typeof fetch>().mockResolvedValue(json(status, body))).submit(payload);
    expect(result).toMatchObject({ ok: false, kind: kind });
  });

  it('never retries automatically after a network failure or timeout', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await service(fetchImpl).submit(payload)).toMatchObject({ ok: false, kind: 'network' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const hanging = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    expect(await service(hanging, 10).submit(payload)).toMatchObject({ ok: false, kind: 'timeout', message: expect.stringMatching(/may or may not/) });
    expect(hanging).toHaveBeenCalledTimes(1);
  });

  it('reads availability, and shows the form when it cannot be read', async () => {
    expect(await service(vi.fn<typeof fetch>().mockResolvedValue(json(200, { data: { available: false } }))).isAvailable()).toBe(false);
    expect(await service(vi.fn<typeof fetch>().mockResolvedValue(json(200, { data: { available: true } }))).isAvailable()).toBe(true);
    expect(await service(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))).isAvailable()).toBe(true);
  });

  it('never logs the payload', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await service(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('x'))).submit(payload);
    await service(vi.fn<typeof fetch>().mockResolvedValue(json(500, {}))).submit(payload);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
