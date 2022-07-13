import fs from 'fs';
import { cp, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { getContext } from './context.js';
import { getConfigJson } from './hostingHelpers.js';
import { getPluginName } from './packageJsonHelpers.js';
import buildModule, { getDefaultConfig } from './build.js';
import setupMapUi from './setupMapUi.js';


/**
 * creates production preview application in the dist folder based on the @vcmap/ui default map configuration.
 * @returns {Promise<void>}
 */
export default async function buildStagingApp() {
  const pluginName = await getPluginName();
  const distPath = path.join(getContext(), 'dist');
  // Clear dist folder
  await fs.rm(distPath, { recursive: true, force: true });
  await fs.mkdir(distPath);
  await setupMapUi();
  const { buildPluginsForPreview } = await import('@vcmap/ui/build/buildHelpers.js');
  await buildPluginsForPreview(getDefaultConfig(), true);
  await fs.promises.mkdir(path.join(distPath, 'plugins', pluginName), { recursive: true });

  await buildModule({ outputPath: `plugins/${pluginName}`, keepDistFolder: true });
  await copyFile(
    path.join(getContext(), 'node_modules', '@vcmap', 'ui', 'dist', 'index.html'),
    path.join(distPath, 'index.html'),
  );
  const config = await getConfigJson();
  // update Entry
  const pluginConfig = config.plugins.find(p => p.name === pluginName);
  if (pluginConfig) {
    pluginConfig.entry = `plugins/${pluginName}/index.js`;
  }
  await writeFile(path.join(distPath, 'map.config.json'), JSON.stringify(config, null, 2));
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
}
