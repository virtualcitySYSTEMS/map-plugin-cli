const path = require('path');
const https = require('https');
const fs = require('fs');
const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const { getContext, resolveContext } = require('./context');
const { getDevWebpackConfig } = require('./getWebpackConfig');
const { getPluginName } = require('./packageJsonHelpers');

function getIndexHtml(url, fileName) {
  return new Promise((resolve, reject) => {
    https.get(`${url}/index.html`, (res) => {
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

async function readConfigJson() {
  const configFileName = resolveContext('config.json');
  let config = {};
  if (fs.existsSync(configFileName)) {
    const content = await fs.promises.readFile(configFileName);
    config = JSON.parse(content.toString());
  }
  return config;
}

function getConfigJson(vcm, name) {
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
          configJson.ui = configJson.ui || {};
          configJson.ui.plugins = configJson.ui.plugins || {};
          const pluginConfig = await readConfigJson();
          // eslint-disable-next-line no-underscore-dangle
          pluginConfig._entry = '_dist/plugin.js';
          configJson.ui.plugins[name] = pluginConfig;
          resolve(configJson);
        } catch (e) {
          reject(e);
        }
      });
    }
    if (isWebVcm) {
      https.get(`${vcm}/config.json`, (res) => {
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
  const { vcm } = options;
  const pluginName = options.pluginName || await getPluginName();
  const isWebVcm = /^https?:\/\//.test(vcm);

  const proxy = {};
  const index = 'index.html'; // XXX maybe use some random filename when web to not clobber anything
  if (isWebVcm) {
    await getIndexHtml(vcm, index);
    ['/lib', '/css', '/fonts', '/images', '/img', '/templates', '/datasource-data', '/plugins'].forEach((p) => {
      proxy[p] = {
        target: vcm,
        changeOrigin: true,
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
    logLevel: 'silent',
    clientLogLevel: 'silent',
    useLocalIp: true,
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /./, to: '/index.html' },
      ],
    },
    before(app) {
      app.use('/config.json', (req, res) => {
        getConfigJson(vcm, pluginName)
          .then((config) => {
            const stringConfig = JSON.stringify(config);
            res.setHeader('Content-Type', 'application/json');
            res.write(stringConfig);
            res.end();
          });
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
