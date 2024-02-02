import fs from 'fs';
import path from 'path';
import util from 'util';
import childProcess from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from '@vcsuite/cli-logger';
import { getContext } from './context.js';

/**
 * @returns {string}
 */
export function getDirname() {
  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * @type {string} version
 * @type {string} name
 */
export const { version, name } = JSON.parse(
  fs.readFileSync(path.join(getDirname(), '..', 'package.json')).toString(),
);

/**
 * @type {(arg1: string) => Promise<string>}
 */
export const promiseExec = util.promisify(childProcess.exec);

/**
 * @typedef {PreviewOptions} VcmConfigJs
 * @property {Object} proxy - see https://vitejs.dev/config/server-options.html#server-proxy
 */

/**
 * @returns {Promise<VcmConfigJs>}
 */
export async function getVcmConfigJs() {
  let vcmConfigJs = {};
  const vcmConfigJsPath = path.resolve(getContext(), 'vcm.config.js');
  if (!fs.existsSync(vcmConfigJsPath)) {
    logger.debug(`${vcmConfigJsPath} not existing!`);
    return vcmConfigJs;
  }
  try {
    ({ default: vcmConfigJs } = await import(pathToFileURL(vcmConfigJsPath)));
    logger.info('Using vcm.config.js found in current project.');
  } catch (err) {
    logger.error(err);
  }
  return vcmConfigJs;
}
