import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getItem, removeItem, setItem } from './storage';

describe('storage', () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.local.get).mockClear();
    vi.mocked(chrome.storage.local.set).mockClear();
    vi.mocked(chrome.storage.local.remove).mockClear();
  });

  it('stores JSON in chrome.storage.local', async () => {
    await setItem('profile', { name: 'Ada' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      profile: JSON.stringify({ name: 'Ada' }),
    });
  });

  it('reads and parses JSON from chrome.storage.local', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({
      profile: JSON.stringify({ name: 'Ada' }),
    } as never);

    await expect(getItem('profile')).resolves.toEqual({ name: 'Ada' });
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['profile']);
  });

  it('returns null when a key is missing', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({} as never);

    await expect(getItem('missing')).resolves.toBeNull();
  });

  it('removes a key from chrome.storage.local', async () => {
    await removeItem('profile');

    expect(chrome.storage.local.remove).toHaveBeenCalledWith(['profile']);
  });
});
