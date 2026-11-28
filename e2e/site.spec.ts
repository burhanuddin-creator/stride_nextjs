import { expect, test, type Page } from '@playwright/test';
import { CONDITION_CONTENT } from '../src/data/generated/conditionContent';
import { EDUCATION_ARTICLES } from '../src/data/generated/resourceContent';
import { SERVICE_CONTENT } from '../src/data/generated/serviceContent';

const exact = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

/** Home + the client package's 40 pages (handoff/PAGE_INVENTORY.csv) at their React routes. */
const routes = [
  { path: '/', h1: exact('Guiding every Stride with care.') },
  { path: '/services', h1: exact('Services') },
  ...SERVICE_CONTENT.map((s) => ({ path: `/services/${s.slug}`, h1: exact(s.title) })),
  { path: '/what-we-treat', h1: exact('What We Treat') },
  ...CONDITION_CONTENT.map((c) => ({ path: `/what-we-treat/${c.slug}`, h1: exact(c.title) })),
  { path: '/patient-resources', h1: exact('Patient Resources') },
  { path: '/patient-resources/first-visit', h1: exact('Your First Visit') },
  { path: '/patient-resources/insurance-payment', h1: exact('Insurance & Payment') },
  { path: '/patient-resources/direct-access', h1: exact('Direct Access') },
  { path: '/patient-resources/faqs', h1: exact('Patient FAQs') },
  { path: '/patient-resources/patient-education', h1: exact('Patient Education') },
  ...EDUCATION_ARTICLES.map((a) => ({ path: `/patient-resources/${a.slug}`, h1: exact(a.title) })),
  { path: '/about', h1: exact('Our Story') },
  { path: '/about/meet-dr-gadly', h1: exact('Meet Dr. Arva Gadly, PT, DPT, DN') },
  { path: '/contact', h1: exact('Contact Stride') },
];

/**
 * Demo mode mirrors the current server policy (APPOINTMENT_EMAIL_VERIFICATION_REQUIRED=false): a validly formatted
 * address is enough and there are no Send code / Verify controls.
 */
async function enterEmail(page: Page, email: string) {
  await page.getByLabel(/Email address/).fill(email);
  await expect(page.getByRole('button', { name: 'Send code' })).toHaveCount(0);
  await expect(page.getByLabel('Verification code')).toHaveCount(0);
}

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || el.closest('svg[aria-hidden="true"]')) return false;
        return r.right > width + 1 || r.left < -1;
      })
      .map((el) => `${el.tagName}.${el.className}`);
  });
}

for (const route of routes) {
  test(`direct load and refresh of ${route.path} works without console errors`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(route.path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.h1);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.h1);
    expect(errors).toEqual([]);
  });
}

test('unknown routes show the not-found page', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/couldn’t find that page/);
});

test('no horizontal overflow at 320px on any page', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 320, height: 720 });
  for (const route of [...routes, { path: '/nope' }]) {
    await page.goto(route.path);
    expect(await horizontalOverflow(page), route.path).toEqual([]);
  }
});

test('all images load on every page', async ({ page }) => {
  // One test walks every route (41), so it needs more than the default 30 s budget.
  test.setTimeout(400_000);
  for (const route of routes) {
    await page.goto(route.path);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    // Lazy images may still be in flight after scrolling; wait for each to settle. Images inside display: none (the
    // other viewport's variant, e.g. the Home poster slide) are deliberately never downloaded, so only rendered images count.
    await page.waitForFunction(() => [...document.images].filter((img) => img.getClientRects().length > 0).every((img) => img.complete), null, {
      timeout: 15_000,
    });
    const broken = await page.evaluate(() =>
      [...document.images].filter((img) => img.getClientRects().length > 0 && img.naturalWidth === 0).map((img) => img.src),
    );
    expect(broken, route.path).toEqual([]);
  }
});

