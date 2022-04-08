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
 * @property {string} repository
 * @property {string} license
 * @property {string} registry
 * @property {boolean} addCiCd
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
    scripts: Object.assign({ prepublishOnly: 'vcmplugin build' }, ...options.scripts),
    author: options.author,
    license: options.license,
    dependencies: {},
    keywords: [
      'vcmap',
      'plugin',
    ],
    files: [
      'src/',
      'dist/',
      'plugin-assets/',
      'LICENSE.md',
      'README.md',
    ],
    exports: {
      '.': './src/index.js',
      './dist': './dist/index.js',
    },
  };

  if (options.repository) {
    packageJson.repository = {
      url: options.repository,
    };
  }

  const installEsLint = options.scripts.find(script => script.lint);
  if (installEsLint) {
    packageJson.eslintIgnore = ['node_modules'];
    packageJson.eslintConfig = {
      root: true,
      extends: '@vcsuite/eslint-config/vue',
    };
  }

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

  const writeNpmrcPromise = fs.promises.writeFile(
    path.join(pluginPath, '.npmrc'),
    `registry=${options.registry}\n`,
  );

  const writeReadmePromise = fs.promises.writeFile(
    path.join(pluginPath, 'README.md'),
    [
      `# ${options.name}`,
      'describe your plugin',
    ].join('\n'),
  );

  const writeChangesPromise = fs.promises.writeFile(
    path.join(pluginPath, 'CHANGES.md'),
    `# v${options.version}\nDocument features and fixes`,
  );

  await fs.promises.mkdir(path.join(pluginPath, 'src'));
  logger.debug('created src directory');

  const copyTemplatePromise = fs.promises.cp(
    path.join(getDirname(), '..', 'assets', 'helloWorld'),
    pluginPath,
    { recursive: true },
  );

  await Promise.all([
    writePackagePromise,
    writeConfigPromise,
    writeNpmrcPromise,
    writeReadmePromise,
    writeChangesPromise,
    copyTemplatePromise,
    writeLicense(options.author, options.license, pluginPath),
  ]);


  logger.spin('installing dependencies... (this may take a while)');
  const exec = util.promisify(childProcess.exec);
  try {
    options.peerDeps.push('@vcmap/ui');
    const installCmd = `npm i --save-peer ${options.peerDeps.join(' ')}`;
    const { stdout, stderr } = await exec(installCmd, { cwd: pluginPath });
    logger.log(stdout);
    logger.error(stderr);
    const devDeps = [`${name}@${version}`];
    if (installEsLint) {
      devDeps.push('@vcsuite/eslint-config');
    }
    const installDevCmd = `npm i --save-dev ${devDeps.join(' ')}`;
    const { stdout: stdoutDev, stderr: stderrDev } = await exec(installDevCmd, { cwd: pluginPath });
    logger.log(stdoutDev);
    logger.error(stderrDev);
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
    { title: 'build', value: { build: 'vcmplugin build' }, selected: true },
    { title: 'pack', value: { pack: 'vcmplugin pack' }, selected: true },
    { title: 'start', value: { start: 'vcmplugin serve' }, selected: true },
    { title: 'preview', value: { preview: 'vcmplugin preview' }, selected: true },
    { title: 'lint', value: { lint: 'eslint "{src,tests}/**/*.{js,vue}"' }, selected: true },
  ];

  const peerDependencyChoices = [
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
      type: 'text',
      name: 'repository',
      message: 'Repository url',
      // initial: (prev, values) => `https://github.com/virtualcitySYSTEMS/${values.name}.git`,
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
      name: 'registry',
      message: 'Set default npm registry',
      initial: 'https://registry.npmjs.org',
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
      name: 'addCiCd',
      message: 'Add default VCS gitlab ci/cd?',
      initial: false,
      active: 'yes',
      inactive: 'no',
    },
  ];

  const answers = await prompts(questions, { onCancel() { process.exit(0); } });

  await createPluginTemplate(answers);
}
