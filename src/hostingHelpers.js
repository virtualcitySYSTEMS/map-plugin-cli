import { URL } from 'url';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { logger } from '@vcsuite/cli-logger';
import { getContext, resolveContext } from './context.js';
import { getPluginName } from './packageJsonHelpers.js';
import { promiseExec } from './pluginCliHelper.js';

/**
 * @typedef {Object} HostingOptions
 * @property {string|Object} [config] - an optional configObject or fileName to use for configuring the plugin
 * @property {string} [auth] - potential auth string to download assets (index.html, config) with
 * @property {number} [port]
 */

/**
 * @param {...string} pathSegments
 * @returns {string}
 */
export function resolveMapUi(...pathSegments) {
  return path.join(
    getContext(),
    'node_modules',
    '@vcmap',
    'ui',
    ...pathSegments,
  );
}

export function checkReservedDirectories() {
  ['assets', 'plugins', 'config'].forEach((dir) => {
    if (fs.existsSync(path.join(getContext(), dir))) {
      logger.warning(
        `found reserved directory ${dir}. serving my not work as exptected`,
      );
    }
  });
}

/**
 * @param {string} stringUrl
 * @param {string} auth
 * @param {function(http.IncomingMessage)} handler
 */
export function httpGet(stringUrl, auth, handler) {
  const url = new URL(stringUrl);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
  };

  if (auth) {
    options.headers = {
      Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
    };
  }
  if (url.protocol === 'https:') {
    https.get(options, handler);
  } else {
    http.get(options, handler);
  }
}

/**
 * @param {string|undefined} fileName
 * @returns {Promise<Object>}
 */
export async function readConfigJson(fileName) {
  const configFileName = fileName ?? resolveContext('config.json');
  let config = {};
  if (fs.existsSync(configFileName)) {
    const content = await fs.promises.readFile(configFileName);
    config = JSON.parse(content.toString());
  }

  return config;
}

/**
 * @param {string|undefined} pluginConfig
 * @returns {Promise<Object>}
 */
export async function getPluginConfig(pluginConfig) {
  const isObject = typeof pluginConfig === 'object' && pluginConfig !== null;
  if (isObject) {
    return pluginConfig;
  }
  return readConfigJson(pluginConfig);
}

const configMap = new Map();

/**
 * @returns {Promise<string>}
 */
export async function printVcmapUiVersion() {
  const packageJsonPath = resolveMapUi('package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `Cannot find the @vcmap/ui package in ${getContext()}. Are you sure you installed it?`,
    );
  }

  const content = await fs.promises.readFile(packageJsonPath);
  const { version } = JSON.parse(content.toString());
  logger.info(`Using @vcmap/ui version: ${version} found in current project.`);
}

/**
 * Deletes plugin from other inline configs and adds a temporary config containing the pluginConfig
 * @param {Object} appConfig
 * @param {Object} pluginConfig
 * @param {boolean} production
 * @returns {Promise<void>}
 */
export async function reWriteAppConfig(appConfig, pluginConfig, production) {
  const name = await getPluginName();
  pluginConfig.name = name;
  pluginConfig.entry = production ? 'dist/index.js' : 'src/index.js';
  appConfig.modules = appConfig.modules ?? [];
  appConfig.modules.forEach((config) => {
    if (Array.isArray(config.plugins)) {
      config.plugins = config.plugins.filter((p) => p.name !== name);
    }
  });
  appConfig.modules = [
    { _id: 'plugin-cli-module', plugins: [pluginConfig] },
    ...appConfig.modules,
  ];
}

/**
 * @param {string} [appConfig] - fs or https to config. defaults to @vcmap/ui/app.config.json
 * @param {string} [auth]
 * @param {boolean} [production]
 * @param {string} [configFile]
 * @returns {Promise<unknown>}
 */
export function getAppConfigJson(appConfig, auth, production, configFile) {
  const usedConfig = appConfig || resolveMapUi('app.config.json');
  if (configMap.has('app.config.json')) {
    return Promise.resolve(configMap.get('app.config.json'));
  }
  const isObject = typeof appConfig === 'object' && appConfig !== null;
  const isURL = (url) => /^https?:\/\//.test(url);
  const isWebVcm = !isObject && isURL(usedConfig);
  return new Promise((resolve, reject) => {
    async function handleAppConfig(data) {
      try {
        const appConfigJson = JSON.parse(data);
        configMap.set('app.config.json', appConfigJson);
        const pluginConfig = await getPluginConfig(configFile);
        await reWriteAppConfig(appConfigJson, pluginConfig, production);
        if (isWebVcm) {
          // replace relative URLs by absolute ones
          appConfigJson.modules = appConfigJson.modules.map((m) => {
            if (typeof m === 'string' && !isURL(m)) {
              return new URL(m, usedConfig).toString();
            }
            return m;
          });
        }
        resolve(appConfigJson);
      } catch (e) {
        reject(e);
      }
    }
    function handleStream(stream) {
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });

      stream.on('close', async () => {
        await handleAppConfig(data);
      });
    }
    if (isObject) {
      handleAppConfig(JSON.stringify(appConfig));
    } else if (isWebVcm) {
      httpGet(usedConfig, auth, (res) => {
        if (res.statusCode < 400) {
          handleStream(res);
        }
      });
    } else {
      handleStream(fs.createReadStream(path.join(usedConfig)));
    }
  });
}

