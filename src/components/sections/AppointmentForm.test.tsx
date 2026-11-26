import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentForm } from './AppointmentForm';
import { createMockAppointmentService } from '../../services/appointments/mockAdapter';
import type { AppointmentService } from '../../services/appointments';
import type { SubmitResult } from '../../types/appointment';
import { ContactAppointmentForm } from './ContactAppointmentForm';

const navigation = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(navigation.search) }));

/** The Contact page's form as rendered for /contact?<search> (the query string comes from next/navigation). */
function renderContactForm(search = '') {
  navigation.search = search;
  return render(<ContactAppointmentForm />);
}

// Most tests below exercise the verification flow, so their default service requires it. The "verification off"
// tests at the end use the server's current setting (off), which is also the mock adapter's default.
function setup(service: AppointmentService = createMockAppointmentService(0, { emailVerificationRequired: true }), initialCare?: 'wellness') {
  const user = userEvent.setup();
  render(
    <AppointmentForm service={service} initialCare={initialCare} />,
  );
  return { user };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/First name/), 'Jamie');
  await user.type(screen.getByLabelText(/Last name/), 'Rivera');
  await user.selectOptions(screen.getByLabelText(/What can we help you with/), 'physical_therapy');
  await verifyEmail(user, 'jamie@example.com');
  await user.type(screen.getByLabelText(/^Phone/), '(630) 555-0123');
}

/** Types the address, requests a code and enters the accepted code (123456 in the mock and the fake HTTP service). */
async function verifyEmail(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText(/Email address/), email);
  await user.click(await screen.findByRole('button', { name: 'Send code' }));
  await user.type(await screen.findByLabelText('Verification code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify' }));
  await screen.findByText('Email verified');
}

function verificationFakes(emailVerificationRequired = true) {
  return {
    getPolicy: vi.fn<AppointmentService['getPolicy']>(async () => ({ emailVerificationRequired })),
    requestEmailCode: vi.fn<AppointmentService['requestEmailCode']>(async () => ({
      ok: true,
      id: 'v-1',
      expiresInSeconds: 600,
      resendInSeconds: 60,
    })),
    confirmEmailCode: vi.fn<AppointmentService['confirmEmailCode']>(async (_id, code) =>
      code === '123456' ? { ok: true, token: 'token-1' } : { ok: false, message: 'That code is not correct. You have 4 attempts left.' },
    ),
  };
}

function httpService(result: SubmitResult | (() => Promise<SubmitResult>)): AppointmentService {
  return {
    mode: 'http',
    ...verificationFakes(),
    submit: vi.fn(typeof result === 'function' ? result : async () => result),
  };
}

