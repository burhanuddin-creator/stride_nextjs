'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Old in-page anchors that now live on other pages (e.g. /about#founder → /about/meet-dr-gadly). The hash never
 * reaches the server, so the redirect happens in the browser after load, replacing the history entry.
 */
export function LegacyHashRedirect({ anchors }: { anchors: Readonly<Record<string, string>> }) {
  const router = useRouter();
  useEffect(() => {
    const target = anchors[window.location.hash.replace(/^#/, '')];
    if (target) router.replace(target);
  }, [anchors, router]);
  return null;
}
