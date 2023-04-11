import { readFileSync } from "fs";
import RequestModule from "../RequestModule.js";
import { IDirective } from "../Directive.js";
import { ILineParser } from "../parse/LineParser.js";


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

const FILE_RX = /^@file\s+([^\n]+)$/
class RequestBodyParser implements ILineParser {
    lines: string[] = [];

    async close(module: RequestModule) {
        if (this.lines.length > 0) {
            let body = this.lines.join('').trim();
            const m = FILE_RX.exec(body);
            if (m) {
                body = readFileSync(module.resolveFile(m[1].trim()), 'utf8');
                module.setBody(body);
            } else {
                module.setBodyExpr(body);
            }
        }
    }

    async parseLine(module: RequestModule, line: string): Promise<ILineParser> {
        this.lines.push(line);
        return this;
    }
}

