import { isExtensionRoot, queryDeepAll } from './dom';
import { getMessage } from './i18n';

export function formValues(
  entries: Iterable<[string, FormDataEntryValue]>
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!(value instanceof File)) {
      values[key] = String(value);
    }
  }
  return values;
}

/** Find the direct enclosing question container and its heading/prompt */
export function findQuestionPrompt(targetElement: Element): { question: string; group: Element } | null {
  // 0. Check aria-labelledby on targetElement or its closest interactive container
  const labelledEl = targetElement.hasAttribute('aria-labelledby')
    ? targetElement
    : targetElement.closest('[aria-labelledby]');
  if (labelledEl) {
    const labelledBy = labelledEl.getAttribute('aria-labelledby');
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/)) {
        const lbl = document.getElementById(id);
        const txt = lbl?.textContent?.trim();
        if (lbl && txt && txt.length > 2 && txt.length < 300) {
          return { question: cleanQuestionTitle(txt), group: lbl };
        }
      }
    }
  }

  // 1. Direct label link via id / htmlFor
  if (targetElement.id) {
    try {
      const lbl = document.querySelector(`label[for="${CSS.escape(targetElement.id)}"]`);
      const txt = lbl?.textContent?.trim();
      if (lbl && txt && txt.length > 2 && txt.length < 300) {
        return { question: cleanQuestionTitle(txt), group: lbl };
      }
    } catch {
      // ignore
    }
  }

  // Helper to check if an element is a valid question heading
  function getHeadingText(el: Element): string | null {
    if (el === targetElement || el.contains(targetElement)) return null;
    
    // An actual question heading should not contain interactive inputs/radios/checkboxes
    if (el.querySelector('input, select, textarea, [role="radio"], [role="checkbox"], [role="option"]')) {
      return null;
    }

    const txt = el.textContent?.trim();
    if (!txt || txt.length < 3 || txt.length > 300) return null;

    // Check if the text looks like an answer option rather than a question prompt
    if (/^(yes|no|true|false|agree|disagree|male|female|other|decline|prefer not to say|na|n\/a)$/i.test(txt)) {
      return null;
    }

    return cleanQuestionTitle(txt);
  }

  // 2. Candidate question containers from closest outward
  const selectors = [
    '.field-wrapper',
    '.select__container',
    '.select',
    '[data-automation-id*="question"]',
    '[class*="question"]',
    'fieldset',
    '[role="radiogroup"]',
    '[role="group"]',
    '.form-group',
    '.field',
    '[class*="form-item"]',
    '[class*="formField"]',
    '[class*="formGroup"]',
    '[class*="item"]',
  ];

  for (const sel of selectors) {
    const group = targetElement.closest(sel);
    if (!group) continue;

    // Look for heading/legend elements in this question container
    const headings = group.querySelectorAll(
      'legend, [class*="label"], [class*="title"], [class*="header"], [class*="prompt"], [data-automation-id*="label"], h1, h2, h3, h4, h5, label'
    );

    for (const h of headings) {
      const q = getHeadingText(h);
      if (q) {
        return { question: q, group };
      }
    }
  }

  // 3. Look at preceding siblings up the DOM tree
  let curr: Element | null = targetElement;
  while (curr && curr !== document.body) {
    let prev = curr.previousElementSibling;
    while (prev) {
      const q = getHeadingText(prev);
      if (q) {
        return { question: q, group: prev.parentElement || prev };
      }
      // Check inner heading within previous sibling
      const innerHeading = prev.querySelector('legend, [class*="label"], [class*="title"], [class*="header"], [class*="prompt"], h1, h2, h3, h4, h5, label');
      if (innerHeading) {
        const innerQ = getHeadingText(innerHeading);
        if (innerQ) {
          return { question: innerQ, group: prev };
        }
      }
      prev = prev.previousElementSibling;
    }
    curr = curr.parentElement;
  }

  return null;
}

export function cleanQuestionTitle(text: string): string {
  return text
    .replace(/[*:\?\s]+$/, '')
    .replace(/^\s*[*:\s]+/, '')
    .trim();
}

