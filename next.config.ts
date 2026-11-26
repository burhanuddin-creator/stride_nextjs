import type { NextConfig } from 'next';

/**
 * Redirects carried over from the Vite site's public/.htaccess (and the matching client-side React Router redirects).
 * Query strings are preserved automatically. `statusCode: 301` keeps the exact status Apache sent.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      // Canonical host: www.stridephysical.com → https://stridephysical.com (same path and query).
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.stridephysical.com' }],
        destination: 'https://stridephysical.com/:path*',
        statusCode: 301,
      },
      // Retired and moved pages.
      { source: '/wellness', destination: '/services', statusCode: 301 },
      { source: '/physical-therapy', destination: '/services/physical-therapy', statusCode: 301 },
    ];
  },
  async headers() {
    // Same security headers the .htaccess set on every response.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
