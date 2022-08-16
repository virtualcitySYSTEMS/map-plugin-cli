<template>
  <v-sheet class="hello-world">
    <v-card class="pa-2 ma-2">
      <v-container>
        <v-row class="justify-center mb-4">
          <h1>{{ $t('helloWorld.helloWorld') }}</h1>
        </v-row>
        <v-row class="justify-center mb-4">
          <v-img
            :src="logoUrl"
            alt="plugin-assets example"
            max-width="200"
          />
        </v-row>
        <v-row class="justify-center">
          <VcsButton
            icon="mdi-times"
            @click="closeSelf"
          >
            {{ $t('helloWorld.close')}}
          </VcsButton>
        </v-row>
      </v-container>
    </v-card>
  </v-sheet>
</template>

<style>
.hello-world {
  background-color: aqua;
}
</style>
<script>
  import { inject } from 'vue';
  import { VcsButton, getPluginAssetUrl } from '@vcmap/ui';
  import { name } from '../package.json';

  export const windowId = 'hello_world_window_id_plugin-cli';

  export default {
    name: 'HelloWorld',
    components: { VcsButton },
    setup() {
      const app = inject('vcsApp');

      return {
        closeSelf() {
          app.windowManager.remove(windowId);
        },
        logoUrl: getPluginAssetUrl(app, name, 'plugin-assets/vcs_logo.png'),
      };
    },
  };
</script>
