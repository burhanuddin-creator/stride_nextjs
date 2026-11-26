'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CONDITIONS } from '../../data/conditions';
import { isServiceSlug } from '../../data/services';
import { isSelectableCareType } from '../../utils/appointmentForm';
import { AppointmentForm } from './AppointmentForm';

/** Only known, non-sensitive topic ids (condition slugs) are accepted from the URL. */
const TOPIC_LABELS: Record<string, string> = Object.fromEntries(CONDITIONS.map((c) => [c.slug, c.name]));

function PreselectedAppointmentForm() {
  const params = useSearchParams();
  const care = params.get('care');
  const topic = params.get('topic');
  const serviceParam = params.get('service');
  const initialService = isServiceSlug(serviceParam) ? serviceParam : undefined;
  // `wellness` (old links) is no longer offered, so it is not preselected.
  const initialCare = isSelectableCareType(care) ? care : undefined;
  const topicLabel = topic && Object.hasOwn(TOPIC_LABELS, topic) ? TOPIC_LABELS[topic] : undefined;
  return <AppointmentForm initialCare={initialCare} initialService={initialService} topicLabel={topicLabel} />;
}

/**
 * The Contact page's appointment request form, preselected from ?care=, ?service= and ?topic= (links from service
 * and condition pages). The query string is only known in the browser for the static page, so the prerendered HTML
 * contains the empty form (the Suspense fallback) and the browser swaps in the preselected one.
 */
export function ContactAppointmentForm() {
  return (
    <Suspense fallback={<AppointmentForm />}>
      <PreselectedAppointmentForm />
    </Suspense>
  );
}
