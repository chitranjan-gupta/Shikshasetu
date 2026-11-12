import { getDomains, addAccount, getToken, getMessages } from '@/api';
import {
  browserStorage,
  fetchFromLocal,
  removeFromLocal,
  saveToLocal,
} from '@/lib/browser';
import { generateRandomPassword, generateRandomString } from '@/lib/text';
import { accounts$, autofills$, domains$, mails$, s3$ } from '@/store';



export async function asyncTask() {
  try {
    const domains = (await getDomains()).data;
    if (domains && domains['hydra:member']) {
      const activeDomains = domains['hydra:member'];
      domains$.addDomains(activeDomains);
      if (activeDomains && activeDomains[0] && activeDomains[0].domain) {
        const activeDomain = activeDomains[0].domain;
        const fakeAccount = {
          address: `${generateRandomString(10, 'abcdefghijklmnopqrstuvwxyz1234567890')}@${activeDomain}`,
          password: generateRandomPassword(),
        };
        const account = (await addAccount(fakeAccount)).data;
        if (account) {
          const activeToken = (await getToken(fakeAccount)).data;
          if (activeToken) {
            accounts$.addAccount({
              ...account,
              password: fakeAccount.password,
              token: activeToken.token,
            });
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

export async function asyncTask1() {
  try {
    const accounts = accounts$.get().accounts;
    const account = accounts.length > 0 ? accounts[0] : null;
    if (account && account.token) {
      const messages = (await getMessages(account.token)).data;
      if (messages && messages['hydra:member']) {
        const activeMessages = messages['hydra:member'];
        if (activeMessages) {
          mails$.addMails(activeMessages);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

export async function initialSave() {
  const data = autofills$.get().autofills;
  const currentData = autofills$.get().currentAutofill;
  const accounts = accounts$.get().accounts;
  const account = accounts.length > 0 ? accounts[0] : null;
  if (account && account.address) {
    await browserStorage.local.set({ temp_mail: account.address });
  }
  if (data && data[currentData]) {
    await browserStorage.local.set({ currentAutofill: data[currentData] });
  }
}

async function saveDetails(url: string | null) {
  if (!url) {
    return;
  }
  const profiles = autofills$.autofills.get() ?? [];
  const currentAccount = autofills$.currentAutofill.get() ?? 0;
  // Pick active profile, or fall back to first profile if currentAccount is out of bounds
  const validIndex =
    currentAccount >= 0 && currentAccount < profiles.length
      ? currentAccount
      : profiles.length > 0
        ? 0
        : -1;
  const currentProfile = validIndex !== -1 ? profiles[validIndex] : null;

  const details = await fetchFromLocal([url, 'saved_sites']);
  const capturedValues = details?.[url] || details?.['saved_sites']?.[url];
  if (capturedValues) {
    if (currentProfile && (currentProfile as any).id) {
      // Update existing profile's sites without creating a new profile
      const existingSites = (currentProfile as any)?.sites ?? {};
      autofills$.editAutofill({
        ...currentProfile,
        id: (currentProfile as any).id,
        sites: { ...existingSites, [url]: capturedValues },
      } as any);
    } else if (profiles.length === 0) {
      // Only create the initial profile if no profiles exist at all
      autofills$.addAutofill({
        sites: { [url]: capturedValues },
      } as any);
    }
  }
  await removeFromLocal([url]);
}

export async function initialDetails() {
  if (!browserStorage) {
    return;
  }
  const details = await fetchFromLocal(['sitesurls', 'currentAutofill']);
  if (details && details['sitesurls']) {
    const data = details['sitesurls'];
    if (data) {
      for (const url of Object.keys(data)) {
        await saveDetails(url);
      }
    }
    await removeFromLocal(['sitesurls']);
  }
  const profiles = autofills$.get().autofills;
  const account = autofills$.get().currentAutofill;
  if (profiles.length > 0) {
    await saveToLocal({ currentAutofill: profiles[account] });
  }
}

export function currentAutofillData() {
  const current = autofills$.get().currentAutofill || 0;
  return autofills$.get().autofills.length > 0
    ? autofills$.get().autofills[current]
    : {};
}

export function currentDocumentFiles() {
  const files = s3$.get().buckets;
  const currentData = autofills$.get().currentAutofill;
  const currentFiles =
    files && files.length > 0 ? files[currentData] : new Map();
  return Array.from(currentFiles);
}
