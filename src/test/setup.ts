import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

const memoryStore = new Map<string, string>();

const storageLocal = {
  get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
    const result: Record<string, string> = {};
    const list = Array.isArray(keys)
      ? keys
      : typeof keys === 'string'
        ? [keys]
        : keys
          ? Object.keys(keys)
          : [...memoryStore.keys()];

    for (const key of list) {
      const value = memoryStore.get(key);
      if (typeof value !== 'undefined') {
        result[key] = value;
      }
    }

    return result;
  }),
  set: vi.fn(async (items: Record<string, unknown>, callback?: () => void) => {
    Object.entries(items).forEach(([key, value]) => {
      memoryStore.set(
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    });
    callback?.();
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => memoryStore.delete(key));
  }),
};

vi.stubGlobal('chrome', {
  storage: { local: storageLocal },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
  },
  runtime: {
    sendMessage: vi.fn(),
  },
  contextMenus: {},
  scripting: {},
  action: {},
  notifications: {},
  cookies: {},
});

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

afterEach(() => {
  memoryStore.clear();
  document.body.innerHTML = '';
  localStorage.clear();
});
