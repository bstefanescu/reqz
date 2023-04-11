
import { BlockDirective, IDirective } from "../Directive.js";
import RequestModule from "../RequestModule.js";


function getFirstWord(line: string) {
    const i = line.indexOf(' ');
    if (i < 0) {
        return line;
    } else {
        return line.substring(0, i);
    }
}

export interface ILineParser {
    parseLine(module: RequestModule, line: string): Promise<ILineParser>;
    close(module: RequestModule): Promise<void>;
}

export class LineParser implements ILineParser {
    constructor(public directives: Record<string, IDirective>) {
    }

    async close(module: RequestModule) {
        // do nothing
    }

    async parseLine(module: RequestModule, line: string): Promise<ILineParser> {
        line = line.trim();
        if (!line || line.startsWith('#')) {
            return this; // empty line or comment
        }
        let parser;
        const word = getFirstWord(line);
        const directive = this.directives[word];
        if (directive) {
            parser = await this.handleDirective(module, directive, word, line.substring(word.length).trim());
        } else {
            parser = await this.handleUnknownLine(module, line);
        }
        return parser;
    }

    handleDirective(module: RequestModule, directive: IDirective, name: string, arg: string): Promise<ILineParser> {
        return directive.onMatch(module, this, name, arg);
    }

    handleUnknownLine(module: RequestModule, line: string): Promise<ILineParser> {
        throw new Error(`Unexpected line: ${line}`);
    }

}

export class BlockLineParser extends LineParser {
    lines: string[] = [];
    constructor(private parent: LineParser, public directive: BlockDirective, public name: string, public arg: string) {
        super(parent.directives);
    }

    async handleUnknownLine(module: RequestModule, line: string): Promise<ILineParser> {
        this.lines.push(line);
        return this;
    }

    handleDirective(module: RequestModule, directive: IDirective, name: string, arg: string): Promise<ILineParser> {
        // close the block parser
        this.directive.build(module, this.arg, this.lines);
        return directive.onMatch(module, this.parent, name, arg);
    }

    async close(module: RequestModule) {
        await this.directive.build(module, this.arg, this.lines);
    }

}
