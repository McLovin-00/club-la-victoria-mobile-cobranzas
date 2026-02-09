import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/pages/__tests__/ClientePortalPage.interactions.vitest.tsx'],
    setupFiles: ['src/test-utils/vitest.setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@workspace/types': path.resolve(__dirname, '../../packages/types/src'),
      '@workspace/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
});
