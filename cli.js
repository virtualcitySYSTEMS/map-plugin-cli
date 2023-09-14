#!/usr/bin/env node
import { program } from 'commander';
import './src/defaultCommand.js';
import { create, serve, build, pack, preview, update } from './index.js';
import { version } from './src/pluginCliHelper.js';
import setupMapUi from './src/setupMapUi.js';
import buildStagingApp from './src/buildStagingApp.js';

program.version(version);

program.command('create').defaultOptions().safeAction(create);

program.command('pack').defaultOptions().safeAction(pack);

program
  .command('preview')
  .defaultOptions()
  .defaultServeOptions()
  .option('--vcm [url]', 'URL to a virtualcityMAP application', (val) =>
    val.replace(/\/$/, ''),
  )
  .safeAction(preview);

program
  .command('serve')
  .defaultOptions()
  .defaultServeOptions()
  .option(
    '--appConfig [config]',
    'an optional app config (either file or URL) to use',
  )
  .safeAction(serve);

program
  .command('build')
  .defaultOptions()
  .option('--development', 'set mode to development')
  .option('--watch', 'watch file changes')
  .safeAction(build);

program.command('buildStagingApp').defaultOptions().safeAction(buildStagingApp);

program.command('setup-map-ui').safeAction(setupMapUi);

program
  .command('update')
  .defaultOptions()
  .option(
    '--mapVersion [semver]',
    'an optional semver range to update to, e.g. 5.0 (Default is latest)',
  )
  .safeAction(update);

program.parse(process.argv);
