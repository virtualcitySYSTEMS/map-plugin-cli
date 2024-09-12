import path from 'path';
import fs from 'fs';
import { createServer } from 'vite';
import express from 'express';
import { logger } from '@vcsuite/cli-logger';
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
import build, { buildMapUI, getDefaultConfig } from './build.js';
import { getContext } from './context.js';
import setupMapUi from './setupMapUi.js';
import { getVcmConfigJs } from './pluginCliHelper.js';

/**
 * @typedef {ServeOptions} PreviewOptions
 * @property {string} [vcm] - an optional URL to a VC Map application
 */

/**
 * @param {VcmConfigJs} options
 * @returns {Promise<import("vite").InlineConfig>}
 */
async function getServerOptions(options) {
  let proxy = options.proxy || {};

  if (options.vcm) {
    const proxyOptions = {
      target: options.vcm,
      changeOrigin: true,
      secure: false,
      configure(httpProxy) {
        httpProxy.on('proxyRes', (proxyRes) => {
          delete proxyRes.headers['Content-Security-Policy'];
          delete proxyRes.headers['content-security-policy'];
        });
      },
    };

    proxy = {
      ...proxy,
      '^/style.css': proxyOptions,
      '^/assets': proxyOptions,
      '^/plugins': proxyOptions,
    };
  }

  return {
    publicDir: false,
    plugins: [createConfigJsonReloadPlugin()],

    resolve: {
      alias: [
        {
          find: /(\.\.?\/)+assets(.*)/,
          replacement: '/assets$2',
          customResolver: {
            resolveId(source) {
              return source;
            },
          },
        },
        {
          find: '@cesium/engine',
          replacement: '@vcmap-cesium/engine',
        },
      ],
    },
    server: {
      preTransformRequests: false,
      middlewareMode: true,
      proxy,
    },
    appType: 'custom',
  };
}

/**
 * @param {PreviewOptions} options
 * @returns {Promise<void>}
 */
export default async function preview(options) {
  const vcmConfigJs = await getVcmConfigJs();
  const mergedOptions = { ...vcmConfigJs, ...options };
  if (!mergedOptions.vcm) {
    await printVcmapUiVersion();
    // In case @vcmap/ui is linked via git+ssh, dist folder is not available and must be built first
    if (!fs.existsSync(resolveMapUi('dist'))) {
      await buildMapUI();
    }
  } else {
    logger.info(`Using hosted VC Map application ${mergedOptions.vcm}`);
  }
  checkReservedDirectories();
  await build({ development: false, watch: true });
  const app = express();
  logger.info('Starting preview server...');
  const inlineConfig = await getServerOptions(mergedOptions);
  const server = await createServer(inlineConfig);

  addAppConfigRoute(
    app,
    mergedOptions.vcm
      ? `${mergedOptions.vcm}/app.config.json`
      : mergedOptions.appConfig,
    mergedOptions.auth,
    mergedOptions.config,
    true,
  );
  addIndexRoute(app, server, true, mergedOptions.vcm, mergedOptions.auth);
  addPluginAssets(app, 'dist');

  if (!mergedOptions.vcm) {
    logger.spin('compiling preview');
    if (!fs.existsSync(resolveMapUi('plugins', 'node_modules'))) {
      logger.info(
        'Could not detect node_modules in map ui plugins. Assuming map UI not setup',
      );
      await setupMapUi();
    }
    const { buildPluginsForPreview } = await import(
      '@vcmap/ui/build/buildHelpers.js'
    );
    await buildPluginsForPreview(getDefaultConfig(), true);
    logger.stopSpinner();
    logger.info('@vcmap/ui built for preview');
    app.use(
      '/assets',
      express.static(
        path.join(
          getContext(),
          'node_modules',
          '@vcmap',
          'ui',
          'dist',
          'assets',
        ),
      ),
    );
    app.use(
      '/plugins',
      express.static(path.join(getContext(), 'dist', 'plugins')),
    );
    await addConfigRoute(app);
  }

  app.use(server.middlewares);

  const port = mergedOptions.port || 5005;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}
