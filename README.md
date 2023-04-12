# @vcmap/plugin-cli

> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

> **Note: This documentation is for version 2, compatible with the [VC Map](https://github.com/virtualcitySYSTEMS/map-ui) v5.
> For documentation on version 1 compatible with VC Map v4, see [this tag](https://github.com/virtualcitySYSTEMS/map-plugin-cli/tree/v1.1.1)
> and be sure to install using `npm i -g @vcmap/plugin-cli@^1.1.0`**

The `@vcmap/plugin-cli` helps develop and build plugins for the **VC Map**.

## Features

- Creating basic plugin structure
  - from scratch
  - from an existing plugin [@vcmap/hello-world](https://www.npmjs.com/package/@vcmap/hello-world) used as template
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

You can use the following workflow to quickly develop plugins. Note, that
the `@vcmap/plugin-cli` does _not_ directly depend on `@vcmap/ui` to avoid version
conflicts in the used API within a plugin. This means, that _all_ commands
(except for the `create` command) must be executed from within an installed
plugin cli _within the plugin itself_ using npx. When using the `create`
command, the `@vcmap/plugin-cli` will automatically be installed as a devDependency in
its current major version. You can then use either the scripts defined
by the template in your package.json `npm start`, `npm run pack` etc. or `npx`
to execute CLI commands.

All commands have (optional) cli options. Run `vcmplugin --help` or `vcmplugin help [command]` for more information.
For `serve` and `preview` you can alternatively define a `vcs.config.js` in your plugin's root directory.
For more information see [here](#vcm-config-js).

### 1. Creating a new plugin

To create a new plugin template, run the following:

```
vcmplugin create
```

This will open a command prompt helping you to create the basic [structure of a plugin](#vc-map-plugins).
Be sure to check out the [peer dependecy section](#about-peer-dependencies) as well.

Optionally, in step 7 of the create-prompt you can choose an existing plugin [@vcmap/hello-world](https://www.npmjs.com/package/@vcmap/hello-world) as template.

### 2. Serving a plugin for development

To serve your plugin in dev mode, run the following within your projects root:

```
npx vcmplugin serve
```

The dev mode gives you complete debug information on all integrated libraries (@vcmap/core, ol etc.)
By default, this command will launch a dev server at localhost:8008 using
the @vcmap/ui peer dependency package of your plugin as its base.
You can provide an alternate map config if you wish.

This is the dev mode, only _your_
plugin will be served. Any other plugins in the config will be stripped. To view how
your plugin integrates with others, use the `preview` command.

### 3. Serving a plugin for integration

To serve your plugin in preview mode, run the following within your projects root:

```
npx vcmplugin preview
```

The preview mode allows you to view your plugin _in its destined environment_.
You can see how it interacts with other plugins & other customizations applied to a map.
Preview will `build` your plugin continuously and serve the production ready
code using a base application.
By default, this will launch a dev server at localhost:5005 using the @vcmap/ui package
as its base. Alternatively you can provide a URL to a hosted VC Map application
and use said application as its base instead.

### 4. Building a plugin staging application

A staging application creates a full deployable VC Map in the `dist` folder with the following components.

- compiled @vcmap/ui library and all dependencies
- default @vcmap/ui configurations
- default @vcmap/ui plugins
- compiled plugin which is in development.

Building the staging application will collect all parts and will inject the plugin in development in the default
map configuration. The staging application can for example be used to deploy the App in an Apache in a postCommit
Pipeline. (See .gitlab-ci.yml for an example).

```bash
npx vcmplugin buildStagingApp
```

To start a webserver to serve the content of the `dist` folder call `npx vite preview`; This will start a static webserver
on the port 4173.

The Dockerfile in `build/staging/Dockerfile` can be used to create a Docker Container which serves the content of the dist folder.

```bash
npx vcmplugin buildStagingApp
cd dist
docker build -f ../build/staging/Dockerfile -t vcmap:staging .
docker run --rm -p 5000:80 vcmap:staging
```

### 5. Building a plugin

To build your project, run the following from within your projects root:

```bash
npx vcmplugin build
```

This will build your application and place it in the `dist` directory.

### 6. Integrating a plugin in a productive VC MAP

To pack your project for productive use, run the following from within your projects root:

```bash
npx vcmplugin pack
```

This will create a folder `dist` with a zip file containing your bundled code and assets.
To use the plugin productively in a hosted map,
unzip this file on your server to `{vcm-root}/plugins` and add
an entry to your VC MAP `config` plugins section. This zip file can also be unzipped
in the VC Publishers `plugins` public directory.

## vcm config js

The `@vcmap/plugin-cli` supports an optional configuration file, which can be used for the commands `serve` and `preview`.
It's an alternative to providing cli parameters (which will still have precedence) and even has a few extra feature like proxy or inline config files.
This can be helpful, if you want to share specific parameters valid for a specific plugin.
In order to do so just save a `vcm.config.js` in your plugin's root directory.
This file has to return a js object as default export.

Example `vcm.config.js` defining proxy and port:

```js
export default {
  // server.proxy see https://vitejs.dev/config/server-options.html#server-proxy
  proxy: {
    // string shorthand: http://localhost:8008/foo -> https://vc.systems/foo
    '/foo': 'https://vc.systems',
  },
  port: 5005,
};
```

The following parameters are valid:

| parameter | type               | description                                                                                   |
| --------- | ------------------ | --------------------------------------------------------------------------------------------- |
| config    | string&vert;Object | an optional configObject or fileName to use for configuring the plugin                        |
| auth      | string             | potential auth string to download assets (index.html, config) with                            |
| port      | number             | optional alternative port (default 8008)                                                      |
| https     | boolean            | whether to use http (default) or https                                                        |
| mapConfig | string&vert;Object | an optional configObject resp. fileName or URL to a map config (for `serve` command)          |
| vcm       | string             | a filename or URL to a map (for `preview` command)                                            |
| proxy     | Object             | a server proxy (see [vitejs.dev](https://vitejs.dev/config/server-options.html#server-proxy)) |

## About Peer Dependencies

The [@vcmap/ui](https://github.com/virtualcitySYSTEMS/map-ui) uses some _very large libraries_, notably `CesiumJS`. To reduce the amount
of traffic generated for loading plugins, all large libraries (see the list below),
are _provided_ in production (instead of bundling them into every plugin). This
a) guarantees a certain amount of type safety (using the [@vcsuite/check](https://www.npmjs.com/package/@vcsuite/check) parameter assertion library for instance),
b) reduces the amount of traffic required to load an application and
c) leverages browser
caching more readily.

The following libraries are provided by the @vcmap/ui in a deployed application. You should define these
as peer dependencies if you use them in your plugin:

- @vcmap/core
- @vcmap-cesium/engine
- ol
- vue
- vuetify

If you want to update your plugin to a newer version of `@vcmap/ui`, the `@vcmap/plugin-cli` provides a update tool.
Just change to your plugin's directory and run:

```bash
vcmplugin update
```

This will automatically update all peer dependencies defined in your plugin to the corresponding version of the latest `@vcmap/ui`.

During the build step, these libraries are automatically externalized by the `@vcmap/plugin-cli` and in
production all plugins & the map core _share_ the same cesium library.

But, to make this work, it is important to define these dependencies as _peer dependencies_ of
a plugin and _that the provided index files_ are used (over directly importing from the source file).

For instance:

```js
import Cartesian3 from '@vcmap-cesium/engine/Source/Core/Cartesian3.js';
```

should be rewritten to:

```js
import { Cartesian3 } from '@vcmap-cesium/engine';
```

### What about openlayers?

openlayers provides a special case, since its modules do not provide a _flat_ namespace.
To circumvent this limitation, _the @vcmap/ui provides a flat namespaced ol.js_ and a mechanic
to rewrite openlayers imports. This is automatically applied by the `@vcmap/rollup-plugin-vcs-ol`
used by the `@vcmap/plugin-cli` build step. So openlayers imports can be written as:

```js
import Feature from 'ol/Feature.js';
```

or

```js
import { Feature } from 'ol';
```

## VC Map Plugins

The following defines a plugin in its rough structure. If you use the `@vcmap/plugin-cli`
to create your project, a template already adhering to these specs will be created for you.

- All plugins must provide the following:
  - `package.json` with name, description, version, author and dependencies.
  - `config.json` with default parameters for the plugins' configuration.
  - `README.md` describing the plugins' capabilities and usage.
  - `src/index.js` JS entry point.
- A plugin _may_ provide static plugin assets in a `plugin-assets` directory. (See [About Plugin Assets](#About-Plugin-Assets)
- Plugin names are defined by the plugins' package name and therefore must obey npm [package name guidelines](https://docs.npmjs.com/package-name-guidelines):
  - choose a name that
    - is unique
    - is descriptive
    - is lowercase
    - is uri encode-able
    - doesn't start with `.`, `_` or a digit
    - doesn't contain white spaces or any special characters like `~\'!()*"`
  - do not use scope `@vcmap`, since it is only to be used by official plugins provided
    by virtual city systems. But you are encouraged to use your own scope.
- Plugin dependencies have to be defined in the `package.json`.
  - `dependency`: all plugin specific dependencies NOT provided by the `@vcmap/ui`.
  - `peerDependency`: dependencies provided by the `@vcmap/ui`,
    - e.g. `@vcmap/core` or `@vcmap/ui` (see [About Peer Dependencies](#About-Peer-Dependencies) for more details)
  - `devDependency`: all dependencies only required for development, e.g. `eslint`.
- Plugins can be published to NPM, but should contain both source and minified code
  to allow seamless integration into the [VC Map UI](https://github.com/virtualcitySYSTEMS/map-ui) environment.
  For this reason the package.json of a plugin defines two exports:

```json
{
  ".": "./src/index.js",
  "./dist": "./dist/index.js"
}
```

### Plugin Interface:

Plugins must provide a function default export which returns an Object complying
with the VC Map Plugin Interface describe below. This function is passed the current
configuration of the plugin as its first argument and the base URL (without the filename)
from which the plugin was loaded as its second argument.

```typescript
declare interface VcsPlugin<T extends Object, S extends Object> {
  readonly name: string;
  readonly version: string;
  initialize(app: VcsUiApp, state?: S): Promise<void>;
  onVcsAppMounted(app: VcsUiApp): Promise<void>;
  getState(): Promise<S>;
  toJSON(): Promise<T>;
  destroy(): void;
}

declare function defaultExport<T extends Object, S extends Object>(
  config: T,
  baseUrl: string,
): VcsPlugin<T, S>;
```

A Simple JavaScript implementation of this interface can be seen below::

```javascript
// index.js
/**
 * @param {PluginExampleConfig} config
 * @returns {VcsPlugin}
 */
export default function defaultExport(config, baseUrl) {
  return {
    get name() {
      return packageJSON.name;
    },
    get version() {
      return packageJSON.version;
    },
    async initialize(app, state) {
      console.log('I was loaded from ', baseUrl);
    },
    async onVcsAppMounted(app) {},
    async getState() {
      return {};
    },
    async toJSON() {
      return {};
    },
    destroy() {},
  };
}
```

### About Plugin Assets

Plugin assets are considered to be static files, such as images, fonts etc. which shall be
access from within the plugin. Since plugins have no knowledge of _where_ they will
be deployed, the `@vcmap/ui` provides the `getPluginAssetUrl` helper function
which allows you to generate an asset URL at runtime.

Place all your assets into the `plugin-assets` directory in your plugin (top level). Your
plugin structure should look something like this:

```
-| my-plugin/
---| src/
-----| index.js
---| plugin-assets/
-----| icon.png
---| package.json
```

To access the `icon.png` from within your code, you would do the following:

```vue
<template>
  <v-img :src="icon" alt="plugin-icon" max-width="200" />
</template>

<script>
  import { inject } from 'vue';
  import { getPluginAssetUrl } from '@vcmap/ui';
  import { name } from '../package.json';

  export const windowId = 'hello_world_window_id_plugin-cli';

  export default {
    name: 'HelloWorld',
    components: { VcsButton },
    setup() {
      const app = inject('vcsApp');

      return {
        icon: getPluginAssetUrl(app, name, 'plugin-assets/icon.png'),
      };
    },
  };
</script>
```

You can of course, use `fetch` to retrieve assets in the same fashion. Should you
wish to use assets (such as images) in your _css_ make sure that they are embedded or
you will have to use an inline style & a bound vue property, since the helper
cannot handle css resources.

If you have to access assets _before_ your plugin is created (in the exported function of
your plugin code), you will have to use the `baseUrl` provided to you to generate the URL yourself.

## About testing plugins

To test your plugin's API you can use [vitest](https://vitest.dev/).
The `@vcmap/hello-world` plugin contains a basic setup of a test environment including example spec using vitest.
You will find the required setup in your created plugin, if you chose to add `test` as script to your `package.json` during the create-prompt.

As for now, we don't do any components testing.

## Notes on Developing

To develop the plugin-cli, be sure to not `npm link` into plugins, since this will
throw the resolver in resolving the @vcmap/ui peer dependency from the current plugin.
Instead, run `npm pack` in the plugin cli and install the tarball in the plugin directly.
