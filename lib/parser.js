const fs = require('fs');
const { resolveFile } = require('./utils.js');


const CTYPES = {
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'form': 'application/x-www-form-urlencoded',
    'multipart': 'multipart/form-data'
}

function RequestDirective() {
    this.method = null;
    this.url = null;
}
RequestDirective.prototype = {
    add(line) {
        if (!this.method) {
            const i = line.indexOf(' ');
            if (i === -1) throw new Error(`Invalid request line ${line}`);
            this.method = line.substring(0, i);
            this.url = line.substring(i + 1).trim();
            if (!this.method || !this.url) throw new Error(`Invalid request line ${line}`);
        } else {
            throw new Error(`Invalid request file. Extra content after the request line: ${line}`);
        }
    },
    build(parser, result) {
        if (!this.method) return; // otherwise included files which doesn't contains request lines will fail
        if (result.method) throw new Error('A request was already defined');
        result.method = this.method;
        result.url = this.url;
    }
}

function HeadersDirective(arg) {
    if (arg) throw new Error(`@$headers doesn't take arguments`);
    this.data = new Map();
}
HeadersDirective.prototype = {
    add(line) {
        // parse header line
        const i = line.indexOf(':');
        if (i === -1) throw new Error(`Invalid header line ${line}`);
        this.data.set(line.substring(0, i).trim(), line.substring(i + 1).trim());
    },
    build(parser, result) {
        const data = this.data;
        if (result.headers) {
            const headers = result.headers;
            for (const [key, value] of data) {
                headers.set(key, value);
            }
        } else {
            result.headers = this.data;
        }
    }
}

function BodyDirective(arg) {
    if (arg) { // a file path
        this.inline = false;
        this.data = arg;
    } else {
        this.inline = true;
        this.data = [];
    }
}
BodyDirective.prototype = {
    add(line) {
        if (this.inline) {
            this.data.push(line);
        } else if (!line) {
            return;
        } else {
            throw new Error('A body pointing to a file cannot have inline content');
        }
    },
    build(parser, result) {
        result.body = {
            inline: this.inline,
            data: this.inline ? this.data.join('\n') : this.data
        };
    }
}


const HookParserProto = {
    parseArg(arg) {
        if (!arg) throw new Error(`@ ${this.name} must take an argument`);
        return arg.split(/\s*,\s*/);
    },
    add(line) {
        this.list.push(line);
    },
    build(parser, result) {
        if (result[this.name]) {
            result[this.name] = result[this.name].concat(this.list);
        } else {
            result[this.name] = this.list;
        }
    }
}
function AfterDirective(arg) {
    this.name = 'after';
    this.list = this.parseArg(arg);
}
AfterDirective.prototype = HookParserProto;
function BeforeDirective(arg) {
    this.name = 'before';
    this.list = this.parseArg(arg);
}
BeforeDirective.prototype = HookParserProto;

const SingleHeaderProto = {
    add(line) {
        throw new Error('Single Header directive cannot have content');
    },
    build(parser, result) {
        if (!result.headers) {
            result.headers = new Map();
        }
        const val = this.value.toLowerCase();
        if (val === 'none' || val === 'false') {
            result.headers.delete(this.name);
        } else {
            this.setHeader(result);
        }
    },
    setHeader(result) {
        result.headers.set(this.name, this.value);
    }
}
function AuthDirective(arg) {
    if (!arg) throw new Error('@auth must take an argument and cannot have content');
    this.name = 'Authorization';
    // add support for @auth basic user:pass, @auth digest
    this.value = arg;
    this.basic = arg.toLowerCase().startsWith('basic ');
    this.setHeader = (result) => {
        if (this.basic) {
            result.auth = this.value.substring(6).trim().split(':');
        } else {
            result.headers.set(this.name, this.value);
        }
    }
}
AuthDirective.prototype = SingleHeaderProto;
function AcceptDirective(arg) {
    if (!arg) throw new Error('@accept must take an argument and cannot have content');
    this.name = 'Accept';
    this.value = CTYPES[arg] || arg;
}
AcceptDirective.prototype = SingleHeaderProto;
function TypeDirective(arg) {
    if (!arg) throw new Error('@type must take an argument and cannot have content');
    this.name = 'Content-Type';
    this.value = CTYPES[arg] || arg;
}
TypeDirective.prototype = SingleHeaderProto;

function AttachDirective(arg) {
    this.file = arg;
    if (!arg) throw new Error('@attach must take an argument and cannot have content');
}
AttachDirective.prototype = {
    add(line) {
        throw new Error('@attach directive cannot have content');
    },
    build(parser, result) {
        if (!result.attach) result.attach = [];
        result.attach.push(this.file);
    }
}

function IncludeDirective(arg) {
    if (!arg) throw new Error('@oinclude directive must take an argument');
    this.file = arg;
}
IncludeDirective.prototype = {
    add(line) {
        throw new Error('@include directive cannot have content');
    },
    build(parser, result) {
        parser.parseFile(this.file);
    }
}

function PresetDirective(arg) {
    if (!arg) throw new Error('@preset directive must take an argument');
    this.name = arg;
}
PresetDirective.prototype = {
    add(line) {
        throw new Error('@include directive cannot have content');
    },
    build(parser, result) {
        parser.parseFile('presets/' + this.name + '.req');
    }
}

const directives = {
    headers: HeadersDirective,
    body: BodyDirective,
    after: AfterDirective,
    before: BeforeDirective,
    attach: AttachDirective,
    accept: AcceptDirective,
    auth: AuthDirective,
    type: TypeDirective,
    include: IncludeDirective,
    preset: PresetDirective,
}

function parseDirectiveLine(line) {
    if (line.startsWith('@')) {
        let i = line.indexOf(' ');
        let name, arg;
        if (i < 0) {
            name = line.substring(1);
            arg = null;
        } else {
            name = line.substring(1, i);
            arg = line.substring(i + 1).trim();
        }
        if (/^[a-z]+$/.test(name)) {
            const DirType = directives[name];
            if (DirType) {
                return new DirType(arg);
            } else {
                throw new Error(`Unknown directive ${name}`);
            }
        }
        return null;
    }
}


/// the parser returns {method, url, headers, ...}
function Parser() {
    this.stack = [];
    this.result = {};
}
Parser.prototype = {
    resolve(file) {
        if (this.stack.length) {
            return resolveFile(file, this.stack[this.stack.length - 1]);
        } else {
            return resolveFile(file);
        }
    },
    parseFile(file) {
        const resolvedFile = this.resolve(file);
        this.stack.push(resolvedFile);
        this.parse(fs.readFileSync(resolvedFile, 'utf8'));
        this.stack.pop();
        return this.result;
    },
    parse(content) {
        const lines = content.trim().split('\n');
        let lastDir = new RequestDirective();
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;
            let newDir = parseDirectiveLine(line);
            if (newDir) {
                lastDir.build(this, this.result);
                lastDir = newDir;
            } else {
                lastDir.add(line);
            }
        }
        lastDir.build(this, this.result);
        // if no method was defined and the stack is empty (i.e. no more files to parse) then we throw an error
        if (!this.result.method && !this.stack.length)
            throw new Error('No request line was defined');
        return this.result;
    }
}

module.exports = Parser;
