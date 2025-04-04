
const file = require('fs');
const path = require('path');

function checkIsWhiteSpace(char) {
    return /\s/.test(char);
}

/**
 * 成员变量访问权限关键词
 */
const var_privicy_keywords = {
    '@public': '',
    '@protected': '',
    '@private':'',
};
/**
 * 成员变量内存管理修饰关键词
 */
const var_memory_keywords = {
    '__strong':'',
    '__weak': '',
    '__unsafe_unretained': '',
}

/**
 * 解析结果类型
 */
class WordsAnalyseKindType {
    /**
     * define
     */
    static define = 1;
    /**
     * 成员变量
     */
    static var = 2;
    /**
     * 属性
     */
    static property = 3;
    /**
     * 方法
     */
    static method = 4;
}
/**
 * 方法类型
 */
class WordsAnalyseKindMethodType {
    /**
     * 对象方法
     */
    static instance_method = 0;
    /**
     * 类方法
     */
    static class_method = 1;
    /**
     * C方法
     */
    static c_method = 2;
}
/**
 * 解析结果类型基类
 */
class WordsAnalyseKindBaseInfo {
    constructor(kindType) {
        this.kindType = kindType;
    }
    print_description() {

    }
}
/**
 * define
 */
class WordsAnalyseKindDefineInfo extends WordsAnalyseKindBaseInfo {
    constructor(defineName, defineValue) {
        super(WordsAnalyseKindType.define);
        this.defineName = defineName;
        this.defineValue = defineValue;
    }
    print_description() {
        console.log(this.defineName);
    }
}
/**
 * var
 */
class WordsAnalyseKindVarInfo extends WordsAnalyseKindBaseInfo {
    constructor(var_token_dic) {
        super(WordsAnalyseKindType.var);
        this.var_token_dic = var_token_dic;
    }
    print_description() {
        console.log("成员变量:" + this.var_token_dic);
    }
}
/**
 * 属性
 */
class WordsAnalyseKindPropertyInfo extends WordsAnalyseKindBaseInfo {
    constructor(proper_other_list) {
        super(WordsAnalyseKindType.property);
        this.proper_other_list = proper_other_list;
    }
    print_description() {
        console.log(this.proper_other_list);
    }
}
/**
 * 方法
 */
class WordsAnalyseKindMethodInfo extends WordsAnalyseKindBaseInfo {
    constructor(method_name, method_type) {
        super(WordsAnalyseKindType.method);
        this.method_name = method_name;
        this.method_type = method_type;
    }
    print_description() {

    }
}
/**
 * 解析内容来源
 */
class WordsAnalyseType {
    /**
     * framework
     */
    static frameworks = 'framework';
    /**
     * 源码
     */
    static source_code = 'source_code';
}

