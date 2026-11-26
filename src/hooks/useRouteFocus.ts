'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function focusElement(element: HTMLElement) {
  if (!element.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(element.tagName)) {
    element.setAttribute('tabindex', '-1');
  }
  element.focus({ preventScroll: true });
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Next.js keeps recently visited pages in the document, hidden (React Activity, display: none), so ids and headings
 * can exist more than once. Only an element that is actually rendered counts.
 */
function isRendered(element: Element): boolean {
  return element.getClientRects().length > 0;
}

function firstRendered<T extends Element>(elements: Iterable<T>): T | null {
  for (const element of elements) if (isRendered(element)) return element;
  return null;
}

function focusHashTarget(): boolean {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  const target = id ? firstRendered(document.querySelectorAll<HTMLElement>(`[id="${CSS.escape(id)}"]`)) : null;
  if (!target) return false;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  focusElement(target);
  return true;
}

/**
 * After client-side navigation:
 * - with a #hash: scroll the target into view and move focus to it;
 * - otherwise: move focus to the page's <h1> so screen readers announce the new page (Next.js scrolls to the top).
 * The initial page load keeps the browser's default focus, except for hash targets. Same-page hash links
 * (e.g. "Plan Your Visit ↓") do not change the pathname, so they are handled by a click listener.
 */
export function useRouteFocus() {
  const pathname = usePathname();
  // The previous pathname (null before the first run). StrictMode's double effect run sees the same path: no refocus.
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const first = previous.current === null || previous.current === pathname;
    previous.current = pathname;
    // Wait a frame so the new route's content (and any hash-driven expansion) is in the DOM.
    const frame = requestAnimationFrame(() => {
      if (focusHashTarget() || first) return;
      const heading = firstRendered(document.querySelectorAll<HTMLElement>('main h1'));
      if (heading) focusElement(heading);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href*="#"]') : null;
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      requestAnimationFrame(() => requestAnimationFrame(() => focusHashTarget()));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
