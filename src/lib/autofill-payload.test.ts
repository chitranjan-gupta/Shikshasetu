import { describe, expect, it } from 'vitest';

import { parseAutofillPayload } from './autofill-payload';

describe('parseAutofillPayload', () => {
  const profiles = [{ id: '1', first_name: 'Ada' }];

  it('returns an array payload as-is', () => {
    expect(parseAutofillPayload(profiles)).toEqual(profiles);
  });

  it('returns data when it is already an array', () => {
    expect(parseAutofillPayload({ data: profiles })).toEqual(profiles);
  });

  it('parses data when it is a JSON string', () => {
    expect(parseAutofillPayload({ data: JSON.stringify(profiles) })).toEqual(
      profiles
    );
  });

  it('returns an empty list when data is missing or invalid', () => {
    expect(parseAutofillPayload(undefined)).toEqual([]);
    expect(parseAutofillPayload({ data: undefined })).toEqual([]);
    expect(parseAutofillPayload({ data: '{not json' })).toEqual([]);
  });
});
