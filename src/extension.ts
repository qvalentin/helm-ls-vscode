import * as vscode from "vscode";
import * as path from "path";

import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { getHelmLsExecutable } from "./util/executable";
import { getYamlLanguageServer } from "./util/yaml-extension";

let client: LanguageClient;

/**
 * Activates the Helm Language Server extension.
 *
 * This asynchronous function retrieves the Helm-ls executable using the provided extension context.
 * If the executable is not found, it displays an error message to the user and aborts activation.
 * Otherwise, it configures and starts a language client to interface with the Helm Language Server.
 *
 * @param context The VS Code extension context used to access environment resources.
 */
export async function activate(context: vscode.ExtensionContext) {
  const helmLsExecutable = await getHelmLsExecutable(context);

  if (!helmLsExecutable) {
    vscode.window.showErrorMessage("Helm-ls executable not found");
    return;
  }

  // Try to get yaml-language-server from the YAML extension
  let yamlLsNodeCommand: string | null = null;
  try {
    const yamlLsPath = await getYamlLanguageServer();
    if (yamlLsPath) {
      yamlLsNodeCommand = `node ${yamlLsPath}`;
      console.log(`Found yaml-language-server at: ${yamlLsPath}`);
      console.log(`Will use command: ${yamlLsNodeCommand}`);
      
      // Update the configuration to use the found yaml-language-server with node
      const config = vscode.workspace.getConfiguration("helm-ls");
      
      // Pass as array: ["node", "/path/to/languageserver.js"]
      const yamlLsArray = ["node", yamlLsPath];
      
      // Try to update both global and workspace configurations
      await config.update("yamlls.path", yamlLsArray, vscode.ConfigurationTarget.Global);
      await config.update("yamlls.path", yamlLsArray, vscode.ConfigurationTarget.Workspace);
      
      console.log(`Updated yaml-language-server path to: ${JSON.stringify(yamlLsArray)}`);
      
      // Also log the current configuration to verify it was set
      const currentPath = config.get("yamlls.path");
      console.log(`Current yamlls.path configuration: ${JSON.stringify(currentPath)}`);
      
      // Force a configuration reload by getting a fresh config object
      const freshConfig = vscode.workspace.getConfiguration("helm-ls");
      const freshPath = freshConfig.get("yamlls.path");
      console.log(`Fresh yamlls.path configuration: ${JSON.stringify(freshPath)}`);
    } else {
      console.log("yaml-language-server not found, users may need to install it manually");
    }
  } catch (error) {
    console.error("Error setting up yaml-language-server:", error);
  }

  console.log("Launching " + helmLsExecutable);
  
  // Log the environment variables that will be passed to helm-ls
  if (yamlLsNodeCommand) {
    console.log(`Will pass YAMLLS_PATH environment variable: ${yamlLsNodeCommand}`);
  }

  const executable: Executable = {
    command: helmLsExecutable,
    args: ["serve"],
    transport: TransportKind.stdio,
    options: {
      env: {
        ...process.env,
        ...(yamlLsNodeCommand && { YAMLLS_PATH: yamlLsNodeCommand })
      }
    }
  };

  const serverOptions: ServerOptions = {
    run: executable,
    debug: executable,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { 
        language: "helm",
        scheme: "file",
      },
      {
        language: "yaml",
        pattern: "**/values*.yaml",
        scheme: "file",
      },
    ],
    synchronize: {},
  };

  client = new LanguageClient(
    "helm-ls",
    "Helm Language Server",
    serverOptions,
    clientOptions,
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  console.log("Deactivating helm-ls");
  if (!client) {
    return undefined;
  }
  return client.stop();
}
