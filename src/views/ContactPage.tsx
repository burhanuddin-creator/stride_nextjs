import { addressCityLine, directionsUrl, emailHref, faxDisplay, mapEmbedUrl, mapSearchUrl, phoneDisplay, phoneHref, site } from '../config/site';
import { resourceHref } from '../data/resources';
import { CONTACT_FORM_ID, SCHEDULE_APPOINTMENT_PATH } from '../utils/links';
import { Band, CenteredCta } from '../components/blocks/Blocks';
import { DisclosureList } from '../components/blocks/Disclosure';
import { TealHero } from '../components/blocks/TealHero';
import { ContactAppointmentForm } from '../components/sections/ContactAppointmentForm';
import { ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { ArrowLink } from './resources/shared';
import styles from './ContactPage.module.css';

/**
 * Contact (client package `#contact`) around the existing appointment form. The package's demo form is not used:
 * AppointmentForm keeps its validation, payload, idempotency and server-driven email-verification policy. The clinic
 * contact details use the confirmed shared clinic configuration.
 */
export default function ContactPage() {
  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
        title="Contact Stride"
        tagline="Let’s talk about your next step."
        text="Ready to get started, or have a question first? Find the information you need to connect with our clinic."
        actions={
          <>
            <ButtonLink to={`#${CONTACT_FORM_ID}`} variant="clay">
              Book My Evaluation
            </ButtonLink>
            <ButtonLink to={SCHEDULE_APPOINTMENT_PATH} variant="light">
              Schedule an Appointment
            </ButtonLink>
            <ButtonLink to="#visit-clinic" variant="ghost" arrow={false}>
              Plan Your Visit <span aria-hidden="true">↓</span>
            </ButtonLink>
          </>
        }
      />

      <Band label="Contact details and appointment request">
        <div className={`container ${styles.layout}`}>
          <div id="contact-details" className={styles.details}>
            <Eyebrow>We’re here to help</Eyebrow>
            <h2 className={styles.title}>A conversation is a good place to start.</h2>
            <p className={styles.lead}>
              Ask about an evaluation, scheduling, or payment options. If you are not sure which service to choose, tell us you would like help getting
              started.
            </p>
            <dl className={styles.info}>
              <div>
                <dt>Visit us</dt>
                <dd>
                  {site.name}
                  <br />
                  {site.address.street}
                  <br />
                  {addressCityLine}
                </dd>
                <dd>
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    Get Directions <span aria-hidden="true">↗</span>
                    <span className="visually-hidden"> (opens a map in a new tab)</span>
                  </a>
                </dd>
              </div>
              <div>
                <dt>Call or fax</dt>
                <dd><a href={phoneHref}>{phoneDisplay}</a></dd>
                <dd>{faxDisplay}</dd>
              </div>
              <div>
                <dt>Email us</dt>
                <dd>
                  <a href={emailHref}>{site.email}</a>
                </dd>
              </div>
              <div>
                <dt>Office hours</dt>
                <dd>
                  {site.hours.map((h) => (
                    <span key={h.days} className={styles.hoursLine}>
                      {h.days}: {h.time}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className={styles.detailNote}>
              Have a question before booking? Email the clinic at <a href={emailHref}>{site.email}</a>.
            </p>
          </div>

          <section id={CONTACT_FORM_ID} className={styles.formPanel} aria-labelledby="form-title">
            <Eyebrow>Your first step</Eyebrow>
            <h2 id="form-title" className={styles.title}>
              Book my evaluation.
            </h2>
            <p className={styles.formIntro}>
              Share your contact preferences so the team can follow up about scheduling. An appointment is confirmed only after you receive confirmation from
              the clinic.
            </p>
            <ContactAppointmentForm />
          </section>
        </div>
      </Band>

      <section id="visit-clinic" className={styles.location} aria-labelledby="visit-title">
        <div className={`container ${styles.locationLayout}`}>
          <div>
            <Eyebrow>Find your way to Stride</Eyebrow>
            <h2 id="visit-title" className={styles.title}>
              Plan a comfortable arrival.
            </h2>
            <p className={styles.lead}>
              We’re located at 1131 Fairview Ave in Westmont. Use the directions link to plan your route, and check your appointment confirmation for arrival
              instructions.
            </p>
            <p className={styles.lead}>Ask the team about parking, the entrance, or accessibility needs before your visit so you can plan ahead.</p>
            <div className={styles.locationAction}>
              <ButtonAnchor href={directionsUrl} arrow={false} aria-label="Open Directions (opens a map in a new tab)">
                Open Directions <span aria-hidden="true">↗</span>
              </ButtonAnchor>
            </div>
          </div>
          <div className={styles.map}>
            <iframe
              title="Google Map showing 1131 Fairview Avenue, Westmont, Illinois 60559"
              src={mapEmbedUrl}
              width="600"
              height="400"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <a className={styles.mapLink} href={mapSearchUrl} target="_blank" rel="noopener noreferrer">
              View larger map <span aria-hidden="true">↗</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </section>

      <Band labelledBy="contact-faq-title">
        <div className="container">
          <div className={styles.helpHeading}>
            <div>
              <Eyebrow>A little clarity before you begin</Eyebrow>
              <h2 id="contact-faq-title" className={styles.title}>
                Have a question first?
              </h2>
            </div>
            <ArrowLink to={resourceHref('faqs')}>Explore All Patient FAQs</ArrowLink>
          </div>
          <DisclosureList
            narrow
            items={[
              {
                title: 'Does submitting a request confirm an appointment?',
                content: (
                  <p>A request starts the scheduling conversation. The clinic will confirm the date, time, and any information needed before the appointment is booked.</p>
                ),
              },
              {
                title: 'Do I need a referral before I contact Stride?',
                content: (
                  <>
                    <p>
                      You can contact us to discuss an evaluation and ask what is needed for your situation. Visit our Direct Access page for an explanation of
                      referral and insurance considerations.
                    </p>
                    <ArrowLink to={resourceHref('direct-access')}>Learn about Direct Access</ArrowLink>
                  </>
                ),
              },
              {
                title: 'Where can I find details about my first visit and costs?',
                content: (
                  <>
                    <p>
                      Patient Resources includes visit preparation, insurance and payment information, and answers to common questions. Confirm details specific
                      to your appointment and coverage with the clinic.
                    </p>
                    <ArrowLink to={resourceHref('first-visit')}>Prepare for your first visit</ArrowLink>
                  </>
                ),
              },
            ]}
          />
        </div>
      </Band>

      <CenteredCta
        id="contact-bottom"
        title="Feel more prepared for your first visit."
        text="Know what to bring, what to expect, and which questions to ask."
        actions={
          <>
            <ButtonLink to={resourceHref('first-visit')}>Your First Visit</ButtonLink>
            <ButtonLink to={resourceHref('insurance-payment')} variant="outline" arrow={false}>
              Insurance &amp; Payment
            </ButtonLink>
          </>
        }
      />
    </>
  );
}
