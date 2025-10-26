import * as assert from "assert";
import * as path from "path";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Extension should be loaded', async function () {
		this.timeout(500000)
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(workspaceFolder, 'No workspace folder found');
		const docPath = path.join(workspaceFolder.uri.fsPath, 'src', 'test', 'fixtures', 'testChart', 'templates', 'deployment.yaml');
		const docUri = vscode.Uri.file(docPath);
		const document = await vscode.workspace.openTextDocument(docUri);
		await vscode.window.showTextDocument(document);

		await new Promise(resolve => setTimeout(resolve, 5000));

		const ext = vscode.extensions.getExtension('helm-ls.helm-ls');
		assert.ok(ext, 'Extension not found in vscode.extensions');
	
		console.log('Extension found:', ext.id);
		console.log('Is Active:', ext.isActive);
	
		if (!ext.isActive) {
		  await ext.activate();
		  console.log('Extension activated manually.');
		}
	
		assert.ok(ext.isActive, 'Extension failed to activate');
	  });

	test('Hover tests', async function () {
		this.timeout(500000)
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(workspaceFolder, 'No workspace folder found');
		const docPath = path.join(workspaceFolder.uri.fsPath, 'src', 'test', 'fixtures', 'testChart', 'templates', 'deployment.yaml');
		const docUri = vscode.Uri.file(docPath);
		const document = await vscode.workspace.openTextDocument(docUri);
		await vscode.window.showTextDocument(document);

		await new Promise(resolve => setTimeout(resolve, 5000));

		console.log("Testing hover")

		// Test hover on a Helm property: .Values.replicaCount at line 9
		const helmPosition = new vscode.Position(8, 25); // Position inside 'replicaCount'
		const helmHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
			'vscode.executeHoverProvider',
			docUri,
			helmPosition
		);

		assert.strictEqual(helmHovers.length, 1, 'Expected one hover for Helm property');
		const helmHoverContent = helmHovers[0].contents[0] as vscode.MarkdownString;
		// Assuming replicaCount is 1 in values.yaml
		assert.ok(helmHoverContent.value.includes('1'), `Hover content for Helm property should show the value. Got ${helmHoverContent.value}`);
		assert.ok(
			helmHoverContent.value.includes('values.yaml'),
			'Hover content for Helm property should mention the source file.'
		);

		// Test hover on a YAML property: spec at line 7
		const yamlPosition = new vscode.Position(6, 3); // Position inside 'spec'
		const yamlHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
			'vscode.executeHoverProvider',
			docUri,
			yamlPosition
		);

		assert.strictEqual(yamlHovers.length, 1, 'Expected one hover for YAML property');
		const yamlHoverContent = yamlHovers[0].contents[0] as vscode.MarkdownString;
		assert.ok(
			yamlHoverContent.value.includes('Unsupported&nbsp;Markup&nbsp;content&nbsp;received.&nbsp;Kind&nbsp;is:&nbsp;'),
			`Hover content for YAML property should show documentation. Got ${yamlHoverContent.value}`
		);
	});
});
