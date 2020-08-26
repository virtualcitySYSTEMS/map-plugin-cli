# VCM Plugin CLI
This helper package helps develop and build plugins for the **virtualcityMAP**.

## Usage
To install in your project:
```
npm i -D vcmplugin-cli
```

To install globally:
```
npm i -g vcmplugin-cli
```

### Serving your project
To serve your project, run the following within your projects root:
```
vcmplugin serve --vcm <url|directory>
```
This will launch a dev server at localhost:8080 using the specified `virtualcityMAP` application 
as its base. You can either specify a directory or a URL to an application.
> the legacy case of having a vcm folder within your project is still supported as the default.
```bash
# using a directory
vcmplugin serve --vcm /home/vcs/virtualcityMAP
# using a URL
vcmplugin serve --vcm https://berlin.virtualcitymap.de
```

### Building your project
To build your project, run the following from within your projects root:
```bash
vcmplugin build
```

#### Non-Global CLI & npm run
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

### Considerations
The legacy case was not as strict regarding the projects `package.json`. This approach relies
more heavily on a) the precense of a `package.json` and b) the validity of said package.json. For
instance the plugin name is directly derived from the `name` field in the package.json as is the 
entry point from `main`. You can still provide `name` as a CLI argument and `src/index.js` is still 
used, if `main` is missing from the `package.json`. This is do to change.