test('mobile menu opens, navigates and closes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await expect(toggle).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main', exact: true })).toBeHidden();
  await toggle.click();
  const mobileNav = page.getByRole('navigation', { name: 'Main (mobile)' });
  await expect(mobileNav.getByText('Wellness')).toHaveCount(0);
  await mobileNav.getByRole('button', { name: 'About submenu' }).click();
  await expect(page).toHaveURL(/\/$/); // the arrow only expands
  await mobileNav.getByRole('link', { name: 'Meet your Therapist' }).click();
  await expect(page).toHaveURL(/\/about\/meet-dr-gadly$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Meet Dr. Arva Gadly/);
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
});

test('desktop navigation shows the active page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main', exact: true });
  await expect(nav.getByText('Wellness')).toHaveCount(0);
  await nav.getByRole('link', { name: 'Contact' }).click();
  await expect(nav.getByRole('link', { name: 'Contact' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('Contact Stride on a condition page opens the Contact page', async ({ page }) => {
  await page.goto('/what-we-treat/arthritis');
  await page.getByRole('main').getByRole('link', { name: 'Contact Stride' }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact Stride');
});

test('header: "Schedule an Appointment" opens online booking on desktop and mobile', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('banner').getByText(/Book My Evaluation/i)).toHaveCount(0);
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('banner').getByRole('link', { name: 'Schedule an Appointment' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/contact\/schedule-appointment$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Schedule an Appointment');
});

test('a contact link with care context preselects and focuses the form section', async ({ page }) => {
  await page.goto('/contact?care=physical_therapy&topic=arthritis#request-form');
  await expect(page).toHaveURL(/\/contact\?care=physical_therapy&topic=arthritis#request-form$/);
  await expect(page.getByLabel(/What can we help you with/)).toHaveValue('physical_therapy');
  await expect(page.getByLabel(/What can we help you with/).locator('option[value="wellness"]')).toHaveCount(0);
  await expect(page.locator('#request-form')).toBeFocused();
  await expect(page.locator('#request-form')).toBeInViewport();
});

test('mock submission shows a clearly labelled demo confirmation and keeps data out of the URL and storage', async ({ page }) => {
  await page.goto('/contact?care=physical_therapy');
  await expect(page.getByText(/this form is not connected yet/i)).toBeVisible();

  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeFocused();

  await page.getByLabel(/First name/).fill('Jamie');
  await page.getByLabel(/Last name/).fill('Rivera');
  await expect(page.getByRole('radio')).toHaveCount(0); // no contact-method choice: email and phone are both required
  await enterEmail(page, 'jamie.rivera@example.test');
  await page.getByRole('textbox', { name: /^Phone/ }).fill('(630) 555-0123');
  await page.getByLabel(/Brief notes/).fill('General question');
  await expect(page.getByText('16 / 500')).toBeVisible();
  await page.getByRole('button', { name: /Send My Request/ }).click();

  await expect(page.getByRole('heading', { name: 'Demo complete. This request was not sent.' })).toBeFocused();
  expect(page.url()).not.toContain('Jamie');
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  expect(stored).not.toMatch(/Jamie|jamie.rivera|General question/);
});

test('Contact embeds the map lazily and keeps a directions link fallback', async ({ page }) => {
  await page.goto('/contact');
  const map = page.locator('iframe[title^="Google Map showing 1131 Fairview Avenue"]');
  await expect(map).toHaveAttribute('loading', 'lazy');
  await expect(map).toHaveAttribute('src', /google\.com\/maps.*output=embed/);
  const directions = page.getByRole('link', { name: /Open Directions/ });
  await expect(directions).toHaveAttribute('href', /google\.com\/maps\/dir/);
  await expect(directions).toHaveAttribute('target', '_blank');
  await expect(page.getByText(/\[Clinic phone number\]|Call the clinic/)).toHaveCount(0);
});

test('old /physical-therapy URLs redirect to the canonical service page with query and hash', async ({ page }) => {
  await page.goto('/physical-therapy?ref=old#faq');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(exact('Physical Therapy'));
  const url = new URL(page.url());
  expect(url.pathname + url.search + url.hash).toBe('/services/physical-therapy?ref=old#faq');
});

test('Services dropdown opens by click and keyboard, closes with Escape, and navigates', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main', exact: true });
  const button = nav.getByRole('button', { name: 'Services submenu' });
  await nav.getByRole('link', { name: 'Services', exact: true }).hover();
  await button.hover();
  await expect(button).toHaveAttribute('aria-expanded', 'false'); // never opens on hover
  await button.click();
  await expect(page).toHaveURL(/\/$/); // the arrow does not navigate
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('link', { name: 'Physical Therapy', exact: true }).first()).toBeFocused();
  await expect(page.getByRole('link', { name: 'View All Services' })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Oncology Rehab' }).click();
  await expect(page).toHaveURL(/\/services\/oncology-rehab$/);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('mobile Services submenu works by touch', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).tap();
  const nav = page.getByRole('navigation', { name: 'Main (mobile)' });
  await nav.getByRole('button', { name: 'Services submenu' }).tap();
  await expect(page).toHaveURL(/\/$/);
  await nav.getByRole('link', { name: 'Movement Analysis' }).tap();
  await expect(page).toHaveURL(/\/services\/movement-analysis$/);
  await context.close();
});

test('service appointment CTA preselects the service, which survives validation and is submitted', async ({ page }) => {
  await page.goto('/services/dry-needling');
  await page.getByRole('link', { name: 'Request an Appointment for Dry Needling' }).first().click();
  await expect(page).toHaveURL(/service=dry-needling/);
  const service = page.getByLabel('Specific service (optional)');
  await expect(service).toHaveValue('dry-needling');
  await expect(page.getByLabel(/What can we help you with/)).toHaveValue('physical_therapy');

  await page.getByRole('button', { name: /Send My Request/ }).click(); // missing fields
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeVisible();
  await expect(service).toHaveValue('dry-needling');

  await page.getByLabel(/First name/).fill('Sample');
  await page.getByLabel(/Last name/).fill('Visitor');
  await enterEmail(page, 'sample.visitor@example.test');
  await page.getByRole('textbox', { name: /^Phone/ }).fill('630-555-0199');
  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(page.getByRole('heading', { name: /Demo complete|request has been received/ })).toBeVisible();
});

test('/wellness redirects to /services on direct load and refresh', async ({ page }) => {
  await page.goto('/wellness');
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(exact('Services'));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(exact('Services'));
});

test('the logo goes to Home', async ({ page }) => {
  await page.goto('/patient-resources/faqs');
  await page.getByRole('banner').getByRole('link', { name: /Home/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(exact('Guiding every Stride with care.'));
});

test('body explorer and quiz work by keyboard', async ({ page }) => {
  await page.goto('/what-we-treat');
  const knee = page.getByRole('group', { name: 'Explore by body area' }).getByRole('button', { name: 'Knee' });
  await knee.focus();
  await page.keyboard.press('Enter');
  await expect(knee).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /Explore Knee Pain/ })).toHaveAttribute('href', '/what-we-treat/knee-pain');

  const quiz = page.getByRole('region', { name: 'Not sure where to start?' });
  await quiz.getByRole('button', { name: /^Shoulders/ }).focus();
  await page.keyboard.press('Enter');
  await expect(quiz.getByRole('heading', { name: 'Which shoulder activity feels more difficult?' })).toBeFocused();
  await page.keyboard.press('Tab'); // first activity choice
  await page.keyboard.press('Space');
  await expect(quiz.getByRole('heading', { name: 'How long have you noticed this?' })).toBeFocused();
  await quiz.getByRole('button', { name: /I’m not sure/ }).click();
  await expect(quiz.getByRole('heading', { name: 'A starting point for shoulder pain.' })).toBeFocused();
  await quiz.getByRole('link', { name: /Shoulder Pain/ }).click();
  await expect(page).toHaveURL(/\/what-we-treat\/shoulder-pain$/);
});

test('FAQ filters, accordions, service selectors and approach tabs work by keyboard', async ({ page }) => {
  await page.goto('/patient-resources/faqs');
  const scheduling = page.getByRole('group', { name: 'Filter patient questions' }).getByRole('button', { name: 'Scheduling' });
  await scheduling.focus();
  await page.keyboard.press('Enter');
  await expect(scheduling).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText(/Showing 4 questions: Scheduling\./);
  const firstQuestion = page.getByRole('main').locator('h3 > button[aria-expanded]').first();
  await firstQuestion.focus();
  await page.keyboard.press('Enter');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');

  await page.goto('/services/vestibular-therapy');
  const tiles = page.locator('#goals button[aria-expanded]');
  await tiles.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(tiles.nth(2)).toHaveAttribute('aria-expanded', 'true');
  // Opening a tile expands it in place without stretching its row neighbours.
  if ((page.viewportSize()?.width ?? 0) > 900) {
    const heights = await tiles.evaluateAll((els) => els.slice(0, 3).map((e) => e.closest('[data-open]')!.getBoundingClientRect().height));
    expect(heights[0]).toBeLessThan(heights[2]);
  }

  await page.goto('/about/meet-dr-gadly');
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Know the purpose behind your plan.');
  await page.waitForTimeout(1500);
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true'); // never auto-rotates
});

test('scroll effects never hide content when reduced motion is requested', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/patient-resources/first-visit');
  const item = page.getByText('Any paperwork or instructions provided by the clinic');
  await item.scrollIntoViewIfNeeded();
  await expect(item).toBeVisible();
  expect(await item.evaluate((el) => getComputedStyle(el.closest('li')!).opacity)).toBe('1');
  await context.close();
});

test('scroll effects reveal the checklist when motion is allowed', async ({ page }) => {
  await page.goto('/patient-resources/first-visit');
  const item = page.getByText('Any paperwork or instructions provided by the clinic');
  await item.scrollIntoViewIfNeeded();
  await expect.poll(() => item.evaluate((el) => getComputedStyle(el.closest('li')!).opacity)).toBe('1');
});

// ---------------------------------------------------------------- Home page package, split navigation, phone

test('desktop: each section label navigates directly; its arrow opens the submenu without navigating', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  const nav = page.getByRole('navigation', { name: 'Main', exact: true });
  const sections = [
    ['About', '/about', 'Our Story'],
    ['Services', '/services', 'Services'],
    ['What We Treat', '/what-we-treat', 'What We Treat'],
    ['Patient Resources', '/patient-resources', 'Patient Resources'],
  ] as const;
  for (const [label, path, h1] of sections) {
    await page.goto('/');
    const arrow = nav.getByRole('button', { name: `${label} submenu` });
    await arrow.click();
    await expect(arrow).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/\/$/);
    await page.mouse.click(5, 300); // an outside click closes it
    await expect(arrow).toHaveAttribute('aria-expanded', 'false');
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(exact(h1));
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveClass(/active/);
  }
  await nav.getByRole('button', { name: 'About submenu' }).click();
  await expect(nav.getByRole('link', { name: 'Meet your Therapist' })).toHaveAttribute('href', '/about/meet-dr-gadly');
  await expect(nav.getByRole('link', { name: 'Our Story' })).toBeVisible();
});

