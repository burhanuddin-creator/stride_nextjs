import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource-variable/inter';
import '@/styles/global.css';
import { Layout } from '@/components/layout/Layout';
import { serverEnv } from '@/config/env';
import { pageMetadata } from '@/seo/head';
import { STRUCTURED_DATA_ID, structuredDataJson } from '@/seo/structuredData';

/** Site-wide defaults (Home's title/description); every page overrides them with its own pageMetadata(). */
export function generateMetadata(): Metadata {
  return {
    ...pageMetadata('/'),
    icons: {
      icon: [{ url: '/favicon.png', type: 'image/png' }],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#173F40',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // Clinic JSON-LD, built only from src/config/site.ts (escaped so it cannot close its script element).
  const jsonLd = structuredDataJson(serverEnv.siteUrl);
  return (
    <html lang="en-US">
      <body>
        <script type="application/ld+json" id={STRUCTURED_DATA_ID} dangerouslySetInnerHTML={{ __html: jsonLd }} />
        <Layout>{children}</Layout>
        {/* Raw HTML: with JavaScript on, browsers keep <noscript> content as unparsed text, which React would otherwise
            try to hydrate (and report as a text mismatch). */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: 'Stride Physical Therapy &amp; Wellness — 1131 Fairview Ave, Westmont, IL 60559. Some features, such as the request form, need JavaScript.',
          }}
        />
      </body>
    </html>
  );
}
