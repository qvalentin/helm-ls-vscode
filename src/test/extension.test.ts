import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Helper function to wait for extension activation with timeout
 * Extension should activate automatically when Helm documents are opened
 */
async function waitForExtensionActivation(
  extensionId: string,
  timeout: number = 5000,
): Promise<vscode.Extension<any>> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const ext = vscode.extensions.getExtension(extensionId);
    if (ext?.isActive) {
      return ext;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Extension ${extensionId} failed to activate within ${timeout}ms`,
  );
}

/**
 * Helper function to open a Helm template file and wait for language server
 */
async function openHelmDocument(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<{ document: vscode.TextDocument; uri: vscode.Uri }> {
  const docPath = path.join(
    workspaceFolder.uri.fsPath,
    "src",
    "test",
    "fixtures",
    "testChart",
    "templates",
    "deployment.yaml",
  );
  const docUri = vscode.Uri.file(docPath);
  const document = await vscode.workspace.openTextDocument(docUri);
  await vscode.window.showTextDocument(document);

  // Give language server a moment to initialize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return { document, uri: docUri };
}

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Starting Helm LS extension tests");

  test("Extension loads and activates when opening Helm documents", async function () {
    this.timeout(7000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "No workspace folder found");

    // Extension should not be active initially
    const extBefore = vscode.extensions.getExtension("helm-ls.helm-ls");
    assert.ok(extBefore, "Extension should be installed");

    // Open a Helm file - this should trigger activation via onLanguage:helm
    await openHelmDocument(workspaceFolder);

    // Wait for extension to activate automatically
    const ext = await waitForExtensionActivation("helm-ls.helm-ls");
    assert.ok(
      ext.isActive,
      "Extension should be activated after opening Helm document",
    );
    assert.strictEqual(ext.id, "helm-ls.helm-ls");
  });

  test("Hover support for Helm templates", async function () {
    this.timeout(3000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "No workspace folder found");

    // Ensure extension is activated
    await waitForExtensionActivation("helm-ls.helm-ls");

    const { uri: docUri } = await openHelmDocument(workspaceFolder);

    // Test hover on .Values.replicaCount (line 9, assuming it's around column 25)
    const helmPosition = new vscode.Position(8, 25);
    const helmHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      docUri,
      helmPosition,
    );

    assert.ok(
      helmHovers && helmHovers.length > 0,
      "Should have hover information for Helm property",
    );

    const helmHoverContent = helmHovers[0].contents[0] as vscode.MarkdownString;
    assert.ok(helmHoverContent, "Hover content should exist");

    // Check for expected content (replicaCount value from values.yaml)
    assert.ok(
      helmHoverContent.value.includes("1") ||
        helmHoverContent.value.includes("replicaCount"),
      `Hover should show replicaCount value or reference. Got: ${helmHoverContent.value}`,
    );
  });

  test("Hover support for YAML schema", async function () {
    this.timeout(3000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "No workspace folder found");

    // Ensure extension is activated
    await waitForExtensionActivation("helm-ls.helm-ls");

    const { uri: docUri } = await openHelmDocument(workspaceFolder);

    // Test hover on 'spec' property (line 7)
    const yamlPosition = new vscode.Position(6, 3);
    const yamlHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      docUri,
      yamlPosition,
    );

    assert.ok(
      yamlHovers && yamlHovers.length > 0,
      "Should have hover information for YAML property",
    );

    const yamlHoverContent = yamlHovers[0].contents[0] as vscode.MarkdownString;
    assert.ok(yamlHoverContent, "YAML hover content should exist");

    // Check for Kubernetes documentation
    const content = yamlHoverContent.value.toLowerCase();
    assert.ok(
      content.includes("deployment") ||
        content.includes("spec") ||
        content.includes("specification"),
      `Hover should show Kubernetes schema info. Got: ${yamlHoverContent.value}`,
    );
  });
});
