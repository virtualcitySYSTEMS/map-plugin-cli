import path from 'path';
import fs from 'fs/promises';
import { buildLibrary, libraries } from '@vcmap/ui/build/buildHelpers.js';
import { createVuePlugin } from 'vite-plugin-vue2';
import vcsOl from '@vcmap/rollup-plugin-vcs-ol';
import { logger } from '@vcsuite/cli-logger';
import { VuetifyResolver } from 'unplugin-vue-components/dist/resolvers.js';
import Components from 'unplugin-vue-components/dist/vite.js';
import { getPluginEntry, getPluginName } from './packageJsonHelpers.js';
import { getContext } from './context.js';

/**
 * @typedef {Object} BuildOptions
 * @property {boolean} [development]
 * @property {boolean} [watch]
 */

export function getDefaultConfig() {
  return {
    publicDir: false,
    plugins: [
      createVuePlugin(),
      Components({
        resolvers: [
          VuetifyResolver(),
        ],
        dirs: ['./src'],
        include: [],
        exclude: [],
      }),
      vcsOl(),
    ],
  };
}

/**
 * @param {string} pluginName
 * @returns {Object<string, string>}
 */
export function getLibraryPaths(pluginName) {
  const pluginPath = path.join('plugins', ...pluginName.split('/'));
  const libraryPaths = {};
  Object.entries(libraries).forEach(([library, { lib: assetName }]) => {
    const assetPath = path.join('assets', `${assetName}.js`);

    libraryPaths[library] = path.relative(pluginPath, assetPath);
  });
  return libraryPaths;
}

/**
 * @param {BuildOptions} options
 * @returns {Promise<void>}
 */
export default async function buildModule(options) {
  const entry = await getPluginEntry();
  if (path.relative('src', entry).startsWith('.')) {
    logger.warning(`detected irregular entry ${entry}`);
    logger.warning('vuetify component resolution expects source files to be within "src"');
  }

  const pluginName = await getPluginName();
  const libraryPaths = getLibraryPaths(pluginName);
  const distPah = path.join(getContext(), 'dist');
  await fs.rm(distPah, { recursive: true, force: true });
  await fs.mkdir(distPah);
  const external = Object.keys(libraryPaths);
  const config = {
    ...getDefaultConfig(),
    esbuild: {
      minify: !options.development,
    },
    build: {
      write: false,
      emptyOutDir: false,
      lib: {
        entry,
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external,
        output: {
          paths: libraryPaths,
        },
      },
      watch: options.watch ? {
        skipWrite: true,
      } : null,
    },
  };
  await buildLibrary(config, '', 'index', '', true);
}
