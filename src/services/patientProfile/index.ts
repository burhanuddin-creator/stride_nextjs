import { env } from '../../config/env';
import { createHttpPatientProfileService } from './httpAdapter';
import { createMockPatientProfileService } from './mockAdapter';
import type { PatientProfileService } from './types';

export type { PatientProfileService } from './types';

/** Selected once at build time from NEXT_PUBLIC_USE_MOCK_API (same switch as the request form). No fallback between adapters. */
export const patientProfileService: PatientProfileService = env.useMockApi
  ? createMockPatientProfileService()
  : createHttpPatientProfileService({ baseUrl: env.apiBaseUrl, timeoutMs: env.apiTimeoutMs });
