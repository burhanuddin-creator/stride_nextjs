import ContactPage from '@/views/ContactPage';
import { pageMetadata } from '@/seo/head';
import { STATIC_META } from '@/seo/routeMeta';

export const metadata = pageMetadata('/contact', STATIC_META['/contact']);

export default ContactPage;
