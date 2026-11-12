import { browserStorage } from './browser';

export async function getItem<T>(key: string): Promise<T> {
  if (browserStorage?.local) {
    const value = await browserStorage.local.get([key]);
    return value && value[key] ? JSON.parse(value[key]) : null;
  }
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

export async function setItem<T>(key: string, value: T) {
  if (browserStorage?.local) {
    return await browserStorage.local.set({ [key]: JSON.stringify(value) });
  }
  return localStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  if (browserStorage?.local) {
    return await browserStorage.local.remove([key]);
  }
  return localStorage.removeItem(key);
}
