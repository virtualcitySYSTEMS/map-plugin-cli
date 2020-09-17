#!/usr/bin/env node
const program = require('commander');
const { version } = require('./package.json');
const { serve, build } = require('./index');

program.version(version);

program
  .command('build')
  .option('-n, --plugin-name [name]', 'a name override to use. extracts the name from the package.json by default')
  .option('--no-condense-whitespace', 'do not condense white space')
  .action(build);

program
  .command('serve')
  .option('-n, --plugin-name [name]', 'a name override to use. extracts the name from the package.json by default')
  .option('-p, --port [port]', 'the port to listen on', /\d+/, '8080')
  .option('--vcm [dir]', 'the directory path or URL to a virtualcityMAP application', './vcm')
  .action(serve);

program
  .command('compile')
  .option('-n, --plugin-name [name]', 'a name override to use. extracts the name from the package.json by default')
  .option('--no-condense-whitespace', 'do not condense white space')
  .option('-l, --library [name]', 'whether to create a library with [name] or not')
  .option('--library-target', 'library target', 'commonjs2');

program.parse(process.argv);
