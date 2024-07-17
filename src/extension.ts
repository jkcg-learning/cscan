import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Config } from './types';

// Load environment variables from .env file
dotenv.config();

function getConfig(): Config {
    const configPath = path.join(__dirname, '..', 'codestral-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.apiKey = process.env.MISTRAL_API_KEY || '';
    if (!config.apiKey) {
        console.error('API key is missing!');
    } else {
        console.log('API key loaded successfully.');
    }
    return config;
}

async function chatWithCodestral(prompt: string, config: Config): Promise<string> {
    try {
        const response = await axios.post(`${config.apiEndpoint}/v1/fim/completions`, {
            prompt: prompt,
            max_tokens: 1000,
            apiKey: config.apiKey
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data.message || error.message);
        } else if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(String(error));
        }
    }
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
                    case 'askQuestion':
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            const question = message.text;
                            const code = editor.document.getText();
                            const prompt = `${code}\n\nQuestion: ${question}`;
                            try {
                                const response = await vscode.window.withProgress(
                                    {
                                        location: vscode.ProgressLocation.Notification,
                                        title: "Connecting to Codestral...",
                                        cancellable: false
                                    },
                                    async () => {
                                        return await chatWithCodestral(prompt, config);
                                    }
                                );
                                panel.webview.postMessage({ command: 'chatResponse', response: response });
                            } catch (error) {
                                if (error instanceof Error) {
                                    vscode.window.showErrorMessage('Error: ' + error.message);
                                } else {
                                    vscode.window.showErrorMessage('Error: ' + String(error));
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
