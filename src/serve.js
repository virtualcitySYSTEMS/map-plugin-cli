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
  addConfigRoute,
  addIndexRoute,
  addMapConfigRoute,
  checkReservedDirectories,
  createConfigJsonReloadPlugin,
  printVcmapUiVersion,
  resolveMapUi,
} from './hostingHelpers.js';
import { getPluginName } from './packageJsonHelpers.js';

/**
 * @typedef {HostingOptions} ServeOptions
 * @property {string} [mapConfig] - an filename or URL to a map config
 */

async function getProxy(protocol, port) {
  const { default: getPluginProxies } = await import('@vcmap/ui/build/getPluginProxies.js');
  const { determineHostIpFromInterfaces } = await import('@vcmap/ui/build/determineHost.js');
  const { getInlinePlugins } = await import('@vcmap/ui/build/buildHelpers.js');

  const target = `${protocol}://${determineHostIpFromInterfaces()}:${port}`;
  const proxy = await getPluginProxies(target);
  const mapUiPlugins = resolveMapUi('plugins');
  const inlinePlugins = await getInlinePlugins();
  inlinePlugins.forEach((inlinePlugin) => {
    proxy[`^/plugins/${inlinePlugin}/.*`] = {
      target,
      rewrite: (route) => {
        const rest = route.replace(new RegExp(`^/plugins/${inlinePlugin}/`), '');
        const file = rest || 'index.js';
        return path.posix.join(path.relative(getContext(), mapUiPlugins), inlinePlugin, file);
      },
    };
  });

  const pluginRoutes = Object.keys(proxy);
  const name = await getPluginName();
  const hasThisPlugin = pluginRoutes.find(p => p.startsWith(`^/plugins/${name}`));

  if (hasThisPlugin) {
    delete proxy[hasThisPlugin];
  }
  return proxy;
}

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
  const port = options.port || 8008;

  logger.info('Starting development server...');
  const proxy = await getProxy(options.https ? 'https' : 'http', port);

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
      proxy,
    },
  });

  addMapConfigRoute(app, options.mapConfig, options.auth, options.config);
  addIndexRoute(app, server);
  await addConfigRoute(app, options.auth, options.config);

  app.use(server.middlewares);

  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}
