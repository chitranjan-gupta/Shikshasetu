import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  getAutofill: vi.fn().mockResolvedValue([]),
  setAutofill: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@legendapp/state/sync', async () => {
  const actual = await vi.importActual<typeof import('@legendapp/state/sync')>(
    '@legendapp/state/sync'
  );
  return {
    ...actual,
    syncObservable: () => undefined,
  };
});

import { autofills$ } from './autofill';

describe('addAutofill', () => {
  beforeEach(() => {
    autofills$.autofills.set([]);
    autofills$.currentAutofill.set(0);
  });

  it('appends a profile and selects it', () => {
    autofills$.addAutofill({ first_name: 'Ada', email: 'ada@example.com' });
    autofills$.addAutofill({ first_name: 'Grace', email: 'grace@example.com' });

    const profiles = autofills$.autofills.get();
    expect(profiles).toHaveLength(2);
    expect(profiles[0].first_name).toBe('Ada');
    expect(profiles[1].first_name).toBe('Grace');
    expect(profiles[0].id).toBeTruthy();
    expect(profiles[1].id).not.toBe(profiles[0].id);
    expect(autofills$.currentAutofill.get()).toBe(1);
  });
});

describe('removeAutofill', () => {
  beforeEach(() => {
    autofills$.setAutofill([
      { id: '1', first_name: 'Ada' },
      { id: '2', first_name: 'Grace' },
      { id: '3', first_name: 'Katherine' },
    ]);
  });

  it('keeps the same later profile selected when an earlier one is deleted', () => {
    autofills$.currentAutofill.set(2);
    autofills$.removeAutofill(0);

    expect(
      autofills$.autofills.get().map((profile: { first_name?: string }) => profile.first_name)
    ).toEqual([
      'Grace',
      'Katherine',
    ]);
    expect(autofills$.currentAutofill.get()).toBe(1);
  });

  it('selects the new last profile when the selected last profile is deleted', () => {
    autofills$.currentAutofill.set(2);
    autofills$.removeAutofill(2);

    expect(autofills$.currentAutofill.get()).toBe(1);
    expect(autofills$.autofills.get()).toHaveLength(2);
  });

  it('resets the selection when the only profile is deleted', () => {
    autofills$.setAutofill([{ id: '1', first_name: 'Ada' }]);
    autofills$.currentAutofill.set(0);
    autofills$.removeAutofill(0);

    expect(autofills$.autofills.get()).toEqual([]);
    expect(autofills$.currentAutofill.get()).toBe(0);
  });
});
