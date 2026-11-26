import type {
  AppointmentField,
  AppointmentPolicy,
  AppointmentRequestPayload,
  EmailCodeResult,
  EmailConfirmResult,
  FieldErrors,
  SubmitResult,
} from '../../types/appointment';
import type { AppointmentService } from './types';

/** Laravel snake_case field names → form field names. */
const FIELD_MAP: Record<string, AppointmentField> = {
  first_name: 'firstName',
  last_name: 'lastName',
  care_type: 'careType',
  service_slug: 'serviceSlug',
  contact_value: 'contactValue',
  phone: 'phone',
  email_verification_token: 'contactValue',
  notes: 'notes',
  insurance_help: 'insuranceHelp',
};

const GENERIC_SERVER_MESSAGE =
  'We could not send your request because of a problem on our side. Your information is still in the form — please try again shortly.';

interface HttpOptions {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
  /**
   * Automatic retries after a timeout or network failure. Only used when an Idempotency-Key is
   * supplied, so a retry can never create a second appointment request on the server.
   */
  transientRetries?: number;
  retryDelayMs?: number;
}

type Attempt = { response: Response } | { failure: 'timeout' | 'network' };

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Maps a Laravel-style 422 body `{ message, errors: { field: [msg] } }` to form errors. */
export function mapValidationErrors(body: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (!isRecord(body) || !isRecord(body.errors)) return result;
  for (const [apiField, messages] of Object.entries(body.errors)) {
    const field = FIELD_MAP[apiField];
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (field && typeof first === 'string') result[field] = first;
  }
  return result;
}

export function createHttpAppointmentService({
  baseUrl,
  timeoutMs,
  fetchImpl,
  transientRetries = 1,
  retryDelayMs = 1000,
}: HttpOptions): AppointmentService {
  const doFetch = fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function attempt(payload: AppointmentRequestPayload, idempotencyKey?: string): Promise<Attempt> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    try {
      const response = await doFetch(`${baseUrl}/appointment-requests`, {
        method: 'POST',
        headers,
        credentials: 'omit',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return { response };
    } catch {
      // The payload is never logged here or anywhere else.
      return { failure: timedOut ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Small JSON POST for the verification endpoints (no automatic retries: a retry could send a second code). */
  async function postJson(path: string, body: unknown): Promise<{ response: Response; body: unknown } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'omit',
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return { response, body: await readJson(response) };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  const messageFrom = (body: unknown, field: string, fallback: string): string => {
    if (isRecord(body) && isRecord(body.errors)) {
      const first = (body.errors as Record<string, unknown>)[field];
      const text = Array.isArray(first) ? first[0] : first;
      if (typeof text === 'string') return text;
    }
    return isRecord(body) && typeof body.message === 'string' ? body.message : fallback;
  };

  const NETWORK = 'We could not reach our server. Please check your connection and try again.';

  // Read once per page load; only a successful answer is cached, so a failed read is retried next time.
  let policy: Promise<AppointmentPolicy> | null = null;
  async function readPolicy(): Promise<AppointmentPolicy | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${baseUrl}/appointment-config`, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'omit',
        signal: controller.signal,
      });
      const body = response.ok ? await readJson(response) : null;
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      return data && typeof data.email_verification_required === 'boolean'
        ? { emailVerificationRequired: data.email_verification_required }
        : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    mode: 'http',
    getPolicy() {
      if (!policy) {
        policy = readPolicy().then((result) => {
          if (result) return result;
          policy = null;
          // Unknown policy: show the stricter UI. The server enforces its own policy either way.
          return { emailVerificationRequired: true };
        });
      }
      return policy;
    },
    async requestEmailCode(email): Promise<EmailCodeResult> {
      const result = await postJson('/email-verifications', { email });
      if (!result) return { ok: false, message: NETWORK };
      const { response, body } = result;
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      if (response.status === 202 && data && typeof data.id === 'string') {
        return {
          ok: true,
          id: data.id,
          expiresInSeconds: typeof data.expires_in_seconds === 'number' ? data.expires_in_seconds : 600,
          resendInSeconds: typeof data.resend_available_in_seconds === 'number' ? data.resend_available_in_seconds : 60,
        };
      }
      if (response.status === 429) {
        const retry = isRecord(body) && typeof body.retry_after === 'number' ? body.retry_after : Number(response.headers.get('Retry-After'));
        return {
          ok: false,
          message: messageFrom(body, 'email', 'Too many codes have been requested. Please wait and try again.'),
          retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : undefined,
        };
      }
      if (response.status === 422) return { ok: false, message: messageFrom(body, 'email', 'Enter a valid email address.') };
      return { ok: false, message: 'We could not send a verification code right now. Please try again shortly.' };
    },

    async confirmEmailCode(verificationId, code): Promise<EmailConfirmResult> {
      const result = await postJson(`/email-verifications/${encodeURIComponent(verificationId)}/confirm`, { code });
      if (!result) return { ok: false, message: NETWORK };
      const { response, body } = result;
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      if (response.ok && data && typeof data.verification_token === 'string') return { ok: true, token: data.verification_token };
      if (response.status === 422) return { ok: false, message: messageFrom(body, 'code', 'That code is not correct.') };
      if (response.status === 429) return { ok: false, message: 'Too many attempts. Please wait a few minutes and try again.' };
      return { ok: false, message: 'We could not check the code right now. Please try again shortly.' };
    },

    async submit(payload, options = {}): Promise<SubmitResult> {
      const key = options.idempotencyKey;
      let result = await attempt(payload, key);
      // A timed-out request may still have been saved; retrying with the SAME key returns that
      // saved request instead of creating a duplicate. Without a key, never retry automatically.
      for (let retry = 0; key && 'failure' in result && retry < transientRetries; retry++) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        result = await attempt(payload, key);
      }

      if ('failure' in result) {
        if (result.failure === 'timeout') {
          return {
            ok: false,
            kind: 'timeout',
            message:
              'The request took too long and was stopped. It may not have been received. Your information is still in the form — please try again; trying again will not create a duplicate request.',
          };
        }
        return {
          ok: false,
          kind: 'network',
          message:
            'We could not reach our server. Please check your connection and try again. Your information is still in the form.',
        };
      }

      const { response } = result;

      if (response.ok) {
        const body = await readJson(response);
        const data = isRecord(body) && isRecord(body.data) ? body.data : null;
        const reference = data && typeof data.reference === 'string' ? data.reference : undefined;
        return { ok: true, mode: 'http', reference };
      }

      if (response.status === 422) {
        const body = await readJson(response);
        const fieldErrors = mapValidationErrors(body);
        return {
          ok: false,
          kind: 'validation',
          message:
            isRecord(body) && typeof body.message === 'string' && Object.keys(fieldErrors).length === 0
              ? body.message
              : 'Please correct the highlighted fields and try again.',
          fieldErrors,
        };
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const wait =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? ` Please wait about ${Math.ceil(retryAfter / 60)} minute${retryAfter > 60 ? 's' : ''} and try again.`
            : ' Please wait a few minutes and try again.';
        return { ok: false, kind: 'rate_limited', message: `Too many requests have been sent.${wait}` };
      }

      if (response.status === 409) {
        // The key was used for a different payload; the form discards the key so the next attempt gets a new one.
        return {
          ok: false,
          kind: 'conflict',
          message: 'Your request could not be matched to the earlier attempt. Please send it again.',
        };
      }

      return { ok: false, kind: 'server', message: GENERIC_SERVER_MESSAGE };
    },
  };
}
