const fs = require('fs');
const path = require('path');
const { resolveContext } = require('./context');

/** @tpye {Object|null} */
let packageJson = null;

/**
 * @return {Promise<Object>}
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
 * @return {Promise<string>}
 */
async function getPluginName() {
  const { name } = await getPackageJson();
  if (!name) {
    throw new Error('please speciy the plugins name in the package.json');
  }
  return name;
}

/**
 * @return {Promise<string|undefined>}
 */
async function getPluginEntry() {
  const { main } = await getPackageJson();
  if (main && !path.isAbsolute(main) && !/^\./.test(main)) { // webpack requires a dot for relative paths
    return `./${main}`;
  }
  return main;
}

module.exports = {
  getPluginName,
  getPluginEntry,
};
