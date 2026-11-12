import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchFromLocal,
  openTab,
  removeFromLocal,
  saveToLocal,
  sendToBackground,
  sendToContent,
} from './browser';

describe('browser helpers', () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.local.get).mockClear();
    vi.mocked(chrome.storage.local.set).mockClear();
    vi.mocked(chrome.storage.local.remove).mockClear();
    vi.mocked(chrome.tabs.query).mockReset();
    vi.mocked(chrome.tabs.sendMessage).mockReset();
    vi.mocked(chrome.tabs.create).mockReset();
    vi.mocked(chrome.runtime.sendMessage).mockReset();
  });

  it('writes, reads, and removes extension storage', async () => {
    await saveToLocal({ theme: 'dark' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ theme: 'dark' });

    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({
      theme: 'dark',
    } as never);
    await expect(fetchFromLocal('theme')).resolves.toEqual({ theme: 'dark' });

    await removeFromLocal('theme');
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('theme');
  });

  it('sends a message to the active tab when data is present', () => {
    vi.mocked(chrome.tabs.query).mockImplementation(((
      _query: chrome.tabs.QueryInfo,
      callback: (result: chrome.tabs.Tab[]) => void
    ) => {
      callback?.([{ id: 42 }] as chrome.tabs.Tab[]);
      return undefined as never;
    }) as unknown as typeof chrome.tabs.query);

    sendToContent('FILL', { first_name: 'Ada' });

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      action: 'FILL',
      data: { first_name: 'Ada' },
    });
  });

  it('does not message a tab when data is missing', () => {
    vi.mocked(chrome.tabs.query).mockImplementation(((
      _query: chrome.tabs.QueryInfo,
      callback: (result: chrome.tabs.Tab[]) => void
    ) => {
      callback?.([{ id: 42 }] as chrome.tabs.Tab[]);
      return undefined as never;
    }) as unknown as typeof chrome.tabs.query);

    sendToContent('FILL', null);

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('forwards messages to the background script and opens tabs', () => {
    sendToBackground('SYNC', { ok: true });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'SYNC',
      data: { ok: true },
    });

    openTab({ url: 'https://example.com' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
    });
  });
});
