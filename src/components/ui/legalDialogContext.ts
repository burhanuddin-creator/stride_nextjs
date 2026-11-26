'use client';

import { createContext, useContext } from 'react';

export type LegalTopic = 'privacy' | 'accessibility';

export const LegalDialogContext = createContext<(topic: LegalTopic) => void>(() => {});

export function useLegalDialog() {
  return useContext(LegalDialogContext);
}
