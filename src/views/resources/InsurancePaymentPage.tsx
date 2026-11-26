import { CONTACT_QUESTION_HREF } from '../../utils/links';
import { Band, DotList, NotePanel, RuledColumns, SectionIntro, TwoColumn } from '../../components/blocks/Blocks';
import { ButtonLink } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ResourceContact, ResourceHero } from './shared';
import styles from './Resources.module.css';

/**
 * Insurance & Payment (client package `#resource/insurance-payment`). General guidance only: plan participation,
 * self-pay fees, payment terms and cancellation policy are not confirmed (docs/CONTENT_PENDING.md), so this page
 * names none of them.
 */
export default function InsurancePaymentPage() {
  return (
    <>
      <ResourceHero
        title="Insurance & Payment"
        tagline="Understand your options before you begin."
        text="Ask clear questions about coverage and costs, so you can plan for care with fewer surprises."
      />

      <Band labelledBy="coverage-title">
        <TwoColumn
          aside={
            <NotePanel title="Considering cash pay?">
              <p>Explore why paying directly may be useful, and what to compare before choosing how to pay.</p>
              <div>
                <ButtonLink to="#cash-pay" arrow={false}>
                  Explore Cash-Pay Options <span aria-hidden="true">↓</span>
                </ButtonLink>
              </div>
            </NotePanel>
          }
        >
          <Eyebrow>Start with your specific plan</Eyebrow>
          <h2 id="coverage-title" className={styles.mainTitle}>
            Coverage is personal to your policy.
          </h2>
          <p className={styles.lead}>
            Ask Stride to confirm its current participation with your plan, and speak with your insurer about your outpatient physical therapy benefits. An
            insurance company’s name alone does not confirm coverage for a particular policy.
          </p>
          <p className={styles.lead}>
            Ask about expected out-of-pocket costs and whether your plan requires a referral or authorization. A benefits check is a starting point; your
            insurer determines coverage under the terms of your plan.
          </p>
        </TwoColumn>
      </Band>

      <Band tone="subtle" labelledBy="insurer-questions-title">
        <div className="container">
          <h2 id="insurer-questions-title" className={styles.blockTitle}>
            Useful questions for your insurer.
          </h2>
          <DotList
            items={[
              'Is this clinic in network for my specific plan?',
              'What might I pay for an evaluation and follow-up visits?',
              'Do I need a referral or prior authorization?',
              'Are there visit limits or other conditions on coverage?',
              'Does my deductible apply, and how much remains?',
              'Are the services I am considering covered?',
            ]}
          />
        </div>
      </Band>

      <Band labelledBy="terms-title">
        <div className="container">
          <h2 id="terms-title" className={styles.blockTitle}>
            Three terms you may hear.
          </h2>
          <RuledColumns
            items={[
              {
                title: 'Deductible',
                text: 'An amount you may need to pay for covered care before your plan begins paying for certain services. Check which benefits it applies to.',
              },
              { title: 'Copayment', text: 'A fixed amount you pay for a covered service under your plan.' },
              { title: 'Coinsurance', text: 'Your percentage share of covered costs, often after the applicable deductible has been met.' },
            ]}
          />
          <p className={styles.small}>Your policy determines how these terms apply. Ask your insurer to explain your individual benefits.</p>
        </div>
      </Band>

      <Band tone="subtle" id="cash-pay" labelledBy="cash-pay-title">
        <div className="container">
          <SectionIntro
            id="cash-pay-title"
            eyebrow="Cash pay / self-pay"
            title="Another way to plan for your care."
            intro="Cash pay means paying the clinic directly for an eligible service without submitting that visit to insurance. It may be worth discussing if you do not have coverage, your plan does not cover a service, or you want to compare direct-pay costs with your insurance benefits."
          />
          <RuledColumns
            numbered
            numberStyle="small"
            items={[
              {
                title: 'Clearer cost planning.',
                text: 'Ask for the evaluation and follow-up fees, what each visit includes, and an estimate of expected charges. Knowing the proposed costs in advance can make it easier to budget for care.',
              },
              {
                title: 'Options beyond covered benefits.',
                text: 'If a service is not covered or your available benefits have been used, ask whether a self-pay option is available. Clinical suitability and applicable billing requirements still guide what can be offered.',
              },
              {
                title: 'A more direct payment process.',
                text: 'For eligible self-pay visits, charges are arranged directly with the clinic rather than processed through an insurance claim. Ask the team to explain the payment terms before you begin.',
              },
            ]}
          />
          <div className={styles.subPanel}>
            <h3>Which option makes sense for you?</h3>
            <p>
              Compare the self-pay fee with your expected insurance cost, including any deductible, copayment, or coinsurance. Cash pay is not automatically
              less expensive. Ask your insurer whether payments made outside a claim can count toward your deductible or out-of-pocket limit; do not assume they
              will.
            </p>
            <p>Contact Stride to confirm whether self-pay is available for your situation, what services are included, and the current fees before scheduling.</p>
            <div className={styles.panelAction}>
              <ButtonLink to={CONTACT_QUESTION_HREF}>Ask About Cash-Pay Options</ButtonLink>
            </div>
          </div>
          <div className={styles.subPanel}>
            <h3>Ask about a Good Faith Estimate.</h3>
            <p>
              If you are not using insurance, you can request a written estimate of expected charges before scheduling.{' '}
              <a href="https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/know-your-rights/without-insurance" target="_blank" rel="noopener noreferrer">
                Learn about self-pay cost estimates from CMS <span aria-hidden="true">↗</span>
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </div>
      </Band>

      <ResourceContact
        title="Questions about planning for care?"
        text="Contact the clinic before scheduling to discuss plan participation, payment options, and the information needed for your visit."
      />
    </>
  );
}
