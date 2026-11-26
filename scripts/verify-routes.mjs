// Verifies a running build (`next start`) over plain HTTP — the initial HTML, as a crawler or a direct visit sees it,
// without JavaScript. Mirrors the checks the Vite site's prerender step enforced:
//   node scripts/verify-routes.mjs [--base http://localhost:3100] [--site-url https://stridephysical.com] [--staging]
// --site-url / --staging must match the SITE_URL / SITE_ENV the build was made with.
// Read-only: only GET requests to the local server; nothing is submitted and no API is called.
import http from 'node:http';
import { SITE_PATHS, NOINDEX_PATHS } from './route-list.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const base = opt('--base', 'http://localhost:3100').replace(/\/+$/, '');
const siteUrl = opt('--site-url', '').replace(/\/+$/, '');
const staging = args.includes('--staging');

const failures = [];
const fail = (msg) => failures.push(msg);
const get = (path, init = {}) => fetch(`${base}${path}`, { redirect: 'manual', ...init });
const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
/** The HTML a visitor sees: without <script> contents (the RSC payload repeats text, e.g. the not-found boundary). */
const visible = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const titles = new Map();
async function checkPage(path, { indexable }) {
  const res = await get(path);
  const html = await res.text();
  if (res.status !== 200) return fail(`${path}: HTTP ${res.status}`);
  if (!/text\/html/.test(res.headers.get('content-type') ?? '')) fail(`${path}: content-type ${res.headers.get('content-type')}`);

  const h1s = visible(html).match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) fail(`${path}: ${h1s.length} <h1> elements`);
  if (/couldn’t find that page/.test(visible(html))) fail(`${path}: rendered the not-found page`);
  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
  if (!title) fail(`${path}: no <title>`);
  if (titles.has(title)) fail(`${path}: same title as ${titles.get(title)} (${title})`);
  titles.set(title, path);
  if (!/<meta name="description" content="[^"]+"/.test(html)) fail(`${path}: no meta description`);
  if (!/<meta property="og:title" content="[^"]+"/.test(html)) fail(`${path}: no og:title`);
  if (!/<meta name="twitter:card" content="summary"/.test(html)) fail(`${path}: no twitter:card`);

  // Shared layout in the initial HTML: skip link, header navigation, footer, clinic JSON-LD (exactly once).
  if (!html.includes('Skip to main content')) fail(`${path}: no skip link`);
  if (!/<nav[^>]*aria-label="Main"/.test(html)) fail(`${path}: no main navigation`);
  if (!/<footer/.test(html) || !html.includes('Design and Developed by Stride Physical Therapy')) fail(`${path}: no footer`);
  const jsonLd = attr(html, /<script type="application\/ld\+json" id="clinic-jsonld">([^<]*)<\/script>/g);
  if (jsonLd.length !== 1) fail(`${path}: ${jsonLd.length} clinic JSON-LD blocks`);
  else {
    const data = JSON.parse(jsonLd[0]);
    if (data['@type'] !== 'Physiotherapy') fail(`${path}: JSON-LD @type ${data['@type']}`);
    if (siteUrl && data.url !== `${siteUrl}/`) fail(`${path}: JSON-LD url ${data.url}`);
  }

  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/g);
  const expected = siteUrl && indexable ? [path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`] : [];
  if (JSON.stringify(canonical) !== JSON.stringify(expected)) fail(`${path}: canonical ${JSON.stringify(canonical)}, expected ${JSON.stringify(expected)}`);
  const ogUrl = attr(html, /<meta property="og:url" content="([^"]+)"/g);
  if (JSON.stringify(ogUrl) !== JSON.stringify(expected)) fail(`${path}: og:url ${JSON.stringify(ogUrl)}, expected ${JSON.stringify(expected)}`);
  if (siteUrl && !html.includes(`<meta property="og:image" content="${siteUrl}/assets/social/stride-logo.jpg"`)) fail(`${path}: no absolute og:image`);
  if (!siteUrl && /og:image|https:\/\/stridephysical\.com/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) fail(`${path}: absolute URLs without SITE_URL`);

  const robots = attr(html, /<meta name="robots" content="([^"]+)"/g);
  const expectedRobots = staging ? ['noindex, nofollow'] : indexable ? [] : ['noindex'];
  if (JSON.stringify(robots) !== JSON.stringify(expectedRobots)) fail(`${path}: robots ${JSON.stringify(robots)}, expected ${JSON.stringify(expectedRobots)}`);
  if (staging !== html.includes('Staging site for testing.')) fail(`${path}: staging notice ${staging ? 'missing' : 'present'}`);
}

async function checkRedirect(path, location, status = [301, 308], init) {
  const res = await get(path, init);
  const to = res.headers.get('location') ?? '';
  const target = to.startsWith('http') ? to : new URL(to, base).toString().replace(base, '');
  if (!status.includes(res.status) || target !== location) fail(`${path}: ${res.status} → ${to}, expected ${status.join('/')} → ${location}`);
}

async function checkNotFound(path) {
  const res = await get(path);
  const html = await res.text();
  if (res.status !== 404) fail(`${path}: HTTP ${res.status}, expected 404`);
  if (!/<h1[^>]*>We couldn’t find that page.<\/h1>/.test(visible(html))) fail(`${path}: not the not-found page`);
  if (!/<meta name="robots" content="noindex[^"]*"/.test(html)) fail(`${path}: not-found page lacks noindex`);
  if (/<link rel="canonical"/.test(html)) fail(`${path}: not-found page has a canonical URL`);
}

for (const path of SITE_PATHS) await checkPage(path, { indexable: true });
for (const path of NOINDEX_PATHS) await checkPage(path, { indexable: false });

// Redirects (from the .htaccess): permanent, query string kept; trailing slashes go to the canonical URL.
await checkRedirect('/wellness', '/services', [301]);
await checkRedirect('/physical-therapy', '/services/physical-therapy', [301]);
await checkRedirect('/physical-therapy?care=physical_therapy', '/services/physical-therapy?care=physical_therapy', [301]);
await checkRedirect('/services/', '/services');
await checkRedirect('/what-we-treat/knee-pain/', '/what-we-treat/knee-pain');
// fetch() cannot override the Host header, so the canonical-host redirect is checked with node:http.
const www = await new Promise((resolve, reject) => {
  const url = new URL(`${base}/about?x=1`);
  http
    .get({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { host: 'www.stridephysical.com' } }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location });
    })
    .on('error', reject);
});
if (www.status !== 301 || www.location !== 'https://stridephysical.com/about?x=1') fail(`www host: ${www.status} → ${www.location}`);

for (const path of ['/no-such-page', '/services/no-such-service', '/what-we-treat/no-such-condition', '/patient-resources/no-such-page', '/about/nope'])
  await checkNotFound(path);

// sitemap.xml and robots.txt
const sitemap = await (await get('/sitemap.xml')).text();
const locs = attr(sitemap, /<loc>([^<]+)<\/loc>/g);
if (siteUrl && !staging) {
  const expected = SITE_PATHS.map((p) => `${siteUrl}${p}`);
  if (JSON.stringify(locs) !== JSON.stringify(expected)) fail(`sitemap.xml: ${locs.length} URLs, expected ${expected.length}`);
} else if (locs.length) fail(`sitemap.xml lists ${locs.length} URLs outside production`);
const robotsTxt = (await (await get('/robots.txt')).text()).trim();
const expectedRobotsTxt = siteUrl && !staging ? `User-Agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml` : 'User-Agent: *\nAllow: /';
if (robotsTxt !== expectedRobotsTxt) fail(`robots.txt:\n${robotsTxt}\nexpected:\n${expectedRobotsTxt}`);

// Static assets referenced by the site.
for (const asset of ['/favicon.png', '/apple-touch-icon.png', '/assets/social/stride-logo.jpg']) {
  const res = await get(asset);
  if (res.status !== 200) fail(`${asset}: HTTP ${res.status}`);
}
const security = await get('/');
if (security.headers.get('x-content-type-options') !== 'nosniff') fail('X-Content-Type-Options header missing');
if (security.headers.get('referrer-policy') !== 'strict-origin-when-cross-origin') fail('Referrer-Policy header missing');

const pages = SITE_PATHS.length + NOINDEX_PATHS.length;
if (failures.length) {
  console.error(`verify-routes: ${failures.length} problem(s)\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log(`verify-routes: OK — ${pages} pages, redirects, 404s, sitemap.xml, robots.txt (${staging ? 'staging' : siteUrl ? `production ${siteUrl}` : 'local'})`);