/** Extract only the answer choice text, removing question labels if nested inside */
export function extractChoiceText(el: HTMLElement, questionTitle?: string): string {
  // If the element has a direct value attribute, prefer that
  const attrVal = el.getAttribute('value') || el.getAttribute('data-value') || el.getAttribute('aria-label');
  
  // Clone element to safely remove any child headers, legends, or question prompts
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('legend, h1, h2, h3, h4, h5, .label, [class*="label"], [class*="title"], [class*="question"]').forEach((node) => {
    node.remove();
  });

  let text = (clone.textContent || '').trim();
  
  // If text contains the question title, strip it out
  if (questionTitle && questionTitle.length > 3) {
    const cleanQ = cleanQuestionTitle(questionTitle).toLowerCase();
    const lowerText = text.toLowerCase();
    const qIndex = lowerText.indexOf(cleanQ);
    if (qIndex !== -1) {
      text = (text.slice(0, qIndex) + ' ' + text.slice(qIndex + cleanQ.length)).trim();
    }
  }

  // If text is still empty, fall back to attribute value
  if (!text && attrVal) {
    return attrVal.trim();
  }

  // Remove leading/trailing symbols, radio bullet indicators like "○", "●"
  text = text.replace(/^[○●()[\]*\-\s]+/, '').replace(/[*s]+$/, '').trim();
  return text;
}
const sessionInteractionValues: Record<string, string> = {};

// Cache decisions per URL in the current tab session so the user is asked at most once
const sessionPromptDecisions = new Map<string, boolean>();

export function clearPromptDecisions(url?: string): void {
  if (url) {
    sessionPromptDecisions.delete(url);
  } else {
    sessionPromptDecisions.clear();
  }
}

export function getSessionInteractionValues(): Record<string, string> {
  return { ...sessionInteractionValues };
}

export function resetSessionInteractionValues(): void {
  for (const key of Object.keys(sessionInteractionValues)) {
    delete sessionInteractionValues[key];
  }
}

/** Get a human-readable or stable identifier for a form element */
export function getFieldLabelOrKey(el: Element, index: number = 0): string {
  // 1. Linked aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    for (const id of ids) {
      const lbl = document.getElementById(id);
      const txt = lbl?.textContent?.trim();
      if (txt && txt.length > 2 && txt.length < 300) {
        return cleanQuestionTitle(txt);
      }
    }
  }

  // 2. Direct ID linked <label for="...">
  const directId = el.getAttribute('id');
  if (directId) {
    try {
      const label = document.querySelector(`label[for="${CSS.escape(directId)}"]`);
      if (label && label.textContent && label.textContent.trim().length > 0) {
        return cleanQuestionTitle(label.textContent.trim());
      }
    } catch {
      // ignore
    }
  }

  // 3. Direct standard attributes
  const directName = el.getAttribute('name');
  if (directName && directName.trim().length > 0) return directName.trim();

  // 4. Custom QA / test attributes used by modern portals (Workday, Greenhouse, Ashby, Lever)
  const dataQa =
    el.getAttribute('data-qa') ||
    el.getAttribute('data-automation-id') ||
    el.getAttribute('data-testid') ||
    el.getAttribute('data-test');
  if (dataQa && dataQa.trim().length > 0) return dataQa.trim();

  // 5. Accessibility / placeholder labels
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim().length > 0) return ariaLabel.trim();

  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim().length > 0) return placeholder.trim();

  // 6. Closest question container header/legend
  const promptInfo = findQuestionPrompt(el);
  if (promptInfo) {
    return promptInfo.question;
  }

  // 7. Parent / enclosing <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent && parentLabel.textContent.trim().length > 0) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea').forEach((n) => n.remove());
    const text = clone.textContent?.trim();
    if (text && text.length > 0) return cleanQuestionTitle(text);
  }

  if (directId && directId.trim().length > 0) return directId.trim();

  return `field_${index}`;
}

