import { describe, expect, it, vi } from 'vitest';

import { readPerformanceMode, writePerformanceMode } from './performance';

describe('performance mode', () => {
  it('stays off until the stored value is true', async () => {
    await expect(readPerformanceMode()).resolves.toBe(false);
    await writePerformanceMode(false);
    await expect(readPerformanceMode()).resolves.toBe(false);

    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({
      performanceMode: true,
    } as never);
    await expect(readPerformanceMode()).resolves.toBe(true);
  });
});
