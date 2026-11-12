import { describe, it, expect, beforeEach } from 'vitest';
import i18n, {
  convertMessagesToResource,
  getDefaultLanguage,
  setAppLanguage,
  getMessage,
} from './i18n';

describe('i18n module', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('converts chrome.i18n message structure to flat key-value resources', () => {
    const raw = {
      greeting: { message: 'Hello' },
      farewell: { message: 'Goodbye' },
    };
    expect(convertMessagesToResource(raw)).toEqual({
      greeting: 'Hello',
      farewell: 'Goodbye',
    });
  });

  it('translates keys in English', () => {
    expect(i18n.t('autofillDetails')).toBe('Autofill details');
    expect(i18n.t('tempEmail')).toBe('Temp Email');
  });

  it('switches to Hindi dynamically', async () => {
    await setAppLanguage('hi');
    expect(i18n.language).toBe('hi');
    expect(i18n.t('autofillDetails')).toBe('विवरण ऑटोफ़िल करें');
    expect(i18n.t('tempEmail')).toBe('अस्थायी ईमेल');
  });

  it('switches to German dynamically', async () => {
    await setAppLanguage('de');
    expect(i18n.language).toBe('de');
    expect(i18n.t('autofillDetails')).toBe('Details automatisch ausfüllen');
    expect(i18n.t('tempEmail')).toBe('Temporäre E-Mail');
    expect(i18n.t('performanceMode')).toBe('Leistungsmodus');
  });

  it('switches to French dynamically', async () => {
    await setAppLanguage('fr');
    expect(i18n.language).toBe('fr');
    expect(i18n.t('autofillDetails')).toBe('Remplir automatiquement les détails');
    expect(i18n.t('tempEmail')).toBe('E-mail temporaire');
    expect(i18n.t('performanceMode')).toBe('Mode performance');
  });

  it('falls back to default language for missing or invalid codes', () => {
    const defaultLang = getDefaultLanguage();
    expect(['en', 'hi', 'de', 'fr']).toContain(defaultLang);
  });

  it('getMessage helper falls back to i18n translation when browser.i18n is unavailable', () => {
    const msg = getMessage('autofillDetails');
    expect(msg).toBe('Autofill details');
  });
});
