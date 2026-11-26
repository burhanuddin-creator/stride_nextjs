import { describe, expect, it } from 'vitest';
import {
  CONSENT_REQUIRED,
  MOBILE_FORMAT,
  MOBILE_REQUIRED,
  composeDateOfBirth,
  dateOfBirthError,
  emptyPatientProfile,
  normalizeUsMobile,
  toPatientProfilePayload,
  validatePatientProfile,
} from './patientProfileForm';
import { SEX_OPTIONS, type PatientProfileValues } from '../types/patientProfile';

const NOW = new Date(2026, 10, 14, 12); // 14 November 2026, local time

const valid: PatientProfileValues = {
  firstName: 'Jamie',
  lastName: 'Rivera',
  dobMonth: '4',
  dobDay: '12',
  dobYear: '1985',
  sex: 'FEMALE',
  mobile: '(630) 555-0123',
  email: ' Jamie@Example.com ',
  consent: true,
};

describe('validatePatientProfile', () => {
  it('requires every field and consent on an empty form, with no sex preselected', () => {
    expect(emptyPatientProfile().sex).toBe('');
    const errors = validatePatientProfile(emptyPatientProfile(), NOW);
    expect(Object.keys(errors).sort()).toEqual(['consent', 'dateOfBirth', 'email', 'firstName', 'lastName', 'mobile', 'sex']);
    expect(errors.mobile).toBe(MOBILE_REQUIRED);
    expect(errors.consent).toBe(CONSENT_REQUIRED);
  });

  it('accepts a complete profile', () => {
    expect(validatePatientProfile(valid, NOW)).toEqual({});
  });

  it('rejects names that are only spaces or punctuation', () => {
    expect(validatePatientProfile({ ...valid, firstName: ' .- ' }, NOW).firstName).toBe('Enter your first name.');
  });

  it('offers only documented SPRY sex values, with readable labels', () => {
    expect(SEX_OPTIONS.map((o) => o.value)).toEqual(['FEMALE', 'MALE', 'OTHER', 'UNDEFINED']);
    expect(SEX_OPTIONS.map((o) => o.label)).toEqual(['Female', 'Male', 'Other', 'Prefer not to say']);
    // @ts-expect-error — simulates a tampered value reaching the form state
    expect(validatePatientProfile({ ...valid, sex: 'OTHERS' }, NOW).sex).toMatch(/listed options/);
  });
});

describe('date of birth', () => {
  it('builds YYYY-MM-DD only for real calendar dates', () => {
    expect(composeDateOfBirth('4', '2', '1985')).toBe('1985-04-02');
    expect(composeDateOfBirth('2', '29', '2024')).toBe('2024-02-29');
    expect(composeDateOfBirth('2', '29', '2023')).toBeNull();
    expect(composeDateOfBirth('2', '30', '1985')).toBeNull();
    expect(composeDateOfBirth('13', '1', '1985')).toBeNull();
    expect(composeDateOfBirth('4', '12', '85')).toBeNull();
  });

  it('explains missing, partial, impossible, future and implausible dates', () => {
    expect(dateOfBirthError({ dobMonth: '', dobDay: '', dobYear: '' }, NOW)).toBe('Enter your date of birth.');
    expect(dateOfBirthError({ dobMonth: '4', dobDay: '', dobYear: '1985' }, NOW)).toMatch(/month, day and year/);
    expect(dateOfBirthError({ dobMonth: '2', dobDay: '30', dobYear: '1985' }, NOW)).toMatch(/real date/);
    expect(dateOfBirthError({ dobMonth: '11', dobDay: '15', dobYear: '2026' }, NOW)).toMatch(/future/);
    expect(dateOfBirthError({ dobMonth: '11', dobDay: '14', dobYear: '2026' }, NOW)).toBeNull(); // today
    expect(dateOfBirthError({ dobMonth: '1', dobDay: '1', dobYear: '1900' }, NOW)).toMatch(/valid date/);
  });
});

describe('US mobile', () => {
  it('normalises common US formats to E.164', () => {
    for (const value of ['(630) 555-0123', '630-555-0123', '630.555.0123', '6305550123', '+1 630 555 0123', '1 (630) 555-0123']) {
      expect(normalizeUsMobile(value), value).toBe('+16305550123');
    }
  });

  it('refuses international and malformed numbers', () => {
    for (const value of ['+44 20 7946 0958', '555-0123', '(130) 555-0123', 'call me']) {
      expect(normalizeUsMobile(value), value).toBeNull();
    }
    expect(validatePatientProfile({ ...valid, mobile: '+44 20 7946 0958' }, NOW).mobile).toBe(MOBILE_FORMAT);
  });
});

describe('toPatientProfilePayload', () => {
  it('maps to the API contract with normalised values', () => {
    expect(toPatientProfilePayload({ ...valid, firstName: ' Jamie ', mobile: '630.555.0123' })).toEqual({
      first_name: 'Jamie',
      last_name: 'Rivera',
      date_of_birth: '1985-04-12',
      sex: 'FEMALE',
      mobile: '+16305550123',
      email: 'jamie@example.com',
      consent: true,
    });
  });

  it('refuses an incomplete form', () => {
    expect(() => toPatientProfilePayload({ ...valid, consent: false })).toThrow();
  });
});
