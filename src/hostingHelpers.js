import { fileURLToPath, URL } from 'url';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { logger } from '@vcsuite/cli-logger';
import { getContext, resolveContext } from './context.js';
import { getPluginEntry, getPluginName } from './packageJsonHelpers.js';

/**
 * @typedef {Object} HostingOptions
 * @property {string} [config] - an optional fileName to use for configuring the plugin
 * @property {string} [auth] - potential auth string to download assets (index.html, config) with
 * @property {number} [port]
 * @property {boolean} [https]
 */

export function checkReservedDirectories() {
  ['assets', 'plugins']
    .forEach((dir) => {
      if (fs.existsSync(path.join(getContext(), dir))) {
        logger.warning(`found reserved directory ${dir}. serving my not work as exptected`);
      }
    });
}

/**
 * @returns {string}
 */
export function getDirname() {
  return path.dirname(fileURLToPath(import.meta.url));
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
    options.headers = { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` };
  }
  if (url.protocol === 'https:') {
    https.get(options, handler);
  } else {
    http.get(options, handler);
  }
}

/**
 * @param {string} fileName
 * @returns {Promise<Object>}
 */
export async function readConfigJson(fileName) {
  const configFileName = fileName || resolveContext('config.json');
  let config = {};
  if (fs.existsSync(configFileName)) {
    const content = await fs.promises.readFile(configFileName);
    config = JSON.parse(content.toString());
  }

  return config;
}

let configJson = null;

/**
 * @returns {Promise<string>}
 */
export async function printVcmapUiVersion() {
  const packageJsonPath = path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Cannot find the @vcmap/ui package in ${getContext()}. Are you sure you installed it?`);
  }

  const content = await fs.promises.readFile(packageJsonPath);
  const { version } = JSON.parse(content.toString());
  logger.info(`Using @vcmap/ui version: ${version} found in current project.`);
}

/**
 * @param {string} [mapConfig] - fs or https to config. defaults to @vcmap/ui/map.config.json
 * @param {string} [auth]
 * @param {boolean} [production]
 * @param {string} [configFile]
 * @returns {Promise<unknown>}
 */
export function getConfigJson(mapConfig, auth, production, configFile) {
  const usedConfig = mapConfig || path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'config', 'base.config.json');
  if (configJson) {
    return Promise.resolve(configJson);
  }
  const isWebVcm = /^https?:\/\//.test(usedConfig);
  return new Promise((resolve, reject) => {
    function handleStream(stream) {
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });

      stream.on('close', async () => {
        try {
          configJson = JSON.parse(data);
          configJson.plugins = production && configJson.plugins ? configJson.plugins : [];
          const pluginConfig = await readConfigJson(configFile);
          pluginConfig.entry = production ? 'dist/index.js' : await getPluginEntry();
          pluginConfig.name = await getPluginName();
          const idx = configJson.plugins.findIndex(p => p.name === pluginConfig.name);
          if (idx > -1) {
            configJson.plugins.splice(idx, 1, pluginConfig);
          } else {
            configJson.plugins.push(pluginConfig);
          }
          resolve(configJson);
        } catch (e) {
          reject(e);
        }
      });
    }
    if (isWebVcm) {
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
        configJson = null;
      }
    },
  };
}

/**
 * @param {Express} app
 * @param {string} mapConfig
 * @param {string} [auth]
 * @param {string} [configFile]
 * @param {boolean} [production]
 */
export function addMapConfigRoute(app, mapConfig, auth, configFile, production) {
  app.get('/map.config.json', (req, res) => {
    getConfigJson(mapConfig, auth, production, configFile)
      .then((config) => {
        const stringConfig = JSON.stringify(config, null, 2);
        res.setHeader('Content-Type', 'application/json');
        res.write(stringConfig);
        res.end();
      });
  });
}

/**
 * @param {boolean} [production]
 * @returns {Promise<string>}
 */
export async function getMapUiIndexHtml(production) {
  const indexHtmlFileName = production ?
    path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'index.html') :
    path.join(getDirname(), '..', 'assets', 'index.html');
  const buffer = await fs.promises.readFile(indexHtmlFileName);
  return buffer.toString();
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
    let originalIndex = hostedVcm ?
      await getIndexHtml(`${hostedVcm}/`, auth) :
      await getMapUiIndexHtml(production); // TODO change hosted vcm index via option?

    originalIndex = await server.transformIndexHtml('index.html', originalIndex);
    res.status(200)
      .set({ 'Content-Type': 'text/html' })
      .end(originalIndex);
  });
}

