import { dirname, resolve } from "path";
import Environment from "./Enviroment.js";
import { parseBodyExpression, parseObjectExpression, parseStringExpression } from "./Expression.js";
import { ILogger, Logger } from "./Logger.js";
import { IRequest, IResponse, request } from "./http.js";
import Parser from "./parse/Parser.js";
import { IPrompt, IPrompter } from "./prompt.js";

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
    commands = new Array<ICommand>();
    isIncluded: boolean;

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
        const functions: Record<string, (arg: any) => any> =
            await import(file).then(m => {
                return { ...m }
            });
        this.commands.push({
            run: (env) => {
                env.loadVars(functions);
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

    exec(inheritedVars?: Record<string, any>) {
        return this.execWithEnv(new Environment(inheritedVars ? { ...inheritedVars } : {}));
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
            response = await request(req);
            this.logRequest(req, response);
        } catch (e) {
            response = (e as any).response as IResponse;
            if (response) {
                this.logger.logErrorResponse(req, response);
            } else {
                throw e;
            }
        }
        return response;
    }

    logRequest(req: IRequest, response: IResponse) {
        if (this.parent) {
            this.logger.logChildRequest(req, response);
        } else {
            this.logger.logRequest(req, response);
        }
    }

    async loadFile(file: string): Promise<RequestModule> {
        this.file = this.parent ? this.parent.resolveFile(file) : resolve(file);
        this.cwd = dirname(this.file);
        await new Parser().parseFile(this, this.file);
        return this;
    }

    loadContent(text: string): RequestModule {
        new Parser().parseText(this, text);
        return this;
    }

    resolveFile(file: string) {
        return this.cwd ? resolve(this.cwd, file) : resolve(file);
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
