# VScode extension for helm-ls

<!-- vim-markdown-toc GFM -->

- [Getting Started](#getting-started)
- [Requirements](#requirements)
- [Extension Settings](#extension-settings)
- [Contributing](#contributing)
- [License](#license)

<!-- vim-markdown-toc -->

Helm-ls-vscode connects VSCode to helm-ls to provide autocompletion, linting, hover, Go-To-Definition and support to use yaml-language-server for helm charts. The extension bundles yaml-language-server and automatically configures helm-ls to use it.

## Getting Started

Install the extension from either VSCode marketplace or Open-VSX

- [Open-VSX](https://open-vsx.org/extension/helm-ls/helm-ls)
- [VSCode marketplace](https://marketplace.visualstudio.com/items?itemName=helm-ls.helm-ls)

## Requirements

The extension will try to download helm-ls automatically.
A `helm_ls` (see [getting Started](https://github.com/mrjosh/helm-ls/#getting-started)) executable on your `PATH` will instead be preferred if found.
The extension will automatically use the bundled yaml-language-server.
If `yaml-language-server` is found on `PATH` or `helm-ls.yamlls.path` is configured this will be used instead.
See the helm-ls [readme](https://github.com/mrjosh/helm-ls/?tab=readme-ov-file#integration-with-yaml-language-server) for more info on yaml-language-server integration.

**Note:** While this extension provides language server features (autocompletion, linting, hover, etc.), the [kubernetes extension](https://github.com/vscode-kubernetes-tools/vscode-kubernetes-tools) is still recommended for additional features like syntax highlighting, snippets, and other Helm tooling.

## Extension Settings

The extension can be configured via the `helm-ls` extension settings.

- `helm-ls.path` (optional): Path to the `helm-ls` executable
- Server configuration as described in [Configuration options](https://github.com/mrjosh/helm-ls/?tab=readme-ov-file#configuration-options)

## Contributing

Contributions are welcome.

## License

Just like helm-ls the extension is open-source software licensed under the MIT license.
