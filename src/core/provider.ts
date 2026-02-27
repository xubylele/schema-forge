import type { Provider } from '../domain';

const DEFAULT_PROVIDER: Provider = 'postgres';

export function resolveProvider(provider?: string): { provider: Provider; usedDefault: boolean } {
  if (!provider) {
    return { provider: DEFAULT_PROVIDER, usedDefault: true };
  }

  return { provider: provider as Provider, usedDefault: false };
}
