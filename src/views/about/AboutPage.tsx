import { addressCityLine, emailHref, faxDisplay, phoneDisplay, phoneHref, site } from '../../config/site';
import { portrait } from '../../data/media';
import { SERVICES_INDEX_HREF } from '../../data/services';
import { CONTACT_QUESTION_HREF, contactHref, FOUNDER_HREF } from '../../utils/links';
import { LegacyHashRedirect } from '../../components/layout/LegacyHashRedirect';
import { Band, CenteredCta } from '../../components/blocks/Blocks';
import { TealHero } from '../../components/blocks/TealHero';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Photo } from '../../components/ui/Photo';
import styles from './About.module.css';

/** Section anchors of the previous single About page → where that content lives now. */
const LEGACY_ANCHORS: Record<string, string> = {
  founder: FOUNDER_HREF,
  approach: `${FOUNDER_HREF}#her-approach`,
};

/** Shared closing band for Our Story and Meet Dr. Arva Gadly. */
export function AboutClosing() {
  return (
    <CenteredCta
      id="about-closing"
      tone="sand"
      title="Let’s work toward what matters to you."
      text="Start with a conversation about your concerns, your day, and the activities you want to get back to."
      actions={
        <>
          <ButtonLink to={contactHref()}>Book My Evaluation</ButtonLink>
        </>
      }
    />
  );
}

/** Our Story (client package `#about`). */
export default function AboutPage() {
  return (
    <>
      <LegacyHashRedirect anchors={LEGACY_ANCHORS} />
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }, { label: 'Our Story' }]}
        title="Our Story"
        tagline="Created for care that feels personal."
        text="Stride began with a desire to give each patient more focused attention and a plan built around their own needs."
        actions={
          <>
            <ButtonLink to={contactHref()} variant="clay">
              Book My Evaluation
            </ButtonLink>
            <ButtonLink to={FOUNDER_HREF} variant="ghost">
              Meet Dr. Arva Gadly
            </ButtonLink>
          </>
        }
      />

      <Band labelledBy="story-title">
        <div className={`container ${styles.story}`}>
          <div>
            <Eyebrow>Why we created Stride</Eyebrow>
            <h2 id="story-title" className={styles.storyTitle}>
              A personal reason.
              <br />A different vision for care.
            </h2>
          </div>
          <div className={styles.storyCopy}>
            <p>
              For Dr. Arva Gadly, starting Stride was personal. During her time in busy physical therapy clinics, she saw how easily appointments could become about keeping up with the schedule. She wanted to build a place where getting to know the person mattered as much as understanding their pain.
            </p>
            <p>
              That person might be a parent who misses picking up their child, someone struggling to get through a workday, or a grandparent who wants to feel steadier on their feet. Those everyday moments are why we do what we do.
            </p>
            <p>
              At Stride, we want to know what brought you here, what you’re worried about, and what you’re looking forward to doing again. We’ll listen, explain your options, and work with you to shape your care. Because when you walk through our door, you should feel that you matter.
            </p>
          </div>
        </div>
      </Band>

      <section className={styles.statement} aria-labelledby="statement-title">
        <div className={`container ${styles.statementInner}`}>
          <Eyebrow>The purpose behind our clinic</Eyebrow>
          <h2 id="statement-title">
            More room for the person.
            <br />
            More focus on their care.
          </h2>
          <p>
            We created Stride because we believe patients deserve attention that reflects their individual needs. That belief is what brought this clinic to
            life—and what we want its future to be built around.
          </p>
        </div>
      </section>

      <Band labelledBy="founder-title">
        <div className={`container ${styles.doctor}`}>
          <Photo
            image={portrait('Dr. Arva Gadly, founder of Stride Physical Therapy & Wellness')}
            className={styles.portrait}
            sizes="(min-width: 900px) 34vw, 400px"
          />
          <div className={styles.doctorCopy}>
            <Eyebrow>Meet our founder</Eyebrow>
            <h2 id="founder-title" className={styles.doctorName}>
              Dr. Arva Gadly
            </h2>
            <p className={styles.role}>Founder · Doctor of Physical Therapy</p>
            <p>
              Dr. Arva Gadly brings clinical, research, and academic experience across the United States and India. Her background includes orthopedic,
              neurological, geriatric, and vestibular rehabilitation.
            </p>
            <p>
              Opening Stride gave her the opportunity to build a clinic around the more personal care experience she wanted to offer. Visit her profile to
              learn about her education, experience, and approach to working with patients.
            </p>
            <div className={styles.doctorAction}>
              <ButtonLink to={FOUNDER_HREF}>Meet Your Physical Therapist</ButtonLink>
            </div>
          </div>
        </div>
      </Band>

      <Band tone="subtle" labelledBy="community-title">
        <div className={`container ${styles.community}`}>
          <div className={styles.communityCopy}>
            <Eyebrow>Putting down roots</Eyebrow>
            <h2 id="community-title" className={styles.communityTitle}>
              Bringing that vision to Westmont.
            </h2>
            <p>
              Stride is our opportunity to turn that purpose into a local place for rehabilitation and wellness. We look forward to getting to know the people
              and families who make this community their home.
            </p>
            <p>If you are looking for care that starts with your individual concerns, we would welcome a conversation.</p>
            <div className={styles.actions}>
              <ButtonLink to={CONTACT_QUESTION_HREF}>Get in Touch</ButtonLink>
              <ButtonLink to={SERVICES_INDEX_HREF} variant="outline" arrow={false}>
                Explore Our Services
              </ButtonLink>
            </div>
          </div>
          <address className={styles.note}>
            <p className={styles.wordmark} aria-hidden="true">
              STRIDE
            </p>
            <p>
              <span className="visually-hidden">Stride </span>Physical Therapy &amp; Wellness
            </p>
            <div className={styles.rule} />
            <p>
              {site.address.street}
              <br />
              {addressCityLine}
            </p>
            <p><a href={phoneHref}>{phoneDisplay}</a></p>
            <p>{faxDisplay}</p>
            <a href={emailHref}>{site.email}</a>
          </address>
        </div>
      </Band>

      <AboutClosing />
    </>
  );
}
