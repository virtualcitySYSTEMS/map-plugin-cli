import { existsSync } from 'node:fs';
import { executeUiNpm, resolveMapUi } from './hostingHelpers.js';
import { getPackageJson } from './packageJsonHelpers.js';

export default async function ensureTypes() {
  const packageJson = await getPackageJson();
  if (packageJson.devDependencies?.typescript) {
    const indexTs = resolveMapUi('index.d.ts');

    if (!existsSync(indexTs)) {
      console.log('building types');
      await executeUiNpm('build-types -- --skipValidation');
    }
    console.log('types ensured');
  }
}
