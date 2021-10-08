const path = require('path');

let context = null;

function setContext(c) {
  if (context) {
    throw new Error('cannot set context twice');
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
