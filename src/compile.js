const webpack = require('webpack');
const { getProdWebpackConfig } = require('./getWebpackConfig');

function compile(options) {
  return getProdWebpackConfig(options)
    .then((webpackConfig) => {
      return new Promise((resolve, reject) => {
        webpack(webpackConfig, (err, stats) => {
          if (err) {
            console.error(err);
            reject(err);
          } else if (stats.hasErrors()) {
            console.log(stats.compilation.errors);
            reject(stats.compilation.errors[0].Error);
          } else {
            console.log(`build ${options.modern ? 'modern' : 'legacy' }`);
            resolve();
          }
        });
      });
    });
}

module.exports = compile;
