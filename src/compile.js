const { getPluginName } = require('./packageJsonHelpers');
const { compile } = require('./build');

async function compileCommand(options) {
  options.pluginName = options.pluginName || await getPluginName();
  console.log(`compiling ${options.pluginName}`);
  await compile(options);
}

module.exports = compileCommand;
