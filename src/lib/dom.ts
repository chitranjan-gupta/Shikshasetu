const EXTENSION_ROOT_CLASS = 'autocomplete-list-shiksha-setu';

let fastDomQuery = false;

export function setFastDomQuery(enabled: boolean) {
  fastDomQuery = enabled;
}

const extensionRootSelector = `.${EXTENSION_ROOT_CLASS}`;

function visit(node: ParentNode, selector: string, matches: Element[]) {
  if (fastDomQuery) {
    node.querySelectorAll(selector).forEach((element) => {
      if (!element.closest(extensionRootSelector)) {
        matches.push(element);
      }
    });
    node.querySelectorAll('*').forEach((element) => {
      if (element.classList.contains(EXTENSION_ROOT_CLASS) || !element.shadowRoot) {
        return;
      }
      visit(element.shadowRoot, selector, matches);
    });
    return;
  }

  node.querySelectorAll('*').forEach((element) => {
    if (element.classList.contains(EXTENSION_ROOT_CLASS)) {
      return;
    }
    if (element.matches(selector)) {
      matches.push(element);
    }
    if (element.shadowRoot) {
      visit(element.shadowRoot, selector, matches);
    }
  });
}

/** Collect matching elements from the light DOM and every open shadow root. */
export function queryDeepAll(
  selector: string,
  root: ParentNode = document
): Element[] {
  const matches: Element[] = [];
  visit(root, selector, matches);
  return matches;
}

export function isExtensionRoot(element: Element) {
  return element.classList.contains(EXTENSION_ROOT_CLASS);
}
