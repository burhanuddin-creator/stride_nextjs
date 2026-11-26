import type { Metadata } from 'next';
import NotFoundPage from '@/views/NotFoundPage';
import { pageMetadata } from '@/seo/head';
import { NOT_FOUND_META } from '@/seo/routeMeta';

/**
 * Title and description of the not-found page, without a canonical URL. `robots` is cleared because Next.js already
 * adds <meta name="robots" content="noindex"> to every 404 response; a second tag would duplicate it.
 */
export const metadata: Metadata = { ...pageMetadata('/404', NOT_FOUND_META), robots: null };

export default NotFoundPage;
