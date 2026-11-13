/**
 * About page for a white-labelled build.
 *
 * Shows the organization from `config/brand.ts` (name, logo, tagline,
 * contact details) and the version. It replaces the upstream About page
 * (project story, donations, book, community) when
 * `BRAND.showUpstreamCommunity` is off.
 *
 * The "Legal notices" card is required by AGPL-3.0 (s.5(d) Appropriate Legal
 * Notices, s.13 source code offer for network users). Keep it.
 */
import { useTranslation } from 'react-i18next';
import { Building2, Code2, ExternalLink, Globe, Mail, MapPin, Phone, Scale } from 'lucide-react';

import { Badge, Breadcrumb, Card, LogoWithText } from '@/shared/ui';
import { PageHeader } from '@/shared/ui/PageHeader';
import { APP_VERSION } from '@/shared/lib/version';
import { BRAND, UPSTREAM, brandWebsiteLabel } from '@/config/brand';
import { ThirdPartyLicenses } from './ThirdPartyLicenses';

function ContactRow({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-content-secondary">
      <Icon size={15} className="mt-0.5 shrink-0 text-content-tertiary" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

export function BrandedAboutPage() {
  const { t } = useTranslation();
  const hasContact = Boolean(BRAND.address || BRAND.phone || BRAND.email || BRAND.website);

  return (
    <div className="space-y-5 animate-fade-in">
      <Breadcrumb items={[{ label: t('nav.about', { defaultValue: 'About' }) }]} />
      <PageHeader srTitle={t('nav.about', { defaultValue: 'About' })} />

      {/* Identity */}
      <div className="py-6">
        <LogoWithText size="xl" className="mb-4" />
        {BRAND.logo && (
          <h2 className="text-3xl font-bold text-content-primary tracking-tight">{BRAND.name}</h2>
        )}
        <p className="mt-2 text-base text-content-secondary">{BRAND.tagline}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-content-tertiary">
          <span className="font-mono">v{APP_VERSION}</span>
          <span>&middot;</span>
          <span>{BRAND.organization}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Contact */}
        {hasContact && (
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-content-primary">
              <Building2 size={16} className="text-oe-blue" />
              {t('brand.contact_title', { defaultValue: 'Contact' })}
            </h3>
            <ul className="space-y-2">
              <ContactRow icon={Building2}>{BRAND.organization}</ContactRow>
              {BRAND.address && (
                <ContactRow icon={MapPin}>
                  <span className="whitespace-pre-line">{BRAND.address}</span>
                </ContactRow>
              )}
              {BRAND.phone && (
                <ContactRow icon={Phone}>
                  <a href={`tel:${BRAND.phone.replace(/\s+/g, '')}`} className="hover:text-oe-blue">
                    {BRAND.phone}
                  </a>
                </ContactRow>
              )}
              {BRAND.email && (
                <ContactRow icon={Mail}>
                  <a href={`mailto:${BRAND.email}`} className="hover:text-oe-blue">
                    {BRAND.email}
                  </a>
                </ContactRow>
              )}
              {BRAND.website && (
                <ContactRow icon={Globe}>
                  <a
                    href={BRAND.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-oe-blue"
                  >
                    {brandWebsiteLabel()}
                    <ExternalLink size={11} />
                  </a>
                </ContactRow>
              )}
            </ul>
          </Card>
        )}

        {/* Legal notices (AGPL-3.0). Do not remove. */}
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-content-primary">
            <Scale size={16} className="text-oe-blue" />
            {t('brand.legal_title', { defaultValue: 'Legal notices' })}
            <Badge variant="blue" size="sm">AGPL-3.0</Badge>
          </h3>
          {/* Literal upstream name on purpose: legal attribution is not run
              through the brand text replacement. */}
          <p className="text-sm leading-relaxed text-content-secondary">
            {BRAND.name} is based on {UPSTREAM.name}, {UPSTREAM.copyright}. It is free
            software, licensed under the {UPSTREAM.license}, and comes with ABSOLUTELY NO
            WARRANTY, to the extent permitted by law.
          </p>
          <ul className="mt-3 space-y-2">
            <ContactRow icon={Code2}>
              <a
                href={BRAND.sourceCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-oe-blue"
              >
                {t('brand.source_code_of_version', {
                  defaultValue: 'Source code of this version',
                })}
                <ExternalLink size={11} />
              </a>
            </ContactRow>
            <ContactRow icon={Scale}>
              <a
                href={UPSTREAM.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-oe-blue"
              >
                {t('brand.license_text', { defaultValue: 'Full licence text' })}
                <ExternalLink size={11} />
              </a>
            </ContactRow>
            <ContactRow icon={ExternalLink}>
              <a
                href={UPSTREAM.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-oe-blue"
              >
                {UPSTREAM.url.replace(/^https:\/\//, '')}
              </a>
            </ContactRow>
          </ul>
        </Card>
      </div>

      <ThirdPartyLicenses className="mb-4" />
    </div>
  );
}