test('mobile: label and arrow are separate, comfortable tap targets', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).tap();
  const nav = page.getByRole('navigation', { name: 'Main (mobile)' });
  for (const label of ['About', 'Services', 'What We Treat', 'Patient Resources']) {
    const link = await nav.getByRole('link', { name: label, exact: true }).boundingBox();
    const arrow = await nav.getByRole('button', { name: `${label} submenu` }).boundingBox();
    expect(arrow!.height).toBeGreaterThanOrEqual(44);
    expect(arrow!.width).toBeGreaterThanOrEqual(44);
    expect(link!.height).toBeGreaterThanOrEqual(44);
    expect(arrow!.x).toBeGreaterThanOrEqual(link!.x + link!.width - 1); // side by side, not overlapping
  }
  await nav.getByRole('link', { name: 'Patient Resources', exact: true }).tap();
  await expect(page).toHaveURL(/\/patient-resources$/);
  await context.close();
});

test('Home activity tabs and getting-started questions work by keyboard and pointer', async ({ page }) => {
  await page.goto('/');
  const tabs = page.getByRole('tablist', { name: 'Explore everyday movement goals' }).getByRole('tab');
  await expect(tabs).toHaveCount(4);
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('For the things you reach for.');
  await page.keyboard.press('End');
  await expect(page.getByRole('tabpanel')).toContainText('Reconnect with what you enjoy.');
  await expect(page.getByRole('tabpanel').getByRole('img')).toHaveAttribute('alt', 'A runner sits beside a running track and gently holds her ankle.');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tabpanel')).toContainText('Make room for the everyday.');
  await tabs.nth(2).click();
  await expect(page.getByRole('tabpanel')).toContainText('Take your next step with support.');

  const faq = page.getByRole('region', { name: 'Getting started, made clearer.' });
  const first = faq.locator('details').nth(0);
  const second = faq.locator('details').nth(1);
  await faq.getByText('What happens at my first appointment?').click();
  await expect(first).toHaveAttribute('open', '');
  await faq.locator('summary').nth(1).focus(); // keyboard: the native summary toggles with Enter
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open', '');
  await expect(first).not.toHaveAttribute('open', '');
});

