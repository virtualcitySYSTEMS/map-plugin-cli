import path from 'path';
import { build } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import vcsOl from '@vcmap/rollup-plugin-vcs-ol';
import { logger } from '@vcsuite/cli-logger';
import { VuetifyResolver } from 'unplugin-vue-components/dist/resolvers.js';
import Components from 'unplugin-vue-components/dist/vite.js';
import { getPluginEntry, getPluginName } from './packageJsonHelpers.js';

/**
 * @typedef {Object} BuildOptions
 * @property {boolean} [development]
 * @property {boolean} [watch]
 */

/**
 * @param {string} pluginName
 * @returns {Object<string, string>}
 */
export function getLibraryPaths(pluginName) {
  const pluginPath = path.join('plugins', ...pluginName.split('/'));

  const libraries = {
    vue: 'vue',
    '@vue/composition-api': 'vue-composition-api',
    '@vcmap/cesium': 'cesium',
    ol: 'ol',
    '@vcmap/core': 'core',
    'vuetify/lib': 'vuetify',
    '@vcsuite/ui-components': 'uicomponents',
    '@vcmap/ui': 'ui',
  };

  Object.entries(libraries).forEach(([library, assetName]) => {
    const assetPath = path.join('assets', `${assetName}.js`);

    libraries[library] = path.relative(pluginPath, assetPath);
  });
  return libraries;
}

/**
 * @param {BuildOptions} options
 * @param {boolean} [preview]
 * @returns {Promise<void>}
 */
export default async function buildModule(options, preview) {
  const entry = await getPluginEntry();
  if (path.relative('src', entry).startsWith('.')) {
    logger.warning(`detected irregular entry ${entry}`);
    logger.warning('vuetify component resolution expects source files to be within "src"');
  }

  const pluginName = await getPluginName();
  const libraries = getLibraryPaths(pluginName);

  await build({
    publicDir: false,
    plugins: [
      createVuePlugin(),
      Components({
        resolvers: [
          VuetifyResolver(),
        ],
        dirs: ['./src'],
        include: [],
        exclude: [],
      }),
      vcsOl(),
      {
        name: 'pluginCssLoaderPrefix',
        generateBundle(opts, bundle) {
          const indexJs = bundle['index.js'];
          if (indexJs && indexJs.code) {
            const resource = preview ?
              './dist/style.css' :
              `./plugins/${pluginName}/style.css`;

            indexJs.code = `
function loadCss(href) {
  return new Promise((resolve, reject) => {
    const elem = document.createElement('link');
    elem.rel = 'stylesheet';
    elem.href = href;
    elem.defer = false;
    elem.async = false;
    elem.onload = resolve;
    elem.onerror = reject;
    document.head.appendChild(elem);
  });
}
await loadCss('${resource}');
${indexJs.code}
`;
          }
        },
      },
    ],
    esbuild: {
      minify: !options.development,
    },
    build: {
      emptyOutDir: true,
      lib: {
        entry,
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: Object.keys(libraries),
        output: {
          paths: libraries,
        },
      },
      watch: options.watch ? {} : null,
    },
  });
}
