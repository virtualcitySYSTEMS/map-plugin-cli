import { defineConfig } from 'vite';
import commonViteConfig from '@vcmap/ui/build/commonViteConfig.js';

const configTest = defineConfig({
  ...commonViteConfig,
  resolve: {
    alias: {
      '@vcmap/ui': '@vcmap/ui',
    },
  },
  test: {
    server: {
      deps: {
        inline: ['vuetify', '@vcmap/ui'],
      },
    },
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    pool: 'forks',
  },
});
export default configTest;
