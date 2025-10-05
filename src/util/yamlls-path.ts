import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { isExecutableOnPath } from "./executable";

export async function getYamllsPath(
  extensionPath: string,
): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("helm-ls");
  const yamllsPathFromConfig = config.get<string[] | string>("yamlls.path");
  config.inspect("yamlls.path");

  if (yamllsPathFromConfig) {
    console.log(
      `Using user-defined 'helm-ls.yamlls.path': ${yamllsPathFromConfig}`,
    );
    return null;
  }

  const defaultYamllsPath = "yaml-language-server";

  // Get the YAML extension
  const yamlExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
  if (!yamlExtension) {
    console.log("YAML extension not found");
    return defaultYamllsPath;
  }

  // The YAML extension bundles yaml-language-server as a JavaScript file
  // Look for the bundled languageserver.js file (this is what the YAML extension actually uses)
  const yamllsPathFromYamlExtension = path.join(
    yamlExtension.extensionPath,
    "dist",
    "languageserver.js",
  );

  const yamllsPath = path.join(
    extensionPath,
    "dist",
    "out",
    "server",
    "src",
    "server.js",
  );

  // Check if the bundled file exists
  const exists = await fs.stat(yamllsPath).then(
    (s) => s.isFile(),
    () => false,
  );

  if (exists) {
    if (await isExecutableOnPath("node")) {
      console.log(
        `Found yaml-language-server from YAML extension. Using: node ${yamllsPathFromYamlExtension}`,
      );
      return ["node", yamllsPath].join(",");
    }
    // TODO: think about escaping arguments with spaces
    // https://github.com/sindresorhus/nano-spawn/blob/062aab5e376716e462d699f9a9200923f47705f3/source/spawn.js#L15
    const command = [
      process.execPath,
      ...process.execArgv.filter((flag) => !flag.startsWith("--inspect")),
      yamllsPathFromYamlExtension,
    ].join(",");
    console.log(
      `Found yaml-language-server from YAML extension. Using: ${command}`,
    );
    return command;
  }

  console.log(
    `yaml-language-server from YAML extension not found at: ${defaultYamllsPath}`,
  );
  return defaultYamllsPath;
}
