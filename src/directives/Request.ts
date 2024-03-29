import { readFileSync } from "fs";
import RequestModule from "../RequestModule.js";
import { IDirective } from "../Directive.js";
import { ILineParser } from "../parse/LineParser.js";
import { parseStringLiteral } from "../Expression.js";


export class RequestDirective implements IDirective {
    async onMatch(module: RequestModule, parser: ILineParser, name: string, arg: string): Promise<ILineParser> {
        module.setMethod(name);
        module.setUrlExpr(arg);
        return new RequestHeaderParser();
    }
}


class RequestHeaderParser implements ILineParser {
    async close(module: RequestModule) {
        // do nothing
    }
    async parseLine(module: RequestModule, line: string): Promise<ILineParser> {
        line = line.trim();
        if (line.startsWith('#')) {
            return this; // skip comments
        } else if (!line) {
            return new RequestBodyParser();
        } else { // parse body
            const i = line.indexOf(':');
            if (i < -1) {
                throw new Error(`Invalid header: ${line}. Excepting HeaderName: value`);
            }
            module.setHeaderExpr(line.substring(0, i).trim(), line.substring(i + 1).trim())
            return this;
        }
    }
}

class RequestBodyParser implements ILineParser {
    lines: string[] = [];

    async close(module: RequestModule) {
        if (this.lines.length > 0) {
            const body = this.lines.join('').trim();
            module.setBodyExpr(body);
        }
    }

    async parseLine(module: RequestModule, line: string): Promise<ILineParser> {
        this.lines.push(line);
        return this;
    }
}

