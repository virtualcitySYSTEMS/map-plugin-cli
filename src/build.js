const webpack = require('webpack');
const { getPluginName } = require('./packageJsonHelpers');
const { getProdWebpackConfig } = require('./getWebpackConfig');

async function build(options) {
  function webpackHandler(err, stats) {
    if (err) {
      console.error(err);
    } else if (stats.hasErrors()) {
      console.error(stats.compilation.errors);
    } else {
      console.log(`built ${options.pluginName}`); // XXX replace with spinner for watch
    }
  }

  options.pluginName = options.pluginName || await getPluginName();
  console.log(`compiling ${options.pluginName}`);
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
