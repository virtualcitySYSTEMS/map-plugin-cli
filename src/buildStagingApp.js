import { cp, copyFile, writeFile, rm, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { logger } from '@vcsuite/cli-logger';
import { getContext, resolveContext } from './context.js';
import { getAppConfigJson, resolveMapUi } from './hostingHelpers.js';
import { getPluginName } from './packageJsonHelpers.js';
import buildModule, { buildMapUI, getDefaultConfig } from './build.js';
import setupMapUi from './setupMapUi.js';
import { getVcmConfigJs } from './pluginCliHelper.js';

/**
 * creates production preview application in the dist folder based on the @vcmap/ui default configuration.
 * @returns {Promise<void>}
 */
export default async function buildStagingApp() {
  const pluginName = await getPluginName();
  const distPath = path.join(getContext(), 'dist');
  // Clear dist folder
  await rm(distPath, { recursive: true, force: true });
  await mkdir(distPath);
  await setupMapUi();
  const { buildPluginsForPreview } = await import(
    '@vcmap/ui/build/buildHelpers.js'
  );
  await buildPluginsForPreview(getDefaultConfig(), true);
  await mkdir(path.join(distPath, 'plugins', pluginName), { recursive: true });

  await buildModule({
    outputPath: `plugins/${pluginName}`,
    keepDistFolder: true,
  });

  // copy assets folder if exists
  if (fs.existsSync(resolveContext('plugin-assets'))) {
    await cp(
      resolveContext('plugin-assets'),
      path.join(distPath, 'plugins', pluginName, 'plugin-assets'),
      { recursive: true },
    );
  }

  // In case @vcmap/ui is linked via git+ssh, dist folder is not available and must be built first
  if (!fs.existsSync(resolveMapUi('dist'))) {
    await buildMapUI();
  }

  await copyFile(
    path.join(
      getContext(),
      'node_modules',
      '@vcmap',
      'ui',
      'dist',
      'index.html',
    ),
    path.join(distPath, 'index.html'),
  );
  const vcmConfigJs = await getVcmConfigJs();
  const appConfig = await getAppConfigJson(
    vcmConfigJs.appConfig,
    vcmConfigJs.auth,
    false,
    vcmConfigJs.config,
  );
  // update Entry
  const pluginConfig = appConfig.modules[0].plugins.find(
    (p) => p.name === pluginName,
  );
  if (pluginConfig) {
    pluginConfig.entry = `plugins/${pluginName}/index.js`;
  }
  await writeFile(
    path.join(distPath, 'app.config.json'),
    JSON.stringify(appConfig, null, 2),
  );
  await cp(
    path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'assets'),
    path.join(distPath, 'assets'),
    { recursive: true },
  );
  await cp(
    path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'config'),
    path.join(distPath, 'config'),
    { recursive: true },
  );
  logger.success('buildStagingApp finished');
}
