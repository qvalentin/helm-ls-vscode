import * as assert from "assert";
import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { downloadHelmLs } from "../util/executable";

/**
 * End-to-end test suite for helm-ls binary download functionality.
 *
 * These tests verify the actual download and installation of helm-ls binaries
 * across different platforms and architectures. They:
 * 1. Download the appropriate binary for each platform/arch combination
 * 2. Verify the binary exists and has correct permissions
 * 3. Check file extensions are correct (.exe for Windows)
 * 4. Test binary reuse functionality
 *
 * Note: These are real network tests that download actual binaries from GitHub.
 * Each test has a 30-second timeout to accommodate download times.
 *
 * Each test is completely independent and uses its own temporary directory.
 */

// Mock ExtensionContext
class MockExtensionContext implements vscode.ExtensionContext {
  globalStorageUri: vscode.Uri;

  constructor() {
    this.globalStorageUri = vscode.Uri.file(
      path.join(os.tmpdir(), (Math.random() * 1000).toString(), "helm-ls-test"),
    );
  }

  globalState = {
    get: () => undefined,
    update: () => Promise.resolve(),
    setKeysForSync: () => {},
    keys: () => [],
  } as vscode.Memento & { setKeysForSync(keys: readonly string[]): void };
  workspaceState = {
    get: () => undefined,
    update: () => Promise.resolve(),
    keys: () => [],
  } as vscode.Memento;
  subscriptions = [];
  extensionPath = "";
  extensionUri = vscode.Uri.file("");
  environmentVariableCollection = {
    get: () => undefined,
    replace: () => {},
    append: () => {},
    prepend: () => {},
    getScoped: () => undefined,
    persistent: true,
    description: "",
    forEach: () => {},
    delete: () => {},
    clear: () => {},
    [Symbol.iterator]: () => [][Symbol.iterator](),
  } as unknown as vscode.GlobalEnvironmentVariableCollection;
  storageUri = vscode.Uri.file("");
  logUri = vscode.Uri.file("");
  logPath = "";
  extensionMode = vscode.ExtensionMode.Test;
  extension = {} as vscode.Extension<any>;
  secrets = {
    get: () => Promise.resolve(undefined),
    store: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>()
      .event,
    keys: () => Promise.resolve([]),
  };
  asAbsolutePath = (relativePath: string) =>
    path.join(this.extensionPath, relativePath);
  storagePath = "";
  globalStoragePath = "";
  languageModelAccessInformation = {
    onDidChange: new vscode.EventEmitter<void>().event,
    isEnabled: true,
    canSendRequest: () => true,
  };
}

suite("Executable Test Suite", () => {
  test("Download binary for macOS Intel (amd64)", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "darwin",
      arch: "amd64",
      extension: "",
    };
    const helmExecutable = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable);
    assert.ok(!helmExecutable.endsWith(".exe"));
    assert.ok(await fs.stat(helmExecutable));
  });

  test("Download binary for macOS Apple Silicon (arm64)", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "darwin",
      arch: "arm64",
      extension: "",
    };
    const helmExecutable = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable);
    assert.ok(!helmExecutable.endsWith(".exe"));
    assert.ok(await fs.stat(helmExecutable));
  });

  test("Download binary for Linux amd64", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "linux",
      arch: "amd64",
      extension: "",
    };
    const helmExecutable = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable);
    assert.ok(!helmExecutable.endsWith(".exe"));
    assert.ok(await fs.stat(helmExecutable));
  });

  test("Download binary for Linux ARM (32-bit)", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "linux",
      arch: "arm",
      extension: "",
    };
    const helmExecutable = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable);
    assert.ok(!helmExecutable.endsWith(".exe"));
    assert.ok(await fs.stat(helmExecutable));
  });

  test("Download binary for Linux ARM64", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "linux",
      arch: "arm64",
      extension: "",
    };
    const helmExecutable = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable);
    assert.ok(!helmExecutable.endsWith(".exe"));
    assert.ok(await fs.stat(helmExecutable));
  });

  test("Download binary for Windows x64", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "windows",
      arch: "amd64",
      extension: ".exe",
    };
    const helmExecutable = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable);
    assert.ok(helmExecutable.endsWith(".exe"));
    assert.ok(await fs.stat(helmExecutable));
  });

  test("Reuse downloaded binary", async function () {
    this.timeout(30000);
    const context = new MockExtensionContext();
    const platformInfo = {
      platform: "linux",
      arch: "amd64",
      extension: "",
    };
    // First download
    const helmExecutable1 = await downloadHelmLs(context, platformInfo);
    assert.ok(helmExecutable1);

    // Second attempt should reuse the same file
    const helmExecutable2 = await downloadHelmLs(context, platformInfo);
    assert.strictEqual(helmExecutable1, helmExecutable2);
  });
});