export function readFormValues(form?: HTMLFormElement | null): Record<string, string> {
  const values: Record<string, string> = { ...sessionInteractionValues };

  // If a form is passed, get standard FormData entries first
  if (form) {
    try {
      const fd = new FormData(form);
      for (const [k, v] of fd.entries()) {
        if (!(v instanceof File) && typeof v === 'string' && v.trim().length > 0) {
          values[k] = v;
        }
      }
    } catch {
      // fallback to manual reading
    }
  }

  // Collect all potential input fields:
  // - inputs, textareas, selects
  // - ARIA comboboxes, listboxes, radiogroups (custom UI dropdowns / question pickers)
  // - contenteditable elements
  // - Custom question blocks (e.g., div/span with active/selected classes)
  const root = form ?? document;
  const elements = queryDeepAll(
    'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="radiogroup"], [role="checkbox"], [role="radio"], [role="option"][aria-selected="true"], [class*="selected"], [class*="active"], [class*="checked"]',
    root
  ) as HTMLElement[];

  // If a specific form was passed but yielded few inputs, query the whole document
  const allElements = (form && elements.length <= 1)
    ? (queryDeepAll(
        'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="radiogroup"], [role="checkbox"], [role="radio"], [role="option"][aria-selected="true"], [class*="selected"], [class*="active"], [class*="checked"]',
        document
      ) as HTMLElement[])
    : elements;

  allElements.forEach((el, index) => {
    // Ignore extension UI elements
    if (isExtensionRoot(el.closest('.autocomplete-list-shiksha-setu') as Element || el)) {
      return;
    }

    // Ignore submit/reset/file/password buttons
    if (el instanceof HTMLInputElement && (el.type === 'file' || el.type === 'password' || el.type === 'submit' || el.type === 'button' || el.type === 'reset')) {
      return;
    }

    // Native Checkboxes & Radios
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (el.checked) {
        const promptInfo = findQuestionPrompt(el);
        const key = promptInfo ? promptInfo.question : cleanQuestionTitle(getFieldLabelOrKey(el, index));
        const optionLabel = extractChoiceText(el.closest('label') || el, key) || el.value || 'true';
        // Only set if valid and not already captured via session interaction
        if (key && !/^(yes|no|true|false|agree|disagree)$/i.test(key) && optionLabel) {
          values[key] = optionLabel;
        }
      }
      return;
    }

    // ARIA Radio / Checkbox elements (common in Workday & custom career questions)
    const role = el.getAttribute('role');
    if (role === 'checkbox' || role === 'radio') {
      const isChecked = el.getAttribute('aria-checked') === 'true' || el.classList.contains('checked') || el.classList.contains('selected');
      if (isChecked) {
        const promptInfo = findQuestionPrompt(el);
        const key = promptInfo ? promptInfo.question : cleanQuestionTitle(getFieldLabelOrKey(el, index));
        const optionLabel = extractChoiceText(el, key) || el.getAttribute('aria-label') || 'true';
        if (key && !/^(yes|no|true|false|agree|disagree)$/i.test(key) && optionLabel) {
          values[key] = optionLabel;
        }
      }
      return;
    }

    // Custom selected items / options (div, span, button styled as selected in a question group)
    if (
      role === 'option' ||
      el.getAttribute('aria-selected') === 'true' ||
      el.classList.contains('selected') ||
      el.classList.contains('active')
    ) {
      // Check if it belongs to a custom question group
      const questionGroup = el.closest('fieldset, [role="group"], [role="radiogroup"], .field, .form-group, .question, [data-automation-id*="question"], [class*="question"], [class*="form-item"]');
      if (questionGroup) {
        const promptInfo = findQuestionPrompt(el) || findQuestionPrompt(questionGroup);
        const key = promptInfo ? promptInfo.question : cleanQuestionTitle(getFieldLabelOrKey(el, index));
        const selectedText = extractChoiceText(el, key) || el.getAttribute('value') || '';
        if (key && !/^(yes|no|true|false|agree|disagree)$/i.test(key) && selectedText && selectedText.length > 0 && selectedText.length < 150 && !/^(submit|apply|save|next|cancel)/i.test(selectedText)) {
          if (!values[key]) {
            values[key] = selectedText;
            return;
          }
        }
      }
    }

    // Standard <select> dropdowns
    if (el instanceof HTMLSelectElement) {
      const selectedOption = el.selectedOptions?.[0] || el.options?.[el.selectedIndex];
      const val = selectedOption?.text?.trim() || el.value?.trim() || '';
      // Don't capture empty placeholder options like "Select...", "Please choose"
      if (val && !/^(select|choose|please select|--)/i.test(val)) {
        const key = getFieldLabelOrKey(el, index);
        values[key] = val;
      }
      return;
    }

    // ARIA Combobox / Listbox (covers standard ARIA, Headless UI, Radix/Shadcn, Material-UI, Ant Design, react-select, etc.)
    if (role === 'combobox' || role === 'listbox') {
      let val =
        el.getAttribute('aria-valuenow') ||
        el.getAttribute('aria-valuetext') ||
        '';

      // 1. Check if the element itself is an input or button with a value/label
      if (!val && el instanceof HTMLInputElement && el.value.trim().length > 0) {
        val = el.value.trim();
      }

      // 2. Generic display value containers used across major UI component libraries:
      // - Radix / Shadcn UI: [data-radix-select-value], [data-placeholder]
      // - Material UI (MUI): .MuiSelect-select, [class*="MuiSelect"]
      // - Ant Design: .ant-select-selection-item
      // - Headless UI: [id^="headlessui-listbox-button"], [data-headlessui-state]
      // - react-select / generic: [class*="single-value"], [class*="singleValue"], [class*="has-value"], [class*="selected-value"], [class*="current-value"]
      if (!val) {
        const parentContainer = el.closest(
          '[class*="control"], [class*="container"], [class*="wrapper"], [class*="select"], [role="combobox"], [role="listbox"], .field-wrapper'
        ) || el.parentElement;

        const valEl = parentContainer?.querySelector(
          '[data-radix-select-value], .MuiSelect-select, [class*="MuiSelect-select"], .ant-select-selection-item, [class*="single-value"], [class*="singleValue"], [class*="selected-value"], [class*="current-value"], [class*="value-label"], [class*="display-value"]'
        );

        if (valEl) {
          const clone = valEl.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('input, button, svg, [aria-hidden="true"]').forEach((n) => n.remove());
          val = clone.textContent?.trim() || '';
        }
      }

      // 3. Fallback to direct text content (e.g. <button role="combobox"><span>Option</span></button>)
      if (!val) {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input, button, svg, [aria-hidden="true"]').forEach((n) => n.remove());
        val = clone.textContent?.trim() || '';
      }

      if (val && !/^(select|choose|please select|--)/i.test(val)) {
        const key = getFieldLabelOrKey(el, index);
        if (!values[key]) {
          values[key] = val;
        }
      }
      return;
    }

    // Standard text inputs, textareas, contenteditable
    let val = '';
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      val = el.value;
    } else if (el.isContentEditable) {
      val = el.textContent || '';
    }

    if (val && typeof val === 'string' && val.trim().length > 0) {
      const key = getFieldLabelOrKey(el, index);
      if (!values[key]) {
        values[key] = val.trim();
      }
    }
  });

  return values;
}

