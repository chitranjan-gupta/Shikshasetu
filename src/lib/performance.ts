import { browserStorage } from './browser';

export const PERFORMANCE_MODE_KEY = 'performanceMode';

export async function readPerformanceMode() {
  const stored = await browserStorage?.local?.get([PERFORMANCE_MODE_KEY]);
  return stored?.[PERFORMANCE_MODE_KEY] === true;
}

export async function writePerformanceMode(enabled: boolean) {
  await browserStorage?.local?.set({ [PERFORMANCE_MODE_KEY]: enabled });
}
