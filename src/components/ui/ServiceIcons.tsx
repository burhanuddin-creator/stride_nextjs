import type { LucideProps } from 'lucide-react';

/*
 * Outline icons for services Lucide has no faithful match for, drawn on Lucide's 24px grid with
 * 2px round strokes so they sit alongside Lucide icons. (Lucide's syringe would wrongly suggest an
 * injection for dry needling, which uses no medication.)
 */
function Base({ size = 24, strokeWidth = 2, color = 'currentColor', children, ...rest }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Thin solid filament needle with a small handle. */
export function NeedleIcon(props: LucideProps) {
  return (
    <Base {...props}>
      <path d="M16.5 3.5 19 6" />
      <path d="m15 5 4 4-2.5 1.5-3-3Z" />
      <path d="M13.5 7.5 5 21" />
    </Base>
  );
}

/** Cupping cup seen from the side. */
export function CupIcon(props: LucideProps) {
  return (
    <Base {...props}>
      <path d="M10 3h4" />
      <path d="M11 3v2.5M13 3v2.5" />
      <path d="M7 11a5 5 0 0 1 10 0v6H7Z" />
      <path d="M5 20h14" />
      <path d="M7 17v3M17 17v3" />
    </Base>
  );
}

/** Stack of vertebrae. */
export function SpineIcon(props: LucideProps) {
  return (
    <Base {...props}>
      <rect x="9" y="2.5" width="6" height="3.5" rx="1.2" />
      <rect x="8.5" y="8" width="7" height="3.5" rx="1.2" />
      <rect x="9" y="13.5" width="6" height="3.5" rx="1.2" />
      <rect x="9.5" y="19" width="5" height="3" rx="1.2" />
      <path d="M6.5 9.75h2M15.5 9.75h2M7 15.25h2M15 15.25h2" />
    </Base>
  );
}

/** Curved hand-held soft-tissue instrument (IASTM). */
export function InstrumentIcon(props: LucideProps) {
  return (
    <Base {...props}>
      <path d="M4.5 19.5c2-1 3.5-3 5-6.5 1.6-3.7 3.6-7.2 7.4-8.8a2.2 2.2 0 0 1 2.8 2.8c-1.6 3.8-5.1 5.8-8.8 7.4-3.5 1.5-5.5 3-6.5 5" />
      <path d="M4.5 19.5c-.8.8-.8 1.4-.3 1.9" />
    </Base>
  );
}
