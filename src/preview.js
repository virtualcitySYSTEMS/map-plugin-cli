import path from 'path';
import fs from 'fs';
import { createServer } from 'vite';
import express from 'express';
import { logger } from '@vcsuite/cli-logger';
import {
  addConfigRoute,
  addIndexRoute,
  addMapConfigRoute,
  addPluginAssets,
  checkReservedDirectories,
  createConfigJsonReloadPlugin,
  printVcmapUiVersion, resolveMapUi,
} from './hostingHelpers.js';
import build, { getDefaultConfig, getLibraryPaths } from './build.js';
import { getContext } from './context.js';
import setupMapUi from './setupMapUi.js';

/**
 * @typedef {HostingOptions} PreviewOptions
 * @property {string} [vcm]
 */

/**
 * @param {Object<string, string>} alias
 * @param {Object<string, string>} libraryPaths
 */
function setAliases(alias, libraryPaths) {
  Object.values(libraryPaths).forEach((entry) => {
    alias[entry] = entry.replace(/(..\/)*assets/, '/assets');
  });
}

/**
 * @param {string} [hostedVcm]
 * @param {boolean} [https]
 * @returns {Promise<import("vite").InlineConfig>}
 */
async function getServerOptions(hostedVcm, https) {
  let proxy;
  const normalLibraries = await getLibraryPaths('normal');
  const scopedLibraries = await getLibraryPaths('@scoped/plugin');
  const alias = {};
  setAliases(alias, normalLibraries);
  setAliases(alias, scopedLibraries);

  if (hostedVcm) {
    proxy = {
      '^/style.css': hostedVcm,
      '^/assets': hostedVcm,
      '^/plugins': hostedVcm,
    };
  }

  return {
    publicDir: false,
    plugins: [
      createConfigJsonReloadPlugin(),
    ],
    resolve: {
      alias,
    },
    server: {
      middlewareMode: 'html',
      proxy,
      https,
    },
  };
}

/**
 * @param {PreviewOptions} options
 * @returns {Promise<void>}
 */
export default async function preview(options) {
  if (!options.vcm) {
    await printVcmapUiVersion();
  }
  checkReservedDirectories();
  await build({ development: false, watch: true });
  const app = express();
  logger.info('Starting preview server...');
  const server = await createServer(await getServerOptions(options.vcm, options.https));

  addMapConfigRoute(app, options.vcm ? `${options.vcm}/map.config.json` : null, options.auth, options.config, true);
  addIndexRoute(app, server, true, options.vcm, options.auth);
  addPluginAssets(app, 'dist');

  if (!options.vcm) {
    logger.spin('compiling preview');
    if (!fs.existsSync(resolveMapUi('plugins', 'node_modules'))) {
      logger.info('Could not detect node_modules in map ui plugins. Assuming map UI not setup');
      await setupMapUi();
    }
    const { buildPluginsForPreview } = await import('@vcmap/ui/build/buildHelpers.js');
    await buildPluginsForPreview(getDefaultConfig(), true);
    logger.stopSpinner();
    logger.info('@vcmap/ui built for preview');
    app.use('/assets', express.static(path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'assets')));
    app.use('/plugins', express.static(path.join(getContext(), 'dist', 'plugins')));
    await addConfigRoute(app, options.auth, options.config, true);
  }

  app.use(server.middlewares);

  const port = options.port || 5005;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}
