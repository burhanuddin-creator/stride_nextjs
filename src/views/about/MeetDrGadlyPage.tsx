import Link from 'next/link';
import { conditionHref } from '../../data/conditions';
import { portrait } from '../../data/media';
import { resourceHref } from '../../data/resources';
import { serviceHref } from '../../data/services';
import { ABOUT_HREF, contactHref } from '../../utils/links';
import { ApproachTabs } from '../../components/about/ApproachTabs';
import { Band } from '../../components/blocks/Blocks';
import { DisclosureList } from '../../components/blocks/Disclosure';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Photo } from '../../components/ui/Photo';
import { ArrowLink } from '../resources/shared';
import { AboutClosing } from './AboutPage';
import styles from './About.module.css';

const APPROACH = [
  {
    label: 'Your story',
    title: 'What matters to you comes first.',
    text: 'Discuss what feels difficult, how it affects your day, and what you want to get back to.',
  },
  {
    label: 'Your understanding',
    title: 'Know the purpose behind your plan.',
    text: 'Explore the findings, ask questions, and understand how the recommendations connect with your goals.',
  },
  {
    label: 'Your progress',
    title: 'Your feedback shapes what comes next.',
    text: 'Review what is changing and what still needs attention, then discuss adjustments together.',
  },
];

const FOCUS_AREAS = [
  {
    title: 'Orthopedic rehabilitation',
    text: 'Muscle and joint concerns, movement limitations, and recovery focused on daily function.',
    to: serviceHref('physical-therapy'),
    link: 'Physical Therapy',
  },
  {
    title: 'Vestibular rehabilitation',
    text: 'Dizziness, vertigo, motion sensitivity, and balance-related concerns.',
    to: serviceHref('vestibular-therapy'),
    link: 'Vestibular Therapy',
  },
  {
    title: 'Neurological & older-adult rehabilitation',
    text: 'Experience with Parkinson’s disease, balance, walking, and maintaining everyday mobility.',
    to: conditionHref('balance-gait-disorders'),
    link: 'Balance & Gait',
  },
  {
    title: 'Trigger point dry needling',
    text: 'Additional training in an optional technique considered within a broader rehabilitation plan.',
    to: serviceHref('dry-needling'),
    link: 'Dry Needling',
  },
];

