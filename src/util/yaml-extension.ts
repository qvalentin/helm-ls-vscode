import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

/**
 * Gets the yaml-language-server JavaScript file path from the YAML vscode extension.
 *
 * This function attempts to find the bundled yaml-language-server JavaScript file that comes
 * with the YAML vscode extension, eliminating the need for users to install it separately.
 *
 * @returns The path to the yaml-language-server JavaScript file, or null if not found.
 */
export async function getYamlLanguageServerFromExtension(): Promise<
  string | null
> {
  try {
    // Get the YAML extension
    const yamlExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
    if (!yamlExtension) {
      console.log("YAML extension not found");
      return null;
    }

    // The YAML extension bundles yaml-language-server as a JavaScript file
    const extensionPath = yamlExtension.extensionPath;

    // Look for the bundled languageserver.js file (this is what the YAML extension actually uses)
    const languageserverPath = path.join(
      extensionPath,
      "dist",
      "languageserver.js",
    );

    // Check if the bundled file exists
    try {
      const stats = await fs.stat(languageserverPath);
      if (stats.isFile()) {
        console.log(
          `Found bundled yaml-language-server at: ${languageserverPath}`,
        );
        return languageserverPath;
      }
    } catch (error) {
      console.log(
        `Bundled yaml-language-server not found at: ${languageserverPath}`,
      );
    }

    console.log("yaml-language-server not found in YAML extension");
    return null;
  } catch (error) {
    console.error(
      "Error getting yaml-language-server from YAML extension:",
      error,
    );
    return null;
  }
}

export async function configureYamlLsNodeCommandIfRequired(
  context: vscode.ExtensionContext,
) {
  try {
    const config = vscode.workspace.getConfiguration("helm-ls");
    const inspected = config.inspect<string[] | string>("yamlls.path");

    const workspaceFolderValue = inspected?.workspaceFolderValue;
    const workspaceValue = inspected?.workspaceValue;
    const globalValue = inspected?.globalValue;

    if (workspaceFolderValue !== undefined || workspaceValue !== undefined) {
      console.log(
        "Detected workspace-level 'helm-ls.yamlls.path'; not overwriting.",
      );
      return;
    }

    // Resolve the current yaml-language-server path from the YAML extension
    const yamlExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
    const extensionPath = yamlExtension?.extensionPath;
    const resolvedYamlLsPath = await getYamlLanguageServerFromExtension();

    if (!resolvedYamlLsPath) {
      console.log(
        "yaml-language-server not found in YAML extension; users may need to install it manually",
      );
      return;
    }

    const yamlLsArray = ["node", resolvedYamlLsPath] as const;

    // Helper: determine if a given path is inside the YAML extension folder
    const isPathFromYamlExtension = (candidatePath: unknown): boolean => {
      if (typeof candidatePath !== "string" || !extensionPath) {
        return false;
      }
      const normalizedCandidate = path.normalize(candidatePath);
      const extensionsBaseDir = path.normalize(path.dirname(extensionPath));
      // Any versioned folder like 'redhat.vscode-yaml-1.14.0' under the extensions base dir
      const yamlExtensionDirPrefix = path.normalize(
        path.join(extensionsBaseDir, "redhat.vscode-yaml-") + path.sep,
      );
      return normalizedCandidate.startsWith(yamlExtensionDirPrefix);
    };

    if (globalValue === undefined) {
      // Nothing set globally: set it to the YAML extension's server
      await config.update(
        "yamlls.path",
        yamlLsArray,
        vscode.ConfigurationTarget.Global,
      );
      console.log(
        `Set global 'helm-ls.yamlls.path' to: ${JSON.stringify(yamlLsArray)}`,
      );
      return;
    }

    // If a global value exists, only manage it when it clearly points into the YAML extension
    if (Array.isArray(globalValue)) {
      const [command, maybePath] = globalValue as [unknown, unknown];

      // Case: previously set to just ["node"], or set to YAML extension path
      const looksManaged =
        (command === "node" && typeof maybePath === "undefined") ||
        (command === "node" && isPathFromYamlExtension(maybePath));

      if (!looksManaged) {
        console.log(
          "Detected user-defined global 'helm-ls.yamlls.path'; not overwriting.",
        );
        return;
      }

      // If the configured path differs from the current YAML extension path, update it
      if (
        command !== "node" || maybePath !== resolvedYamlLsPath
      ) {
        await config.update(
          "yamlls.path",
          yamlLsArray,
          vscode.ConfigurationTarget.Global,
        );
        console.log(
          `Updated global 'helm-ls.yamlls.path' to: ${JSON.stringify(yamlLsArray)}`,
        );
      }
      return;
    }

    // Non-array global values are treated as user-defined; leave them intact
    console.log(
      "Detected user-defined global 'helm-ls.yamlls.path'; not overwriting.",
    );
  } catch (error) {
    console.error("Error resolving yaml-language-server:", error);
  }
}
