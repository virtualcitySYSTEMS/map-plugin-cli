import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import semver from 'semver';
import util from 'util';
import childProcess from 'child_process';
import { logger } from '@vcsuite/cli-logger';
import { LicenseType, writeLicense } from './licenses.js';
import { getDirname } from './hostingHelpers.js';

export const { version, name } = JSON.parse(fs.readFileSync(path.join(getDirname(), '..', 'package.json')).toString());

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
 * @property {Array<string>} peerDeps
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
  await fs.promises.mkdir(path.join(pluginPath, 'plugin-assets'));
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
    devDependencies: options.addDevDep ? { [name]: `^${version}` } : {}, // XXX should we add all our deps here? cesium, ol, vue etc.
  };

  const writePackagePromise = fs.promises.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const configJson = {
    name: options.name,
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
    [
      'import { version, name } from \'../package.json\';',
      '',
      '/**',
      ' * @param {VcsApp} app - the app from which this plugin is loaded.',
      ' * @param {Object} config - the configuration of this plugin instance, passed in from the app.',
      ' */',
      'export default function(app, config) {',
      '  return {',
      '    get name() { return name; },',
      '    get version() { return version; },',
      '    initialize: async (vcsUiApp) => { console.log(\'Called before loading the rest of the current context. Passed in the containing Vcs UI App \'); },',
      '    onVcsAppMounted: async (vcsUiApp) => { console.log(\'Called when the root UI component is mounted and managers are ready to accept components\'); },',
      '    toJSON: async () => { console.log(\'Called when serializing this plugin instance\'); },',
      '  };',
      '};',
      '',
    ].join('\n'),
  );

  await Promise.all([
    writePackagePromise,
    writeConfigPromise,
    writeReadmePromise,
    writeIndexPromise,
    writeLicense(options.author, options.license, pluginPath),
  ]);


  logger.spin('installing dependencies... (this may take a while)');
  const exec = util.promisify(childProcess.exec);
  try {
    let installCmd = 'npm i';
    if (options.peerDeps.length > 0) {
      installCmd = `${installCmd} --save-peer ${options.peerDeps.join(' ')}`;
    }
    const { stdout, stderr } = await exec(installCmd, { cwd: pluginPath });
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
export default async function create() {
  const scriptChoices = [
    { title: 'build', value: { build: 'vcmplugin build' } },
    { title: 'pack', value: { pack: 'vcmplugin pack' } },
    { title: 'start', value: { start: 'vcmplugin serve' } },
    { title: 'preview', value: { preview: 'vcmplugin preview' } },
    { title: 'test', value: { test: 'echo "Error: no test specified" && exit 1' } },
  ];

  const peerDependencyChoices = [
    { title: '@vcmap/ui', value: '@vcmap/ui', selected: true },
    { title: '@vcsuite/ui-components', value: '@vcsuite/ui-components', selected: true },
    { title: '@vcmap/core', value: '@vcmap/core' },
    { title: '@vcmap/cesium', value: '@vcmap/cesium' },
    { title: 'ol', value: 'ol@~6.13.0' },
    { title: '@vue/composition-api', value: '@vue/composition-api@~1.4.5' },
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
      initial: '>=5.0',
    },
    {
      name: 'peerDeps',
      type: 'multiselect',
      message: 'Add the following peer dependencies to the package.json.',
      choices: peerDependencyChoices,
      hint: '- Space to select. Enter to submit',
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
