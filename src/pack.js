import fs from 'fs';
import path from 'path';
import * as tar from 'tar';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';
import { rm } from 'fs/promises';
import { logger } from '@vcsuite/cli-logger';
import { getPluginName } from './packageJsonHelpers.js';
import { getContext, resolveContext } from './context.js';
import build from './build.js';

/**
 * @returns {Promise<void>}
 */
async function ensureConfigJson() {
  const configFileName = resolveContext('config.json');
  let config = {};
  if (fs.existsSync(configFileName)) {
    const content = await fs.promises.readFile(configFileName);
    config = JSON.parse(content.toString());
  }
  if (!config.version || !config.name) {
    const packageJsonFileName = resolveContext('package.json');
    if (fs.existsSync(packageJsonFileName)) {
      const content = await fs.promises.readFile(packageJsonFileName);
      const { version, name } = JSON.parse(content.toString());
      if (!config.version) {
        config.version = `^${version}`;
      }
      if (!config.name) {
        config.name = name;
      }
    }
  }
  await fs.promises.writeFile(
    resolveContext('dist', 'config.json'),
    JSON.stringify(config, null, 2),
  );
}

/**
 * @param {string} name
 * @returns {Promise<void>}
 */
async function zip(name) {
  if (fs.existsSync(resolveContext('CHANGES.md'))) {
    console.error('Please rename CHANGES.md to CHANGELOG.md');
  }

  const files = [
    ['package.json'],
    ['README.md'],
    ['CHANGELOG.md'],
    ['LICENSE.md'],
    ['config.json'],
    ['plugin-assets'],
  ]
    .map((fileArray) =>
      path.relative(resolveContext(), resolveContext(...fileArray)),
    )
    .filter(fs.existsSync);

  const file = `${name.replace(/\//, '-')}.tar`;
  await tar.c(
    {
      file: resolveContext('dist', file),
      cwd: getContext(),
    },
    files,
  );
  await tar.r(
    {
      file: resolveContext('dist', file),
      cwd: resolveContext('dist'),
    },
    ['index.js'],
  );

  const fileName = resolveContext('dist', file);
  const read = fs.createReadStream(fileName);
  const write = fs.createWriteStream(`${fileName}.gz`);

  await new Promise((res, rej) => {
    pipeline([read, createGzip(), write], (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
  await rm(fileName);
}

/**
 * @returns {Promise<void>}
 */
export default async function pack() {
  const pluginName = await getPluginName();
  logger.spin(`building plugin: ${pluginName}`);
  await build({});
  await ensureConfigJson();
  logger.debug('ensuring config.json');
  await zip(pluginName);
  logger.stopSpinner();
  logger.success('build finished');
}
