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
          ignore: ['^@vcmap/ui'],
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
