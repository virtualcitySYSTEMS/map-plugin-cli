<template>
  <div>
    <div>
      <CloseButton></CloseButton>
      <h2>{{$t('i18n_weather_title')}}</h2>
    </div>
    <div class="scroll-wrap">
      <div>
        <label id="weather_system_label" for="weather_system_input">{{$t('i18n_weather_system_input')}}</label>
        <select id="weather_system_input" v-model="selectedSystem" @change="start">
          <option v-for="system in weatherSystems" :value="system.id">{{ system.name }}</option>
        </select>
        <br>
        <label id="weather_intensity_label" for="weather_system_input">{{$t('i18n_weather_intensity')}}</label>
        <input v-model="intensity" type="number" :min="2000" :max="10000" :step="1" @change="start"/>
      </div>
      <div class="buttons">
        <button class="vcm-btn-project-list" @click="start">{{$t('i18n_weather_start')}}</button>
        <button class="vcm-btn-project-list" @click="stop">{{$t('i18n_weather_stop')}}</button>
        <br>
        <br>
        <button class="vcm-btn-project-list" @click="updateLocation">{{$t('i18n_weather_update')}}</button>
      </div>
    </div>
  </div>
</template>
<script>
import Weather from '../api/weather';

export default {
  name: 'weatherComponent',
  i18n: {
    messages: {
      de: {
        i18n_weather_title: 'Wetter Plugin',
        i18n_weather_system_input: 'Wetter: ',
        i18n_weather_snow: 'Schnee',
        i18n_weather_rain: 'Regen',
        i18n_weather_intensity: 'Intensität',
        i18n_weather_start: 'Start',
        i18n_weather_stop: 'Stop',
        i18n_weather_update: 'Aktualisiere Lage',
      },
      en: {
        i18n_weather_title: 'Weather Plugin',
        i18n_weather_system_input: 'Weather: ',
        i18n_weather_snow: 'Snow',
        i18n_weather_rain: 'Rain',
        i18n_weather_intensity: 'Intensity',
        i18n_weather_start: 'Start',
        i18n_weather_stop: 'Stop',
        i18n_weather_update: 'Update Location',
      },
    },
  },
  data() {
    return {
      weatherSystems: [
        { id: 'rain', name: this.$t('i18n_weather_rain') },
        { id: 'snow', name: this.$t('i18n_weather_snow') },
      ],
      selectedSystem: 'rain',
      intensity: 5000,
    };
  },
  methods: {
    start() {
      const weather = Weather.getInstance();
      weather.start(this.selectedSystem, this.intensity);
      weather.updateLocation();
    },
    stop() {
      const weather = Weather.getInstance();
      weather.stop();
    },
    updateLocation() {
      const weather = Weather.getInstance();
      weather.updateLocation();
    },
  },
};
</script>
<style scoped>
h2 {
  margin: 1.2rem 1px;
}
.scroll-wrap {
  position: absolute;
  top: 3.5rem;
  left: 0;
  right: 0;
  bottom: .5rem;
  padding: 0 .5rem;
  overflow: auto;
}
.buttons {
  padding: .5rem 0 0 0;
}
</style>
