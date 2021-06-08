<template>
  <a href="#/weather" class="vcm-btn-base-splash-hover" title="Weather Plugin">
    <i class="fa fa-lg fa-umbrella weather-btn" />
  </a>
</template>

<script>
export default {
  name: 'pluginButton'
}
</script>

<style scoped>
.weather-btn {
  position: absolute;
  top:9px;
  left: 7px;
  font-size:24px;
  color: grey;
}
</style>
