import { resourceHref } from '../../data/resources';
import { CONTACT_QUESTION_HREF } from '../../utils/links';
import { Band, Checklist, NotePanel, RuledColumns, TwoColumn } from '../../components/blocks/Blocks';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ArrowLink, ResourceContact, ResourceHero } from './shared';
import styles from './Resources.module.css';

const EXPECTATIONS = [
  {
    title: 'Talk through your story.',
    text: 'Share when your symptoms started, what changes them, and which parts of your day feel difficult. Dr. Arva Gadly will review relevant health history and previous care, and ask what you want to get back to—whether that is a comfortable workday, a longer walk, or your favorite activity.',
  },
  {
    title: 'Understand how you move.',
    text: 'Your evaluation may include checking mobility, strength, balance, or everyday movements related to your concern. You do not need to push through a task to prove what you can do. Tell Dr. Arva Gadly what you feel, and ask for a pause or explanation whenever you need one.',
  },
  {
    title: 'Make sense of the findings.',
    text: 'You will have a chance to discuss what the assessment suggests, how it relates to your goals, and which care options may be appropriate. Ask what progress could look like and how it will be reviewed. Recommendations depend on your individual needs and may include further medical assessment when appropriate.',
  },
  {
    title: 'Leave with a clearer next step.',
    text: 'Discuss the proposed plan, any recommended follow-up visits, and what to do between appointments. If exercises or activity guidance are introduced, ask for a demonstration and clear instructions. Share any time, equipment, or other practical limits so the plan can account for your day.',
  },
];

const CHECKLIST = [
  'Photo ID and insurance information, if applicable',
  'A current medication list and relevant health information',
  'Referral or reports you already have, if relevant',
  'Questions and a few goals you want to discuss',
  'Comfortable clothing and suitable footwear',
  'Any paperwork or instructions provided by the clinic',
];

/** Your First Visit (client package `#resource/first-visit`). */
export default function FirstVisitPage() {
  return (
    <>
      <ResourceHero
        title="Your First Visit"
        tagline="A conversation about you. A starting point for care."
        text="Come with your questions, your goals, and a picture of what your day feels like."
      />

      <Band labelledBy="expect-title">
        <TwoColumn
          aside={
            <NotePanel eyebrow="Make room for the details" title="You don’t need to have it all figured out.">
              <p>Be ready to describe what feels difficult, when you notice it, and what you would like to do more comfortably.</p>
              <p>Ask about visit length, arrival instructions, parking, or accessibility needs when arranging your appointment.</p>
            </NotePanel>
          }
        >
          <Eyebrow>What to expect</Eyebrow>
          <h2 id="expect-title" className={styles.mainTitle}>
            Start with what matters to you.
          </h2>
          {EXPECTATIONS.map((item) => (
            <div key={item.title} className={styles.expectation}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
          <div className={styles.after}>
            <ArrowLink to={resourceHref('questions-to-ask-your-therapist')}>Questions you can bring to your visit</ArrowLink>
          </div>
        </TwoColumn>
      </Band>

      <Band tone="subtle" id="before-you-arrive" labelledBy="prepare-title">
        <TwoColumn aside={<Checklist items={CHECKLIST} />}>
          <h2 id="prepare-title" className={styles.mainTitle}>
            A little preparation can help.
          </h2>
          <p className={styles.lead}>Keep these essentials in mind before you leave home. Bring any instructions or documents already provided by the clinic.</p>
        </TwoColumn>
      </Band>

      <Band id="when-to-arrive" labelledBy="arrive-title">
        <TwoColumn
          aside={
            <NotePanel title="Before you head out.">
              <p>
                Check your appointment confirmation and allow time for travel and parking. Contact the clinic ahead of time if you need help with access,
                directions, or check-in instructions.
              </p>
              <p>Running late or need to reschedule? Let the team know as soon as possible so they can advise you on the next step.</p>
            </NotePanel>
          }
        >
          <Eyebrow>Give yourself a little breathing room</Eyebrow>
          <h2 id="arrive-title" className={styles.mainTitle}>
            When to arrive.
          </h2>
          <p className={styles.lead}>
            Confirm your check-in time when you schedule, and plan to arrive a little before your appointment so you have time to settle in, review any
            remaining paperwork, and ask questions before your evaluation begins.
          </p>
          <p className={styles.lead}>
            If you still need to complete forms, let the team know in advance and ask how much extra time to allow. Confirm the expected visit length so you
            can plan work, transportation, or other commitments around your appointment.
          </p>
        </TwoColumn>
      </Band>

      <Band label="Practical questions">
        <div className="container">
          <RuledColumns
            items={[
              {
                title: 'What should I wear?',
                text: 'Choose clothing that allows comfortable movement. Ask whether bringing a change of clothes would help with assessing the area that concerns you.',
              },
              {
                title: 'Have paperwork questions?',
                text: 'Use the forms or instructions supplied by the clinic, and ask for help if you have not received them.',
                action: <ArrowLink to={CONTACT_QUESTION_HREF}>Ask About Paperwork</ArrowLink>,
              },
              {
                title: 'Want to discuss costs?',
                text: 'Confirm your coverage and ask about expected fees before starting, so you can make informed plans.',
                action: <ArrowLink to={resourceHref('insurance-payment')}>Insurance &amp; Payment</ArrowLink>,
              },
            ]}
          />
        </div>
      </Band>

      <ResourceContact title="Ready to talk about your goals?" text="Start with an evaluation and a conversation about what you want to get back to." />
    </>
  );
}
