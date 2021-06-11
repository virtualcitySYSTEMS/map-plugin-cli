const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const semver = require('semver');
const util = require('util');
const childProcess = require('child_process');
const { version } = require('../package.json');

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
    console.error('please provide a plugin name as input parameter');
    process.exit(1);
  }
  console.log(`creating new plugin: ${options.name}`);

  const pluginPath = path.join(process.cwd(), options.name);
  if (fs.existsSync(pluginPath)) {
    console.error('plugin with the provided name already exists');
    process.exit(1);
  }

  await fs.promises.mkdir(pluginPath);
  console.log('created plugin directory');

  const packageJson = {
    name: options.name,
    version: options.version,
    description: options.description,
    main: 'src/index.js',
    type: 'module',
    scripts: Object.assign({}, ...options.scripts),
    author: options.author,
    license: options.license,
    engines: {
      vcm: options.mapVersion,
    },
    dependencies: {},
    devDependencies: options.addDevDep ? { 'vcmplugin-cli': `^${version}` } : {},
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
  console.log('created src directory');

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

  await Promise.all([writePackagePromise, writeConfigPromise, writeReadmePromise, writeIndexPromise]);

  console.log('installing dependencies...');
  const exec = util.promisify(childProcess.exec);
  try {
    const { stdout, stderr } = await exec('npm i', { cwd: pluginPath });
    console.log(stdout);
    console.error(stderr);
  } catch (e) {
    console.error(e);
  }
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
      validate: value => !!value,
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
      type: 'text',
      name: 'license',
      message: 'License',
      initial: 'ISC',
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
