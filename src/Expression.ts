import builtinFilters from "./filters.js";
import { IVarExprTokens, readLiteral, readVarExpr } from "./parse/expression.js";


export interface IEvaluable {
    eval(env: Environment): any;
}

export class Environment {
    vars: Record<string, any>;
    functions: Record<string, (arg: any) => any> = { ...builtinFilters };
    method?: string;
    url?: string;
    headers: Record<string, string> = {};
    body?: string;
    constructor(vars: Record<string, any>) {
        this.vars = vars || {};
    }
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
            const fn = env.functions[filter];
            if (!fn) {
                throw new Error('filter not found: ' + filter);
            }
            obj = fn(obj);
        }
    }
    return obj;
}


export class Literal implements IEvaluable {
    value: any;
    constructor(value: any) {
        this.value = value;
    }
    eval() {
        return this.value;
    }
    static parse(value: string) {
        return new Literal(JSON.parse(value));
    }

}

export class VarExpr implements IEvaluable {
    constructor(public expr: IVarExprTokens) { }

    eval(env: Environment) {
        return resolveVarExpr(this.expr, env);
    }

    static parse(expr: string): IEvaluable {
        const token = readVarExpr(expr);
        if (!token) {
            throw new Error('Invalid var expression: ' + expr);
        }
        return new VarExpr(token.value);
    }

}

// string interpolation
export class TemplateString implements IEvaluable {
    constructor(public parts: IEvaluable[]) {
    }
    eval(env: Environment) {
        return this.parts.map(part => part.eval(env)).join('');
    }

    static parse(text: string) {
        let i = text.indexOf('{{');
        if (i > -1) {
            const parts: IEvaluable[] = [];
            let j = text.indexOf('}}', i);
            while (i > -1 && j > -1) {
                if (i > 0) {
                    parts.push(new Literal(text.substring(0, i)));
                }
                parts.push(VarExpr.parse(text.substring(i + 2, j)));
                text = text.substring(j + 2);
                i = text.indexOf('{{');
                j = text.indexOf('}}', i);
            }
            if (text) {
                parts.push(new Literal(text));
            }
            return new TemplateString(parts);
        } else {
            return new Literal(text);
        }
    }
}

// this can be either a var expression, a literal, either a template string surrounded with ticks `expr`
// the text is trimmed
export function parseAssignableExpression(text: string) {
    text = text.trim();

    if (text[0] === "`") {
        if (text[text.length - 1] !== "`") {
            throw new Error('Invalid template string. Expecting an ending tick: ' + text);
        }
        return TemplateString.parse(text.substring(1, text.length - 1));
    }

    // may be a literal?
    const literalToken = readLiteral(text);
    if (literalToken) {
        if (literalToken.remaining) {
            throw new Error('Invalid value: ' + text);
        }
        return new Literal(literalToken.value);
    }

    // may be a var expression?
    const token = readVarExpr(text);
    if (token) {
        if (token.remaining) {
            throw new Error('Invalid value: ' + text);
        }
        return new VarExpr(token.value);
    }

    throw new Error('Invalid value: ' + text);
}
