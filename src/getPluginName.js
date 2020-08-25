const fs = require('fs');
const { resolveContext } = require('./context');

/**
 * @return {Promise<string>}
 */
async function getPluginName() {
  const packageJson = resolveContext('package.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error('no package.json found in context');
  }

  const content = await fs.promises.readFile(packageJson);
  const { name } = JSON.parse(content);
  if (!name) {
    throw new Error('please speciy the plugins name in the package.json');
  }
  return name;
}

module.exports = getPluginName;
