import { describe, expect, it } from 'vitest';

import { FormSchema, countries, currencies, salary_periods } from './index';

describe('FormSchema', () => {
  it('accepts an empty object because every field is optional', () => {
    expect(FormSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid profile', () => {
    const result = FormSchema.safeParse({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      age: 36,
      linkedin: 'https://linkedin.com/in/ada',
      phone_number: {
        country_code: '+44',
        phone_number: '7700900000',
      },
      skills: ['mathematics'],
      open_for_remote: true,
    });

    expect(result.success).toBe(true);
  });

  it('rejects names shorter than 2 characters', () => {
    const result = FormSchema.safeParse({ first_name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid emails', () => {
    const result = FormSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects ages outside 1-120', () => {
    expect(FormSchema.safeParse({ age: 0 }).success).toBe(false);
    expect(FormSchema.safeParse({ age: 121 }).success).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(FormSchema.safeParse({ github: 'github.com/ada' }).success).toBe(
      false
    );
  });

  it('rejects empty skills and invalid nested salary data', () => {
    expect(FormSchema.safeParse({ skills: [''] }).success).toBe(false);
    expect(
      FormSchema.safeParse({
        salary_expectation: {
          currency: 'GBP',
          salary: -1,
          salary_period: 'per_year',
        },
      }).success
    ).toBe(false);
  });

  it('rejects invalid dates on last_working_day', () => {
    expect(
      FormSchema.safeParse({ last_working_day: 'not-a-date' }).success
    ).toBe(false);
    expect(FormSchema.safeParse({ last_working_day: '2024-12-31' }).success).toBe(
      true
    );
  });
});

describe('lookup lists', () => {
  it('includes expected currency, country, and salary period values', () => {
    expect(currencies.map((item) => item.value)).toContain('INR');
    expect(countries.map((item) => item.value)).toContain('India');
    expect(salary_periods.map((item) => item.value)).toContain('per_month');
  });
});
