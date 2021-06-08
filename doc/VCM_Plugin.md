# VC MAP Plugin Docu

The VC MAP provides an interface for creating custom applications or functionalities as plugins.

## 1. Plugin Interface

The `vcs.vcm.plugins.Plugin` interface is defined as

| name | type | description 
| ---------- | ------------ | ------------------------
| version | `string` | the version of your plugin defined in the plugin's `package.json` |
| preInitialize | `function(vcs.vcm.plugins.Config):Promise<void>` | hook provided before framework initialization |
| postInitialize | `function(vcs.vcm.plugins.Config):Promise<void>` | hook provided after framework initialization |
| registerUiPlugin | `function(vcs.vcm.plugins.Config):Promise<vcs.ui.PluginOptions>` | hook for initializing ui components, must return an object of [vcs.ui.PluginOptions](https://lib.virtualcitymap.de/v4.0.x/doc/vcs.ui.html#.PluginOptions) |
| postUiInitialize | `function(vcs.vcm.plugins.Config):Promise<void>` | hook provided after ui initialization |

Each plugin must provide a version and utilize at least one of the four available hooks.
All hooks provide the plugin's config object, as it is defined in the plugins section of your VC MAP [config](./VCM_API_Introduction.md#2-config).
This way you can pass the plugins configurable parameters to your api or ui components.

The interface is implemented in the plugins `index.js`, which must export the version and utilized hooks. 

Also see [structure of a plugin](#2-structure-of-a-plugin) and [Plugin Tutorial](./VCM_Plugin_Tutorial.md).

## 2. Structure of a plugin

### 1. `package.json`
           
This file holds all relevant metadata. It is used to give information to npm that allows it to identify the project as well as handle the project's dependencies.
For more general information see [www.docs.npmjs.com](https://docs.npmjs.com/cli/v6/configuring-npm/package-json)

### 2. `config.json`

The config contains all relevant parameters of a plugin. The values defined in this `config.json` might serve as default values.
Adding a plugin to a VC MAP for **productive use** the same set of parameters has to be configured in your VC MAP [config](./VCM_API_Introduction.md#2-config) plugins section.
In the simplest case a plugin's config only contains the plugins name and entry point:
```json
{
  "name": "myFirstPlugin",
  "entry": "plugins/myFirstPlugin/myFirstPlugin.js"
}  
```

### 3. `README.md`
           
You should provide a README file describing your plugins capabilities. Explain briefly how to setup and configure your plugin in productive use.            

### 4. `src` folder
           
The source folder contains your plugins api and ui components. As entry point of a plugin serves the `index.js`.
It exports modules, which are imported by the VC MAP core. 
See [plugin interface](#1-plugin-interface) and [Plugin Tutorial](./doc/VCM_Plugin_Tutorial.md).

### 5. `assets` folder

Assets like image, sound or video files are stored in and imported from the assets folder.
