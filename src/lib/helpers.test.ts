import { describe, expect, it, vi } from 'vitest';

import {
  camelCase,
  FormValues,
  generateRandomEmail,
  generateRandomPassword,
  generateRandomString,
  getDomain,
  handleCopy,
  normalizeText,
  sanitize,
} from './index';

describe('camelCase', () => {
  it('capitalizes the first character', () => {
    expect(camelCase('first_name')).toBe('First_name');
  });

  it('leaves an already capitalized string unchanged', () => {
    expect(camelCase('Hello')).toBe('Hello');
  });
});

describe('sanitize', () => {
  it('trims whitespace and lowercases the value', () => {
    expect(sanitize('  Email ')).toBe('email');
  });
});

describe('normalizeText', () => {
  it('capitalizes the first letter and replaces underscores with spaces', () => {
    expect(normalizeText('first_name')).toBe('First name');
  });
});

describe('getDomain', () => {
  it('returns the hostname from a URL', () => {
    expect(getDomain('https://careers.example.com/apply?id=1')).toBe(
      'careers.example.com'
    );
  });

  it('throws for invalid URLs', () => {
    expect(() => getDomain('not-a-url')).toThrow();
  });
});

describe('generateRandomString', () => {
  it('returns a string of the requested length', () => {
    expect(generateRandomString(8)).toHaveLength(8);
  });

  it('uses only characters from the provided set', () => {
    expect(generateRandomString(20, 'ab')).toMatch(/^[ab]{20}$/);
  });

  it('returns an empty string when length is 0', () => {
    expect(generateRandomString(0)).toBe('');
  });
});

describe('generateRandomEmail', () => {
  it('returns an email on one of the built-in domains', () => {
    const email = generateRandomEmail();
    const [localPart, domain] = email.split('@');
    expect(localPart).toMatch(/^[a-z0-9]+$/);
    expect(['example.com', 'test.com', 'random.com', 'mail.com']).toContain(
      domain
    );
  });
});

describe('generateRandomPassword', () => {
  it('returns a 12-character password with mixed character classes', () => {
    const password = generateRandomPassword();
    expect(password).toHaveLength(12);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[!@#$%^&*()_+]/);
  });
});

describe('handleCopy', () => {
  it('writes text to the clipboard and returns true', async () => {
    const writeText = vi.mocked(navigator.clipboard.writeText);
    writeText.mockResolvedValueOnce(undefined);

    await expect(handleCopy('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('returns false when clipboard write fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error('denied')
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(handleCopy('secret')).resolves.toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('FormValues', () => {
  const typeByField = Object.fromEntries(
    FormValues.map((field) => [field.value, field.type])
  );

  it('maps schema fields to HTML input types', () => {
    expect(typeByField.email).toBe('email');
    expect(typeByField.linkedin).toBe('url');
    expect(typeByField.country).toBe('select');
    expect(typeByField.about).toBe('textarea');
    expect(typeByField.interest_about_company).toBe('textarea');
    expect(typeByField.age).toBe('number');
    expect(typeByField.open_for_remote).toBe('checkbox');
    expect(typeByField.skills).toBe('array');
    expect(typeByField.salary_expectation).toBe('object');
    expect(typeByField.last_working_day).toBe('date');
    expect(typeByField.first_name).toBe('text');
  });
});
