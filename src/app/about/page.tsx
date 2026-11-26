import AboutPage from '@/views/about/AboutPage';
import { pageMetadata } from '@/seo/head';
import { STATIC_META } from '@/seo/routeMeta';

export const metadata = pageMetadata('/about', STATIC_META['/about']);

export default AboutPage;
