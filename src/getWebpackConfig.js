const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { getPluginEntry } = require('./packageJsonHelpers');
const { resolveContext, getContext } = require('./context');

/**
 * @enum {string}
 */
const buildMode = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TESTING: 'testing',
};

/**
 * @typedef {GetWebpackOptions} DevOptions
 * @property {string|undefined} vcm - the vcm directory
 * @property {number} port - the port number of the dev server // XXX take these options apart
 */

/**
 * @typedef {GetWebpackOptions} ProdOptions
 * @property {string} pluginName - the name of the plugin being built
 * @property {boolean|undefined} modern - build for modern browsers
 * @property {string|boolean|undefined} library - whether to create a library. true will create a library using the plugin name. a string overrides the library name
 * @property {string|undefined} [libraryTarget='commonjs2'] - the library target. has no effect if library is not specified
 */

/**
 * @typedef {Object} GetWebpackOptions
 * @property {string|Object|undefined} entry - an alternative entry point, defaults to 'src/index'
 * @property {string|undefined} mode - 'development', 'production' or 'test'.
 * @property {boolean|undefined} condenseWhitespace - pass whitespace: 'condense' to vue loader
 */

/**
 * @param {GetWebpackOptions} options
 * @return {webpack.Configuration}
 */
function getBaseConfig(options) {
  return {
    entry: options.entry,
    context: getContext(),
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        '@': resolveContext('src'),
      },
    },
    resolveLoader: {
      modules: [
        path.join(__dirname, '..', 'node_modules'),
        'node_modules',
        resolveContext('node_modules'),
      ],
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            compilerOptions: {
              whitespace: options.condenseWhitespace ? 'condense' : 'preserve',
            },
          },
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          include: [resolveContext('src')],
          options: {
            presets: [
              '@vue/babel-preset-app',
            ],
          },
        },
        {
          test: /\.(png|jpe?g|gif)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                name: 'img/[name].[hash:8].[ext]',
              },
            },
          ],
        },
        {
          test: /\.(svg)(\?.*)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'img/[name].[hash:8].[ext]',
              },
            },
          ],
        },
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                name: 'media/[name].[hash:8].[ext]',
              },
            },
          ],
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                name: 'fonts/[name].[hash:8].[ext]',
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'vue-style-loader',
              options: {
                base: 1020,
                shadowMode: false,
              },
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: false,
                importLoaders: 2,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: false,
              },
            },
          ],
        },
        {
          test: /\.p(ost)?css$/,
          use: [
            {
              loader: 'vue-style-loader',
              options: {
                base: 1020,
                shadowMode: false,
              },
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: false,
                importLoaders: 2,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: false,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new webpack.DefinePlugin({
        'process.env': { NODE_ENV: `"${options.mode}"`, BASE_URL: '""' },
      }),
    ],
  };
}

/**
 * @param {ProdOptions} options
 * @return {Promise<webpack.Configuration>}
 */
async function getProdWebpackConfig(options) {
  options.entry = options.entry || { plugin: await getPluginEntry() || './src/index' };
  options.mode = options.mode || buildMode.PRODUCTION;
  process.env.VUE_CLI_MODERN_BUILD = options.modern;

  if (typeof options.entry === 'string') {
    options.entry = { plugin: options.entry };
  }

  const config = getBaseConfig(options);
  let libraryTarget;
  let library;
  if (options.library) {
    library = typeof options.library === 'string' ? options.library : options.pluginName;
    libraryTarget = options.libraryTarget || 'commonjs2';
    console.log(`creating ${library} as a ${libraryTarget} library`);
  }

  config.output = {
    path: resolveContext('dist'),
    filename: options.modern ? `${options.pluginName}.es6.js` : `${options.pluginName}.js`,
    library,
    libraryTarget,
    publicPath: './',
  };

  config.mode = options.mode;
  config.devtool = false;
  config.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  };
  return config;
}

/**
 * @param {DevOptions} options
 * @return {Promise<webpack.Configuration>}
 */
async function getDevWebpackConfig(options) {
  options.entry = options.entry || {
    plugin: [
      `webpack-dev-server/client?http://192.168.1.236:8080:${options.port}`,
      'webpack/hot/only-dev-server',
      await getPluginEntry() || './src/index.js',
    ],
  };
  options.mode = options.mode || buildMode.DEVELOPMENT;
  if (typeof options.entry === 'string') {
    options.entry = {
      plugin: [
        `webpack-dev-server/client?http://192.168.1.236:8080/:${options.port}`,
        'webpack/hot/only-dev-server',
        options.entry,
      ],
    };
  }
  const config = getBaseConfig(options);

  config.output = {
    globalObject: '(typeof self !== \'undefined\' ? self : this)',
    path: resolveContext('_dist'),
    filename: '[name].js',
    publicPath: './_dist',
  };

  config.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    // new webpack.NoEmitOnErrorsPlugin(),
  );
  config.mode = options.mode;
  config.devtool = 'eval-cheap-module-source-map';
  return config;
}

module.exports = {
  getProdWebpackConfig,
  getDevWebpackConfig,
};
