import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import * as vscode from "vscode";
import * as https from "https";
import * as crypto from "crypto";
import * as os from "os";
import { IncomingMessage } from "http";

const HELM_LS_VERSION = "v0.2.0";
const HELM_LS_REPO = "mrjosh/helm-ls";

interface PlatformInfo {
  platform: string;
  arch: string;
  extension: string;
}

function getPlatformInfo(): PlatformInfo {
  const platform = os.platform();
  const arch = os.arch();

  const platformMap: Record<string, string> = {
    win32: "windows",
    darwin: "darwin",
    linux: "linux",
  };

  const archMap: Record<string, string> = {
    x64: "amd64",
    arm64: "arm64",
    arm: "arm",
  };

  const platformName = platformMap[platform];
  const archName = archMap[arch];

  if (!platformName || !archName) {
    throw new Error(
      `Unsupported platform (${platform}) or architecture (${arch})`,
    );
  }

  return {
    platform: platformName,
    arch: archName,
    extension: platform === "win32" ? ".exe" : "",
  };
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    const request = https.get(url, resolve);
    request.on("error", reject);
  });

  if (response.statusCode === 301 || response.statusCode === 302) {
    const redirectUrl = response.headers.location;
    if (!redirectUrl) {
      throw new Error("Redirect location not found");
    }
    return downloadFile(redirectUrl, destPath);
  }

  if (response.statusCode !== 200) {
    throw new Error(`Failed to download file: ${response.statusCode}`);
  }

  const file = createWriteStream(destPath, { autoClose: true });
  try {
    await new Promise<void>((resolve, reject) => {
      response.pipe(file);
      file.on("finish", resolve);
      file.on("error", reject);
      response.on("error", reject);
    });
  } finally {
    file.end();
  }
}

async function verifyChecksum(
  filePath: string,
  expectedChecksum: string,
): Promise<boolean> {
  const fileBuffer = await fs.readFile(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return hash === expectedChecksum;
}

async function downloadHelmLs(
  context: vscode.ExtensionContext,
): Promise<string> {
  const { platform, arch, extension } = getPlatformInfo();
  const binaryName = `helm_ls_${platform}_${arch}${extension}`;
  const checksumName = `${binaryName}.sha256sum`;

  const downloadDir = context.globalStorageUri.fsPath;
  await fs.mkdir(downloadDir, { recursive: true });
  const binaryPath = path.join(downloadDir, `helm_ls${extension}`);
  const versionPath = path.join(downloadDir, "version");

  try {
    const stats = await fs.stat(binaryPath);
    if (stats.isFile()) {
      try {
        const storedVersion = await fs.readFile(versionPath, "utf8");
        if (storedVersion === HELM_LS_VERSION) {
          return binaryPath;
        }
      } catch {
        // Version file doesn't exist or is not accessible
      }
    }
  } catch {
    // File doesn't exist or is not accessible
  }

  vscode.window.showInformationMessage(
    `Downloading Helm language server ${HELM_LS_VERSION}...`,
  );

  const binaryUrl = `https://github.com/${HELM_LS_REPO}/releases/download/${HELM_LS_VERSION}/${binaryName}`;
  await downloadFile(binaryUrl, binaryPath);

  const checksumUrl = `https://github.com/${HELM_LS_REPO}/releases/download/${HELM_LS_VERSION}/${checksumName}`;
  const checksumPath = path.join(downloadDir, checksumName);
  await downloadFile(checksumUrl, checksumPath);

  const checksumContent = await fs.readFile(checksumPath, "utf8");
  const expectedChecksum = checksumContent.split("  ")[0];

  if (!(await verifyChecksum(binaryPath, expectedChecksum))) {
    throw new Error("Checksum verification failed");
  }

  await fs.chmod(binaryPath, 0o755);
  await fs.writeFile(versionPath, HELM_LS_VERSION);
  vscode.window.showInformationMessage(
    `Helm language server ${HELM_LS_VERSION} downloaded successfully.`,
  );
  return binaryPath;
}

export async function getHelmLsExecutable(
  context: vscode.ExtensionContext,
): Promise<string | null> {
  const pathFromConfig = vscode.workspace
    .getConfiguration("helm-ls")
    .get<string>("path");
  if (pathFromConfig) {
    return pathFromConfig;
  }

  const pathFromEnv = await isHelmLsOnPath("helm_ls");
  if (pathFromEnv) {
    return pathFromEnv;
  }

  try {
    return await downloadHelmLs(context);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to download helm-ls: ${error}`);
    return null;
  }
}

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
  } catch {
    return null;
  }
}

async function checkFileExists(filePath: string): Promise<string> {
  if ((await fs.stat(filePath)).isFile()) {
    return filePath;
  }
  throw new Error("Not a file");
}
