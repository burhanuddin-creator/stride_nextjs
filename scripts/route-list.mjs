// Loads the route lists from src/data/sitemap.ts (the same source src/app/sitemap.ts and the tests use), so the
// verification scripts can never drift from the site. Uses Node's built-in TypeScript type stripping (Node 22.18+)
// plus a resolve hook for the extensionless relative imports in src/.
import { register } from 'node:module';

register('./ts-resolve-hook.mjs', import.meta.url);

const sitemap = await import('../src/data/sitemap.ts');
export const SITE_PATHS = sitemap.SITE_PATHS;
export const NOINDEX_PATHS = sitemap.NOINDEX_PATHS;
