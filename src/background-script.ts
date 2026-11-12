import {
  browserActions,
  browserContextMenus,
  browserCookies,
  browserI18n,
  browserRuntime,
  browserScripting,
  browserStorage,
  browserTabs,
  isBrowser,
  isChrome,
  saveToLocal,
} from '@/lib/browser';
import { fetchFieldMatcherRules } from '@/lib/field-matchers';
import { readPerformanceMode } from '@/lib/performance';
import { setItem } from '@/lib/storage';
import { getDomain } from '@/lib/text';

import type { TokenType } from '@/types';

function loadBackgroundData() {
  return import('./background-data');
}

void readPerformanceMode().then((enabled) => {
  if (!enabled) {
    void loadBackgroundData();
  }
});

// function selectFields(tabId: number): void {
//   console.log('Sending Message')
//   browserContext.tabs.sendMessage(tabId, { action: 'selectFields' })
// }

function findCareer(tabId: number): void {
  messagePage(tabId, { action: 'findCareer' });
}

function findCareerURL(tabId: number): void {
  messagePage(tabId, { action: 'findCareerURL' });
}

browserCookies.onChanged.addListener((changeInfo: any) => {
  //console.log(changeInfo.cookie);
  if (
    changeInfo.cookie.domain ===
      getDomain(import.meta.env.VITE_API_URL! ?? 'localhost') &&
    changeInfo.cookie.name === 'access_token'
  ) {
    setItem<TokenType>('token', {
      access_token: changeInfo.cookie.value,
      refresh_token: changeInfo.cookie.value,
    });
  }
});

async function updateFieldMatchers() {
  const url = import.meta.env.VITE_FIELD_MATCHERS_URL;
  if (!url || !browserStorage?.local) {
    return;
  }
  try {
    const rules = await fetchFieldMatcherRules(url);
    if (rules) {
      await saveToLocal({ fieldMatchers: rules });
    }
  } catch (error) {
    console.log(error);
  }
}

updateFieldMatchers();

browserRuntime.onStartup.addListener(() => {
  updateFieldMatchers();
});

browserRuntime.onInstalled.addListener(() => {
  updateFieldMatchers();
  const getMsg = (key: string, fallback: string) => browserI18n?.getMessage?.(key) || fallback;

  browserContextMenus.create({
    id: 'openSidePanel',
    title: getMsg('openAi', 'Open AI'),
    contexts: ['all'],
  });

  browserContextMenus.create({
    id: 'fillDetail',
    title: getMsg('contextAutofill', 'Fill Details'),
    contexts: ['selection', 'editable', 'page', 'all'],
  });

  browserContextMenus.create({
    id: 'submenu1',
    parentId: 'fillDetail',
    title: getMsg('all', 'All'),
    contexts: ['all'],
  });

  browserContextMenus.create({
    id: 'submenu2',
    parentId: 'fillDetail',
    title: getMsg('selectFields', 'Select Fields'),
    contexts: ['all'],
  });

  browserContextMenus.create({
    id: 'submenu3',
    parentId: 'fillDetail',
    title: getMsg('contextClipCareer', 'Find Career'),
    contexts: ['all'],
  });

  browserContextMenus.create({
    id: 'submenu3Option1',
    parentId: 'submenu3',
    title: getMsg('contextClipCareerUrl', 'Find Career URL'),
    contexts: ['all'],
  });

  browserContextMenus.create({
    id: 'submenu3Option2',
    parentId: 'submenu3',
    title: getMsg('listCareers', 'List Careers'),
    contexts: ['all'],
  });

  if (false) {
    void loadBackgroundData().then((data) =>
      data.asyncTask().catch((error) => console.log(error))
    );
  }
});

async function ensureMenuScript(tabId: number) {
  if (!tabId || tabId < 0 || (await readPerformanceMode())) {
    return;
  }
  try {
    if (isChrome && !isBrowser && browserScripting?.executeScript) {
      await browserScripting.executeScript({
        target: { tabId },
        files: ['content-menu.js'],
      });
      return;
    }
    if (browserTabs?.executeScript) {
      await browserTabs.executeScript(tabId, { file: 'content-menu.js' });
    }
  } catch (error) {
    console.log(error);
  }
}

async function ensureContentScript(tabId: number) {
  if (!tabId || tabId < 0) {
    return;
  }
  try {
    if (isChrome && !isBrowser && browserScripting?.executeScript) {
      await browserScripting.executeScript({
        target: { tabId },
        files: ['content-script.js'],
      });
      return;
    }
    if (browserTabs?.executeScript) {
      await browserTabs.executeScript(tabId, { file: 'content-script.js' });
    }
  } catch (error) {
    console.log(error);
  }
}