test('Home links all resolve to working pages', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const hrefs = await page
    .getByRole('main')
    .locator('a[href^="/"]')
    .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')!))]);
  expect(hrefs.length).toBeGreaterThan(15);
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 }), href).not.toHaveText(/couldn’t find that page/);
  }
});

test('Home scroll reveals never hide content under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const item = page.getByRole('heading', { name: 'We adjust together.' });
  await item.scrollIntoViewIfNeeded();
  await expect(item).toBeVisible();
  expect(await item.evaluate((el) => getComputedStyle(el.closest('article')!).opacity)).toBe('1');
  const animated = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => getComputedStyle(el).animationName !== 'none').length);
  expect(animated).toBe(0);
  await context.close();
});

test('Home scroll reveals show content once when motion is allowed', async ({ page }) => {
  await page.goto('/');
  const item = page.getByRole('heading', { name: 'We adjust together.' });
  await item.scrollIntoViewIfNeeded();
  await expect.poll(() => item.evaluate((el) => getComputedStyle(el.closest('article')!).opacity)).toBe('1');
});

const HOME_VIEWPORTS = [
  ['desktop', 1440, 900],
  ['tablet', 820, 1180],
  ['mobile', 390, 844],
] as const;

for (const [name, width, height] of HOME_VIEWPORTS) {
  test(`Home layout fits at ${name} width: header logo, contact details, mobile bar, no founder section`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'runs once and sets its own viewport');
    await page.setViewportSize({ width, height });
    await page.goto('/');
    expect(await horizontalOverflow(page)).toEqual([]);

    const logo = await page.getByRole('banner').getByRole('link', { name: /Home/ }).locator('img').boundingBox();
    expect(logo!.height).toBeGreaterThanOrEqual(44);

    // The founder section ("You bring a story.") was removed from Home; the portrait lives on About pages only.
    await expect(page.getByRole('heading', { name: /You bring a story/ })).toHaveCount(0);
    await expect(page.getByAltText('Dr. Arva Gadly, founder of Stride Physical Therapy & Wellness')).toHaveCount(0);

    const location = page.getByRole('region', { name: 'Care close to your everyday.' });
    for (const text of ['Ph: (630) 828-3322', 'Fax: (630) 763-1486', 'info@stridephysical.com']) {
      const el = location.getByText(text, { exact: true });
      await el.scrollIntoViewIfNeeded();
      const b = await el.boundingBox();
      expect(b!.x).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width).toBeLessThanOrEqual(width + 1);
    }

    const bar = page.getByRole('navigation', { name: 'Quick clinic actions' });
    if (width < 720) {
      await expect(bar).toBeVisible();
      // At the very bottom, the fixed bar must not cover the footer's last line.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const barTop = (await bar.boundingBox())!.y;
      const credit = await page.getByRole('contentinfo').getByText(/Design and Developed by/).boundingBox();
      expect(credit!.y + credit!.height).toBeLessThanOrEqual(barTop + 1);
    } else {
      await expect(bar).toBeHidden();
    }
  });
}

