import vm from 'vm';
import Environment from "./Enviroment.js";
import builtinFilters from "./builtins.js";
import { IVarExprTokens, readDoubleQuotedString, readLiteral, readVarExpr } from "./parse/expression.js";
import { readSingleQuotedString } from './parse/expression.js';


export interface IEvaluable {
    eval(env: Environment): any;
}



export class Literal implements IEvaluable {
    constructor(public value: any) {
    }
    eval() {
        return this.value;
    }
}

export class Expression implements IEvaluable {
    script: vm.Script;
    constructor(expr: string) {
        this.script = new vm.Script('(' + expr + ')');
    }
    eval(env: Environment) {
        return env.eval(this.script);
    }
}

function hasVarSubstitutions(text: string) {
    const i = text.indexOf('${');
    if (i > -1) {
        const j = text.indexOf('}', i + 2);
        if (j > -1) {
            return true;
        }
    }
    return false;
}

export function parseStringLiteral(text: string) {
    text = text.trim();
    if (!text) {
        throw new Error('Invalid empty expression');
    }
    const first = text[0];
    if (first === '"') {
        const token = readDoubleQuotedString(text);
        if (!token || token.remaining) {
            throw new Error('Invalid expression: ' + text);
        }
        return token.value;
    } else if (first === "'") {
        const token = readSingleQuotedString(text);
        if (!token || token.remaining) {
            throw new Error('Invalid expression: ' + text);
        }
        return token.value;
    } else {
        // a string not surrounded by quotes or backticks
        return text;
    }
}

export function parseExpression(text: string) {
    text = text.trim();
    if (!text) {
        throw new Error('Invalid empty expression');
    }
    const first = text[0];
    if (first === '`' || first === '{' || first === '[') {
        return new Expression(text);
    } else if (first === '"') {
        const token = readDoubleQuotedString(text);
        if (!token || token.remaining) {
            throw new Error('Invalid expression: ' + text);
        }
        return new Literal(token.value);
    } else if (first === "'") {
        const token = readSingleQuotedString(text);
        if (!token || token.remaining) {
            throw new Error('Invalid expression: ' + text);
        }
        return new Literal(token.value);
    } else if (text === 'true') {
        return new Literal(true);
    } else if (text == 'false') {
        return new Literal(false);
    } else if (text === 'null') {
        return new Literal(null);
    } else {
        return new Expression(text);
    }
}

export function parseStringExpression(text: string) {
    text = text.trim();
    if (!text) {
        throw new Error('Invalid empty expression');
    }
    const first = text[0];
    if (first === '`' || first === '{' || first === '[') {
        return new Expression(text);
    } else if (first === '"') {
        const token = readDoubleQuotedString(text);
        if (!token || token.remaining) {
            throw new Error('Invalid expression: ' + text);
        }
        return new Literal(token.value);
    } else if (first === "'") {
        const token = readSingleQuotedString(text);
        if (!token || token.remaining) {
            throw new Error('Invalid expression: ' + text);
        }
        return new Literal(token.value);
    } else {
        // a string not ssurrounded by quotes or backticks
        return hasVarSubstitutions(text) ? new Expression('`' + text + '`') : new Literal(text);
    }
}

export function parseBodyExpression(text: string) {
    text = text.trim();
    if (!text) {
        return undefined;
    }
    const first = text[0];
    if (first === '{' || first === '[') {
        // a json object or array
        return new Expression(text);
    } else if (hasVarSubstitutions(text)) {
        new Expression('`' + text + '`');
    } else {
        return new Literal(text);
    }
}

export function parseObjectExpression(text: string) {
    text = text.trim();
    if (!text) {
        throw new Error('Invalid empty expression');
    }
    const first = text[0];
    if (first === '{') {
        // a json object
        return new Expression(text);
    } else {
        throw new Error('Invalid object expression: ' + text);
    }
}

export function parseVarRef(expr: string) {
    expr = expr.trim();
    if (!expr) {
        throw new Error('Invalid empty variable reference');
    }
    const token = readVarExpr(expr);
    if (!token) {
        throw new Error('Invalid variable: ' + expr);
    }
    return new VarExpr(token.value);
}

function resolveVar(parts: string[], vars: Record<string, any>, root: any) {
    const first = parts[0];
    let obj: any;
    if (first === '$env') {
        obj = root;
    } else {
        obj = vars[first];
        if (obj == null || parts.length === 1) {
            return obj;
        }
    }
    for (let i = 1, len = parts.length; i < len; i++) {
        obj = obj[parts[i]];
        if (obj == null) {
            return obj;
        }
    }
    return obj;
}

function resolveVarExpr(expr: IVarExprTokens, env: Environment) {
    let obj: any = resolveVar(expr.varRef, env.vars, env);
    if (obj == null) {
        if (expr.defaultValue !== undefined) {
            obj = expr.defaultValue;
        } else {
            throw new Error('variable not found: ' + expr.varRef.join('.'));
        }
    }
    if (expr.filters) {
        for (const filter of expr.filters) {
            const fn = env.getFunction(filter);
            if (!fn) {
                throw new Error('filter not found: ' + filter);
            }
            obj = fn(obj);
        }
    }
    return obj;
}

export class VarExpr implements IEvaluable {
    constructor(public expr: IVarExprTokens) { }

    eval(env: Environment) {
        return resolveVarExpr(this.expr, env);
    }

}
