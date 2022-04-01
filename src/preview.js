import path from 'path';
import { createServer } from 'vite';
import express from 'express';
import { logger } from '@vcsuite/cli-logger';
import {
  addIndexRoute,
  addMapConfigRoute,
  checkReservedDirectories,
  createConfigJsonReloadPlugin,
  printVcmapUiVersion,
} from './hostingHelpers.js';
import build, { getLibraryPaths } from './build.js';
import { getContext } from './context.js';

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
  const normalLibraries = getLibraryPaths('normal');
  const scopedLibraries = getLibraryPaths('@scoped/plugin');
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

  if (!options.vcm) {
    app.use('/assets', express.static(path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'assets')));
    app.use('/plugins', express.static(path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'plugins')));
  }

  app.use(server.middlewares);

  const port = options.port || 5005;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}
