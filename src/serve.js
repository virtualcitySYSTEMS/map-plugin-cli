import fs from 'fs';
import { createServer } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import express from 'express';
import { logger } from '@vcsuite/cli-logger';
import path from 'path';
import { VuetifyResolver } from 'unplugin-vue-components/dist/resolvers.js';
import Components from 'unplugin-vue-components/dist/vite.js';
import { getContext } from './context.js';
import {
  addIndexRoute,
  addMapConfigRoute,
  checkReservedDirectories,
  createConfigJsonReloadPlugin,
  printVcmapUiVersion,
} from './hostingHelpers.js';

/**
 * @typedef {HostingOptions} ServeOptions
 * @property {string} [mapConfig] - an filename or URL to a map config
 */

/**
 * @param {ServeOptions} options
 * @returns {Promise<void>}
 */
export default async function serve(options) {
  if (!fs.existsSync(path.join(getContext(), 'node_modules', '@vcmap', 'ui'))) {
    logger.error('Can only serve in dev mode, if the map ui is a dependency of the current context');
    return;
  }
  await printVcmapUiVersion();
  checkReservedDirectories();
  const app = express();
  logger.info('Starting development server...');

  const server = await createServer({
    root: getContext(),
    publicDir: false,
    optimizeDeps: {
      exclude: [
        '@vcmap/ui',
        '@vcmap/core',
        'ol',
        '@vcsuite/ui-components',
        'proj4',
      ],
      include: [
        'fast-deep-equal',
        'rbush-knn',
        'pbf',
        '@vcmap/cesium',
      ],
    },
    plugins: [
      createVuePlugin(),
      createConfigJsonReloadPlugin(),
      Components({
        resolvers: [
          VuetifyResolver(),
        ],
        include: [],
        exclude: [],
      }),
    ],
    server: {
      middlewareMode: 'html',
      https: options.https,
    },
  });

  addMapConfigRoute(app, options.mapConfig, options.auth, options.config);
  addIndexRoute(app, server);

  app.use(server.middlewares);

  const port = options.port || 8008;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}
