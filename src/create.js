import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import semver from 'semver';
import tar from 'tar';
import { logger } from '@vcsuite/cli-logger';
import { LicenseType, writeLicense } from './licenses.js';
import { DepType, installDeps, setVcMapVersion } from './packageJsonHelpers.js';
import { updatePeerDependencies } from './update.js';
import { name, version, promiseExec, getDirname } from './pluginCliHelper.js';

/**
 * @typedef {Object} PluginTemplateOptions
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {Array<Object>} scripts
 * @property {string} author
 * @property {string} repository
 * @property {string} license
 * @property {string} template
 * @property {Array<string>} peerDeps
 * @property {boolean} gitlabCi
 */

/**
 *
 * @param {PluginTemplateOptions} options
 * @returns {Object}
 */
function createPackageJson(options) {
  return {
    name: options.name,
    version: options.version,
    description: options.description,
    type: 'module',
    main: 'src/index.js',
    scripts: Object.assign(
      { prepublishOnly: 'vcmplugin build' },
      ...options.scripts,
    ),
    author: options.author,
    license: options.license,
    dependencies: {},
    keywords: ['vcmap', 'plugin'],
    files: [
      'src/',
      'dist/',
      'plugin-assets/',
      'LICENSE.md',
      'README.md',
      'CHANGELOG.md',
    ],
    exports: {
      '.': './src/index.js',
      './dist': './dist/index.js',
    },
  };
}

/**
 * @param {string} pluginName
 * @param {string} pluginPath
 * @param {string[]} filter - files or dirs to be extracted
 */
async function downloadAndExtractPluginTar(
  pluginName,
  pluginPath,
  filter = undefined,
) {
  const logMsg = filter ? filter.join(', ') : pluginName;
  logger.spin(`Downloading and extracting ${logMsg}`);
  const { stdout: packOut, stderr: packErr } = await promiseExec(
    `npm pack ${pluginName} --quiet`,
    { cwd: pluginPath },
  );
  logger.error(packErr);

  const tarName = packOut.trim();
  const tarPath = path.join(pluginPath, tarName);
  const extractOptions = {
    file: tarPath,
    cwd: pluginPath,
    strip: 4,
  };
  if (filter) {
    extractOptions.filter = (entryPath) =>
      filter.some((f) => entryPath.includes(f));
  }
  await tar.x(extractOptions);
  await fs.promises.rm(tarPath);
  logger.success(`Downloaded and extracted template ${logMsg}`);
  logger.stopSpinner();
}

/**
 * Copies an existing plugin as template and edits package.json
 * @param {PluginTemplateOptions} options
 * @param {string} pluginPath
 * @returns {Promise<void>}
 */
async function copyPluginTemplate(options, pluginPath) {
  await downloadAndExtractPluginTar('@vcmap/ui', pluginPath, [
    path.join('plugins', options.template),
  ]);

  const pluginPackageJson = JSON.parse(
    (
      await fs.promises.readFile(path.join(pluginPath, 'package.json'))
    ).toString(),
  );
  const userPackageJson = createPackageJson(options);
  const packageJson = { ...pluginPackageJson, ...userPackageJson };
  if (options.repository) {
    packageJson.repository = {
      url: options.repository,
    };
  } else {
    delete options.repository;
  }

  const writePackagePromise = fs.promises.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const configPath = path.join(pluginPath, 'config.json');
  const configJson = fs.existsSync(configPath)
    ? JSON.parse((await fs.promises.readFile(configPath)).toString())
    : {};
  configJson.name = options.name;

  const writeConfigPromise = fs.promises.writeFile(
    path.join(pluginPath, 'config.json'),
    JSON.stringify(configJson, null, 2),
  );

  await Promise.all([writePackagePromise, writeConfigPromise]);
  logger.debug('created plugin template');

  try {
    await updatePeerDependencies(packageJson.peerDependencies, pluginPath);
    logger.spin('installing dependencies... (this may take a while)');
    if (packageJson.dependencies) {
      const deps = Object.entries(packageJson.dependencies).map(
        ([depName, depVersion]) => `${depName}@${depVersion}`,
      );
      await installDeps(deps, DepType.DEP, pluginPath);
    }
    await installDeps([`${name}@${version}`], DepType.DEV, pluginPath);
    logger.success('Installed dependencies');
  } catch (e) {
    logger.error(e);
    logger.failure('Failed installing dependencies');
  }
  logger.stopSpinner();
}

