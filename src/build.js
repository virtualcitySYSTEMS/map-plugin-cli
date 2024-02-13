import path from 'path';
import { rm, mkdir } from 'node:fs/promises';
import fs from 'node:fs';
import vue2 from '@vitejs/plugin-vue2';
import vcsOl from '@vcmap/rollup-plugin-vcs-ol';
import { logger } from '@vcsuite/cli-logger';
import { getEntry, getPluginName } from './packageJsonHelpers.js';
import { getContext } from './context.js';
import { executeUiNpm, resolveMapUi } from './hostingHelpers.js';

/**
 * @typedef {Object} BuildOptions
 * @property {boolean} [development]
 * @property {boolean} [watch]
 * @property {string} [outputPath] path where the plugin should be written, relative to the dist folder, default ''
 * @property {boolean} [keepDistFolder] will not clear the dist folder if set to true
 */

export function getDefaultConfig() {
  return {
    publicDir: false,
    plugins: [vue2(), vcsOl()],
  };
}

/**
 * @param {string} pluginName
 * @returns {Object<string, string>}
 */
export async function getLibraryPaths(pluginName) {
  const { libraries } = await import('@vcmap/ui/build/buildHelpers.js');
  const pluginPath = path.posix.join('plugins', ...pluginName.split('/'));
  const libraryPaths = {};
  Object.entries(libraries).forEach(([library, assetName]) => {
    const assetPath = path.posix.join('assets', `${assetName}.js`);

    libraryPaths[library] = path.posix.relative(pluginPath, assetPath);
  });
  return libraryPaths;
}

/**
 * @param {BuildOptions} options
 * @returns {Promise<void>}
 */
export default async function buildModule(options) {
  const entry = getEntry();
  const pluginName = await getPluginName();
  const libraryPaths = await getLibraryPaths(pluginName);
  const distPath = path.join(getContext(), 'dist');
  if (!options.keepDistFolder) {
    await rm(distPath, { recursive: true, force: true });
    await mkdir(distPath);
  }
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
          manualChunks() {
            // ensure only one chunk will be created
            return 'index';
          },
        },
      },
      watch: options.watch
        ? {
            skipWrite: true,
          }
        : null,
    },
  };
  const { buildLibrary } = await import('@vcmap/ui/build/buildHelpers.js');
  await buildLibrary(config, options.outputPath ?? '', 'index', '', true);
}

/**
 * Builds the @vcmap/ui dependency and removes its own core dependency
 * @returns {Promise<void>}
 */
export async function buildMapUI() {
  logger.spin('building @vcmap/ui dependency');
  await executeUiNpm('--production=false --no-package-lock', 'install');
  // remove own core dependency to allow linking core via git+ssh
  const coreDepPath = resolveMapUi('node_modules', '@vcmap', 'core');
  if (fs.existsSync(coreDepPath)) {
    await rm(coreDepPath, { recursive: true, force: true });
  }
  await executeUiNpm('build');
  logger.stopSpinner();
  logger.info('@vcmap/ui built');
}
