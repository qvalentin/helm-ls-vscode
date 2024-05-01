import path from "path";
import fs from "fs/promises";
import * as vscode from "vscode";

export async function getHelmLsExecutable(): Promise<string | null> {
  const pathFromConfig: (string | undefined) = vscode.workspace.getConfiguration("helm-ls").get("path")
  if (pathFromConfig) {
    return pathFromConfig;
  }
  return await isHelmLsOnPath(`helm_ls`);
}

/**
 * @param {string} exe executable name (without extension if on Windows)
 * @return {Promise<string|null>} executable path if found
 * */
async function isHelmLsOnPath(exe: string): Promise<string | null> {
  const envPath = process.env.PATH || "";
  const envExt = process.env.PATHEXT || "";
  const pathDirs = envPath
    .replace(/["]+/g, "")
    .split(path.delimiter)
    .filter(Boolean);
  const extensions = envExt.split(";");
  const candidates = pathDirs.flatMap((d) =>
    extensions.map((ext) => path.join(d, exe + ext)),
  );
  try {
    return await Promise.any(candidates.map(checkFileExists));
  } catch (e) {
    return null;
  }

  async function checkFileExists(filePath: string) {
    if ((await fs.stat(filePath)).isFile()) {
      return filePath;
    }
    throw new Error("Not a file");
  }
}
