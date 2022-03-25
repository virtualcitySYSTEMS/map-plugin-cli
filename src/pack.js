import { Transform } from 'stream';
import fs from 'fs';
import vinylFs from 'vinyl-fs';
import archiver from 'archiver';
import { logger } from '@vcsuite/cli-logger';
import { getPluginName } from './packageJsonHelpers.js';
import { resolveContext, getContext } from './context.js';
import build from './build.js';

/**
 * @param {string} name
 * @returns {Promise<void>}
 */
function replaceAssets(name) {
  const replaceTransform = new Transform({
    objectMode: true,
    transform(data, encoding, callback) {
      data.contents = Buffer.from(String(data.contents)
        .replace(/\.?\/?(plugin-assets)\//g, `plugins/${name}/$1/`));

      callback(null, data);
    },
  });

  const context = getContext();
  const stream = vinylFs.src([resolveContext('dist', '*')], {
    cwd: context,
    allowEmpty: false,
  })
    .pipe(replaceTransform)
    .pipe(vinylFs.dest(resolveContext('dist')));

  return new Promise((resolve, reject) => {
    stream.on('finish', () => { resolve(); });
    stream.on('error', reject);
  });
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
      ['dist', 'style.css'],
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
