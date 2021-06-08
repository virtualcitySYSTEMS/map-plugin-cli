import { version } from '../package.json';
import Weather from './api/weather';
import weatherComponent from './ui/weatherComponent';
import widgetButton from './ui/widgetButton';

const routes = [{
  name: 'weather',
  path: '/weather',
  component: weatherComponent,
}];

export default {
  version,
  postInitialize: async (config) => Weather.getInstance(config),
  registerUiPlugin: async () => ({
    supportedMaps: ['vcs.vcm.maps.Cesium'],
    name: 'exportStep',
    routes,
    widgetButton,
  }),
};
