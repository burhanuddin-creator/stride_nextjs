/**
 * Home page copy and data from the Home page developer package (design-reference/Stride_Home_Page_Developer_Package/:
 * content/HOME_PAGE_COPY.md, content/ACTIVITY_TABS.json). Copy is verbatim except the clinic's own decisions:
 * “Dr. Arva Gadly” is used throughout (the package says “Dr. Gadly” after the first mention), and package links are
 * mapped to the site's existing routes (developer-notes/LINK_MAPPING.csv lists proposed paths only).
 */
import type { ConditionSlug } from './conditions';
import type { MediaId } from './media';
import type { ResourceSlug } from './resources';
import type { ServiceSlug } from './services';

export interface ActivityTab {
  label: string;
  title: string;
  copy: string;
  image: MediaId;
  alt: string;
  links: readonly { label: string; slug: ConditionSlug }[];
}

/** “What would you like to feel easier?” — each tab changes the image, title, explanation and condition links together. */
export const HOME_ACTIVITY_TABS: readonly ActivityTab[] = [
  {
    label: 'Move through your day',
    title: 'Make room for the everyday.',
    copy: 'Getting out of bed, sitting through work, carrying groceries—small tasks can take a lot out of you when movement feels difficult. Start with the activity you want to feel more comfortable doing.',
    image: 'condition-back-pain-sciatica-v2',
    alt: 'A man pauses beside a laundry basket with a hand at his lower back.',
    links: [
      { label: 'Back & Sciatica', slug: 'back-pain-sciatica' },
      { label: 'Neck', slug: 'neck-pain' },
      { label: 'Hip', slug: 'hip-pain' },
    ],
  },
  {
    label: 'Reach, lift & carry',
    title: 'For the things you reach for.',
    copy: 'A high shelf, a jacket sleeve, or a bag in your hand. Explore care for the shoulder, arm, and hand concerns that can interrupt familiar routines.',
    image: 'condition-shoulder-pain-v2',
    alt: 'A woman pauses an overhead reach in her kitchen.',
    links: [
      { label: 'Shoulder', slug: 'shoulder-pain' },
      { label: 'Elbow, Wrist & Hand', slug: 'elbow-wrist-hand-pain' },
    ],
  },
  {
    label: 'Feel steadier on your feet',
    title: 'Take your next step with support.',
    copy: 'Walking outdoors, turning your head, or taking the stairs may feel less comfortable or secure. Learn about care for walking, balance, and dizziness concerns.',
    image: 'condition-balance-gait-disorders-v2',
    alt: 'An older man walks carefully with a cane and a companion nearby.',
    links: [
      { label: 'Balance & Gait', slug: 'balance-gait-disorders' },
      { label: 'Dizziness & Vertigo', slug: 'dizziness-vertigo' },
      { label: 'Foot & Ankle', slug: 'foot-ankle-pain' },
    ],
  },
  {
    label: 'Get back to activity',
    title: 'Reconnect with what you enjoy.',
    copy: 'Whether you miss a weekend run, your favorite workout, or time on the court, your goals deserve a plan that considers the demands of your activity.',
    image: 'condition-sports-injuries-v2',
    alt: 'A runner sits beside a running track and gently holds her ankle.',
    links: [
      { label: 'Sports Injuries', slug: 'sports-injuries' },
      { label: 'Knee', slug: 'knee-pain' },
      { label: 'After Surgery', slug: 'pre-post-surgery' },
    ],
  },
];

/** “The Stride difference” editorial rows. */
export const HOME_DIFFERENCE = [
  {
    title: 'We listen to what matters.',
    text: 'Tell us what feels difficult, what you’ve tried, and what you want to get back to. Your goals help give your care direction.',
  },
  {
    title: 'We explain your options.',
    text: 'Understand what your evaluation suggests and why a treatment is recommended. There’s room for your questions and preferences.',
  },
  {
    title: 'We adjust together.',
    text: 'Share how you’re feeling during and between visits. Your progress and feedback help shape the next step.',
  },
] as const;

/** Featured services (package order). Images are the package's clinic illustrations, shown beside the visible title. */
export const HOME_FEATURED_SERVICES: readonly { slug: ServiceSlug; title: string; text: string; image: MediaId }[] = [
  {
    slug: 'physical-therapy',
    title: 'Physical Therapy',
    text: 'Build strength, mobility, and confidence for the movements that matter.',
    image: 'physical-therapy-clinic-v2',
  },
  {
    slug: 'sports-rehab',
    title: 'Sports Rehab',
    text: 'Connect rehabilitation with the demands of your sport and return-to-activity goals.',
    image: 'sports-rehab-clinic-v3',
  },
  {
    slug: 'vestibular-therapy',
    title: 'Vestibular Therapy',
    text: 'Support for dizziness, motion sensitivity, and balance challenges.',
    // SVG wrapper around the raster scene: keeps the package's approved crop (viewBox) exactly.
    image: 'vestibular-therapy-clinic-v3',
  },
  {
    slug: 'oncology-rehab',
    title: 'Oncology Rehab',
    text: 'Support for movement, strength, and daily function during and after cancer treatment.',
    image: 'oncology-rehab-clinic-v3',
  },
];

/** “Getting started, made clearer.” — one answer open at a time. */
export const HOME_FAQS: readonly { question: string; answer: string; link: { label: string; resource: ResourceSlug } }[] = [
  {
    question: 'What happens at my first appointment?',
    answer:
      'Your evaluation begins with a conversation about your symptoms, health history, and the activities you want to get back to. Dr. Arva Gadly may assess movement, strength, balance, or other areas relevant to your concern. You’ll discuss the findings, possible next steps, and how a plan could fit your goals. Bring your questions and any relevant reports or referral paperwork you already have.',
    link: { label: 'See what to bring and when to arrive', resource: 'first-visit' },
  },
  {
    question: 'Do I need a referral before I come in?',
    answer:
      'Illinois allows PT with or without a referral. Your insurance may still require a referral or authorization for coverage. Contact Stride to discuss what applies to your visit.',
    link: { label: 'Learn about Direct Access', resource: 'direct-access' },
  },
  {
    question: 'How do insurance and cash-pay options work?',
    answer:
      'Confirm Stride’s participation with your specific insurance plan and ask your insurer about outpatient PT benefits, referral or authorization requirements, and expected out-of-pocket costs. If you prefer to pay directly, ask about current self-pay fees and what each visit includes. Compare your options before deciding; an insurance benefits estimate is not a guarantee of payment.',
    link: { label: 'Explore insurance and cash-pay questions', resource: 'insurance-payment' },
  },
];

/** Home hero: the package's final clinic view (generated illustration; R and D counters corrected). */
export const HOME_HERO = {
  image: 'home-hero-clinic-logo-v2',
  alt: 'Illustrative sunlit Stride clinic interior with the approved teal, clay, and sand logo on the wall above a treatment table.',
} as const satisfies { image: MediaId; alt: string };
