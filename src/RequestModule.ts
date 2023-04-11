import { dirname, resolve } from "path";
import { Environment, TemplateString } from "./Expression.js";
import { ILogger, Logger } from "./Logger.js";
import Parser from "./parse/Parser.js";
import { IRequest, request } from "./http.js";

export interface IRunnable<T = void> {
    run(env: Environment): T;
}

export default class RequestModule {
    // the environment in which this script was launched. A map of (untyped) string variables.
    // usualy inherited from the command line
    cwd?: string;
    file?: string;
    logger: ILogger;
    parent?: RequestModule;
    commands = new Array<IRunnable>();

    constructor(logger?: ILogger, parent?: RequestModule) {
        this.logger = logger || new Logger();
        this.parent = parent;
    }

    spawn() {
        return new RequestModule(this.logger, this);
    }

    async importLib(file: string) {
        file = this.resolveFile(file);
        const functions: Record<string, (arg: any) => any> =
            await import(file).then(m => {
                return { ...m }
            });
        this.commands.push({
            run: (env) => {
                Object.assign(env.functions, functions);
            }
        });
    }

    setHeaderExpr(name: string, value: string) {
        const expr = TemplateString.parse(value);
        this.commands.push({
            run: (env) => {
                env.headers[name] = expr.eval(env);
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
        const expr = TemplateString.parse(value);
        this.commands.push({
            run: (env) => {
                env.body = expr.eval(env);
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

    setUrlExpr(value: string) {
        const expr = TemplateString.parse(value);
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
        for (const command of this.commands) {
            await command.run(env);
        }
        const response = await this.request(env);
        if (response && response.error) {
            throw new Error(`Request failed with status ${response.status}: ${(response.error as any)?.text}`);
        }
        return response;
    }

    async request(env: Environment) {
        if (!env.method) {
            return undefined;
        }
        if (!env.url) {
            throw new Error('Missing request URL');
        }
        const response = await request(env as IRequest);
        if (this.parent) {
            this.logger.logChildRequest(env as IRequest, response);
        } else {
            this.logger.logRequest(env as IRequest, response);
        }
        return response;
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

}
