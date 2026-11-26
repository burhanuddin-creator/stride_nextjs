import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * The real HTTP adapters (NEXT_PUBLIC_USE_MOCK_API=false) against an intercepted API. The build points at
 * http://api.stride.test/api/v1 — a reserved .test host that never resolves — and every request to it is answered
 * here, so no patient is created, no appointment is booked and no email is sent. Any other outside request is aborted
 * and fails the test (except the Google Maps embed, which is only blocked).
 */
const API = 'http://api.stride.test/api/v1';

type Handler = (route: Route, request: Request) => Promise<void>;

async function interceptApi(page: Page, handlers: Record<string, Handler>) {
  const requests: Request[] = [];
  const unexpected: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).hostname === 'api.stride.test') requests.push(r);
  });
  await page.route('**/*', async (route, request) => {
    const url = new URL(request.url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.fallback();
    if (url.hostname !== 'api.stride.test') {
      if (!/(^|\.)google\.com$/.test(url.hostname)) unexpected.push(request.url());
      return route.abort();
    }
    const key = `${request.method()} ${url.pathname.replace('/api/v1', '')}`;
    const handler = handlers[key];
    if (!handler) {
      unexpected.push(key);
      return route.fulfill({ status: 500, json: { message: 'not mocked' } });
    }
    return handler(route, request);
  });
  return { requests, unexpected };
}

async function fillRequestForm(page: Page) {
  await page.getByLabel(/First name/).fill('Jamie');
  await page.getByLabel(/Last name/).fill('Rivera');
  await page.getByLabel(/Email address/).fill('jamie.rivera@example.test');
  await page.getByRole('textbox', { name: /^Phone/ }).fill('(630) 555-0123');
  await page.getByLabel(/Brief notes/).fill('General question');
}

test('Contact request form posts the payload to POST /appointment-requests with an Idempotency-Key', async ({ page }) => {
  const api = await interceptApi(page, {
    'GET /appointment-config': (route) => route.fulfill({ json: { data: { email_verification_required: false } } }),
    'POST /appointment-requests': (route) => route.fulfill({ status: 201, json: { data: { reference: 'REQ-TEST-0001' } } }),
  });

  await page.goto('/contact?care=physical_therapy&service=dry-needling');
  await expect(page.getByText(/this form is not connected yet/i)).toHaveCount(0); // real (HTTP) mode, not the demo
  await expect(page.getByLabel(/What can we help you with/)).toHaveValue('physical_therapy');
  await fillRequestForm(page);
  await page.getByRole('button', { name: /Send My Request/ }).click();

  await expect.poll(() => api.requests.some((r) => r.method() === 'POST')).toBe(true);
  await expect(page.getByRole('button', { name: /Send My Request/ })).toHaveCount(0);
  const post = api.requests.find((r) => r.method() === 'POST' && r.url() === `${API}/appointment-requests`);
  expect(post, 'POST /appointment-requests was sent').toBeTruthy();
  const headers = post!.headers();
  expect(headers['content-type']).toBe('application/json');
  expect(headers['accept']).toBe('application/json');
  expect(headers['x-requested-with']).toBe('XMLHttpRequest');
  expect(headers['idempotency-key']).toBeTruthy();
  const body = post!.postDataJSON();
  expect(body).toMatchObject({
    first_name: 'Jamie',
    last_name: 'Rivera',
    care_type: 'physical_therapy',
    service_slug: 'dry-needling',
    preferred_contact_method: 'email',
    contact_value: 'jamie.rivera@example.test',
    phone: '+16305550123',
    notes: 'General question',
  });
  expect(body).not.toHaveProperty('email_verification_token'); // policy said verification is off
    expect(page.url()).not.toContain('Jamie');
  expect(api.unexpected).toEqual([]);
});

test('Contact request form shows server validation errors (422) and keeps the entries', async ({ page }) => {
  const api = await interceptApi(page, {
    'GET /appointment-config': (route) => route.fulfill({ json: { data: { email_verification_required: false } } }),
    'POST /appointment-requests': (route) =>
      route.fulfill({ status: 422, json: { message: 'The given data was invalid.', errors: { contact_value: ['The email field must be a valid email address.'] } } }),
  });
  await page.goto('/contact?care=physical_therapy');
  await fillRequestForm(page);
  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(page.getByText('The email field must be a valid email address.').first()).toBeVisible();
  await expect(page.getByLabel(/First name/)).toHaveValue('Jamie');
  expect(api.unexpected).toEqual([]);
});

test('server-required email verification shows the code controls (GET /appointment-config)', async ({ page }) => {
  const api = await interceptApi(page, {
    'GET /appointment-config': (route) => route.fulfill({ json: { data: { email_verification_required: true } } }),
  });
  await page.goto('/contact');
  await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible();
  expect(api.requests.filter((r) => r.method() !== 'GET')).toEqual([]);
  expect(api.unexpected).toEqual([]);
});

test('Schedule an Appointment reads SPRY config and availability from the API and books nothing', async ({ page }) => {
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const api = await interceptApi(page, {
    'GET /scheduling/config': (route) =>
      route.fulfill({
        json: {
          data: {
            available: true,
            provider_name: 'Dr. Arva Gadly',
            appointment_type: 'Initial Evaluation',
            duration_minutes: 60,
            timezone: 'America/Chicago',
            first_date: day,
            last_date: day,
          },
        },
      }),
    'GET /scheduling/availability': (route) =>
      route.fulfill({ json: { data: { days: [{ date: day, slots: [{ start: `${day}T15:00:00Z`, time: '10:00 am' }] }] } } }),
  });
  await page.goto('/contact/schedule-appointment');
  await expect(page.getByRole('heading', { level: 1, name: 'Schedule an Appointment' })).toBeVisible();
  await expect.poll(() => api.requests.some((r) => r.url().startsWith(`${API}/scheduling/availability?from=`))).toBe(true);
  // Times appear after choosing the date (only the mocked slot exists).
  await page.getByRole('button', { name: /^Date:/ }).click();
  await page.getByRole('button', { name: /, 1 time available/ }).first().click();
  await expect(page.getByRole('group', { name: /Available times on/ }).getByRole('radio')).toHaveCount(1);
  expect(api.requests.filter((r) => r.method() !== 'GET')).toEqual([]);
  expect(api.unexpected).toEqual([]);
});

test('Schedule an Appointment offers the phone and request form when online booking is off', async ({ page }) => {
  const api = await interceptApi(page, {
    'GET /scheduling/config': (route) => route.fulfill({ json: { data: { available: false } } }),
  });
  await page.goto('/contact/schedule-appointment');
  await expect(page.getByRole('link', { name: 'Use the Request Form' })).toBeVisible();
  await expect.poll(() => api.requests.some((r) => r.url() === `${API}/scheduling/config`)).toBe(true);
  await expect(page.getByRole('button', { name: /Book Appointment/ })).toHaveCount(0);
  expect(api.unexpected).toEqual([]);
});