test('hero: Home is copy-only and compact on mobile; desktop unchanged; Services keeps its image above', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'runs once and sets its own viewport');
  const heroBoxes = async (path: string) => {
    await page.goto(path);
    const hero = page.locator('section[aria-labelledby="page-title"]');
    const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    const img = (await hero.locator('img').first().boundingBox())!;
    const actions = (await hero.getByRole('link').last().boundingBox())!;
    return { h1, img, actions };
  };

  // Home on mobile: the welcome slide shows copy and buttons only, so the slider stays as compact as the poster slide.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const homeHero = page.locator('section[aria-labelledby="page-title"]');
  await expect(homeHero.locator('img').first()).toBeHidden();
  await expect(homeHero.getByRole('link', { name: 'Contact Stride' })).toBeVisible();
  expect((await homeHero.boundingBox())!.height).toBeLessThan(520);

  const services = await heroBoxes('/services');
  expect(services.img.y + services.img.height).toBeLessThanOrEqual(services.h1.y + 1); // other pages: image above

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = await heroBoxes('/');
  expect(desktop.img.x).toBeGreaterThan(desktop.h1.x); // image on the right
  expect(desktop.img.y).toBeLessThan(desktop.h1.y); // spans the hero height beside the copy
  expect(desktop.img.y + desktop.img.height).toBeGreaterThan(desktop.h1.y + desktop.h1.height);
});