describe('AppointmentForm', () => {
  it('labels mock mode as a local demo', () => {
    setup();
    expect(screen.getByText(/this form is not connected yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send My Request \(demo\)/ })).toBeInTheDocument();
  });

  it('shows an error summary and inline errors for missing required fields', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Please fix these 5 problems');
    expect(summary).toHaveTextContent('Enter your phone number.');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(screen.getByLabelText(/First name/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/First name/)).toHaveAccessibleDescription('Enter your first name.');
  });

  it('asks for a required email address and a separate required phone number (no contact-method choice)', () => {
    setup();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const email = screen.getByLabelText(/Email address/);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    const phone = screen.getByRole('textbox', { name: /^Phone/ });
    expect(phone).toHaveAttribute('type', 'tel');
    expect(phone).toHaveAttribute('autocomplete', 'tel');
    expect(phone).toBeRequired();
    expect(phone).toHaveAccessibleDescription(/call you about your request/);
  });

  it('is a single-page form without patient lookup or registration steps or fields', () => {
    setup();
    expect(screen.getByLabelText(/First name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Phone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/What can we help you with/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send My Request/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/date of birth|^Month|^Day|^Year/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Sex/i)).not.toBeInTheDocument();
  });

  it('rejects a missing or invalid phone with an accessible message and sends nothing', async () => {
    const service = httpService({ ok: true, mode: 'http' });
    const { user } = setup(service);
    await user.type(screen.getByLabelText(/First name/), 'Jamie');
    await user.type(screen.getByLabelText(/Last name/), 'Rivera');
    await user.selectOptions(screen.getByLabelText(/What can we help you with/), 'physical_therapy');
    await verifyEmail(user, 'jamie@example.com');
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    // The error summary takes focus one animation frame after the submit; wait for it before typing, or the
    // keystrokes can land on the summary instead of the phone field (seen on slower CI runners).
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    const phone = screen.getByLabelText(/^Phone/);
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(phone).toHaveAccessibleDescription(/Enter your phone number./);

    await user.type(phone, '555-0123');
    expect(phone).toHaveAccessibleDescription(/Enter a 10-digit US phone number/);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    expect(service.submit).not.toHaveBeenCalled();
    // The rejected submit moves focus to the (re-shown) summary again; wait before editing the field.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());

    await user.clear(phone);
    await user.type(phone, '630.555.0123');
    expect(phone).toHaveAttribute('aria-invalid', 'false');
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await waitFor(() => expect(service.submit).toHaveBeenCalledWith(expect.objectContaining({ phone: '+16305550123' }), expect.anything()));
  });

  it('shows a server-side phone error on the phone field', async () => {
    const service = httpService({ ok: false, kind: 'validation', message: 'Please check the highlighted fields.', fieldErrors: { phone: 'Enter your phone number.' } });
    const { user } = setup(service);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByText(/Your request was not sent/);
    expect(screen.getByLabelText(/^Phone/)).toHaveAccessibleDescription(/Enter your phone number./);
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('(630) 555-0123');
  });

  it('will not send the request until the email address is verified', async () => {
    const service = httpService({ ok: true, mode: 'http' });
    const { user } = setup(service);
    await user.type(screen.getByLabelText(/First name/), 'Jamie');
    await user.type(screen.getByLabelText(/Last name/), 'Rivera');
    await user.selectOptions(screen.getByLabelText(/What can we help you with/), 'not_sure');
    await user.type(screen.getByLabelText(/Email address/), 'jamie@example.com');
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(await screen.findByRole('link', { name: 'Verify your email address before sending your request.' })).toBeInTheDocument();
    expect(service.submit).not.toHaveBeenCalled();
  });

  it('verifies with a code, then shows the field in green with “Email verified” and sends the token', async () => {
    const service = httpService({ ok: true, mode: 'http' });
    const { user } = setup(service);
    await user.type(screen.getByLabelText(/First name/), 'Jamie');
    await user.type(screen.getByLabelText(/Last name/), 'Rivera');
    await user.selectOptions(screen.getByLabelText(/What can we help you with/), 'physical_therapy');
    await verifyEmail(user, 'jamie@example.com');

    expect(service.requestEmailCode).toHaveBeenCalledWith('jamie@example.com');
    expect(service.confirmEmailCode).toHaveBeenCalledWith('v-1', '123456');
    const email = screen.getByLabelText(/Email address/);
    expect(email.className).toMatch(/inputVerified/);
    expect(email).toHaveAccessibleDescription('Email verified');
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Email verified')).toHaveFocus());

    await user.type(screen.getByLabelText(/^Phone/), '(630) 555-0123');
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByRole('heading', { name: /request has been received/ });
    expect(service.submit).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_contact_method: 'email', contact_value: 'jamie@example.com', email_verification_token: 'token-1' }),
      expect.anything(),
    );
  });

  it('shows a wrong-code message and stays unverified', async () => {
    const { user } = setup(httpService({ ok: true, mode: 'http' }));
    await user.type(screen.getByLabelText(/Email address/), 'jamie@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    await user.type(await screen.findByLabelText('Verification code'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('That code is not correct. You have 4 attempts left.')).toBeInTheDocument();
    expect(screen.queryByText('Email verified')).not.toBeInTheDocument();
  });

  it('offers a resend only after the cooldown', async () => {
    const { user } = setup(httpService({ ok: true, mode: 'http' }));
    await user.type(screen.getByLabelText(/Email address/), 'jamie@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled();
    expect(screen.getByText(/We sent a 6-digit code to/)).toHaveTextContent('jamie@example.com');
  });

  it('requires verifying again when the address is changed', async () => {
    const { user } = setup(httpService({ ok: true, mode: 'http' }));
    await verifyEmail(user, 'jamie@example.com');
    await user.type(screen.getByLabelText(/Email address/), 'x');

    expect(screen.queryByText('Email verified')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send code' })).toBeInTheDocument();

    // Restoring the original address does not restore the old verification.
    await user.type(screen.getByLabelText(/Email address/), '{Backspace}');
    expect(screen.getByLabelText(/Email address/)).toHaveValue('jamie@example.com');
    expect(screen.queryByText('Email verified')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send code' })).toBeInTheDocument();
  });

  it('never verifies the phone (no SMS or code for the phone)', async () => {
    const { user } = setup(httpService({ ok: true, mode: 'http' }));
    await fillValid(user);
    expect(screen.queryAllByRole('button', { name: /Send code|Verify/ })).toHaveLength(0);
    expect(screen.queryByText(/SMS|text message/i)).not.toBeInTheDocument();
  });

  it('rejects a badly formatted address before sending a code', async () => {
    const service = httpService({ ok: true, mode: 'http' });
    const { user } = setup(service);
    await user.type(screen.getByLabelText(/Email address/), 'jamie@');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Enter an email address in the format name@example.com.')).toBeInTheDocument();
    expect(service.requestEmailCode).not.toHaveBeenCalled();
  });

  it('counts note characters up to 500', async () => {
    const { user } = setup();
    expect(screen.getByText('0 / 500', { exact: false })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Brief notes/), 'Hello');
    expect(screen.getByText('5 / 500', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(/Brief notes/)).toHaveAttribute('maxlength', '500');
  });

  it('leaves the insurance help checkbox unchecked initially', () => {
    setup();
    expect(screen.getByRole('checkbox', { name: /help understanding insurance/ })).not.toBeChecked();
  });

  it('shows a demo confirmation that says nothing was sent', async () => {
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    const heading = await screen.findByRole('heading', { name: /Demo complete\. This request was not sent\./ });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText(/nothing was sent to Stride/)).toBeInTheDocument();
    expect(screen.queryByText(/Your request has been received/)).not.toBeInTheDocument();
  });

  it('shows the real confirmation only after a successful HTTP response', async () => {
    const service = httpService({ ok: true, mode: 'http', reference: 'STR-261028-K7Q4PM' });
    const { user } = setup(service);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    expect(await screen.findByRole('heading', { name: 'Thank you. Your request has been received.' })).toBeInTheDocument();
    expect(screen.getByText(/Your appointment is not yet confirmed/)).toBeInTheDocument();
    expect(service.submit).toHaveBeenCalledWith(
      expect.objectContaining({ care_type: 'physical_therapy', preferred_contact_method: 'email', contact_value: 'jamie@example.com', phone: '+16305550123' }),
      { idempotencyKey: expect.any(String) },
    );
    expect(screen.getByText('STR-261028-K7Q4PM')).toBeInTheDocument();
  });

  it('reuses the Idempotency-Key when the same request is retried, and uses a new one when it changes', async () => {
    const submit = vi
      .fn<AppointmentService['submit']>()
      .mockResolvedValueOnce({ ok: false, kind: 'timeout', message: 'The request took too long.' })
      .mockResolvedValueOnce({ ok: false, kind: 'server', message: 'Server problem.' })
      .mockResolvedValueOnce({ ok: true, mode: 'http', reference: 'STR-261028-AAAAAA' });
    const { user } = setup({ mode: 'http', ...verificationFakes(), submit });
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByText(/took too long/);
    await user.click(screen.getByRole('button', { name: /Send My Request/ })); // same payload retried
    await screen.findByText(/Server problem/);
    await user.type(screen.getByLabelText(/Brief notes/), 'Changed'); // different payload
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByRole('heading', { name: /request has been received/ });

    const keys = submit.mock.calls.map(([, options]) => options?.idempotencyKey);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('discards the key after a 409 conflict so the next attempt uses a new one', async () => {
    const submit = vi
      .fn<AppointmentService['submit']>()
      .mockResolvedValueOnce({ ok: false, kind: 'conflict', message: 'Please send it again.' })
      .mockResolvedValueOnce({ ok: true, mode: 'http' });
    const { user } = setup({ mode: 'http', ...verificationFakes(), submit });
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByText(/Please send it again/);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByRole('heading', { name: /request has been received/ });

    expect(submit.mock.calls[1][1]?.idempotencyKey).not.toBe(submit.mock.calls[0][1]?.idempotencyKey);
  });

  it.each([
    ['server', 'We could not send your request because of a problem on our side.'],
    ['network', 'We could not reach our server.'],
    ['rate_limited', 'Too many requests have been sent.'],
    ['timeout', 'The request took too long and was stopped.'],
  ] as const)('on a %s failure shows an error, no success, and keeps input', async (kind, message) => {
    const { user } = setup(httpService({ ok: false, kind, message }));
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(await screen.findByText(message, { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Your request was not sent.')).toBeInTheDocument();
    expect(screen.queryByText(/request has been received/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toHaveValue('Jamie');
    expect(screen.getByLabelText(/Email address/)).toHaveValue('jamie@example.com');
  });

  it('shows Laravel 422 field errors inline', async () => {
    const { user } = setup(
      httpService({
        ok: false,
        kind: 'validation',
        message: 'Please correct the highlighted fields and try again.',
        fieldErrors: { contactValue: 'This email address could not be accepted.' },
      }),
    );
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    expect(await screen.findByText('This email address could not be accepted.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toHaveAttribute('aria-invalid', 'true');
    // A rejected verification means the address has to be verified again.
    expect(screen.queryByText('Email verified')).not.toBeInTheDocument();
  });

  it('prevents duplicate submissions while sending', async () => {
    let resolve!: (r: SubmitResult) => void;
    const service = httpService(() => new Promise<SubmitResult>((r) => (resolve = r)));
    const { user } = setup(service);
    await fillValid(user);
    const button = screen.getByRole('button', { name: /Send My Request/ });
    await user.click(button);
    expect(screen.getByRole('button', { name: /Sending/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Sending/ }));
    expect(service.submit).toHaveBeenCalledTimes(1);
    resolve({ ok: true, mode: 'http' });
    expect(await screen.findByRole('heading', { name: /request has been received/ })).toBeInTheDocument();
  });

  it('does not write form data to web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    await screen.findByRole('heading', { name: /Demo complete/ });
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('AppointmentForm when the server does not require email verification', () => {
  function offService(result: SubmitResult = { ok: true, mode: 'http', reference: 'STR-261106-ABCDEF' }): AppointmentService {
    return { mode: 'http', ...verificationFakes(false), submit: vi.fn(async () => result) };
  }

  async function fillWithoutVerifying(user: ReturnType<typeof userEvent.setup>, email = 'jamie@example.com') {
    await user.type(screen.getByLabelText(/First name/), 'Jamie');
    await user.type(screen.getByLabelText(/Last name/), 'Rivera');
    await user.selectOptions(screen.getByLabelText(/What can we help you with/), 'physical_therapy');
    await user.type(screen.getByLabelText(/Email address/), email);
    await user.type(screen.getByLabelText(/^Phone/), '(630) 555-0123');
  }

  it('hides the Send code and Verify controls and the code hint', async () => {
    const service = offService();
    setup(service);
    await waitFor(() => expect(service.getPolicy).toHaveBeenCalled());
    await screen.findByLabelText(/Email address/);

    expect(screen.queryByRole('button', { name: 'Send code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
    expect(screen.queryByText(/6-digit code/)).not.toBeInTheDocument();
  });

  it('sends the request without a verification token and never asks for a code', async () => {
    const service = offService();
    const { user } = setup(service);
    await fillWithoutVerifying(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(await screen.findByRole('heading', { name: 'Thank you. Your request has been received.' })).toBeInTheDocument();
    const [payload] = vi.mocked(service.submit).mock.calls[0];
    expect(payload).toMatchObject({ contact_value: 'jamie@example.com', preferred_contact_method: 'email' });
    expect(payload).not.toHaveProperty('email_verification_token');
    expect(service.requestEmailCode).not.toHaveBeenCalled();
    expect(service.confirmEmailCode).not.toHaveBeenCalled();
  });

  it('still requires a validly formatted address', async () => {
    const service = offService();
    const { user } = setup(service);
    await fillWithoutVerifying(user, 'jamie@');
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(await screen.findByRole('link', { name: 'Enter an email address in the format name@example.com.' })).toBeInTheDocument();
    expect(screen.queryByText('Verify your email address before sending your request.')).not.toBeInTheDocument();
    expect(service.submit).not.toHaveBeenCalled();
  });

  it('waits for the policy when the form is sent before it has loaded', async () => {
    let resolvePolicy!: (value: { emailVerificationRequired: boolean }) => void;
    const service = offService();
    vi.mocked(service.getPolicy).mockImplementation(() => new Promise((resolve) => (resolvePolicy = resolve)));
    const { user } = setup(service);
    await fillWithoutVerifying(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    expect(service.submit).not.toHaveBeenCalled();

    resolvePolicy({ emailVerificationRequired: false });
    expect(await screen.findByRole('heading', { name: /request has been received/ })).toBeInTheDocument();
    expect(service.submit).toHaveBeenCalledTimes(1);
  });

  it('is the mock demo default: the demo completes without a code', async () => {
    setup(createMockAppointmentService(0));
    const user = userEvent.setup();
    await fillWithoutVerifying(user);
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    expect(await screen.findByRole('heading', { name: /Demo complete/ })).toBeInTheDocument();
  });

  it('shows the verification controls again when the server requires verification', async () => {
    setup({ mode: 'http', ...verificationFakes(true), submit: vi.fn() });
    expect(await screen.findByRole('button', { name: 'Send code' })).toBeInTheDocument();
    expect(screen.getByText(/6-digit code/)).toBeInTheDocument();
  });
});

describe('Contact page preselection', () => {
  it.each([
    ['physical_therapy', 'physical_therapy'],
    // Wellness was retired: old links no longer preselect it (the API value itself is unchanged).
    ['wellness', ''],
    ['insurance_question', 'insurance_question'],
    ['bogus', ''],
  ])('?care=%s preselects "%s"', (care, expected) => {
    renderContactForm(`care=${care}`);
    expect(screen.getByRole('combobox', { name: /What can we help you with/ })).toHaveValue(expected);
  });

  it('does not offer Wellness as a visible care choice', () => {
    renderContactForm();
    const options = Array.from(screen.getByRole('combobox', { name: /What can we help you with/ }).querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['', 'physical_therapy', 'insurance_question', 'not_sure']);
  });

  it('shows a known topic label but ignores unknown topic values', () => {
    const { unmount } = renderContactForm('care=physical_therapy&topic=back-pain-sciatica');
    expect(screen.getByText('Back Pain & Sciatica', { selector: 'strong' })).toBeInTheDocument();
    unmount();
    renderContactForm('topic=%3Cscript%3E');
    expect(screen.queryByText(/You’re asking about/)).not.toBeInTheDocument();
  });

  it('includes the privacy guidance', () => {
    renderContactForm();
    expect(screen.getByText(/do not include medical records, diagnoses, or insurance member numbers/)).toBeInTheDocument();
    expect(screen.queryByText(/request has been received/)).not.toBeInTheDocument();
  });
});
