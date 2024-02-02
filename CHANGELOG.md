## 3.0.0

- Breaking: now requires vcmap/ui versions 5.1 and over.
- Adds support for typescript. New plugins can be created including vcs typescript defaults.

## 2.1.18

- Fix issues with serve and preview for options vcm, appConfig and proxy
- Removed protocol option `https`

## 2.1.17

- Hotfix for Broken 2.1.15/16 Update.

## 2.1.16

- Hotfix for Broken 2.1.15 Update.

## 2.1.15

- Excludes all @vcmap/ui dependencies from vite optimization, to allow for different versions of the same package in a plugin

## 2.1.13

- Add `bundle` alias for cli command `pack`. Create will now add "bundle" as script in package.json
- Update to latest @vcmap/ui@5.0.1
- Update help for `vcmplugin --help`

### 2.1.12

- Update to @vcmap/ui@5.0.0
- Update templates (using three @vcmap-show-case plugins from @vcmap/ui repo)
- Add mapVersion option to cli command `update`

### 2.1.9

- Update to vite 4 and other dev dependencies
- Updated to latest @vcmap/ui@5.0.0-rc.25
- Updated index.html to reflect the latest changes from @vcmap/ui
- Changed serve command to not build @vcmap/ui anymore if the dist folder does not exists.

### 2.1.8

- Updated to latest UI and Core Version
- New Cesium Version 1.105
- New Openlayers Version 7.3.0

### 2.1.7

- Bugfix

### 2.1-6

- add eslint-config 3.0.3
- support app.config.json and change injection of dev plugin

### 2.1.5

- Add support of vcmConfigJs for buildStagingApp
- Support defining a config within vcmConfigJs

### 2.1.4

- add cesium alias
- add Dockerfile for stagingApp if gitlabCi is added

### 2.1.3

- update cesium dependency
- fix windows asset paths on build

### 2.1.2

- build dist if missing

### 2.1.1

- fix spread in update peer deps

### 2.0.12

- introducing vcm.config.js
- add testing template, templating & update functionality
- add proxy for exampleData
- fix build staging app

### 2.0.11

- update deps
- update to vite 3, rm unplugin-vue-components

### 2.0.10

- add plugin-assets example

### 2.0.8

- update deps
- add staging to the default plugin Template

### 2.0.7

- fix vue version dep

### 2.0.6

- add preprocessor & fix chunks
- updated dev deps to be insync with ui

### 2.0.5

- update map ui
- removed ui-components

### 2.0.4

- update package.lock and ui dependency

### 2.0.3

- update optional peer dependencies to include vue

### 2.0.2

- update mapui dep
- update vcmplugin create to incorporate a hello world template
- update readme and documentation

### 2.0.1

- Breaking Change: use vite and `@vcmap/ui` version 5.0
  - (for plugin development with VC Map 4.x use version v1.1.1)

### 1.1.1

- add context option
- adds license on create
- rename cli and fix link

### 1.0.1

- update readme
- include vcsuite cli-logger
- delete example & small fixes
- add create command
- use webpack 5.36 with modules
