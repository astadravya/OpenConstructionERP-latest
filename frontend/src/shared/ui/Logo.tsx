// DDC-CWICR-OE: DataDrivenConstruction · OpenConstructionERP​‌‍⁠​‌‍⁠​‌‍⁠​‌‍⁠
// Copyright (c) 2026 Artem Boiko / DataDrivenConstruction
import clsx from 'clsx';
import { BRAND, brandInitials } from '@/config/brand';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

/* Icon sizes — compact so the text dominates */
const sizeMap = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
};

/**
 * Brand icon, from `config/brand.ts`.
 *
 * Shows the organization's square icon (`BRAND.icon`) when one is
 * configured; otherwise a monogram tile (the brand initials on the primary
 * colour), so the app never shows the upstream logo.
 *
 * `animate` gives a short scale-in entrance.
 */
export function Logo({ size = 'md', animate = false, className }: LogoProps) {
  const style = animate
    ? { animation: 'oeBgScale 450ms cubic-bezier(0.34,1.56,0.64,1) both' }
    : undefined;

  if (BRAND.icon) {
    return (
      <div className={clsx(sizeMap[size], 'relative shrink-0', className)} style={style}>
        <img
          src={BRAND.icon}
          alt={BRAND.name}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(sizeMap[size], 'relative shrink-0', className)}
      style={style}
      role="img"
      aria-label={BRAND.name}
    >
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="32" y="32" width="448" height="448" rx="96" fill={BRAND.primaryColor} />
        <text
          x="256"
          y="256"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize="210"
          fontWeight="800"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        >
          {brandInitials()}
        </text>
      </svg>
    </div>
  );
}

/* ── LogoWithText ──────────────────────────────────────────────────────── */

interface LogoWithTextProps extends LogoProps {
  showVersion?: boolean;
}

/* Text sizes — larger than icon to make the name prominent */
const textSizeMap = {
  xs: 'text-[15px] leading-none',
  sm: 'text-[16px] leading-none',
  md: 'text-[17px] leading-none',
  lg: 'text-xl leading-none',
  xl: 'text-2xl leading-none',
};

const gapSizeMap = {
  xs: 'gap-1.5',
  sm: 'gap-2',
  md: 'gap-2',
  lg: 'gap-2.5',
  xl: 'gap-3',
};

/**
 * Brand logo + name. Uses the wide logo (`BRAND.logo`) when configured,
 * otherwise the icon followed by the brand name.
 */
export function LogoWithText({ size = 'md', animate, showVersion: _showVersion = true, className }: LogoWithTextProps) {
  if (BRAND.logo) {
    return (
      <img
        src={BRAND.logo}
        alt={BRAND.name}
        className={clsx('block w-auto max-w-full object-contain', logoHeightMap[size], className)}
        draggable={false}
      />
    );
  }
  return (
    <div className={clsx('flex items-center', gapSizeMap[size], className)}>
      <Logo size={size} animate={animate} />
      <span
        className={clsx(
          textSizeMap[size],
          'font-semibold text-content-primary whitespace-nowrap tracking-tight',
        )}
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}
      >
        {BRAND.name}
      </span>
    </div>
  );
}

const logoHeightMap = {
  xs: 'h-5',
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-14',
};
