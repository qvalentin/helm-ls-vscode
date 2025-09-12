import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

export async function getYamllsPath(): Promise<string | string[] | null> {
  const config = vscode.workspace.getConfiguration("helm-ls");
  const yamllsPathFromConfig = config.get<string[] | string>("yamlls.path");
  config.inspect("yamlls.path");

  if (yamllsPathFromConfig) {
    console.log(
      `Using user-defined 'helm-ls.yamlls.path': ${yamllsPathFromConfig}`
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
    "languageserver.js"
  );

  // Check if the bundled file exists
  const exists = await fs.stat(yamllsPathFromYamlExtension).then(
    (s) => s.isFile(),
    () => false
  );

  if (exists) {
    const command = [process.execPath, ...process.execArgv, yamllsPathFromYamlExtension];
    console.log(
      `Found yaml-language-server from YAML extension. Using: ${command.join(' ')}`
    );
    return command;
  }

  console.log(
    `yaml-language-server from YAML extension not found at: ${defaultYamllsPath}`
  );
  return defaultYamllsPath
}
