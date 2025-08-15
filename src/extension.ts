import * as vscode from "vscode";

import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { getHelmLsExecutable } from "./util/executable";

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

  console.log("Launching " + helmLsExecutable);

  const executable: Executable = {
    command: helmLsExecutable,
    args: ["serve"],
    transport: TransportKind.stdio,
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
