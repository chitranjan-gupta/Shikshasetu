import { getAllInputFields, setAllInputFields } from './form-fill';
import { browserStorage } from './browser';
import {
  generateRandomEmail,
  generateRandomPassword,
  normalizeText,
} from './text';

import type { FormSchemaType } from '@/types';

function addButton(
  list: HTMLElement,
  label: string,
  onClick: () => void,
  nested = false
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = normalizeText(label);
  if (nested) {
    button.style.paddingLeft = '16px';
  }
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  list.appendChild(button);
}

function writeField(
  target: HTMLInputElement | HTMLTextAreaElement,
  value: unknown,
  parent?: string
) {
  if (parent === 'sites' && value && typeof value === 'object') {
    setAllInputFields(value as FormSchemaType);
    return;
  }
  if (target.type === 'file') {
    return;
  }
  target.value = String(value ?? '');
}

export function renderPlainSuggestions(
  mount: HTMLElement,
  entries: [string, unknown][],
  target: HTMLInputElement | HTMLTextAreaElement
) {
  mount.replaceChildren();
  const list = document.createElement('div');
  list.className = 'plain-menu';

  addButton(list, 'Autofill details', () => {
    getAllInputFields(Object.fromEntries(entries) as FormSchemaType);
    const currentUrl = window.location.href;
    const siteDataFromItems = (Object.fromEntries(entries) as any)?.sites?.[currentUrl];
    if (siteDataFromItems) {
      setAllInputFields(siteDataFromItems);
    } else {
      browserStorage?.local?.get?.(['saved_sites', currentUrl])?.then?.((res: any) => {
        const saved = res?.saved_sites?.[currentUrl] || res?.[currentUrl];
        if (saved && typeof saved === 'object') {
          setAllInputFields(saved);
        }
      });
    }
  });
  addButton(list, 'Random Email', () => {
    target.value = generateRandomEmail();
  });
  addButton(list, 'Random Password', () => {
    target.value = generateRandomPassword();
  });

  entries.forEach(([key, value]) => {
    if (
      key === 'custom_fields' &&
      Array.isArray(value) &&
      value.every((item) => item && typeof item === 'object')
    ) {
      value.forEach((item) => {
        const field = item as { attribute_name?: string; value?: unknown };
        if (!field.attribute_name) {
          return;
        }
        addButton(list, field.attribute_name, () => {
          writeField(target, field.value);
        });
      });
      return;
    }
    if (Array.isArray(value)) {
      addButton(list, key, () => undefined);
      value.forEach((item) => {
        addButton(
          list,
          String(item),
          () => writeField(target, item, key),
          true
        );
      });
      return;
    }
    if (value && typeof value === 'object') {
      addButton(list, key, () => undefined);
      Object.entries(value as Record<string, unknown>).forEach(
        ([childKey, childValue]) => {
          addButton(
            list,
            childKey,
            () => writeField(target, childValue, key),
            true
          );
        }
      );
      return;
    }
    addButton(list, `${key}: ${String(value ?? '')}`, () => {
      writeField(target, value);
    });
  });

  mount.appendChild(list);
}

export const plainMenuStyle = `
.plain-menu {
  position: fixed;
  right: 10px;
  bottom: 10px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow: auto;
  padding: 8px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.plain-menu button {
  padding: 4px 8px;
  text-align: left;
  background: #fff;
  border: 0;
  cursor: pointer;
}
`;
