import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enMessages from '../../_locales/en/messages.json';
import hiMessages from '../../_locales/hi/messages.json';
import deMessages from '../../_locales/de/messages.json';
import frMessages from '../../_locales/fr/messages.json';
import { browserI18n, browserStorage } from './browser';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'de', label: 'German', nativeName: 'Deutsch' },
  { code: 'fr', label: 'French', nativeName: 'Français' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const STORAGE_LANG_KEY = 'ui_language';

/** Flatten _locales/{lang}/messages.json { "key": { "message": "Text" } } to { "key": "Text" } */
export function convertMessagesToResource(
  rawMessages: Record<string, { message: string }>
): Record<string, string> {
  const resource: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawMessages)) {
    resource[k] = v.message;
  }
  return resource;
}

const resources = {
  en: { translation: convertMessagesToResource(enMessages as any) },
  hi: { translation: convertMessagesToResource(hiMessages as any) },
  de: { translation: convertMessagesToResource(deMessages as any) },
  fr: { translation: convertMessagesToResource(frMessages as any) },
};

/** Get the initial language from browser.i18n or navigator */
export function getDefaultLanguage(): SupportedLanguage {
  try {
    const uiLang = browserI18n?.getUILanguage?.() || navigator.language || 'en';
    const shortCode = uiLang.toLowerCase().split(/[-_]/)[0] as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.some((lang) => lang.code === shortCode)) {
      return shortCode;
    }
  } catch {
    // fallback
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDefaultLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false,
  },
});

const isValidLang = (lang: unknown): lang is SupportedLanguage =>
  typeof lang === 'string' && SUPPORTED_LANGUAGES.some((l) => l.code === lang);

// Load saved user language preference asynchronously if present
if (browserStorage?.local?.get) {
  try {
    browserStorage.local.get(STORAGE_LANG_KEY).then((res: Record<string, unknown>) => {
      const savedLang = res?.[STORAGE_LANG_KEY];
      if (isValidLang(savedLang)) {
        i18n.changeLanguage(savedLang);
      }
    }).catch(() => {});
  } catch {
    // ignore
  }

  // Listen for storage changes across tabs/windows
  if (browserStorage.onChanged?.addListener) {
    browserStorage.onChanged.addListener((changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && changes[STORAGE_LANG_KEY]?.newValue) {
        const newLang = changes[STORAGE_LANG_KEY].newValue;
        if (isValidLang(newLang)) {
          if (i18n.language !== newLang) {
            i18n.changeLanguage(newLang);
          }
        }
      }
    });
  }
}

/** Change the active language across the extension and persist the selection */
export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  if (browserStorage?.local?.set) {
    try {
      await browserStorage.local.set({ [STORAGE_LANG_KEY]: lang });
    } catch {
      // ignore
    }
  }
}

/** Helper to get translated string from chrome.i18n with fallback to i18next */
export function getMessage(key: string, substitutions?: string | string[]): string {
  try {
    const msg = browserI18n?.getMessage?.(key, substitutions);
    if (msg) return msg;
  } catch {
    // ignore
  }
  return i18n.t(key);
}

export default i18n;
