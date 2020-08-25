const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const TerserPlugin = require('terser-webpack-plugin');
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
 * @typedef {Object} GetWebpackOptions
 * @property {string|Object|undefined} entry - an alternative entry point, defaults to 'src/index'
 * @property {string|undefined} mode - 'development', 'production' or 'test'.
 * @property {boolean|undefined} modern - build for modern browsers
 * @property {string|undefined} library - a library name to give to your plugin
 * @property {boolean|undefined} condenseWhitespace - pass whitespace: 'condense' to vue loader
 * @property {string|undefined} vcm - the vcm directory
 * @property {number} port - the port number of the dev server // XXX take these options apart
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
 * @param {GetWebpackOptions} options
 * @return {webpack.Configuration}
 */
function getProdWebpackConfig(options) {
  options.entry = options.entry || { plugin: './src/index' };
  options.mode = options.mode || buildMode.PRODUCTION;
  if (typeof options.entry === 'string') {
    options.entry = { plugin: options.entry };
  }

  const config = getBaseConfig(options);
  config.output = {
    path: resolveContext('dist'),
    filename: options.modern ? 'plugin._es6.js' : 'plugin.js',
    library: options.library,
    libraryTarget: options.library ? 'umd' : undefined,
    publicPath: './',
  };

  config.mode = options.mode;
  config.devtool = false;
  config.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin()],
  };
  return config;
}

/**
 * @param {GetWebpackOptions} options
 * @return {webpack.Configuration}
 */
function getDevWebpackConfig(options) {
  options.entry = options.entry || {
    plugin: [
      `webpack-dev-server/client?http://192.168.1.236:8080:${options.port}`,
      'webpack/hot/only-dev-server',
      './src/index.js',
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
