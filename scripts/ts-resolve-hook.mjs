// Node module resolve hook (used by scripts/route-list.mjs): lets Node load src/**/*.ts files whose relative
// imports omit the ".ts" extension, as the bundler-style TypeScript in src/ does.
export async function resolve(specifier, context, next) {
  if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL?.includes('/src/')) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      // fall through to the default resolution
    }
  }
  return next(specifier, context);
}
