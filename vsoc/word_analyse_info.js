
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
    /**
     * 类
     */
    static class = 5;
    /**
     * 协议
     */
    static protocol = 6;
    /**
     * 枚举
     */
    static enum = 7;
    /**
     * 类实现
     */
    static class_implementation = 8;
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
        this.line_number = 0;
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
 * 类
 */
class WordsAnalyseKindClassInfo extends WordsAnalyseKindBaseInfo {
    constructor(class_name, kind_type) {
        super(kind_type);
        this.class_name = class_name;
        this.super_name = "";
        this.extension_name = "";
        this.protocol_list = [];
        this.var_list = [];
        this.property_list = [];
        this.method_list = [];
    }
    print_description() {
        console.log(this.class_name);
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
        this.snippet_method_name = "";
        this.begin_analyse_method_to_snnipets(this.method_name);
    }
    begin_analyse_method_to_snnipets(method_name) {
        if (method_name.length > 0) {
            let method_snippets = "";
            let snnips_list = method_name.split(':');
            let index = 0;
            for (const element of snnips_list) {
                if (index == 0) {
                    method_snippets = method_snippets + element + ":$" + (index + 1) + " ";
                } else if (index == snnips_list.length - 1) {
                    
                } else {
                    let tempSepList = element.split(' ');
                    method_snippets = method_snippets + tempSepList[tempSepList.length - 1] + ":$" + (index + 1);
                    if (index < snnips_list.length - 2) {
                        method_snippets += " ";
                    }
                }
                index++;
            }
            this.snippet_method_name = method_snippets;
        }
    }
    print_description() {

    }
}
/**
 * 枚举
 */
