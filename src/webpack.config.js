const { getBaseConfig } = require('./getWebpackConfig');
const { getPluginEntry } = require('./packageJsonHelpers');

/**
 * Use this file to point your ID eslint settings to a webpack resolver. Do to a bug in `eslint-import-resolver-webpack`
 * you must provide the ENTRY env for use with eslint, see example.
 * @example
 * 'import/resolver': {
 *   webpack: {
 *     config: 'node_modules/vcmplugin-cli/src/webpack.config.js'
 *     env: {
 *       ENTRY: './index.js'
 *     }
 *   }
 * }
 * @param {Object=} env
 * @returns {webpack.Configuration|Promise<webpack.Configuration>}
 */
function getConfig(env) {
  if (env && env.ENTRY) {
    return getBaseConfig({ entry: env.ENTRY, mode: 'development' });
  }
  return getPluginEntry()
    .then((entry) => {
      return getBaseConfig({ entry, mode: 'development' });
    });
}

module.exports = getConfig;
