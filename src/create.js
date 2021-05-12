const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const semver = require('semver');

/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} options.version
 * @param {string} options.description
 * @param {string} options.main
 * @param {Array<Object>} options.scripts
 * @param {string} options.author
 * @param {string} options.license
 * @param {string} options.mapVersion
 */
function createPluginTemplate(options) {
  if (!options.name) {
    console.error('please provide a plugin name as input parameter');
    process.exit(1);
  }
  console.log(`creating new plugin: ${options.name}`);

  const pluginPath = path.join(process.cwd(), options.name);
  fs.access(pluginPath, (rej) => {
    if (!rej) {
      console.error('plugin with the provided name already exists');
      process.exit(1);
    }
  });
  fs.mkdirSync(pluginPath, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('created plugin directory');
    }
  });

  const packageJson = {
    name: options.name,
    version: options.version,
    description: options.description,
    main: options.main,
    scripts: Object.assign({}, ...options.scripts),
    author: options.author,
    license: options.license,
    engines: {
      vcm: options.mapVersion,
    },
    dependencies: {},
  };

  fs.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('created package.json');
      }
    },
  );

  const configJson = {
    name: options.name,
    version: options.version,
  };

  fs.writeFile(
    path.join(pluginPath, 'config.json'),
    JSON.stringify(configJson, null, 2),
    (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('created config.json');
      }
    },
  );
  fs.writeFile(
    path.join(pluginPath, 'README.md'),
    [
      'describe your plugin',
    ],
    (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('created readme.md');
      }
    },
  );
  fs.mkdirSync(path.join(pluginPath, 'src'), (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('created src directory');
    }
  });
  fs.writeFile(
    path.join(pluginPath, 'src', 'index.js'),

    ['import { version } from \'../package.json\';',
      '\n',
      'export default {',
      '  version,',
      '  //preInitialize',
      '  //postInitialize',
      '  //registerUiPlugin',
      '  //postUiInitialize',
      '};'].join('\n'),
    (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('created index.js');
      }
    },
  );
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
      type: 'text',
      name: 'main',
      message: 'main',
      initial: 'src/index.js',
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
  ];

  const answers = await prompts(questions, { onCancel() { process.exit(0); } });

  await createPluginTemplate(answers);
}

module.exports = create;
