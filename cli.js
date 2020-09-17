#!/usr/bin/env node
const program = require('commander');
require('./src/defaultCommand');
const { version } = require('./package.json');
const { serve, build, compile } = require('./index');

program.version(version);

program
  .command('build')
  .defaultBuildOptions()
  .action(build);

program
  .command('serve')
  .defaultOptions()
  .option('-p, --port [port]', 'the port to listen on', /\d+/, '8080')
  .option('--vcm [dir]', 'the directory path or URL to a virtualcityMAP application', './vcm')
  .action(serve);

program
  .command('compile')
  .defaultBuildOptions()
  .option('--no-modern', 'build for legacy')
  .action(compile);

program.parse(process.argv);
