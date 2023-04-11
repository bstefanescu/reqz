import { inspect as utilInspect } from 'util';
import chalk from 'chalk';
import { IRequest, IResponse } from './http.js';

const print = console.log;

function inspect(obj: any) {
    return utilInspect(obj, { showHidden: false, depth: null, colors: true });
}

export class LoggerConfig {
    req?: boolean;
    reqh?: boolean;
    reqb?: boolean;
    resh?: boolean;
    resb?: boolean;
    all?: boolean;

    static fromString(spec: string) {
        const config = new LoggerConfig();
        spec.split(',').forEach((key: string) => {
            (config as any)[key] = true;
        })
        return config;
    }

    static defaultConfig() {
        const config = new LoggerConfig();
        config.req = true;
        config.resb = true;
        return config;
    }
}

export interface ILogger {
    echo(msg: string): void;
    logRequest(req: IRequest, res: IResponse): void;
    logChildRequest(req: IRequest, res: IResponse): void;
    logErrorResponse(res: any): void;
}

/// the defsault logger
export class Logger implements ILogger {
    config: LoggerConfig;
    constructor(config?: LoggerConfig) {
        this.config = config || LoggerConfig.defaultConfig();
    }

    echo(msg: string) {
        print('@echo', msg);
    }

    logChildRequest(req: IRequest, res: IResponse) {
        this.config.all && this.logRequest(req, res);
    }
    logRequest(req: IRequest, res: IResponse) {
        const config = this.config;
        if (config.req) {
            print(chalk.bold.green((req.method + ' ' + req.url)));
        }
        if (config.reqh) {
            print(req.headers);
            print();
        }
        if (config.reqb) {
            print(req.body ? inspect(req.body) : '');
        }
        if (config.reqh || config.reqb) {
            print(chalk.gray('---------------------------------------------------'));
        }
        if (config.req || config.reqh || config.reqb) {
            print();
            print(chalk.green.bold("Response"));
        }
        if (config.resh) {
            print(res.headers);
            print();
        }
        if (config.resb) {
            print(res.body && res.isJSON ? inspect(res.body) : res.text);
            print(chalk.gray('---------------------------------------------------'));
        }
    }
    logErrorResponse(res: any) {
        print(chalk.red.bold(res.error ? res.error.toString() : "Server Error " + res.status));
        if (this.config.resh) {
            print(res.headers);
            print();
        }
        if (this.config.resb) {
            print(res.body && res.isJSON ? inspect(res.body) : res.text);
            print(chalk.gray('---------------------------------------------------'));
        }
    }
}

export class QuietLogger implements ILogger {
    echo() {
        // do nothing
    }
    logRequest() {
        // do nothing
    }
    logChildRequest() {
        // do nothing
    }
    logErrorResponse() {
        // do nothing
    }
}

