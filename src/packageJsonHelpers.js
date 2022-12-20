import fs from 'fs';
import { logger } from '@vcsuite/cli-logger';
import { resolveContext } from './context.js';
import { promiseExec } from './pluginCliHelper.js';

/** @type {Object|null} */
let packageJson = null;

/**
 * @returns {Promise<Object>}
 */
export async function getPackageJson() {
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

/**
 * @enum {number}
 */
export const DepType = {
  DEP: 1,
  PEER: 2,
  DEV: 3,
};

/**
 * @param {Array<string>} deps
 * @param {DepType} type
 * @param {string} pluginPath
 * @returns {Promise<void>}
 */
export async function installDeps(deps, type, pluginPath) {
  if (deps.length < 1) {
    return;
  }
  let save = '--save';
  if (type === DepType.PEER) {
    save = '--save-peer';
  } else if (type === DepType.DEV) {
    save = '--save-dev';
  }
  const installCmd = `npm i ${save} ${deps.join(' ')}`;
  logger.debug(installCmd);
  const { stdout, stderr } = await promiseExec(installCmd, { cwd: pluginPath });
  logger.log(stdout);
  logger.error(stderr);
}
