import { Band } from '../components/blocks/Blocks';
import { TealHero } from '../components/blocks/TealHero';
import { SchedulingForm } from '../components/sections/SchedulingForm';
import { Eyebrow } from '../components/ui/Eyebrow';
import own from './ScheduleAppointmentPage.module.css';

/**
 * "Schedule an Appointment" — online booking of an Initial Evaluation through Laravel and SPRY, in three short steps
 * with the appointment summary (provider, visit, duration, clinic time zone, the phone and request-form alternatives)
 * beside them. If online booking is switched off on the server, the form says so and points to the phone number and the
 * request form. Not indexed (a transactional page).
 */
export default function ScheduleAppointmentPage() {
  return (
    <>
      <TealHero
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact', to: '/contact' }, { label: 'Schedule an Appointment' }]}
        title="Schedule an Appointment"
        tagline="Book your Initial Evaluation online in three short steps."
      />

      <Band tone="warm" labelledBy="schedule-form-title" className={own.band}>
        <div className="container">
          <section className={own.panel} aria-labelledby="schedule-form-title">
            <div className={own.head}>
              <Eyebrow>Online booking</Eyebrow>
              <h2 id="schedule-form-title" className={own.title}>
                Book an Initial Evaluation.
              </h2>
            </div>
            <SchedulingForm />
          </section>
        </div>
      </Band>
    </>
  );
}
