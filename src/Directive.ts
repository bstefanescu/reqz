import Environment from "./Enviroment.js";
import { parseArrayExpression, parseObjectExpression, parseStringExpression } from "./Expression.js";
import RequestModule from "./RequestModule.js";
import { BlockLineParser, LineParser, ILineParser } from "./parse/LineParser.js";

export interface IDirective {
    onMatch(module: RequestModule, parser: ILineParser, name: string, arg: string): Promise<ILineParser>;
}

export abstract class BlockDirective implements IDirective {
    abstract build(module: RequestModule, arg: string, lines: string[]): void;
    async onMatch(module: RequestModule, parser: LineParser, name: string, arg: string): Promise<ILineParser> {
        return new BlockLineParser(parser, this, name, arg);
    }
}

export abstract class LineDirective implements IDirective {
    abstract build(module: RequestModule, arg: string): void;
    async onMatch(module: RequestModule, parser: ILineParser, name: string, arg: string): Promise<ILineParser> {
        await this.build(module, arg);
        return parser;
    }
}

// =============== API for creating custom directives =====================
export interface ICustomDirective {
    definition: IDirectiveDefinition
}

class CustomBlockDirective extends BlockDirective implements ICustomDirective {
    constructor(public definition: IDirectiveDefinition, private run: CustomDirectiveFn) { super(); }
    build(module: RequestModule, arg: string, lines: string[]): void {
        const parseArgs: CustomDirectiveArgsFn = this.definition.args as CustomDirectiveArgsFn;
        const expr = parseArgs(arg, lines);
        module.commands.push({
            run: async (env) => {
                await this.run.call(module, env, expr);
            }
        });
    }
}

class CustomLineDirective extends LineDirective implements ICustomDirective {
    constructor(public definition: IDirectiveDefinition, private run: CustomDirectiveFn) { super(); }
    build(module: RequestModule, arg: string): void {
        const parseArgs: CustomDirectiveArgsFn = this.definition.args as CustomDirectiveArgsFn;
        const expr = parseArgs(arg);
        module.commands.push({
            run: async (env) => {
                await this.run.call(module, env, expr);
            }
        });
    }
}

class CustomObjectDirective extends BlockDirective implements ICustomDirective {
    constructor(public definition: IDirectiveDefinition, private run: CustomDirectiveFn) { super(); }
    build(module: RequestModule, arg: string, lines: string[]): void {
        const content = (arg + '\n' + lines.join('\n')).trim();
        if (!content && !this.definition.optional) {
            throw new Error(`Missing argument for ${this.definition.name} directive`);
        }
        const expr = content && parseObjectExpression(content);
        module.commands.push({
            run: async (env) => {
                await this.run.call(module, env, expr && expr.eval(env));
            }
        });
    }
}

class CustomArrayDirective extends BlockDirective implements ICustomDirective {
    constructor(public definition: IDirectiveDefinition, private run: CustomDirectiveFn) { super(); }
    build(module: RequestModule, arg: string, lines: string[]): void {
        const content = (arg + '\n' + lines.join('\n')).trim();
        if (!content && !this.definition.optional) {
            throw new Error(`Missing argument for ${this.definition.name} directive`);
        }
        const expr = content && parseArrayExpression(content);
        module.commands.push({
            run: async (env) => {
                await this.run.call(module, env, expr && expr.eval(env));
            }
        });
    }
}

class CustomStringDirective extends LineDirective implements ICustomDirective {
    constructor(public definition: IDirectiveDefinition, private run: CustomDirectiveFn) { super(); }
    build(module: RequestModule, arg: string): void {
        if (!arg && !this.definition.optional) {
            throw new Error(`Missing argument for ${this.definition.name} directive`);
        }
        const expr = arg && parseStringExpression(arg);
        module.commands.push({
            run: async (env) => {
                await this.run.call(module, env, expr && expr.eval(env));
            }
        });
    }
}

export type CustomDirectiveArgsFn = (arg: string, lines?: string[]) => any;
export type CustomDirectiveFn = (this: RequestModule, env: Environment, arg: any) => void;
export interface IDirectiveDefinition {
    optional: boolean, // only used if args is one of 'object' | 'array' | 'string'
    args: 'object' | 'array' | 'string' | CustomDirectiveArgsFn
    name: 'myDirective',
    type: 'auto' | 'line' | 'block' // only used in conjunction with args function
}


export function createDirective(definition: IDirectiveDefinition, run: CustomDirectiveFn): IDirective & ICustomDirective {
    switch (definition.args) {
        case 'string':
            return new CustomStringDirective(definition, run);
        case 'object':
            return new CustomObjectDirective(definition, run);
        case 'array':
            return new CustomArrayDirective(definition, run);
        default:
            if (typeof definition.args === 'function') {
                const type = definition.type || 'auto';
                if (type === 'line') {
                    return new CustomLineDirective(definition, run);
                } else if (type === 'block') {
                    return new CustomBlockDirective(definition, run);
                } else {
                    throw new Error('Invalid directive definition. type property must be "line" or "block" when args is a function');
                }
            } else {
                throw new Error("Invalid directive definition. args property must be 'object' | 'array' | 'string' or a function");
            }
    }
}

/*
function myDirective(arg: string, lines: string[]) {
    return (env: Environment, arg: any) => {

    }
}
myDirective.__REQZ_DIRECTIVE = {
    optional: false,
    args: 'auto', // 'auto' | 'object' | 'array' | 'expression' | 'template' | 'custom'
    name: 'myDirective',
    type: 'line', // 'block' | 'line' 
}
*/
export function tryCreateCustomDirective(obj: any) {
    let _dir = obj.__REQZ_DIRECTIVE;
    if (!_dir) {
        return null;
    }

    if (typeof obj !== 'function') {
        throw new Error('Invalid directive definition. Directive must be a function');
    }

    if (typeof _dir === 'string') {
        _dir = { name: _dir, optional: true, args: 'string', type: 'auto' };
    } else if (!_dir.name) {
        throw new Error('Imvalid directive definition. Missing name property');
    }
    _dir.optional = !!_dir.optional;
    if (!_dir.args) {
        _dir.args = 'string';
        _dir.type = 'auto';
    }
    if (typeof _dir.args === 'function') {
        if (_dir.type !== 'line' && _dir.type !== 'block') {
            throw new Error('Invalid directive definition. type property must be "line" or "block" when args is a function');
        }
    } else {
        _dir.type = 'auto';
    }

    return createDirective(_dir, obj);
}

