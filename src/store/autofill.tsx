'use client';

import { observable } from '@legendapp/state';
import { synced } from '@legendapp/state/sync';
import { syncObservable } from '@legendapp/state/sync';
import { v4 as uuidv4 } from 'uuid';
import { getAutofill, setAutofill } from '@/api';
import { isAuth$ } from './auth';
import { persistOptions } from './common';

import { parseAutofillPayload } from '@/lib/autofill-payload';

import type { FormSchemaType } from '@/types';

let latestAutofills: (FormSchemaType & { id: string })[] = [];
let autofillSaveTimer: ReturnType<typeof setTimeout> | undefined;
let autofillWaiters: Array<(value: unknown) => void> = [];

function saveAutofills(value: (FormSchemaType & { id: string })[]) {
  if (!isAuth$.get()) {
    return Promise.resolve();
  }
  latestAutofills = value;
  return new Promise((resolve) => {
    autofillWaiters.push(resolve);
    clearTimeout(autofillSaveTimer);
    autofillSaveTimer = setTimeout(() => {
      const waiters = autofillWaiters;
      autofillWaiters = [];
      setAutofill(latestAutofills).then(
        (result) => waiters.forEach((done) => done(result)),
        () => waiters.forEach((done) => done(undefined))
      );
    }, 400);
  });
}

export const createDefaultProfile = (): FormSchemaType & { id: string } => ({
  id: uuidv4(),
  first_name: 'Default User',
  email: 'me@example.com',
});

export const DEFAULT_PROFILE: FormSchemaType & { id: string } = createDefaultProfile();

export const autofills$ = observable({
  autofills: synced({
    initial: [DEFAULT_PROFILE] as (FormSchemaType & { id: string })[],
    // When the fetch resolves it will update the observable
    get: () => (isAuth$.get() ? getAutofill() : [DEFAULT_PROFILE]),
    // When the observable is changed it will send the changes back to the server.
    set: ({ value }) => saveAutofills(value),
    transform: {
      load: (value, method) =>
        method === 'get'
          ? (() => {
              const parsed = parseAutofillPayload(value);
              return Array.isArray(parsed) && parsed.length > 0
                ? parsed
                : [DEFAULT_PROFILE];
            })()
          : value,
    },
    waitFor: isAuth$,
    mode: 'merge',
  }),
  currentAutofill: 0,
  addAutofill: (values: FormSchemaType) => {
    const profiles = autofills$.autofills.get() ?? [];
    const profile = {
      ...values,
      id: uuidv4(),
    };
    autofills$.autofills.set([...profiles, profile]);
    autofills$.currentAutofill.set(profiles.length);
  },
  editAutofill: (values: FormSchemaType & { id: string }) => {
    const profiles = autofills$.autofills.get() ?? [];
    const index = profiles.findIndex((p: any) => p?.id === values.id);
    if (index !== -1) {
      autofills$.autofills[index].set(values);
    } else {
      const current = autofills$.get().currentAutofill;
      if (current >= 0 && current < profiles.length) {
        autofills$.autofills[current].set(values);
      }
    }
  },
  setAutofill: (values: (FormSchemaType & { id?: string })[]) => {
    autofills$.autofills.set(values);
  },
  setCurrentAutofill: (index: number) => {
    autofills$.currentAutofill.set(index);
  },
  removeAutofill: (key: number) => {
    const profiles = autofills$.autofills.get() ?? [];
    if (key < 0 || key >= profiles.length) {
      return;
    }
    const next = profiles.filter((_profile: unknown, index: number) => index !== key);
    autofills$.autofills.set(next);
    const current = autofills$.currentAutofill.get();
    if (next.length === 0) {
      autofills$.currentAutofill.set(0);
      return;
    }
    if (key < current) {
      autofills$.currentAutofill.set(current - 1);
      return;
    }
    if (current >= next.length) {
      autofills$.currentAutofill.set(next.length - 1);
    }
  },
});

syncObservable(
  autofills$,
  persistOptions({
    persist: {
      name: 'autofills', // IndexedDB table name
    },
  })
);
