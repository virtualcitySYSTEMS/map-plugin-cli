import fs from 'fs';
import { resolveContext } from './context.js';

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
export async function getPluginName() {
  const { name } = await getPackageJson();
  if (!name) {
    throw new Error('please specify the plugins name in the package.json');
  }
  return name;
}

/**
 * @returns {Promise<string>}
 */
export async function getPluginEntry() {
  const { main, module, type } = await getPackageJson();

  let entry = type === 'module' ? module : null;
  entry = entry || main;
  if (!entry) {
    throw new Error('Could not determine entry point');
  }
  return entry;
}

