/**
 * Organization branding: the ONE place to change the product's visible name,
 * logo, colours and contact details.
 *
 * Everything the user sees (sidebar, login, page titles, About page, footer,
 * translated UI text) reads from this file. To rebrand, edit the values below
 * and drop your logo files into `frontend/public/brand/` (see the README
 * there). No other file needs to change.
 *
 * The page title, browser-tab icon and installable-app (PWA) name are built
 * from this file too, by the `brandHtml` plugin in `vite.config.ts`.
 *
 * Legal note: this software is a modified version of OpenConstructionERP,
 * licensed under AGPL-3.0-or-later. Its trademark policy asks modified
 * versions to use their own name in the UI, which is what this file does.
 * The AGPL still requires that users can see the copyright/licence notice
 * and get the source code, so the About page keeps a short "Legal notices"
 * section built from `UPSTREAM` below. Keep `sourceCodeUrl` pointing at a
 * place where your users can download the source of the version you run.
 */

export interface BrandConfig {
  name: string; shortName: string; organization: string; tagline: string;
  logo: string; logoDark: string; icon: string;
  primaryColor: string; secondaryColor: string;
  website: string; email: string; phone: string; address: string;
  docsUrl: string; privacyUrl: string; termsUrl: string; showUpstreamCommunity: boolean; sourceCodeUrl: string;
}

export const BRAND: Readonly<BrandConfig> = {
  /** Full product / organization name shown across the app. */
  name: 'SatyaDeva BuildTech',
  /** Short name for tight spots (browser tab, mobile home screen, icons). */
  shortName: 'SatyaDeva',
  /** Legal name of the organization (About page, footer, documents). */
  organization: 'SatyaDeva BuildTech',
  /** One-line tagline under the name on the login page. */
  tagline: 'Construction estimating and project management',

  /**
   * Logo files, served from `frontend/public/`. Leave a path empty ('') to
   * fall back to a generated monogram tile in the primary colour.
   *   logo     wide logo (sidebar, login page), PNG/SVG, transparent bg
   *   logoDark optional variant for dark mode
   *   icon     square icon (collapsed sidebar, favicon), PNG/SVG
   */
  logo: '/brand/satyadeva-logo.png',
  logoDark: '',
  icon: '/brand/satyadeva-icon-192.png',

  /** Brand colours (hex). `primary` tints the monogram and accents. */
  primaryColor: '#15223B',
  secondaryColor: '#D98E22',

  /** Contact details (About page, footer, emails). Empty = hidden. */
  website: '',
  email: '',
  phone: '',
  address: '',

  /** Your own help / documentation site. Empty = Documentation link hidden. */
  docsUrl: '',

  /**
   * Privacy policy and terms linked from the sign-up form. The bundled files
   * are upstream's and name upstream as the operator: replace them with your
   * organization's own documents before inviting outside users.
   */
  privacyUrl: '/privacy-policy.html',
  termsUrl: '/terms.html',

  /**
   * Show upstream community / marketing widgets (donate, newsletter, news,
   * GitHub stars, Telegram, review prompts). Off for a white-labelled build.
   */
  showUpstreamCommunity: false,

  /** Where users can get the source code of this deployment (AGPL s.13). */
  sourceCodeUrl: 'https://github.com/astadravya/OpenConstructionERP-latest',
};

/**
 * Upstream attribution, used ONLY in the About page "Legal notices" section
 * (required by AGPL-3.0 s.5(d) "Appropriate Legal Notices"). Do not remove.
 */
export const UPSTREAM = {
  name: 'OpenConstructionERP',
  copyright: 'Copyright (C) 2024-2026 Artem Boiko / DataDrivenConstruction and contributors',
  license: 'GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)',
  licenseUrl: 'https://www.gnu.org/licenses/agpl-3.0.html',
  url: 'https://github.com/datadrivenconstruction/OpenConstructionERP',
} as const;

/** Two-letter monogram derived from the short name, e.g. "Org ERP" -> "OE". */
export function brandInitials(name: string = BRAND.shortName): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/** `mailto:` link to the organization's support email, or '' when unset. */
export function brandMailto(subject = '', body = ''): string {
  if (!BRAND.email) return '';
  const q = new URLSearchParams();
  if (subject) q.set('subject', subject);
  if (body) q.set('body', body);
  const qs = q.toString().replace(/\+/g, '%20');
  return `mailto:${BRAND.email}${qs ? `?${qs}` : ''}`;
}

/** "owner/repo" of `sourceCodeUrl` when it is a GitHub URL, else ''. */
export function brandGithubRepo(): string {
  const m = /github\.com\/([^/]+\/[^/#?]+)/.exec(BRAND.sourceCodeUrl);
  return m ? m[1]!.replace(/\.git$/, '') : '';
}

/** Website URL without protocol, for display ("example.com"). */
export function brandWebsiteLabel(): string {
  return BRAND.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const UPSTREAM_TEXT: ReadonlyArray<[RegExp, () => string]> = [
  // Product name and its common spellings.
  [/Open\s?Construction\s?ERP/g, () => BRAND.name],
  [/\bOCERP\b/g, () => BRAND.shortName],
  // Upstream marketing site, e.g. "opens openconstructionerp.com".
  [/(?:https?:\/\/)?(?:www\.)?openconstructionerp\.com\S*/g, () => brandWebsiteLabel() || BRAND.name],
  // Upstream company / team name.
  [/@?DataDrivenConstruction(?:\.io)?/g, () => BRAND.organization],
  [/(?:https?:\/\/)?(?:www\.)?datadrivenconstruction\.io\S*/g, () => brandWebsiteLabel() || BRAND.organization],
];

/**
 * Replace upstream product / company names in a user-visible string with
 * this deployment's brand. Applied to every translated string by an i18next
 * post-processor (see `app/i18n.ts`), so the 40+ locale files stay untouched
 * and easy to sync with upstream.
 *
 * Install commands such as `pip install openconstructionerp` are left alone:
 * they name the real Python package.
 */
export function brandText(value: string): string {
  if (typeof value !== 'string' || value === '') return value;
  if (!/open\s?construction|ocerp|datadrivenconstruction/i.test(value)) return value;
  let out = value;
  for (const [re, to] of UPSTREAM_TEXT) out = out.replace(re, to);
  return out;
}
