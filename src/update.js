import { logger } from '@vcsuite/cli-logger';
import { validRange, prerelease } from 'semver';
import {
  checkVcMapVersion,
  DepType,
  getPackageJson,
  installDeps,
} from './packageJsonHelpers.js';
import { name, version, promiseExec } from './pluginCliHelper.js';
import { getContext } from './context.js';

/**
 * @typedef {Object} UpdateOptions
 * @property {string} [mapVersion] - Optional version of @vcmap/ui to update to. Default is latest
 * @property {boolean} [force] - Force install
 */

/**
 * Update peer dependencies of a provided packageJson with @vcmap/ui@latest peers
 * @param {Object} pluginPeer - peerDependencies of a plugin
 * @param {string} pluginPath
 * @param {UpdateOptions} [options]
 * @returns {Promise<void>}
 */
export async function updatePeerDependencies(
  pluginPeer,
  pluginPath,
  options = {},
) {
  if (options.mapVersion && !validRange(options.mapVersion)) {
    logger.error(
      `The mapVersion ${options.mapVersion} is not valid. Using 'latest' instead`,
    );
    options.mapVersion = 'latest';
  }
  const { stdout, stderr } = await promiseExec('npm view @vcmap/ui --json');
  logger.error(stderr);
  const { name: mapName, peerDependencies: mapPeer } = JSON.parse(stdout);
  const peerDeps = [`${mapName}@${options.mapVersion || 'latest'}`]; // @vcmap/ui is a required peer dep and will be updated in any case
  if (pluginPeer) {
    const pluginPeerDeps = Object.keys(pluginPeer)
      .filter(
        (depName) =>
          !!mapPeer[depName] && pluginPeer[depName] !== mapPeer[depName],
      )
      .map((depName) => `${depName}@${mapPeer[depName]}`);
    peerDeps.push(...pluginPeerDeps);
  }
  logger.spin('Updating peer dependencies');
  await installDeps(peerDeps, DepType.PEER, pluginPath, options.force);
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
  let versionToUse = 'latest';
  if (prerelease(version)) {
    versionToUse = `^${version}`;
  }
  await installDeps([`${name}@${versionToUse}`], DepType.DEV, pluginPath, true);
  logger.stopSpinner();
  logger.success(`Updated ${name}`);
}

/**
 * Updating peer dependencies to @vmap/ui
 * Updating @vcmap/plugin-cli
 * @param {UpdateOptions} options
 * @returns {Promise<void>}
 */
export default async function update(options) {
  const packageJson = await getPackageJson();
  const context = getContext();
  await updateCli(context);
  await updatePeerDependencies(packageJson.peerDependencies, context, {
    force: true,
    ...options,
  });
  await checkVcMapVersion(context);
  logger.success(`Updated plugin ${packageJson.name}`);
}
