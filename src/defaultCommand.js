const { Command } = require('commander');

Command.prototype.defaultOptions = function defaultOptions() {
  this
    .option('-n, --plugin-name [name]', 'a name override to use. extracts the name from the package.json by default')
    .option('--no-condense-whitespace', 'do not condense white space')
    .option('-e, --entry <entry>', 'entrypoint override');

  return this;
};

Command.prototype.defaultBuildOptions = function defaultBuildOptions() {
  this
    .defaultOptions()
    .option('-l, --library [name]', 'whether to create a library with [name] or not')
    .option('--library-target [target]', 'library target', 'commonjs2');

  return this;
};