class WordsAnalyseKindEnumInfo extends WordsAnalyseKindBaseInfo {
    constructor(enum_name, enum_list) {
        super(WordsAnalyseKindType.enum);
        this.enum_name = enum_name;
        this.enum_item_list = enum_list;
    }
    print_description() {
        console.log(this.enum_name);
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

function isAlpha(char) {
    return /^[a-zA-Z]$/.test(char);
}

class WordAnalyseFileInfo {
    constructor(){
        this.file_path = "";
        this.file_name = "";
        this.position = 0;
        this.usefulKind = [];
        this.is_system = false;
        this.otherKeywords = {};
        this.line_number = 0;
    }
    read_file_content(){
        this.begin_analyse(file.readFileSync(this.file_path, 'utf-8'));
    }
    begin_analyse(data) {
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
            if (this.position + 7 < data.length && data.substring(this.position, this.position + 7) === 'typedef') {
                this.position += 7;
                this.skip_to_useful_char(data);
                if (this.position + 7 < data.length && data.substring(this.position, this.position + 7) === 'NS_ENUM') {
                    this.skip_to_useful_char(data);
                    this.position += 7;
                    this.begin_analyse_typedef_enum(data); 
                    continue;
                }
                if (this.position + 10 < data.length && data.substring(this.position, this.position + 10) === 'NS_OPTIONS') {
                    this.skip_to_useful_char(data);
                    this.position += 10;
                    this.begin_analyse_typedef_enum(data); 
                    continue;
                }
            }
            this.updateLineNumber(data);
            this.position++;
        }
    }
    /**
     * typedef解析
     */
    begin_analyse_typedef_enum(data) {
        this.skip_to_useful_char(data);
        let enum_name = "";
        let begin_analyse_name = false;
        let has_analyse_name = false;
        let enum_item = "";
        let begin_analyse_enum = false;
        let enum_list = [];
        let round_brackets = 0;
        while(this.position < data.length) {
            const char = data[this.position];
            if (char === '/') {
                this.begin_analyse_comment(data);
                this.skip_to_useful_char(data);
                continue;
            }
            if (char === '#') {
                this.begin_analyse_mark(data);
                this.skip_to_useful_char(data);
                continue;
            }
            this.position++;
            if (char === ')') {
                break;
            }
            if (begin_analyse_name && checkIsWhiteSpace(char)) {
                break;
            }
            if (char === ',') {
                if (has_analyse_name == false) {
                    has_analyse_name = true;
                    begin_analyse_name = true;
                    this.skip_to_useful_char(data);
                }
                continue;
            }
            if (has_analyse_name == false) {
                continue;
            }
            enum_name += char;
        }
        if (this.position >= data.length)return;
        this.skip_to_useful_char(data);
        let char = data[this.position];
        if (char === '/') {
            this.begin_analyse_comment(data);
            this.skip_to_useful_char(data);
        }
        if (char === '#') {
            this.begin_analyse_mark(data);
            this.skip_to_useful_char(data);
        }
        while(this.position < data.length) {
            const char = data[this.position];
            if (char === '/') {
                this.begin_analyse_comment(data);
                this.skip_to_useful_char(data);
                continue;
            }
            if (char === '#') {
                this.begin_analyse_mark(data);
                this.skip_to_useful_char(data);
                continue;
            }
            this.position++;
            if (char === '}') {
                if (enum_item.length > 0) {
                    enum_list.push(enum_item);
                    enum_item = "";
                }
                break;
            }
            if (char === '{') {
                begin_analyse_enum = true;
                continue;
            }
            if (begin_analyse_enum == false) {
                continue;
            }
            if (char === ',') { // 即将解析下一个枚举
                if (begin_analyse_enum && enum_item.length > 0) {
                    enum_list.push(enum_item);
                    enum_item = "";
                }
                continue;
            }
            if (begin_analyse_enum && checkIsWhiteSpace(char) && enum_item.length == 0) {
                this.skip_to_useful_char(data);
                continue;
            }
            if (checkIsWhiteSpace(char) || char === '<') { // 当前单个枚举解析结束，可以直接遍历到，号或者}
                this.skip_to_useful_char(data);
                while(this.position < data.length) {
                    const char = data[this.position];
                    if ((char === ',' || char === '}') && round_brackets == 0) {
                        break;
                    }
                    if (char === '/') {
                        this.begin_analyse_comment(data);
                        continue;
                    }
                    if (char === '#') {
                        this.begin_analyse_mark(data);
                        continue;
                    }
                    this.position++;
                    if (char === '(') round_brackets++;
                    if (char === ')') round_brackets--;
                }
                continue;
            }
            if (begin_analyse_enum) {
                enum_item += char;
            }
        }
        if (enum_name.length > 0) {
            let enum_info = new WordsAnalyseKindEnumInfo(enum_name, enum_list);
            this.usefulKind.push(enum_info);
        }
        this.skip_to_useful_char(data);
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
    begin_analyse_interface(data, kind_type) {
        /**
         * 获取类名
         */
        let class_name = "";
        const begin_line = this.line_number;
        while(this.position < data.length) {
            let char = data[this.position];
            this.updateLineNumber(data);
            if (char === ':' || char === '<' || char === '(' || char === '{' || char === '-' || char === '@' || char === '+' || char === ';' || char === '\n') {
                break;
            }
            this.position++;
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            class_name += char;
        }
        if (this.position < data.length && data[this.position] === ';') return;
        // if (this.is_system && kind_type == WordsAnalyseKindType.protocol && class_name === 'UITableViewDelegate') {
        //     // console.log(this.file_path);
        //     console.log(class_name);
        // }
        let class_info = new WordsAnalyseKindClassInfo(class_name, kind_type);
        class_info.line_number = begin_line;
        this.usefulKind.push(class_info);
        this.skip_to_useful_char(data);
        let temp = data[this.position];
        if (temp === '#') {
            this.begin_analyse_mark(data);
        }
        this.skip_to_useful_char(data);
        if (temp === '/') {
            this.begin_analyse_comment(data);
        }
        this.skip_to_useful_char(data);
        if (temp === ':') { // 父类
            this.begin_analyse_interface_supper(data, class_info);
        }
        this.skip_to_useful_char(data);
        if (this.position > data.length) {
            return;
        }
        // console.log(class_name + ' 父类：' + super_class_name);
        temp = data[this.position];
        if (temp === '(') { // 扩展
            this.begin_analyse_interface_extension(data, class_info);
        }
        temp = data[this.position];
        if (temp === '<') { // 协议
            this.begin_analyse_interface_protocol(data, class_info);
        }
        temp = data[this.position];
        if (temp === '{') { // 成员变量
            this.begin_analyse_interface_var(data, class_info);
        }
        this.begin_analyse_interface_property_method(data, class_info);
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
    begin_analyse_interface_property_method(data, class_info) {
        this.skip_to_useful_char(data);
        if (this.position < data.length && data[this.position] === '/') {
            this.begin_analyse_comment(data);
            this.skip_to_useful_char(data);
        }
        if (this.position < data.length && data[this.position] === '#') {
            this.begin_analyse_mark(data);
            this.skip_to_useful_char(data);
        }
        while(this.position < data.length) {
            const begin_line = this.line_number;
            const char = data[this.position];
            if (char === '@') {
                if (this.position+ 1 < data.length && data[this.position + 1] === 'e') break;
                if (this.position+ 8 < data.length) {
                    if (data.substring(this.position, 8) === 'optional') {
                        this.position += 9;
                        continue;
                    }
                }
                this.skip_to_useful_char(data);
                this.position += 9; // property
                this.skip_to_useful_char(data);
                let proper_desc_list = [];
                let proper_desc = "";
                let proper_desc_has_ana = false;
                let ana_desc = false;
                let proper_other_list = [];
                let proper_other = '';
                let round_brackets = 0;
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
                    if (proper === '(' && proper_desc_has_ana == false && proper_other_list.length == 0) { // 没解析过才解析修饰符
                        ana_desc = true;
                        continue;
                    }
                    
                    if (ana_desc) {
                        proper_desc_has_ana = true;
                        if (proper === ',') {
                            if (proper_desc.length > 0) {
                                proper_desc_list.push(proper_desc);
                            }
                            proper_desc = '';
                            this.skip_to_useful_char(data);
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
                    if (checkIsWhiteSpace(proper) && proper_other.length > 0 && round_brackets == 0) {
                        proper_other_list.push(proper_other);
                        proper_other = '';
                        continue;
                    }
                    if (proper === '(' || proper === '<') {
                        round_brackets++;
                    }
                    if (proper === ')' || proper === '>') {
                        round_brackets--;
                    }
                    proper_other += proper;
                }
                let result_list = [];
                proper_other_list.forEach(element => {
                    if (element.length == 0 || checkIsWhiteSpace(element) || element === 'const' || element === '__kindof' || element.startsWith('API_AVAILABLE(') || element.startsWith('API_UNAVAILABLE(') || element.startsWith('API_DEPRECATED_WITH_REPLACEMENT(') || element.startsWith('ios(') || element.startsWith('visionos(') || element.startsWith('NS_SWIFT_NAME(') || element === '_Nullable' || element === '_Nonnull' || element === '__nonnull' || element === '__nullable' || element.startsWith('MTR_DEPRECATED(') || element.startsWith('macos(') || element.startsWith('tvos(') || element.startsWith('watchos(') || element.startsWith('NS_REFINED_FOR_SWIFT') || element.startsWith('API_DEPRECATED(') || element.startsWith('__WATCHOS_UNAVAILABLE') || element.startsWith('__IOS_AVAILABLE(') || element.startsWith('__WATCHOS_AVAILABLE(') || element.startsWith('CF_RETURNS_NOT_RETAINED') || element.startsWith('NS_RETURNS_INNER_POINTER') || element.startsWith('MTR_AVAILABLE(') || element.startsWith('__IOS_UNAVAILABLE') || element.startsWith('UI_APPEARANCE_SELECTOR') || element.startsWith('UIKIT_AVAILABLE_TVOS_ONLY(') || element.startsWith('NS_SWIFT_UI_ACTOR') || element.startsWith('__WATCHOS_PROHIBITED') || element.startsWith('NS_AVAILABLE_IOS(') || element.startsWith('MP_API(') || element === 'NS_SWIFT_NONISOLATED' || element === '__TVOS_PROHIBITED' || element.startsWith('__TVOS_AVAILABLE(') || element === 'API_DEPRECATED_WITH_REPLACEMENT' || element === 'NS_UNAVAILABLE' || element === 'MTR_PROVISIONALLY_AVAILABLE' || element === 'NS_SWIFT_SENDABLE' || element.startsWith('IC_AVAILABLE(') || element.startsWith('IC_UNAVAILABLE(')) return;
                    result_list.push(element);
                });
                // if (this.is_system && result_list.length > 3) {
                //     console.log(this.file_path);
                //     console.log('属性:' + result_list + ":" + result_list.length);
                // }
                this.skip_to_useful_char(data);
                let proper_info = new WordsAnalyseKindPropertyInfo(result_list);
                proper_info.line_number = begin_line;
                class_info.property_list.push(proper_info);
            } else if (char === '-' || char === '+') {
                this.position++;
                this.skip_to_useful_char(data);
                let return_type = '';
                let ana_return = false;
                let method_name = '';
                let pre_space = false;
                let round_brackets = 0;
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
                    this.updateLineNumber(data);
                    this.position++;
                    if (ana_return == false && return_type.length == 0) {
                        this.skip_to_useful_char(data);
                    }
                    if(method === '(' && ana_return == false && return_type.length == 0) {
                        ana_return = true;
                        continue;
                    }
                    if (ana_return) {
                        if (method === ')' && round_brackets == 0) {
                            ana_return = false;
                            continue;
                        }
                        if (method === '(') round_brackets++;
                        if (method === ')') round_brackets--;
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
                    method.line_number = begin_line;
                    class_info.method_list.push(method);
                } else {
                    let method = new WordsAnalyseKindMethodInfo(method_name, WordsAnalyseKindMethodType.instance_method);
                    method.line_number = begin_line;
                    class_info.method_list.push(method);
                }
                
            } else if (char === '/') {
                this.begin_analyse_comment(data);
                this.skip_to_useful_char(data);
            } else if (char === '#') {
                this.begin_analyse_mark(data);
                this.skip_to_useful_char(data);
            } else {
                this.updateLineNumber(data);
                this.position++;
                // console.log(this.file_path + ' 未知的方法字符:' + char);
            }
        }
        this.skip_to_useful_char(data);
    }
    check_words_is_system_keywords(element) {
        if (element === 'const' || element === '__kindof' || element.startsWith('API_AVAILABLE(') || element.startsWith('API_UNAVAILABLE(') || element.startsWith('API_DEPRECATED_WITH_REPLACEMENT(') || element.startsWith('ios(') || element.startsWith('visionos(') || element.startsWith('NS_SWIFT_NAME(') || element === '_Nullable' || element === '_Nonnull' || element === '__nonnull' || element === '__nullable' || element.startsWith('MTR_DEPRECATED(') || element.startsWith('macos(') || element.startsWith('tvos(') || element.startsWith('watchos(') || element.startsWith('NS_REFINED_FOR_SWIFT') || element.startsWith('API_DEPRECATED(') || element.startsWith('__WATCHOS_UNAVAILABLE') || element.startsWith('__IOS_AVAILABLE(') || element.startsWith('__WATCHOS_AVAILABLE(') || element.startsWith('CF_RETURNS_NOT_RETAINED') || element.startsWith('NS_RETURNS_INNER_POINTER') || element.startsWith('MTR_AVAILABLE(') || element.startsWith('__IOS_UNAVAILABLE') || element.startsWith('UI_APPEARANCE_SELECTOR') || element.startsWith('UIKIT_AVAILABLE_TVOS_ONLY(') || element.startsWith('NS_SWIFT_UI_ACTOR') || element.startsWith('__WATCHOS_PROHIBITED') || element.startsWith('NS_AVAILABLE_IOS(') || element.startsWith('MP_API(') || element === 'NS_SWIFT_NONISOLATED' || element === '__TVOS_PROHIBITED' || element.startsWith('__TVOS_AVAILABLE(') || element === 'API_DEPRECATED_WITH_REPLACEMENT' || element === 'NS_UNAVAILABLE' || element === 'MTR_PROVISIONALLY_AVAILABLE' || element === 'NS_SWIFT_SENDABLE' || element.startsWith('IC_AVAILABLE(') || element.startsWith('IC_UNAVAILABLE(')) return true;
        return false;
    }
    begin_analyse_method_remove_keywords(method_name) {
        let position = 0;
        let tempWords = "";
        let resultNameList = [];
        let round_brackets = 0;
        while (position < method_name.length) {
            const char = method_name[position];
            position++;
            if (checkIsWhiteSpace(char) && round_brackets == 0) {
                if (tempWords.length > 0 && !this.check_words_is_system_keywords(tempWords)) {
                    resultNameList.push(tempWords);
                }
                tempWords = "";
                continue;
            }
            if (char === '(') round_brackets++;
            if (char === ')') round_brackets--;
            tempWords += char;
        }
        return resultNameList.join(' ');
    }
    /**
     * 成员变量
     */
    begin_analyse_interface_var(data, class_info) {
        this.position++;
        this.skip_to_useful_char(data);
        let var_sep_arr = [];
        let temp = '';
        let begin_line = this.line_number;
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
            this.updateLineNumber(data);
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
                class_info.var_list.push(var_sep_arr);
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
        var_info.line_number = begin_line;
        return var_info;
    }
    /**
     * 解析扩展
     */
    begin_analyse_interface_extension(data, class_info) {
        this.position++;
        this.skip_to_useful_char(data);
        let temp = '';
        while(this.position < data.length) {
            let char = data[this.position];
            if (char === ')') { // 扩展结束
                break;
            }
            this.updateLineNumber(data);
            this.position++;
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            temp += char;
        }
        class_info.extension_name = temp;
        this.skip_to_useful_char(data);
    }
    /**
     * 解析类的父类
     */
    begin_analyse_interface_supper(data, class_info) {
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
            this.updateLineNumber(data);
            this.position++;
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            temp += char;
        }
        class_info.super_name = temp;
        this.skip_to_useful_char(data);
    }
    /**
     * 解析类的协议
     */
    begin_analyse_interface_protocol(data, class_info) {
        this.position++;
        this.skip_to_useful_char(data);
        let temp = '';
        while(this.position < data.length) {
            let char = data[this.position];
            this.updateLineNumber(data);
            this.position++;
            if (char === '>') { // 协议结束
                if (temp.length > 0) {
                    class_info.protocol_list.push(temp);
                }
                break;
            }
            if (checkIsWhiteSpace(char) || char === '\n') {
                continue;
            }
            if (char == ',') {
                class_info.protocol_list.push(temp);
                temp = '';
                continue;
            }
            temp += char;
        }
        this.skip_to_useful_char(data);
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
                this.updateLineNumber(data);
                break;
            }
            this.position++;
            kind_name += char;
        }
        this.skip_whitespace(data);
        if (kind_name === '@interface') {
            this.begin_analyse_interface(data, WordsAnalyseKindType.class);
        } else if (kind_name === '@class' || kind_name === '@optional') {
            this.skip_to_return(data);
        } else if (kind_name === '@protocol') {
            this.begin_analyse_interface(data, WordsAnalyseKindType.protocol);
        } else if (kind_name === '@implementation') {
            this.being_analyse_implementation(data);
        } else {
            // console.log(this.file_path);
            // console.log('未知的kind_name:' + kind_name);
            while(this.position < data.length) {
                let char = data[this.position];
                if (char === '\n') {
                    this.updateLineNumber(data);
                    break;
                }
                this.position++;
            }
        }
    }
    /**
     * 解析类实现
     */
    being_analyse_implementation(data) {
        /**
         * 获取类名
         */
        let class_name = "";
        let begin_line = this.line_number;
        while(this.position < data.length) {
            let char = data[this.position];
            this.updateLineNumber(data);
            if (char === '(' || char === '\n') {
                break;
            }
            if (this.skip_comment_mark(data)) continue;
            this.position++;
            if (checkIsWhiteSpace(char)) {
                continue;
            }
            class_name += char;
        }
        if (this.position >= data.length) return;
        let extension_name = '';
        if (data[this.position] === '(') { // 分类
            this.position++;
            this.skip_to_useful_char(data);
            while(this.position < data.length) {
                const char = data[this.position];
                if (this.skip_comment_mark(data)) continue;
                this.position++;
                if (char === ')') {
                    break;
                }
                if (checkIsWhiteSpace(char)) continue;
                extension_name += char;
            }
        }
        let class_info = new WordsAnalyseKindClassInfo(class_name, WordsAnalyseKindType.class_implementation);
        class_info.line_number = begin_line;
        this.usefulKind.push(class_info);
        if (extension_name.length > 0) {
            class_info.extension_name = extension_name;
        }
        // 解析方法
        this.skip_to_useful_char(data);
        this.skip_comment_mark(data);
        let analyse_other_body = false;
        let other_round_brackets = 0;
        while (this.position < data.length) {
            const char = data[this.position];
            if (this.skip_comment_mark(data)) continue;
            if (char === '@' && (this.position + 1) < data.length && data[this.position + 1] === 'e') {
                break;
            }
            this.position++;
            begin_line = this.line_number;
            if (analyse_other_body == false && (char === '-' || char === '+')) {
                this.skip_to_useful_char(data);
                let return_type = '';
                let ana_return = false;
                let method_name = '';
                let pre_space = false;
                let round_brackets = 0;
                let begin_analyse_body = false;
                while(this.position < data.length) {
                    let method = data[this.position];
                    if (this.skip_comment_mark(data)) continue;
                    this.position++;
                    if (ana_return == false && return_type.length == 0) {
                        this.skip_to_useful_char(data);
                    }
                    if(method === '(' && ana_return == false && return_type.length == 0) {
                        ana_return = true;
                        continue;
                    }
                    if (ana_return) {
                        if (method === ')' && round_brackets == 0) {
                            ana_return = false;
                            continue;
                        }
                        if (method === '(') round_brackets++;
                        if (method === ')') round_brackets--;
                        return_type += method;
                        continue;
                    }
                    if (method === '{' && !begin_analyse_body) {
                        begin_analyse_body = true;
                        continue;
                    }
                    if (method === '}' && round_brackets == 0) {
                        break;
                    }
                    if (method === '{') {
                        round_brackets++;
                    } else if (method === '}') {
                        round_brackets--;
                    }
                    if (begin_analyse_body) continue;
                    if (method === '\n') {
                        this.updateLineNumber(data);
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
                    method.line_number = begin_line;
                    class_info.method_list.push(method);
                } else {
                    let method = new WordsAnalyseKindMethodInfo(method_name, WordsAnalyseKindMethodType.instance_method);
                    method.line_number = begin_line;
                    class_info.method_list.push(method);
                }
            } else if(char === '{' || analyse_other_body) {
                analyse_other_body = true;
                this.position++;
                if (this.skip_comment_mark(data))continue;
                while (this.position < data.length) {
                    const temp = data[this.position];
                    this.position++;
                    if (temp === '}' && other_round_brackets == 0) break;
                    if (temp === '{') other_round_brackets++;
                    if (temp === '}') other_round_brackets--;
                }
            }
        }
        this.begin_analyse_interface_end(data);
    }
    /**
     * 跳过注释和#
     */
    skip_comment_mark(data) {
        let result = false;
        if (this.position < data.length && data[this.position] === '/') {
            this.begin_analyse_comment(data);
            this.skip_to_useful_char(data);
            result = true;
        }
        if (this.position < data.length && data[this.position] === '#') {
            this.begin_analyse_mark(data);
            this.skip_to_useful_char(data);
            result = true;
        }
        return result;
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
            this.updateLineNumber(data);
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
                this.updateLineNumber(data);
                break;
            }
            this.position++;
            markType += char;
        }
        if (markType === '#define') {
            this.position++;
            let key = "";
            let hasKey = false;
            let round_brackets = 0;
            const begin_line = this.line_number;
            while(this.position < data.length) {
                let char = data[this.position];
                this.position++;
                if (checkIsWhiteSpace(char) && hasKey == false) { // 过滤多余的空格
                    continue;
                }
                if (checkIsWhiteSpace(char) && round_brackets == 0) {
                    break;
                }
                if (char === '(') {
                    round_brackets += 1;
                }
                if (char === ')') {
                    round_brackets -= 1;
                }
                hasKey = true;
                key += char;
            }
            let value = "";
            let preValue = "";
            while(this.position < data.length) {
                let char = data[this.position];
                this.updateLineNumber(data);
                this.position++;
                if (char === '\n' && (preValue !== '\\' || value.length == 0)) {
                    break;
                }
                if (!checkIsWhiteSpace(char)) { // 去除多行define之后的\之后的空格
                    preValue = char;
                }
                value += char;
            }
            let define = new WordsAnalyseKindDefineInfo(key, value);
            define.line_number = begin_line;
            this.usefulKind.push(define);
        } else if (markType === '#pragma' || markType === '#warning' || markType === '#if' || markType === '#ifndef' || markType === '#undef' || markType === '#ifdef' || markType === '#elif' || markType === '#endif' || markType === '#else' || markType === '#import' || markType === '#include' || markType === '#error') {
            while(this.position < data.length) {
                let char = data[this.position];
                if (char === '\n') {
                    this.updateLineNumber(data);
                    break;
                }
                this.position++;
            }
        } else {
            // console.log('未处理内容Mark:' + markType);
        }
    }
    /**
     * 解析单行注释
     */
    begin_analyse_single_comment(data) {
        while (this.position < data.length) {
            if(data[this.position] === '\n'){
                this.updateLineNumber(data);
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
            if(data[this.position] === '*' && (this.position + 1 < data.length && data[this.position + 1] === '/')){
                break;
            }
            this.position++;
        }
        this.position += 2;
    }
    updateLineNumber(data) {
        if (this.position < data.length && data[this.position] === '\n') {
            this.line_number++;
        }
    }
    print_decription() {
        this.usefulKind.forEach(element => {
            element.print_description();
        });
    }
}

class WordAnalyseInfo {
    constructor(){
        this.type = WordsAnalyseType.frameworks;
        this.file_path = "";
        this.name="";
    }
    get header_paths() {
        return path.join(this.file_path, "Headers");
    }
    analyse_headers(result_dic) {
        const headers_path = this.header_paths;
        try {
            file.accessSync(headers_path, file.constants.F_OK);
            const files = file.readdirSync(headers_path);
            for (const ele of files) {
                this.analyse_header(headers_path, ele, result_dic, true);
            }
        } catch (err) {

        }
    }
    analyse_header(header_path, file, result_dic, is_system = false) {
        if (file.endsWith('.h') == false && file.endsWith('.m') == false) return;
        let file_info = new WordAnalyseFileInfo();
        file_info.file_name = file;
        file_info.file_path = path.join(header_path, file);
        file_info.is_system = is_system;
        file_info.read_file_content();
        result_dic[file_info.file_path] = file_info;
    }
}

function checkMatchResult(vscode, file_path, words, result_dic) {
    words = words.toLowerCase();
    console.log(words);
    let result_list = [];
    const keys = Object.keys(result_dic);
    let unique_dic = {};
    for (const key of keys) {
        let file_info = result_dic[key];
        file_info.usefulKind.forEach(element => {
            if (element.kindType == WordsAnalyseKindType.define) {
                if (file_info.is_system == true) {
                    return;
                }
                const unique_key = element.defineName;
                if (unique_dic[unique_key]) {
                    return;
                }
                unique_dic[unique_key] = "1";
                if (element.defineName.toLowerCase().startsWith(words)) {
                    result_list.push(
                        new vscode.CompletionItem(element.defineName, vscode.CompletionItemKind.Constant)
                    )
                }
            } else if (element.kindType == WordsAnalyseKindType.class || element.kindType == WordsAnalyseKindType.protocol || (element.kindType == WordsAnalyseKindType.class_implementation && file_path === file_info)) {
                
                if (element.class_name.toLowerCase().startsWith(words)) {
                    const unique_key = element.class_name;
                    if (unique_dic[unique_key]) {
                        return;
                    }
                    unique_dic[unique_key] = "1";
                    if (element.kindType == WordsAnalyseKindType.protocol) {
                        let class_info = new vscode.CompletionItem(element.class_name, vscode.CompletionItemKind.Interface);
                        class_info.detail = '协议';
                        result_list.push(
                            class_info
                        )
                    } else {
                        let class_info = new vscode.CompletionItem(element.class_name, vscode.CompletionItemKind.Class);
                        class_info.detail = '类';
                        result_list.push(
                            class_info
                        )
                    }
                }
                element.method_list.forEach(method => {
                    if (method.method_name.toLowerCase().startsWith(words)) {
                        let unique_key = element.class_name + method.method_name;
                        if (element.extension_name && element.extension_name.length > 0) {
                            unique_key = element.class_name + element.extension_name + method.method_name;
                        }
                        if (unique_dic[unique_key]) {
                            return;
                        }
                        unique_dic[unique_key] = "1";
                        let method_info = new vscode.CompletionItem(method.method_name, vscode.CompletionItemKind.Function);
                        method_info.insertText = new vscode.SnippetString(method.snippet_method_name);
                        if (element.kindType == WordsAnalyseKindType.protocol) {
                            method_info.detail = "协议:" + element.class_name;
                        } else {
                            if (element.extension_name && element.extension_name.length > 0) {
                                method_info.detail = "分类：" + element.class_name + "(" + element.extension_name + ")";
                            } else {
                                method_info.detail = "类：" + element.class_name;
                            }
                        }
                        result_list.push(
                            method_info
                        )
                    }
                });
                element.property_list.forEach(proper => {
                    if (proper.proper_other_list.length == 0) {
                        return;
                    }
                    const temp = proper.proper_other_list[proper.proper_other_list.length-1];
                    if (temp.toLowerCase().startsWith(words) || temp.toLowerCase().startsWith('*' + words)) {
                        let unique_key = element.class_name + temp;
                        if (element.extension_name && element.extension_name.length > 0) {
                            unique_key = element.class_name + element.extension_name + temp;
                        }
                        if (unique_dic[unique_key]) {
                            return;
                        }
                        unique_dic[unique_key] = "1";
                        let proper_info = new vscode.CompletionItem(temp, vscode.CompletionItemKind.Property);
                        if (element.kindType == WordsAnalyseKindType.protocol) {
                            proper_info.detail = "协议:" + element.class_name;
                        } else {
                            if (element.extension_name && element.extension_name.length > 0) {
                                proper_info.detail = "分类：" + element.class_name + "(" + element.extension_name + ")";
                            } else {
                                proper_info.detail = "类：" + element.class_name;
                            }
                        }
                        result_list.push(
                            proper_info
                        )
                    }
                });
            } else if (element.kindType == WordsAnalyseKindType.enum) {
                if (element.enum_name.toLowerCase().startsWith(words)) {
                    const unique_key = element.enum_name;
                    if (unique_dic[unique_key]) {
                        return;
                    }
                    unique_dic[unique_key] = "1";
                    let enum_info = new vscode.CompletionItem(element.enum_name, vscode.CompletionItemKind.Enum);
                    enum_info.detail = '枚举';
                    result_list.push(
                        enum_info
                    )
                }
                element.enum_item_list.forEach(enum_item => {
                    if (enum_item.toLowerCase().startsWith(words)) {
                        const unique_key = element.enum_name + enum_item;
                        if (unique_dic[unique_key]) {
                            return;
                        }
                        unique_dic[unique_key] = "1";
                        let enum_info = new vscode.CompletionItem(enum_item, vscode.CompletionItemKind.Enum);
                        enum_info.detail = "枚举值";
                        result_list.push(
                            enum_info
                        )
                    }
                });
            }
        });
        let other_keys = Object.keys(file_info.otherKeywords);
        for (const other_key of other_keys) {
            if (other_key.toLowerCase().indexOf(words) != -1) {
                const unique_key = "word_analyse_info." + other_key;
                if (unique_dic[unique_key]) {
                    return;
                }
                unique_dic[unique_key] = "1";
                result_list.push(
                    new vscode.CompletionItem(other_key, vscode.CompletionItemKind.Text)
                )
            }
        }
    }
    result_list.forEach((item, index) => {
        item.sortText = `0${index}`;
    });
    return result_list;
}

function findMatchResultPosition(vscode, file_path, words, result_dic) {
    let result_list = [];
    const keys = Object.keys(result_dic);
    let unique_dic = {};
    for (const key of keys) {
        let file_info = result_dic[key];
        file_info.usefulKind.forEach(element => {
            if (element.kindType == WordsAnalyseKindType.define) {
                if (file_info.is_system == true) {
                    return;
                }
                const unique_key = element.defineName;
                if (unique_dic[unique_key]) {
                    return;
                }
                unique_dic[unique_key] = "1";
                if (element.defineName === words) {
                    result_list.push(
                        {
                            filePath:key,
                            label: element.defineName,
                            jumpTip: "宏定义：" + element.defineName,
                            lineNumber:element.line_number
                        }
                    )
                }
            } else if (element.kindType == WordsAnalyseKindType.class || element.kindType == WordsAnalyseKindType.protocol || (element.kindType == WordsAnalyseKindType.class_implementation && file_path === file_info)) {
                let jumpTip = element.class_name;
                if (element.extension_name && element.extension_name.length > 0) {
                    jumpTip = element.class_name + "(" + element.extension_name + ")";
                }
                if (element.class_name === words) {
                    const unique_key = element.class_name;
                    if (unique_dic[unique_key]) {
                        return;
                    }
                    unique_dic[unique_key] = "1";
                    result_list.push(
                        {
                            filePath:key,
                            label:element.class_name,
                            jumpTip: jumpTip,
                            lineNumber:element.line_number
                        }
                    )
                }
                element.method_list.forEach(method => {
                    if (method.method_name.indexOf(words) != -1) {
                        let unique_key = element.class_name + method.method_name;
                        if (element.extension_name && element.extension_name.length > 0) {
                            unique_key = element.class_name + element.extension_name + method.method_name;
                        }
                        if (unique_dic[unique_key]) {
                            return;
                        }
                        unique_dic[unique_key] = "1";
                        result_list.push(
                            {
                                filePath:key,
                                label:method.method_name,
                                jumpTip: jumpTip,
                                lineNumber:method.line_number
                            }
                        )
                    }
                });
                element.property_list.forEach(proper => {
                    if (proper.proper_other_list.length == 0) {
                        return;
                    }
                    const temp = proper.proper_other_list[proper.proper_other_list.length-1];
                    if (temp === words || temp === ('*' + words)) {
                        let unique_key = element.class_name + temp;
                        if (element.extension_name && element.extension_name.length > 0) {
                            unique_key = element.class_name + element.extension_name + temp;
                        }
                        if (unique_dic[unique_key]) {
                            return;
                        }
                        unique_dic[unique_key] = "1";
                        result_list.push(
                            {
                                filePath:key,
                                label:temp,
                                jumpTip: jumpTip,
                                lineNumber:proper.line_number
                            }
                        )
                    }
                });
            } else if (element.kindType == WordsAnalyseKindType.enum) {
                if (element.enum_name === words) {
                    const unique_key = element.enum_name;
                    if (unique_dic[unique_key]) {
                        return;
                    }
                    unique_dic[unique_key] = "1";
                    result_list.push(
                        {
                            filePath:key,
                            label: element.enum_name,
                            jumpTip: element.enum_name,
                            lineNumber:element.line_number
                        }
                    )
                }
                element.enum_item_list.forEach(enum_item => {
                    if (enum_item === words) {
                        const unique_key = element.enum_name + enum_item;
                        if (unique_dic[unique_key]) {
                            return;
                        }
                        unique_dic[unique_key] = "1";
                        result_list.push(
                            {
                                filePath:key,
                                label:enum_item,
                                jumpTip: element.enum_name,
                                lineNumber:element.line_number
                            }
                        )
                    }
                });
            }
        });
    }
    return result_list;
}

module.exports = {
    WordsAnalyseKindBaseInfo,
    WordsAnalyseType,
    WordAnalyseInfo,
    checkMatchResult,
    findMatchResultPosition
}