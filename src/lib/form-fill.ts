import type { FormSchemaType } from '@/types';

import { queryDeepAll } from './dom';
import { fillProfileField, type FillField } from './field-matchers';
import { sanitize } from './text';
import { findBestSemanticMatch, textSimilarity } from './similarity';

export function setAllInputFields(data: {
  sites?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}) {
  const site = data.sites ? data.sites[window.location.href] : data;
  if (!site || typeof site !== 'object') {
    return;
  }
  const siteEntries = Object.entries(site as Record<string, unknown>);
  const siteKeys = siteEntries.map(([k]) => k);

  function findMatchingValue(keyCandidates: string[]): unknown {
    for (const key of keyCandidates) {
      if (typeof (site as any)[key] !== 'undefined') {
        return (site as any)[key];
      }
    }
    // Check fuzzy match against label/title
    for (const key of keyCandidates) {
      const sanitizedKey = sanitize(key);
      const match = siteEntries.find(([k]) => {
        const sk = sanitize(k);
        return sk === sanitizedKey || sk.includes(sanitizedKey) || sanitizedKey.includes(sk);
      });
      if (match) {
        return match[1];
      }
    }

    // Semantic matching for career questions
    for (const key of keyCandidates) {
      if (key.length > 5) {
        const best = findBestSemanticMatch(key, siteKeys, 0.52);
        if (best) {
          return (site as any)[best.match];
        }
      }
    }

    return undefined;
  }

  // 1. Fill standard inputs, selects, textareas
  queryDeepAll('input, select, textarea').forEach((field, index) => {
    const input = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    // Collect candidate identifiers
    const candidates = [
      input.name,
      input.id,
      input.getAttribute('data-qa') || '',
      input.getAttribute('data-automation-id') || '',
      input.getAttribute('data-testid') || '',
      input.getAttribute('aria-label') || '',
      input.getAttribute('placeholder') || '',
      `field_${index}`,
    ].filter(Boolean);

    // Linked label
    if (input.id) {
      try {
        const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (lbl?.textContent) candidates.push(lbl.textContent.trim());
      } catch {
        // ignore invalid selector
      }
    }
    const parentLbl = input.closest('label');
    if (parentLbl?.textContent) candidates.push(parentLbl.textContent.trim());

    // Also look for enclosing fieldset / question legend / section heading
    const group = input.closest(
      'fieldset, [role="group"], [role="radiogroup"], .field, .form-group, .question, [data-automation-id*="question"], [class*="question"], [class*="form-item"]'
    );
    if (group) {
      const legend = group.querySelector(
        'legend, label, .label, [class*="label"], [class*="title"], [class*="question"], h3, h4, [data-automation-id*="label"]'
      );
      if (legend?.textContent) candidates.push(legend.textContent.trim());
    }

    // Previous sibling label
    let prev = input.previousElementSibling;
    while (prev) {
      const prevText = prev.textContent?.trim();
      if (prevText && prevText.length > 0 && prevText.length < 200) {
        candidates.push(prevText);
        break;
      }
      prev = prev.previousElementSibling;
    }

    const value = findMatchingValue(candidates);
    if (typeof value === 'undefined') {
      return;
    }

    if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
      const strVal = sanitize(String(value));
      const inputVal = sanitize(String(input.value));
      const lblText = sanitize(input.closest('label')?.textContent || '');

      if (
        strVal === 'true' ||
        strVal === inputVal ||
        (lblText.length > 0 && (strVal.includes(lblText) || lblText.includes(strVal)))
      ) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    if (input instanceof HTMLInputElement && input.type === 'file') {
      return;
    }

    if (input instanceof HTMLSelectElement) {
      const strVal = sanitize(String(value));
      for (let i = 0; i < input.options.length; i++) {
        const opt = input.options[i];
        if (sanitize(opt.value) === strVal || sanitize(opt.text) === strVal) {
          input.selectedIndex = i;
          input.value = opt.value;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
    }

    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // 2. Handle Custom UI components: ARIA radios/checkboxes, button-based options, clickable label/span/div questions
  queryDeepAll(
    '[role="radio"], [role="checkbox"], [role="option"], [role="button"], label, div.option, div.choice, span.option'
  ).forEach((el) => {
    // Only elements inside a question/field group
    const group = el.closest(
      'fieldset, [role="group"], [role="radiogroup"], .field, .form-group, .question, [data-automation-id*="question"], [class*="question"], [class*="form-item"]'
    );
    if (!group) return;

    const legend = group.querySelector(
      'legend, label, .label, [class*="label"], [class*="title"], [class*="question"], h3, h4, [data-automation-id*="label"]'
    );
    const questionText = legend?.textContent?.trim() || '';
    if (!questionText) return;

    const value = findMatchingValue([questionText]);
    if (typeof value === 'undefined') return;

    const strVal = sanitize(String(value));
    const elText = sanitize(el.textContent || '');

    // If this option's text matches the saved answer (exact, substring, or semantic)
    const isDirectMatch = elText.length > 0 && (strVal === elText || (elText.length > 1 && (strVal.includes(elText) || elText.includes(strVal))));
    const isSemanticOptionMatch = elText.length > 2 && textSimilarity(strVal, elText) > 0.65;

    if (isDirectMatch || isSemanticOptionMatch) {
      if (el.getAttribute('role') === 'radio' || el.getAttribute('role') === 'checkbox') {
        el.setAttribute('aria-checked', 'true');
      }
      if (el.getAttribute('role') === 'option') {
        el.setAttribute('aria-selected', 'true');
      }
      (el as HTMLElement).click();
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

export function getAllInputFields(storedData: FormSchemaType) {
  if (!storedData) {
    return;
  }
  queryDeepAll('input, textarea, select').forEach((field) => {
    fillProfileField(field as FillField, storedData);
  });
}
