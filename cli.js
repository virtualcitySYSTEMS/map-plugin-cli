#!/usr/bin/env node
const program = require('commander');
const { version } = require('./package.json');
const { serve } = require('./index');

program.version(version);

program
  .command('serve')
  .option('-p, --port [port]', 'the port to listen on', /\d+/, '8080')
  .option('--vcm [dir]', 'the directory path or URL to a virtualcityMAP application', './vcm')
  .action(serve);

program.parse(process.argv);
