import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const schemaForgeCoreEntry = '@xubylele/schema-forge-core';

export default defineConfig({
  resolve: {
    alias: {
      '@xubylele/schema-forge-core': schemaForgeCoreEntry,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
