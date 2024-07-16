export interface Config {
    apiEndpoint: string;
    apiKey: string;
}

export interface Issue {
    line: number;
    message: string;
    severity: 'high' | 'medium' | 'low';
}

export interface ScanResult {
    issues: Issue[];
}
