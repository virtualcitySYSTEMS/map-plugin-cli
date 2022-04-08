<template>
  <v-sheet>
    <v-card class="pa-2 ma-2">
      <v-container>
        <v-row class="justify-center mb-4">
          <h1>Hello World</h1>
        </v-row>
        <v-row class="justify-center">
          <VcsButton
            icon="mdi-times"
            @click="closeSelf"
          >
            Close Window
          </VcsButton>
        </v-row>
      </v-container>
    </v-card>
  </v-sheet>
</template>

<script>
  import { inject } from '@vue/composition-api';
  import { VcsButton } from '@vcsuite/ui-components';

  export const windowId = 'hello_world_window_id';

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