/**
 * @param {string} stringUrl
 * @param {string} auth
 * @returns {Promise<string>}
 */
function getIndexHtml(stringUrl, auth) {
  return new Promise((resolve, reject) => {
    httpGet(stringUrl, auth, (res) => {
      let index = '';
      if (res.statusCode >= 400) {
        logger.error('got status code: ', res.statusCode);
        reject(new Error(`StatusCode ${res.statusCode}`));
      }
      res.on('data', (chunk) => {
        index += chunk.toString();
      });
      res.on('end', () => {
        resolve(index);
      });
    });
  });
}

/**
 * @returns {import("vite").Plugin}
 */
export function createConfigJsonReloadPlugin() {
  return {
    name: 'ConfigJsonReload',
    handleHotUpdate({ file }) {
      if (file === path.join(getContext(), 'config.json')) {
        configMap.clear();
      }
    },
  };
}

/**
 * @param {Express} app
 * @param {string} appConfig
 * @param {string} [auth]
 * @param {string} [configFile]
 * @param {boolean} [production]
 */
export function addAppConfigRoute(
  app,
  appConfig,
  auth,
  configFile,
  production,
) {
  app.get('/app.config.json', (req, res) => {
    getAppConfigJson(appConfig, auth, production, configFile).then((config) => {
      const stringConfig = JSON.stringify(config, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.write(stringConfig);
      res.end();
    });
  });
}

/**
 * @param {Express} app
 */
export async function addConfigRoute(app) {
  // IDEA pass in available plugins and strip unavailable ones?
  const mapUiDir = resolveMapUi();
  const pluginName = await getPluginName();

  app.get('/config*', async (req, res) => {
    const { url } = req;
    const fileName = path.join(mapUiDir, ...url.substring(1).split('/'));
    let response;
    if (configMap.has(url)) {
      response = JSON.stringify(configMap.get(url));
    } else if (fs.existsSync(fileName)) {
      try {
        const configContent = await fs.promises.readFile(fileName);
        const config = JSON.parse(configContent);
        configMap.set(url, config);
        if (Array.isArray(config.plugins)) {
          config.plugins = config.plugins.filter((p) => p.name !== pluginName);
        }
        response = JSON.stringify(config);
      } catch (e) {
        configMap.delete(url);
        logger.warning(`Failed to parse config ${url}`);
      }
    }

    if (!response) {
      res.statusCode = 404;
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.write(response);
    }
    res.end();
  });
}

/**
 * @param {boolean} [production]
 * @returns {Promise<string>}
 */
export async function getMapUiIndexHtml(production) {
  const indexHtmlFileName = production
    ? resolveMapUi('dist', 'index.html')
    : resolveMapUi('index.html');
  const buffer = await fs.promises.readFile(indexHtmlFileName);
  return buffer.toString();
}

/**
 * @param {Express} app
 * @param {string} base
 */
export function addPluginAssets(app, base) {
  app.use(`/${base}/plugin-assets*`, (req, res) => {
    res.redirect(308, req.originalUrl.replace(`/${base}`, ''));
  });
}

/**
 * @param {Express} app
 * @param {import("vite").ViteDevServer} server
 * @param {boolean} [production]
 * @param {string} [hostedVcm]
 * @param {string} [auth]
 */
export function addIndexRoute(app, server, production, hostedVcm, auth) {
  app.get('/', async (req, res) => {
    let originalIndex = hostedVcm
      ? await getIndexHtml(`${hostedVcm}/`, auth)
      : await getMapUiIndexHtml(production); // TODO change hosted vcm index via option?

    originalIndex = await server.transformIndexHtml(
      '/index.html',
      originalIndex,
    );

    res.status(200).set({ 'Content-Type': 'text/html' }).end(originalIndex);
  });
}

/**
 * @param {string|null} args
 * @param {string} [command='run']
 * @returns {Promise<string>}
 */
export function executeUiNpm(args, command = 'run') {
  const mapUiDir = resolveMapUi();
  if (args) {
    return promiseExec(`npm ${command} ${args}`, { cwd: mapUiDir });
  }
  return promiseExec(`npm ${command}`, { cwd: mapUiDir });
}
