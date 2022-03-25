# @vcmap/plugin-cli
> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

The `vcmplugin` cli helps develop and build plugins for the **VC Map**.

For more information on plugin development refer to [map plugin examples](https://github.com/virtualcitySYSTEMS/map-plugin-examples),
which provides documentations and a tutorial on plugin development.

## Features

- Creating basic plugin structure
- Providing plugin development server
- Building plugins for production

## Prerequisite

You need [nodejs](https://nodejs.org/en/) 16 and npm installed on your system 
to use this tool.

## Installation
To install in your project:
```shell
npm i -D @vcmap/plugin-cli
```

To install globally:
```shell
npm i -g @vcmap/plugin-cli
```

## Usage

### 1. Creating a new plugin

To create a new plugin template, run the following within your projects root:
```
vcmplugin create
```
This will open a command prompt helping you to create the basic [structure of a plugin](https://github.com/virtualcitySYSTEMS/map-plugin-examples/blob/main/doc/VCM_Plugin.md#2-structure-of-a-plugin).
Be sure to check out the [peer dependecy section](#about_peer_dependencies) as well.

### 2. Serving a plugin for development

To serve your plugin in dev mode, run the following within your projects root:
```
vcmplugin serve
```
The dev mode gives you complete debug information on all integrated libraries (@vcmap/core, ol etc.)
By default this command will launch a dev server at localhost:8008 using 
the @vcmap/ui peer dependency package of your plugin as its base.
You can provide an alternate map config if you wish.

This is the dev mode, only _your_
plugin will be served. Any other plugins in the config will be stripped. To view how
your plugin integrates with others, use the `preview` command.

### 3. Serving a plugin for integration

To serve your plugin in preview mode, run the following within your projects root:
```
vcmplugin preview
```

The preview mode allows you to view your plugin _in its destined environment_.
You can see how it interacts with other plugins & other customizations applied to a map.
Preview will `build` your plugin continuously and serve the production ready
code using a base application.
By default, this will launch a dev server at localhost:5005 using the @vcmap/ui package 
as its base. Alternatively you can provide a URL to a hosted VC Map application
and use said application as its base instead.

### 4. Building a plugin

To build your project, run the following from within your projects root:
```bash
vcmplugin build
```
This will build your application and place it in the `dist` directory.

### 5. Integrating a plugin in a productive VC MAP

To pack your project for productive use, run the following from within your projects root:
```bash
vcmplugin pack
```

This will create a folder `dist` with a zip file containing your bundled code and assets.
To use the plugin productively in a hosted map, 
unzip this file on your server to `{vcm-root}/plugins` and add 
an entry to your VC MAP [config](#2-config) plugins section. This zip file can also be unzipped
in the VC Publishers `plugins` public directory.

## About Peer Dependencies
The @vcmap/ui uses some _very large libraries_, notably `CesiumJS`. To reduce the amount
of traffic generated for loading plugins, all large libraries (see the list below), 
are _provided_ in production (instead of bundling them into every plugin). This a) guarantees
a certain amount of type safety (using the @vcsuite/check parameter assertation library for instance),
b) reduces the amount of traffic required to load an application and c) leverages browser
caching more readily.

The following libraries are provided by the @vcmap/ui in a deployed application. You should define these
as peer dependencies if you use them in your plugin:
- @vcmap/core
- @vcmap/cesium
- ol
- @vcsuite/ui-components
- vue
- @vue/composition-api
- vuetify

During the build step, these libraries are automatically externalized by the vcmplugin-cli and in
production all plugins & the map core _share_ the same cesium library.

But, to make this work, it is important to define these dependencies as _peer dependencies_ of
a plugin and _that the provided index files_ are used (over directly importing from the source file).

For instance: 
```js
import Cartesian3 from '@vcmap/cesium/Source/Core/Cartesian3.js';
```

should be rewritten to:
```js
import { Cartesian3 } from '@vcmap/cesium';
```

### What about openlayers?
openlayers provides a special case, since its modules do not provide a _flat_ namespace.
To circumvent this limitation, _the @vcmap/ui provides a flat namespaced ol.js_ and a mechanic
to rewrite openlayers imports. This is automatically applied by the `@vcmap/rollup-plugin-vcs-ol`
used by the vcmplugin-cli build step. So openlayers imports can be written as:
```js
import Feature from 'ol/Feature.js';
```
or 
```js
import { Feature } from 'ol';
```

## Non-Global CLI & npm run
If you only use the `vcmplugin-cli` as a package dependency, you must add the above scripts to
the `package.json` and use `npm run` to execute:
```json
{
  "name": "plugin-name",
  "main": "src/index.js",
  "scripts": {
    "build": "vcmplugin build",
    "serve": "vcmplugin serve --vcm ./vcm"
  },
  "devDependencies": {
    "@vcmap/plugin-cli": "^0.1.1"
  }
}
```
