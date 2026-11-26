'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';

interface Props {
  as?: 'div' | 'ul';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Client boundary for the scroll entrance effect (useReveal). The children are rendered by the server — headings,
 * text and links stay in the initial HTML — and only this wrapper element hydrates to add `data-reveal`.
 */
export function Reveal({ as: Tag = 'div', className, style, children }: Props) {
  const ref = useReveal<HTMLDivElement & HTMLUListElement>();
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
