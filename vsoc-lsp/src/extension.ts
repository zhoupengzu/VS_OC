import * as path from 'path';
import * as vscode from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('VSOC LSP extension is now active!');

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('out', 'server', 'server.js')
  );

  // Server debug options
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6010'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'objective-c' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'vsocLanguageServer',
    'VSOC Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
  context.subscriptions.push(
    vscode.commands.registerCommand('Helloworld', () => {
      client.sendRequest('custom/request', { text: 'Hello world!' }).then(
        (response) => {
          console.log('Response from server:', response);
        },
        (error) => {
          console.error('Error from server:', error);
        }
      );
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
} 