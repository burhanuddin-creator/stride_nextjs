import { FAQ_CATEGORY_FILTERS, PATIENT_FAQ_LIST } from '../../data/resources';
import { Band } from '../../components/blocks/Blocks';
import { FaqFilter } from '../../components/resources/FaqFilter';
import { FaqAnswer, ResourceContact, ResourceHero } from './shared';
import styles from './Resources.module.css';

/**
 * Patient FAQs (client package `#resource/faqs`): 27 questions in five categories. Questions and answers render on
 * the server; only the category filter (FaqFilter) is interactive.
 */
export default function PatientFaqsPage() {
  return (
    <>
      <ResourceHero title="Patient FAQs" tagline="A clearer picture of what comes next." text="Find practical answers about getting started and preparing for care." />

      <Band labelledBy="faq-title">
        <div className="container">
          <h2 id="faq-title" className={styles.blockTitle}>
            What would you like to know?
          </h2>
          <FaqFilter
            filters={FAQ_CATEGORY_FILTERS}
            faqs={PATIENT_FAQ_LIST.map((faq) => ({ category: faq.category, title: faq.question, content: <FaqAnswer faq={faq} /> }))}
          />
        </div>
      </Band>

      <ResourceContact title="Don’t see your question here?" text="Contact Stride for help with the details of your visit." />
    </>
  );
}
