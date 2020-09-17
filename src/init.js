const fs = require('fs');
const { resolveContext } = require('./context');

async function init() {
  const packageJsonFileName = resolveContext('package.json');
  if (fs.existsSync(packageJsonFileName)) {

  }
}
