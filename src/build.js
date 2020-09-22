const { getPluginName } = require('./packageJsonHelpers');
const { compile } = require('./pack');

async function build(options) {
  options.pluginName = options.pluginName || await getPluginName();
  console.log(`compiling ${options.pluginName}`);
  options.mode = options.development ? 'development' : 'production';
  await compile(options);
}

module.exports = build;
