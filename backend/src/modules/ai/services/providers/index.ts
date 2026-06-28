/**
 * Providers 模块
 */

export * from './types.ts';
export * from './ProviderRegistry.ts';
export * from './builtins.ts';
export * from './extended.ts';

import { providerRegistry } from './ProviderRegistry.ts';
import {
  httpProvider,
  httpMethods,
  notifyProvider,
  notifyMethods,
  scriptProvider,
  scriptMethods,
  databaseProvider,
  databaseMethods
} from './builtins.ts';
import {
  registerExtendedProviders
} from './extended.ts';

/**
 * 初始化所有内置 Provider
 */
export function initializeProviders(): void {
  providerRegistry.register(httpProvider, httpMethods);
  providerRegistry.register(notifyProvider, notifyMethods);
  providerRegistry.register(scriptProvider, scriptMethods);
  providerRegistry.register(databaseProvider, databaseMethods);
  registerExtendedProviders(providerRegistry);
}
