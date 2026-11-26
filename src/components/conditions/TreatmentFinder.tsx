'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { BODY_AREA_OPTIONS, CONDITION_BY_SLUG, CONDITIONS, conditionHref, isConditionSlug, type ConditionInfo } from '../../data/conditions';
import { conditionContactHref, contactHref } from '../../utils/links';
import { ButtonLink } from '../ui/Button';
import styles from './TreatmentFinder.module.css';

/*
 * Branching "Not sure where to start?" guide, transcribed from the client package (website/treatments.js,
 * initTreatmentFinder). Three questions: body area → an area-specific activity question → how long. The result links
 * to treatment-area pages; nothing is stored or sent, and no personal details are asked.
 */

const AREA_QUESTIONS: Record<string, string> = {
  headaches: 'When do headaches interrupt your day?',
  'balance-gait-disorders': 'When do you feel less steady or notice changes in walking?',
  arthritis: 'Which daily task feels harder on your joints?',
  'chronic-pain': 'Where is persistent pain changing your routine?',
  'dizziness-vertigo': 'Which situation brings on dizziness or unsteadiness?',
  'pre-post-surgery': 'Which part of daily life are you preparing for or rebuilding?',
  'sports-injuries': 'Which sporting demand are you working toward?',
  'neck-pain': 'What is your neck making harder?',
  'back-pain-sciatica': 'When does back or leg discomfort get in the way?',
  'shoulder-pain': 'Which shoulder activity feels more difficult?',
  'elbow-wrist-hand-pain': 'Which hand or arm task is getting in the way?',
  'hip-pain': 'Which activity brings your hip concerns to mind?',
  'knee-pain': 'What is your knee making harder?',
  'foot-ankle-pain': 'When do your foot or ankle concerns show up?',
};

const BROAD_ACTIVITIES: [string, string][] = [
  ['reach', 'Reaching, lifting, or getting dressed'],
  ['desk', 'Sitting, driving, or screen time'],
  ['walk', 'Walking, stairs, or running'],
  ['hands', 'Gripping, carrying, or using my hands'],
  ['rest', 'Resting or finding a comfortable position'],
  ['unsure', 'Something else / I’m not sure'],
];

/** Broad activity → treatment areas suggested when no single body area was chosen. */
const BROAD_MATCHES: Record<string, string[]> = {
  reach: ['shoulder-pain', 'elbow-wrist-hand-pain'],
  desk: ['neck-pain', 'back-pain-sciatica'],
  walk: ['hip-pain', 'knee-pain', 'foot-ankle-pain'],
  hands: ['elbow-wrist-hand-pain'],
  rest: ['neck-pain', 'back-pain-sciatica'],
  unsure: [],
};

const DURATIONS: [string, string][] = [
  ['recent', 'Within the last week'],
  ['weeks', 'Several weeks'],
  ['months', 'A few months or longer'],
  ['recurring', 'It comes and goes'],
  ['unsure', 'I’m not sure'],
];

const UNSURE_AREA: [string, string] = ['unsure', 'More than one area / I’m not sure'];

type Step = 1 | 2 | 3 | 4;

