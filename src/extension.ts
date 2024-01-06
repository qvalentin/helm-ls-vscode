import * as vscode from "vscode";

import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  WorkspaceFolder,
} from "vscode-languageclient/node";
import { getHelmLsExecutable } from "./util/executable";
import path from "path";
import fs from "fs";
import url from "url";

let client: LanguageClient;

export async function activate(_: vscode.ExtensionContext) {
  const helmLsExecutable = await getHelmLsExecutable();

  if (!helmLsExecutable) {
    vscode.window.showErrorMessage("Helm Ls executable not found");
    return;
  }

  console.log("Launching " + helmLsExecutable);

  const workSpacePath = vscode.workspace.workspaceFolders?.[0].uri.path;
  const filePath = vscode.window.activeTextEditor?.document.fileName;
  var cwd: string = workSpacePath ?? "";

  console.log("Workspace path: " + workSpacePath, "File path: " + filePath);
  if (workSpacePath && fs.existsSync(path.join(workSpacePath, "Chart.yaml"))) {
    console.log("Setting cwd to " + workSpacePath);
    cwd = workSpacePath
  }
  else if (filePath) {
    console.log("Setting cwd to " + traversePathUpToChartYaml(filePath));
    cwd = traversePathUpToChartYaml(filePath)
  }

  const executable: Executable = {
    command: helmLsExecutable,
    args: ["serve"],
    transport: TransportKind.stdio,
    options: {
      cwd: cwd
    }
  };

  const serverOptions: ServerOptions = {
    run: executable,
    debug: executable,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "helm" }],
    synchronize: {},
    workspaceFolder: {
      uri: vscode.Uri.file(cwd),
      name: vscode.workspace.workspaceFolders?.[0].name ?? "",
      index: 0
    }
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
  console.log("deactivate");
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function traversePathUpToChartYaml(directory: string): string {
  if (fs.existsSync(path.join(directory, "Chart.yaml"))) {
    return directory
  }
  const parent = path.dirname(directory)
  if (parent === "/") {
    return ""
  }
  return traversePathUpToChartYaml(parent)
}
