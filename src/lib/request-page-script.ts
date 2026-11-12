import { browserRuntime } from './browser';

export function requestPageScript() {
  browserRuntime?.sendMessage({ action: 'inject-content' });
}
