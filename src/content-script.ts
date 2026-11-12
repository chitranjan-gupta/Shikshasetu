import { browserRuntime, browserStorage } from '@/lib/browser';
import { setFastDomQuery } from '@/lib/dom';
import { clearPromptDecisions, persistCapturedForm, watchPageForms } from '@/lib/form-capture';
import { getAllInputFields, setAllInputFields } from '@/lib/form-fill';
import { setFieldMatchers } from '@/lib/field-matchers';
import { PERFORMANCE_MODE_KEY } from '@/lib/performance';
import { plainMenuStyle, renderPlainSuggestions } from '@/lib/plain-suggestions';
import { normalizeText } from '@/lib/text';
import type { FormSchemaType } from '@/types';

declare global {
  interface Window {
    __shikshaSetu?: boolean;
    __shikshaSetuMenu?: {
      setRoot: typeof import('./content').setRoot;
    };
    autofill: FormSchemaType;
    document_files: Map<string, object>;
  }
}

let suggestionHost: HTMLDivElement | null = null;
let suggestionMount: HTMLDivElement | null = null;
let suggestionRoot: ReturnType<
  NonNullable<Window['__shikshaSetuMenu']>['setRoot']
> | null = null;
let cachedEntries: [string, unknown][] | null = null;
let performanceMode = false;
let performanceReady = false;
let pendingSuggestion: {
  target: HTMLInputElement | HTMLTextAreaElement;
  event: Event;
} | null = null;

const pageScriptLoaded = Boolean(window.__shikshaSetu);
window.__shikshaSetu = true;

window.autofill = window.autofill || {};
window.document_files = window.document_files || new Map();

const initial = () => {
  console.log('Fetching data initial');
  try {
    browserRuntime?.sendMessage?.({ action: 'fetchData' })?.catch?.(() => {});
    browserRuntime?.sendMessage?.({ action: 'fetchFiles' })?.catch?.(() => {});
  } catch {
    // ignore
  }
};

if (!pageScriptLoaded) {
  initial();
  window.addEventListener('shikshasetu-menu-ready', () => {
    if (performanceMode || !pendingSuggestion || !suggestionMount) {
      return;
    }
    showSuggestions(pendingSuggestion.target, pendingSuggestion.event);
  });
  loadPageData();
  browserStorage.onChanged.addListener(
    (
      changes: {
        fieldMatchers?: { newValue?: unknown };
        currentAutofill?: { newValue?: unknown };
        temp_mail?: { newValue?: unknown };
        performanceMode?: { newValue?: unknown };
        saved_sites?: { newValue?: Record<string, unknown> };
        blocked_sites?: { newValue?: Record<string, boolean> };
      },
      area: string
    ) => {
      if (area !== 'local') {
        return;
      }
      if (changes.fieldMatchers) {
        setFieldMatchers(changes.fieldMatchers.newValue);
      }
      if (changes.performanceMode) {
        applyPerformanceMode(changes.performanceMode.newValue === true);
      }
      if (changes.currentAutofill || changes.temp_mail) {
        loadPageData();
      }
      if (changes.saved_sites) {
        // If current site was removed from saved_sites, allow prompting again
        const currentUrl = window.location.href;
        const newSaved = changes.saved_sites.newValue || {};
        if (!newSaved[currentUrl]) {
          clearPromptDecisions(currentUrl);
        }
      }
      if (changes.blocked_sites) {
        // If current site was unblocked, allow prompting again
        const currentUrl = window.location.href;
        const newBlocked = changes.blocked_sites.newValue || {};
        if (!newBlocked[currentUrl]) {
          clearPromptDecisions(currentUrl);
        }
      }
    }
  );
  document.addEventListener('click', onPageClick);
  watchPageForms((form) => {
    persistCapturedForm(form, browserStorage.local, () => {
      try {
        browserRuntime?.sendMessage?.({ action: 'initialDetails' })?.catch?.(() => {});
      } catch {
        // ignore
      }
    }).catch((error) => console.log(error));
  });
  browserRuntime.onMessage.addListener(onRuntimeMessage);
}

function resetSuggestion() {
  suggestionRoot?.unmount();
  suggestionRoot = null;
  pendingSuggestion = null;
  suggestionHost?.remove();
  suggestionHost = null;
  suggestionMount = null;
}

