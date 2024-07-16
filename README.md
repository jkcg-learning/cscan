
# Cscan

## Description

The Cscan VSCode plugin provides real-time code scanning for security issues and code standards using the Codestral API.

## Features

- Real-time scanning on document save and change
- Highlights security issues and code standard violations
- Provides diagnostic messages in VSCode

## Installation

1. Clone the repository.
2. Run `npm install` to install dependencies.

## Configuration

### Environment Variables

To securely manage your API key, use environment variables. Follow these steps:

1. **Create a `.env` File:**
   Create a `.env` file in the root directory of your project and add your API key:

   ```env
   CODESRAL_API_KEY=your-api-key-here
   ```

2. **Install `dotenv` Package:**
   Ensure the `dotenv` package is installed by running:

   ```sh
   npm install dotenv
   ```

3. **Add `.env` to `.gitignore`:**
   To prevent the `.env` file from being committed to your repository, add it to `.gitignore`:

   ```gitignore
   node_modules/
   out/
   .env
   ```

### `codestral-config.json`

Update the `codestral-config.json` file with your API endpoint:

```json
{
    "apiEndpoint": "https://api.mistral.ai"
}
```

## Usage

1. Open a code file in VSCode.
2. Make changes or save the file to trigger scanning.
3. View diagnostic messages in the Problems panel or inline.

You can also manually trigger a scan by opening the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS), typing "Scan Code with Cscan", and selecting the command.

## Development

### Running the Extension

1. Open the project in VSCode.
2. Press `F5` to start debugging the extension in a new VSCode window.
3. Test the "Scan Code with Cscan" command and verify real-time scanning by making changes to the code.

### Building and Publishing

1. **Compile the Extension:**
   ```sh
   npm run compile
   ```

2. **Package the Extension:**
   ```sh
   vsce package
   ```

3. **Publish the Extension:**
   ```sh
   vsce publish
   ```

Ensure you increment the version number in `package.json` before publishing new versions.

## Contributing

Feel free to submit issues and pull requests.

## License

MIT License
