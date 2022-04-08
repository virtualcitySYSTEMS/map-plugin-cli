import { logger } from '@vcsuite/cli-logger';
import { executeUiNpm } from './hostingHelpers.js';

export default async function setupMapUi() {
  logger.spin('installing dev plugins in @vcmap/ui');
  await executeUiNpm('install-plugins');
  logger.stopSpinner();
  logger.info('dev plugins installed');
}
