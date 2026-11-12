import { describe, expect, it, vi } from 'vitest';

import {
  formValues,
  persistCapturedForm,
  readFormValues,
  watchPageForms,
} from './form-capture';

function textForm() {
  const form = document.createElement('form');
  const name = document.createElement('input');
  name.name = 'full_name';
  name.value = 'Ada Lovelace';
  form.append(name);
  return form;
}

describe('formValues', () => {
  it('keeps text fields and drops file fields', () => {
    expect(
      formValues([
        ['full_name', 'Ada Lovelace'],
        ['resume', new File(['pdf'], 'cv.pdf', { type: 'application/pdf' })],
      ])
    ).toEqual({ full_name: 'Ada Lovelace' });
  });
});

describe('readFormValues', () => {
  it('reads text fields from a form', () => {
    const form = textForm();
    document.body.appendChild(form);

    expect(readFormValues(form)).toEqual({ full_name: 'Ada Lovelace' });
  });
});

describe('persistCapturedForm', () => {
  it('prompts the user and saves when confirmed', async () => {
    window.history.pushState({}, '', '/apply');
    const form = textForm();
    document.body.appendChild(form);
    let stored: Record<string, unknown> = {};
    let savedAtNotify: unknown;

    await persistCapturedForm(
      form,
      {
        get: async () => ({ sitesurls: stored.sitesurls }),
        set: async (items) => {
          await Promise.resolve();
          stored = { ...stored, ...items };
        },
      },
      async () => {
        savedAtNotify = stored[window.location.href];
      },
      async () => true // simulated user clicks 'Save'
    );

    expect(savedAtNotify).toEqual({ full_name: 'Ada Lovelace' });
    expect(stored.sitesurls).toEqual({ [window.location.href]: true });
  });

  it('does not store or notify when user declines the prompt', async () => {
    window.history.pushState({}, '', '/apply-decline');
    const form = textForm();
    document.body.appendChild(form);
    let stored: Record<string, unknown> = {};
    const notify = vi.fn();

    await persistCapturedForm(
      form,
      {
        get: async () => ({ sitesurls: stored.sitesurls }),
        set: async (items) => {
          stored = { ...stored, ...items };
        },
      },
      notify,
      async () => false // simulated user clicks "Don't Save"
    );

    expect(notify).not.toHaveBeenCalled();
    expect(stored[window.location.href]).toBeUndefined();
  });

  it('does not re-prompt if the site URL is already saved', async () => {
    window.history.pushState({}, '', '/already-saved');
    const form = textForm();
    document.body.appendChild(form);
    let stored: Record<string, unknown> = {
      sitesurls: { [window.location.href]: true },
    };
    const confirmPrompt = vi.fn();

    await persistCapturedForm(
      form,
      {
        get: async () => ({ sitesurls: stored.sitesurls }),
        set: async (items) => {
          stored = { ...stored, ...items };
        },
      },
      () => {},
      confirmPrompt
    );

    // confirmPrompt should never be called because the site is already saved
    expect(confirmPrompt).not.toHaveBeenCalled();
    expect(stored[window.location.href]).toEqual({ full_name: 'Ada Lovelace' });
  });

  it('does not re-prompt if already declined during the session', async () => {
    window.history.pushState({}, '', '/declined-once');
    const form = textForm();
    document.body.appendChild(form);
    let stored: Record<string, unknown> = {};
    const confirmPrompt = vi.fn().mockResolvedValue(false);

    // First submit: user declines
    await persistCapturedForm(
      form,
      {
        get: async () => ({ sitesurls: stored.sitesurls }),
        set: async (items) => {
          stored = { ...stored, ...items };
        },
      },
      () => {},
      confirmPrompt
    );
    expect(confirmPrompt).toHaveBeenCalledTimes(1);

    // Second submit on same URL: should not prompt again
    await persistCapturedForm(
      form,
      {
        get: async () => ({ sitesurls: stored.sitesurls }),
        set: async (items) => {
          stored = { ...stored, ...items };
        },
      },
      () => {},
      confirmPrompt
    );
    expect(confirmPrompt).toHaveBeenCalledTimes(1);
  });
});

describe('watchPageForms', () => {
  it('saves forms added later, including forms inside an open shadow root', () => {
    const onSubmit = vi.fn();
    watchPageForms(onSubmit);

    const late = document.createElement('form');
    document.body.appendChild(late);

    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const shadowForm = document.createElement('form');
    shadow.appendChild(shadowForm);

    late.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    shadowForm.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(onSubmit).toHaveBeenCalledWith(late);
    expect(onSubmit).toHaveBeenCalledWith(shadowForm);
  });

  it('ignores forms inside the extension menu', () => {
    const onSubmit = vi.fn();
    watchPageForms(onSubmit);

    const host = document.createElement('div');
    host.className = 'autocomplete-list-shiksha-setu';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const form = document.createElement('form');
    shadow.appendChild(form);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
