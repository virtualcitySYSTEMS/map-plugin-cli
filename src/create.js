const fs = require('fs');
const path = require('path');

/**
 * @param {string} pluginName
 */
function createPluginTemplate(pluginName) {
  if (!pluginName) {
    console.error('please provide a plugin name as input parameter');
    process.exit(1);
  }
  console.log(`creating new plugin: ${pluginName}`);

  const pluginPath = path.join(process.cwd(), pluginName);
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
    name: pluginName,
    version: '1.0.0',
    description: '',
    main: 'src/index.js',
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
    },
    author: '',
    license: 'ISC',
    dependencies: {

    },
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
 * @param {string} pluginName
 * @returns {Promise<void>}
 */
async function create(pluginName) {
  await createPluginTemplate(pluginName);
}

module.exports = create;
