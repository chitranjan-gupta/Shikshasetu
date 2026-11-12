import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FormSchemaType } from '@/types';

import {
  fetchFieldMatcherRules,
  fillProfileField,
  resetFieldMatchers,
  setFieldMatchers,
} from './field-matchers';

const profile = {
  first_name: 'Ada',
  zip_code: '800002',
  gender: 'female',
} as FormSchemaType;

afterEach(() => {
  resetFieldMatchers();
  vi.unstubAllGlobals();
});

describe('field matcher json', () => {
  it('fills from an updated rule list', () => {
    const input = document.createElement('input');
    input.name = 'postal';

    expect(
      setFieldMatchers([
        { by: 'name', keys: ['postal', 'zip'], path: 'zip_code' },
      ])
    ).toBe(true);
    fillProfileField(input, profile);

    expect(input.value).toBe('800002');
  });

  it('keeps the current rules when the json is invalid', () => {
    const input = document.createElement('input');
    input.name = 'first_name';

    expect(setFieldMatchers({ by: 'name' })).toBe(false);
    fillProfileField(input, profile);

    expect(input.value).toBe('Ada');
  });

  it('loads rules from a url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { by: 'name', keys: ['postal'], path: 'zip_code' },
        ],
      })
    );

    await expect(
      fetchFieldMatcherRules('https://cdn.example.com/field-matchers.json')
    ).resolves.toEqual([
      { by: 'name', keys: ['postal'], path: 'zip_code' },
    ]);
  });

  it('returns null when the url does not return rules', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => [],
      })
    );

    await expect(
      fetchFieldMatcherRules('https://cdn.example.com/missing.json')
    ).resolves.toBeNull();
  });
});
