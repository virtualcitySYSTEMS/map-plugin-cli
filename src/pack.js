const { Transform } = require('stream');
const fs = require('fs');
const webpack = require('webpack');
const vinylFs = require('vinyl-fs');
const archiver = require('archiver');
const { logger } = require('@vcsuite/cli-logger');
const { getProdWebpackConfig } = require('./getWebpackConfig');
const { getPluginName } = require('./packageJsonHelpers');
const { resolveContext, getContext } = require('./context');

/**
 * @param {string} name
 * @returns {Promise<void>}
 */
function replaceAssets(name) {
  const replaceTransform = new Transform({
    objectMode: true,
    transform(data, encoding, callback) {
      data.contents = Buffer.from(String(data.contents)
        .replace(/\.?\/?(assets|img|fonts|media)\//g, `plugins/${name}/$1/`));

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
    const zipStream = fs.createWriteStream(resolveContext('dist', `${name}.zip`));
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
      ['dist', 'config.json'],
      ['dist', `${name}.js`],
    ].forEach((fileArray) => {
      archive.file(resolveContext(...fileArray), { name: `${name}/${fileArray.pop()}` });
    });

    ['assets', 'img'].forEach((dir) => {
      if (fs.existsSync(resolveContext(dir))) {
        archive.directory(resolveContext(dir), `${name}/${dir}`);
      }
    });

    archive.finalize();
  });
}

/**
 * @param {ProdOptions} options
 * @returns {Promise<void>}
 */
function compile(options) {
  return getProdWebpackConfig(options)
    .then((webpackConfig) => {
      return new Promise((resolve, reject) => {
        webpack(webpackConfig, (err, stats) => {
          if (err) {
            logger.error(err);
            reject(err);
          } else if (stats.hasErrors()) {
            logger.log(stats.compilation.errors);
            reject(stats.compilation.errors[0].Error);
          } else {
            logger.success(`build ${options.pluginName}`);
            resolve();
          }
        });
      });
    });
}

/**
 * @param {ProdOptions} options
 * @returns {Promise<void>}
 */
async function pack(options) {
  options.pluginName = options.pluginName || await getPluginName();
  logger.spin(`building plugin: ${options.pluginName}`);
  await compile(options);
  await replaceAssets(options.pluginName);
  logger.debug('fixed asset paths');
  await ensureConfigJson();
  logger.debug('ensuring config.json');
  await zip(options.pluginName);
  logger.stopSpinner();
  logger.success('build finished');
}

module.exports = pack;
