import path from 'path';
import fs from 'fs';

let context = null;

export function setContext(c) {
  if (context) {
    throw new Error('cannot set context twice');
  }
  if (!fs.existsSync(c) || !fs.statSync(c).isDirectory()) {
    throw new Error('context must be an existing directory');
  }
  context = path.resolve(c);
}

export function getContext() {
  return context || process.cwd();
}

export function resolveContext(...dir) {
  return path.join(getContext(), ...dir);
}
