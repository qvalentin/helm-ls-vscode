import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { isExecutableOnPath } from "./executable";

export async function getYamllsPath(
  extensionPath: string,
): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("helm-ls");
  const yamllsPathFromConfig = config.get<string[] | string>("yamlls.path");

  if (yamllsPathFromConfig) {
    console.log(
      `Using user-defined 'helm-ls.yamlls.path': ${yamllsPathFromConfig}`,
    );
    return null;
  }

  const defaultYamllsPath = "yaml-language-server";

  if (await isExecutableOnPath(defaultYamllsPath)) {
    console.log(`Found yaml-language-server on path, using it`);
    return defaultYamllsPath;
  }

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
        `Found yaml-language-server from extension. Using: node ${yamllsPath}`,
      );
      return ["node", yamllsPath].join(",");
    }
    console.log(
      `Found yaml-language-server from extension. Using: ${process.execPath} ${yamllsPath}`,
    );
    // TODO: think about escaping arguments with spaces
    // https://github.com/sindresorhus/nano-spawn/blob/062aab5e376716e462d699f9a9200923f47705f3/source/spawn.js#L15
    const command = [
      process.execPath,
      ...process.execArgv.filter((flag) => !flag.startsWith("--inspect")),
      yamllsPath,
    ].join(",");
    return command;
  }

  console.log(
    `yaml-language-server not found at: ${yamllsPath}, using default ${defaultYamllsPath}`,
  );
  return defaultYamllsPath;
}
