import { logger } from '@vcsuite/cli-logger';
import { validRange, maxSatisfying, prerelease } from 'semver';
import {
  checkVcMapVersion,
  DepType,
  getPackageJson,
  installDeps,
  isTS,
} from './packageJsonHelpers.js';
import { name, version, promiseExec } from './pluginCliHelper.js';
import { getContext } from './context.js';

/**
 * @typedef {Object} UpdateOptions
 * @property {string} [mapVersion] - Optional version of @vcmap/ui to update to. Default is latest
 * @property {boolean} [force] - Force install
 * @property {boolean} [updateDev] - update typescript & vue-tsc
 * @property {Object} [pluginDev] - provide if providing updateDev
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
  let viewCmd =
    'npm view @vcmap/ui --json peerDependencies devDependencies version name';
  if (options.mapVersion) {
    viewCmd = `npm view @vcmap/ui@${options.mapVersion} --json peerDependencies devDependencies version name`;
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
  const {
    name: mapName,
    peerDependencies: mapPeer,
    devDependencies: mapDev,
  } = npmVersion;
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

  if (options.updateDev && options.pluginDev) {
    logger.spin('Updating dev dependencies');
    const devDeps = [];
    if (isTS()) {
      if (mapDev.typescript) {
        devDeps.push(`typescript@${mapDev.typescript}`);
      }
      if (mapDev['vue-tsc']) {
        devDeps.push(`vue-tsc@${mapDev['vue-tsc']}`);
      }
    }

    if (options.pluginDev?.vitest && mapDev.vitest) {
      devDeps.push(`vitest@${mapDev.vitest}`);
    }

    if (
      options.pluginDev?.['@vitest/coverage-v8'] &&
      mapDev['@vitest/coverage-v8']
    ) {
      devDeps.push(`@vitest/coverage-v8@${mapDev['@vitest/coverage-v8']}`);
    }

    await installDeps(devDeps, DepType.DEV, pluginPath, options.force);
  }
  logger.stopSpinner();
  logger.success(
    `Updated peer${options.updateDev ? ' & dev' : ''} dependencies`,
  );
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
    updateDev: true,
    pluginDev: packageJson.devDependencies,
    ...options,
  });
  await checkVcMapVersion(context);
  logger.success(`Updated plugin ${packageJson.name}`);
}
