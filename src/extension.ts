import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { Config, ScanResult } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Load configuration from the config file.
 * @returns {Config} Configuration object.
 */
function getConfig(): Config {
    const configPath = path.join(__dirname, '..', 'codestral-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.apiKey = process.env.CODESRAL_API_KEY || '';
    return config;
}

/**
 * Scan the provided document using Codestral.
 * @param {vscode.TextDocument} document - The document to scan.
 * @param {Config} config - Configuration for Codestral API.
 * @param {vscode.DiagnosticCollection} diagnosticsCollection - Collection to hold diagnostics.
 */
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
        } else {
            vscode.window.showErrorMessage('Error scanning code: ' + String(error));
        }
    }
}

/**
 * Display the scan results as diagnostics in VSCode.
 * @param {ScanResult} results - Results from the Codestral API.
 * @param {vscode.Uri} uri - URI of the document.
 * @param {vscode.DiagnosticCollection} diagnosticsCollection - Collection to hold diagnostics.
 */
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

/**
 * Debounce function to limit the rate of function calls.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The debounce wait time in milliseconds.
 * @param {boolean} immediate - Whether to trigger the function immediately.
 * @returns {Function} The debounced function.
 */
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

/**
 * Activate the extension.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
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

    let disposable = vscode.commands.registerCommand('cscan.scanCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await scanCode(editor.document, config, diagnosticsCollection);
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Deactivate the extension.
 */
export function deactivate() {}
