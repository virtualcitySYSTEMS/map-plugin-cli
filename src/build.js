const webpack = require('webpack');
const { logger } = require('@vcsuite/cli-logger');
const { getPluginName } = require('./packageJsonHelpers');
const { getProdWebpackConfig } = require('./getWebpackConfig');

async function build(options) {
  function webpackHandler(err, stats) {
    if (err) {
      logger.error(err);
    } else if (stats.hasErrors()) {
      logger.error(stats.compilation.errors);
    } else {
      logger.success(`built ${options.pluginName}`);
    }
    logger.stopSpinner();
  }

  options.pluginName = options.pluginName || await getPluginName();
  logger.spin(`compiling ${options.pluginName}`);
  options.mode = options.development ? 'development' : 'production';

  const config = await getProdWebpackConfig(options);
  const compiler = webpack(config);

  if (options.watch) {
    compiler.watch({}, webpackHandler);
  } else {
    compiler.run(webpackHandler);
  }
}

module.exports = build;
