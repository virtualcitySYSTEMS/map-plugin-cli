import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { logger } from '@vcsuite/cli-logger';
import { executeUiNpm, resolveMapUi } from './hostingHelpers.js';

/**
 * Returns the absolute paths of the entry points (main & types) declared by the installed @vcmap/ui package.
 * @param {Object} uiPackageJson
 * @returns {string[]}
 */
function getUiEntries(uiPackageJson) {
  return [uiPackageJson.main, uiPackageJson.types]
    .filter(Boolean)
    .map((entry) => resolveMapUi(entry));
}

/**
 * @param {string[]} entries
 * @returns {string[]}
 */
function getMissingEntries(entries) {
  return entries.filter((entry) => !existsSync(entry));
}

/**
 * Ensures the library entry points (JS & type declarations) of the installed @vcmap/ui exist.
 * Published versions of @vcmap/ui ship with a prebuilt lib/ folder, in which case this is a no-op.
 * If @vcmap/ui is linked (npm link or file:), the library is built using the ui's `build-library` script.
 * Versions of @vcmap/ui without a `build-library` script are not supported by this cli: plugins are built with
 * bare imports, which require the import map of @vcmap/ui 7.
 * @returns {Promise<void>}
 */
export default async function ensureLib() {
  const uiPackageJsonPath = resolveMapUi('package.json');
  if (!existsSync(uiPackageJsonPath)) {
    throw new Error(
      `Cannot find @vcmap/ui in ${resolveMapUi()}. Are you sure you installed it?`,
    );
  }
  const uiPackageJson = JSON.parse(await readFile(uiPackageJsonPath, 'utf8'));
  const entries = getUiEntries(uiPackageJson);
  if (getMissingEntries(entries).length === 0) {
    logger.info('@vcmap/ui library present');
    return;
  }

  const { scripts = {} } = uiPackageJson;
  if (!scripts['build-library']) {
    throw new Error(
      `@vcmap/ui ${uiPackageJson.version} is not supported by this version of the plugin cli. ` +
        'Use @vcmap/ui 7 or newer.',
    );
  }
  if (!existsSync(resolveMapUi('index.ts'))) {
    throw new Error(
      '@vcmap/ui has no built lib/ folder and does not ship the sources to build it. ' +
        'Reinstall @vcmap/ui (without --ignore-scripts) or use a published version.',
    );
  }

  logger.spin('building @vcmap/ui library');
  try {
    await executeUiNpm('build-library');
  } finally {
    logger.stopSpinner();
  }

  const missing = getMissingEntries(entries);
  if (missing.length > 0) {
    throw new Error(
      `Failed to build @vcmap/ui library, missing: ${missing.join(', ')}`,
    );
  }
  logger.success('@vcmap/ui library built');
}
