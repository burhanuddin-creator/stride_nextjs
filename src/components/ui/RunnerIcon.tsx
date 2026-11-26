import type { LucideProps } from 'lucide-react';

/** Running figure drawn to match Lucide's 24px / 2px-stroke outline style (Lucide has no runner). */
export function RunnerIcon({ size = 24, strokeWidth = 2, color = 'currentColor', ...rest }: LucideProps) {
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
      <circle cx="14.5" cy="4" r="1.75" />
      <path d="m6.5 10 3.5-2.5 4.5 1 2 3 3 .5" />
      <path d="m10 7.5-1.5 6 4 2.5-1 5.5" />
      <path d="m8.5 13.5-2 3.5H3" />
    </svg>
  );
}
