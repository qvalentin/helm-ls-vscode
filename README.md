# VScode extension for helm-ls

<!-- vim-markdown-toc GFM -->

- [Getting Started](#getting-started)
- [Requirements](#requirements)
- [Extension Settings](#extension-settings)
- [Contributing](#contributing)
- [License](#license)

<!-- vim-markdown-toc -->

Helm-ls-vscode connects VSCode to helm-ls to provide autocompletion, linting, hover, Go-To-Definition and support to use yaml-language-server for helm charts.

## Getting Started

Install the extension from either VSCode marketplace or Open-VSX

- [Open-VSX](https://open-vsx.org/extension/helm-ls/helm-ls)
- [VSCode marketplace](https://marketplace.visualstudio.com/items?itemName=helm-ls.helm-ls)

## Requirements

The extension will try to download helm-ls automatically.
A `helm_ls` (see [getting Started](https://github.com/mrjosh/helm-ls/#getting-started)) executable on your `PATH` will be preferred if found.
The [kubernetes extension](https://github.com/vscode-kubernetes-tools/vscode-kubernetes-tools) is a dependency for this extension and will be also installed.

> [!IMPORTANT]
> You will also need yaml-language-server installed on your system for all features. See the helm-ls [readme](https://github.com/mrjosh/helm-ls/?tab=readme-ov-file#integration-with-yaml-language-server)

## Extension Settings

The extension can be configured via the `helm-ls` extension settings.

- `helm-ls.path` (optional): Path to the `helm-ls` executable
- Server configuration as described in [Configuration options](https://github.com/mrjosh/helm-ls/?tab=readme-ov-file#configuration-options)

## Contributing

Contributions are welcome.

## License

Just like helm-ls the extension is open-source software licensed under the MIT license.
