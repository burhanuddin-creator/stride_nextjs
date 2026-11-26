import { expect, test, type Page } from '@playwright/test';
import { NOINDEX_PATHS, PRERENDER_PATHS } from '../src/data/sitemap';

/**
 * Statically generated pages in a real browser (the e2e build is a production `next build` without site URLs):
 * React hydrates without errors, interactions still work, metadata follows client-side navigation without duplicates,
 * and the content is there with JavaScript switched off.
 */

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /hydrat|did not match|mismatch/i.test(m.text()))) {
      problems.push(`${new URL(page.url()).pathname}: [${m.type()}] ${m.text().slice(0, 300)}`);
    }
  });
  page.on('pageerror', (e) => problems.push(`${new URL(page.url()).pathname}: [pageerror] ${e.message.slice(0, 300)}`));
  return problems;
}

test('every prerendered page hydrates without console errors or hydration warnings', async ({ page }) => {
  test.setTimeout(240_000);
  const problems = collectProblems(page);
  for (const path of PRERENDER_PATHS) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
  expect(problems).toEqual([]);
});

test('hydration keeps a single copy of the page and its head tags', async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto('/services/physical-therapy');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('head title')).toHaveCount(1);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('client-side navigation updates title, description and social tags in place (no duplicates)', async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contact', exact: true }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page).toHaveTitle('Contact Stride | Stride Physical Therapy & Wellness');
  for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[name="twitter:title"]', 'script[type="application/ld+json"]']) {
    await expect(page.locator(selector), selector).toHaveCount(1);
  }
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Contact Stride | Stride Physical Therapy & Wellness');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /request an evaluation/);
  expect(problems).toEqual([]);
});

test('a direct load with a query string hydrates without a mismatch and keeps the preselection', async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto('/contact?care=physical_therapy&topic=knee-pain#request-form');
  await expect(page.getByLabel(/What can we help you with/)).toHaveValue('physical_therapy');
  await expect(page.getByText(/asking about/)).toContainText('Knee Pain');
  expect(problems).toEqual([]);
});

test('forms and navigation work after hydration', async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto('/contact');
  await page.getByRole('button', { name: /Send My Request/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeFocused();

  await page.goto('/patient-resources/faqs');
  const firstQuestion = page.locator('main button[aria-expanded]').first();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  await firstQuestion.click();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  expect(problems).toEqual([]);
});

test('HTTP behaviour carried over from .htaccess: real 404s, no trailing slash, legacy 301s', async ({ request }) => {
  const opts = { maxRedirects: 0 };
  for (const path of ['/nope', '/services/not-a-service', '/index.php', '/services/physical-therapy/extra']) {
    const res = await request.get(path, opts);
    expect(res.status(), path).toBe(404);
    expect(await res.text(), path).toContain('We couldn’t find that page.');
  }
  // Next.js answers trailing slashes with its built-in permanent redirect (308); the legacy page redirects keep 301.
  for (const [from, to, status] of [
    ['/services/', '/services', 308],
    ['/what-we-treat/knee-pain/', '/what-we-treat/knee-pain', 308],
    ['/wellness', '/services', 301],
    ['/physical-therapy?x=1', '/services/physical-therapy?x=1', 301],
  ] as const) {
    const res = await request.get(from, opts);
    expect(res.status(), from).toBe(status);
    const location = new URL(res.headers().location, res.url());
    expect(location.host, from).toBe(new URL(res.url()).host);
    expect(location.pathname + location.search, from).toBe(to);
  }
  for (const path of ['/', '/services', '/contact/schedule-appointment', '/favicon.png', '/apple-touch-icon.png', '/assets/social/stride-logo.jpg']) {
    expect((await request.get(path, opts)).status(), path).toBe(200);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('pages show their heading, copy, internal links and clinic contact details', async ({ page }) => {
    for (const path of ['/', '/services', '/services/dry-needling', '/what-we-treat/knee-pain', '/patient-resources/first-visit', '/about/meet-dr-gadly', '/contact']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible();
      expect((await page.locator('main').innerText()).length, path).toBeGreaterThan(400);
      // Header navigation is in the HTML; on the mobile layout it sits behind the Menu button (needs JS), so a visible
      // internal link (header on desktop, footer on mobile) is required instead.
      await expect(page.getByRole('banner').locator('a[href="/services"]').first(), path).toBeAttached();
      expect(await page.locator('a[href="/services"]:visible').count(), path).toBeGreaterThan(0);
      await expect(page.getByRole('contentinfo').getByText('(630) 828-3322').first(), path).toBeVisible();
      await expect(page.getByRole('contentinfo').getByText('1131 Fairview Ave').first(), path).toBeVisible();
    }
  });

  test('scroll-reveal content stays visible', async ({ page }) => {
    await page.goto('/patient-resources/first-visit');
    for (const el of await page.locator('[data-reveal]').all()) await expect(el).toBeVisible();
    await expect(page.locator('main li').first()).toBeVisible();
  });

  test('noindex pages and the not-found page are marked noindex', async ({ page }) => {
    for (const path of NOINDEX_PATHS) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"][content="noindex"]'), path).toHaveCount(1);
    }
    const res = await page.goto('/no-such-page');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We couldn’t find that page.');
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1);
  });
});
