import type { PatientProfileErrors, PatientProfileField, PatientProfileResult } from '../../types/patientProfile';
import type { PatientProfileService } from './types';

/** Laravel snake_case field names → form field names. */
const FIELD_MAP: Record<string, PatientProfileField> = {
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
  fetchImpl?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function mapPatientProfileErrors(body: unknown): PatientProfileErrors {
  const result: PatientProfileErrors = {};
  if (!isRecord(body) || !isRecord(body.errors)) return result;
  for (const [apiField, messages] of Object.entries(body.errors)) {
    const field = FIELD_MAP[apiField];
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (field && typeof first === 'string') result[field] = first;
  }
  return result;
}

const UNAVAILABLE = 'Online patient registration is not available right now. Please call the clinic to get started.';

export function createHttpPatientProfileService({ baseUrl, timeoutMs, fetchImpl }: HttpOptions): PatientProfileService {
  const doFetch = fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    mode: 'http',

    async isAvailable() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await doFetch(`${baseUrl}/patient-profile-config`, {
          method: 'GET',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'omit',
          signal: controller.signal,
        });
        const body = response.ok ? await readJson(response) : null;
        const data = isRecord(body) && isRecord(body.data) ? body.data : null;
        // Unknown: show the form; the server answers "unavailable" on submit if it is off.
        return data && typeof data.available === 'boolean' ? data.available : true;
      } catch {
        return true;
      } finally {
        clearTimeout(timer);
      }
    },

    async submit(payload): Promise<PatientProfileResult> {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      let response: Response;
      try {
        response = await doFetch(`${baseUrl}/patient-profiles`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'omit',
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch {
        // Never retried automatically and never logged: the profile may or may not have been created.
        return timedOut
          ? {
              ok: false,
              kind: 'timeout',
              message:
                'The request took too long and was stopped. Your profile may or may not have been created. Please wait a few minutes before trying again, or call the clinic.',
            }
          : { ok: false, kind: 'network', message: 'We could not reach our server. Please check your connection and try again.' };
      } finally {
        clearTimeout(timer);
      }

      const body = await readJson(response);
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : undefined;

      if (response.status === 201 || response.status === 202) {
        const outcome = response.status === 201 && data?.status !== 'follow_up' ? 'complete' : 'follow_up';
        return { ok: true, mode: 'http', outcome, message: typeof data?.message === 'string' ? data.message : undefined };
      }
      if (response.status === 422) {
        const fieldErrors = mapPatientProfileErrors(body);
        return {
          ok: false,
          kind: 'validation',
          message: Object.keys(fieldErrors).length ? 'Please correct the highlighted fields and try again.' : (message ?? 'Please check your details.'),
          fieldErrors,
        };
      }
      if (response.status === 409) {
        return { ok: false, kind: 'busy', message: message ?? 'These details are already being processed. Please wait a moment, then try again.' };
      }
      if (response.status === 429) {
        return { ok: false, kind: 'rate_limited', message: 'Too many attempts have been made. Please wait a few minutes and try again.' };
      }
      if (response.status === 503 && isRecord(body) && body.status === 'unavailable') {
        return { ok: false, kind: 'unavailable', message: UNAVAILABLE };
      }
      if (response.status === 503 && isRecord(body) && body.status === 'not_created') {
        return { ok: false, kind: 'not_created', message: message ?? 'We could not create your patient profile right now. Please try again later, or call the clinic.' };
      }
      return {
        ok: false,
        kind: 'server',
        message: 'We could not complete your request because of a problem on our side. Please try again later, or call the clinic.',
      };
    },
  };
}
