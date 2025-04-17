# VSOC Language Server Protocol Extension

A VS Code extension that implements the Language Server Protocol (LSP).

## Features

This extension provides:

* Language diagnostics for plaintext files
* Basic code completion
* Customizable settings

## Requirements

* VS Code 1.86.0 or higher

## Extension Settings

This extension contributes the following settings:

* `vsocLanguageServer.maxNumberOfProblems`: Controls the maximum number of problems reported.

## Known Issues

* This is a basic implementation for demonstration purposes.

## Release Notes

### 0.1.0

Initial release of VSOC LSP extension.

## Development

### Building the Extension

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to launch the extension in debug mode

### Testing

To test the extension:

1. Open a plaintext file
2. Type some text with capitalized words to see diagnostics
3. Try using code completion (Ctrl+Space) 