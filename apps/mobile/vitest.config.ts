import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for the app's pure logic (selectors, planners). UI and native modules are verified on device.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'expo-localization': fileURLToPath(new URL('./test/stubs/expo-localization.ts', import.meta.url)),
    },
  },
  test: { include: ['test/**/*.test.ts'] },
});
