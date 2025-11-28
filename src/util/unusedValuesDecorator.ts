import * as vscode from 'vscode';

let decorationType: vscode.TextEditorDecorationType;

function getDecorationOptions(): vscode.DecorationRenderOptions {
    const isLightTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light;

    const color = isLightTheme
        ? 'rgba(180, 141, 0, 0.33)'
        : 'rgba(253, 251, 251, 0.43)';

    return {
        textDecoration: `underline wavy ${color}`,
        overviewRulerColor: color,
        overviewRulerLane: vscode.OverviewRulerLane.Right
    };
}

export function activate(context: vscode.ExtensionContext) {
    decorationType = vscode.window.createTextEditorDecorationType(getDecorationOptions());

    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(() => {
            decorationType.dispose();
            decorationType = vscode.window.createTextEditorDecorationType(getDecorationOptions());
            refreshAllEditors();
        })
    );

    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics((event) => {
            event.uris.forEach(uri => {
                const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
                if (editor) {
                    updateDecorations(editor);
                }
            });
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
            if (editor && isValuesFile(editor.document.fileName)) {
                updateDecorations(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                updateDecorations(editor);
            }
        })
    );

    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor);
    }
}

function isValuesFile(fileName: string): boolean {
    return fileName.includes('values.yaml') || fileName.includes('values.yml');
}

function refreshAllEditors() {
    vscode.window.visibleTextEditors.forEach(editor => {
        updateDecorations(editor);
    });
}

function updateDecorations(editor: vscode.TextEditor) {
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);

    const unusedValueDecorations: vscode.DecorationOptions[] = diagnostics
        .filter(diagnostic =>
            // TODO: Remove empty source check after helm-ls commit 780fcd0 is merged
            (diagnostic.source === 'helm-ls unused values' || diagnostic.source === '') &&
            diagnostic.tags?.includes(vscode.DiagnosticTag.Unnecessary)
        )
        .map(diagnostic => ({
            range: diagnostic.range,
            hoverMessage: new vscode.MarkdownString(`⚠️ ${diagnostic.message}`)
        }));

    editor.setDecorations(decorationType, unusedValueDecorations);
}

export function deactivate() {
    if (decorationType) {
        decorationType.dispose();
    }
}
