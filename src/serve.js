import fs from 'fs';
import { createServer } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import express from 'express';
import { logger } from '@vcsuite/cli-logger';
import path from 'path';
import { getContext } from './context.js';
import {
  addConfigRoute,
  addIndexRoute,
  addAppConfigRoute,
  addPluginAssets,
  checkReservedDirectories,
  createConfigJsonReloadPlugin,
  printVcmapUiVersion,
  resolveMapUi,
} from './hostingHelpers.js';
import { getPackageJson, getPluginName } from './packageJsonHelpers.js';
import { getVcmConfigJs } from './pluginCliHelper.js';
import { buildMapUI } from './build.js';

/**
 * @typedef {HostingOptions} ServeOptions
 * @property {string|Object} [appConfig] - an optional configObject resp. fileName or URL to an app config
 */

async function getProxy(protocol, port) {
  const { default: getPluginProxies } = await import(
    '@vcmap/ui/build/getPluginProxies.js'
  );
  const { determineHostIpFromInterfaces } = await import(
    '@vcmap/ui/build/determineHost.js'
  );
  const { getInlinePlugins } = await import('@vcmap/ui/build/buildHelpers.js');

  const target = `${protocol}://${determineHostIpFromInterfaces()}:${port}`;
  const proxy = await getPluginProxies(target);
  const mapUiPlugins = resolveMapUi('plugins');
  const inlinePlugins = await getInlinePlugins();
  inlinePlugins.forEach((inlinePlugin) => {
    proxy[`^/plugins/${inlinePlugin}/.*`] = {
      target,
      rewrite: (route) => {
        const rest = route.replace(
          new RegExp(`^/plugins/${inlinePlugin}/`),
          '',
        );
        const file = rest || 'index.js';
        return path.posix.join(
          path.relative(getContext(), mapUiPlugins),
          inlinePlugin,
          file,
        );
      },
    };
  });

  const pluginRoutes = Object.keys(proxy);
  const name = await getPluginName();
  const hasThisPlugin = pluginRoutes.find((p) =>
    p.startsWith(`^/plugins/${name}`),
  );

  if (hasThisPlugin) {
    delete proxy[hasThisPlugin];
  }

  // exampleData is not part of the @vcmap/ui package and must be proxied therefore
  proxy['^/exampleData'] = {
    target: 'https://raw.githubusercontent.com/virtualcitySYSTEMS/map-ui/main',
    changeOrigin: true,
    secure: false,
  };
  // Cesium engine assets are not part of Build
  proxy['/node_modules/@vcmap-cesium/engine/Build/Assets'] = {
    target,
    rewrite: (p) => p.replace(/Build/, 'Source'),
  };
  return proxy;
}

/**
 * @param {ServeOptions} options
 * @returns {Promise<void>}
 */
export default async function serve(options) {
  if (!fs.existsSync(path.join(getContext(), 'node_modules', '@vcmap', 'ui'))) {
    logger.error(
      'Can only serve in dev mode, if the map ui is a dependency of the current context',
    );
    return;
  }
  const vcmConfigJs = await getVcmConfigJs();
  const mergedOptions = { ...vcmConfigJs, ...options };
  await printVcmapUiVersion();
  // In case @vcmap/ui is linked via git+ssh, dist folder is not available and must be built first
  if (!fs.existsSync(resolveMapUi('dist'))) {
    await buildMapUI();
  }
  checkReservedDirectories();
  const app = express();
  const port = mergedOptions.port || 8008;

  logger.info('Starting development server...');
  const proxy = await getProxy(mergedOptions.https ? 'https' : 'http', port);
  const { peerDependencies } = await getPackageJson();

  const server = await createServer({
    root: getContext(),
    publicDir: false,
    resolve: {
      alias: {
        '@cesium/engine': '@vcmap-cesium/engine',
      },
      dedupe: Object.keys(peerDependencies),
    },
    optimizeDeps: {
      exclude: ['@vcmap/ui', '@vcmap/core', 'ol', 'proj4'],
      include: ['fast-deep-equal', 'rbush-knn', 'pbf', '@vcmap-cesium/engine'],
    },
    plugins: [createVuePlugin(), createConfigJsonReloadPlugin()],
    server: {
      middlewareMode: true,
      https: mergedOptions.https,
      proxy: { ...mergedOptions.proxy, ...proxy },
    },
    css: {
      preprocessorOptions: {
        sass: {
          additionalData:
            "\n@import './node_modules/@vcmap/ui/src/styles/variables.scss'\n",
        },
      },
    },
  });

  addAppConfigRoute(
    app,
    mergedOptions.appConfig,
    mergedOptions.auth,
    mergedOptions.config,
  );
  addIndexRoute(app, server);
  addPluginAssets(app, 'src');
  await addConfigRoute(app);

  app.use(server.middlewares);

  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}
