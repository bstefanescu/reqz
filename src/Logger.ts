import { inspect as utilInspect } from 'util';
import colors from 'ansi-colors';
import { IRequest, IResponse } from './http.js';

const print = console.log;

function inspect(obj: any) {
    return utilInspect(obj, { showHidden: false, depth: null, colors: true });
}

export class LoggerConfig {
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
        config.resb = true;
        return config;
    }
}

export interface ILogger {
    echo(msg: string): void;
    logRequest(req: IRequest): void;
    logResponse(res: IResponse): void;
    logChildRequest(req: IRequest): void;
    logChildResponse(res: IResponse): void;
    logResponseError(res: IResponse): void;
}

/// the defsault logger
export class Logger implements ILogger {
    config: LoggerConfig;
    constructor(config?: LoggerConfig) {
        this.config = config || LoggerConfig.defaultConfig();
    }

    echo(msg: string) {
        print(msg);
    }

    logChildRequest(req: IRequest) {
        this.config.all && this.logRequest(req);
    }
    logChildResponse(res: IResponse) {
        this.config.all && this.logResponse(res);
    }

    logRequest(req: IRequest) {
        const config = this.config;
        print();
        print(colors.bold.green((req.method + ' ' + req.url)));
        if (config.reqh) {
            printHr();
            print(colors.blue.bold("Request Headers:"));
            printHeaders(req.headers);
        }
        if (config.reqb) {
            print();
            print(req.body ? inspect(req.body) : '');
        }
    }

    logResponse(res: IResponse) {
        const config = this.config;
        print();
        if (config.resh || config.resb) {
            print(colors.green.bold("Response"));
        }
        if (config.resh) {
            printHr();
            print(colors.blue.bold("Response Headers:"));
            printHeaders(res.headers);
        }
        if (config.resb) {
            print();
            print(res.body && res.isJSON ? inspect(res.body) : res.text);
        }
    }

    logResponseError(res: IResponse) {
        print();
        print(colors.red.bold(res.error ? res.error.toString() : "Server Error " + res.status));
        if (this.config.resh) {
            printHr();
            print(colors.blue.bold("Response Headers:"));
            printHeaders(res.headers);
        }
        if (this.config.resb) {
            print();
            print(res.body && res.isJSON ? inspect(res.body) : res.text);
        }
    }
}

function printHr() {
    print(colors.gray('---------------------------------------------------'));
}
function printHeaders(headers: Record<string, string | string[]>) {
    for (const key in headers) {
        print(key + ':', String(headers[key]))
    }
}

export class QuietLogger implements ILogger {
    echo() {
        // do nothing
    }
    logRequest() {
        // do nothing
    }
    logResponse() {
        // do nothing
    }
    logChildRequest() {
        // do nothing
    }
    logChildResponse() {
        // do nothing
    }
    logResponseError() {
        // do nothing
    }
}

