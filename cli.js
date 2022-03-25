#!/usr/bin/env node
import program from 'commander';
import './src/defaultCommand.js';
import { create, serve, build, pack, preview } from './index.js';
import { version } from './src/create.js';

program.version(version);

program
  .command('create')
  .defaultOptions()
  .safeAction(create);

program
  .command('pack')
  .defaultOptions()
  .safeAction(pack);

program
  .command('preview')
  .defaultOptions()
  .defaultServeOptions()
  .option('--vcm [url]', 'URL to a virtualcityMAP application', val => val.replace(/\/$/, ''))
  .option('--proxyRoute <route>', 'a route to proxy as well (e.g. if you have additional proxies on your server)', (val, prev) => {
    if (!prev) {
      return [val];
    }
    prev.push(val);
    return prev;
  }, [])
  .safeAction(preview);

program
  .command('serve')
  .defaultOptions()
  .defaultServeOptions()
  .option('--mapConfig [config]', 'an optional map config (either file or URL) to use')
  .safeAction(serve);

program
  .command('build')
  .defaultOptions()
  .option('--development', 'set mode to development')
  .option('--watch', 'watch file changes')
  .safeAction(build);

program.parse(process.argv);
