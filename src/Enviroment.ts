import vm from 'vm';
import builtins from './builtins.js';

export default class Environment {
    private _vmctx?: vm.Context;
    vars: Record<string, any>;
    method?: string;
    query?: Record<string, any>;
    url?: string;
    headers: Record<string, string> = {};
    body?: string;

    constructor(vars?: Record<string, any>) {
        this.vars = vars || {};
        Object.assign(this.vars, builtins);
    }

    get vmContext() {
        return this._vmctx || (this._vmctx = vm.createContext(this.vars));
    }

    exec(script: vm.Script) {
        return script.runInContext(this.vmContext);
    }

    eval(value: any) {
        if (value instanceof vm.Script) {
            return this.exec(value);
        } else {
            return value;
        }
    }

    loadVars(vars: Record<string, any>) {
        Object.assign(this.vars, vars);
    }

    getFunction(name: string) {
        const fn = this.vars[name];
        if (!fn) {
            throw new Error(`Unknown function ${name}`);
        }
        if (typeof fn !== 'function') {
            throw new Error(`Not a function ${name}`);
        }
        return fn;
    }

}




