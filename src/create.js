import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { minVersion, parse, prerelease, valid } from 'semver';
import tar from 'tar';
import { logger } from '@vcsuite/cli-logger';
import { LicenseType, writeLicense } from './licenses.js';
import { DepType, installDeps, setVcMapVersion } from './packageJsonHelpers.js';
import { updatePeerDependencies } from './update.js';
import {
  name,
  version,
  promiseExec,
  getDirname,
  peerDependencies as cliPeerDependencies,
} from './pluginCliHelper.js';

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
 * @property {boolean} typescript
 */

/**
 *
 * @param {PluginTemplateOptions} options
 * @returns {Object}
 */
function createPackageJson(options) {
  const typescriptScripts = options.typescript
    ? {
        'type-check': 'vue-tsc --noEmit',
        'ensure-types': 'vcmplugin ensure-types',
      }
    : {};
  const main = options.typescript ? 'dist/index.js' : 'src/index.js';
  return {
    name: options.name,
    version: options.version,
    description: options.description,
    type: 'module',
    main,
    scripts: Object.assign(
      {
        prepublishOnly: 'vcmplugin build',
      },
      ...options.scripts,
      typescriptScripts,
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
      '.': options.typescript ? 'dist/index.js' : 'src/index.js',
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
    keep: true,
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
    path.posix.join('plugins', options.template), // tar x filter requires linux path
  ]);

  const configPath = path.join(pluginPath, 'config.json');
  const configJson = fs.existsSync(configPath)
    ? JSON.parse((await fs.promises.readFile(configPath)).toString())
    : {};
  configJson.name = options.name;

  await fs.promises.writeFile(
    path.join(pluginPath, 'config.json'),
    JSON.stringify(configJson, null, 2),
  );
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
    if (!options.typescript) {
      packageJson.eslintConfig = {
        root: true,
        extends: '@vcsuite/eslint-config/vue',
      };
    } else {
      await fs.promises.copyFile(
        path.join(getDirname(), '..', 'assets', 'eslintrc.cjs'),
        path.join(pluginPath, '.eslintrc.cjs'),
      );
    }
    packageJson.prettier = '@vcsuite/eslint-config/prettier.js';
  }

  await fs.promises.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const configJson = {
    name: options.name,
  };

  await fs.promises.writeFile(
    path.join(pluginPath, 'config.json'),
    JSON.stringify(configJson, null, 2),
  );

  if (options.template) {
    await copyPluginTemplate(options, pluginPath);
  } else {
    const srcPath = path.join(pluginPath, 'src');
    if (!fs.existsSync(srcPath)) {
      await fs.promises.mkdir(srcPath);
      logger.debug('created src directory');
    }

    const indexFile = options.typescript ? 'index.ts' : 'index.js';
    await fs.promises.copyFile(
      path.join(getDirname(), '..', 'assets', indexFile),
      path.join(pluginPath, 'src', indexFile),
    );
  }

  if (installVitest) {
    logger.debug('setting up test environment');
    await fs.promises.cp(
      path.join(getDirname(), '..', 'assets', 'tests'),
      path.join(pluginPath, 'tests'),
      { recursive: true },
    );
    if (options.typescript) {
      await fs.promises.rm(
        path.join(pluginPath, 'tests', 'vcsPluginInterface.spec.js'),
      );
      await fs.promises.cp(
        path.join(getDirname(), '..', 'assets', 'testsTypescript'),
        path.join(pluginPath, 'tests'),
        { recursive: true },
      );
      await fs.promises.copyFile(
        path.join(getDirname(), '..', 'assets', 'eslintrcTests.cjs'),
        path.join(pluginPath, '.eslintrc.cjs'),
      );
    }
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

    if (cliPeerDependencies['@vcmap/ui'].startsWith('git')) {
      logger.warning('installing git ui peer dependency');
      const peerDeps = [
        cliPeerDependencies['@vcmap/ui'],
        ...Object.keys(peerDependencies),
      ];
      await installDeps(peerDeps, DepType.PEER, pluginPath);
    } else {
      let mapVersion;
      const mapSemver = parse(minVersion(cliPeerDependencies['@vcmap/ui']));
      if (prerelease(mapSemver)) {
        const { major, minor, patch } = mapSemver;
        mapVersion = `^${major}.${minor}.${patch}-rc`;
      } else {
        const { major, minor } = mapSemver;
        mapVersion = `^${major}.${minor}`;
      }

      await updatePeerDependencies(peerDependencies, pluginPath, {
        mapVersion,
      });
    }

    logger.spin('installing dependencies... (this may take a while)');
    const devDeps = [`${name}@${version}`];
    if (installEsLint) {
      devDeps.push('@vcsuite/eslint-config');
    }
    if (installVitest) {
      devDeps.push(
        'vitest',
        '@vitest/coverage-v8',
        'jest-canvas-mock',
        'resize-observer-polyfill',
        'jsdom',
      );
    }
    if (options.typescript) {
      devDeps.push('typescript', 'vue-tsc');
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
    const gitlabFile = options.typescript
      ? 'ts.gitlab-ci.yml'
      : '.gitlab-ci.yml';
    await fs.promises.copyFile(
      path.join(getDirname(), '..', 'assets', gitlabFile),
      path.join(pluginPath, '.gitlab-ci.yml'),
    );
    await fs.promises.cp(
      path.join(getDirname(), '..', 'assets', 'build'),
      path.join(pluginPath, 'build'),
      { recursive: true },
    );
  }

  if (options.typescript) {
    await fs.promises.copyFile(
      path.join(getDirname(), '..', 'assets', 'tsconfig.json'),
      path.join(pluginPath, 'tsconfig.json'),
    );
    await fs.promises.copyFile(
      path.join(getDirname(), '..', 'assets', 'eslintrc.cjs'),
      path.join(pluginPath, '.eslintrc.cjs'),
    );
  }

  await createPluginTemplate(options, pluginPath);
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
    { title: 'bundle', value: { bundle: 'vcmplugin bundle' }, selected: true },
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
      validate: (value) => !!valid(value),
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
      type: 'toggle',
      name: 'typescript',
      message: 'Create plugin using typescript (recommended).',
      initial: true,
      active: 'yes',
      inactive: 'no',
    },
    {
      type: 'select',
      name: 'template',
      message: 'Choose an existing plugin as template',
      initial: 0,
      choices: templateChoices,
    },
    {
      type: (prev, values) => (values.typescript && prev ? 'confirm' : null),
      name: 'keepTs',
      message:
        'The selected template is not in typescript. You will have to manually transform it. Keep typescript?',
      initial: true,
    },
    {
      type: 'multiselect',
      message: 'Add the following scripts to the package.json.',
      name: 'scripts',
      choices: scriptChoices,
      hint: '- Space to select. Enter to submit',
    },
    {
      type: 'multiselect',
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

  if (answers.template && answers.typescript) {
    answers.typescript = !!answers.keepTs;
  }

  await createPlugin(answers);
}
