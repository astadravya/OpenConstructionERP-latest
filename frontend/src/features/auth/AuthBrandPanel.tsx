/**
 * Welcome panel shown beside the sign-in and sign-up forms.
 *
 * All wording comes from `BRAND.loginBanner` in `config/brand.ts`, so each
 * organization / client build sets its own text there and no page code has
 * to change. Empty fields are simply not shown.
 */
import { BRAND } from '@/config/brand';

interface AuthBrandPanelProps {
  /** `full`: large desktop panel. `compact`: smaller panel (sign-up page).
   *  `card`: short card shown above the form on narrow screens. */
  variant?: 'full' | 'compact' | 'card';
}

export function AuthBrandPanel({ variant = 'full' }: AuthBrandPanelProps) {
  const b = BRAND.loginBanner;
  const highlights = b.highlights.filter((h) => h.title || h.text).slice(0, 4);
  const contactLines = b.contactLines.filter(Boolean);

  if (variant === 'card') {
    if (!b.headline && !b.headlineAccent && !b.eyebrow) return null;
    return (
      <div className="rounded-xl bg-gradient-to-r from-oe-blue/10 via-sky-500/10 to-oe-blue/5 border border-oe-blue/20 px-4 py-3 text-center">
        {b.eyebrow && (
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-oe-blue">{b.eyebrow}</div>
        )}
        <p className="text-sm font-semibold text-content-primary">
          {b.headline}{b.headline && b.headlineAccent ? ' ' : ''}
          {b.headlineAccent && <span className="text-oe-blue">{b.headlineAccent}</span>}
        </p>
      </div>
    );
  }

  const full = variant === 'full';

  return (
    <div
      data-testid="auth-brand-panel"
      className={full ? undefined : 'rounded-2xl border border-border-light/50 bg-surface-elevated/80 backdrop-blur-md px-5 py-5 shadow-sm'}
    >
      {b.eyebrow && (
        <div className="mb-5 animate-stagger-in" style={{ animationDelay: '0ms' }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-oe-blue/[0.08] dark:bg-oe-blue/[0.18] px-3.5 py-1.5">
            <span className="h-[6px] w-[6px] rounded-full bg-oe-blue" />
            <span className="text-[11px] font-medium tracking-[0.04em] text-oe-blue dark:text-sky-300">{b.eyebrow}</span>
          </span>
        </div>
      )}

      {(b.headline || b.headlineAccent) && (
        <h2
          className={`${full ? 'text-[32px] xl:text-[36px] leading-[1.08]' : 'text-xl leading-snug'} font-semibold text-content-primary tracking-[-0.025em] animate-stagger-in`}
          style={{ animationDelay: '60ms' }}
        >
          {b.headline}
          {b.headline && b.headlineAccent && (full ? <br /> : ' ')}
          {b.headlineAccent && (
            <span className="bg-gradient-to-r from-oe-blue to-sky-500 bg-clip-text text-transparent">{b.headlineAccent}</span>
          )}
        </h2>
      )}

      {b.description && (
        <p
          className={`${full ? 'mt-5 text-[17px] leading-[1.65] max-w-[440px]' : 'mt-2 text-[13px] leading-relaxed'} text-content-secondary/80 tracking-[-0.008em] animate-stagger-in`}
          style={{ animationDelay: '120ms' }}
        >
          {b.description}
        </p>
      )}

      {highlights.length > 0 && (
        <div className={`${full ? 'mt-8 gap-y-4' : 'mt-4 gap-y-3'} grid grid-cols-1 max-w-[460px] animate-stagger-in`} style={{ animationDelay: '180ms' }}>
          {highlights.map((h, idx) => (
            <div key={idx} className="relative pl-4">
              <span aria-hidden className="absolute left-0 top-1 h-[14px] w-[2px] rounded-full bg-gradient-to-b from-oe-blue to-sky-500/60" />
              {h.title && (
                <div className={`${full ? 'text-[14px]' : 'text-[12.5px]'} font-semibold tracking-[-0.01em] text-content-primary leading-tight`}>{h.title}</div>
              )}
              {h.text && (
                <p className={`mt-1 ${full ? 'text-[13px]' : 'text-[11.5px]'} leading-[1.55] text-content-tertiary`}>{h.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {contactLines.length > 0 && (
        <div
          className={`${full ? 'mt-8' : 'mt-4'} max-w-[460px] rounded-xl border border-border-light/60 bg-surface-elevated/50 backdrop-blur-sm px-4 py-3 animate-stagger-in`}
          style={{ animationDelay: '240ms' }}
        >
          {b.contactTitle && (
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">{b.contactTitle}</div>
          )}
          {contactLines.map((line, idx) => (
            <p key={idx} className={`${full ? 'text-[13px]' : 'text-[12px]'} leading-[1.6] text-content-secondary`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
