import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpAppointmentService } from './httpAdapter';
import type { AppointmentRequestPayload } from '../../types/appointment';

const payload: AppointmentRequestPayload = {
  first_name: 'Jamie',
  last_name: 'Rivera',
  care_type: 'physical_therapy',
  service_slug: null,
  preferred_contact_method: 'email',
  contact_value: 'jamie@example.com',
  phone: '+16305550123',
  email_verification_token: 'tok-1',
  notes: null,
  insurance_help: false,
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function service(fetchImpl: typeof fetch, timeoutMs = 5000) {
  return createHttpAppointmentService({ baseUrl: 'https://api.example.test/api/v1', timeoutMs, fetchImpl, retryDelayMs: 0 });
}

const KEY = '0b9f6c1e-1d6a-4a43-9a51-5f3f2f3c9a10';

afterEach(() => {
  vi.useRealTimers();
});

describe('HTTP appointment adapter', () => {
  it('POSTs JSON to /appointment-requests and succeeds only on a 2xx response', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(201, { data: { reference: 'REQ-1' } }));
    const result = await service(fetchImpl).submit(payload);

    expect(result).toEqual({ ok: true, mode: 'http', reference: 'REQ-1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/v1/appointment-requests');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('omit');
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it('sends the Idempotency-Key header when one is supplied', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(201, { data: { reference: 'REQ-1' } }));
    await service(fetchImpl).submit(payload, { idempotencyKey: KEY });
    const headers = fetchImpl.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe(KEY);
  });

  it('retries once with the SAME key after a network failure and returns the saved request', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json(201, { data: { reference: 'STR-261028-ABCDEF' } }));

    const result = await service(fetchImpl).submit(payload, { idempotencyKey: KEY });

    expect(result).toEqual({ ok: true, mode: 'http', reference: 'STR-261028-ABCDEF' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchImpl.mock.calls) {
      expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe(KEY);
    }
  });

  it('retries a timeout at most once, then reports the timeout', async () => {
    vi.useFakeTimers();
    const hang = (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(hang);

    const pending = service(fetchImpl, 1000).submit(payload, { idempotencyKey: KEY });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(pending).resolves.toMatchObject({ ok: false, kind: 'timeout' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('never retries automatically without an Idempotency-Key', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    await service(fetchImpl).submit(payload);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports a 409 key/payload mismatch as a conflict, not success', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(409, { message: 'key reused' }));
    const result = await service(fetchImpl).submit(payload, { idempotencyKey: KEY });
    expect(result).toMatchObject({ ok: false, kind: 'conflict' });
  });

  it('maps Laravel 422 field errors to form fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(422, {
        message: 'The given data was invalid.',
        errors: {
          contact_value: ['The contact value must be a valid email address.'],
          first_name: ['Required.'],
          phone: ['Enter your phone number.'],
        },
      }),
    );
    const result = await service(fetchImpl).submit(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('validation');
    expect(result.fieldErrors).toEqual({
      contactValue: 'The contact value must be a valid email address.',
      firstName: 'Required.',
      phone: 'Enter your phone number.',
    });
  });

  it('reports 429 as rate limited', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(429, { message: 'Too Many Attempts.' }, { 'Retry-After': '120' }));
    const result = await service(fetchImpl).submit(payload);
    expect(result).toMatchObject({ ok: false, kind: 'rate_limited' });
  });

  it.each([500, 503, 404])('reports HTTP %i as a server failure, never success', async (status) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('oops', { status }));
    const result = await service(fetchImpl).submit(payload);
    expect(result).toMatchObject({ ok: false, kind: 'server' });
  });

  it('reports a network failure without falling back to success', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await service(fetchImpl).submit(payload);
    expect(result).toMatchObject({ ok: false, kind: 'network' });
  });

  it('aborts after the configured timeout', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const pending = service(fetchImpl, 1000).submit(payload);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toMatchObject({ ok: false, kind: 'timeout' });
  });
});

describe('HTTP appointment policy', () => {
  it('reads the server policy with a GET and caches a successful answer', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(200, { data: { email_verification_required: false } }));
    const http = service(fetchImpl);

    expect(await http.getPolicy()).toEqual({ emailVerificationRequired: false });
    expect(await http.getPolicy()).toEqual({ emailVerificationRequired: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/v1/appointment-config');
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('omit');
  });

  it('reports verification as required when the policy cannot be read, and tries again next time', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json(500, { message: 'x' }))
      .mockResolvedValueOnce(json(200, { data: { email_verification_required: 'no' } }))
      .mockResolvedValueOnce(json(200, { data: { email_verification_required: true } }));
    const http = service(fetchImpl);

    for (let i = 0; i < 4; i++) expect(await http.getPolicy()).toEqual({ emailVerificationRequired: true });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('sends no token field when the payload has none', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(201, { data: { reference: 'REQ-1' } }));
    const { email_verification_token: _omitted, ...withoutToken } = payload;
    await service(fetchImpl).submit(withoutToken);
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).not.toHaveProperty('email_verification_token');
  });
});

describe('HTTP email verification', () => {
  it('requests a code and maps the challenge', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json(202, { data: { id: 'abc', expires_in_seconds: 600, resend_available_in_seconds: 60 } }));
    const result = await service(fetchImpl).requestEmailCode('jamie@example.com');

    expect(result).toEqual({ ok: true, id: 'abc', expiresInSeconds: 600, resendInSeconds: 60 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/v1/email-verifications');
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'jamie@example.com' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('passes on the cooldown and send failures without pretending a code was sent', async () => {
    const cooldown = vi.fn<typeof fetch>().mockResolvedValue(json(429, { message: 'Please wait 42 seconds before requesting another code.', retry_after: 42 }));
    expect(await service(cooldown).requestEmailCode('a@example.com')).toEqual({
      ok: false,
      message: 'Please wait 42 seconds before requesting another code.',
      retryAfterSeconds: 42,
    });

    const unavailable = vi.fn<typeof fetch>().mockResolvedValue(json(503, { message: 'x' }));
    expect(await service(unavailable).requestEmailCode('a@example.com')).toMatchObject({ ok: false, message: expect.stringMatching(/could not send/) });

    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await service(offline).requestEmailCode('a@example.com')).toMatchObject({ ok: false });
  });

  it('confirms a code and returns the token, or the field message for a wrong code', async () => {
    const ok = vi.fn<typeof fetch>().mockResolvedValue(json(200, { data: { verification_token: 'tok', expires_in_seconds: 3600 } }));
    expect(await service(ok).confirmEmailCode('abc', '123456')).toEqual({ ok: true, token: 'tok' });
    expect(ok.mock.calls[0][0]).toBe('https://api.example.test/api/v1/email-verifications/abc/confirm');

    const wrong = vi.fn<typeof fetch>().mockResolvedValue(json(422, { message: 'x', errors: { code: ['That code is not correct. You have 4 attempts left.'] } }));
    expect(await service(wrong).confirmEmailCode('abc', '000000')).toEqual({
      ok: false,
      message: 'That code is not correct. You have 4 attempts left.',
    });
  });

  it('maps a rejected verification token on submit to the email field', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(422, { message: 'x', errors: { email_verification_token: ['Your email verification has expired or does not match this address. Please verify your email again.'] } }),
    );
    const result = await service(fetchImpl).submit(payload);
    expect(result).toMatchObject({ ok: false, kind: 'validation', fieldErrors: { contactValue: expect.stringMatching(/verify your email again/) } });
  });
});
