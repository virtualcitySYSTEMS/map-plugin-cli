#!/usr/bin/env node
import { program } from 'commander';
import './src/defaultCommand.js';
import { create, serve, build, pack, preview, update } from './index.js';
import { version } from './src/pluginCliHelper.js';
import setupMapUi from './src/setupMapUi.js';
import buildStagingApp from './src/buildStagingApp.js';

program.version(version);

program
  .command('create')
  .summary('create new plugin')
  .defaultOptions()
  .safeAction(create);

program
  .command('bundle')
  .summary('pack tar for production')
  .defaultOptions()
  .alias('pack')
  .safeAction(pack);

program
  .command('preview')
  .summary('start preview server')
  .defaultOptions()
  .defaultServeOptions()
  .option('--vcm [url]', 'URL to a virtualcityMAP application', (val) =>
    val.replace(/\/$/, ''),
  )
  .safeAction(preview);

program
  .command('serve')
  .summary('start dev server')
  .defaultOptions()
  .defaultServeOptions()
  .option(
    '--appConfig [config]',
    'an optional app config (either file or URL) to use',
  )
  .safeAction(serve);

program
  .command('build')
  .description('builds plugin including assets using vite')
  .defaultOptions()
  .option('--development', 'set mode to development')
  .option('--watch', 'watch file changes')
  .safeAction(build);

program.command('buildStagingApp').defaultOptions().safeAction(buildStagingApp);

program
  .command('setup-map-ui')
  .description('make other plugins of @vcmap/ui available in dev server')
  .safeAction(setupMapUi);

program
  .command('update')
  .description('update to (latest) VC Map version')
  .defaultOptions()
  .option(
    '--mapVersion [semver]',
    'an optional semver range to update to, e.g. 5.0 (Default is latest)',
  )
  .safeAction(update);

program.parse(process.argv);
