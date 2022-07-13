import { WindowSlot } from '@vcmap/ui';
import { version, name } from '../package.json';
import HelloWorld, { windowId } from './helloWorld.vue';

/**
 * @param {T} config - the configuration of this plugin instance, passed in from the app.
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<T>}
 * @template {Object} T
 * @template {Object} S
 */
export default function(config) {
  return {
    get name() { return name; },
    get version() { return version; },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @param {S=} state
     * @returns {Promise<void>}
     */
    initialize: async (vcsUiApp, state) => {
      console.log('Called before loading the rest of the current context. Passed in the containing Vcs UI App ');
    },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @returns {Promise<void>}
     */
    onVcsAppMounted: async (vcsUiApp) => {
      console.log('Called when the root UI component is mounted and managers are ready to accept components');
      vcsUiApp.windowManager.add({
        id: windowId,
        component: HelloWorld,
        WindowSlot: WindowSlot.DETACHED,
        position: {
          left: '40%',
          right: '40%',
        },
      }, name);
    },
    /**
     * @returns {Promise<S>}
     */
    getState: async () => {
      console.log('Called when serializing this plugin instance');
      return {};
    },
    /**
     * @returns {Promise<T>}
     */
    toJSON: async () => {
      console.log('Called when serializing this plugin instance');
      return {};
    },
    i18n: {
      en: {
        helloWorld: {
          helloWorld: 'Hello World',
          close: 'Close',
        },
      },
      de: {
        helloWorld: {
          helloWorld: 'Hallo Welt',
          close: 'Schließen',
        },
      },
    },
    destroy() {
      console.log('hook to cleanup');
    },
  };
};
