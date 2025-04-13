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
    documentSelector: [{ scheme: "file", language: "helm" }],
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
