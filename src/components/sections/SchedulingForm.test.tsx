import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SchedulingForm } from './SchedulingForm';
import type { SchedulingService } from '../../services/scheduling';
import type { AvailabilityResult, BookingPayload, BookingResult, SchedulingConfig } from '../../types/scheduling';

const CONFIG: SchedulingConfig = {
  available: true,
  providerName: 'Synthetic Provider, PT',
  appointmentType: 'Initial Evaluation',
  durationMinutes: 45,
  timezone: 'America/Chicago',
  firstDate: '2026-03-05',
  lastDate: '2026-04-04',
};

const DAYS: AvailabilityResult = {
  ok: true,
  days: [
    { date: '2026-03-06', slots: [{ start: '2026-03-06T15:00:00Z', time: '9:00 AM' }] },
    { date: '2026-03-09', slots: [{ start: '2026-03-09T15:00:00Z', time: '10:00 AM' }, { start: '2026-03-09T19:00:00Z', time: '2:00 PM' }] },
  ],
};

const BOOKED: BookingResult = { ok: true, mode: 'http', outcome: 'booked', startsAtLabel: 'Monday, March 9, 2026 at 10:00 AM CDT', durationMinutes: 45 };

function fakeService(book: (p: BookingPayload, key: string) => Promise<BookingResult> = async () => BOOKED, config: SchedulingConfig = CONFIG) {
  return {
    mode: 'http',
    getConfig: vi.fn(async () => config),
    getAvailability: vi.fn(async () => DAYS),
    book: vi.fn(book),
  } satisfies SchedulingService;
}

function setup(service: SchedulingService) {
  const user = userEvent.setup();
  render(
    <SchedulingForm service={service} />,
  );
  return { user };
}

type User = ReturnType<typeof userEvent.setup>;

async function openCalendar(user: User) {
  await user.click(await screen.findByRole('button', { name: /Date: / }));
}

async function chooseTime(user: User, time = '10:00 AM') {
  await openCalendar(user);
  await user.click(await screen.findByRole('button', { name: /Monday, March 9, 2026, 2 times available/ }));
  await user.click(screen.getByRole('radio', { name: time }));
}

async function fillDetails(user: User, payment: 'Self-pay' | 'Insurance' = 'Self-pay') {
  await user.click(screen.getByRole('radio', { name: payment }));
  await user.type(screen.getByLabelText(/First name/), 'Jamie');
  await user.type(screen.getByLabelText(/Last name/), 'Rivera');
  await user.selectOptions(screen.getByLabelText('Month'), 'April');
  await user.type(screen.getByLabelText('Day'), '12');
  await user.type(screen.getByLabelText('Year'), '1985');
  await user.selectOptions(screen.getByLabelText(/^Sex/), 'Female');
  await user.type(screen.getByLabelText(/US mobile number/), '630.555.0123');
  await user.type(screen.getByLabelText(/Email address/), 'jamie@example.com');
  await user.click(screen.getByLabelText(/book this appointment/));
}

