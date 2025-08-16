import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises" 

/**
 * Gets the yaml-language-server JavaScript file path from the YAML vscode extension.
 * 
 * This function attempts to find the bundled yaml-language-server JavaScript file that comes 
 * with the YAML vscode extension, eliminating the need for users to install it separately.
 * 
 * @returns The path to the yaml-language-server JavaScript file, or null if not found.
 */
export async function getYamlLanguageServerFromExtension(): Promise<string | null> {
  try {
    // Get the YAML extension
    const yamlExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
    if (!yamlExtension) {
      console.log("YAML extension not found");
      return null;
    }

    // Check if the extension is active
    if (!yamlExtension.isActive) {
      console.log("YAML extension is not active, attempting to activate...");
      await yamlExtension.activate();
    }

    // The YAML extension bundles yaml-language-server as a JavaScript file
    const extensionPath = yamlExtension.extensionPath;
    
    // Look for the bundled languageserver.js file (this is what the YAML extension actually uses)
    const languageserverPath = path.join(extensionPath, "dist", "languageserver.js");
    
    // Check if the bundled file exists
    try {
      const stats = await fs.stat(languageserverPath);
      if (stats.isFile()) {
        console.log(`Found bundled yaml-language-server at: ${languageserverPath}`);
        return languageserverPath;
      }
    } catch (error) {
      console.log(`Bundled yaml-language-server not found at: ${languageserverPath}`);
    }

    console.log("yaml-language-server not found in YAML extension");
    return null;
  } catch (error) {
    console.error("Error getting yaml-language-server from YAML extension:", error);
    return null;
  }
}

/**
 * Gets the yaml-language-server path from the YAML extension.
 * 
 * @returns The path to the yaml-language-server, or null if not found.
 */
export async function getYamlLanguageServer(): Promise<string | null> {
  return await getYamlLanguageServerFromExtension();
}
