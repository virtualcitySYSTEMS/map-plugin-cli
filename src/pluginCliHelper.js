import fs from 'fs';
import path from 'path';
import util from 'util';
import childProcess from 'child_process';
import { fileURLToPath } from 'url';

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
export const { version, name } = JSON.parse(fs.readFileSync(path.join(getDirname(), '..', 'package.json')).toString());

/**
 * @type {(arg1: string) => Promise<string>}
 */
export const promiseExec = util.promisify(childProcess.exec);