export interface CapturedFormStorage {
  get: (keys: string[]) => Promise<Record<string, unknown> | undefined>;
  set: (items: Record<string, unknown>) => Promise<unknown>;
}

export function promptSaveSiteConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    // If prompt is already visible, don't stack multiple prompts
    if (document.getElementById('shikshasetu-save-prompt-host')) {
      resolve(false);
      return;
    }

    const host = document.createElement('div');
    host.id = 'shikshasetu-save-prompt-host';
    host.className = 'autocomplete-list-shiksha-setu';
    const shadow = host.attachShadow({ mode: 'open' });

    const titleText = getMessage('saveSitePromptTitle') || 'Save details for this website?';
    const descText =
      getMessage('saveSitePromptDesc') ||
      'Do you want to save the details filled on this website for future one-click autofilling?';
    const yesText = getMessage('saveSiteYes') || 'Save';
    const noText = getMessage('saveSiteNo') || "Don't Save";

    const style = document.createElement('style');
    style.textContent = `
      .prompt-overlay {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        width: 330px;
        max-width: calc(100vw - 32px);
        background: #ffffff;
        color: #111827;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        padding: 16px;
        box-sizing: border-box;
        animation: slideIn 0.2s ease-out;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .prompt-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .prompt-icon {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        background: #2563eb;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        flex-shrink: 0;
      }
      .prompt-title {
        font-weight: 600;
        font-size: 13px;
        color: #111827;
        margin: 0;
      }
      .prompt-desc {
        color: #4b5563;
        font-size: 12px;
        line-height: 1.4;
        margin: 0 0 14px 0;
      }
      .prompt-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .btn {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background-color 0.15s ease;
      }
      .btn-cancel {
        background: #f3f4f6;
        color: #374151;
        border-color: #d1d5db;
      }
      .btn-cancel:hover {
        background: #e5e7eb;
      }
      .btn-confirm {
        background: #2563eb;
        color: #ffffff;
      }
      .btn-confirm:hover {
        background: #1d4ed8;
      }
    `;

    const container = document.createElement('div');
    container.className = 'prompt-overlay';
    container.innerHTML = `
      <div class="prompt-header">
        <div class="prompt-icon">S</div>
        <h4 class="prompt-title">${titleText}</h4>
      </div>
      <p class="prompt-desc">${descText}</p>
      <div class="prompt-actions">
        <button class="btn btn-cancel" id="btn-cancel">${noText}</button>
        <button class="btn btn-confirm" id="btn-confirm">${yesText}</button>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);

    const cleanup = () => {
      host.remove();
    };

    container.querySelector('#btn-confirm')?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    container.querySelector('#btn-cancel')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Auto-dismiss safely after 30 seconds if user ignores
    setTimeout(() => {
      if (document.body.contains(host)) {
        cleanup();
        resolve(false);
      }
    }, 30000);

    document.body.appendChild(host);
  });
}

export async function persistCapturedForm(
  form: HTMLFormElement | null,
  storage: CapturedFormStorage,
  notify: () => void | Promise<void>,
  confirmSave?: () => Promise<boolean>
) {
  const pageUrl = window.location.href;
  const values = readFormValues(form);
  if (Object.keys(values).length === 0) {
    return;
  }

  const stored = await storage.get(['sitesurls', 'saved_sites', 'blocked_sites']);
  const sitesurls =
    stored?.sitesurls && typeof stored.sitesurls === 'object'
      ? (stored.sitesurls as Record<string, unknown>)
      : {};
  const savedSites =
    stored?.saved_sites && typeof stored.saved_sites === 'object'
      ? (stored.saved_sites as Record<string, Record<string, string>>)
      : {};
  const blockedSites =
    stored?.blocked_sites && typeof stored.blocked_sites === 'object'
      ? (stored.blocked_sites as Record<string, boolean>)
      : {};

  // If this site URL is blocked, completely ignore and never prompt
  if (blockedSites[pageUrl] || sessionPromptDecisions.get(pageUrl) === false) {
    console.log('[ShikshaSetu] Site is in blocked list:', pageUrl);
    return;
  }

  // If this site URL is already saved or approved, save updates silently without re-prompting
  let shouldSave = false;
  const isSavedInStorage = Boolean(sitesurls[pageUrl] || savedSites[pageUrl]);
  if (isSavedInStorage || sessionPromptDecisions.get(pageUrl) === true) {
    shouldSave = true;
  } else {
    // First time encountering this site: ask the user once
    shouldSave = confirmSave
      ? await confirmSave()
      : await promptSaveSiteConfirmation();
    sessionPromptDecisions.set(pageUrl, shouldSave);
  }

  if (!shouldSave) {
    console.log('[ShikshaSetu] User declined saving form data for', pageUrl);
    // Add to persistent blocked_sites so the user is not prompted again unless they re-enable it in Settings
    await storage.set({
      blocked_sites: { ...blockedSites, [pageUrl]: true },
    });
    return;
  }

  console.log('[ShikshaSetu] Captured form data for', pageUrl, values);

  // If previously in blocked list, remove it
  const nextBlocked = { ...blockedSites };
  delete nextBlocked[pageUrl];

  await storage.set({
    [pageUrl]: values,
    sitesurls: { ...sitesurls, [pageUrl]: true },
    saved_sites: { ...savedSites, [pageUrl]: values },
    blocked_sites: nextBlocked,
  });
  await notify();
}

function formFromEvent(event: Event): HTMLFormElement | undefined {
  const form = event
    .composedPath()
    .find((node) => node instanceof HTMLFormElement);
  if (!(form instanceof HTMLFormElement)) {
    return undefined;
  }
  const root = form.getRootNode();
  if (
    root instanceof ShadowRoot &&
    root.host instanceof Element &&
    isExtensionRoot(root.host)
  ) {
    return undefined;
  }
  return form;
}

export function watchPageForms(onSubmit: (form: HTMLFormElement | null) => void) {
  // Helper to record a question-answer pair cleanly
  function recordChoice(targetElement: HTMLElement) {
    if (isExtensionRoot(targetElement.closest('.autocomplete-list-shiksha-setu') as Element || targetElement)) return;

    let promptInfo = findQuestionPrompt(targetElement);

    // If direct search didn't find prompt, check surrounding radio/option container or parent
    if (!promptInfo) {
      const optionContainer = targetElement.closest('[role="radiogroup"], [role="group"], fieldset, ul, ol, div');
      if (optionContainer && optionContainer !== document.body) {
        promptInfo = findQuestionPrompt(optionContainer);
      }
    }

    if (!promptInfo) {
      console.log('[ShikshaSetu Debug] No question prompt found for clicked element:', targetElement);
      return;
    }

    const rawQuestion = promptInfo.question;
    const answer = extractChoiceText(targetElement, rawQuestion);

    if (!answer || answer.length === 0 || answer.length > 150) {
      console.log('[ShikshaSetu Debug] Empty or invalid answer extracted for question:', rawQuestion, 'target:', targetElement);
      return;
    }
    if (/^(submit|apply|save|next|cancel|continue|back)/i.test(answer)) return;

    // Reject if answer is identical to question
    if (cleanQuestionTitle(answer).toLowerCase() === cleanQuestionTitle(rawQuestion).toLowerCase()) {
      return;
    }

    sessionInteractionValues[rawQuestion] = answer;
    console.log('[ShikshaSetu] Recorded user choice:', rawQuestion, '->', answer);
  }

  // 0a. Passive Click-Stream Recorder
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const clickable = target.closest(
        '[role="radio"], [role="checkbox"], [role="option"], label, div.option, span.option, [class*="choice"], [class*="pill"], [class*="option"], button'
      );
      if (clickable instanceof HTMLElement) {
        recordChoice(clickable);
      }
    },
    true
  );

  // 0b. Passive Change Event Listener (catches native radios, checkboxes, selects, and inputs automatically without requiring explicit click)
  document.addEventListener(
    'change',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target instanceof HTMLInputElement && (target.type === 'radio' || target.type === 'checkbox')) {
        if (target.checked) {
          const parentOpt = target.closest('label') || target;
          recordChoice(parentOpt as HTMLElement);
        }
      } else if (target instanceof HTMLSelectElement) {
        const selected = target.selectedOptions?.[0] || target.options?.[target.selectedIndex];
        const val = selected?.text?.trim() || target.value?.trim();
        if (val && !/^(select|choose|--)/i.test(val)) {
          const group = target.closest(
            'fieldset, [role="group"], .field, .form-group, .question, [class*="question"], [class*="form-item"]'
          );
          const legend = group?.querySelector('legend, label, .label, [class*="label"], [class*="title"], h3, h4, h5');
          const q = legend?.textContent?.trim();
          if (q) {
            const cleanQ = cleanQuestionTitle(q);
            sessionInteractionValues[cleanQ] = val;
            console.log('[ShikshaSetu] Recorded select choice:', cleanQ, '->', val);
          }
        }
      }
    },
    true
  );

  // 1. Native form submit events
  document.addEventListener(
    'submit',
    (event) => {
      const form = formFromEvent(event);
      onSubmit(form ?? null);
    },
    true
  );

  // 2. Capture clicks on submit buttons that may bypass native submit
  //    (common in SPA career portals like Greenhouse, Lever, Workday, etc.)
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      // Check if the clicked element is a submit button, or any button/link that might submit
      const button = target.closest(
        'button[type="submit"], input[type="submit"], button, [role="button"], a[role="button"], input[type="button"], a'
      );
      if (!button) {
        return;
      }
      // Do not trigger from our extension's own UI
      if (isExtensionRoot(button.closest('.autocomplete-list-shiksha-setu') as Element || button)) {
        return;
      }
      const form = button.closest('form');
      if (form && isExtensionRoot(form.closest('.autocomplete-list-shiksha-setu') as Element || form)) {
        return;
      }

      // Check button text or type to ensure it could be a submission/action
      const btnText = (button.textContent || button.getAttribute('value') || '').toLowerCase().trim();
      const isSubmitLike =
        button.getAttribute('type') === 'submit' ||
        ['submit', 'apply', 'send', 'save', 'next', 'continue', 'register', 'finish', 'complete'].some((keyword) =>
          btnText.includes(keyword)
        ) ||
        Boolean(form);

      if (!isSubmitLike && button.tagName.toLowerCase() === 'a') {
        return;
      }

      // Read immediately before page unload / navigation / clearing, and once after a short delay
      onSubmit(form);
      setTimeout(() => {
        onSubmit(form);
      }, 400);
    },
    true
  );

  // 3. Optional network observation: In an extension content script sandbox,
  // page scripts run in their own world and `window.fetch` may be a read-only getter
  // in some browser contexts (e.g. Firefox content scripts).
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function (...args) {
        try {
          const [input, init] = args;
          if (init?.method && init.method.toUpperCase() === 'POST' && init.body) {
            captureFromRequestBody(init.body, onSubmit);
          } else if (input instanceof Request && input.method === 'POST') {
            scanAndCaptureForms(onSubmit);
          }
        } catch {
          // ignore
        }
        return originalFetch.apply(this, args);
      };
    }
  } catch {
    // window.fetch is read-only or non-configurable in content script environment
  }

  try {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method: string, ...rest: any[]) {
      (this as any).__shikshaMethod = method;
      return originalXHROpen.apply(this, [method, ...rest] as any);
    };
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      try {
        if ((this as any).__shikshaMethod?.toUpperCase() === 'POST' && body) {
          captureFromRequestBody(body as BodyInit, onSubmit);
        }
      } catch {
        // ignore
      }
      return originalXHRSend.apply(this, [body]);
    };
  } catch {
    // ignore
  }
}

/** Attempt to read forms on the page when a network POST is detected. */
function scanAndCaptureForms(onSubmit: (form: HTMLFormElement | null) => void) {
  setTimeout(() => {
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      forms.forEach((form) => {
        const root = form.getRootNode();
        if (
          root instanceof ShadowRoot &&
          root.host instanceof Element &&
          isExtensionRoot(root.host)
        ) {
          return;
        }
        const values = readFormValues(form);
        const filledCount = Object.values(values).filter((v) => v.trim().length > 0).length;
        if (filledCount >= 2) {
          onSubmit(form);
        }
      });
    } else {
      const values = readFormValues(null);
      const filledCount = Object.values(values).filter((v) => v.trim().length > 0).length;
      if (filledCount >= 2) {
        onSubmit(null);
      }
    }
  }, 200);
}

/** Try to extract form data from a request body (FormData, URLSearchParams, or JSON). */
function captureFromRequestBody(
  _body: BodyInit,
  onSubmit: (form: HTMLFormElement | null) => void
) {
  scanAndCaptureForms(onSubmit);
}