test('appointment form requires a valid phone separately from email', async ({ page }) => {
  await page.goto('/contact?care=physical_therapy');
  await page.getByLabel(/First name/).fill('Jamie');
  await page.getByLabel(/Last name/).fill('Rivera');
  await enterEmail(page, 'jamie.rivera@example.test');
  const phone = page.getByRole('textbox', { name: /^Phone/ });
  await expect(phone).toHaveAttribute('type', 'tel');
  await expect(phone).toHaveAttribute('autocomplete', 'tel');
  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Enter your phone number.' })).toBeFocused();
  await phone.fill('555-0123');
  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await phone.fill('(630) 555-0123');
  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(page.getByRole('heading', { name: 'Demo complete. This request was not sent.' })).toBeFocused();
});

/** First day with demo times (the first month can be empty near its end). */
async function firstAvailableDay(page: Page) {
  const calendar = page.getByRole('table');
  await expect(calendar.or(page.getByText(/No times this month/))).toBeVisible();
  let day = calendar.getByRole('button', { name: /, \d+ times? available/ }).first();
  if ((await day.count()) === 0) {
    await page.getByRole('button', { name: 'Next month' }).click();
    day = page.getByRole('table').getByRole('button', { name: /, \d+ times? available/ }).first();
  }
  return day;
}

