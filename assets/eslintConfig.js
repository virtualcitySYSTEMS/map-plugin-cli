import { configs } from '@vcsuite/eslint-config';

export default [
  ...configs.vue,
  {
    ignores: ['node_modules/', 'dist/'],
  },
];
