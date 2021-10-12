const fs = require('fs');
const {parseValue} = require('./utils.js');

const var_rx = /\{\{\s*((?:[a-zA-Z_$][a-zA-Z_$0-9]*)(?:\.[a-zA-Z_$][a-zA-Z_$0-9]*)*)\s*(?:\|\s*([a-zA-Z_\$]+[a-zA-Z_\$0-9]*))?\s*\}\}/g;

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

function Env(vars, scripts, filters) {
    this.vars = vars || {};
    this.scripts = scripts || {};
    this.filters = filters || {
        json: value => JSON.stringify(value)
    }
}

Env.prototype = {
    filter(name, value) {
        const filter = this.filters[name] || this.scripts[name];
        if (!filter) throw new Error('Unable to resolve filter '+filter);
        return filter.call(this, value);
    },
    ref(value, filter) { // filter can be specified after a | character
        if (filter) {
            return (env) => env.filter(filter, env.get(value));
        } else {
            return (env) => env.get(value);
        }
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
            result.push(this.ref(m[1], m[2]));
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
    async loadScripts(scriptsFile) {
        if (scriptsFile) {
            try {
                this.scripts = require(scriptsFile);
            } catch (e) {
                if (e.code === 'ERR_REQUIRE_ESM') {
                    this.scripts = await import(scriptsFile);
                } else {
                    throw e;
                }
            }
        }
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
        let r;
        if (typeof val === 'function') {
            r = val(this);
        } else {
            r = val;
        }
        return r;
    },
    eval(expr) {
        if (expr.indexOf('{{') < 0) return expr; // no vars
        return expr.replaceAll(var_rx, (m,p1,p2) => {
            let r = this.get(p1);
            return p2 ? this.filter(p2, r) : r;
        });
    },
    clone() {
        return new Env(Object.assign({}, this.vars), this.scripts, this.filters);
    }
}

module.exports = Env;
