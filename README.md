# VCM Plugin CLI
This helper package helps develop and build plugins for the **VC MAP**.

For more information on plugin development refer to the following documentations:
- [Introduction to VC MAP API](./doc/VCM_API_Introduction.md) for help on usage of VC MAP API
- [VC MAP Plugin Docu](./doc/VCM_Plugin.md) for description on the plugin interface and basic structure of a plugin  
- [Plugin Tutorial](./doc/VCM_Plugin_Tutorial.md) for a detailed description on how to create a plugin

## Features

- Creating basic plugin structure
- Providing plugin development server
- Building plugins for production

## Prerequisite

You need [nodejs](https://nodejs.org/en/) and npm installed on your system to use this tool.

## Installation
To install in your project:
```shell
npm i -D vcmplugin-cli
```

To install globally:
```shell
npm i -g vcmplugin-cli
```

## Usage

### 1. Creating a new plugin

To create a new plugin template, run the following within your projects root:
```
vcmplugin create
```
This will open a command prompt helping you to create the basic [structure of a plugin](./doc/VCM_Plugin.md#2-structure-of-a-plugin).


### 2. Serving a plugin for development

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

### 3. Building a plugin

To build your project, run the following from within your projects root:
```bash
vcmplugin build
```

### 4. Integrating a plugin in a productive VC MAP

To pack your project for productive use, run the following from within your projects root:
```bash
vcmplugin pack
```

This will create a folder `dist` with a zip file containing your bundled code and assets.
To use the plugin productively in a hosted map, unzip this file on your server to `{vcm-root}/plugins` and add an entry to your VC MAP [config](#2-config) plugins section.

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
    "vcmplugin-cli": "^0.1.1"
  }
}
```

## Considerations
The legacy case was not as strict regarding the projects `package.json`. This approach relies
more heavily on a) the precense of a `package.json` and b) the validity of said package.json. For
instance the plugin name is directly derived from the `name` field in the package.json as is the 
entry point from `main`. You can still provide `name` as a CLI argument and `src/index.js` is still 
used, if `main` is missing from the `package.json`. This is do to change.
