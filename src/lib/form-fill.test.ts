import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormSchemaType } from '@/types';

import { getAllInputFields, setAllInputFields } from './index';

function input(attrs: Record<string, string>, parent: ParentNode = document.body) {
  const el = document.createElement('input');
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  parent.appendChild(el);
  return el;
}

function openShadow(parent: ParentNode = document.body) {
  const host = document.createElement('div');
  parent.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}

const storedData = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  country: 'United Kingdom',
  address: '12 Analytical Engine Rd',
  city: 'London',
  state: 'England',
  gender: 'female',
  phone_number: {
    country_code: '+44',
    phone_number: '7700900000',
  },
  work_experience: { years: '8', months: '3' },
  salary_expectation: {
    currency: 'GBP',
    salary: 90000,
    salary_period: 'per_year',
  },
  current_salary: {
    currency: 'GBP',
    salary: 80000,
    salary_period: 'per_year',
  },
  available_to_join_in_days: '14',
  do_you_require_visa_sponsorship: false,
  interest_about_company: 'I like the mission.',
  linkedin: 'https://linkedin.com/in/ada',
  github: 'https://github.com/ada',
  portfolio: 'https://ada.dev',
  custom_fields: [
    {
      id: '1',
      field_type: 'text',
      search_type: 'name',
      selector: 'company',
      attribute_name: 'value',
      value: 'Analytical Engines',
    },
  ],
} as FormSchemaType;

describe('getAllInputFields', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fills fields from name, type, id, autocomplete, and custom selectors', () => {
    const firstName = input({ name: 'first_name' });
    const lastName = input({ name: 'last_name' });
    const emailByType = input({ type: 'email', name: 'contact' });
    const phoneByType = input({ type: 'tel', name: 'mobile' });
    const emailById = input({ id: 'email', name: 'other' });
    const givenName = input({ autocomplete: 'given-name', name: 'gn' });
    const female = input({ id: 'female', type: 'radio', name: 'gender' });
    const male = input({ id: 'male', type: 'radio', name: 'gender' });
    const custom = input({ name: 'company' });
    const salary = input({ name: 'desiredSalary' });

    getAllInputFields(storedData);

    expect(firstName.value).toBe('Ada');
    expect(lastName.value).toBe('Lovelace');
    expect(emailByType.value).toBe('ada@example.com');
    expect(phoneByType.value).toBe('7700900000');
    expect(emailById.value).toBe('ada@example.com');
    expect(givenName.value).toBe('Ada');
    expect(female.checked).toBe(true);
    expect(male.checked).toBe(false);
    expect(custom.value).toBe('Analytical Engines');
    expect(salary.value).toBe('90000');
  });

  it('does nothing when stored data is missing', () => {
    const firstName = input({ name: 'first_name' });
    getAllInputFields(undefined as unknown as FormSchemaType);
    expect(firstName.value).toBe('');
  });

  it('fills inputs inside open shadow roots, including nested ones', () => {
    const outer = openShadow();
    const firstName = input({ name: 'first_name' }, outer);
    const inner = openShadow(outer);
    const email = input({ type: 'email', name: 'contact' }, inner);

    getAllInputFields(storedData);

    expect(firstName.value).toBe('Ada');
    expect(email.value).toBe('ada@example.com');
  });

  it('leaves the extension autocomplete shadow alone', () => {
    const host = document.createElement('div');
    host.className = 'autocomplete-list-shiksha-setu';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const firstName = input({ name: 'first_name' }, shadow);

    getAllInputFields(storedData);

    expect(firstName.value).toBe('');
  });

  it('cannot fill inputs inside a closed shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    const firstName = input({ name: 'first_name' }, shadow);

    getAllInputFields(storedData);

    expect(firstName.value).toBe('');
  });
});

describe('setAllInputFields', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('fills matching inputs from site-specific data', () => {
    window.history.pushState({}, '', '/apply');
    const name = input({ name: 'full_name', type: 'text' });
    const remote = input({
      name: 'open_for_remote',
      type: 'checkbox',
      value: 'yes',
    });

    setAllInputFields({
      sites: {
        [window.location.href]: {
          full_name: 'Ada Lovelace',
          open_for_remote: 'yes',
        },
      },
    });

    expect(name.value).toBe('Ada Lovelace');
    expect(remote.checked).toBe(true);
  });

  it('uses the payload directly when sites is not present', () => {
    const city = input({ name: 'city', type: 'text' });
    setAllInputFields({ city: 'London' });
    expect(city.value).toBe('London');
  });

  it('fills inputs inside an open shadow root', () => {
    const shadow = openShadow();
    const city = input({ name: 'city', type: 'text' }, shadow);

    setAllInputFields({ city: 'London' });

    expect(city.value).toBe('London');
  });
});
