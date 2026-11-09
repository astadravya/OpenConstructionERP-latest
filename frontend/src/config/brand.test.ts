import { describe, expect, it } from 'vitest';
import i18n from '@/app/i18n';
import { BRAND, brandGithubRepo, brandInitials, brandText } from './brand';

describe('brandText', () => {
  it('replaces the upstream product name', () => {
    expect(brandText('Welcome to OpenConstructionERP')).toBe(`Welcome to ${BRAND.name}`);
    expect(brandText('Install OCERP for offline access')).toBe(`Install ${BRAND.shortName} for offline access`);
  });

  it('replaces the upstream company and site', () => {
    expect(brandText('Built by the DataDrivenConstruction team')).toBe(
      `Built by the ${BRAND.organization} team`,
    );
    expect(brandText('Richer fields on openconstructionerp.com.')).not.toMatch(/openconstructionerp/i);
  });

  it('leaves unrelated text and pip package names alone', () => {
    expect(brandText('Bill of quantities')).toBe('Bill of quantities');
    expect(brandText('pip install openconstructionerp')).toBe('pip install openconstructionerp');
  });

  it('runs on every translation, including defaultValue', () => {
    expect(i18n.t('dashboard.welcome')).not.toContain('OpenConstructionERP');
    expect(i18n.t('no.such.key', { defaultValue: 'About OpenConstructionERP' })).toBe(`About ${BRAND.name}`);
  });
});

describe('helpers', () => {
  it('derives initials and the GitHub repo', () => {
    expect(brandInitials('Acme Build ERP')).toBe('AB');
    expect(brandInitials('Acme')).toBe('AC');
    expect(brandGithubRepo()).toBe('astadravya/OpenConstructionERP-latest');
  });
});
