import { afterEach, describe, expect, it } from 'vitest';

import { queryDeepAll, setFastDomQuery } from './dom';

afterEach(() => {
  setFastDomQuery(false);
  document.body.innerHTML = '';
});

function field(parent: ParentNode) {
  const input = document.createElement('input');
  input.name = 'email';
  parent.appendChild(input);
  return input;
}

describe('queryDeepAll', () => {
  it('uses the direct selector when performance mode is on', () => {
    setFastDomQuery(true);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const email = field(shadow);
    const menu = document.createElement('div');
    menu.className = 'autocomplete-list-shiksha-setu';
    document.body.appendChild(menu);
    const menuShadow = menu.attachShadow({ mode: 'open' });
    const hidden = field(menuShadow);

    const found = queryDeepAll('input');

    expect(found).toContain(email);
    expect(found).not.toContain(hidden);
  });
});
