import { configs } from '@vcsuite/eslint-config';

export default [
  ...configs.node,
  {
    ignores: [
      'node_modules/',
      'assets/tests/',
      'assets/testsTypescript/',
      'assets/index.ts',
    ],
  },
  ...configs.vue.map((c) => ({
    files: ['assets/*.js'],
    ...c,
  })),
  {
    rules: {
      'import/no-unresolved': [
        2,
        {
          // vite and @vitejs/plugin-vue are ESM-only packages that only declare
          // an "exports" field (no "main"), which eslint-import-resolver-node
          // cannot resolve. See https://github.com/import-js/eslint-plugin-import/issues/1810
          ignore: ['^@vcmap/ui', '^vite$', '^@vitejs/plugin-vue$'],
        },
      ],
      'import/no-cycle': 'off',
      'n/no-unsupported-features/node-builtins': [
        'error',
        { ignores: ['fs.promises.cp', 'fs/promises.cp'] },
      ],
    },
  },
];
