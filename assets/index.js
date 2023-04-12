import { version, name } from '../package.json';

/**
 * @typedef {Object} PluginState
 * @property {any} prop
 */

/**
 * @param {T} config - the configuration of this plugin instance, passed in from the app.
 * @param {string} baseUrl - the absolute URL from which the plugin was loaded (without filename, ending on /)
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<T, PluginState>}
 * @template {Object} T
 */
export default function plugin(config, baseUrl) {
  // eslint-disable-next-line no-console
  console.log(config, baseUrl);
  return {
    get name() {
      return name;
    },
    get version() {
      return version;
    },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @param {PluginState=} state
     * @returns {Promise<void>}
     */
    initialize: async (vcsUiApp, state) => {
      // eslint-disable-next-line no-console
      console.log(
        'Called before loading the rest of the current context. Passed in the containing Vcs UI App ',
        vcsUiApp,
        state,
      );
    },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @returns {Promise<void>}
     */
    onVcsAppMounted: async (vcsUiApp) => {
      // eslint-disable-next-line no-console
      console.log(
        'Called when the root UI component is mounted and managers are ready to accept components',
        vcsUiApp,
      );
    },
    /**
     * @returns {T}
     */
    toJSON() {
      // eslint-disable-next-line no-console
      console.log('Called when serializing this plugin instance');
      return {};
    },
    /**
     * should return the plugins state
     * @param {boolean} forUrl
     * @returns {PluginState}
     */
    getState(forUrl) {
      // eslint-disable-next-line no-console
      console.log('Called when collecting state, e.g. for create link', forUrl);
      return {
        prop: '*',
      };
    },
    destroy() {
      // eslint-disable-next-line no-console
      console.log('hook to cleanup');
    },
  };
}