function applyPerformanceMode(enabled: boolean) {
  const first = !performanceReady;
  const changed = enabled !== performanceMode;
  performanceReady = true;
  performanceMode = enabled;
  setFastDomQuery(enabled);
  if (!first && changed) {
    resetSuggestion();
  }
}

function loadPageData() {
  browserStorage.local
    .get(['fieldMatchers', 'currentAutofill', 'temp_mail', PERFORMANCE_MODE_KEY])
    .then(
      (result: {
        fieldMatchers?: unknown;
        currentAutofill?: Record<string, unknown>;
        temp_mail?: string;
        performanceMode?: boolean;
      }) => {
        if (result?.fieldMatchers) {
          setFieldMatchers(result.fieldMatchers);
        }
        cachedEntries = Object.entries({
          temp_mail: result?.temp_mail || 'temp@mail.com',
          ...(result?.currentAutofill || {}),
        });
        applyPerformanceMode(result?.performanceMode === true);
        if (pendingSuggestion && document.contains(pendingSuggestion.target)) {
          ensureSuggestion();
          showSuggestions(pendingSuggestion.target, pendingSuggestion.event);
        }
      }
    );
}

function ensureSuggestion() {
  if (suggestionHost && suggestionMount) {
    return;
  }
  suggestionHost = document.createElement('div');
  suggestionHost.classList.add('autocomplete-list-shiksha-setu');
  suggestionHost.style.position = 'fixed';
  suggestionHost.style.top = '0';
  suggestionHost.style.left = '0';
  suggestionHost.style.width = '0';
  suggestionHost.style.height = '0';
  suggestionHost.style.zIndex = '2147483647';
  suggestionHost.style.pointerEvents = 'none';

  const shadowList = suggestionHost.attachShadow({ mode: 'open' });
  suggestionMount = document.createElement('div');
  suggestionMount.style.pointerEvents = 'auto';
  shadowList.appendChild(suggestionMount);
  if (performanceMode) {
    const styleElement = document.createElement('style');
    styleElement.textContent = plainMenuStyle;
    shadowList.appendChild(styleElement);
  }
}

function showSuggestions(
  target: HTMLInputElement | HTMLTextAreaElement,
  event: Event
) {
  if (!cachedEntries || !suggestionMount || !suggestionHost) {
    return;
  }
  if (!document.body.contains(suggestionHost)) {
    document.body.appendChild(suggestionHost);
  }
  if (performanceMode) {
    pendingSuggestion = null;
    suggestionRoot?.unmount();
    suggestionRoot = null;
    renderPlainSuggestions(suggestionMount, cachedEntries, target);
    return;
  }
  const menu = window.__shikshaSetuMenu;
  if (!menu) {
    pendingSuggestion = { target, event };
    try {
      browserRuntime?.sendMessage?.({ action: 'inject-menu' })?.catch?.(() => {});
    } catch {
      // ignore
    }
    return;
  }
  pendingSuggestion = null;
  suggestionRoot = menu.setRoot(
    suggestionMount,
    event,
    cachedEntries,
    new Map(),
    suggestionRoot ?? undefined
  );
}

function onPageClick(event: Event) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    if (!performanceReady) {
      pendingSuggestion = { target, event };
      return;
    }
    ensureSuggestion();
    showSuggestions(target, event);
    return;
  }
  if (suggestionHost && !event.composedPath().includes(suggestionHost)) {
    suggestionHost.remove();
  }
}

