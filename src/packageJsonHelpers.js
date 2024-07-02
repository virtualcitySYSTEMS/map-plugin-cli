import { existsSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { parse, satisfies, validRange } from 'semver';
import { logger } from '@vcsuite/cli-logger';
import path from 'path';
import { getContext, resolveContext } from './context.js';
import { promiseExec } from './pluginCliHelper.js';

/** @type {Object|null} */
let packageJson = null;

/**
 * @param {string} [pluginPath]
 * @returns {Promise<Object>}
 */
export async function getPackageJson(pluginPath) {
  if (!packageJson) {
    const packageJsonFileName = path.join(
      pluginPath || getContext(),
      'package.json',
    );
    if (!existsSync(packageJsonFileName)) {
      throw new Error('no package.json found in context');
    }

    const content = await readFile(packageJsonFileName);
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
 * Whether this is considered a TS plugin or not
 * @returns {boolean}
 */
export function isTS() {
  const indexTs = resolveContext('src', 'index.ts');
  return existsSync(indexTs);
}

/**
 * Gets the entry of the package
 * @returns {string}
 */
export function getEntry() {
  if (isTS()) {
    return 'src/index.ts';
  }
  return 'src/index.js';
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
 * @param {boolean} [force=false]
 * @returns {Promise<void>}
 */
export async function installDeps(deps, type, pluginPath, force = false) {
  if (deps.length < 1) {
    return;
  }
  let save = '--save';
  if (type === DepType.PEER) {
    save = '--save-peer';
  } else if (type === DepType.DEV) {
    save = '--save-dev';
  }

  if (force) {
    save = `${save} --force`;
  }

  const installCmd = `npm i ${save} ${deps.map((d) => `"${d}"`).join(' ')}`; // wrap deps with "" for windows
  logger.debug(installCmd);
  const { stdout, stderr } = await promiseExec(installCmd, { cwd: pluginPath });
  logger.log(stdout);
  logger.error(stderr);
}

/**
 * Returns the version of the used @vcmap/ui dependency
 * @param {string} [pluginPath]
 * @returns {Promise<string>}
 */
export async function getVcMapVersion(pluginPath) {
  const { stdout, stderr } = await promiseExec('npm ls --json', {
    cwd: pluginPath || getContext(),
  });
  logger.error(stderr);
  const { dependencies } = JSON.parse(stdout);
  return dependencies['@vcmap/ui'].version;
}

/**
 * @param {string} [pluginPath]
 * @returns {Promise<void>}
 */
export async function setVcMapVersion(pluginPath) {
  const mapVersion = await getVcMapVersion(pluginPath);
  const { major, minor } = parse(mapVersion);
  const pluginPackageJson = await getPackageJson(pluginPath);

  pluginPackageJson.mapVersion = `^${major}.${minor}`;
  logger.info(`Setting plugin mapVersion to ${pluginPackageJson.mapVersion}`);
  await writeFile(
    path.join(pluginPath || getContext(), 'package.json'),
    JSON.stringify(pluginPackageJson, null, 2),
  );
}

/**
 * Update the vcsMapVersion in the package.json
 * @param {string} pluginPath
 * @returns {Promise<void>}
 */
export async function checkVcMapVersion(pluginPath) {
  const pluginPackageJson = await getPackageJson(pluginPath);
  const currentUiVersion = await getVcMapVersion(pluginPath);
  if (pluginPackageJson.mapVersion) {
    if (!validRange(pluginPackageJson.mapVersion)) {
      logger.error(
        `The current mapVersion ${pluginPackageJson.mapVersion} in the package.json is not a valid range!`,
      );
    } else if (
      !satisfies(currentUiVersion, pluginPackageJson.mapVersion, {
        includePrerelease: true,
      })
    ) {
      logger.error(
        'The currently installed @vcmap/ui version is not covered by the mapVersion version range in the package.json! Due to breaking changes this plugin may not work as expected. Please update dependent API, where necessary!',
      );
    }
  } else {
    await setVcMapVersion(pluginPath);
  }
}
