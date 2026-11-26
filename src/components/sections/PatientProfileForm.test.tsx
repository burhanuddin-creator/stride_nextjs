import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PatientProfileForm } from './PatientProfileForm';
import { createMockPatientProfileService } from '../../services/patientProfile/mockAdapter';
import type { PatientProfileService } from '../../services/patientProfile';
import type { PatientProfileResult } from '../../types/patientProfile';
import ContactPage from '../../views/ContactPage';
import ScheduleAppointmentPage from '../../views/ScheduleAppointmentPage';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), usePathname: () => '/contact' }));

function httpService(result: PatientProfileResult | (() => Promise<PatientProfileResult>), available = true): PatientProfileService {
  return {
    mode: 'http',
    isAvailable: vi.fn(async () => available),
    submit: vi.fn(typeof result === 'function' ? result : async () => result),
  };
}

function setup(service: PatientProfileService = createMockPatientProfileService(0)) {
  const user = userEvent.setup();
  render(
    <PatientProfileForm service={service} />,
  );
  return { user };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/First name/), 'Jamie');
  await user.type(screen.getByLabelText(/Last name/), 'Rivera');
  await user.selectOptions(screen.getByLabelText('Month'), 'April');
  await user.type(screen.getByLabelText('Day'), '12');
  await user.type(screen.getByLabelText('Year'), '1985');
  await user.selectOptions(screen.getByLabelText(/^Sex/), 'Female');
  await user.type(screen.getByLabelText(/US mobile number/), '630.555.0123');
  await user.type(screen.getByLabelText(/Email address/), 'Jamie@Example.com');
  await user.click(screen.getByLabelText(/send the details above to SPRY/));
}

describe('PatientProfileForm', () => {
  it('collects only the profile fields, with no sex preselected and no appointment choices', async () => {
    setup();
    expect(screen.getByRole('group', { name: /Date of birth/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Sex/)).toHaveValue('');
    expect(within(screen.getByLabelText(/^Sex/)).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose one', 'Female', 'Male', 'Other', 'Prefer not to say',
    ]);
    expect(screen.getByLabelText(/send the details above to SPRY/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Create Patient Profile/ })).toBeInTheDocument();
    expect(screen.getByText(/does not book an appointment/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/time|provider|appointment date|notes/i)).not.toBeInTheDocument();
  });

  it('shows an error summary and inline errors, and sends nothing, when fields are missing', async () => {
    const service = httpService({ ok: true, mode: 'http', outcome: 'complete' });
    const { user } = setup(service);
    await waitFor(() => expect(service.isAvailable).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /Create Patient Profile/ }));
    const summary = await screen.findByRole('alert');
    expect(within(summary).getByText(/these 7 problems/)).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/US mobile number/)).toHaveAccessibleDescription(/Enter your mobile number/);
    expect(service.submit).not.toHaveBeenCalled();
  });

  it('rejects a future date of birth and a non-US mobile number', async () => {
    const service = httpService({ ok: true, mode: 'http', outcome: 'complete' });
    const { user } = setup(service);
    await fillValid(user);
    await user.clear(screen.getByLabelText('Year'));
    await user.type(screen.getByLabelText('Year'), String(new Date().getFullYear() + 1));
    await user.clear(screen.getByLabelText(/US mobile number/));
    await user.type(screen.getByLabelText(/US mobile number/), '+44 20 7946 0958');
    await user.click(screen.getByRole('button', { name: /Create Patient Profile/ }));

    expect(await screen.findByText('Your date of birth cannot be in the future.', { selector: 'a' })).toBeInTheDocument();
    expect(screen.getByText(/10-digit US mobile number/, { selector: 'a' })).toBeInTheDocument();
    expect(service.submit).not.toHaveBeenCalled();
  });

  it('sends the normalised payload once and confirms that nothing is booked', async () => {
    const service = httpService({ ok: true, mode: 'http', outcome: 'complete' });
    const { user } = setup(service);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Create Patient Profile/ }));

    expect(await screen.findByRole('heading', { name: /patient profile details have been received/ })).toHaveFocus();
    expect(screen.getByText('No appointment has been booked yet.')).toBeInTheDocument();
    expect(service.submit).toHaveBeenCalledTimes(1);
    expect(service.submit).toHaveBeenCalledWith({
      first_name: 'Jamie',
      last_name: 'Rivera',
      date_of_birth: '1985-04-12',
      sex: 'FEMALE',
      mobile: '+16305550123',
      email: 'jamie@example.com',
      consent: true,
    });
  });

  it('explains a follow-up outcome without claiming completion', async () => {
    const { user } = setup(httpService({ ok: true, mode: 'http', outcome: 'follow_up' }));
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Create Patient Profile/ }));

    expect(await screen.findByRole('heading', { name: /details have been saved/ })).toBeInTheDocument();
    expect(screen.getByText(/no need to submit again/)).toBeInTheDocument();
  });

  it('keeps the input and shows server errors when the profile was not created', async () => {
    const { user } = setup(httpService({ ok: false, kind: 'not_created', message: 'Please try again later, or call the clinic.' }));
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Create Patient Profile/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Your profile was not created.*try again later/);
    expect(screen.getByLabelText(/First name/)).toHaveValue('Jamie');
  });

  it('shows 422 field errors inline', async () => {
    const { user } = setup(httpService({ ok: false, kind: 'validation', message: 'Fix', fieldErrors: { dateOfBirth: 'Enter a valid date of birth.' } }));
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Create Patient Profile/ }));
    expect(await screen.findByText('Enter a valid date of birth.')).toBeInTheDocument();
  });

  it('prevents duplicate submissions while sending', async () => {
    let resolve!: (r: PatientProfileResult) => void;
    const service = httpService(() => new Promise<PatientProfileResult>((r) => (resolve = r)));
    const { user } = setup(service);
    await fillValid(user);
    const button = screen.getByRole('button', { name: /Create Patient Profile/ });
    await user.click(button);
    expect(screen.getByRole('button', { name: /Creating profile/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Creating profile/ }));
    expect(service.submit).toHaveBeenCalledTimes(1);
    resolve({ ok: true, mode: 'http', outcome: 'complete' });
    await screen.findByRole('heading', { name: /have been received/ });
  });

  it('tells visitors to call when online registration is switched off', async () => {
    setup(httpService({ ok: true, mode: 'http', outcome: 'complete' }, false));
    expect(await screen.findByText(/not available right now/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Patient Profile/ })).not.toBeInTheDocument();
  });

  it('does not write form data to web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { user } = setup();
    await fillValid(user);
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('Schedule an Appointment page', () => {
  it('is linked from the Contact page and renders one h1 with the booking form', async () => {
    const { unmount } = render(<ContactPage />);
    expect(screen.getByRole('link', { name: 'Schedule an Appointment' })).toHaveAttribute('href', '/contact/schedule-appointment');
    unmount();
    render(<ScheduleAppointmentPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Schedule an Appointment' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(await screen.findByRole('button', { name: /Book Appointment/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Patient Profile/ })).not.toBeInTheDocument();
  });

  it('leaves the original request form on the Contact page unchanged', () => {
    render(<ContactPage />);
    expect(screen.getByRole('button', { name: /Send My Request/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Sex/)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Date of birth/ })).not.toBeInTheDocument();
  });
});
