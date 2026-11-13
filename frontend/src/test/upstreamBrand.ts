/**
 * Test helper: run a suite with the upstream community widgets switched on
 * and a support email / website configured, so tests written for those
 * widgets and channels keep exercising them. The default `BRAND` in
 * config/brand.ts hides them (white-label build).
 */
import { afterAll, beforeAll } from 'vitest';
import { BRAND, type BrandConfig } from '@/config/brand';

export const TEST_BRAND: Partial<BrandConfig> = {
  showUpstreamCommunity: true,
  email: 'support@example.com',
  website: 'https://example.com',
};

export function useUpstreamBrand(overrides: Partial<BrandConfig> = {}): void {
  const saved: BrandConfig = { ...BRAND };
  beforeAll(() => {
    Object.assign(BRAND as BrandConfig, TEST_BRAND, overrides);
  });
  afterAll(() => {
    Object.assign(BRAND as BrandConfig, saved);
  });
}
