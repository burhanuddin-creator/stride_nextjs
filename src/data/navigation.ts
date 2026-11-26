import { ABOUT_HREF, CONTACT_HREF, FOUNDER_HREF } from '../utils/links';
import { CONDITIONS, WHAT_WE_TREAT_HREF, conditionHref } from './conditions';
import { PATIENT_RESOURCES_HREF, RESOURCE_PAGES, resourceHref } from './resources';
import { SERVICES, SERVICES_INDEX_HREF, serviceHref } from './services';

export interface NavItem {
  label: string;
  to: string;
}

export interface NavGroup extends NavItem {
  /**
   * Submenu links. The group's own `to` is its overview page, reached by clicking the label itself; a separate arrow
   * button opens the submenu, so the overview is not repeated there (About keeps “Our Story” by design).
   */
  children: NavItem[];
}

export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'children' in item;
}

export const aboutNav: NavGroup = {
  label: 'About',
  to: ABOUT_HREF,
  children: [
    { label: 'Our Story', to: ABOUT_HREF },
    { label: 'Meet your Therapist', to: FOUNDER_HREF },
  ],
};

export const servicesNav: NavGroup = {
  label: 'Services',
  to: SERVICES_INDEX_HREF,
  children: SERVICES.map((service) => ({ label: service.name, to: serviceHref(service.slug) })),
};

export const whatWeTreatNav: NavGroup = {
  label: 'What We Treat',
  to: WHAT_WE_TREAT_HREF,
  children: CONDITIONS.map((condition) => ({ label: condition.name, to: conditionHref(condition.slug) })),
};

export const patientResourcesNav: NavGroup = {
  label: 'Patient Resources',
  to: PATIENT_RESOURCES_HREF,
  children: RESOURCE_PAGES.map((page) => ({ label: page.title, to: resourceHref(page.slug) })),
};

/** Primary navigation (client developer package header): About ▾ | Services ▾ | What We Treat ▾ | Patient Resources ▾ | Contact. */
export const primaryNav: (NavItem | NavGroup)[] = [aboutNav, servicesNav, whatWeTreatNav, patientResourcesNav, { label: 'Contact', to: CONTACT_HREF }];

/** Footer links (client developer package footer). */
export const footerLinkGroups: NavItem[][] = [
  [{ label: 'Explore all services', to: SERVICES_INDEX_HREF }],
  [
    { label: 'Our Story', to: ABOUT_HREF },
    { label: 'Meet Dr. Arva Gadly', to: FOUNDER_HREF },
  ],
  [
    { label: 'Your First Visit', to: resourceHref('first-visit') },
    { label: 'Insurance & Payment', to: resourceHref('insurance-payment') },
    { label: 'Contact', to: CONTACT_HREF },
  ],
];