function findCareer() {
  const jobListings = new Map(); // Using a Map for better duplicate checking and optimized performance.
  const jobSelectors = [
    '.job-listing',
    '.job-post',
    '.career-opportunity',
    '[class*="job"]',
    '[class*="career"]',
    'article',
    '.card',
    '.list-item',
    '.vacancy',
    '.position',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'title',
    'li',
    '.posting-headline',
    'meta',
  ];

  const jobElements = document.querySelectorAll(jobSelectors.join(', '));
  jobElements.forEach((element) => {
    // Extract the title (use the most likely headings or classes)
    const titleElement = element.querySelector(
      'title, h1, a, h2, h3, h4, .job-title, .position-title, .posting-headline, [class*="title"]'
    );
    const title =
      titleElement?.textContent?.trim() ||
      (element.tagName === 'TITLE' ? element.textContent?.trim() : '') ||
      ((element as HTMLMetaElement)?.name &&
      /title/i.test((element as HTMLMetaElement).name)
        ? (element as HTMLMetaElement).content
        : '') ||
      'No Title Provided';

    // Extract the company (use a fallback to 'No Company Provided' if not found)
    const company =
      element
        .querySelector(
          'title, .company-name, .organization, [class*="company"]'
        )
        ?.textContent?.trim() ?? 'No Company Provided';

    // Extract the location (fallback to 'No Location Provided')
    const location =
      element
        .querySelector('.location, .job-location, [class*="location"]')
        ?.textContent?.trim() || 'No Location Provided';

    // Extract the link (convert relative links to absolute)
    let link = element.querySelector('a')?.href || window.location.href;
    if (link && !link.startsWith('http')) {
      link = new URL(link, window.location.href).href; // Converts relative link to absolute
    }

    // Check if the link contains the words "job" or "career"
    if (link && (link.includes('job') || link.includes('career'))) {
      // Only add the job if it's not already in the Map (based on the title as the key)
      if (title && !jobListings.has(title)) {
        jobListings.set(title, { title, company, location, link });
      }
    }
  });

  // Convert the Map values to an array before returning (Map ensures no duplicates)
  return { jobListings: Array.from(jobListings.values()) };
}

function findCareerURL() {
  const careerKeywords = [
    'career',
    'careers',
    'jobs',
    'job',
    'opportunities',
    'work-with-us',
    'work with us',
    'join-us',
    'join us',
    'join',
    'about',
    'about us',
    'about-us',
  ];
  const links = Array.from(document.getElementsByTagName('a'));

  const careerLinks = links.filter((link) => {
    const href = link.href.toLowerCase();
    const text = (link.textContent || '').toLowerCase();
    return careerKeywords.some(
      (keyword) => href.includes(keyword) || text.includes(keyword)
    );
  });

  const careerURLs = careerLinks.map((link) => ({
    url: link.href,
    text: link.textContent?.trim() || '',
  }));

  return { careerURLs };
}

function onRuntimeMessage(request: any) {
  // console.log('Message received')
  if (request.action === 'findCareerURL') {
    const result = findCareerURL();
    console.log(result);
    addCareerUrl(result);
  } else if (request.action === 'findCareer') {
    const result = findCareer();
    console.log(result);
  } else if (request.action === 'addData') {
    window.autofill = request.data;
  } else if (request.action === 'addFiles') {
    window.document_files = request.data;
  } else if (request.action === 'fill') {
    console.log('Fill Message received');
    if (request.data) {
      getAllInputFields(request.data);
    }
  } else if (request.action === 'sitefill') {
    console.log('SiteFill Message received');
    if (request.data) {
      setAllInputFields(request.data);
    }
  }
}

interface CareerURL {
  url: string;
  text: string;
}

interface CareerURLResult {
  careerURLs: CareerURL[];
}

