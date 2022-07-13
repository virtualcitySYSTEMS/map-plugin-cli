import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import archiver from 'archiver';
import { logger } from '@vcsuite/cli-logger';
import { getPluginName } from './packageJsonHelpers.js';
import { resolveContext, getContext } from './context.js';
import build from './build.js';

/**
 * @param {string} name
 * @returns {Promise<void>}
 */
async function replaceAssets(name) {
  let indexJSContent = await readFile(getContext('dist', 'index.js'));
  indexJSContent = indexJSContent.replace(/\.?\/?(plugin-assets)\//g, `plugins/${name}/$1/`);
  await writeFile(getContext('dist', 'index.js'), indexJSContent);
}

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
  await fs.promises.writeFile(resolveContext('dist', 'config.json'), JSON.stringify(config, null, 2));
}

/**
 * @param {string} name
 * @returns {Promise<void>}
 */
function zip(name) {
  return new Promise((resolve, reject) => {
    const zipStream = fs.createWriteStream(resolveContext('dist', `${name.replace(/\//, '-')}.zip`));
    const archive = archiver('zip', { zlib: { level: 5 } });

    zipStream.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('warning', (err) => {
      logger.error(err);
    });

    archive.pipe(zipStream);
    [
      ['package.json'],
      ['README.md'],
      ['config.json'],
      ['dist', 'index.js'],
    ].forEach((fileArray) => {
      const file = resolveContext(...fileArray);
      if (fs.existsSync(file)) {
        archive.file(file, { name: `${name}/${fileArray.pop()}` });
      }
    });

    if (fs.existsSync(resolveContext('plugin-assets'))) {
      archive.directory(resolveContext('plugin-assets'), `${name}/plugin-assets`);
    }

    archive.finalize().then(() => {
      resolve();
    });
  });
}

/**
 * @returns {Promise<void>}
 */
export default async function pack() {
  const pluginName = await getPluginName();
  logger.spin(`building plugin: ${pluginName}`);
  await build({});
  await replaceAssets(pluginName);
  logger.debug('fixed asset paths');
  await ensureConfigJson();
  logger.debug('ensuring config.json');
  await zip(pluginName);
  logger.stopSpinner();
  logger.success('build finished');
}
