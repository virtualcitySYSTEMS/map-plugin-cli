# VC MAP Plugins Devlopment Guide

This is a guide on how to create plugins for the VC MAP.
We give a short introduction to the [VC MAP API](#a-introduction-to-vc-map-api),
explain the VC MAP [plugin interface](#b-vcm-plugin-interface) and
show [step-by-step](#3-creating-an-example-plugin-step-by-step-guide) how to create your first plugin.

### A. Introduction to VC MAP API

This shall give a short insight to the most important VC MAP concepts.
For more details refer to the VC MAP API documentation.

#### 1. Framework

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

#### 2. Config

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

#### 3. Maps

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
#### 4. Layer

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
    
#### 5. Util

Util classes cannot be edited via the `config.json`. 
They provide functionality which is more general than widgets and are used in mutliple locations, e.g.:

- `vcs.vcm.util.Balloon`: Balloon Objects at certain positions on any map

- `vcs.vcm.util.editor.AbstractEditor`: Geometry-, Feature- & Style-Layer-Editors

- `vcs.vcm.util.Login`: Singleton class used for managing logins to a service. So far, only the Planner functionality requires a login

- `vcs.vcm.util.Projection`: Utility functions regarding map projection and crs transformations

- `vcs.vcm.util.ViewPoint`: viewpoint objects

- `vcs.vcm.util.style.DeclarativeStyleItem`: Style Object, see [3d-tiles-styling](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling)

#### 6. Widgets

Functionality for a specific use are encapsulated as stand-alone modules, so called Widgets.
Widgets can be added and configured to a map application using the VC PUBLISHER or manually via the VC MAP [config](#2-config).
They offer interactive functionalities to view, examine and work with the map application’s content

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

### B. VCM Plugin Interface

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

### C. Plugin Development

In this section we will present the [vcmplugin-cli](#1-using-vcmplugin-cli) a tool facilitating your plugin development, 
the common [structure](#2-structure-of-a-plugin) of a plugin and give you a [step-by-step guide](#3-creating-an-example-plugin-step-by-step-guide) to develop your first plugin.

#### 1. Using vcmplugin-cli

You need [nodejs](https://nodejs.org/en/) and npm installed to use this tool.

To install the cli open a shell and call:
```
npm i -g vcmplugin-cli
```

1. Creating a new plugin

    To create a new plugin template, run the following within your projects root:
    ```
    vcmplugin create <pluginName>
    ```
   This will create the basic [structure of a plugin](#2-structure-of-a-plugin).


2. Serving a plugin for development

    To serve your project, run the following within your projects root:
    ```
    vcmplugin serve --vcm <url|directory>
    ```
    This will launch a dev server at localhost:8080 using the specified VC MAP application
    as its base. You can either specify a directory or a URL to an application.

    ```bash
    # using a directory
    vcmplugin serve --vcm /home/vcs/virtualcityMAP
    # using a URL
    vcmplugin serve --vcm https://berlin.virtualcitymap.de
    ```

3. Building a plugin

    To build your project, run the following from within your projects root:
    ```bash
    vcmplugin build
    ```
   
4. Integrating a plugin in a productive VC MAP

   To pack your project for productive use, run the following from within your projects root:
    ```bash
    vcmplugin pack
    ```
   
    This will create a folder `dist` with a zip file containing your bundled code and assets.
    To use the plugin productively in a hosted map, unzip this file on your server to `{vcm-root}/plugins` and add an entry to your VC MAP [config](#2-config) plugins section. 
   
#### 2. Structure of a plugin

1. `package.json`
           
    This file holds all relevant metadata. It is used to give information to npm that allows it to identify the project as well as handle the project's dependencies.
    For more general information see [www.docs.npmjs.com](https://docs.npmjs.com/cli/v6/configuring-npm/package-json)
       
2. `config.json`

    The config contains all relevant parameters of a plugin. The values defined in this `config.json` might serve as default values.
    Adding a plugin to a VC MAP for **productive use** the same set of parameters has to be configured in your VC MAP [config](#2-config) plugins section.
    In the simplest case a plugin's config only contains the plugins name and entry point:
    ```json
    {
        "name": "myFirstPlugin",
        "entry": "plugins/myFirstPlugin/myFirstPlugin.js"
    }  
     ```

3. `README.md`
           
    You should provide a README file describing your plugins capabilities. Explain briefly how to setup and configure your plugin in productive use.            

4. `src` folder
           
    The source folder contains your plugins api and ui components. As entry point of a plugin serves the `index.js`.
    It exports modules, which are imported by the VC MAP core. 
    See [plugin interface](#b-vcm-plugin-interface) and [example plugin](#3-creating-an-example-plugin-step-by-step-guide).

5. `assets` folder

    Assets like image, sound or video files are stored in and imported from the assets folder.

#### 3. Creating an example plugin (step-by-step guide)