function messagePage(tabId: number, message: { action: string; data?: unknown }) {
  void ensureContentScript(tabId).then(() => {
    browserTabs.sendMessage(tabId, message);
  });
}

browserContextMenus.onClicked.addListener((info: any, tab: any) => {
  console.log('Context menu clicked');
  if (info.menuItemId === 'openSidePanel') {
    // This will open the panel in all the pages on the current window.
    if (chrome && chrome.sidePanel) {
      chrome.sidePanel.setOptions({
        tabId: tab?.id || -1,
        path: '/src/sidepanel/index.html',
        enabled: true,
      });
      chrome.sidePanel.open({ tabId: tab?.id || -1 });
    } else if (browser && browser.sidebarAction) {
      browser.sidebarAction.open();
    }
  }
  if (info.menuItemId === 'submenu1') {
    void loadBackgroundData().then((data) => {
      if (tab?.id) {
        messagePage(tab.id, {
          action: 'fill',
          data: data.currentAutofillData(),
        });
      }
    });
  }
  // if (info.menuItemId === "submenu2") {
  //   chrome.scripting.executeScript({
  //     target: { tabId: tab.id },
  //     func: addDetailToInput,
  //   });
  // }
  if (info.menuItemId === 'submenu3Option1') {
    console.log('Clicked submenu3Option1');
    if (tab?.id) {
      findCareerURL(tab.id);
    }
  }
  if (info.menuItemId === 'submenu3Option2') {
    console.log('Clicked submenu3Option2');
    if (tab?.id) {
      findCareer(tab.id);
    }
  }
});

browserRuntime.onMessage.addListener((message: any, sender: any) => {
  if (message.action === 'inject-content') {
    browserTabs.query({ active: true, currentWindow: true }, (tabs: { id?: number }[]) => {
      if (tabs[0]?.id) {
        void ensureContentScript(tabs[0].id);
      }
    });
  } else if (message.action === 'inject-menu') {
    const tabId = sender.tab?.id;
    if (tabId) {
      void ensureMenuScript(tabId);
    }
  } else if (message.action === 'fetchData') {
    void loadBackgroundData().then((data) => data.initialSave());
  } else if (message.action === 'fetchFiles') {
    void loadBackgroundData().then((data) => {
      const currentDocumentFiles = data.currentDocumentFiles();
      const tabId = sender.tab?.id;
      if (typeof tabId === 'number' && tabId >= 0) {
        browserTabs.sendMessage(tabId, {
          action: 'addFiles',
          data: currentDocumentFiles,
        }).catch(() => {});
      }
    });
  } else if (message.action === 'fetchMessages') {
    void loadBackgroundData().then((data) =>
      data.asyncTask1().catch((error) => console.log(error))
    );
  } else if (message.action === 'open_popup') {
    console.log('Opening popup');
    if (isChrome && !isBrowser) {
      browserActions.openPopup();
    }
  } else if (message.action === 'sender') {
    console.log(sender);
  } else if (message.action === 'initialDetails') {
    void loadBackgroundData().then((data) => data.initialDetails());
  }
});

browserStorage?.onChanged?.addListener(
  (changes: { performanceMode?: { newValue?: unknown } }, area: string) => {
    if (
      area === 'local' &&
      changes.performanceMode &&
      changes.performanceMode.newValue !== true
    ) {
      void loadBackgroundData();
    }
  }
);

// Establish a connection with the content script
browserRuntime.onConnect.addListener(function (port: any) {
  console.assert(port.name === 'content-script');
  port.onMessage.addListener(function (msg: any) {
    if (msg.action === 'hello') {
      port.postMessage({ message: 'Hello from background script!' });
    }
  });
});

// browserTabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   // Ensure that the tab is fully loaded
//   if (changeInfo.status === 'complete') {
//     const currentUrl = tab.url;
//     const data = autofills$.get().autofills;
//     const currentData = data[autofills$.get().currentAutofill];
//     if (currentData && currentData?.sites) {
//       const siteData = currentData?.sites[currentUrl];
//       if (siteData) {
//         console.log(tabId);
//         sendNotification(currentUrl);
//       }
//     }
//   }
// });

// Function to send a notification
// function sendNotification(url: string | undefined) {
// browserNotification.create({
//   type: 'basic',
//   iconUrl: '/assets/icons/icon128.png',
//   title: 'Site data is stored',
//   message: `The URL ${url} is in your autofills.`,
//   priority: 1,
// });
// }
