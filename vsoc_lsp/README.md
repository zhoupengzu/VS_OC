# VSOC LSP

A Visual Studio Code extension for Objective-C language support using Language Server Protocol (LSP).

## Features

- Basic syntax highlighting for Objective-C files
- Code completion for common Objective-C classes and methods
- Basic diagnostic capabilities for Objective-C code
- Support for `.m` and `.h` file extensions

## Requirements

- Visual Studio Code 1.60.0 or higher

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Copy the extension folder to your VS Code extensions folder or package it using VSCE

## Development

### Building the Extension

```bash
# Install dependencies
npm install

# Compile the TypeScript code
npm run compile

# Watch for changes
npm run watch
```

### Packaging the Extension

```bash
# Install vsce if you don't have it
npm install -g vsce

# Package the extension
vsce package
```

## Known Issues

This is an early version of the extension and has limited functionality. Future updates will include:

- Enhanced code completion
- Better error diagnostics
- Symbol search and go-to definition
- Code formatting

## License

MIT 