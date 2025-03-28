import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VcsPlugin } from '@vcmap/ui';
import { VcsUiApp, loadPlugin, isValidPackageName } from '@vcmap/ui';
import plugin from '../src/index.js';
import packageJSON from '../package.json';

function sleep(ms = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type TestPluginInstance = VcsPlugin<object, object>;

// @ts-expect-error: not defined on global
window.VcsPluginLoaderFunction = (): {
  default: (config: object, module: string) => TestPluginInstance;
} => ({
  // @ts-expect-error: interface may not use this
  default: (config, baseUrl) => plugin(config, baseUrl),
});

const testPropSymbol = Symbol('testProp');

describe('VcsPlugin Interface test', () => {
  let pluginInstance: TestPluginInstance | null;

  beforeAll(async () => {
    pluginInstance = await loadPlugin(packageJSON.name, {
      name: packageJSON.name,
      entry: '_dev',
    });
  });

  afterAll(() => {
    pluginInstance?.destroy?.();
  });

  describe('name, version, mapVersion', () => {
    it('should return a valid plugin name from the package.json', () => {
      expect(pluginInstance).to.have.property('name', packageJSON.name);
      expect(isValidPackageName(pluginInstance.name)).to.be.true;
    });

    it('should return the plugin version from the package.json', () => {
      expect(pluginInstance).to.have.property('version', packageJSON.version);
    });

    it('should return the plugin mapVersion from the package.json', () => {
      expect(pluginInstance).to.have.property(
        'mapVersion',
        packageJSON.mapVersion,
      );
    });
  });

  describe('internationalization', () => {
    it('may provide an i18n object and should provide at least en as fallback language', () => {
      if (pluginInstance?.i18n) {
        expect(pluginInstance?.i18n).to.be.a('object').with.property('en');
      }
    });

    it('should use unscoped, camel-case plugin name as namespace for plugin specific i18n entries', () => {
      if (pluginInstance?.i18n) {
        expect(pluginInstance.i18n).to.be.a('object');
        const [scope, name] = packageJSON.name.split('/');
        const unscopedName = name || scope;
        const camelCaseName = unscopedName.replace(/-./g, (x: string) =>
          x[1].toUpperCase(),
        );
        Object.values(pluginInstance.i18n).forEach((locale) => {
          expect(locale).to.have.property(camelCaseName);
        });
      }
    });
  });

  describe('plugin hooks', () => {
    it('may implement initialize', () => {
      if (pluginInstance?.initialize) {
        expect(pluginInstance.initialize).to.be.a('function');
        expect(pluginInstance.initialize(new VcsUiApp(), undefined)).to.not
          .throw;
      }
    });

    it('may implement onVcsAppMounted', () => {
      if (pluginInstance?.onVcsAppMounted) {
        expect(pluginInstance.onVcsAppMounted).to.be.a('function');
        expect(() => {
          pluginInstance.onVcsAppMounted(new VcsUiApp());
        }).to.not.throw;
      }
    });

    it('should implement destroy', () => {
      if (pluginInstance?.destroy) {
        expect(pluginInstance.destroy).to.be.a('function');
      }
    });
  });

  describe('options & serialization', () => {
    it('may return default options', () => {
      if (pluginInstance?.getDefaultOptions) {
        expect(pluginInstance.getDefaultOptions()).to.be.a('object');
      }
    });

    it('may implement toJSON returning the plugin config', () => {
      if (pluginInstance?.toJSON) {
        expect(pluginInstance.toJSON()).to.be.a('object');
      }
    });
  });

  describe('shadowing a plugin', () => {
    let app: VcsUiApp;
    let pluginInstance2:
      | (TestPluginInstance & { [testPropSymbol]?: string })
      | null;

    beforeAll(async () => {
      app = new VcsUiApp();
      app.plugins.add(pluginInstance!);
      pluginInstance2 = await loadPlugin(packageJSON.name, {
        name: packageJSON.name,
        version: '2.0.0',
        entry: '_dev',
      });
      if (pluginInstance2) {
        pluginInstance2[testPropSymbol] = 'test';
      }
    });

    afterAll(() => {
      pluginInstance2?.destroy?.();
    });

    it('should override the plugin correctly', () => {
      expect(() => app.plugins.override(pluginInstance2!)).to.not.throw;
      app.plugins.override(pluginInstance2!);
      expect(app.plugins.getByKey(packageJSON.name)).to.have.property(
        testPropSymbol,
        'test',
      );
      expect(app.plugins.getByKey(packageJSON.name)).to.equal(pluginInstance2);
    });

    it('should reincarnate the plugin correctly', async () => {
      expect(() => {
        app.plugins.remove(pluginInstance2!);
      }).to.not.throw;
      app.plugins.remove(pluginInstance2!);
      await sleep(0);
      expect(app.plugins.getByKey(packageJSON.name)).not.to.have.property(
        testPropSymbol,
        'test',
      );
    });
  });
});