class WordAnalyseFileInfo {
    constructor(){
        this.file_path = "";
        this.file_name = "";
        this.position = 0;
        this.usefulKind = [];
    }
    read_file_content(){
        file.readFile(this.file_path, 'utf-8', (error, data)=>{
            this.begin_analyse(data);
        });
    }
    begin_analyse(data) {
        console.log(this.file_path);
        while(this.position < data.length) {
            let char = data[this.position];
            if (checkIsWhiteSpace(char)) { // 以空格开始
                this.position++;
                continue;
            }
            // 以/开始，可能是单行注释，也可能是多行注释
            if (char === "/") {
                if (this.position + 1 >= data.length) {
                    console.log("异常：“/”为末尾字符了");
                    break;
                }
                this.begin_analyse_comment(data);
                continue;
            }
            if (char.startsWith('#')) {// 一般为define宏定义，也有可能是空的、pragma、warning等
                this.begin_analyse_mark(data);
                continue;
            }
            if (char.startsWith('@')) { // 一般为OC的类,可能为@class、@interface、@implement @end等
                this.begin_analyse_class(data);
                continue;
            }
            // let temp = "";
            // while(this.position < data.length) {
            //     let char = data[this.position];
            //     if (checkIsWhiteSpace(char) || char === '\n') {
            //         break;
            //     }
            //     this.position++;
            //     temp += char;
            // }
            // if (temp.length > 0) {
            //     console.log(this.file_path);
            //     console.log('未处理内容:' + temp);
            // }
            this.position++;
        }
    }
    /**
     * 解析注释
     */
    begin_analyse_comment(data) {
        if (this.position + 1 < data.length && data[this.position + 1] === '*') {
            this.begin_analyse_multi_comment(data);
            return;
        }
        if(this.position + 1 < data.length && data[this.position + 1] === '/') {
            this.begin_analyse_single_comment(data);
            return;
        }
        this.position++;
    }
    /**
     * 解析interface
     */
    begin_analyse_interface(data) {
        /**
         * 获取类名
         */
        let class_name = "";
        let protocol_list = null;
        let super_class_name = "";
        let extension_name = "";
        let var_info = [];
        while(this.position < data.length) {
            let char = data[this.position];
            if (char === ':' || char === '<' || char === '(' || char === '{' || char === '-' || char === '@' || char === '+') {
                break;
            }
            this.position++;
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            class_name += char;
        }
        this.skip_to_useful_char(data);
        let temp = data[this.position];
        if (temp === ':') { // 父类
            super_class_name = this.begin_analyse_interface_supper(data);
        }
        console.log(class_name + ' 父类：' + super_class_name);
        temp = data[this.position];
        if (temp === '(') { // 扩展
            extension_name = this.begin_analyse_interface_extension(data);
        }
        temp = data[this.position];
        if (temp === '<') { // 协议
            protocol_list = this.begin_analyse_interface_protocol(data);
        }
        temp = data[this.position];
        if (temp === '{') { // 成员变量
            var_info = this.begin_analyse_interface_var(data);
        }
        this.begin_analyse_interface_property_method(data);
        this.begin_analyse_interface_end(data);
    }
    /**
     * 处理结束标记
     */
    begin_analyse_interface_end(data) {
        this.position += 4;
    }
    /**
     * 属性和方法
     */
    begin_analyse_interface_property_method(data) {
        this.skip_to_useful_char(data);
        if (this.position < data.length && data[this.position] === '/') {
            this.begin_analyse_comment(data);
            this.skip_to_useful_char(data);
        }
        if (this.position < data.length && data[this.position] === '#') {
            this.begin_analyse_mark(data);
            this.skip_to_useful_char(data);
        }
        let proper_list = [];
        let method_list = [];
        while(this.position < data.length) {
            const char = data[this.position];
            if (char === '@') {
                if (this.position+ 1 < data.length && data[this.position + 1] === 'e') break;
                this.skip_to_useful_char(data);
                this.position += 9; // property
                this.skip_to_useful_char(data);
                let proper_desc_list = [];
                let proper_desc = "";
                let ana_desc = false;
                let proper_other_list = [];
                let proper_other = '';
                while(this.position < data.length) {
                    const proper = data[this.position];
                    if (proper === '/') {
                        this.begin_analyse_comment(data);
                        this.skip_to_useful_char(data);
                        continue;
                    } else if (proper === '#') {
                        this.begin_analyse_mark(data);
                        this.skip_to_useful_char(data);
                        continue;
                    }
                    this.position++;
                    if (proper === ';') {
                        if (proper_other.length > 0) {
                            proper_other_list.push(proper_other);
                        }
                        break;
                    }
                    if (proper === '(' && ana_desc == false && proper_desc_list.length == 0) {
                        ana_desc = true;
                        continue;
                    }
                    
                    if (ana_desc) {
                        if (proper === ',') {
                            proper_desc_list.push(proper_desc);
                            proper_desc = '';
                            continue;
                        }
                        if (proper === ')') {
                            if (proper_desc.length > 0) {
                                proper_desc_list.push(proper_desc);
                            }
                            proper_desc = '';
                            ana_desc = false;
                            this.skip_to_useful_char(data);
                            continue;
                        }
                        proper_desc += proper;
                        continue;
                    }
                    if (checkIsWhiteSpace(proper) && proper_other.length > 0) {
                        proper_other_list.push(proper_other);
                        proper_other = '';
                        continue;
                    }
                    if (checkIsWhiteSpace(proper)) {
                        proper_other = '';
                        continue;
                    }
                    proper_other += proper;
                }
                // console.log('属性:' + proper_other_list);
                this.skip_to_useful_char(data);
                let proper_info = new WordsAnalyseKindPropertyInfo(proper_other_list);
                proper_list.push(proper_info);
            } else if (char === '-' || char === '+') {
                this.position++;
                this.skip_to_useful_char(data);
                let return_type = '';
                let ana_return = false;
                let method_name = '';
                let pre_space = false;
                while(this.position < data.length) {
                    let method = data[this.position];
                    if (method === '/') {
                        this.begin_analyse_comment(data);
                        this.skip_to_useful_char(data);
                        continue;
                    } else if (method === '#') {
                        this.begin_analyse_mark(data);
                        this.skip_to_useful_char(data);
                        continue;
                    }
                    this.position++;
                    if (ana_return == false && return_type.length == 0) {
                        this.skip_to_useful_char(data);
                    }
                    if(method === '(' && ana_return == false && return_type.length == 0) {
                        ana_return = true;
                        continue;
                    }
                    if (ana_return) {
                        if (method === ')') {
                            ana_return = false;
                            continue;
                        }
                        return_type += method;
                        continue;
                    }
                    if (method === ';')break;
                    if (method === '\n') {
                        method = ' ';
                    }
                    if (!pre_space || !checkIsWhiteSpace(method)) {
                        method_name += method;
                    }
                    if (checkIsWhiteSpace(method)) {
                        pre_space = true;
                    } else {
                        pre_space = false;
                    }
                }
                // console.log('方法:' + method_name);
                this.skip_to_useful_char(data);
                if (char === '+') {
                    let method = new WordsAnalyseKindMethodInfo(method_name, WordsAnalyseKindMethodType.class_method);
                    method_list.push(method);   
                } else {
                    let method = new WordsAnalyseKindMethodInfo(method_name, WordsAnalyseKindMethodType.instance_method);
                    method_list.push(method);
                }
            } else if (char === '/') {
                this.begin_analyse_comment(data);
                this.skip_to_useful_char(data);
            } else if (char === '#') {
                this.begin_analyse_mark(data);
                this.skip_to_useful_char(data);
            } else {
                this.position++;
                // console.log(this.file_path + ' 未知的方法字符:' + char);
            }
        }
        this.skip_to_useful_char(data);
    }
    /**
     * 成员变量
     */
    begin_analyse_interface_var(data) {
        let vars_list = [];
        this.position++;
        this.skip_to_useful_char(data);
        let var_sep_arr = [];
        let temp = '';
        while(this.position < data.length) {
            let char = data[this.position];
            if (char === '/') { // 注释
                this.begin_analyse_comment(data);
                this.skip_to_useful_char(data);
                continue;
            }
            if (char === '#') {
                this.begin_analyse_mark(data);
                this.skip_to_useful_char(data);
                continue;
            }
            if (char === '}') { // 成员变量结束
                break;
            }
            this.position++;
            if (char === '/n') {
                continue;
            }
            if ((checkIsWhiteSpace(char)  || char === ',') && temp.length > 0) {
                var_sep_arr.push(temp);
                temp = '';
                continue;
            }
            if (checkIsWhiteSpace(char)) {
                continue;
            }
            if (char === ';') {
                if (temp.length > 0) {
                    var_sep_arr.push(temp);
                }
                vars_list.push(var_sep_arr);
                temp = '';
                var_sep_arr = [];
                continue;
            }
            temp += char;
        }
        let var_dic = {};
        // vars_list.forEach(element_list => {
        //     // console.log("成员变量：" + element_list);
        //     // element_list.forEach(element => {
                
        //     // });
        // });
        this.skip_to_useful_char(data);
        let var_info = new WordsAnalyseKindVarInfo(var_dic);
        return var_info;
    }
    /**
     * 解析扩展
     */
    begin_analyse_interface_extension(data) {
        this.position++;
        this.skip_to_useful_char(data);
        let temp = '';
        while(this.position < data.length) {
            let char = data[this.position];
            if (char === ')') { // 扩展结束
                break;
            }
            this.position++;
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            temp += char;
        }
        this.skip_to_useful_char(data);
        return temp;
    }
    /**
     * 解析类的父类
     */
    begin_analyse_interface_supper(data) {
        this.position++;
        this.skip_to_useful_char(data);
        let temp = '';
        while(this.position < data.length) {
            let char = data[this.position];
            if (char === '<' || char === '{' || char === '-' || char === '+' || char === '@') { // 父类结束
                break;
            }
            else if (char === '/') {
                this.begin_analyse_comment(data);
                this.skip_to_useful_char(data);
                continue;
            } else if (char === '#') {
                this.begin_analyse_mark(data);
                this.skip_to_useful_char(data);
                continue;
            }
            this.position++;
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            temp += char;
        }
        this.skip_to_useful_char(data);
        return temp;
    }
    /**
     * 解析类的协议
     */
    begin_analyse_interface_protocol(data) {
        let protocol_list = [];
        this.position++;
        this.skip_to_useful_char(data);
        let temp = '';
        while(this.position < data.length) {
            let char = data[this.position];
            this.position++;
            if (char === '>') { // 协议结束
                protocol_list.push(temp);
                break;
            }
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            if (char == ',') {
                protocol_list.push(temp);
                temp = '';
                continue;
            }
            temp += char;
        }
        this.skip_to_useful_char(data);
        return protocol_list;
    }
    /**
     * 解析类定义
     */
    begin_analyse_class(data) {
        let kind_name = data[this.position];
        this.position++;
        while(this.position < data.length) {
            let char = data[this.position];
            if (checkIsWhiteSpace(char) || char === '\n') {
                break;
            }
            this.position++;
            kind_name += char;
        }
        this.skip_whitespace(data);
        if (kind_name === '@interface') {
            this.begin_analyse_interface(data);
        } else if (kind_name === '@class' || kind_name === '@optional') {
            this.skip_to_return(data);
        }
        //  else if (kind_name === '@protocol') {

        // }
         else {
            console.log('未知的kind_name:' + kind_name);
            while(this.position < data.length) {
                let char = data[this.position];
                if (char === '\n') {
                    break;
                }
                this.position++;
            }
        }
    }
    /**
     * 快进到下一个有效字符
     */
    skip_to_useful_char(data) {
        while(this.position < data.length) {
            let char = data[this.position];
            if (char !== '\n' && !checkIsWhiteSpace(char)) { // 去除空格
                break;
            }
            this.position++;
        }
    }
    /**
     * 快进到换行符之后
     */
    skip_to_return(data) {
        while(this.position < data.length) {
            let char = data[this.position];
            this.position++;
            if (char === '\n') {
                break;
            }
        }
    }
    /**
     * 跳过空白
     */
    skip_whitespace(data) {
        while(this.position < data.length) {
            let char = data[this.position];
            if (!checkIsWhiteSpace(char)) { // 去除空格
                break;
            }
            this.position++;
        }
    }
    /**
     * 解析#开始的内容
     */
    begin_analyse_mark(data) {
        let markType = data[this.position];
        this.position++;
        while(this.position < data.length) {
            let char = data[this.position];
            if (!checkIsWhiteSpace(char)) { // 去除#和define之间的空格
                break;
            }
            this.position++;
        }
        
        while(this.position < data.length) {
            let char = data[this.position];
            if (checkIsWhiteSpace(char) || char === '\n') {
                break;
            }
            this.position++;
            markType += char;
        }
        if (markType === '#define') {
            let key = "";
            let hasKey = false;
            while(this.position < data.length) {
                let char = data[this.position];
                this.position++;
                if (checkIsWhiteSpace(char) && hasKey == false) { // 过滤多余的空格
                    continue;
                }
                if (checkIsWhiteSpace(char)) {
                    break;
                }
                hasKey = true;
                key += char;
            }
            let value = "";
            let preValue = "";
            while(this.position < data.length) {
                let char = data[this.position];
                this.position++;
                if (char === '\n' && preValue !== '\\') {
                    break;
                }
                if (!checkIsWhiteSpace(char)) { // 去除多行define之后的\之后的空格
                    preValue = char;
                }
                value += char;
            }
            let define = new WordsAnalyseKindDefineInfo(key, value);
            this.usefulKind.push(define);
        } else if (markType === '#pragma' || markType === '#warning' || markType === '#if' || markType === '#ifndef' || markType === '#undef' || markType === '#ifdef' || markType === '#elif' || markType === '#endif' || markType === '#else' || markType === '#import' || markType === '#include' || markType === '#error') {
            while(this.position < data.length) {
                let char = data[this.position];
                if (char === '\n') {
                    break;
                }
                this.position++;
            }
        } else {
            console.log('未处理内容Mark:' + markType);
        }
    }
    /**
     * 解析单行注释
     */
    begin_analyse_single_comment(data) {
        while (this.position < data.length) {
            if(data[this.position] === '\n'){
                break;
            }
            this.position++;
        }
        this.position++;
    }
    /**
     * * 解析多行注释
     */
    begin_analyse_multi_comment(data) {
        this.position += 2;
        while (this.position < data.length) {
            if(data[this.position] === '*' && (this.position + 1 < data.length && data[this.position] === '/')){
                break;
            }
            this.position++;
        }
        this.position += 2;
    }
    print_decription() {
        this.usefulKind.forEach(element => {
            element.print_decription();
        });
    }
}

class WordAnalyseInfo {
    constructor(){
        this.type = WordsAnalyseType.frameworks;
        this.file_path = "";
        this.name="";
        this.files = [];
    }
    get header_paths() {
        return path.join(this.file_path, "Headers");
    }
    analyse_headers() {
        const headers_path = this.header_paths;
        file.readdir(headers_path, (error, files)=>{
            files.forEach((ele)=>{
                if (ele.endsWith('.h') == false) return;
                let file_info = new WordAnalyseFileInfo();
                file_info.file_name = ele;
                file_info.file_path = path.join(headers_path, ele);
                file_info.read_file_content();
                this.files.push(file_info);
            });
        });
    }
    description() {
        return "";
    }
}

module.exports = {
    WordsAnalyseKindBaseInfo,
    WordsAnalyseType,
    WordAnalyseInfo
}