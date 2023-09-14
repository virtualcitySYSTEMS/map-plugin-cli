import { describe, it, expect, beforeAll } from 'vitest';
import plugin from '../src/index.js';
import { name } from '../package.json';

describe('sample test spec', () => {
  describe('plugin name', () => {
    let pluginInstance;
    beforeAll(() => {
      pluginInstance = plugin({}, 'localhost');
    });
    it('should return the plugin name from the package.json', () => {
      expect(pluginInstance.name).to.equal(name);
    });
  });
});