function addCareerUrl(result: CareerURLResult): void {
  const existingMenu = document.querySelector('.custom-bottom--top-right-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  const customDialog = document.createElement('div');
  customDialog.classList.add('custom-bottom--top-right-menu');
  customDialog.style.position = 'fixed';
  customDialog.style.top = '0';
  customDialog.style.right = '0';
  customDialog.style.maxHeight = '200px';
  customDialog.style.backgroundColor = 'white';
  customDialog.style.border = '1px solid #ccc';
  customDialog.style.padding = '15px';
  customDialog.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
  customDialog.style.borderRadius = '5px'; // Optional, for better styling
  customDialog.style.zIndex = '9999'; // High enough to appear above other page content
  customDialog.style.overflowY = 'scroll';
  customDialog.style.cursor = 'pointer';
  result.careerURLs.forEach((item) => {
    const tagNameItem = document.createElement('div');
    tagNameItem.textContent = `${normalizeText(item.text || '')}`;
    tagNameItem.style.padding = '5px 0 5px 10px';
    tagNameItem.style.cursor = 'pointer';
    tagNameItem.style.borderTop = '1px solid gray';
    tagNameItem.addEventListener('click', function () {
      window.open(item.url, '_blank');
    });
    customDialog.appendChild(tagNameItem);
  });
  document.body.appendChild(customDialog);
  document.addEventListener(
    'click',
    function () {
      cleanUpTopMenu();
    },
    { once: true }
  );

  // Function to remove the custom menu from the DOM
  function cleanUpTopMenu(): void {
    customDialog.remove();
  }
}

// function MenuItem(title: string) {
//   const div = document.createElement('div');
//   div.textContent = title;
//   div.style.marginTop = '10px';
//   div.style.padding = '5px 0';
//   div.style.borderTop = '1px solid gray';
//   div.style.cursor = 'pointer';
//   div.style.fontWeight = 'semibold';
//   return div
// }

// function MenuSubItem(title: string) {
//   const div = document.createElement('div');
//   div.textContent = title;
//   div.style.padding = '5px 0 0 10px';
//   div.style.borderTop = '1px solid gray';
//   div.style.cursor = 'pointer';
//   return div
// }

// document.addEventListener('contextmenu', function (event) {
//   if (window.autofills.length === 0) {
//     browserRuntime.sendMessage({ action: 'fetchData' });
//   }

//   // Prevent the default context menu from being hidden (no need to call preventDefault())
//   event.stopPropagation(); // Prevent event propagation to avoid conflicts with other listeners

//   // Check if there's already an existing custom menu in the bottom-right corner and remove it
//   const existingMenu = document.querySelector('.custom-bottom-right-menu');
//   if (existingMenu) {
//     existingMenu.remove();
//   }

//   // Create a custom menu div that will be positioned in the bottom-right corner
//   const customMenu = document.createElement('div');
//   customMenu.classList.add('custom-bottom-right-menu');
//   customMenu.style.position = 'fixed'; // Fixed positioning ensures it stays in the corner
//   customMenu.style.bottom = '10px'; // Adjust to position it a bit above the edge of the page
//   customMenu.style.right = '10px'; // Adjust to position it a bit to the left of the screen edge
//   customMenu.style.backgroundColor = 'white';
//   customMenu.style.border = '1px solid #ccc';
//   customMenu.style.padding = '15px';
//   customMenu.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
//   customMenu.style.cursor = 'pointer';
//   customMenu.style.zIndex = '9999'; // High enough to appear above other page content
//   customMenu.style.borderRadius = '5px'; // Optional, for better styling
//   customMenu.style.maxHeight = '200px'; // Optional, to limit the height of the menu
//   customMenu.style.overflowY = 'scroll';

//   // Add items to the custom menu
//   const menuTitle = document.createElement('div');
//   menuTitle.textContent = 'Autofill details';
//   menuTitle.style.fontWeight = 'bold';
//   menuTitle.style.paddingBottom = '10px';
//   menuTitle.style.backgroundColor = '#f9f9f9';
//   // Append menu title to the custom menu
//   customMenu.appendChild(menuTitle);

//   // browserStorage.local.get('submissionData', (result) => {
//   //   console.log(result.submissionData)
//   // })

//   const tempemail = MenuItem('Temp Email');
//   tempemail.addEventListener('click', function () {
//     if (event.target) {
//       (event.target as HTMLInputElement).value = generateRandomEmail();
//     }
//   });
//   customMenu.appendChild(tempemail);

//   const temppassword = MenuItem('Temp Password');
//   temppassword.addEventListener('click', function () {
//     if (event.target) {
//       (event.target as HTMLInputElement).value = generateRandomPassword();
//     }
//   });
//   customMenu.appendChild(temppassword);

//   Object.entries(
//     window.autofills.length > 0 ? window.autofills[0] : []
//   ).forEach(([key, value]) => {
//     if (Array.isArray(value)) {
//       const menuItem = MenuItem(normalizeText(key || ''));
//       customMenu.appendChild(menuItem);
//       value.forEach((item) => {
//         const menuSubItem = MenuSubItem(`> ${normalizeText(typeof item === 'object' ? item.documentType : item || '')}`)
//         menuSubItem.addEventListener('click', function () {
//           if (event.target) {
//             (event.target as HTMLInputElement).value =
//               typeof item === 'object'
//                 ? (item.file[0].name as unknown as string)
//                 : item;
//           }
//         });
//         customMenu.appendChild(menuSubItem);
//       });
//     } else if (typeof value === 'object') {
//       const menuItem = MenuItem(normalizeText(key || ''));
//       customMenu.appendChild(menuItem);
//       if (value) {
//         Object.entries(value).forEach(([k, v]) => {
//           const menuSubItem = MenuSubItem(`> ${normalizeText(k || '')}`);
//           menuSubItem.addEventListener('click', function () {
//             if (event.target) {
//               (event.target as HTMLInputElement).value = v as string;
//             }
//           });
//           customMenu.appendChild(menuSubItem);
//         });
//       }
//     } else {
//       const menuItem = MenuItem(normalizeText(key || ''));
//       menuItem.addEventListener('click', function () {
//         if (event.target) {
//           (event.target as HTMLInputElement).value = value as string;
//         }
//       });
//       customMenu.appendChild(menuItem);
//     }
//   });

//   // Append the custom menu to the body
//   document.body.appendChild(customMenu);

//   // Cleanup the custom menu when user clicks anywhere else
//   document.addEventListener(
//     'click',
//     function () {
//       cleanUpMenu();
//     },
//     { once: true }
//   );

//   // Function to remove the custom menu from the DOM
//   function cleanUpMenu() {
//     customMenu.remove();
//   }
// });

// document.addEventListener('keydown', function(event){
//   console.log(event)
//   const autoComplete = document.querySelector(".autocomplete-list-shiksha-setu");
//   if(!autoComplete){
//     createAutocompleteList();
//   }
// })

// function addDropDownMenu(){
//   // Create a custom menu div that will be positioned in the bottom-right corner
//   const customMenu = document.createElement('div');
//   customMenu.classList.add('custom-top-right-menu');

//   const shadowCustomMenu = customMenu.attachShadow({ mode: 'open' });

//   // Append the custom menu to the body
//   document.body.appendChild(customMenu);

//   const innerCustomMenu = document.createElement('div');
//   shadowCustomMenu.appendChild(innerCustomMenu);
//   const sheet = new CSSStyleSheet();
//   sheet.replaceSync(styles);
//   const extraSheet = new CSSStyleSheet();
//   // extraSheet.replaceSync("* { all: initial }");
//   shadowCustomMenu.adoptedStyleSheets = [extraSheet, sheet];

//   setRoot(
//     shadowCustomMenu,

//     Object.entries(window.autofills.length > 0 ? window.autofills[0] : [])
//   );

// }

// document.addEventListener('contextmenu', function (event) {
//   if (window.autofills.length === 0) {
//     browserRuntime.sendMessage({ action: 'fetchData' });
//   }

//   // Prevent the default context menu from being hidden (no need to call preventDefault())
//   event.stopPropagation(); // Prevent event propagation to avoid conflicts with other listeners

//   // Check if there's already an existing custom menu in the bottom-right corner and remove it
//   const existingMenu = document.querySelector('.custom-bottom-right-menu');
//   if (existingMenu) {
//     existingMenu.remove();
//   }

//   // Create a custom menu div that will be positioned in the bottom-right corner
//   const customMenu = document.createElement('div');
//   customMenu.classList.add('custom-bottom-right-menu');

//   const shadowCustomMenu = customMenu.attachShadow({ mode: 'open' });

//   // Append the custom menu to the body
//   document.body.appendChild(customMenu);

//   const innerCustomMenu = document.createElement('div');
//   shadowCustomMenu.appendChild(innerCustomMenu);

//   getRoot(
//     innerCustomMenu,
//     event,
//     Object.entries(window.autofills.length > 0 ? window.autofills[0] : [])
//   );

//   const sheet = new CSSStyleSheet();
//   sheet.replaceSync(styles);
//   shadowCustomMenu.adoptedStyleSheets = [sheet];

//   // Cleanup the custom menu when user clicks anywhere else
//   document.addEventListener(
//     'click',
//     function () {
//       cleanUpMenu();
//     },
//     { once: true }
//   );

//   // Function to remove the custom menu from the DOM
//   function cleanUpMenu() {
//     customMenu.remove();
//   }
// });
