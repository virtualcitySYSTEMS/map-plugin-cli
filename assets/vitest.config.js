// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vite';
import commonViteConfig from '@vcmap/ui/build/commonViteConfig.js';

const configTest = defineConfig({
  ...commonViteConfig,
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm.js',
      tinyqueue: 'tinyqueue/tinyqueue.js',
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        additionalData: "\n@import '@vcmap/ui/src/styles/variables.scss'\n",
      },
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
    isolate: false,
    threads: false,
  },
});
export default configTest;
