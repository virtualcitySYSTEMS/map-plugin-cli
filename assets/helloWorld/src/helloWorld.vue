<template>
  <v-sheet>
    <v-card class="pa-2 ma-2">
      <v-container>
        <v-row class="justify-center mb-4">
          <h1>{{ $t('helloWorld.helloWorld')}}</h1>
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

<script>
  import { inject } from 'vue';
  import { VcsButton } from '@vcmap/ui';

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
      };
    },
  };
</script>