describe('SchedulingForm', () => {
  it('says online booking is off and offers the phone when the server has it disabled', async () => {
    setup(fakeService(undefined, { available: false }));
    expect(await screen.findByText(/Online booking is not available right now/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Book/ })).not.toBeInTheDocument();
  });

  it('is one form: appointment (time, payment) and patient details only — no steps or visit questions', async () => {
    const service = fakeService();
    setup(service);
    await screen.findByRole('button', { name: /Date: Choose a date/ });

    expect(screen.queryByRole('button', { name: /Continue/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Reason for visit|Main goal|not a diagnosis/)).not.toBeInTheDocument();
    for (const label of [/First name/, /Last name/, /^Sex/, /US mobile number/, /Email address/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('group', { name: /Date of birth/ })).toBeInTheDocument();
    const payment = screen.getByRole('group', { name: /Payment/ });
    // Order: date → details (mobile, then email) → payment last.
    const email = screen.getByLabelText(/Email address/);
    const mobile = screen.getByLabelText(/US mobile number/);
    expect(mobile.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(email.compareDocumentPosition(payment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Synthetic Provider, PT')).toBeInTheDocument();
    expect(screen.getByText('Initial Evaluation').closest('p')).toHaveTextContent('Initial Evaluation, 45 minutes');
    expect(service.getAvailability).toHaveBeenCalledWith('2026-03-05', '2026-03-31');
  });

  it('shows provider details on click, only real times, and the clinic time zone', async () => {
    const { user } = setup(fakeService());
    const about = await screen.findByRole('button', { name: 'About this provider' });
    expect(about).toHaveAttribute('aria-expanded', 'false');
    await user.click(about);
    expect(about).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText(/Any Available/i)).not.toBeInTheDocument();

    const dateField = screen.getByRole('button', { name: /Date: Choose a date/ });
    expect(dateField).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument(); // the calendar only opens on demand
    await user.click(dateField);
    expect(screen.getByRole('dialog', { name: 'Choose a date' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Friday, March 6, 2026, 1 time available/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Thursday, March 5, 2026, no times available/ })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(dateField).toHaveFocus();
    await chooseTime(user);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // closes after a date is picked
    expect(screen.getByRole('button', { name: /Date: Monday, March 9, 2026/ })).toBeInTheDocument();
    expect(screen.getByText(/Selected:/)).toHaveTextContent('Monday, March 9, 2026 at 10:00 AM (Central Time (CDT))');
  });

  it('lists every missing field in a focused error summary and sends nothing', async () => {
    const service = fakeService();
    const { user } = setup(service);
    await screen.findByRole('button', { name: /Date: Choose a date/ });

    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('Please fix these 9 problems');
    expect(summary).toHaveTextContent('Choose a date, then a time.');
    expect(service.book).not.toHaveBeenCalled();
  });

  it('books once with only the visitor-chosen fields and confirms only after the server does', async () => {
    const service = fakeService();
    const { user } = setup(service);
    await chooseTime(user);
    await fillDetails(user, 'Insurance');
    expect(screen.getByText(/does not check your eligibility or guarantee coverage/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));
    expect(await screen.findByRole('heading', { name: 'Your appointment is booked.' })).toHaveFocus();
    expect(screen.getByText(/Monday, March 9, 2026 at 10:00 AM CDT/)).toBeInTheDocument();
    expect(screen.getByText(/1131 Fairview Ave/)).toBeInTheDocument();

    expect(service.book).toHaveBeenCalledTimes(1);
    const [payload, key] = service.book.mock.calls[0];
    expect(payload).toEqual({
      start: '2026-03-09T15:00:00Z', payment_mode: 'INSURANCE_PAY', first_name: 'Jamie', last_name: 'Rivera',
      date_of_birth: '1985-04-12', sex: 'FEMALE', mobile: '+16305550123', email: 'jamie@example.com', consent: true,
    });
    expect(key).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  });

  it('refreshes the times and keeps the details when the time was taken', async () => {
    const service = fakeService(async () => ({ ok: false, kind: 'slot_unavailable', message: 'That time is no longer available. Please choose another time.' }));
    const { user } = setup(service);
    await chooseTime(user);
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));

    const notice = await screen.findByText('That time is no longer available. Please choose another time.');
    await waitFor(() => expect(notice.closest('[role="alert"]')).toHaveFocus());
    await waitFor(() => expect(service.getAvailability).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText(/First name/)).toHaveValue('Jamie');
    expect(screen.getByLabelText(/book this appointment/)).toBeChecked();
    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
  });

  it('reuses the same Idempotency-Key when the same booking is retried', async () => {
    let calls = 0;
    const service = fakeService(async () => (++calls === 1 ? { ok: false, kind: 'network', message: 'We could not reach our server.' } : BOOKED));
    const { user } = setup(service);
    await chooseTime(user);
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));
    expect(await screen.findByText(/We could not reach our server/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));
    await screen.findByRole('heading', { name: 'Your appointment is booked.' });

    expect(service.book.mock.calls[0][1]).toBe(service.book.mock.calls[1][1]);
  });

  it('shows "not confirmed" wording for pending outcomes, never "booked"', async () => {
    const { user } = setup(fakeService(async () => ({ ok: true, mode: 'http', outcome: 'pending', message: 'We could not confirm your booking online.' })));
    await chooseTime(user);
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));

    expect(await screen.findByRole('heading', { name: 'Your appointment is not confirmed yet.' })).toHaveFocus();
    expect(screen.queryByText(/is booked/)).not.toBeInTheDocument();
  });

  it('is keyboard operable and stores nothing in the browser', async () => {
    const { user } = setup(fakeService());
    await screen.findByRole('button', { name: /Date: Choose a date/ });
    screen.getByRole('radio', { name: 'Self-pay' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Insurance' })).toBeChecked();
    await chooseTime(user);
    await fillDetails(user, 'Insurance');
    await user.click(screen.getByRole('button', { name: /Book Appointment/ }));
    await screen.findByRole('heading', { name: 'Your appointment is booked.' });
    expect(JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })).not.toMatch(/Jamie|1985|555/);
  });
});
