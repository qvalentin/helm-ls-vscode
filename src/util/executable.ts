import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import * as vscode from "vscode";
import * as https from "https";
import * as crypto from "crypto";
import * as os from "os";
import { IncomingMessage } from "http";

const HELM_LS_VERSION = "v0.5.0";
const HELM_LS_REPO = "mrjosh/helm-ls";

interface PlatformInfo {
  platform: string;
  arch: string;
  extension: string;
}

/**
 * Retrieves standardized platform information for the current operating system.
 *
 * This function uses Node.js OS methods to obtain the system's platform and architecture,
 * mapping them to standardized names. It returns a PlatformInfo object containing the platform,
 * architecture, and executable file extension (".exe" for Windows, an empty string for other systems).
 *
 * @throws {Error} If the current platform or architecture is unsupported.
 * @returns A PlatformInfo object with standardized details.
 */
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

/**
 * Downloads a file from a given URL and saves it to the specified destination path.
 *
 * This function initiates an HTTPS GET request to fetch the file. If the server responds with a
 * redirect (HTTP status 301 or 302), it follows the redirect by recursively calling itself with the new URL.
 * The file is streamed to the destination and the write stream is closed upon completion or error.
 *
 * @param url - The URL of the file to download.
 * @param destPath - The local file system path where the file should be saved.
 *
 * @throws {Error} If a redirect response is missing the Location header or if the final response status is not 200.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log("Helm-ls: Downloading file ", url);
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
    throw new Error(`Failed to download file ${url}: ${response.statusCode}`);
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

/**
 * Computes the SHA-256 hash of a file and compares it against an expected value.
 *
 * This function reads the file at the specified path, computes its SHA-256 hash,
 * and checks if the resulting hexadecimal digest matches the provided expected checksum.
 *
 * @param filePath - The path to the file whose checksum is to be verified.
 * @param expectedChecksum - The expected SHA-256 hash value in hexadecimal format.
 * @returns A promise that resolves to true if the computed hash matches the expected checksum, otherwise false.
 */
async function verifyChecksum(
  filePath: string,
  expectedChecksum: string,
): Promise<boolean> {
  const fileBuffer = await fs.readFile(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return hash === expectedChecksum;
}

/**
 * Downloads and verifies the Helm language server executable.
 *
 * If a matching executable already exists in the extension's global storage, its path is returned.
 * Otherwise, the function downloads the binary and its corresponding checksum file from GitHub,
 * verifies the checksum, sets the executable permissions, and writes the current version to a file.
 *
 * @param platformInfo - Contains the platform name, architecture, and file extension used to form the download URLs.
 * @returns The file path to the downloaded Helm language server executable.
 *
 * @throws {Error} When the checksum verification of the downloaded binary fails.
 */
export async function downloadHelmLs(
  context: vscode.ExtensionContext,
  platformInfo: PlatformInfo,
): Promise<string> {
  const { platform, arch, extension } = platformInfo;
  const binaryName = `helm_ls_${platform}_${arch}${extension}`;
  const checksumName = `helm_ls_${platform}_${arch}.sha256sum`;

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

/**
 * Retrieves the Helm language server executable path.
 *
 * The function first checks the user configuration for a predefined Helm language server path.
 * If not found, it searches for the executable in the system PATH. If the executable is still
 * unavailable, it attempts to download it for the current platform. In case of a download failure,
 * an error message is displayed and null is returned.
 *
 * @returns The path to the Helm language server executable, or null if it cannot be obtained.
 */
export async function getHelmLsExecutable(
  context: vscode.ExtensionContext,
): Promise<string | null> {
  const pathFromConfig = vscode.workspace
    .getConfiguration("helm-ls")
    .get<string>("path");
  if (pathFromConfig) {
    if (!(await fs.stat(pathFromConfig)).isFile()) {
      vscode.window.showErrorMessage(
        `Helm-ls path configured in settings is not a file: ${pathFromConfig}`,
      );
      return null;
    }
    return pathFromConfig;
  }

  const pathFromEnv = await isExecutableOnPath("helm_ls");
  if (pathFromEnv) {
    return pathFromEnv;
  }

  try {
    return await downloadHelmLs(context, getPlatformInfo());
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to download helm-ls: ${error}`);
    return null;
  }
}

/**
 * Checks if the specified executable exists on the system PATH.
 *
 * This function generates possible file paths by combining each directory from the PATH
 * with the executable name appended by each extension specified in PATHEXT, and returns
 * the first valid path where the executable is found. If none of the candidates exist,
 * it returns null.
 *
 * @param exe - The base name of the executable (without file extension).
 * @returns The full path to the executable if found; otherwise, null.
 */
export async function isExecutableOnPath(exe: string): Promise<string | null> {
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

/**
 * Checks whether the specified path exists and is a file.
 *
 * Validates that the file system entry at the given path exists and is a regular file.
 * Returns the same file path if validation is successful.
 *
 * @param filePath - The path to verify.
 * @returns The original file path if it points to a valid file.
 *
 * @throws {Error} If the path does not refer to a valid file.
 */
async function checkFileExists(filePath: string): Promise<string> {
  if ((await fs.stat(filePath)).isFile()) {
    return filePath;
  }
  throw new Error("Not a file");
}
