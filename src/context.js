const path = require('path');
const fs = require('fs');

let context = null;

function setContext(c) {
  if (context) {
    throw new Error('cannot set context twice');
  }
  if (!fs.existsSync(c) || !fs.statSync(c).isDirectory()) {
    throw new Error('context must be an existing directory');
  }
  context = path.resolve(c);
}

function getContext() {
  return context || process.cwd();
}

function resolveContext(...dir) {
  return path.join(getContext(), ...dir);
}


module.exports = {
  getContext,
  resolveContext,
  setContext,
};
