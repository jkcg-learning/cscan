import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Config, ScanResult } from './types';

// Load environment variables from .env file
dotenv.config();

function getConfig(): Config {
    const configPath = path.join(__dirname, '..', 'codestral-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.apiKey = process.env.CODESRAL_API_KEY || '';
    return config;
}

async function scanCode(document: vscode.TextDocument, config: Config, diagnosticsCollection: vscode.DiagnosticCollection) {
    const code = document.getText();
    const language = document.languageId;

    try {
        const response = await axios.post<ScanResult>(`${config.apiEndpoint}/v1/scan`, {
            code: code,
            language: language,
            apiKey: config.apiKey
        });

        displayResults(response.data, document.uri, diagnosticsCollection);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            vscode.window.showErrorMessage('Error scanning code: ' + (error.response?.data.message || error.message));
        } else if (error instanceof Error) {
            vscode.window.showErrorMessage('Error scanning code: ' + error.message);
        } else {
            vscode.window.showErrorMessage('Error scanning code: ' + String(error));
        }
    }
}

function displayResults(results: ScanResult, uri: vscode.Uri, diagnosticsCollection: vscode.DiagnosticCollection) {
    const diagnostics: vscode.Diagnostic[] = results.issues.map(issue => {
        const severity = issue.severity === 'high' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
        return new vscode.Diagnostic(
            new vscode.Range(issue.line - 1, 0, issue.line - 1, 100),
            issue.message,
            severity
        );
    });
    diagnosticsCollection.set(uri, diagnostics);
}

function debounce(func: Function, wait: number, immediate: boolean = false) {
    let timeout: NodeJS.Timeout | null;
    return function(this: any, ...args: any[]) {
        const context = this;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

function getWebviewContent(extensionUri: vscode.Uri): string {
    const scriptUri = vscode.Uri.joinPath(extensionUri, 'webview', 'index.js');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cscan Chat</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
                margin: 0;
                padding: 0;
                height: 100vh;
                display: flex;
                flex-direction: column;
            }
            #messages {
                flex: 1;
                padding: 10px;
                overflow-y: scroll;
            }
            #input {
                display: flex;
                border-top: 1px solid #ccc;
            }
            #input textarea {
                flex: 1;
                padding: 10px;
                border: none;
                outline: none;
                resize: none;
            }
            #input button {
                padding: 10px;
                border: none;
                background: #007acc;
                color: white;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <div id="messages"></div>
        <div id="input">
            <textarea id="messageInput" rows="1" placeholder="Type a message..."></textarea>
            <button id="sendButton">Send</button>
        </div>
        <script src="${scriptUri}"></script>
    </body>
    </html>`;
}

export function activate(context: vscode.ExtensionContext) {
    const config = getConfig();
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection('cscan');

    const debouncedScanCode = debounce(scanCode, 2000);

    vscode.workspace.onDidSaveTextDocument((document) => {
        scanCode(document, config, diagnosticsCollection);
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
        debouncedScanCode(event.document, config, diagnosticsCollection);
    });

    context.subscriptions.push(vscode.commands.registerCommand('cscan.scanCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await scanCode(editor.document, config, diagnosticsCollection);
        }
    }));

    context.subscriptions.push(
        vscode.commands.registerCommand('cscan.startChat', () => {
            const panel = vscode.window.createWebviewPanel(
                'cscanChat',
                'Cscan Chat',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            panel.webview.html = getWebviewContent(context.extensionUri);

            panel.webview.onDidReceiveMessage(async message => {
                switch (message.command) {
                    case 'scanCode':
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            const code = editor.document.getText();
                            try {
                                const response = await vscode.window.withProgress(
                                    {
                                        location: vscode.ProgressLocation.Notification,
                                        title: "Scanning code...",
                                        cancellable: false
                                    },
                                    async () => {
                                        return await axios.post(config.apiEndpoint, {
                                            prompt: code,
                                            max_tokens: 1000,
                                            apiKey: config.apiKey
                                        });
                                    }
                                );
                                panel.webview.postMessage({ command: 'scanResult', result: response.data });
                            } catch (error) {
                                if (error instanceof Error) {
                                    vscode.window.showErrorMessage('Error scanning code: ' + error.message);
                                } else {
                                    vscode.window.showErrorMessage('Error scanning code: ' + String(error));
                                }
                            }
                        }
                        return;
                }
            });
        })
    );
}

export function deactivate() {}