/** Meet Dr. Arva Gadly (client package `#about/meet-dr-gadly`). Credentials are as supplied; see docs/CONTENT_PENDING.md. */
export default function MeetDrGadlyPage() {

  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About', to: ABOUT_HREF }, { label: 'Meet Dr. Arva Gadly' }]}
        title="Meet Dr. Arva Gadly, PT, DPT, DN"
        tagline="A focus on movement. A connection to your goals."
        text="Get to know the physical therapist behind Stride’s approach to personal, practical care."
        actions={
          <>
            <ButtonLink to={contactHref()} variant="clay">
              Book My Evaluation
            </ButtonLink>
            <ButtonLink to={ABOUT_HREF} variant="ghost">
              Our Story
            </ButtonLink>
          </>
        }
      />

      <Band labelledBy="profile-title">
        <div className={`container ${styles.doctor}`}>
          <Photo
            image={portrait('Professional portrait of Dr. Arva Gadly')}
            className={styles.portrait}
            sizes="(min-width: 900px) 34vw, 400px"
            priority
          />
          <div className={styles.doctorCopy}>
            <Eyebrow>Your physical therapist</Eyebrow>
            <h2 id="profile-title" className={styles.doctorName}>
              Dr. Arva Gadly
            </h2>
            <p className={styles.role}>Doctor of Physical Therapy · Illinois-licensed physical therapist</p>
            <p>
              Dr. Arva Gadly’s background brings together clinical practice, research, and academic experience across the United States and India. Her work
              includes orthopedic, neurological, geriatric, and vestibular rehabilitation, with experience in outpatient settings in Illinois and New York.
            </p>
            <p>
              She earned her Doctor of Physical Therapy degree from the University of Montana in 2021, following a Bachelor of Physical Therapy degree from Dr.
              M.G.R. University in India in 2019. She was awarded a Gold Medal for academic excellence in physical therapy and is a co-author of peer-reviewed
              research on balance and mobility in people with Parkinson’s disease.
            </p>
            <p>
              At Stride, Dr. Arva Gadly connects clinical assessment with the activities and routines that matter to each patient. Questions, preferences, and
              feedback are part of that conversation throughout care.
            </p>
            <p>
              Outside the clinic, Dr. Arva Gadly loves spending time with her daughter, baking, traveling, and getting together with friends. She enjoys staying active and participating in throwball tournaments, embracing both the competition and the camaraderie. She also volunteers at a community clinic, sharing her time and skills to support others.
            </p>
          </div>
        </div>
      </Band>

      <section id="her-approach" className={styles.approach} aria-labelledby="approach-title">
        <div className="container">
          <Eyebrow>Her approach</Eyebrow>
          <h2 id="approach-title">Understand the person. Connect the plan.</h2>
          <ApproachTabs tabs={APPROACH} label="Explore Dr. Arva Gadly’s approach" />
        </div>
      </section>

      <Band labelledBy="experience-title">
        <div className="container">
          <div className={styles.sectionHeading}>
            <div>
              <Eyebrow>Areas of experience</Eyebrow>
              <h2 id="experience-title" className={styles.sectionTitle}>
                Care for a range of movement concerns.
              </h2>
            </div>
            <p>These areas reflect Dr. Arva Gadly’s clinical background. Your evaluation helps determine the appropriate focus for your own care.</p>
          </div>
          <ul className={styles.focusList}>
            {FOCUS_AREAS.map((area) => (
              <li key={area.title}>
                <h3>{area.title}</h3>
                <p>{area.text}</p>
                <Link href={area.to}>
                  {area.link} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <Band tone="subtle" labelledBy="background-title">
        <div className="container">
          <Eyebrow>Education &amp; professional background</Eyebrow>
          <h2 id="background-title" className={styles.backgroundTitle}>
            A foundation in learning and clinical practice.
          </h2>
          <DisclosureList
            narrow
            items={[
              {
                title: 'Education & licensure',
                content: (
                  <ul>
                    <li>Doctor of Physical Therapy — University of Montana, 2021.</li>
                    <li>Bachelor of Physical Therapy — Dr. M.G.R. University, 2019.</li>
                    <li>Licensed physical therapist in Illinois.</li>
                    <li>Gold Medalist in Physical Therapy — academic excellence award.</li>
                  </ul>
                ),
              },
              {
                title: 'Additional training',
                content: (
                  <ul>
                    <li>Trigger Point Dry Needling certification, 2025.</li>
                    <li>Essentials of Physiotherapy in Leprosy — Schieffelin Leprosy Research &amp; Training Centre, 2019.</li>
                    <li>Yoga for Human Excellence — Bharathiar University, 2018.</li>
                    <li>Taping certification — Ashira Foundation Trust, 2017.</li>
                  </ul>
                ),
              },
              {
                title: 'Research & clinical experience',
                content: (
                  <>
                    <p>
                      Her background includes outpatient rehabilitation in Illinois and New York and collaboration with physicians across orthopedic,
                      neurological, ENT, and primary care settings.
                    </p>
                    <p>
                      She co-authored a 2020 paper in the Hong Kong Physiotherapy Journal examining home-based Tai Chi, yoga, and conventional balance exercise for
                      functional balance and mobility in people with idiopathic Parkinson’s disease.
                    </p>
                  </>
                ),
              },
            ]}
          />
        </div>
      </Band>

      <Band labelledBy="first-conversation-title">
        <div className={`container ${styles.reading}`}>
          <Eyebrow>Your first conversation</Eyebrow>
          <h2 id="first-conversation-title" className={styles.sectionTitle}>
            You can arrive with questions.
          </h2>
          <p>
            You do not need to have your goals perfectly defined. Start with what feels difficult and what you would like to do more comfortably. Dr. Arva Gadly can
            help connect that conversation with an evaluation and possible next steps.
          </p>
          <ArrowLink to={resourceHref('first-visit')}>See what your first visit involves</ArrowLink>
        </div>
      </Band>

      <AboutClosing />
    </>
  );
}
