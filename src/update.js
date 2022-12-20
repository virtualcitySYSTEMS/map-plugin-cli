import { logger } from '@vcsuite/cli-logger';
import { DepType, getPackageJson, installDeps } from './packageJsonHelpers.js';
import { name, promiseExec } from './pluginCliHelper.js';

/**
 * Update peer dependencies of a provided packageJson with @vcmap/ui@latest peers
 * @param {Object} pluginPeer - peerDependencies of a plugin
 * @param {string} pluginPath
 * @returns {Promise<void>}
 */
export async function updatePeerDependencies(pluginPeer, pluginPath) {
  const { stdout, stderr } = await promiseExec('npm view @vcmap/ui --json');
  logger.error(stderr);
  const { name: mapName, peerDependencies: mapPeer } = JSON.parse(stdout);
  const peerDeps = [`${mapName}@latest`]; // @vcmap/ui is a required peer dep and will be updated in any case
  if (pluginPeer) {
    const pluginPeerDeps = Object.keys(pluginPeer)
      .filter(depName => !!mapPeer[depName] && pluginPeer[depName] !== mapPeer[depName])
      .map(depName => `${depName}@${mapPeer[depName]}`);
    peerDeps.push(pluginPeerDeps);
  }
  logger.spin('Updating peer dependencies');
  await installDeps(peerDeps, DepType.PEER, pluginPath);
  logger.stopSpinner();
  logger.success('Updated peer dependencies');
}

/**
 * Updates the @vcmap/plugin-cli
 * @param {string} pluginPath
 * @returns {Promise<void>}
 */
async function updateCli(pluginPath) {
  logger.spin(`Updating ${name}`);
  await installDeps([`${name}@latest`], DepType.DEV, pluginPath);
  logger.stopSpinner();
  logger.success(`Updated ${name}`);
}

/**
 * Updating peer dependencies to @vmap/ui@latest
 * Updating @vcmap/plugin-cli
 * @returns {Promise<void>}
 */
export default async function update() {
  const packageJson = await getPackageJson();
  await updatePeerDependencies(packageJson.peerDependencies, process.cwd());
  await updateCli(process.cwd());
  logger.success(`Updated plugin ${packageJson.name}`);
}
