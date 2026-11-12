import { setRoot } from './content';
import { isBrowser, isChrome } from '@/lib/browser';
import styles from '@/styles/index.css?inline';

export function ensureMenuStyles(hostElement?: Element | null) {
  const host = hostElement || document.querySelector('.autocomplete-list-shiksha-setu');
  const shadow = host?.shadowRoot;
  if (!shadow || shadow.querySelector('[data-shiksha-styles]')) {
    return;
  }
  if (isChrome && !isBrowser && 'adoptedStyleSheets' in shadow) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(styles);
    shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
  }
  const marker = document.createElement('style');
  marker.dataset.shikshaStyles = 'true';
  if (!(isChrome && !isBrowser && 'adoptedStyleSheets' in shadow)) {
    marker.textContent = styles;
  }
  shadow.appendChild(marker);
}

ensureMenuStyles();
window.__shikshaSetuMenu = { setRoot };
window.dispatchEvent(new Event('shikshasetu-menu-ready'));
