import { useId } from "react";

interface BrandLogoProps {
  /** Rendered width/height in pixels. */
  size?: number;
  className?: string;
}

/**
 * The FreeSlot app icon: a week of schedule blocks broken by a glowing free
 * slot holding the AI spark. Inline SVG mirror of public/favicon.svg — keep
 * the two in sync when the brand mark changes.
 */
export function BrandLogo({ size = 32, className }: BrandLogoProps) {
  const id = useId();
  const bgId = `${id}-bg`;
  const slotId = `${id}-slot`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      role="img"
      aria-label="FreeSlot"
      className={className}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(219 34% 26%)" />
          <stop offset="1" stopColor="hsl(221 38% 18%)" />
        </linearGradient>
        <linearGradient id={slotId} x1="26" y1="77" x2="134" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(212 100% 60%)" />
          <stop offset="1" stopColor="hsl(190 100% 55%)" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="36" fill={`url(#${bgId})`} />
      <rect x="30" y="33" width="100" height="16" rx="8" fill="hsl(218 28% 42%)" />
      <rect x="30" y="55" width="68" height="16" rx="8" fill="hsl(218 28% 42%)" />
      <rect x="104" y="55" width="26" height="16" rx="8" fill="hsl(218 28% 42%)" />
      <rect x="14" y="65" width="132" height="52" rx="22" fill="hsl(212 100% 60%)" opacity="0.12" />
      <rect x="20" y="71" width="120" height="40" rx="18" fill="hsl(212 100% 60%)" opacity="0.2" />
      <rect x="26" y="77" width="108" height="28" rx="14" fill={`url(#${slotId})`} />
      <g
        transform="translate(69.9 80.9) scale(0.84)"
        stroke="hsl(222 30% 6%)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 16v4" />
        <path d="M6 18H2" />
      </g>
      <rect x="30" y="111" width="46" height="16" rx="8" fill="hsl(218 28% 42%)" />
      <rect x="82" y="111" width="48" height="16" rx="8" fill="hsl(218 28% 42%)" />
    </svg>
  );
}
