// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const copy_headers = require('./copy_headers');
const file = require('fs');
const fs = require('fs/promises');
const path = require('path');
let has_analyse_finished = false;
let waiting_analyse_file = {};
let result_dic = {};
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const workspaceFolder = vscode.workspace.workspaceFolders;
	if (!workspaceFolder) {
		console.log("未打开任何文件夹");
		return;
	}
	workspaceFolder.forEach((element, index) => {
		const folderPath = element.uri.fsPath;
        // 遍历查找是否存在xcode workspace
		// const files = file.readdirSync(path.join(folderPath));
		findFileWithExtension(folderPath, "xcodeproj").then((found) => {
			if (found) {
				console.log(new Date().toLocaleString());
				copy_headers.copy_system_frameworks(vscode, result_dic);
				console.log(new Date().toLocaleString());
				vscode.window.showInformationMessage('开始解析工程');
				copy_headers.find_files_analyse(folderPath, 'h', result_dic).then(()=>{
					console.log(new Date().toLocaleString());
					has_analyse_finished = true;
					if (waiting_analyse_file.length > 0) {
						console.log("有新文件变动");
						has_analyse_finished = false;
						// console.log(waiting_analyse_file);
						has_analyse_finished = true;
					}
					vscode.window.showInformationMessage('工程解析完成');
				});
			} else {
				console.log(`未找到以 xcodeproj 结尾的文件`);
			}
		});
	});
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event)=>{
		const document = event.document;
        const changes = event.contentChanges;

        changes.forEach((change) => {
            const range = change.range;
            const text = change.text;
            // console.log(`在文档 ${document.fileName} 中，位置 ${range.start.line}:${range.start.character} 输入了文本: ${text}`);
			if (has_analyse_finished) {
				has_analyse_finished = false;
				// console.log(document.fileName);
				has_analyse_finished = true;
			} else {
				waiting_analyse_file[document.fileName] = "1";
			}
        });
	}));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('objective-c', {
		provideCompletionItems(document, position, token, context) {
			// 获取当前行的文本
			const lineText = document.lineAt(position.line).text;
			// 获取当前输入字符的前缀
			const currentPrefix = lineText.substring(0, position.character);
			return checkMatchResult(currentPrefix);

			// console.log('当前输入的字符:', currentPrefix);
			// const completionItems = [
				// new vscode.CompletionItem('consoleLogxxx', vscode.CompletionItemKind.Function),
				// new vscode.CompletionItem('alertMessage', vscode.CompletionItemKind.Function),
			// 	new vscode.CompletionItem('myVariable', vscode.CompletionItemKind.Variable)
			// ];
			// // 设置自定义提示项的 sortText，让它们排在最前面
			// completionItems.forEach((item, index) => {
			// 	item.sortText = `0${index}`;
			// });
			// return completionItems;
		}
	}));
	// const provider = {
    //     provideDocumentLinks(document, token) {
    //         const links = [];
    //         const regex = /appGetTopMostController/g;
    //         let match;
    //         while ((match = regex.exec(document.getText()))) {
    //             const startPos = document.positionAt(match.index);
    //             const endPos = document.positionAt(match.index + match[0].length);
    //             const range = new vscode.Range(startPos, endPos);
    //             const targetLine = 20;
    //             if (targetLine < document.lineCount) {
    //                 const target = new vscode.Location(document.uri, new vscode.Position(targetLine, 0));
    //                 // 使用接受 Location 类型的构造函数
    //                 const link = new vscode.DocumentLink(range, document.uri); 
    //                 links.push(link);
    //             }
    //         }
    //         return links;
    //     }
    // };

    // const selector = { scheme: 'file', language: 'objective-c' };
    // const disposable = vscode.languages.registerDocumentLinkProvider(selector, provider);
    // context.subscriptions.push(disposable);
}

function checkIsWhiteSpace(char) {
    return /\s/.test(char);
}

function isAlphaNumeric(char) {
    return /^[a-zA-Z0-9]$/.test(char);
}

function checkMatchResult(words) {
	let temp = '';
	for (let i = words.length - 1; i >= 0; i--) {
		const ch = words[i]; 
		if (isAlphaNumeric(ch)) {
			temp = ch + temp;
			continue;
		}
		break;
	}
	if (result_dic.length == 0 || temp.length == 0) {
		return [];
	}
	return copy_headers.checkMatchResult(vscode, temp, result_dic);
}


async function findFileWithExtension(dir, ext) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
			if (fullPath.indexOf('.') != -1) {
				const paths = fullPath.split('.');
				if (paths[paths.length - 1] === ext) {
					return true;
				}
			}
            if (entry.isDirectory()) {
                const found = await findFileWithExtension(fullPath, ext);
                if (found) {
                    return true;
                }
            } else if (path.extname(entry.name) === ext) {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error('读取目录时出错:', err);
        return false;
    }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
