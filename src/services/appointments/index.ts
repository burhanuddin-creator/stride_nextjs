import { env } from '../../config/env';
import { createHttpAppointmentService } from './httpAdapter';
import { createMockAppointmentService } from './mockAdapter';
import type { AppointmentService } from './types';

export type { AppointmentService } from './types';

/** Selected once at build time from NEXT_PUBLIC_USE_MOCK_API. There is no fallback between adapters. */
export const appointmentService: AppointmentService = env.useMockApi
  ? createMockAppointmentService()
  : createHttpAppointmentService({ baseUrl: env.apiBaseUrl, timeoutMs: env.apiTimeoutMs });
