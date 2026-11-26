import { env } from '../../config/env';
import { createHttpSchedulingService } from './httpAdapter';
import { createMockSchedulingService } from './mockAdapter';
import type { SchedulingService } from './types';

export type { SchedulingService } from './types';

/** Selected once at build time from NEXT_PUBLIC_USE_MOCK_API (same switch as the other forms). No fallback between adapters. */
export const schedulingService: SchedulingService = env.useMockApi
  ? createMockSchedulingService()
  : createHttpSchedulingService({ baseUrl: env.apiBaseUrl, timeoutMs: env.apiTimeoutMs });