test('Schedule an Appointment: three steps from Contact (demo), per-step validation, nothing in URL or storage', async ({ page }) => {
  // After client navigation Next.js keeps the Contact page mounted but hidden (Activity), so lookups are limited to
  // visible elements.
  await page.goto('/contact');
  await page.getByRole('main').getByRole('link', { name: 'Schedule an Appointment' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/contact\/schedule-appointment$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Schedule an Appointment');
  await expect(page.getByText('sample times only', { exact: false })).toBeVisible(); // demo build
  const summary = page.getByRole('complementary', { name: 'Your appointment' });
  await expect(summary).toContainText('Initial Evaluation');
  await expect(summary).toContainText(/Central Time \(C[DS]T\)/);
  await expect(page.getByRole('heading', { name: /^Step 1 of 3/ })).toBeVisible();

  // Step 1: Continue without a time → focused error, still on step 1.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Choose a date, then a time.' })).toBeFocused();
  await summary.getByRole('button', { name: 'About this provider' }).click();
  await expect(page.getByText(/is the provider who sees new patients/)).toBeVisible();
  await (await firstAvailableDay(page)).click();
  const time = page.getByRole('group', { name: /Available times/ }).getByRole('radio').first();
  const timeLabel = (await time.locator('xpath=..').innerText()).trim();
  await time.check();
  await expect(summary).toContainText(timeLabel);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: details, validated before step 3.
  await expect(page.getByRole('heading', { name: /^Step 2 of 3/ })).toBeFocused();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix these 6 problems' })).toBeFocused();
  await page.getByLabel(/First name/).filter({ visible: true }).fill('Jamie');
  await page.getByLabel(/Last name/).filter({ visible: true }).fill('Rivera');
  await page.getByLabel('Month', { exact: true }).filter({ visible: true }).selectOption({ label: 'April' });
  await page.getByLabel('Day', { exact: true }).filter({ visible: true }).fill('12');
  await page.getByLabel('Year', { exact: true }).filter({ visible: true }).fill('1985');
  await page.getByLabel(/^Sex/).filter({ visible: true }).selectOption({ label: 'Female' });
  await page.getByLabel(/US mobile number/).filter({ visible: true }).fill('630.555.0123');
  await page.getByLabel(/Email address/).filter({ visible: true }).fill('jamie.rivera@example.test');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3: payment, consent, review; Back keeps the answers.
  await expect(page.getByRole('heading', { name: /^Step 3 of 3/ })).toBeFocused();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel(/First name/).filter({ visible: true })).toHaveValue('Jamie');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('region', { name: 'Review your booking' })).toContainText(`at ${timeLabel}`);
  await page.getByRole('radio', { name: 'Insurance' }).check();
  await expect(page.getByText(/does not check your eligibility or guarantee coverage/)).toBeVisible();
  await page.getByLabel(/book this appointment/).filter({ visible: true }).check();
  await page.getByRole('button', { name: /^Confirm Appointment/ }).click();

  await expect(page.getByRole('heading', { name: 'Demo complete. Nothing was booked.' })).toBeFocused();
  await expect(page.getByText(/1131 Fairview Ave/).first()).toBeVisible();
  expect(page.url()).not.toContain('Jamie');
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  expect(stored).not.toMatch(/Jamie|jamie.rivera|1985/);
});

test('Schedule an Appointment layout: summary beside the steps on desktop, one column on mobile, no overflow', async ({ page }, testInfo) => {
  await page.goto('/contact/schedule-appointment');
  const summary = page.getByRole('complementary', { name: 'Your appointment' });
  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: /^Step 1 of 3/ }) });
  await expect(summary).toBeVisible();
  const [formBox, summaryBox] = [await form.boundingBox(), await summary.boundingBox()];
  if (testInfo.project.name === 'desktop') {
    expect(summaryBox!.x).toBeGreaterThan(formBox!.x + formBox!.width); // beside
    expect(summaryBox!.y).toBeLessThan(formBox!.y + 200);
  } else {
    expect(summaryBox!.y).toBeGreaterThan(formBox!.y + formBox!.height - 1); // below, one column
  }
  // Time slots and controls are comfortable touch targets.
  await (await firstAvailableDay(page)).click();
  for (const box of [
    await page.getByRole('group', { name: /Available times/ }).locator('label').first().boundingBox(),
    await page.getByRole('button', { name: 'Continue' }).boundingBox(),
    await page.getByRole('button', { name: 'Next month' }).boundingBox(),
  ]) {
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await horizontalOverflow(page)).toEqual([]);
});

test('Schedule an Appointment page has no horizontal overflow at 320px on every step and survives a direct load', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/contact/schedule-appointment');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Schedule an Appointment');
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  expect(await horizontalOverflow(page)).toEqual([]);
  await (await firstAvailableDay(page)).click();
  await page.getByRole('group', { name: /Available times/ }).getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /^Step 2 of 3/ })).toBeVisible();
  expect(await horizontalOverflow(page)).toEqual([]);
});

test('Schedule an Appointment is keyboard operable: calendar arrows, time radios, Enter continues', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard path once');
  await page.goto('/contact/schedule-appointment');
  const day = await firstAvailableDay(page);
  await day.focus();
  await page.keyboard.press('ArrowRight');
  const focused = page.locator('table button:focus');
  await expect(focused).toHaveAttribute('aria-label', /times? available/);
  await page.keyboard.press('Enter');
  await expect(focused).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('group', { name: /Available times/ }).getByRole('radio').first()).toBeFocused();
  // Visible focus on the time button.
  const outline = await page.getByRole('group', { name: /Available times/ }).locator('label').first().evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Continue' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /^Step 2 of 3/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/First name/)).toBeFocused();
});

