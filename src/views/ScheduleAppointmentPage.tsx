
import { Band } from '../components/blocks/Blocks';
import { TealHero } from '../components/blocks/TealHero';
import { SchedulingForm } from '../components/sections/SchedulingForm';
import { ButtonLink } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { phoneHref, site } from '../config/site';
import { CONTACT_FORM_ID } from '../utils/links';
import styles from './ContactPage.module.css';
import own from './ScheduleAppointmentPage.module.css';

/**
 * "Schedule an Appointment" — online booking of an Initial Evaluation through Laravel and SPRY. If online
 * booking is switched off on the server, the form says so and points to the phone number and the request form.
 * Not indexed (a transactional page).
 */
export default function ScheduleAppointmentPage() {

  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact', to: '/contact' }, { label: 'Schedule an Appointment' }]}
        title="Schedule an Appointment"
        tagline="Book your Initial Evaluation online."
        text="Choose an available time, then enter your details."
      />

      <Band label="Schedule your appointment">
        <div className={`container ${own.layout}`}>
          <div className={own.notes}>
            <Eyebrow>Before you begin</Eyebrow>
            <h2 className={styles.title}>What to expect.</h2>
            <ul className={own.list}>
              <li>Choose a date and time, how you plan to pay, then enter your details.</li>
              <li>Available times come from the clinic&rsquo;s scheduling system and are shown in clinic (Central) time.</li>
              <li>Your appointment is booked only when you see the confirmation on screen.</li>
              <li>Have your date of birth and a US mobile number ready.</li>
            </ul>
            <p className={own.alternative}>
              Prefer to talk to us? Call <a href={phoneHref}>{site.phone}</a>, or send a request instead.
            </p>
            <ButtonLink to={`/contact#${CONTACT_FORM_ID}`} variant="outline" arrow={false}>
              Use the Request Form
            </ButtonLink>
          </div>

          <section className={styles.formPanel} aria-labelledby="schedule-form-title">
            <Eyebrow>Online booking</Eyebrow>
            <h2 id="schedule-form-title" className={styles.title}>
              Book an Initial Evaluation.
            </h2>
            <p className={styles.formIntro}>Enter your details exactly as they appear on your ID or insurance card.</p>
            <SchedulingForm />
          </section>
        </div>
      </Band>
    </>
  );
}
