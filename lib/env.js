const fs = require('fs');
const {parseValue} = require('./utils.js');

const var_rx = /\{\{\s*((?:[a-zA-Z_$][a-zA-Z_$0-9]*)(?:\.[a-zA-Z_$][a-zA-Z_$0-9]*)*)\s*\}\}/g;

function _get(obj, key) {
    let i = key.indexOf('.');
    if (i < 0) return obj[key];
    let s = 0;
    while (i > -1) {
        obj = obj[key.substring(s,i)];
        if (obj == null) return undefined;
        s = i+1;
        i = key.indexOf('.', s);
    }
    return obj[key.substring(s)];
}

function Env() {
    this.vars = {};
}
Env.prototype = {
    ref(value) {
        return (env) => env.get(value);
    },
    addVars(vars) {
        for (let key in vars) {
            let value = vars[key];
            if (typeof value === 'string') {
                const expr = this.expandVars(value);
                if (expr != null) value = expr;
            }
            this.set(key, value);
        }
    },
    expandVars(str) {
        if (str.indexOf('{{') < 0) return null;
        const result = [];
        let s = 0, m = var_rx.exec(str);
        while (m) {
            if (s < m.index) {
                result.push(str.substring(s, m.index));
            }
            result.push(this.ref(m[1]));
            s = var_rx.lastIndex;
            m = var_rx.exec(str);
        }
        if (!s) return null; // not an expression
        if (s < str.length) {
            result.push(str.substring(s));
        }
        if (result.length === 1) {
            return result[0];
        }
        return (env) => result.map(v => typeof v === 'function' ? v(env) : v).join('');
   },
    parseValue(value) {
        value = parseValue(value);
        if (typeof value === 'string') {
            const expr = this.expandVars(value);
            if (expr != null) return expr;
        }
        return value;
    },
    parseVarLine(line) {
        const i = line.indexOf('=');
        if (i < 0) throw new Error(`Invalid env line ${line}`);
        const name = line.substring(0, i).trim();
        const value = line.substring(i+1).trim();
        this.vars[name] = this.parseValue(value);
    },
    parse(content) {
        const vars = {};
        const lines = content.trim().split('\n');
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;
            this.parseVarLine(line, vars);
        }
    },
    load(file) {
        const vars = this.parse(fs.readFileSync(file, 'utf8'));
        Object.assign(this.vars, vars);
        return this;
    },
    set(key, value) {
        this.vars[key] = value;
    },
    get(key) {
        let val = _get(this.vars, key);
        if (val === undefined) {
            throw new Error('environment variable not found: '+key);
        }
        if (typeof val === 'function') {
            return val(this);
        } else {
            return val;
        }
    },
    eval(expr) {
        if (expr.indexOf('{{') < 0) return expr; // no vars
        return expr.replaceAll(var_rx, (m,p) => this.get(p));
    },
    clone() {
        var env = new Env();
        Object.assign(env.vars, this.vars);
        return env;
    }
}

module.exports = Env;
