import { resourceHref } from '../../data/resources';
import { Band, NotePanel, RuledColumns, TwoColumn } from '../../components/blocks/Blocks';
import { DisclosureList } from '../../components/blocks/Disclosure';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ArrowLink, ResourceContact, ResourceHero } from './shared';
import styles from './Resources.module.css';

function External({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

/** Direct Access (client package `#resource/direct-access`). Clinical/legal wording is pending clinic review (docs/CONTENT_PENDING.md). */
export default function DirectAccessPage() {
  return (
    <>
      <ResourceHero
        title="Direct Access"
        tagline="Your next step can start with PT."
        text="You may be able to begin physical therapy without a referral. Understand your options and what to check before your first visit."
      />

      <Band labelledBy="referral-title">
        <TwoColumn
          aside={
            <NotePanel title="You do not need to know your diagnosis to ask.">
              <p>
                Tell us what feels difficult and what you want to get back to. Dr. Arva Gadly can assess whether physical therapy is appropriate and help identify the
                next step, including referral to another health care professional when needed.
              </p>
              <ArrowLink to={resourceHref('first-visit')}>What to expect at your first visit</ArrowLink>
            </NotePanel>
          }
        >
          <Eyebrow>A simpler starting point</Eyebrow>
          <h2 id="referral-title" className={styles.mainTitle}>
            Do I need a referral to see a physical therapist?
          </h2>
          <p className={styles.lead}>
            In Illinois, a licensed physical therapist can evaluate and treat you with or without a referral from another health care professional. This is
            called Direct Access. You can contact Stride to discuss an evaluation when pain, stiffness, balance, or changes in movement are getting in the way of
            your day.
          </p>
          <p className={styles.lead}>
            Direct Access does not mean every service or visit is automatically covered by insurance. Your plan may have referral, authorization, or network
            requirements. Confirm those details before your appointment so you understand both your care options and potential costs.
          </p>
        </TwoColumn>
      </Band>

      <Band tone="subtle" labelledBy="why-direct-title">
        <div className="container">
          <h2 id="why-direct-title" className={styles.blockTitle}>
            Why patients consider Direct Access.
          </h2>
          <RuledColumns
            numbered
            numberStyle="small"
            items={[
              {
                title: 'A place to start.',
                text: 'You can contact a physical therapist directly about a movement concern, even if you have not yet received a referral.',
              },
              {
                title: 'Clarity about your concern.',
                text: 'An evaluation connects your symptoms, movement, and everyday goals, helping you understand whether PT may be a useful next step.',
              },
              {
                title: 'Care that stays connected.',
                text: 'Starting with PT can still include communication with your treating health care professional and a referral when another assessment is needed.',
              },
            ]}
          />
        </div>
      </Band>

      <Band labelledBy="access-coverage-title">
        <TwoColumn
          aside={
            <NotePanel title="Already have a referral?">
              <p>
                You can still bring it, along with relevant reports and any instructions from your medical team. Let Dr. Arva Gadly know about recent surgery, current
                precautions, or other care you are receiving.
              </p>
            </NotePanel>
          }
        >
          <Eyebrow>Before you book</Eyebrow>
          <h2 id="access-coverage-title" className={styles.mainTitle}>
            Access to care and insurance coverage are different.
          </h2>
          <p className={styles.lead}>
            Ask your insurer whether your outpatient physical therapy benefits require a referral or prior authorization and whether Stride is in network for
            your specific plan. Also ask what you may owe for the evaluation and follow-up visits.
          </p>
          <p className={styles.lead}>
            If you plan to pay directly, contact the clinic to discuss availability, fees, and any requirements that apply to your situation. Direct Access does
            not remove applicable insurance or billing rules.
          </p>
          <div className={styles.after}>
            <ButtonLink to={resourceHref('insurance-payment')}>Insurance &amp; Payment</ButtonLink>
          </div>
        </TwoColumn>
      </Band>

      <Band tone="subtle" labelledBy="team-title">
        <TwoColumn
          aside={
            <NotePanel title="Do not have a regular medical provider?">
              <p>
                Let us know when arranging your evaluation. Illinois rules address notifying a health care professional of your choice when you do not have a
                treating provider.
              </p>
            </NotePanel>
          }
        >
          <Eyebrow>Working with your health care team</Eyebrow>
          <h2 id="team-title" className={styles.mainTitle}>
            Your progress guides the next step.
          </h2>
          <p className={styles.lead}>
            Illinois requires coordination with your treating health care professional when PT begins without a referral. Your therapist also monitors
            improvement and refers you for medical assessment when required by state law or when a concern falls outside the scope of physical therapy.
          </p>
          <p className={styles.lead}>
            Direct Access is not a fixed allowance of visits for everyone. Dr. Arva Gadly can explain the requirements relevant to your care and discuss when to
            involve another clinician.
          </p>
        </TwoColumn>
      </Band>

      <Band labelledBy="direct-faq-title">
        <div className="container">
          <h2 id="direct-faq-title" className={styles.blockTitle}>
            A few questions about starting directly.
          </h2>
          <DisclosureList
            narrow
            items={[
              {
                title: 'Can I book an evaluation without seeing my doctor first?',
                content: (
                  <p>
                    Illinois law allows PT evaluation and treatment without a referral. Contact Stride to discuss scheduling, and check whether your insurance
                    requires a referral or authorization for the visit to be covered.
                  </p>
                ),
              },
              {
                title: 'Does Direct Access mean my insurance will pay?',
                content: (
                  <>
                    <p>
                      No. Permission to receive PT without a referral is different from your plan’s payment rules. Coverage depends on your benefits, provider
                      network, required approvals, and other policy terms. Confirm these before your appointment.
                    </p>
                    <ArrowLink to={resourceHref('insurance-payment')}>Explore coverage and payment questions</ArrowLink>
                  </>
                ),
              },
              {
                title: 'What happens if I need care beyond physical therapy?',
                content: (
                  <p>
                    Dr. Arva Gadly will discuss the findings and recommend an appropriate next step. This may include contacting your treating health care professional
                    or referring you for further assessment. Illinois also sets requirements for referral when improvement is not demonstrated or other specified
                    circumstances apply.
                  </p>
                ),
              },
            ]}
          />
          <p className={styles.small}>
            Read more: <External href="https://www.ilga.gov/legislation/ilcs/fulltext?DocName=022500900K1.2">Illinois Physical Therapy Act, Section 1.2</External>{' '}
            · <External href="https://www.ipta.org/page/DirectAccess">Illinois Physical Therapy Association: Direct Access</External>
          </p>
        </div>
      </Band>

      <ResourceContact
        title="Wondering if you can start with PT?"
        text="Contact Stride to discuss your concern and referral requirements, or book your evaluation when you are ready."
      />
    </>
  );
}