export function TreatmentFinder() {
  const [step, setStep] = useState<Step>(1);
  const [area, setArea] = useState('');
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const condition: ConditionInfo | undefined = isConditionSlug(area) ? CONDITION_BY_SLUG[area] : undefined;
  const activities: [string, string][] = condition
    ? [...condition.quizActivities.map((a, i): [string, string] => [`activity-${i}`, a.label]), ['other', 'Something else / several of these']]
    : BROAD_ACTIVITIES;

  // Move focus to the new question/result heading after an answer or Back (not on first render).
  useEffect(() => {
    if (!moved.current) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const go = (next: Step) => {
    moved.current = true;
    setStep(next);
  };

  const answer = (value: string) => {
    if (step === 1) {
      if (area !== value) {
        setActivity('');
        setDuration('');
      }
      setArea(value);
    } else if (step === 2) {
      if (activity !== value) setDuration('');
      setActivity(value);
    } else {
      setDuration(value);
    }
    go((step + 1) as Step);
  };

  if (step === 4) {
    const matches = condition ? [condition] : CONDITIONS.filter((c) => (BROAD_MATCHES[activity] ?? []).includes(c.slug));
    const activityLabel = activities.find(([key]) => key === activity)?.[1] ?? '';
    const durationLabel = DURATIONS.find(([key]) => key === duration)?.[1] ?? '';
    const selectedActivity = condition && activity.startsWith('activity-') ? condition.quizActivities[Number(activity.slice(9))] : undefined;
    const heading = matches.length
      ? condition
        ? `A starting point for ${condition.name.toLowerCase()}.`
        : 'Pages that may feel familiar.'
      : 'You don’t need to have it figured out.';
    const detail = selectedActivity
      ? selectedActivity.detail
      : matches.length
        ? 'These pages connect the area or activity you selected with everyday concerns.'
        : 'Explore the overview at your own pace and see which concerns feel familiar.';

    return (
      <div className={styles.panel}>
        <p className={styles.progressLabel}>Your starting point</p>
        <h3 ref={headingRef} tabIndex={-1} className={styles.question}>
          {heading}
        </h3>
        <ul className={styles.summary} aria-label="Your answers">
          <li>{condition ? condition.name : 'More than one area / not sure'}</li>
          {activityLabel && <li>{activityLabel}</li>}
          {durationLabel && <li>{durationLabel}</li>}
        </ul>
        <p className={styles.detail}>{detail}</p>
        <ul className={styles.results}>
          {matches.length > 0 ? (
            matches.map((item) => (
              <li key={item.slug}>
                <Link href={conditionHref(item.slug)} className={styles.result}>
                  <strong>{item.name}</strong>
                  <span>{item.tagline}</span>
                  <span className={styles.resultArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li>
              <Link href="#treatment-areas" className={styles.result}>
                <strong>Explore all treatment areas</strong>
                <span>Browse the areas above at your own pace.</span>
              </Link>
            </li>
          )}
        </ul>
        <p className={styles.small}>This guide helps you choose what to read. An evaluation is needed to understand what may be causing your symptoms.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.back} onClick={() => go(3)}>
            <span aria-hidden="true">←</span> Back
          </button>
          <ButtonLink to={condition ? conditionContactHref(condition.slug) : contactHref()}>Book Appointment</ButtonLink>
        </div>
      </div>
    );
  }

  const question = step === 1 ? 'Where would you like to focus?' : step === 2 ? (AREA_QUESTIONS[area] ?? 'Which part of your day feels more difficult?') : 'How long have you noticed this?';
  const options: [string, string][] =
    step === 1 ? [...BODY_AREA_OPTIONS.map((a): [string, string] => [a.slug, a.label]), UNSURE_AREA] : step === 2 ? activities : DURATIONS;
  const selected = step === 1 ? area : step === 2 ? activity : duration;

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <p className={styles.progressLabel}>Question {step} of 3</p>
        {step > 1 && (
          <button type="button" className={styles.back} onClick={() => go((step - 1) as Step)}>
            <span aria-hidden="true">←</span> Back
          </button>
        )}
      </div>
      <div className={styles.track} aria-hidden="true">
        <span style={{ '--progress': `${(step / 3) * 100}%` } as CSSProperties} />
      </div>
      {step > 1 && <p className={styles.context}>Exploring: {condition ? condition.name : 'Everyday movement'}</p>}
      <h3 ref={headingRef} tabIndex={-1} id="finder-question" className={styles.question}>
        {question}
      </h3>
      <div className={styles.options} role="group" aria-labelledby="finder-question">
        {options.map(([value, label]) => (
          <button key={value} type="button" className={styles.choice} aria-pressed={selected === value} onClick={() => answer(value)}>
            <span>{label}</span>
            <span className={styles.choiceArrow} aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
      <p className={styles.small}>Choose the option that feels closest. Your answer takes you to the next step.</p>
    </div>
  );
}
