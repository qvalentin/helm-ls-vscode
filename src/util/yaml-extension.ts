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

type ManagedMeta = { managed: boolean; updatedAt?: number };

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

    const mementoKey = "helm-ls.yamlls.pathManaged";
    const managedMeta = context.globalState.get<ManagedMeta>(mementoKey);

    if (globalValue !== undefined) {
      if (managedMeta?.managed && Array.isArray(globalValue)) {
        const currentYamlLsPath = await getYamlLanguageServerFromExtension();
        if (currentYamlLsPath) {
          if (
            (globalValue.length === 1 && globalValue[0] === "node") ||
            globalValue[1] !== currentYamlLsPath
          ) {
            const yamlLsArray = ["node", currentYamlLsPath];
            await config.update(
              "yamlls.path",
              yamlLsArray,
              vscode.ConfigurationTarget.Global,
            );
            await context.globalState.update(mementoKey, {
              managed: true,
              updatedAt: Date.now(),
            });
            console.log(
              `Updated managed global 'helm-ls.yamlls.path' to: ${JSON.stringify(yamlLsArray)}`,
            );
          }
          return;
        }
        return;
      }

      console.log(
        "Detected user-defined global 'helm-ls.yamlls.path'; not overwriting.",
      );
      return;
    }

    const yamlLsPath = await getYamlLanguageServerFromExtension();
    if (yamlLsPath) {
      const yamlLsArray = ["node", yamlLsPath];
      await config.update(
        "yamlls.path",
        yamlLsArray,
        vscode.ConfigurationTarget.Global,
      );
      await context.globalState.update(mementoKey, {
        managed: true,
        lastPath: yamlLsPath,
        updatedAt: Date.now(),
      });
      console.log(
        `Set global 'helm-ls.yamlls.path' to: ${JSON.stringify(yamlLsArray)}`,
      );
    } else {
      console.log(
        "yaml-language-server not found, users may need to install it manually",
      );
    }
  } catch (error) {
    console.error("Error resolving yaml-language-server:", error);
  }
}
