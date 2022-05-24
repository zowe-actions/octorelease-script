# Sample plugin

**TODO:** Update readme for Run Script action

[Octorelease](https://github.com/octorelease/octorelease) sample plugin.

[![Build Status](https://github.com/octorelease/sample-plugin/workflows/Test/badge.svg)](https://github.com/octorelease/sample-plugin/actions?query=workflow%3ATest+branch%3Amaster)
[![npm latest version](https://img.shields.io/npm/v/@octorelease/sample-plugin/latest.svg)](https://www.npmjs.com/package/@octorelease/sample-plugin)
<!-- [![npm next version](https://img.shields.io/npm/v/@octorelease/sample-plugin/next.svg)](https://www.npmjs.com/package/@octorelease/sample-plugin) -->

| Step | Description |
|------|-------------|
| `init` | Validate plugin configuration. |
| `version` | Print hello message if project version has changed. |
| `publish` | Add already published package to list of released packages. |
| `success` | Print happy message. |
| `fail` | Print sad message. |

## Install

```bash
$ npm install @octorelease/sample-plugin -D
```

## Usage

The plugin can be configured in the [Octorelease configuration file](https://github.com/octorelease/octorelease/blob/master/docs/usage.md#configuration):

```json
{
  "plugins": [
    ["@octorelease/sample-plugin", {
      "name": "world"
    }]
  ]
}
```

## Configuration

### Options

| Options | Description | Default |
| ------- | ----------- | ------- |
| `name`  | Name to say hello to. | (required) |
