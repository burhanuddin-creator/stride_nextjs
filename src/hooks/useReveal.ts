import { useEffect, useRef } from 'react';

/**
 * Scroll entrance effect (first-visit checklist, condition activity arrows). Content is visible by default: the
 * container is only "armed" (children hidden, waiting to slide in) when motion is allowed, IntersectionObserver
 * exists and the container is still below the viewport. Reduced motion, no JS, print or an unsupported browser all
 * leave the content fully visible. CSS lives with each block: `[data-reveal='armed']` hides, `'shown'` animates in.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: no hiding, no flash

    el.dataset.reveal = 'armed';
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      delete el.dataset.reveal;
    };
  }, []);

  return ref;
}
