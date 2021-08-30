const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const semver = require('semver');
const util = require('util');
const childProcess = require('child_process');
const { logger } = require('@vcsuite/cli-logger');
const { version, name } = require('../package.json');
const { LicenseType, writeLicense } = require('./licenses');

/**
 * @typedef {Object} PluginTemplateOptions
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {Array<Object>} scripts
 * @property {string} author
 * @property {string} license
 * @property {string} mapVersion
 * @property {boolean} addDevDep
 */

/**
 * @param {PluginTemplateOptions} options
 */
async function createPluginTemplate(options) {
  if (!options.name) {
    logger.error('please provide a plugin name as input parameter');
    process.exit(1);
  }
  logger.info(`creating new plugin: ${options.name}`);

  const pluginPath = path.join(process.cwd(), options.name);
  if (fs.existsSync(pluginPath)) {
    logger.error('plugin with the provided name already exists');
    process.exit(1);
  }

  await fs.promises.mkdir(pluginPath);
  logger.debug('created plugin directory');

  const packageJson = {
    name: options.name,
    version: options.version,
    description: options.description,
    main: 'src/index.js',
    scripts: Object.assign({}, ...options.scripts),
    author: options.author,
    license: options.license,
    engines: {
      vcm: options.mapVersion,
    },
    dependencies: {},
    devDependencies: options.addDevDep ? { [name]: `^${version}` } : {},
  };

  const writePackagePromise = fs.promises.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const configJson = {
    name: options.name,
    version: options.version,
  };

  const writeConfigPromise = fs.promises.writeFile(
    path.join(pluginPath, 'config.json'),
    JSON.stringify(configJson, null, 2),
  );

  const writeReadmePromise = fs.promises.writeFile(
    path.join(pluginPath, 'README.md'),
    [
      `# ${options.name}`,
      'describe your plugin',
    ].join('\n'),
  );

  await fs.promises.mkdir(path.join(pluginPath, 'src'));
  logger.debug('created src directory');

  const writeIndexPromise = fs.promises.writeFile(
    path.join(pluginPath, 'src', 'index.js'),
    ['import { version } from \'../package.json\';',
      '',
      'export default {',
      '  version,',
      '  // preInitialize',
      '  // postInitialize',
      '  // registerUiPlugin',
      '  // postUiInitialize',
      '};'].join('\n'),
  );

  await Promise.all([
    writePackagePromise,
    writeConfigPromise,
    writeReadmePromise,
    writeIndexPromise,
    writeLicense(options.author, options.license, pluginPath),
  ]);

  logger.spin('installing dependencies...');
  const exec = util.promisify(childProcess.exec);
  try {
    const { stdout, stderr } = await exec('npm i', { cwd: pluginPath });
    logger.log(stdout);
    logger.error(stderr);
    logger.success('installed dependencies');
  } catch (e) {
    logger.error(e);
    logger.failure('installed dependencies');
  }
  logger.stopSpinner();
  logger.success('created plugin');
}

/**
 * @returns {Promise<void>}
 */
async function create() {
  const scriptChoices = [
    { title: 'build', value: { build: 'vcmplugin build' } },
    { title: 'pack', value: { pack: 'vcmplugin pack' } },
    { title: 'test', value: { test: 'echo "Error: no test specified" && exit 1' } },
  ];

  const questions = [
    {
      type: 'text',
      name: 'name',
      message: 'Name',
      validate: (value) => {
        if (!value) {
          return false;
        }

        if (fs.existsSync(path.join(process.cwd(), value))) {
          return `Directory ${value} already exists`;
        }
        return true;
      },
    },
    {
      type: 'text',
      name: 'version',
      message: 'Version',
      initial: '1.0.0',
      validate: value => !!semver.valid(value),
    },
    {
      type: 'text',
      name: 'description',
      message: 'Description',
      initial: '',
    },
    {
      type: 'multiselect',
      message: 'Add the following scripts to the package.json.',
      name: 'scripts',
      choices: scriptChoices,
      hint: '- Space to select. Enter to submit',
    },
    {
      type: 'text',
      name: 'author',
      message: 'Author',
      initial: 'author <email>',
    },
    {
      type: 'select',
      name: 'license',
      message: 'License',
      initial: 0,
      choices: Object.values(LicenseType)
        .map(type => ({
          title: type,
          value: type,
        })),
    },
    {
      type: 'text',
      name: 'mapVersion',
      message: 'Map version',
      initial: '>=4.0',
    },
    {
      type: 'toggle',
      name: 'addDevDep',
      message: 'Add vcmplugin-cli as dev dependency?',
      initial: true,
      active: 'yes',
      inactive: 'no',
    },
  ];

  const answers = await prompts(questions, { onCancel() { process.exit(0); } });

  await createPluginTemplate(answers);
}

module.exports = create;
