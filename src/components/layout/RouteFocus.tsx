'use client';

import { useRouteFocus } from '../../hooks/useRouteFocus';

/** Focus management on client-side navigation (see useRouteFocus). Renders nothing. */
export function RouteFocus() {
  useRouteFocus();
  return null;
}
