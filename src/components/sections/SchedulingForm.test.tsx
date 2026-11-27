import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    { date: '2026-03-12', slots: [{ start: '2026-03-12T12:00:00Z', time: '7:00 AM' }] },
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
  render(<SchedulingForm service={service} />);
  return { user };
}

type User = ReturnType<typeof userEvent.setup>;

const stepHeading = (n: number) => screen.getByRole('heading', { level: 3, name: new RegExp(`^Step ${n} of 3`) });
const next = (user: User) => user.click(screen.getByRole('button', { name: 'Continue' }));
const confirm = (user: User) => user.click(screen.getByRole('button', { name: /Confirm Appointment/ }));

async function chooseTime(user: User, time = '10:00 AM') {
  await user.click(await screen.findByRole('button', { name: /Monday, March 9, 2026, 2 times available/ }));
  await user.click(screen.getByRole('radio', { name: time }));
}

async function fillDetails(user: User) {
  await user.type(screen.getByLabelText(/First name/), 'Jamie');
  await user.type(screen.getByLabelText(/Last name/), 'Rivera');
  await user.selectOptions(screen.getByLabelText('Month'), 'April');
  await user.type(screen.getByLabelText('Day'), '12');
  await user.type(screen.getByLabelText('Year'), '1985');
  await user.selectOptions(screen.getByLabelText(/^Sex/), 'Female');
  await user.type(screen.getByLabelText(/US mobile number/), '630.555.0123');
  await user.type(screen.getByLabelText(/Email address/), 'jamie@example.com');
}

async function finish(user: User, payment: 'Self-pay' | 'Insurance' = 'Self-pay') {
  await user.click(screen.getByRole('radio', { name: payment }));
  await user.click(screen.getByLabelText(/book this appointment/));
}

/** Steps 1–3 filled in; the visitor is on the review step with everything valid. */
async function toReview(user: User, payment: 'Self-pay' | 'Insurance' = 'Self-pay') {
  await chooseTime(user);
  await next(user);
  await fillDetails(user);
  await next(user);
  await finish(user, payment);
}

