import { describe, expect, it } from 'vitest';

import { renderPlainSuggestions } from './plain-suggestions';

describe('renderPlainSuggestions', () => {
  it('lists profile values without mounting React', () => {
    const mount = document.createElement('div');
    const input = document.createElement('input');
    renderPlainSuggestions(
      mount,
      [
        ['email', 'ada@example.com'],
        ['sites', { 'https://school.test': { name: 'Ada' } }],
      ],
      input
    );

    const labels = [...mount.querySelectorAll('button')].map(
      (button) => button.textContent
    );
    expect(labels).toContain('Autofill details');
    expect(labels.some((label) => label?.includes('ada@example.com'))).toBe(
      true
    );
    expect(mount.querySelector('[data-reactroot]')).toBeNull();
  });
});