#!/usr/bin/env node
const program = require('commander');
require('./src/defaultCommand');
const { version } = require('./package.json');
const { serve, build, pack } = require('./index');

program.version(version);

program
  .command('pack')
  .defaultBuildOptions()
  .action(pack);

program
  .command('serve')
  .defaultOptions()
  .option('-p, --port [port]', 'the port to listen on', /\d+/, '8080')
  .option('--vcm [dir]', 'the directory path or URL to a virtualcityMAP application', './vcm')
  .option('--index [index.html]', 'the filename of the index.html to download. only used if vcm is a hosted application', 'index.html')
  .option('--auth <user:password>', 'an optional auth to append to proxy requests')
  .option('-c, --config <config>', 'a config override to not use the default plugin config')
  .option('--proxyRoute <route>', 'a route to proxy as well (e.g. if you have additional proxies on your server)', (val, prev) => {
    if (prev) {
      return [val];
    }
    prev.push(val);
    return prev;
  }, [])
  .action(serve);

program
  .command('build')
  .defaultBuildOptions()
  .option('--development', 'set mode to development')
  .option('--watch', 'watch file changes')
  .action(build);

program.parse(process.argv);
