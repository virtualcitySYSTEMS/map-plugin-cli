const fs = require('fs');
const path = require('path');
const { resolveContext } = require('./context');

/** @type {Object|null} */
let packageJson = null;

/**
 * @returns {Promise<Object>}
 */
async function getPackageJson() {
  if (!packageJson) {
    const packageJsonFileName = resolveContext('package.json');
    if (!fs.existsSync(packageJsonFileName)) {
      throw new Error('no package.json found in context');
    }

    const content = await fs.promises.readFile(packageJsonFileName);
    packageJson = JSON.parse(content.toString());
  }

  return packageJson;
}

/**
 * @returns {Promise<string>}
 */
async function getPluginName() {
  const { name } = await getPackageJson();
  if (!name) {
    throw new Error('please speciy the plugins name in the package.json');
  }
  return name;
}

/**
 * @returns {Promise<string|undefined>}
 */
async function getPluginEntry() {
  const { main, module, type } = await getPackageJson();

  const entry = type === 'module' ? module : main;
  if (entry && !path.isAbsolute(entry) && !/^\./.test(entry)) { // webpack requires a dot for relative paths
    return `./${entry}`;
  }
  return entry;
}

module.exports = {
  getPluginName,
  getPluginEntry,
};
