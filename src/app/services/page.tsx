import ServicesPage from '@/views/services/ServicesPage';
import { pageMetadata } from '@/seo/head';
import { STATIC_META } from '@/seo/routeMeta';

export const metadata = pageMetadata('/services', STATIC_META['/services']);

export default ServicesPage;
