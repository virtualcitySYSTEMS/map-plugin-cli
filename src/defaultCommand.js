import { Command } from 'commander';
import { logger } from '@vcsuite/cli-logger';
import { setContext } from './context.js';

Command.prototype.defaultOptions = function defaultOptions() {
  this.option(
    '--context [path]',
    'an optional context, default is cwd',
    (value) => {
      setContext(value);
      return value;
    },
  );

  return this;
};

Command.prototype.defaultServeOptions = function defaultServeOptions() {
  this.option('-p, --port [port]', 'the port to listen on', /\d+/)
    .option(
      '--auth <user:password>',
      'an optional auth to append to proxy requests',
    )
    .option(
      '-c, --config <config>',
      'a config override to not use the default plugin config',
    )
    .option('--https', 'use https for serving');

  return this;
};

Command.prototype.safeAction = function safeAction(action) {
  this.action(async (options) => {
    try {
      await action(options);
    } catch (e) {
      if (e) {
        logger.error(e);
      }
      logger.stopSpinner();
      process.exit(1);
    }
  });
};
