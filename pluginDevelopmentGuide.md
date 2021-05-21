# VC MAP Plugins Devlopment Guide

This is a guide on how to create plugins for the VC MAP.
We give a short introduction to the [VC MAP API](#a-introduction-to-vc-map-api),
explain the VC MAP [plugin interface](#b-vcm-plugin-interface) and
show [step-by-step](#3-creating-an-example-plugin-step-by-step-guide) how to create your first plugin.

## A. Introduction to VC MAP API

This shall give a short insight to the most important VC MAP concepts.
For more details refer to the VC MAP API documentation.

### 1. Framework

The main Framework class (`vcs.vcm.Framework`) is implemented as a Singleton.

To get an instance call:
```js
vcs.vcm.Framework.getInstance();
```

The Framework manages the following points:
- loading of the config file
- creation and management of map, layer, viewpoint and widget objects
- analysis of the URL parameter and forwarding to the widgets
- Message system (publish, subscribe)

### 2. Config

The config is a json containing all configurable objects of a VC MAP.
The most important parameters are:

| name | type | description |
| --------- | --------- | ---------- |
| mapcontainer | `string` | dom id of the mapcontainer |
| startViewPoint | `string` | string name of the viewpoint to start the map with |
| projection | `Object` | the default projection to use for display/input of coordinates to/from the user. See `vcs.vcm.util.Projection` |
| selectBehavior | `Object` | Defines the select behavior for buildings, vectors etc. See `vcs.vcm.SelectBehavior`} |
| widgets | `Array(Object)` | Each object literals defines one `vcs.vcm.widgets.Widget` configuration |
| maps | `Array(Object)` | Each object literal represents one `vcs.vcm.maps.Map` configuration |
| layers | `Array(Object)` | Each object literal in the array consists of one `vcs.vcm.layer.Layer` configuration |
| viewpoints | `Array(Object)` | Each object literal in the array consists of one `vcs.vcm.util.ViewPoint` configuration |
| availableLocales | `Array(string)` | The available locales in the map |
| locale | `string` | language token (de, en, pl, nl), determines the default language |
| ui | `Object` | ui Configuration for UI part, see example Configuration file for |
| i18n | `Object` | Can be used to overwrite existing i18n entries or add new ones which can be used for example in a balloon. |
| styles | `Array(Object)` | Each object literal in the array consists of one `vcs.vcm.util.style.StyleItem` |



Plugins and their configuration can be defined in a plugins section:

| name | type | description |
| --------- | --------- | ---------- |
| plugins | `Array(Object)` | Each object literal in the array consists of one plugin configuration |

An example VC MAP config.json with a plugin added would look like:
```json
{
  ...,
  "layers": [ ... ],
  "viewpoints": [ ... ],
  "widgets": [ ... ],
  "plugins": [
    {
      "name": "myFirstPlugin",
      ...
    }
  ]        
}
```

### 3. Maps

VC MAP provides three types of maps:
- 3D map based on [Cesium](https://www.cesium.com/index.html)
- 2D map based on [OpenLayers](https://openlayers.org/)
- Oblique map based on [OpenLayers](https://openlayers.org/)

To get the current active map call:
```js
vcs.vcm.Framework.getInstance().getActiveMap();
```
To get a map by name call:
```js
vcs.vcm.Framework.getInstance().getMapByName(name);
```
### 4. Layer

Layers are an abstraction level to manage the map's data in a structured way.
There are multiple layer types for different data sources, which have specific implementations for all or some map types:

- `vcs.vcm.layer.RasterLayer`
    - `vcs.vcm.layer.SingleImage`
    - `vcs.vcm.layer.TMS`
    - `vcs.vcm.layer.WMS`
    - `vcs.vcm.layer.WMTS`
- `vcs.vcm.layer.FeatureLayer`
    - `vcs.vcm.layer.Vector`
        - `vcs.vcm.layer.FeatureStore`
        - `vcs.vcm.layer.GeoJSON`
        - `vcs.vcm.layer.WFS`
    - `vcs.vcm.layer.VectorTile`
    - `vcs.vcm.layer.VectorCluster`
    - `vcs.vcm.layer.CesiumTileset` (3D only)
        - `vcs.vcm.layer.Buildings` (3D only)
        - `vcs.vcm.layer.PointCloud` (3D only)
- `vcs.vcm.layer.Terrain` (3D only)
- `vcs.vcm.layer.DataSource` (Cesium Entity Layer, 3D only)
    - `vcs.vcm.layer.Czml` (3D only)
    
To get all registered layers call:
```js
vcs.vcm.Framework.getInstance().getLayers();
```

To get a registered layer by name call:
```js
vcs.vcm.Framework.getInstance().getLayerByName(name);
```

To create a new layer, e.g. of type Vector, use:
```js
const myVectorLayer = new vcs.vcm.layer.Vector(options);
```

To register a layer call:
```js
vcs.vcm.Framework.getInstance().addLayer(myVectorLayer);
```

To activate a layer call:
```js
myVectorLayer.activate();
```

To deactivate a layer call:
```js
myVectorLayer.deactivate();
```
    
### 5. Util

Util classes cannot be edited via the `config.json`. 
They provide functionality which is more general than widgets and are used in mutliple locations, e.g.:

- `vcs.vcm.util.Balloon`: Balloon Objects at certain positions on any map

- `vcs.vcm.util.editor.AbstractEditor`: Geometry-, Feature- & Style-Layer-Editors

- `vcs.vcm.util.Login`: Singleton class used for managing logins to a service. So far, only the Planner functionality requires a login

- `vcs.vcm.util.Projection`: Utility functions regarding map projection and crs transformations

- `vcs.vcm.util.ViewPoint`: viewpoint objects

- `vcs.vcm.util.style.DeclarativeStyleItem`: Style Object, see [3d-tiles-styling](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling)

### 6. Widgets

Functionality for a specific use are encapsulated as stand-alone modules, so called Widgets.
Widgets can be added and configured to a map application using the VC PUBLISHER or manually via the VC MAP [config](#2-config).
They offer interactive functionalities to view, examine and work with the map application’s content.

The abstract base class of all widgets is `vcs.vcm.widgets.Widget`. Examples for widgets are:

- `vcs.vcm.widgets.AttributeEditor`
- `vcs.vcm.widgets.BalloonInfo`
- `vcs.vcm.widgets.Copyright`
- `vcs.vcm.widgets.CreateLink`
- `vcs.vcm.widgets.ClippingTool`
- `vcs.vcm.widgets.DisplayQuality`
- `vcs.vcm.widgets.Drawing`
- `vcs.vcm.widgets.Export`
- `vcs.vcm.widgets.FeatureList`
- `vcs.vcm.widgets.Flight`
- `vcs.vcm.widgets.Locator`
- `vcs.vcm.widgets.HeightProfile`
- `vcs.vcm.widgets.Measurement`
- `vcs.vcm.widgets.SingleMeasurement`
- `vcs.vcm.widgets.NavigationControls `
- `vcs.vcm.widgets.OverviewMap`
- `vcs.vcm.widgets.PDFCreator`
- `vcs.vcm.widgets.PositionDisplay`
- `vcs.vcm.widgets.Shadow`
- `vcs.vcm.widgets.TransparentTerrainMode`
- `vcs.vcm.widgets.TransparentTerrain `
- `vcs.vcm.widgets.SwipeTool`
- `vcs.vcm.widgets.MultiView`
- `vcs.vcm.widgets.Viewshed`

To get a widget's instance call:
```js
vcs.vcm.Framework.getInstance().getWidgetByType(type);
```

## B. VCM Plugin Interface

The `vcs.vcm.plugins.Plugin` interface is defined as

| name | type | description 
| ---------- | ------------ | ------------------------
| version | `string` | the version of your plugin defined in the plugin's `package.json` |
| preInitialize | `function(vcs.vcm.plugins.Config):Promise<void>` | hook provided before framework initialization |
| preInitialize | `function(vcs.vcm.plugins.Config):Promise<void>` | hook provided after framework initialization |
| preInitialize | `function(vcs.vcm.plugins.Config):Promise<vcs.ui.PluginOptions>` | hook for initializing ui components, must return an object of `vcs.ui.PluginOptions` |
| postUiInitialize | `function(vcs.vcm.plugins.Config):Promise<void>` | hook provided after ui initialization |

Each plugin must provide a version and utilize at least one of the four available hooks.
All hooks provide the plugin's config object, as it is defined in the plugins section of your VC MAP [config](#2-config).
This way you can pass the plugins configurable parameters to your api or ui components.

The interface is implemented in the plugins `index.js`, which must export the version and utilized hooks. 

Also see [structure of a plugin](#2-structure-of-a-plugin) and [example plugin](#3-creating-an-example-plugin-step-by-step-guide).

## C. Plugin Development

In this section we will present the [vcmplugin-cli](#1-using-vcmplugin-cli), a tool facilitating your plugin development. 
We will explain the common [structure](#2-structure-of-a-plugin) of a plugin and give you a [step-by-step guide](#3-creating-an-example-plugin-step-by-step-guide) to develop your first plugin.

### 1. Using vcmplugin-cli

You need [nodejs](https://nodejs.org/en/) and npm installed on your system to use this tool.

To install the cli open a shell and call:
```shell
npm i -g vcmplugin-cli
```

#### 1. Creating a new plugin

To create a new plugin template, run the following within your projects root:
```
vcmplugin create
```
This will open a command prompt helping you to create the basic [structure of a plugin](#2-structure-of-a-plugin).


#### 2. Serving a plugin for development

To serve your project, run the following within your projects root:
```
vcmplugin serve --vcm <url|directory>
```
This will launch a dev server at localhost:8080 using the specified VC MAP application as its base.
You can either specify a directory or a URL to an application.

```bash
# using a directory
vcmplugin serve --vcm /home/vcs/virtualcityMAP
# using a URL
vcmplugin serve --vcm https://berlin.virtualcitymap.de
```

#### 3. Building a plugin

To build your project, run the following from within your projects root:
```bash
vcmplugin build
```

#### 4. Integrating a plugin in a productive VC MAP

To pack your project for productive use, run the following from within your projects root:
```bash
vcmplugin pack
```
   
This will create a folder `dist` with a zip file containing your bundled code and assets.
To use the plugin productively in a hosted map, unzip this file on your server to `{vcm-root}/plugins` and add an entry to your VC MAP [config](#2-config) plugins section. 
   
### 2. Structure of a plugin

#### 1. `package.json`
           
This file holds all relevant metadata. It is used to give information to npm that allows it to identify the project as well as handle the project's dependencies.
For more general information see [www.docs.npmjs.com](https://docs.npmjs.com/cli/v6/configuring-npm/package-json)

#### 2. `config.json`

The config contains all relevant parameters of a plugin. The values defined in this `config.json` might serve as default values.
Adding a plugin to a VC MAP for **productive use** the same set of parameters has to be configured in your VC MAP [config](#2-config) plugins section.
In the simplest case a plugin's config only contains the plugins name and entry point:
```json
{
  "name": "myFirstPlugin",
  "entry": "plugins/myFirstPlugin/myFirstPlugin.js"
}  
```

#### 3. `README.md`
           
You should provide a README file describing your plugins capabilities. Explain briefly how to setup and configure your plugin in productive use.            

#### 4. `src` folder
           
The source folder contains your plugins api and ui components. As entry point of a plugin serves the `index.js`.
It exports modules, which are imported by the VC MAP core. 
See [plugin interface](#b-vcm-plugin-interface) and [example plugin](#3-creating-an-example-plugin-step-by-step-guide).

#### 5. `assets` folder

Assets like image, sound or video files are stored in and imported from the assets folder.

### 3. Creating an example plugin (step-by-step guide)

This chapter is all about creating your first plugin.
The idea is to create a weather plugin using Cesium's particle system (based on this [Cesium Sandcastle Demo](https://sandcastle.cesium.com/?src=Particle%20System%20Weather.html)).
We will show step-by-step how to do it.

#### 1. Setup

- Open your Windows cmd or Linux shell.
- Check if [nodejs](https://nodejs.org/en/) and npm are installed on your system:
```shell
node -v && npm -v
```
You'll need Node 12+ and npm 6+ installed to continue.
- Check if [vcmplugin-cli](#1-using-vcmplugin-cli) is installed
```shell
vcmplugin -V
```
If not, install it by calling
```shell
npm i -g vcmplugin-cli
```
- Create a new directory and change to this directory
```shell
mkdir vcm-plugin-dev && cd vcm-plugin-dev
```
#### 2. Plugin create prompt

The [vcmplugin-cli](#1-using-vcmplugin-cli) provides a command to help you creating the basic structure of a new plugin.
To start the prompt call
```shell
vcmplugin create
```

- specify your plugins *name* as `weather`
- adopt the default *version* `1.0.0` by pressing enter
- enter *description* `example weather plugin`
- adopt the default entry point *main* `src/index.js`
- select `build` and `pack` to be added to your `package.json`
- enter your name and email to make you the *author*
- adopt the default *license* `ISC`
- adopt the default *map version* `>=4.0`
      
The cli will create a new directory `weather` containing the basic [structure of a plugin](#2-structure-of-a-plugin).
Open the working directory in your favorite editor, it should look like:

```
    vcm-plugin-dev
    │
    └───weather
    │   │   config.json
    │   │   package.json
    │   │   README.md
    │   │   
    │   └───src
    │       │   index.js
```

#### 3. Adding functionality (weather plugin api)

We now want to add the actual code of our sample plugin to generate weather.
If you are creating a complex plugin, a basic architecture separating your plugin's api and ui becomes crucial.
Although our sample plugin is quite simple, we want to follow this best practice.

- create a new folder `api` within the `weather` directory
- add a new java script file called `weather.js` to your `api` folder.
- Open the `weather.js` in the text editor and define the following variables:

```js
const framework = vcs.vcm.Framework.getInstance();

/** @type {Cesium.Cartesian3} */
let gravityScratch = new Cesium.Cartesian3();
/** @type {Cesium.Matrix4} */
let modelMatrix = new Cesium.Matrix4();
```

The variable `framework` is an instance of the VC MAP framework class.
The other two variables are needed for our particle system.

- Define a ECMAScript 6 class called weather right underneath:
    
```js
/**
 * Weather class using Cesium Particle Systems
 * @class
 * @memberOf vcs.vcm.plugins.weather
 */
export default class Weather {
  constructor(options) {
    /** @type {real} */
    this.radius = options.radius || 100000.0;
    /** @type {Cesium.Cartesian3} */
    this.position = null;
    /** @type {Cesium.Scene || null} */
    this.scene = null;
    /** @type {Cesium.Clock || null} */
    this.clock = null;
    /** @type {Cesium.AnimationViewModel || null} */
    this.animationViewModel = null;
    /** @type {Cesium.ParticleSystem || null} */
    this.snowSystem = null;
    /** @type {Cesium.ParticleSystem || null} */
    this.rainSystem = null;
    /** @type {number} */
    this.cloudHeight = options.cloudHeight || 2000;
    
    /**
     * update callback function: defines how the particles will be updated
     * creates downward movement and sets alpha 0 at specific distance
     * @param {Cesium.Particle} particle
     * @param {number} dt
     */
    this.snowUpdateFunction = (particle) => {
      Cesium.Cartesian3.normalize(particle.position, gravityScratch);
      Cesium.Cartesian3.multiplyByScalar(gravityScratch, Cesium.Math.randomBetween(-30.0, -300.0), gravityScratch);
      particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityScratch, particle.velocity);
      
      const distance = Cesium.Cartesian3.distance(this.scene.camera.position, particle.position);
      if (distance > this.radius) {
        particle.endColor.alpha = 0.0;
      } else { particle.endColor.alpha = this.snowSystem.endColor.alpha / (distance / this.radius + 0.1); }
    };
    this.rainUpdateFunction = (particle) => {
      Cesium.Cartesian3.normalize(particle.position, gravityScratch);
      Cesium.Cartesian3.multiplyByScalar(gravityScratch, -750.0, gravityScratch);
      particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityScratch, particle.velocity);
      
      const distance = Cesium.Cartesian3.distance(this.scene.camera.position, particle.position);
      if (distance > this.radius) {
        particle.endColor.alpha = 0.0;
      } else { particle.endColor.alpha = 0.7 / (distance / this.radius + 0.1); }
    };
  }
}
```

This adds a class with several properties we will need to visualize weather particles.
Two properties (`radius` and `cloudHeight`) can be passed to the constructor.

We now want to add the singleton pattern to restrict the instantiation of our class to one object:
- Add at the very beginning of the file (line 1):
```js
import defaultOptions from '../config.json';

/**
 * @type {vcs.vcm.plugins.weather.Weather}
 */
let _instance = null;
```

- Add after the constructor (~line 71):
```js
  /**
   * Singleton
   * @param {Object} [options] - plugin config
   * @return {vcs.vcm.plugins.weather.Weather} instance of Weather
   */
  static getInstance(options) {
    if (_instance) {
      return _instance;
    }
    // add user information
    _instance = new Weather(Object.assign(defaultOptions, options));
    _instance.initialize();
    return _instance;
  }
```

We can get an instance of our plugin class now by calling:
```js
Weather.getInstance(options);
```
Passing options is optional. If we don't pass options the default options will be assigned.
Therefor we want to add some default options to our `config.json`:

- Open the `config.json` and add two parameters, that it looks like:
```json
{
  "name": "weather",
  "version": "1.0.0",
  "radius": 100000.0,
  "cloudHeight": 2000
}
```

Further we will add some class methods. In our `getInstance()` function we call a method called `initialize()`,
which initializes several class properties we defined in the constructor.

- Add this method to our class (line ~82 of `wehater.js`):

```js
initialize() {
  const activeMap = framework.getActiveMap();
  
  if (activeMap instanceof vcs.vcm.maps.Cesium) {
    this.scene = activeMap.getScene();
    this.clock = activeMap.getCesiumWidget().clock;
    const clockViewModel = new Cesium.ClockViewModel(this.clock);
    this.animationViewModel = new Cesium.AnimationViewModel(clockViewModel);
    
    this.scene.globe.depthTestAgainstTerrain = true;
    
    // set position of model matrix
    this.staticHeight(this.scene.camera.position, this.cloudHeight);
    modelMatrix = new Cesium.Matrix4.fromTranslation(this.position);
    
    // snowSystem properties
    const snowParticleSize = this.scene.drawingBufferWidth / 100;
    
    this.snowSystem = new Cesium.ParticleSystem({
      show: false,
      modelMatrix,
      minimumSpeed: -1.0,
      maximumSpeed: 0.0,
      lifetime: 15.0,
      emitter: new Cesium.SphereEmitter(this.radius),
      startScale: 0.5,
      endScale: 1.0,
      image: 'assets/snowflake_particle.png',
      startColor: Cesium.Color.WHITE.withAlpha(0.0),
      endColor: Cesium.Color.WHITE.withAlpha(1.0),
      minimumImageSize: new Cesium.Cartesian2(snowParticleSize, snowParticleSize),
      maximumImageSize: new Cesium.Cartesian2(snowParticleSize * 2.0, snowParticleSize * 2.0),
      updateCallback: this.snowUpdateFunction.bind(this),
    });
    this.scene.primitives.add(this.snowSystem);
    
    // rainSystem properties
    
    const rainParticleSize = this.scene.drawingBufferWidth / 80.0;
    
    this.rainSystem = new Cesium.ParticleSystem({
      show: false,
      modelMatrix,
      speed: -1.0,
      lifetime: 15.0,
      emitter: new Cesium.SphereEmitter(this.radius),
      startScale: 1.0,
      endScale: 0.0,
      image: 'assets/circular_particle.png',
      startColor: new Cesium.Color(0.27, 0.5, 0.70, 0.0),
      endColor: new Cesium.Color(0.27, 0.5, 0.70, 0.98),
      imageSize: new Cesium.Cartesian2(rainParticleSize, rainParticleSize * 2.0),
      updateCallback: this.rainUpdateFunction.bind(this),
    });
    this.scene.primitives.add(this.rainSystem);
  }
}
```

Within the `initialize()` function we used a new function `staticHeight()`, which we also want to add.

- Add at the end of `weather.js`(~line 145)
```js
/**
 * Calculates position of emission source from camera position and the cloud height property
 * @param {Cesium.Cartesian3} cameraPosition
 * @param {number} height
 */
staticHeight(cameraPosition, height) {
  const positionLatLng = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cameraPosition);
  this.position = new Cesium.Cartesian3.fromDegrees(
    Cesium.Math.toDegrees(positionLatLng.longitude),
    Cesium.Math.toDegrees(positionLatLng.latitude),
    height,
  );
}
```

If we require now an instance of our plugin, it will create a particle system at a given position and
add this system to the Cesium Scene. The particle systems are using  png images for visualization of rain and snow.
We defined relative urls `assets/circular_particle.png` and `assets/snowflake_particle.png`.

- Create a folder `assets` in your plugin's root directory (`weather`)
- Add the two pngs ([source](https://github.com/CesiumGS/cesium/tree/master/Apps/SampleData))

For better user interaction we want to add three additional functions at the end of our file (~line 118):

- start
- stop
- updateLocation

```js
  /**
   * start rain or snow weather
   * @param {string} system - rain or snow
   */
  start(system) {
    
    if (!(framework.getActiveMap() instanceof vcs.vcm.maps.Cesium)) {
      return;
    }
    
    if (system === 'rain') {
      this.rainSystem.show = true;
      this.snowSystem.show = false;
      
      this.scene.skyAtmosphere.hueShift = -0.97;
      this.scene.skyAtmosphere.saturationShift = 0.25;
      this.scene.skyAtmosphere.brightnessShift = -0.4;
      
      this.scene.fog.density = 0.00025;
      this.scene.fog.minimumBrightness = 0.01;
    } else if (system === 'snow') {
      this.rainSystem.show = false;
      this.snowSystem.show = true;
      
      this.scene.skyAtmosphere.hueShift = -0.8;
      this.scene.skyAtmosphere.saturationShift = -0.7;
      this.scene.skyAtmosphere.brightnessShift = -0.33;
      
      this.scene.fog.density = 0.001;
      this.scene.fog.minimumBrightness = 0.8;
    }
    
    this.animationViewModel.playForwardViewModel.command();
    this.clock.shouldAnimate = true;
  }
  
  /**
   * stop weather and reset scene
   */
  stop() {
    this.clock.shouldAnimate = false;
    this.animationViewModel.pauseViewModel.command();
    this.snowSystem.show = false;
    this.rainSystem.show = false;
    
    // reset scene
    this.scene.skyAtmosphere.hueShift = 0.0;
    this.scene.skyAtmosphere.saturationShift = 0.0;
    this.scene.skyAtmosphere.brightnessShift = 0.0;
    this.scene.fog.density = 2.0e-4;
    this.scene.fog.minimumBrightness = 0.1;
  }
  
  /**
   * update location of weather particle system to current camera position
   */
  updateLocation() {
    this.position = this.scene.camera.position;
    this.snowSystem.modelMatrix = Cesium.Matrix4.setTranslation(modelMatrix, this.position, modelMatrix);
    this.rainSystem.modelMatrix = Cesium.Matrix4.setTranslation(modelMatrix, this.position, modelMatrix);
  }
```

#### 4. Adding ui components

We now want to create a user interface to control the weather systems.
For ui implementation we use [Vue.js](https://vuejs.org/),
which is a progressive framework for building user interfaces.

- Create a folder `ui` within the `src` directory
- Add a new file called `weatherComponent.vue` and open this file in your editor

If you use a IDE like Webstorm to create a new vue component, it might look like:
```vue
<template>

</template>

<script>
export default {
  name: 'weatherComponent'
}
</script>

<style scoped>

</style>

```

You can see a vue component consists of a html, a css and a script part. 
Let's beginn with the html part and add:

- close button
- dropdown for selecting the weather system
- buttons to start, stop and update the location

```vue
<template>
  <div>
    <div>
      <CloseButton></CloseButton>
      <h2>{{$t('i18n_weather_title')}}</h2>
    </div>
    <div class="scroll-wrap">
      <div>
        <label id="weather_system_label" for="weather_system_input">{{$t('i18n_weather_system_input')}}</label>
        <select id="weather_system_input" v-model="selectedSystem">
          <option v-for="system in weatherSystems" v-bind:value="system.id">{{ system.name }}</option>
        </select>
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
```

We used several css classes. Some classes are defined by the VC Map core.

- Define the remaining by adding to the style part:

```vue
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
```

- Finally, add to the script part:

```vue
<script>
import Weather from './weather';

export default {
  name: 'weatherComponent',
  i18n: {
    messages: {
      de: {
        i18n_weather_title: 'Wetter Plugin',
        i18n_weather_system_input: 'Wetter: ',
        i18n_weather_snow: 'Schnee',
        i18n_weather_rain: 'Regen',
        i18n_weather_start: 'Start',
        i18n_weather_stop: 'Stop',
        i18n_weather_update: 'Aktualisiere Lage',
      },
      en: {
        i18n_weather_title: 'Weather Plugin',
        i18n_weather_system_input: 'Weather: ',
        i18n_weather_snow: 'Snow',
        i18n_weather_rain: 'Rain',
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
    };
  },
  methods: {
    start() {
      const weather = Weather.getInstance();
      weather.start(this.selectedSystem);
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
```

Using `i18n` we can implement different languages.
In the `data` section all reactive variables are defined.
In the `methods` part, we define our functionalities calling our api.

Additionally, to this component we want to add a plugin button, to open the plugin.

- Create a new file called `widgetButton.vue` and open it in your editor
- Add the following content:

```vue
<template>
  <a href="#/weatherPlugin" class="vcm-btn-base-splash-hover" title="Weather Plugin">
    <i class="fa fa-lg fa-umbrella weather-btn" />
  </a>
</template>

<script>
export default {
  name: 'widgetButton'
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
```

This adds a hyperlink to our plugins path, which we will define in the next section.
For the visual illustration of the button we use a [Font Awesome](https://fontawesome.com/) umbrella icon.

#### 5. Registering the plugin

Last but not least we need to register our plugin.
This is where the `index.js` comes into play.

- Open the `index.js` in your editor
- Implement the `postInitialize` hook
- Implement `registerUiPlugin`

```js
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
```

What happens? After the VC MAP framework has been initialized, the `postInitialize` hook is executed.
Here we instantiate our plugin passing the plugin config defined in the VC MAP config plugins section.
Furthermore, we register an ui plugin by providing a `registerUiPlugin` function.
This function has to return a `vcs.ui.PluginOptions` object. 
In our case we define  `supportedMaps`, `name`, `routes` and the `widgetButton`.

Finally, we have to add an `routes` array to register our `weatherComponent.vue` at a specific path.
The [Vue Router](https://router.vuejs.org/) will redirect to this path, whenever the widget button is clicked.

- Add routes to `index.js` (~line 6):

```js
const routes = [{
  name: 'exportStep',
  path: '/exportStep',
  component: weatherComponent,
}];
```

#### 6. Serving plugin during development

The [vcmplugin-cli](#1-using-vcmplugin-cli) provides a command to serve a plugin within an existing map.

- Open Windows cmd or Linux Shell in your plugin root directory and call
```shell
vcmplugin serve --vcm https://berlin.virtualcitymap.de
```

This will start a node server running on http://localhost:8080/.
Within in the widgets menu on the right side of the VC MAP application you will find your plugin button with the umbrella.
Open the weather plugin to test the functionality.
Feel free to adapt the ui or add additional functions.
Just reload the site to see any changes you made.

For more options on serving your plugin call
```shell
vcmplugin serve -h
```

#### 7. Writing a README.md

Before you distribute your plugin, write a README.md explaining the functionality and usage of your plugin.
Especially describe configurable parameters of the plugin's `config.json`.

- Open `README.md` in your text editor and add:

```md
# Weather Plugin

This is a demo plugin for the VC MAP. It creates rain or snow weather using Cesium Particle System.
It is based on this [Cesium Sandcastle Demo](https://sandcastle.cesium.com/?src=Particle%20System%20Weather.html).

## configuration

| Property | Type | Description |
|----------|------|-------------|
| radius | number | the radius/ extend of the weather particle system
| cloudHeight | number | height of the weather particle system

```

#### 8. Building and packing your plugin

If you are content with the state of your plugin, you may want to distribute it and integrate it permanently into a hosted VC MAP.

- Run pack command:

```shell
vcmplugin pack
```

It creates a zipped and minified version of your plugin at `vcm-plugin-dev/weather/dist`

```
    vcm-plugin-dev
    │
    └───weather
    │   └───dist
    │       └───weather.zip
    │           │   config.json                         <= relevant for publisher
    │           │   package.json                        <= relevant for publisher
    │           │   README.md
    │           │   weather.js                          <= minified plugin
    │           └───assets 
    │               │   circular_particle.png   
    │               │   snowflake_particle.png   
```

To use the plugin productively in a hosted map:

- Copy and unzip your packed plugin on your server to `{vcm-root}/plugins`
- Add a plugin configuration to the VC MAP [config.json](#2-config) plugins array

Example for a VC MAP root directory on a webserver:
```
    vcm
    │
    └───css
    └───fonts
    └───i18n
    └───images
    └───img
    └───lib
    └───plugins                                     
    │   └───weather                                 <= add packed & unzipped plugin
    │       │ ...
    └───templates
    │   config.json                                 <= add plugin configuration
    │   index.html
```

Alternatively, if you are using VC Publisher:

- Copy and unzip your packed plugin to `VC_PUBLISHER/public/plugins`
- The plugin will be available at the VC PUBLISHER plugins tab

### 4. Links and further reference

VC MAP:
- [VCM core source code on github]()
- [VCM API]()

Third party docs:
- [OpenLayers API](https://openlayers.org/en/latest/apidoc/)
- [Cesium API](https://cesium.com/docs/cesiumjs-ref-doc/index.html)
- [Vue.js](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Vuex](https://vuex.vuejs.org/)







