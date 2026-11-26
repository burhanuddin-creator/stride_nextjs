import { describe, expect, it } from 'vitest';
import {
  EMAIL_NOT_VERIFIED,
  PHONE_FORMAT,
  PHONE_REQUIRED,
  emptyFormValues,
  normalizeEmail,
  normalizePhone,
  phoneError,
  toPayload,
  validateAppointmentForm,
} from './appointmentForm';
import type { AppointmentFormValues } from '../types/appointment';

const valid: AppointmentFormValues = {
  firstName: 'Jamie',
  lastName: 'Rivera',
  careType: 'wellness',
  serviceSlug: '',
  contactValue: 'jamie@example.com',
  phone: '(630) 555-0123',
  notes: '',
  insuranceHelp: false,
};

describe('validateAppointmentForm', () => {
  it('requires every required field on an empty form', () => {
    const errors = validateAppointmentForm(emptyFormValues());
    expect(Object.keys(errors).sort()).toEqual(['careType', 'contactValue', 'firstName', 'lastName', 'phone']);
    expect(errors.contactValue).toBe('Enter your email address.');
    expect(errors.phone).toBe(PHONE_REQUIRED);
  });

  it('accepts a complete request once the email is verified', () => {
    expect(validateAppointmentForm(valid, true)).toEqual({});
  });

  it('requires the email to be verified', () => {
    expect(validateAppointmentForm(valid, false).contactValue).toBe(EMAIL_NOT_VERIFIED);
  });

  it('does not ask for verification when the server policy is off, but still checks the format', () => {
    expect(validateAppointmentForm(valid, false, false)).toEqual({});
    expect(validateAppointmentForm({ ...valid, contactValue: 'jamie@' }, false, false).contactValue).toMatch(/name@example.com/);
    expect(validateAppointmentForm({ ...valid, contactValue: '' }, false, false).contactValue).toBe('Enter your email address.');
  });

  it('checks the email format before asking for verification', () => {
    expect(validateAppointmentForm({ ...valid, contactValue: '(630) 555-0123' }, true).contactValue).toMatch(/name@example.com/);
  });

  it('limits notes to 500 characters', () => {
    expect(validateAppointmentForm({ ...valid, notes: 'a'.repeat(500) }, true).notes).toBeUndefined();
    expect(validateAppointmentForm({ ...valid, notes: 'a'.repeat(501) }, true).notes).toMatch(/500/);
  });
});

describe('normalizeEmail (mirrors the backend)', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Jamie@Example.COM ')).toBe('jamie@example.com');
  });
});

describe('toPayload', () => {
  it('maps to the snake_case contract with email as the contact method and the verification token', () => {
    expect(toPayload({ ...valid, firstName: ' Jamie ', insuranceHelp: true }, 'tok-1')).toEqual({
      first_name: 'Jamie',
      last_name: 'Rivera',
      care_type: 'wellness',
      service_slug: null,
      preferred_contact_method: 'email',
      contact_value: 'jamie@example.com',
      phone: '+16305550123',
      email_verification_token: 'tok-1',
      notes: null,
      insurance_help: true,
    });
  });

  it('omits the token when verification is not required', () => {
    const payload = toPayload(valid, null);
    expect(payload).not.toHaveProperty('email_verification_token');
    expect(payload.contact_value).toBe('jamie@example.com');
  });

  it('includes a selected service slug', () => {
    expect(toPayload({ ...valid, serviceSlug: 'gait-analysis' }, 'tok-1').service_slug).toBe('gait-analysis');
  });
});

describe('service selection validation', () => {
  it('accepts no service or a canonical slug, and rejects anything else', () => {
    expect(validateAppointmentForm({ ...valid, serviceSlug: '' }, true).serviceSlug).toBeUndefined();
    expect(validateAppointmentForm({ ...valid, serviceSlug: 'iastm' }, true).serviceSlug).toBeUndefined();
    // @ts-expect-error — simulates a tampered value reaching the form state
    expect(validateAppointmentForm({ ...valid, serviceSlug: 'acupuncture' }, true).serviceSlug).toMatch(/listed services/);
  });
});

describe('phone (required, US formats, same rules as the API)', () => {
  it('normalises common US formats to E.164', () => {
    for (const value of ['(630) 555-0123', '630-555-0123', '630.555.0123', '630 555 0123', '6305550123', '+1 630 555 0123', '1 (630) 555-0123', ' +1-630-555-0123 ']) {
      expect(normalizePhone(value), value).toBe('+16305550123');
    }
  });

  it('accepts an international number only with a leading +', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    expect(normalizePhone('44 20 7946 0958')).toBeNull();
  });

  it('rejects missing, short, long and malformed numbers', () => {
    expect(phoneError('')).toBe(PHONE_REQUIRED);
    expect(phoneError('   ')).toBe(PHONE_REQUIRED);
    for (const value of ['555-0123', '12345', '(130) 555-0123', '(630) 155-0123', '630-555-012', '630-555-01234', 'call me', '630-CALL-NOW']) {
      expect(phoneError(value), value).toBe(PHONE_FORMAT);
    }
    expect(phoneError('(630) 555-0123')).toBeNull();
  });

  it('blocks submission without a valid phone even when the email is fine', () => {
    expect(validateAppointmentForm({ ...valid, phone: '' }, true).phone).toBe(PHONE_REQUIRED);
    expect(validateAppointmentForm({ ...valid, phone: '555' }, true).phone).toBe(PHONE_FORMAT);
    expect(validateAppointmentForm({ ...valid, contactValue: '' }, true).contactValue).toBe('Enter your email address.');
  });

  it('sends the normalised phone and keeps email as a separate field', () => {
    const payload = toPayload({ ...valid, phone: '630.555.0123', careType: 'physical_therapy' }, null);
    expect(payload.phone).toBe('+16305550123');
    expect(payload.contact_value).toBe('jamie@example.com');
    expect(payload.preferred_contact_method).toBe('email');
  });
});
