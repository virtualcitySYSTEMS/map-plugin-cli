const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const { getContext, resolveContext } = require('./context');
const { getDevWebpackConfig } = require('./getWebpackConfig');
const { getPluginName } = require('./packageJsonHelpers');

function httpGet(stringUrl, auth, handler) {
  const url = new URL(stringUrl);
  const options = {
    host: url.host,
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

function getIndexHtml(stringUrl, fileName, auth) {
  return new Promise((resolve, reject) => {
    httpGet(stringUrl, auth, (res) => {
      if (res.statusCode >= 400) {
        console.error('got status code: ', res.statusCode);
        reject(new Error(`StatusCode ${res.statusCode}`));
      }
      const write = fs.createWriteStream(resolveContext(fileName));
      write.on('finish', resolve);
      write.on('error', (err) => {
        reject(err);
      });
      res.pipe(write);
    });
  });
}

let configJson = null;

/**
 * @param {string} fileName
 * @return {Promise<Object>}
 */
async function readConfigJson(fileName) {
  const configFileName = fileName || resolveContext('config.json');
  let config = {};
  if (fs.existsSync(configFileName)) {
    const content = await fs.promises.readFile(configFileName);
    config = JSON.parse(content.toString());
  }
  // eslint-disable-next-line no-underscore-dangle
  delete config._esmodule;
  return config;
}

function getConfigJson(vcm, name, { auth, config: configFile }) {
  if (configJson) {
    return Promise.resolve(configJson);
  }
  const isWebVcm = /^https?:\/\//.test(vcm);
  return new Promise((resolve, reject) => {
    function handleStream(stream) {
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });

      stream.on('close', async () => {
        try {
          configJson = JSON.parse(data);
          configJson.plugins = configJson.plugins || [];
          const pluginConfig = await readConfigJson(configFile);
          // eslint-disable-next-line no-underscore-dangle
          pluginConfig.entry = '/_dist/plugin.js';
          const idx = configJson.plugins.findIndex(p => p.name === name);
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
      httpGet(`${vcm}config.json`, auth, (res) => {
        if (res.statusCode < 400) {
          handleStream(res);
        }
      });
    } else {
      handleStream(fs.createReadStream(path.join(vcm, 'config.json')));
    }
  });
}

async function serve(options) {
  let { vcm, index } = options;
  const pluginName = options.pluginName || await getPluginName();
  const isWebVcm = /^https?:\/\//.test(vcm);

  const proxy = {};
  const indexFilename = 'index.html'; // XXX maybe use some random filename when web to not clobber anything
  if (isWebVcm) {
    vcm = `${vcm.replace(/\/$/, '')}/`;
    await getIndexHtml(`${vcm}/${index}`, indexFilename, options.auth);
    ['/lib', '/css', '/fonts', '/images', '/img', '/templates', '/datasource-data', '/plugins']
      .concat(options.proxyRoute) // TODO allow for more complex proxy options, e.g add a target such as --proxyRoute myProxy=myTarget
      .forEach((p) => {
        proxy[p] = {
          target: vcm,
          changeOrigin: true,
          auth: options.auth,
        };
      });
  }
  const webpackConfig = await getDevWebpackConfig(options);
  const server = new WebpackDevServer(webpack(webpackConfig), {
    hot: true,
    hotOnly: true,
    open: false,
    injectClient: false,
    publicPath: '/_dist',
    logLevel: 'warn',
    clientLogLevel: 'silent',
    useLocalIp: true,
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /./, to: '/index.html' },
      ],
    },
    staticOptions: {
      fallthrough: false,
    },
    before(app) {
      app.use('/config.json', (req, res) => {
        getConfigJson(vcm, pluginName, options)
          .then((config) => {
            const stringConfig = JSON.stringify(config, null, 2);
            res.setHeader('Content-Type', 'application/json');
            res.write(stringConfig);
            res.end();
          });
      });
    },
    after(app) {
      app.use('/', (err, req, res, next) => {
        if (err.statusCode === 404 && isWebVcm) {
          httpGet(`${vcm}${req.url.replace(/^\//, '')}`, options.auth, (innerRes) => {
            if (innerRes.statusCode < 400) {
              innerRes.pipe(res);
            }
          });
        } else {
          next();
        }
      });
    },
    proxy,
    contentBase: isWebVcm ? getContext() : [options.vcm, getContext()],
    contentBasePublicPath: '/',
    index: 'index.html',
  });

  server.listen(options.port, '0.0.0.0', (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Your application is running');
    }
  });

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      server.close(() => {
        if (isWebVcm) {
          fs.unlinkSync(resolveContext(index));
        }
        process.exit(0);
      });
    });
  });
}


module.exports = serve;
