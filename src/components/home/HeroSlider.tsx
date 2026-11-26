'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import styles from './HeroSlider.module.css';

export interface HeroSlide {
  /** Short name used by screen readers and the dot buttons, e.g. "Welcome". */
  label: string;
  /** Slide markup, rendered on the server. */
  content: ReactNode;
}

const INTERVAL_MS = 7000;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Motion is allowed in the browser unless reduced motion is requested; the server (and hydration) assume it is not. */
function useMotionAllowed() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => typeof window.matchMedia !== 'function' || !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/**
 * Home hero carousel (WAI-ARIA APG carousel pattern). All slides share one grid cell, so the slider is as tall as its
 * tallest slide and nothing below it moves when slides change; slides crossfade.
 *
 * - The first slide (with the page's h1) is the one in the initial HTML; inactive slides are `inert` and hidden from
 *   assistive technology.
 * - Auto-advance (every 7 s) starts only after hydration and not under reduced motion (Play still works). It pauses while the pointer
 *   is over the slider, while focus is inside it and while the tab is hidden, and stops for good once the visitor
 *   uses a control. A visible Pause/Play button is always available (WCAG 2.2.2).
 */
export function HeroSlider({ label, slides }: { label: string; slides: readonly HeroSlide[] }) {
  const count = slides.length;
  const [active, setActive] = useState(0);
  /** 'auto' until the visitor uses a control; then their choice wins over the reduced-motion default. */
  const [choice, setChoice] = useState<'auto' | 'playing' | 'paused'>('auto');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const motionAllowed = useMotionAllowed();
  const pageHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const playing = choice === 'playing' || (choice === 'auto' && motionAllowed);

  const rotating = playing && !hovered && !focused && !pageHidden;
  useEffect(() => {
    if (!rotating) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [rotating, active, count]);

  const goTo = useCallback(
    (index: number) => {
      setChoice('paused');
      setActive(((index % count) + count) % count);
    },
    [count],
  );

  return (
    <section
      className={styles.slider}
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {/* Announce slide changes only when the visitor caused them, not while rotating automatically. */}
      <div className={styles.track} aria-live={rotating ? 'off' : 'polite'}>
        {slides.map((slide, index) => {
          const current = index === active;
          return (
            <div
              key={slide.label}
              className={[styles.slide, current ? styles.current : ''].join(' ')}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}: ${slide.label}`}
              aria-hidden={!current}
              inert={!current}
            >
              {slide.content}
            </div>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.control} onClick={() => goTo(active - 1)} aria-label="Previous slide">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className={styles.dots}>
          {slides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              className={styles.dot}
              onClick={() => goTo(index)}
              aria-label={`Show slide ${index + 1}: ${slide.label}`}
              aria-current={index === active ? 'true' : undefined}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.control}
          onClick={() => setChoice(playing ? 'paused' : 'playing')}
          aria-label={playing ? 'Pause slide rotation' : 'Start slide rotation'}
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button type="button" className={styles.control} onClick={() => goTo(active + 1)} aria-label="Next slide">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
