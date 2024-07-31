import { logger } from '@vcsuite/cli-logger';
import { maxSatisfying, validRange } from 'semver';
import {
  checkVcMapVersion,
  DepType,
  getPackageJson,
  installDeps,
} from './packageJsonHelpers.js';
import { name, promiseExec } from './pluginCliHelper.js';
import { getContext } from './context.js';

/**
 * @typedef {Object} UpdateOptions
 * @property {string} [mapVersion] - Optional version of @vcmap/ui to update to. Default is latest
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
  let viewCmd = 'npm view @vcmap/ui --json peerDependencies version name';
  if (options.mapVersion) {
    viewCmd = `npm view @vcmap/ui@${options.mapVersion} --json peerDependencies version name`;
  }
  const { stdout, stderr } = await promiseExec(viewCmd);
  logger.error(stderr);
  const npmVersions = JSON.parse(stdout);
  let npmVersion = null;
  if (Array.isArray(npmVersions)) {
    const versions = npmVersions.map((v) => v.version);
    const versionToUse = maxSatisfying(versions, options.mapVersion);
    npmVersion = npmVersions.find((v) => v.version === versionToUse);
  } else {
    npmVersion = npmVersions;
  }
  if (!npmVersion) {
    console.log(`could not find @vcmap/ui version for ${options.mapVersion}`);
    return;
  }
  const { name: mapName, peerDependencies: mapPeer } = npmVersion;
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
 * Updating peer dependencies to @vmap/ui
 * Updating @vcmap/plugin-cli
 * @param {UpdateOptions} options
 * @returns {Promise<void>}
 */
export default async function update(options) {
  const packageJson = await getPackageJson();
  const context = getContext();
  await updatePeerDependencies(packageJson.peerDependencies, context, options);
  await checkVcMapVersion(context);
  await updateCli(context);
  logger.success(`Updated plugin ${packageJson.name}`);
}