test('Home hero slider: welcome first, poster second, accessible controls, no movement under reduced motion', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'runs once per viewport below');
  test.setTimeout(90_000); // two viewports, each with an 8 s check that nothing moves
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const slider = page.getByRole('region', { name: 'Welcome to Stride' });
    const welcome = slider.getByRole('group', { name: /^1 of 2/ });
    const poster = page.locator('[aria-roledescription="slide"]').nth(1);

    // Initial HTML: the welcome slide (with the only h1) is shown; the poster slide is inert.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Guiding every Stride with care.');
    await expect(poster).toHaveAttribute('inert', '');
    // Reduced motion: no auto-advance, and the button offers to start rotation.
    await expect(slider.getByRole('button', { name: 'Start slide rotation' })).toBeVisible();
    await page.waitForTimeout(8000);
    await expect(welcome).not.toHaveAttribute('inert', '');

    await slider.getByRole('button', { name: 'Next slide' }).click();
    await expect(poster).not.toHaveAttribute('inert', '');
    await expect(slider.getByRole('button', { name: 'Show slide 2: Coming Soon to Westmont' })).toHaveAttribute('aria-current', 'true');
    // Desktop shows the poster image (its words in the alt text); small screens show the same words as text.
    if (viewport.width >= 900) {
      await expect(poster.getByRole('img', { name: /Coming Soon to Westmont/ })).toBeVisible();
    } else {
      await expect(poster.getByText('Coming Soon to Westmont', { exact: true })).toBeVisible();
      await expect(poster.getByText('Your next chapter in movement.')).toBeVisible();
      // Compact and consistent: both slides share one height, the photo sits below the words (never under them), and
      // the controls have their own strip below the slides instead of covering the photo.
      // (The welcome slide is aria-hidden while the poster shows, so it is located by attribute, not by role.)
      const welcomeSlide = page.locator('[aria-roledescription="slide"]').first();
      const [welcomeBox, posterBox, sliderBox] = [await welcomeSlide.boundingBox(), await poster.boundingBox(), await slider.boundingBox()];
      expect(Math.abs(welcomeBox!.height - posterBox!.height)).toBeLessThanOrEqual(1);
      expect(sliderBox!.height).toBeLessThan(560);
      const tagline = (await poster.getByText('Care that starts with you.').boundingBox())!;
      const photo = (await poster.locator('img').filter({ visible: true }).boundingBox())!;
      expect(photo.y).toBeGreaterThanOrEqual(tagline.y + tagline.height);
      expect(photo.height).toBeGreaterThan(150);
      const next = (await slider.getByRole('button', { name: 'Next slide' }).boundingBox())!;
      expect(next.y).toBeGreaterThanOrEqual(posterBox!.y + posterBox!.height - 1);
    }
    expect(await horizontalOverflow(page)).toEqual([]);

    await slider.getByRole('button', { name: 'Previous slide' }).click();
    await expect(welcome).not.toHaveAttribute('inert', '');
    await expect(page.getByRole('link', { name: 'Contact Stride' }).first()).toBeVisible();
    await context.close();
  }
});

test('Home hero slider advances on its own when motion is allowed and stops once paused', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one viewport is enough');
  test.setTimeout(60_000); // waits for one 7 s rotation, then 8 s to confirm the pause
  await page.goto('/');
  const slider = page.getByRole('region', { name: 'Welcome to Stride' });
  const posterDot = slider.getByRole('button', { name: 'Show slide 2: Coming Soon to Westmont' });
  await page.mouse.move(5, 890); // keep the pointer off the slider (hovering pauses it)
  await expect(posterDot).toHaveAttribute('aria-current', 'true', { timeout: 10_000 });
  await slider.getByRole('button', { name: 'Pause slide rotation' }).click();
  await page.mouse.move(5, 890);
  await page.waitForTimeout(8000);
  await expect(posterDot).toHaveAttribute('aria-current', 'true');
  await expect(slider.getByRole('button', { name: 'Start slide rotation' })).toBeVisible();
});
