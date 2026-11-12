import fs from 'fs';
import { lstat, readFile, readlink, realpath } from 'fs/promises';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import express from 'express';
import { logger } from '@vcsuite/cli-logger';
import path from 'path';
import { join, resolve, dirname } from 'node:path';
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
import { getPackageJson, getPluginName, isTS } from './packageJsonHelpers.js';
import { getVcmConfigJs } from './pluginCliHelper.js';
import ensureLib from './ensureLib.js';

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

  if (isTS()) {
    proxy['/src/index.js'] = {
      target: `http://localhost:${port}`,
      rewrite: () => '/src/index.ts',
    };
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
 * If @vcmap/ui is linked (npm link or file:), resolve its entry via the real path. Vite does not watch files within
 * node_modules, but it does watch files outside of the root. Resolving the linked ui outside of node_modules
 * therefore triggers a reload whenever its lib/ changes, e.g. while running `npm run build-library:watch` in @vcmap/ui.
 * Only the bare `@vcmap/ui` specifier is aliased, deep imports (e.g. @vcmap/ui/config/*) are resolved as before.
 * @param {import("fs").Stats} uiLStat
 * @param {Object} uiPackageJson
 * @returns {Promise<{ alias: Array<import("vite").Alias>, allow: string[] }>}
 */
async function getLinkedUiConfig(uiLStat, uiPackageJson) {
  if (!uiLStat.isSymbolicLink()) {
    return { alias: [], allow: [] };
  }
  const uiRealPath = await realpath(resolveMapUi());
  logger.info(
    `Using linked @vcmap/ui at ${uiRealPath}. Run "npm run build-library:watch" in @vcmap/ui to reload on changes.`,
  );
  return {
    alias: [
      {
        find: /^@vcmap\/ui$/,
        replacement: join(uiRealPath, uiPackageJson.main ?? 'index.js'),
      },
    ],
    allow: [uiRealPath],
  };
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
  // @vcmap/ui is resolved via its lib/ entry. In case @vcmap/ui is linked, lib/ may not have been built yet.
  await ensureLib();
  const uiLStat = await lstat(resolveMapUi());

  /*
  // In case @vcmap/ui is linked via git+ssh, dist folder is not available and must be built first
  // Currently not needed, keep it here if the same problem happens again
  if (!fs.existsSync(resolveMapUi('dist'))) {
    await buildMapUI();
  }
  */
  checkReservedDirectories();
  const app = express();
  const port = mergedOptions.port || 8008;

  logger.info('Starting development server...');
  const proxy = await getProxy('http', port);

  const { peerDependencies } = await getPackageJson();

  const optimizationIncludes = [
    'geotiff',
    'fast-deep-equal',
    'rbush',
    'rbush-knn',
    'pbf',
    'semver',
    '@vcmap-cesium/engine',
    'vue',
    'geographiclib-geodesic',
    ...(mergedOptions.optimizeDeps?.include || []),
  ];

  // We exclude ui dependencies from optimization, to allow plugins to use another version of the same plugin.
  // vitejs seems to have a problem with optimized deps in different versions.
  const uiPackageJsonPath = path.join(resolveMapUi(), 'package.json');
  const uiPackageJson = JSON.parse(
    (await readFile(uiPackageJsonPath)).toString(),
  );
  const { dependencies } = uiPackageJson;

  const excludedOptimizations = [
    ...Object.keys(dependencies),
    ...(mergedOptions.optimizeDeps?.exclude || []),
  ].filter((name) => !optimizationIncludes.includes(name));

  let serverFsConfig;
  const coreModule = join(process.cwd(), 'node_modules', '@vcmap', 'core');
  const coreStats = await lstat(coreModule);
  if (coreStats.isSymbolicLink()) {
    const linkPath = await readlink(coreModule);
    serverFsConfig = {
      allow: [
        '.',
        resolve(dirname(coreModule), join(linkPath, 'dist', 'src', 'workers')),
      ],
    };
  } else {
    serverFsConfig = {
      allow: [
        '.',
        resolve(dirname(coreModule), join('dist', 'src', 'workers')),
      ],
    };
  }

  const linkedUi = await getLinkedUiConfig(uiLStat, uiPackageJson);
  serverFsConfig.allow.push(...linkedUi.allow);

  const { default: devImportMap } = await import(
    '@vcmap/ui/build/devImportMap.js'
  );

  const server = await createServer({
    root: getContext(),
    publicDir: './node_modules/@vcmap/ui/public',
    resolve: {
      alias: [
        { find: '@cesium/engine', replacement: '@vcmap-cesium/engine' },
        { find: 'tinyqueue', replacement: 'tinyqueue/tinyqueue.js' },
        ...linkedUi.alias,
      ],
      dedupe: Object.keys(peerDependencies),
      preserveSymlinks: uiLStat.isSymbolicLink(),
    },
    optimizeDeps: {
      ...(mergedOptions.optimizeDeps || {}),
      exclude: [
        '@vcmap/ui',
        '@vcmap/core',
        'ol',
        'proj4',
        ...excludedOptimizations,
      ],
      include: optimizationIncludes,
    },
    plugins: [vue(), createConfigJsonReloadPlugin(), devImportMap()],
    server: {
      fs: serverFsConfig,
      middlewareMode: true,
      proxy: { ...mergedOptions.proxy, ...proxy },
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
