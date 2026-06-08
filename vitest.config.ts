import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Unit-testable logic/data layer. The DOM-runtime modules (motion, cursor,
      // commandPalette) require a browser and are covered by the Playwright e2e suite.
      include: [
        'src/lib/gh.ts',
        'src/content/projects.ts',
        'src/config/site.ts',
        'src/config/about.ts',
      ],
      reporter: ['text', 'json-summary'],
    },
  },
});
