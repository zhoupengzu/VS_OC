import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Support code completion
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '[', ' ']
      }
    }
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// Example settings
interface ObjCLSPSettings {
  maxNumberOfProblems: number;
}

const defaultSettings: ObjCLSPSettings = { maxNumberOfProblems: 100 };
let globalSettings: ObjCLSPSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ObjCLSPSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ObjCLSPSettings>(
      (change.settings.objcLSP || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // Example validation logic for Objective-C
  // This is a simple placeholder. You'd need to implement real parsing/validation.
  
  const text = textDocument.getText();
  const pattern = /\b[A-Z][a-z0-9_]*\b/g;
  let m: RegExpExecArray | null;
  
  let problems = 0;
  const diagnostics: Diagnostic[] = [];
  
  const settings = await getDocumentSettings(textDocument.uri);
  
  while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
    if (m[0].length < 3) {
      problems++;
      
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(m.index),
          end: textDocument.positionAt(m.index + m[0].length)
        },
        message: `Class name "${m[0]}" is too short. Consider using a more descriptive name.`,
        source: 'objc-lsp'
      });
    }
  }
  
  // Send the computed diagnostics to VS Code.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function getDocumentSettings(resource: string): Thenable<ObjCLSPSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'objcLSP'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Basic completion implementation
connection.onCompletion(
  (_textDocumentPosition): CompletionItem[] => {
    // This is a very simple implementation - in a real-world scenario
    // you would parse the ObjC code and provide context-aware completions
    return [
      {
        label: 'NSString',
        detail: 'Objective-C string class',
        kind: 7 // Class
      },
      {
        label: 'NSArray',
        detail: 'Objective-C array class',
        kind: 7 // Class
      },
      {
        label: 'NSDictionary',
        detail: 'Objective-C dictionary class',
        kind: 7 // Class
      }
    ];
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen(); 