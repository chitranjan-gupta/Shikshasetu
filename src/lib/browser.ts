export let browserContext: any;
export let browserTabs: any;
export let browserRuntime: any;
export let browserContextMenus: any;
export let browserScripting: any;
export let browserStorage: any;
export let browserActions: any;
export let browserNotification: any;
export let browserCookies: any;
export let browserI18n: any;

export const isBrowser = typeof browser !== 'undefined';
export const isChrome = typeof chrome !== 'undefined';

if (isBrowser) {
  browserContext = browser;
  browserTabs = browser.tabs;
  browserRuntime = browser.runtime;
  browserContextMenus = browser.contextMenus;
  browserScripting = browser.scripting;
  browserStorage = browser.storage;
  browserActions = browser.browserAction;
  browserNotification = browser.notifications;
  browserCookies = browser.cookies;
  browserI18n = browser.i18n;
} else if (isChrome) {
  browserContext = chrome;
  browserTabs = chrome.tabs;
  browserRuntime = chrome.runtime;
  browserContextMenus = chrome.contextMenus;
  browserScripting = chrome.scripting;
  browserStorage = chrome.storage;
  browserActions = chrome.action;
  browserNotification = chrome.notifications;
  browserCookies = chrome.cookies;
  browserI18n = chrome.i18n;
}

export const saveToLocal = async (values: any) => {
  return await browserStorage.local.set(values);
};

export const fetchFromLocal = async (key: any) => {
  return await browserStorage.local.get(key);
};

export const removeFromLocal = async (key: any) => {
  return await browserStorage.local.remove(key);
};

export const sendToContent = (action: string, data: any) => {
  browserTabs.query({ active: true, currentWindow: true }, (tabs: any) => {
    const activeTab = tabs[0];
    if (activeTab?.id && data) {
      browserTabs.sendMessage(activeTab.id, {
        action: action,
        data: data,
      });
    }
  });
};

export const sendToBackground = (action: string, data: any) => {
  browserRuntime.sendMessage({ action: action, data: data });
};

export const openTab = (option: any) => {
  let url: string = option.url;
  // If the URL is relative (not http/https or an extension protocol URL),
  // convert it to an absolute extension URL using browserRuntime.getURL.
  // This ensures the URL resolves from the EXTENSION ROOT, not from the
  // current page — e.g. calling from popup/index.html would otherwise
  // resolve 'src/option/index.html' as 'src/popup/src/option/index.html'.
  if (url && !url.match(/^(https?|moz-extension|chrome-extension):\/\//)) {
    if (browserRuntime?.getURL) {
      url = browserRuntime.getURL(url.startsWith('/') ? url : `/${url}`);
    }
  }
  browserTabs.create({ ...option, url });
};
