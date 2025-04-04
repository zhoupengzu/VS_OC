const child_process = require('child_process');
const file = require('fs');
const path = require('path');
const words_analyse = require('./word_analyse_info');

function copy_system_frameworks(vscode) {
    const oriPath = "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk/System/Library/Frameworks";
	const destPath = __dirname;
	let cmd = "cp -r " + oriPath + " " + destPath;
	child_process.exec(cmd, (error, stdout, stderr) => {
		if (error) {
            console.error(`Command execution error: ${error.message}`);
            vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
            return;
        }
        if (stderr) {
            console.warn(`Command execution warning: ${stderr}`);
            vscode.window.showWarningMessage(`命令执行有警告信息: ${stderr}`);
        }
        if (stdout) {
            console.log(`Command output: ${stdout}`);
        }
        vscode.window.showInformationMessage('文件拷贝成功');
        find_system_headfiles(vscode, destPath);
	});
}

function find_system_headfiles(vscode, oriPath) {
    file.readdir(path.join(oriPath, "Frameworks"), (error, file_names)=> {
        if (error) {
            vscode.window.showInformationMessage("读取文件错误");
            return;
        }
        let analyseInfo = [];
        file_names.forEach(file => {
            if (file.startsWith("_")) return;
            if (file.endsWith('framework') == false) return;
            let word_info = new words_analyse.WordAnalyseInfo();
            word_info.type = words_analyse.WordsAnalyseType.frameworks;
            word_info.name = file;
            word_info.file_path = path.join(oriPath, "Frameworks/" + file);
            word_info.analyse_headers();
            analyseInfo.push(word_info);
        });
    });
}

module.exports = {
    copy_system_frameworks
}