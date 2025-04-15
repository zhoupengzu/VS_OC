const child_process = require('child_process');
const file = require('fs');
const fs = require('fs/promises');
const path = require('path');
const words_analyse = require('./word_analyse_info');

function copy_system_frameworks(vscode, result_dic) {
    // const oriPath = "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk/System/Library/Frameworks";
	// const destPath = __dirname;
	// let cmd = "cp -r " + oriPath + " " + destPath;
	// child_process.exec(cmd, (error, stdout, stderr) => {
	// 	if (error) {
    //         console.error(`Command execution error: ${error.message}`);
    //         vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
    //         return;
    //     }
    //     if (stderr) {
    //         console.warn(`Command execution warning: ${stderr}`);
    //         vscode.window.showWarningMessage(`命令执行有警告信息: ${stderr}`);
    //     }
    //     if (stdout) {
    //         console.log(`Command output: ${stdout}`);
    //     }
    //     vscode.window.showInformationMessage('文件拷贝成功');
    //     find_system_headfiles(vscode, destPath);
	// });
    find_system_headfiles(vscode, "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk/System/Library", result_dic);
}

async function find_system_headfiles(vscode, oriPath, result_dic) {
    const file_names = file.readdirSync(path.join(oriPath, "Frameworks"));
    for (const file of file_names) {
        if (file.startsWith("_")) continue;
        if (file.endsWith('framework') == false) continue;
        let word_info = new words_analyse.WordAnalyseInfo();
        word_info.type = words_analyse.WordsAnalyseType.frameworks;
        word_info.name = file;
        word_info.file_path = path.join(oriPath, "Frameworks/" + file);
        word_info.analyse_headers(result_dic);
    }
}

async function find_files_analyse(dir, result_dic) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.name.indexOf('.') != -1) {
                const paths = entry.name.split('.');
                if (paths[paths.length - 1] === 'h' || paths[paths.length - 1] === 'm') {
                    let word_info = new words_analyse.WordAnalyseInfo();
                    word_info.type = words_analyse.WordsAnalyseType.frameworks;
                    word_info.name = entry.name;
                    word_info.file_path = fullPath;
                    word_info.analyse_header(dir, entry.name, result_dic);
                    continue;
                }
            }
            if (entry.isDirectory()) {
                await find_files_analyse(fullPath, result_dic);
            }
        }
    } catch (err) {
        console.error('读取目录时出错:', err);
    }
}

function analyse_single_file(dir, file_name, result_dic) {
    let word_info = new words_analyse.WordAnalyseInfo();
    word_info.type = words_analyse.WordsAnalyseType.frameworks;
    word_info.name = file_name;
    word_info.file_path = path.join(dir, file_name);
    word_info.analyse_header(dir, file_name, result_dic);
}

function checkMatchResult(vscode, file_path, words, result_dic) {
    return words_analyse.checkMatchResult(vscode, file_path, words, result_dic);
}

function findMatchResultPosition(vscode, file_path, words, result_dic) {
    return words_analyse.findMatchResultPosition(vscode, file_path, words, result_dic);
}

module.exports = {
    copy_system_frameworks,
    find_system_headfiles,
    find_files_analyse,
    checkMatchResult,
    analyse_single_file,
    findMatchResultPosition
}