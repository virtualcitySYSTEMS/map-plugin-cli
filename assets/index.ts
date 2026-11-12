import type { VcsPlugin, VcsUiApp, PluginConfigEditor } from '@vcmap/ui';
import packageJson from '../package.json' with { type: 'json' };

type PluginConfig = Record<string, never>;
type PluginState = Record<string, never>;

type MyPlugin = VcsPlugin<PluginConfig, PluginState>;

export default function plugin(
  config: PluginConfig,
  baseUrl: string,
): MyPlugin {
  // eslint-disable-next-line no-console
  console.log(config, baseUrl);
  return {
    get name(): string {
      return packageJson.name;
    },
    get version(): string {
      return packageJson.version;
    },
    get mapVersion(): string {
      return packageJson.mapVersion;
    },
    initialize(vcsUiApp: VcsUiApp, state?: PluginState): Promise<void> {
      // eslint-disable-next-line no-console
      console.log(
        'Called before loading the rest of the current context. Passed in the containing Vcs UI App ',
        vcsUiApp,
        state,
      );
      return Promise.resolve();
    },
    onVcsAppMounted(vcsUiApp: VcsUiApp): void {
      // eslint-disable-next-line no-console
      console.log(
        'Called when the root UI component is mounted and managers are ready to accept components',
        vcsUiApp,
      );
    },
    /**
     * should return all default values of the configuration
     */
    getDefaultOptions(): PluginConfig {
      return {};
    },
    /**
     * should return the plugin's serialization excluding all default values
     */
    toJSON(): PluginConfig {
      // eslint-disable-next-line no-console
      console.log('Called when serializing this plugin instance');
      return {};
    },
    /**
     * should return the plugins state
     * @param {boolean} forUrl
     * @returns {PluginState}
     */
    getState(forUrl?: boolean): PluginState {
      // eslint-disable-next-line no-console
      console.log('Called when collecting state, e.g. for create link', forUrl);
      return {
        prop: '*',
      };
    },
    /**
     * components for configuring the plugin and/ or custom items defined by the plugin
     */
    getConfigEditors(): PluginConfigEditor<object>[] {
      return [];
    },
    destroy(): void {
      // eslint-disable-next-line no-console
      console.log('hook to cleanup');
    },
  };
}
