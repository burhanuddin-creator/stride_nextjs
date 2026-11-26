import { describe, expect, it } from 'vitest';
import { addDays, addMonths, emptyScheduling, monthGrid, toBookingPayload, validateScheduling, zoneLabel } from './schedulingForm';
import type { SchedulingValues } from '../types/scheduling';

const NOW = new Date('2026-03-05T12:00:00Z');

const filled = (overrides: Partial<SchedulingValues> = {}): SchedulingValues => ({
  ...emptyScheduling(),
  date: '2026-03-09',
  slot: { start: '2026-03-09T15:00:00Z', time: '10:00 AM' },
  firstName: '  Jamie ',
  lastName: 'Rivera',
  dobMonth: '4',
  dobDay: '12',
  dobYear: '1985',
  sex: 'FEMALE',
  mobile: '630.555.0123',
  email: ' Jamie@Example.com ',
  paymentMode: 'INSURANCE_PAY',
  consent: true,
  ...overrides,
});

describe('scheduling form validation', () => {
  it('requires the appointment fields and the basic patient details', () => {
    expect(Object.keys(validateScheduling(emptyScheduling(), NOW)).sort()).toEqual(
      ['consent', 'dateOfBirth', 'email', 'firstName', 'lastName', 'mobile', 'paymentMode', 'sex', 'slot'].sort(),
    );
    expect(validateScheduling({ ...emptyScheduling(), date: '2026-03-09' }, NOW).slot).toBe('Choose a time.');
    expect(validateScheduling(filled(), NOW)).toEqual({});
  });

  it('refuses values outside the allowed lists', () => {
    const errors = validateScheduling(filled({ paymentMode: 'CASH' as never, mobile: '+44 20 7946 0958' }), NOW);
    expect(Object.keys(errors).sort()).toEqual(['mobile', 'paymentMode']);
  });

  it('builds the payload with normalised values and no server-controlled fields', () => {
    const payload = toBookingPayload(filled());
    expect(payload).toEqual({
      start: '2026-03-09T15:00:00Z',
      payment_mode: 'INSURANCE_PAY',
      first_name: 'Jamie',
      last_name: 'Rivera',
      date_of_birth: '1985-04-12',
      sex: 'FEMALE',
      mobile: '+16305550123',
      email: 'jamie@example.com',
      consent: true,
    });
    for (const key of ['clinic_id', 'doctor_id', 'patient_id', 'appointment_category', 'end_timestamp']) {
      expect(payload).not.toHaveProperty(key);
    }
  });
});

describe('calendar helpers (clinic-local dates, independent of the visitor time zone)', () => {
  it('adds days and months across month and year ends', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('lays out a month starting on the right weekday', () => {
    const grid = monthGrid('2026-03'); // March 1 2026 is a Sunday
    expect(grid[0][0]).toBe('2026-03-01');
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
    expect(monthGrid('2026-04')[0].slice(0, 3)).toEqual([null, null, null]); // April 1 2026 is a Wednesday
  });

  it('labels Central Time with the right abbreviation either side of daylight saving', () => {
    expect(zoneLabel('America/Chicago', '2026-03-06T15:00:00Z')).toBe('Central Time (CST)');
    expect(zoneLabel('America/Chicago', '2026-03-09T15:00:00Z')).toBe('Central Time (CDT)');
  });
});
