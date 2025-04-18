// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const copy_headers = require('./copy_headers');
const file = require('fs');
const fs = require('fs/promises');
const path = require('path');
let has_analyse_finished = false;
let waiting_analyse_file = {};
let waiting_delete_file = {};
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
				vscode.window.showInformationMessage('开始解析系统文件');
				console.log(new Date().toLocaleString());
				copy_headers.copy_system_frameworks(vscode, result_dic);
				vscode.window.showInformationMessage('系统文件解析完成');
				console.log(new Date().toLocaleString());
				vscode.window.showInformationMessage('开始解析工程');
				copy_headers.find_files_analyse(folderPath, result_dic).then(()=>{
					console.log(new Date().toLocaleString());
					has_analyse_finished = true;
					if (Object.keys(waiting_delete_file).length > 0) {
						gotoDeleteFile();
					}
					if (Object.keys(waiting_analyse_file).length > 0) {
						console.log("有新文件变动");
						gotoAnalyseNewChangeFile();
					}
					vscode.window.showInformationMessage('工程解析完成');
				});
			} else {
				console.log(`未找到以 xcodeproj 结尾的文件`);
			}
		});
	});
	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document)=>{
        if (document.fileName.endsWith('.h') == false) return;
		waiting_analyse_file[document.fileName] = "1";
		// console.log(`在文档 ${document.fileName} 中，位置 ${range.start.line}:${range.start.character} 输入了文本: ${text}`);
		if (has_analyse_finished) {
			gotoAnalyseNewChangeFile();
		}
	}));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('objective-c', {
		provideCompletionItems(document, position, token, context) {
			// 获取当前行的文本
			const lineText = document.lineAt(position.line).text;
			
			// 获取当前输入字符的前缀
			const currentPrefix = lineText.substring(0, position.character);
			return checkMatchResult(currentPrefix, document.fileName);
		}
	}));
	const watcher = vscode.workspace.createFileSystemWatcher('**/*');
	const createDisposable = watcher.onDidCreate((uri)=>{
		if (uri.fsPath.endsWith('.h') == false && uri.fsPath.endsWith('.m')) return;
		waiting_analyse_file[uri.fsPath] = "1";
		if (has_analyse_finished) {
			gotoAnalyseNewChangeFile();
		}
	});
	const deleteDisposable = watcher.onDidDelete((uri)=>{
		if (uri.fsPath.endsWith('.h') == false && uri.fsPath.endsWith('.m')) return;
		waiting_delete_file[uri.fsPath] = "1";
		if (has_analyse_finished) {
			gotoDeleteFile();
		}
	});
	const changeDisposable = watcher.onDidChange((uri)=>{
		if (uri.fsPath.endsWith('.h') == false && uri.fsPath.endsWith('.m')) return;
		waiting_analyse_file[uri.fsPath] = "1";
		if (has_analyse_finished) {
			gotoAnalyseNewChangeFile();
		}
	});
	context.subscriptions.push(watcher, createDisposable, deleteDisposable, changeDisposable);
    context.subscriptions.push(vscode.commands.registerCommand('extension.getClickcccccPositionAndContent', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;

            // 如果没有选中内容，获取当前行的内容
			const position = editor.selection.active;
			// 解析完整的内容
			// const total_line = document.lineCount;
			const curr_line = position.line;
			const line = document.lineAt(curr_line);
			const lineText = line.text;
			let isImport = (lineText.startsWith("#import") || lineText.startsWith("#include"));
			const length = lineText.length;
			let temp_index = position.character;
			let temp_words = "";
			if (isImport) {
				while (temp_index >= 0) {
					const char = lineText[temp_index];
					temp_index--;
					if (char !== "+" && char !== "." && !isAlphaNumeric(char)) break;
					temp_words = char + temp_words;
				}
				temp_index = position.character + 1;
				while (temp_index < lineText.length) {
					const char = lineText[temp_index];
					temp_index++;
					if (char !== "+" && char !== "." && !isAlphaNumeric(char)) break;
					temp_words += char;
				}
			} else {
				while (temp_index >= 0) {
					const char = lineText[temp_index];
					temp_index--;
					if (!isAlphaNumeric(char) && char !== '_') break;
					temp_words = char + temp_words;
				}
				temp_index = position.character + 1;
				while (temp_index < lineText.length) {
					const char = lineText[temp_index];
					temp_index++;
					if (!isAlphaNumeric(char) && char !== '_') break;
					temp_words += char;
				}
			}
			if (temp_words.length == 0) {
				vscode.window.showInformationMessage('未找到匹配结果。');
				return;
			}
			const find_list = copy_headers.findMatchResultPosition(vscode, document.fileName, temp_words, result_dic);
			if (find_list.length == 0) {
				vscode.window.showInformationMessage('未找到匹配结果。');
				return;
			}
			// 让用户选择一个匹配结果
			const items = find_list.map(match => {
				return {
					label: `${match.label}`,
					description: '',
					detail: match.jumpTip,
					filePath: match.filePath,
					lineNumber: match.lineNumber
				};
			});
			if (items.length == 1) {
				const selectedItem = items[0];
				const fileUri = vscode.Uri.file(selectedItem.filePath);
					vscode.workspace.openTextDocument(fileUri)
					   .then(doc => {
							const position = new vscode.Position(selectedItem.lineNumber, 0);
							const selection = new vscode.Selection(position, position);
							return vscode.window.showTextDocument(doc, {
								selection: selection,
								preview: false
							});
						})
				return;
			}
			vscode.window.showQuickPick(items, {
				placeHolder: '请选择要跳转的位置'
			}).then((selectedItem)=> {
				if (selectedItem) {
					const fileUri = vscode.Uri.file(selectedItem.filePath);
					vscode.workspace.openTextDocument(fileUri)
					   .then(doc => {
							const position = new vscode.Position(selectedItem.lineNumber, 0);
							const selection = new vscode.Selection(position, position);
							return vscode.window.showTextDocument(doc, {
								selection: selection,
								preview: false
							});
						})
				}
			});
        }
    }));
}

function gotoDeleteFile() {
	let file_keys = Object.keys(waiting_analyse_file);
	for (const file_name of file_keys) {
		result_dic.delete(file_name);
	}
	waiting_delete_file = {};
}

function gotoAnalyseNewChangeFile() {
	has_analyse_finished = false;
	let file_keys = Object.keys(waiting_analyse_file);
	for (const file_name of file_keys) {
		const parsedPath = path.parse(file_name);
		if (parsedPath.dir.length == 0 || parsedPath.base.length == 0) {
			continue;
		}
		copy_headers.analyse_single_file(parsedPath.dir, parsedPath.base, result_dic);
	}
	has_analyse_finished = true;
	waiting_analyse_file = {};
}

function checkIsWhiteSpace(char) {
    return /\s/.test(char);
}

function isAlphaNumeric(char) {
    return /^[a-zA-Z0-9]$/.test(char);
}

function checkMatchResult(words, file_path) {
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
	return copy_headers.checkMatchResult(vscode, file_path, temp, result_dic);
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