/**
 * Creates a plugin from scratch
 * @param {PluginTemplateOptions} options
 * @param {string} pluginPath
 */
async function createPluginTemplate(options, pluginPath) {
  const installVitest =
    options.scripts && options.scripts.find((script) => script.test);
  if (!installVitest) {
    options.scripts.push({ test: 'echo "Error: no test specified" && exit 1' });
  } else {
    options.scripts.push({ coverage: 'vitest run --coverage' });
  }

  const packageJson = createPackageJson(options);

  if (options.repository) {
    packageJson.repository = {
      url: options.repository,
    };
  }

  const installEsLint = options.scripts.find((script) => script.lint);
  if (installEsLint) {
    packageJson.eslintIgnore = ['node_modules', 'dist', 'plugin-assets'];
    packageJson.eslintConfig = {
      root: true,
      extends: '@vcsuite/eslint-config/vue',
    };
    packageJson.prettier = '@vcsuite/eslint-config/prettier.js';
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

  await fs.promises.mkdir(path.join(pluginPath, 'src'));
  logger.debug('created src directory');

  const copyIndexPromise = fs.promises.copyFile(
    path.join(getDirname(), '..', 'assets', 'index.js'),
    path.join(pluginPath, 'src', 'index.js'),
  );

  await Promise.all([
    writePackagePromise,
    writeConfigPromise,
    copyIndexPromise,
  ]);

  if (installVitest) {
    logger.debug('setting up test environment');
    await fs.promises.cp(
      path.join(getDirname(), '..', 'assets', 'tests'),
      path.join(pluginPath, 'tests'),
      { recursive: true },
    );
    await fs.promises.copyFile(
      path.join(getDirname(), '..', 'assets', 'vitest.config.js'),
      path.join(pluginPath, 'vitest.config.js'),
    );
  }

  try {
    const peerDependencies = options.peerDeps.reduce(
      (obj, key) => ({ ...obj, [key]: 'latest' }),
      {},
    );
    await updatePeerDependencies(peerDependencies, pluginPath);
    logger.spin('installing dependencies... (this may take a while)');
    const devDeps = [`${name}@${version}`];
    if (installEsLint) {
      devDeps.push('@vcsuite/eslint-config');
    }
    if (installVitest) {
      devDeps.push(
        'vitest',
        '@vitest/coverage-c8',
        'jest-canvas-mock',
        'resize-observer-polyfill',
        'jsdom',
      );
    }
    await installDeps(devDeps, DepType.DEV, pluginPath);
    logger.success('Installed dependencies');
  } catch (e) {
    logger.error(e);
    logger.failure('Failed installing dependencies');
  }
  logger.stopSpinner();
}

/**
 * Creates a new plugin either by copying a template or from scratch
 * @param {PluginTemplateOptions} options
 */
async function createPlugin(options) {
  if (!options.name) {
    logger.error('please provide a plugin name as input parameter');
    process.exit(1);
  }
  logger.debug(`creating new plugin: ${options.name}`);

  const pluginPath = path.join(process.cwd(), options.name);
  if (fs.existsSync(pluginPath)) {
    logger.error('plugin with the provided name already exists');
    process.exit(1);
  }

  await fs.promises.mkdir(pluginPath);
  await fs.promises.mkdir(path.join(pluginPath, 'plugin-assets'));
  logger.debug('created plugin directory');

  const writeNpmrcPromise = fs.promises.writeFile(
    path.join(pluginPath, '.npmrc'),
    'registry=https://registry.npmjs.org\n',
  );

  const writeReadmePromise = fs.promises.writeFile(
    path.join(pluginPath, 'README.md'),
    [
      `# ${options.name}`,
      '> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)',
      'describe your plugin',
    ].join('\n'),
  );

  const writeChangesPromise = fs.promises.writeFile(
    path.join(pluginPath, 'CHANGELOG.md'),
    `# v${options.version}\nDocument features and fixes`,
  );

  const copyGitIgnorePromise = fs.promises.copyFile(
    path.join(getDirname(), '..', 'assets', 'gitignore'),
    path.join(pluginPath, '.gitignore'),
  );

  const copyPrettierIgnorePromise = fs.promises.copyFile(
    path.join(getDirname(), '..', 'assets', 'prettierignore'),
    path.join(pluginPath, '.prettierignore'),
  );

  await Promise.all([
    writeNpmrcPromise,
    writeReadmePromise,
    writeChangesPromise,
    writeLicense(options.author, options.license, pluginPath),
    copyGitIgnorePromise,
    copyPrettierIgnorePromise,
  ]);

  if (options.gitlabCi) {
    await fs.promises.copyFile(
      path.join(getDirname(), '..', 'assets', '.gitlab-ci.yml'),
      path.join(pluginPath, '.gitlab-ci.yml'),
    );
    await fs.promises.cp(
      path.join(getDirname(), '..', 'assets', 'build'),
      path.join(pluginPath, 'build'),
      { recursive: true },
    );
  }

  if (options.template) {
    await copyPluginTemplate(options, pluginPath);
  } else {
    await createPluginTemplate(options, pluginPath);
  }
  await setVcMapVersion(pluginPath);
  logger.success(`Created plugin ${options.name}`);
}

/**
 * @returns {Promise<void>}
 */
export default async function create() {
  const templateChoices = [
    { title: 'no template (basic structure)', value: null },
    { title: 'hello-world', value: '@vcmap-show-case/hello-world' },
    {
      title: 'context-menu-example',
      value: '@vcmap-show-case/context-menu-tester',
    },
    { title: 'feature-info-example', value: '@vcmap-show-case/simple-graph' },
    // to add further templates add a choice here
  ];

  const scriptChoices = [
    { title: 'build', value: { build: 'vcmplugin build' }, selected: true },
    { title: 'pack', value: { pack: 'vcmplugin pack' }, selected: true },
    { title: 'start', value: { start: 'vcmplugin serve' }, selected: true },
    {
      title: 'preview',
      value: { preview: 'vcmplugin preview' },
      selected: true,
    },
    {
      title: 'buildStagingApp',
      value: { buildStagingApp: 'vcmplugin buildStagingApp' },
      selected: true,
    },
    {
      title: 'lint',
      value: {
        'lint:js': 'eslint . --ext .vue,.js,.cjs,.mjs,.ts,.cts,.mts',
        'lint:prettier': 'prettier --check .',
        lint: 'npm run lint:js && npm run lint:prettier',
        format:
          'prettier --write --list-different . && npm run lint:js -- --fix',
      },
      selected: true,
    },
    { title: 'test', value: { test: 'vitest' }, selected: true },
  ];

  const peerDependencyChoices = [
    { title: '@vcmap/core', value: '@vcmap/core' },
    { title: '@vcmap-cesium/engine', value: '@vcmap-cesium/engine' },
    { title: 'ol', value: 'ol' },
    { title: 'vue', value: 'vue' },
    { title: 'vuetify', value: 'vuetify' },
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
      validate: (value) => !!semver.valid(value),
    },
    {
      type: 'text',
      name: 'description',
      message: 'Description',
      initial: '',
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
      choices: Object.values(LicenseType).map((type) => ({
        title: type,
        value: type,
      })),
    },
    {
      type: 'select',
      name: 'template',
      message: 'Choose an existing plugin as template',
      initial: 0,
      choices: templateChoices,
    },
    {
      type: 'multiselect',
      message: 'Add the following scripts to the package.json.',
      name: 'scripts',
      choices: scriptChoices,
      hint: '- Space to select. Enter to submit',
    },
    {
      type: (prev, values) => (!values.template ? 'multiselect' : null),
      name: 'peerDeps',
      message: 'Add the following peer dependencies to the package.json.',
      choices: peerDependencyChoices,
      hint: '- Space to select. Enter to submit',
    },
    {
      type: 'toggle',
      name: 'gitlabCi',
      message: 'Add gitlab-ci.yml?',
      initial: false,
      active: 'yes',
      inactive: 'no',
    },
  ];

  const answers = await prompts(questions, {
    onCancel() {
      process.exit(0);
    },
  });

  await createPlugin(answers);
}
