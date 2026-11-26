import type { PatientProfilePayload, PatientProfileResult } from '../../types/patientProfile';

/**
 * Boundary between the patient-profile form and the Laravel API (SPRY phase one: create the patient only). The browser
 * never talks to SPRY and never receives a SPRY patient ID; all credentials and SPRY calls stay in Laravel.
 */
export interface PatientProfileService {
  readonly mode: 'mock' | 'http';
  /** Whether online registration is switched on. If it cannot be read, the form is still shown (the server decides). */
  isAvailable(): Promise<boolean>;
  /** One POST, never retried automatically (a retry could create a second SPRY patient). */
  submit(payload: PatientProfilePayload): Promise<PatientProfileResult>;
}