describe('SchedulingForm', () => {
  it('says online booking is off and offers the phone and request form when the server has it disabled', async () => {
    setup(fakeService(undefined, { available: false }));
    expect(await screen.findByText(/Online booking is not available right now/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use the Request Form' })).toHaveAttribute('href', '/contact#request-form');
    expect(screen.queryByRole('button', { name: /Confirm Appointment|Continue/ })).not.toBeInTheDocument();
  });

  it('shows three steps with progress, and a summary with provider, visit, duration and clinic time zone', async () => {
    const service = fakeService();
    setup(service);
    await screen.findByRole('button', { name: /Friday, March 6, 2026, 1 time available/ });

    const progress = screen.getByRole('list', { name: 'Booking steps' });
    expect(progress.querySelectorAll('li')).toHaveLength(3);
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Step 1: Date & time');
    expect(stepHeading(1)).toHaveTextContent('Choose a date and time');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    // Step 1 asks only for the time: no patient fields yet, no visit questions.
    expect(screen.queryByLabelText(/First name/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reason for visit|Main goal|not a diagnosis/)).not.toBeInTheDocument();

    const summary = screen.getByRole('complementary', { name: 'Your appointment' });
    expect(summary).toHaveTextContent('Initial Evaluation · 45 minutes');
    expect(summary).toHaveTextContent('Synthetic Provider, PT');
    expect(summary).toHaveTextContent('Central Time (CST)');
    expect(summary).toHaveTextContent('Not chosen yet');
    expect(service.getAvailability).toHaveBeenCalledWith('2026-03-05', '2026-03-31');
  });

  it('shows provider details on click, only real times (early ones included) and the clinic time zone', async () => {
    const { user } = setup(fakeService());
    const about = await screen.findByRole('button', { name: 'About this provider' });
    expect(about).toHaveAttribute('aria-expanded', 'false');
    await user.click(about);
    expect(about).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/is the provider who sees new patients/)).toBeInTheDocument();
    expect(screen.queryByText(/Any Available/i)).not.toBeInTheDocument();

    expect(await screen.findByRole('button', { name: /Thursday, March 5, 2026, no times available/ })).toBeDisabled();
    expect(screen.getByText('Choose a date to see its available times.')).toBeInTheDocument();
    // Times are shown exactly as the server labels them, early-morning ones too.
    await user.click(screen.getByRole('button', { name: /Thursday, March 12, 2026, 1 time available/ }));
    expect(screen.getByRole('group', { name: /Available times on Thursday, March 12, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '7:00 AM' })).toBeInTheDocument();

    await chooseTime(user);
    expect(screen.getByRole('button', { name: /Monday, March 9, 2026/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: '10:00 AM' })).toBeChecked();
    expect(screen.getByText(/Times are shown in clinic time/)).toHaveTextContent('Central Time (CDT)');
    const summary = screen.getByRole('complementary', { name: 'Your appointment' });
    expect(summary).toHaveTextContent('Monday, March 9, 2026');
    expect(summary).toHaveTextContent('10:00 AM');
  });

  it('validates each step before moving on, and sends nothing', async () => {
    const service = fakeService();
    const { user } = setup(service);
    await screen.findByRole('button', { name: /Friday, March 6, 2026/ });

    await next(user);
    let summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('Please fix this problem');
    expect(summary).toHaveTextContent('Choose a date, then a time.');
    expect(stepHeading(1)).toBeInTheDocument();

    await chooseTime(user);
    expect(screen.queryByText('Choose a date, then a time.')).not.toBeInTheDocument(); // corrected in place
    await next(user);
    await waitFor(() => expect(stepHeading(2)).toHaveFocus());

    await next(user);
    summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('Please fix these 6 problems');
    expect(screen.getByLabelText(/First name/)).toHaveAttribute('aria-invalid', 'true');
    expect(stepHeading(2)).toBeInTheDocument();

    await fillDetails(user);
    await next(user);
    await waitFor(() => expect(stepHeading(3)).toHaveFocus());
    await confirm(user);
    summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Please fix these 2 problems');
    expect(summary).toHaveTextContent('Choose how you plan to pay.');
    expect(service.book).not.toHaveBeenCalled();
  });

  it('keeps every answer when moving back and forth, and the review links back to each step', async () => {
    const { user } = setup(fakeService());
    await toReview(user);

    const review = screen.getByRole('region', { name: 'Review your booking' });
    expect(review).toHaveTextContent('Monday, March 9, 2026 at 10:00 AM');
    expect(review).toHaveTextContent('Jamie Rivera');
    expect(review).toHaveTextContent('Born April 12, 1985 · Female');
    expect(review).toHaveTextContent('630.555.0123 · jamie@example.com');

    await user.click(screen.getByRole('button', { name: 'Change your details' }));
    await waitFor(() => expect(stepHeading(2)).toHaveFocus());
    expect(screen.getByLabelText(/First name/)).toHaveValue('Jamie');
    expect(screen.getByLabelText('Year')).toHaveValue('1985');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: '10:00 AM' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '2:00 PM' }));
    await next(user);
    await next(user);
    expect(screen.getByRole('radio', { name: 'Self-pay' })).toBeChecked();
    expect(screen.getByLabelText(/book this appointment/)).toBeChecked();
    expect(screen.getByRole('region', { name: 'Review your booking' })).toHaveTextContent('Monday, March 9, 2026 at 2:00 PM');
  });

  it('books once with only the visitor-chosen fields and confirms only after the server does', async () => {
    const service = fakeService();
    const { user } = setup(service);
    await toReview(user, 'Insurance');
    expect(screen.getByText(/does not check your eligibility or guarantee coverage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Appointment' })).toBeInTheDocument();

    await confirm(user);
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

  it('shows "Booking…" while waiting and accepts one confirmation only', async () => {
    let resolve!: (r: BookingResult) => void;
    const service = fakeService(() => new Promise((r) => (resolve = r)));
    const { user } = setup(service);
    await toReview(user);
    await confirm(user);

    const busy = screen.getByRole('button', { name: 'Booking…' });
    expect(busy).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    fireEvent.submit(busy.closest('form')!);
    expect(service.book).toHaveBeenCalledTimes(1);
    resolve(BOOKED);
    await screen.findByRole('heading', { name: 'Your appointment is booked.' });
  });

  it('ignores the second click of a double-click on Continue that lands on Confirm', async () => {
    const service = fakeService();
    const { user } = setup(service);
    await toReview(user);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Appointment' }), { detail: 2 });
    expect(service.book).not.toHaveBeenCalled();
    await confirm(user);
    await waitFor(() => expect(service.book).toHaveBeenCalledTimes(1));
  });

  it('returns to the times, refreshed, and keeps the details when the time was taken', async () => {
    const service = fakeService(async () => ({ ok: false, kind: 'slot_unavailable', message: 'That time is no longer available. Please choose another time.' }));
    const { user } = setup(service);
    await toReview(user);
    await confirm(user);

    const notice = await screen.findByText('That time is no longer available. Please choose another time.');
    await waitFor(() => expect(notice.closest('[role="alert"]')).toHaveFocus());
    expect(stepHeading(1)).toBeInTheDocument();
    await waitFor(() => expect(service.getAvailability).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('radio', { name: '10:00 AM' })).not.toBeChecked();
    await chooseTime(user, '2:00 PM');
    await next(user);
    expect(screen.getByLabelText(/First name/)).toHaveValue('Jamie');
    await next(user);
    expect(screen.getByLabelText(/book this appointment/)).toBeChecked();
  });

  it('shows server field errors on the step that has the field', async () => {
    const service = fakeService(async () => ({ ok: false, kind: 'validation', message: 'Check the form.', fieldErrors: { email: 'Enter a valid email address.' } }));
    const { user } = setup(service);
    await toReview(user);
    await confirm(user);
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Enter a valid email address.');
    expect(stepHeading(2)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a focused error, keeps the answers and reuses the same Idempotency-Key when the same booking is retried', async () => {
    let calls = 0;
    const service = fakeService(async () => (++calls === 1 ? { ok: false, kind: 'network', message: 'We could not reach our server.' } : BOOKED));
    const { user } = setup(service);
    await toReview(user);
    await confirm(user);
    const alert = await screen.findByText(/We could not reach our server/);
    await waitFor(() => expect(alert.closest('[role="alert"]')).toHaveFocus());
    expect(alert.closest('[role="alert"]')).toHaveTextContent('Your appointment was not booked.');
    await confirm(user);
    await screen.findByRole('heading', { name: 'Your appointment is booked.' });

    expect(service.book.mock.calls[0][1]).toBe(service.book.mock.calls[1][1]);
  });

  it('shows "not confirmed" wording for pending outcomes, never "booked"', async () => {
    const { user } = setup(fakeService(async () => ({ ok: true, mode: 'http', outcome: 'pending', message: 'We could not confirm your booking online.' })));
    await toReview(user);
    await confirm(user);

    expect(await screen.findByRole('heading', { name: 'Your appointment is not confirmed yet.' })).toHaveFocus();
    expect(screen.queryByText(/is booked/)).not.toBeInTheDocument();
  });

  it('is keyboard operable end to end and stores nothing in the browser', async () => {
    const { user } = setup(fakeService());
    const firstDay = await screen.findByRole('button', { name: /Friday, March 6, 2026/ });
    // The calendar is one Tab stop; arrow keys move between days that have times.
    expect(firstDay).toHaveAttribute('tabindex', '0');
    firstDay.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Monday, March 9, 2026/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('radio', { name: '10:00 AM' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('radio', { name: '10:00 AM' })).toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '2:00 PM' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await fillDetails(user);
    await user.keyboard('{Enter}'); // Enter in a field continues
    await waitFor(() => expect(stepHeading(3)).toHaveFocus());

    screen.getByRole('radio', { name: 'Self-pay' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Insurance' })).toBeChecked();
    screen.getByLabelText(/book this appointment/).focus();
    await user.keyboard(' ');
    screen.getByRole('button', { name: 'Confirm Appointment' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'Your appointment is booked.' });
    expect(JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })).not.toMatch(/Jamie|1985|555/);
  });
});
