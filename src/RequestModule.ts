import { dirname, resolve } from "path";
import Environment from "./Enviroment.js";
import { Expression, parseBodyExpression, parseObjectExpression, parseStringExpression } from "./Expression.js";
import { ILogger, Logger } from "./Logger.js";
import { IRequest, IResponse, request } from "./http.js";
import Parser from "./parse/Parser.js";
import { IPrompt, IPrompter } from "./prompt.js";
import { readFileSync } from "fs";
import builtinDirectives from "./directives/index.js";
import { IDirective, IDirectiveDefinition, createDirective, tryCreateCustomDirective } from "./Directive.js";

let prompterInstance: IPrompter;

export interface ICommand<T = void> {
    run(env: Environment): T;
}

export interface IVar {
    name: string;
    required: boolean;
}

export default class RequestModule {
    // the environment in which this script was launched. A map of (untyped) string variables.
    // usualy inherited from the command line
    cwd?: string;
    file?: string;
    logger: ILogger;
    parent?: RequestModule;
    vars: IVar[] = []; // declared vars
    directives = { ...builtinDirectives };
    commands = new Array<ICommand>();
    isIncluded: boolean;
    doc?: string;

    constructor(logger?: ILogger, parent?: RequestModule, isIncluded = false) {
        this.logger = logger || new Logger();
        this.parent = parent;
        this.isIncluded = isIncluded;
    }

    spawn(isIncluded = false) {
        return new RequestModule(this.logger, this, isIncluded);
    }

    async importLib(file: string) {
        file = this.resolveFile(file);
        const vars: Record<string, any> = await import(file).then(m => {
            return { ...m }
        });
        for (const key in vars) {
            const dir = tryCreateCustomDirective(vars[key]);
            if (dir) {
                this.declareDirective(dir.definition.name, dir);
                // remove function from env
                delete vars[key];
            }
        }
        this.commands.push({
            run: (env) => {
                env.loadVars(vars);
            }
        });
    }

    setHeaderExpr(name: string, value: string) {
        const expr = parseStringExpression(value);
        this.commands.push({
            run: (env) => {
                const value = expr.eval(env);
                if (value != null) {
                    env.headers[name] = String(value);
                }
            }
        });
    }

    setHeader(name: string, value: string) {
        this.commands.push({
            run: (env) => {
                env.headers[name] = value;
            }
        });
    }

    setBodyExpr(value: string) {
        const expr = parseBodyExpression(value);
        this.commands.push({
            run: (env) => {
                expr && (env.body = expr.eval(env));
            }
        });
    }

    setBody(value: string) {
        this.commands.push({
            run: (env) => {
                env.body = value;
            }
        });
    }

    setQueryExpr(value: string) {
        const expr = parseObjectExpression(value);
        this.commands.push({
            run: (env) => {
                env.query = expr.eval(env);
            }
        });
    }
    setQuery(value: Record<string, any>) {
        this.commands.push({
            run: (env) => {
                env.query = value;
            }
        });
    }
    setUrlExpr(value: string) {
        const expr = parseStringExpression(value);
        this.commands.push({
            run: (env) => {
                env.url = expr.eval(env);
            }
        });
    }

    setUrl(value: string) {
        this.commands.push({
            run: (env) => {
                env.url = value;
            }
        });
    }

    setMethod(value: string) {
        this.commands.push({
            run: (env) => {
                env.method = value;
            }
        });
    }

    declareVar(name: string, required: boolean) {
        this.vars.push({ name, required });
        if (this.isIncluded && this.parent) {
            this.parent.declareVar(name, required);
        }
    }

    declareDirective(name: string, directive: IDirective) {
        this.directives[name] = directive;
        if (this.isIncluded && this.parent) {
            this.parent.declareDirective(name, directive);
        }
    }

    exec(inheritedVars?: Record<string, any>) {
        const vars = inheritedVars ? { ...inheritedVars } : {};
        vars.$module = this;
        vars.readFile = (file: string, encoding?: BufferEncoding) => {
            return this.safeReadFile(file, encoding);
        }
        const env = new Environment(vars);
        env.vars.expandFile = (file: string, encoding?: BufferEncoding) => {
            return new Expression('`' + this.safeReadFile(file, encoding) + '`').eval(env);
        }
        return this.execWithEnv(env);
    }

    async execWithEnv(env: Environment) {
        for (const v of this.vars) {
            if (!v.required && !(v.name in env.vars)) {
                env.vars[v.name] = undefined;
            }
        }
        for (const command of this.commands) {
            await command.run(env);
        }
        return await this.request(env);
    }

    async request(env: Environment) {
        if (!env.method) {
            return undefined;
        }
        if (!env.url) {
            throw new Error('Missing request URL');
        }
        const url = buildUrl(env.url, env.query);
        const req = {
            url: url.toString(),
            method: env.method,
            headers: env.headers,
            body: env.body
        }
        let response;
        try {
            this.logRequest(req);
            response = await request(req);
            this.logResponse(response);
        } catch (e) {
            response = (e as any).response as IResponse;
            if (response) {
                this.logger.logResponseError(response);
            } else {
                throw e;
            }
        }
        return response;
    }

    logRequest(req: IRequest) {
        if (this.parent) {
            this.logger.logChildRequest(req);
        } else {
            this.logger.logRequest(req);
        }
    }

    logResponse(response: IResponse) {
        if (this.parent) {
            this.logger.logChildResponse(response);
        } else {
            this.logger.logResponse(response);
        }
    }

    async loadFile(file: string): Promise<RequestModule> {
        this.file = this.parent ? this.parent.resolveFile(file) : resolve(file);
        this.cwd = dirname(this.file);
        await new Parser(this.directives).parseFile(this, this.file);
        return this;
    }

    loadContent(text: string): RequestModule {
        new Parser(this.directives).parseText(this, text);
        return this;
    }

    resolveFile(file: string) {
        return this.cwd ? resolve(this.cwd, file) : resolve(file);
    }

    /**
     * read a text file but only if the file is under the current module directory
     * @param file 
     * @param encoding 
     */
    safeReadFile(file: string, encoding: BufferEncoding = 'utf8') {
        file = this.resolveFile(file);
        if (!file.startsWith(this.cwd + '/')) {
            throw new Error('Cannot read file: "' + file + '". The file is outside the module directory');
        }
        return readFileSync(file, encoding);
    }

    get prompter() {
        if (!prompterInstance) {
            throw new Error("No prompter was installed");
        }
        return prompterInstance;
    }

    prompt(prompts: IPrompt[]) {
        return this.prompter.ask(prompts);
    }

    static usePrompter(prompter: IPrompter) {
        prompterInstance = prompter;
    }

}

function buildUrl(path: string, query?: Record<string, any>) {
    const url = new URL(path);
    if (query) {
        for (const key of Object.keys(query)) {
            const val = query[key];
            if (val != null) {
                if (Array.isArray(val)) {
                    url.searchParams.set(key, val.map(v => String(v)).join(','));
                } else {
                    url.searchParams.set(key, String(val));
                }
            }
        }
    }
    return url;
}
