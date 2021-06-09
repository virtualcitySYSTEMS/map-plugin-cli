# Introduction to VC MAP API

This shall give a short insight to the most important VC MAP concepts.
For more details refer to the [VC MAP API](https://lib.virtualcitymap.de/v4.0.x/doc/) documentation.

## 1. Framework

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

See also API Documentation: [vcs.vcm.Framework](https://lib.virtualcitymap.de/v4.0.x/doc/vcs.vcm.Framework.html)

## 2. Config

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

## 3. Maps

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
To get a map by type (e.g., Cesium Map) call:
```js
vcs.vcm.Framework.getInstance().getMapByType('vcs.vcm.maps.Cesium');
```
See also API Documentation: [vcs.vcm.maps](https://lib.virtualcitymap.de/v4.0.x/doc/vcs.vcm.maps.html)

## 4. Layer

Layers are an abstraction level to manage the map's data in a structured way.
There are multiple layer types for different data sources, which have specific implementations for all or some map types:

- `vcs.vcm.layer.RasterLayer` (not Oblique)
    - `vcs.vcm.layer.SingleImage`
    - `vcs.vcm.layer.TMS`
    - `vcs.vcm.layer.WMS`
    - `vcs.vcm.layer.WMTS`
- `vcs.vcm.layer.FeatureLayer`
    - `vcs.vcm.layer.Vector`
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
See also API Documentation: [vcs.vcm.layer](https://lib.virtualcitymap.de/v4.0.x/doc/vcs.vcm.layer.html)

## 5. Util

Util classes cannot be edited via the `config.json`. 
They provide functionality which is more general than widgets and are used in multiple locations, e.g.:

- `vcs.vcm.util.Balloon`: Balloon Objects at certain positions on any map
- `vcs.vcm.util.editor.AbstractEditor`: Geometry-, Feature- & Style-Layer-Editors
- `vcs.vcm.util.Login`: Singleton class used for managing logins to a service. So far, only the Planner functionality requires a login
- `vcs.vcm.util.Projection`: Utility functions regarding map projection and crs transformations
- `vcs.vcm.util.ViewPoint`: viewpoint objects
- `vcs.vcm.util.style.DeclarativeStyleItem`: Style Object, see [3d-tiles-styling](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling)

See also API Documentation: [vcs.vcm.util](https://lib.virtualcitymap.de/v4.0.x/doc/vcs.vcm.util.html)

## 6. Widgets

Functionality for a specific use are encapsulated as stand-alone modules, so-called Widgets.
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
See also API Documentation: [vcs.vcm.widgets](https://lib.virtualcitymap.de/v4.0.x/doc/vcs.vcm.widgets.html)

## 7. Links and further reference

VC MAP:
- [VCM core source code on github](https://github.com/virtualcitySYSTEMS/map-core)
- [VC MAP API](https://lib.virtualcitymap.de/v4.0.x/doc/)

Third party docs:
- [OpenLayers API](https://openlayers.org/en/latest/apidoc/)
- [Cesium API](https://cesium.com/docs/cesiumjs-ref-doc/index.html)
- [Vue.js](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Vuex](https://vuex.vuejs.org/)







