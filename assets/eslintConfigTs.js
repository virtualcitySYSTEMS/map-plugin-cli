import { configs } from '@vcsuite/eslint-config';

export default [
  ...configs.vueTs,
  {
    ignores: ['node_modules/', 'dist/'],
  },
];
