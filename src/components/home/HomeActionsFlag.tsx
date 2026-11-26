'use client';

import { useEffect } from 'react';

/** The fixed mobile action bar on Home needs room below the page content (and footer) so it never covers anything. */
export function HomeActionsFlag() {
  useEffect(() => {
    document.documentElement.dataset.homeActions = 'true';
    return () => {
      delete document.documentElement.dataset.homeActions;
    };
  }, []);
  return null;
}
